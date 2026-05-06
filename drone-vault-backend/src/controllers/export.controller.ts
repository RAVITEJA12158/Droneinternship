import { Request, Response, NextFunction } from "express";
import * as exportService from "../services/export.service";
import prisma from "../prisma";
import fs from "fs";
import path from "path";
import { toAbsolutePath } from "../config/storage";
import { env } from "../config/env";

// In-memory job store — good enough for dev/internship scale
interface Job {
  id: string;
  status: "waiting" | "active" | "completed" | "failed";
  outPath?: string;
  error?: string;
}
const jobs = new Map<string, Job>();

function createJob(): Job {
  const id = `job_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const job: Job = { id, status: "waiting" };
  jobs.set(id, job);
  return job;
}

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

    const job = createJob();
    res.status(202).json({ jobId: job.id, status: "waiting" });

    // Run async — response already sent
    (async () => {
      job.status = "active";
      try {
        const outPath = await exportService.createZipExport(mission.id, mission.projectId);
        job.status = "completed";
        job.outPath = outPath;
      } catch (err) {
        job.status = "failed";
        job.error = (err as Error).message;
        console.error("ZIP export failed:", err);
      }
    })();
  } catch (err) { next(err); }
}

export async function exportPdf(_req: Request, res: Response) {
  res.status(501).json({ message: "PDF export not yet implemented. Use ZIP or JSON." });
}

export async function jobStatus(req: Request, res: Response) {
  const job = jobs.get(req.params.jobId);
  if (!job) { res.status(404).json({ message: "Job not found" }); return; }
  res.json({
    jobId: job.id,
    status: job.status,
    downloadUrl: job.status === "completed"
      ? `/api/exports/${job.id}/download`
      : undefined,
  });
}

export async function downloadExport(req: Request, res: Response) {
  const job = jobs.get(req.params.jobId);
  if (!job) { res.status(404).json({ message: "Job not found" }); return; }
  if (job.status !== "completed" || !job.outPath) {
    res.status(400).json({ message: "Export not ready" }); return;
  }
  if (!fs.existsSync(job.outPath)) {
    res.status(404).json({ message: "Export file not found" }); return;
  }
  res.setHeader("Content-Disposition", `attachment; filename="${path.basename(job.outPath)}"`);
  res.setHeader("Content-Type", "application/zip");
  fs.createReadStream(job.outPath).pipe(res);
}
