"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeatRoutes = void 0;
const express_1 = require("express");
const enums_1 = require("../../../generated/prisma/enums");
const checkAuth_1 = require("../../middleware/checkAuth");
const validateRequest_1 = require("../../middleware/validateRequest");
const seat_controller_1 = require("./seat.controller");
const seat_validation_1 = require("./seat.validation");
const router = (0, express_1.Router)();
// 1. SEAT ANALYTICS (Admin & Super Admin)
router.get("/analytics", (0, checkAuth_1.auth)(enums_1.Role.SUPER_ADMIN, enums_1.Role.ADMIN), seat_controller_1.SeatController.getSeatAnalytics);
//Problem THIS ROUTE ONNO TOKEN USE KOREO APPLY KORA JACCHE
// 2. SEAT APPLICATION ROUTES
router.post("/apply", (0, checkAuth_1.auth)(enums_1.Role.STUDENT), (0, validateRequest_1.validateRequest)(seat_validation_1.SeatValidation.ApplySeatZodSchema), seat_controller_1.SeatController.applyForSeat);
router.get("/my-applications", (0, checkAuth_1.auth)(enums_1.Role.STUDENT), seat_controller_1.SeatController.getMySeatApplications);
router.patch("/applications/:applicationId/cancel", (0, checkAuth_1.auth)(enums_1.Role.STUDENT), seat_controller_1.SeatController.cancelMySeatApplication);
router.get("/my-seat", (0, checkAuth_1.auth)(enums_1.Role.STUDENT), seat_controller_1.SeatController.getMyCurrentSeat);
router.get("/applications", (0, checkAuth_1.auth)(enums_1.Role.SUPER_ADMIN, enums_1.Role.ADMIN), seat_controller_1.SeatController.getAllSeatApplications);
router.get("/applications/:applicationId/recommended-rooms", (0, checkAuth_1.auth)(enums_1.Role.SUPER_ADMIN, enums_1.Role.ADMIN), seat_controller_1.SeatController.getRecommendedRooms);
router.patch("/applications/:applicationId/approve", (0, checkAuth_1.auth)(enums_1.Role.SUPER_ADMIN, enums_1.Role.ADMIN), (0, validateRequest_1.validateRequest)(seat_validation_1.SeatValidation.ApproveSeatApplicationZodSchema), seat_controller_1.SeatController.approveSeatApplication);
router.patch("/applications/:applicationId/reject", (0, checkAuth_1.auth)(enums_1.Role.SUPER_ADMIN, enums_1.Role.ADMIN), (0, validateRequest_1.validateRequest)(seat_validation_1.SeatValidation.RejectSeatApplicationZodSchema), seat_controller_1.SeatController.rejectSeatApplication);
router.post("/direct-allocate", (0, checkAuth_1.auth)(enums_1.Role.SUPER_ADMIN, enums_1.Role.ADMIN), (0, validateRequest_1.validateRequest)(seat_validation_1.SeatValidation.DirectAllocateSeatZodSchema), seat_controller_1.SeatController.directAllocateSeat);
// 3. ROOM CHANGE REQUEST ROUTES
router.post("/room-change", (0, checkAuth_1.auth)(enums_1.Role.STUDENT), (0, validateRequest_1.validateRequest)(seat_validation_1.SeatValidation.CreateRoomChangeZodSchema), seat_controller_1.SeatController.requestRoomChange);
router.get("/my-room-changes", (0, checkAuth_1.auth)(enums_1.Role.STUDENT), seat_controller_1.SeatController.getMyRoomChangeRequests);
router.get("/room-change", (0, checkAuth_1.auth)(enums_1.Role.SUPER_ADMIN, enums_1.Role.ADMIN), seat_controller_1.SeatController.getAllRoomChangeRequests);
router.patch("/room-change/:requestId/approve", (0, checkAuth_1.auth)(enums_1.Role.SUPER_ADMIN, enums_1.Role.ADMIN), (0, validateRequest_1.validateRequest)(seat_validation_1.SeatValidation.ApproveRoomChangeZodSchema), seat_controller_1.SeatController.approveRoomChange);
router.patch("/room-change/:requestId/reject", (0, checkAuth_1.auth)(enums_1.Role.SUPER_ADMIN, enums_1.Role.ADMIN), (0, validateRequest_1.validateRequest)(seat_validation_1.SeatValidation.RejectRoomChangeZodSchema), seat_controller_1.SeatController.rejectRoomChange);
// 4. SEAT CANCELLATION ROUTES
router.post("/cancel-my-seat", (0, checkAuth_1.auth)(enums_1.Role.STUDENT), (0, validateRequest_1.validateRequest)(seat_validation_1.SeatValidation.CancelSeatZodSchema), seat_controller_1.SeatController.cancelSeatByStudent);
router.post("/cancel/:studentId", (0, checkAuth_1.auth)(enums_1.Role.SUPER_ADMIN, enums_1.Role.ADMIN), (0, validateRequest_1.validateRequest)(seat_validation_1.SeatValidation.CancelSeatZodSchema), seat_controller_1.SeatController.cancelSeatByAdmin);
// Resident List (Admin & Super Admin)
router.get("/residents", (0, checkAuth_1.auth)(enums_1.Role.SUPER_ADMIN, enums_1.Role.ADMIN), seat_controller_1.SeatController.getAllResidents);
// Student Seat History
router.get("/my-history", (0, checkAuth_1.auth)(enums_1.Role.STUDENT), seat_controller_1.SeatController.getMySeatHistory);
// Cancel Pending Room Change Request (Student)
router.patch("/room-change/:requestId/cancel", (0, checkAuth_1.auth)(enums_1.Role.STUDENT), seat_controller_1.SeatController.cancelMyRoomChangeRequest);
exports.SeatRoutes = router;
