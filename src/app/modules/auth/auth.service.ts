import bcrypt from "bcryptjs";
import type { JwtPayload, SignOptions } from "jsonwebtoken";
import {
  AuthProvider,
  Role,
  UserStatus,
} from "../../../generated/prisma/enums";
import config from "../../config";
import { prisma } from "../../lib/prisma";
import { jwtUtils } from "../../utils/jwt";
import type {
  IForgotPasswordPayload,
  IGoogleLoginPayload,
  ILoginUserPayload,
  IRegisterStudentPayload,
  IRequestUser,
  IResetPasswordPayload,
  IVerifyEmailPayload,
} from "./auth.interface";
import { OAuth2Client, type TokenPayload } from "google-auth-library";
import { googleClient } from "../../lib/googleAuth";
import { redisClient } from "../../lib/redis";
import path from "path";
import crypto from "crypto";
import ejs from "ejs";
import { transporter } from "../../lib/nodemailer";

const registerStudent = async (payload: IRegisterStudentPayload) => {
  const { name, password, student: studentData } = payload;

  const email = payload.email.trim().toLowerCase();

  const isUserExists = await prisma.user.findUnique({
    where: { email },
  });

  if (isUserExists) {
    throw new Error("An account with this email address already exists.");
  }

  if (studentData?.studentUniId) {
    const isStudentUniIdExists = await prisma.student.findUnique({
      where: {
        studentUniId: studentData.studentUniId,
      },
    });

    if (isStudentUniIdExists) {
      throw new Error("A student with this University ID already exists.");
    }
  }

  const hashedPassword = await bcrypt.hash(password, 8);

  const otpKey = `student-registration-otp:${email}`;
  const otpValue = crypto.randomInt(100000, 1000000).toString();
  const expirationSeconds = 5 * 60;

  await redisClient.set(otpKey, otpValue, {
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

  await redisClient.set(
    studentRegistrationKey,
    JSON.stringify(redisUserDataPayload),
    {
      expiration: {
        type: "EX",
        value: expirationSeconds,
      },
    },
  );

  const tempatePath = path.join(
    process.cwd(),
    "src/app/templates/registration-user-otp.ejs",
  );

  const templateData = {
    name,
    email,
    otp: otpValue,
    expirationMinutes: expirationSeconds / 60,
  };

  const html = await ejs.renderFile(tempatePath, templateData);

  await transporter.sendMail({
    from: config.email_sender,
    to: email,
    subject: "Verify Your Email - DIU Smart Hall System",
    html,
  });
};

const verifyStudentEmail = async (payload: IVerifyEmailPayload) => {
  const otp = payload.otp;
  const email = payload.email.trim().toLowerCase();

  const isUserExists = await prisma.user.findUnique({
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
  const redisOtp = await redisClient.get(otpKey);

  if (!redisOtp) {
    throw new Error("Invalid or expired OTP. Please request a new one.");
  }

  if (redisOtp !== otp) {
    throw new Error("Incorrect OTP. Please check and try again.");
  }
  await redisClient.del(otpKey);

  const studentRegistrationKey = `student-registration-data: ${email}`;
  const redisStudentData = await redisClient.get(studentRegistrationKey);

  if (!redisStudentData) {
    throw new Error(
      "Registration session expired or data not found. Please register again.",
    );
  }

  const studentPayload: IRegisterStudentPayload = JSON.parse(redisStudentData);

  const createdUser = await prisma.user.create({
    data: {
      name: studentPayload.name,
      email: studentPayload.email,
      password: studentPayload.password,
      role: Role.STUDENT,
      status: UserStatus.ACTIVE,
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

  await redisClient.del(studentRegistrationKey);

  const tempatePath = path.join(
    process.cwd(),
    "src/app/templates/student-welcome-email.ejs",
  );

  const templateData = {
    name: createdUser.name,
  };

  const html = await ejs.renderFile(tempatePath, templateData);

  await transporter.sendMail({
    from: config.email_sender,
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

  const accessToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_access_secret,
    config.jwt_access_expires_in as SignOptions,
  );

  const refreshToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_refresh_secret,
    config.jwt_refresh_expires_in as SignOptions,
  );

  return {
    user,
    student,
    accessToken,
    refreshToken,
  };
};

const loginUser = async (payload: ILoginUserPayload) => {
  const { password } = payload;
  const email = payload.email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error("No account found with this email address.");
  }

  if (user.status === UserStatus.BLOCKED) {
    throw new Error("Your account has been blocked. Please contact support.");
  }

  if (user.isDeleted || user.status === UserStatus.DELETED) {
    throw new Error("Your account has been deleted.");
  }

  if (user.password === null && user.googleId !== null) {
    throw new Error(
      "This account was registered using Google. Please log in with Google.",
    );
  }

  const isPasswordMatched = await bcrypt.compare(
    password,
    user.password as string,
  );

  if (!isPasswordMatched) {
    throw new Error("Incorrect password. Please try again.");
  }

  const jwtPayload = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_access_secret,
    config.jwt_access_expires_in as SignOptions,
  );

  const refreshToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_refresh_secret,
    config.jwt_refresh_expires_in as SignOptions,
  );

  return {
    accessToken,
    refreshToken,
  };
};

const getMe = async (user: IRequestUser) => {
  const isUserExists = await prisma.user.findUnique({
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

const refreshToken = async (token: string) => {
  const verifiedRefreshToken = jwtUtils.verifyToken(
    token,
    config.jwt_refresh_secret,
  );

  if (!verifiedRefreshToken.success || !verifiedRefreshToken.data) {
    throw new Error(
      config.node_env === "development"
        ? verifiedRefreshToken.error
        : "Invalid refresh token",
    );
  }

  const data = verifiedRefreshToken.data as JwtPayload;

  const user = await prisma.user.findUnique({
    where: { id: data.userId },
  });

  if (!user || user.isDeleted || user.status !== UserStatus.ACTIVE) {
    throw new Error("User is inactive or not found");
  }

  const jwtPayload = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_access_secret,
    config.jwt_access_expires_in as SignOptions,
  );

  const refreshToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_refresh_secret,
    config.jwt_refresh_expires_in as SignOptions,
  );

  return {
    accessToken,
    refreshToken,
  };
};

const googleLogin = async (payload: IGoogleLoginPayload) => {
  let googleIdTokenPayload: TokenPayload | null | undefined = null;

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: payload.idToken,
      audience: config.google_client_id,
    });

    googleIdTokenPayload = ticket.getPayload();
  } catch (error) {
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
  const isStudentExistWithGoogleAuth = await prisma.user.findFirst({
    where: {
      email: googleIdTokenPayload.email,
      role: Role.STUDENT,
      googleId: googleIdTokenPayload.sub,
    },
  });

  let user = isStudentExistWithGoogleAuth;

  if (!isStudentExistWithGoogleAuth) {
    const isStudentExistWithCredentials = await prisma.user.findFirst({
      where: {
        email: googleIdTokenPayload.email,
        role: Role.STUDENT,
        authProvider: AuthProvider.CREDENTIAL,
      },
    });

    if (isStudentExistWithCredentials) {
      if (!isStudentExistWithCredentials.emailVerified) {
        throw new Error("Please verify your email address before logging in with Google.");
      }

      if (isStudentExistWithCredentials.status === UserStatus.BLOCKED) {
        throw new Error("Your account has been blocked. Please contact support.");
      }
      if (
        isStudentExistWithCredentials.isDeleted ||
        isStudentExistWithCredentials.status === UserStatus.DELETED
      ) {
        throw new Error("Your account has been deleted.");
      }

      user = await prisma.user.update({
        where: {
          id: isStudentExistWithCredentials.id,
        },
        data: {
          googleId: googleIdTokenPayload.sub,
        },
      });

      // Email Notification for Linking Google to Credential Account
      const templatePath = path.join(
        process.cwd(),
        "src/app/templates/google-link-notification.ejs",
      );

      const templateData = {
        name: user.name,
      };

      const html = await ejs.renderFile(templatePath, templateData);

      await transporter.sendMail({
        from: config.email_sender,
        to: user.email,
        subject: "Security Alert: Google Account Linked to Your Account",
        html,
      });
    } else {
      user = await prisma.user.create({
        data: {
          name: googleIdTokenPayload.name,
          email: googleIdTokenPayload.email,
          role: Role.STUDENT,
          googleId: googleIdTokenPayload.sub,
          authProvider: AuthProvider.GOOGLE,
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
      const templatePath = path.join(
        process.cwd(),
        "src/app/templates/student-welcome-email.ejs",
      );

      const templateData = {
        name: user.name,
      };
      const html = await ejs.renderFile(templatePath, templateData);

      await transporter.sendMail({
        from: config.email_sender,
        to: user.email,
        subject: "Welcome to DIU Smart Hall System",
        html,
      });
    }
  }

  if (!user) {
    throw new Error("User account not found.");
  }

  if (user.status === UserStatus.BLOCKED) {
    throw new Error("Your account has been blocked. Please contact support.");
  }
  if (user.isDeleted || user.status === UserStatus.DELETED) {
    throw new Error("Your account has been deleted.");
  }

  const jwtPayload = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_access_secret,
    config.jwt_access_expires_in as SignOptions,
  );

  const refreshToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_refresh_secret,
    config.jwt_refresh_expires_in as SignOptions,
  );

  return {
    accessToken,
    refreshToken,
  };
};

const forgotPassword = async (payload: IForgotPasswordPayload) => {
  const { email } = payload;

  const isUserExist = await prisma.user.findUnique({
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

  const otp = crypto.randomInt(100000, 1000000).toString();

  const key = `forgor-password-otp:${isUserExist.email}`;

  const expirationSeconds = 5 * 60;

  await redisClient.set(key, otp, {
    expiration: {
      type: "EX",
      value: expirationSeconds,
    },
  });

  const tempatePath = path.join(
    process.cwd(),
    "src/app/templates/forgot-password.ejs",
  );

  const templateData = {
    name: isUserExist.name,
    otp,
    expirationMinutes: expirationSeconds / 60,
  };

  const html = await ejs.renderFile(tempatePath, templateData);

  await transporter.sendMail({
    from: config.email_sender,
    to: isUserExist.email,
    subject: "Password Reset OTP - DIU Smart Hall System",
    html,
  });
};

const resetPassword = async (payload: IResetPasswordPayload) => {
  const { email, otp, newPassword } = payload;

  const isUserExist = await prisma.user.findUnique({
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

  const redisOtp = await redisClient.get(key);

  if (!redisOtp) {
    throw new Error("Invalid or expired OTP. Please request a new one.");
  }

  if (redisOtp !== otp) {
    throw new Error("Incorrect OTP. Please check and try again.");
  }

  const hashedNewPassword = await bcrypt.hash(
    newPassword,
    Number(config.bcrypt_salt_rounds),
  );

  await prisma.user.update({
    where: {
      email: isUserExist.email,
    },
    data: {
      password: hashedNewPassword,
    },
  });

  await redisClient.del([key]);

  const tempatePath = path.join(
    process.cwd(),
    "src/app/templates/reset-password-success.ejs",
  );

  const templateData = {
    name: isUserExist.name,
  };

  const html = await ejs.renderFile(tempatePath, templateData);
  await transporter.sendMail({
    from: config.email_sender,
    to: isUserExist.email,
    subject: "Password Reset Successful - DIU Smart Hall System",
    html,
  });
};

export const AuthService = {
  registerStudent,
  verifyStudentEmail,
  loginUser,
  getMe,
  refreshToken,
  googleLogin,
  forgotPassword,
  resetPassword,
};
