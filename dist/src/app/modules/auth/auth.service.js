"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const enums_1 = require("../../../generated/prisma/enums");
const config_1 = __importDefault(require("../../config"));
const prisma_1 = require("../../lib/prisma");
const jwt_1 = require("../../utils/jwt");
const googleAuth_1 = require("../../lib/googleAuth");
const redis_1 = require("../../lib/redis");
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const ejs_1 = __importDefault(require("ejs"));
const nodemailer_1 = require("../../lib/nodemailer");
const registerStudent = async (payload) => {
    const { name, password, student: studentData } = payload;
    const email = payload.email.trim().toLowerCase();
    const isUserExists = await prisma_1.prisma.user.findUnique({
        where: { email },
    });
    if (isUserExists) {
        throw new Error("An account with this email address already exists.");
    }
    if (studentData?.studentUniId) {
        const isStudentUniIdExists = await prisma_1.prisma.student.findUnique({
            where: {
                studentUniId: studentData.studentUniId,
            },
        });
        if (isStudentUniIdExists) {
            throw new Error("A student with this University ID already exists.");
        }
    }
    const hashedPassword = await bcryptjs_1.default.hash(password, 8);
    const otpKey = `student-registration-otp:${email}`;
    const otpValue = crypto_1.default.randomInt(100000, 1000000).toString();
    const expirationSeconds = 5 * 60;
    await redis_1.redisClient.set(otpKey, otpValue, {
        expiration: {
            type: "EX",
            value: expirationSeconds,
        },
    });
    const studentRegistrationKey = `student-registration-data: ${email}`;
    const redisUserDataPayload = {
        name,
        email,
        password: hashedPassword,
        student: studentData,
    };
    await redis_1.redisClient.set(studentRegistrationKey, JSON.stringify(redisUserDataPayload), {
        expiration: {
            type: "EX",
            value: expirationSeconds,
        },
    });
    const tempatePath = path_1.default.join(process.cwd(), "src/app/templates/registration-user-otp.ejs");
    const templateData = {
        name,
        email,
        otp: otpValue,
        expirationMinutes: expirationSeconds / 60,
    };
    const html = await ejs_1.default.renderFile(tempatePath, templateData);
    await nodemailer_1.transporter.sendMail({
        from: config_1.default.email_sender,
        to: email,
        subject: "Verify Your Email - DIU Smart Hall System",
        html,
    });
};
const verifyStudentEmail = async (payload) => {
    const otp = payload.otp;
    const email = payload.email.trim().toLowerCase();
    const isUserExists = await prisma_1.prisma.user.findUnique({
        where: { email },
    });
    if (isUserExists?.status === "BLOCKED") {
        throw new Error("Your account has been blocked.");
    }
    if (isUserExists?.emailVerified) {
        throw new Error("This email is already verified.");
    }
    if (isUserExists?.isDeleted || isUserExists?.status === "DELETED") {
        throw new Error("Your account has been deleted.");
    }
    const otpKey = `student-registration-otp:${email}`;
    const redisOtp = await redis_1.redisClient.get(otpKey);
    if (!redisOtp) {
        throw new Error("Invalid or expired OTP. Please request a new one.");
    }
    if (redisOtp !== otp) {
        throw new Error("Incorrect OTP. Please check and try again.");
    }
    await redis_1.redisClient.del(otpKey);
    const studentRegistrationKey = `student-registration-data: ${email}`;
    const redisStudentData = await redis_1.redisClient.get(studentRegistrationKey);
    if (!redisStudentData) {
        throw new Error("Registration session expired or data not found. Please register again.");
    }
    const studentPayload = JSON.parse(redisStudentData);
    const createdUser = await prisma_1.prisma.user.create({
        data: {
            name: studentPayload.name,
            email: studentPayload.email,
            password: studentPayload.password,
            role: enums_1.Role.STUDENT,
            status: enums_1.UserStatus.ACTIVE,
            emailVerified: true,
            student: {
                create: {
                    name: studentPayload.name,
                    email: studentPayload.email,
                    contactNumber: studentPayload?.student?.contactNumber || "",
                    studentUniId: studentPayload?.student?.studentUniId || "",
                    department: studentPayload?.student?.department || "",
                },
            },
        },
        include: { student: true },
    });
    await redis_1.redisClient.del(studentRegistrationKey);
    const tempatePath = path_1.default.join(process.cwd(), "src/app/templates/student-welcome-email.ejs");
    const templateData = {
        name: createdUser.name,
    };
    const html = await ejs_1.default.renderFile(tempatePath, templateData);
    await nodemailer_1.transporter.sendMail({
        from: config_1.default.email_sender,
        to: email,
        subject: "Welcome to DIU Smart Hall System",
        html,
    });
    const { password: _password, student, ...user } = createdUser;
    const jwtPayload = {
        userId: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
    };
    const accessToken = jwt_1.jwtUtils.createToken(jwtPayload, config_1.default.jwt_access_secret, config_1.default.jwt_access_expires_in);
    const refreshToken = jwt_1.jwtUtils.createToken(jwtPayload, config_1.default.jwt_refresh_secret, config_1.default.jwt_refresh_expires_in);
    return {
        user,
        student,
        accessToken,
        refreshToken,
    };
};
const loginUser = async (payload) => {
    const { password } = payload;
    const email = payload.email.trim().toLowerCase();
    const user = await prisma_1.prisma.user.findUnique({
        where: { email },
    });
    if (!user) {
        throw new Error("No account found with this email address.");
    }
    if (user.status === enums_1.UserStatus.BLOCKED) {
        throw new Error("Your account has been blocked. Please contact support.");
    }
    if (user.isDeleted || user.status === enums_1.UserStatus.DELETED) {
        throw new Error("Your account has been deleted.");
    }
    if (user.password === null && user.googleId !== null) {
        throw new Error("This account was registered using Google. Please log in with Google.");
    }
    const isPasswordMatched = await bcryptjs_1.default.compare(password, user.password);
    if (!isPasswordMatched) {
        throw new Error("Incorrect password. Please try again.");
    }
    const jwtPayload = {
        userId: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
    };
    const accessToken = jwt_1.jwtUtils.createToken(jwtPayload, config_1.default.jwt_access_secret, config_1.default.jwt_access_expires_in);
    const refreshToken = jwt_1.jwtUtils.createToken(jwtPayload, config_1.default.jwt_refresh_secret, config_1.default.jwt_refresh_expires_in);
    return {
        accessToken,
        refreshToken,
    };
};
const getMe = async (user) => {
    const isUserExists = await prisma_1.prisma.user.findUnique({
        where: {
            id: user.userId,
        },
        include: {
            student: true,
        },
        omit: {
            password: true,
        },
    });
    if (!isUserExists) {
        throw new Error("User account not found.");
    }
    return isUserExists;
};
const refreshToken = async (token) => {
    const verifiedRefreshToken = jwt_1.jwtUtils.verifyToken(token, config_1.default.jwt_refresh_secret);
    if (!verifiedRefreshToken.success || !verifiedRefreshToken.data) {
        throw new Error(config_1.default.node_env === "development"
            ? verifiedRefreshToken.error
            : "Invalid refresh token");
    }
    const data = verifiedRefreshToken.data;
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: data.userId },
    });
    if (!user || user.isDeleted || user.status !== enums_1.UserStatus.ACTIVE) {
        throw new Error("User is inactive or not found");
    }
    const jwtPayload = {
        userId: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
    };
    const accessToken = jwt_1.jwtUtils.createToken(jwtPayload, config_1.default.jwt_access_secret, config_1.default.jwt_access_expires_in);
    const refreshToken = jwt_1.jwtUtils.createToken(jwtPayload, config_1.default.jwt_refresh_secret, config_1.default.jwt_refresh_expires_in);
    return {
        accessToken,
        refreshToken,
    };
};
const googleLogin = async (payload) => {
    let googleIdTokenPayload = null;
    try {
        const ticket = await googleAuth_1.googleClient.verifyIdToken({
            idToken: payload.idToken,
            audience: config_1.default.google_client_id,
        });
        googleIdTokenPayload = ticket.getPayload();
    }
    catch (error) {
        console.log("Google ID Token Verification Failed", error);
        throw new Error("Invalid or expired Google ID token.");
    }
    if (!googleIdTokenPayload) {
        throw new Error("Invalid or expired Google ID token.");
    }
    if (!googleIdTokenPayload.email) {
        throw new Error("Google email not found.");
    }
    if (!googleIdTokenPayload.name) {
        throw new Error("Google user name not found.");
    }
    // findFirst used for multi-field search to prevent Prisma validation errors
    const isStudentExistWithGoogleAuth = await prisma_1.prisma.user.findFirst({
        where: {
            email: googleIdTokenPayload.email,
            role: enums_1.Role.STUDENT,
            googleId: googleIdTokenPayload.sub,
        },
    });
    let user = isStudentExistWithGoogleAuth;
    if (!isStudentExistWithGoogleAuth) {
        const isStudentExistWithCredentials = await prisma_1.prisma.user.findFirst({
            where: {
                email: googleIdTokenPayload.email,
                role: enums_1.Role.STUDENT,
                authProvider: enums_1.AuthProvider.CREDENTIAL,
            },
        });
        if (isStudentExistWithCredentials) {
            if (!isStudentExistWithCredentials.emailVerified) {
                throw new Error("Please verify your email address before logging in with Google.");
            }
            if (isStudentExistWithCredentials.status === enums_1.UserStatus.BLOCKED) {
                throw new Error("Your account has been blocked. Please contact support.");
            }
            if (isStudentExistWithCredentials.isDeleted ||
                isStudentExistWithCredentials.status === enums_1.UserStatus.DELETED) {
                throw new Error("Your account has been deleted.");
            }
            user = await prisma_1.prisma.user.update({
                where: {
                    id: isStudentExistWithCredentials.id,
                },
                data: {
                    googleId: googleIdTokenPayload.sub,
                },
            });
            // Email Notification for Linking Google to Credential Account
            const templatePath = path_1.default.join(process.cwd(), "src/app/templates/google-link-notification.ejs");
            const templateData = {
                name: user.name,
            };
            const html = await ejs_1.default.renderFile(templatePath, templateData);
            await nodemailer_1.transporter.sendMail({
                from: config_1.default.email_sender,
                to: user.email,
                subject: "Security Alert: Google Account Linked to Your Account",
                html,
            });
        }
        else {
            user = await prisma_1.prisma.user.create({
                data: {
                    name: googleIdTokenPayload.name,
                    email: googleIdTokenPayload.email,
                    role: enums_1.Role.STUDENT,
                    googleId: googleIdTokenPayload.sub,
                    authProvider: enums_1.AuthProvider.GOOGLE,
                    emailVerified: true,
                    student: {
                        create: {
                            name: googleIdTokenPayload.name,
                            email: googleIdTokenPayload.email,
                        },
                    },
                },
            });
            // Welcome email for brand new Google registration
            const templatePath = path_1.default.join(process.cwd(), "src/app/templates/student-welcome-email.ejs");
            const templateData = {
                name: user.name,
            };
            const html = await ejs_1.default.renderFile(templatePath, templateData);
            await nodemailer_1.transporter.sendMail({
                from: config_1.default.email_sender,
                to: user.email,
                subject: "Welcome to DIU Smart Hall System",
                html,
            });
        }
    }
    if (!user) {
        throw new Error("User account not found.");
    }
    if (user.status === enums_1.UserStatus.BLOCKED) {
        throw new Error("Your account has been blocked. Please contact support.");
    }
    if (user.isDeleted || user.status === enums_1.UserStatus.DELETED) {
        throw new Error("Your account has been deleted.");
    }
    const jwtPayload = {
        userId: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
    };
    const accessToken = jwt_1.jwtUtils.createToken(jwtPayload, config_1.default.jwt_access_secret, config_1.default.jwt_access_expires_in);
    const refreshToken = jwt_1.jwtUtils.createToken(jwtPayload, config_1.default.jwt_refresh_secret, config_1.default.jwt_refresh_expires_in);
    return {
        accessToken,
        refreshToken,
    };
};
const forgotPassword = async (payload) => {
    const { email } = payload;
    const isUserExist = await prisma_1.prisma.user.findUnique({
        where: {
            email,
        },
    });
    if (!isUserExist) {
        throw new Error("No account found with this email address.");
    }
    if (isUserExist.status === "BLOCKED") {
        throw new Error("Your account has been blocked. Please contact support.");
    }
    if (!isUserExist.emailVerified) {
        throw new Error("Please verify your email address first.");
    }
    if (isUserExist.isDeleted || isUserExist.status === "DELETED") {
        throw new Error("Your account has been deleted.");
    }
    if (isUserExist.googleId && isUserExist.authProvider === "GOOGLE") {
        throw new Error("This account uses Google login. Please sign in with Google.");
    }
    const otp = crypto_1.default.randomInt(100000, 1000000).toString();
    const key = `forgor-password-otp:${isUserExist.email}`;
    const expirationSeconds = 5 * 60;
    await redis_1.redisClient.set(key, otp, {
        expiration: {
            type: "EX",
            value: expirationSeconds,
        },
    });
    const tempatePath = path_1.default.join(process.cwd(), "src/app/templates/forgot-password.ejs");
    const templateData = {
        name: isUserExist.name,
        otp,
        expirationMinutes: expirationSeconds / 60,
    };
    const html = await ejs_1.default.renderFile(tempatePath, templateData);
    await nodemailer_1.transporter.sendMail({
        from: config_1.default.email_sender,
        to: isUserExist.email,
        subject: "Password Reset OTP - DIU Smart Hall System",
        html,
    });
};
const resetPassword = async (payload) => {
    const { email, otp, newPassword } = payload;
    const isUserExist = await prisma_1.prisma.user.findUnique({
        where: {
            email,
        },
    });
    if (!isUserExist) {
        throw new Error("No account found with this email address.");
    }
    if (isUserExist.status === "BLOCKED") {
        throw new Error("Your account has been blocked. Please contact support.");
    }
    if (!isUserExist.emailVerified) {
        throw new Error("Please verify your email address first.");
    }
    if (isUserExist.isDeleted || isUserExist.status === "DELETED") {
        throw new Error("Your account has been deleted.");
    }
    if (isUserExist.googleId && isUserExist.authProvider === "GOOGLE") {
        throw new Error("This account uses Google login. Password reset is not applicable.");
    }
    const key = `forgor-password-otp:${isUserExist.email}`;
    const redisOtp = await redis_1.redisClient.get(key);
    if (!redisOtp) {
        throw new Error("Invalid or expired OTP. Please request a new one.");
    }
    if (redisOtp !== otp) {
        throw new Error("Incorrect OTP. Please check and try again.");
    }
    const hashedNewPassword = await bcryptjs_1.default.hash(newPassword, Number(config_1.default.bcrypt_salt_rounds));
    await prisma_1.prisma.user.update({
        where: {
            email: isUserExist.email,
        },
        data: {
            password: hashedNewPassword,
        },
    });
    await redis_1.redisClient.del([key]);
    const tempatePath = path_1.default.join(process.cwd(), "src/app/templates/reset-password-success.ejs");
    const templateData = {
        name: isUserExist.name,
    };
    const html = await ejs_1.default.renderFile(tempatePath, templateData);
    await nodemailer_1.transporter.sendMail({
        from: config_1.default.email_sender,
        to: isUserExist.email,
        subject: "Password Reset Successful - DIU Smart Hall System",
        html,
    });
};
exports.AuthService = {
    registerStudent,
    verifyStudentEmail,
    loginUser,
    getMe,
    refreshToken,
    googleLogin,
    forgotPassword,
    resetPassword,
};
