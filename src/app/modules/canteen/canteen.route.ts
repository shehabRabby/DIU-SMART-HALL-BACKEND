import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { CanteenController } from "./canteen.controller";
import { CanteenValidation } from "./canteen.validation";

const router = Router();

// ============================================================================
// 1. ADMIN GOVERNANCE ROUTES
// ============================================================================
router.post(
  "/owners",
  auth(Role.SUPER_ADMIN, Role.ADMIN),
  validateRequest(CanteenValidation.createCanteenOwnerZodSchema),
  CanteenController.createCanteenOwner,
);

router.patch(
  "/owners/:id/status",
  auth(Role.SUPER_ADMIN, Role.ADMIN),
  validateRequest(CanteenValidation.updateCanteenOwnerStatusZodSchema),
  CanteenController.updateCanteenOwnerStatus,
);

router.put(
  "/master-prices",
  auth(Role.SUPER_ADMIN, Role.ADMIN),
  validateRequest(CanteenValidation.upsertMasterPriceZodSchema),
  CanteenController.upsertMasterPriceItem,
);

router.get(
  "/master-prices/:hallId",
  auth(Role.SUPER_ADMIN, Role.ADMIN, Role.CANTEEN_OWNER),
  CanteenController.getHallMasterPrices,
);

router.patch(
  "/menu/:menuItemId/review-price",
  auth(Role.SUPER_ADMIN, Role.ADMIN),
  validateRequest(CanteenValidation.reviewMenuPriceZodSchema),
  CanteenController.reviewMenuItemPrice,
);

router.patch(
  "/complaints/:complaintId/resolve",
  auth(Role.SUPER_ADMIN, Role.ADMIN),
  validateRequest(CanteenValidation.resolveFoodComplaintZodSchema),
  CanteenController.resolveFoodComplaint,
);

// ============================================================================
// 2. CANTEEN OWNER ROUTES
// ============================================================================
router.post(
  "/menu",
  auth(Role.CANTEEN_OWNER),
  validateRequest(CanteenValidation.createMenuItemZodSchema),
  CanteenController.createMenuItem,
);

router.patch(
  "/menu/:menuItemId",
  auth(Role.CANTEEN_OWNER),
  validateRequest(CanteenValidation.updateMenuItemZodSchema),
  CanteenController.updateMenuItem,
);

router.get(
  "/menu/my-canteen",
  auth(Role.CANTEEN_OWNER),
  CanteenController.getCanteenOwnMenu,
);

router.get(
  "/kitchen/prep-summary",
  auth(Role.CANTEEN_OWNER),
  CanteenController.getKitchenPrepSummary,
);

router.get(
  "/ledger",
  auth(Role.CANTEEN_OWNER),
  CanteenController.getVendorSalesAndDueLedger,
);

router.post(
  "/orders/redeem",
  auth(Role.CANTEEN_OWNER),
  validateRequest(CanteenValidation.redeemFoodTokenZodSchema),
  CanteenController.redeemFoodToken,
);

router.patch(
  "/orders/:orderId/status",
  auth(Role.CANTEEN_OWNER),
  validateRequest(CanteenValidation.updateOrderStatusZodSchema),
  CanteenController.updateOrderStatus,
);

// ============================================================================
// 3. STUDENT ROUTES
// ============================================================================
router.get(
  "/menu/live",
  auth(Role.STUDENT),
  CanteenController.getStudentLiveMenu,
);

router.post(
  "/orders",
  auth(Role.STUDENT),
  validateRequest(CanteenValidation.createFoodOrderZodSchema),
  CanteenController.createFoodOrder,
);

router.get(
  "/orders/my-orders",
  auth(Role.STUDENT),
  CanteenController.getStudentMyOrders,
);

router.patch(
  "/orders/:orderId/cancel",
  auth(Role.STUDENT),
  CanteenController.cancelFoodOrder,
);

router.get(
  "/orders/:orderId/slip",
  auth(Role.STUDENT),
  CanteenController.getDigitalMealSlip,
);

router.post(
  "/reviews",
  auth(Role.STUDENT),
  validateRequest(CanteenValidation.createMealReviewZodSchema),
  CanteenController.createMealReview,
);

router.post(
  "/complaints",
  auth(Role.STUDENT),
  validateRequest(CanteenValidation.createFoodComplaintZodSchema),
  CanteenController.createFoodComplaint,
);

// ============================================================================
// 4. PAYMENT ROUTES (Student Initiation + Gateway Callbacks)
// ============================================================================
router.post(
  "/orders/:orderId/pay",
  auth(Role.STUDENT),
  CanteenController.initiateOrderPayment,
);

router.get(
  "/payments/stripe/verify/:sessionId",
  auth(Role.STUDENT),
  CanteenController.verifyStripeSession,
);

// Public callback route invoked directly by bKash server redirect
router.get("/payments/bkash/callback", CanteenController.bkashCallback);

export const CanteenRoutes = router;