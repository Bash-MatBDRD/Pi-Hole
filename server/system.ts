// ──────────────────────────────────────────────────────────────────────────────
// Real system metrics (CPU / RAM / disk / GPU / uptime) for every monitored
// ZimaOS/host.
//
// No fabricated numbers: every field is either a real reading or explicitly
// marked unavailable (`available: false` + a short French reason) so the UI
// can say "non disponible" instead of lying with a random value.
// ──────────────────────────────────────────────────────────────────────────────
import { exec } from "child_process";
import os from "os";
import { execRemote, isHostConfigured, type HostRecord } from "./hosts";

export interface MetricResult<T> {
  available: boolean;
  reason?: string;
  data?: T;
}

export interface ZimaStats {
  id: string;
  name: string;
  ip: string;
  reachable: boolean;
  reason?: string;
  os: string;
  uptimeSeconds: number | null;
  cpu: { usage: number | null; temperature: number | null };
  ram: { usedGb: number | null; totalGb: number | null; usagePct: number | null };
  disk: {
    path: string;
    totalGb: number | null;
    usedGb: number | null;
    usagePct: number | null;
    temperature: MetricResult<number>;
    health: MetricResult<string>;
  };
  gpu: MetricResult<{ freqMhz: number; maxFreqMhz: number; usagePct: number }>;
}

function run(host: HostRecord, command: string): Promise<string> {
  if (host.isLocal) {
    return new Promise((resolve, reject) => {
      exec(command, { timeout: 6000 }, (err, stdout, stderr) => {
        if (err) return reject(err);
        resolve(stdout || stderr);
      });
    });
  }
  return execRemote(host, command);
}

async function safe<T>(fn: () => Promise<T>): Promise<MetricResult<T>> {
  try {
    const data = await fn();
    return { available: true, data };
  } catch (err: any) {
    return { available: false, reason: err?.message || "Indisponible" };
  }
}

async function getCpuUsage(host: HostRecord): Promise<number> {
  // Two samples 500ms apart from /proc/stat give an accurate instantaneous usage
  // without depending on `top`'s exact output format across distros.
  const read = () => run(host, "cat /proc/stat | head -1");
  const parse = (line: string) => {
    const nums = line.trim().split(/\s+/).slice(1).map(Number);
    const idle = nums[3] + (nums[4] || 0);
    const total = nums.reduce((a, b) => a + b, 0);
    return { idle, total };
  };
  const a = parse(await read());
  await new Promise((r) => setTimeout(r, 500));
  const b = parse(await read());
  const totalDelta = b.total - a.total;
  const idleDelta = b.idle - a.idle;
  if (totalDelta <= 0) throw new Error("Lecture CPU invalide");
  return Math.max(0, Math.min(100, (1 - idleDelta / totalDelta) * 100));
}

async function getCpuTemp(host: HostRecord): Promise<number> {
  const out = await run(host, "cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null");
  const millideg = parseInt(out.trim(), 10);
  if (!Number.isFinite(millideg)) throw new Error("Capteur de température CPU introuvable");
  return millideg / 1000;
}

async function getRam(host: HostRecord): Promise<{ usedGb: number; totalGb: number; usagePct: number }> {
  const out = await run(host, "free -b | grep -i '^Mem:'");
  const cols = out.trim().split(/\s+/).map(Number);
  // free -b Mem: total used free shared buff/cache available
  const totalB = cols[1];
  const availableB = cols[6] ?? cols[3];
  if (!totalB) throw new Error("Lecture RAM invalide");
  const usedB = totalB - availableB;
  return {
    totalGb: totalB / 1e9,
    usedGb: usedB / 1e9,
    usagePct: (usedB / totalB) * 100,
  };
}

async function getUptime(host: HostRecord): Promise<number> {
  const out = await run(host, "cat /proc/uptime");
  const seconds = parseFloat(out.trim().split(/\s+/)[0]);
  if (!Number.isFinite(seconds)) throw new Error("Lecture uptime invalide");
  return seconds;
}

