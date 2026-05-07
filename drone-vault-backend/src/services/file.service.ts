import prisma from "../prisma";
import { paginate, paginatedResponse } from "../lib/paginate";
import { deleteFile } from "./storage.service";
import { FileType } from "@prisma/client";

function serializeFile<T extends { size: bigint }>(file: T): Omit<T, "size"> & { size: number } {
  return {
    ...file,
    size: Number(file.size),
  };
}

export async function listFiles(
  missionId: string,
  userId: string,
  page: number,
  limit: number,
  fileType?: FileType
) {
  const mission = await prisma.mission.findFirst({
    where: { id: missionId, project: { userId } },
  });
  if (!mission) {
    const err = new Error("Mission not found") as Error & { statusCode: number };
    err.statusCode = 404;
    throw err;
  }
  const where = { missionId, ...(fileType ? { fileType } : {}) };
  const [data, total] = await Promise.all([
    prisma.file.findMany({ where, orderBy: { uploadedAt: "desc" }, ...paginate(page, limit) }),
    prisma.file.count({ where }),
  ]);
  return paginatedResponse(data.map(serializeFile), total, page, limit);
}

export async function getFile(id: string, userId: string) {
  const file = await prisma.file.findFirst({
    where: { id, mission: { project: { userId } } },
  });
  if (!file) {
    const err = new Error("File not found") as Error & { statusCode: number };
    err.statusCode = 404;
    throw err;
  }
  return serializeFile(file);
}

export async function deleteFileById(id: string, userId: string) {
  const file = await getFile(id, userId);
  deleteFile(file.relativePath);
  if (file.thumbnailPath) deleteFile(file.thumbnailPath);
  await prisma.file.delete({ where: { id } });
}
