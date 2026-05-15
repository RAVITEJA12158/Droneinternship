import { Router } from "express";
import * as ctrl from "../controllers/mission.controller";
import * as fileCtrl from "../controllers/file.controller";
import * as csCtrl from "../controllers/captureSet.controller";
import * as orthoCtrl from "../controllers/orthomosaic.controller";
import * as exportCtrl from "../controllers/export.controller";
import * as uploadCtrl from "../controllers/upload.controller";
import * as labellingCtrl from "../controllers/labelling.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { createMissionSchema, updateMissionSchema } from "../validations/mission.schema";
import { rgbUpload, multispectralUpload, planUpload, orthomosaicUpload } from "../lib/multer";

const router = Router();
router.use(authMiddleware);

// Missions under projects
router.get("/projects/:projectId/missions", ctrl.list);
router.post("/projects/:projectId/missions", validate(createMissionSchema), ctrl.create);

// Mission CRUD
router.get("/missions/:id", ctrl.getOne);
router.patch("/missions/:id", validate(updateMissionSchema), ctrl.update);
router.delete("/missions/:id", ctrl.remove);

// Upload
router.post("/missions/:id/upload/rgb", rgbUpload.array("files"), uploadCtrl.uploadRgb);
router.post("/missions/:id/upload/multispectral", multispectralUpload.array("files"), uploadCtrl.uploadMultispectral);
router.post("/missions/:id/upload/plan", planUpload.single("plan"), uploadCtrl.uploadPlan);
router.post("/missions/:id/upload/orthomosaic", orthomosaicUpload.fields([
  { name: "rgb", maxCount: 1 },
  { name: "multispectral", maxCount: 1 },
  { name: "ndvi", maxCount: 1 },
  { name: "dsm", maxCount: 1 },
]), uploadCtrl.uploadOrthomosaic);

// Files
router.get("/missions/:id/files", fileCtrl.list);

// Capture sets
router.get("/missions/:id/capture-sets", csCtrl.list);

// Orthomosaics
router.get("/missions/:id/orthomosaics", orthoCtrl.list);

// Labelling
router.get("/missions/:id/labelling", labellingCtrl.getOne);
router.post("/missions/:id/labelling/start", labellingCtrl.start);
router.post("/missions/:id/labelling/stop", labellingCtrl.stop);
router.get("/labelling/maps", labellingCtrl.map);

// Exports
router.post("/missions/:id/export/zip", exportCtrl.exportZip);
router.post("/missions/:id/export/pdf", exportCtrl.exportPdf);
router.post("/missions/:id/export/json", exportCtrl.exportJson);

export default router;
