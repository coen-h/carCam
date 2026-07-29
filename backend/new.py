import ctypes
import os
import sys
import time
import threading
from pathlib import Path

# Jetson's glibc can exhaust static TLS slots when OpenCV/RapidOCR are imported
# before NvDCF loads libgomp. Loading the system OpenMP runtime first keeps the
# normal `DISPLAY=:0 python3 new.py` start command reliable.
ctypes.CDLL("libgomp.so.1", mode=ctypes.RTLD_GLOBAL)

import cv2
import requests
from rapidocr_onnxruntime import RapidOCR

import gi

gi.require_version("Gst", "1.0")
from gi.repository import GLib, Gst
import pyds

from vehicle_recognition import (
    JsonlEventWriter,
    VehicleRecognitionManager,
    load_manifest,
)


# Runtime paths and constants
SCRIPT_DIR = Path(__file__).resolve().parent
SAVE_DIR = Path(os.path.expanduser("~/xavier_received_images"))
SAVE_DIR.mkdir(parents=True, exist_ok=True)

YOLO_CONFIG = SCRIPT_DIR / "config_infer_yolo26.txt"
TRACKER_CONFIG = SCRIPT_DIR / "config_tracker_NvDCF_perf.yml"
LPD_CONFIG = SCRIPT_DIR / "lpd_DetectNet2_us.txt"
VEHICLE_CONFIG = SCRIPT_DIR / "config_infer_vehicle_model.txt"
VEHICLE_MANIFEST = SCRIPT_DIR / "vehicle_model_manifest.json"
VEHICLE_LABELS = SCRIPT_DIR / "vehicle_model_labels.txt"
VEHICLE_ONNX = Path("/home/hero/vehicle_recognition/vmmr_nz50.onnx")

ZED_RTSP_URL = "rtsp://10.42.0.2:8555/zed_stream"
CONVEX_URL = "https://cheery-grasshopper-930.convex.site/uplink"

OCR_THROTTLE_INTERVAL = 0.15
PLATE_CONFIRM_COUNT = 3
PLATE_LOG_COOLDOWN = 15.0
OCR_MIN_CONFIDENCE = 0.85
OCR_MIN_LENGTH = 4

COCO_CLASSES = {
    0: "Person",
    1: "Bicycle",
    2: "Car",
    3: "Motorcycle",
    5: "Bus",
    7: "Truck",
    10: "Fire Hydrant",
    56: "Chair",
    62: "TV",
    67: "Cell Phone",
}
CAR_CLASS_ID = 2
VEHICLE_CLASSIFIER_COMPONENT_ID = 3
UNTRACKED = 18446744073709551615


def _require_runtime_files() -> None:
    required = [
        YOLO_CONFIG,
        TRACKER_CONFIG,
        LPD_CONFIG,
        VEHICLE_CONFIG,
        VEHICLE_MANIFEST,
        VEHICLE_LABELS,
        VEHICLE_ONNX,
    ]
    missing = [str(path) for path in required if not path.is_file()]
    if missing:
        raise RuntimeError(
            "Required runtime files are missing:\n  - " + "\n  - ".join(missing)
        )


manifest = load_manifest(VEHICLE_MANIFEST)
event_writer = JsonlEventWriter(
    SAVE_DIR / "vehicle_recognition.jsonl",
    max_bytes=int(manifest["runtime"]["eventLogMaxBytes"]),
    backups=int(manifest["runtime"]["eventLogBackups"]),
)
vehicle_recognizer = VehicleRecognitionManager(manifest, event_writer)

tracked_plates = {}
logged_plates = {}
seen_objects = set()

print("[INFO] Initializing RapidOCR...")
plate_reader = RapidOCR()


def log_plate_to_convex(plate: str, filename: str, direction: str = "in") -> None:
    try:
        response = requests.post(
            CONVEX_URL,
            json={
                "carPlate": plate,
                "fileTitle": filename,
                "direction": direction
            },
            timeout=4,
        )
        if response.status_code == 200:
            print(f"   [CONVEX] Logged plate: {plate} (Dir: {direction})")
        else:
            print(
                f"   [CONVEX] Unexpected status {response.status_code} "
                f"for plate: {plate} | Response: {response.text}"
            )
    except Exception as exc:
        print(f"   [CONVEX ERROR] {exc}")


