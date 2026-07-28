import json
import sys
import tempfile
import unittest
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from tools.export_vmmr_family_onnx import family_for_source
from vehicle_recognition import (
    JsonlEventWriter,
    VehicleRecognitionManager,
    load_manifest,
)


MANIFEST_PATH = BACKEND_DIR / "vehicle_model_manifest.json"
LABELS_PATH = BACKEND_DIR / "vehicle_model_labels.txt"


class ManifestTests(unittest.TestCase):
    def setUp(self):
        self.manifest = load_manifest(MANIFEST_PATH)

    def test_labels_are_in_manifest_order(self):
        file_labels = LABELS_PATH.read_text(encoding="utf-8").splitlines()
        manifest_labels = [
            family["label"] for family in self.manifest["families"]
        ]
        self.assertEqual(file_labels, manifest_labels)
        self.assertEqual(len(file_labels), 50)

    def test_aliases_map_to_expected_families(self):
        examples = [
            ({"make": "Mazda", "model": "MAZDA3"}, "Mazda3 / Axela"),
            ({"make": "Toyota", "model": "Prius C"}, "Toyota Aqua / Prius C"),
            ({"make": "Toyota", "model": "Prius"}, "Toyota Prius"),
            (
                {"make": "Mitsubishi", "model": "Outlander Sport"},
                "Mitsubishi ASX / RVR",
            ),
            (
                {"make": "Mitsubishi", "model": "Outlander"},
                "Mitsubishi Outlander",
            ),
            ({"make": "Subaru", "model": "Crosstrek"}, "Subaru XV / Crosstrek"),
        ]
        for source, expected in examples:
            source["class_name"] = f"{source['make']} {source['model']}"
            family = family_for_source(source, self.manifest["families"])
            self.assertIsNotNone(family)
            self.assertEqual(family["label"], expected)


class RecognitionStateTests(unittest.TestCase):
    def setUp(self):
        self.manifest = load_manifest(MANIFEST_PATH)
        self.manager = VehicleRecognitionManager(self.manifest)
        self.bbox = {"left": 10, "top": 20, "width": 300, "height": 200}

    def observe(self, label, confidence, frame, now=None):
        return self.manager.observe(
            42,
            label,
            confidence,
            frame,
            float(frame if now is None else now),
            self.bbox,
        )

    def test_three_separate_windows_confirm(self):
        self.assertIsNone(self.observe("Toyota Corolla", 0.8, 0))
        self.assertIsNone(self.observe("Toyota Corolla", 0.7, 30))
        event = self.observe("Toyota Corolla", 0.9, 60)
        self.assertIsNotNone(event)
        self.assertEqual(event["label"], "Toyota Corolla")
        self.assertAlmostEqual(event["confidence"], 0.8)
        self.assertEqual(
            self.manager.display_text(42, 60, "Car"),
            "Toyota Corolla #42 80%",
        )

    def test_cached_metadata_does_not_add_votes(self):
        self.observe("Toyota Corolla", 0.8, 0)
        self.observe("Toyota Corolla", 0.8, 1)
        self.observe("Toyota Corolla", 0.8, 29)
        self.assertFalse(self.manager.tracks[42].confirmed)
        self.observe("Toyota Corolla", 0.8, 30)
        self.assertFalse(self.manager.tracks[42].confirmed)

    def test_alternating_labels_reset_candidate(self):
        self.observe("Toyota Corolla", 0.8, 0)
        self.observe("Toyota Camry", 0.8, 30)
        self.observe("Toyota Corolla", 0.8, 60)
        self.observe("Toyota Camry", 0.8, 90)
        self.assertFalse(self.manager.tracks[42].confirmed)

    def test_low_confidence_becomes_unknown(self):
        self.observe("Toyota Corolla", 0.2, 0)
        self.observe("Toyota Corolla", 0.2, 30)
        self.observe("Toyota Corolla", 0.2, 60)
        self.assertEqual(
            self.manager.display_text(42, 60, "Car"), "Unknown #42"
        )

    def test_track_without_classifier_becomes_unknown_after_three_windows(self):
        self.manager.touch(42, 0, 0.0)
        self.assertEqual(self.manager.display_text(42, 60, "Car"), "Car #42")
        self.assertEqual(
            self.manager.display_text(42, 90, "Car"), "Unknown #42"
        )

    def test_prune_removes_expired_state(self):
        self.manager.touch(42, 0, 0.0)
        self.assertEqual(self.manager.prune(29.0), [])
        self.assertEqual(self.manager.prune(31.0), [42])
        self.assertNotIn(42, self.manager.tracks)

    def test_event_writer_outputs_valid_jsonl(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            log_path = Path(temp_dir) / "events.jsonl"
            writer = JsonlEventWriter(log_path, max_bytes=1024 * 1024, backups=1)
            manager = VehicleRecognitionManager(self.manifest, writer)
            for frame in [0, 30, 60]:
                manager.observe(
                    7,
                    "Honda Civic",
                    0.75,
                    frame,
                    float(frame),
                    self.bbox,
                )
            writer.close()
            lines = log_path.read_text(encoding="utf-8").splitlines()
            self.assertEqual(len(lines), 1)
            event = json.loads(lines[0])
            self.assertEqual(event["trackerId"], 7)
            self.assertEqual(event["make"], "Honda")
            self.assertEqual(event["model"], "Civic")
            self.assertEqual(event["modelVersion"], "vmmr-nz50-v1")


if __name__ == "__main__":
    unittest.main()
