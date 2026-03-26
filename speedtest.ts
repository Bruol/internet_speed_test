import { InfluxDB, Point } from "@influxdata/influxdb-client";

const MEASUREMENT = "internet_speed";
const DEFAULT_INTERVAL_SECONDS = 300;

type PathName = "lan" | "wifi";

interface Config {
  influxUrl: string;
  influxToken: string;
  influxOrg: string;
  influxBucket: string;
  intervalSeconds: number;
  acceptLicense: boolean;
  acceptGdpr: boolean;
  lanInterface: string;
  wifiInterface: string;
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

interface PathResult {
  path: PathName;
  interfaceName: string;
  result?: OoklaSpeedtestResult;
  error?: string;
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

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
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
    lanInterface: requireEnv("LAN_INTERFACE"),
    wifiInterface: requireEnv("WIFI_INTERFACE"),
  };
}

function buildSpeedtestCommand(config: Config, interfaceName: string) {
  const command = ["speedtest"];

  if (config.acceptLicense) {
    command.push("--accept-license");
  }

  if (config.acceptGdpr) {
    command.push("--accept-gdpr");
  }

  command.push("--interface", interfaceName, "--format=json");
  return command;
}

async function runSpeedtest(config: Config, path: PathName, interfaceName: string): Promise<PathResult> {
  const proc = Bun.spawn({
    cmd: buildSpeedtestCommand(config, interfaceName),
    stdout: "pipe",
    stderr: "pipe",
  });

  const [exitCode, stdout, stderr] = await Promise.all([
    proc.exited,
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);

  if (exitCode !== 0) {
    return {
      path,
      interfaceName,
      error: `speedtest exited with code ${exitCode}: ${stderr.trim() || "no stderr output"}`,
    };
  }

  try {
    return {
      path,
      interfaceName,
      result: JSON.parse(stdout) as OoklaSpeedtestResult,
    };
  } catch (error) {
    return {
      path,
      interfaceName,
      error: `Failed to parse speedtest JSON output: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

function bytesPerSecondToMbps(value: number | undefined) {
  if (value === undefined) {
    return undefined;
  }

  return (value * 8) / 1_000_000;
}

function addStringField(point: Point, fieldName: string, value: string | undefined) {
  if (value) {
    point.stringField(fieldName, value);
  }
}

function addFloatField(point: Point, fieldName: string, value: number | undefined) {
  if (value !== undefined) {
    point.floatField(fieldName, value);
  }
}

function addPathResultFields(point: Point, path: PathName, interfaceName: string, result?: OoklaSpeedtestResult, error?: string) {
  addStringField(point, `${path}_interface`, interfaceName);

  if (error) {
    addStringField(point, `${path}_error`, error);
    return;
  }

  if (!result) {
    addStringField(point, `${path}_error`, "No result returned");
    return;
  }

  addFloatField(point, `${path}_download_mbps`, bytesPerSecondToMbps(result.download?.bandwidth));
  addFloatField(point, `${path}_upload_mbps`, bytesPerSecondToMbps(result.upload?.bandwidth));
  addFloatField(point, `${path}_latency_ms`, result.ping?.latency);
  addFloatField(point, `${path}_jitter_ms`, result.ping?.jitter);
  addFloatField(point, `${path}_packet_loss_pct`, result.packetLoss);

  addStringField(point, `${path}_server_id`, result.server?.id !== undefined ? String(result.server.id) : undefined);
  addStringField(point, `${path}_server_name`, result.server?.name);
  addStringField(point, `${path}_server_location`, result.server?.location);
  addStringField(point, `${path}_server_country`, result.server?.country);
  addStringField(point, `${path}_isp`, result.isp);
  addStringField(point, `${path}_external_ip`, result.interface?.externalIp);
}

function mapResultsToPoint(results: PathResult[]) {
  const point = new Point(MEASUREMENT).timestamp(new Date());

  for (const entry of results) {
    addPathResultFields(point, entry.path, entry.interfaceName, entry.result, entry.error);
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

function formatSummary(pathResult: PathResult) {
  if (pathResult.error) {
    return `${pathResult.path}(${pathResult.interfaceName}) failed`;
  }

  const downloadMbps = bytesPerSecondToMbps(pathResult.result?.download?.bandwidth);
  const uploadMbps = bytesPerSecondToMbps(pathResult.result?.upload?.bandwidth);
  const latencyMs = pathResult.result?.ping?.latency;

  return (
    `${pathResult.path}(${pathResult.interfaceName}) ` +
    `download=${downloadMbps?.toFixed(2) ?? "n/a"} Mbps, ` +
    `upload=${uploadMbps?.toFixed(2) ?? "n/a"} Mbps, ` +
    `latency=${latencyMs?.toFixed(2) ?? "n/a"} ms`
  );
}

async function runOnce(config: Config) {
  log(`Running speed tests on ${config.lanInterface} and ${config.wifiInterface}`);

  const results = await Promise.all([
    runSpeedtest(config, "lan", config.lanInterface),
    runSpeedtest(config, "wifi", config.wifiInterface),
  ]);

  for (const result of results) {
    if (result.error) {
      log(`${result.path} test failed on ${result.interfaceName}: ${result.error}`);
    }
  }

  if (results.every((result) => !result.result)) {
    log("Skipping write because both speed tests failed");
    return;
  }

  try {
    const point = mapResultsToPoint(results);
    await writeResult(point, config);
    log(`Saved result: ${results.map(formatSummary).join(" | ")}`);
  } catch (error) {
    log("Failed to write combined speed test result", error);
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
