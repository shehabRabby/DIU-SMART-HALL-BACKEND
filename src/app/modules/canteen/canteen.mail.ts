import ejs from "ejs";
import path from "path";
import {
  FoodPaymentMethod,
  FoodPaymentStatus,
} from "../../../generated/prisma/enums";
import config from "../../config";
import { transporter } from "../../lib/nodemailer";
import { prisma } from "../../lib/prisma";
import { getSlotScheduleWindows } from "./canteen.utils";

const getPaymentThemeMeta = (method: FoodPaymentMethod) => {
  switch (method) {
    case FoodPaymentMethod.BKASH:
      return { themeKey: "BKASH", gatewayLabel: "bKash Payment" };
    case FoodPaymentMethod.STRIPE:
      return { themeKey: "STRIPE", gatewayLabel: "Stripe Card Payment" };
    case FoodPaymentMethod.ONECARD:
      return { themeKey: "ONECARD", gatewayLabel: "DIU 1Card Wallet" };
    case FoodPaymentMethod.COUNTER_CASH:
    default:
      return { themeKey: "COUNTER_CASH", gatewayLabel: "Pay at Counter" };
  }
};

export const sendDigitalMealSlipEmail = async (orderId: string) => {
  try {
    if (!config.smtp_user || !config.smtp_password) {
      console.warn(
        "SMTP credentials missing in config; skipping meal slip email.",
      );
      return;
    }

    const order = await prisma.foodOrder.findUnique({
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
          where: { status: FoodPaymentStatus.PAID },
          orderBy: { verifiedAt: "desc" },
          take: 1,
        },
      },
    });

    if (!order || !order.student.user.email) return;

    const schedule = getSlotScheduleWindows(order.mealDate, order.mealSlot);
    const mealDateFormatted = order.mealDate.toISOString().split("T")[0];
    const { themeKey, gatewayLabel } = getPaymentThemeMeta(order.paymentMethod);
    const subject = `[DIU SmartHall] Verified Meal Slip • ${order.orderCode} (${order.mealSlot})`;

    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
      order.qrToken,
    )}`;

    const templatePath = path.join(
      process.cwd(),
      "src",
      "app",
      "templates",
      "meal-slip.ejs",
    );

    const html = await ejs.renderFile(templatePath, {
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

    await transporter.sendMail({
      from: `"DIU SmartHall Canteen" <${config.smtp_user}>`,
      to: order.student.user.email,
      subject,
      html,
    });

    console.log(
      `Digital Meal Slip sent to ${order.student.user.email} (${order.orderCode})`,
    );
  } catch (err) {
    console.error("Failed to send Digital Meal Slip email:", err);
  }
};
