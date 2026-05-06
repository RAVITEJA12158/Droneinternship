import multer, { StorageEngine } from "multer";
import path from "path";
import fs from "fs";
import { TEMP_DIR } from "../config/storage";
import { Request } from "express";

function tempStorage(subDir: string): StorageEngine {
  const dest = path.join(TEMP_DIR, subDir);
  fs.mkdirSync(dest, { recursive: true });
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      fs.mkdirSync(dest, { recursive: true });
      cb(null, dest);
    },
    filename: (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      cb(null, `${unique}-${file.originalname}`);
    },
  });
}

function extensionFilter(exts: string[]) {
  return (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (exts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed: ${exts.join(", ")}`));
    }
  };
}

export const rgbUpload = multer({
  storage: tempStorage("rgb"),
  fileFilter: extensionFilter([".jpg", ".jpeg"]),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB per file
});

export const multispectralUpload = multer({
  storage: tempStorage("multispectral"),
  fileFilter: extensionFilter([".tif", ".tiff"]),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB per file
});

export const planUpload = multer({
  storage: tempStorage("plan"),
  fileFilter: extensionFilter([".plan", ".json", ".waypoints", ".kml", ".kmz"]),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

export const orthomosaicUpload = multer({
  storage: tempStorage("orthomosaic"),
  fileFilter: extensionFilter([".tif", ".tiff", ".jpg", ".jpeg"]),
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2GB
});
