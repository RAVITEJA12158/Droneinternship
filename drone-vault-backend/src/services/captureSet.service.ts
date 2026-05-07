import prisma from "../prisma";
import { paginate, paginatedResponse } from "../lib/paginate";

interface RawFile {
  id: string;
  originalName: string;
  relativePath: string;
  size: bigint;
}

export function extractShotNumber(filename: string): number | null {
  // Patterns: IMG_0204_1.tif → 204, DJI_0123.tif → 123, capture_204_B.tif → 204
  const match = filename.match(/[_-]0*(\d{3,6})[_-]/);
  if (match) return parseInt(match[1], 10);
  const simple = filename.match(/(\d{3,6})/);
  if (simple) return parseInt(simple[1], 10);
  return null;
}

export async function groupIntoCaptureSets(
  missionId: string,
  files: RawFile[]
): Promise<number> {
  const groups = new Map<number, RawFile[]>();

  for (const file of files) {
    const shot = extractShotNumber(file.originalName);
    if (shot === null) continue;
    if (!groups.has(shot)) groups.set(shot, []);
    groups.get(shot)!.push(file);
  }

  let created = 0;
  for (const [shotNumber, groupFiles] of groups) {
    // BUG-12 fix: use upsert to avoid creating duplicate CaptureSets when
    // re-uploading files or adding additional bands to an existing mission.
    const existing = await prisma.captureSet.findFirst({
      where: { missionId, shotNumber },
    });
    const captureSet = existing ?? await prisma.captureSet.create({
      data: { missionId, shotNumber },
    });
    await prisma.file.updateMany({
      where: { id: { in: groupFiles.map((f) => f.id) } },
      data: { captureSetId: captureSet.id },
    });
    created++;
  }
  return created;
}

export async function listCaptureSets(missionId: string, userId: string, page: number, limit: number) {
  // Verify access via mission→project→user
  const mission = await prisma.mission.findFirst({
    where: { id: missionId, project: { userId } },
  });
  if (!mission) {
    const err = new Error("Mission not found") as Error & { statusCode: number };
    err.statusCode = 404;
    throw err;
  }

  const [data, total] = await Promise.all([
    prisma.captureSet.findMany({
      where: { missionId },
      include: {
        _count: { select: { files: true } },
        files: {
          select: { id: true, fileType: true, originalName: true, thumbnailPath: true },
          take: 5,
        },
      },
      orderBy: { shotNumber: "asc" },
      ...paginate(page, limit),
    }),
    prisma.captureSet.count({ where: { missionId } }),
  ]);

  return paginatedResponse(data, total, page, limit);
}

export async function getCaptureSet(id: string, userId: string) {
  const cs = await prisma.captureSet.findFirst({
    where: { id, mission: { project: { userId } } },
    include: {
      files: true,
      mission: { select: { id: true, name: true, projectId: true } },
    },
  });
  if (!cs) {
    const err = new Error("Capture set not found") as Error & { statusCode: number };
    err.statusCode = 404;
    throw err;
  }
  return cs;
}
