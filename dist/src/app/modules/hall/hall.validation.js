"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HallValidation = void 0;
const zod_1 = __importDefault(require("zod"));
const enums_1 = require("../../../generated/prisma/enums");
const CreateHallZodSchema = zod_1.default.object({
    name: zod_1.default
        .string()
        .min(3, { message: "Hall name must be at least 3 characters long!" })
        .max(100, { message: "Hall name cannot exceed 100 characters!" }),
    shortName: zod_1.default
        .string()
        .min(2, { message: "Short name must be at least 2 characters long!" })
        .max(20, { message: "Short name cannot exceed 20 characters!" }),
    genderType: zod_1.default.enum([enums_1.Gender.MALE, enums_1.Gender.FEMALE], {
        message: "Gender type must be either MALE or FEMALE!",
    }),
    totalFloors: zod_1.default
        .number()
        .int({ message: "Total floors must be an integer!" })
        .min(1, { message: "Total floors must be at least 1!" })
        .max(30, { message: "Total floors cannot exceed 30!" }),
    roomsPerFloor: zod_1.default
        .number()
        .int({ message: "Rooms per floor must be an integer!" })
        .min(1, { message: "Rooms per floor must be at least 1!" })
        .max(100, { message: "Rooms per floor cannot exceed 100!" }),
    defaultRoomCapacity: zod_1.default
        .number()
        .int()
        .min(1, { message: "Default room capacity must be at least 1!" })
        .max(10, { message: "Default room capacity cannot exceed 10!" })
        .optional(),
    monthlyFee: zod_1.default
        .number()
        .min(0, { message: "Monthly fee cannot be negative!" })
        .optional(),
});
const UpdateHallZodSchema = zod_1.default.object({
    name: zod_1.default
        .string()
        .min(3, { message: "Hall name must be at least 3 characters long!" })
        .max(100, { message: "Hall name cannot exceed 100 characters!" })
        .optional(),
    shortName: zod_1.default
        .string()
        .min(2, { message: "Short name must be at least 2 characters long!" })
        .max(20, { message: "Short name cannot exceed 20 characters!" })
        .optional(),
    totalFloors: zod_1.default
        .number()
        .int()
        .min(1, { message: "Total floors must be at least 1!" })
        .max(30, { message: "Total floors cannot exceed 30!" })
        .optional(),
    roomsPerFloor: zod_1.default
        .number()
        .int()
        .min(1, { message: "Rooms per floor must be at least 1!" })
        .max(100, { message: "Rooms per floor cannot exceed 100!" })
        .optional(),
    defaultRoomCapacity: zod_1.default.number().int().min(1).max(10).optional(),
    monthlyFee: zod_1.default
        .number()
        .min(0, { message: "Monthly fee cannot be negative!" })
        .optional(),
    isActive: zod_1.default.boolean().optional(),
});
const CreateSingleRoomZodSchema = zod_1.default.object({
    hallId: zod_1.default.string().uuid({ message: "Valid Hall ID is required!" }),
    roomNumber: zod_1.default
        .string()
        .min(1, { message: "Room number is required!" })
        .max(10, { message: "Room number cannot exceed 10 characters!" }),
    floor: zod_1.default
        .number()
        .int({ message: "Floor must be an integer!" })
        .min(0, { message: "Floor cannot be negative (use 0 for Ground Floor)!" }),
    capacity: zod_1.default
        .number()
        .int()
        .min(1, { message: "Room capacity must be at least 1!" })
        .max(10, { message: "Room capacity cannot exceed 10!" })
        .optional(),
});
const BulkGenerateRoomsZodSchema = zod_1.default
    .object({
    hallId: zod_1.default.string().uuid({ message: "Valid Hall ID is required!" }),
    startFloor: zod_1.default
        .number()
        .int({ message: "Start floor must be an integer!" })
        .min(0, {
        message: "Start floor cannot be negative (0 = Ground Floor)!",
    }),
    endFloor: zod_1.default
        .number()
        .int({ message: "End floor must be an integer!" })
        .min(0, { message: "End floor cannot be negative!" }),
    roomsPerFloor: zod_1.default
        .number()
        .int({ message: "Rooms per floor must be an integer!" })
        .min(1, { message: "Rooms per floor must be at least 1!" })
        .max(100, { message: "Rooms per floor cannot exceed 100!" }),
    capacity: zod_1.default
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
const UpdateRoomZodSchema = zod_1.default.object({
    capacity: zod_1.default
        .number()
        .int()
        .min(1, { message: "Room capacity must be at least 1!" })
        .max(10, { message: "Room capacity cannot exceed 10!" })
        .optional(),
    status: zod_1.default
        .enum([enums_1.RoomStatus.AVAILABLE, enums_1.RoomStatus.FULL, enums_1.RoomStatus.MAINTENANCE], {
        message: "Invalid room status!",
    })
        .optional(),
});
exports.HallValidation = {
    CreateHallZodSchema,
    UpdateHallZodSchema,
    CreateSingleRoomZodSchema,
    BulkGenerateRoomsZodSchema,
    UpdateRoomZodSchema,
};
