#!/usr/bin/env python3
"""Export the pinned VMMR checkpoint as a 50-family DeepStream ONNX model."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
from pathlib import Path


def normalize(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.casefold())


def load_source_classes(mapping_path: Path) -> list:
    with mapping_path.open("r", encoding="utf-8-sig", newline="") as handle:
        raw_rows = list(csv.DictReader(handle))
    by_id = {}
    for row in raw_rows:
        source_id = int(row["global_class_id"])
        previous = by_id.get(source_id)
        if previous is not None and previous["class_name"] != row["class_name"]:
            raise ValueError(
                f"Source ID {source_id} has conflicting class names: "
                f"{previous['class_name']!r} and {row['class_name']!r}"
            )
        # The published CSV contains one corrected duplicate row. Prefer the
        # last row, which has the corrected make/model split.
        by_id[source_id] = row
    rows = [by_id[source_id] for source_id in sorted(by_id)]
    expected = list(range(len(rows)))
    actual = [int(row["global_class_id"]) for row in rows]
    if actual != expected:
        raise ValueError("Source mapping IDs must be contiguous and zero-based")
    return rows


def family_for_source(source: dict, families: list):
    source_make = normalize(source["make"])
    source_model = normalize(source["model"])
    matches = []
    for family in families:
        for selector in family["selectors"]:
            if source_make != normalize(selector["make"]):
                continue
            if source_model in {normalize(model) for model in selector["models"]}:
                matches.append(family)
                break
    if len(matches) > 1:
        labels = ", ".join(family["label"] for family in matches)
        raise ValueError(
            f"Source class {source['class_name']!r} maps to multiple families: "
            f"{labels}"
        )
    return matches[0] if matches else None


def build_assignments(source_classes: list, manifest: dict):
    families = manifest["families"]
    assignments = {}
    coverage = {family["label"]: [] for family in families}
    for source in source_classes:
        family = family_for_source(source, families)
        if family is None:
            continue
        source_id = int(source["global_class_id"])
        assignments[source_id] = int(family["id"])
        coverage[family["label"]].append(
            {
                "sourceId": source_id,
                "className": source["class_name"],
                "make": source["make"],
                "model": source["model"],
            }
        )
    return assignments, coverage


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint", required=True, type=Path)
    parser.add_argument("--mapping", required=True, type=Path)
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--coverage-report", type=Path)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    expected_hash = manifest["source"]["checkpointSha256"]
    actual_hash = sha256(args.checkpoint)
    if actual_hash != expected_hash:
        raise RuntimeError(
            f"Checkpoint SHA-256 mismatch: expected {expected_hash}, "
            f"received {actual_hash}"
        )

    source_classes = load_source_classes(args.mapping)
    expected_count = int(manifest["source"]["sourceClassCount"])
    if len(source_classes) != expected_count:
        raise RuntimeError(
            f"Expected {expected_count} source classes, found "
            f"{len(source_classes)}"
        )

    assignments, coverage = build_assignments(source_classes, manifest)
    empty = [label for label, classes in coverage.items() if not classes]
    report = {
        "modelVersion": manifest["modelVersion"],
        "sourceClassCount": len(source_classes),
        "mappedSourceClassCount": len(assignments),
        "families": {
            label: {
                "sourceClassCount": len(classes),
                "classes": classes,
            }
            for label, classes in coverage.items()
        },
        "emptyFamilies": empty,
    }
    report_path = args.coverage_report or args.output.with_suffix(
        ".coverage.json"
    )
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(
        json.dumps(report, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    if empty:
        raise RuntimeError(
            "The source checkpoint has no classes for: "
            + ", ".join(empty)
            + f". See {report_path}"
        )

    import torch
    import torch.nn as nn
    import timm

    class FamilyWrapper(nn.Module):
        def __init__(self, backbone, aggregation):
            super().__init__()
            self.backbone = backbone
            self.register_buffer(
                "mean",
                torch.tensor([0.485, 0.456, 0.406]).view(1, 3, 1, 1),
            )
            self.register_buffer(
                "std",
                torch.tensor([0.229, 0.224, 0.225]).view(1, 3, 1, 1),
            )
            self.register_buffer("aggregation", aggregation)

        def forward(self, image):
            normalized = (image - self.mean) / self.std
            logits = self.backbone(normalized)
            source_probabilities = torch.softmax(logits, dim=1)
            return torch.matmul(source_probabilities, self.aggregation)

    checkpoint = torch.load(
        args.checkpoint, map_location="cpu", weights_only=False
    )
    state_dict = checkpoint.get("model_state", checkpoint)
    architecture = manifest["source"]["architecture"]
    backbone = timm.create_model(
        architecture,
        pretrained=False,
        num_classes=len(source_classes),
    )
    backbone.load_state_dict(state_dict, strict=True)
    backbone.eval()

    aggregation = torch.zeros(
        len(source_classes), len(manifest["families"]), dtype=torch.float32
    )
    for source_id, family_id in assignments.items():
        aggregation[source_id, family_id] = 1.0

    wrapper = FamilyWrapper(backbone, aggregation).eval()
    input_size = int(manifest["source"]["inputSize"])
    example = torch.zeros(1, 3, input_size, input_size, dtype=torch.float32)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with torch.inference_mode():
        torch.onnx.export(
            wrapper,
            example,
            args.output,
            input_names=["input"],
            output_names=["family_probabilities"],
            dynamic_axes={
                "input": {0: "batch"},
                "family_probabilities": {0: "batch"},
            },
            opset_version=13,
            do_constant_folding=True,
            dynamo=False,
        )

    import onnx

    model = onnx.load(str(args.output), load_external_data=True)
    onnx.checker.check_model(model)
    external = [
        tensor.name for tensor in model.graph.initializer if tensor.external_data
    ]
    if external:
        raise RuntimeError(
            "Export unexpectedly uses external tensor data: "
            + ", ".join(external[:10])
        )

    import numpy as np
    import onnxruntime as ort

    generator = torch.Generator().manual_seed(20260727)
    comparison_input = torch.rand(
        1,
        3,
        input_size,
        input_size,
        dtype=torch.float32,
        generator=generator,
    )
    with torch.inference_mode():
        torch_output = wrapper(comparison_input).cpu().numpy()
    session = ort.InferenceSession(
        str(args.output), providers=["CPUExecutionProvider"]
    )
    onnx_output = session.run(
        ["family_probabilities"],
        {"input": comparison_input.cpu().numpy()},
    )[0]
    max_difference = float(np.max(np.abs(torch_output - onnx_output)))
    if max_difference > 1e-4:
        raise RuntimeError(
            f"PyTorch/ONNX maximum difference {max_difference} exceeds 1e-4"
        )

    output_hash = sha256(args.output)
    print(f"Exported: {args.output}")
    print(f"SHA-256: {output_hash}")
    print(f"Size: {args.output.stat().st_size} bytes")
    print(f"PyTorch/ONNX max difference: {max_difference:.8f}")
    print(f"Mapped source classes: {len(assignments)}/{len(source_classes)}")
    for label, classes in coverage.items():
        print(f"  {label}: {len(classes)} source classes")


if __name__ == "__main__":
    main()
