import { Queue } from "bullmq";
import { env } from "../config/env";

const connection = { host: new URL(env.REDIS_URL).hostname, port: parseInt(new URL(env.REDIS_URL).port || "6379") };

export const thumbnailQueue = new Queue("thumbnail", { connection });
export const exportQueue = new Queue("export", { connection });
