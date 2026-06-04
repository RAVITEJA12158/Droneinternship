import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import fs from "fs";
import path from "path";
import { LabellingJobStatus, MapType, Prisma } from "@prisma/client";
import { env } from "../config/env";
import { ensureDir, sanitizeName, toAbsolutePath, toRelativePath } from "../config/storage";
import prisma from "../prisma";

const OUTPUT_FILES = {
  ndviTif: "labelling_ndvi.tif",
  ndreTif: "labelling_ndre.tif",
  labelsTif: "labelling_labels_pixelwise.tif",
  superpixelsTif: "labelling_superpixels.tif",
  composite: "labelling_source_composite.png",
  ndvi: "labelling_ndvi_heatmap.png",
  ndre: "labelling_ndre_heatmap.png",
  superpixels: "labelling_superpixels_overlay.png",
  labels: "labelling_labels_classified.png",
  overlay: "labelling_labels_overlay.png",
  ndviHistogram: "labelling_ndvi_histogram.png",
  ndreHistogram: "labelling_ndre_histogram.png",
  classDistribution: "labelling_class_distribution.png",
  classDistributionPie: "labelling_class_distribution_pie.png",
  scatter: "labelling_ndvi_ndre_scatter.png",
  confidence: "labelling_confidence_map.png",
  summaryCsv: "labelling_dataset_summary.csv",
  stats: "labelling_statistics.json",
};

const DISEASE_OUTPUT_FILES = {
  diseasePredictionTif: "disease_prediction.tif",
  diseasePredictionMap: "disease_prediction.png",
  diseasePredictionConfidenceMap: "disease_prediction_confidence.png",
  diseasePredictionNotebookMap: "predicted_map.png",
  diseasePredictionGroundTruthMap: "ground_truth.png",
  diseasePredictionStats: "disease_prediction_statistics.json",
};

const YIELD_OUTPUT_FILES = {
  yieldPredictionHeatmap: "yield_prediction_heatmap.png",
  yieldPredictionStats: "yield_prediction_statistics.json",
};

const runningLabellingProcesses = new Map<string, ChildProcessWithoutNullStreams>();
const stoppedLabellingJobs = new Set<string>();

function logLabellingJob(jobId: string, message: string) {
  console.info(`[labelling:${jobId}] ${message}`);
}

function logLabellingJobError(jobId: string, message: string, error?: unknown) {
  console.error(`[labelling:${jobId}] ${message}`, error ?? "");
}

function labellingScriptPath() {
  return path.resolve(__dirname, "..", "..", "scripts", "labelling.py");
}

function diseasePredictionScriptPath() {
  return path.resolve(__dirname, "..", "..", "scripts", "disease_prediction.py");
}

function yieldPredictionScriptPath() {
  return path.resolve(__dirname, "..", "..", "scripts", "yield_prediction.py");
}

function publicMapUrl(relativePath: string) {
  return `/api/labelling/maps?path=${encodeURIComponent(relativePath)}`;
}

function serializeStats(stats: unknown) {
  if (!stats || typeof stats !== "object" || Array.isArray(stats)) return stats;
  const raw = stats as Record<string, unknown>;
  const serializePathMap = (value: unknown) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return value;
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        typeof item === "string" ? publicMapUrl(item) : item,
      ])
    );
  };

  return {
    ...raw,
    visualizations: serializePathMap(raw.visualizations),
    artifacts: serializePathMap(raw.artifacts),
  };
}

function mergeProgressStats(existingStats: unknown, message: string, progress?: number) {
  const base =
    existingStats && typeof existingStats === "object" && !Array.isArray(existingStats)
      ? (existingStats as Record<string, unknown>)
      : {};

  return {
    ...base,
    message,
    ...(progress == null ? {} : { progress }),
  };
}

function withoutLabellingModelFallback(stats: unknown) {
  if (!stats || typeof stats !== "object" || Array.isArray(stats)) return stats;

  const raw = stats as Record<string, unknown>;
  const visualizations =
    raw.visualizations && typeof raw.visualizations === "object" && !Array.isArray(raw.visualizations)
      ? (raw.visualizations as Record<string, unknown>)
      : {};
  const diseasePrediction =
    raw.diseasePrediction && typeof raw.diseasePrediction === "object" && !Array.isArray(raw.diseasePrediction)
      ? (raw.diseasePrediction as Record<string, unknown>)
      : null;
  const yieldPrediction =
    raw.yieldPrediction && typeof raw.yieldPrediction === "object" && !Array.isArray(raw.yieldPrediction)
      ? (raw.yieldPrediction as Record<string, unknown>)
      : null;

  let out: Record<string, unknown> = { ...raw, visualizations, diseasePrediction, yieldPrediction };

  // Preserve existing disease fallback behaviour
  if (diseasePrediction && (diseasePrediction.status !== "completed" || diseasePrediction.source === "labelling_fallback")) {
    out.diseasePrediction = {
      ...diseasePrediction,
      status: diseasePrediction.source === "labelling_fallback" ? "skipped" : diseasePrediction.status,
      error:
        diseasePrediction.source === "labelling_fallback"
          ? "Disease prediction was not generated. A trained disease model checkpoint is required."
          : diseasePrediction.error,
    };
    out.visualizations = {
      ...visualizations,
      diseasePredictionMapUrl: null,
      diseasePredictionConfidenceMapUrl: null,
      diseasePredictionNotebookMapUrl: null,
      diseasePredictionGroundTruthMapUrl: null,
    };
  }

  // Yield fallback: if missing or explicitly skipped, hide yield visualization
  if (!yieldPrediction || (yieldPrediction.status === "skipped")) {
    out.yieldPrediction = yieldPrediction || { enabled: false, status: "skipped", error: "YIELD_MODEL_CHECKPOINT is not configured" };
    out.visualizations = {
      ...visualizations,
      yieldPredictionHeatmapUrl: null,
    };
  }

  return out;
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
    stats: serializeStats(withoutLabellingModelFallback(job.stats)),
  };
}

