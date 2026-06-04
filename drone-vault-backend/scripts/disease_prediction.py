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
import tifffile as tiff
import torch
from matplotlib.colors import BoundaryNorm, ListedColormap
from timm import create_model


PATCH_SIZE = 224
BATCH_SIZE = 8
IGNORE_LABEL = 255
SEED = 42
NODATA_VALUE = 255
MODEL_NAME = "maxvit_tiny_tf_224"  # Only supported architecture

CLASS_INFO: Dict[int, Tuple[str, Tuple[float, float, float], str]] = {
    0: ("Background/Water", (0.05, 0.12, 0.34), "#0f3b82"),
    1: ("Healthy Crop", (0.0, 0.62, 0.26), "#009e42"),
    2: ("Stressed Crop", (0.95, 0.82, 0.18), "#f2d12f"),
    3: ("Diseased Crop", (0.86, 0.16, 0.12), "#dc291f"),
    4: ("Bare Soil", (0.55, 0.28, 0.08), "#8c4714"),
}


torch.manual_seed(SEED)
np.random.seed(SEED)


def log_step(stage: str, message: str) -> None:
    print(f"[disease-prediction] {stage} | {message}", flush=True)


def load_tif(path: str) -> np.ndarray:
    with rasterio.open(path) as src:
        arr = src.read()

    return arr


def normalize(img: np.ndarray) -> np.ndarray:
    img = img.astype(np.float32)
    for c in range(img.shape[0]):
        p2, p98 = np.percentile(img[c], (2, 98))
        denom = p98 - p2
        if denom < 1e-6:
            img[c] = 0.0
        else:
            img[c] = np.clip((img[c] - p2) / denom, 0.0, 1.0)
    return img


def standardize_multispectral(multi: np.ndarray, target_bands: int = 5) -> np.ndarray:
    C, H, W = multi.shape

    if C == target_bands:
        return multi
    if C < target_bands:
        pad = np.zeros((target_bands - C, H, W), dtype=multi.dtype)
        return np.vstack([multi, pad])
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

import torch.nn as nn


class MaxVitClassifier(nn.Module):
    """
    Matches the architecture the checkpoint was saved from:
        self.backbone = maxvit_tiny_tf_224  (num_classes=0 → feature extractor)
        self.seg_head = nn.Linear(feature_dim, num_classes)
    The checkpoint keys are prefixed with 'backbone.' and 'seg_head.'.
    """
    def __init__(self, in_chans: int, num_classes: int) -> None:
        super().__init__()
        self.backbone = create_model(
            MODEL_NAME,
            pretrained=False,
            in_chans=in_chans,
            num_classes=0,  # remove built-in head → outputs feature vector
        )
        self.seg_head = nn.Linear(self.backbone.num_features, num_classes)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.seg_head(self.backbone(x))


def load_checkpoint(path: str, device):
    ckpt = torch.load(path, map_location=device, weights_only=False)

    # Raw state dict (no wrapper dict) — already has backbone./seg_head. keys
    if not isinstance(ckpt, dict) or "model_state_dict" not in ckpt:
        raw_sd = ckpt if isinstance(ckpt, dict) else {}
        # Detect in_chans from the stem conv weight shape  (out, in, kH, kW)
        stem_key = "backbone.stem.conv1.weight"
        in_chans = int(raw_sd[stem_key].shape[1]) if stem_key in raw_sd else 7
        # Detect num_classes from seg_head weight shape  (num_classes, features)
        head_key = "seg_head.weight"
        num_classes = int(raw_sd[head_key].shape[0]) if head_key in raw_sd else 5
        return {
            "model_name": MODEL_NAME,
            "model_state_dict": raw_sd,
            "num_classes": num_classes,
            "label_map": {i: i for i in range(num_classes)},
            "in_chans": in_chans,
            "patch_size": 224,
        }

    # Wrapped dict — enforce MaxViT and auto-detect shape metadata
    sd = ckpt["model_state_dict"]
    stem_key = "backbone.stem.conv1.weight"
    head_key = "seg_head.weight"
    in_chans = int(sd[stem_key].shape[1]) if stem_key in sd else int(ckpt.get("in_chans", 7))
    num_classes = int(sd[head_key].shape[0]) if head_key in sd else int(ckpt.get("num_classes", 5))

    ckpt["model_name"] = MODEL_NAME
    ckpt["in_chans"] = in_chans
    ckpt["num_classes"] = num_classes
    if "label_map" not in ckpt:
        ckpt["label_map"] = {i: i for i in range(num_classes)}
    return ckpt


