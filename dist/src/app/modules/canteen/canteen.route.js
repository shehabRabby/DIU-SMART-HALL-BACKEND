"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CanteenRoutes = void 0;
const express_1 = require("express");
const enums_1 = require("../../../generated/prisma/enums");
const checkAuth_1 = require("../../middleware/checkAuth");
const validateRequest_1 = require("../../middleware/validateRequest");
const canteen_controller_1 = require("./canteen.controller");
const canteen_validation_1 = require("./canteen.validation");
const router = (0, express_1.Router)();
// ============================================================================
// 1. ADMIN GOVERNANCE ROUTES
// ============================================================================
router.post("/owners", (0, checkAuth_1.auth)(enums_1.Role.SUPER_ADMIN, enums_1.Role.ADMIN), (0, validateRequest_1.validateRequest)(canteen_validation_1.CanteenValidation.createCanteenOwnerZodSchema), canteen_controller_1.CanteenController.createCanteenOwner);
router.patch("/owners/:id/status", (0, checkAuth_1.auth)(enums_1.Role.SUPER_ADMIN, enums_1.Role.ADMIN), (0, validateRequest_1.validateRequest)(canteen_validation_1.CanteenValidation.updateCanteenOwnerStatusZodSchema), canteen_controller_1.CanteenController.updateCanteenOwnerStatus);
router.put("/master-prices", (0, checkAuth_1.auth)(enums_1.Role.SUPER_ADMIN, enums_1.Role.ADMIN), (0, validateRequest_1.validateRequest)(canteen_validation_1.CanteenValidation.upsertMasterPriceZodSchema), canteen_controller_1.CanteenController.upsertMasterPriceItem);
router.get("/master-prices/:hallId", (0, checkAuth_1.auth)(enums_1.Role.SUPER_ADMIN, enums_1.Role.ADMIN, enums_1.Role.CANTEEN_OWNER), canteen_controller_1.CanteenController.getHallMasterPrices);
router.patch("/menu/:menuItemId/review-price", (0, checkAuth_1.auth)(enums_1.Role.SUPER_ADMIN, enums_1.Role.ADMIN), (0, validateRequest_1.validateRequest)(canteen_validation_1.CanteenValidation.reviewMenuPriceZodSchema), canteen_controller_1.CanteenController.reviewMenuItemPrice);
router.patch("/complaints/:complaintId/resolve", (0, checkAuth_1.auth)(enums_1.Role.SUPER_ADMIN, enums_1.Role.ADMIN), (0, validateRequest_1.validateRequest)(canteen_validation_1.CanteenValidation.resolveFoodComplaintZodSchema), canteen_controller_1.CanteenController.resolveFoodComplaint);
// ============================================================================
// 2. CANTEEN OWNER ROUTES
// ============================================================================
router.post("/menu", (0, checkAuth_1.auth)(enums_1.Role.CANTEEN_OWNER), (0, validateRequest_1.validateRequest)(canteen_validation_1.CanteenValidation.createMenuItemZodSchema), canteen_controller_1.CanteenController.createMenuItem);
router.patch("/menu/:menuItemId", (0, checkAuth_1.auth)(enums_1.Role.CANTEEN_OWNER), (0, validateRequest_1.validateRequest)(canteen_validation_1.CanteenValidation.updateMenuItemZodSchema), canteen_controller_1.CanteenController.updateMenuItem);
router.get("/menu/my-canteen", (0, checkAuth_1.auth)(enums_1.Role.CANTEEN_OWNER), canteen_controller_1.CanteenController.getCanteenOwnMenu);
router.get("/kitchen/prep-summary", (0, checkAuth_1.auth)(enums_1.Role.CANTEEN_OWNER), canteen_controller_1.CanteenController.getKitchenPrepSummary);
router.get("/ledger", (0, checkAuth_1.auth)(enums_1.Role.CANTEEN_OWNER), canteen_controller_1.CanteenController.getVendorSalesAndDueLedger);
router.post("/orders/redeem", (0, checkAuth_1.auth)(enums_1.Role.CANTEEN_OWNER), (0, validateRequest_1.validateRequest)(canteen_validation_1.CanteenValidation.redeemFoodTokenZodSchema), canteen_controller_1.CanteenController.redeemFoodToken);
router.patch("/orders/:orderId/status", (0, checkAuth_1.auth)(enums_1.Role.CANTEEN_OWNER), (0, validateRequest_1.validateRequest)(canteen_validation_1.CanteenValidation.updateOrderStatusZodSchema), canteen_controller_1.CanteenController.updateOrderStatus);
// ============================================================================
// 3. STUDENT ROUTES
// ============================================================================
router.get("/menu/live", (0, checkAuth_1.auth)(enums_1.Role.STUDENT), canteen_controller_1.CanteenController.getStudentLiveMenu);
router.post("/orders", (0, checkAuth_1.auth)(enums_1.Role.STUDENT), (0, validateRequest_1.validateRequest)(canteen_validation_1.CanteenValidation.createFoodOrderZodSchema), canteen_controller_1.CanteenController.createFoodOrder);
router.get("/orders/my-orders", (0, checkAuth_1.auth)(enums_1.Role.STUDENT), canteen_controller_1.CanteenController.getStudentMyOrders);
router.patch("/orders/:orderId/cancel", (0, checkAuth_1.auth)(enums_1.Role.STUDENT), canteen_controller_1.CanteenController.cancelFoodOrder);
router.get("/orders/:orderId/slip", (0, checkAuth_1.auth)(enums_1.Role.STUDENT), canteen_controller_1.CanteenController.getDigitalMealSlip);
router.post("/reviews", (0, checkAuth_1.auth)(enums_1.Role.STUDENT), (0, validateRequest_1.validateRequest)(canteen_validation_1.CanteenValidation.createMealReviewZodSchema), canteen_controller_1.CanteenController.createMealReview);
router.post("/complaints", (0, checkAuth_1.auth)(enums_1.Role.STUDENT), (0, validateRequest_1.validateRequest)(canteen_validation_1.CanteenValidation.createFoodComplaintZodSchema), canteen_controller_1.CanteenController.createFoodComplaint);
// ============================================================================
// 4. PAYMENT ROUTES (Student Initiation + Gateway Callbacks)
// ============================================================================
router.post("/orders/:orderId/pay", (0, checkAuth_1.auth)(enums_1.Role.STUDENT), canteen_controller_1.CanteenController.initiateOrderPayment);
router.get("/payments/stripe/verify/:sessionId", (0, checkAuth_1.auth)(enums_1.Role.STUDENT), canteen_controller_1.CanteenController.verifyStripeSession);
// Public callback route invoked directly by bKash server redirect
router.get("/payments/bkash/callback", canteen_controller_1.CanteenController.bkashCallback);
exports.CanteenRoutes = router;
