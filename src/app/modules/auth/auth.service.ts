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
  IGoogleLoginPayload,
  ILoginUserPayload,
  IRegisterStudentPayload,
  IRequestUser,
} from "./auth.interface";
import { OAuth2Client, type TokenPayload } from "google-auth-library";
import { googleClient } from "../../lib/googleAuth";

const registerStudent = async (payload: IRegisterStudentPayload) => {
  const { name, password, student: studentData } = payload;

  const email = payload.email.trim().toLowerCase();

  const isUserExists = await prisma.user.findUnique({
    where: { email },
  });

  if (isUserExists) {
    throw new Error("User with this email already exists");
  }

  if (studentData?.studentUniId) {
    const isStudentUniIdExists = await prisma.student.findUnique({
      where: {
        studentUniId: studentData.studentUniId,
      },
    });

    if (isStudentUniIdExists) {
      throw new Error("Student with this University ID already exists");
    }
  }

  const hashedPassword = await bcrypt.hash(password, 8);

const createdUser = await prisma.user.create({
    data: {
      ...payload,
      password: hashedPassword,
      role: Role.STUDENT,
      status: UserStatus.ACTIVE,
      emailVerified: false,
      student: {
        create: {
          name,
          email,
          contactNumber: studentData?.contactNumber || "",
          studentUniId: studentData?.studentUniId || "",
          department: studentData?.department || "",
        },
      },
    },
    include: { student: true },
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
    throw new Error("User not found");
  }

  if (user.status === UserStatus.BLOCKED) {
    throw new Error("User is blocked");
  }

  if (user.isDeleted || user.status === UserStatus.DELETED) {
    throw new Error("User is deleted");
  }

  if (user.password === null && user.googleId !== null) {
    throw new Error(
      "User Already Has Account Register With Google try to login with google",
    );
  }

  const isPasswordMatched = await bcrypt.compare(
    password,
    user.password as string,
  );

  if (!isPasswordMatched) {
    throw new Error("Invalid credentials");
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
    throw new Error("User not found");
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
    throw new Error("Invalid or Expired Google Id Token");
  }

  if (!googleIdTokenPayload) {
    throw new Error("Invalid or Expired Google Id Token");
  }
  if (!googleIdTokenPayload.email) {
    throw new Error("Google Email Not Found");
  }
  if (!googleIdTokenPayload.name) {
    throw new Error("User Name Not Found");
  }

  const isStudentExistWithGoogleAuth = await prisma.user.findUnique({
    where: {
      email: googleIdTokenPayload.email,
      role: Role.STUDENT,
      googleId: googleIdTokenPayload.sub,
    },
  });

  let user = isStudentExistWithGoogleAuth;

  if (!isStudentExistWithGoogleAuth) {
    const isStudentExistWithCredentials = await prisma.user.findUnique({
      where: {
        email: googleIdTokenPayload.email,
        role: Role.STUDENT,
        authProvider: AuthProvider.CREDENTIAL,
      },
    });

    if (isStudentExistWithCredentials) {
      if (!isStudentExistWithCredentials.emailVerified) {
        throw new Error("Email Not Verified");
      }

      if (isStudentExistWithCredentials.status === UserStatus.BLOCKED) {
        throw new Error("User Is Blocked");
      }
      if (
        isStudentExistWithCredentials.isDeleted ||
        isStudentExistWithCredentials.status === UserStatus.DELETED
      ) {
        throw new Error("User Is Deleted");
      }

      user = await prisma.user.update({
        where: {
          id: isStudentExistWithCredentials.id,
        },
        data: {
          googleId: googleIdTokenPayload.sub,
        },
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
    }
  }

  if (!user) {
    throw new Error("User Not Found");
  }

  if (user.status === UserStatus.BLOCKED) {
    throw new Error("User Is Blocked");
  }
  if (user.isDeleted || user.status === UserStatus.DELETED) {
    throw new Error("User Is Deleted");
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

export const AuthService = {
  registerStudent,
  loginUser,
  getMe,
  refreshToken,
  googleLogin,
};