def build_geotiff_profile(profile: dict, array: np.ndarray, dtype: str, nodata: int) -> dict:
    out_profile = profile.copy()
    out_profile.update(
        driver="GTiff",
        dtype=dtype,
        count=1,
        compress="lzw",
        nodata=nodata,
        height=array.shape[0],
        width=array.shape[1],
    )
    out_profile.pop("blockysize", None)
    out_profile.pop("blockxsize", None)
    out_profile.pop("tiled", None)
    return out_profile


def save_geotiff(profile: dict, array: np.ndarray, path: str, dtype: str, nodata: int = NODATA_VALUE) -> None:
    out_profile = build_geotiff_profile(profile, array, dtype, nodata)
    with rasterio.open(path, "w", **out_profile) as dst:
        dst.write(array.astype(dtype), 1)


def save_label_png(label_map: np.ndarray, path: str, title: str | None = None) -> None:
    display = np.ma.array(label_map, mask=(label_map == NODATA_VALUE))
    classes = sorted(int(value) for value in np.unique(label_map) if int(value) in CLASS_INFO)
    if not classes:
        classes = list(CLASS_INFO.keys())

    cmap = ListedColormap([CLASS_INFO[class_id][1] for class_id in classes])
    cmap.set_bad((0.85, 0.85, 0.85, 1.0))
    bounds = [class_id - 0.5 for class_id in classes] + [classes[-1] + 0.5]
    norm = BoundaryNorm(bounds, cmap.N)

    plt.figure(figsize=(10, 10))
    plt.imshow(display, cmap=cmap, norm=norm, interpolation="nearest")
    if title:
        plt.title(title)
    plt.axis("off")
    plt.tight_layout()
    plt.savefig(path, dpi=180, bbox_inches="tight", pad_inches=0.02)
    plt.close()


def save_confidence_map(confidence_map: np.ndarray, path: str, pred_label: np.ndarray | None = None) -> None:
    display = confidence_map.copy().astype(np.float32)
    if pred_label is not None:
        display = np.ma.array(display, mask=(pred_label == NODATA_VALUE))

    plt.figure(figsize=(10, 10))
    plt.imshow(display, cmap="viridis", vmin=0.0, vmax=1.0)
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
        "name": "Uncertain / No Data",
        "color": "#d3d3d3",
        "pixels": uncertain,
        "percentage": float((uncertain / prediction_map.size) * 100) if prediction_map.size else 0.0,
    }
    return summary


