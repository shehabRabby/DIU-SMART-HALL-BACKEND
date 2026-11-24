import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { GatePassController } from "./gatePass.controller";
import { GatePassValidation } from "./gatePass.validation";
const router = Router();
// 1. STUDENT ROUTES (Active Resident Students Only)
router.post("/", auth(Role.STUDENT), validateRequest(GatePassValidation.createGatePassZodSchema), GatePassController.createGatePassRequest);
router.get("/my-passes", auth(Role.STUDENT), GatePassController.getMyGatePasses);
router.patch("/:passId/cancel", auth(Role.STUDENT), GatePassController.cancelMyGatePass);
// 2. ADMIN & GATE SECURITY ROUTES
router.get("/", auth(Role.SUPER_ADMIN, Role.ADMIN), GatePassController.getAllGatePassesForAdmin);
router.get("/verify-qr/:identifier", auth(Role.SUPER_ADMIN, Role.ADMIN), GatePassController.verifyGatePassQr);
router.patch("/:passId/review", auth(Role.SUPER_ADMIN, Role.ADMIN), validateRequest(GatePassValidation.reviewGatePassZodSchema), GatePassController.reviewGatePass);
router.patch("/:passId/gate-log", auth(Role.SUPER_ADMIN, Role.ADMIN), validateRequest(GatePassValidation.updateGateLogZodSchema), GatePassController.updateGateLog);
export const GatePassRoutes = router;
