"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoticeValidation = void 0;
const zod_1 = require("zod");
const enums_1 = require("../../../generated/prisma/enums");
const attachmentItemSchema = zod_1.z.object({
    url: zod_1.z.string().url("Invalid attachment URL"),
    type: zod_1.z.nativeEnum(enums_1.AttachmentType),
    fileName: zod_1.z.string().min(1, "File name is required"),
});
const createNoticeZodSchema = zod_1.z.object({
    title: zod_1.z
        .string()
        .min(3, "Notice title must be at least 3 characters")
        .max(200),
    content: zod_1.z
        .string()
        .min(5, "Notice content must be at least 5 characters"),
    category: zod_1.z.nativeEnum(enums_1.NoticeCategory).optional().default("GENERAL"),
    priority: zod_1.z.nativeEnum(enums_1.NoticePriority).optional().default("NORMAL"),
    isPinned: zod_1.z.boolean().optional().default(false),
    hallId: zod_1.z.string().uuid("Invalid hallId format").nullable().optional(),
    attachments: zod_1.z
        .array(attachmentItemSchema)
        .max(5, "Maximum 5 attachments are allowed per notice")
        .optional()
        .default([]),
    expiresAt: zod_1.z
        .string()
        .refine((val) => !Number.isNaN(Date.parse(val)), {
        message: "Invalid expiresAt date format",
    })
        .nullable()
        .optional(),
});
const updateNoticeZodSchema = zod_1.z.object({
    title: zod_1.z.string().min(3).max(200).optional(),
    content: zod_1.z.string().min(5).optional(),
    category: zod_1.z.nativeEnum(enums_1.NoticeCategory).optional(),
    priority: zod_1.z.nativeEnum(enums_1.NoticePriority).optional(),
    isPinned: zod_1.z.boolean().optional(),
    hallId: zod_1.z.string().uuid("Invalid hallId format").nullable().optional(),
    attachments: zod_1.z
        .array(attachmentItemSchema)
        .max(5, "Maximum 5 attachments are allowed per notice")
        .optional(),
    expiresAt: zod_1.z
        .string()
        .refine((val) => !Number.isNaN(Date.parse(val)), {
        message: "Invalid expiresAt date format",
    })
        .nullable()
        .optional(),
});
exports.NoticeValidation = {
    createNoticeZodSchema,
    updateNoticeZodSchema,
};