async function getDisk(host: HostRecord, mountPath: string) {
  const out = await run(host, `df -B1 ${mountPath} | tail -1`);
  const cols = out.trim().split(/\s+/);
  const totalB = Number(cols[1]);
  const usedB = Number(cols[2]);
  if (!Number.isFinite(totalB) || totalB <= 0) throw new Error(`Point de montage ${mountPath} introuvable`);
  return { totalGb: totalB / 1e9, usedGb: usedB / 1e9, usagePct: (usedB / totalB) * 100 };
}

async function detectDisk(host: HostRecord): Promise<string> {
  try {
    const out = await run(
      host,
      "lsblk -d -o NAME,TYPE 2>/dev/null | awk '$2==\"disk\"{print \"/dev/\"$1; exit}'"
    );
    const d = out.trim();
    if (d.startsWith("/dev/")) return d;
  } catch {}
  try {
    const out = await run(host, "ls /dev/sda /dev/nvme0n1 /dev/vda /dev/hda 2>/dev/null | head -1");
    const d = out.trim().split("\n")[0];
    if (d.startsWith("/dev/")) return d;
  } catch {}
  return "/dev/sda";
}

async function getDiskTempAndHealth(host: HostRecord): Promise<{ temp: MetricResult<number>; health: MetricResult<string> }> {
  // Detect disk device then run both smartctl queries in a single SSH session.
  // We append "; exit 0" so that a grep-with-no-results (exit 1) never
  // causes the whole command to reject — we just get empty output.
  try {
    const disk = await detectDisk(host);
    const out = await run(
      host,
      `smartctl -A ${disk} 2>/dev/null | grep -i Temperature_Celsius; echo '---'; smartctl -H ${disk} 2>/dev/null | grep -i 'overall-health'; exit 0`
    );
    const parts = out.split("---");
    const tempLine = (parts[0] || "").trim();
    const healthLine = (parts[1] || "").trim();

    const tempCols = tempLine.split(/\s+/);
    const tempVal = Number(tempCols[9]);
    const temp: MetricResult<number> = Number.isFinite(tempVal)
      ? { available: true, data: tempVal }
      : { available: false, reason: "smartctl requis (droits root)" };

    const health: MetricResult<string> = healthLine
      ? { available: true, data: healthLine.toLowerCase().includes("passed") ? "Bon état" : "Attention" }
      : { available: false, reason: "smartctl requis (droits root)" };

    return { temp, health };
  } catch (err: any) {
    // Keep the user-facing message short and clean regardless of the raw error
    const raw: string = err?.message || "";
    const reason = raw.includes("smartctl") || raw.includes("command not found")
      ? "smartctl requis (droits root)"
      : raw.slice(0, 60) || "Indisponible";
    return {
      temp: { available: false, reason },
      health: { available: false, reason },
    };
  }
}

async function getGpu(host: HostRecord) {
  // Run all GPU probes in a single SSH command to avoid multiple connections.
  // Output format: "NVIDIA:<usage>,<freq>,<maxFreq>" or "INTEL:<cur>,<max>"
  const cmd = [
    // 1. Try NVIDIA
    "nvidia-smi --query-gpu=utilization.gpu,clocks.gr,clocks.max.gr --format=csv,noheader,nounits 2>/dev/null",
    "echo '---INTEL---'",
    // 2. Try Intel iGPU sysfs
    "echo \"$(cat /sys/class/drm/card0/gt_cur_freq_mhz 2>/dev/null),$(cat /sys/class/drm/card0/gt_max_freq_mhz 2>/dev/null)\"",
  ].join("; ");

  const out = await run(host, cmd);
  const parts = out.split("---INTEL---");

  // Try NVIDIA first
  const nvidiaPart = (parts[0] || "").trim();
  if (nvidiaPart) {
    const [usage, freq, maxFreq] = nvidiaPart.split(",").map((s) => Number(s.trim()));
    if (Number.isFinite(usage)) return { usagePct: usage, freqMhz: freq, maxFreqMhz: maxFreq };
  }

  // Try Intel iGPU
  const intelPart = (parts[1] || "").trim();
  const [curStr, maxStr] = intelPart.split(",");
  const curMhz = parseInt((curStr || "").trim(), 10);
  const maxMhz = parseInt((maxStr || "").trim(), 10);
  if (!Number.isFinite(curMhz) || !Number.isFinite(maxMhz) || maxMhz <= 0) {
    throw new Error("Aucun GPU dédié détecté et sysfs Intel iGPU introuvable");
  }
  return { freqMhz: curMhz, maxFreqMhz: maxMhz, usagePct: (curMhz / maxMhz) * 100 };
}

