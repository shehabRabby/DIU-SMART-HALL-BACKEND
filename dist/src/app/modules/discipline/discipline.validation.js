"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisciplineValidation = void 0;
const zod_1 = require("zod");
const enums_1 = require("../../../generated/prisma/enums");
const createIncidentZodSchema = zod_1.z.object({
    accusedStudentId: zod_1.z
        .string()
        .min(1, "Accused student ID or University ID is required"),
    title: zod_1.z
        .string()
        .min(3, "Incident title must be at least 3 characters")
        .max(150),
    description: zod_1.z
        .string()
        .min(10, "Please provide a detailed description (min 10 chars)"),
    category: zod_1.z.nativeEnum(enums_1.IncidentCategory).optional(),
    severity: zod_1.z.nativeEnum(enums_1.WarningSeverity).optional(),
});
const resolveIncidentZodSchema = zod_1.z.object({
    action: zod_1.z.enum(["MEDIATING", "RESOLVED", "ESCALATED", "DISMISSED"]),
    mediationNotes: zod_1.z
        .string()
        .min(5, "Mediation or resolution notes are required"),
    issueAsShowCause: zod_1.z.boolean().optional(),
    appealHours: zod_1.z.number().int().min(12).max(168).optional(),
    fineAmount: zod_1.z.number().min(0).optional(),
    expiryDays: zod_1.z.number().int().min(30).max(365).optional(),
});
const issueWarningZodSchema = zod_1.z.object({
    studentId: zod_1.z.string().min(1, "Student ID or University ID is required"),
    title: zod_1.z.string().min(3, "Warning title is required").max(150),
    reason: zod_1.z.string().min(10, "Detailed reason is required"),
    category: zod_1.z.nativeEnum(enums_1.IncidentCategory).optional(),
    severity: zod_1.z.nativeEnum(enums_1.WarningSeverity).optional(),
    issueAsShowCause: zod_1.z.boolean().optional(),
    appealHours: zod_1.z.number().int().min(12).max(168).optional(),
    fineAmount: zod_1.z.number().min(0).optional(),
    expiryDays: zod_1.z.number().int().min(30).max(365).optional(),
    forceExpel: zod_1.z.boolean().optional(),
});
const submitAppealZodSchema = zod_1.z.object({
    appealText: zod_1.z
        .string()
        .min(15, "Appeal explanation must be at least 15 characters"),
});
const reviewAppealZodSchema = zod_1.z.object({
    decision: zod_1.z.enum(["UPHOLD", "REVOKE"]),
    reviewNote: zod_1.z.string().min(5, "Review note is required"),
});
const revokeExpulsionZodSchema = zod_1.z.object({
    revokeReason: zod_1.z
        .string()
        .min(10, "Official reason for revoking expulsion is required"),
});
exports.DisciplineValidation = {
    createIncidentZodSchema,
    resolveIncidentZodSchema,
    issueWarningZodSchema,
    submitAppealZodSchema,
    reviewAppealZodSchema,
    revokeExpulsionZodSchema,
};
