"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GatePassValidation = void 0;
const zod_1 = require("zod");
const enums_1 = require("../../../generated/prisma/enums");
const createGatePassZodSchema = zod_1.z
    .object({
    passType: zod_1.z.nativeEnum(enums_1.PassType),
    reason: zod_1.z.string().min(5, "Please provide a valid reason (min 5 chars)").max(500),
    destination: zod_1.z.string().min(2, "Destination is required").max(200),
    emergencyContact: zod_1.z
        .string()
        .min(8, "Valid emergency contact number is required")
        .max(20),
    departureAt: zod_1.z.string().refine((val) => !Number.isNaN(Date.parse(val)), {
        message: "Invalid departureAt date format",
    }),
    expectedReturnAt: zod_1.z.string().refine((val) => !Number.isNaN(Date.parse(val)), {
        message: "Invalid expectedReturnAt date format",
    }),
})
    .refine((data) => new Date(data.expectedReturnAt) > new Date(data.departureAt), {
    message: "Expected return time must be after departure time",
    path: ["expectedReturnAt"],
});
const reviewGatePassZodSchema = zod_1.z.object({
    status: zod_1.z.enum(["APPROVED", "REJECTED"]),
    adminNote: zod_1.z.string().max(300).optional(),
});
const updateGateLogZodSchema = zod_1.z.object({
    action: zod_1.z.enum(["CHECKED_OUT", "RETURNED"]),
});
exports.GatePassValidation = {
    createGatePassZodSchema,
    reviewGatePassZodSchema,
    updateGateLogZodSchema,
};
