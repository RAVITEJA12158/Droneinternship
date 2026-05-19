import app from "./app";
import { env } from "./config/env";
import { ensureDir } from "./config/storage";
import path from "path";

ensureDir(env.STORAGE_ROOT);
ensureDir(path.join(env.STORAGE_ROOT, "projects"));
ensureDir(path.join(env.STORAGE_ROOT, "temp"));

app.listen(env.PORT, "0.0.0.0", () => {
  console.info("");
  console.info(`[server] DroneVault API is listening on http://0.0.0.0:${env.PORT}`);
  console.info("[server] Use your workstation IP address to access it from another device on the LAN.");
  console.info(`[server] Environment: ${env.NODE_ENV}`);
  console.info(`[server] Storage root: ${env.STORAGE_ROOT}`);
  // console.info(`[server] Database query logs: ${process.env.LOG_DATABASE_QUERIES === "true" ? "enabled" : "disabled"}`);
  console.info("");
});
