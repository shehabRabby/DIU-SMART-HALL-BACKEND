import { z } from "zod";
import { PassType } from "../../../generated/prisma/enums";

const createGatePassZodSchema = z
  .object({
    passType: z.nativeEnum(PassType),
    reason: z.string().min(5, "Please provide a valid reason (min 5 chars)").max(500),
    destination: z.string().min(2, "Destination is required").max(200),
    emergencyContact: z
      .string()
      .min(8, "Valid emergency contact number is required")
      .max(20),
    departureAt: z.string().refine((val) => !Number.isNaN(Date.parse(val)), {
      message: "Invalid departureAt date format",
    }),
    expectedReturnAt: z.string().refine((val) => !Number.isNaN(Date.parse(val)), {
      message: "Invalid expectedReturnAt date format",
    }),
  })
  .refine(
    (data) => new Date(data.expectedReturnAt) > new Date(data.departureAt),
    {
      message: "Expected return time must be after departure time",
      path: ["expectedReturnAt"],
    },
  );

const reviewGatePassZodSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  adminNote: z.string().max(300).optional(),
});

const updateGateLogZodSchema = z.object({
  action: z.enum(["CHECKED_OUT", "RETURNED"]),
});

export const GatePassValidation = {
  createGatePassZodSchema,
  reviewGatePassZodSchema,
  updateGateLogZodSchema,
};