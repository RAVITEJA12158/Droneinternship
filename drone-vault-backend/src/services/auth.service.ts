import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../prisma";
import { JWT_SECRET, JWT_EXPIRY } from "../config/jwt";
import { RegisterInput, LoginInput } from "../validations/auth.schema";

export async function registerUser(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    const err = new Error("Email already registered") as Error & { statusCode: number };
    err.statusCode = 409;
    throw err;
  }
  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await prisma.user.create({
    data: { name: input.name, email: input.email, passwordHash },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  const token = signToken(user.id, user.role);
  return { user, token };
}

export async function loginUser(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    const err = new Error("Invalid credentials") as Error & { statusCode: number };
    err.statusCode = 401;
    throw err;
  }
  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    const err = new Error("Invalid credentials") as Error & { statusCode: number };
    err.statusCode = 401;
    throw err;
  }
  const token = signToken(user.id, user.role);
  const { passwordHash: _, ...safeUser } = user;
  return { user: safeUser, token };
}

export async function getUserById(id: string) {
  return prisma.user.findUniqueOrThrow({
    where: { id },
    select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true },
  });
}

function signToken(userId: string, role: string): string {
  return jwt.sign({ sub: userId, role }, JWT_SECRET, { expiresIn: JWT_EXPIRY } as jwt.SignOptions);
}