function progressFromMessage(message: string) {
  if (/completed successfully/i.test(message)) return 100;

  const segmentMatch = message.match(/Classifying superpixels:\s*processed\s+(\d+)\s*\/\s*(\d+)\s+segments/i);
  if (segmentMatch) {
    const processed = Number(segmentMatch[1]);
    const totalSegments = Number(segmentMatch[2]);
    if (Number.isFinite(processed) && Number.isFinite(totalSegments) && totalSegments > 0) {
      const segmentRatio = Math.max(0, Math.min(1, processed / totalSegments));
      return Math.round(83 + segmentRatio * 15);
    }
  }

  const diseaseMatch = message.match(/Disease prediction:\s*processed\s+(\d+)\s*\/\s*(\d+)\s+tiles/i);
  if (diseaseMatch) {
    const processed = Number(diseaseMatch[1]);
    const totalTiles = Number(diseaseMatch[2]);
    if (Number.isFinite(processed) && Number.isFinite(totalTiles) && totalTiles > 0) {
      const tileRatio = Math.max(0, Math.min(1, processed / totalTiles));
      return Math.round(90 + tileRatio * 9);
    }
  }

  const stepMatch = message.match(/\b(\d+)\s*\/\s*(\d+)\b/);
  if (!stepMatch) return undefined;

  const current = Number(stepMatch[1]);
  const total = Number(stepMatch[2]);
  if (!Number.isFinite(current) || !Number.isFinite(total) || total <= 0) return undefined;

  return Math.max(0, Math.min(99, Math.round((current / total) * 100)));
}

function stoppedStats() {
  return {
    error: "Labelling stopped by user",
    stopped: true,
  };
}

async function fileExists(targetPath: string) {
  try {
    await fs.promises.access(targetPath);
    return true;
  } catch {
    return false;
  }
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

  stoppedLabellingJobs.delete(job.id);
  void runLabellingJob(job.id, mission, ortho.relativePath);
  return serializeJob(job);
}

export async function stopLabelling(missionId: string, userId: string) {
  await assertMissionAccess(missionId, userId);
  const job = await prisma.labellingJob.findFirst({
    where: { missionId },
    orderBy: { createdAt: "desc" },
  });

  if (!job) {
    const err = new Error("No labelling job found") as Error & { statusCode: number };
    err.statusCode = 404;
    throw err;
  }

  if (job.status !== LabellingJobStatus.PENDING && job.status !== LabellingJobStatus.PROCESSING) {
    return serializeJob(job);
  }

  stoppedLabellingJobs.add(job.id);
  const child = runningLabellingProcesses.get(job.id);
  if (child && !child.killed) {
    child.kill();
  }

  const stoppedJob = await prisma.labellingJob.update({
    where: { id: job.id },
    data: {
      status: LabellingJobStatus.FAILED,
      stats: stoppedStats(),
    },
  });

  return serializeJob(stoppedJob);
}

