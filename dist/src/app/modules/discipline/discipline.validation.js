import { z } from "zod";
import { IncidentCategory, WarningSeverity, } from "../../../generated/prisma/enums";
const createIncidentZodSchema = z.object({
    accusedStudentId: z
        .string()
        .min(1, "Accused student ID or University ID is required"),
    title: z
        .string()
        .min(3, "Incident title must be at least 3 characters")
        .max(150),
    description: z
        .string()
        .min(10, "Please provide a detailed description (min 10 chars)"),
    category: z.nativeEnum(IncidentCategory).optional(),
    severity: z.nativeEnum(WarningSeverity).optional(),
});
const resolveIncidentZodSchema = z.object({
    action: z.enum(["MEDIATING", "RESOLVED", "ESCALATED", "DISMISSED"]),
    mediationNotes: z
        .string()
        .min(5, "Mediation or resolution notes are required"),
    issueAsShowCause: z.boolean().optional(),
    appealHours: z.number().int().min(12).max(168).optional(),
    fineAmount: z.number().min(0).optional(),
    expiryDays: z.number().int().min(30).max(365).optional(),
});
const issueWarningZodSchema = z.object({
    studentId: z.string().min(1, "Student ID or University ID is required"),
    title: z.string().min(3, "Warning title is required").max(150),
    reason: z.string().min(10, "Detailed reason is required"),
    category: z.nativeEnum(IncidentCategory).optional(),
    severity: z.nativeEnum(WarningSeverity).optional(),
    issueAsShowCause: z.boolean().optional(),
    appealHours: z.number().int().min(12).max(168).optional(),
    fineAmount: z.number().min(0).optional(),
    expiryDays: z.number().int().min(30).max(365).optional(),
    forceExpel: z.boolean().optional(),
});
const submitAppealZodSchema = z.object({
    appealText: z
        .string()
        .min(15, "Appeal explanation must be at least 15 characters"),
});
const reviewAppealZodSchema = z.object({
    decision: z.enum(["UPHOLD", "REVOKE"]),
    reviewNote: z.string().min(5, "Review note is required"),
});
const revokeExpulsionZodSchema = z.object({
    revokeReason: z
        .string()
        .min(10, "Official reason for revoking expulsion is required"),
});
export const DisciplineValidation = {
    createIncidentZodSchema,
    resolveIncidentZodSchema,
    issueWarningZodSchema,
    submitAppealZodSchema,
    reviewAppealZodSchema,
    revokeExpulsionZodSchema,
};
