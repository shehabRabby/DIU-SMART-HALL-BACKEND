"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const http_status_1 = __importDefault(require("http-status"));
const catchAsync_1 = require("../../utils/catchAsync");
const sendResponse_1 = require("../../utils/sendResponse");
const auth_service_1 = require("./auth.service");
const registerStudent = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const payload = req.body;
    console.log(payload);
    const result = await auth_service_1.AuthService.registerStudent(payload);
    // const { accessToken, refreshToken, user, student } = result;
    // res.cookie("accessToken", accessToken, {
    //   httpOnly: true,
    //   secure: false,
    //   sameSite: "none",
    //   maxAge: 1000 * 60 * 60 * 24, //  1 day
    // });
    // res.cookie("refreshToken", refreshToken, {
    //   httpOnly: true,
    //   secure: false,
    //   sameSite: "none",
    //   maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    // });
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: http_status_1.default.CREATED,
        success: true,
        message: "Verification OTP Sent successfully",
        data: null,
    });
});
const verifyStudentEmail = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const payload = req.body;
    console.log(payload);
    const result = await auth_service_1.AuthService.verifyStudentEmail(payload);
    const { accessToken, refreshToken, user, student } = result;
    res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: false,
        sameSite: "none",
        maxAge: 1000 * 60 * 60 * 24, //  1 day
    });
    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: "none",
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    });
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: http_status_1.default.CREATED,
        success: true,
        message: "Email Verified Successfully ",
        data: {
            accessToken,
            refreshToken,
            user,
            student,
        },
    });
});
const loginUser = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const payload = req.body;
    const result = await auth_service_1.AuthService.loginUser(payload);
    const { accessToken, refreshToken } = result;
    res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: false,
        sameSite: "none",
        maxAge: 1000 * 60 * 60 * 24, // 24 hour or 1 day
    });
    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: "none",
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    });
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "User logged in successfully",
        data: {
            accessToken,
            refreshToken,
        },
    });
});
const getMe = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const user = req.user;
    if (!user) {
        throw new Error("User information is missing in the request");
    }
    const result = await auth_service_1.AuthService.getMe(user);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "User profile fetched successfully",
        data: result,
    });
});
const refreshToken = (0, catchAsync_1.catchAsync)(async (req, res) => {
    if (!req.cookies.refreshToken) {
        throw new Error("Refresh token is missing");
    }
    const result = await auth_service_1.AuthService.refreshToken(req.cookies.refreshToken);
    const { accessToken, refreshToken: newRefreshToken } = result;
    res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: false,
        sameSite: "none",
        maxAge: 1000 * 60 * 60 * 24, // 24 hour or 1 day
    });
    res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: "none",
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    });
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "New tokens generated successfully",
        data: {
            accessToken,
            refreshToken: newRefreshToken,
        },
    });
});
const googleLogin = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const payload = req.body;
    const result = await auth_service_1.AuthService.googleLogin(payload);
    const { accessToken, refreshToken } = result;
    res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: false,
        sameSite: "none",
        maxAge: 1000 * 60 * 60 * 24, // 1 day
    });
    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: "none",
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    });
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "New tokens generated successfully done",
        data: {
            accessToken,
            refreshToken,
        },
    });
});
const forgotPassword = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const payload = req.body;
    await auth_service_1.AuthService.forgotPassword(payload);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: `OTP Sent To Email : ${payload.email}`,
        data: null,
    });
});
const resetPassword = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const payload = req.body;
    await auth_service_1.AuthService.resetPassword(payload);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Password Changed Successfully",
        data: null,
    });
});
exports.AuthController = {
    registerStudent,
    verifyStudentEmail,
    loginUser,
    getMe,
    refreshToken,
    googleLogin,
    forgotPassword,
    resetPassword,
};
