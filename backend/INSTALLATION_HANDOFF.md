# Final installation and acceptance plan

This is an execution brief for the agent completing the physical installation.
Read `backend/PROJECT_OVERVIEW.txt`, `backend/streaming/README.md`, and
`backend/zed-native/README.md` first. Verify live state before editing: the
Jetsons are authoritative and repository copies are backups. Do not assume
earlier chat claims that all deployment work is complete are acceptance evidence.

## Scope and operating constraints

- Camera will be about three metres high, viewing vehicle fronts on entry and
  rears on exit, with at most two vehicles in view. Recognition is license
  plates only; do not reintroduce make/model inference or ZED neural detection.
- Nano uses Samsung S10 cellular tether/hotspot. Installed AGX has wired
  internet; the installed link between Jetsons is over the internet, not an
  Ethernet cable. LAN results below do not validate cellular throughput.
- Target cellular budget is at most 50 GB/month. About 60–80 parking spaces,
  concentrated arrival/departure periods; busy events may double traffic.
- Preserve native ZED/GStreamer capture, DeepStream YOLO/NvDCF/LPDNet,
  RapidOCR, MediaMTX, Cloudflare, Tailscale and Convex.
- Give advance notice for manual camera or vehicle tasks and WAIT for the
  user's explicit readiness before starting them. Normal traffic may be used
  for vehicle validation; a controlled drive is helpful but optional.
- Back up replaced live files with timestamps, verify transferred hashes,
  install atomically and retain a rollback. Never format the NVMe or remove its
  older Arch files. Do not remove runtime packages/models to clear space.
- Minimize cellular tests. Bound every override, record active duration/bytes,
  stop it promptly and verify the source is offline afterwards.
- No frontend/Convex changes were made during the October checks. Coordinate
  any requested frontend, clip access or database work with the owner. Existing
  repository AGENTS.md requires reading the installed Next.js documentation
  before writing frontend code.

## Connections, identity and authentication

Verified 2026-10-13:

| Device | SSH user | Tailscale name | Current IP | Cloudflare SSH hostname |
| --- | --- | --- | --- | --- |
| Nano | coen | nonano.tail77ff0.ts.net | 100.110.69.92 | nano.coen.ovh |
| AGX Xavier | hero | noagx.tail77ff0.ts.net | 100.99.118.56 | agx.coen.ovh |

The workstation already has an authorized SSH key. Use:

```powershell
ssh -o HostKeyAlias=nano.coen.ovh coen@nonano.tail77ff0.ts.net
ssh -o HostKeyAlias=agx.coen.ovh hero@noagx.tail77ff0.ts.net
```

IP fallback commands use the same HostKeyAlias and the table's addresses.
Do not disable host verification. Previously verified ED25519 fingerprints:

```text
Nano: SHA256:qDsToRmnr9pQ54iqkfiPeJKWJjnV6HAix/9hi5pEVmM
AGX:  SHA256:fJYGW3rrMRI/IrqWxvHfeKmsTo7Uw53YUPV8/pKTBoo
```

These were checked against both live host keys over trusted Tailscale SSH.
For an independent check, obtain the actual fingerprint with
`ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub` over an already trusted
connection. Credentials/passwords must come from the owner or the authorized
session, not this tracked file. Never print `/etc/cloudflared/token` or the
stream control bearer token.

Cloudflare client SSH needs the locally installed `cloudflared`:

```powershell
ssh -o "ProxyCommand=cloudflared access ssh --hostname %h" coen@nano.coen.ovh
ssh -o "ProxyCommand=cloudflared access ssh --hostname %h" hero@agx.coen.ovh
```

Access identity is `hero64876@gmail.com`. The user completes any login/OTP.
Both Nano and AGX Cloudflare CLI SSH now pass with the correct host identities.
The AGX timeout was a stale empty authentication lock on the workstation in
`C:\Users\Coen\.cloudflared`, dated September 5. With no cloudflared process
running, it was preserved as `.stale-20261013`; a new login succeeded. Do not
delete an authentication lock while its owning process is running. Browser
rendered SSH still requires a separate browser acceptance check.

