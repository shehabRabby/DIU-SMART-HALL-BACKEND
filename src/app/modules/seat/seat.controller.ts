import { Request, Response } from "express";
import { ApplicationStatus, Gender } from "../../../generated/prisma/enums";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import {
  IRoomChangeFilterQuery,
  ISeatApplicationFilterQuery,
} from "./seat.interface";
import { SeatService } from "./seat.service";

// 1. SEAT APPLICATION CONTROLLERS

const applyForSeat = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const result = await SeatService.applyForSeat(userId, req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Seat application submitted successfully.",
    data: result,
  });
});

const getMySeatApplications = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const result = await SeatService.getMySeatApplications(userId);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Your seat applications retrieved successfully.",
      data: result,
    });
  },
);

const cancelMySeatApplication = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const applicationId = req.params.applicationId as string;
    const result = await SeatService.cancelMySeatApplication(
      userId,
      applicationId,
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Seat application withdrawn successfully.",
      data: result,
    });
  },
);

const getMyCurrentSeat = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const result = await SeatService.getMyCurrentSeat(userId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Current seat and roommates retrieved successfully.",
    data: result,
  });
});

const getAllSeatApplications = catchAsync(
  async (req: Request, res: Response) => {
    const query: ISeatApplicationFilterQuery = {};

    if (
      typeof req.query.status === "string" &&
      Object.values(ApplicationStatus).includes(
        req.query.status as ApplicationStatus,
      )
    ) {
      query.status = req.query.status as ApplicationStatus;
    }

    if (
      typeof req.query.gender === "string" &&
      Object.values(Gender).includes(req.query.gender as Gender)
    ) {
      query.gender = req.query.gender as Gender;
    }

    if (typeof req.query.department === "string") {
      query.department = req.query.department;
    }

    const result = await SeatService.getAllSeatApplications(query);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Seat applications retrieved successfully.",
      data: result,
    });
  },
);

// 2. SMART RECOMMENDATION & ALLOCATION

const getRecommendedRooms = catchAsync(async (req: Request, res: Response) => {
  const applicationId = req.params.applicationId as string;
  const result =
    await SeatService.getRecommendedRoomsForApplication(applicationId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Smart room recommendations generated successfully.",
    data: result,
  });
});

const approveSeatApplication = catchAsync(
  async (req: Request, res: Response) => {
    const reviewerUserId = req.user!.userId;
    const applicationId = req.params.applicationId as string;
    const result = await SeatService.approveSeatApplication(
      reviewerUserId,
      applicationId,
      req.body,
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Seat application approved and room allocated successfully.",
      data: result,
    });
  },
);

const rejectSeatApplication = catchAsync(
  async (req: Request, res: Response) => {
    const reviewerUserId = req.user!.userId;
    const applicationId = req.params.applicationId as string;
    const result = await SeatService.rejectSeatApplication(
      reviewerUserId,
      applicationId,
      req.body,
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Seat application rejected.",
      data: result,
    });
  },
);

const directAllocateSeat = catchAsync(async (req: Request, res: Response) => {
  const reviewerUserId = req.user!.userId;
  const result = await SeatService.directAllocateSeat(reviewerUserId, req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Seat directly allocated to student successfully.",
    data: result,
  });
});

// 3. ROOM CHANGE CONTROLLERS

const requestRoomChange = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const result = await SeatService.requestRoomChange(userId, req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Room change request submitted successfully.",
    data: result,
  });
});

const getMyRoomChangeRequests = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const result = await SeatService.getMyRoomChangeRequests(userId);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Your room change requests retrieved successfully.",
      data: result,
    });
  },
);

const getAllRoomChangeRequests = catchAsync(
  async (req: Request, res: Response) => {
    const query: IRoomChangeFilterQuery = {};

    if (
      typeof req.query.status === "string" &&
      Object.values(ApplicationStatus).includes(
        req.query.status as ApplicationStatus,
      )
    ) {
      query.status = req.query.status as ApplicationStatus;
    }

    const result = await SeatService.getAllRoomChangeRequests(query);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Room change requests retrieved successfully.",
      data: result,
    });
  },
);

const approveRoomChange = catchAsync(async (req: Request, res: Response) => {
  const reviewerUserId = req.user!.userId;
  const requestId = req.params.requestId as string;
  const result = await SeatService.approveRoomChange(
    reviewerUserId,
    requestId,
    req.body,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Room change request approved and student transferred.",
    data: result,
  });
});

const rejectRoomChange = catchAsync(async (req: Request, res: Response) => {
  const reviewerUserId = req.user!.userId;
  const requestId = req.params.requestId as string;
  const result = await SeatService.rejectRoomChange(
    reviewerUserId,
    requestId,
    req.body,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Room change request rejected.",
    data: result,
  });
});

// 4. SEAT CANCELLATION & ANALYTICS

const cancelSeatByStudent = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const result = await SeatService.cancelSeatByStudent(userId, req.body ?? {});

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Your hall seat has been cancelled successfully.",
    data: result,
  });
});

const cancelSeatByAdmin = catchAsync(async (req: Request, res: Response) => {
  const studentId = req.params.studentId as string;
  const result = await SeatService.cancelSeatByAdmin(studentId, req.body ?? {});

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Student hall seat cancelled successfully.",
    data: result,
  });
});

const getSeatAnalytics = catchAsync(async (req: Request, res: Response) => {
  const result = await SeatService.getSeatAnalytics();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Seat analytics retrieved successfully.",
    data: result,
  });
});

const cancelMyRoomChangeRequest = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { requestId } = req.params;
    const result = await SeatService.cancelMyRoomChangeRequest(
      userId,
      requestId as string,
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Pending room change request cancelled successfully.",
      data: result,
    });
  },
);

const getAllResidents = catchAsync(async (req: Request, res: Response) => {
  const result = await SeatService.getAllResidents(req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Hall residents retrieved successfully.",
    data: result,
  });
});

const getMySeatHistory = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const result = await SeatService.getMySeatHistory(userId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Seat allocation and transfer history retrieved successfully.",
    data: result,
  });
});

export const SeatController = {
  applyForSeat,
  getMySeatApplications,
  cancelMySeatApplication,
  getMyCurrentSeat,
  getAllSeatApplications,
  getRecommendedRooms,
  approveSeatApplication,
  rejectSeatApplication,
  directAllocateSeat,
  requestRoomChange,
  getMyRoomChangeRequests,
  getAllRoomChangeRequests,
  approveRoomChange,
  rejectRoomChange,
  cancelSeatByStudent,
  cancelSeatByAdmin,
  getSeatAnalytics,
  cancelMyRoomChangeRequest,
  getAllResidents,
  getMySeatHistory,
};
