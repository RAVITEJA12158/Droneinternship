import { Router } from "express";
import * as ctrl from "../controllers/file.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();
router.use(authMiddleware);

router.get("/:id", ctrl.getOne);
router.get("/:id/thumbnail", ctrl.thumbnail);
router.get("/:id/download", ctrl.download);
router.delete("/:id", ctrl.remove);

export default router;
