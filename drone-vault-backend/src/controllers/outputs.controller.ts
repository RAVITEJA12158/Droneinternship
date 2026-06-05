import { Request, Response, NextFunction } from "express";
import prisma from "../prisma";
import fs from "fs";
import path from "path";
import { getMissionDir, getMissionSubDir, toAbsolutePath, toRelativePath } from "../config/storage";

async function assertMissionAccess(missionId: string, userId: string) {
  const mission = await prisma.mission.findFirst({
    where: { id: missionId, project: { userId } },
    include: { project: true },
  });
  if (!mission) {
    const err = new Error("Mission not found") as Error & { statusCode: number };
    err.statusCode = 404;
    throw err;
  }
  return mission;
}

export async function listOutputs(req: Request, res: Response, next: NextFunction) {
  try {
    const mission = await assertMissionAccess(req.params.id, req.user!.id);
    const subdir = typeof req.query.subdir === "string" && req.query.subdir.trim() ? String(req.query.subdir) : undefined;
    const baseDir = subdir
      ? getMissionSubDir(mission.project.name, mission.name, subdir)
      : getMissionDir(mission.project.name, mission.name);

    if (!fs.existsSync(baseDir)) {
      res.json([]);
      return;
    }

    function walk(dir: string): Array<Record<string, any>> {
      const out: Array<Record<string, any>> = [];
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          out.push(...walk(full));
          continue;
        }
        if (!entry.isFile()) continue;
        const stat = fs.statSync(full);
        const rel = toRelativePath(full).replace(/\\/g, "/");
        out.push({
          id: `disk:${rel}`,
          missionId: mission.id,
          fileType: "OTHER",
          originalName: entry.name,
          relativePath: rel,
          thumbnailPath: null,
          size: Number(stat.size),
          checksum: null,
          uploadedAt: stat.mtime.toISOString(),
          downloadUrl: `/api/missions/${mission.id}/outputs/download?path=${encodeURIComponent(rel)}`,
        });
      }
      return out;
    }

    const files = walk(baseDir);
    res.json(files);
  } catch (err) {
    next(err);
  }
}

export async function downloadOutput(req: Request, res: Response, next: NextFunction) {
  try {
    const mission = await assertMissionAccess(req.params.id, req.user!.id);
    const relPath = req.query.path as string | undefined;
    if (!relPath) {
      res.status(400).json({ message: "Missing path parameter" });
      return;
    }

    const abs = toAbsolutePath(relPath);
    const baseResolved = path.resolve(getMissionDir(mission.project.name, mission.name));
    const absResolved = path.resolve(abs);
    if (!absResolved.startsWith(baseResolved)) {
      res.status(403).json({ message: "Access denied" });
      return;
    }
    if (!fs.existsSync(absResolved)) {
      res.status(404).json({ message: "File not found" });
      return;
    }

    const ext = path.extname(absResolved).toLowerCase();
    let mimeType = "application/octet-stream";
    if (ext === ".jpg" || ext === ".jpeg") mimeType = "image/jpeg";
    if (ext === ".png") mimeType = "image/png";
    if (ext === ".webp") mimeType = "image/webp";
    if (ext === ".tif" || ext === ".tiff") mimeType = "image/tiff";
    res.setHeader("Content-Type", mimeType);

    const inline = req.query.inline === "true";
    const filename = path.basename(absResolved);
    res.setHeader("Content-Disposition", `${inline ? "inline" : "attachment"}; filename="${filename}"`);
    fs.createReadStream(absResolved).pipe(res);
  } catch (err) {
    next(err);
  }
}
