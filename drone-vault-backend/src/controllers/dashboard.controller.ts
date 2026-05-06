import { Request, Response, NextFunction } from "express";
import { getDashboardStats } from "../services/dashboard.service";

export async function stats(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await getDashboardStats(req.user!.id));
  } catch (err) { next(err); }
}
