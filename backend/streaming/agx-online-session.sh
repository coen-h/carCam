#!/usr/bin/env bash
set -euo pipefail

readonly STREAM_DIR="/home/hero/parkinglot-streaming"
readonly NVME_CLIP_DIR="/mnt/parkinglot-nvme/parkinglot-data/clips"
readonly FALLBACK_CLIP_DIR="/home/hero/parkinglot-clips"

if mountpoint -q /mnt/parkinglot-nvme && [[ -w "${NVME_CLIP_DIR}" ]]; then
    clip_dir="${NVME_CLIP_DIR}"
else
    clip_dir="${FALLBACK_CLIP_DIR}"
    mkdir -p "${clip_dir}"
    echo "[SESSION] WARNING: NVMe unavailable; recording to ${clip_dir}" >&2
fi

event_id="$(date -u +%Y%m%dT%H%M%SZ)"
location="${clip_dir}/${event_id}-%05d.mp4"
echo "[SESSION] live H.265 input; publishing H.264 and recording ${location}"

pipeline_pid=""
stop_pipeline() {
    trap - INT TERM
    if [[ -n "${pipeline_pid}" ]] && kill -0 "${pipeline_pid}" 2>/dev/null; then
        kill -TERM "${pipeline_pid}" 2>/dev/null || true
        for _ in 1 2 3 4 5; do
            kill -0 "${pipeline_pid}" 2>/dev/null || break
            sleep 1
        done
        kill -KILL "${pipeline_pid}" 2>/dev/null || true
    fi
    wait "${pipeline_pid}" 2>/dev/null || true
    exit 0
}
trap stop_pipeline INT TERM

# Decode and re-encode entirely in Jetson hardware. The H.264 elementary stream
# is split locally: RTSP publishes directly back into MediaMTX, while
# splitmuxsink makes independently playable five-second MP4 clips without
# another encode.
gst-launch-1.0 -q -e \
    rtspsrc location=rtsp://100.64.0.6:8554/camera-h265 \
        protocols=tcp latency=200 drop-on-latency=true \
    '!' rtph265depay \
    '!' h265parse config-interval=-1 \
    '!' 'video/x-h265,stream-format=byte-stream,alignment=au' \
    '!' nvv4l2decoder enable-max-performance=1 \
    '!' nvvidconv \
    '!' 'video/x-raw(memory:NVMM),format=NV12,width=1920,height=1080,framerate=30/1' \
    '!' nvv4l2h264enc \
        maxperf-enable=1 \
        bitrate=6000000 \
        num-B-Frames=0 \
        poc-type=2 \
        insert-vui=true \
        insert-sps-pps=true \
        idrinterval=30 \
        iframeinterval=30 \
    '!' tee name=encoded \
    encoded. '!' queue \
        '!' h264parse config-interval=-1 \
        '!' rtspclientsink location=rtsp://100.64.0.6:8554/public-h264 \
            protocols=tcp latency=100 \
    encoded. '!' queue \
        '!' h264parse \
        '!' 'video/x-h264,stream-format=avc,alignment=au' \
        '!' splitmuxsink location="${location}" \
            max-size-time=5000000000 max-size-bytes=0 muxer-factory=mp4mux \
            async-finalize=true send-keyframe-requests=true &

pipeline_pid=$!
wait "${pipeline_pid}"
