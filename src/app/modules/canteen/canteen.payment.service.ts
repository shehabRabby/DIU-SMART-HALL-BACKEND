import axios from "axios";
import crypto from "crypto";
import Stripe from "stripe";
import { Prisma } from "../../../generated/prisma/client";
import {
  FoodOrderStatus,
  FoodPaymentMethod,
  FoodPaymentStatus,
} from "../../../generated/prisma/enums";
import config from "../../config";
import { prisma } from "../../lib/prisma";

const getStripeSecretKey = () =>
  (config as unknown as { stripe?: { secret_key?: string } }).stripe
    ?.secret_key ||
  process.env.STRIPE_SECRET_KEY ||
  "";

const getStripeWebhookSecret = () =>
  (config as unknown as { stripe?: { webhook_secret?: string } }).stripe
    ?.webhook_secret ||
  process.env.STRIPE_WEBHOOK_SECRET ||
  "";

const getBkashConfig = () => {
  const cfg = (
    config as unknown as {
      bkash?: {
        base_url?: string;
        app_key?: string;
        app_secret?: string;
        username?: string;
        password?: string;
      };
    }
  ).bkash;

  return {
    base_url:
      cfg?.base_url ||
      process.env.BKASH_BASE_URL ||
      "https://tokenized.sandbox.bka.sh/v1.2.0-beta",
    app_key: cfg?.app_key || process.env.BKASH_APP_KEY || "",
    app_secret: cfg?.app_secret || process.env.BKASH_APP_SECRET || "",
    username: cfg?.username || process.env.BKASH_USERNAME || "",
    password: cfg?.password || process.env.BKASH_PASSWORD || "",
  };
};

const getBackendUrl = () =>
  (config as unknown as { backend_url?: string }).backend_url ||
  process.env.BACKEND_URL ||
  "http://localhost:5000/api/v1";

const getFrontendUrl = () =>
  config.frontend_url || process.env.FRONTEND_URL || "http://localhost:3000";

const stripeSecretKey = getStripeSecretKey();
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

/**
 * Helper: Atomically mark PaymentTransaction & FoodOrder as PAID
 */
