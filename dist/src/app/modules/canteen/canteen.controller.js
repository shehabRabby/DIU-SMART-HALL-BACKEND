"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CanteenController = void 0;
const http_status_1 = __importDefault(require("http-status"));
const enums_1 = require("../../../generated/prisma/enums");
const catchAsync_1 = require("../../utils/catchAsync");
const sendResponse_1 = require("../../utils/sendResponse");
const canteen_payment_service_1 = require("./canteen.payment.service");
const canteen_service_1 = require("./canteen.service");
// ============================================================================
// 1. ADMIN GOVERNANCE CONTROLLERS
// ============================================================================
const createCanteenOwner = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const result = await canteen_service_1.CanteenService.createCanteenOwner(req.body);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: http_status_1.default.CREATED,
        success: true,
        message: "Canteen Owner profile created and linked to Hall successfully.",
        data: result,
    });
});
const updateCanteenOwnerStatus = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const result = await canteen_service_1.CanteenService.updateCanteenOwnerStatus(req.params.id, req.body);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Canteen Owner status updated successfully.",
        data: result,
    });
});
const upsertMasterPriceItem = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const result = await canteen_service_1.CanteenService.upsertMasterPriceItem(req.user.userId, req.body);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Hall master price cap updated successfully.",
        data: result,
    });
});
const getHallMasterPrices = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const result = await canteen_service_1.CanteenService.getHallMasterPrices(req.params.hallId);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Hall master price list retrieved successfully.",
        data: result,
    });
});
const reviewMenuItemPrice = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const result = await canteen_service_1.CanteenService.reviewMenuItemPrice(req.user.userId, req.params.menuItemId, req.body);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: `Menu item price ${req.body.approvalStatus.toLowerCase()} successfully.`,
        data: result,
    });
});
const resolveFoodComplaint = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const result = await canteen_service_1.CanteenService.resolveFoodComplaint(req.user.userId, req.params.complaintId, req.body);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Food hygiene complaint resolved successfully.",
        data: result,
    });
});
// ============================================================================
// 2. CANTEEN OWNER CONTROLLERS
// ============================================================================
const createMenuItem = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const result = await canteen_service_1.CanteenService.createMenuItem(req.user.userId, req.body);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: http_status_1.default.CREATED,
        success: true,
        message: "Menu item created successfully.",
        data: result,
    });
});
const updateMenuItem = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const result = await canteen_service_1.CanteenService.updateMenuItem(req.user.userId, req.params.menuItemId, req.body);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Menu item updated successfully.",
        data: result,
    });
});
const getCanteenOwnMenu = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const result = await canteen_service_1.CanteenService.getCanteenOwnMenu(req.user.userId);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Canteen menu retrieved successfully.",
        data: result,
    });
});
const getKitchenPrepSummary = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const mealDate = req.query.mealDate || new Date().toISOString().split("T")[0];
    const mealSlot = req.query.mealSlot || enums_1.MealSlot.LUNCH;
    const result = await canteen_service_1.CanteenService.getKitchenPrepSummary(req.user.userId, mealDate, mealSlot);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Kitchen preparation summary retrieved successfully.",
        data: result,
    });
});
const getVendorSalesAndDueLedger = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const result = await canteen_service_1.CanteenService.getVendorSalesAndDueLedger(req.user.userId, req.query.fromDate, req.query.toDate);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Canteen sales and due ledger retrieved successfully.",
        data: result,
    });
});
const redeemFoodToken = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const result = await canteen_service_1.CanteenService.redeemFoodToken(req.user.userId, req.body);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: result.message,
        data: result,
    });
});
const updateOrderStatus = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const result = await canteen_service_1.CanteenService.updateOrderStatus(req.user.userId, req.params.orderId, req.body);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Order status updated successfully.",
        data: result,
    });
});
// ============================================================================
// 3. STUDENT CONTROLLERS
// ============================================================================
const getStudentLiveMenu = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const result = await canteen_service_1.CanteenService.getStudentLiveMenu(req.user.userId, req.query.mealDate, req.query.mealSlot);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Live canteen menu retrieved successfully.",
        data: result,
    });
});
const createFoodOrder = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const result = await canteen_service_1.CanteenService.createFoodOrder(req.user.userId, req.body);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: http_status_1.default.CREATED,
        success: true,
        message: "Food pre-order placed successfully.",
        data: result,
    });
});
const getStudentMyOrders = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const result = await canteen_service_1.CanteenService.getStudentMyOrders(req.user.userId);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Your food orders retrieved successfully.",
        data: result,
    });
});
const cancelFoodOrder = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const result = await canteen_service_1.CanteenService.cancelFoodOrder(req.user.userId, req.params.orderId, req.body?.reason);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Food order cancelled successfully.",
        data: result,
    });
});
const getDigitalMealSlip = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const result = await canteen_service_1.CanteenService.getDigitalMealSlip(req.user.userId, req.params.orderId);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Verified digital meal slip retrieved successfully.",
        data: result,
    });
});
const createMealReview = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const result = await canteen_service_1.CanteenService.createMealReview(req.user.userId, req.body);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: http_status_1.default.CREATED,
        success: true,
        message: "Verified meal review submitted successfully.",
        data: result,
    });
});
const createFoodComplaint = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const result = await canteen_service_1.CanteenService.createFoodComplaint(req.user.userId, req.body);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: http_status_1.default.CREATED,
        success: true,
        message: "Food hygiene complaint submitted with photo proof.",
        data: result,
    });
});
// ============================================================================
// 4. PAYMENT CONTROLLERS (Stripe + bKash + Multi-Gateway)
// ============================================================================
const initiateOrderPayment = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const result = await canteen_payment_service_1.CanteenPaymentService.initiateOrderPayment(req.user.userId, req.params.orderId);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Payment session initiated successfully.",
        data: result,
    });
});
const verifyStripeSession = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const result = await canteen_payment_service_1.CanteenPaymentService.verifyStripeSession(req.params.sessionId);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Stripe payment verified and order confirmed.",
        data: result,
    });
});
const stripeWebhook = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const signature = req.headers["stripe-signature"];
    const result = await canteen_payment_service_1.CanteenPaymentService.handleStripeWebhook(req.body, signature);
    res.status(http_status_1.default.OK).json(result);
});
const bkashCallback = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const tranId = req.query.tranId;
    const paymentID = req.query.paymentID;
    const status = req.query.status;
    const result = await canteen_payment_service_1.CanteenPaymentService.executeBkashCallback(tranId, paymentID, status);
    return res.redirect(result.redirectUrl);
});
exports.CanteenController = {
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
