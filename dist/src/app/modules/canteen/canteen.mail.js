"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendDigitalMealSlipEmail = void 0;
const ejs_1 = __importDefault(require("ejs"));
const path_1 = __importDefault(require("path"));
const enums_1 = require("../../../generated/prisma/enums");
const config_1 = __importDefault(require("../../config"));
const nodemailer_1 = require("../../lib/nodemailer");
const prisma_1 = require("../../lib/prisma");
const canteen_utils_1 = require("./canteen.utils");
const getPaymentThemeMeta = (method) => {
    switch (method) {
        case enums_1.FoodPaymentMethod.BKASH:
            return { themeKey: "BKASH", gatewayLabel: "bKash Payment" };
        case enums_1.FoodPaymentMethod.STRIPE:
            return { themeKey: "STRIPE", gatewayLabel: "Stripe Card Payment" };
        case enums_1.FoodPaymentMethod.ONECARD:
            return { themeKey: "ONECARD", gatewayLabel: "DIU 1Card Wallet" };
        case enums_1.FoodPaymentMethod.COUNTER_CASH:
        default:
            return { themeKey: "COUNTER_CASH", gatewayLabel: "Pay at Counter" };
    }
};
const sendDigitalMealSlipEmail = async (orderId) => {
    try {
        if (!config_1.default.smtp_user || !config_1.default.smtp_password) {
            console.warn("SMTP credentials missing in config; skipping meal slip email.");
            return;
        }
        const order = await prisma_1.prisma.foodOrder.findUnique({
            where: { id: orderId },
            include: {
                items: true,
                hall: { select: { name: true, shortName: true } },
                canteen: { select: { businessName: true } },
                student: {
                    include: {
                        user: { select: { email: true } },
                        room: { select: { roomNumber: true } },
                    },
                },
                transactions: {
                    where: { status: enums_1.FoodPaymentStatus.PAID },
                    orderBy: { verifiedAt: "desc" },
                    take: 1,
                },
            },
        });
        if (!order || !order.student.user.email)
            return;
        const schedule = (0, canteen_utils_1.getSlotScheduleWindows)(order.mealDate, order.mealSlot);
        const mealDateFormatted = order.mealDate.toISOString().split("T")[0];
        const { themeKey, gatewayLabel } = getPaymentThemeMeta(order.paymentMethod);
        const subject = `[DIU SmartHall] Verified Meal Slip • ${order.orderCode} (${order.mealSlot})`;
        const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(order.qrToken)}`;
        const templatePath = path_1.default.join(process.cwd(), "src", "app", "templates", "meal-slip.ejs");
        const html = await ejs_1.default.renderFile(templatePath, {
            subject,
            themeKey,
            gatewayLabel,
            paymentStatus: order.paymentStatus,
            studentName: order.student.name,
            studentUniId: order.student.studentUniId,
            hallName: order.hall.name,
            hallShortName: order.hall.shortName,
            canteenName: order.canteen.businessName,
            roomNumber: order.student.room?.roomNumber ?? "N/A",
            orderCode: order.orderCode,
            pickupPin: order.pickupPin,
            qrImageUrl,
            mealDate: mealDateFormatted,
            mealSlot: order.mealSlot,
            servingWindow: schedule.label,
            tranId: order.transactions[0]?.tranId ?? null,
            items: order.items,
            totalAmount: order.totalAmount,
        });
        await nodemailer_1.transporter.sendMail({
            from: `"DIU SmartHall Canteen" <${config_1.default.smtp_user}>`,
            to: order.student.user.email,
            subject,
            html,
        });
        console.log(`Digital Meal Slip sent to ${order.student.user.email} (${order.orderCode})`);
    }
    catch (err) {
        console.error("Failed to send Digital Meal Slip email:", err);
    }
};
exports.sendDigitalMealSlipEmail = sendDigitalMealSlipEmail;