const confirmOrderPaymentSuccess = async (
  tranId: string,
  gatewayRefId: string,
  rawResponse: unknown,
) => {
  return prisma.$transaction(async (tx) => {
    const paymentTx = await tx.paymentTransaction.findUnique({
      where: { tranId },
      include: { order: true },
    });

    if (!paymentTx) {
      throw new Error(`Payment transaction not found for tranId: ${tranId}`);
    }

    // Idempotency guard (if webhook & redirect callback fire together)
    if (paymentTx.status === FoodPaymentStatus.PAID) {
      return paymentTx;
    }

    const now = new Date();

    const updatedTx = await tx.paymentTransaction.update({
      where: { id: paymentTx.id },
      data: {
        status: FoodPaymentStatus.PAID,
        gatewayRefId,
        rawResponse: rawResponse as Prisma.InputJsonValue,
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

    return updatedTx;
  });
};

// ============================================================================
// 1. STRIPE PAYMENT GATEWAY (Checkout Session + Webhook Verification)
// ============================================================================

const initiateStripePayment = async (userId: string, orderId: string) => {
  if (!stripe) {
    throw new Error("Stripe gateway is not configured on the server.");
  }

  const student = await prisma.student.findUnique({ where: { userId } });
  if (!student) throw new Error("Student profile not found.");

  const order = await prisma.foodOrder.findFirst({
    where: { id: orderId, studentId: student.id },
    include: { items: true, hall: true },
  });

  if (!order) throw new Error("Food order not found.");
  if (order.paymentStatus === FoodPaymentStatus.PAID) {
    throw new Error("This order is already paid.");
  }

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
        unit_amount: Math.round(item.unitPrice * 100), // Stripe expects paisa/cents
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

const handleStripeWebhook = async (rawBody: Buffer, signature: string) => {
  const webhookSecret = getStripeWebhookSecret();
  if (!stripe || !webhookSecret) {
    throw new Error("Stripe webhook secret is not configured.");
  }

  const event = stripe.webhooks.constructEvent(
    rawBody,
    signature,
    webhookSecret,
  );

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const tranId = session.metadata?.tranId || session.client_reference_id;
    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.id;

    if (tranId && session.payment_status === "paid") {
      await confirmOrderPaymentSuccess(tranId, paymentIntentId, session);
    }
  }

  return { received: true };
};

const verifyStripeSession = async (sessionId: string) => {
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

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.id;

  return confirmOrderPaymentSuccess(tranId, paymentIntentId, session);
};

// ============================================================================
// 2. bKASH TOKENIZED CHECKOUT GATEWAY (Grant Token -> Create -> Execute)
// ============================================================================

const getBkashGrantToken = async (): Promise<string> => {
  const { base_url, app_key, app_secret, username, password } =
    getBkashConfig();

  if (!app_key || !app_secret || !username || !password) {
    throw new Error("bKash Sandbox credentials are not configured in .env.");
  }

  const response = await axios.post(
    `${base_url}/tokenized/checkout/token/grant`,
    {
      app_key,
      app_secret,
    },
    {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        username,
        password,
      },
    },
  );

  if (!response.data?.id_token) {
    throw new Error(
      `bKash Grant Token Failed: ${response.data?.statusMessage || "Unknown error"}`,
    );
  }

  return response.data.id_token;
};

const initiateBkashPayment = async (userId: string, orderId: string) => {
  const student = await prisma.student.findUnique({ where: { userId } });
  if (!student) throw new Error("Student profile not found.");

  const order = await prisma.foodOrder.findFirst({
    where: { id: orderId, studentId: student.id },
  });

  if (!order) throw new Error("Food order not found.");
  if (order.paymentStatus === FoodPaymentStatus.PAID) {
    throw new Error("This order is already paid.");
  }

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

  const createRes = await axios.post(
    `${bkashCfg.base_url}/tokenized/checkout/create`,
    {
      mode: "0011",
      payerReference: student.studentUniId || student.id,
      callbackURL,
      amount: order.totalAmount.toFixed(2),
      currency: "BDT",
      intent: "sale",
      merchantInvoiceNumber: tranId,
    },
    {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: idToken,
        "X-APP-Key": bkashCfg.app_key,
      },
    },
  );

  if (createRes.data?.statusCode !== "0000" || !createRes.data?.bkashURL) {
    throw new Error(
      `bKash Create Payment Failed: ${createRes.data?.statusMessage || "Unable to create bKash session"}`,
    );
  }

  return {
    gateway: FoodPaymentMethod.BKASH,
    tranId,
    paymentID: createRes.data.paymentID,
    bkashURL: createRes.data.bkashURL,
  };
};

const executeBkashCallback = async (
  tranId: string,
  paymentID: string,
  status: string,
) => {
  const frontendUrl = getFrontendUrl();

  if (status !== "success" || !paymentID) {
    await prisma.paymentTransaction.updateMany({
      where: { tranId, status: FoodPaymentStatus.UNPAID },
      data: {
        status: FoodPaymentStatus.FAILED,
        rawResponse: { paymentID, status } as Prisma.InputJsonValue,
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
    const execRes = await axios.post(
      `${bkashCfg.base_url}/tokenized/checkout/execute`,
      { paymentID },
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: idToken,
          "X-APP-Key": bkashCfg.app_key,
        },
        timeout: 30000,
      },
    );

    if (
      execRes.data?.statusCode === "0000" &&
      execRes.data?.transactionStatus === "Completed"
    ) {
      await confirmOrderPaymentSuccess(
        tranId,
        execRes.data.trxID,
        execRes.data,
      );

      return {
        success: true,
        redirectUrl: `${frontendUrl}/canteen/payment/success?gateway=BKASH&tranId=${tranId}&trxID=${execRes.data.trxID}`,
      };
    }

    throw new Error(
      execRes.data?.statusMessage ||
        "bKash payment execution did not complete.",
    );
  } catch (err) {
    // Fallback: Query Payment API per bKash official recommendation
    const queryRes = await axios.post(
      `${bkashCfg.base_url}/tokenized/checkout/payment/status`,
      { paymentID },
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: idToken,
          "X-APP-Key": bkashCfg.app_key,
        },
      },
    );

    if (queryRes.data?.transactionStatus === "Completed") {
      await confirmOrderPaymentSuccess(
        tranId,
        queryRes.data.trxID,
        queryRes.data,
      );
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

const initiateOrderPayment = async (userId: string, orderId: string) => {
  const student = await prisma.student.findUnique({ where: { userId } });
  if (!student) throw new Error("Student profile not found.");

  const order = await prisma.foodOrder.findFirst({
    where: { id: orderId, studentId: student.id },
  });
  if (!order) throw new Error("Food order not found.");

  switch (order.paymentMethod) {
    case FoodPaymentMethod.STRIPE:
      return initiateStripePayment(userId, orderId);

    case FoodPaymentMethod.BKASH:
      return initiateBkashPayment(userId, orderId);

    case FoodPaymentMethod.NAGAD:
      if (!process.env.NAGAD_MERCHANT_ID || !process.env.NAGAD_PRIVATE_KEY) {
        throw new Error(
          "Nagad Sandbox credentials are currently pending. Please use bKash, Stripe, Canteen Wallet, or Counter Cash.",
        );
      }
      throw new Error("Nagad gateway handler ready for merchant credentials.");

    default:
      throw new Error(
        `Online gateway initiation is not required for payment method: ${order.paymentMethod}.`,
      );
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
