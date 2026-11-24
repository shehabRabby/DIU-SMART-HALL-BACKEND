import axios from "axios";
import crypto from "crypto";
import nodemailer from "nodemailer";
import Stripe from "stripe";
import { FoodOrderStatus, FoodPaymentMethod, FoodPaymentStatus, } from "../../../generated/prisma/enums";
import config from "../../config";
import { prisma } from "../../lib/prisma";
import { assertBeforeCutoffDeadline, getSlotScheduleWindows, } from "./canteen.utils";
const getStripeSecretKey = () => config.stripe
    ?.secret_key ||
    process.env.STRIPE_SECRET_KEY ||
    "";
const getStripeWebhookSecret = () => config.stripe
    ?.webhook_secret ||
    process.env.STRIPE_WEBHOOK_SECRET ||
    "";
const getBkashConfig = () => {
    const cfg = config.bkash;
    return {
        base_url: cfg?.base_url ||
            process.env.BKASH_BASE_URL ||
            "https://tokenized.sandbox.bka.sh/v1.2.0-beta",
        app_key: cfg?.app_key || process.env.BKASH_APP_KEY || "",
        app_secret: cfg?.app_secret || process.env.BKASH_APP_SECRET || "",
        username: cfg?.username || process.env.BKASH_USERNAME || "",
        password: cfg?.password || process.env.BKASH_PASSWORD || "",
    };
};
const getBackendUrl = () => config.backend_url ||
    process.env.BACKEND_URL ||
    "http://localhost:5000/api/v1";
const getFrontendUrl = () => config.frontend_url || process.env.FRONTEND_URL || "http://localhost:3000";
const stripeSecretKey = getStripeSecretKey();
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;
/**
 * Helper: Send Official Digital Meal Slip via Email (SRS Section 4: App + Email)
 */
