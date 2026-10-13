#!/usr/bin/env python3
"""Measure delivered decoded frames without displaying or saving video."""
import argparse
import json
import time

import gi
gi.require_version("Gst", "1.0")
from gi.repository import GLib, Gst


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("url")
    parser.add_argument("--codec", choices=("h264", "h265"), default="h264")
    parser.add_argument("--seconds", type=int, default=15)
    args = parser.parse_args()
    Gst.init(None)
    pipeline = Gst.parse_launch(
        'rtspsrc location="{}" protocols=tcp latency=200 ! rtp{}depay ! '
        '{}parse ! nvv4l2decoder ! fakesink name=output sync=false'.format(
            args.url, args.codec, args.codec
        )
    )
    loop = GLib.MainLoop()
    started = time.monotonic()
    frames = []
    errors = []

    def frame(_pad, _info):
        frames.append(time.monotonic())
        return Gst.PadProbeReturn.OK

    def message(_bus, msg):
        if msg.type == Gst.MessageType.ERROR:
            error, debug = msg.parse_error()
            errors.append({"error": str(error), "debug": debug})
            loop.quit()
        elif msg.type == Gst.MessageType.EOS:
            loop.quit()

    pipeline.get_by_name("output").get_static_pad("sink").add_probe(
        Gst.PadProbeType.BUFFER, frame
    )
    bus = pipeline.get_bus()
    bus.add_signal_watch()
    bus.connect("message", message)
    GLib.timeout_add_seconds(args.seconds, lambda: (loop.quit(), False)[1])
    try:
        pipeline.set_state(Gst.State.PLAYING)
        loop.run()
    finally:
        pipeline.set_state(Gst.State.NULL)
    span = frames[-1] - frames[0] if len(frames) > 1 else 0
    result = {
        "url": args.url, "codec": args.codec, "frames": len(frames),
        "first_frame_seconds": round(frames[0] - started, 3) if frames else None,
        "delivered_fps": round((len(frames) - 1) / span, 2) if span else 0,
        "errors": errors,
    }
    print(json.dumps(result), flush=True)
    return 0 if frames and not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
