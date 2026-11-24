"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoticeController = void 0;
const upload_1 = require("../../middleware/upload");
const catchAsync_1 = require("../../utils/catchAsync");
const sendResponse_1 = require("../../utils/sendResponse");
const notice_service_1 = require("./notice.service");
const processUploadedFiles = async (files) => {
    if (!files || files.length === 0)
        return [];
    const uploadPromises = files.map(async (file) => {
        const uploaded = await (0, upload_1.uploadBufferToCloudinary)(file, "diu-smarthall/notices");
        return {
            url: uploaded.url,
            type: uploaded.attachmentType,
            fileName: file.originalname,
        };
    });
    return Promise.all(uploadPromises);
};
const createNotice = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const payload = { ...req.body };
    const files = req.files;
    if (files && files.length > 0) {
        const uploadedAttachments = await processUploadedFiles(files);
        payload.attachments = [
            ...(payload.attachments ?? []),
            ...uploadedAttachments,
        ];
    }
    const result = await notice_service_1.NoticeService.createNotice(req.user.userId, payload);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: 201,
        success: true,
        message: "Notice published successfully.",
        data: result,
    });
});
const getStudentNotices = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const result = await notice_service_1.NoticeService.getStudentNotices(req.query);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: 200,
        success: true,
        message: "Active notices retrieved successfully.",
        data: result,
    });
});
const getAllNoticesForAdmin = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const result = await notice_service_1.NoticeService.getAllNoticesForAdmin(req.query);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: 200,
        success: true,
        message: "All notices retrieved successfully.",
        data: result,
    });
});
const updateNotice = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const payload = { ...req.body };
    const files = req.files;
    if (files && files.length > 0) {
        const uploadedAttachments = await processUploadedFiles(files);
        payload.attachments = [
            ...(payload.attachments ?? []),
            ...uploadedAttachments,
        ];
    }
    const result = await notice_service_1.NoticeService.updateNotice(req.params.noticeId, payload);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: 200,
        success: true,
        message: "Notice updated successfully.",
        data: result,
    });
});
const deleteNotice = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const result = await notice_service_1.NoticeService.deleteNotice(req.params.noticeId);
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: 200,
        success: true,
        message: "Notice deleted successfully.",
        data: result,
    });
});
const purgeExpiredNotices = (0, catchAsync_1.catchAsync)(async (_req, res) => {
    const result = await notice_service_1.NoticeService.purgeExpiredNotices();
    (0, sendResponse_1.sendResponse)(res, {
        statusCode: 200,
        success: true,
        message: "Expired notices purged successfully.",
        data: result,
    });
});
exports.NoticeController = {
    createNotice,
    getStudentNotices,
    getAllNoticesForAdmin,
    updateNotice,
    deleteNotice,
    purgeExpiredNotices,
};
