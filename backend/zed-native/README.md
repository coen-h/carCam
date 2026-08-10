# Native ZED RTSP sender

This replaces the Python/NumPy frame bridge on the Jetson Nano. The native
upstream remains `rtsp://127.0.0.1:8555/zed_stream`; the existing MediaMTX
service redistributes it to clients at `rtsp://<nano>:8554/mystream`.

The runtime is built from Stereolabs `zed-gstreamer` tag `v4.2.5`, commit
`c0356ac4db4b2987333422a579859605a5fe5878`, which is compatible with the
Nano's installed ZED SDK 4.2 and JetPack 4.6.1 environment. The small patch
keeps the project's existing underscore-form RTSP mount path.

The sender captures the rectified 1920x1080 left view at 30 FPS with depth
disabled, uses the Nano VIC for NV12 conversion, and uses NVENC for H.264 at
12.5 Mbps. B-frames are disabled and picture-order-count type 2 is used so the
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
