# Internet Speed Test Monitor

This stack runs the official Ookla `speedtest` CLI with Bun, stores normalized results in InfluxDB 2.x, and exposes a preprovisioned Grafana dashboard.

## Services

- `influxdb` on `http://localhost:8086`
- `grafana` on `http://localhost:3000`
- `speedtest-monitor` on the host network so it can bind to the LXC's `eth0` and `eth1`

## Prerequisites

- Docker with Docker Compose support
- A local `.env` file copied from `.env.example`
- Acceptance of Ookla's Speedtest CLI license and GDPR prompt through the corresponding env flags
- Two working network paths in the LXC, for example `eth0` for LAN and `eth1` for Wi-Fi

## Start

```bash
cp .env.example .env
docker compose up -d --build
```

## Default credentials

- Grafana: `admin` / value from `GRAFANA_ADMIN_PASSWORD`
- InfluxDB: value from `INFLUXDB_INIT_USERNAME` / `INFLUXDB_INIT_PASSWORD`

## Notes

- The monitor runs once immediately on startup, then every `SPEEDTEST_INTERVAL_SECONDS`.
- The monitor binds one test to `LAN_INTERFACE` and one to `WIFI_INTERFACE` each cycle.
- Results are written as a single combined point in the `internet_speed` measurement with separate `lan_*` and `wifi_*` fields.
- The dashboard compares LAN and Wi-Fi download, upload, latency, packet loss, and recent test rows.
