import { Router } from "express";
import { stats } from "../controllers/dashboard.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();
router.use(authMiddleware);
router.get("/stats", stats);

export default router;
