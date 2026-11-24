import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { DisciplineService } from "./discipline.service";
const getDisciplineAnalytics = catchAsync(async (req, res) => {
    const hallId = req.query.hallId;
    const result = await DisciplineService.getDisciplineAnalytics(hallId);
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Discipline analytics retrieved successfully.",
        data: result,
    });
});
const getMyConductClearance = catchAsync(async (req, res) => {
    const userId = req.user.userId;
    const result = await DisciplineService.getMyConductClearance(userId);
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Conduct clearance status retrieved successfully.",
        data: result,
    });
});
const createIncidentReport = catchAsync(async (req, res) => {
    const userId = req.user.userId;
    const result = await DisciplineService.createIncidentReport(userId, req.body);
    sendResponse(res, {
        statusCode: 201,
        success: true,
        message: "Incident report submitted successfully.",
        data: result,
    });
});
const getAllIncidents = catchAsync(async (req, res) => {
    const filters = {
        hallId: req.query.hallId,
        status: req.query.status,
        severity: req.query.severity,
        category: req.query.category,
        searchTerm: req.query.searchTerm,
    };
    const result = await DisciplineService.getAllIncidents(filters);
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Incident reports retrieved successfully.",
        data: result,
    });
});
const resolveOrEscalateIncident = catchAsync(async (req, res) => {
    const incidentId = req.params.incidentId;
    const adminUserId = req.user.userId;
    const result = await DisciplineService.resolveOrEscalateIncident(incidentId, adminUserId, req.body);
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: `Incident ${req.body.action.toLowerCase()} successfully.`,
        data: result,
    });
});
const issueWarning = catchAsync(async (req, res) => {
    const adminUserId = req.user.userId;
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
const getAllWarnings = catchAsync(async (req, res) => {
    const filters = {
        hallId: req.query.hallId,
        studentId: req.query.studentId,
        status: req.query.status,
        severity: req.query.severity,
        category: req.query.category,
        searchTerm: req.query.searchTerm,
    };
    const result = await DisciplineService.getAllWarnings(filters);
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Disciplinary warnings retrieved successfully.",
        data: result,
    });
});
const getMyWarnings = catchAsync(async (req, res) => {
    const userId = req.user.userId;
    const result = await DisciplineService.getMyWarnings(userId);
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Your disciplinary records retrieved successfully.",
        data: result,
    });
});
const submitAppeal = catchAsync(async (req, res) => {
    const userId = req.user.userId;
    const warningId = req.params.warningId;
    const result = await DisciplineService.submitAppeal(userId, warningId, req.body);
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Appeal submitted successfully for administrative review.",
        data: result,
    });
});
const reviewAppeal = catchAsync(async (req, res) => {
    const warningId = req.params.warningId;
    const adminUserId = req.user.userId;
    const result = await DisciplineService.reviewAppeal(warningId, adminUserId, req.body);
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: req.body.decision === "REVOKE"
            ? "Appeal accepted and warning revoked."
            : "Appeal reviewed and disciplinary notice upheld.",
        data: result,
    });
});
const markFinePaid = catchAsync(async (req, res) => {
    const warningId = req.params.warningId;
    const result = await DisciplineService.markFinePaid(warningId);
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Disciplinary fine marked as paid.",
        data: result,
    });
});
const revokeExpulsion = catchAsync(async (req, res) => {
    const studentId = req.params.studentId;
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
