import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { GatePassService } from "./gatePass.service";
const createGatePassRequest = catchAsync(async (req, res) => {
    const result = await GatePassService.createGatePassRequest(req.user.userId, req.body);
    sendResponse(res, {
        statusCode: 201,
        success: true,
        message: "Gate pass request submitted successfully.",
        data: result,
    });
});
const getMyGatePasses = catchAsync(async (req, res) => {
    const result = await GatePassService.getMyGatePasses(req.user.userId);
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Your gate passes retrieved successfully.",
        data: result,
    });
});
const cancelMyGatePass = catchAsync(async (req, res) => {
    const result = await GatePassService.cancelMyGatePass(req.user.userId, req.params.passId);
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Gate pass request cancelled successfully.",
        data: result,
    });
});
const getAllGatePassesForAdmin = catchAsync(async (req, res) => {
    const result = await GatePassService.getAllGatePassesForAdmin(req.query);
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "All gate passes retrieved successfully.",
        data: result,
    });
});
const reviewGatePass = catchAsync(async (req, res) => {
    const result = await GatePassService.reviewGatePass(req.user.userId, req.params.passId, req.body);
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: `Gate pass ${req.body.status.toLowerCase()} successfully.`,
        data: result,
    });
});
const verifyGatePassQr = catchAsync(async (req, res) => {
    const result = await GatePassService.verifyGatePassQr(req.params.identifier);
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: result.message,
        data: result,
    });
});
const updateGateLog = catchAsync(async (req, res) => {
    const result = await GatePassService.updateGateLog(req.params.passId, req.body);
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: `Gate pass marked as ${req.body.action}.`,
        data: result,
    });
});
export const GatePassController = {
    createGatePassRequest,
    getMyGatePasses,
    cancelMyGatePass,
    getAllGatePassesForAdmin,
    reviewGatePass,
    verifyGatePassQr,
    updateGateLog,
};
