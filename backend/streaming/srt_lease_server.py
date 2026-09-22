#!/usr/bin/env python3
"""Authenticated, fail-closed control for the AGX MediaMTX SRT pull."""

import configparser
import hmac
import json
import os
import signal
import sys
import threading
import time
import urllib.parse
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


CONFIG_PATH = Path(os.environ.get(
    "PARKINGLOT_LEASE_CONFIG",
    "/home/hero/parkinglot-streaming/srt-lease.ini",
))


class LeaseState:
    def __init__(self, section):
        self.token = Path(section["token-path"]).read_text().strip()
        if len(self.token) < 32:
            raise RuntimeError("Control token must contain at least 32 characters")
        self.status_path = Path(section["status-path"])
        self.api = section["mediamtx-api"].rstrip("/")
        self.path_name = section["path-name"]
        self.source_url = section["source-url"]
        self.source_codec = section["source-codec"]
        self.lease_seconds = section.getfloat("lease-seconds")
        self.request_timeout = section.getfloat("request-timeout-seconds")
        self.online_hook = section.get("online-hook", "").strip()
        self.lock = threading.Lock()
        self.active = False
        self.deadline = 0.0
        self.stopping = False

    def _config(self, active):
        if active:
            # Pull sources expose their real tracks and cannot simultaneously
            # use MediaMTX's synthetic always-available track.
            result = {
                "source": self.source_url,
                "alwaysAvailable": False,
                "alwaysAvailableTracks": [],
            }
        else:
            result = {
                "source": "publisher",
                "alwaysAvailable": True,
                "alwaysAvailableTracks": [{
                    "codec": self.source_codec,
                    "sampleRate": 0,
                    "channelCount": 0,
                    "muLaw": False,
                }],
            }
        if active and self.online_hook:
            result["runOnOnline"] = self.online_hook
            result["runOnOnlineRestart"] = True
        return result

    def _apply(self, active):
        encoded_name = urllib.parse.quote(self.path_name, safe="")
        delete_request = urllib.request.Request(
            "{}/v3/config/paths/delete/{}".format(self.api, encoded_name),
            method="DELETE",
        )
        try:
            urllib.request.urlopen(delete_request, timeout=self.request_timeout).close()
        except urllib.error.HTTPError as exc:
            if exc.code != 404:
                raise
        url = "{}/v3/config/paths/add/{}".format(self.api, encoded_name)
        body = json.dumps(self._config(active)).encode("utf-8")
        request = urllib.request.Request(
            url, data=body, headers={"Content-Type": "application/json"}, method="POST"
        )
        with urllib.request.urlopen(request, timeout=self.request_timeout) as response:
            if response.getcode() != 200:
                raise RuntimeError("MediaMTX API returned {}".format(response.getcode()))

    def _status(self, reason):
        payload = {
            "schema_version": 1,
            "timestamp_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "active": self.active,
            "reason": reason,
        }
        temporary = Path(str(self.status_path) + ".tmp")
        temporary.write_text(json.dumps(payload) + "\n")
        os.replace(str(temporary), str(self.status_path))

    def set_lease(self, active):
        with self.lock:
            now = time.monotonic()
            if active:
                self.deadline = now + self.lease_seconds
            else:
                self.deadline = 0.0
            if active != self.active:
                self._apply(active)
                self.active = active
                print("[LEASE] stream {}".format("enabled" if active else "disabled"), flush=True)
            self._status("heartbeat" if active else "released")

    def monitor(self):
        while not self.stopping:
            with self.lock:
                if self.active and time.monotonic() >= self.deadline:
                    try:
                        self._apply(False)
                        self.active = False
                        self._status("expired")
                        print("[LEASE] expired; stream disabled", flush=True)
                    except Exception as exc:
                        print("[LEASE] expiry update failed: {}".format(exc), file=sys.stderr)
            time.sleep(0.25)

    def shutdown(self):
        self.stopping = True
        try:
            self.set_lease(False)
        except Exception as exc:
            print("[LEASE] shutdown update failed: {}".format(exc), file=sys.stderr)


class Handler(BaseHTTPRequestHandler):
    server_version = "ParkinglotLease/1"

    def do_POST(self):
        if self.path != "/v1/lease":
            self.send_error(404)
            return
        expected = "Bearer " + self.server.state.token
        supplied = self.headers.get("Authorization", "")
        if not hmac.compare_digest(supplied, expected):
            self.send_error(401)
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length < 1 or length > self.server.request_max_bytes:
                raise ValueError("invalid body length")
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            if not isinstance(payload.get("active"), bool):
                raise ValueError("active must be boolean")
            self.server.state.set_lease(payload["active"])
        except ValueError as exc:
            self.send_error(400, str(exc))
            return
        except Exception as exc:
            print("[LEASE] request failed: {}".format(exc), file=sys.stderr)
            self.send_error(502)
            return
        response = json.dumps({"ok": True, "active": self.server.state.active}).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(response)))
        self.end_headers()
        self.wfile.write(response)

    def log_message(self, _format, *_args):
        return


def main():
    parser = configparser.ConfigParser()
    if not parser.read(str(CONFIG_PATH)):
        raise RuntimeError("Cannot read lease config: {}".format(CONFIG_PATH))
    section = parser["lease"]
    state = LeaseState(section)
    state._apply(False)
    state._status("startup")
    server = ThreadingHTTPServer(
        (section["listen-address"], section.getint("listen-port")), Handler
    )
    server.state = state
    server.request_max_bytes = section.getint("request-max-bytes")
    monitor = threading.Thread(target=state.monitor, name="lease-expiry", daemon=True)
    monitor.start()

    def stop(*_args):
        threading.Thread(target=server.shutdown, daemon=True).start()

    signal.signal(signal.SIGINT, stop)
    signal.signal(signal.SIGTERM, stop)
    print("[LEASE] listening on {}:{}".format(*server.server_address), flush=True)
    try:
        server.serve_forever()
    finally:
        state.shutdown()
        server.server_close()
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print("[LEASE] fatal: {}".format(exc), file=sys.stderr)
        raise SystemExit(1)
