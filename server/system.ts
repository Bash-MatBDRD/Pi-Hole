// ──────────────────────────────────────────────────────────────────────────────
// Real system metrics (CPU / RAM / disk / GPU / uptime) for both ZimaOS boxes.
//
// No fabricated numbers: every field is either a real reading or explicitly
// marked unavailable (`available: false` + a short French reason) so the UI
// can say "non disponible" instead of lying with a random value.
// ──────────────────────────────────────────────────────────────────────────────
import { exec } from "child_process";
import os from "os";
import { execRemote, HOSTS, isRemoteConfigured, type HostKey } from "./hosts";

export interface MetricResult<T> {
  available: boolean;
  reason?: string;
  data?: T;
}

export interface ZimaStats {
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

function run(hostKey: HostKey, command: string): Promise<string> {
  if (hostKey === "local") {
    return new Promise((resolve, reject) => {
      exec(command, { timeout: 6000 }, (err, stdout, stderr) => {
        if (err) return reject(err);
        resolve(stdout || stderr);
      });
    });
  }
  return execRemote(command);
}

async function safe<T>(fn: () => Promise<T>): Promise<MetricResult<T>> {
  try {
    const data = await fn();
    return { available: true, data };
  } catch (err: any) {
    return { available: false, reason: err?.message || "Indisponible" };
  }
}

async function getCpuUsage(hostKey: HostKey): Promise<number> {
  // Two samples 500ms apart from /proc/stat give an accurate instantaneous usage
  // without depending on `top`'s exact output format across distros.
  const read = () => run(hostKey, "cat /proc/stat | head -1");
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

async function getCpuTemp(hostKey: HostKey): Promise<number> {
  const out = await run(hostKey, "cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null");
  const millideg = parseInt(out.trim(), 10);
  if (!Number.isFinite(millideg)) throw new Error("Capteur de température CPU introuvable");
  return millideg / 1000;
}

async function getRam(hostKey: HostKey): Promise<{ usedGb: number; totalGb: number; usagePct: number }> {
  const out = await run(hostKey, "free -b | grep -i '^Mem:'");
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

async function getUptime(hostKey: HostKey): Promise<number> {
  const out = await run(hostKey, "cat /proc/uptime");
  const seconds = parseFloat(out.trim().split(/\s+/)[0]);
  if (!Number.isFinite(seconds)) throw new Error("Lecture uptime invalide");
  return seconds;
}

async function getDisk(hostKey: HostKey, mountPath: string) {
  const out = await run(hostKey, `df -B1 ${mountPath} | tail -1`);
  const cols = out.trim().split(/\s+/);
  const totalB = Number(cols[1]);
  const usedB = Number(cols[2]);
  if (!Number.isFinite(totalB) || totalB <= 0) throw new Error(`Point de montage ${mountPath} introuvable`);
  return { totalGb: totalB / 1e9, usedGb: usedB / 1e9, usagePct: (usedB / totalB) * 100 };
}

async function getDiskTemp(hostKey: HostKey): Promise<number> {
  // smartctl needs root; if the ZimaOS sudoers allow passwordless smartctl this works,
  // otherwise we report the metric as unavailable rather than invent a number.
  const out = await run(hostKey, "smartctl -A /dev/sda 2>/dev/null | grep -i Temperature_Celsius");
  const cols = out.trim().split(/\s+/);
  const temp = Number(cols[9]);
  if (!Number.isFinite(temp)) throw new Error("smartctl indisponible (droits root requis)");
  return temp;
}

async function getDiskHealth(hostKey: HostKey): Promise<string> {
  const out = await run(hostKey, "smartctl -H /dev/sda 2>/dev/null | grep -i 'overall-health'");
  if (!out.trim()) throw new Error("smartctl indisponible (droits root requis)");
  return out.toLowerCase().includes("passed") ? "Bon état" : "Attention";
}

async function getGpu(hostKey: HostKey) {
  // 1. Dedicated NVIDIA GPU, if present.
  try {
    const out = await run(
      hostKey,
      "nvidia-smi --query-gpu=utilization.gpu,clocks.gr,clocks.max.gr --format=csv,noheader,nounits 2>/dev/null"
    );
    const [usage, freq, maxFreq] = out.trim().split(",").map((s) => Number(s.trim()));
    if (Number.isFinite(usage)) return { usagePct: usage, freqMhz: freq, maxFreqMhz: maxFreq };
  } catch {
    /* fall through to Intel iGPU */
  }

  // 2. Intel integrated GPU (N5105 / J4125 use the i915 driver) via sysfs frequency.
  const cur = await run(hostKey, "cat /sys/class/drm/card0/gt_cur_freq_mhz 2>/dev/null");
  const max = await run(hostKey, "cat /sys/class/drm/card0/gt_max_freq_mhz 2>/dev/null");
  const curMhz = parseInt(cur.trim(), 10);
  const maxMhz = parseInt(max.trim(), 10);
  if (!Number.isFinite(curMhz) || !Number.isFinite(maxMhz) || maxMhz <= 0) {
    throw new Error("Aucun GPU dédié détecté et sysfs Intel iGPU introuvable");
  }
  return { freqMhz: curMhz, maxFreqMhz: maxMhz, usagePct: (curMhz / maxMhz) * 100 };
}

async function getOsName(hostKey: HostKey): Promise<string> {
  try {
    const out = await run(hostKey, "cat /etc/os-release | grep '^PRETTY_NAME' | cut -d= -f2");
    return out.trim().replace(/"/g, "") || (hostKey === "local" ? `${os.type()} ${os.release()}` : "Linux");
  } catch {
    return hostKey === "local" ? `${os.type()} ${os.release()}` : "Linux";
  }
}

export async function getZimaStats(hostKey: HostKey, diskPath: string): Promise<ZimaStats> {
  const host = HOSTS[hostKey];

  if (hostKey === "remote" && !isRemoteConfigured()) {
    return {
      name: host.name,
      ip: host.ip,
      reachable: false,
      reason: "SSH non configuré pour le ZimaOS Principal (secrets ZIMA2_SSH_* manquants)",
      os: "Inconnu",
      uptimeSeconds: null,
      cpu: { usage: null, temperature: null },
      ram: { usedGb: null, totalGb: null, usagePct: null },
      disk: { path: diskPath, totalGb: null, usedGb: null, usagePct: null, temperature: { available: false, reason: "Hôte inaccessible" }, health: { available: false, reason: "Hôte inaccessible" } },
      gpu: { available: false, reason: "Hôte inaccessible" },
    };
  }

  const [osName, cpuUsageR, cpuTempR, ramR, uptimeR, diskR, diskTempR, diskHealthR, gpuR] = await Promise.all([
    getOsName(hostKey),
    safe(() => getCpuUsage(hostKey)),
    safe(() => getCpuTemp(hostKey)),
    safe(() => getRam(hostKey)),
    safe(() => getUptime(hostKey)),
    safe(() => getDisk(hostKey, diskPath)),
    safe(() => getDiskTemp(hostKey)),
    safe(() => getDiskHealth(hostKey)),
    safe(() => getGpu(hostKey)),
  ]);

  const reachable = cpuUsageR.available || ramR.available || uptimeR.available;

  return {
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
      temperature: diskTempR.available ? { available: true, data: diskTempR.data } : { available: false, reason: diskTempR.reason },
      health: diskHealthR.available ? { available: true, data: diskHealthR.data } : { available: false, reason: diskHealthR.reason },
    },
    gpu: gpuR.available ? { available: true, data: gpuR.data } : { available: false, reason: gpuR.reason },
  };
}
