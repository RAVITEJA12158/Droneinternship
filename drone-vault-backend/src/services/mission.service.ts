import prisma from "../prisma";
import { paginate, paginatedResponse } from "../lib/paginate";
import { CreateMissionInput, UpdateMissionInput } from "../validations/mission.schema";
import { assertProjectOwner } from "./project.service";
import path from "path";
import fs from "fs";
import { env } from "../config/env";

export async function listMissions(projectId: string, userId: string, page: number, limit: number) {
  await assertProjectOwner(projectId, userId);
  const [data, total] = await Promise.all([
    prisma.mission.findMany({
      where: { projectId },
      include: {
        _count: { select: { files: true, captureSets: true, orthomosaics: true } },
      },
      orderBy: { captureDate: "desc" },
      ...paginate(page, limit),
    }),
    prisma.mission.count({ where: { projectId } }),
  ]);
  return paginatedResponse(data, total, page, limit);
}

export async function createMission(
  projectId: string,
  userId: string,
  input: CreateMissionInput
) {
  await assertProjectOwner(projectId, userId);
  const mission = await prisma.mission.create({
    data: {
      projectId,
      name: input.name,
      captureDate: new Date(input.captureDate),
      notes: input.notes,
    },
  });
  // Create storage dirs
  const dirs = [
    "plan", "raw/rgb", "raw/multispectral",
    "orthomosaic/rgb", "orthomosaic/multispectral", "orthomosaic/ndvi", "orthomosaic/dsm",
    "thumbnails", "metadata", "exports",
  ];
  for (const d of dirs) {
    fs.mkdirSync(
      path.join(env.STORAGE_ROOT, "projects", projectId, mission.id, d),
      { recursive: true }
    );
  }
  return mission;
}

export async function getMission(id: string, userId: string) {
  const mission = await prisma.mission.findFirst({
    where: { id, project: { userId } },
    include: {
      project: { select: { id: true, name: true } },
      _count: { select: { files: true, captureSets: true, orthomosaics: true } },
    },
  });
  if (!mission) {
    const err = new Error("Mission not found") as Error & { statusCode: number };
    err.statusCode = 404;
    throw err;
  }
  return mission;
}

export async function updateMission(id: string, userId: string, input: UpdateMissionInput) {
  await assertMissionOwner(id, userId);
  return prisma.mission.update({
    where: { id },
    data: {
      ...input,
      captureDate: input.captureDate ? new Date(input.captureDate) : undefined,
    },
  });
}

export async function deleteMission(id: string, userId: string) {
  const mission = await assertMissionOwner(id, userId);
  const missionDir = path.join(env.STORAGE_ROOT, "projects", mission.projectId, id);
  if (fs.existsSync(missionDir)) {
    fs.rmSync(missionDir, { recursive: true, force: true });
  }
  await prisma.mission.delete({ where: { id } });
}

export async function assertMissionOwner(missionId: string, userId: string) {
  const mission = await prisma.mission.findFirst({
    where: { id: missionId, project: { userId } },
  });
  if (!mission) {
    const err = new Error("Mission not found") as Error & { statusCode: number };
    err.statusCode = 404;
    throw err;
  }
  return mission;
}
