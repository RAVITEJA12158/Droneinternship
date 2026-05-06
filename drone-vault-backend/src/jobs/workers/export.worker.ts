import { Worker } from "bullmq";
import { env } from "../../config/env";
import { createZipExport, exportJson } from "../../services/export.service";
import path from "path";
import fs from "fs";

const connection = {
  host: new URL(env.REDIS_URL).hostname,
  port: parseInt(new URL(env.REDIS_URL).port || "6379"),
};

const worker = new Worker(
  "export",
  async (job) => {
    const { missionId, projectId, type } = job.data;
    if (type === "zip") {
      const outPath = await createZipExport(missionId, projectId);
      return { outPath };
    }
    if (type === "json") {
      // exportJson requires userId — for background job we retrieve it via the mission
      const data = await exportJson(missionId, ""); // userId "" skips ownership check in worker context
      const exportDir = path.join(env.STORAGE_ROOT, "projects", projectId, missionId, "exports");
      fs.mkdirSync(exportDir, { recursive: true });
      const outPath = path.join(exportDir, `mission_${missionId}_${Date.now()}.json`);
      fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
      return { outPath };
    }
    throw new Error(`Unknown export type: ${type}`);
  },
  { connection }
);

worker.on("failed", (job, err) => {
  console.error(`Export job ${job?.id} failed:`, err.message);
});

console.log("Export worker started");
export default worker;
