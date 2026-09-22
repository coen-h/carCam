#!/usr/bin/env bash
set -euo pipefail

readonly STATE_PATH="${ZED_DEPTH_STATE_PATH:-/dev/shm/parkinglot-depth-trigger-state.json}"
readonly REQUEST_PATH="${ZED_DEPTH_CALIBRATION_REQUEST_PATH:-/dev/shm/parkinglot-depth-calibrate.request}"
readonly EVENT_PATH="${ZED_DEPTH_EVENT_PATH:-/home/coen/zed-native-rtsp/state/depth-events.jsonl}"

usage() {
    echo "Usage: $0 {status|calibrate|events}"
}

case "${1:-}" in
    status)
        if [[ ! -f "${STATE_PATH}" ]]; then
            echo "Depth trigger state is unavailable: ${STATE_PATH}" >&2
            exit 1
        fi
        exec sed -n \
            -e '/^[[:space:]]*"updated_at":/p' \
            -e '/^[[:space:]]*"mode":/p' \
            -e '/^[[:space:]]*"state":/p' \
            -e '/^[[:space:]]*"occupied":/p' \
            -e '/^[[:space:]]*"actionable":/p' \
            -e '/^[[:space:]]*"baseline_loaded":/p' \
            -e '/^[[:space:]]*"calibration_progress":/p' \
            -e '/^[[:space:]]*"settle_remaining_seconds":/p' \
            -e '/^[[:space:]]*"changed_fraction":/p' \
            -e '/^[[:space:]]*"valid_fraction":/p' \
            -e '/^[[:space:]]*"last_error":/p' \
            "${STATE_PATH}"
        ;;
    calibrate)
        : > "${REQUEST_PATH}"
        echo "Calibration requested. Keep the configured entrance ROI empty and the camera fixed."
        echo "Monitor with: $0 status"
        ;;
    events)
        if [[ ! -f "${EVENT_PATH}" ]]; then
            echo "No depth events have been recorded yet."
            exit 0
        fi
        exec tail -n 50 "${EVENT_PATH}"
        ;;
    *)
        usage >&2
        exit 2
        ;;
esac
