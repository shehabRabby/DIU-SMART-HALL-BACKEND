import httpStatus from "http-status";
import { MealSlot } from "../../../generated/prisma/enums";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { CanteenPaymentService } from "./canteen.payment.service";
import { CanteenService } from "./canteen.service";
// ============================================================================
// 1. ADMIN GOVERNANCE CONTROLLERS
// ============================================================================
const createCanteenOwner = catchAsync(async (req, res) => {
    const result = await CanteenService.createCanteenOwner(req.body);
    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Canteen Owner profile created and linked to Hall successfully.",
        data: result,
    });
});
const updateCanteenOwnerStatus = catchAsync(async (req, res) => {
    const result = await CanteenService.updateCanteenOwnerStatus(req.params.id, req.body);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Canteen Owner status updated successfully.",
        data: result,
    });
});
const upsertMasterPriceItem = catchAsync(async (req, res) => {
    const result = await CanteenService.upsertMasterPriceItem(req.user.userId, req.body);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Hall master price cap updated successfully.",
        data: result,
    });
});
const getHallMasterPrices = catchAsync(async (req, res) => {
    const result = await CanteenService.getHallMasterPrices(req.params.hallId);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Hall master price list retrieved successfully.",
        data: result,
    });
});
const reviewMenuItemPrice = catchAsync(async (req, res) => {
    const result = await CanteenService.reviewMenuItemPrice(req.user.userId, req.params.menuItemId, req.body);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: `Menu item price ${req.body.approvalStatus.toLowerCase()} successfully.`,
        data: result,
    });
});
const resolveFoodComplaint = catchAsync(async (req, res) => {
    const result = await CanteenService.resolveFoodComplaint(req.user.userId, req.params.complaintId, req.body);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Food hygiene complaint resolved successfully.",
        data: result,
    });
});
// ============================================================================
// 2. CANTEEN OWNER CONTROLLERS
// ============================================================================
const createMenuItem = catchAsync(async (req, res) => {
    const result = await CanteenService.createMenuItem(req.user.userId, req.body);
    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Menu item created successfully.",
        data: result,
    });
});
const updateMenuItem = catchAsync(async (req, res) => {
    const result = await CanteenService.updateMenuItem(req.user.userId, req.params.menuItemId, req.body);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Menu item updated successfully.",
        data: result,
    });
});
const getCanteenOwnMenu = catchAsync(async (req, res) => {
    const result = await CanteenService.getCanteenOwnMenu(req.user.userId);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Canteen menu retrieved successfully.",
        data: result,
    });
});
const getKitchenPrepSummary = catchAsync(async (req, res) => {
    const mealDate = req.query.mealDate || new Date().toISOString().split("T")[0];
    const mealSlot = req.query.mealSlot || MealSlot.LUNCH;
    const result = await CanteenService.getKitchenPrepSummary(req.user.userId, mealDate, mealSlot);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Kitchen preparation summary retrieved successfully.",
        data: result,
    });
});
const getVendorSalesAndDueLedger = catchAsync(async (req, res) => {
    const result = await CanteenService.getVendorSalesAndDueLedger(req.user.userId, req.query.fromDate, req.query.toDate);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Canteen sales and due ledger retrieved successfully.",
        data: result,
    });
});
const redeemFoodToken = catchAsync(async (req, res) => {
    const result = await CanteenService.redeemFoodToken(req.user.userId, req.body);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: result.message,
        data: result,
    });
});
const updateOrderStatus = catchAsync(async (req, res) => {
    const result = await CanteenService.updateOrderStatus(req.user.userId, req.params.orderId, req.body);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Order status updated successfully.",
        data: result,
    });
});
// ============================================================================
// 3. STUDENT CONTROLLERS
// ============================================================================
const getStudentLiveMenu = catchAsync(async (req, res) => {
    const result = await CanteenService.getStudentLiveMenu(req.user.userId, req.query.mealDate, req.query.mealSlot);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Live canteen menu retrieved successfully.",
        data: result,
    });
});
const createFoodOrder = catchAsync(async (req, res) => {
    const result = await CanteenService.createFoodOrder(req.user.userId, req.body);
    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Food pre-order placed successfully.",
        data: result,
    });
});
const getStudentMyOrders = catchAsync(async (req, res) => {
    const result = await CanteenService.getStudentMyOrders(req.user.userId);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Your food orders retrieved successfully.",
        data: result,
    });
});
const cancelFoodOrder = catchAsync(async (req, res) => {
    const result = await CanteenService.cancelFoodOrder(req.user.userId, req.params.orderId, req.body?.reason);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Food order cancelled successfully.",
        data: result,
    });
});
const getDigitalMealSlip = catchAsync(async (req, res) => {
    const result = await CanteenService.getDigitalMealSlip(req.user.userId, req.params.orderId);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Verified digital meal slip retrieved successfully.",
        data: result,
    });
});
const createMealReview = catchAsync(async (req, res) => {
    const result = await CanteenService.createMealReview(req.user.userId, req.body);
    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Verified meal review submitted successfully.",
        data: result,
    });
});
const createFoodComplaint = catchAsync(async (req, res) => {
    const result = await CanteenService.createFoodComplaint(req.user.userId, req.body);
    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Food hygiene complaint submitted with photo proof.",
        data: result,
    });
});
// ============================================================================
// 4. PAYMENT CONTROLLERS (Stripe + bKash + Multi-Gateway)
// ============================================================================
const initiateOrderPayment = catchAsync(async (req, res) => {
    const result = await CanteenPaymentService.initiateOrderPayment(req.user.userId, req.params.orderId);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Payment session initiated successfully.",
        data: result,
    });
});
const verifyStripeSession = catchAsync(async (req, res) => {
    const result = await CanteenPaymentService.verifyStripeSession(req.params.sessionId);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Stripe payment verified and order confirmed.",
        data: result,
    });
});
const stripeWebhook = catchAsync(async (req, res) => {
    const signature = req.headers["stripe-signature"];
    const result = await CanteenPaymentService.handleStripeWebhook(req.body, signature);
    res.status(httpStatus.OK).json(result);
});
const bkashCallback = catchAsync(async (req, res) => {
    const tranId = req.query.tranId;
    const paymentID = req.query.paymentID;
    const status = req.query.status;
    const result = await CanteenPaymentService.executeBkashCallback(tranId, paymentID, status);
    return res.redirect(result.redirectUrl);
});
export const CanteenController = {
    createCanteenOwner,
    updateCanteenOwnerStatus,
    upsertMasterPriceItem,
    getHallMasterPrices,
    reviewMenuItemPrice,
    resolveFoodComplaint,
    createMenuItem,
    updateMenuItem,
    getCanteenOwnMenu,
    getKitchenPrepSummary,
    getVendorSalesAndDueLedger,
    redeemFoodToken,
    updateOrderStatus,
    getStudentLiveMenu,
    createFoodOrder,
    getStudentMyOrders,
    cancelFoodOrder,
    getDigitalMealSlip,
    createMealReview,
    createFoodComplaint,
    initiateOrderPayment,
    verifyStripeSession,
    stripeWebhook,
    bkashCallback,
};