def process(args: argparse.Namespace) -> None:
    log_step("7/8", f"Loading trained checkpoint from {args.checkpoint}")
    os.makedirs(args.output_dir, exist_ok=True)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    checkpoint = load_checkpoint(args.checkpoint, device)

    patch_size = int(checkpoint.get("patch_size", args.patch_size or PATCH_SIZE))
    stride = args.stride if args.stride and args.stride > 0 else patch_size

    log_step("7/8", "Reading multispectral, NDVI, and NDRE TIFFs")
    with rasterio.open(args.input_tif) as src:
        profile = src.profile.copy()

    multi = load_tif(args.input_tif)
    multi = standardize_multispectral(multi, target_bands=args.target_multispectral_bands)
    ndvi = load_tif(args.ndvi_tif)
    ndre = load_tif(args.ndre_tif)

    image = normalize(np.vstack([multi, ndvi[:1], ndre[:1]]))
    original_height = image.shape[1]
    original_width = image.shape[2]

    gt_label = None
    if args.labels_tif:
        gt_label = load_tif(args.labels_tif)[0]
        original_height = min(original_height, gt_label.shape[0])
        original_width = min(original_width, gt_label.shape[1])

    image = image[:, :original_height, :original_width]
    image = pad_image(image, patch_size, patch_size)
    height = image.shape[1]
    width = image.shape[2]

    num_classes = int(checkpoint["num_classes"])
    label_map = checkpoint["label_map"]
    inv_label_map = {int(v): int(k) for k, v in label_map.items()}
    in_chans = int(checkpoint.get("in_chans", image.shape[0]))

    if in_chans != image.shape[0]:
        raise ValueError(f"Checkpoint expects {in_chans} input channels, but prepared image has {image.shape[0]}")

    # Build the wrapper that matches the checkpoint (backbone + seg_head)
    model = MaxVitClassifier(in_chans=in_chans, num_classes=num_classes).to(device)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    y_positions = compute_positions(height, patch_size, stride)
    x_positions = compute_positions(width, patch_size, stride)
    tile_positions = [(y, x) for y in y_positions for x in x_positions]
    total_tiles = len(tile_positions)

    votes = np.zeros((num_classes, height, width), dtype=np.uint32)
    confidence_sum = np.zeros((height, width), dtype=np.float64)
    coverage = np.zeros((height, width), dtype=np.uint32)

    log_step("7/8", f"Disease prediction: processed 0/{total_tiles} tiles")

    with torch.no_grad():
        for batch_start in range(0, total_tiles, args.batch_size):
            batch_positions = tile_positions[batch_start:batch_start + args.batch_size]
            patches = [
                image[:, i:i + patch_size, j:j + patch_size]
                for i, j in batch_positions
            ]
            patch_tensor = torch.tensor(np.stack(patches), dtype=torch.float32).to(device)
            probabilities = torch.softmax(model(patch_tensor), dim=1).cpu().numpy()

            if probabilities.ndim == 2:
                for batch_idx, (i, j) in enumerate(batch_positions):
                    pred = int(np.argmax(probabilities[batch_idx]))
                    confidence = float(np.max(probabilities[batch_idx]))
                    votes[pred, i:i + patch_size, j:j + patch_size] += 1
                    confidence_sum[i:i + patch_size, j:j + patch_size] += confidence
                    coverage[i:i + patch_size, j:j + patch_size] += 1
            elif probabilities.ndim == 4:
                for batch_idx, (i, j) in enumerate(batch_positions):
                    patch_probs = probabilities[batch_idx]
                    patch_pred = np.argmax(patch_probs, axis=0)
                    patch_confidence = np.max(patch_probs, axis=0)

                    for class_id in range(num_classes):
                        votes[class_id, i:i + patch_size, j:j + patch_size] += (
                            patch_pred == class_id
                        ).astype(np.uint32)
                    confidence_sum[i:i + patch_size, j:j + patch_size] += patch_confidence
                    coverage[i:i + patch_size, j:j + patch_size] += 1
            else:
                raise ValueError(f"Unexpected model output shape: {probabilities.shape}")

            processed = min(batch_start + len(batch_positions), total_tiles)
            log_step("7/8", f"Disease prediction: processed {processed}/{total_tiles} tiles")

    pred_encoded = np.argmax(votes, axis=0)
    pred_label = np.full(pred_encoded.shape, NODATA_VALUE, dtype=np.uint8)

    for new_id, old_id in inv_label_map.items():
        pred_label[pred_encoded == new_id] = old_id if old_id in CLASS_INFO else NODATA_VALUE

    confidence_map = np.divide(
        confidence_sum,
        coverage,
        out=np.zeros_like(confidence_sum, dtype=np.float64),
        where=coverage > 0,
    ).astype(np.float32)

    if args.prediction_threshold > 0:
        pred_label[confidence_map < args.prediction_threshold] = NODATA_VALUE

    pred_label[coverage == 0] = NODATA_VALUE
    pred_label = pred_label[:original_height, :original_width]
    confidence_map = confidence_map[:original_height, :original_width]
    coverage = coverage[:original_height, :original_width]

    prediction_tif_path = os.path.join(args.output_dir, "disease_prediction.tif")
    prediction_png_path = os.path.join(args.output_dir, "disease_prediction.png")
    confidence_png_path = os.path.join(args.output_dir, "disease_prediction_confidence.png")
    stats_path = os.path.join(args.output_dir, "disease_prediction_statistics.json")
    predicted_map_path = os.path.join(args.output_dir, "predicted_map.png")
    ground_truth_path = os.path.join(args.output_dir, "ground_truth.png")

    log_step("8/8", f"Writing predicted map outputs to {args.output_dir}")
    save_geotiff(profile, pred_label, prediction_tif_path, "uint8")
    save_label_png(pred_label, prediction_png_path, "Predicted Classification")
    save_label_png(pred_label, predicted_map_path, "Predicted Classification")
    save_confidence_map(confidence_map, confidence_png_path, pred_label=pred_label)

    if gt_label is not None:
        gt_vis = gt_label[:original_height, :original_width].copy()
        gt_vis[gt_vis == IGNORE_LABEL] = 0
        save_label_png(gt_vis.astype(np.uint8), ground_truth_path, "Ground Truth")

    valid_confidence = confidence_map[pred_label != NODATA_VALUE]
    stats = {
        "enabled": True,
        "status": "completed",
        "source": "updatedallinone.ipynb",
        "model_name": MODEL_NAME,
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
        "classes": summarize_classes(pred_label),
        "confidence": {
            "mean": float(np.mean(valid_confidence)) if valid_confidence.size else 0.0,
            "min": float(np.min(valid_confidence)) if valid_confidence.size else 0.0,
            "max": float(np.max(valid_confidence)) if valid_confidence.size else 0.0,
            "std": float(np.std(valid_confidence)) if valid_confidence.size else 0.0,
        },
        "average_confidence": float(np.mean(valid_confidence)) if valid_confidence.size else 0.0,
        "min_confidence": float(np.min(valid_confidence)) if valid_confidence.size else 0.0,
        "max_confidence": float(np.max(valid_confidence)) if valid_confidence.size else 0.0,
        "covered_pixels": int(np.sum(coverage > 0)),
        "outputs": {
            "ground_truth": os.path.basename(ground_truth_path) if gt_label is not None else None,
            "predicted_map": os.path.basename(predicted_map_path),
        },
    }

    with open(stats_path, "w", encoding="utf-8") as handle:
        json.dump(stats, handle, indent=2)

    log_step("done", "Disease prediction completed successfully")


def main() -> None:
    parser = argparse.ArgumentParser(description="Run disease prediction after labelling outputs are generated.")
    parser.add_argument("--input_tif", required=True)
    parser.add_argument("--ndvi_tif", required=True)
    parser.add_argument("--ndre_tif", required=True)
    parser.add_argument("--labels_tif")
    parser.add_argument("--checkpoint", required=True)
    parser.add_argument("--output_dir", required=True)
    parser.add_argument("--target_multispectral_bands", type=int, default=5)
    parser.add_argument("--patch_size", type=int, default=PATCH_SIZE)
    parser.add_argument("--stride", type=int, default=0)
    parser.add_argument("--batch_size", type=int, default=BATCH_SIZE)
    parser.add_argument("--prediction_threshold", type=float, default=0.0)
    process(parser.parse_args())


if __name__ == "__main__":
    main()
