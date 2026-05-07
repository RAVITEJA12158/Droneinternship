import fs from "fs";
import path from "path";
import { toRelativePath, toAbsolutePath } from "../config/storage";

export async function moveFile(tempPath: string, destPath: string): Promise<void> {
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  try {
    // BUG-15 fix: renameSync is O(1) atomic when temp and dest are on the same filesystem.
    // This avoids blocking the Node.js event loop for large files (e.g. 500MB TIFFs).
    fs.renameSync(tempPath, destPath);
  } catch {
    // Cross-device move (different filesystems) — fall back to async copy + unlink
    await fs.promises.copyFile(tempPath, destPath);
    await fs.promises.unlink(tempPath);
  }
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
