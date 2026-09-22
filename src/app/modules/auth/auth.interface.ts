import type { Role } from "../../../generated/prisma/enums";

export interface ILoginUserPayload {
  email: string;
  password: string;
}

export interface IRegisterStudentPayload {
  name: string;
  email: string;
  password: string;
  student: {
    studentUniId?: string;
	department?: string;
    contactNumber?: string;
  };
}

export interface IRequestUser {
  userId: string;
  email: string;
  name: string;
  role: Role;
}

export interface IGoogleLoginPayload {
  idToken: string;
}