async function runLabellingJob(
  jobId: string,
  mission: { name: string; project: { name: string } },
  inputRelativePath: string
) {
  try {
    if (stoppedLabellingJobs.has(jobId)) return;

    logLabellingJob(jobId, `Queued analysis for mission "${mission.name}".`);
    await prisma.labellingJob.update({
      where: { id: jobId },
      data: { status: LabellingJobStatus.PROCESSING },
    });

    if (stoppedLabellingJobs.has(jobId)) {
      await prisma.labellingJob.update({
        where: { id: jobId },
        data: { status: LabellingJobStatus.FAILED, stats: stoppedStats() },
      });
      return;
    }

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

    logLabellingJob(jobId, `Starting multispectral labelling from ${inputRelativePath}.`);
    await executeLabellingScript(
      jobId,
      toAbsolutePath(inputRelativePath),
      tempDir,
      (message) => {
        if (stoppedLabellingJobs.has(jobId)) return;
        const progress = progressFromMessage(message);
        if (progress == null && !/Starting multispectral/i.test(message)) return;
        prisma.labellingJob.findUnique({ where: { id: jobId }, select: { stats: true } })
          .then(current => prisma.labellingJob.update({
            where: { id: jobId },
            data: { stats: mergeProgressStats(current?.stats, message, progress) as Prisma.InputJsonValue }
          }))
          .catch(err => logLabellingJobError(jobId, "Could not save labelling progress to the database.", err));
      }
    );
    logLabellingJob(jobId, "Labelling analysis finished. Preparing output files.");

    let diseasePrediction: Record<string, unknown> | null = null;
    const configuredCheckpoint = env.DISEASE_MODEL_CHECKPOINT.trim();

    if (!stoppedLabellingJobs.has(jobId)) {
      if (!configuredCheckpoint) {
        logLabellingJob(jobId, "Disease prediction skipped because DISEASE_MODEL_CHECKPOINT is not configured.");
        diseasePrediction = {
          enabled: false,
          status: "skipped",
          error: "DISEASE_MODEL_CHECKPOINT is not configured",
        };
      } else {
        const checkpointPath = path.resolve(configuredCheckpoint);
        if (!(await fileExists(checkpointPath))) {
          logLabellingJob(jobId, `Disease prediction skipped because checkpoint was not found at ${checkpointPath}.`);
          diseasePrediction = {
            enabled: false,
            status: "skipped",
            error: `Checkpoint not found at ${checkpointPath}`,
          };
        } else {
          try {
            logLabellingJob(jobId, `Starting disease prediction with checkpoint ${checkpointPath}.`);
            await executeDiseasePredictionScript(
              jobId,
              toAbsolutePath(inputRelativePath),
              path.join(tempDir, OUTPUT_FILES.ndviTif),
              path.join(tempDir, OUTPUT_FILES.ndreTif),
              path.join(tempDir, OUTPUT_FILES.labelsTif),
              checkpointPath,
              tempDir,
              (message) => {
                if (stoppedLabellingJobs.has(jobId)) return;
                const progress = progressFromMessage(message);
                if (progress == null && !/disease prediction/i.test(message)) return;
                prisma.labellingJob.findUnique({ where: { id: jobId }, select: { stats: true } })
                  .then(current => prisma.labellingJob.update({
                    where: { id: jobId },
                    data: { stats: mergeProgressStats(current?.stats, message, progress) as Prisma.InputJsonValue }
                  }))
                  .catch(err => logLabellingJobError(jobId, "Could not save disease prediction progress to the database.", err));
              }
            );

            const diseaseStatsPath = path.join(tempDir, DISEASE_OUTPUT_FILES.diseasePredictionStats);
            diseasePrediction = await fileExists(diseaseStatsPath)
              ? JSON.parse(await fs.promises.readFile(diseaseStatsPath, "utf8"))
              : {
                  enabled: true,
                  status: "completed",
                };
          } catch (error) {
            logLabellingJobError(jobId, "Disease prediction failed; keeping labelling outputs available.", error);
            diseasePrediction = {
              enabled: true,
              status: "failed",
              error: error instanceof Error ? error.message : "Unknown disease prediction error",
            };
          }
        }
      }
    }

    let yieldPrediction: Record<string, unknown> | null = null;
    const yieldConfiguredCheckpoint = env.YIELD_MODEL_CHECKPOINT.trim();

    if (!stoppedLabellingJobs.has(jobId)) {
      if (!yieldConfiguredCheckpoint) {
        logLabellingJob(jobId, "Yield prediction skipped because YIELD_MODEL_CHECKPOINT is not configured.");
        yieldPrediction = {
          enabled: false,
          status: "skipped",
          error: "YIELD_MODEL_CHECKPOINT is not configured",
        };
      } else {
        const yieldCheckpointPath = path.resolve(yieldConfiguredCheckpoint);
        if (!(await fileExists(yieldCheckpointPath))) {
          logLabellingJob(jobId, `Yield prediction skipped because checkpoint was not found at ${yieldCheckpointPath}.`);
          yieldPrediction = {
            enabled: false,
            status: "skipped",
            error: `Checkpoint not found at ${yieldCheckpointPath}`,
          };
        } else {
          try {
            logLabellingJob(jobId, `Starting yield prediction with checkpoint ${yieldCheckpointPath}.`);
            await executeYieldPredictionScript(
              jobId,
              toAbsolutePath(inputRelativePath),
              yieldCheckpointPath,
              tempDir,
              (message) => {
                if (stoppedLabellingJobs.has(jobId)) return;
                const progress = progressFromMessage(message);
                if (progress == null && !/yield prediction/i.test(message)) return;
                prisma.labellingJob.findUnique({ where: { id: jobId }, select: { stats: true } })
                  .then(current => prisma.labellingJob.update({
                    where: { id: jobId },
                    data: { stats: mergeProgressStats(current?.stats, message, progress) as Prisma.InputJsonValue }
                  }))
                  .catch(err => logLabellingJobError(jobId, "Could not save yield prediction progress to the database.", err));
              }
            );

            const yieldStatsPath = path.join(tempDir, YIELD_OUTPUT_FILES.yieldPredictionStats);
            yieldPrediction = await fileExists(yieldStatsPath)
              ? JSON.parse(await fs.promises.readFile(yieldStatsPath, "utf8"))
              : {
                  enabled: true,
                  status: "completed",
                };
          } catch (error) {
            logLabellingJobError(jobId, "Yield prediction failed; keeping labelling outputs available.", error);
            yieldPrediction = {
              enabled: true,
              status: "failed",
              error: error instanceof Error ? error.message : "Unknown yield prediction error",
            };
          }
        }
      }
    }

    if (stoppedLabellingJobs.has(jobId)) {
      await prisma.labellingJob.update({
        where: { id: jobId },
        data: { status: LabellingJobStatus.FAILED, stats: stoppedStats() },
      });
      return;
    }

    const outputRelative = Object.fromEntries(
      Object.entries(OUTPUT_FILES).map(([key, filename]) => [
        key,
        toRelativePath(path.join(outputDir, filename)),
      ])
    ) as Record<keyof typeof OUTPUT_FILES, string>;

    const diseaseOutputRelative = Object.fromEntries(
      Object.entries(DISEASE_OUTPUT_FILES).map(([key, filename]) => [
        key,
        toRelativePath(path.join(outputDir, filename)),
      ])
    ) as Record<keyof typeof DISEASE_OUTPUT_FILES, string>;

    await Promise.all(
      Object.entries(OUTPUT_FILES).map(([key, filename]) =>
        fs.promises.copyFile(path.join(tempDir, filename), toAbsolutePath(outputRelative[key as keyof typeof OUTPUT_FILES]))
      )
    );

    const copiedDiseaseOutputs = new Set<string>();
    await Promise.all(
      Object.entries(DISEASE_OUTPUT_FILES).map(async ([key, filename]) => {
        const sourcePath = path.join(tempDir, filename);
        if (!(await fileExists(sourcePath))) return;
        await fs.promises.copyFile(
          sourcePath,
          toAbsolutePath(diseaseOutputRelative[key as keyof typeof DISEASE_OUTPUT_FILES])
        );
        copiedDiseaseOutputs.add(key);
      })
    );

    const yieldOutputRelative = Object.fromEntries(
      Object.entries(YIELD_OUTPUT_FILES).map(([key, filename]) => [
        key,
        toRelativePath(path.join(outputDir, filename)),
      ])
    ) as Record<keyof typeof YIELD_OUTPUT_FILES, string>;

    const copiedYieldOutputs = new Set<string>();
    await Promise.all(
      Object.entries(YIELD_OUTPUT_FILES).map(async ([key, filename]) => {
        const sourcePath = path.join(tempDir, filename);
        if (!(await fileExists(sourcePath))) return;
        await fs.promises.copyFile(
          sourcePath,
          toAbsolutePath(yieldOutputRelative[key as keyof typeof YIELD_OUTPUT_FILES])
        );
        copiedYieldOutputs.add(key);
      })
    );

    const statsRaw = await fs.promises.readFile(path.join(tempDir, OUTPUT_FILES.stats), "utf8");
    const stats = withoutLabellingModelFallback({
      ...JSON.parse(statsRaw),
      diseasePrediction,
      yieldPrediction,
      visualizations: {
        sourceCompositeMapUrl: outputRelative.composite,
        superpixelsMapUrl: outputRelative.superpixels,
        overlayMapUrl: outputRelative.overlay,
        confidenceMapUrl: outputRelative.confidence,
        ndviHistogramUrl: outputRelative.ndviHistogram,
        ndreHistogramUrl: outputRelative.ndreHistogram,
        classDistributionUrl: outputRelative.classDistribution,
        classDistributionPieUrl: outputRelative.classDistributionPie,
        ndviNdreScatterUrl: outputRelative.scatter,
        ...(copiedDiseaseOutputs.has("diseasePredictionMap")
          ? { diseasePredictionMapUrl: diseaseOutputRelative.diseasePredictionMap }
          : {}),
        ...(copiedDiseaseOutputs.has("diseasePredictionConfidenceMap")
          ? { diseasePredictionConfidenceMapUrl: diseaseOutputRelative.diseasePredictionConfidenceMap }
          : {}),
        ...(copiedDiseaseOutputs.has("diseasePredictionNotebookMap")
          ? { diseasePredictionNotebookMapUrl: diseaseOutputRelative.diseasePredictionNotebookMap }
          : {}),
        ...(copiedDiseaseOutputs.has("diseasePredictionGroundTruthMap")
          ? { diseasePredictionGroundTruthMapUrl: diseaseOutputRelative.diseasePredictionGroundTruthMap }
          : {}),
        ...(copiedYieldOutputs?.has("yieldPredictionHeatmap")
          ? { yieldPredictionHeatmapUrl: yieldOutputRelative.yieldPredictionHeatmap }
          : {}),
      },
      artifacts: {
        ndviTifUrl: outputRelative.ndviTif,
        ndreTifUrl: outputRelative.ndreTif,
        labelsTifUrl: outputRelative.labelsTif,
        superpixelsTifUrl: outputRelative.superpixelsTif,
        statisticsJsonUrl: outputRelative.stats,
        datasetSummaryCsvUrl: outputRelative.summaryCsv,
        ...(copiedDiseaseOutputs.has("diseasePredictionTif")
          ? { diseasePredictionTifUrl: diseaseOutputRelative.diseasePredictionTif }
          : {}),
        ...(copiedDiseaseOutputs.has("diseasePredictionStats")
          ? { diseasePredictionStatsJsonUrl: diseaseOutputRelative.diseasePredictionStats }
          : {}),
        ...(copiedYieldOutputs?.has("yieldPredictionStats")
          ? { yieldPredictionStatsJsonUrl: yieldOutputRelative.yieldPredictionStats }
          : {}),
      },
    }) as Prisma.InputJsonValue;

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
    logLabellingJob(jobId, `Completed. Visualizations and statistics were saved for mission "${mission.name}".`);
  } catch (error) {
    const wasStopped = stoppedLabellingJobs.has(jobId);
    logLabellingJobError(jobId, "Labelling job failed during processing.", error);
    await prisma.labellingJob.update({
      where: { id: jobId },
      data: {
        status: LabellingJobStatus.FAILED,
        stats: wasStopped ? stoppedStats() : { error: error instanceof Error ? error.message : "Unknown labelling error" },
      },
    });
  }
}

