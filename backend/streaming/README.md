# Cellular event streaming

This directory implements the staged Nano-to-AGX cellular path:

1. The Nano keeps local ZED capture and depth observation running continuously.
2. `zed-event-uplink.service` sends authenticated one-second lease heartbeats
   only while the depth state is actionable. It never handles video itself.
3. `parkinglot-srt-lease.service` on the AGX responds by making MediaMTX pull
   the Nano's already encoded H.265 stream over SRT. The five-second lease
   fails closed if either controller or network connection disappears.
4. While the H.265 source is online, MediaMTX launches
   `agx-online-session.sh`. It uses the Xavier hardware decoder and encoder to
   publish the browser-compatible H.264 `public-h264` path back to the local
   MediaMTX server over RTSP and create five-second MP4 clips on the NVMe.
5. When the event ends, MediaMTX serves its offline slate instead of consuming
   cellular data.

The existing Btrfs filesystem on the Xavier NVMe is mounted without formatting
by the installed `mnt-parkinglot\\x2dnvme.mount` unit. Event files are kept in
`/mnt/parkinglot-nvme/parkinglot-data/clips`; the older Arch installation on the
same filesystem is left intact.

The production depth configuration intentionally remains `shadow-mode=true`
until the permanently mounted camera has an empty-lane baseline and a tested
polygonal trigger ROI. Therefore, installing and enabling the uplink service is
safe: it stays idle until that final acceptance gate is completed.

The original RTSP RECORD design had an unacceptable 24-second startup delay.
The replacement SRT pull was validated using the current H.264 stream: it came
online immediately, remained active under heartbeats, and returned to the
offline placeholder on release. `parkinglot-srt-lease.service` is enabled on
the AGX. `zed-event-uplink.service` remains disabled and the Nano remains H.264
until the final H.265/manual camera acceptance test.

Manual diagnostic override on the Nano:

```sh
touch /dev/shm/parkinglot-event-uplink.force
# remove the file to stop after the test
rm /dev/shm/parkinglot-event-uplink.force
```

The override must only be used for short, measured tests on cellular.

The AGX requires the small Ubuntu `gstreamer1.0-rtsp` package for
`rtspclientsink`. The earlier local MPEG-TS/UDP relay was removed after it
stalled during live testing; direct RTSP remained continuous and allowed the
complete DeepStream pipeline to stabilize at approximately 28.7 FPS.
