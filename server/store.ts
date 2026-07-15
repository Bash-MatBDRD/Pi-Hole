// ──────────────────────────────────────────────────────────────────────────────
// Persistent panel storage.
//
// Everything the panel needs to remember across restarts lives here in a plain
// JSON file on disk (`data/nexus-store.json`) — settings, HA/Discord config,
// devices, the monitored ZimaOS host list, and an activity log of actions
// taken on the panel.
//
// Two kinds of data:
//  - "durable" state (settings, hosts, HA/Discord config, device states):
//    never touched by cleanup, kept forever.
//  - "cache" (the activity log, Discord bot log): pruned automatically once a
//    week to free up space, per the user's request — but never the durable
//    state above.
// ──────────────────────────────────────────────────────────────────────────────
import fs from "fs";
import path from "path";
import crypto from "crypto";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "nexus-store.json");
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const ACTIVITY_LOG_CAP = 2000; // hard ceiling even before weekly cleanup kicks in

export interface HostRecord {
  id: string;
  name: string;
  ip: string;
  isLocal: boolean;
  sshUser?: string;
  sshPassword?: string;
  filesRoot: string;
  createdAt: number;
}

export interface ActivityEntry {
  id: string;
  ts: number;
  category: string; // "auth" | "domotique" | "zimaos" | "fichiers" | "settings" | "discord"
  action: string;
  details?: string;
}

export interface DiscordLogEntry {
  timestamp: string;
  user: string;
  command: string;
  response: string;
}

interface StoreShape {
  haConfig: { url: string; token: string; isConnected: boolean };
  discordConfig: { token: string; botName: string; prefix: string; status: string };
  devices: any[];
  discordLogs: DiscordLogEntry[];
  hosts: HostRecord[];
  activityLog: ActivityEntry[];
  lastCacheCleanup: number;
}

const DEFAULT_DEVICES = [
  { id: "light.salon_led", name: "LED Salon", type: "light", state: "on", room: "Salon", attributes: { brightness: 75, color_temp: "warm", power_w: 12 } },
  { id: "light.cuisine_principal", name: "Cuisine Plafonnier", type: "light", state: "off", room: "Cuisine", attributes: { brightness: 0, color_temp: "daylight", power_w: 0 } },
  { id: "cover.salon_volet", name: "Volet Roulant Salon", type: "cover", state: "open", room: "Salon", attributes: { current_position: 100 } },
  { id: "cover.chambre_store", name: "Store Chambre", type: "cover", state: "closed", room: "Chambre", attributes: { current_position: 0 } },
  { id: "climate.thermostat_salon", name: "Thermostat Principal", type: "climate", state: "heat", room: "Salon", attributes: { current_temperature: 19.5, temperature: 21.0, hvac_mode: "heat" } },
  { id: "switch.prise_tv", name: "Prise TV & Consoles", type: "switch", state: "on", room: "Salon", attributes: { power_w: 125.4, today_energy_kwh: 1.2 } },
  { id: "switch.machine_cafe", name: "Cafetière", type: "switch", state: "off", room: "Cuisine", attributes: { power_w: 0, today_energy_kwh: 0.4 } },
  { id: "media_player.spotify_salon", name: "Enceinte Salon (Spotify)", type: "media_player", state: "playing", room: "Salon", attributes: { volume_level: 0.4, media_title: "Bohemian Rhapsody", media_artist: "Queen", media_duration: 354, media_position: 120 } },
  { id: "camera.entree_secure", name: "Caméra Allée & Entrée", type: "camera", state: "idle", room: "Extérieur", attributes: { motion_detected: false, fps: 15 } },
];

function defaultStore(): StoreShape {
  const now = Date.now();
  return {
    haConfig: {
      url: "http://192.168.1.25:8123",
      token: "",
      isConnected: false,
    },
    discordConfig: { token: "", botName: "Domobot", prefix: "/", status: "online" },
    devices: DEFAULT_DEVICES,
    discordLogs: [
      { timestamp: new Date(now - 3600000).toISOString(), user: "Mathieu", command: "/ha status", response: "✅ Home Assistant: Connecté | 9 appareils détectés." },
      { timestamp: new Date(now - 1800000).toISOString(), user: "Système", command: "Event: Volet Roulant Salon", response: "Position modifiée à 100% (Ouvert)" },
      { timestamp: new Date(now - 600000).toISOString(), user: "Mathieu", command: "/light salon_led on brightness=75", response: "💡 LED Salon allumé à 75%" },
      { timestamp: new Date(now - 300000).toISOString(), user: "ZimaOS_Zera", command: "HDD Health Check", response: "Hard Drive Check: Perfect (41°C) - 0 bad sectors" },
    ],
    hosts: [
      { id: "local", name: "ZimaOS Local (hôte du panel)", ip: "192.168.1.3", isLocal: true, filesRoot: process.env.LOCAL_FILES_ROOT || "/DATA", createdAt: now },
      {
        id: "remote", name: "ZimaOS Principal", ip: process.env.ZIMA2_SSH_HOST || "192.168.1.25", isLocal: false,
        sshUser: process.env.ZIMA2_SSH_USER || "", sshPassword: process.env.ZIMA2_SSH_PASSWORD || "",
        filesRoot: process.env.REMOTE_FILES_ROOT || "/DATA", createdAt: now,
      },
    ],
    activityLog: [],
    lastCacheCleanup: now,
  };
}

