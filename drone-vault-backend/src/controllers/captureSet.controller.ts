import { Request, Response, NextFunction } from "express";
import * as csService from "../services/captureSet.service";
import { parsePagination } from "../lib/paginate";

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit } = parsePagination(req.query as Record<string, unknown>);
    res.json(await csService.listCaptureSets(req.params.id, req.user!.id, page, limit));
  } catch (err) { next(err); }
}

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await csService.getCaptureSet(req.params.id, req.user!.id));
  } catch (err) { next(err); }
}
