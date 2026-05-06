import { Request, Response, NextFunction } from "express";
import * as exportService from "../services/export.service";
import { exportQueue } from "../jobs/queues";
import prisma from "../prisma";
import fs from "fs";
import path from "path";
import { toAbsolutePath } from "../config/storage";

export async function exportJson(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await exportService.exportJson(req.params.id, req.user!.id);
    res.json(data);
  } catch (err) { next(err); }
}

export async function exportZip(req: Request, res: Response, next: NextFunction) {
  try {
    const mission = await prisma.mission.findFirst({
      where: { id: req.params.id, project: { userId: req.user!.id } },
    });
    if (!mission) { res.status(404).json({ message: "Mission not found" }); return; }
    const job = await exportQueue.add("export", {
      missionId: mission.id,
      projectId: mission.projectId,
      type: "zip",
    });
    res.status(202).json({ jobId: job.id, status: "waiting" });
  } catch (err) { next(err); }
}

export async function exportPdf(req: Request, res: Response, next: NextFunction) {
  // PDF export placeholder — integrate puppeteer or pdfmake in production
  res.status(501).json({ message: "PDF export not yet implemented. Use ZIP or JSON." });
}

export async function jobStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const job = await exportQueue.getJob(req.params.jobId);
    if (!job) { res.status(404).json({ message: "Job not found" }); return; }
    const state = await job.getState();
    const result = job.returnvalue as { outPath?: string } | undefined;
    res.json({
      jobId: job.id,
      status: state,
      downloadUrl: state === "completed" && result?.outPath
        ? `/api/exports/${job.id}/download`
        : undefined,
    });
  } catch (err) { next(err); }
}

export async function downloadExport(req: Request, res: Response, next: NextFunction) {
  try {
    const job = await exportQueue.getJob(req.params.jobId);
    if (!job) { res.status(404).json({ message: "Job not found" }); return; }
    const state = await job.getState();
    if (state !== "completed") { res.status(400).json({ message: "Export not ready" }); return; }
    const { outPath } = job.returnvalue as { outPath: string };
    if (!fs.existsSync(outPath)) { res.status(404).json({ message: "Export file not found" }); return; }
    res.setHeader("Content-Disposition", `attachment; filename="${path.basename(outPath)}"`);
    res.setHeader("Content-Type", "application/zip");
    fs.createReadStream(outPath).pipe(res);
  } catch (err) { next(err); }
}
