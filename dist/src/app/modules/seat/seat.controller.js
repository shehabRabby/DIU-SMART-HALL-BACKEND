"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeatController = void 0;
const enums_1 = require("../../../generated/prisma/enums");
const catchAsync_1 = require("../../utils/catchAsync");
const sendResponse_1 = require("../../utils/sendResponse");
const seat_service_1 = require("./seat.service");
// 1. SEAT APPLICATION CONTROLLERS
const applyForSeat = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = req.user.userId;
    const result = await seat_service_1.SeatService.applyForSeat(userId, req.body);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: 201,
        success: true,
        message: "Seat application submitted successfully.",
        data: result,
    });
});
const getMySeatApplications = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = req.user.userId;
    const result = await seat_service_1.SeatService.getMySeatApplications(userId);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: 200,
        success: true,
        message: "Your seat applications retrieved successfully.",
        data: result,
    });
});
const cancelMySeatApplication = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = req.user.userId;
    const applicationId = req.params.applicationId;
    const result = await seat_service_1.SeatService.cancelMySeatApplication(userId, applicationId);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: 200,
        success: true,
        message: "Seat application withdrawn successfully.",
        data: result,
    });
});
const getMyCurrentSeat = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = req.user.userId;
    const result = await seat_service_1.SeatService.getMyCurrentSeat(userId);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: 200,
        success: true,
        message: "Current seat and roommates retrieved successfully.",
        data: result,
    });
});
const getAllSeatApplications = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const query = {};
    if (typeof req.query.status === "string" &&
        Object.values(enums_1.ApplicationStatus).includes(req.query.status)) {
        query.status = req.query.status;
    }
    if (typeof req.query.gender === "string" &&
        Object.values(enums_1.Gender).includes(req.query.gender)) {
        query.gender = req.query.gender;
    }
    if (typeof req.query.department === "string") {
        query.department = req.query.department;
    }
    const result = await seat_service_1.SeatService.getAllSeatApplications(query);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: 200,
        success: true,
        message: "Seat applications retrieved successfully.",
        data: result,
    });
});
// 2. SMART RECOMMENDATION & ALLOCATION
const getRecommendedRooms = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const applicationId = req.params.applicationId;
    const result = await seat_service_1.SeatService.getRecommendedRoomsForApplication(applicationId);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: 200,
        success: true,
        message: "Smart room recommendations generated successfully.",
        data: result,
    });
});
const approveSeatApplication = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const reviewerUserId = req.user.userId;
    const applicationId = req.params.applicationId;
    const result = await seat_service_1.SeatService.approveSeatApplication(reviewerUserId, applicationId, req.body);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: 200,
        success: true,
        message: "Seat application approved and room allocated successfully.",
        data: result,
    });
});
const rejectSeatApplication = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const reviewerUserId = req.user.userId;
    const applicationId = req.params.applicationId;
    const result = await seat_service_1.SeatService.rejectSeatApplication(reviewerUserId, applicationId, req.body);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: 200,
        success: true,
        message: "Seat application rejected.",
        data: result,
    });
});
const directAllocateSeat = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const reviewerUserId = req.user.userId;
    const result = await seat_service_1.SeatService.directAllocateSeat(reviewerUserId, req.body);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: 201,
        success: true,
        message: "Seat directly allocated to student successfully.",
        data: result,
    });
});
// 3. ROOM CHANGE CONTROLLERS
const requestRoomChange = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = req.user.userId;
    const result = await seat_service_1.SeatService.requestRoomChange(userId, req.body);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: 201,
        success: true,
        message: "Room change request submitted successfully.",
        data: result,
    });
});
const getMyRoomChangeRequests = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = req.user.userId;
    const result = await seat_service_1.SeatService.getMyRoomChangeRequests(userId);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: 200,
        success: true,
        message: "Your room change requests retrieved successfully.",
        data: result,
    });
});
const getAllRoomChangeRequests = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const query = {};
    if (typeof req.query.status === "string" &&
        Object.values(enums_1.ApplicationStatus).includes(req.query.status)) {
        query.status = req.query.status;
    }
    const result = await seat_service_1.SeatService.getAllRoomChangeRequests(query);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: 200,
        success: true,
        message: "Room change requests retrieved successfully.",
        data: result,
    });
});
const approveRoomChange = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const reviewerUserId = req.user.userId;
    const requestId = req.params.requestId;
    const result = await seat_service_1.SeatService.approveRoomChange(reviewerUserId, requestId, req.body);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: 200,
        success: true,
        message: "Room change request approved and student transferred.",
        data: result,
    });
});
const rejectRoomChange = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const reviewerUserId = req.user.userId;
    const requestId = req.params.requestId;
    const result = await seat_service_1.SeatService.rejectRoomChange(reviewerUserId, requestId, req.body);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: 200,
        success: true,
        message: "Room change request rejected.",
        data: result,
    });
});
// 4. SEAT CANCELLATION & ANALYTICS
const cancelSeatByStudent = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = req.user.userId;
    const result = await seat_service_1.SeatService.cancelSeatByStudent(userId, req.body ?? {});
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: 200,
        success: true,
        message: "Your hall seat has been cancelled successfully.",
        data: result,
    });
});
const cancelSeatByAdmin = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const studentId = req.params.studentId;
    const result = await seat_service_1.SeatService.cancelSeatByAdmin(studentId, req.body ?? {});
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: 200,
        success: true,
        message: "Student hall seat cancelled successfully.",
        data: result,
    });
});
const getSeatAnalytics = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const result = await seat_service_1.SeatService.getSeatAnalytics();
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: 200,
        success: true,
        message: "Seat analytics retrieved successfully.",
        data: result,
    });
});
const cancelMyRoomChangeRequest = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = req.user.userId;
    const { requestId } = req.params;
    const result = await seat_service_1.SeatService.cancelMyRoomChangeRequest(userId, requestId);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: 200,
        success: true,
        message: "Pending room change request cancelled successfully.",
        data: result,
    });
});
const getAllResidents = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const result = await seat_service_1.SeatService.getAllResidents(req.query);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: 200,
        success: true,
        message: "Hall residents retrieved successfully.",
        data: result,
    });
});
const getMySeatHistory = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = req.user.userId;
    const result = await seat_service_1.SeatService.getMySeatHistory(userId);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: 200,
        success: true,
        message: "Seat allocation and transfer history retrieved successfully.",
        data: result,
    });
});
exports.SeatController = {
    applyForSeat,
    getMySeatApplications,
    cancelMySeatApplication,
    getMyCurrentSeat,
    getAllSeatApplications,
    getRecommendedRooms,
    approveSeatApplication,
    rejectSeatApplication,
    directAllocateSeat,
    requestRoomChange,
    getMyRoomChangeRequests,
    getAllRoomChangeRequests,
    approveRoomChange,
    rejectRoomChange,
    cancelSeatByStudent,
    cancelSeatByAdmin,
    getSeatAnalytics,
    cancelMyRoomChangeRequest,
    getAllResidents,
    getMySeatHistory,
};
