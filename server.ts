import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import multer from "multer";
import { getZimaStats } from "./server/system";
import { getHosts, requireHost, MAX_CUSTOM_HOSTS } from "./server/hosts";
import {
  listDir, streamDownload, uploadFile, deleteEntry,
  createShareLink, resolveShare,
} from "./server/files";
import * as store from "./server/store";
import { addHost, removeHost } from "./server/store";
import { startDiscordBot, getBotStats } from "./server/discord";
import { execRemote, isHostConfigured } from "./server/hosts";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 5000;
const upload = multer({ dest: "/tmp/nexus-uploads" });

app.use(express.json());

// Persistent storage: every action below reads/writes server/store.ts, which is
// backed by a JSON file on disk (data/nexus-store.json) — settings, config and
// device state survive restarts. Only the activity/Discord logs are treated as
// a "cache" and pruned automatically once a week.
store.startWeeklyCleanupScheduler();
startDiscordBot();

function safeHostPublic(h: ReturnType<typeof getHosts>[number]) {
  // Never leak SSH credentials to the client — only whether they're set.
  const { sshPassword, sshUser, ...pub } = h;
  return { ...pub, sshConfigured: Boolean(h.sshUser && h.sshPassword) };
}

// API - SYSTEM STATS (real readings from every monitored host — see server/system.ts)
app.get("/api/system/stats", async (req, res) => {
  try {
    const hosts = getHosts();
    const stats = await Promise.all(hosts.map((h) => getZimaStats(h)));
    res.json({
      hosts: stats,
      discordBot: getBotStats(),
    });
  } catch (err: any) {
    res.status(500).json({ error: "Impossible de lire les statistiques système", details: err.message });
  }
});

// API - HOSTS (monitored ZimaOS/servers) — add up to MAX_CUSTOM_HOSTS extra systems
app.get("/api/hosts", (req, res) => {
  res.json({ hosts: getHosts().map(safeHostPublic), maxCustomHosts: MAX_CUSTOM_HOSTS });
});

