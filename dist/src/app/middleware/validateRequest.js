"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = void 0;
const catchAsync_1 = require("../utils/catchAsync");
const validateRequest = (zodSchema) => {
    return (0, catchAsync_1.catchAsync)((req, res, next) => {
        const payload = req.body ?? {};
        const result = zodSchema.safeParse(payload);
        if (!result.success) {
            const errorMessage = result.error.issues
                .map((issue) => issue.message)
                .join(". ");
            throw new Error(errorMessage);
        }
        req.body = result.data;
        next();
    });
};
exports.validateRequest = validateRequest;
