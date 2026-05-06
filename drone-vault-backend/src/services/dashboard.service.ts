import prisma from "../prisma";

export async function getDashboardStats(userId: string) {
  const [totalProjects, totalMissions, fileAgg, recentMissions, recentProjects] =
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
      prisma.project.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { _count: { select: { missions: true } } },
      }),
    ]);

  return {
    totalProjects,
    totalMissions,
    totalFiles: fileAgg._count,
    // BigInt is not JSON-serializable — convert to Number (safe up to ~9 petabytes)
    storageUsed: Number(fileAgg._sum.size ?? 0),
    recentMissions,
    recentProjects,
  };
}
