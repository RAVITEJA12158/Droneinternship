#!/usr/bin/env python3
import argparse
import csv
import json
import os
from typing import Dict, Optional, Tuple

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import numpy as np
import rasterio
from matplotlib.colors import BoundaryNorm, ListedColormap
from skimage.segmentation import mark_boundaries, slic
from skimage.util import img_as_float
from sklearn.cluster import KMeans


CLASS_INFO: Dict[int, Tuple[str, Tuple[float, float, float], str]] = {
    0: ("Background/Water", (0.05, 0.12, 0.34), "#0f3b82"),
    1: ("Healthy Crop", (0.0, 0.62, 0.26), "#009e42"),
    2: ("Stressed Crop", (0.95, 0.82, 0.18), "#f2d12f"),
    3: ("Diseased Crop", (0.86, 0.16, 0.12), "#dc291f"),
    4: ("Bare Soil", (0.55, 0.28, 0.08), "#8c4714"),
}
NODATA_VALUE = 255
EPSILON = 1e-6


def log_step(stage: str, message: str) -> None:
    print(f"[labelling] {stage} | {message}", flush=True)


def read_band(src: rasterio.io.DatasetReader, index: int) -> np.ndarray:
    if src.count < index:
        raise ValueError(f"Input TIF has {src.count} bands, but band {index} is required")
    return src.read(index).astype(np.float32)


def normalize_for_slic(band: np.ndarray) -> np.ndarray:
    band = np.where(np.isfinite(band), band.astype(np.float32), np.nan)
    if np.all(np.isnan(band)):
        return np.zeros_like(band, dtype=np.float32)
    mn = np.nanmin(band)
    mx = np.nanmax(band)
    if mx - mn < EPSILON:
        return np.zeros_like(band, dtype=np.float32)

    norm = ((band - mn) / (mx - mn)).astype(np.float32)
    return np.nan_to_num(norm, nan=0.0)


