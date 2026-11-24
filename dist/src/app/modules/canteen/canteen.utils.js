"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyQrTokenSignature = exports.generateOrderSecurityCredentials = exports.assertWithinServingWindow = exports.assertBeforeCutoffDeadline = exports.getSlotScheduleWindows = exports.normalizeMealDate = void 0;
const crypto_1 = __importDefault(require("crypto"));
const enums_1 = require("../../../generated/prisma/enums");
const config_1 = __importDefault(require("../../config"));
const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000; // UTC+6 (Bangladesh Standard Time)
/**
 * Normalize a date string (e.g., "2026-11-24") into UTC midnight (00:00:00.000Z)
 * so database @db.Date / DateTime comparisons remain timezone-consistent.
 */
const normalizeMealDate = (dateInput) => {
    const parsed = new Date(dateInput);
    if (Number.isNaN(parsed.getTime())) {
        throw new Error("Invalid meal date format provided.");
    }
    const yyyy = parsed.getUTCFullYear();
    const mm = String(parsed.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(parsed.getUTCDate()).padStart(2, "0");
    return new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`);
};
exports.normalizeMealDate = normalizeMealDate;
/**
 * Returns exact UTC timestamps for a given MealDate & MealSlot in Bangladesh Time (UTC+6):
 * - BREAKFAST: Serving 07:00 - 11:30 | Cut-off 01:00 (6 hours prior)
 * - LUNCH:     Serving 12:00 - 17:00 | Cut-off 06:00 (6 hours prior)
 * - DINNER:    Serving 19:00 - 23:00 | Cut-off 13:00 (6 hours prior)
 */
const getSlotScheduleWindows = (mealDate, slot) => {
    const normalized = (0, exports.normalizeMealDate)(mealDate);
    // Base UTC midnight of that calendar date
    const baseMidnightUtcMs = normalized.getTime();
    // Convert local Dhaka hours on that date to exact UTC epoch milliseconds
    const dhakaTimeToUtc = (hour, minute) => baseMidnightUtcMs + (hour * 60 + minute) * 60 * 1000 - DHAKA_OFFSET_MS;
    switch (slot) {
        case enums_1.MealSlot.BREAKFAST:
            return {
                cutoffAt: new Date(dhakaTimeToUtc(1, 0)), // 01:00 AM BDT
                servingStartAt: new Date(dhakaTimeToUtc(7, 0)), // 07:00 AM BDT
                servingEndAt: new Date(dhakaTimeToUtc(11, 30)), // 11:30 AM BDT
                label: "07:00 AM - 11:30 AM",
            };
        case enums_1.MealSlot.LUNCH:
            return {
                cutoffAt: new Date(dhakaTimeToUtc(6, 0)), // 06:00 AM BDT
                servingStartAt: new Date(dhakaTimeToUtc(12, 0)), // 12:00 PM BDT
                servingEndAt: new Date(dhakaTimeToUtc(17, 0)), // 05:00 PM BDT
                label: "12:00 PM - 05:00 PM",
            };
        case enums_1.MealSlot.DINNER:
            return {
                cutoffAt: new Date(dhakaTimeToUtc(13, 0)), // 01:00 PM BDT
                servingStartAt: new Date(dhakaTimeToUtc(19, 0)), // 07:00 PM BDT
                servingEndAt: new Date(dhakaTimeToUtc(23, 0)), // 11:00 PM BDT
                label: "07:00 PM - 11:00 PM",
            };
    }
};
exports.getSlotScheduleWindows = getSlotScheduleWindows;
/**
 * Guard 1: Enforce Minimum 6-Hour Kitchen Preparation Lead Time
 */
const assertBeforeCutoffDeadline = (mealDate, slot) => {
    const now = new Date();
    const schedule = (0, exports.getSlotScheduleWindows)(mealDate, slot);
    if (now >= schedule.cutoffAt) {
        throw new Error(`Pre-order closed for ${slot}. Orders must be placed at least 6 hours before serving (${schedule.label}).`);
    }
    return schedule;
};
exports.assertBeforeCutoffDeadline = assertBeforeCutoffDeadline;
/**
 * Guard 2: Enforce Active Serving Window at Counter Redemption
 */
const assertWithinServingWindow = (mealDate, slot) => {
    const now = new Date();
    const schedule = (0, exports.getSlotScheduleWindows)(mealDate, slot);
    if (now < schedule.servingStartAt) {
        throw new Error(`Too early! ${slot} serving starts at ${schedule.label.split(" - ")[0]}.`);
    }
    if (now > schedule.servingEndAt) {
        throw new Error(`Meal slip expired! ${slot} serving window (${schedule.label}) has already ended.`);
    }
    return schedule;
};
exports.assertWithinServingWindow = assertWithinServingWindow;
/**
 * Generate Unique Order Code (e.g., DIU-FD-849201), 4-Digit PIN & HMAC-Signed QR Token
 */
const getSigningSecret = () => {
    return (process.env.CANTEEN_QR_SECRET ||
        config_1.default.jwt_access_secret ||
        "DIU_SMARTHALL_CANTEEN_HMAC_FALLBACK_2026");
};
const generateOrderSecurityCredentials = (studentId, hallId, mealDate, slot) => {
    const randomDigits = crypto_1.default.randomInt(100000, 999999);
    const orderCode = `DIU-FD-${randomDigits}`;
    const pickupPin = String(crypto_1.default.randomInt(1000, 9999));
    const nonce = crypto_1.default.randomBytes(12).toString("hex");
    const payload = `${orderCode}|${studentId}|${hallId}|${mealDate.toISOString()}|${slot}|${nonce}`;
    const signature = crypto_1.default
        .createHmac("sha256", getSigningSecret())
        .update(payload)
        .digest("hex")
        .slice(0, 24);
    const qrToken = `${orderCode}.${nonce}.${signature}`;
    return {
        orderCode,
        pickupPin,
        qrToken,
    };
};
exports.generateOrderSecurityCredentials = generateOrderSecurityCredentials;
/**
 * Cryptographic Signature Integrity Check before Database Lookup
 */
const verifyQrTokenSignature = (qrToken, expectedStudentId, expectedHallId, expectedMealDate, expectedSlot) => {
    const parts = qrToken.split(".");
    if (parts.length !== 3)
        return false;
    const [orderCode, nonce, providedSignature] = parts;
    const payload = `${orderCode}|${expectedStudentId}|${expectedHallId}|${expectedMealDate.toISOString()}|${expectedSlot}|${nonce}`;
    const expectedSignature = crypto_1.default
        .createHmac("sha256", getSigningSecret())
        .update(payload)
        .digest("hex")
        .slice(0, 24);
    const a = Buffer.from(providedSignature);
    const b = Buffer.from(expectedSignature);
    if (a.length !== b.length)
        return false;
    return crypto_1.default.timingSafeEqual(a, b);
};
exports.verifyQrTokenSignature = verifyQrTokenSignature;
