import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { IDisciplineFilterParams } from "./discipline.interface";
import { DisciplineService } from "./discipline.service";

const getDisciplineAnalytics = catchAsync(
  async (req: Request, res: Response) => {
    const hallId = req.query.hallId as string | undefined;
    const result = await DisciplineService.getDisciplineAnalytics(hallId);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Discipline analytics retrieved successfully.",
      data: result,
    });
  },
);

const getMyConductClearance = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const result = await DisciplineService.getMyConductClearance(userId);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Conduct clearance status retrieved successfully.",
      data: result,
    });
  },
);

const createIncidentReport = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const result = await DisciplineService.createIncidentReport(userId, req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Incident report submitted successfully.",
    data: result,
  });
});

const getAllIncidents = catchAsync(async (req: Request, res: Response) => {
  const filters: IDisciplineFilterParams = {
    hallId: req.query.hallId as string,
    status: req.query.status as any,
    severity: req.query.severity as any,
    category: req.query.category as any,
    searchTerm: req.query.searchTerm as string,
  };

  const result = await DisciplineService.getAllIncidents(filters);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Incident reports retrieved successfully.",
    data: result,
  });
});

const resolveOrEscalateIncident = catchAsync(
  async (req: Request, res: Response) => {
    const incidentId = req.params.incidentId as string;
    const adminUserId = req.user!.userId;
    const result = await DisciplineService.resolveOrEscalateIncident(
      incidentId,
      adminUserId,
      req.body,
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: `Incident ${req.body.action.toLowerCase()} successfully.`,
      data: result,
    });
  },
);

const issueWarning = catchAsync(async (req: Request, res: Response) => {
  const adminUserId = req.user!.userId;
  const result = await DisciplineService.issueWarning(adminUserId, req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: result.autoExpelled
      ? "Strike 3 reached: Student has been automatically expelled and seat vacated."
      : req.body.issueAsShowCause
        ? "Show-cause notice issued successfully."
        : "Disciplinary warning issued successfully.",
    data: result,
  });
});

const getAllWarnings = catchAsync(async (req: Request, res: Response) => {
  const filters: IDisciplineFilterParams = {
    hallId: req.query.hallId as string,
    studentId: req.query.studentId as string,
    status: req.query.status as any,
    severity: req.query.severity as any,
    category: req.query.category as any,
    searchTerm: req.query.searchTerm as string,
  };

  const result = await DisciplineService.getAllWarnings(filters);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Disciplinary warnings retrieved successfully.",
    data: result,
  });
});

const getMyWarnings = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const result = await DisciplineService.getMyWarnings(userId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Your disciplinary records retrieved successfully.",
    data: result,
  });
});

const submitAppeal = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const warningId = req.params.warningId as string;
  const result = await DisciplineService.submitAppeal(
    userId,
    warningId,
    req.body,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Appeal submitted successfully for administrative review.",
    data: result,
  });
});

const reviewAppeal = catchAsync(async (req: Request, res: Response) => {
  const warningId = req.params.warningId as string;
  const adminUserId = req.user!.userId;
  const result = await DisciplineService.reviewAppeal(
    warningId,
    adminUserId,
    req.body,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message:
      req.body.decision === "REVOKE"
        ? "Appeal accepted and warning revoked."
        : "Appeal reviewed and disciplinary notice upheld.",
    data: result,
  });
});

const markFinePaid = catchAsync(async (req: Request, res: Response) => {
  const warningId = req.params.warningId as string;
  const result = await DisciplineService.markFinePaid(warningId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Disciplinary fine marked as paid.",
    data: result,
  });
});

const revokeExpulsion = catchAsync(async (req: Request, res: Response) => {
  const studentId = req.params.studentId as string;
  const result = await DisciplineService.revokeExpulsion(studentId, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Student expulsion revoked successfully.",
    data: result,
  });
});

export const DisciplineController = {
  getDisciplineAnalytics,
  getMyConductClearance,
  createIncidentReport,
  getAllIncidents,
  resolveOrEscalateIncident,
  issueWarning,
  getAllWarnings,
  getMyWarnings,
  submitAppeal,
  reviewAppeal,
  markFinePaid,
  revokeExpulsion,
};
