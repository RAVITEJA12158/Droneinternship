import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { errorMiddleware } from "./middleware/error.middleware";

import authRoutes from "./routes/auth.routes";
import projectRoutes from "./routes/project.routes";
import missionRoutes from "./routes/mission.routes";
import fileRoutes from "./routes/file.routes";
import captureSetRoutes from "./routes/captureSet.routes";
import orthomosaicRoutes from "./routes/orthomosaic.routes";
import exportRoutes from "./routes/export.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import searchRoutes from "./routes/search.routes";

const app = express();

app.use(cors({
  origin: (origin, callback) => {
    // Allows any origin (needed for local LAN IP access on custom networks)
    callback(null, true);
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(env.COOKIE_SECRET));

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api", missionRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/capture-sets", captureSetRoutes);
app.use("/api/orthomosaics", orthomosaicRoutes);
app.use("/api/exports", exportRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/search", searchRoutes);

app.use(errorMiddleware);

export default app;
