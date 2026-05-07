import prisma from "../prisma";
import path from "path";
import fs from "fs";
import archiver from "archiver";
import { toAbsolutePath, sanitizeName } from "../config/storage";
import { env } from "../config/env";

function missionExportDir(projectName: string, missionName: string) {
  return path.join(env.STORAGE_ROOT, "projects", sanitizeName(projectName), sanitizeName(missionName), "exports");
}

function missionStoragePrefix(projectName: string, missionName: string) {
  return path.join("projects", sanitizeName(projectName), sanitizeName(missionName)).replace(/\\/g, "/");
}

function toMissionZipName(relativePath: string, projectName: string, missionName: string) {
  const normalized = relativePath.replace(/\\/g, "/");
  const prefix = `${missionStoragePrefix(projectName, missionName)}/`;
  return normalized.startsWith(prefix) ? normalized.slice(prefix.length) : path.basename(normalized);
}

export async function buildExportManifest(missionId: string, userId: string) {
  const where = userId
    ? { id: missionId, project: { userId } }
    : { id: missionId };

  const mission = await prisma.mission.findFirst({
    where,
    include: {
      project: true,
      files: {
        select: {
          id: true,
          fileType: true,
          originalName: true,
          relativePath: true,
          size: true,
          checksum: true,
          uploadedAt: true,
          captureSetId: true,
        },
        orderBy: { uploadedAt: "asc" },
      },
      captureSets: {
        include: {
          _count: { select: { files: true } },
          files: { select: { id: true, fileType: true, originalName: true } },
        },
        orderBy: { shotNumber: "asc" },
      },
      orthomosaics: true,
      _count: { select: { files: true } },
    },
  });

  if (!mission) {
    const err = new Error("Mission not found") as Error & { statusCode: number };
    err.statusCode = 404;
    throw err;
  }

  const storageUsed = mission.files.reduce((total, file) => total + Number(file.size), 0);

  return {
    project: mission.project,
    mission: {
      id: mission.id,
      name: mission.name,
      captureDate: mission.captureDate,
      notes: mission.notes,
    },
    fileCount: mission._count.files,
    storageUsed,
    files: mission.files.map((file) => ({ ...file, size: Number(file.size) })),
    captureSets: mission.captureSets,
    orthomosaics: mission.orthomosaics,
  };
}

export async function createJsonExport(missionId: string, userId: string): Promise<string> {
  const manifest = await buildExportManifest(missionId, userId);
  const exportDir = missionExportDir(manifest.project.name, manifest.mission.name);
  fs.mkdirSync(exportDir, { recursive: true });

  const outPath = path.join(exportDir, `mission_${missionId}_${Date.now()}.json`);
  await fs.promises.writeFile(outPath, JSON.stringify(manifest, null, 2));
  return outPath;
}

export async function createZipExport(missionId: string): Promise<string> {
  const mission = await prisma.mission.findUnique({
    where: { id: missionId },
    include: { project: true, orthomosaics: true },
  });
  if (!mission) throw new Error("Mission not found for export");

  const exportDir = missionExportDir(mission.project.name, mission.name);
  fs.mkdirSync(exportDir, { recursive: true });
  const outPath = path.join(exportDir, `mission_${missionId}_${Date.now()}.zip`);

  const files = await prisma.file.findMany({ where: { missionId } });
  const manifest = await buildExportManifest(missionId, "");

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outPath);
    const archive = archiver("zip", { zlib: { level: 6 } });
    output.on("close", () => resolve(outPath));
    archive.on("error", reject);
    archive.pipe(output);

    for (const file of files) {
      const abs = toAbsolutePath(file.relativePath);
      if (fs.existsSync(abs)) {
        archive.file(abs, { name: toMissionZipName(file.relativePath, mission.project.name, mission.name) });
      }
    }

    for (const ortho of mission.orthomosaics) {
      const abs = toAbsolutePath(ortho.relativePath);
      if (fs.existsSync(abs)) {
        archive.file(abs, { name: toMissionZipName(ortho.relativePath, mission.project.name, mission.name) });
      }
    }

    archive.append(JSON.stringify(manifest, null, 2), { name: "manifest.json" });
    archive.finalize();
  });
}
