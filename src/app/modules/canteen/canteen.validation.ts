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
  name: z.string().trim().min(2, "Owner name is required").max(100),
  email: z.string().trim().email("Valid email address is required"),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
  businessName: z
    .string()
    .trim()
    .min(2, "Canteen business name is required")
    .max(120),
  contactPhone: z
    .string()
    .trim()
    .regex(/^01[3-9]\d{8}$/, "Valid 11-digit Bangladeshi mobile number is required"),
  hallId: z.string().uuid("Valid Hall ID is required"),
});

// 1B. Admin: Suspend, Activate, or Remove Canteen Owner (SRS Section 1 & 6)
const updateCanteenOwnerStatusZodSchema = z.object({
  isActive: z.boolean({
    message: "isActive boolean status is required",
  }),
  removeAccount: z.boolean().optional().default(false),
  reason: z.string().trim().max(300).optional(),
});

// 2. Admin: Set Hall Master Price Cap List
const upsertMasterPriceZodSchema = z.object({
  hallId: z.string().uuid("Valid Hall ID is required"),
  itemName: z.string().trim().min(2, "Food item name is required").max(100),
  category: z.nativeEnum(FoodCategory),
  portion: z.nativeEnum(FoodPortion).default(FoodPortion.REGULAR),
  maxAllowedTk: z
    .number()
    .finite()
    .positive("Maximum allowed price must be greater than 0")
    .max(50000, "Price cap exceeds allowed system limit"),
  isActive: z.boolean().optional().default(true),
});

// 3. Canteen Owner: Create Menu Item (Single or Combo/Thali)
const createMenuItemZodSchema = z
  .object({
    name: z.string().trim().min(2, "Menu item name is required").max(100),
    description: z.string().trim().max(500).optional(),
    imageUrl: z.string().url("Valid image URL is required").optional(),
    category: z.nativeEnum(FoodCategory),
    portion: z.nativeEnum(FoodPortion).default(FoodPortion.REGULAR),
    price: z
      .number()
      .finite()
      .positive("Price must be greater than 0")
      .max(50000, "Price exceeds allowed limit"),
    isRegular: z.boolean().default(true),
    isSpecial: z.boolean().default(false),
    availableDate: z.string().optional().nullable(),
    availableSlots: z
      .array(z.nativeEnum(MealSlot))
      .min(1, "At least one meal slot (BREAKFAST, LUNCH, DINNER) is required"),
    isCombo: z.boolean().default(false),
    comboDetails: z
      .array(
        z.object({
          itemName: z.string().trim().min(1).max(100),
          qty: z.number().int().positive().max(20),
        }),
      )
      .optional()
      .default([]),
    maxQuantity: z.number().int().positive().max(5000).optional().nullable(),
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
  )
  .refine(
    (data) => {
      if (data.isCombo && (!data.comboDetails || data.comboDetails.length === 0)) {
        return false;
      }
      return true;
    },
    {
      message: "Combo/Thali items must specify at least one item in comboDetails",
      path: ["comboDetails"],
    },
  );

// 4. Canteen Owner: Update Menu Item
const updateMenuItemZodSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(500).optional(),
  imageUrl: z.string().url().optional(),
  price: z.number().finite().positive().max(50000).optional(),
  isRegular: z.boolean().optional(),
  isSpecial: z.boolean().optional(),
  availableDate: z.string().optional().nullable(),
  availableSlots: z.array(z.nativeEnum(MealSlot)).min(1).optional(),
  maxQuantity: z.number().int().positive().max(5000).optional().nullable(),
  isAvailable: z.boolean().optional(),
});

// 5. Admin: Approve or Reject Menu Price Hike Request
const reviewMenuPriceZodSchema = z.object({
  approvalStatus: z.enum([
    MenuApprovalStatus.APPROVED,
    MenuApprovalStatus.REJECTED,
  ]),
  adminNote: z.string().trim().max(300).optional(),
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
    .min(1, "Order must contain at least one food item")
    .max(20, "Maximum 20 distinct items allowed per order"),
});

// 7. Canteen Owner: Verify & Redeem Digital Meal Slip (QR Token or Order Code + 4-Digit PIN)
const redeemFoodTokenZodSchema = z
  .object({
    qrToken: z.string().trim().optional(),
    orderCode: z.string().trim().optional(),
    pickupPin: z
      .string()
      .regex(/^\d{4}$/, "Pickup PIN must be exactly 4 numeric digits")
      .optional(),
    collectCashConfirmed: z.boolean().optional().default(false),
  })
  .refine(
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
  comment: z.string().trim().max(500).optional(),
});

// 10. Student: Submit Evidence-Based Hygiene/Quality Complaint
const createFoodComplaintZodSchema = z.object({
  orderId: z.string().uuid("Valid Order ID is required"),
  title: z.string().trim().min(4, "Complaint title is required").max(150),
  description: z
    .string()
    .trim()
    .min(10, "Detailed description is required")
    .max(1000),
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
  fineAmount: z.number().finite().min(0).max(100000).optional().default(0),
  adminNote: z.string().trim().min(3, "Admin decision note is required").max(500),
});

export const CanteenValidation = {
  createCanteenOwnerZodSchema,
  updateCanteenOwnerStatusZodSchema,
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