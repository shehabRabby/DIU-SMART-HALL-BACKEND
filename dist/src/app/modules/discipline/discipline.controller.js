"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisciplineController = void 0;
const catchAsync_1 = require("../../utils/catchAsync");
const sendResponse_1 = require("../../utils/sendResponse");
const discipline_service_1 = require("./discipline.service");
const getDisciplineAnalytics = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const hallId = req.query.hallId;
    const result = await discipline_service_1.DisciplineService.getDisciplineAnalytics(hallId);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: 200,
        success: true,
        message: "Discipline analytics retrieved successfully.",
        data: result,
    });
});
const getMyConductClearance = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = req.user.userId;
    const result = await discipline_service_1.DisciplineService.getMyConductClearance(userId);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: 200,
        success: true,
        message: "Conduct clearance status retrieved successfully.",
        data: result,
    });
});
const createIncidentReport = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = req.user.userId;
    const result = await discipline_service_1.DisciplineService.createIncidentReport(userId, req.body);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: 201,
        success: true,
        message: "Incident report submitted successfully.",
        data: result,
    });
});
const getAllIncidents = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const filters = {
        hallId: req.query.hallId,
        status: req.query.status,
        severity: req.query.severity,
        category: req.query.category,
        searchTerm: req.query.searchTerm,
    };
    const result = await discipline_service_1.DisciplineService.getAllIncidents(filters);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: 200,
        success: true,
        message: "Incident reports retrieved successfully.",
        data: result,
    });
});
const resolveOrEscalateIncident = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const incidentId = req.params.incidentId;
    const adminUserId = req.user.userId;
    const result = await discipline_service_1.DisciplineService.resolveOrEscalateIncident(incidentId, adminUserId, req.body);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: 200,
        success: true,
        message: `Incident ${req.body.action.toLowerCase()} successfully.`,
        data: result,
    });
});
const issueWarning = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const adminUserId = req.user.userId;
    const result = await discipline_service_1.DisciplineService.issueWarning(adminUserId, req.body);
    (0, sendResponse_1.sendResponse)(res, {
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
const getAllWarnings = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const filters = {
        hallId: req.query.hallId,
        studentId: req.query.studentId,
        status: req.query.status,
        severity: req.query.severity,
        category: req.query.category,
        searchTerm: req.query.searchTerm,
    };
    const result = await discipline_service_1.DisciplineService.getAllWarnings(filters);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: 200,
        success: true,
        message: "Disciplinary warnings retrieved successfully.",
        data: result,
    });
});
const getMyWarnings = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = req.user.userId;
    const result = await discipline_service_1.DisciplineService.getMyWarnings(userId);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: 200,
        success: true,
        message: "Your disciplinary records retrieved successfully.",
        data: result,
    });
});
const submitAppeal = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = req.user.userId;
    const warningId = req.params.warningId;
    const result = await discipline_service_1.DisciplineService.submitAppeal(userId, warningId, req.body);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: 200,
        success: true,
        message: "Appeal submitted successfully for administrative review.",
        data: result,
    });
});
const reviewAppeal = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const warningId = req.params.warningId;
    const adminUserId = req.user.userId;
    const result = await discipline_service_1.DisciplineService.reviewAppeal(warningId, adminUserId, req.body);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: 200,
        success: true,
        message: req.body.decision === "REVOKE"
            ? "Appeal accepted and warning revoked."
            : "Appeal reviewed and disciplinary notice upheld.",
        data: result,
    });
});
const markFinePaid = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const warningId = req.params.warningId;
    const result = await discipline_service_1.DisciplineService.markFinePaid(warningId);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: 200,
        success: true,
        message: "Disciplinary fine marked as paid.",
        data: result,
    });
});
const revokeExpulsion = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const studentId = req.params.studentId;
    const result = await discipline_service_1.DisciplineService.revokeExpulsion(studentId, req.body);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: 200,
        success: true,
        message: "Student expulsion revoked successfully.",
        data: result,
    });
});
exports.DisciplineController = {
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
