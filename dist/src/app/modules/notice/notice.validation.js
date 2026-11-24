import { z } from "zod";
import { AttachmentType, NoticeCategory, NoticePriority, } from "../../../generated/prisma/enums";
const attachmentItemSchema = z.object({
    url: z.string().url("Invalid attachment URL"),
    type: z.nativeEnum(AttachmentType),
    fileName: z.string().min(1, "File name is required"),
});
const createNoticeZodSchema = z.object({
    title: z
        .string()
        .min(3, "Notice title must be at least 3 characters")
        .max(200),
    content: z
        .string()
        .min(5, "Notice content must be at least 5 characters"),
    category: z.nativeEnum(NoticeCategory).optional().default("GENERAL"),
    priority: z.nativeEnum(NoticePriority).optional().default("NORMAL"),
    isPinned: z.boolean().optional().default(false),
    hallId: z.string().uuid("Invalid hallId format").nullable().optional(),
    attachments: z
        .array(attachmentItemSchema)
        .max(5, "Maximum 5 attachments are allowed per notice")
        .optional()
        .default([]),
    expiresAt: z
        .string()
        .refine((val) => !Number.isNaN(Date.parse(val)), {
        message: "Invalid expiresAt date format",
    })
        .nullable()
        .optional(),
});
const updateNoticeZodSchema = z.object({
    title: z.string().min(3).max(200).optional(),
    content: z.string().min(5).optional(),
    category: z.nativeEnum(NoticeCategory).optional(),
    priority: z.nativeEnum(NoticePriority).optional(),
    isPinned: z.boolean().optional(),
    hallId: z.string().uuid("Invalid hallId format").nullable().optional(),
    attachments: z
        .array(attachmentItemSchema)
        .max(5, "Maximum 5 attachments are allowed per notice")
        .optional(),
    expiresAt: z
        .string()
        .refine((val) => !Number.isNaN(Date.parse(val)), {
        message: "Invalid expiresAt date format",
    })
        .nullable()
        .optional(),
});
export const NoticeValidation = {
    createNoticeZodSchema,
    updateNoticeZodSchema,
};
