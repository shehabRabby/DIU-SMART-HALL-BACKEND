"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisciplineRoutes = void 0;
const express_1 = require("express");
const enums_1 = require("../../../generated/prisma/enums");
const checkAuth_1 = require("../../middleware/checkAuth");
const validateRequest_1 = require("../../middleware/validateRequest");
const discipline_controller_1 = require("./discipline.controller");
const discipline_validation_1 = require("./discipline.validation");
const router = (0, express_1.Router)();
// 1. ANALYTICS & DIGITAL CLEARANCE
router.get("/analytics", (0, checkAuth_1.auth)(enums_1.Role.SUPER_ADMIN, enums_1.Role.ADMIN), discipline_controller_1.DisciplineController.getDisciplineAnalytics);
router.get("/my-clearance", (0, checkAuth_1.auth)(enums_1.Role.STUDENT), discipline_controller_1.DisciplineController.getMyConductClearance);
// 2. INCIDENT & PEER MEDIATION
router.post("/incidents", (0, checkAuth_1.auth)(enums_1.Role.SUPER_ADMIN, enums_1.Role.ADMIN, enums_1.Role.STUDENT), (0, validateRequest_1.validateRequest)(discipline_validation_1.DisciplineValidation.createIncidentZodSchema), discipline_controller_1.DisciplineController.createIncidentReport);
router.get("/incidents", (0, checkAuth_1.auth)(enums_1.Role.SUPER_ADMIN, enums_1.Role.ADMIN), discipline_controller_1.DisciplineController.getAllIncidents);
router.patch("/incidents/:incidentId/resolve", (0, checkAuth_1.auth)(enums_1.Role.SUPER_ADMIN, enums_1.Role.ADMIN), (0, validateRequest_1.validateRequest)(discipline_validation_1.DisciplineValidation.resolveIncidentZodSchema), discipline_controller_1.DisciplineController.resolveOrEscalateIncident);
// 3. WARNINGS, SHOW-CAUSE & DUE PROCESS APPEALS
router.post("/warnings", (0, checkAuth_1.auth)(enums_1.Role.SUPER_ADMIN, enums_1.Role.ADMIN), (0, validateRequest_1.validateRequest)(discipline_validation_1.DisciplineValidation.issueWarningZodSchema), discipline_controller_1.DisciplineController.issueWarning);
router.get("/warnings", (0, checkAuth_1.auth)(enums_1.Role.SUPER_ADMIN, enums_1.Role.ADMIN), discipline_controller_1.DisciplineController.getAllWarnings);
router.get("/my-warnings", (0, checkAuth_1.auth)(enums_1.Role.STUDENT), discipline_controller_1.DisciplineController.getMyWarnings);
router.post("/warnings/:warningId/appeal", (0, checkAuth_1.auth)(enums_1.Role.STUDENT), (0, validateRequest_1.validateRequest)(discipline_validation_1.DisciplineValidation.submitAppealZodSchema), discipline_controller_1.DisciplineController.submitAppeal);
router.patch("/warnings/:warningId/review-appeal", (0, checkAuth_1.auth)(enums_1.Role.SUPER_ADMIN, enums_1.Role.ADMIN), (0, validateRequest_1.validateRequest)(discipline_validation_1.DisciplineValidation.reviewAppealZodSchema), discipline_controller_1.DisciplineController.reviewAppeal);
// 4. FINE CLEARANCE & CLEMENCY (EXPULSION REVOCATION)
router.patch("/warnings/:warningId/pay-fine", (0, checkAuth_1.auth)(enums_1.Role.SUPER_ADMIN, enums_1.Role.ADMIN), discipline_controller_1.DisciplineController.markFinePaid);
router.patch("/students/:studentId/revoke-expulsion", (0, checkAuth_1.auth)(enums_1.Role.SUPER_ADMIN), (0, validateRequest_1.validateRequest)(discipline_validation_1.DisciplineValidation.revokeExpulsionZodSchema), discipline_controller_1.DisciplineController.revokeExpulsion);
exports.DisciplineRoutes = router;
