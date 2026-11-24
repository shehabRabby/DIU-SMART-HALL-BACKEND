"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HallController = void 0;
const http_status_1 = __importDefault(require("http-status"));
const enums_1 = require("../../../generated/prisma/enums");
const hall_service_1 = require("./hall.service");
const catchAsync_1 = require("../../utils/catchAsync");
const sendResponse_1 = require("../../utils/sendResponse");
const createHall = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const payload = req.body;
    const result = await hall_service_1.HallServices.createHall(payload);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: http_status_1.default.CREATED,
        success: true,
        message: "Hall created successfully.",
        data: result,
    });
});
const getAllHalls = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const query = {};
    if (typeof req.query.genderType === "string" &&
        (req.query.genderType === enums_1.Gender.MALE ||
            req.query.genderType === enums_1.Gender.FEMALE)) {
        query.genderType = req.query.genderType;
    }
    if (typeof req.query.isActive === "string") {
        if (req.query.isActive === "true")
            query.isActive = true;
        if (req.query.isActive === "false")
            query.isActive = false;
    }
    const result = await hall_service_1.HallServices.getAllHalls(query);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Halls retrieved successfully.",
        data: result,
    });
});
const getSingleHall = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const hallId = String(req.params.hallId);
    const result = await hall_service_1.HallServices.getSingleHall(hallId);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Hall details retrieved successfully.",
        data: result,
    });
});
const updateHall = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const hallId = String(req.params.hallId);
    const payload = req.body;
    const result = await hall_service_1.HallServices.updateHall(hallId, payload);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Hall updated successfully.",
        data: result,
    });
});
const createSingleRoom = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const payload = req.body;
    const result = await hall_service_1.HallServices.createSingleRoom(payload);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: http_status_1.default.CREATED,
        success: true,
        message: "Room created successfully.",
        data: result,
    });
});
const bulkGenerateRooms = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const payload = req.body;
    const result = await hall_service_1.HallServices.bulkGenerateRooms(payload);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: http_status_1.default.CREATED,
        success: true,
        message: `${result.createdCount} rooms generated successfully for ${result.shortName}.`,
        data: result,
    });
});
const getAllRooms = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const query = {};
    if (typeof req.query.hallId === "string" && req.query.hallId.trim() !== "") {
        query.hallId = req.query.hallId;
    }
    if (typeof req.query.floor === "string" && req.query.floor.trim() !== "") {
        const parsedFloor = Number(req.query.floor);
        if (!Number.isNaN(parsedFloor)) {
            query.floor = parsedFloor;
        }
    }
    if (typeof req.query.status === "string" &&
        Object.values(enums_1.RoomStatus).includes(req.query.status)) {
        query.status = req.query.status;
    }
    if (typeof req.query.genderType === "string" &&
        (req.query.genderType === enums_1.Gender.MALE ||
            req.query.genderType === enums_1.Gender.FEMALE)) {
        query.genderType = req.query.genderType;
    }
    const result = await hall_service_1.HallServices.getAllRooms(query);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Rooms retrieved successfully.",
        data: result,
    });
});
const updateRoom = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const roomId = String(req.params.roomId);
    const payload = req.body;
    const result = await hall_service_1.HallServices.updateRoom(roomId, payload);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Room updated successfully.",
        data: result,
    });
});
exports.HallController = {
    createHall,
    getAllHalls,
    getSingleHall,
    updateHall,
    createSingleRoom,
    bulkGenerateRooms,
    getAllRooms,
    updateRoom,
};
