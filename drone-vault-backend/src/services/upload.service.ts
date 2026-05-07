import path from "path";
import prisma from "../prisma";
import { computeMD5 } from "../lib/checksum";
import { moveFile, fileSize } from "./storage.service";
import { toRelativePath, sanitizeName } from "../config/storage";
import { groupIntoCaptureSets } from "./captureSet.service";
import { env } from "../config/env";
import { FileType, MapType } from "@prisma/client";
import { thumbnailQueue } from "../jobs/queues";

interface UploadedFile {
  originalname: string;
  path: string;
  size: number;
}

function toAbsPath(rel: string) {
  return path.join(env.STORAGE_ROOT, rel);
}

export async function processRgbUpload(
  missionId: string,
  projectId: string,
  files: UploadedFile[]
) {
  const mission = await prisma.mission.findUnique({ where: { id: missionId }, include: { project: true }});
  if (!mission) throw new Error("Mission not found");
  
  const destDir = path.join(env.STORAGE_ROOT, "projects", sanitizeName(mission.project.name), sanitizeName(mission.name), "raw", "rgb");
  const created = [];

  for (const file of files) {
    const destPath = path.join(destDir, file.originalname);
    await moveFile(file.path, destPath);
    const checksum = await computeMD5(destPath);
    const size = fileSize(destPath);
    const relativePath = toRelativePath(destPath);

    const record = await prisma.file.create({
      data: { missionId, fileType: FileType.RGB_JPG, originalName: file.originalname, relativePath, size, checksum },
    });
    created.push(record);
    // Remove redundant inline generation
    // Thumbnail generation is handled by thumbnail.worker.ts via queues.ts (or you can add to queue here if it wasn't) 
    thumbnailQueue.add("rgbThumbnail", { fileId: record.id, relativePath, fileType: FileType.RGB_JPG });
  }

  return { filesQueued: created.length };
}

export async function processMultispectralUpload(
  missionId: string,
  projectId: string,
  files: UploadedFile[]
) {
  const mission = await prisma.mission.findUnique({ where: { id: missionId }, include: { project: true }});
  if (!mission) throw new Error("Mission not found");
  
  const destDir = path.join(env.STORAGE_ROOT, "projects", sanitizeName(mission.project.name), sanitizeName(mission.name), "raw", "multispectral");
  const created = [];

  for (const file of files) {
    const destPath = path.join(destDir, file.originalname);
    await moveFile(file.path, destPath);
    const checksum = await computeMD5(destPath);
    const size = fileSize(destPath);
    const relativePath = toRelativePath(destPath);

    const record = await prisma.file.create({
      data: { missionId, fileType: FileType.MS_TIF, originalName: file.originalname, relativePath, size, checksum },
    });
    created.push(record);
    thumbnailQueue.add("msThumbnail", { fileId: record.id, relativePath, fileType: FileType.MS_TIF });
  }

  const captureSetsParsed = await groupIntoCaptureSets(missionId, created);
  return { filesQueued: created.length, captureSetsParsed };
}

export async function processPlanUpload(
  missionId: string,
  projectId: string,
  file: UploadedFile
) {
  const mission = await prisma.mission.findUnique({ where: { id: missionId }, include: { project: true }});
  if (!mission) throw new Error("Mission not found");

  const destDir = path.join(env.STORAGE_ROOT, "projects", sanitizeName(mission.project.name), sanitizeName(mission.name), "plan");
  const destPath = path.join(destDir, file.originalname);
  await moveFile(file.path, destPath);
  const checksum = await computeMD5(destPath);
  const size = fileSize(destPath);
  const relativePath = toRelativePath(destPath);

  const record = await prisma.file.create({
    data: { missionId, fileType: FileType.MISSION_PLAN, originalName: file.originalname, relativePath, size, checksum },
  });
  return { filesQueued: 1, fileId: record.id };
}

export async function processOrthomosaicUpload(
  missionId: string,
  projectId: string,
  fileMap: Partial<Record<"rgb" | "multispectral" | "ndvi" | "dsm", UploadedFile>>
) {
  const mission = await prisma.mission.findUnique({ where: { id: missionId }, include: { project: true }});
  if (!mission) throw new Error("Mission not found");

  const typeToEnum: Record<string, MapType> = {
    rgb: MapType.RGB,
    multispectral: MapType.MULTISPECTRAL,
    ndvi: MapType.NDVI,
    dsm: MapType.DSM,
  };

  const created = [];
  for (const [key, file] of Object.entries(fileMap)) {
    if (!file) continue;
    const destDir = path.join(env.STORAGE_ROOT, "projects", sanitizeName(mission.project.name), sanitizeName(mission.name), "orthomosaic", key);
    const destPath = path.join(destDir, file.originalname);
    await moveFile(file.path, destPath);
    const relativePath = toRelativePath(destPath);

    const ortho = await prisma.orthomosaic.create({
      data: { missionId, type: typeToEnum[key], relativePath },
    });
    created.push(ortho);

    // Queue orthomosaic generation
    thumbnailQueue.add("orthoThumbnail", { orthoId: ortho.id, relativePath, fileType: "ORTHO" });
  }

  return { filesQueued: created.length };
}