def compute_index(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    denom = a + b
    index = np.divide(a - b, denom, out=np.full_like(a, np.nan, dtype=np.float32), where=np.abs(denom) > EPSILON)
    return np.clip(index, -1.0, 1.0)


def stretch_channel(channel: np.ndarray, percentile: float = 99.0) -> np.ndarray:
    channel = np.where(np.isfinite(channel), channel.astype(np.float32), np.nan)
    if np.all(np.isnan(channel)):
        return np.zeros_like(channel, dtype=np.float32)

    high = np.nanpercentile(channel, percentile)
    if not np.isfinite(high) or high <= EPSILON:
        return np.zeros_like(channel, dtype=np.float32)

    return np.nan_to_num(np.clip(channel / high, 0, 1), nan=0.0).astype(np.float32)


def false_color_composite(red: np.ndarray, red_edge: np.ndarray, nir: np.ndarray) -> np.ndarray:
    return np.dstack([
        stretch_channel(nir),
        stretch_channel(red),
        stretch_channel(red_edge),
    ])


def compute_percentiles(arr: np.ndarray) -> Dict[str, float]:
    valid = arr[np.isfinite(arr)]
    if valid.size == 0:
        # Fallback to prevent crashing if the image happens to be entirely masked or empty
        return { "p25": 0.0, "p50": 0.0, "p75": 0.0 }
    return {
        "p25": float(np.nanpercentile(valid, 25)),
        "p50": float(np.nanpercentile(valid, 50)),
        "p75": float(np.nanpercentile(valid, 75)),
    }


def compute_stats(arr: np.ndarray) -> Dict[str, float]:
    valid = arr[np.isfinite(arr)]
    if valid.size == 0:
        return {"mean": 0, "std": 0, "min": 0, "max": 0, "p25": 0, "p50": 0, "p75": 0}
    return {
        "mean": float(np.nanmean(valid)),
        "std": float(np.nanstd(valid)),
        "min": float(np.nanmin(valid)),
        "max": float(np.nanmax(valid)),
        "p25": float(np.nanpercentile(valid, 25)),
        "p50": float(np.nanpercentile(valid, 50)),
        "p75": float(np.nanpercentile(valid, 75)),
    }


def save_geotiff(profile: dict, array: np.ndarray, path: str, dtype: str, nodata: Optional[float] = None) -> None:
    out_profile = profile.copy()
    out_profile.update(dtype=dtype, count=1, compress="lzw")
    if nodata is not None:
        out_profile.update(nodata=nodata)
    else:
        out_profile.pop("nodata", None)

    with rasterio.open(path, "w", **out_profile) as dst:
        dst.write(array.astype(dtype), 1)


def build_cluster_model(ndvi: np.ndarray, ndre: np.ndarray) -> KMeans:
    valid = np.isfinite(ndvi) & np.isfinite(ndre)
    features = np.stack([ndvi[valid], ndre[valid]], axis=1)
    features = np.clip(features, -1, 1)

    n_samples = features.shape[0]
    if n_samples == 0:
        # Fallback if the image lacks data
        features = np.zeros((10, 2))
        n_samples = 10

    n_clusters = min(4, n_samples)

    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    kmeans.fit(features)
    return kmeans


def assign_class_hybrid(
    mean_ndvi: float,
    mean_ndre: float,
    ndvi_p: Dict[str, float],
    ndre_p: Dict[str, float],
    kmeans: KMeans,
) -> Tuple[int, float, int]:
    feature = np.array([[mean_ndvi, mean_ndre]], dtype=np.float32)
    cluster_id = int(kmeans.predict(feature)[0])
    distance = float(np.linalg.norm(feature - kmeans.cluster_centers_[cluster_id]))
    confidence = float(1 / (1 + distance))

    if mean_ndvi <= ndvi_p["p25"]:
        return 0, confidence, cluster_id
    if mean_ndvi <= ndvi_p["p50"]:
        return 4, confidence, cluster_id
    if mean_ndvi > ndvi_p["p50"] and mean_ndre <= ndre_p["p25"]:
        return 3, confidence, cluster_id
    if mean_ndvi <= ndvi_p["p75"]:
        return 2, confidence, cluster_id
    return 1, confidence, cluster_id


def save_index_heatmap(arr: np.ndarray, path: str, title: str, cmap: str) -> None:
    plt.figure(figsize=(10, 10))
    plt.imshow(arr, cmap=cmap, vmin=-1, vmax=1)
    plt.colorbar(label=title, fraction=0.046, pad=0.04)
    plt.title(title)
    plt.axis("off")
    plt.tight_layout()
    plt.savefig(path, dpi=180, bbox_inches="tight", pad_inches=0.02)
    plt.close()


def save_histogram(arr: np.ndarray, path: str, title: str) -> None:
    valid = arr[np.isfinite(arr)]
    plt.figure(figsize=(10, 5))
    plt.hist(valid, bins=100, color="#64748b")
    plt.title(title)
    plt.xlabel("Value")
    plt.ylabel("Frequency")
    plt.tight_layout()
    plt.savefig(path, dpi=180, bbox_inches="tight", pad_inches=0.04)
    plt.close()


def save_class_distribution(label_map: np.ndarray, path: str) -> None:
    labels = []
    counts = []
    colors = []
    for class_id, (name, _color, hex_color) in CLASS_INFO.items():
        labels.append(name)
        counts.append(int(np.sum(label_map == class_id)))
        colors.append(hex_color)

    plt.figure(figsize=(10, 5))
    plt.bar(labels, counts, color=colors)
    plt.xticks(rotation=20, ha="right")
    plt.ylabel("Pixels")
    plt.title("Class Distribution")
    plt.tight_layout()
    plt.savefig(path, dpi=180, bbox_inches="tight", pad_inches=0.04)
    plt.close()


def save_class_distribution_pie(label_map: np.ndarray, path: str) -> None:
    labels = []
    counts = []
    colors = []
    for class_id, (name, _color, hex_color) in CLASS_INFO.items():
        count = int(np.sum(label_map == class_id))
        if count <= 0:
            continue
        labels.append(name)
        counts.append(count)
        colors.append(hex_color)

    if not counts:
        labels = ["No labelled pixels"]
        counts = [1]
        colors = ["#cbd5e1"]

    plt.figure(figsize=(8, 8))
    plt.pie(
        counts,
        labels=labels,
        colors=colors,
        autopct="%1.1f%%",
        startangle=90,
        counterclock=False,
        textprops={"fontsize": 9},
    )
    plt.title("Class Distribution Percentage")
    plt.tight_layout()
    plt.savefig(path, dpi=180, bbox_inches="tight", pad_inches=0.04)
    plt.close()


def save_scatter(ndvi: np.ndarray, ndre: np.ndarray, path: str) -> None:
    valid = np.isfinite(ndvi) & np.isfinite(ndre)
    ndvi_values = ndvi[valid]
    ndre_values = ndre[valid]
    max_points = 120000
    if ndvi_values.size > max_points:
        indices = np.linspace(0, ndvi_values.size - 1, max_points).astype(np.int64)
        ndvi_values = ndvi_values[indices]
        ndre_values = ndre_values[indices]

    plt.figure(figsize=(7, 7))
    plt.scatter(ndvi_values, ndre_values, s=1, alpha=0.25, color="#0891b2")
    plt.xlabel("NDVI")
    plt.ylabel("NDRE")
    plt.title("NDVI vs NDRE")
    plt.tight_layout()
    plt.savefig(path, dpi=180, bbox_inches="tight", pad_inches=0.04)
    plt.close()


def save_source_composite(red: np.ndarray, red_edge: np.ndarray, nir: np.ndarray, path: str) -> None:
    composite = false_color_composite(red, red_edge, nir)
    plt.figure(figsize=(10, 10))
    plt.imshow(composite)
    plt.title("Multispectral False-Color Composite")
    plt.axis("off")
    plt.tight_layout()
    plt.savefig(path, dpi=180, bbox_inches="tight", pad_inches=0.02)
    plt.close()


def save_label_map(label_map: np.ndarray, path: str) -> None:
    display = np.ma.array(label_map, mask=(label_map == NODATA_VALUE))
    classes = sorted(v for v in np.unique(label_map) if int(v) in CLASS_INFO)
    if not classes:
        classes = list(CLASS_INFO.keys())
    colors = [CLASS_INFO[int(v)][1] for v in classes]
    cmap = ListedColormap(colors)
    cmap.set_bad((0.85, 0.85, 0.85, 1.0))
    bounds = [int(v) - 0.5 for v in classes] + [int(classes[-1]) + 0.5]
    norm = BoundaryNorm(bounds, cmap.N)

    plt.figure(figsize=(10, 10))
    plt.imshow(display, cmap=cmap, norm=norm, interpolation="nearest")
    plt.axis("off")
    plt.tight_layout()
    plt.savefig(path, dpi=180, bbox_inches="tight", pad_inches=0.02)
    plt.close()


def save_superpixel_map(ndvi: np.ndarray, segments: np.ndarray, path: str) -> None:
    base = normalize_for_slic(ndvi)
    overlay = mark_boundaries(base, segments, color=(1, 1, 1), mode="thick")
    plt.figure(figsize=(10, 10))
    plt.imshow(overlay)
    plt.title("NDVI with Superpixel Boundaries")
    plt.axis("off")
    plt.tight_layout()
    plt.savefig(path, dpi=180, bbox_inches="tight", pad_inches=0.02)
    plt.close()


def save_confidence_map(confidence_map: np.ndarray, path: str) -> None:
    plt.figure(figsize=(10, 10))
    plt.imshow(confidence_map, cmap="viridis", vmin=0, vmax=1)
    plt.colorbar(label="Confidence", fraction=0.046, pad=0.04)
    plt.title("Confidence Map")
    plt.axis("off")
    plt.tight_layout()
    plt.savefig(path, dpi=180, bbox_inches="tight", pad_inches=0.02)
    plt.close()


def save_label_overlay(red: np.ndarray, red_edge: np.ndarray, nir: np.ndarray, label_map: np.ndarray, path: str) -> None:
    base = false_color_composite(red, red_edge, nir)
    overlay = mark_boundaries(base, label_map, color=(1, 1, 1), mode="thick")

    plt.figure(figsize=(10, 10))
    plt.imshow(np.clip(overlay, 0, 1))
    plt.title("Label Boundaries on Multispectral Composite")
    plt.axis("off")
    plt.tight_layout()
    plt.savefig(path, dpi=180, bbox_inches="tight", pad_inches=0.02)
    plt.close()


def class_summary(label_map: np.ndarray) -> Dict[str, Dict[str, float]]:
    valid = label_map != NODATA_VALUE
    total = int(np.sum(valid))
    summary: Dict[str, Dict[str, float]] = {}
    for class_id, (name, _color, hex_color) in CLASS_INFO.items():
        count = int(np.sum(label_map == class_id))
        summary[str(class_id)] = {
            "id": class_id,
            "name": name,
            "color": hex_color,
            "pixels": count,
            "percentage": float((count / total) * 100) if total else 0.0,
        }
    uncertain = int(np.sum(label_map == NODATA_VALUE))
    summary[str(NODATA_VALUE)] = {
        "id": NODATA_VALUE,
        "name": "Uncertain",
        "color": "#ffffff",
        "pixels": uncertain,
        "percentage": float((uncertain / label_map.size) * 100) if label_map.size else 0.0,
    }
    return summary


def save_dataset_summary(summary: Dict[str, Dict[str, float]], path: str) -> None:
    with open(path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["class", "pixels", "percentage"])
        writer.writeheader()
        for class_id, item in summary.items():
            if int(class_id) == NODATA_VALUE:
                continue
            writer.writerow({
                "class": item["name"],
                "pixels": item["pixels"],
                "percentage": item["percentage"],
            })


def process(args: argparse.Namespace) -> None:
    log_step("start", f"Starting multispectral labelling for {os.path.basename(args.input_tif)}")
    os.makedirs(args.output_dir, exist_ok=True)

    log_step("1/6", f"Reading red band {args.red_band}, red-edge band {args.red_edge_band}, and NIR band {args.nir_band}")
    with rasterio.open(args.input_tif) as src:
        red = read_band(src, args.red_band)
        nir = read_band(src, args.nir_band)
        red_edge = read_band(src, args.red_edge_band)
        profile = src.profile.copy()

    log_step("2/6", "Computing NDVI and NDRE vegetation index rasters")
    ndvi = compute_index(nir, red)
    ndre = compute_index(nir, red_edge)
    ndvi_p = compute_percentiles(ndvi)
    ndre_p = compute_percentiles(ndre)

    log_step("3/6", "Fitting image-specific KMeans clusters from NDVI and NDRE values")
    kmeans = build_cluster_model(ndvi, ndre)

    stack = np.dstack([
        normalize_for_slic(ndvi),
        normalize_for_slic(ndre),
        normalize_for_slic(nir),
        normalize_for_slic(red),
    ])

    # Absolute safeguard against any NaNs or Infs reaching SLIC
    stack = np.nan_to_num(stack, nan=0.0, posinf=1.0, neginf=0.0)
    stack = stack.astype(np.float64)

    log_step("4/6", f"Segmenting the orthomosaic into about {args.n_segments} SLIC superpixels")
    segments = slic(
        img_as_float(stack),
        n_segments=args.n_segments,
        compactness=args.compactness,
        sigma=1,
        start_label=1,
        channel_axis=-1,
        enforce_connectivity=False, # Faster
    )

    label_map = np.full(segments.shape, NODATA_VALUE, dtype=np.uint8)
    confidence_map = np.zeros(segments.shape, dtype=np.float32)
    records = []

    unique_segments = np.unique(segments)
    total_segments = int(unique_segments.size)
    report_interval = max(1, total_segments // 100)
    log_step("5/6", f"Classifying superpixels: processed 0/{total_segments} segments")
    log_step("indices", f"NDVI percentiles: {ndvi_p}")
    log_step("indices", f"NDRE percentiles: {ndre_p}")
    for processed_count, seg_id in enumerate(unique_segments, start=1):
        mask = segments == seg_id
        area = int(mask.sum())
        should_report = processed_count == total_segments or processed_count % report_interval == 0

        if area < args.min_segment_pixels:
            if should_report:
                log_step("5/6", f"Classifying superpixels: processed {processed_count}/{total_segments} segments")
            continue

        mean_ndvi = float(np.nanmean(ndvi[mask]))
        mean_ndre = float(np.nanmean(ndre[mask]))
        if not np.isfinite(mean_ndvi) or not np.isfinite(mean_ndre):
            if should_report:
                log_step("5/6", f"Classifying superpixels: processed {processed_count}/{total_segments} segments")
            continue

        class_id, confidence, cluster_id = assign_class_hybrid(mean_ndvi, mean_ndre, ndvi_p, ndre_p, kmeans)
        if confidence < args.confidence_threshold:
            class_id = NODATA_VALUE

        label_map[mask] = class_id
        confidence_map[mask] = confidence
        records.append({
            "segment_id": int(seg_id),
            "class_id": int(class_id),
            "cluster_id": int(cluster_id),
            "mean_ndvi": mean_ndvi,
            "mean_ndre": mean_ndre,
            "area_pixels": area,
            "confidence": confidence,
        })
        if should_report:
            log_step("5/6", f"Classifying superpixels: processed {processed_count}/{total_segments} segments")

    ndvi_tif_path = os.path.join(args.output_dir, "ndvi.tif")
    ndre_tif_path = os.path.join(args.output_dir, "ndre.tif")
    labels_tif_path = os.path.join(args.output_dir, "labels_pixelwise.tif")
    superpixels_tif_path = os.path.join(args.output_dir, "superpixels.tif")
    ndvi_path = os.path.join(args.output_dir, "ndvi_heatmap.png")
    ndre_path = os.path.join(args.output_dir, "ndre_heatmap.png")
    composite_path = os.path.join(args.output_dir, "source_composite.png")
    superpixels_path = os.path.join(args.output_dir, "superpixels_overlay.png")
    labels_path = os.path.join(args.output_dir, "labels_classified.png")
    overlay_path = os.path.join(args.output_dir, "labels_overlay.png")
    ndvi_histogram_path = os.path.join(args.output_dir, "ndvi_histogram.png")
    ndre_histogram_path = os.path.join(args.output_dir, "ndre_histogram.png")
    class_distribution_path = os.path.join(args.output_dir, "class_distribution.png")
    class_distribution_pie_path = os.path.join(args.output_dir, "class_distribution_pie.png")
    scatter_path = os.path.join(args.output_dir, "ndvi_ndre_scatter.png")
    confidence_path = os.path.join(args.output_dir, "confidence_map.png")
    summary_csv_path = os.path.join(args.output_dir, "dataset_summary.csv")
    stats_path = os.path.join(args.output_dir, "statistics.json")

    log_step("6/6", f"Writing GeoTIFFs, charts, overlays, and statistics to {args.output_dir}")

    save_geotiff(profile, ndvi, ndvi_tif_path, "float32")
    save_geotiff(profile, ndre, ndre_tif_path, "float32")
    save_geotiff(profile, label_map, labels_tif_path, "uint8", nodata=NODATA_VALUE)
    save_geotiff(profile, segments, superpixels_tif_path, "uint32")
    save_source_composite(red, red_edge, nir, composite_path)
    save_index_heatmap(ndvi, ndvi_path, "NDVI", "RdYlGn")
    save_index_heatmap(ndre, ndre_path, "NDRE", "YlGn")
    save_superpixel_map(ndvi, segments, superpixels_path)
    save_label_map(label_map, labels_path)
    save_label_overlay(red, red_edge, nir, label_map, overlay_path)
    save_confidence_map(confidence_map, confidence_path)
    save_histogram(ndvi, ndvi_histogram_path, "NDVI Histogram")
    save_histogram(ndre, ndre_histogram_path, "NDRE Histogram")
    save_class_distribution(label_map, class_distribution_path)
    save_class_distribution_pie(label_map, class_distribution_pie_path)
    save_scatter(ndvi, ndre, scatter_path)

    classes = class_summary(label_map)
    save_dataset_summary(classes, summary_csv_path)

    stats = {
        "labeling_method": "slic_percentile_kmeans_distance_confidence",
        "parameters": {
            "red_band": args.red_band,
            "nir_band": args.nir_band,
            "red_edge_band": args.red_edge_band,
            "n_segments": args.n_segments,
            "compactness": args.compactness,
            "min_segment_pixels": args.min_segment_pixels,
            "confidence_threshold": args.confidence_threshold,
        },
        "ndvi": compute_stats(ndvi),
        "ndre": compute_stats(ndre),
        "ndvi_percentiles": ndvi_p,
        "ndre_percentiles": ndre_p,
        "classes": classes,
        "cluster_centers": kmeans.cluster_centers_.tolist(),
        "segments": records,
    }

    with open(stats_path, "w", encoding="utf-8") as f:
        json.dump(stats, f, indent=2)

    log_step("done", "Multispectral labelling completed successfully")


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate multispectral crop labelling outputs.")
    parser.add_argument("--input_tif", required=True)
    parser.add_argument("--output_dir", required=True)
    parser.add_argument("--red_band", type=int, default=1)
    parser.add_argument("--red_edge_band", type=int, default=2)
    parser.add_argument("--nir_band", type=int, default=3)
    parser.add_argument("--n_segments", type=int, default=15000)
    parser.add_argument("--compactness", type=float, default=10)
    parser.add_argument("--min_segment_pixels", type=int, default=500)
    parser.add_argument("--confidence_threshold", type=float, default=0.55)
    process(parser.parse_args())


if __name__ == "__main__":
    main()
