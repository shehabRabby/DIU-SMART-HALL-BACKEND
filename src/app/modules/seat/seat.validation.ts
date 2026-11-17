import z from "zod";
import { Gender } from "../../../generated/prisma/enums";

const ApplySeatZodSchema = z.object({
  studentUniId: z
    .string()
    .min(5, { message: "Student University ID must be at least 5 characters!" })
    .max(30, { message: "Student University ID cannot exceed 30 characters!" }),

  email: z
    .string()
    .email({ message: "Please provide a valid email address!" }),

  department: z
    .string()
    .min(2, { message: "Department name must be at least 2 characters!" })
    .max(60, { message: "Department name cannot exceed 60 characters!" }),

  personalPhoneNumber: z
    .string()
    .min(11, { message: "Personal phone number must be at least 11 digits!" })
    .max(15, { message: "Personal phone number cannot exceed 15 digits!" }),

  parentPhoneNumber: z
    .string()
    .min(11, { message: "Parent phone number must be at least 11 digits!" })
    .max(15, { message: "Parent phone number cannot exceed 15 digits!" }),

  gender: z.enum([Gender.MALE, Gender.FEMALE], {
    message: "Gender must be either MALE or FEMALE!",
  }),

  previousAddress: z
    .string()
    .min(5, { message: "Previous address must be at least 5 characters!" })
    .max(250, { message: "Previous address cannot exceed 250 characters!" }),

  reason: z
    .string()
    .max(500, { message: "Reason cannot exceed 500 characters!" })
    .optional(),
});

const ApproveSeatApplicationZodSchema = z.object({
  hallId: z.string().uuid({ message: "Valid Hall ID is required!" }),
  roomId: z.string().uuid({ message: "Valid Room ID is required!" }),
  adminNote: z
    .string()
    .max(500, { message: "Admin note cannot exceed 500 characters!" })
    .optional(),
});

const RejectSeatApplicationZodSchema = z.object({
  adminNote: z
    .string()
    .min(5, { message: "Rejection reason must be at least 5 characters!" })
    .max(500, { message: "Admin note cannot exceed 500 characters!" }),
});

const DirectAllocateSeatZodSchema = z.object({
  studentId: z.string().uuid({ message: "Valid Student ID is required!" }),
  hallId: z.string().uuid({ message: "Valid Hall ID is required!" }),
  roomId: z.string().uuid({ message: "Valid Room ID is required!" }),
  studentUniId: z.string().min(5).max(30).optional(),
  department: z.string().min(2).max(60).optional(),
  personalPhoneNumber: z.string().min(11).max(15).optional(),
  parentPhoneNumber: z.string().min(11).max(15).optional(),
  gender: z.enum([Gender.MALE, Gender.FEMALE]).optional(),
  previousAddress: z.string().min(5).max(250).optional(),
  adminNote: z.string().max(500).optional(),
});

const CreateRoomChangeZodSchema = z.object({
  reason: z
    .string()
    .min(10, { message: "Reason must be at least 10 characters long!" })
    .max(500, { message: "Reason cannot exceed 500 characters!" }),

  targetHallId: z
    .string()
    .uuid({ message: "Invalid target Hall ID!" })
    .optional(),

  targetRoomId: z
    .string()
    .uuid({ message: "Invalid target Room ID!" })
    .optional(),
});

const ApproveRoomChangeZodSchema = z.object({
  targetHallId: z.string().uuid({ message: "Valid Target Hall ID is required!" }),
  targetRoomId: z.string().uuid({ message: "Valid Target Room ID is required!" }),
  adminNote: z.string().max(500).optional(),
});

const RejectRoomChangeZodSchema = z.object({
  adminNote: z
    .string()
    .min(5, { message: "Rejection reason must be at least 5 characters!" })
    .max(500, { message: "Admin note cannot exceed 500 characters!" }),
});

const CancelSeatZodSchema = z.object({
  reason: z
    .string()
    .max(500, { message: "Reason cannot exceed 500 characters!" })
    .optional(),
});

export const SeatValidation = {
  ApplySeatZodSchema,
  ApproveSeatApplicationZodSchema,
  RejectSeatApplicationZodSchema,
  DirectAllocateSeatZodSchema,
  CreateRoomChangeZodSchema,
  ApproveRoomChangeZodSchema,
  RejectRoomChangeZodSchema,
  CancelSeatZodSchema,
};