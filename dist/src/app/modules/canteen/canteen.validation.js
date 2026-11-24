"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CanteenValidation = void 0;
const zod_1 = require("zod");
const enums_1 = require("../../../generated/prisma/enums");
// 1. Admin: Create Canteen Owner
const createCanteenOwnerZodSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2, "Owner name is required").max(100),
    email: zod_1.z.string().trim().email("Valid email address is required"),
    password: zod_1.z.string().min(6, "Password must be at least 6 characters").max(100),
    businessName: zod_1.z
        .string()
        .trim()
        .min(2, "Canteen business name is required")
        .max(120),
    contactPhone: zod_1.z
        .string()
        .trim()
        .regex(/^01[3-9]\d{8}$/, "Valid 11-digit Bangladeshi mobile number is required"),
    hallId: zod_1.z.string().uuid("Valid Hall ID is required"),
});
// 1B. Admin: Suspend, Activate, or Remove Canteen Owner (SRS Section 1 & 6)
const updateCanteenOwnerStatusZodSchema = zod_1.z.object({
    isActive: zod_1.z.boolean({
        message: "isActive boolean status is required",
    }),
    removeAccount: zod_1.z.boolean().optional().default(false),
    reason: zod_1.z.string().trim().max(300).optional(),
});
// 2. Admin: Set Hall Master Price Cap List
const upsertMasterPriceZodSchema = zod_1.z.object({
    hallId: zod_1.z.string().uuid("Valid Hall ID is required"),
    itemName: zod_1.z.string().trim().min(2, "Food item name is required").max(100),
    category: zod_1.z.nativeEnum(enums_1.FoodCategory),
    portion: zod_1.z.nativeEnum(enums_1.FoodPortion).default(enums_1.FoodPortion.REGULAR),
    maxAllowedTk: zod_1.z
        .number()
        .finite()
        .positive("Maximum allowed price must be greater than 0")
        .max(50000, "Price cap exceeds allowed system limit"),
    isActive: zod_1.z.boolean().optional().default(true),
});
// 3. Canteen Owner: Create Menu Item (Single or Combo/Thali)
const createMenuItemZodSchema = zod_1.z
    .object({
    name: zod_1.z.string().trim().min(2, "Menu item name is required").max(100),
    description: zod_1.z.string().trim().max(500).optional(),
    imageUrl: zod_1.z.string().url("Valid image URL is required").optional(),
    category: zod_1.z.nativeEnum(enums_1.FoodCategory),
    portion: zod_1.z.nativeEnum(enums_1.FoodPortion).default(enums_1.FoodPortion.REGULAR),
    price: zod_1.z
        .number()
        .finite()
        .positive("Price must be greater than 0")
        .max(50000, "Price exceeds allowed limit"),
    isRegular: zod_1.z.boolean().default(true),
    isSpecial: zod_1.z.boolean().default(false),
    availableDate: zod_1.z.string().optional().nullable(),
    availableSlots: zod_1.z
        .array(zod_1.z.nativeEnum(enums_1.MealSlot))
        .min(1, "At least one meal slot (BREAKFAST, LUNCH, DINNER) is required"),
    isCombo: zod_1.z.boolean().default(false),
    comboDetails: zod_1.z
        .array(zod_1.z.object({
        itemName: zod_1.z.string().trim().min(1).max(100),
        qty: zod_1.z.number().int().positive().max(20),
    }))
        .optional()
        .default([]),
    maxQuantity: zod_1.z.number().int().positive().max(5000).optional().nullable(),
    isAvailable: zod_1.z.boolean().default(true),
    masterPriceId: zod_1.z.string().uuid().optional().nullable(),
})
    .refine((data) => {
    if (data.isSpecial && !data.availableDate) {
        return false;
    }
    return true;
}, {
    message: "Special menu items must specify an availableDate",
    path: ["availableDate"],
})
    .refine((data) => {
    if (data.isCombo && (!data.comboDetails || data.comboDetails.length === 0)) {
        return false;
    }
    return true;
}, {
    message: "Combo/Thali items must specify at least one item in comboDetails",
    path: ["comboDetails"],
});
// 4. Canteen Owner: Update Menu Item
const updateMenuItemZodSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2).max(100).optional(),
    description: zod_1.z.string().trim().max(500).optional(),
    imageUrl: zod_1.z.string().url().optional(),
    price: zod_1.z.number().finite().positive().max(50000).optional(),
    isRegular: zod_1.z.boolean().optional(),
    isSpecial: zod_1.z.boolean().optional(),
    availableDate: zod_1.z.string().optional().nullable(),
    availableSlots: zod_1.z.array(zod_1.z.nativeEnum(enums_1.MealSlot)).min(1).optional(),
    maxQuantity: zod_1.z.number().int().positive().max(5000).optional().nullable(),
    isAvailable: zod_1.z.boolean().optional(),
});
// 5. Admin: Approve or Reject Menu Price Hike Request
const reviewMenuPriceZodSchema = zod_1.z.object({
    approvalStatus: zod_1.z.enum([
        enums_1.MenuApprovalStatus.APPROVED,
        enums_1.MenuApprovalStatus.REJECTED,
    ]),
    adminNote: zod_1.z.string().trim().max(300).optional(),
});
// 6. Student: Place Pre-Order (Zero-Trust: Only menuItemId & quantity accepted)
const createFoodOrderZodSchema = zod_1.z.object({
    mealDate: zod_1.z
        .string()
        .min(10, "Target meal date (YYYY-MM-DD or ISO) is required"),
    mealSlot: zod_1.z.nativeEnum(enums_1.MealSlot),
    paymentMethod: zod_1.z.nativeEnum(enums_1.FoodPaymentMethod),
    items: zod_1.z
        .array(zod_1.z.object({
        menuItemId: zod_1.z.string().uuid("Valid menu item ID is required"),
        quantity: zod_1.z
            .number()
            .int()
            .min(1, "Minimum quantity is 1")
            .max(10, "Maximum 10 portions per item allowed in a single order"),
    }))
        .min(1, "Order must contain at least one food item")
        .max(20, "Maximum 20 distinct items allowed per order"),
});
// 7. Canteen Owner: Verify & Redeem Digital Meal Slip (QR Token or Order Code + 4-Digit PIN)
const redeemFoodTokenZodSchema = zod_1.z
    .object({
    qrToken: zod_1.z.string().trim().optional(),
    orderCode: zod_1.z.string().trim().optional(),
    pickupPin: zod_1.z
        .string()
        .regex(/^\d{4}$/, "Pickup PIN must be exactly 4 numeric digits")
        .optional(),
    collectCashConfirmed: zod_1.z.boolean().optional().default(false),
})
    .refine((data) => Boolean(data.qrToken || (data.orderCode && data.pickupPin)), {
    message: "Provide either a valid qrToken OR both orderCode and 4-digit pickupPin",
});
// 8. Canteen Owner: Update Kitchen Order Status
const updateOrderStatusZodSchema = zod_1.z.object({
    orderStatus: zod_1.z.enum([
        enums_1.FoodOrderStatus.PREPARING,
        enums_1.FoodOrderStatus.READY_FOR_PICKUP,
        enums_1.FoodOrderStatus.NO_SHOW,
    ]),
});
// 9. Student: Submit Verified Buyer Rating
const createMealReviewZodSchema = zod_1.z.object({
    orderId: zod_1.z.string().uuid("Valid Order ID is required"),
    menuItemId: zod_1.z.string().uuid("Valid Menu Item ID is required"),
    rating: zod_1.z.number().int().min(1).max(5, "Rating must be between 1 and 5"),
    comment: zod_1.z.string().trim().max(500).optional(),
});
// 10. Student: Submit Evidence-Based Hygiene/Quality Complaint
const createFoodComplaintZodSchema = zod_1.z.object({
    orderId: zod_1.z.string().uuid("Valid Order ID is required"),
    title: zod_1.z.string().trim().min(4, "Complaint title is required").max(150),
    description: zod_1.z
        .string()
        .trim()
        .min(10, "Detailed description is required")
        .max(1000),
    evidenceUrls: zod_1.z
        .array(zod_1.z.string().url())
        .min(1, "At least 1 photo proof is required for food complaints")
        .max(5),
});
// 11. Admin: Resolve Food Complaint (Warning-First Escalation)
const resolveFoodComplaintZodSchema = zod_1.z.object({
    status: zod_1.z.enum([
        enums_1.ComplaintStatus.WARNING_ISSUED,
        enums_1.ComplaintStatus.FINED,
        enums_1.ComplaintStatus.DISMISSED,
    ]),
    fineAmount: zod_1.z.number().finite().min(0).max(100000).optional().default(0),
    adminNote: zod_1.z.string().trim().min(3, "Admin decision note is required").max(500),
});
exports.CanteenValidation = {
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
