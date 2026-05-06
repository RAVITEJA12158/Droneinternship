import { Router } from "express";
import * as ctrl from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { registerSchema, loginSchema } from "../validations/auth.schema";

const router = Router();

router.post("/register", validate(registerSchema), ctrl.register);
router.post("/login", validate(loginSchema), ctrl.login);
router.post("/logout", ctrl.logout);
router.get("/me", authMiddleware, ctrl.me);

export default router;
