import { Router } from "express";
import * as ctrl from "../controllers/captureSet.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();
router.use(authMiddleware);

router.get("/:id", ctrl.getOne);

export default router;