const sendDigitalMealSlipEmail = async (orderId) => {
    try {
        const smtpUser = process.env.EMAIL_USER || process.env.SMTP_USER;
        const smtpPass = process.env.EMAIL_PASS || process.env.SMTP_PASS;
        if (!smtpUser || !smtpPass)
            return;
        const order = await prisma.foodOrder.findUnique({
            where: { id: orderId },
            include: {
                items: true,
                hall: { select: { name: true, shortName: true } },
                student: {
                    include: {
                        user: { select: { email: true } },
                        room: { select: { roomNumber: true } },
                    },
                },
            },
        });
        if (!order || !order.student.user.email)
            return;
        const schedule = getSlotScheduleWindows(order.mealDate, order.mealSlot);
        const mealDateFormatted = order.mealDate.toISOString().split("T")[0];
        const itemsRows = order.items
            .map((item) => `<tr>
            <td style="padding:8px;border:1px solid #ddd;">${item.itemName} (${item.portion})</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:center;">${item.quantity}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right;">${item.subtotal.toFixed(2)} BDT</td>
          </tr>`)
            .join("");
        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST || "smtp.gmail.com",
            port: Number(process.env.EMAIL_PORT) || 587,
            secure: false,
            auth: { user: smtpUser, pass: smtpPass },
        });
        await transporter.sendMail({
            from: `"DIU SmartHall Canteen" <${smtpUser}>`,
            to: order.student.user.email,
            subject: `[Meal Slip] ${order.orderCode} - ${order.mealSlot} (${mealDateFormatted})`,
            html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e2e8f0;border-radius:8px;padding:20px;">
          <h2 style="color:#0f172a;margin-bottom:4px;">DIU SmartHall — Official Verified Meal Slip</h2>
          <p style="color:#475569;margin-top:0;">Present this Order Code + 4-Digit PIN or QR Token at the canteen counter.</p>
          <div style="background:#f8fafc;padding:12px;border-radius:6px;margin:16px 0;">
            <p style="margin:4px 0;"><strong>Order Code:</strong> ${order.orderCode}</p>
            <p style="margin:4px 0;"><strong>4-Digit Pickup PIN:</strong> <span style="font-size:18px;font-weight:bold;color:#16a34a;">${order.pickupPin}</span></p>
            <p style="margin:4px 0;"><strong>Student:</strong> ${order.student.name} (${order.student.studentUniId}) — Room ${order.student.room?.roomNumber ?? "N/A"}</p>
            <p style="margin:4px 0;"><strong>Hall & Slot:</strong> ${order.hall.name} | ${order.mealSlot} (${schedule.label})</p>
            <p style="margin:4px 0;"><strong>Meal Date:</strong> ${mealDateFormatted}</p>
            <p style="margin:4px 0;"><strong>Payment Verified At:</strong> ${order.paidAt?.toISOString() ?? new Date().toISOString()}</p>
          </div>
          <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
            <thead>
              <tr style="background:#f1f5f9;">
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Item</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:center;">Qty</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>${itemsRows}</tbody>
          </table>
          <p style="text-align:right;font-size:16px;"><strong>Total Paid: ${order.totalAmount.toFixed(2)} BDT (${order.paymentMethod})</strong></p>
        </div>
      `,
        });
    }
    catch (err) {
        console.error("Failed to send Digital Meal Slip email:", err);
    }
};
/**
 * Helper: Atomically mark PaymentTransaction & FoodOrder as PAID
 * Enforces exact amount match (paidAmount === totalAmount) & idempotency
 */
const confirmOrderPaymentSuccess = async (tranId, gatewayRefId, verifiedPaidAmount, rawResponse) => {
    const result = await prisma.$transaction(async (tx) => {
        const paymentTx = await tx.paymentTransaction.findUnique({
            where: { tranId },
            include: { order: true },
        });
        if (!paymentTx) {
            throw new Error(`Payment transaction not found for tranId: ${tranId}`);
        }
        // Idempotency guard (if webhook & redirect callback fire together)
        if (paymentTx.status === FoodPaymentStatus.PAID) {
            return { paymentTx, newlyConfirmed: false };
        }
        // Zero-Trust Amount Integrity Check (SRS Section 4)
        if (Math.abs(verifiedPaidAmount - paymentTx.amount) > 0.01) {
            throw new Error(`PAYMENT AMOUNT MISMATCH: Expected ${paymentTx.amount} BDT, gateway confirmed ${verifiedPaidAmount} BDT.`);
        }
        const now = new Date();
        const updatedTx = await tx.paymentTransaction.update({
            where: { id: paymentTx.id },
            data: {
                status: FoodPaymentStatus.PAID,
                gatewayRefId,
                rawResponse: rawResponse,
                verifiedAt: now,
            },
        });
        await tx.foodOrder.update({
            where: { id: paymentTx.orderId },
            data: {
                paymentStatus: FoodPaymentStatus.PAID,
                orderStatus: FoodOrderStatus.CONFIRMED,
                paidAt: now,
            },
        });
        return { paymentTx: updatedTx, newlyConfirmed: true };
    });
    if (result.newlyConfirmed) {
        void sendDigitalMealSlipEmail(result.paymentTx.orderId);
    }
    return result.paymentTx;
};
// ============================================================================
// 1. STRIPE PAYMENT GATEWAY (Checkout Session + Webhook Verification)
// ============================================================================
const initiateStripePayment = async (userId, orderId) => {
    if (!stripe) {
        throw new Error("Stripe gateway is not configured on the server.");
    }
    const student = await prisma.student.findUnique({ where: { userId } });
    if (!student)
        throw new Error("Student profile not found.");
    const order = await prisma.foodOrder.findFirst({
        where: { id: orderId, studentId: student.id },
        include: { items: true, hall: true },
    });
    if (!order)
        throw new Error("Food order not found.");
    if (order.paymentStatus === FoodPaymentStatus.PAID) {
        throw new Error("This order is already paid.");
    }
    if (order.orderStatus === FoodOrderStatus.CANCELLED) {
        throw new Error("Cannot pay for a cancelled order.");
    }
    // Enforce 6-hour cut-off before initiating online payment
    assertBeforeCutoffDeadline(order.mealDate, order.mealSlot);
    const tranId = `STR-${order.orderCode}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    await prisma.paymentTransaction.create({
        data: {
            tranId,
            gateway: FoodPaymentMethod.STRIPE,
            amount: order.totalAmount,
            currency: "BDT",
            status: FoodPaymentStatus.UNPAID,
            orderId: order.id,
            studentId: student.id,
        },
    });
    const frontendUrl = getFrontendUrl();
    const session = await stripe.checkout.sessions.create({
        mode: "payment",
        client_reference_id: tranId,
        metadata: {
            tranId,
            orderId: order.id,
            orderCode: order.orderCode,
            studentId: student.id,
        },
        line_items: order.items.map((item) => ({
            price_data: {
                currency: "bdt",
                product_data: {
                    name: `${item.itemName} (${item.portion})`,
                    description: `DIU SmartHall Canteen - ${order.hall.shortName} (${order.mealSlot})`,
                },
                unit_amount: Math.round(item.unitPrice * 100), // Stripe expects paisa
            },
            quantity: item.quantity,
        })),
        success_url: `${frontendUrl}/canteen/payment/success?gateway=STRIPE&tranId=${tranId}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${frontendUrl}/canteen/payment/cancel?gateway=STRIPE&tranId=${tranId}`,
    });
    return {
        gateway: FoodPaymentMethod.STRIPE,
        tranId,
        checkoutUrl: session.url,
        sessionId: session.id,
    };
};
const handleStripeWebhook = async (rawBody, signature) => {
    const webhookSecret = getStripeWebhookSecret();
    if (!stripe || !webhookSecret) {
        throw new Error("Stripe webhook secret is not configured.");
    }
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const tranId = session.metadata?.tranId || session.client_reference_id;
        const paymentIntentId = typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.id;
        if (tranId && session.payment_status === "paid") {
            const paidAmountBdt = (session.amount_total ?? 0) / 100;
            await confirmOrderPaymentSuccess(tranId, paymentIntentId, paidAmountBdt, session);
        }
    }
    return { received: true };
};
const verifyStripeSession = async (sessionId) => {
    if (!stripe) {
        throw new Error("Stripe gateway is not configured.");
    }
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") {
        throw new Error(`Payment not completed. Status: ${session.payment_status}`);
    }
    const tranId = session.metadata?.tranId || session.client_reference_id;
    if (!tranId) {
        throw new Error("Transaction reference missing in Stripe session.");
    }
    const paymentIntentId = typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.id;
    const paidAmountBdt = (session.amount_total ?? 0) / 100;
    return confirmOrderPaymentSuccess(tranId, paymentIntentId, paidAmountBdt, session);
};
// ============================================================================
// 2. bKASH TOKENIZED CHECKOUT GATEWAY (Grant Token -> Create -> Execute)
// ============================================================================
const getBkashGrantToken = async () => {
    const { base_url, app_key, app_secret, username, password } = getBkashConfig();
    if (!app_key || !app_secret || !username || !password) {
        throw new Error("bKash Sandbox credentials are not configured in .env.");
    }
    const response = await axios.post(`${base_url}/tokenized/checkout/token/grant`, {
        app_key,
        app_secret,
    }, {
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            username,
            password,
        },
    });
    if (!response.data?.id_token) {
        throw new Error(`bKash Grant Token Failed: ${response.data?.statusMessage || "Unknown error"}`);
    }
    return response.data.id_token;
};
const initiateBkashPayment = async (userId, orderId) => {
    const student = await prisma.student.findUnique({ where: { userId } });
    if (!student)
        throw new Error("Student profile not found.");
    const order = await prisma.foodOrder.findFirst({
        where: { id: orderId, studentId: student.id },
    });
    if (!order)
        throw new Error("Food order not found.");
    if (order.paymentStatus === FoodPaymentStatus.PAID) {
        throw new Error("This order is already paid.");
    }
    if (order.orderStatus === FoodOrderStatus.CANCELLED) {
        throw new Error("Cannot pay for a cancelled order.");
    }
    // Enforce 6-hour cut-off before initiating online payment
    assertBeforeCutoffDeadline(order.mealDate, order.mealSlot);
    const bkashCfg = getBkashConfig();
    const idToken = await getBkashGrantToken();
    const tranId = `BKS-${order.orderCode}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const callbackURL = `${getBackendUrl()}/canteen/payments/bkash/callback?tranId=${tranId}`;
    await prisma.paymentTransaction.create({
        data: {
            tranId,
            gateway: FoodPaymentMethod.BKASH,
            amount: order.totalAmount,
            currency: "BDT",
            status: FoodPaymentStatus.UNPAID,
            orderId: order.id,
            studentId: student.id,
        },
    });
    const createRes = await axios.post(`${bkashCfg.base_url}/tokenized/checkout/create`, {
        mode: "0011",
        payerReference: student.studentUniId || student.id,
        callbackURL,
        amount: order.totalAmount.toFixed(2),
        currency: "BDT",
        intent: "sale",
        merchantInvoiceNumber: tranId,
    }, {
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: idToken,
            "X-APP-Key": bkashCfg.app_key,
        },
    });
    if (createRes.data?.statusCode !== "0000" || !createRes.data?.bkashURL) {
        throw new Error(`bKash Create Payment Failed: ${createRes.data?.statusMessage || "Unable to create bKash session"}`);
    }
    return {
        gateway: FoodPaymentMethod.BKASH,
        tranId,
        paymentID: createRes.data.paymentID,
        bkashURL: createRes.data.bkashURL,
    };
};
const executeBkashCallback = async (tranId, paymentID, status) => {
    const frontendUrl = getFrontendUrl();
    if (status !== "success" || !paymentID) {
        await prisma.paymentTransaction.updateMany({
            where: { tranId, status: FoodPaymentStatus.UNPAID },
            data: {
                status: FoodPaymentStatus.FAILED,
                rawResponse: { paymentID, status },
            },
        });
        return {
            success: false,
            redirectUrl: `${frontendUrl}/canteen/payment/cancel?gateway=BKASH&tranId=${tranId}&reason=${status || "cancelled"}`,
        };
    }
    const bkashCfg = getBkashConfig();
    const idToken = await getBkashGrantToken();
    try {
        const execRes = await axios.post(`${bkashCfg.base_url}/tokenized/checkout/execute`, { paymentID }, {
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                Authorization: idToken,
                "X-APP-Key": bkashCfg.app_key,
            },
            timeout: 30000,
        });
        if (execRes.data?.statusCode === "0000" &&
            execRes.data?.transactionStatus === "Completed") {
            const verifiedAmount = Number(execRes.data.amount);
            await confirmOrderPaymentSuccess(tranId, execRes.data.trxID, verifiedAmount, execRes.data);
            return {
                success: true,
                redirectUrl: `${frontendUrl}/canteen/payment/success?gateway=BKASH&tranId=${tranId}&trxID=${execRes.data.trxID}`,
            };
        }
        throw new Error(execRes.data?.statusMessage ||
            "bKash payment execution did not complete.");
    }
    catch (err) {
        // Fallback: Query Payment API per bKash official recommendation
        const queryRes = await axios.post(`${bkashCfg.base_url}/tokenized/checkout/payment/status`, { paymentID }, {
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                Authorization: idToken,
                "X-APP-Key": bkashCfg.app_key,
            },
        });
        if (queryRes.data?.transactionStatus === "Completed") {
            const verifiedAmount = Number(queryRes.data.amount);
            await confirmOrderPaymentSuccess(tranId, queryRes.data.trxID, verifiedAmount, queryRes.data);
            return {
                success: true,
                redirectUrl: `${frontendUrl}/canteen/payment/success?gateway=BKASH&tranId=${tranId}&trxID=${queryRes.data.trxID}`,
            };
        }
        throw err;
    }
};
// ============================================================================
// 3. UNIFIED GATEWAY ROUTER (Supports Active + Pending Gateways Cleanly)
// ============================================================================
const initiateOrderPayment = async (userId, orderId) => {
    const student = await prisma.student.findUnique({ where: { userId } });
    if (!student)
        throw new Error("Student profile not found.");
    const order = await prisma.foodOrder.findFirst({
        where: { id: orderId, studentId: student.id },
    });
    if (!order)
        throw new Error("Food order not found.");
    switch (order.paymentMethod) {
        case FoodPaymentMethod.STRIPE:
            return initiateStripePayment(userId, orderId);
        case FoodPaymentMethod.BKASH:
            return initiateBkashPayment(userId, orderId);
        case FoodPaymentMethod.NAGAD:
            if (!process.env.NAGAD_MERCHANT_ID || !process.env.NAGAD_PRIVATE_KEY) {
                throw new Error("Nagad Sandbox credentials are currently pending. Please use bKash, Stripe, DIU 1Card, or Counter Cash.");
            }
            throw new Error("Nagad gateway handler ready for merchant credentials.");
        case FoodPaymentMethod.ROCKET:
            if (!process.env.ROCKET_MERCHANT_ID || !process.env.ROCKET_SECRET_KEY) {
                throw new Error("Rocket gateway credentials are currently pending. Please use bKash, Stripe, DIU 1Card, or Counter Cash.");
            }
            throw new Error("Rocket gateway handler ready for merchant credentials.");
        default:
            throw new Error(`Online gateway initiation is not required for payment method: ${order.paymentMethod}.`);
    }
};
export const CanteenPaymentService = {
    initiateOrderPayment,
    initiateStripePayment,
    handleStripeWebhook,
    verifyStripeSession,
    initiateBkashPayment,
    executeBkashCallback,
};
