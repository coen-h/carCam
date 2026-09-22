#!/usr/bin/env bash
set -euo pipefail

readonly RUNTIME_DIR="/home/coen/zed-native-rtsp"
readonly STREAM_ENV="${RUNTIME_DIR}/stream.env"

# Keep the existing H.264 settings when no environment file is installed so
# this script remains a drop-in rollback. The cellular deployment installs an
# explicit stream.env that selects the H.265 settings.
ZED_VIDEO_CODEC="h264"
ZED_VIDEO_BITRATE="12500000"
if [[ -r "${STREAM_ENV}" ]]; then
    # shellcheck source=/dev/null
    source "${STREAM_ENV}"
fi

case "${ZED_VIDEO_CODEC}" in
    h264)
        encoder="nvv4l2h264enc"
        parser="h264parse"
        payloader="rtph264pay"
        encoder_extra=(num-B-Frames=0 poc-type=2)
        ;;
    h265)
        encoder="nvv4l2h265enc"
        parser="h265parse"
        payloader="rtph265pay"
        encoder_extra=()
        ;;
    *)
        echo "Unsupported ZED_VIDEO_CODEC=${ZED_VIDEO_CODEC}; use h264 or h265" >&2
        exit 2
        ;;
esac

if [[ ! "${ZED_VIDEO_BITRATE}" =~ ^[0-9]+$ ]] || (( ZED_VIDEO_BITRATE < 100000 )); then
    echo "Invalid ZED_VIDEO_BITRATE=${ZED_VIDEO_BITRATE}" >&2
    exit 2
fi

export GST_PLUGIN_PATH="${RUNTIME_DIR}/lib/gstreamer-1.0"
export LD_LIBRARY_PATH="${RUNTIME_DIR}/lib:/usr/local/zed/lib:/usr/local/cuda/lib64:/usr/lib/aarch64-linux-gnu"
export ZED_DEPTH_TRIGGER_CONFIG="${RUNTIME_DIR}/depth-trigger.ini"

# The ZED SDK exposes BGRA. BGRx has the same four-byte B/G/R/padding layout,
# and is the format accepted by the Nano's VIC-backed nvvidconv element.
# capssetter changes metadata only; it does not copy or convert the pixels.
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
    '!' "${encoder}" \
        maxperf-enable=1 \
        bitrate="${ZED_VIDEO_BITRATE}" \
        "${encoder_extra[@]}" \
        insert-vui=true \
        insert-sps-pps=true \
        idrinterval=30 \
        iframeinterval=30 \
    '!' "${parser}" \
    '!' "${payloader}" config-interval=1 name=pay0 pt=96
