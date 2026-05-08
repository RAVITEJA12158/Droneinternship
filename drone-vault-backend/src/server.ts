import app from "./app";
import { env } from "./config/env";
import { ensureDir } from "./config/storage";
import path from "path";

// Ensure storage directories exist
ensureDir(env.STORAGE_ROOT);
ensureDir(path.join(env.STORAGE_ROOT, "projects"));
ensureDir(path.join(env.STORAGE_ROOT, "temp"));

// Workers removed — thumbnails and exports now run inline
// No Redis required

app.listen(env.PORT, "0.0.0.0", () => {
  console.log(`\n🚀 DroneVault API running on http://0.0.0.0:${env.PORT}`);
  console.log(`   (LAN Accessible. Access via your Workstation's IP Address)`);
  console.log(`   Environment : ${env.NODE_ENV}`);
  console.log(`   Storage root: ${env.STORAGE_ROOT}\n`);
});
