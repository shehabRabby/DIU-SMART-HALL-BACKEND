"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GatePassRoutes = void 0;
const express_1 = require("express");
const enums_1 = require("../../../generated/prisma/enums");
const checkAuth_1 = require("../../middleware/checkAuth");
const validateRequest_1 = require("../../middleware/validateRequest");
const gatePass_controller_1 = require("./gatePass.controller");
const gatePass_validation_1 = require("./gatePass.validation");
const router = (0, express_1.Router)();
// 1. STUDENT ROUTES (Active Resident Students Only)
router.post("/", (0, checkAuth_1.auth)(enums_1.Role.STUDENT), (0, validateRequest_1.validateRequest)(gatePass_validation_1.GatePassValidation.createGatePassZodSchema), gatePass_controller_1.GatePassController.createGatePassRequest);
router.get("/my-passes", (0, checkAuth_1.auth)(enums_1.Role.STUDENT), gatePass_controller_1.GatePassController.getMyGatePasses);
router.patch("/:passId/cancel", (0, checkAuth_1.auth)(enums_1.Role.STUDENT), gatePass_controller_1.GatePassController.cancelMyGatePass);
// 2. ADMIN & GATE SECURITY ROUTES
router.get("/", (0, checkAuth_1.auth)(enums_1.Role.SUPER_ADMIN, enums_1.Role.ADMIN), gatePass_controller_1.GatePassController.getAllGatePassesForAdmin);
router.get("/verify-qr/:identifier", (0, checkAuth_1.auth)(enums_1.Role.SUPER_ADMIN, enums_1.Role.ADMIN), gatePass_controller_1.GatePassController.verifyGatePassQr);
router.patch("/:passId/review", (0, checkAuth_1.auth)(enums_1.Role.SUPER_ADMIN, enums_1.Role.ADMIN), (0, validateRequest_1.validateRequest)(gatePass_validation_1.GatePassValidation.reviewGatePassZodSchema), gatePass_controller_1.GatePassController.reviewGatePass);
router.patch("/:passId/gate-log", (0, checkAuth_1.auth)(enums_1.Role.SUPER_ADMIN, enums_1.Role.ADMIN), (0, validateRequest_1.validateRequest)(gatePass_validation_1.GatePassValidation.updateGateLogZodSchema), gatePass_controller_1.GatePassController.updateGateLog);
exports.GatePassRoutes = router;
