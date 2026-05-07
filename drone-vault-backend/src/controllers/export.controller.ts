import { Request, Response, NextFunction } from "express";
import * as exportService from "../services/export.service";
import prisma from "../prisma";
import fs from "fs";
import path from "path";

interface Job {
  id: string;
  type: "zip" | "json";
  status: "waiting" | "active" | "completed" | "failed";
  outPath?: string;
  error?: string;
}

const jobs = new Map<string, Job>();

function createJob(type: "zip" | "json"): Job {
  const id = `job_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const job: Job = { id, type, status: "waiting" };
  jobs.set(id, job);
  return job;
}

async function assertMissionAccess(missionId: string, userId: string) {
  const mission = await prisma.mission.findFirst({
    where: { id: missionId, project: { userId } },
  });
  if (!mission) {
    const err = new Error("Mission not found") as Error & { statusCode: number };
    err.statusCode = 404;
    throw err;
  }
  return mission;
}

export async function exportZip(req: Request, res: Response, next: NextFunction) {
  try {
    const mission = await assertMissionAccess(req.params.id, req.user!.id);
    const job = createJob("zip");
    res.status(202).json({ jobId: job.id, status: "waiting" });

    (async () => {
      job.status = "active";
      try {
        job.outPath = await exportService.createZipExport(mission.id);
        job.status = "completed";
      } catch (err) {
        job.status = "failed";
        job.error = (err as Error).message;
        console.error("ZIP export failed:", err);
      }
    })();
  } catch (err) { next(err); }
}

export async function exportJson(req: Request, res: Response, next: NextFunction) {
  try {
    const mission = await assertMissionAccess(req.params.id, req.user!.id);
    const job = createJob("json");
    res.status(202).json({ jobId: job.id, status: "waiting" });

    (async () => {
      job.status = "active";
      try {
        job.outPath = await exportService.createJsonExport(mission.id, req.user!.id);
        job.status = "completed";
      } catch (err) {
        job.status = "failed";
        job.error = (err as Error).message;
        console.error("JSON export failed:", err);
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
  res.setHeader("Content-Type", job.type === "json" ? "application/json" : "application/zip");
  fs.createReadStream(job.outPath).pipe(res);
}
