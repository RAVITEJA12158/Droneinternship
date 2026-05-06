import { Router } from "express";
import * as ctrl from "../controllers/export.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();
router.use(authMiddleware);

router.get("/:jobId/status", ctrl.jobStatus);
router.get("/:jobId/download", ctrl.downloadExport);

export default router;