Cloudflare is dashboard-managed (`--token-file /etc/cloudflared/token`), not
local ingress YAML. Connector logs confirm these routes after correction:

- AGX: `video.coen.ovh → http://localhost:8888`,
  `agx.coen.ovh → ssh://localhost:22`.
- Nano: `picopy.coen.ovh → http://127.0.0.1:3923`,
  `nano.coen.ovh → ssh://localhost:22`.

Do not swap tunnel tokens. A 302 to Access login proves the edge application is
reachable, not that the origin stream or authenticated SSH works.

## Verified current state and test evidence

- Nano production: H.264, 1920x1080, nominal 30 FPS, 12.5 Mbps. Depth sampler
  runs inside `zed-rtsp.service` at 4 Hz and remains `shadow-mode=true`.
- Nano `zed-event-uplink.service` is disabled/inactive. No force marker should
  remain. AGX MediaMTX and lease service are enabled; camera source is offline.
- `new.py` has no boot service. Default input is the AGX offline/live path
  `rtsp://127.0.0.1:8554/public-h264`; launching it in idle does not activate Nano.
- Current depth baseline is invalid for this scene: `camera_moved`, full-frame
  placeholder ROI, poor valid-depth fraction. Do not enable it as a live trigger.
- NVMe: `/dev/nvme0n1p2`, Btrfs, mounted `/mnt/parkinglot-nvme`, about 471 GB
  available. Unit: `mnt-parkinglot\x2dnvme.mount`.
- October camera tests: H.264 29.88/29.94 FPS; H.265 30.11 FPS. Abrupt camera
  restarts caused a USB URB error and ZED CAMERA NOT DETECTED, requiring replug.
  This was subsequently addressed by adding SIGTERM/SIGINT handling to the
  native RTSP launcher. It closes clients and explicitly unprepares active
  media, invoking the ZED plugin's Camera::close() before process exit.
- The deployed fix passed seven consecutive loaded restarts with MediaMTX
  connected: three H.264, three H.265, then H.264. All delivered 29.34–30.55
  decoded FPS without a physical reconnect, and shutdown logs confirmed media
  unprepared successfully. Final restored H.264 measured 29.96 FPS. This tests
  normal process shutdown, not sudden power removal, SIGKILL or USB faults.
- Launcher backup: `/home/coen/deployment-backups/20261013-graceful-camera-shutdown`.
  Build source/binary: `/home/coen/camera-shutdown-fix-20261013/`.
  Restart evidence: `restart-test-20261013T071748Z` below that directory.
- Final recovery after the second user replug: native H.264 29.81 FPS and
  redistributed H.264 29.93 FPS. A first reader saw no frames during recovery,
  then both paths passed; leave capture running. Nano is restored to H.264
  12.5 Mbps, controller disabled, force marker absent, AGX sources offline.
- Live H.265 SRT and AGX H.264 sources both verified `online=true`, increasing
  bytes, zero reported source frame errors; decoded H.264 relay 30.44 FPS.
- Complete live DeepStream: first frame 3.42 seconds after PLAYING, cumulative
  watchdog FPS settled at 28.8, late five-second windows about 30 FPS; clean
  Ctrl+C shutdown. This is a short LAN smoke test, not a sustained outdoor or
  cellular accuracy measurement. Existing deprecation/TensorRT warnings remain.
- New MP4 clips verified in NVMe directory; sampled duration 4.989 seconds,
  H.264, approximately 6.1 Mbps. Test clips begin `20261013T063202Z`.
- One authenticated heartbeat followed by silence produced `active=false`,
  `reason=expired` about five seconds later. Unauthenticated lease POST → 401.
- RapidOCR recognized a stored 83x34 plate crop: six characters, confidence
  0.9669. No test Convex POST. No new real plate was presented; live OCR accuracy,
  new-track behaviour and database delivery must still be tested on site.
