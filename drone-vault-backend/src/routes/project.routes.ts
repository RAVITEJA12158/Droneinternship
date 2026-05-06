import { Router } from "express";
import * as ctrl from "../controllers/project.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { createProjectSchema, updateProjectSchema } from "../validations/project.schema";

const router = Router();
router.use(authMiddleware);

router.get("/", ctrl.list);
router.post("/", validate(createProjectSchema), ctrl.create);
router.get("/:id", ctrl.getOne);
router.patch("/:id", validate(updateProjectSchema), ctrl.update);
router.delete("/:id", ctrl.remove);

export default router;
