import prisma from "../prisma";
import { paginate, paginatedResponse } from "../lib/paginate";
import { CreateProjectInput, UpdateProjectInput } from "../validations/project.schema";
import { toAbsolutePath } from "../config/storage";
import fs from "fs";
import path from "path";
import { env } from "../config/env";

export async function listProjects(userId: string, page: number, limit: number) {
  const [data, total] = await Promise.all([
    prisma.project.findMany({
      where: { userId },
      include: { _count: { select: { missions: true } } },
      orderBy: { createdAt: "desc" },
      ...paginate(page, limit),
    }),
    prisma.project.count({ where: { userId } }),
  ]);
  return paginatedResponse(data, total, page, limit);
}

export async function createProject(userId: string, input: CreateProjectInput) {
  return prisma.project.create({
    data: { ...input, userId },
  });
}

export async function getProject(id: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: { id, userId },
    include: {
      _count: { select: { missions: true } },
      missions: {
        orderBy: { captureDate: "desc" },
        take: 5,
      },
    },
  });
  if (!project) {
    const err = new Error("Project not found") as Error & { statusCode: number };
    err.statusCode = 404;
    throw err;
  }
  return project;
}

export async function updateProject(id: string, userId: string, input: UpdateProjectInput) {
  await assertProjectOwner(id, userId);
  return prisma.project.update({ where: { id }, data: input });
}

export async function deleteProject(id: string, userId: string) {
  await assertProjectOwner(id, userId);
  // Delete disk storage
  const projectDir = path.join(env.STORAGE_ROOT, "projects", id);
  if (fs.existsSync(projectDir)) {
    fs.rmSync(projectDir, { recursive: true, force: true });
  }
  await prisma.project.delete({ where: { id } });
}

export async function assertProjectOwner(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({ where: { id: projectId, userId } });
  if (!project) {
    const err = new Error("Project not found") as Error & { statusCode: number };
    err.statusCode = 404;
    throw err;
  }
  return project;
}
