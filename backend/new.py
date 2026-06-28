import os
import sys
import time
import cv2
import requests
import threading

from rapidocr_onnxruntime import RapidOCR

import gi
gi.require_version('Gst', '1.0')
from gi.repository import Gst, GLib
import pyds



# CONFIG
SAVE_DIR = os.path.expanduser("~/xavier_received_images")
os.makedirs(SAVE_DIR, exist_ok=True)
ZED_RTSP_URL = "rtsp://192.168.0.137:8554/zed_stream"

CONVEX_URL = "https://lovable-cat-739.convex.site/uplink"
OCR_THROTTLE_INTERVAL = 0.15
PLATE_CONFIRM_COUNT   = 3
PLATE_LOG_COOLDOWN    = 15.0
OCR_MIN_CONFIDENCE    = 0.85
OCR_MIN_LENGTH        = 4

COCO_CLASSES = {
    0: "Person", 1: "Bicycle", 2: "Car", 3: "Motorcycle",
    5: "Bus", 7: "Truck", 10: "Fire Hydrant", 56: "Chair",
    62: "TV", 67: "Cell Phone",
}

UNTRACKED = 18446744073709551615



tracked_plates  = {}
logged_plates   = {} 
seen_objects    = set()

print("[INFO] Initializing RapidOCR...")
plate_reader = RapidOCR()



def log_plate_to_convex(plate: str, filename: str) -> None:
    try:
        r = requests.post(
            CONVEX_URL,
            json={"carPlate": plate, "fileTitle": filename},
            timeout=4,
        )
        if r.status_code == 200:
            print(f"   [CONVEX] Logged plate: {plate}")
        else:
            print(f"   [CONVEX] Unexpected status {r.status_code} for plate: {plate}")
    except Exception as exc:
        print(f"   [CONVEX ERROR] {exc}")



def on_buffer(pad, info, _user_data):
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
            surface = pyds.get_nvds_buf_surface(hash(gst_buffer), frame_meta.batch_id)
        except Exception:
            surface = None

        l_obj = frame_meta.obj_meta_list
        while l_obj is not None:
            try:
                obj = pyds.NvDsObjectMeta.cast(l_obj.data)
            except StopIteration:
                break

            _process_object(obj, surface, now)

            try:
                l_obj = l_obj.next
            except StopIteration:
                break

        try:
            l_frame = l_frame.next
        except StopIteration:
            break

    return Gst.PadProbeReturn.OK


def _process_object(obj, surface, now: float) -> None:
    slot_id = obj.object_id
    comp    = obj.unique_component_id

    if comp == 2 and obj.class_id == 0:
        _handle_plate(obj, surface, slot_id, now)
        return

    if comp == 1:
        _handle_primary(obj, slot_id)
        return


def _handle_primary(obj, slot_id) -> None:
    label = obj.obj_label if obj.obj_label else COCO_CLASSES.get(
        obj.class_id, f"Class_{obj.class_id}"
    )

    rect = obj.detector_bbox_info.org_bbox_coords
    w, h = int(rect.width), int(rect.height)

    if slot_id not in seen_objects:
        seen_objects.add(slot_id)
        id_str = str(slot_id) if slot_id != UNTRACKED else "?"
        print(f"[DETECT] {label} (class={obj.class_id}, id={id_str}) | {w}×{h}")

    display_id = f" #{slot_id}" if slot_id != UNTRACKED else ""
    obj.text_params.display_text = f"{label}{display_id}"


def _handle_plate(obj, surface, slot_id, now: float) -> None:
    if slot_id not in tracked_plates:
        tracked_plates[slot_id] = {
            "candidate":  "",
            "count":      0,
            "confirmed":  "",
            "last_ocr":   0.0,
        }

    slot = tracked_plates[slot_id]

    if slot["confirmed"]:
        obj.text_params.display_text = slot["confirmed"]
    elif slot["candidate"]:
        obj.text_params.display_text = slot["candidate"]
    else:
        obj.text_params.display_text = "Plate" if slot_id == UNTRACKED else f"Plate #{slot_id}"

    if now - slot["last_ocr"] < OCR_THROTTLE_INTERVAL:
        return

    if surface is None:
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
        results, _ = plate_reader(crop_bgr, use_det=False, use_cls=False, use_rec=True)
    except Exception as exc:
        print(f"   [OCR ERROR] {exc}")
        return

    if not results or not results[0]:
        return

    text  = results[0][0].upper().strip()
    conf  = float(results[0][1])

    if len(text) < OCR_MIN_LENGTH or conf < OCR_MIN_CONFIDENCE:
        return

    obj.text_params.display_text = text

    if text == slot["candidate"]:
        slot["count"] += 1
    else:
        slot["candidate"] = text
        slot["count"]     = 1

    if slot["count"] >= PLATE_CONFIRM_COUNT and slot["confirmed"] != text:
        slot["confirmed"] = text
        _log_plate_async(crop_bgr, text, now)


def _log_plate_async(crop_bgr, text: str, now: float) -> None:
    last = logged_plates.get(text, 0.0)
    if now - last < PLATE_LOG_COOLDOWN:
        return

    logged_plates[text] = now
    ts       = time.strftime("%Y%m%d-%H%M%S")
    filename = f"plate_{text}_{ts}.jpg"
    filepath = os.path.join(SAVE_DIR, filename)

    def _worker(img, plate, fname, fpath):
        try:
            cv2.imwrite(fpath, img)
        except Exception as exc:
            print(f"   [SAVE ERROR] {exc}")
        log_plate_to_convex(plate, fname)

    threading.Thread(
        target=_worker,
        args=(crop_bgr, text, filename, filepath),
        daemon=True,
    ).start()