- AGX local `/public-h264/index.m3u8`, following redirects, generated a valid
  1080p30 H.264 HLS playlist. Current frontend dashboard/demo requests
  `https://video.coen.ovh/mystream/index.m3u8`, which fails at the AGX origin.
  Public GET redirects to Cloudflare Access login. Website end-to-end is NOT
  accepted yet. Current fallback is MediaMTX's generated slate, not a saved
  last empty-lane camera image.

## Files, ports and logs

Nano:

```text
/home/coen/zed-native-rtsp/stream.env                  codec/bitrate
/home/coen/zed-native-rtsp/run-zed-native-rtsp.sh       capture launcher
/home/coen/zed-native-rtsp/depth-trigger.ini           depth ROI/thresholds
/home/coen/zed-native-rtsp/depth-triggerctl            status/calibrate/events
/home/coen/zed-native-rtsp/state/depth-baseline-v2.bin  saved median baseline
/home/coen/zed-native-rtsp/state/depth-events.jsonl     rotating depth events
/dev/shm/parkinglot-depth-trigger-state.json          current state
/dev/shm/parkinglot-event-uplink-state.json           control status
/dev/shm/parkinglot-event-uplink.force                manual test override
/home/coen/parkinglot-streaming/event-uplink.ini      AGX control URL
/home/coen/parkinglot-streaming/event_uplink.py        heartbeat controller
/home/coen/parkinglot-streaming/control-token         secret, chmod 600
/home/coen/mediamtx/mediamtx.yml                       Nano redistribution
```

Nano local source: RTSP `127.0.0.1:8555/zed_stream`; redistribution `:8554/mystream`;
SRT `:8890`, stream ID `read:mystream`. The source must stay read locally so
depth capture continues even when the AGX is disconnected.

AGX:

```text
/home/hero/new.py                                    plate application
/home/hero/config_infer_yolo26.txt                    YOLO config
/home/hero/config_tracker_NvDCF_perf.yml              tracker config
/home/hero/lpd_DetectNet2_us.txt                      plate detector config
/home/hero/parkinglot-streaming/mediamtx.yml           ACTIVE MediaMTX config
/home/hero/parkinglot-streaming/agx-online-session.sh  HW encode and split MP4
/home/hero/parkinglot-streaming/srt-lease.ini           control listener/source
/home/hero/parkinglot-streaming/srt_lease_server.py     lease expiry server
/home/hero/parkinglot-streaming/control-token          matching secret, chmod 600
/dev/shm/parkinglot-srt-lease-state.json               active/expired state
/home/hero/xavier_received_images/                   saved plate JPEGs
/mnt/parkinglot-nvme/parkinglot-data/clips/            event MP4s
/home/hero/parkinglot-clips/                          fallback if NVMe unavailable
```

RTSP `127.0.0.1:8554`; HLS `127.0.0.1:8888`; MediaMTX API
`127.0.0.1:9997`; metrics `127.0.0.1:9998`; lease
`100.99.118.56:9010/v1/lease`. The latter is a literal bind IP: MagicDNS names
solve peer URLs, but re-enrollment still requires updating the bind address.

Logs:

```bash
# Nano
journalctl -u zed-rtsp -u mediamtx -u zed-event-uplink -u cloudflared --since today
/home/coen/zed-native-rtsp/depth-triggerctl status
/home/coen/zed-native-rtsp/depth-triggerctl events
# AGX
journalctl -u parkinglot-mediamtx -u parkinglot-srt-lease -u cloudflared --since today
curl -fsS http://127.0.0.1:9997/v3/paths/list
```

Plate/OCR logs are in the terminal running `DISPLAY=:0 python3 new.py`.
Confirmed crops are saved locally and metadata POSTs to
`https://cheery-grasshopper-930.convex.site/uplink`. Posting test plates changes
real Convex parking state/alerts; use an owner-approved test plate or isolated
endpoint. `new.py` sends direction `in`, but the current Convex mutation toggles
direction from prior parking state. This is not measured travel direction.

## Execution sequence after permanent mounting

