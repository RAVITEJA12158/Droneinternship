import { Request, Response, NextFunction } from "express";
import * as orthoService from "../services/orthomosaic.service";
import { toAbsolutePath } from "../config/storage";
import fs from "fs";
import path from "path";

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await orthoService.listOrthomosaics(req.params.id, req.user!.id));
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await orthoService.deleteOrthomosaic(req.params.id, req.user!.id);
    res.status(204).send();
  } catch (err) { next(err); }
}

export async function preview(req: Request, res: Response, next: NextFunction) {
  try {
    const ortho = await orthoService.getOrthomosaic(req.params.id, req.user!.id);
    if (!ortho.previewPath) {
      res.status(404).json({ message: "Preview not generated yet" });
      return;
    }

    const abs = toAbsolutePath(ortho.previewPath);
    if (!fs.existsSync(abs)) {
      res.status(404).json({ message: "Preview not found on disk" });
      return;
    }

    res.setHeader("Content-Type", "image/jpeg");
    fs.createReadStream(abs).pipe(res);
  } catch (err) { next(err); }
}

export async function download(req: Request, res: Response, next: NextFunction) {
  try {
    const ortho = await orthoService.getOrthomosaic(req.params.id, req.user!.id);
    const abs = toAbsolutePath(ortho.relativePath);
    if (!fs.existsSync(abs)) {
      res.status(404).json({ message: "Orthomosaic not found on disk" });
      return;
    }

    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${path.basename(ortho.relativePath)}"`);
    fs.createReadStream(abs).pipe(res);
  } catch (err) { next(err); }
}