function executeLabellingScript(jobId: string, inputTif: string, outputDir: string, onProgress?: (msg: string) => void) {
  return executePythonScript(
    jobId,
    [
      "-u",
      labellingScriptPath(),
      "--input_tif",
      inputTif,
      "--output_dir",
      outputDir,
    ],
    onProgress
  );
}

function executeDiseasePredictionScript(
  jobId: string,
  inputTif: string,
  ndviTif: string,
  ndreTif: string,
  labelsTif: string,
  checkpointPath: string,
  outputDir: string,
  onProgress?: (msg: string) => void
) {
  return executePythonScript(
    jobId,
    [
      "-u",
      diseasePredictionScriptPath(),
      "--input_tif",
      inputTif,
      "--ndvi_tif",
      ndviTif,
      "--ndre_tif",
      ndreTif,
      "--labels_tif",
      labelsTif,
      "--checkpoint",
      checkpointPath,
      "--output_dir",
      outputDir,
    ],
    onProgress
  );
}

function executeYieldPredictionScript(
  jobId: string,
  inputTif: string,
  checkpointPath: string,
  outputDir: string,
  onProgress?: (msg: string) => void
) {
  return executePythonScript(
    jobId,
    [
      "-u",
      yieldPredictionScriptPath(),
      "--input_tif",
      inputTif,
      "--checkpoint",
      checkpointPath,
      "--output_dir",
      outputDir,
    ],
    onProgress
  );
}

