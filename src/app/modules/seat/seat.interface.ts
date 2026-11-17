import type {
  ApplicationStatus,
  Gender,
} from "../../../generated/prisma/enums";

export interface IApplySeatPayload {
  studentUniId: string;
  email: string;
  department: string;
  personalPhoneNumber: string;
  parentPhoneNumber: string;
  gender: Gender;
  previousAddress: string;
  reason?: string;
}

export interface ISeatApplicationFilterQuery {
  status?: ApplicationStatus;
  gender?: Gender;
  department?: string;
}

export interface IApproveSeatApplicationPayload {
  hallId: string;
  roomId: string;
  adminNote?: string;
}

export interface IRejectSeatApplicationPayload {
  adminNote: string;
}

export interface IDirectAllocateSeatPayload {
  studentId: string;
  hallId: string;
  roomId: string;
  studentUniId?: string;
  department?: string;
  personalPhoneNumber?: string;
  parentPhoneNumber?: string;
  gender?: Gender;
  previousAddress?: string;
  adminNote?: string;
}

export interface ICreateRoomChangePayload {
  reason: string;
  targetHallId?: string;
  targetRoomId?: string;
}

export interface IRoomChangeFilterQuery {
  status?: ApplicationStatus;
}

export interface IApproveRoomChangePayload {
  targetHallId: string;
  targetRoomId: string;
  adminNote?: string;
}

export interface IRejectRoomChangePayload {
  adminNote: string;
}

export interface ICancelSeatPayload {
  reason?: string;
}

export interface IRecommendedRoomItem {
  roomId: string;
  roomNumber: string;
  floor: number;
  capacity: number;
  occupiedCount: number;
  availableSeats: number;
  hall: {
    id: string;
    name: string;
    shortName: string;
    genderType: Gender;
    monthlyFee: number;
  };
  matchScore: number;
  matchReasons: string[];
  currentRoommates: Array<{
    name: string;
    studentUniId: string | null;
    department: string | null;
  }>;
}
