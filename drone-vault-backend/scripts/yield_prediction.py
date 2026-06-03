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
import torch.nn as nn
import timm


def log_step(stage: str, message: str) -> None:
    print(f"[yield-prediction] {stage} | {message}", flush=True)


class YieldTransformer(nn.Module):
    def __init__(self, max_channels: int):
        super().__init__()
        self.backbone = timm.create_model(
            "vit_base_patch16_224",
            pretrained=False,
            in_chans=max_channels,
            num_classes=0,
        )
        self.head = nn.Sequential(
            nn.Linear(768, 128),
            nn.ReLU(),
            nn.Linear(128, 1),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = nn.functional.interpolate(x, size=(224, 224), mode="bilinear", align_corners=False)
        features = self.backbone(x)
        return self.head(features)


def prepare_patch(patch: np.ndarray, max_channels: int, patch_size: int) -> torch.Tensor:
    tensor = torch.tensor(patch, dtype=torch.float32)
    tensor = torch.clamp(tensor, 0, 10000) / 10000.0
    tensor = torch.nan_to_num(tensor, nan=0.0, posinf=1.0, neginf=0.0)

    if tensor.shape[0] < max_channels:
        pad = torch.zeros(max_channels - tensor.shape[0], patch_size, patch_size)
        tensor = torch.cat([tensor, pad], dim=0)
    else:
        tensor = tensor[:max_channels]

    return tensor


def extract_patches(
    image: np.ndarray,
    patch_size: int,
    max_channels: int,
    ndvi_threshold: float,
) -> Tuple[List[torch.Tensor], List[Tuple[int, int]], int, int]:
    _, height, width = image.shape
    rows = max(0, (height - patch_size) // patch_size + 1)
    cols = max(0, (width - patch_size) // patch_size + 1)
    patches: List[torch.Tensor] = []
    positions: List[Tuple[int, int]] = []

    for row, y in enumerate(range(0, height - patch_size + 1, patch_size)):
        for col, x in enumerate(range(0, width - patch_size + 1, patch_size)):
            patch = image[:, y:y + patch_size, x:x + patch_size]

            if patch.shape[0] >= 4:
                red = patch[2]
                nir = patch[3]
                ndvi = (nir - red) / (nir + red + 1e-6)
                if float(np.nanmean(ndvi)) < ndvi_threshold:
                    continue

            patches.append(prepare_patch(patch, max_channels, patch_size))
            positions.append((row, col))

    return patches, positions, rows, cols


def load_model(checkpoint_path: str, max_channels: int, device: torch.device) -> Tuple[YieldTransformer, Dict[str, float]]:
    model = YieldTransformer(max_channels=max_channels).to(device)
    checkpoint = torch.load(
        checkpoint_path,
        map_location=device,
        weights_only=False,
    )
    state_dict = checkpoint.get("model_state_dict", checkpoint) if isinstance(checkpoint, dict) else checkpoint
    model.load_state_dict(state_dict)
    model.eval()

    metrics: Dict[str, float] = {}
    if isinstance(checkpoint, dict):
        for key in ("mae", "rmse", "r2"):
            value = checkpoint.get(key)
            if isinstance(value, (int, float)):
                metrics[key] = float(value)

    return model, metrics


def save_heatmap(heatmap: np.ndarray, output_path: str, title: str) -> None:
    masked = np.ma.masked_invalid(heatmap)
    plt.figure(figsize=(7, 6))
    plt.imshow(masked, cmap="viridis")
    plt.colorbar(label="Predicted yield (tonnes)")
    plt.title(title)
    plt.tight_layout()
    plt.savefig(output_path, dpi=180)
    plt.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Run ViT yield prediction for a multispectral orthomosaic.")
    parser.add_argument("--input_tif", required=True)
    parser.add_argument("--checkpoint", required=True)
    parser.add_argument("--output_dir", required=True)
    parser.add_argument("--patch_size", type=int, default=64)
    parser.add_argument("--batch_size", type=int, default=8)
    parser.add_argument("--max_channels", type=int, default=10)
    parser.add_argument("--ndvi_threshold", type=float, default=0.2)
    parser.add_argument("--yield_scale", type=float, default=20.0)
    args = parser.parse_args()

    os.makedirs(args.output_dir, exist_ok=True)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    log_step("1/5", f"Loading yield model from {args.checkpoint}")
    model, metrics = load_model(args.checkpoint, args.max_channels, device)

    log_step("2/5", f"Reading multispectral image {os.path.basename(args.input_tif)}")
    with rasterio.open(args.input_tif) as src:
        image = src.read()

    log_step("3/5", "Extracting vegetation patches")
    patches, positions, rows, cols = extract_patches(
        image,
        args.patch_size,
        args.max_channels,
        args.ndvi_threshold,
    )

    if not patches:
        raise RuntimeError("No valid vegetation patches were found for yield prediction")

    heatmap = np.full((rows, cols), np.nan, dtype=np.float32)
    predictions: List[float] = []
    total = len(patches)
    log_step("4/5", f"Yield prediction: processed 0/{total} patches")

    with torch.no_grad():
        for batch_start in range(0, total, args.batch_size):
            batch = torch.stack(patches[batch_start:batch_start + args.batch_size]).to(device)
            output = model(batch).detach().cpu().numpy().reshape(-1)
            output = np.clip(output, 0.0, None) * args.yield_scale

            for value, (row, col) in zip(output, positions[batch_start:batch_start + len(output)]):
                heatmap[row, col] = float(value)
                predictions.append(float(value))

            processed = min(batch_start + len(output), total)
            log_step("4/5", f"Yield prediction: processed {processed}/{total} patches")

    prediction = float(np.mean(predictions))
    heatmap_path = os.path.join(args.output_dir, "yield_prediction_heatmap.png")
    stats_path = os.path.join(args.output_dir, "yield_prediction_statistics.json")

    log_step("5/5", "Saving yield prediction outputs")
    save_heatmap(heatmap, heatmap_path, f"Predicted yield: {prediction:.2f} tonnes")

    stats = {
        "enabled": True,
        "status": "completed",
        "model_name": "vit_base_patch16_224",
        "checkpoint_name": os.path.basename(args.checkpoint),
        "device": str(device),
        "patch_size": args.patch_size,
        "batch_size": args.batch_size,
        "max_channels": args.max_channels,
        "ndvi_threshold": args.ndvi_threshold,
        "yield_scale": args.yield_scale,
        "num_patches": len(predictions),
        "grid_rows": rows,
        "grid_cols": cols,
        "predicted_yield_tonnes": prediction,
        "min_patch_yield_tonnes": float(np.min(predictions)),
        "max_patch_yield_tonnes": float(np.max(predictions)),
        "mean_patch_yield_tonnes": prediction,
        "metrics": metrics,
    }

    with open(stats_path, "w", encoding="utf-8") as f:
        json.dump(stats, f, indent=2)

    log_step("done", "Yield prediction completed successfully")


if __name__ == "__main__":
    main()