function executePythonScript(jobId: string, args: string[], onProgress?: (msg: string) => void) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(env.PYTHON_BIN, args);
    runningLabellingProcesses.set(jobId, child);

    let stdoutBuffer = "";
    child.stdout.on("data", (chunk) => {
      stdoutBuffer += chunk.toString();
      const lines = stdoutBuffer.split(/\r?\n/);
      stdoutBuffer = lines.pop() ?? "";

      for (const line of lines.map((item) => item.trim()).filter(Boolean)) {
        logLabellingJob(jobId, line);
        onProgress?.(line);
      }
    });

    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      runningLabellingProcesses.delete(jobId);
      const finalLine = stdoutBuffer.trim();
      if (finalLine) {
        logLabellingJob(jobId, finalLine);
        onProgress?.(finalLine);
      }
      if (code === 0) {
        resolve();
        return;
      }
      logLabellingJobError(jobId, `Python script exited with code ${code}.`, stderr.trim());
      reject(new Error(stderr.trim() || `Python script exited with code ${code}`));
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

async function runDiseasePredictionOnly(jobId: string, mission: { name: string; project: { name: string } }, inputRelativePath: string) {
  try {
    logLabellingJob(jobId, `Resuming disease prediction for mission "${mission.name}".`);

    const missionDir = path.join(
      env.STORAGE_ROOT,
      "projects",
      sanitizeName(mission.project.name),
      sanitizeName(mission.name)
    );
    const outputDir = path.join(missionDir, "labelling", jobId);
    ensureDir(outputDir);

    const ndviPath = path.join(outputDir, OUTPUT_FILES.ndviTif);
    const ndrePath = path.join(outputDir, OUTPUT_FILES.ndreTif);
    const labelsPath = path.join(outputDir, OUTPUT_FILES.labelsTif);

    if (!(await fileExists(ndviPath)) || !(await fileExists(ndrePath)) || !(await fileExists(labelsPath))) {
      throw new Error("Required labelling outputs (NDVI/NDRE/labels) are not available for this job.");
    }

    let diseasePrediction: Record<string, unknown> | null = null;
    const configuredCheckpoint = env.DISEASE_MODEL_CHECKPOINT.trim();

    if (!configuredCheckpoint) {
      logLabellingJob(jobId, "Disease prediction skipped because DISEASE_MODEL_CHECKPOINT is not configured.");
      diseasePrediction = { enabled: false, status: "skipped", error: "DISEASE_MODEL_CHECKPOINT is not configured" };
    } else {
      const checkpointPath = path.resolve(configuredCheckpoint);
      if (!(await fileExists(checkpointPath))) {
        logLabellingJob(jobId, `Disease prediction skipped because checkpoint was not found at ${checkpointPath}.`);
        diseasePrediction = { enabled: false, status: "skipped", error: `Checkpoint not found at ${checkpointPath}` };
      } else {
        try {
          logLabellingJob(jobId, `Starting disease prediction with checkpoint ${checkpointPath}.`);
          await executeDiseasePredictionScript(
            `${jobId}:disease`,
            toAbsolutePath(inputRelativePath),
            ndviPath,
            ndrePath,
            labelsPath,
            checkpointPath,
            outputDir,
            (message) => {
              const progress = progressFromMessage(message);
              if (progress == null && !/disease prediction/i.test(message)) return;
              prisma.labellingJob.findUnique({ where: { id: jobId }, select: { stats: true } })
                .then(current => prisma.labellingJob.update({
                  where: { id: jobId },
                  data: { stats: mergeProgressStats(current?.stats, message, progress) as Prisma.InputJsonValue },
                }))
                .catch(err => logLabellingJobError(jobId, "Could not save disease prediction progress to the database.", err));
            }
          );

          const diseaseStatsPath = path.join(outputDir, DISEASE_OUTPUT_FILES.diseasePredictionStats);
          diseasePrediction = await fileExists(diseaseStatsPath)
            ? JSON.parse(await fs.promises.readFile(diseaseStatsPath, "utf8"))
            : { enabled: true, status: "completed" };
        } catch (error) {
          logLabellingJobError(jobId, "Disease prediction failed; keeping labelling outputs available.", error);
          diseasePrediction = { enabled: true, status: "failed", error: error instanceof Error ? error.message : "Unknown disease prediction error" };
        }
      }
    }

    // Always read base stats from the file on disk — the DB copy has already been transformed
    // by serializeStats (relative paths → public URLs) and cannot be safely re-merged.
    const statsPath = path.join(outputDir, OUTPUT_FILES.stats);
    const baseStats = (await fileExists(statsPath))
      ? JSON.parse(await fs.promises.readFile(statsPath, "utf8"))
      : {};

    const outputRelative = Object.fromEntries(
      Object.entries(OUTPUT_FILES).map(([key, filename]) => [key, toRelativePath(path.join(outputDir, filename))])
    ) as Record<keyof typeof OUTPUT_FILES, string>;

    const diseaseOutputRelative = Object.fromEntries(
      Object.entries(DISEASE_OUTPUT_FILES).map(([key, filename]) => [key, toRelativePath(path.join(outputDir, filename))])
    ) as Record<keyof typeof DISEASE_OUTPUT_FILES, string>;

    const copiedDiseaseOutputs = new Set<string>();
    for (const [key, filename] of Object.entries(DISEASE_OUTPUT_FILES)) {
      if (await fileExists(path.join(outputDir, filename))) copiedDiseaseOutputs.add(key);
    }

    // Preserve any existing yield prediction outputs so they aren't lost when disease re-runs
    const yieldOutputRelative = Object.fromEntries(
      Object.entries(YIELD_OUTPUT_FILES).map(([key, filename]) => [key, toRelativePath(path.join(outputDir, filename))])
    ) as Record<keyof typeof YIELD_OUTPUT_FILES, string>;

    const copiedYieldOutputs = new Set<string>();
    for (const [key, filename] of Object.entries(YIELD_OUTPUT_FILES)) {
      if (await fileExists(path.join(outputDir, filename))) copiedYieldOutputs.add(key);
    }

    const yieldStatsPath = path.join(outputDir, YIELD_OUTPUT_FILES.yieldPredictionStats);
    const existingYieldPrediction = (await fileExists(yieldStatsPath))
      ? JSON.parse(await fs.promises.readFile(yieldStatsPath, "utf8"))
      : (baseStats.yieldPrediction ?? null);

    const stats = withoutLabellingModelFallback({
      ...baseStats,
      diseasePrediction,
      yieldPrediction: existingYieldPrediction,
      visualizations: {
        sourceCompositeMapUrl: outputRelative.composite,
        superpixelsMapUrl: outputRelative.superpixels,
        overlayMapUrl: outputRelative.overlay,
        confidenceMapUrl: outputRelative.confidence,
        ndviHistogramUrl: outputRelative.ndviHistogram,
        ndreHistogramUrl: outputRelative.ndreHistogram,
        classDistributionUrl: outputRelative.classDistribution,
        classDistributionPieUrl: outputRelative.classDistributionPie,
        ndviNdreScatterUrl: outputRelative.scatter,
        ...(copiedDiseaseOutputs.has("diseasePredictionMap") ? { diseasePredictionMapUrl: diseaseOutputRelative.diseasePredictionMap } : {}),
        ...(copiedDiseaseOutputs.has("diseasePredictionConfidenceMap") ? { diseasePredictionConfidenceMapUrl: diseaseOutputRelative.diseasePredictionConfidenceMap } : {}),
        ...(copiedDiseaseOutputs.has("diseasePredictionNotebookMap") ? { diseasePredictionNotebookMapUrl: diseaseOutputRelative.diseasePredictionNotebookMap } : {}),
        ...(copiedDiseaseOutputs.has("diseasePredictionGroundTruthMap") ? { diseasePredictionGroundTruthMapUrl: diseaseOutputRelative.diseasePredictionGroundTruthMap } : {}),
        ...(copiedYieldOutputs.has("yieldPredictionHeatmap") ? { yieldPredictionHeatmapUrl: yieldOutputRelative.yieldPredictionHeatmap } : {}),
      },
      artifacts: {
        ndviTifUrl: outputRelative.ndviTif,
        ndreTifUrl: outputRelative.ndreTif,
        labelsTifUrl: outputRelative.labelsTif,
        superpixelsTifUrl: outputRelative.superpixelsTif,
        statisticsJsonUrl: outputRelative.stats,
        datasetSummaryCsvUrl: outputRelative.summaryCsv,
        ...(copiedDiseaseOutputs.has("diseasePredictionTif") ? { diseasePredictionTifUrl: diseaseOutputRelative.diseasePredictionTif } : {}),
        ...(copiedDiseaseOutputs.has("diseasePredictionStats") ? { diseasePredictionStatsJsonUrl: diseaseOutputRelative.diseasePredictionStats } : {}),
        ...(copiedYieldOutputs.has("yieldPredictionStats") ? { yieldPredictionStatsJsonUrl: yieldOutputRelative.yieldPredictionStats } : {}),
      },
    }) as Prisma.InputJsonValue;

    await prisma.labellingJob.update({ where: { id: jobId }, data: { ndviMapUrl: outputRelative.ndvi, ndreMapUrl: outputRelative.ndre, labelMapUrl: outputRelative.labels, stats, status: LabellingJobStatus.COMPLETED } });
    logLabellingJob(jobId, `Disease prediction resume finished for mission "${mission.name}".`);
  } catch (error) {
    logLabellingJobError(jobId, "Disease prediction resume failed.", error);
    await prisma.labellingJob.update({ where: { id: jobId }, data: { status: LabellingJobStatus.FAILED, stats: { error: error instanceof Error ? error.message : "Unknown error" } } });
  }
}

