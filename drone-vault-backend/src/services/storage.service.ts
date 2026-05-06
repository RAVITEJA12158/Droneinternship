import fs from "fs";
import path from "path";
import { toRelativePath, toAbsolutePath } from "../config/storage";

export function moveFile(tempPath: string, destPath: string): void {
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.copyFileSync(tempPath, destPath);
  fs.unlinkSync(tempPath);
}

export function deleteFile(relativePath: string): void {
  const abs = toAbsolutePath(relativePath);
  if (fs.existsSync(abs)) {
    fs.unlinkSync(abs);
  }
}

export function fileSize(filePath: string): bigint {
  const stat = fs.statSync(filePath);
  return BigInt(stat.size);
}

export function streamFile(relativePath: string): fs.ReadStream {
  const abs = toAbsolutePath(relativePath);
  return fs.createReadStream(abs);
}

export function fileExists(relativePath: string): boolean {
  return fs.existsSync(toAbsolutePath(relativePath));
}
