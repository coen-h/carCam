#!/usr/bin/env bash
set -euo pipefail

# Depth-only benchmark with temporal depth stabilization disabled. RGB capture,
# encoded output resolution, frame-rate caps and bitrate remain unchanged.
readonly RUNTIME_DIR="${ZED_RUNTIME_DIR:-/home/coen/zed-depth-test-runtime}"

export GST_PLUGIN_PATH="${RUNTIME_DIR}/lib/gstreamer-1.0"
export LD_LIBRARY_PATH="${RUNTIME_DIR}/lib:/usr/local/zed/lib:/usr/local/cuda/lib64:/usr/lib/aarch64-linux-gnu"

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