1. **Preflight and backups.** Verify host identity, MagicDNS, actual cellular vs
   wired routes, clock sync, power, camera USB 3 link, free storage, enabled
   services and configs. Read live files; search active paths for old
   `100.64.0.6/7` references, ignoring historical backups. Preserve stream.env,
   depth config/baseline, MediaMTX config and application before changes.

2. **Fix independent deployment gaps before activation.** Recheck AGX Cloudflare
   SSH through Access and verify correct SSH banner/fingerprint. Align website
   stream path using either a supported AGX `mystream` alias or an owner-approved
   frontend URL update. Check playlist plus segment GETs in an authenticated
   browser, CORS and Access behaviour for actual website viewers. Do not remove
   authentication to make a test pass. Decide whether a generic slate is
   acceptable or implement the requested saved empty-scene fallback.

3. **Harden unattended control.** In `event_uplink.py`, fault cooldown currently
   retains `fault_started`, so a persistent fault never resumes the documented
   bounded retry after cooldown. Fix this state transition and verify with
   simulated state/time. Also verify bounded retries when the lease endpoint
   is unavailable (currently up to one retry per 250 ms), monitor service
   restarts/hangs, and ensure the MediaMTX pull does not survive a dead lease
   process. Test Nano heartbeat loss and AGX service restart separately.
   Retain the deployed camera graceful-shutdown fix. Recheck restart recovery
   in the installed power/USB environment, and test USB disconnect separately.
   A physical replug is a recovery step, not a permanent fix; do not silently
   add recurring camera resets. `test-camera-restarts.sh` exercises the normal
   service-stop path without disabling MediaMTX. It requires sudo, temporarily
   changes codec/bitrate, and restores its input stream.env on exit.

4. **Position, frame and select ROI in shadow mode.** Wait for user readiness.
   Verify both lane directions, plate pixel size and camera aim around three
   metres high. Map 1920x1080 coordinates to 160x90 by dividing x/y by 12.
   Set lane polygon/exclusions; place the leading trigger edge far enough
   upstream to cover depth confirmation plus SRT/RTSP/HLS startup. Keep at least
   several seconds before the useful plate reading point. Exclude vegetation,
   pedestrians outside the lane and irrelevant roads. Do not enable neural OD.

5. **Build baseline with the user-confirmed empty ROI.** Keep camera fixed and
   ROI empty for 30 seconds. Run
   `/home/coen/zed-native-rtsp/depth-triggerctl calibrate`; wait for completion,
   inspect valid depth, baseline ID and clear state. A replaced ROI or moved
   camera requires a new baseline. On startup allow the 15-second settle guard.
   Outdoor glare/night or distances beyond max-depth-mm=12000 may defeat depth;
   inspect actual values instead of blindly loosening thresholds.

6. **Observe real traffic in shadow mode.** Prefer at least 10–20 passages,
   small cars/SUVs/vans, both directions, queues/two vehicles, slow/normal speed,
   empty intervals and pedestrian-only activity. People triggers are acceptable
   if infrequent. Compare depth events to independently observed passage times
   and short ground-truth clips. Shadow mode alone does NOT capture vehicle
   event clips or send them to AGX; provide a bounded observation window or
   local capture with a measured data/storage budget. Do not claim metadata
   alone proves there were no missed vehicles. Repeat for shadows/low light.

7. **Tune timing and validate plates.** Defaults: 500 mm closer, at least 150
   changed pixels AND 4%, two confirmation samples at 4 Hz, three clear samples,
   ten-second hold. Tune from evidence and choose early-enough trigger geometry.
   Use actual plates to test three OCR confirmations, distinct successive track
   IDs and plate labels, two simultaneous vehicles, disappearance/re-entry and
   Convex dedup/state. Validate physical direction separately from toggled state.

8. **Bounded H.265 acceptance.** Stop Nano MediaMTX first, wait about three
   seconds, then stop ZED; atomically install `nano-h265.env` as stream.env and
   start ZED/MediaMTX. Test locally before starting cellular. If SDK cannot open
   camera and USB shows URB errors, ask for replug and wait; avoid repeated hard
   restarts. Force only a timed window; verify both AGX sources `online=true`,
   increasing bytes/new clips, not just decoded slate FPS. Test a running
   `new.py` across idle → live → idle → next event. It must keep delivering frames
   and must not require restart between events. Check camera/DeepStream >=25
   sustained FPS (or >=95% of measured baseline if lower), no fatal bus/CUDA
   errors, readable plates, valid clips, clean SIGINT and no orphan encoders.

