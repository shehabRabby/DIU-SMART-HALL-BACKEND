import { Request, Response } from "express";
import httpStatus from "http-status";
import { UserServices } from "./user.service";
import { catchAsync } from "../../../utils/catchAsync";
import { sendResponse } from "../../../utils/sendResponse";

const uploadProfileImage = catchAsync(async (req: Request, res: Response) => {
    if (!req.file) {
        throw new Error("Please upload an image file to proceed.");
    }

    const userId = req.user?.userId;

    const result = await UserServices.uploadProfileImage(req.file?.buffer, userId!);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Profile image uploaded successfully.",
        data: result,
    });
});

export const UserController = {
    uploadProfileImage,
};