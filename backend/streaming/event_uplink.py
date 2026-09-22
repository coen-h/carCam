#!/usr/bin/env python3
"""Lease the AGX cellular stream while the Nano depth trigger is active."""

import configparser
import json
import os
import signal
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path


CONFIG_PATH = Path(os.environ.get(
    "PARKINGLOT_UPLINK_CONFIG",
    "/home/coen/parkinglot-streaming/event-uplink.ini",
))
FAULT_STATES = {"depth_unreliable", "camera_moved"}


class UplinkController:
    def __init__(self, config_path):
        parser = configparser.ConfigParser()
        if not parser.read(str(config_path)):
            raise RuntimeError("Cannot read uplink config: {}".format(config_path))
        section = parser["uplink"]
        self.state_path = Path(section["state-path"])
        self.status_path = Path(section["status-path"])
        self.force_path = Path(section["force-path"])
        self.control_url = section["control-url"]
        self.token = Path(section["token-path"]).read_text().strip()
        if len(self.token) < 32:
            raise RuntimeError("Control token must contain at least 32 characters")
        self.poll_seconds = section.getfloat("poll-seconds")
        self.heartbeat_seconds = section.getfloat("heartbeat-seconds")
        self.request_timeout = section.getfloat("request-timeout-seconds")
        self.state_max_age = section.getfloat("state-max-age-seconds")
        self.fault_max_stream = section.getfloat("fault-max-stream-seconds")
        self.fault_retry = section.getfloat("fault-retry-seconds")
        self.running = True
        self.lease_active = False
        self.last_request = 0.0
        self.fault_started = None
        self.fault_blocked_until = 0.0
        self.last_summary = ""

    def _read_trigger(self):
        if self.force_path.exists():
            return True, "forced"
        try:
            if time.time() - self.state_path.stat().st_mtime > self.state_max_age:
                return False, "state_stale"
            with self.state_path.open("r") as handle:
                state = json.load(handle)
            return bool(state.get("actionable", False)), str(
                state.get("state", "unknown")
            ).lower()
        except (OSError, ValueError, TypeError):
            return False, "state_unavailable"

    def _request(self, active):
        body = json.dumps({"active": bool(active)}).encode("utf-8")
        request = urllib.request.Request(
            self.control_url,
            data=body,
            headers={
                "Authorization": "Bearer " + self.token,
                "Content-Type": "application/json",
            },
            method="POST",
        )
        with urllib.request.urlopen(request, timeout=self.request_timeout) as response:
            if response.getcode() != 200:
                raise RuntimeError("Lease server returned {}".format(response.getcode()))
        self.lease_active = bool(active)
        self.last_request = time.monotonic()

    def _write_status(self, trigger_state, reason):
        payload = {
            "schema_version": 2,
            "timestamp_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "lease_active": self.lease_active,
            "trigger_state": trigger_state,
            "reason": reason,
        }
        temporary = Path(str(self.status_path) + ".tmp")
        try:
            temporary.write_text(json.dumps(payload) + "\n")
            os.replace(str(temporary), str(self.status_path))
        except OSError as exc:
            print("[UPLINK] status write failed: {}".format(exc), file=sys.stderr)

    def stop(self, *_args):
        self.running = False

    def run(self):
        signal.signal(signal.SIGINT, self.stop)
        signal.signal(signal.SIGTERM, self.stop)
        print("[UPLINK] lease controller ready; config={}".format(CONFIG_PATH), flush=True)
        while self.running:
            now = time.monotonic()
            wanted, trigger_state = self._read_trigger()
            reason = trigger_state
            is_fault = trigger_state in FAULT_STATES

            if is_fault:
                if self.fault_started is None:
                    self.fault_started = now
                if now < self.fault_blocked_until:
                    wanted, reason = False, "fault_cooldown"
                elif now - self.fault_started >= self.fault_max_stream:
                    wanted, reason = False, "fault_budget_exhausted"
                    self.fault_blocked_until = now + self.fault_retry
            else:
                self.fault_started = None

            due = now - self.last_request >= self.heartbeat_seconds
            if wanted != self.lease_active or (wanted and due):
                try:
                    self._request(wanted)
                except (OSError, ValueError, urllib.error.URLError) as exc:
                    self.lease_active = False
                    self.last_request = now
                    reason = "control_error"
                    print("[UPLINK] lease request failed: {}".format(exc), file=sys.stderr)

            summary = "{}:{}:{}".format(trigger_state, reason, self.lease_active)
            if summary != self.last_summary:
                print("[UPLINK] {}".format(summary), flush=True)
                self._write_status(trigger_state, reason)
                self.last_summary = summary
            time.sleep(self.poll_seconds)

        try:
            self._request(False)
        except Exception:
            pass
        self._write_status("stopped", "controller_shutdown")
        return 0


if __name__ == "__main__":
    try:
        raise SystemExit(UplinkController(CONFIG_PATH).run())
    except Exception as exc:
        print("[UPLINK] fatal: {}".format(exc), file=sys.stderr)
        raise SystemExit(1)
