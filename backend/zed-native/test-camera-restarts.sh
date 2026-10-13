#!/usr/bin/env bash
# Run on the Nano through sudo. Exercises SIGTERM while MediaMTX stays connected.
set -euo pipefail
if (( EUID != 0 )); then
    echo "Run with sudo; the test restarts zed-rtsp.service." >&2
    exit 2
fi
readonly runtime=/home/coen/zed-native-rtsp
readonly checker=/home/coen/parkinglot-streaming/check_video_stream.py
readonly report_dir="/home/coen/camera-shutdown-fix-20261013/restart-test-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "${report_dir}"
cp -a "${runtime}/stream.env" "${report_dir}/stream.env.before"

restore() {
    if ! cmp -s "${report_dir}/stream.env.before" "${runtime}/stream.env"; then
        cp -a "${report_dir}/stream.env.before" "${runtime}/stream.env.restore"
        mv "${runtime}/stream.env.restore" "${runtime}/stream.env"
        systemctl restart zed-rtsp.service
    fi
    echo "[TEST] reports=${report_dir}"
}
trap restore EXIT
index=0
for codec in h264 h264 h264 h265 h265 h265 h264; do
    index=$((index + 1))
    if [[ "${codec}" == h265 ]]; then
        bitrate=6000000
    else
        bitrate=12500000
    fi
    printf 'ZED_VIDEO_CODEC=%s\nZED_VIDEO_BITRATE=%s\n' "${codec}" "${bitrate}" > "${runtime}/stream.env.test"
    chown coen:coen "${runtime}/stream.env.test"
    chmod 644 "${runtime}/stream.env.test"
    mv "${runtime}/stream.env.test" "${runtime}/stream.env"
    echo "[TEST] restart ${index}/7 codec=${codec}"
    systemctl restart zed-rtsp.service
    sleep 15
    timeout 20 sudo -u coen python3 "${checker}" \
        rtsp://127.0.0.1:8554/mystream --codec "${codec}" --seconds 8 \
        | tee "${report_dir}/${index}-${codec}.log"
    python3 - "${report_dir}/${index}-${codec}.log" <<'PY'
import json
import sys
with open(sys.argv[1]) as handle:
    records = [json.loads(line) for line in handle if line.startswith('{')]
if not records or records[-1]['errors'] or records[-1]['delivered_fps'] < 25:
    raise SystemExit('FAIL: missing frames, stream error, or FPS below 25')
PY
done
journalctl -u zed-rtsp.service --since '-10 minutes' --no-pager > "${report_dir}/service.log"
echo "[TEST] PASS: all seven restarts delivered at least 25 FPS"
