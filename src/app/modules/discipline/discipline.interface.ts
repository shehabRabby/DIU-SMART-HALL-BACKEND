import {
  IncidentCategory,
  IncidentStatus,
  WarningSeverity,
  WarningStatus,
} from "../../../generated/prisma/enums";

export interface ICreateIncidentPayload {
  accusedStudentId: string; // Student UUID or studentUniId
  title: string;
  description: string;
  category?: IncidentCategory;
  severity?: WarningSeverity;
}

export interface IResolveIncidentPayload {
  action: "MEDIATING" | "RESOLVED" | "ESCALATED" | "DISMISSED";
  mediationNotes: string;
  issueAsShowCause?: boolean;
  appealHours?: number;
  fineAmount?: number;
  expiryDays?: number;
}

export interface IIssueWarningPayload {
  studentId: string; // Student UUID or studentUniId
  title: string;
  reason: string;
  category?: IncidentCategory;
  severity?: WarningSeverity;
  issueAsShowCause?: boolean;
  appealHours?: number;
  fineAmount?: number;
  expiryDays?: number;
  forceExpel?: boolean;
}

export interface ISubmitAppealPayload {
  appealText: string;
}

export interface IReviewAppealPayload {
  decision: "UPHOLD" | "REVOKE";
  reviewNote: string;
}

export interface IRevokeExpulsionPayload {
  revokeReason: string;
}

export interface IDisciplineFilterParams {
  hallId?: string;
  studentId?: string;
  status?: WarningStatus | IncidentStatus;
  severity?: WarningSeverity;
  category?: IncidentCategory;
  searchTerm?: string;
}