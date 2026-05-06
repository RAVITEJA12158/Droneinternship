import { Worker } from "bullmq";
import path from "path";
import { env } from "../../config/env";
import { toAbsolutePath } from "../../config/storage";
import { generateThumbnail, generateMSThumbnail, generateOrthomosaicPreview } from "../../lib/sharp";
import prisma from "../../prisma";

const connection = {
  host: new URL(env.REDIS_URL).hostname,
  port: parseInt(new URL(env.REDIS_URL).port || "6379"),
};

const worker = new Worker(
  "thumbnail",
  async (job) => {
    const { fileId, orthoId, relativePath, fileType } = job.data;

    if (orthoId) {
      const abs = toAbsolutePath(relativePath);
      const thumbRelative = path.join(
        path.dirname(relativePath).split("/").slice(0, 4).join("/"),
        "thumbnails",
        `ortho_${orthoId}.jpg`
      );
      const thumbAbs = toAbsolutePath(thumbRelative);
      await generateOrthomosaicPreview(abs, thumbAbs);
      await prisma.orthomosaic.update({ where: { id: orthoId }, data: { previewPath: thumbRelative } });
      return;
    }

    const abs = toAbsolutePath(relativePath);
    const thumbRelative = path.join(
      path.dirname(relativePath).split("/").slice(0, 4).join("/"),
      "thumbnails",
      `${fileId}.jpg`
    );
    const thumbAbs = toAbsolutePath(thumbRelative);

    if (fileType === "MS_TIF") {
      await generateMSThumbnail(abs, thumbAbs);
    } else {
      await generateThumbnail(abs, thumbAbs);
    }
    await prisma.file.update({ where: { id: fileId }, data: { thumbnailPath: thumbRelative } });
  },
  { connection }
);

worker.on("failed", (job, err) => {
  console.error(`Thumbnail job ${job?.id} failed:`, err.message);
});

console.log("Thumbnail worker started");
export default worker;