async function getOsName(host: HostRecord): Promise<string> {
  try {
    const out = await run(host, "cat /etc/os-release | grep '^PRETTY_NAME' | cut -d= -f2");
    return out.trim().replace(/"/g, "") || (host.isLocal ? `${os.type()} ${os.release()}` : "Linux");
  } catch {
    return host.isLocal ? `${os.type()} ${os.release()}` : "Linux";
  }
}

// ── Extended properties (SMART, lscpu, lsblk) ────────────────────────────────

export interface DiskSmart {
  device: string;
  model: string;
  serial: string;
  firmware: string;
  capacity: string;
  transport: string;
  powerOnHours: number | null;
  reallocatedSectors: number | null;
  pendingSectors: number | null;
  uncorrectable: number | null;
  health: string;
  temperature: number | null;
  rotational: boolean;
}

export interface ExtendedProperties {
  cpu: {
    model: string;
    architecture: string;
    cores: number;
    threads: number;
    sockets: number;
    baseFreqMhz: number;
    cacheKb: number | null;
    virtualization: string;
  };
  ram: { totalGb: number | null; type: string; speed: string };
  disks: DiskSmart[];
  motherboard: string;
  kernel: string;
}

async function getCpuDetails(host: HostRecord): Promise<ExtendedProperties["cpu"]> {
  const out = await run(host, "lscpu 2>/dev/null");
  const g = (key: string) => {
    const line = out.split("\n").find(l => l.toLowerCase().startsWith(key.toLowerCase()));
    return line?.split(":")[1]?.trim() || "";
  };
  return {
    model: g("model name") || g("cpu") || "Inconnu",
    architecture: g("architecture") || "x86_64",
    cores: parseInt(g("core(s) per socket")) || 1,
    threads: parseInt(g("cpu(s)")) || 1,
    sockets: parseInt(g("socket(s)")) || 1,
    baseFreqMhz: parseFloat(g("cpu max mhz") || g("cpu mhz")) || 0,
    cacheKb: (s => s ? parseInt(s) * (s.includes("M") ? 1024 : 1) : null)(g("l3 cache") || g("l2 cache")),
    virtualization: g("virtualization") || "N/A",
  };
}

async function getAllDisksSmart(host: HostRecord): Promise<DiskSmart[]> {
  const listOut = await run(host, "lsblk -d -o NAME,TYPE,ROTA,TRAN,SIZE 2>/dev/null | awk '$2==\"disk\"{print $1\"|\"$3\"|\"$4\"|\"$5}'").catch(() => "");
  const diskLines = listOut.trim().split("\n").filter(Boolean);
  const devices = diskLines.map(l => { const p = l.split("|"); return { dev: `/dev/${p[0]}`, rota: p[1] === "1", tran: p[2] || "?", size: p[3] || "?" }; });
  if (!devices.length) devices.push({ dev: "/dev/sda", rota: true, tran: "?", size: "?" });

  const results: DiskSmart[] = [];
  for (const { dev, rota, tran, size } of devices.slice(0, 4)) {
    try {
      const out = await run(host, `smartctl -i -A ${dev} 2>/dev/null; echo '===HEALTH==='; smartctl -H ${dev} 2>/dev/null | grep -i 'overall-health'`);
      const [infoRaw, healthRaw] = out.split("===HEALTH===");
      const g = (key: string) => infoRaw.split("\n").find(l => l.toLowerCase().includes(key.toLowerCase()))?.split(":").slice(1).join(":").trim() || "";
      const attr = (id: string) => { const l = infoRaw.split("\n").find(l => l.toLowerCase().includes(id.toLowerCase())); return l ? parseInt(l.trim().split(/\s+/)[9]) : null; };
      results.push({
        device: dev,
        model: g("device model") || g("model family") || "Inconnu",
        serial: g("serial number") || "N/A",
        firmware: g("firmware version") || "N/A",
        capacity: g("user capacity").replace(/\[|\]/g, "") || size,
        transport: tran.toUpperCase(),
        powerOnHours: attr("power_on_hours"),
        reallocatedSectors: attr("reallocated_sector"),
        pendingSectors: attr("current_pending_sector"),
        uncorrectable: attr("offline_uncorrectable"),
        health: (healthRaw || "").toLowerCase().includes("passed") ? "Bon état" : (healthRaw || "").trim() ? "Attention" : "N/A (root requis)",
        temperature: attr("temperature_celsius"),
        rotational: rota,
      });
    } catch {}
  }
  return results;
}

export async function getExtendedProperties(host: HostRecord): Promise<ExtendedProperties> {
  const [cpuRes, disksRes, kernelOut] = await Promise.all([
    safe(() => getCpuDetails(host)),
    getAllDisksSmart(host),
    safe(() => run(host, "uname -r")),
  ]);
  return {
    cpu: cpuRes.data ?? { model: "Inconnu", architecture: "?", cores: 0, threads: 0, sockets: 1, baseFreqMhz: 0, cacheKb: null, virtualization: "N/A" },
    ram: { totalGb: null, type: "?", speed: "?" },
    disks: disksRes,
    motherboard: "",
    kernel: kernelOut.data?.trim() || "?",
  };
}

export async function getZimaStats(host: HostRecord): Promise<ZimaStats> {
  const diskPath = host.filesRoot || "/DATA";

  if (!host.isLocal && !isHostConfigured(host)) {
    return {
      id: host.id,
      name: host.name,
      ip: host.ip,
      reachable: false,
      reason: `SSH non configuré pour ${host.name} (adresse/utilisateur/mot de passe manquants)`,
      os: "Inconnu",
      uptimeSeconds: null,
      cpu: { usage: null, temperature: null },
      ram: { usedGb: null, totalGb: null, usagePct: null },
      disk: { path: diskPath, totalGb: null, usedGb: null, usagePct: null, temperature: { available: false, reason: "Hôte inaccessible" }, health: { available: false, reason: "Hôte inaccessible" } },
      gpu: { available: false, reason: "Hôte inaccessible" },
    };
  }

  // Run independent metrics in parallel, but group commands that share an SSH session
  // to reduce total number of simultaneous connections (ZimaOS limits concurrent SSH sessions).
  const [osName, cpuUsageR, cpuTempR, ramR, uptimeR, diskR, diskSmartR, gpuR] = await Promise.all([
    getOsName(host),
    safe(() => getCpuUsage(host)),
    safe(() => getCpuTemp(host)),
    safe(() => getRam(host)),
    safe(() => getUptime(host)),
    safe(() => getDisk(host, diskPath)),
    getDiskTempAndHealth(host),   // single SSH session for both smartctl queries
    safe(() => getGpu(host)),     // single SSH session for all GPU probes
  ]);

  const reachable = cpuUsageR.available || ramR.available || uptimeR.available;

  return {
    id: host.id,
    name: host.name,
    ip: host.ip,
    reachable,
    reason: reachable ? undefined : (cpuUsageR.reason || ramR.reason || "Hôte inaccessible"),
    os: osName,
    uptimeSeconds: uptimeR.data ?? null,
    cpu: { usage: cpuUsageR.data ?? null, temperature: cpuTempR.data ?? null },
    ram: { usedGb: ramR.data?.usedGb ?? null, totalGb: ramR.data?.totalGb ?? null, usagePct: ramR.data?.usagePct ?? null },
    disk: {
      path: diskPath,
      totalGb: diskR.data?.totalGb ?? null,
      usedGb: diskR.data?.usedGb ?? null,
      usagePct: diskR.data?.usagePct ?? null,
      temperature: diskSmartR.temp,
      health: diskSmartR.health,
    },
    gpu: gpuR.available ? { available: true, data: gpuR.data } : { available: false, reason: gpuR.reason },
  };
}
