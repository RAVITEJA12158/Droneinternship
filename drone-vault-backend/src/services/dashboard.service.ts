import prisma from "../prisma";

export async function getDashboardStats(userId: string) {
  const [totalProjects, totalMissions, fileAgg, recentMissions, recentUploads] =
    await Promise.all([
      prisma.project.count({ where: { userId } }),
      prisma.mission.count({ where: { project: { userId } } }),
      prisma.file.aggregate({
        where: { mission: { project: { userId } } },
        _count: true,
        _sum: { size: true },
      }),
      prisma.mission.findMany({
        where: { project: { userId } },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { project: { select: { id: true, name: true } } },
      }),
      prisma.file.findMany({
        where: { mission: { project: { userId } } },
        orderBy: { uploadedAt: "desc" },
        take: 10,
        select: {
          id: true, originalName: true, fileType: true,
          thumbnailPath: true, uploadedAt: true, missionId: true,
        },
      }),
    ]);

  return {
    totalProjects,
    totalMissions,
    totalFiles: fileAgg._count,
    storageUsed: fileAgg._sum.size ?? 0n,
    recentMissions,
    recentUploads,
  };
}
