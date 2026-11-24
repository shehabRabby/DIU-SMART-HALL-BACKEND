import z from "zod";
import { Gender, RoomStatus } from "../../../generated/prisma/enums";
const CreateHallZodSchema = z.object({
    name: z
        .string()
        .min(3, { message: "Hall name must be at least 3 characters long!" })
        .max(100, { message: "Hall name cannot exceed 100 characters!" }),
    shortName: z
        .string()
        .min(2, { message: "Short name must be at least 2 characters long!" })
        .max(20, { message: "Short name cannot exceed 20 characters!" }),
    genderType: z.enum([Gender.MALE, Gender.FEMALE], {
        message: "Gender type must be either MALE or FEMALE!",
    }),
    totalFloors: z
        .number()
        .int({ message: "Total floors must be an integer!" })
        .min(1, { message: "Total floors must be at least 1!" })
        .max(30, { message: "Total floors cannot exceed 30!" }),
    roomsPerFloor: z
        .number()
        .int({ message: "Rooms per floor must be an integer!" })
        .min(1, { message: "Rooms per floor must be at least 1!" })
        .max(100, { message: "Rooms per floor cannot exceed 100!" }),
    defaultRoomCapacity: z
        .number()
        .int()
        .min(1, { message: "Default room capacity must be at least 1!" })
        .max(10, { message: "Default room capacity cannot exceed 10!" })
        .optional(),
    monthlyFee: z
        .number()
        .min(0, { message: "Monthly fee cannot be negative!" })
        .optional(),
});
const UpdateHallZodSchema = z.object({
    name: z
        .string()
        .min(3, { message: "Hall name must be at least 3 characters long!" })
        .max(100, { message: "Hall name cannot exceed 100 characters!" })
        .optional(),
    shortName: z
        .string()
        .min(2, { message: "Short name must be at least 2 characters long!" })
        .max(20, { message: "Short name cannot exceed 20 characters!" })
        .optional(),
    totalFloors: z
        .number()
        .int()
        .min(1, { message: "Total floors must be at least 1!" })
        .max(30, { message: "Total floors cannot exceed 30!" })
        .optional(),
    roomsPerFloor: z
        .number()
        .int()
        .min(1, { message: "Rooms per floor must be at least 1!" })
        .max(100, { message: "Rooms per floor cannot exceed 100!" })
        .optional(),
    defaultRoomCapacity: z.number().int().min(1).max(10).optional(),
    monthlyFee: z
        .number()
        .min(0, { message: "Monthly fee cannot be negative!" })
        .optional(),
    isActive: z.boolean().optional(),
});
const CreateSingleRoomZodSchema = z.object({
    hallId: z.string().uuid({ message: "Valid Hall ID is required!" }),
    roomNumber: z
        .string()
        .min(1, { message: "Room number is required!" })
        .max(10, { message: "Room number cannot exceed 10 characters!" }),
    floor: z
        .number()
        .int({ message: "Floor must be an integer!" })
        .min(0, { message: "Floor cannot be negative (use 0 for Ground Floor)!" }),
    capacity: z
        .number()
        .int()
        .min(1, { message: "Room capacity must be at least 1!" })
        .max(10, { message: "Room capacity cannot exceed 10!" })
        .optional(),
});
const BulkGenerateRoomsZodSchema = z
    .object({
    hallId: z.string().uuid({ message: "Valid Hall ID is required!" }),
    startFloor: z
        .number()
        .int({ message: "Start floor must be an integer!" })
        .min(0, {
        message: "Start floor cannot be negative (0 = Ground Floor)!",
    }),
    endFloor: z
        .number()
        .int({ message: "End floor must be an integer!" })
        .min(0, { message: "End floor cannot be negative!" }),
    roomsPerFloor: z
        .number()
        .int({ message: "Rooms per floor must be an integer!" })
        .min(1, { message: "Rooms per floor must be at least 1!" })
        .max(100, { message: "Rooms per floor cannot exceed 100!" }),
    capacity: z
        .number()
        .int()
        .min(1, { message: "Room capacity must be at least 1!" })
        .max(10, { message: "Room capacity cannot exceed 10!" })
        .optional(),
})
    .refine((data) => data.endFloor >= data.startFloor, {
    message: "End floor must be greater than or equal to start floor!",
    path: ["endFloor"],
});
const UpdateRoomZodSchema = z.object({
    capacity: z
        .number()
        .int()
        .min(1, { message: "Room capacity must be at least 1!" })
        .max(10, { message: "Room capacity cannot exceed 10!" })
        .optional(),
    status: z
        .enum([RoomStatus.AVAILABLE, RoomStatus.FULL, RoomStatus.MAINTENANCE], {
        message: "Invalid room status!",
    })
        .optional(),
});
export const HallValidation = {
    CreateHallZodSchema,
    UpdateHallZodSchema,
    CreateSingleRoomZodSchema,
    BulkGenerateRoomsZodSchema,
    UpdateRoomZodSchema,
};
