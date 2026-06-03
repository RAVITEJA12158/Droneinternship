import dotenv from "dotenv";
import path from "path";
dotenv.config();

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

const storageRoot = required("STORAGE_ROOT");
// ENV-02 fix: a relative STORAGE_ROOT silently resolves relative to process.cwd(),
// which breaks on restarts from different directories.
if (!path.isAbsolute(storageRoot)) {
  throw new Error(`STORAGE_ROOT must be an absolute path, got: "${storageRoot}"`);
}

export const env = {
  DATABASE_URL: required("DATABASE_URL"),
  JWT_SECRET: required("JWT_SECRET"),
  JWT_EXPIRY: process.env.JWT_EXPIRY || "7d",
  COOKIE_SECRET: required("COOKIE_SECRET"),
  STORAGE_ROOT: storageRoot,
  PYTHON_BIN: process.env.PYTHON_BIN || "python",
 DISEASE_MODEL_CHECKPOINT:
  process.env.DISEASE_MODEL_CHECKPOINT ||
  path.join(storageRoot, "models", "disease_model.pth"),
YIELD_MODEL_CHECKPOINT:
  process.env.YIELD_MODEL_CHECKPOINT ||
  path.join(storageRoot, "models", "yield_model.pth"),
  PORT: parseInt(process.env.PORT || "4000", 10),
  NODE_ENV: process.env.NODE_ENV || "development",
};
