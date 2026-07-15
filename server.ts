import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import multer from "multer";
import { getZimaStats } from "./server/system";
import { HostKey } from "./server/hosts";
import {
  listDir, streamDownload, uploadFile, deleteEntry,
  createShareLink, resolveShare, filesConfig,
} from "./server/files";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 5000;
const upload = multer({ dest: "/tmp/nexus-uploads" });

app.use(express.json());

function parseHostKey(value: any): HostKey {
  if (value === "local" || value === "remote") return value;
  throw new Error("Hôte invalide (attendu: local | remote)");
}

// In-Memory Configurations (Persisted during server runtime)
let haConfig = {
  url: "http://192.168.1.25:8123",
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiIzODQ5...",
  isConnected: false,
};

let discordConfig = {
  token: "",
  botName: "Domobot",
  prefix: "/",
  status: "online",
};

// In-Memory State for Mock Home Assistant Devices
let mockDevices = [
  {
    id: "light.salon_led",
    name: "LED Salon",
    type: "light",
    state: "on",
    room: "Salon",
    attributes: { brightness: 75, color_temp: "warm", power_w: 12 }
  },
  {
    id: "light.cuisine_principal",
    name: "Cuisine Plafonnier",
    type: "light",
    state: "off",
    room: "Cuisine",
    attributes: { brightness: 0, color_temp: "daylight", power_w: 0 }
  },
  {
    id: "cover.salon_volet",
    name: "Volet Roulant Salon",
    type: "cover",
    state: "open",
    room: "Salon",
    attributes: { current_position: 100 }
  },
  {
    id: "cover.chambre_store",
    name: "Store Chambre",
    type: "cover",
    state: "closed",
    room: "Chambre",
    attributes: { current_position: 0 }
  },
  {
    id: "climate.thermostat_salon",
    name: "Thermostat Principal",
    type: "climate",
    state: "heat",
    room: "Salon",
    attributes: { current_temperature: 19.5, temperature: 21.0, hvac_mode: "heat" }
  },
  {
    id: "switch.prise_tv",
    name: "Prise TV & Consoles",
    type: "switch",
    state: "on",
    room: "Salon",
    attributes: { power_w: 125.4, today_energy_kwh: 1.2 }
  },
  {
    id: "switch.machine_cafe",
    name: "Cafetière",
    type: "switch",
    state: "off",
    room: "Cuisine",
    attributes: { power_w: 0, today_energy_kwh: 0.4 }
  },
  {
    id: "media_player.spotify_salon",
    name: "Enceinte Salon (Spotify)",
    type: "media_player",
    state: "playing",
    room: "Salon",
    attributes: { 
      volume_level: 0.4, 
      media_title: "Bohemian Rhapsody", 
      media_artist: "Queen",
      media_duration: 354,
      media_position: 120
    }
  },
  {
    id: "camera.entree_secure",
    name: "Caméra Allée & Entrée",
    type: "camera",
    state: "idle",
    room: "Extérieur",
    attributes: { motion_detected: false, fps: 15 }
  }
];

// In-Memory logs of Bot actions
let mockDiscordLogs = [
  { timestamp: new Date(Date.now() - 3600000).toISOString(), user: "Mathieu", command: "/ha status", response: "✅ Home Assistant: Connecté | 9 appareils détectés." },
  { timestamp: new Date(Date.now() - 1800000).toISOString(), user: "Système", command: "Event: Volet Roulant Salon", response: "Position modifiée à 100% (Ouvert)" },
  { timestamp: new Date(Date.now() - 600000).toISOString(), user: "Mathieu", command: "/light salon_led on brightness=75", response: "💡 LED Salon allumé à 75%" },
  { timestamp: new Date(Date.now() - 300000).toISOString(), user: "ZimaOS_Zera", command: "HDD Health Check", response: "Hard Drive Check: Perfect (41°C) - 0 bad sectors" }
];

