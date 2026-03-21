import { InfluxDB, Point } from "@influxdata/influxdb-client";

const MEASUREMENT = "internet_speed";
const DEFAULT_INTERVAL_SECONDS = 300;

interface Config {
  influxUrl: string;
  influxToken: string;
  influxOrg: string;
  influxBucket: string;
  intervalSeconds: number;
  acceptLicense: boolean;
  acceptGdpr: boolean;
}

interface OoklaSpeedtestResult {
  timestamp?: string;
  ping?: {
    jitter?: number;
    latency?: number;
  };
  download?: {
    bandwidth?: number;
  };
  upload?: {
    bandwidth?: number;
  };
  packetLoss?: number;
  isp?: string;
  interface?: {
    externalIp?: string;
  };
  server?: {
    id?: number | string;
    name?: string;
    location?: string;
    country?: string;
  };
}

function log(message: string, error?: unknown) {
  const prefix = `[${new Date().toISOString()}]`;
  if (error) {
    console.error(prefix, message, error);
    return;
  }
  console.log(prefix, message);
}

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(normalized);
}

function parseIntervalSeconds(value: string | undefined) {
  const parsed = Number.parseInt(value ?? `${DEFAULT_INTERVAL_SECONDS}`, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("SPEEDTEST_INTERVAL_SECONDS must be a positive integer");
  }

  return parsed;
}

function requireEnv(name: string) {
  const value = Bun.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function loadConfig(): Config {
  return {
    influxUrl: requireEnv("INFLUXDB_URL"),
    influxToken: requireEnv("INFLUXDB_TOKEN"),
    influxOrg: requireEnv("INFLUXDB_ORG"),
    influxBucket: requireEnv("INFLUXDB_BUCKET"),
    intervalSeconds: parseIntervalSeconds(Bun.env.SPEEDTEST_INTERVAL_SECONDS),
    acceptLicense: parseBoolean(Bun.env.SPEEDTEST_ACCEPT_LICENSE, true),
    acceptGdpr: parseBoolean(Bun.env.SPEEDTEST_ACCEPT_GDPR, true),
  };
}

function buildSpeedtestCommand(config: Config) {
  const command = ["speedtest"];

  if (config.acceptLicense) {
    command.push("--accept-license");
  }

  if (config.acceptGdpr) {
    command.push("--accept-gdpr");
  }

  command.push("--format=json");
  return command;
}

async function runSpeedtest(config: Config): Promise<OoklaSpeedtestResult> {
  const proc = Bun.spawn({
    cmd: buildSpeedtestCommand(config),
    stdout: "pipe",
    stderr: "pipe",
  });

  const [exitCode, stdout, stderr] = await Promise.all([
    proc.exited,
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);

  if (exitCode !== 0) {
    throw new Error(`speedtest exited with code ${exitCode}: ${stderr.trim() || "no stderr output"}`);
  }

  try {
    return JSON.parse(stdout) as OoklaSpeedtestResult;
  } catch (error) {
    throw new Error(`Failed to parse speedtest JSON output: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function bytesPerSecondToMbps(value: number | undefined) {
  if (value === undefined) {
    return undefined;
  }

  return (value * 8) / 1_000_000;
}

function parseTimestamp(value: string | undefined) {
  if (!value) {
    return new Date();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }

  return parsed;
}

function mapResultToPoint(result: OoklaSpeedtestResult, config: Config) {
  const downloadMbps = bytesPerSecondToMbps(result.download?.bandwidth);
  const uploadMbps = bytesPerSecondToMbps(result.upload?.bandwidth);
  const latencyMs = result.ping?.latency;

  if (downloadMbps === undefined || uploadMbps === undefined || latencyMs === undefined) {
    throw new Error("Speedtest result is missing required download, upload, or latency values");
  }

  const point = new Point(MEASUREMENT)
    .floatField("download_mbps", downloadMbps)
    .floatField("upload_mbps", uploadMbps)
    .floatField("latency_ms", latencyMs)
    .timestamp(parseTimestamp(result.timestamp));

  if (result.ping?.jitter !== undefined) {
    point.floatField("jitter_ms", result.ping.jitter);
  }

  if (result.packetLoss !== undefined) {
    point.floatField("packet_loss_pct", result.packetLoss);
  }

  if (result.server?.id !== undefined) {
    point.stringField("server_id", String(result.server.id));
  }

  if (result.server?.name) {
    point.stringField("server_name", result.server.name);
  }

  if (result.server?.location) {
    point.stringField("server_location", result.server.location);
  }

  if (result.server?.country) {
    point.stringField("server_country", result.server.country);
  }

  if (result.isp) {
    point.stringField("isp", result.isp);
  }

  if (result.interface?.externalIp) {
    point.stringField("interface_external_ip", result.interface.externalIp);
  }

  return point;
}

async function writeResult(point: Point, config: Config) {
  const influxDB = new InfluxDB({ url: config.influxUrl, token: config.influxToken });
  const writeApi = influxDB.getWriteApi(config.influxOrg, config.influxBucket, "ns");

  try {
    writeApi.writePoint(point);
    await writeApi.flush();
  } finally {
    await writeApi.close();
  }
}

async function runOnce(config: Config) {
  log("Running speed test");

  try {
    const result = await runSpeedtest(config);
    const downloadMbps = bytesPerSecondToMbps(result.download?.bandwidth);
    const uploadMbps = bytesPerSecondToMbps(result.upload?.bandwidth);
    const latencyMs = result.ping?.latency;
    const point = mapResultToPoint(result, config);
    await writeResult(point, config);

    log(
      `Saved result: download=${downloadMbps?.toFixed(2) ?? "n/a"} Mbps, ` +
        `upload=${uploadMbps?.toFixed(2) ?? "n/a"} Mbps, ` +
        `latency=${latencyMs?.toFixed(2) ?? "n/a"} ms`,
    );
  } catch (error) {
    log("Speed test cycle failed", error);
  }
}

async function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function startScheduler(config: Config) {
  let shuttingDown = false;

  const handleSignal = (signal: string) => {
    if (!shuttingDown) {
      shuttingDown = true;
      log(`Received ${signal}, stopping after current cycle`);
    }
  };

  process.on("SIGINT", () => handleSignal("SIGINT"));
  process.on("SIGTERM", () => handleSignal("SIGTERM"));

  log(`Starting speedtest monitor with ${config.intervalSeconds}s interval`);

  while (!shuttingDown) {
    await runOnce(config);

    if (shuttingDown) {
      break;
    }

    await sleep(config.intervalSeconds * 1000);
  }

  log("Speedtest monitor stopped");
}

async function main() {
  const config = loadConfig();
  await startScheduler(config);
}

main().catch((error) => {
  log("Startup failed", error);
  process.exit(1);
});
