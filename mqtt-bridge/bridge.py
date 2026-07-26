"""
MQTT-to-API Bridge

Topic routing:
  MQTT_STATUS_TOPIC  (default: pit_fbk)       — device alive pings       → /api/heartbeat
  MQTT_FLOW_TOPIC    (default: pit_fbk/flow)  — oms/liquid_flow readings → /api/readings
  MQTT_LOGG_TOPIC    (default: pit_fbk/logg)  — mixed-content channel;
                                                 only power_meter-shaped
                                                 items are extracted and
                                                 forwarded → /api/readings.
                                                 Everything else on this
                                                 topic is expected traffic
                                                 and silently ignored.

Status ping payload (any of these are accepted):
  {"device_id": "DEV-001"}
  {"id": "DEV-001"}
  "DEV-001"          ← plain string

Flow payload:
  {"fbk": [{"device_id": "DEV-001", "type": "oms", "duration": 3600}]}
  {"fbk": [{"device_id": "DEV-002", "type": "liquid_flow", "duration": 3600, "consumption": 142.5}]}

Logg payload (power_meter, mixed in with unrelated messages):
  {"fbk": [{"dev_id": "pit_pzmE44586043254", "volt": 236.0, "ampr": 0.71,
            "unit": 74.61, "frqc": 50.0, "watt": 150.2, "pf": 0.89}]}

Scheduling:
  Fetches enabled TTR/SRS/SST schedules from GET {API_URL}/schedules/all and
  sleeps exactly until the next one is due, firing rly0=<seconds> to
  MQTT_OMS_TOPIC (same contract as the dashboard's manual Quick On control).
  POST /refresh-schedules (on the health-check HTTP server) wakes the
  scheduler immediately when the dashboard adds/removes a schedule.
"""

import os
import sys
import json
import time
import signal
import logging
import threading
from datetime import datetime, timezone, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

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
MQTT_LOGG_TOPIC   = _optional("MQTT_LOGG_TOPIC",   "pit_fbk/logg")

# Field name used in status pings to carry the device id
STATUS_DEVICE_ID_FIELD = _optional("STATUS_DEVICE_ID_FIELD", "device_id")

_api_base      = _require("API_URL").rstrip("/")
READINGS_URL   = f"{_api_base}/readings"
HEARTBEAT_URL  = f"{_api_base}/heartbeat"
SCHEDULES_URL  = f"{_api_base}/schedules/all"

API_KEY = _optional("BRIDGE_API_KEY")

LOG_LEVEL      = _optional("LOG_LEVEL", "INFO").upper()
STATS_INTERVAL = int(_optional("STATS_INTERVAL", "300"))

# Debounce: only forward a heartbeat for a device if this many seconds have
# passed since the last one. Keeps API calls low when devices ping every 15s.
HEARTBEAT_DEBOUNCE = int(_optional("HEARTBEAT_DEBOUNCE", "10"))

# Schedule firing — same topic/payload contract as the dashboard's manual
# "Quick On" control (src/app/api/devices/[deviceId]/control/route.ts):
# publishing rly0=<seconds> makes the device turn on and auto-off itself.
MQTT_OMS_TOPIC = _optional("MQTT_OMS_TOPIC", "pit_oms_g2one")

# TTR trigAt (HH:MM) is entered in this timezone by the dashboard; SRS/SST
# sunrise/sunset are computed in UTC directly from lat/lon so this doesn't
# affect them.
SCHEDULE_TZ = ZoneInfo(_optional("SCHEDULE_TZ", "Asia/Kolkata"))

# Fallback re-sync if a webhook push from the dashboard is ever missed.
SCHEDULE_REFRESH_INTERVAL = int(_optional("SCHEDULE_REFRESH_INTERVAL", "600"))

HEALTH_FILE = Path("/tmp/bridge_healthy")
VALID_TYPES = {"oms", "liquid_flow", "power_meter"}
POWER_METER_FIELDS = {"volt", "ampr", "watt", "unit", "frqc", "pf"}

# ──────────────────────────────────────────────
# Logging — stdout only (captured by Docker / Fly)
# ──────────────────────────────────────────────

logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    stream=sys.stdout,
    format="%(asctime)s | %(levelname)-8s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
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
    "logg_ignored": 0,
    "heartbeats_sent": 0,
    "started_at": datetime.now(timezone.utc).isoformat(),
}
_last_stats_log = time.monotonic()


def _maybe_log_stats() -> None:
    global _last_stats_log
    now = time.monotonic()
    if now - _last_stats_log >= STATS_INTERVAL:
        log.info(
            "Stats: received=%d readings=%d heartbeats=%d failed=%d logg_ignored=%d",
            stats["messages_received"],
            stats["readings_forwarded"],
            stats["heartbeats_sent"],
            stats["readings_failed"],
            stats["logg_ignored"],
        )
        _last_stats_log = now

# ──────────────────────────────────────────────
# Flow topic — validate fbk items
# ──────────────────────────────────────────────


def _clean_device_id(raw_id: str) -> str:
    """Strip any trailing '~[...]' state/array suffix some firmware appends
    to device ids, e.g. 'pit_oms_e6614864d3496f34~[7,0,0,0]' → 'pit_oms_e6614864d3496f34'.
    Left uncleaned, the suffixed id gets stored as a different device than
    the one registered on the dashboard, so it never shows as online."""
    return raw_id.split("~", 1)[0].strip()


def _normalise_item(item: dict) -> dict:
    """Normalise field aliases and infer missing type before validation."""
    item = dict(item)
    # dev_id → device_id alias
    if "dev_id" in item and "device_id" not in item:
        item["device_id"] = item.pop("dev_id")
    if isinstance(item.get("device_id"), str):
        item["device_id"] = _clean_device_id(item["device_id"])
    # infer power_meter from presence of electrical fields
    if "type" not in item and POWER_METER_FIELDS.issubset(item.keys()):
        item["type"] = "power_meter"
    return item


def _validate_item(item: object) -> tuple[bool, str]:
    if not isinstance(item, dict):
        return False, "not an object"
    item = _normalise_item(item)
    if not isinstance(item.get("device_id"), str) or not item["device_id"].strip():
        return False, "missing device_id / dev_id"
    item_type = item.get("type")
    if item_type not in VALID_TYPES:
        return False, f"invalid type '{item_type}'"
    if item_type == "power_meter":
        for f in POWER_METER_FIELDS:
            if not isinstance(item.get(f), (int, float)):
                return False, f"power_meter missing/invalid field '{f}'"
        return True, ""
    dur = item.get("duration")
    if not isinstance(dur, (int, float)) or dur < 0:
        return False, "invalid duration"
    if item_type == "liquid_flow":
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
            valid.append(_normalise_item(item) if isinstance(item, dict) else item)
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
# Logg topic — mixed-content channel, power_meter only.
# Other message shapes on this topic are expected traffic (other firmware
# writing to the same channel), not errors — dropped at debug level only.
# ──────────────────────────────────────────────


def _handle_logg(topic: str, raw: str) -> None:
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        log.debug("Non-JSON message on [%s], ignoring: %.200s", topic, raw)
        stats["logg_ignored"] += 1
        return

    fbk = data.get("fbk")
    if not isinstance(fbk, list) or not fbk:
        log.debug("No 'fbk' array on [%s], ignoring: %.200s", topic, raw)
        stats["logg_ignored"] += 1
        return

    power_meter_items: list[dict] = []
    for item in fbk:
        if not isinstance(item, dict):
            stats["logg_ignored"] += 1
            continue
        normalised = _normalise_item(item)
        ok, err = _validate_item(normalised)
        if ok and normalised.get("type") == "power_meter":
            power_meter_items.append(normalised)
        else:
            log.debug("fbk item on [%s] ignored (%s): %.150s", topic, err or "not power_meter", item)
            stats["logg_ignored"] += 1

    if not power_meter_items:
        return

    try:
        resp = _http.post(READINGS_URL, json={"fbk": power_meter_items}, headers=_api_headers(), timeout=10)
    except requests.RequestException as exc:
        log.error("Readings API failed [%s]: %s", topic, exc)
        stats["readings_failed"] += len(power_meter_items)
        return

    if resp.status_code in (200, 207):
        results = resp.json().get("results", [])
        saved  = sum(1 for r in results if r.get("status") == "saved")
        failed = sum(1 for r in results if r.get("status") != "saved")
        log.info("[logg] %d power_meter item(s) → saved=%d failed=%d", len(power_meter_items), saved, failed)
        stats["readings_forwarded"] += saved
        stats["readings_failed"]    += failed
    else:
        log.error("Readings API %s [%s]: %.300s", resp.status_code, topic, resp.text)
        stats["readings_failed"] += len(power_meter_items)

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
        return _clean_device_id(raw.strip('"')) or None
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return None
    # try configured field first, then common alternatives
    for field in (STATUS_DEVICE_ID_FIELD, "device_id", "id", "deviceId", "dev_id"):
        val = data.get(field)
        if isinstance(val, str) and val.strip():
            return _clean_device_id(val.strip()) or None
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
# Scheduler — exact-timer firing of TTR/SRS/SST schedules.
# No polling loop: sleeps precisely until the earliest upcoming trigger and
# wakes early (via _schedule_refresh_event) whenever the dashboard notifies
# us a schedule changed, so a newly-added schedule can never be delayed by
# a stale sleep.
# ──────────────────────────────────────────────

