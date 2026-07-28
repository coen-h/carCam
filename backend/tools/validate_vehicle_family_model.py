#!/usr/bin/env python3
"""Validate ONNX structure/output and optionally calibrate family thresholds."""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path

import numpy as np
import onnx
import onnxruntime as ort
from PIL import Image


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", required=True, type=Path)
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument(
        "--samples-csv",
        type=Path,
        help="CSV with path,label columns; blank/Other labels are out-of-catalog",
    )
    parser.add_argument("--report", type=Path)
    return parser.parse_args()


def image_tensor(path: Path, size: int) -> np.ndarray:
    image = Image.open(path).convert("RGB").resize((size, size))
    array = np.asarray(image, dtype=np.float32) / 255.0
    return np.transpose(array, (2, 0, 1))[None, ...]


def best_threshold(positive_scores, negative_scores):
    best = None
    for threshold in np.arange(0.10, 0.901, 0.01):
        tp = sum(score >= threshold for score in positive_scores)
        fn = len(positive_scores) - tp
        fp = sum(score >= threshold for score in negative_scores)
        tn = len(negative_scores) - fp
        false_positive_rate = fp / max(1, fp + tn)
        precision = tp / max(1, tp + fp)
        recall = tp / max(1, tp + fn)
        f1 = 2 * precision * recall / max(1e-12, precision + recall)
        candidate = {
            "threshold": round(float(threshold), 2),
            "f1": round(float(f1), 4),
            "falsePositiveRate": round(float(false_positive_rate), 4),
            "precision": round(float(precision), 4),
            "recall": round(float(recall), 4),
        }
        if false_positive_rate <= 0.05 and (
            best is None or candidate["f1"] > best["f1"]
        ):
            best = candidate
    return best


def main() -> None:
    args = parse_args()
    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    labels = [family["label"] for family in manifest["families"]]
    model = onnx.load(str(args.model), load_external_data=True)
    onnx.checker.check_model(model)
    if any(tensor.external_data for tensor in model.graph.initializer):
        raise RuntimeError("ONNX model is not self-contained")

    providers = ["CPUExecutionProvider"]
    session = ort.InferenceSession(str(args.model), providers=providers)
    input_meta = session.get_inputs()[0]
    output_meta = session.get_outputs()[0]
    size = int(manifest["source"]["inputSize"])

    random_input = np.random.default_rng(20260727).random(
        (2, 3, size, size), dtype=np.float32
    )
    random_output = session.run(
        [output_meta.name], {input_meta.name: random_input}
    )[0]
    if random_output.shape != (2, len(labels)):
        raise RuntimeError(
            f"Expected output shape (2, {len(labels)}), "
            f"received {random_output.shape}"
        )
    if not np.isfinite(random_output).all():
        raise RuntimeError("Model output contains NaN or infinity")
    if (random_output < 0).any() or (random_output > 1).any():
        raise RuntimeError("Model output falls outside probability range [0, 1]")
    if (random_output.sum(axis=1) > 1.0001).any():
        raise RuntimeError("Grouped probabilities sum to more than one")

    report = {
        "modelVersion": manifest["modelVersion"],
        "inputName": input_meta.name,
        "outputName": output_meta.name,
        "outputShape": list(random_output.shape),
        "selfContained": True,
        "families": {},
    }

    if args.samples_csv:
        samples = []
        with args.samples_csv.open(
            "r", encoding="utf-8-sig", newline=""
        ) as handle:
            for row in csv.DictReader(handle):
                path = Path(row["path"])
                if not path.is_absolute():
                    path = args.samples_csv.parent / path
                probabilities = session.run(
                    [output_meta.name],
                    {input_meta.name: image_tensor(path, size)},
                )[0][0]
                samples.append((row.get("label", "").strip(), probabilities))

        for family_id, label in enumerate(labels):
            positives = [
                float(probabilities[family_id])
                for expected, probabilities in samples
                if expected == label
            ]
            negatives = [
                float(probabilities[family_id])
                for expected, probabilities in samples
                if expected != label
            ]
            result = {
                "positiveImages": len(positives),
                "negativeImages": len(negatives),
                "calibration": None,
            }
            if len(positives) >= 30:
                result["calibration"] = best_threshold(positives, negatives)
            report["families"][label] = result

    report_path = args.report or args.model.with_suffix(".validation.json")
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(
        json.dumps(report, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"Validated {args.model}")
    print(f"Input: {input_meta.name} {input_meta.shape}")
    print(f"Output: {output_meta.name} {output_meta.shape}")
    print(f"Report: {report_path}")


if __name__ == "__main__":
    main()
