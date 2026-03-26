{
  "id": null,
  "uid": "internet-speed-test",
  "title": "Internet Speed Test",
  "tags": ["speedtest", "influxdb"],
  "timezone": "browser",
  "schemaVersion": 39,
  "version": 3,
  "refresh": "30s",
  "time": {
    "from": "now-24h",
    "to": "now"
  },
  "panels": [
    {
      "id": 1,
      "type": "timeseries",
      "title": "Download Speed",
      "datasource": {
        "type": "influxdb",
        "uid": "influxdb"
      },
      "gridPos": {
        "h": 8,
        "w": 12,
        "x": 0,
        "y": 0
      },
      "fieldConfig": {
        "defaults": {
          "unit": "Mbits/sec",
          "color": {
            "mode": "palette-classic"
          }
        },
        "overrides": []
      },
      "options": {
        "legend": {
          "displayMode": "list",
          "placement": "bottom",
          "showLegend": true
        },
        "tooltip": {
          "mode": "single",
          "sort": "none"
        }
      },
      "targets": [
        {
          "query": "from(bucket: \"__INFLUXDB_BUCKET__\")\n  |> range(start: v.timeRangeStart, stop: v.timeRangeStop)\n  |> filter(fn: (r) => r._measurement == \"internet_speed\")\n  |> filter(fn: (r) => r._field == \"lan_download_mbps\" or r._field == \"wifi_download_mbps\")\n  |> aggregateWindow(every: v.windowPeriod, fn: mean, createEmpty: false)",
          "refId": "A"
        }
      ]
    },
    {
      "id": 2,
      "type": "timeseries",
      "title": "Upload Speed",
      "datasource": {
        "type": "influxdb",
        "uid": "influxdb"
      },
      "gridPos": {
        "h": 8,
        "w": 12,
        "x": 12,
        "y": 0
      },
      "fieldConfig": {
        "defaults": {
          "unit": "Mbits/sec",
          "color": {
            "mode": "palette-classic"
          }
        },
        "overrides": []
      },
      "options": {
        "legend": {
          "displayMode": "list",
          "placement": "bottom",
          "showLegend": true
        },
        "tooltip": {
          "mode": "single",
          "sort": "none"
        }
      },
      "targets": [
        {
          "query": "from(bucket: \"__INFLUXDB_BUCKET__\")\n  |> range(start: v.timeRangeStart, stop: v.timeRangeStop)\n  |> filter(fn: (r) => r._measurement == \"internet_speed\")\n  |> filter(fn: (r) => r._field == \"lan_upload_mbps\" or r._field == \"wifi_upload_mbps\")\n  |> aggregateWindow(every: v.windowPeriod, fn: mean, createEmpty: false)",
          "refId": "A"
        }
      ]
    },
    {
      "id": 3,
      "type": "timeseries",
      "title": "Latency",
      "datasource": {
        "type": "influxdb",
        "uid": "influxdb"
      },
      "gridPos": {
        "h": 8,
        "w": 12,
        "x": 0,
        "y": 8
      },
      "fieldConfig": {
        "defaults": {
          "unit": "ms",
          "color": {
            "mode": "palette-classic"
          }
        },
        "overrides": []
      },
      "options": {
        "legend": {
          "displayMode": "list",
          "placement": "bottom",
          "showLegend": true
        },
        "tooltip": {
          "mode": "single",
          "sort": "none"
        }
      },
      "targets": [
        {
          "query": "from(bucket: \"__INFLUXDB_BUCKET__\")\n  |> range(start: v.timeRangeStart, stop: v.timeRangeStop)\n  |> filter(fn: (r) => r._measurement == \"internet_speed\")\n  |> filter(fn: (r) => r._field == \"lan_latency_ms\" or r._field == \"wifi_latency_ms\")\n  |> aggregateWindow(every: v.windowPeriod, fn: mean, createEmpty: false)",
          "refId": "A"
        }
      ]
    },
    {
      "id": 4,
      "type": "stat",
      "title": "Latest LAN Download",
      "datasource": {
        "type": "influxdb",
        "uid": "influxdb"
      },
      "gridPos": {
        "h": 4,
        "w": 4,
        "x": 12,
        "y": 8
      },
      "fieldConfig": {
        "defaults": {
          "unit": "Mbits/sec"
        },
        "overrides": []
      },
      "options": {
        "colorMode": "value",
        "graphMode": "area",
        "justifyMode": "auto",
        "orientation": "auto",
        "reduceOptions": {
          "calcs": ["lastNotNull"],
          "fields": "",
          "values": false
        },
        "textMode": "auto"
      },
      "targets": [
        {
          "query": "from(bucket: \"__INFLUXDB_BUCKET__\")\n  |> range(start: v.timeRangeStart, stop: v.timeRangeStop)\n  |> filter(fn: (r) => r._measurement == \"internet_speed\")\n  |> filter(fn: (r) => r._field == \"lan_download_mbps\")\n  |> group()\n  |> sort(columns: [\"_time\"], desc: true)\n  |> limit(n: 1)",
          "refId": "A"
        }
      ]
    },
    {
      "id": 5,
      "type": "stat",
      "title": "Latest Wi-Fi Download",
      "datasource": {
        "type": "influxdb",
        "uid": "influxdb"
      },
      "gridPos": {
        "h": 4,
        "w": 4,
        "x": 16,
        "y": 8
      },
      "fieldConfig": {
        "defaults": {
          "unit": "Mbits/sec"
        },
        "overrides": []
      },
      "options": {
        "colorMode": "value",
        "graphMode": "area",
        "justifyMode": "auto",
        "orientation": "auto",
        "reduceOptions": {
          "calcs": ["lastNotNull"],
          "fields": "",
          "values": false
        },
        "textMode": "auto"
      },
      "targets": [
        {
          "query": "from(bucket: \"__INFLUXDB_BUCKET__\")\n  |> range(start: v.timeRangeStart, stop: v.timeRangeStop)\n  |> filter(fn: (r) => r._measurement == \"internet_speed\")\n  |> filter(fn: (r) => r._field == \"wifi_download_mbps\")\n  |> group()\n  |> sort(columns: [\"_time\"], desc: true)\n  |> limit(n: 1)",
          "refId": "A"
        }
      ]
    },
    {
      "id": 6,
      "type": "stat",
      "title": "Latest LAN Latency",
      "datasource": {
        "type": "influxdb",
        "uid": "influxdb"
      },
      "gridPos": {
        "h": 4,
        "w": 4,
        "x": 20,
        "y": 8
      },
      "fieldConfig": {
        "defaults": {
          "unit": "ms"
        },
        "overrides": []
      },
      "options": {
        "colorMode": "value",
        "graphMode": "area",
        "justifyMode": "auto",
        "orientation": "auto",
        "reduceOptions": {
          "calcs": ["lastNotNull"],
          "fields": "",
          "values": false
        },
        "textMode": "auto"
      },
      "targets": [
        {
          "query": "from(bucket: \"__INFLUXDB_BUCKET__\")\n  |> range(start: v.timeRangeStart, stop: v.timeRangeStop)\n  |> filter(fn: (r) => r._measurement == \"internet_speed\")\n  |> filter(fn: (r) => r._field == \"lan_latency_ms\")\n  |> group()\n  |> sort(columns: [\"_time\"], desc: true)\n  |> limit(n: 1)",
          "refId": "A"
        }
      ]
    },
    {
      "id": 7,
      "type": "stat",
      "title": "Latest Wi-Fi Latency",
      "datasource": {
        "type": "influxdb",
        "uid": "influxdb"
      },
      "gridPos": {
        "h": 4,
        "w": 4,
        "x": 12,
        "y": 12
      },
      "fieldConfig": {
        "defaults": {
          "unit": "ms"
        },
        "overrides": []
      },
      "options": {
        "colorMode": "value",
        "graphMode": "area",
        "justifyMode": "auto",
        "orientation": "auto",
        "reduceOptions": {
          "calcs": ["lastNotNull"],
          "fields": "",
          "values": false
        },
        "textMode": "auto"
      },
      "targets": [
        {
          "query": "from(bucket: \"__INFLUXDB_BUCKET__\")\n  |> range(start: v.timeRangeStart, stop: v.timeRangeStop)\n  |> filter(fn: (r) => r._measurement == \"internet_speed\")\n  |> filter(fn: (r) => r._field == \"wifi_latency_ms\")\n  |> group()\n  |> sort(columns: [\"_time\"], desc: true)\n  |> limit(n: 1)",
          "refId": "A"
        }
      ]
    },
    {
      "id": 8,
      "type": "timeseries",
      "title": "Packet Loss",
      "datasource": {
        "type": "influxdb",
        "uid": "influxdb"
      },
      "gridPos": {
        "h": 8,
        "w": 8,
        "x": 16,
        "y": 12
      },
      "fieldConfig": {
        "defaults": {
          "unit": "percent",
          "color": {
            "mode": "palette-classic"
          }
        },
        "overrides": []
      },
      "options": {
        "legend": {
          "displayMode": "list",
          "placement": "bottom",
          "showLegend": true
        },
        "tooltip": {
          "mode": "single",
          "sort": "none"
        }
      },
      "targets": [
        {
          "query": "from(bucket: \"__INFLUXDB_BUCKET__\")\n  |> range(start: v.timeRangeStart, stop: v.timeRangeStop)\n  |> filter(fn: (r) => r._measurement == \"internet_speed\")\n  |> filter(fn: (r) => r._field == \"lan_packet_loss_pct\" or r._field == \"wifi_packet_loss_pct\")\n  |> aggregateWindow(every: v.windowPeriod, fn: mean, createEmpty: false)",
          "refId": "A"
        }
      ]
    },
    {
      "id": 9,
      "type": "table",
      "title": "Recent Tests",
      "datasource": {
        "type": "influxdb",
        "uid": "influxdb"
      },
      "gridPos": {
        "h": 12,
        "w": 24,
        "x": 0,
        "y": 20
      },
      "fieldConfig": {
        "defaults": {},
        "overrides": [
          {
            "matcher": {
              "id": "byName",
              "options": "lan_download_mbps"
            },
            "properties": [
              {
                "id": "unit",
                "value": "Mbits/sec"
              }
            ]
          },
          {
            "matcher": {
              "id": "byName",
              "options": "wifi_download_mbps"
            },
            "properties": [
              {
                "id": "unit",
                "value": "Mbits/sec"
              }
            ]
          },
          {
            "matcher": {
              "id": "byName",
              "options": "lan_upload_mbps"
            },
            "properties": [
              {
                "id": "unit",
                "value": "Mbits/sec"
              }
            ]
          },
          {
            "matcher": {
              "id": "byName",
              "options": "wifi_upload_mbps"
            },
            "properties": [
              {
                "id": "unit",
                "value": "Mbits/sec"
              }
            ]
          },
          {
            "matcher": {
              "id": "byName",
              "options": "lan_latency_ms"
            },
            "properties": [
              {
                "id": "unit",
                "value": "ms"
              }
            ]
          },
          {
            "matcher": {
              "id": "byName",
              "options": "wifi_latency_ms"
            },
            "properties": [
              {
                "id": "unit",
                "value": "ms"
              }
            ]
          }
        ]
      },
      "options": {
        "cellHeight": "sm",
        "footer": {
          "show": false
        },
        "showHeader": true
      },
      "targets": [
        {
          "query": "from(bucket: \"__INFLUXDB_BUCKET__\")\n  |> range(start: -30d)\n  |> filter(fn: (r) => r._measurement == \"internet_speed\")\n  |> filter(fn: (r) => r._field == \"lan_download_mbps\" or r._field == \"lan_upload_mbps\" or r._field == \"lan_latency_ms\" or r._field == \"lan_jitter_ms\" or r._field == \"lan_packet_loss_pct\" or r._field == \"lan_interface\" or r._field == \"lan_server_name\" or r._field == \"lan_server_location\" or r._field == \"lan_server_country\" or r._field == \"wifi_download_mbps\" or r._field == \"wifi_upload_mbps\" or r._field == \"wifi_latency_ms\" or r._field == \"wifi_jitter_ms\" or r._field == \"wifi_packet_loss_pct\" or r._field == \"wifi_interface\" or r._field == \"wifi_server_name\" or r._field == \"wifi_server_location\" or r._field == \"wifi_server_country\")\n  |> group(columns: [])\n  |> pivot(rowKey: [\"_time\"], columnKey: [\"_field\"], valueColumn: \"_value\")\n  |> keep(columns: [\"_time\", \"lan_interface\", \"lan_download_mbps\", \"lan_upload_mbps\", \"lan_latency_ms\", \"lan_server_name\", \"wifi_interface\", \"wifi_download_mbps\", \"wifi_upload_mbps\", \"wifi_latency_ms\", \"wifi_server_name\"])\n  |> sort(columns: [\"_time\"], desc: true)\n  |> limit(n: 20)",
          "refId": "A"
        }
      ]
    }
  ]
}