// API - SYSTEM STATS (real readings from both ZimaOS boxes — see server/system.ts)
app.get("/api/system/stats", async (req, res) => {
  try {
    const [local, remote] = await Promise.all([
      getZimaStats("local", filesConfig.local.root),
      getZimaStats("remote", filesConfig.remote.root),
    ]);
    res.json({
      zima1: local,
      zima2: remote,
      discordBot: {
        name: discordConfig.botName,
        status: discordConfig.status,
        ping: Math.floor(18 + Math.random() * 5),
        guilds: 3,
        members: 142,
        shards: 1,
        commandsHandled: 489
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: "Impossible de lire les statistiques système", details: err.message });
  }
});

// API - FILES: browse, download, upload, delete, share (see server/files.ts)
app.get("/api/files/:host", async (req, res) => {
  try {
    const hostKey = parseHostKey(req.params.host);
    const dirPath = typeof req.query.path === "string" ? req.query.path : "";
    const entries = await listDir(hostKey, dirPath);
    entries.sort((a, b) => (a.isDirectory === b.isDirectory ? a.name.localeCompare(b.name) : a.isDirectory ? -1 : 1));
    res.json({ path: dirPath, root: filesConfig[hostKey].root, entries });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/files/:host/download", async (req, res) => {
  try {
    const hostKey = parseHostKey(req.params.host);
    const filePath = String(req.query.path || "");
    const filename = filePath.split("/").pop() || "fichier";
    await streamDownload(hostKey, filePath, res, filename);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/files/:host/upload", upload.single("file"), async (req, res) => {
  try {
    const hostKey = parseHostKey(req.params.host);
    const dirPath = String(req.body.path || "");
    if (!req.file) return res.status(400).json({ error: "Aucun fichier reçu" });
    await uploadFile(hostKey, dirPath, req.file.originalname, req.file.path);
    res.json({ success: true, filename: req.file.originalname });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/files/:host", async (req, res) => {
  try {
    const hostKey = parseHostKey(req.params.host);
    const filePath = String(req.query.path || "");
    const isDirectory = req.query.isDirectory === "true";
    await deleteEntry(hostKey, filePath, isDirectory);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/files/:host/share", async (req, res) => {
  try {
    const hostKey = parseHostKey(req.params.host);
    const { path: filePath, filename } = req.body;
    if (!filePath || !filename) return res.status(400).json({ error: "path et filename requis" });
    const { token, expiresAt } = createShareLink(hostKey, filePath, filename);
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
    await streamDownload(entry.hostKey, entry.relPath, res, entry.filename);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// API - DISCORD LOGS
app.get("/api/discord/logs", (req, res) => {
  res.json(mockDiscordLogs);
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
  mockDiscordLogs.unshift(newLog);
  if (mockDiscordLogs.length > 50) {
    mockDiscordLogs.pop();
  }
  res.json(newLog);
});

// API - HOME ASSISTANT CONFIG
app.get("/api/home-assistant/config", (req, res) => {
  res.json(haConfig);
});

app.post("/api/home-assistant/config", async (req, res) => {
  const { url, token } = req.body;
  haConfig.url = url || "";
  haConfig.token = token || "";
  
  if (!haConfig.url || !haConfig.token) {
    haConfig.isConnected = false;
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
      haConfig.isConnected = true;
      res.json({ success: true, message: "Connecté avec succès à Home Assistant !", config: haConfig });
    } else {
      haConfig.isConnected = false;
      res.status(400).json({ success: false, message: `Home Assistant a renvoyé une erreur (Code: ${response.status})` });
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    haConfig.isConnected = false;
    res.status(500).json({ success: false, message: `Impossible de joindre le serveur Home Assistant : ${err.message}` });
  }
});

// Helper: Sync with real Home Assistant or return fallback
async function fetchRealHADevices() {
  if (!haConfig.isConnected || !haConfig.url) return null;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const statesUrl = `${haConfig.url.replace(/\/$/, "")}/api/states`;
    const response = await fetch(statesUrl, {
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${haConfig.token}`,
        "Content-Type": "application/json",
      }
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const states = await response.json();
      // Map relevant domains (light, switch, cover, climate, media_player, camera)
      return states.filter((s: any) => {
        const domain = s.entity_id.split(".")[0];
        return ["light", "switch", "cover", "climate", "media_player", "camera"].includes(domain);
      }).map((s: any) => ({
        id: s.entity_id,
        name: s.attributes.friendly_name || s.entity_id,
        type: s.entity_id.split(".")[0],
        state: s.state,
        room: s.attributes.area_id || "Général",
        attributes: {
          brightness: s.attributes.brightness ? Math.round((s.attributes.brightness / 255) * 100) : 0,
          color_temp: s.attributes.color_temp ? "warm" : "daylight",
          power_w: s.attributes.power || s.attributes.current_power_w || 0,
          current_temperature: s.attributes.current_temperature || 20,
          temperature: s.attributes.temperature || 21,
          volume_level: s.attributes.volume_level || 0.5,
          media_title: s.attributes.media_title || "",
          media_artist: s.attributes.media_artist || "",
        }
      }));
    } else {
      haConfig.isConnected = false;
    }
  } catch (err) {
    clearTimeout(timeoutId);
    console.error("Failed to fetch real HA devices (auto-disabling live sync):", err);
    haConfig.isConnected = false;
  }
  return null;
}

// API - HOME ASSISTANT DEVICES
app.get("/api/home-assistant/devices", async (req, res) => {
  const realDevices = await fetchRealHADevices();
  if (realDevices) {
    // Merge real devices into mock list or return real
    res.json(realDevices);
  } else {
    // Simulate minor progress in media player if playing
    const media = mockDevices.find(d => d.id === "media_player.spotify_salon");
    if (media && media.state === "playing" && media.attributes.media_position !== undefined) {
      media.attributes.media_position += 2;
      if (media.attributes.media_position >= (media.attributes.media_duration || 300)) {
        media.attributes.media_position = 0;
      }
    }
    // Return mock
    res.json(mockDevices);
  }
});

// API - CONTROL DEVICE
app.post("/api/home-assistant/command", async (req, res) => {
  const { entity_id, service, data } = req.body;
  
  if (!entity_id) {
    return res.status(400).json({ error: "entity_id est requis" });
  }

  const domain = entity_id.split(".")[0];

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
        // Log action
        const actionText = `Command ${domain}.${service} sent to real HA for ${entity_id}`;
        mockDiscordLogs.unshift({
          timestamp: new Date().toISOString(),
          user: "Dashboard Control",
          command: `/ha command ${domain}.${service} ${entity_id}`,
          response: `✅ Envoyé avec succès à Home Assistant : ${entity_id}`
        });
        return res.json({ success: true, isReal: true });
      }
    } catch (err: any) {
      console.error("Real HA service call failed:", err);
    }
  }

  // Fallback / Mock mode control
  const device = mockDevices.find(d => d.id === entity_id);
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

  // Append command to logs
  mockDiscordLogs.unshift({
    timestamp: new Date().toISOString(),
    user: "Interface",
    command: `/ha command ${domain}.${service} ${entity_id}`,
    response: `💡 Statut de ${device.name} mis à jour : ${device.state}`
  });

  if (mockDiscordLogs.length > 50) {
    mockDiscordLogs.pop();
  }

  res.json({ success: true, isReal: false, device });
});

// API - HOME ASSISTANT AREAS (resolves area_id → name via template API)
app.get("/api/home-assistant/areas", async (req, res) => {
  if (!haConfig.isConnected || !haConfig.url) {
    return res.json({ Salon: "Salon", Cuisine: "Cuisine", Chambre: "Chambre", Extérieur: "Extérieur" });
  }
  try {
    const tplUrl = `${haConfig.url.replace(/\/$/, "")}/api/template`;
    const tpl = `{% set ns = namespace(r=[]) %}{% for aid in areas() %}{% set ns.r = ns.r + [aid ~ '|' ~ area_name(aid)] %}{% endfor %}{{ ns.r | join(',') }}`;
    const r = await fetch(tplUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${haConfig.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ template: tpl }),
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) return res.json({});
    const text = await r.text();
    const map: Record<string, string> = {};
    text.split(",").forEach(pair => {
      const [id, name] = pair.trim().split("|");
      if (id && name) map[id.trim()] = name.trim();
    });
    return res.json(map);
  } catch {
    return res.json({});
  }
});

// API - CAMERA SNAPSHOT PROXY
app.get("/api/home-assistant/camera-proxy/:entity_id", async (req, res) => {
  const { entity_id } = req.params;
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
