import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { DisciplineController } from "./discipline.controller";
import { DisciplineValidation } from "./discipline.validation";

const router = Router();

// 1. ANALYTICS & DIGITAL CLEARANCE
router.get(
  "/analytics",
  auth(Role.SUPER_ADMIN, Role.ADMIN),
  DisciplineController.getDisciplineAnalytics,
);

router.get(
  "/my-clearance",
  auth(Role.STUDENT),
  DisciplineController.getMyConductClearance,
);

// 2. INCIDENT & PEER MEDIATION
router.post(
  "/incidents",
  auth(Role.SUPER_ADMIN, Role.ADMIN, Role.STUDENT),
  validateRequest(DisciplineValidation.createIncidentZodSchema),
  DisciplineController.createIncidentReport,
);

router.get(
  "/incidents",
  auth(Role.SUPER_ADMIN, Role.ADMIN),
  DisciplineController.getAllIncidents,
);

router.patch(
  "/incidents/:incidentId/resolve",
  auth(Role.SUPER_ADMIN, Role.ADMIN),
  validateRequest(DisciplineValidation.resolveIncidentZodSchema),
  DisciplineController.resolveOrEscalateIncident,
);

// 3. WARNINGS, SHOW-CAUSE & DUE PROCESS APPEALS
router.post(
  "/warnings",
  auth(Role.SUPER_ADMIN, Role.ADMIN),
  validateRequest(DisciplineValidation.issueWarningZodSchema),
  DisciplineController.issueWarning,
);

router.get(
  "/warnings",
  auth(Role.SUPER_ADMIN, Role.ADMIN),
  DisciplineController.getAllWarnings,
);

router.get(
  "/my-warnings",
  auth(Role.STUDENT),
  DisciplineController.getMyWarnings,
);

router.post(
  "/warnings/:warningId/appeal",
  auth(Role.STUDENT),
  validateRequest(DisciplineValidation.submitAppealZodSchema),
  DisciplineController.submitAppeal,
);

router.patch(
  "/warnings/:warningId/review-appeal",
  auth(Role.SUPER_ADMIN, Role.ADMIN),
  validateRequest(DisciplineValidation.reviewAppealZodSchema),
  DisciplineController.reviewAppeal,
);

// 4. FINE CLEARANCE & CLEMENCY (EXPULSION REVOCATION)
router.patch(
  "/warnings/:warningId/pay-fine",
  auth(Role.SUPER_ADMIN, Role.ADMIN),
  DisciplineController.markFinePaid,
);

router.patch(
  "/students/:studentId/revoke-expulsion",
  auth(Role.SUPER_ADMIN),
  validateRequest(DisciplineValidation.revokeExpulsionZodSchema),
  DisciplineController.revokeExpulsion,
);

export const DisciplineRoutes = router;
