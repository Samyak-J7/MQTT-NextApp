# API v1 (mobile app)

Base URL: `https://<your-vercel-domain>/api/v1`. JSON in and out; times are epoch ms.
Errors: `{ "error": { "code": "...", "message": "..." } }`.

## Auth

After login or register, send `Authorization: Bearer <token>` on every other call.
The token lasts 30 days; on any `401`, send the user back to login.

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/auth/register` | `{ name, email, password }` (password ≥ 8) | `201 { token, user }` · `409 email_taken` |
| POST | `/auth/login` | `{ email, password }` | `{ token, user }` · `401 invalid_credentials` |
| GET | `/me` | — | `{ user }` |

`user` = `{ userId, email, name }`

## Devices

A device is identified by its BLE MAC (`E072A16F6B1A`; `e0:72:a1:6f:6b:1a` is also accepted).
Up to **5 accounts** can add the same device. Each keeps its own `name` and `location` for it,
and deleting only removes it from your account.

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/devices` | — | `{ devices: Device[] }` |
| POST | `/devices` | `{ deviceId, name, location? }` | `201 { device }` · `409 already_added` · `409 device_full` (5 accounts have it) |
| GET | `/devices/{deviceId}` | — | `{ device }` |
| PATCH | `/devices/{deviceId}` | `{ name?, location? }` (`location: null` clears) | `{ device }` |
| DELETE | `/devices/{deviceId}` | — | `204` |

```json
{ "deviceId": "E072A16F6B1A", "name": "Terrace tank", "location": "Roof", "createdAt": 1794744130255,
  "latest": { "ts": 1794744130255, "sRead": 66, "lipo": 2383, "txNum": 1878, "rssi": -33 } }
```
`latest` is `null` until the device has sent something. A device not in your account returns `404`.

## Readings

`GET /devices/{deviceId}/readings?from=&to=&limit=` — newest first, `limit` 1–1000 (default 200).

```json
{ "deviceId": "E072A16F6B1A", "readings": [ { "ts": 1794744130255, "sRead": 66, "lipo": 2383, "txNum": 1878, "rssi": -33 } ] }
```

Field meanings (raw values, the app converts them for display):
- `sRead` — tank level, % full (0–100)
- `lipo` — battery raw value; volts = `lipo / 650` (2600 = 4.0 V full, 1950 = 3.0 V empty)
- `txNum` — transmission counter; gaps mean missed readings
- `rssi` — signal strength at the relaying phone, dBm

Readings arrive about every 10 minutes per device: 24 h ≈ 144 readings.

## How data gets in

Phone app → MQTT `pit_fbk/ble` → `mqtt-bridge` → `POST /ingest/ble` (bridge key) → `Readings`.
Readings are stored for every beacon heard, so a device already has history when it's added.
The same frame relayed by two phones is stored once.

## Setup

1. Create the tables (once): `node --env-file=.env.local scripts/create-v1-tables.mjs`
   → `Users` (PK email), `DeviceClaims` (PK deviceId, SK userId, GSI byUser), `Readings` (PK deviceId, SK ts).
   If the AWS key's IAM policy lists table names, add these three (and `DeviceClaims/index/*`).
   Upgrading from the single-owner `Devices` table: run the script above, then
   `node --env-file=.env.local scripts/migrate-device-claims.mjs` (re-runnable), then redeploy.
2. Vercel env: add `API_JWT_SECRET` (≥ 32 chars, e.g. `openssl rand -base64 48`).
   `BRIDGE_API_KEY` is already there.
3. Redeploy the bridge (`fly deploy` in `mqtt-bridge/`). It now also subscribes to `pit_fbk/ble`.
