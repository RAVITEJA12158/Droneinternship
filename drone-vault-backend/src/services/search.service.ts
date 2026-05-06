import prisma from "../prisma";
import { paginate } from "../lib/paginate";

export async function search(
  userId: string,
  q: string,
  type: string | undefined,
  from: string | undefined,
  to: string | undefined,
  page: number,
  limit: number
) {
  const results: Record<string, unknown> = {};
  const fromDate = from ? new Date(from) : undefined;
  const toDate = to ? new Date(to) : undefined;

  if (!type || type === "project") {
    results.projects = await prisma.project.findMany({
      where: {
        userId,
        name: { contains: q, mode: "insensitive" },
        ...(fromDate && { createdAt: { gte: fromDate } }),
        ...(toDate && { createdAt: { lte: toDate } }),
      },
      ...paginate(page, limit),
    });
  }

  if (!type || type === "mission") {
    results.missions = await prisma.mission.findMany({
      where: {
        project: { userId },
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { notes: { contains: q, mode: "insensitive" } },
        ],
        ...(fromDate && { captureDate: { gte: fromDate } }),
        ...(toDate && { captureDate: { lte: toDate } }),
      },
      include: { project: { select: { id: true, name: true } } },
      ...paginate(page, limit),
    });
  }

  if (!type || type === "file") {
    results.files = await prisma.file.findMany({
      where: {
        mission: { project: { userId } },
        originalName: { contains: q, mode: "insensitive" },
        ...(fromDate && { uploadedAt: { gte: fromDate } }),
        ...(toDate && { uploadedAt: { lte: toDate } }),
      },
      ...paginate(page, limit),
    });
  }

  return results;
}
