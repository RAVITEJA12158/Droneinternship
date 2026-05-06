import { Request, Response, NextFunction } from "express";
import * as fileService from "../services/file.service";
import { parsePagination } from "../lib/paginate";
import { toAbsolutePath } from "../config/storage";
import { FileType } from "@prisma/client";
import fs from "fs";
import path from "path";

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit } = parsePagination(req.query as Record<string, unknown>);
    const fileType = req.query.fileType as FileType | undefined;
    res.json(await fileService.listFiles(req.params.id, req.user!.id, page, limit, fileType));
  } catch (err) { next(err); }
}

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await fileService.getFile(req.params.id, req.user!.id));
  } catch (err) { next(err); }
}

export async function thumbnail(req: Request, res: Response, next: NextFunction) {
  try {
    const file = await fileService.getFile(req.params.id, req.user!.id);
    if (!file.thumbnailPath) {
      res.status(404).json({ message: "Thumbnail not yet generated" });
      return;
    }
    const abs = toAbsolutePath(file.thumbnailPath);
    if (!fs.existsSync(abs)) { res.status(404).json({ message: "Thumbnail not found" }); return; }
    res.setHeader("Content-Type", "image/jpeg");
    fs.createReadStream(abs).pipe(res);
  } catch (err) { next(err); }
}

export async function download(req: Request, res: Response, next: NextFunction) {
  try {
    const file = await fileService.getFile(req.params.id, req.user!.id);
    const abs = toAbsolutePath(file.relativePath);
    if (!fs.existsSync(abs)) { res.status(404).json({ message: "File not found on disk" }); return; }
    res.setHeader("Content-Disposition", `attachment; filename="${file.originalName}"`);
    res.setHeader("Content-Type", "application/octet-stream");
    fs.createReadStream(abs).pipe(res);
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await fileService.deleteFileById(req.params.id, req.user!.id);
    res.status(204).send();
  } catch (err) { next(err); }
}