def on_buffer(_pad, info, _user_data):
    gst_buffer = info.get_buffer()
    if not gst_buffer:
        return Gst.PadProbeReturn.OK

    batch_meta = pyds.gst_buffer_get_nvds_batch_meta(hash(gst_buffer))
    if not batch_meta:
        return Gst.PadProbeReturn.OK

    now = time.time()
    l_frame = batch_meta.frame_meta_list
    while l_frame is not None:
        try:
            frame_meta = pyds.NvDsFrameMeta.cast(l_frame.data)
        except StopIteration:
            break

        try:
            surface = pyds.get_nvds_buf_surface(
                hash(gst_buffer), frame_meta.batch_id
            )
        except Exception:
            surface = None

        frame_num = int(frame_meta.frame_num)
        l_obj = frame_meta.obj_meta_list
        while l_obj is not None:
            try:
                obj = pyds.NvDsObjectMeta.cast(l_obj.data)
            except StopIteration:
                break

            _process_object(obj, surface, now, frame_num)

            try:
                l_obj = l_obj.next
            except StopIteration:
                break

        if frame_num % 150 == 0:
            vehicle_recognizer.prune(now)

        try:
            l_frame = l_frame.next
        except StopIteration:
            break

    return Gst.PadProbeReturn.OK


def _process_object(obj, surface, now: float, frame_num: int) -> None:
    slot_id = int(obj.object_id)
    component_id = int(obj.unique_component_id)

    if component_id == 2 and obj.class_id == 0:
        _handle_plate(obj, surface, slot_id, now)
        return

    if component_id == 1:
        _handle_primary(obj, slot_id, frame_num, now)


def _read_vehicle_classifier(obj):
    l_classifier = obj.classifier_meta_list
    while l_classifier is not None:
        try:
            classifier_meta = pyds.NvDsClassifierMeta.cast(l_classifier.data)
        except StopIteration:
            break

        if int(classifier_meta.unique_component_id) == VEHICLE_CLASSIFIER_COMPONENT_ID:
            l_label = classifier_meta.label_info_list
            while l_label is not None:
                try:
                    label_info = pyds.NvDsLabelInfo.cast(l_label.data)
                    label = label_info.result_label or ""
                    if label:
                        return str(label), float(label_info.result_prob)
                except StopIteration:
                    break
                try:
                    l_label = l_label.next
                except StopIteration:
                    break

        try:
            l_classifier = l_classifier.next
        except StopIteration:
            break
    return None


def _vehicle_bbox(obj) -> dict:
    rect = obj.rect_params
    return {
        "left": max(0, int(rect.left)),
        "top": max(0, int(rect.top)),
        "width": max(0, int(rect.width)),
        "height": max(0, int(rect.height)),
    }


def _handle_primary(obj, slot_id: int, frame_num: int, now: float) -> None:
    base_label = obj.obj_label or COCO_CLASSES.get(
        obj.class_id, f"Class_{obj.class_id}"
    )
    rect = obj.detector_bbox_info.org_bbox_coords

    if slot_id not in seen_objects:
        seen_objects.add(slot_id)
        id_text = str(slot_id) if slot_id != UNTRACKED else "?"
        print(
            f"[DETECT] {base_label} (class={obj.class_id}, id={id_text}) | "
            f"{int(rect.width)}x{int(rect.height)}"
        )

    if obj.class_id != CAR_CLASS_ID or slot_id == UNTRACKED:
        suffix = f" #{slot_id}" if slot_id != UNTRACKED else ""
        obj.text_params.display_text = f"{base_label}{suffix}"
        return

    vehicle_recognizer.touch(slot_id, frame_num, now)
    result = _read_vehicle_classifier(obj)
    if result is not None:
        label, confidence = result
        event = vehicle_recognizer.observe(
            slot_id,
            label,
            confidence,
            frame_num,
            now,
            _vehicle_bbox(obj),
        )
        if event is not None:
            print(
                f"[VEHICLE] Confirmed ID {slot_id}: {event['label']} "
                f"({event['confidence']:.2f})"
            )

    obj.text_params.display_text = vehicle_recognizer.display_text(
        slot_id, frame_num, base_label
    )


