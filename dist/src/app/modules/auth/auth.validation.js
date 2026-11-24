"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserValidation = void 0;
const zod_1 = __importDefault(require("zod"));
const StudentRegistrationZodSchema = zod_1.default.object({
    name: zod_1.default
        .string()
        .min(1, { message: "Name is required!" })
        .min(3, { message: "Name must be at least 3 characters long!" })
        .max(30, { message: "Name cannot exceed 30 characters!" }),
    email: zod_1.default
        .string()
        .min(1, { message: "Email is required!" })
        .email({ message: "Please provide a valid email address!" }),
    password: zod_1.default
        .string()
        .min(1, { message: "Password is required!" })
        .min(8, { message: "Password must be at least 8 characters long!" })
        .refine((val) => /[A-Z]/.test(val), {
        message: "Password must contain at least one uppercase letter!",
    })
        .refine((val) => /[a-z]/.test(val), {
        message: "Password must contain at least one lowercase letter!",
    })
        .refine((val) => /\d/.test(val), {
        message: "Password must contain at least one number!",
    })
        .refine((val) => /[@$!%*?&]/.test(val), {
        message: "Password must contain at least one special character (@$!%*?&)!",
    }),
    student: zod_1.default.object({
        studentUniId: zod_1.default
            .string()
            .min(1, { message: "Student University ID is required!" })
            .min(8, { message: "Student ID must be at least 8 characters long!" })
            .max(20, { message: "Student ID cannot exceed 20 characters!" }),
        department: zod_1.default
            .string()
            .min(1, { message: "Department is required!" })
            .min(2, {
            message: "Department name must be at least 2 characters long!",
        }),
        contactNumber: zod_1.default.string().optional(),
    }),
});
const StudentEmailVerifyZodSchema = zod_1.default.object({
    email: zod_1.default
        .string()
        .min(1, { message: "Email is required!" })
        .email({ message: "Please provide a valid email address!" }),
    otp: zod_1.default.string().length(6),
});
const LoginZodSchema = zod_1.default.object({
    email: zod_1.default
        .string()
        .min(1, { message: "Email is required!" })
        .email({ message: "Please provide a valid email address!" }),
    password: zod_1.default
        .string()
        .min(1, { message: "Password is required!" })
        .min(8, { message: "Password must be at least 8 characters long!" })
        .refine((val) => /[A-Z]/.test(val), {
        message: "Password must contain at least one uppercase letter!",
    })
        .refine((val) => /[a-z]/.test(val), {
        message: "Password must contain at least one lowercase letter!",
    })
        .refine((val) => /\d/.test(val), {
        message: "Password must contain at least one number!",
    })
        .refine((val) => /[@$!%*?&]/.test(val), {
        message: "Password must contain at least one special character (@$!%*?&)!",
    }),
});
const ForgotPasswordZodSchema = zod_1.default.object({
    email: zod_1.default.email(),
});
const ResetPasswordZodSchema = zod_1.default.object({
    email: zod_1.default.email(),
    newPassword: zod_1.default
        .string()
        .min(8, "Password Must Minimum 8 Characters Long.")
        .regex(/[a-z]/, "Password must contain atleast 1 Lowercase Letter")
        .regex(/[A-Z]/, "Password must contain atleast 1 Uppercase Letter")
        .regex(/[0-9]/, "Password must contain atleast 1 Number")
        .regex(/[^A-Za-z0-9]/, "Password must contain atleast 1 Special Character"),
    otp: zod_1.default.string().length(6),
});
exports.UserValidation = {
    StudentRegistrationZodSchema,
    StudentEmailVerifyZodSchema,
    LoginZodSchema,
    ForgotPasswordZodSchema,
    ResetPasswordZodSchema,
};
