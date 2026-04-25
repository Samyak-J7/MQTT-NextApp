"""
MQTT-to-API Bridge

Topic routing:
  MQTT_STATUS_TOPIC  (default: pit_fbk)       — device alive pings  → /api/heartbeat
  MQTT_FLOW_TOPIC    (default: pit_fbk/flow)  — sensor readings     → /api/readings

Status ping payload (any of these are accepted):
  {"device_id": "DEV-001"}
  {"id": "DEV-001"}
  "DEV-001"          ← plain string

Flow payload:
  {"fbk": [{"device_id": "DEV-001", "type": "oms", "duration": 3600}]}
  {"fbk": [{"device_id": "DEV-002", "type": "liquid_flow", "duration": 3600, "consumption": 142.5}]}
"""

import os
import sys
import json
import time
import signal
import logging
import logging.handlers
from datetime import datetime, timezone
from pathlib import Path

import paho.mqtt.client as mqtt
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from dotenv import load_dotenv

# ──────────────────────────────────────────────
# Config
# ──────────────────────────────────────────────

load_dotenv(Path(__file__).parent / ".env")


def _require(name: str) -> str:
    val = os.getenv(name, "").strip()
    if not val:
        print(f"ERROR: required env var '{name}' is not set", file=sys.stderr)
        sys.exit(1)
    return val


