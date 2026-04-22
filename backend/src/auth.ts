import bcrypt from "bcrypt";
import { z } from "zod";
import prisma from "./db.ts";

/**
 * Custom error for app-specific errors with i18n support
 */
export class AppError extends Error {
  constructor(
    public errorKey: string,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function registerUser(data: unknown) {
  const parsed = RegisterSchema.parse(data);

  const existingUser = await prisma.user.findUnique({
    where: { email: parsed.email },
  });

  if (existingUser) {
    throw new AppError("errors.auth.user_exists", "User already exists");
  }

  const hashedPassword = await bcrypt.hash(parsed.password, 10);

  const user = await prisma.user.create({
    data: {
      email: parsed.email,
      password: hashedPassword,
    },
  });

  return user;
}

export async function loginUser(data: unknown) {
  const parsed = LoginSchema.parse(data);

  const user = await prisma.user.findUnique({
    where: { email: parsed.email },
  });

  if (!user) {
    throw new AppError(
      "errors.auth.invalid_credentials",
      "Invalid credentials",
    );
  }

  const isPasswordValid = await bcrypt.compare(parsed.password, user.password);
  if (!isPasswordValid) {
    throw new AppError(
      "errors.auth.invalid_credentials",
      "Invalid credentials",
    );
  }

  return user;
}
