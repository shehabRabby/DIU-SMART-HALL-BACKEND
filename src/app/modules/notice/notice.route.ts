import { NextFunction, Request, Response, Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { upload } from "../../middleware/upload";
import { validateRequest } from "../../middleware/validateRequest";
import { NoticeController } from "./notice.controller";
import { NoticeValidation } from "./notice.validation";

const router = Router();

/**
 * Helper Middleware: Normalize multipart/form-data fields before Zod validation
 * Supports either `data` JSON string field OR individual form-data fields (e.g., isPinned: "true")
 */
const parseNoticeFormData = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  if (req.body?.data && typeof req.body.data === "string") {
    req.body = JSON.parse(req.body.data);
  } else if (req.body) {
    if (req.body.isPinned === "true") req.body.isPinned = true;
    if (req.body.isPinned === "false") req.body.isPinned = false;
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

router.post(
  "/",
  auth(Role.SUPER_ADMIN, Role.ADMIN),
  upload.array("files", 5), // Minimum 0, Maximum 5 files
  parseNoticeFormData,
  validateRequest(NoticeValidation.createNoticeZodSchema),
  NoticeController.createNotice,
);

router.get("/", NoticeController.getStudentNotices);

router.get(
  "/admin/all",
  auth(Role.SUPER_ADMIN, Role.ADMIN),
  NoticeController.getAllNoticesForAdmin,
);

router.delete(
  "/admin/purge-expired",
  auth(Role.SUPER_ADMIN, Role.ADMIN),
  NoticeController.purgeExpiredNotices,
);

router.patch(
  "/:noticeId",
  auth(Role.SUPER_ADMIN, Role.ADMIN),
  upload.array("files", 5), // Minimum 0, Maximum 5 files
  parseNoticeFormData,
  validateRequest(NoticeValidation.updateNoticeZodSchema),
  NoticeController.updateNotice,
);

router.delete(
  "/:noticeId",
  auth(Role.SUPER_ADMIN, Role.ADMIN),
  NoticeController.deleteNotice,
);

export const NoticeRoutes = router;