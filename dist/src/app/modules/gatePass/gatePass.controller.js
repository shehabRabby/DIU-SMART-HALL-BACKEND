"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GatePassController = void 0;
const catchAsync_1 = require("../../utils/catchAsync");
const sendResponse_1 = require("../../utils/sendResponse");
const gatePass_service_1 = require("./gatePass.service");
const createGatePassRequest = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const result = await gatePass_service_1.GatePassService.createGatePassRequest(req.user.userId, req.body);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: 201,
        success: true,
        message: "Gate pass request submitted successfully.",
        data: result,
    });
});
const getMyGatePasses = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const result = await gatePass_service_1.GatePassService.getMyGatePasses(req.user.userId);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: 200,
        success: true,
        message: "Your gate passes retrieved successfully.",
        data: result,
    });
});
const cancelMyGatePass = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const result = await gatePass_service_1.GatePassService.cancelMyGatePass(req.user.userId, req.params.passId);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: 200,
        success: true,
        message: "Gate pass request cancelled successfully.",
        data: result,
    });
});
const getAllGatePassesForAdmin = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const result = await gatePass_service_1.GatePassService.getAllGatePassesForAdmin(req.query);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: 200,
        success: true,
        message: "All gate passes retrieved successfully.",
        data: result,
    });
});
const reviewGatePass = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const result = await gatePass_service_1.GatePassService.reviewGatePass(req.user.userId, req.params.passId, req.body);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: 200,
        success: true,
        message: `Gate pass ${req.body.status.toLowerCase()} successfully.`,
        data: result,
    });
});
const verifyGatePassQr = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const result = await gatePass_service_1.GatePassService.verifyGatePassQr(req.params.identifier);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: 200,
        success: true,
        message: result.message,
        data: result,
    });
});
const updateGateLog = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const result = await gatePass_service_1.GatePassService.updateGateLog(req.params.passId, req.body);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: 200,
        success: true,
        message: `Gate pass marked as ${req.body.action}.`,
        data: result,
    });
});
exports.GatePassController = {
    createGatePassRequest,
    getMyGatePasses,
    cancelMyGatePass,
    getAllGatePassesForAdmin,
    reviewGatePass,
    verifyGatePassQr,
    updateGateLog,
};