async function runYieldPredictionOnly(jobId: string, mission: { name: string; project: { name: string } }, inputRelativePath: string) {
  try {
    logLabellingJob(jobId, `Resuming yield prediction for mission "${mission.name}".`);

    const missionDir = path.join(
      env.STORAGE_ROOT,
      "projects",
      sanitizeName(mission.project.name),
      sanitizeName(mission.name)
    );
    const outputDir = path.join(missionDir, "labelling", jobId);
    ensureDir(outputDir);

    const configuredCheckpoint = env.YIELD_MODEL_CHECKPOINT.trim();

    let yieldPrediction: Record<string, unknown> | null = null;
    if (!configuredCheckpoint) {
      logLabellingJob(jobId, "Yield prediction skipped because YIELD_MODEL_CHECKPOINT is not configured.");
      yieldPrediction = { enabled: false, status: "skipped", error: "YIELD_MODEL_CHECKPOINT is not configured" };
    } else {
      const checkpointPath = path.resolve(configuredCheckpoint);
      if (!(await fileExists(checkpointPath))) {
        logLabellingJob(jobId, `Yield prediction skipped because checkpoint was not found at ${checkpointPath}.`);
        yieldPrediction = { enabled: false, status: "skipped", error: `Checkpoint not found at ${checkpointPath}` };
      } else {
        try {
          logLabellingJob(jobId, `Starting yield prediction with checkpoint ${checkpointPath}.`);
          await executeYieldPredictionScript(
            `${jobId}:yield`,
            toAbsolutePath(inputRelativePath),
            checkpointPath,
            outputDir,
            (message) => {
              const progress = progressFromMessage(message);
              if (progress == null && !/yield prediction/i.test(message)) return;
              prisma.labellingJob.findUnique({ where: { id: jobId }, select: { stats: true } })
                .then(current => prisma.labellingJob.update({
                  where: { id: jobId },
                  data: { stats: mergeProgressStats(current?.stats, message, progress) as Prisma.InputJsonValue },
                }))
                .catch(err => logLabellingJobError(jobId, "Could not save yield prediction progress to the database.", err));
            }
          );

          const yieldStatsPath = path.join(outputDir, YIELD_OUTPUT_FILES.yieldPredictionStats);
          yieldPrediction = await fileExists(yieldStatsPath) ? JSON.parse(await fs.promises.readFile(yieldStatsPath, "utf8")) : { enabled: true, status: "completed" };
        } catch (error) {
          logLabellingJobError(jobId, "Yield prediction failed; keeping labelling outputs available.", error);
          yieldPrediction = { enabled: true, status: "failed", error: error instanceof Error ? error.message : "Unknown yield prediction error" };
        }
      }
    }

    const statsPath = path.join(outputDir, OUTPUT_FILES.stats);
    // Always read from file — DB stats are already serialized with public URLs
    const baseStats = (await fileExists(statsPath))
      ? JSON.parse(await fs.promises.readFile(statsPath, "utf8"))
      : {};

    const outputRelative = Object.fromEntries(Object.entries(OUTPUT_FILES).map(([key, filename]) => [key, toRelativePath(path.join(outputDir, filename))])) as Record<keyof typeof OUTPUT_FILES, string>;
    const yieldOutputRelative = Object.fromEntries(Object.entries(YIELD_OUTPUT_FILES).map(([key, filename]) => [key, toRelativePath(path.join(outputDir, filename))])) as Record<keyof typeof YIELD_OUTPUT_FILES, string>;
    const copiedYieldOutputs = new Set<string>();
    for (const [key, filename] of Object.entries(YIELD_OUTPUT_FILES)) {
      if (await fileExists(path.join(outputDir, filename))) copiedYieldOutputs.add(key);
    }

    // Preserve any existing disease prediction outputs so they aren't lost when yield re-runs
    const diseaseOutputRelative = Object.fromEntries(
      Object.entries(DISEASE_OUTPUT_FILES).map(([key, filename]) => [key, toRelativePath(path.join(outputDir, filename))])
    ) as Record<keyof typeof DISEASE_OUTPUT_FILES, string>;

    const copiedDiseaseOutputs = new Set<string>();
    for (const [key, filename] of Object.entries(DISEASE_OUTPUT_FILES)) {
      if (await fileExists(path.join(outputDir, filename))) copiedDiseaseOutputs.add(key);
    }

    const diseaseStatsPath = path.join(outputDir, DISEASE_OUTPUT_FILES.diseasePredictionStats);
    const existingDiseasePrediction = (await fileExists(diseaseStatsPath))
      ? JSON.parse(await fs.promises.readFile(diseaseStatsPath, "utf8"))
      : (baseStats.diseasePrediction ?? null);

    const stats = withoutLabellingModelFallback({
      ...baseStats,
      yieldPrediction,
      diseasePrediction: existingDiseasePrediction,
      visualizations: {
        sourceCompositeMapUrl: outputRelative.composite,
        superpixelsMapUrl: outputRelative.superpixels,
        overlayMapUrl: outputRelative.overlay,
        confidenceMapUrl: outputRelative.confidence,
        ndviHistogramUrl: outputRelative.ndviHistogram,
        ndreHistogramUrl: outputRelative.ndreHistogram,
        classDistributionUrl: outputRelative.classDistribution,
        classDistributionPieUrl: outputRelative.classDistributionPie,
        ndviNdreScatterUrl: outputRelative.scatter,
        ...(copiedDiseaseOutputs.has("diseasePredictionMap") ? { diseasePredictionMapUrl: diseaseOutputRelative.diseasePredictionMap } : {}),
        ...(copiedDiseaseOutputs.has("diseasePredictionConfidenceMap") ? { diseasePredictionConfidenceMapUrl: diseaseOutputRelative.diseasePredictionConfidenceMap } : {}),
        ...(copiedDiseaseOutputs.has("diseasePredictionNotebookMap") ? { diseasePredictionNotebookMapUrl: diseaseOutputRelative.diseasePredictionNotebookMap } : {}),
        ...(copiedDiseaseOutputs.has("diseasePredictionGroundTruthMap") ? { diseasePredictionGroundTruthMapUrl: diseaseOutputRelative.diseasePredictionGroundTruthMap } : {}),
        ...(copiedYieldOutputs.has("yieldPredictionHeatmap") ? { yieldPredictionHeatmapUrl: yieldOutputRelative.yieldPredictionHeatmap } : {}),
      },
      artifacts: {
        ndviTifUrl: outputRelative.ndviTif,
        ndreTifUrl: outputRelative.ndreTif,
        labelsTifUrl: outputRelative.labelsTif,
        superpixelsTifUrl: outputRelative.superpixelsTif,
        statisticsJsonUrl: outputRelative.stats,
        datasetSummaryCsvUrl: outputRelative.summaryCsv,
        ...(copiedDiseaseOutputs.has("diseasePredictionTif") ? { diseasePredictionTifUrl: diseaseOutputRelative.diseasePredictionTif } : {}),
        ...(copiedDiseaseOutputs.has("diseasePredictionStats") ? { diseasePredictionStatsJsonUrl: diseaseOutputRelative.diseasePredictionStats } : {}),
        ...(copiedYieldOutputs.has("yieldPredictionStats") ? { yieldPredictionStatsJsonUrl: yieldOutputRelative.yieldPredictionStats } : {}),
      },
    }) as Prisma.InputJsonValue;

    await prisma.labellingJob.update({ where: { id: jobId }, data: { ndviMapUrl: outputRelative.ndvi, ndreMapUrl: outputRelative.ndre, labelMapUrl: outputRelative.labels, stats, status: LabellingJobStatus.COMPLETED } });
    logLabellingJob(jobId, `Yield prediction resume finished for mission "${mission.name}".`);
  } catch (error) {
    logLabellingJobError(jobId, "Yield prediction resume failed.", error);
    await prisma.labellingJob.update({ where: { id: jobId }, data: { status: LabellingJobStatus.FAILED, stats: { error: error instanceof Error ? error.message : "Unknown error" } } });
  }
}

