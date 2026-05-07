import prisma from "../prisma";
import { deleteFile } from "./storage.service";

export async function getOrthomosaic(id: string, userId: string) {
  const ortho = await prisma.orthomosaic.findFirst({
    where: { id, mission: { project: { userId } } },
  });
  if (!ortho) {
    const err = new Error("Orthomosaic not found") as Error & { statusCode: number };
    err.statusCode = 404;
    throw err;
  }
  return ortho;
}

export async function listOrthomosaics(missionId: string, userId: string) {
  const mission = await prisma.mission.findFirst({
    where: { id: missionId, project: { userId } },
  });
  if (!mission) {
    const err = new Error("Mission not found") as Error & { statusCode: number };
    err.statusCode = 404;
    throw err;
  }
  return prisma.orthomosaic.findMany({ where: { missionId }, orderBy: { createdAt: "desc" } });
}

export async function deleteOrthomosaic(id: string, userId: string) {
  const ortho = await getOrthomosaic(id, userId);
  deleteFile(ortho.relativePath);
  if (ortho.previewPath) deleteFile(ortho.previewPath);
  await prisma.orthomosaic.delete({ where: { id } });
}
