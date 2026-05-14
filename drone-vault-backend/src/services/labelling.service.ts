import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { LabellingJobStatus, MapType, Prisma } from "@prisma/client";
import { env } from "../config/env";
import { ensureDir, sanitizeName, toAbsolutePath, toRelativePath } from "../config/storage";
import prisma from "../prisma";

const OUTPUT_FILES = {
  ndvi: "ndvi_heatmap.png",
  ndre: "ndre_heatmap.png",
  superpixels: "superpixels.png",
  labels: "labels_classified.png",
  overlay: "labels_overlay.png",
  stats: "statistics.json",
};

function labellingScriptPath() {
  return path.resolve(__dirname, "..", "..", "scripts", "labelling.py");
}

function publicMapUrl(relativePath: string) {
  return `/api/labelling/maps?path=${encodeURIComponent(relativePath)}`;
}

function serializeStats(stats: unknown) {
  if (!stats || typeof stats !== "object" || Array.isArray(stats)) return stats;
  const raw = stats as Record<string, unknown>;
  const visualizations = raw.visualizations;
  if (!visualizations || typeof visualizations !== "object" || Array.isArray(visualizations)) {
    return raw;
  }

  const serializedVisualizations = Object.fromEntries(
    Object.entries(visualizations as Record<string, unknown>).map(([key, value]) => [
      key,
      typeof value === "string" ? publicMapUrl(value) : value,
    ])
  );

  return {
    ...raw,
    visualizations: serializedVisualizations,
  };
}

function serializeJob<T extends {
  labelMapUrl: string | null;
  ndviMapUrl: string | null;
  ndreMapUrl: string | null;
  stats?: unknown;
}>(job: T | null) {
  if (!job) return null;
  return {
    ...job,
    labelMapUrl: job.labelMapUrl ? publicMapUrl(job.labelMapUrl) : null,
    ndviMapUrl: job.ndviMapUrl ? publicMapUrl(job.ndviMapUrl) : null,
    ndreMapUrl: job.ndreMapUrl ? publicMapUrl(job.ndreMapUrl) : null,
    stats: serializeStats(job.stats),
  };
}

