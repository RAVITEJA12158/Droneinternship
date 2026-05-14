import { Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
import * as labellingService from "../services/labelling.service";

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await labellingService.getLabellingJob(req.params.id, req.user!.id));
  } catch (err) { next(err); }
}

export async function start(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(202).json(await labellingService.startLabelling(req.params.id, req.user!.id));
  } catch (err) { next(err); }
}

export async function map(req: Request, res: Response, next: NextFunction) {
  try {
    const relativePath = String(req.query.path || "");
    if (!relativePath) {
      res.status(400).json({ message: "Missing map path" });
      return;
    }

    const abs = await labellingService.assertMapAccess(relativePath, req.user!.id);
    if (!fs.existsSync(abs)) {
      res.status(404).json({ message: "Labelling map not found on disk" });
      return;
    }

    res.setHeader("Content-Type", path.extname(abs).toLowerCase() === ".png" ? "image/png" : "application/octet-stream");
    fs.createReadStream(abs).pipe(res);
  } catch (err) { next(err); }
}