9. **Bandwidth budget.** Measure phone/Nano network byte deltas during idle,
   typical events and busy queues, with one/multiple website viewers. Verify
   viewers only pull from wired AGX and never activate Nano independently. At
   6 Mbps, payload is about 0.75 MB/active second, 45 MB/minute; 50 GB permits
   about 18.5 active hours/month before protocol/control overhead. Ten-second
   holds and crowded periods matter. A five-second 6 Mbps clip is about 3.75 MB
   nominal; observed files about 3 MB. Tune bitrate below 6 Mbps only after
   comparing plate quality. Cropping requires ROI coordinate/inference tests,
   not an arbitrary reduction of resolution. H.265 has not been tested over
   cellular in the October LAN check.

10. **Production activation and persistence.** Only after calibration/acceptance
    set depth `shadow-mode=false`, leave H.265 selected and enable
    `zed-event-uplink.service`. Ensure clear idle produces no Nano video upload.
    If automatic plate processing at boot is required, implement an AGX systemd
    unit with model paths, DISPLAY=:0, available display/X authorization, proper
    restart behaviour and journal logs; currently none exists. Configure clip
    retention/maximum storage and failure alerts. Splitmux MP4s are ordinary
    files: MediaMTX playback API does not automatically index them. Frontend clip
    viewing requires an authorized serving/index/metadata solution, separate
    from enabling recording.

11. **Final reboot/recovery acceptance.** Arrange safe reboot windows with the
    user. Test Nano/AGX boot order, phone tether reconnection, AGX network loss,
    camera disconnect, stale depth state and baseline-invalid faults. Verify
    bounded traffic, automatic recovery, service logs and website transitions.
    Update overview and record tested configurations, thresholds, active
    MB/event, expected monthly usage and known limitations. Stop on unresolved
    missed plates or budget overruns; restore shadow mode and disable uplink.

## Diagnostic commands and rollback

The deployed diagnostic uses NVIDIA decode and counts actual frames:

```bash
# Nano local (match current codec)
python3 /home/coen/parkinglot-streaming/check_video_stream.py \
  rtsp://127.0.0.1:8554/mystream --codec h265 --seconds 15
# AGX, while verifying MediaMTX online=true
python3 /home/hero/parkinglot-streaming/check_video_stream.py \
  rtsp://127.0.0.1:8554/public-h264 --seconds 15
# Nano: event controller must be stopped; this starts ONE short real upload
python3 /home/coen/parkinglot-streaming/check_lease_expiry.py
# Afterwards on AGX: active=false, reason=expired
cat /dev/shm/parkinglot-srt-lease-state.json
# AGX app
cd /home/hero
DISPLAY=:0 python3 new.py
```

To force a short test, create `/dev/shm/parkinglot-event-uplink.force`, arrange an
independent timer to remove it, then start the Nano controller. Remove marker
and stop the controller at the end. Confirm both AGX sources go offline and
the NVENC child exits. Never leave a manual force file unattended.

Safe rollback: remove force marker, stop/disable Nano event controller, keep
depth shadow mode; gracefully stop MediaMTX before ZED; restore H.264 stream.env
and restart both. This restores local camera capture, but DOES NOT restore
website video now that `video.coen.ovh` is routed to the AGX. The AGX will show
its offline slate until the event uplink is active. Fix website path/routing
explicitly instead of describing this as a working public-camera rollback.

Backups: Nano pre-October-test stream.env is
`/home/coen/parkinglot-streaming/stream.env.pre-20261013-test`.
Earlier AGX relay backup:
`/home/hero/deployment-backups/20260907-184653-direct-rtsp`.
Repository config addresses were synchronized with October live state.
