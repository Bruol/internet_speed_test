# Internet Speed Test Monitor

This stack runs the official Ookla `speedtest` CLI every 5 minutes with Bun, stores normalized results in InfluxDB 2.x, and exposes a preprovisioned Grafana dashboard.

## Services

- `influxdb` on `http://localhost:8086`
- `grafana` on `http://localhost:3000`
- `speedtest-monitor` on the internal Docker network

## Prerequisites

- Docker with Docker Compose support
- A local `.env` file copied from `.env.example`
- Acceptance of Ookla's Speedtest CLI license and GDPR prompt through the corresponding env flags

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
- Results are written to the `internet_speed` measurement in the configured InfluxDB bucket.
- The dashboard includes download, upload, latency, jitter, packet loss, and a recent results table.
