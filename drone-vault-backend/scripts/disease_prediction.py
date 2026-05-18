#!/usr/bin/env python3
import argparse
import json
import os
from typing import Dict, List, Tuple

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import numpy as np
import rasterio
import torch
from matplotlib.colors import BoundaryNorm, ListedColormap
from timm import create_model


CLASS_INFO: Dict[int, Tuple[str, Tuple[float, float, float], str]] = {
    0: ("Background/Water", (0.05, 0.12, 0.34), "#0f3b82"),
    1: ("Healthy Crop", (0.0, 0.62, 0.26), "#009e42"),
    2: ("Stressed Crop", (0.95, 0.82, 0.18), "#f2d12f"),
    3: ("Diseased Crop", (0.86, 0.16, 0.12), "#dc291f"),
    4: ("Bare Soil", (0.55, 0.28, 0.08), "#8c4714"),
}
NODATA_VALUE = 255
EPSILON = 1e-6


def read_raster(path: str) -> Tuple[np.ndarray, dict]:
    with rasterio.open(path) as src:
        arr = src.read().astype(np.float32)
        profile = src.profile.copy()
    return arr, profile


def normalize_channels(image: np.ndarray) -> np.ndarray:
    image = image.astype(np.float32, copy=True)
    for channel_idx in range(image.shape[0]):
        channel = image[channel_idx]
        valid = channel[np.isfinite(channel)]
        if valid.size == 0:
            image[channel_idx] = np.zeros_like(channel, dtype=np.float32)
            continue

        low = float(np.nanpercentile(valid, 2))
        high = float(np.nanpercentile(valid, 98))
        if not np.isfinite(low) or not np.isfinite(high) or (high - low) < EPSILON:
            image[channel_idx] = np.zeros_like(channel, dtype=np.float32)
            continue

        normalized = np.clip((channel - low) / (high - low + EPSILON), 0.0, 1.0)
        image[channel_idx] = np.nan_to_num(normalized, nan=0.0, posinf=1.0, neginf=0.0)
    return image


def standardize_multispectral(multi: np.ndarray, target_bands: int) -> np.ndarray:
    channels, height, width = multi.shape
    if channels == target_bands:
        return multi
    if channels < target_bands:
        padding = np.zeros((target_bands - channels, height, width), dtype=multi.dtype)
        return np.vstack([multi, padding])
    return multi[:target_bands]


def compute_positions(length: int, patch_size: int, stride: int) -> List[int]:
    if length <= patch_size:
        return [0]

    positions = list(range(0, length - patch_size + 1, stride))
    if positions[-1] != length - patch_size:
        positions.append(length - patch_size)
    return positions


def pad_image(image: np.ndarray, min_height: int, min_width: int) -> np.ndarray:
    _, height, width = image.shape
    pad_height = max(0, min_height - height)
    pad_width = max(0, min_width - width)
    if pad_height == 0 and pad_width == 0:
        return image
    return np.pad(image, ((0, 0), (0, pad_height), (0, pad_width)), mode="constant", constant_values=0)


def load_checkpoint(path: str, device: torch.device) -> dict:
    checkpoint = torch.load(path, map_location=device)
    if "model_state_dict" not in checkpoint:
        raise ValueError("Checkpoint is missing model_state_dict")
    if "model_name" not in checkpoint:
        raise ValueError("Checkpoint is missing model_name")
    if "num_classes" not in checkpoint:
        raise ValueError("Checkpoint is missing num_classes")
    if "label_map" not in checkpoint:
        raise ValueError("Checkpoint is missing label_map")
    return checkpoint


def build_model(checkpoint: dict, in_chans: int, device: torch.device) -> torch.nn.Module:
    model = create_model(
        checkpoint["model_name"],
        pretrained=False,
        in_chans=in_chans,
        num_classes=int(checkpoint["num_classes"]),
    ).to(device)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()
    return model


def save_geotiff(profile: dict, array: np.ndarray, path: str, dtype: str, nodata: int = NODATA_VALUE) -> None:
    out_profile = profile.copy()
    out_profile.update(dtype=dtype, count=1, compress="lzw", nodata=nodata)
    with rasterio.open(path, "w", **out_profile) as dst:
        dst.write(array.astype(dtype), 1)


