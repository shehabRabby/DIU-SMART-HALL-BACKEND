"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserServices = void 0;
const cloudinary_1 = require("../../../lib/cloudinary");
const prisma_1 = require("../../../lib/prisma");
const uploadProfileImage = async (buffer, userId) => {
    const currentUser = await prisma_1.prisma.user.findUnique({
        where: {
            id: userId,
        },
        select: {
            imagePublicId: true,
            imageUrl: true,
        },
    });
    if (!currentUser) {
        throw new Error("User account not found.");
    }
    const cloudinaryResult = await new Promise((resolve, reject) => {
        cloudinary_1.cloudinary.uploader
            .upload_stream({
            resource_type: "auto",
        }, async (error, result) => {
            if (error) {
                return reject(error);
            }
            if (!result) {
                return reject(new Error("Failed to upload image. No response received from Cloudinary."));
            }
            resolve(result);
        })
            .end(buffer);
    });
    const updatedUser = await prisma_1.prisma.user.update({
        where: {
            id: userId,
        },
        data: {
            imageUrl: cloudinaryResult.secure_url,
            imagePublicId: cloudinaryResult.public_id,
        },
        omit: {
            password: true,
        },
    });
    // Remove the old profile image from Cloudinary if a previous one exists
    if (currentUser.imagePublicId) {
        await cloudinary_1.cloudinary.uploader.destroy(currentUser.imagePublicId);
    }
    return updatedUser;
};
exports.UserServices = {
    uploadProfileImage,
};
