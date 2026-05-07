import path from "path";
import fs from "fs";
import { env } from "./env";

export const STORAGE_ROOT = env.STORAGE_ROOT;

export function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\-\.]/g, "_").trim() || "untitled";
}

export function getProjectDir(projectName: string): string {
  return path.join(STORAGE_ROOT, "projects", sanitizeName(projectName));
}

export function getMissionDir(projectName: string, missionName: string): string {
  return path.join(getProjectDir(projectName), sanitizeName(missionName));
}

export function getMissionSubDir(
  projectName: string,
  missionName: string,
  sub: string
): string {
  return path.join(getMissionDir(projectName, missionName), sub);
}

export function toRelativePath(absolutePath: string): string {
  return path.relative(STORAGE_ROOT, absolutePath).replace(/\\/g, "/");
}

export function toAbsolutePath(relativePath: string): string {
  return path.join(STORAGE_ROOT, relativePath);
}

export function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export const TEMP_DIR = path.join(STORAGE_ROOT, "temp");