async function assertMissionAccess(missionId: string, userId: string) {
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

async function getMultispectralOrthomosaic(missionId: string) {
  const ortho = await prisma.orthomosaic.findFirst({
    where: { missionId, type: MapType.MULTISPECTRAL },
    orderBy: { createdAt: "desc" },
  });
  if (!ortho) {
    const err = new Error("Upload a multispectral orthomosaic before starting labelling") as Error & { statusCode: number };
    err.statusCode = 400;
    throw err;
  }
  return ortho;
}

export async function getLabellingJob(missionId: string, userId: string) {
  await assertMissionAccess(missionId, userId);
  const job = await prisma.labellingJob.findFirst({
    where: { missionId },
    include: { orthomosaic: true },
    orderBy: { createdAt: "desc" },
  });
  return serializeJob(job);
}

export async function startLabelling(missionId: string, userId: string) {
  const mission = await assertMissionAccess(missionId, userId);
  const ortho = await getMultispectralOrthomosaic(missionId);
  const existing = await prisma.labellingJob.findUnique({ where: { orthomosaicId: ortho.id } });

  if (existing?.status === LabellingJobStatus.PENDING || existing?.status === LabellingJobStatus.PROCESSING) {
    return serializeJob(existing);
  }

  const job = existing
    ? await prisma.labellingJob.update({
        where: { id: existing.id },
        data: {
          status: LabellingJobStatus.PENDING,
          labelMapUrl: null,
          ndviMapUrl: null,
          ndreMapUrl: null,
          stats: Prisma.JsonNull,
        },
      })
    : await prisma.labellingJob.create({
        data: {
          missionId,
          orthomosaicId: ortho.id,
          status: LabellingJobStatus.PENDING,
        },
      });

  void runLabellingJob(job.id, mission, ortho.relativePath);
  return serializeJob(job);
}

async function runLabellingJob(
  jobId: string,
  mission: { name: string; project: { name: string } },
  inputRelativePath: string
) {
  try {
    await prisma.labellingJob.update({
      where: { id: jobId },
      data: { status: LabellingJobStatus.PROCESSING },
    });

    const missionDir = path.join(
      env.STORAGE_ROOT,
      "projects",
      sanitizeName(mission.project.name),
      sanitizeName(mission.name)
    );
    const tempDir = path.join(env.STORAGE_ROOT, "temp", "labelling", jobId);
    const outputDir = path.join(missionDir, "labelling", jobId);
    ensureDir(tempDir);
    ensureDir(outputDir);

    await executeLabellingScript(toAbsolutePath(inputRelativePath), tempDir);

    const outputRelative = {
      ndvi: toRelativePath(path.join(outputDir, OUTPUT_FILES.ndvi)),
      ndre: toRelativePath(path.join(outputDir, OUTPUT_FILES.ndre)),
      superpixels: toRelativePath(path.join(outputDir, OUTPUT_FILES.superpixels)),
      labels: toRelativePath(path.join(outputDir, OUTPUT_FILES.labels)),
      overlay: toRelativePath(path.join(outputDir, OUTPUT_FILES.overlay)),
    };

    await fs.promises.copyFile(path.join(tempDir, OUTPUT_FILES.ndvi), toAbsolutePath(outputRelative.ndvi));
    await fs.promises.copyFile(path.join(tempDir, OUTPUT_FILES.ndre), toAbsolutePath(outputRelative.ndre));
    await fs.promises.copyFile(path.join(tempDir, OUTPUT_FILES.superpixels), toAbsolutePath(outputRelative.superpixels));
    await fs.promises.copyFile(path.join(tempDir, OUTPUT_FILES.labels), toAbsolutePath(outputRelative.labels));
    await fs.promises.copyFile(path.join(tempDir, OUTPUT_FILES.overlay), toAbsolutePath(outputRelative.overlay));

    const statsRaw = await fs.promises.readFile(path.join(tempDir, OUTPUT_FILES.stats), "utf8");
    const stats = {
      ...JSON.parse(statsRaw),
      visualizations: {
        superpixelsMapUrl: outputRelative.superpixels,
        overlayMapUrl: outputRelative.overlay,
      },
    };

    await prisma.labellingJob.update({
      where: { id: jobId },
      data: {
        ndviMapUrl: outputRelative.ndvi,
        ndreMapUrl: outputRelative.ndre,
        labelMapUrl: outputRelative.labels,
        stats,
        status: LabellingJobStatus.COMPLETED,
      },
    });

    await fs.promises.rm(tempDir, { recursive: true, force: true });
  } catch (error) {
    console.error("Labelling job failed:", error);
    await prisma.labellingJob.update({
      where: { id: jobId },
      data: {
        status: LabellingJobStatus.FAILED,
        stats: { error: error instanceof Error ? error.message : "Unknown labelling error" },
      },
    });
  }
}

function executeLabellingScript(inputTif: string, outputDir: string) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(env.PYTHON_BIN, [
      labellingScriptPath(),
      "--input_tif",
      inputTif,
      "--output_dir",
      outputDir,
    ], { stdio: ["ignore", "pipe", "pipe"] });

    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(stderr.trim() || `Labelling script exited with code ${code}`));
    });
  });
}

export async function assertMapAccess(relativePath: string, userId: string) {
  const normalizedPath = relativePath.replace(/\\/g, "/");
  const jobs = await prisma.labellingJob.findMany({
    where: { mission: { project: { userId } } },
    select: { id: true, labelMapUrl: true, ndviMapUrl: true, ndreMapUrl: true },
  });

  const hasAccess = jobs.some((job) => {
    if (
      job.labelMapUrl === relativePath ||
      job.ndviMapUrl === relativePath ||
      job.ndreMapUrl === relativePath
    ) {
      return true;
    }

    return normalizedPath.includes(`/labelling/${job.id}/`);
  });

  if (!hasAccess) {
    const err = new Error("Labelling map not found") as Error & { statusCode: number };
    err.statusCode = 404;
    throw err;
  }
  return toAbsolutePath(relativePath);
}