def save_prediction_map(prediction_map: np.ndarray, path: str) -> None:
    display = np.ma.array(prediction_map, mask=(prediction_map == NODATA_VALUE))
    classes = sorted(int(value) for value in np.unique(prediction_map) if int(value) in CLASS_INFO)
    if not classes:
        classes = list(CLASS_INFO.keys())

    cmap = ListedColormap([CLASS_INFO[class_id][1] for class_id in classes])
    cmap.set_bad((0.85, 0.85, 0.85, 1.0))
    bounds = [class_id - 0.5 for class_id in classes] + [classes[-1] + 0.5]
    norm = BoundaryNorm(bounds, cmap.N)

    plt.figure(figsize=(10, 10))
    plt.imshow(display, cmap=cmap, norm=norm, interpolation="nearest")
    plt.axis("off")
    plt.tight_layout()
    plt.savefig(path, dpi=180, bbox_inches="tight", pad_inches=0.02)
    plt.close()


def save_confidence_map(confidence_map: np.ndarray, path: str) -> None:
    plt.figure(figsize=(10, 10))
    plt.imshow(confidence_map, cmap="viridis", vmin=0.0, vmax=1.0)
    plt.colorbar(label="Prediction Confidence", fraction=0.046, pad=0.04)
    plt.axis("off")
    plt.tight_layout()
    plt.savefig(path, dpi=180, bbox_inches="tight", pad_inches=0.02)
    plt.close()


def summarize_classes(prediction_map: np.ndarray) -> Dict[str, Dict[str, float]]:
    valid = prediction_map != NODATA_VALUE
    total = int(np.sum(valid))
    summary: Dict[str, Dict[str, float]] = {}

    for class_id, (name, _rgb, hex_color) in CLASS_INFO.items():
        count = int(np.sum(prediction_map == class_id))
        summary[str(class_id)] = {
            "id": class_id,
            "name": name,
            "color": hex_color,
            "pixels": count,
            "percentage": float((count / total) * 100) if total else 0.0,
        }

    uncertain = int(np.sum(prediction_map == NODATA_VALUE))
    summary[str(NODATA_VALUE)] = {
        "id": NODATA_VALUE,
        "name": "Uncertain",
        "color": "#ffffff",
        "pixels": uncertain,
        "percentage": float((uncertain / prediction_map.size) * 100) if prediction_map.size else 0.0,
    }
    return summary