def _handle_plate(obj, surface, slot_id: int, now: float) -> None:
    if slot_id not in tracked_plates:
        tracked_plates[slot_id] = {
            "candidate": "",
            "count": 0,
            "confirmed": "",
            "last_ocr": 0.0,
        }

    slot = tracked_plates[slot_id]
    if slot["confirmed"]:
        obj.text_params.display_text = slot["confirmed"]
    elif slot["candidate"]:
        obj.text_params.display_text = slot["candidate"]
    else:
        obj.text_params.display_text = (
            "Plate" if slot_id == UNTRACKED else f"Plate #{slot_id}"
        )

    if now - slot["last_ocr"] < OCR_THROTTLE_INTERVAL or surface is None:
        return

    rect = obj.detector_bbox_info.org_bbox_coords
    x1 = max(0, int(rect.left))
    y1 = max(0, int(rect.top))
    x2 = min(surface.shape[1], int(rect.left + rect.width))
    y2 = min(surface.shape[0], int(rect.top + rect.height))
    if x2 <= x1 or y2 <= y1:
        return

    crop_rgba = surface[y1:y2, x1:x2]
    if crop_rgba.size == 0:
        return

    crop_bgr = cv2.cvtColor(crop_rgba, cv2.COLOR_RGBA2BGR)
    slot["last_ocr"] = time.time()
    try:
        results, _ = plate_reader(
            crop_bgr, use_det=False, use_cls=False, use_rec=True
        )
    except Exception as exc:
        print(f"   [OCR ERROR] {exc}")
        return

    if not results or not results[0]:
        return

    text = results[0][0].upper().strip()
    confidence = float(results[0][1])
    if len(text) < OCR_MIN_LENGTH or confidence < OCR_MIN_CONFIDENCE:
        return

    obj.text_params.display_text = text
    if text == slot["candidate"]:
        slot["count"] += 1
    else:
        slot["candidate"] = text
        slot["count"] = 1

    if slot["count"] >= PLATE_CONFIRM_COUNT and slot["confirmed"] != text:
        slot["confirmed"] = text
        _log_plate_async(crop_bgr, text, now)


def _log_plate_async(crop_bgr, text: str, now: float) -> None:
    last = logged_plates.get(text, 0.0)
    if now - last < PLATE_LOG_COOLDOWN:
        return

    logged_plates[text] = now
    timestamp = time.strftime("%Y%m%d-%H%M%S")
    filename = f"plate_{text}_{timestamp}.jpg"
    filepath = SAVE_DIR / filename

    direction = "in" 

    def _worker(img, plate, file_name, file_path, dir_str):
        try:
            cv2.imwrite(str(file_path), img)
        except Exception as exc:
            print(f"   [SAVE ERROR] {exc}")
            
        log_plate_to_convex(plate, file_name, dir_str)

    threading.Thread(
        target=_worker,
        args=(crop_bgr, text, filename, filepath, direction),
        daemon=True,
    ).start()


def build_pipeline():
    _require_runtime_files()
    Gst.init(None)
    pipeline = Gst.Pipeline.new("lpr-pipeline")

    def make(factory: str, name: str):
        element = Gst.ElementFactory.make(factory, name)
        if not element:
            raise RuntimeError(
                f"Could not create GStreamer element: {factory} ({name})"
            )
        pipeline.add(element)
        return element

    src = make("rtspsrc", "src")
    depay = make("rtph264depay", "depay")
    h264parse = make("h264parse", "h264parse")
    decoder = make("nvv4l2decoder", "decoder")
    mux = make("nvstreammux", "mux")
    yolo = make("nvinfer", "nvinfer0")
    tracker = make("nvtracker", "tracker")
    lpd = make("nvinfer", "plate-detector")
    vehicle_model = make("nvinfer", "vehicle-family-classifier")
    converter = make("nvvideoconvert", "converter")
    capsfilter = make("capsfilter", "capsfilter")
    osd = make("nvdsosd", "osd")
    sink = make("nv3dsink", "sink")

    src.set_property("location", ZED_RTSP_URL)
    src.set_property("protocols", "tcp")
    src.set_property("latency", 200)

    mux.set_property("width", 1920)
    mux.set_property("height", 1080)
    mux.set_property("batch-size", 1)
    mux.set_property("batched-push-timeout", 33333)
    mux.set_property("live-source", 1)

    yolo.set_property("config-file-path", str(YOLO_CONFIG))
    tracker.set_property("tracker-width", 640)
    tracker.set_property("tracker-height", 384)
    tracker.set_property("ll-config-file", str(TRACKER_CONFIG))
    tracker.set_property(
        "ll-lib-file",
        "/opt/nvidia/deepstream/deepstream/lib/"
        "libnvds_nvmultiobjecttracker.so",
    )
    lpd.set_property("config-file-path", str(LPD_CONFIG))
    vehicle_model.set_property("config-file-path", str(VEHICLE_CONFIG))

    capsfilter.set_property(
        "caps", Gst.Caps.from_string("video/x-raw(memory:NVMM), format=RGBA")
    )
    sink.set_property("sync", False)

    def on_pad_added(_src, pad):
        caps = pad.get_current_caps()
        if caps and "video" in caps.to_string():
            sink_pad = depay.get_static_pad("sink")
            if not sink_pad.is_linked():
                pad.link(sink_pad)

    src.connect("pad-added", on_pad_added)

    for upstream, downstream in [(depay, h264parse), (h264parse, decoder)]:
        if not upstream.link(downstream):
            raise RuntimeError(
                f"Link failed: {upstream.get_name()} -> {downstream.get_name()}"
            )

    mux_sink_pad = mux.get_request_pad("sink_0")
    result = decoder.get_static_pad("src").link(mux_sink_pad)
    if result != Gst.PadLinkReturn.OK:
        raise RuntimeError(f"decoder -> mux link failed: {result}")

    for upstream, downstream in [
        (mux, yolo),
        (yolo, tracker),
        (tracker, lpd),
        (lpd, vehicle_model),
        (vehicle_model, converter),
        (converter, capsfilter),
        (capsfilter, osd),
        (osd, sink),
    ]:
        if not upstream.link(downstream):
            raise RuntimeError(
                f"Link failed: {upstream.get_name()} -> {downstream.get_name()}"
            )

    return pipeline, osd


