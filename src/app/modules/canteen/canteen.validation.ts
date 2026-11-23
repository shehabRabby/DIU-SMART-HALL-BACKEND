import { z } from "zod";
import {
  ComplaintStatus,
  FoodCategory,
  FoodOrderStatus,
  FoodPaymentMethod,
  FoodPortion,
  MealSlot,
  MenuApprovalStatus,
} from "../../../generated/prisma/enums";

// 1. Admin: Create Canteen Owner
const createCanteenOwnerZodSchema = z.object({
  name: z.string().min(2, "Owner name is required"),
  email: z.string().email("Valid email address is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  businessName: z.string().min(2, "Canteen business name is required"),
  contactPhone: z
    .string()
    .min(11, "Valid 11-digit contact phone number is required"),
  hallId: z.string().uuid("Valid Hall ID is required"),
});

// 2. Admin: Set Hall Master Price Cap List
const upsertMasterPriceZodSchema = z.object({
  hallId: z.string().uuid("Valid Hall ID is required"),
  itemName: z.string().min(2, "Food item name is required"),
  category: z.nativeEnum(FoodCategory),
  portion: z.nativeEnum(FoodPortion).default(FoodPortion.REGULAR),
  maxAllowedTk: z
    .number()
    .positive("Maximum allowed price must be greater than 0"),
  isActive: z.boolean().optional().default(true),
});

// 3. Canteen Owner: Create Menu Item (Single or Combo/Thali)
const createMenuItemZodSchema = z.object({
    name: z.string().min(2, "Menu item name is required"),
    description: z.string().optional(),
    imageUrl: z.string().url("Valid image URL is required").optional(),
    category: z.nativeEnum(FoodCategory),
    portion: z.nativeEnum(FoodPortion).default(FoodPortion.REGULAR),
    price: z.number().positive("Price must be greater than 0"),
    isRegular: z.boolean().default(true),
    isSpecial: z.boolean().default(false),
    availableDate: z.string().optional().nullable(),
    availableSlots: z
      .array(z.nativeEnum(MealSlot))
      .min(1, "At least one meal slot (BREAKFAST, LUNCH, DINNER) is required"),
    isCombo: z.boolean().default(false),
    comboDetails: z.array(
        z.object({
          itemName: z.string().min(1),
          qty: z.number().int().positive(),
        }),
      )
      .optional()
      .default([]),
    maxQuantity: z.number().int().positive().optional().nullable(),
    isAvailable: z.boolean().default(true),
    masterPriceId: z.string().uuid().optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.isSpecial && !data.availableDate) {
        return false;
      }
      return true;
    },
    {
      message: "Special menu items must specify an availableDate",
      path: ["availableDate"],
    },
  );

// 4. Canteen Owner: Update Menu Item
const updateMenuItemZodSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  price: z.number().positive().optional(),
  isRegular: z.boolean().optional(),
  isSpecial: z.boolean().optional(),
  availableDate: z.string().optional().nullable(),
  availableSlots: z.array(z.nativeEnum(MealSlot)).min(1).optional(),
  maxQuantity: z.number().int().positive().optional().nullable(),
  isAvailable: z.boolean().optional(),
});

// 5. Admin: Approve or Reject Menu Price Hike Request
const reviewMenuPriceZodSchema = z.object({
  approvalStatus: z.enum([
    MenuApprovalStatus.APPROVED,
    MenuApprovalStatus.REJECTED,
  ]),
  adminNote: z.string().optional(),
});

// 6. Student: Place Pre-Order (Zero-Trust: Only menuItemId & quantity accepted)
const createFoodOrderZodSchema = z.object({
  mealDate: z
    .string()
    .min(10, "Target meal date (YYYY-MM-DD or ISO) is required"),
  mealSlot: z.nativeEnum(MealSlot),
  paymentMethod: z.nativeEnum(FoodPaymentMethod),
  items: z
    .array(
      z.object({
        menuItemId: z.string().uuid("Valid menu item ID is required"),
        quantity: z
          .number()
          .int()
          .min(1, "Minimum quantity is 1")
          .max(10, "Maximum 10 portions per item allowed in a single order"),
      }),
    )
    .min(1, "Order must contain at least one food item"),
});

// 7. Canteen Owner: Verify & Redeem Digital Meal Slip (QR Token or Order Code + 4-Digit PIN)
const redeemFoodTokenZodSchema = z.object({
    qrToken: z.string().optional(),
    orderCode: z.string().optional(),
    pickupPin: z.string().length(4, "Pickup PIN must be 4 digits").optional(),
    collectCashConfirmed: z.boolean().optional().default(false),
  }).refine(
    (data) => Boolean(data.qrToken || (data.orderCode && data.pickupPin)),
    {
      message:
        "Provide either a valid qrToken OR both orderCode and 4-digit pickupPin",
    },
  );

// 8. Canteen Owner: Update Kitchen Order Status
const updateOrderStatusZodSchema = z.object({
  orderStatus: z.enum([
    FoodOrderStatus.PREPARING,
    FoodOrderStatus.READY_FOR_PICKUP,
    FoodOrderStatus.NO_SHOW,
  ]),
});

// 9. Student: Submit Verified Buyer Rating
const createMealReviewZodSchema = z.object({
  orderId: z.string().uuid("Valid Order ID is required"),
  menuItemId: z.string().uuid("Valid Menu Item ID is required"),
  rating: z.number().int().min(1).max(5, "Rating must be between 1 and 5"),
  comment: z.string().max(500).optional(),
});

// 10. Student: Submit Evidence-Based Hygiene/Quality Complaint
const createFoodComplaintZodSchema = z.object({
  orderId: z.string().uuid("Valid Order ID is required"),
  title: z.string().min(4, "Complaint title is required"),
  description: z.string().min(10, "Detailed description is required"),
  evidenceUrls: z
    .array(z.string().url())
    .min(1, "At least 1 photo proof is required for food complaints")
    .max(5),
});

// 11. Admin: Resolve Food Complaint (Warning-First Escalation)
const resolveFoodComplaintZodSchema = z.object({
  status: z.enum([
    ComplaintStatus.WARNING_ISSUED,
    ComplaintStatus.FINED,
    ComplaintStatus.DISMISSED,
  ]),
  fineAmount: z.number().min(0).optional().default(0),
  adminNote: z.string().min(3, "Admin decision note is required"),
});

export const CanteenValidation = {
  createCanteenOwnerZodSchema,
  upsertMasterPriceZodSchema,
  createMenuItemZodSchema,
  updateMenuItemZodSchema,
  reviewMenuPriceZodSchema,
  createFoodOrderZodSchema,
  redeemFoodTokenZodSchema,
  updateOrderStatusZodSchema,
  createMealReviewZodSchema,
  createFoodComplaintZodSchema,
  resolveFoodComplaintZodSchema,
};