export async function startDiseasePrediction(missionId: string, userId: string) {
  const mission = await assertMissionAccess(missionId, userId);
  const job = await prisma.labellingJob.findFirst({ where: { missionId }, include: { orthomosaic: true }, orderBy: { createdAt: "desc" } });
  if (!job) {
    const err = new Error("No labelling job found") as Error & { statusCode: number };
    err.statusCode = 404;
    throw err;
  }

  // Set PROCESSING so the frontend's refetchInterval kicks in and polls for completion
  const updatedJob = await prisma.labellingJob.update({
    where: { id: job.id },
    data: {
      status: LabellingJobStatus.PROCESSING,
      stats: mergeProgressStats(job.stats, "Starting disease prediction...") as Prisma.InputJsonValue,
    },
    include: { orthomosaic: true },
  });
  void runDiseasePredictionOnly(job.id, mission, job.orthomosaic.relativePath);
  return serializeJob(updatedJob);
}

export async function startYieldPrediction(missionId: string, userId: string) {
  const mission = await assertMissionAccess(missionId, userId);
  const job = await prisma.labellingJob.findFirst({ where: { missionId }, include: { orthomosaic: true }, orderBy: { createdAt: "desc" } });
  if (!job) {
    const err = new Error("No labelling job found") as Error & { statusCode: number };
    err.statusCode = 404;
    throw err;
  }

  // Set PROCESSING so the frontend's refetchInterval kicks in and polls for completion
  const updatedJob = await prisma.labellingJob.update({
    where: { id: job.id },
    data: {
      status: LabellingJobStatus.PROCESSING,
      stats: mergeProgressStats(job.stats, "Starting yield prediction...") as Prisma.InputJsonValue,
    },
    include: { orthomosaic: true },
  });
  void runYieldPredictionOnly(job.id, mission, job.orthomosaic.relativePath);
  return serializeJob(updatedJob);
}
