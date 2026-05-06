import prisma from "../prisma";
import path from "path";
import fs from "fs";
import archiver from "archiver";
import { toAbsolutePath } from "../config/storage";
import { env } from "../config/env";

export async function exportJson(missionId: string, userId: string) {
  const where = userId
    ? { id: missionId, project: { userId } }
    : { id: missionId };
  const mission = await prisma.mission.findFirst({
    where,
    include: {
      project: true,
      captureSets: { include: { _count: { select: { files: true } } } },
      orthomosaics: true,
      _count: { select: { files: true } },
    },
  });
  if (!mission) {
    const err = new Error("Mission not found") as Error & { statusCode: number };
    err.statusCode = 404;
    throw err;
  }
  const fileAgg = await prisma.file.aggregate({
    where: { missionId },
    _sum: { size: true },
    _count: true,
  });
  return {
    project: mission.project,
    mission: {
      id: mission.id,
      name: mission.name,
      captureDate: mission.captureDate,
      notes: mission.notes,
    },
    fileCount: fileAgg._count,
    storageUsed: fileAgg._sum.size ?? 0n,
    captureSets: mission.captureSets,
    orthomosaics: mission.orthomosaics,
  };
}

export async function createZipExport(missionId: string, projectId: string): Promise<string> {
  const exportDir = path.join(env.STORAGE_ROOT, "projects", projectId, missionId, "exports");
  fs.mkdirSync(exportDir, { recursive: true });
  const outPath = path.join(exportDir, `mission_${missionId}_${Date.now()}.zip`);

  const files = await prisma.file.findMany({ where: { missionId } });

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outPath);
    const archive = archiver("zip", { zlib: { level: 6 } });
    output.on("close", () => resolve(outPath));
    archive.on("error", reject);
    archive.pipe(output);

    for (const file of files) {
      const abs = toAbsolutePath(file.relativePath);
      if (fs.existsSync(abs)) {
        archive.file(abs, { name: path.basename(file.relativePath) });
      }
    }
    archive.finalize();
  });
}
