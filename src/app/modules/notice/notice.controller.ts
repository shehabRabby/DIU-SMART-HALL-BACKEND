import { Request, Response } from "express";
import { uploadBufferToCloudinary } from "../../middleware/upload";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { INoticeAttachment, INoticeFilterParams } from "./notice.interface";
import { NoticeService } from "./notice.service";

const processUploadedFiles = async (
  files?: Express.Multer.File[],
): Promise<INoticeAttachment[]> => {
  if (!files || files.length === 0) return [];

  const uploadPromises = files.map(async (file) => {
    const uploaded = await uploadBufferToCloudinary(
      file,
      "diu-smarthall/notices",
    );
    return {
      url: uploaded.url,
      type: uploaded.attachmentType,
      fileName: file.originalname,
    };
  });

  return Promise.all(uploadPromises);
};

const createNotice = catchAsync(async (req: Request, res: Response) => {
  const payload = { ...req.body };
  const files = req.files as Express.Multer.File[] | undefined;

  if (files && files.length > 0) {
    const uploadedAttachments = await processUploadedFiles(files);
    payload.attachments = [
      ...(payload.attachments ?? []),
      ...uploadedAttachments,
    ];
  }

  const result = await NoticeService.createNotice(req.user!.userId, payload);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Notice published successfully.",
    data: result,
  });
});

const getStudentNotices = catchAsync(async (req: Request, res: Response) => {
  const result = await NoticeService.getStudentNotices(
    req.query as INoticeFilterParams,
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Active notices retrieved successfully.",
    data: result,
  });
});

const getAllNoticesForAdmin = catchAsync(async (req: Request, res: Response) => {
  const result = await NoticeService.getAllNoticesForAdmin(
    req.query as INoticeFilterParams,
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "All notices retrieved successfully.",
    data: result,
  });
});

const updateNotice = catchAsync(async (req: Request, res: Response) => {
  const payload = { ...req.body };
  const files = req.files as Express.Multer.File[] | undefined;

  if (files && files.length > 0) {
    const uploadedAttachments = await processUploadedFiles(files);
    payload.attachments = [
      ...(payload.attachments ?? []),
      ...uploadedAttachments,
    ];
  }

  const result = await NoticeService.updateNotice(
    req.params.noticeId as string,
    payload,
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Notice updated successfully.",
    data: result,
  });
});

const deleteNotice = catchAsync(async (req: Request, res: Response) => {
  const result = await NoticeService.deleteNotice(req.params.noticeId as string);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Notice deleted successfully.",
    data: result,
  });
});

const purgeExpiredNotices = catchAsync(async (_req: Request, res: Response) => {
  const result = await NoticeService.purgeExpiredNotices();
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Expired notices purged successfully.",
    data: result,
  });
});

export const NoticeController = {
  createNotice,
  getStudentNotices,
  getAllNoticesForAdmin,
  updateNotice,
  deleteNotice,
  purgeExpiredNotices,
};