def _optional(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


MQTT_BROKER    = _require("MQTT_BROKER")
MQTT_PORT      = int(_optional("MQTT_PORT", "8883"))
MQTT_USERNAME  = _require("MQTT_USERNAME")
MQTT_PASSWORD  = _require("MQTT_PASSWORD")
MQTT_USE_TLS   = _optional("MQTT_USE_TLS", "true").lower() == "true"
MQTT_CLIENT_ID = _optional("MQTT_CLIENT_ID", f"bridge-{int(time.time())}")

# Explicit topic names — no wildcard so each has clear handling
MQTT_FLOW_TOPIC   = _optional("MQTT_FLOW_TOPIC",   "pit_fbk/flow")
MQTT_STATUS_TOPIC = _optional("MQTT_STATUS_TOPIC", "pit_fbk")

# Field name used in status pings to carry the device id
STATUS_DEVICE_ID_FIELD = _optional("STATUS_DEVICE_ID_FIELD", "device_id")

_api_base     = _require("API_URL").rstrip("/")
READINGS_URL  = f"{_api_base}/readings"
HEARTBEAT_URL = f"{_api_base}/heartbeat"

API_KEY = _optional("BRIDGE_API_KEY")

LOG_LEVEL      = _optional("LOG_LEVEL", "INFO").upper()
STATS_INTERVAL = int(_optional("STATS_INTERVAL", "300"))

# Debounce: only forward a heartbeat for a device if this many seconds have
# passed since the last one. Keeps API calls low when devices ping every 15s.
HEARTBEAT_DEBOUNCE = int(_optional("HEARTBEAT_DEBOUNCE", "10"))

HEALTH_FILE = Path("/tmp/bridge_healthy")
VALID_TYPES = {"oms", "liquid_flow"}

# ──────────────────────────────────────────────
# Logging — daily rotation, keep 14 days
# ──────────────────────────────────────────────

LOG_DIR = Path(__file__).parent / "logs"
LOG_DIR.mkdir(exist_ok=True)

_fmt = logging.Formatter(
    fmt="%(asctime)s | %(levelname)-8s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
_file_handler = logging.handlers.TimedRotatingFileHandler(
    LOG_DIR / "bridge.log", when="midnight", backupCount=14, encoding="utf-8",
)
_file_handler.setFormatter(_fmt)
_file_handler.suffix = "%Y-%m-%d"

_stdout_handler = logging.StreamHandler(sys.stdout)
_stdout_handler.setFormatter(_fmt)

logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    handlers=[_stdout_handler, _file_handler],
)
log = logging.getLogger("mqtt-bridge")

# ──────────────────────────────────────────────
# HTTP session — auto-retry on 5xx
# ──────────────────────────────────────────────

_http = requests.Session()
_retry = Retry(total=3, backoff_factor=1, status_forcelist=[500, 502, 503, 504])
_http.mount("https://", HTTPAdapter(max_retries=_retry))
_http.mount("http://",  HTTPAdapter(max_retries=_retry))


def _api_headers() -> dict:
    h: dict = {"Content-Type": "application/json"}
    if API_KEY:
        h["Authorization"] = f"Bearer {API_KEY}"
    return h

# ──────────────────────────────────────────────
# Stats
# ──────────────────────────────────────────────

stats: dict = {
    "messages_received": 0,
    "readings_forwarded": 0,
    "readings_failed": 0,
    "heartbeats_sent": 0,
    "started_at": datetime.now(timezone.utc).isoformat(),
}
_last_stats_log = time.monotonic()


def _maybe_log_stats() -> None:
    global _last_stats_log
    now = time.monotonic()
    if now - _last_stats_log >= STATS_INTERVAL:
        log.info(
            "Stats: received=%d readings=%d heartbeats=%d failed=%d",
            stats["messages_received"],
            stats["readings_forwarded"],
            stats["heartbeats_sent"],
            stats["readings_failed"],
        )
        _last_stats_log = now

# ──────────────────────────────────────────────
# Flow topic — validate fbk items
# ──────────────────────────────────────────────


def _validate_item(item: object) -> tuple[bool, str]:
    if not isinstance(item, dict):
        return False, "not an object"
    if not isinstance(item.get("device_id"), str) or not item["device_id"].strip():
        return False, "missing device_id"
    if item.get("type") not in VALID_TYPES:
        return False, f"invalid type '{item.get('type')}'"
    dur = item.get("duration")
    if not isinstance(dur, (int, float)) or dur < 0:
        return False, "invalid duration"
    if item["type"] == "liquid_flow":
        cons = item.get("consumption")
        if not isinstance(cons, (int, float)) or cons < 0:
            return False, "liquid_flow missing consumption"
    return True, ""


def _handle_flow(topic: str, raw: str) -> None:
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        log.error("Bad JSON on flow [%s]: %s | %.200s", topic, exc, raw)
        stats["readings_failed"] += 1
        return

    fbk = data.get("fbk")
    if not isinstance(fbk, list) or not fbk:
        log.error("Missing/empty 'fbk' array on [%s]: %.200s", topic, raw)
        stats["readings_failed"] += 1
        return

    valid: list[dict] = []
    for i, item in enumerate(fbk):
        ok, err = _validate_item(item)
        if ok:
            valid.append(item)
        else:
            log.warning("fbk[%d] skipped on [%s]: %s", i, topic, err)
            stats["readings_failed"] += 1

    if not valid:
        return

    try:
        resp = _http.post(READINGS_URL, json={"fbk": valid}, headers=_api_headers(), timeout=10)
    except requests.RequestException as exc:
        log.error("Readings API failed [%s]: %s", topic, exc)
        stats["readings_failed"] += len(valid)
        return

    if resp.status_code in (200, 207):
        results = resp.json().get("results", [])
        saved  = sum(1 for r in results if r.get("status") == "saved")
        failed = sum(1 for r in results if r.get("status") != "saved")
        log.info("[flow] %d item(s) → saved=%d failed=%d", len(valid), saved, failed)
        stats["readings_forwarded"] += saved
        stats["readings_failed"]    += failed
    else:
        log.error("Readings API %s [%s]: %.300s", resp.status_code, topic, resp.text)
        stats["readings_failed"] += len(valid)

# ──────────────────────────────────────────────
# Status topic — heartbeat / alive ping
# ──────────────────────────────────────────────

# Debounce: track last forwarded time per device
_last_heartbeat: dict[str, float] = {}


def _extract_device_id(raw: str) -> str | None:
    """Extract device id from a status ping. Accepts JSON object or plain string."""
    raw = raw.strip()
    # plain string
    if not raw.startswith("{"):
        return raw.strip('"') or None
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return None
    # try configured field first, then common alternatives
    for field in (STATUS_DEVICE_ID_FIELD, "device_id", "id", "deviceId", "dev_id"):
        val = data.get(field)
        if isinstance(val, str) and val.strip():
            return val.strip()
    return None


def _handle_status(topic: str, raw: str) -> None:
    device_id = _extract_device_id(raw)
    if not device_id:
        log.warning("Could not extract device_id from status ping on [%s]: %.200s", topic, raw)
        return

    # debounce — skip if we forwarded this device's heartbeat too recently
    now = time.monotonic()
    if now - _last_heartbeat.get(device_id, 0) < HEARTBEAT_DEBOUNCE:
        log.debug("[status] %s — debounced", device_id)
        return
    _last_heartbeat[device_id] = now

    try:
        resp = _http.post(
            HEARTBEAT_URL,
            json={"device_id": device_id},
            headers=_api_headers(),
            timeout=5,
        )
        if resp.status_code == 200:
            log.debug("[status] heartbeat forwarded: %s", device_id)
            stats["heartbeats_sent"] += 1
        else:
            log.warning("[status] heartbeat API %s for %s: %.200s",
                        resp.status_code, device_id, resp.text)
    except requests.RequestException as exc:
        log.error("[status] heartbeat API failed for %s: %s", device_id, exc)

# ──────────────────────────────────────────────
# MQTT callbacks
# ──────────────────────────────────────────────


def on_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        log.info("Connected to broker %s:%s", MQTT_BROKER, MQTT_PORT)
        client.subscribe(MQTT_FLOW_TOPIC,   qos=1)
        client.subscribe(MQTT_STATUS_TOPIC, qos=0)  # QoS 0 is fine for heartbeats
        log.info("Subscribed: flow=%s  status=%s", MQTT_FLOW_TOPIC, MQTT_STATUS_TOPIC)
        HEALTH_FILE.touch()
    else:
        reason = {1: "bad protocol", 2: "bad client id", 3: "unavailable",
                  4: "bad credentials", 5: "not authorized"}.get(rc, f"code {rc}")
        log.error("Connection refused: %s", reason)
        HEALTH_FILE.unlink(missing_ok=True)


def on_disconnect(client, userdata, rc, properties=None, reason_code=None):
    HEALTH_FILE.unlink(missing_ok=True)
    if rc != 0:
        log.warning("Unexpected disconnect (rc=%s) — will auto-reconnect", rc)
    else:
        log.info("Disconnected cleanly")


def on_message(client, userdata, msg):
    stats["messages_received"] += 1
    _maybe_log_stats()

    topic = msg.topic
    raw = msg.payload.decode("utf-8", errors="replace")
    log.debug("RX [%s]: %s", topic, raw)

    if topic == MQTT_FLOW_TOPIC:
        _handle_flow(topic, raw)
    elif topic == MQTT_STATUS_TOPIC:
        _handle_status(topic, raw)
    else:
        log.debug("Unhandled topic [%s] — ignoring", topic)

# ──────────────────────────────────────────────
# Graceful shutdown
# ──────────────────────────────────────────────

mqtt_client: mqtt.Client | None = None


def _shutdown(signum, frame):
    log.info("Signal %s — shutting down (received=%d readings=%d heartbeats=%d failed=%d)",
             signal.Signals(signum).name,
             stats["messages_received"],
             stats["readings_forwarded"],
             stats["heartbeats_sent"],
             stats["readings_failed"])
    HEALTH_FILE.unlink(missing_ok=True)
    if mqtt_client:
        mqtt_client.disconnect()
    sys.exit(0)


signal.signal(signal.SIGINT,  _shutdown)
signal.signal(signal.SIGTERM, _shutdown)

# ──────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────


def main():
    global mqtt_client

    log.info("=" * 54)
    log.info("MQTT Bridge starting")
    log.info("Broker   : %s:%d  TLS=%s", MQTT_BROKER, MQTT_PORT, MQTT_USE_TLS)
    log.info("Flow     : %s → %s", MQTT_FLOW_TOPIC, READINGS_URL)
    log.info("Status   : %s → %s", MQTT_STATUS_TOPIC, HEARTBEAT_URL)
    log.info("Auth     : %s", "Bearer ***" if API_KEY else "none (dev)")
    log.info("Debounce : %ds", HEARTBEAT_DEBOUNCE)
    log.info("=" * 54)

    mqtt_client = mqtt.Client(
        client_id=MQTT_CLIENT_ID,
        callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
    )
    mqtt_client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)

    if MQTT_USE_TLS:
        import ssl
        mqtt_client.tls_set(tls_version=ssl.PROTOCOL_TLS_CLIENT)

    mqtt_client.on_connect    = on_connect
    mqtt_client.on_disconnect = on_disconnect
    mqtt_client.on_message    = on_message
    mqtt_client.reconnect_delay_set(min_delay=2, max_delay=120)

    while True:
        try:
            log.info("Connecting...")
            mqtt_client.connect(MQTT_BROKER, MQTT_PORT, keepalive=60)
            mqtt_client.loop_forever()
        except OSError as exc:
            log.error("Connect failed: %s — retry in 15s", exc)
            time.sleep(15)
        except Exception as exc:
            log.exception("Unexpected error: %s — retry in 15s", exc)
            time.sleep(15)


if __name__ == "__main__":
    main()
