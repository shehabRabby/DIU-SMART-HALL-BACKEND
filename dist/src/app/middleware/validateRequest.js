import { catchAsync } from "../utils/catchAsync";
export const validateRequest = (zodSchema) => {
    return catchAsync((req, res, next) => {
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
