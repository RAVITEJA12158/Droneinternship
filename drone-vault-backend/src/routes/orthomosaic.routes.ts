import { Router } from "express";
import * as ctrl from "../controllers/orthomosaic.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();
router.use(authMiddleware);

router.delete("/:id", ctrl.remove);

export default router;
