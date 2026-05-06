import dotenv from "dotenv";
dotenv.config();

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

export const env = {
  DATABASE_URL: required("DATABASE_URL"),
  JWT_SECRET: required("JWT_SECRET"),
  JWT_EXPIRY: process.env.JWT_EXPIRY || "7d",
  COOKIE_SECRET: required("COOKIE_SECRET"),
  STORAGE_ROOT: required("STORAGE_ROOT"),
  REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",
  PORT: parseInt(process.env.PORT || "4000", 10),
  NODE_ENV: process.env.NODE_ENV || "development",
};
