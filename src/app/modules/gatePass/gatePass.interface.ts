import { GatePassStatus, PassType } from "../../../generated/prisma/enums";

export interface ICreateGatePassPayload {
  passType: PassType;
  reason: string;
  destination: string;
  emergencyContact: string;
  departureAt: string | Date;
  expectedReturnAt: string | Date;
}

export interface IReviewGatePassPayload {
  status: "APPROVED" | "REJECTED";
  adminNote?: string;
}

export interface IUpdateGateLogPayload {
  action: "CHECKED_OUT" | "RETURNED";
}

export interface IGatePassFilterParams {
  status?: GatePassStatus;
  passType?: PassType;
  hallId?: string;
  overdueOnly?: string;
  searchTerm?: string;
}

export interface IGatePassApprovedEmailPayload {
  subject: string;
  studentName: string;
  studentUniId: string;
  hallName: string;
  hallShortName: string;
  roomInfo: string;
  passCode: string;
  qrImageUrl: string;
  passType: string;
  destination: string;
  reason: string;
  departureAt: string;
  expectedReturnAt: string;
  adminNote?: string | null;
}