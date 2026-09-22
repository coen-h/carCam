#!/usr/bin/env bash
set -euo pipefail

# Experimental neural trigger benchmark only. This is intentionally separate
# from the production launcher because the ZED FAST object detector reduced the
# Nano's 1080p stream from 30 FPS to approximately 7.3 FPS.
readonly RUNTIME_DIR="${ZED_RUNTIME_DIR:-/home/coen/zed-trigger-test-runtime}"

export GST_PLUGIN_PATH="${RUNTIME_DIR}/lib/gstreamer-1.0"
export LD_LIBRARY_PATH="${RUNTIME_DIR}/lib:/usr/local/zed/lib:/usr/local/cuda/lib64:/usr/lib/aarch64-linux-gnu"

exec "${RUNTIME_DIR}/bin/gst-zed-rtsp-launch" \
    -p 8555 \
    -a 0.0.0.0 \
    --trigger-config "${RUNTIME_DIR}/trigger.ini" \
    zedsrc \
    stream-type=0 \
    camera-resolution=1 \
    camera-fps=30 \
    depth-mode=1 \
    enable-positional-tracking=false \
    od-enabled=true \
    od-enable-tracking=false \
    od-detection-model=0 \
    od-confidence=40 \
    od-max-range=20000 \
    od-allow-reduced-precision-inference=true \
    od-conf-people=-1 \
    od-conf-vehicle=40 \
    od-conf-bag=-1 \
    od-conf-animal=-1 \
    od-conf-electronics=-1 \
    od-conf-fruit-vegetables=-1 \
    od-conf-sport=-1 \
    do-timestamp=true \
    '!' queue max-size-buffers=2 leaky=downstream \
    '!' capssetter 'caps=video/x-raw,format=BGRx' \
    '!' nvvidconv \
    '!' 'video/x-raw(memory:NVMM),format=NV12,width=1920,height=1080,framerate=30/1' \
    '!' nvv4l2h264enc \
        maxperf-enable=1 \
        bitrate=12500000 \
        num-B-Frames=0 \
        poc-type=2 \
        insert-vui=true \
        insert-sps-pps=true \
        idrinterval=30 \
        iframeinterval=30 \
    '!' h264parse \
    '!' rtph264pay config-interval=1 name=pay0 pt=96
