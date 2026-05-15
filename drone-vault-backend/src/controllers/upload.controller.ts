import { Request, Response, NextFunction } from "express";
import * as uploadService from "../services/upload.service";
import prisma from "../prisma";

async function getMissionWithProject(missionId: string, userId: string) {
  const mission = await prisma.mission.findFirst({
    where: { id: missionId, project: { userId } },
    include: { project: true },
  });
  if (!mission) {
    const err = new Error("Mission not found") as Error & { statusCode: number };
    err.statusCode = 404;
    throw err;
  }
  return mission;
}

export async function uploadRgb(req: Request, res: Response, next: NextFunction) {
  try {
    const mission = await getMissionWithProject(req.params.id, req.user!.id);
    const files = req.files as Express.Multer.File[];
    if (!files?.length) { res.status(400).json({ message: "No files uploaded" }); return; }
    const result = await uploadService.processRgbUpload(mission.id, mission.projectId, files);
    res.status(202).json(result);
  } catch (err) { next(err); }
}

export async function uploadMultispectral(req: Request, res: Response, next: NextFunction) {
  try {
    const mission = await getMissionWithProject(req.params.id, req.user!.id);
    const files = req.files as Express.Multer.File[];
    if (!files?.length) { res.status(400).json({ message: "No files uploaded" }); return; }
    const result = await uploadService.processMultispectralUpload(mission.id, mission.projectId, files);
    res.status(202).json(result);
  } catch (err) { next(err); }
}

export async function uploadPlan(req: Request, res: Response, next: NextFunction) {
  try {
    const mission = await getMissionWithProject(req.params.id, req.user!.id);
    const file = req.file;
    if (!file) { res.status(400).json({ message: "No file uploaded" }); return; }
    const result = await uploadService.processPlanUpload(mission.id, mission.projectId, file);
    res.status(202).json(result);
  } catch (err) { next(err); }
}

export async function uploadOrthomosaic(req: Request, res: Response, next: NextFunction) {
  try {
    const mission = await getMissionWithProject(req.params.id, req.user!.id);
    const files = req.files as Record<string, Express.Multer.File[]>;
    const fileMap: Record<string, Express.Multer.File> = {};
    for (const key of ["rgb", "multispectral", "ndvi", "dsm"]) {
      if (files[key]?.[0]) fileMap[key] = files[key][0];
    }
    if (!Object.keys(fileMap).length) { res.status(400).json({ message: "No files uploaded" }); return; }
    const result = await uploadService.processOrthomosaicUpload(mission.id, mission.projectId, fileMap);
    res.status(202).json({
      ...result,
      labellingStarted: false,
    });
  } catch (err) { next(err); }
}
