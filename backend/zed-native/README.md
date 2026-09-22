# Native ZED RTSP sender

This replaces the Python/NumPy frame bridge on the Jetson Nano. The native
upstream remains `rtsp://127.0.0.1:8555/zed_stream`; the existing MediaMTX
service redistributes it to clients at `rtsp://<nano>:8554/mystream`.

The runtime is built from Stereolabs `zed-gstreamer` tag `v4.2.5`, commit
`c0356ac4db4b2987333422a579859605a5fe5878`, which is compatible with the
Nano's installed ZED SDK 4.2 and JetPack 4.6.1 environment. The small patch
keeps the project's existing underscore-form RTSP mount path.

The sender captures the rectified 1920x1080 left view at 30 FPS, uses the Nano
VIC for NV12 conversion, and uses NVENC for H.264 at 12.5 Mbps. Depth is
requested only on the 4 Hz occupancy samples and disabled on intervening RGB
frames. B-frames are disabled and picture-order-count type 2 is used so the
MediaMTX HLS muxer can derive monotonic decode timestamps. There is no Python
or NumPy operation in the per-frame path.

Production runtime files live under `/home/coen/zed-native-rtsp`. The previous
`/home/coen/stream.py` remains installed as a fallback. The deployment backup
contains the previous `/etc/systemd/system/zed-rtsp.service`; restoring it and
restarting `zed-rtsp.service` rolls back the change.

Clients should use the MediaMTX URL. The Stereolabs 4.2 RTSP server keeps one
shared camera pipeline and can return 503 while directly connected clients are
tearing down; MediaMTX maintains the single upstream session and provides
reliable independent client reconnects.

## Neural trigger proof of concept (not deployed)

`zed-rtsp-launch.cpp` is an experimental extension of the pinned launcher. Its
pad probe reads
`GstZedSrcMeta` directly from `zedsrc`. It does not copy image pixels. The
observer considers ZED vehicle detections, calculates each 3D bounding-box
intersection with a configured rectangular volume, and applies confirmation
and clear/hold timing.

The test `trigger.ini` deliberately has both `shadow-mode=true` and
`zone.enabled=false`. It reports all qualifying cars, trucks and buses so the
installed camera's coordinates can be measured. It cannot control or gate the
stream in this mode. During a test, the latest state is written atomically to:

`/home/coen/zed-native-rtsp/state/trigger-state.json`

The configuration uses the ZED `IMAGE` coordinate system in millimetres:

- X increases to the right.
- Y increases downwards.
- Z increases forwards from the left camera.

If the test launcher is run under a service, trigger messages are written to
that service's journal.

The 2026-08-19 benchmark found that ZED `MULTI_CLASS_BOX_FAST`, PERFORMANCE
depth, reduced precision, no tracking, and vehicle-only filtering reduced the
delivered 1920x1080 stream from 30.0 FPS to approximately 7.3 FPS. It therefore
failed the 25 FPS acceptance threshold and was not installed into
`zed-rtsp.service`.

No persistent service was introduced by the test. The production services
remain
`zed-rtsp.service`, `mediamtx.service`, and `cloudflared.service`.

## Low-resolution depth occupancy observer (deployed in shadow mode)

The production `zed-rtsp.service` includes a non-neural occupancy observer. It
does not classify cars or people. It samples a 160x90 depth map every 250 ms
(4 Hz) and compares it with a persistent 30-second, per-pixel median baseline.
A pixel counts as foreground when it is at least 500 mm closer than baseline.
Two consecutive samples must exceed both 150 pixels and 4%; three clear
samples start a 10-second hold. People and other sufficiently large foreground
objects intentionally trigger the same state as vehicles.

The configured ROI is currently the full depth image and is only a placeholder
for pre-install testing. Polygonal entrance-lane ROIs and exclusion polygons
are supported in `depth-trigger.ini`. Moving the camera invalidates the
baseline; rigid mounting and an explicit empty-lane recalibration are required
after any repositioning.