app.post("/api/hosts", (req, res) => {
  try {
    const { name, ip, sshUser, sshPassword, filesRoot } = req.body;
    const host = addHost({ name, ip, sshUser, sshPassword, filesRoot });
    store.logActivity("zimaos", `Système ajouté : ${host.name}`, host.ip);
    res.json({ success: true, host: safeHostPublic(host) });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/hosts/:id", (req, res) => {
  try {
    const host = requireHost(req.params.id);
    removeHost(req.params.id);
    store.logActivity("zimaos", `Système supprimé : ${host.name}`, host.ip);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// API - ACTIVITY LOG (persistent journal of actions taken on the panel)
app.get("/api/activity", (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 2000);
  res.json({ entries: store.getRecentActivity(limit) });
});

app.post("/api/activity", (req, res) => {
  const { category, action, details } = req.body;
  if (!category || !action) return res.status(400).json({ error: "category et action requis" });
  store.logActivity(String(category), String(action), details ? String(details) : undefined);
  res.json({ success: true });
});

// API - FILES: browse, download, upload, delete, share (see server/files.ts)
app.get("/api/files/:host", async (req, res) => {
  try {
    const dirPath = typeof req.query.path === "string" ? req.query.path : "";
    const { entries, root } = await listDir(req.params.host, dirPath);
    entries.sort((a, b) => (a.isDirectory === b.isDirectory ? a.name.localeCompare(b.name) : a.isDirectory ? -1 : 1));
    res.json({ path: dirPath, root, entries });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/files/:host/download", async (req, res) => {
  try {
    const filePath = String(req.query.path || "");
    const filename = filePath.split("/").pop() || "fichier";
    await streamDownload(req.params.host, filePath, res, filename);
    store.logActivity("fichiers", `Téléchargement : ${filename}`, req.params.host);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/files/:host/upload", upload.single("file"), async (req, res) => {
  try {
    const dirPath = String(req.body.path || "");
    if (!req.file) return res.status(400).json({ error: "Aucun fichier reçu" });
    await uploadFile(req.params.host, dirPath, req.file.originalname, req.file.path);
    store.logActivity("fichiers", `Fichier envoyé : ${req.file.originalname}`, req.params.host);
    res.json({ success: true, filename: req.file.originalname });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/files/:host", async (req, res) => {
  try {
    const filePath = String(req.query.path || "");
    const isDirectory = req.query.isDirectory === "true";
    await deleteEntry(req.params.host, filePath, isDirectory);
    store.logActivity("fichiers", `Suppression : ${filePath}`, req.params.host);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/files/:host/share", async (req, res) => {
  try {
    const { path: filePath, filename } = req.body;
    if (!filePath || !filename) return res.status(400).json({ error: "path et filename requis" });
    const { token, expiresAt } = createShareLink(req.params.host, filePath, filename);
    store.logActivity("fichiers", `Lien de partage créé : ${filename}`, req.params.host);
    res.json({ success: true, token, expiresAt, url: `/api/share/${token}` });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Public (unauthenticated) share-link download — local-network "airdrop"-style transfer
app.get("/api/share/:token", async (req, res) => {
  try {
    const entry = resolveShare(req.params.token);
    if (!entry) return res.status(404).json({ error: "Lien expiré ou invalide" });
    await streamDownload(entry.hostId, entry.relPath, res, entry.filename);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// API - DISCORD LOGS
app.get("/api/discord/logs", (req, res) => {
  res.json(store.getDiscordLogs());
});

// API - ADD DISCORD COMMAND/LOG
app.post("/api/discord/logs", (req, res) => {
  const { user, command, response } = req.body;
  const newLog = {
    timestamp: new Date().toISOString(),
    user: user || "Système",
    command: command || "",
    response: response || ""
  };
  store.addDiscordLog(newLog);
  res.json(newLog);
});

// API - HOME ASSISTANT CONFIG
app.get("/api/home-assistant/config", (req, res) => {
  res.json(store.getHaConfig());
});

app.post("/api/home-assistant/config", async (req, res) => {
  const { url, token } = req.body;
  let haConfig = store.setHaConfig({ url: url || "", token: token || "" });

  if (!haConfig.url || !haConfig.token) {
    haConfig = store.setHaConfig({ isConnected: false });
    store.logActivity("settings", "Configuration Home Assistant réinitialisée");
    return res.json({ success: true, message: "Configuration réinitialisée.", config: haConfig });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  // Attempt real Home Assistant connection check
  try {
    const checkUrl = `${haConfig.url.replace(/\/$/, "")}/api/`;
    const response = await fetch(checkUrl, {
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${haConfig.token}`,
        "Content-Type": "application/json",
      },
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      haConfig = store.setHaConfig({ isConnected: true });
      store.logActivity("settings", "Connexion Home Assistant établie", haConfig.url);
      res.json({ success: true, message: "Connecté avec succès à Home Assistant !", config: haConfig });
    } else {
      haConfig = store.setHaConfig({ isConnected: false });
      let errMsg = `Home Assistant a renvoyé une erreur (Code HTTP ${response.status})`;
      if (response.status === 401) errMsg = "Token invalide ou expiré — vérifiez votre Long-Lived Access Token dans HA.";
      else if (response.status === 403) errMsg = "Accès refusé — le token ne dispose pas des permissions nécessaires.";
      else if (response.status === 404) errMsg = "URL incorrecte — aucune API Home Assistant trouvée à cette adresse.";
      res.status(400).json({ success: false, message: errMsg });
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    store.setHaConfig({ isConnected: false });
    let errMsg = `Impossible de joindre le serveur : ${err.message}`;
    if (err.name === "AbortError") {
      errMsg = "Délai dépassé (8s) — l'URL est-elle bien accessible depuis Internet ? Les IP locales (192.168.x.x) ne fonctionnent pas sur Replit.";
    } else if (err.code === "ENOTFOUND" || err.code === "EAI_AGAIN") {
      errMsg = "Nom de domaine introuvable — vérifiez l'URL (ex. DuckDNS, Nabu Casa).";
    } else if (err.code === "ECONNREFUSED") {
      errMsg = "Connexion refusée — le port est-il ouvert et HA est-il démarré ?";
    } else if (err.code === "ECONNRESET" || err.message?.includes("network")) {
      errMsg = "Connexion interrompue — utilisez une URL publique, pas une IP locale.";
    }
    res.status(500).json({ success: false, message: errMsg });
  }
});

// Helper: Sync with real Home Assistant or return fallback
async function fetchRealHADevices() {
  const haConfig = store.getHaConfig();
  if (!haConfig.isConnected || !haConfig.url) return null;

  const base = haConfig.url.replace(/\/$/, "");
  const headers = {
    Authorization: `Bearer ${haConfig.token}`,
    "Content-Type": "application/json",
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    // Fetch states + entity registry + device registry in parallel
    // Area can be set at entity level OR device level — we check both.
    const [statesRes, entityRegRes, deviceRegRes] = await Promise.all([
      fetch(`${base}/api/states`,                          { signal: controller.signal, headers }),
      fetch(`${base}/api/config/entity_registry/list`,    { signal: controller.signal, headers }),
      fetch(`${base}/api/config/device_registry/list`,    { signal: controller.signal, headers }),
    ]);
    clearTimeout(timeoutId);

    if (!statesRes.ok) {
      store.setHaConfig({ isConnected: false });
      return null;
    }

    const states = await statesRes.json();

    // Build device_id → area_id from device registry
    const deviceAreaMap: Record<string, string> = {};
    if (deviceRegRes.ok) {
      const deviceReg: any[] = await deviceRegRes.json();
      for (const entry of deviceReg) {
        if (entry.id && entry.area_id) {
          deviceAreaMap[entry.id] = entry.area_id;
        }
      }
    }

    // Build entity_id → area_id:
    //   1. Use entity's own area_id if set
    //   2. Otherwise fall back to the entity's device area_id
    const entityAreaMap: Record<string, string> = {};
    if (entityRegRes.ok) {
      const entityReg: any[] = await entityRegRes.json();
      for (const entry of entityReg) {
        if (!entry.entity_id) continue;
        const areaId = entry.area_id || (entry.device_id ? deviceAreaMap[entry.device_id] : null);
        if (areaId) {
          entityAreaMap[entry.entity_id] = areaId;
        }
      }
    }

    const ALLOWED_DOMAINS = ["light", "switch", "cover", "climate", "media_player", "camera"];

    return states
      .filter((s: any) => ALLOWED_DOMAINS.includes(s.entity_id.split(".")[0]))
      .map((s: any) => {
        const domain = s.entity_id.split(".")[0];
        const rawBri = s.attributes.brightness;

        return {
          id: s.entity_id,
          name: s.attributes.friendly_name || s.entity_id,
          type: domain,
          state: s.state,
          // area_id from entity registry takes priority; HA never puts it in state attributes
          room: entityAreaMap[s.entity_id] || "Général",
          attributes: {
            // ── Pass through ALL original HA attributes ──────────────────
            ...s.attributes,
            // ── Normalized fields the UI expects ────────────────────────
            // brightness: HA sends 0-255, UI expects 0-100
            brightness: rawBri != null ? Math.round((rawBri / 255) * 100) : (s.state === "on" ? 100 : 0),
            // power: try multiple HA attribute names
            power_w: s.attributes.power ?? s.attributes.current_power_w ?? s.attributes.watt ?? 0,
            // today's energy (kWh)
            today_energy_kwh: s.attributes.today_energy_kwh ?? s.attributes.energy_today ?? 0,
          },
        };
      });
  } catch (err) {
    clearTimeout(timeoutId);
    console.error("Failed to fetch real HA devices (auto-disabling live sync):", err);
    store.setHaConfig({ isConnected: false });
  }
  return null;
}

// API - HOME ASSISTANT DEVICES
app.get("/api/home-assistant/devices", async (req, res) => {
  const realDevices = await fetchRealHADevices();
  if (realDevices) {
    res.json(realDevices);
    return;
  }
  // Simulate minor progress in media player if playing (persisted device state)
  const devices = store.getDevices();
  const media = devices.find((d: any) => d.id === "media_player.spotify_salon");
  if (media && media.state === "playing" && media.attributes.media_position !== undefined) {
    media.attributes.media_position += 2;
    if (media.attributes.media_position >= (media.attributes.media_duration || 300)) {
      media.attributes.media_position = 0;
    }
    store.saveDevices(devices);
  }
  res.json(devices);
});

// API - CONTROL DEVICE
app.post("/api/home-assistant/command", async (req, res) => {
  const { entity_id, service, data } = req.body;

  if (!entity_id) {
    return res.status(400).json({ error: "entity_id est requis" });
  }

  const domain = entity_id.split(".")[0];
  const haConfig = store.getHaConfig();

  // Try real Home Assistant command
  if (haConfig.isConnected && haConfig.url) {
    try {
      const commandUrl = `${haConfig.url.replace(/\/$/, "")}/api/services/${domain}/${service}`;
      const payload = { entity_id, ...data };
      const response = await fetch(commandUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${haConfig.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        store.addDiscordLog({
          timestamp: new Date().toISOString(),
          user: "Dashboard Control",
          command: `/ha command ${domain}.${service} ${entity_id}`,
          response: `✅ Envoyé avec succès à Home Assistant : ${entity_id}`
        });
        store.logActivity("domotique", `Commande ${domain}.${service}`, entity_id);
        return res.json({ success: true, isReal: true });
      }
    } catch (err: any) {
      console.error("Real HA service call failed:", err);
    }
  }

  // Fallback / persisted mock mode control
  const devices = store.getDevices();
  const device = devices.find((d: any) => d.id === entity_id);
  if (!device) {
    return res.status(404).json({ error: "Appareil non trouvé" });
  }

  // Process mock state changes
  if (service === "turn_on") {
    device.state = "on";
    if (device.attributes.brightness !== undefined && device.attributes.brightness === 0) {
      device.attributes.brightness = 100;
    }
    if (device.id === "switch.prise_tv") {
      device.attributes.power_w = 120 + Math.random() * 10;
    }
    if (device.id === "switch.machine_cafe") {
      device.attributes.power_w = 1450;
    }
  } else if (service === "turn_off") {
    device.state = "off";
    if (device.attributes.power_w !== undefined) {
      device.attributes.power_w = 0;
    }
  } else if (service === "set_position" || service === "open_cover" || service === "close_cover") {
    if (service === "open_cover") {
      device.state = "open";
      device.attributes.current_position = 100;
    } else if (service === "close_cover") {
      device.state = "closed";
      device.attributes.current_position = 0;
    } else if (data && data.position !== undefined) {
      device.attributes.current_position = data.position;
      device.state = data.position > 0 ? "open" : "closed";
    }
  } else if (service === "set_temperature" && data && data.temperature !== undefined) {
    device.attributes.temperature = data.temperature;
    device.state = "heat";
  } else if (service === "volume_set" && data && data.volume_level !== undefined) {
    device.attributes.volume_level = data.volume_level;
  } else if (service === "media_play") {
    device.state = "playing";
  } else if (service === "media_pause") {
    device.state = "paused";
  } else if (service === "media_next_track") {
    if (device.id === "media_player.spotify_salon") {
      device.attributes.media_title = "Starboy";
      device.attributes.media_artist = "The Weeknd";
      device.attributes.media_position = 0;
      device.attributes.media_duration = 230;
    }
  } else if (service === "set_brightness" && data && data.brightness !== undefined) {
    device.attributes.brightness = data.brightness;
    device.state = data.brightness > 0 ? "on" : "off";
  } else if (service === "set_color_temp" && data && data.color_temp !== undefined) {
    device.attributes.color_temp = data.color_temp;
  }

  store.saveDevices(devices);
  store.addDiscordLog({
    timestamp: new Date().toISOString(),
    user: "Interface",
    command: `/ha command ${domain}.${service} ${entity_id}`,
    response: `💡 Statut de ${device.name} mis à jour : ${device.state}`
  });
  store.logActivity("domotique", `${device.name} → ${device.state}`, `${domain}.${service}`);

  res.json({ success: true, isReal: false, device });
});

// API - HOME ASSISTANT AREAS (area_id → area name, via area registry)
app.get("/api/home-assistant/areas", async (req, res) => {
  const haConfig = store.getHaConfig();
  if (!haConfig.isConnected || !haConfig.url) {
    return res.json({});
  }
  try {
    const r = await fetch(`${haConfig.url.replace(/\/$/, "")}/api/config/area_registry/list`, {
      headers: { Authorization: `Bearer ${haConfig.token}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) return res.json({});
    const areas: any[] = await r.json();
    // Build { area_id: "Salon", ... }
    const map: Record<string, string> = {};
    for (const a of areas) {
      if (a.area_id && a.name) map[a.area_id] = a.name;
    }
    return res.json(map);
  } catch {
    return res.json({});
  }
});

// API - CAMERA SNAPSHOT PROXY
app.get("/api/home-assistant/camera-proxy/:entity_id", async (req, res) => {
  const { entity_id } = req.params;
  const haConfig = store.getHaConfig();
  if (!haConfig.isConnected || !haConfig.url) {
    return res.status(503).json({ error: "HA non connecté" });
  }
  try {
    const proxyUrl = `${haConfig.url.replace(/\/$/, "")}/api/camera_proxy/${entity_id}`;
    const r = await fetch(proxyUrl, {
      headers: { Authorization: `Bearer ${haConfig.token}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return res.status(r.status).send("Camera unavailable");
    const contentType = r.headers.get("content-type") || "image/jpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "no-store");
    const buf = await r.arrayBuffer();
    return res.send(Buffer.from(buf));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── API - MÉTÉO (Open-Meteo — gratuit, sans clé) ─────────────────────────────
app.get("/api/meteo", async (req, res) => {
  const { latitude, longitude, city, timezone } = store.getMeteoConfig();
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation` +
    `&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum` +
    `&forecast_days=7&timezone=${encodeURIComponent(timezone)}&wind_speed_unit=kmh`;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!r.ok) return res.status(502).json({ error: "Open-Meteo indisponible" });
    const d = await r.json() as any;
    const now = new Date().getHours();
    const hourlyStart = d.hourly.time.findIndex((t: string) => new Date(t).getHours() === now && new Date(t).toDateString() === new Date().toDateString());
    const hSlice = hourlyStart >= 0 ? hourlyStart : 0;
    res.json({
      city,
      current: {
        temp:      d.current.temperature_2m,
        feelsLike: d.current.apparent_temperature,
        humidity:  d.current.relative_humidity_2m,
        windSpeed: d.current.wind_speed_10m,
        code:      d.current.weather_code,
        precip:    d.current.precipitation,
      },
      hourly: d.hourly.time.slice(hSlice, hSlice + 24).map((t: string, i: number) => ({
        time: t,
        temp: d.hourly.temperature_2m[hSlice + i],
        code: d.hourly.weather_code[hSlice + i],
      })),
      daily: d.daily.time.map((t: string, i: number) => ({
        date:   t,
        code:   d.daily.weather_code[i],
        max:    d.daily.temperature_2m_max[i],
        min:    d.daily.temperature_2m_min[i],
        precip: d.daily.precipitation_sum[i] ?? 0,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: `Erreur météo : ${err.message}` });
  }
});

app.get("/api/meteo/search", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) return res.json({ results: [] });
  try {
    const r = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=fr&format=json`,
      { signal: AbortSignal.timeout(6000) }
    );
    const d = await r.json() as any;
    const results = (d.results || []).map((x: any) => ({
      name:    [x.name, x.admin1, x.country].filter(Boolean).join(", "),
      country: x.country_code || "",
      lat: x.latitude,
      lng: x.longitude,
      tz:  x.timezone || "auto",
    }));
    res.json({ results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/meteo/config", (req, res) => {
  const { latitude, longitude, city, timezone } = req.body;
  const cfg = store.setMeteoConfig({ latitude, longitude, city, timezone });
  store.logActivity("settings", `Météo : ville changée → ${city}`);
  res.json({ success: true, config: cfg });
});

// ── API - NOTES ───────────────────────────────────────────────────────────────
app.get("/api/notes", (req, res) => {
  res.json({ notes: store.getNotes() });
});

app.post("/api/notes", (req, res) => {
  const { title = "", content, color = "indigo", pinned = false } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: "content requis" });
  const note = store.addNote({ title: title.trim(), content: content.trim(), color, pinned });
  store.logActivity("notes", `Note créée : ${title || "Sans titre"}`);
  res.json(note);
});

app.put("/api/notes/:id", (req, res) => {
  const { title, content, color, pinned } = req.body;
  const patch: any = {};
  if (title   !== undefined) patch.title   = String(title).trim();
  if (content !== undefined) patch.content = String(content).trim();
  if (color   !== undefined) patch.color   = String(color);
  if (pinned  !== undefined) patch.pinned  = Boolean(pinned);
  const note = store.updateNote(req.params.id, patch);
  if (!note) return res.status(404).json({ error: "Note introuvable" });
  res.json(note);
});

app.delete("/api/notes/:id", (req, res) => {
  const ok = store.deleteNote(req.params.id);
  if (!ok) return res.status(404).json({ error: "Note introuvable" });
  store.logActivity("notes", "Note supprimée");
  res.json({ success: true });
});

// ── API - RÉSEAU (ping des services et hôtes) ─────────────────────────────────
app.get("/api/reseau", async (req, res) => {
  async function checkUrl(name: string, url: string, opts: RequestInit = {}): Promise<{
    name: string; ok: boolean; latency: number; statusCode?: number; error?: string;
  }> {
    const t = Date.now();
    try {
      const r = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(5000), ...opts });
      return { name, ok: r.ok || r.status < 500, latency: Date.now() - t, statusCode: r.status };
    } catch (err: any) {
      return { name, ok: false, latency: Date.now() - t, error: err.message };
    }
  }

  const haConfig = store.getHaConfig();
  const hosts = getHosts();

  const [internet, discordApi, haCheck] = await Promise.all([
    checkUrl("Internet (Cloudflare)", "https://1.1.1.1"),
    checkUrl("Discord API", "https://discord.com/api/v10/gateway"),
    haConfig.url
      ? checkUrl("Home Assistant", `${haConfig.url.replace(/\/$/, "")}/api/`,
          haConfig.token ? { headers: { Authorization: `Bearer ${haConfig.token}` } } : {})
      : Promise.resolve({ name: "Home Assistant", ok: false, latency: 0, error: "Non configuré" }),
  ]);

  const hostsStatus = await Promise.all(hosts.map(async (h) => {
    const pub = safeHostPublic(h);
    if (h.isLocal) {
      return { ...pub, ok: true, latency: 0, method: "local", note: "Hôte du panel (local)" };
    }
    if (!isHostConfigured(h)) {
      return { ...pub, ok: null, latency: 0, method: "ssh", error: "SSH non configuré" };
    }
    const t = Date.now();
    try {
      await execRemote(h, "echo ok");
      return { ...pub, ok: true, latency: Date.now() - t, method: "ssh" };
    } catch (err: any) {
      return { ...pub, ok: false, latency: Date.now() - t, method: "ssh", error: "SSH inaccessible" };
    }
  }));

  res.json({
    services: [internet, discordApi, haCheck],
    hosts: hostsStatus,
    checkedAt: new Date().toISOString(),
  });
});

// Configure Vite integration for Full-stack
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[FULLSTACK SERVER] Running on port ${PORT}`);
  });
}

startServer();
