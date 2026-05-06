import { Worker } from "bullmq";
import { env } from "../../config/env";
import { createZipExport } from "../../services/export.service";

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
    throw new Error(`Unknown export type: ${type}`);
  },
  { connection }
);

worker.on("failed", (job, err) => {
  console.error(`Export job ${job?.id} failed:`, err.message);
});

console.log("Export worker started");
export default worker;
