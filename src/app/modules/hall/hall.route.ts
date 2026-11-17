import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { HallController } from "./hall.controller";
import { HallValidation } from "./hall.validation";

const router = Router();

// Hall Management Routes
router.post(
  "/",
  auth(Role.SUPER_ADMIN),
  validateRequest(HallValidation.CreateHallZodSchema),
  HallController.createHall,
);

router.get(
  "/",
  auth(Role.SUPER_ADMIN, Role.ADMIN, Role.STUDENT),
  HallController.getAllHalls,
);

// Room Management Routes (Must be defined before /:hallId to avoid route conflicts)
router.post(
  "/rooms",
  auth(Role.SUPER_ADMIN, Role.ADMIN),
  validateRequest(HallValidation.CreateSingleRoomZodSchema),
  HallController.createSingleRoom,
);

router.post(
  "/rooms/generate-bulk",
  auth(Role.SUPER_ADMIN, Role.ADMIN),
  validateRequest(HallValidation.BulkGenerateRoomsZodSchema),
  HallController.bulkGenerateRooms,
);

router.get(
  "/rooms",
  auth(Role.SUPER_ADMIN, Role.ADMIN),
  HallController.getAllRooms,
);

router.patch(
  "/rooms/:roomId",
  auth(Role.SUPER_ADMIN, Role.ADMIN),
  validateRequest(HallValidation.UpdateRoomZodSchema),
  HallController.updateRoom,
);

// Single Hall Routes
router.get(
  "/:hallId",
  auth(Role.SUPER_ADMIN, Role.ADMIN, Role.STUDENT),
  HallController.getSingleHall,
);

router.patch(
  "/:hallId",
  auth(Role.SUPER_ADMIN),
  validateRequest(HallValidation.UpdateHallZodSchema),
  HallController.updateHall,
);

export const HallRoutes = router;
