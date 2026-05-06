import path from "path";
import fs from "fs";
import { env } from "./env";

export const STORAGE_ROOT = env.STORAGE_ROOT;

export function getProjectDir(projectId: string): string {
  return path.join(STORAGE_ROOT, "projects", projectId);
}

export function getMissionDir(projectId: string, missionId: string): string {
  return path.join(getProjectDir(projectId), missionId);
}

export function getMissionSubDir(
  projectId: string,
  missionId: string,
  sub: string
): string {
  return path.join(getMissionDir(projectId, missionId), sub);
}

export function toRelativePath(absolutePath: string): string {
  return path.relative(STORAGE_ROOT, absolutePath);
}

export function toAbsolutePath(relativePath: string): string {
  return path.join(STORAGE_ROOT, relativePath);
}

export function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

export const TEMP_DIR = path.join(STORAGE_ROOT, "temp");