let cache: StoreShape | null = null;
let writeTimer: NodeJS.Timeout | null = null;

function load(): StoreShape {
  if (cache) return cache;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
      cache = { ...defaultStore(), ...raw };
      return cache;
    } catch {
      // Corrupt file — start fresh rather than crash the whole panel.
    }
  }
  cache = defaultStore();
  persist();
  return cache;
}

function persist() {
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    if (!cache) return;
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(cache, null, 2), "utf-8");
  }, 150); // debounce bursts of writes (e.g. rapid device toggles)
}

// ── HA config ──────────────────────────────────────────────────────────────
export function getHaConfig() { return load().haConfig; }
export function setHaConfig(next: Partial<StoreShape["haConfig"]>) {
  const s = load(); s.haConfig = { ...s.haConfig, ...next }; persist(); return s.haConfig;
}

// ── Discord config ───────────────────────────────────────────────────────────
export function getDiscordConfig() { return load().discordConfig; }
export function setDiscordConfig(next: Partial<StoreShape["discordConfig"]>) {
  const s = load(); s.discordConfig = { ...s.discordConfig, ...next }; persist(); return s.discordConfig;
}

// ── Devices (mock/fallback HA device state) ──────────────────────────────────
export function getDevices() { return load().devices; }
export function saveDevices(devices: any[]) { load().devices = devices; persist(); }

// ── Discord activity terminal (treated as cache — pruned weekly) ────────────
export function getDiscordLogs() { return load().discordLogs; }
export function addDiscordLog(entry: DiscordLogEntry) {
  const s = load();
  s.discordLogs.unshift(entry);
  if (s.discordLogs.length > 50) s.discordLogs.pop();
  persist();
}

// ── Monitored ZimaOS hosts ───────────────────────────────────────────────────
export const MAX_CUSTOM_HOSTS = 3;

export function listHosts(): HostRecord[] { return load().hosts; }
export function getHost(id: string): HostRecord | undefined {
  return load().hosts.find((h) => h.id === id);
}
export function addHost(input: { name: string; ip: string; sshUser: string; sshPassword: string; filesRoot?: string }): HostRecord {
  const s = load();
  const customCount = s.hosts.filter((h) => !h.isLocal && h.id !== "remote").length;
  if (customCount >= MAX_CUSTOM_HOSTS) {
    throw new Error(`Limite atteinte : maximum ${MAX_CUSTOM_HOSTS} systèmes supplémentaires`);
  }
  if (!input.name?.trim() || !input.ip?.trim()) throw new Error("Nom et adresse IP requis");
  const record: HostRecord = {
    id: crypto.randomBytes(6).toString("hex"),
    name: input.name.trim(),
    ip: input.ip.trim(),
    isLocal: false,
    sshUser: input.sshUser?.trim() || "",
    sshPassword: input.sshPassword || "",
    filesRoot: input.filesRoot?.trim() || "/DATA",
    createdAt: Date.now(),
  };
  s.hosts.push(record);
  persist();
  return record;
}
export function removeHost(id: string) {
  const s = load();
  if (id === "local") throw new Error("Le système local ne peut pas être supprimé");
  const before = s.hosts.length;
  s.hosts = s.hosts.filter((h) => h.id !== id);
  if (s.hosts.length === before) throw new Error("Système introuvable");
  persist();
}

// ── Activity log (cache — pruned weekly) ─────────────────────────────────────
export function logActivity(category: string, action: string, details?: string) {
  const s = load();
  s.activityLog.unshift({ id: crypto.randomBytes(6).toString("hex"), ts: Date.now(), category, action, details });
  if (s.activityLog.length > ACTIVITY_LOG_CAP) s.activityLog.length = ACTIVITY_LOG_CAP;
  persist();
}
export function getRecentActivity(limit = 100): ActivityEntry[] {
  return load().activityLog.slice(0, limit);
}

// ── Weekly cache cleanup ──────────────────────────────────────────────────────
// Only prunes the activity log / Discord terminal log (the "cache"). Settings,
// HA/Discord config, device state and the host list are durable and untouched.
export function runCacheCleanupIfDue(): { ranNow: boolean; removed: number } {
  const s = load();
  if (Date.now() - s.lastCacheCleanup < WEEK_MS) return { ranNow: false, removed: 0 };
  const cutoff = Date.now() - WEEK_MS;
  const beforeLog = s.activityLog.length;
  s.activityLog = s.activityLog.filter((e) => e.ts >= cutoff);
  const beforeDiscord = s.discordLogs.length;
  s.discordLogs = s.discordLogs.filter((e) => new Date(e.timestamp).getTime() >= cutoff).slice(0, 50);
  s.lastCacheCleanup = Date.now();
  persist();
  logActivity("system", "Nettoyage hebdomadaire du cache effectué", `${(beforeLog - s.activityLog.length) + (beforeDiscord - s.discordLogs.length)} entrées supprimées`);
  return { ranNow: true, removed: (beforeLog - s.activityLog.length) + (beforeDiscord - s.discordLogs.length) };
}

export function startWeeklyCleanupScheduler() {
  runCacheCleanupIfDue();
  setInterval(runCacheCleanupIfDue, 24 * 60 * 60 * 1000); // check once a day
}
