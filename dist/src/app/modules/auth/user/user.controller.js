"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const http_status_1 = __importDefault(require("http-status"));
const user_service_1 = require("./user.service");
const catchAsync_1 = require("../../../utils/catchAsync");
const sendResponse_1 = require("../../../utils/sendResponse");
const uploadProfileImage = (0, catchAsync_1.catchAsync)(async (req, res) => {
    if (!req.file) {
        throw new Error("Please upload an image file to proceed.");
    }
    const userId = req.user?.userId;
    const result = await user_service_1.UserServices.uploadProfileImage(req.file?.buffer, userId);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Profile image uploaded successfully.",
        data: result,
    });
});
exports.UserController = {
    uploadProfileImage,
};
