import sharp from "sharp";
import path from "path";
import fs from "fs";

export async function generateThumbnail(
  inputPath: string,
  outputPath: string,
  width = 300,
  height = 200
): Promise<void> {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  await sharp(inputPath)
    .resize(width, height, { fit: "cover", position: "center" })
    .jpeg({ quality: 70 })
    .toFile(outputPath);
}

export async function generateMSThumbnail(
  inputPath: string,
  outputPath: string
): Promise<void> {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  // Extract first band from multispectral TIFF, normalize, convert to JPEG
  await sharp(inputPath, { limitInputPixels: false })
    .extractChannel(0)
    .normalize()
    .resize(300, 200, { fit: "cover" })
    .jpeg({ quality: 70 })
    .toFile(outputPath);
}

export async function generateOrthomosaicPreview(
  inputPath: string,
  outputPath: string
): Promise<void> {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  await sharp(inputPath, { limitInputPixels: false })
    .resize(800, 600, { fit: "inside" })
    .jpeg({ quality: 80 })
    .toFile(outputPath);
}
