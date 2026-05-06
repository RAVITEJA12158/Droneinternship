import app from "./app";
import { env } from "./config/env";
import { ensureDir } from "./config/storage";
import path from "path";

// Ensure storage root exists
ensureDir(env.STORAGE_ROOT);
ensureDir(path.join(env.STORAGE_ROOT, "projects"));
ensureDir(path.join(env.STORAGE_ROOT, "temp"));

// Start background workers (import to initialise)
import("./jobs/workers/thumbnail.worker");
import("./jobs/workers/export.worker");

app.listen(env.PORT, () => {
  console.log(`\n🚀 DroneVault API running on http://localhost:${env.PORT}`);
  console.log(`   Environment : ${env.NODE_ENV}`);
  console.log(`   Storage root: ${env.STORAGE_ROOT}\n`);
});
