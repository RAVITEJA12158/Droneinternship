import { Request, Response, NextFunction } from "express";
import * as missionService from "../services/mission.service";
import { parsePagination } from "../lib/paginate";

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit } = parsePagination(req.query as Record<string, unknown>);
    res.json(await missionService.listMissions(req.params.projectId, req.user!.id, page, limit));
  } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(201).json(await missionService.createMission(req.params.projectId, req.user!.id, req.body));
  } catch (err) { next(err); }
}

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await missionService.getMission(req.params.id, req.user!.id));
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await missionService.updateMission(req.params.id, req.user!.id, req.body));
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await missionService.deleteMission(req.params.id, req.user!.id);
    res.status(204).send();
  } catch (err) { next(err); }
}