def build_pipeline() -> tuple:
    Gst.init(None)
    pipeline = Gst.Pipeline.new("lpr-pipeline")

    def make(factory: str, name: str):
        el = Gst.ElementFactory.make(factory, name)
        if not el:
            raise RuntimeError(f"Could not create GStreamer element: {factory} ({name})")
        pipeline.add(el)
        return el

    src        = make("rtspsrc",        "src")
    depay      = make("rtph264depay",   "depay")
    h264parse  = make("h264parse",      "h264parse")
    decoder    = make("nvv4l2decoder",  "decoder")
    mux        = make("nvstreammux",    "mux")
    yolo       = make("nvinfer",        "nvinfer0")
    tracker    = make("nvtracker",      "tracker")
    lpd        = make("nvinfer",        "plate-detector")
    converter  = make("nvvideoconvert", "converter")
    capsfilter = make("capsfilter",     "capsfilter")
    osd        = make("nvdsosd",        "osd")
    sink       = make("nv3dsink",       "sink")

    src.set_property("location",  ZED_RTSP_URL)
    src.set_property("protocols", "tcp")
    src.set_property("latency",   200)

    mux.set_property("width",                1920)
    mux.set_property("height",               1080)
    mux.set_property("batch-size",           1)
    mux.set_property("batched-push-timeout", 33333)
    mux.set_property("live-source",          1)

    yolo.set_property("config-file-path", "config_infer_yolo26.txt")

    tracker.set_property("tracker-width",  640)
    tracker.set_property("tracker-height", 384)
    tracker.set_property(
        "ll-config-file",
        "/home/hero/config_tracker_NvDCF_perf.yml",
    )
    tracker.set_property(
        "ll-lib-file",
        "/opt/nvidia/deepstream/deepstream/lib/libnvds_nvmultiobjecttracker.so",
    )

    lpd.set_property("config-file-path", "lpd_DetectNet2_us.txt")

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

    for a, b in [
        (depay,     h264parse),
        (h264parse, decoder),
    ]:
        if not a.link(b):
            raise RuntimeError(f"Link failed: {a.get_name()} → {b.get_name()}")

    mux_sink_pad = mux.get_request_pad("sink_0")
    ret = decoder.get_static_pad("src").link(mux_sink_pad)
    if ret != Gst.PadLinkReturn.OK:
        raise RuntimeError(f"decoder → mux link failed: {ret}")

    for a, b in [
        (mux,       yolo),
        (yolo,      tracker),
        (tracker,   lpd),
        (lpd,       converter),
        (converter, capsfilter),
        (capsfilter,osd),
        (osd,       sink),
    ]:
        if not a.link(b):
            raise RuntimeError(f"Link failed: {a.get_name()} → {b.get_name()}")

    return pipeline, osd



def make_bus_handler(pipeline, loop):
    def bus_call(_bus, message, _loop):
        t = message.type
        if t == Gst.MessageType.EOS:
            print("\n[BUS] End of stream.")
            loop.quit()
        elif t == Gst.MessageType.ERROR:
            err, dbg = message.parse_error()
            print(f"\n[BUS ERROR] {err.message}")
            if dbg:
                print(f"[BUS DEBUG] {dbg}")
            loop.quit()
        elif t == Gst.MessageType.WARNING:
            err, _ = message.parse_warning()
            print(f"[BUS WARN] {err.message}")
        elif t == Gst.MessageType.STATE_CHANGED:
            if message.src == pipeline:
                _, new, _ = message.parse_state_changed()
                print(f"[STATE] {new.value_nick}")
        return True
    return bus_call



def make_watchdog(frames_seen: list, start_time: list, loop):
    def watchdog():
        elapsed = time.time() - start_time[0]
        if frames_seen[0] == 0:
            if elapsed > 15.0:
                print(
                    f"\n[WATCHDOG] No frames received after {elapsed:.0f}s.\n"
                    "  → Check that the ZED RTSP stream is running:\n"
                    f"    gst-launch-1.0 rtspsrc location={ZED_RTSP_URL} ! fakesink"
                )
                loop.quit()
                return False
        else:
            fps = frames_seen[0] / elapsed if elapsed > 0 else 0
            print(f"[WATCHDOG] ✓ {frames_seen[0]} frames | ~{fps:.1f} fps")
        return True
    return watchdog



def main():
    pipeline, osd_el = build_pipeline()
    loop = GLib.MainLoop()

    bus = pipeline.get_bus()
    bus.add_signal_watch()
    bus.connect("message", make_bus_handler(pipeline, loop), loop)

    osd_sink_pad = osd_el.get_static_pad("sink")
    frames_seen  = [0]
    start_time   = [0.0]

    def probe_wrapper(pad, info, u_data):
        frames_seen[0] += 1
        if frames_seen[0] == 1:
            print(f"[INFO] First frame received after "
                  f"{time.time() - start_time[0]:.2f}s ✓\n")
        return on_buffer(pad, info, u_data)

    osd_sink_pad.add_probe(Gst.PadProbeType.BUFFER, probe_wrapper, None)

    GLib.timeout_add_seconds(5, make_watchdog(frames_seen, start_time, loop))

    ret = pipeline.set_state(Gst.State.PLAYING)
    if ret == Gst.StateChangeReturn.FAILURE:
        print("[FATAL] Could not set pipeline to PLAYING.")
        sys.exit(1)

    start_time[0] = time.time()
    print("[INFO] Pipeline PLAYING — press Ctrl+C to stop\n")

    try:
        loop.run()
    except KeyboardInterrupt:
        print("\n[INFO] Interrupt received — shutting down...")
    finally:
        pipeline.set_state(Gst.State.NULL)
        print("[INFO] Pipeline offline.")


if __name__ == "__main__":
    main()