#!/usr/bin/env bash
set -euo pipefail

readonly RUNTIME_DIR="${ZED_RUNTIME_DIR:-/home/coen/phase1-test-runtime-20260819T070500Z}"

export GST_PLUGIN_PATH="${RUNTIME_DIR}/lib/gstreamer-1.0"
export LD_LIBRARY_PATH="${RUNTIME_DIR}/lib:/usr/local/zed/lib:/usr/local/cuda/lib64:/usr/lib/aarch64-linux-gnu"
export ZED_DEPTH_TRIGGER_CONFIG="${RUNTIME_DIR}/depth-trigger-test.ini"

# Isolated runs rebuild by default. Set ZED_DEPTH_TRIGGER_RECALIBRATE=0 to test
# loading the saved baseline across a service restart.
if [[ "${ZED_DEPTH_TRIGGER_RECALIBRATE:-1}" == "1" ]]; then
    : > /dev/shm/parkinglot-depth-calibrate.request
fi

exec "${RUNTIME_DIR}/bin/gst-zed-rtsp-launch" \
    -p 8555 \
    -a 0.0.0.0 \
    zedsrc \
    stream-type=0 \
    camera-resolution=1 \
    camera-fps=30 \
    depth-mode=1 \
    depth-stabilization=0 \
    enable-positional-tracking=false \
    od-enabled=false \
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
