"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoticeRoutes = void 0;
const express_1 = require("express");
const enums_1 = require("../../../generated/prisma/enums");
const checkAuth_1 = require("../../middleware/checkAuth");
const upload_1 = require("../../middleware/upload");
const validateRequest_1 = require("../../middleware/validateRequest");
const notice_controller_1 = require("./notice.controller");
const notice_validation_1 = require("./notice.validation");
const router = (0, express_1.Router)();
/**
 * Helper Middleware: Normalize multipart/form-data fields before Zod validation
 * Supports either `data` JSON string field OR individual form-data fields (e.g., isPinned: "true")
 */
const parseNoticeFormData = (req, _res, next) => {
    if (req.body?.data && typeof req.body.data === "string") {
        req.body = JSON.parse(req.body.data);
    }
    else if (req.body) {
        if (req.body.isPinned === "true")
            req.body.isPinned = true;
        if (req.body.isPinned === "false")
            req.body.isPinned = false;
        if (req.body.hallId === "" || req.body.hallId === "null") {
            req.body.hallId = null;
        }
        if (req.body.expiresAt === "" || req.body.expiresAt === "null") {
            req.body.expiresAt = null;
        }
        if (typeof req.body.attachments === "string") {
            req.body.attachments = JSON.parse(req.body.attachments);
        }
    }
    next();
};
router.post("/", (0, checkAuth_1.auth)(enums_1.Role.SUPER_ADMIN, enums_1.Role.ADMIN), upload_1.upload.array("files", 5), // Minimum 0, Maximum 5 files
parseNoticeFormData, (0, validateRequest_1.validateRequest)(notice_validation_1.NoticeValidation.createNoticeZodSchema), notice_controller_1.NoticeController.createNotice);
router.get("/", notice_controller_1.NoticeController.getStudentNotices);
router.get("/admin/all", (0, checkAuth_1.auth)(enums_1.Role.SUPER_ADMIN, enums_1.Role.ADMIN), notice_controller_1.NoticeController.getAllNoticesForAdmin);
router.delete("/admin/purge-expired", (0, checkAuth_1.auth)(enums_1.Role.SUPER_ADMIN, enums_1.Role.ADMIN), notice_controller_1.NoticeController.purgeExpiredNotices);
router.patch("/:noticeId", (0, checkAuth_1.auth)(enums_1.Role.SUPER_ADMIN, enums_1.Role.ADMIN), upload_1.upload.array("files", 5), // Minimum 0, Maximum 5 files
parseNoticeFormData, (0, validateRequest_1.validateRequest)(notice_validation_1.NoticeValidation.updateNoticeZodSchema), notice_controller_1.NoticeController.updateNotice);
router.delete("/:noticeId", (0, checkAuth_1.auth)(enums_1.Role.SUPER_ADMIN, enums_1.Role.ADMIN), notice_controller_1.NoticeController.deleteNotice);
exports.NoticeRoutes = router;