_schedules: list[dict] = []
_schedule_lock = threading.Lock()
_schedule_refresh_event = threading.Event()
_last_schedule_fetch = 0.0


def _fetch_schedules() -> None:
    global _schedules, _last_schedule_fetch
    try:
        resp = _http.get(SCHEDULES_URL, headers=_api_headers(), timeout=10)
        resp.raise_for_status()
        data = resp.json().get("schedules", [])
        with _schedule_lock:
            _schedules = [s for s in data if s.get("mode") in ("TTR", "SRS", "SST")]
        _last_schedule_fetch = time.monotonic()
        log.info("Schedules synced: %d active", len(_schedules))
    except requests.RequestException as exc:
        log.error("Failed to fetch schedules: %s", exc)


def _next_ttr(trig_at: str, now_utc: datetime) -> datetime | None:
    try:
        hh, mm = int(trig_at[:2]), int(trig_at[2:4])
    except (ValueError, IndexError):
        return None
    now_local = now_utc.astimezone(SCHEDULE_TZ)
    candidate = now_local.replace(hour=hh, minute=mm, second=0, microsecond=0)
    if candidate <= now_local:
        candidate += timedelta(days=1)
    return candidate.astimezone(timezone.utc)


def _next_sun(mode: str, lat: float, lon: float, now_utc: datetime) -> datetime | None:
    try:
        from astral import LocationInfo
        from astral.sun import sun
    except ImportError:
        log.error("astral not installed — SRS/SST schedules disabled")
        return None
    observer = LocationInfo(latitude=lat, longitude=lon).observer
    key = "sunrise" if mode == "SRS" else "sunset"
    for day_offset in (0, 1):
        d = (now_utc + timedelta(days=day_offset)).date()
        try:
            candidate = sun(observer, date=d, tzinfo=timezone.utc)[key]
        except Exception as exc:  # astral raises on polar day/night edge cases
            log.warning("Sun calc failed for %s on %s: %s", mode, d, exc)
            continue
        if candidate > now_utc:
            return candidate
    return None


def _compute_next_fire(schedule: dict, now_utc: datetime) -> datetime | None:
    mode = schedule.get("mode")
    if mode == "TTR":
        return _next_ttr(schedule.get("trigAt", "0000"), now_utc)
    if mode in ("SRS", "SST"):
        lat, lon = schedule.get("lat"), schedule.get("lon")
        if lat is None or lon is None:
            return None
        return _next_sun(mode, lat, lon, now_utc)
    return None


def _fire_schedule(schedule: dict) -> None:
    device_id = schedule.get("deviceId")
    duration_min = schedule.get("duration", 0)
    payload = {"dev_id": device_id, "rly0": duration_min * 60}

    if not mqtt_client or not mqtt_client.is_connected():
        log.error("[schedule] MQTT not connected — dropped fire for %s", device_id)
        return
    try:
        mqtt_client.publish(MQTT_OMS_TOPIC, json.dumps(payload), qos=1)
        log.info("[schedule] fired %s on %s → rly0=%ds", schedule.get("scheduleId"), device_id, duration_min * 60)
    except Exception as exc:
        log.error("[schedule] publish failed for %s: %s", device_id, exc)