def process(args: argparse.Namespace) -> None:
    print("7/8 Loading disease prediction model...", flush=True)
    os.makedirs(args.output_dir, exist_ok=True)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    checkpoint = load_checkpoint(args.checkpoint, device)

    patch_size = int(checkpoint.get("patch_size", args.patch_size))
    stride = args.stride if args.stride and args.stride > 0 else patch_size

    print("7/8 Reading orthomosaic and derived index rasters...", flush=True)
    multispectral, profile = read_raster(args.input_tif)
    ndvi, _ = read_raster(args.ndvi_tif)
    ndre, _ = read_raster(args.ndre_tif)

    multispectral = standardize_multispectral(multispectral, args.target_multispectral_bands)
    image = np.vstack([multispectral, ndvi[:1], ndre[:1]])
    image = normalize_channels(image)

    original_height = image.shape[1]
    original_width = image.shape[2]
    image = pad_image(image, patch_size, patch_size)

    model_in_chans = int(checkpoint.get("in_chans", image.shape[0]))
    if model_in_chans != image.shape[0]:
        raise ValueError(
            f"Checkpoint expects {model_in_chans} input channels, but prepared image has {image.shape[0]}"
        )

    model = build_model(checkpoint, model_in_chans, device)
    inv_label_map = {int(new_id): int(old_id) for old_id, new_id in checkpoint["label_map"].items()}
    num_classes = int(checkpoint["num_classes"])

    y_positions = compute_positions(image.shape[1], patch_size, stride)
    x_positions = compute_positions(image.shape[2], patch_size, stride)
    tile_positions = [(y, x) for y in y_positions for x in x_positions]
    total_tiles = len(tile_positions)

    pred_encoded_map = np.full((image.shape[1], image.shape[2]), -1, dtype=np.int16)
    confidence_map = np.zeros((image.shape[1], image.shape[2]), dtype=np.float32)
    coverage_map = np.zeros((image.shape[1], image.shape[2]), dtype=np.uint16)

    print(
        f"7/8 Disease prediction: processed 0/{total_tiles} tiles",
        flush=True,
    )

    with torch.no_grad():
        for batch_start in range(0, total_tiles, args.batch_size):
            batch_positions = tile_positions[batch_start:batch_start + args.batch_size]
            patches = [
                image[:, y:y + patch_size, x:x + patch_size]
                for y, x in batch_positions
            ]
            inputs = torch.from_numpy(np.stack(patches)).to(device=device, dtype=torch.float32)
            logits = model(inputs)
            probabilities = torch.softmax(logits, dim=1).cpu().numpy()

            for batch_idx, (y, x) in enumerate(batch_positions):
                patch_probs = probabilities[batch_idx]
                pred_encoded = int(np.argmax(patch_probs))
                pred_confidence = float(np.max(patch_probs))
                current_confidence = confidence_map[y:y + patch_size, x:x + patch_size]
                update_mask = pred_confidence >= current_confidence
                pred_encoded_map[y:y + patch_size, x:x + patch_size][update_mask] = pred_encoded
                confidence_map[y:y + patch_size, x:x + patch_size][update_mask] = pred_confidence
                coverage_map[y:y + patch_size, x:x + patch_size] += 1

            processed = min(batch_start + len(batch_positions), total_tiles)
            print(
                f"7/8 Disease prediction: processed {processed}/{total_tiles} tiles",
                flush=True,
            )

    prediction_map = np.full(pred_encoded_map.shape, NODATA_VALUE, dtype=np.uint8)
    for encoded_id, original_id in inv_label_map.items():
        prediction_map[pred_encoded_map == encoded_id] = original_id

    if args.prediction_threshold > 0:
        prediction_map[confidence_map < args.prediction_threshold] = NODATA_VALUE

    prediction_map[coverage_map == 0] = NODATA_VALUE
    prediction_map = prediction_map[:original_height, :original_width]
    confidence_map = confidence_map[:original_height, :original_width]
    coverage_map = coverage_map[:original_height, :original_width]

    prediction_tif_path = os.path.join(args.output_dir, "disease_prediction.tif")
    prediction_png_path = os.path.join(args.output_dir, "disease_prediction.png")
    confidence_png_path = os.path.join(args.output_dir, "disease_prediction_confidence.png")
    stats_path = os.path.join(args.output_dir, "disease_prediction_statistics.json")

    print("8/8 Writing disease prediction outputs...", flush=True)
    save_geotiff(profile, prediction_map, prediction_tif_path, "uint8")
    save_prediction_map(prediction_map, prediction_png_path)
    save_confidence_map(confidence_map, confidence_png_path)

    valid_confidence = confidence_map[prediction_map != NODATA_VALUE]
    stats = {
        "enabled": True,
        "status": "completed",
        "model_name": checkpoint["model_name"],
        "checkpoint_name": os.path.basename(args.checkpoint),
        "device": str(device),
        "patch_size": patch_size,
        "stride": stride,
        "batch_size": args.batch_size,
        "target_multispectral_bands": args.target_multispectral_bands,
        "input_channels": image.shape[0],
        "num_tiles": total_tiles,
        "num_classes": num_classes,
        "prediction_threshold": args.prediction_threshold,
        "classes": summarize_classes(prediction_map),
        "average_confidence": float(np.mean(valid_confidence)) if valid_confidence.size else 0.0,
        "min_confidence": float(np.min(valid_confidence)) if valid_confidence.size else 0.0,
        "max_confidence": float(np.max(valid_confidence)) if valid_confidence.size else 0.0,
        "covered_pixels": int(np.sum(coverage_map > 0)),
    }

    with open(stats_path, "w", encoding="utf-8") as handle:
        json.dump(stats, handle, indent=2)

    print("Disease prediction completed successfully!", flush=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run disease prediction after labelling outputs are generated.")
    parser.add_argument("--input_tif", required=True)
    parser.add_argument("--ndvi_tif", required=True)
    parser.add_argument("--ndre_tif", required=True)
    parser.add_argument("--checkpoint", required=True)
    parser.add_argument("--output_dir", required=True)
    parser.add_argument("--target_multispectral_bands", type=int, default=5)
    parser.add_argument("--patch_size", type=int, default=224)
    parser.add_argument("--stride", type=int, default=0)
    parser.add_argument("--batch_size", type=int, default=8)
    parser.add_argument("--prediction_threshold", type=float, default=0.0)
    process(parser.parse_args())


if __name__ == "__main__":
    main()