def make_bus_handler(pipeline, loop):
    def bus_call(_bus, message, _loop):
        message_type = message.type
        if message_type == Gst.MessageType.EOS:
            print("\n[BUS] End of stream.")
            loop.quit()
        elif message_type == Gst.MessageType.ERROR:
            error, debug = message.parse_error()
            print(f"\n[BUS ERROR] {error.message}")
            if debug:
                print(f"[BUS DEBUG] {debug}")
            loop.quit()
        elif message_type == Gst.MessageType.WARNING:
            warning, _ = message.parse_warning()
            print(f"[BUS WARN] {warning.message}")
        elif (
            message_type == Gst.MessageType.STATE_CHANGED
            and message.src == pipeline
        ):
            _, new_state, _ = message.parse_state_changed()
            print(f"[STATE] {new_state.value_nick}")
        return True

    return bus_call


def make_watchdog(frames_seen: list, start_time: list, loop):
    def watchdog():
        elapsed = time.time() - start_time[0]
        if frames_seen[0] == 0:
            if elapsed > 15.0:
                print(
                    f"\n[WATCHDOG] No frames received after {elapsed:.0f}s.\n"
                    "  -> Check that the ZED RTSP stream is running:\n"
                    f"     gst-launch-1.0 rtspsrc location={ZED_RTSP_URL} ! "
                    "fakesink"
                )
                loop.quit()
                return False
        else:
            fps = frames_seen[0] / elapsed if elapsed > 0 else 0
            print(f"[WATCHDOG] {frames_seen[0]} frames | ~{fps:.1f} fps")
        return True

    return watchdog


def main():
    pipeline, osd_element = build_pipeline()
    loop = GLib.MainLoop()

    bus = pipeline.get_bus()
    bus.add_signal_watch()
    bus.connect("message", make_bus_handler(pipeline, loop), loop)

    osd_sink_pad = osd_element.get_static_pad("sink")
    frames_seen = [0]
    start_time = [0.0]

    def probe_wrapper(pad, info, user_data):
        frames_seen[0] += 1
        if frames_seen[0] == 1:
            print(
                f"[INFO] First frame received after "
                f"{time.time() - start_time[0]:.2f}s\n"
            )
        return on_buffer(pad, info, user_data)

    osd_sink_pad.add_probe(Gst.PadProbeType.BUFFER, probe_wrapper, None)
    GLib.timeout_add_seconds(
        5, make_watchdog(frames_seen, start_time, loop)
    )

    result = pipeline.set_state(Gst.State.PLAYING)
    if result == Gst.StateChangeReturn.FAILURE:
        print("[FATAL] Could not set pipeline to PLAYING.")
        sys.exit(1)

    start_time[0] = time.time()
    print("[INFO] Pipeline PLAYING - press Ctrl+C to stop\n")
    try:
        loop.run()
    except KeyboardInterrupt:
        print("\n[INFO] Interrupt received - shutting down...")
    finally:
        pipeline.set_state(Gst.State.NULL)
        event_writer.close()
        print("[INFO] Pipeline offline.")


if __name__ == "__main__":
    main()
