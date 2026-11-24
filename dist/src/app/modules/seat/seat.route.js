import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { SeatController } from "./seat.controller";
import { SeatValidation } from "./seat.validation";
const router = Router();
// 1. SEAT ANALYTICS (Admin & Super Admin)
router.get("/analytics", auth(Role.SUPER_ADMIN, Role.ADMIN), SeatController.getSeatAnalytics);
//Problem THIS ROUTE ONNO TOKEN USE KOREO APPLY KORA JACCHE
// 2. SEAT APPLICATION ROUTES
router.post("/apply", auth(Role.STUDENT), validateRequest(SeatValidation.ApplySeatZodSchema), SeatController.applyForSeat);
router.get("/my-applications", auth(Role.STUDENT), SeatController.getMySeatApplications);
router.patch("/applications/:applicationId/cancel", auth(Role.STUDENT), SeatController.cancelMySeatApplication);
router.get("/my-seat", auth(Role.STUDENT), SeatController.getMyCurrentSeat);
router.get("/applications", auth(Role.SUPER_ADMIN, Role.ADMIN), SeatController.getAllSeatApplications);
router.get("/applications/:applicationId/recommended-rooms", auth(Role.SUPER_ADMIN, Role.ADMIN), SeatController.getRecommendedRooms);
router.patch("/applications/:applicationId/approve", auth(Role.SUPER_ADMIN, Role.ADMIN), validateRequest(SeatValidation.ApproveSeatApplicationZodSchema), SeatController.approveSeatApplication);
router.patch("/applications/:applicationId/reject", auth(Role.SUPER_ADMIN, Role.ADMIN), validateRequest(SeatValidation.RejectSeatApplicationZodSchema), SeatController.rejectSeatApplication);
router.post("/direct-allocate", auth(Role.SUPER_ADMIN, Role.ADMIN), validateRequest(SeatValidation.DirectAllocateSeatZodSchema), SeatController.directAllocateSeat);
// 3. ROOM CHANGE REQUEST ROUTES
router.post("/room-change", auth(Role.STUDENT), validateRequest(SeatValidation.CreateRoomChangeZodSchema), SeatController.requestRoomChange);
router.get("/my-room-changes", auth(Role.STUDENT), SeatController.getMyRoomChangeRequests);
router.get("/room-change", auth(Role.SUPER_ADMIN, Role.ADMIN), SeatController.getAllRoomChangeRequests);
router.patch("/room-change/:requestId/approve", auth(Role.SUPER_ADMIN, Role.ADMIN), validateRequest(SeatValidation.ApproveRoomChangeZodSchema), SeatController.approveRoomChange);
router.patch("/room-change/:requestId/reject", auth(Role.SUPER_ADMIN, Role.ADMIN), validateRequest(SeatValidation.RejectRoomChangeZodSchema), SeatController.rejectRoomChange);
// 4. SEAT CANCELLATION ROUTES
router.post("/cancel-my-seat", auth(Role.STUDENT), validateRequest(SeatValidation.CancelSeatZodSchema), SeatController.cancelSeatByStudent);
router.post("/cancel/:studentId", auth(Role.SUPER_ADMIN, Role.ADMIN), validateRequest(SeatValidation.CancelSeatZodSchema), SeatController.cancelSeatByAdmin);
// Resident List (Admin & Super Admin)
router.get("/residents", auth(Role.SUPER_ADMIN, Role.ADMIN), SeatController.getAllResidents);
// Student Seat History
router.get("/my-history", auth(Role.STUDENT), SeatController.getMySeatHistory);
// Cancel Pending Room Change Request (Student)
router.patch("/room-change/:requestId/cancel", auth(Role.STUDENT), SeatController.cancelMyRoomChangeRequest);
export const SeatRoutes = router;
