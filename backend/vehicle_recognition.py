"""Pure-Python state and event handling for tracked vehicle recognition."""

from __future__ import annotations

import json
import logging
from logging.handlers import RotatingFileHandler
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Optional


@dataclass
class TrackState:
    first_seen_frame: int
    first_seen_time: float
    last_seen_time: float
    last_vote_frame: int = -1_000_000_000
    candidate: str = ""
    candidate_scores: list = field(default_factory=list)
    rejected_samples: int = 0
    confirmed: str = ""
    confirmed_confidence: float = 0.0
    event_written: bool = False


class JsonlEventWriter:
    """Append JSON objects to a small rotating local audit log."""

    def __init__(self, path: Path, max_bytes: int, backups: int) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        logger_name = f"vehicle-events-{id(self)}"
        self._logger = logging.getLogger(logger_name)
        self._logger.setLevel(logging.INFO)
        self._logger.propagate = False
        handler = RotatingFileHandler(
            path,
            maxBytes=max_bytes,
            backupCount=backups,
            encoding="utf-8",
        )
        handler.setFormatter(logging.Formatter("%(message)s"))
        self._logger.addHandler(handler)

    def write(self, event: dict) -> None:
        self._logger.info(
            json.dumps(event, ensure_ascii=False, separators=(",", ":"))
        )

    def close(self) -> None:
        for handler in list(self._logger.handlers):
            handler.close()
            self._logger.removeHandler(handler)


class VehicleRecognitionManager:
    """Convert noisy classifier metadata into stable, tracked recognitions."""

    def __init__(self, manifest: dict, event_writer: Optional[JsonlEventWriter] = None):
        self.model_version = manifest["modelVersion"]
        runtime = manifest["runtime"]
        self.reinfer_interval = int(runtime["reinferIntervalFrames"])
        self.confirmation_samples = int(runtime["confirmationSamples"])
        self.unknown_after_samples = int(runtime["unknownAfterSamples"])
        self.state_ttl = float(runtime["stateTtlSeconds"])
        self.relabel_margin = float(runtime["relabelMargin"])
        self.default_threshold = float(runtime["defaultThreshold"])
        self.families = {family["label"]: family for family in manifest["families"]}
        self.thresholds = {
            label: float(family.get("threshold", self.default_threshold))
            for label, family in self.families.items()
        }
        self.tracks: Dict[int, TrackState] = {}
        self.event_writer = event_writer

    def touch(self, track_id: int, frame_num: int, now: float) -> TrackState:
        state = self.tracks.get(track_id)
        if state is None:
            state = TrackState(
                first_seen_frame=frame_num,
                first_seen_time=now,
                last_seen_time=now,
            )
            self.tracks[track_id] = state
        else:
            state.last_seen_time = now
        return state

    def observe(
        self,
        track_id: int,
        label: str,
        confidence: float,
        frame_num: int,
        now: float,
        bbox: dict,
    ) -> Optional[dict]:
        state = self.touch(track_id, frame_num, now)

        if frame_num - state.last_vote_frame < self.reinfer_interval:
            return None
        state.last_vote_frame = frame_num

        family = self.families.get(label)
        threshold = self.thresholds.get(label, self.default_threshold)
        if family is None or confidence < threshold:
            state.candidate = ""
            state.candidate_scores.clear()
            state.rejected_samples += 1
            return None

        state.rejected_samples = 0
        if label == state.confirmed:
            state.confirmed_confidence = (
                (state.confirmed_confidence * 0.8) + (confidence * 0.2)
            )
            state.candidate = ""
            state.candidate_scores.clear()
            return None

        if label == state.candidate:
            state.candidate_scores.append(confidence)
        else:
            state.candidate = label
            state.candidate_scores = [confidence]

        if len(state.candidate_scores) < self.confirmation_samples:
            return None

        candidate_confidence = sum(state.candidate_scores) / len(
            state.candidate_scores
        )
        if state.confirmed and (
            candidate_confidence < state.confirmed_confidence + self.relabel_margin
        ):
            state.candidate = ""
            state.candidate_scores.clear()
            return None

        first_confirmation = not state.confirmed
        state.confirmed = label
        state.confirmed_confidence = candidate_confidence
        state.candidate = ""
        state.candidate_scores.clear()

        if not first_confirmation or state.event_written:
            return None

        state.event_written = True
        event = {
            "schemaVersion": 1,
            "event": "vehicle_recognition",
            "timestamp": datetime.now(timezone.utc).isoformat(
                timespec="milliseconds"
            ).replace("+00:00", "Z"),
            "trackerId": track_id,
            "make": family["make"],
            "model": family["model"],
            "label": label,
            "confidence": round(candidate_confidence, 4),
            "modelVersion": self.model_version,
            "bbox": {
                "left": int(bbox["left"]),
                "top": int(bbox["top"]),
                "width": int(bbox["width"]),
                "height": int(bbox["height"]),
            },
        }
        if self.event_writer is not None:
            self.event_writer.write(event)
        return event

    def display_text(
        self,
        track_id: int,
        frame_num: int,
        base_label: str,
    ) -> str:
        state = self.tracks.get(track_id)
        suffix = f" #{track_id}"
        if state is None:
            return f"{base_label}{suffix}"
        if state.confirmed:
            return (
                f"{state.confirmed}{suffix} "
                f"{state.confirmed_confidence * 100:.0f}%"
            )

        enough_empty_windows = (
            frame_num - state.first_seen_frame
            >= self.reinfer_interval * self.unknown_after_samples
        )
        if state.rejected_samples >= self.unknown_after_samples or enough_empty_windows:
            return f"Unknown{suffix}"
        return f"{base_label}{suffix}"

    def prune(self, now: float) -> list:
        expired = [
            track_id
            for track_id, state in self.tracks.items()
            if now - state.last_seen_time > self.state_ttl
        ]
        for track_id in expired:
            del self.tracks[track_id]
        return expired


def load_manifest(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as handle:
        manifest = json.load(handle)

    families = manifest.get("families", [])
    labels = [family["label"] for family in families]
    ids = [family["id"] for family in families]
    if len(families) != 50:
        raise ValueError(f"Expected 50 vehicle families, found {len(families)}")
    if len(set(labels)) != len(labels):
        raise ValueError("Vehicle family labels must be unique")
    if ids != list(range(len(families))):
        raise ValueError("Vehicle family IDs must be contiguous and ordered")
    return manifest