On startup, a saved baseline is reloaded and the observer publishes
`warming_up` for 15 seconds while depth settles. Occupancy events are
suppressed during that period. Missing, incompatible, or invalid baselines
publish `needs_calibration`; calibration is never started implicitly. Weak
depth fails open as `depth_unreliable`, while a sustained broad bidirectional
change reports `camera_moved` and requires recalibration.

The 2026-08-20 production photo acceptance test changed from clear to occupied
at 629 pixels (11.92%), peaked at 2,634 pixels (36.70%), then returned to clear
at 45 pixels (0.53%) after removal and the configured hold. The production
stream remained at its nominal 30 FPS; RTP packet timing measured 31.3 FPS over
20.7 seconds. Isolated 2, 3, 4, and 5 Hz measurements all retained nominal
30 FPS, so 4 Hz was selected for detection latency with thermal headroom.

The observer remains deliberately non-actionable: `shadow-mode=true` always
makes `actionable=false`. It cannot change bitrate, FPS, resolution, HLS, or
the public feed. Runtime state is written to RAM at
`/dev/shm/parkinglot-depth-trigger-state.json`; rotating transition events are
written to `state/depth-events.jsonl` (5 MB and three backups). Their contracts
are `depth-trigger-state.schema.json` and `depth-trigger-event.schema.json`.

Operator commands:

- `/home/coen/zed-native-rtsp/depth-triggerctl status`
- `/home/coen/zed-native-rtsp/depth-triggerctl calibrate`
- `/home/coen/zed-native-rtsp/depth-triggerctl events`

Do not run an isolated observer as root against the production state path. The
production service runs as `coen`; a root-owned file in `/dev/shm` prevents its
atomic status replacement.

## Build inputs

The local deployment sources are:

- `zed-rtsp-launch.cpp`: patched RTSP launcher and trigger observer.
- `zed-rtsp-CMakeLists.txt`: launcher build definition linked to
  `gstzedmeta`.
- `trigger.ini`: shadow-mode trigger configuration.
- `trigger-state.schema.json`: machine-readable state-file contract.
- `run-zed-trigger-shadow-test.sh`: experimental ZED FAST benchmark pipeline.
- `zed-depth-trigger.cpp` and `zed-depth-trigger.h`: opt-in, low-resolution
  baseline subtraction inside the ZED source plugin.
- `0002-low-resolution-depth-trigger.patch`: reproducible plugin integration.
- `depth-trigger.ini`: deployed, non-actionable production configuration.
- `depth-trigger-test.ini`: shorter isolated-test timing and separate baseline.
- `depth-trigger-state.schema.json`: depth-state JSON contract.
- `depth-trigger-event.schema.json`: rotating transition-event contract.
- `depth-triggerctl.sh`: production status, calibration and event helper.
- `run-zed-depth-occupancy-test.sh`: isolated depth occupancy benchmark.
- `run-zed-depth-baseline-test.sh`, `run-zed-depth-unstabilized-test.sh`, and
  `run-zed-depth-roi-test.sh`: depth cost experiments.
- `run-zed-native-rtsp.sh`: production 30 FPS pipeline with scheduled depth.

The neural proof-of-concept inputs are retained for reproducibility but must
not replace the production launcher or run script. The next depth gate is
physical entrance-zone selection, empty-lane calibration, and representative
vehicle testing in both directions and expected outdoor conditions.

Any future experiment must compile in a separate checkout of the pinned source
and verify transferred source and binary hashes. Depth deployment backups are
`/home/coen/deployment-backups/20260820T083202Z-depth-shadow-v2` and
`/home/coen/deployment-backups/20260820T084700Z-depth-startup-settle`.
Restoring the relevant plugin/config and restarting `zed-rtsp.service` rolls
back the observer; MediaMTX and Cloudflare do not need configuration changes.
