"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeatValidation = void 0;
const zod_1 = __importDefault(require("zod"));
const enums_1 = require("../../../generated/prisma/enums");
const ApplySeatZodSchema = zod_1.default.object({
    studentUniId: zod_1.default
        .string()
        .min(5, { message: "Student University ID must be at least 5 characters!" })
        .max(30, { message: "Student University ID cannot exceed 30 characters!" }),
    email: zod_1.default
        .string()
        .email({ message: "Please provide a valid email address!" }),
    department: zod_1.default
        .string()
        .min(2, { message: "Department name must be at least 2 characters!" })
        .max(60, { message: "Department name cannot exceed 60 characters!" }),
    personalPhoneNumber: zod_1.default
        .string()
        .min(11, { message: "Personal phone number must be at least 11 digits!" })
        .max(15, { message: "Personal phone number cannot exceed 15 digits!" }),
    parentPhoneNumber: zod_1.default
        .string()
        .min(11, { message: "Parent phone number must be at least 11 digits!" })
        .max(15, { message: "Parent phone number cannot exceed 15 digits!" }),
    gender: zod_1.default.enum([enums_1.Gender.MALE, enums_1.Gender.FEMALE], {
        message: "Gender must be either MALE or FEMALE!",
    }),
    previousAddress: zod_1.default
        .string()
        .min(5, { message: "Previous address must be at least 5 characters!" })
        .max(250, { message: "Previous address cannot exceed 250 characters!" }),
    reason: zod_1.default
        .string()
        .max(500, { message: "Reason cannot exceed 500 characters!" })
        .optional(),
});
const ApproveSeatApplicationZodSchema = zod_1.default.object({
    hallId: zod_1.default.string().uuid({ message: "Valid Hall ID is required!" }),
    roomId: zod_1.default.string().uuid({ message: "Valid Room ID is required!" }),
    adminNote: zod_1.default
        .string()
        .max(500, { message: "Admin note cannot exceed 500 characters!" })
        .optional(),
});
const RejectSeatApplicationZodSchema = zod_1.default.object({
    adminNote: zod_1.default
        .string()
        .min(5, { message: "Rejection reason must be at least 5 characters!" })
        .max(500, { message: "Admin note cannot exceed 500 characters!" }),
});
const DirectAllocateSeatZodSchema = zod_1.default.object({
    studentId: zod_1.default.string().uuid({ message: "Valid Student ID is required!" }),
    hallId: zod_1.default.string().uuid({ message: "Valid Hall ID is required!" }),
    roomId: zod_1.default.string().uuid({ message: "Valid Room ID is required!" }),
    studentUniId: zod_1.default.string().min(5).max(30).optional(),
    department: zod_1.default.string().min(2).max(60).optional(),
    personalPhoneNumber: zod_1.default.string().min(11).max(15).optional(),
    parentPhoneNumber: zod_1.default.string().min(11).max(15).optional(),
    gender: zod_1.default.enum([enums_1.Gender.MALE, enums_1.Gender.FEMALE]).optional(),
    previousAddress: zod_1.default.string().min(5).max(250).optional(),
    adminNote: zod_1.default.string().max(500).optional(),
});
const CreateRoomChangeZodSchema = zod_1.default.object({
    reason: zod_1.default
        .string()
        .min(10, { message: "Reason must be at least 10 characters long!" })
        .max(500, { message: "Reason cannot exceed 500 characters!" }),
    targetHallId: zod_1.default
        .string()
        .uuid({ message: "Invalid target Hall ID!" })
        .optional(),
    targetRoomId: zod_1.default
        .string()
        .uuid({ message: "Invalid target Room ID!" })
        .optional(),
});
const ApproveRoomChangeZodSchema = zod_1.default.object({
    targetHallId: zod_1.default.string().uuid({ message: "Valid Target Hall ID is required!" }),
    targetRoomId: zod_1.default.string().uuid({ message: "Valid Target Room ID is required!" }),
    adminNote: zod_1.default.string().max(500).optional(),
});
const RejectRoomChangeZodSchema = zod_1.default.object({
    adminNote: zod_1.default
        .string()
        .min(5, { message: "Rejection reason must be at least 5 characters!" })
        .max(500, { message: "Admin note cannot exceed 500 characters!" }),
});
const CancelSeatZodSchema = zod_1.default.object({
    reason: zod_1.default
        .string()
        .max(500, { message: "Reason cannot exceed 500 characters!" })
        .optional(),
});
exports.SeatValidation = {
    ApplySeatZodSchema,
    ApproveSeatApplicationZodSchema,
    RejectSeatApplicationZodSchema,
    DirectAllocateSeatZodSchema,
    CreateRoomChangeZodSchema,
    ApproveRoomChangeZodSchema,
    RejectRoomChangeZodSchema,
    CancelSeatZodSchema,
};
