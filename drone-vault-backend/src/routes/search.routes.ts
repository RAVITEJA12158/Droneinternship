import { Router } from "express";
import { searchAll } from "../controllers/search.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();
router.use(authMiddleware);
router.get("/", searchAll);

export default router;
