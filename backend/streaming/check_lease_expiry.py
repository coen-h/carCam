#!/usr/bin/env python3
"""Send one authenticated lease heartbeat, then deliberately let it expire."""
import configparser
import json
import time
import urllib.request
from pathlib import Path

config = configparser.ConfigParser()
config.read("/home/coen/parkinglot-streaming/event-uplink.ini")
section = config["uplink"]
token = Path(section["token-path"]).read_text().strip()
request = urllib.request.Request(
    section["control-url"],
    data=json.dumps({"active": True}).encode(),
    headers={"Authorization": "Bearer " + token, "Content-Type": "application/json"},
    method="POST",
)
with urllib.request.urlopen(request, timeout=3) as response:
    print(response.read().decode(), flush=True)
time.sleep(7)
print("No more heartbeats sent. AGX status must now show reason=expired.", flush=True)