def _scheduler_loop() -> None:
    _fetch_schedules()
    while True:
        now = datetime.now(timezone.utc)

        if time.monotonic() - _last_schedule_fetch > SCHEDULE_REFRESH_INTERVAL:
            _fetch_schedules()

        with _schedule_lock:
            schedules = list(_schedules)

        next_fire: datetime | None = None
        due: list[dict] = []
        for s in schedules:
            fire_at = _compute_next_fire(s, now)
            if fire_at is None:
                continue
            if fire_at <= now:
                due.append(s)
            elif next_fire is None or fire_at < next_fire:
                next_fire = fire_at

        for s in due:
            _fire_schedule(s)

        if due:
            continue  # recompute immediately — a fired TTR/SRS/SST rolls to its next occurrence

        sleep_for = (next_fire - datetime.now(timezone.utc)).total_seconds() if next_fire else SCHEDULE_REFRESH_INTERVAL
        sleep_for = max(0.5, min(sleep_for, SCHEDULE_REFRESH_INTERVAL))

        woke_early = _schedule_refresh_event.wait(timeout=sleep_for)
        if woke_early:
            _schedule_refresh_event.clear()
            _fetch_schedules()


# ──────────────────────────────────────────────
# MQTT callbacks
# ──────────────────────────────────────────────


_scheduler_started = False


def on_connect(client, userdata, flags, rc, properties=None):
    global _scheduler_started
    if rc == 0:
        log.info("Connected to broker %s:%s", MQTT_BROKER, MQTT_PORT)
        client.subscribe(MQTT_FLOW_TOPIC,   qos=1)
        client.subscribe(MQTT_LOGG_TOPIC,   qos=1)
        client.subscribe(MQTT_STATUS_TOPIC, qos=0)  # QoS 0 is fine for heartbeats
        log.info("Subscribed: flow=%s  logg=%s  status=%s", MQTT_FLOW_TOPIC, MQTT_LOGG_TOPIC, MQTT_STATUS_TOPIC)
        HEALTH_FILE.touch()
        if not _scheduler_started:
            _scheduler_started = True
            threading.Thread(target=_scheduler_loop, daemon=True).start()
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
    elif topic == MQTT_LOGG_TOPIC:
        _handle_logg(topic, raw)
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


def _start_health_server() -> None:
    """Tiny HTTP server so Railway/Fly health checks pass, and so the
    dashboard can push an instant schedule-refresh notification. Runs in a
    daemon thread."""
    port = int(os.getenv("PORT", "8080"))
    from http.server import BaseHTTPRequestHandler, HTTPServer

    class _H(BaseHTTPRequestHandler):
        def do_GET(self):
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"ok")

        def do_POST(self):
            if self.path != "/refresh-schedules":
                self.send_response(404)
                self.end_headers()
                return
            if API_KEY and self.headers.get("Authorization") != f"Bearer {API_KEY}":
                self.send_response(401)
                self.end_headers()
                return
            _schedule_refresh_event.set()
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"ok")

        def log_message(self, *_): pass  # silence access logs

    threading.Thread(target=HTTPServer(("0.0.0.0", port), _H).serve_forever, daemon=True).start()
    log.info("Health server listening on :%d", port)


def main():
    global mqtt_client

    _start_health_server()

    log.info("=" * 54)
    log.info("MQTT Bridge starting")
    log.info("Broker   : %s:%d  TLS=%s", MQTT_BROKER, MQTT_PORT, MQTT_USE_TLS)
    log.info("Flow     : %s → %s", MQTT_FLOW_TOPIC, READINGS_URL)
    log.info("Logg     : %s → %s (power_meter only)", MQTT_LOGG_TOPIC, READINGS_URL)
    log.info("Status   : %s → %s", MQTT_STATUS_TOPIC, HEARTBEAT_URL)
    log.info("Auth     : %s", "Bearer ***" if API_KEY else "none (dev)")
    log.info("Debounce : %ds", HEARTBEAT_DEBOUNCE)
    log.info("Schedule : %s → %s (tz=%s)", SCHEDULES_URL, MQTT_OMS_TOPIC, SCHEDULE_TZ)
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
