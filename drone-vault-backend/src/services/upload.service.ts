import path from "path";
import prisma from "../prisma";
import { computeMD5 } from "../lib/checksum";
import { moveFile, fileSize } from "./storage.service";
import { toRelativePath } from "../config/storage";
import { groupIntoCaptureSets } from "./captureSet.service";
import { generateThumbnail, generateMSThumbnail, generateOrthomosaicPreview } from "../lib/sharp";
import { env } from "../config/env";
import { FileType, MapType } from "@prisma/client";

interface UploadedFile {
  originalname: string;
  path: string;
  size: number;
}

async function generateThumbInline(fileId: string, relativePath: string, fileType: FileType) {
  try {
    const abs = toAbsPath(relativePath);
    const thumbRelative = path.join(
      path.dirname(relativePath).split("/").slice(0, 4).join("/"),
      "thumbnails",
      `${fileId}.jpg`
    );
    const thumbAbs = toAbsPath(thumbRelative);
    if (fileType === FileType.MS_TIF) {
      await generateMSThumbnail(abs, thumbAbs);
    } else {
      await generateThumbnail(abs, thumbAbs);
    }
    await prisma.file.update({ where: { id: fileId }, data: { thumbnailPath: thumbRelative } });
  } catch (err) {
    // Non-fatal — thumbnail failure should not break the upload response
    console.warn(`Thumbnail generation failed for ${fileId}:`, (err as Error).message);
  }
}

function toAbsPath(rel: string) {
  return path.join(env.STORAGE_ROOT, rel);
}

export async function processRgbUpload(
  missionId: string,
  projectId: string,
  files: UploadedFile[]
) {
  const destDir = path.join(env.STORAGE_ROOT, "projects", projectId, missionId, "raw", "rgb");
  const created = [];

  for (const file of files) {
    const destPath = path.join(destDir, file.originalname);
    moveFile(file.path, destPath);
    const checksum = await computeMD5(destPath);
    const size = fileSize(destPath);
    const relativePath = toRelativePath(destPath);

    const record = await prisma.file.create({
      data: { missionId, fileType: FileType.RGB_JPG, originalName: file.originalname, relativePath, size, checksum },
    });
    created.push(record);
    // Generate thumbnail inline (non-blocking — fire and forget)
    generateThumbInline(record.id, relativePath, FileType.RGB_JPG);
  }

  return { filesQueued: created.length };
}

export async function processMultispectralUpload(
  missionId: string,
  projectId: string,
  files: UploadedFile[]
) {
  const destDir = path.join(env.STORAGE_ROOT, "projects", projectId, missionId, "raw", "multispectral");
  const created = [];

  for (const file of files) {
    const destPath = path.join(destDir, file.originalname);
    moveFile(file.path, destPath);
    const checksum = await computeMD5(destPath);
    const size = fileSize(destPath);
    const relativePath = toRelativePath(destPath);

    const record = await prisma.file.create({
      data: { missionId, fileType: FileType.MS_TIF, originalName: file.originalname, relativePath, size, checksum },
    });
    created.push(record);
    generateThumbInline(record.id, relativePath, FileType.MS_TIF);
  }

  const captureSetsParsed = await groupIntoCaptureSets(missionId, created);
  return { filesQueued: created.length, captureSetsParsed };
}

export async function processPlanUpload(
  missionId: string,
  projectId: string,
  file: UploadedFile
) {
  const destDir = path.join(env.STORAGE_ROOT, "projects", projectId, missionId, "plan");
  const destPath = path.join(destDir, file.originalname);
  moveFile(file.path, destPath);
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
  const typeToEnum: Record<string, MapType> = {
    rgb: MapType.RGB,
    multispectral: MapType.MULTISPECTRAL,
    ndvi: MapType.NDVI,
    dsm: MapType.DSM,
  };

  const created = [];
  for (const [key, file] of Object.entries(fileMap)) {
    if (!file) continue;
    const destDir = path.join(env.STORAGE_ROOT, "projects", projectId, missionId, "orthomosaic", key);
    const destPath = path.join(destDir, file.originalname);
    moveFile(file.path, destPath);
    const relativePath = toRelativePath(destPath);

    const ortho = await prisma.orthomosaic.create({
      data: { missionId, type: typeToEnum[key], relativePath },
    });
    created.push(ortho);

    // Generate ortho preview inline (non-blocking)
    (async () => {
      try {
        const thumbRelative = path.join(
          path.dirname(relativePath).split("/").slice(0, 4).join("/"),
          "thumbnails",
          `ortho_${ortho.id}.jpg`
        );
        await generateOrthomosaicPreview(toAbsPath(relativePath), toAbsPath(thumbRelative));
        await prisma.orthomosaic.update({ where: { id: ortho.id }, data: { previewPath: thumbRelative } });
      } catch (err) {
        console.warn(`Ortho preview failed for ${ortho.id}:`, (err as Error).message);
      }
    })();
  }

  return { filesQueued: created.length };
}
