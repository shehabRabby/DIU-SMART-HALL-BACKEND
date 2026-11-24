"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HallRoutes = void 0;
const express_1 = require("express");
const enums_1 = require("../../../generated/prisma/enums");
const checkAuth_1 = require("../../middleware/checkAuth");
const validateRequest_1 = require("../../middleware/validateRequest");
const hall_controller_1 = require("./hall.controller");
const hall_validation_1 = require("./hall.validation");
const router = (0, express_1.Router)();
// Hall Management Routes
router.post("/", (0, checkAuth_1.auth)(enums_1.Role.SUPER_ADMIN), (0, validateRequest_1.validateRequest)(hall_validation_1.HallValidation.CreateHallZodSchema), hall_controller_1.HallController.createHall);
router.get("/", (0, checkAuth_1.auth)(enums_1.Role.SUPER_ADMIN, enums_1.Role.ADMIN, enums_1.Role.STUDENT), hall_controller_1.HallController.getAllHalls);
// Room Management Routes (Must be defined before /:hallId to avoid route conflicts)
router.post("/rooms", (0, checkAuth_1.auth)(enums_1.Role.SUPER_ADMIN, enums_1.Role.ADMIN), (0, validateRequest_1.validateRequest)(hall_validation_1.HallValidation.CreateSingleRoomZodSchema), hall_controller_1.HallController.createSingleRoom);
router.post("/rooms/generate-bulk", (0, checkAuth_1.auth)(enums_1.Role.SUPER_ADMIN, enums_1.Role.ADMIN), (0, validateRequest_1.validateRequest)(hall_validation_1.HallValidation.BulkGenerateRoomsZodSchema), hall_controller_1.HallController.bulkGenerateRooms);
router.get("/rooms", (0, checkAuth_1.auth)(enums_1.Role.SUPER_ADMIN, enums_1.Role.ADMIN), hall_controller_1.HallController.getAllRooms);
router.patch("/rooms/:roomId", (0, checkAuth_1.auth)(enums_1.Role.SUPER_ADMIN, enums_1.Role.ADMIN), (0, validateRequest_1.validateRequest)(hall_validation_1.HallValidation.UpdateRoomZodSchema), hall_controller_1.HallController.updateRoom);
// Single Hall Routes
router.get("/:hallId", (0, checkAuth_1.auth)(enums_1.Role.SUPER_ADMIN, enums_1.Role.ADMIN, enums_1.Role.STUDENT), hall_controller_1.HallController.getSingleHall);
router.patch("/:hallId", (0, checkAuth_1.auth)(enums_1.Role.SUPER_ADMIN), (0, validateRequest_1.validateRequest)(hall_validation_1.HallValidation.UpdateHallZodSchema), hall_controller_1.HallController.updateHall);
exports.HallRoutes = router;
