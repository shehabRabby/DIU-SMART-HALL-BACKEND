import type { Request, Response } from "express";
import httpStatus from "http-status";
import { Gender, RoomStatus } from "../../../generated/prisma/enums";

import type {
  IBulkGenerateRoomsPayload,
  ICreateHallPayload,
  ICreateSingleRoomPayload,
  IHallFilterQuery,
  IRoomFilterQuery,
  IUpdateHallPayload,
  IUpdateRoomPayload,
} from "./hall.interface";
import { HallServices } from "./hall.service";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";

const createHall = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body as ICreateHallPayload;
  const result = await HallServices.createHall(payload);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Hall created successfully.",
    data: result,
  });
});

const getAllHalls = catchAsync(async (req: Request, res: Response) => {
  const query: IHallFilterQuery = {};

  if (
    typeof req.query.genderType === "string" &&
    (req.query.genderType === Gender.MALE ||
      req.query.genderType === Gender.FEMALE)
  ) {
    query.genderType = req.query.genderType;
  }

  if (typeof req.query.isActive === "string") {
    if (req.query.isActive === "true") query.isActive = true;
    if (req.query.isActive === "false") query.isActive = false;
  }

  const result = await HallServices.getAllHalls(query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Halls retrieved successfully.",
    data: result,
  });
});

const getSingleHall = catchAsync(async (req: Request, res: Response) => {
  const hallId = String(req.params.hallId);
  const result = await HallServices.getSingleHall(hallId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Hall details retrieved successfully.",
    data: result,
  });
});

const updateHall = catchAsync(async (req: Request, res: Response) => {
  const hallId = String(req.params.hallId);
  const payload = req.body as IUpdateHallPayload;
  const result = await HallServices.updateHall(hallId, payload);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Hall updated successfully.",
    data: result,
  });
});

const createSingleRoom = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body as ICreateSingleRoomPayload;
  const result = await HallServices.createSingleRoom(payload);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Room created successfully.",
    data: result,
  });
});

const bulkGenerateRooms = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body as IBulkGenerateRoomsPayload;
  const result = await HallServices.bulkGenerateRooms(payload);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: `${result.createdCount} rooms generated successfully for ${result.shortName}.`,
    data: result,
  });
});

const getAllRooms = catchAsync(async (req: Request, res: Response) => {
  const query: IRoomFilterQuery = {};

  if (typeof req.query.hallId === "string" && req.query.hallId.trim() !== "") {
    query.hallId = req.query.hallId;
  }

  if (typeof req.query.floor === "string" && req.query.floor.trim() !== "") {
    const parsedFloor = Number(req.query.floor);
    if (!Number.isNaN(parsedFloor)) {
      query.floor = parsedFloor;
    }
  }

  if (
    typeof req.query.status === "string" &&
    Object.values(RoomStatus).includes(req.query.status as RoomStatus)
  ) {
    query.status = req.query.status as RoomStatus;
  }

  if (
    typeof req.query.genderType === "string" &&
    (req.query.genderType === Gender.MALE ||
      req.query.genderType === Gender.FEMALE)
  ) {
    query.genderType = req.query.genderType;
  }

  const result = await HallServices.getAllRooms(query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Rooms retrieved successfully.",
    data: result,
  });
});

const updateRoom = catchAsync(async (req: Request, res: Response) => {
  const roomId = String(req.params.roomId);
  const payload = req.body as IUpdateRoomPayload;
  const result = await HallServices.updateRoom(roomId, payload);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Room updated successfully.",
    data: result,
  });
});

export const HallController = {
  createHall,
  getAllHalls,
  getSingleHall,
  updateHall,
  createSingleRoom,
  bulkGenerateRooms,
  getAllRooms,
  updateRoom,
};