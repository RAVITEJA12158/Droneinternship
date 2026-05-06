import { env } from "./env";

export const JWT_SECRET = env.JWT_SECRET;
export const JWT_EXPIRY = env.JWT_EXPIRY;
export const COOKIE_NAME = "token";
export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};
