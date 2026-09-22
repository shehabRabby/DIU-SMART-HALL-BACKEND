import z from "zod";

const StudentRegistrationZodSchema = z.object({
  name: z
    .string()
    .min(1, { message: "Name is required!" })
    .min(3, { message: "Name must be at least 3 characters long!" })
    .max(30, { message: "Name cannot exceed 30 characters!" }),

  email: z
    .string()
    .min(1, { message: "Email is required!" })
    .email({ message: "Please provide a valid email address!" }),

  password: z
    .string()
    .min(1, { message: "Password is required!" })
    .min(8, { message: "Password must be at least 8 characters long!" })
    .refine((val) => /[A-Z]/.test(val), {
      message: "Password must contain at least one uppercase letter!",
    })
    .refine((val) => /[a-z]/.test(val), {
      message: "Password must contain at least one lowercase letter!",
    })
    .refine((val) => /\d/.test(val), {
      message: "Password must contain at least one number!",
    })
    .refine((val) => /[@$!%*?&]/.test(val), {
      message:
        "Password must contain at least one special character (@$!%*?&)!",
    }),

  student: z.object({
    studentUniId: z
      .string()
      .min(1, { message: "Student University ID is required!" })
      .min(8, { message: "Student ID must be at least 8 characters long!" })
      .max(20, { message: "Student ID cannot exceed 20 characters!" }),

    department: z
      .string()
      .min(1, { message: "Department is required!" })
      .min(2, {
        message: "Department name must be at least 2 characters long!",
      }),

    contactNumber: z.string().optional(),
  }),
});

const LoginZodSchema = z.object({
  email: z
    .string()
    .min(1, { message: "Email is required!" })
    .email({ message: "Please provide a valid email address!" }),

  password: z
    .string()
    .min(1, { message: "Password is required!" })
    .min(8, { message: "Password must be at least 8 characters long!" })
    .refine((val) => /[A-Z]/.test(val), {
      message: "Password must contain at least one uppercase letter!",
    })
    .refine((val) => /[a-z]/.test(val), {
      message: "Password must contain at least one lowercase letter!",
    })
    .refine((val) => /\d/.test(val), {
      message: "Password must contain at least one number!",
    })
    .refine((val) => /[@$!%*?&]/.test(val), {
      message:
        "Password must contain at least one special character (@$!%*?&)!",
    }),
});

export const UserValidation = {
  StudentRegistrationZodSchema,
  LoginZodSchema
};
