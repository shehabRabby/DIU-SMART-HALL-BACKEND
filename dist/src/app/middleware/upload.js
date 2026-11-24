"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadBufferToCloudinary = exports.upload = void 0;
const cloudinary_1 = require("cloudinary");
const multer_1 = __importDefault(require("multer"));
const config_1 = __importDefault(require("../config"));
// Configure Cloudinary using my existing flat config keys
cloudinary_1.v2.config({
    cloud_name: config_1.default.cloudinary_cloude_name,
    api_key: config_1.default.cloudinary_api_key,
    api_secret: config_1.default.cloudinary_api_secret,
});
const ALLOWED_MIME_TYPES = {
    "image/jpeg": "IMAGE",
    "image/png": "IMAGE",
    "image/webp": "IMAGE",
    "application/pdf": "PDF",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
};
const fileFilter = (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES[file.mimetype]) {
        cb(null, true);
    }
    else {
        cb(new Error("Invalid file format. Only JPG, PNG, WEBP, PDF, and DOCX are allowed."));
    }
};
// Memory storage prevents local disk bloat
exports.upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max limit
    fileFilter,
});
// Upload buffer directly to Cloudinary & detect AttachmentType
const uploadBufferToCloudinary = async (file, folder = "diu-smarthall/notices") => {
    const attachmentType = ALLOWED_MIME_TYPES[file.mimetype];
    const isImage = attachmentType === "IMAGE";
    const isPdf = attachmentType === "PDF";
    // Extract clean filename & extension (e.g., "notice_173234.pdf")
    const ext = file.originalname.split(".").pop()?.toLowerCase() || "";
    const baseName = file.originalname
        .replace(/\.[^/.]+$/, "")
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .slice(0, 40);
    const uniqueSuffix = Date.now();
    const publicId = isImage
        ? `${baseName || "img"}_${uniqueSuffix}`
        : `${baseName || "doc"}_${uniqueSuffix}.${ext}`;
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary_1.v2.uploader.upload_stream({
            folder,
            public_id: publicId,
            // "auto" allows PDFs to open inline in Chrome; "raw" is required for DOCX
            resource_type: isImage ? "image" : isPdf ? "auto" : "raw",
        }, (error, result) => {
            if (error || !result) {
                return reject(error || new Error("Cloudinary upload failed."));
            }
            resolve({
                url: result.secure_url,
                publicId: result.public_id,
                attachmentType,
            });
        });
        uploadStream.end(file.buffer);
    });
};
exports.uploadBufferToCloudinary = uploadBufferToCloudinary;
