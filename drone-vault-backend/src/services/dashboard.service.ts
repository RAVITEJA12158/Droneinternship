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
        include: {
          project: { select: { id: true, name: true } },
          _count: { select: { files: true } },
        },
      }),
      prisma.project.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { _count: { select: { missions: true } } },
      }),
    ]);

  const recentMissionIds = recentMissions.map((mission) => mission.id);
  const missionStorage = recentMissionIds.length
    ? await prisma.file.groupBy({
        by: ["missionId"],
        where: { missionId: { in: recentMissionIds } },
        _sum: { size: true },
      })
    : [];
  const storageByMission = new Map(
    missionStorage.map((item) => [item.missionId, Number(item._sum.size ?? 0)])
  );

  return {
    totalProjects,
    totalMissions,
    totalFiles: fileAgg._count,
    storageUsed: Number(fileAgg._sum.size ?? 0),
    recentMissions: recentMissions.map((mission) => ({
      ...mission,
      fileCount: mission._count?.files ?? 0,
      storageUsed: storageByMission.get(mission.id) ?? 0,
    })),
    recentProjects: recentProjects.map((project) => ({
      ...project,
      missionCount: project._count?.missions ?? 0,
    })),
  };
}
