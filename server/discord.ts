// ──────────────────────────────────────────────────────────────────────────────
// NexusBot — bot Discord intégré au panel NEXUS
//
// Préfixe : .   (ex: .ping .status .temp .allumer salon)
//
// Commandes disponibles :
//   .aide          — liste des commandes
//   .ping          — latence WebSocket
//   .status        — statut global du panel
//   .ha            — résumé Home Assistant
//   .temp          — températures ZimaOS (interactif : choix du serveur)
//   .appareils     — liste tous les appareils par pièce
//   .appareil <n>  — détails d'un appareil
//   .allumer <n>   — allume un appareil (recherche fuzzy)
//   .eteindre <n>  — éteint un appareil
//   .luminosite <n> <0-100>  — règle la luminosité
//   .volet <n> <ouvert|ferme|0-100> — contrôle un volet
//   .ajouter       — assistant interactif pour ajouter un appareil
//   .supprimer <n> — supprime un appareil fictif
// ──────────────────────────────────────────────────────────────────────────────
import {
  Client, GatewayIntentBits, Events, ActivityType,
  Message, TextChannel, DMChannel, NewsChannel,
} from "discord.js";
import * as store from "./store";
import { getHosts } from "./hosts";
import { getZimaStats } from "./system";

// ── Globals ───────────────────────────────────────────────────────────────────
let client: Client | null = null;
let commandsHandled = 0;

export const PREFIX = ".";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface BotStats {
  name: string;
  status: string;
  ping: number;
  guilds: number;
  members: number;
  shards: number;
  commandsHandled: number;
  connected: boolean;
}

// ── Stats exposées vers l'API /api/system/stats ───────────────────────────────
export function getBotStats(): BotStats {
  const cfg = store.getDiscordConfig();
  if (!client || !client.isReady()) {
    return { name: cfg.botName || "NexusBot", status: "offline", ping: 0, guilds: 0, members: 0, shards: 1, commandsHandled, connected: false };
  }
  return {
    name: client.user!.username,
    status: cfg.status || "online",
    ping: Math.max(0, client.ws.ping),
    guilds: client.guilds.cache.size,
    members: client.guilds.cache.reduce((acc, g) => acc + (g.memberCount || 0), 0),
    shards: 1,
    commandsHandled,
    connected: true,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Normalise une chaîne pour la recherche floue (minuscules + sans accents) */
function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, "");
}

/** Recherche floue d'un appareil par nom */
function findDevice(query: string): { device: any } | { multiple: any[] } | null {
  const q = norm(query);
  const devices: any[] = store.getDevices();
  const exact = devices.find((d) => norm(d.name) === q);
  if (exact) return { device: exact };
  const contains = devices.filter((d) => norm(d.name).includes(q) || q.includes(norm(d.name)));
  if (contains.length === 1) return { device: contains[0] };
  if (contains.length > 1) return { multiple: contains };
  return null;
}

/** Formate l'état d'un appareil en emoji lisible */
function stateEmoji(device: any): string {
  const s = device.state;
  if (s === "on" || s === "open" || s === "playing") return "✅";
  if (s === "heat" || s === "cool") return "🌡️";
  if (s === "paused") return "⏸️";
  if (s === "idle") return "💤";
  return "⚪";
}

function stateLabel(device: any): string {
  const map: Record<string, string> = {
    on: "Allumé", off: "Éteint", open: "Ouvert", closed: "Fermé",
    playing: "Lecture", paused: "Pause", idle: "Inactif", heat: "Chauffe", cool: "Refroidit",
  };
  return map[device.state] ?? device.state;
}

function typeEmoji(type: string): string {
  const map: Record<string, string> = {
    light: "💡", switch: "🔌", cover: "🪟", climate: "🌡️",
    media_player: "🔊", camera: "📷",
  };
  return map[type] ?? "📦";
}

/** Formate un uptime en secondes vers "Xj Xh Xmin" */
function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return [d && `${d}j`, h && `${h}h`, `${m}min`].filter(Boolean).join(" ");
}

/** Attend une réponse de l'utilisateur dans le même canal (30s max) */
async function awaitReply(msg: Message, prompt: string, validate?: (m: Message) => boolean): Promise<Message | null> {
  const chan = msg.channel as TextChannel | DMChannel | NewsChannel;
  await chan.send(prompt);
  const filter = (m: Message) => m.author.id === msg.author.id && (!validate || validate(m));
  try {
    const collected = await chan.awaitMessages({ filter, max: 1, time: 30_000, errors: ["time"] });
    return collected.first() ?? null;
  } catch {
    await chan.send("⏱️ **Temps écoulé** — commande annulée.").catch(() => {});
    return null;
  }
}

/**
 * Exécute une commande HA sur un appareil.
 * Essaie d'abord l'API Home Assistant réelle, fallback sur le store local.
 */
async function executeHA(
  entityId: string,
  service: string,
  data: Record<string, any> = {}
): Promise<{ ok: boolean; isReal: boolean }> {
  const ha = store.getHaConfig();
  if (ha.isConnected && ha.url && ha.token) {
    const domain = entityId.split(".")[0];
    try {
      const r = await fetch(`${ha.url.replace(/\/$/, "")}/api/services/${domain}/${service}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${ha.token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ entity_id: entityId, ...data }),
        signal: AbortSignal.timeout(8000),
      });
      if (r.ok) return { ok: true, isReal: true };
    } catch { /* fallback */ }
  }

  // Fallback — mise à jour du store local
  const devices: any[] = store.getDevices();
  const device = devices.find((d) => d.id === entityId);
  if (!device) return { ok: false, isReal: false };

  switch (service) {
    case "turn_on":
      device.state = "on";
      if (device.attributes.brightness === 0) device.attributes.brightness = 100;
      if (device.id === "switch.prise_tv")     device.attributes.power_w = 120 + Math.random() * 10;
      if (device.id === "switch.machine_cafe") device.attributes.power_w = 1450;
      break;
    case "turn_off":
      device.state = "off";
      if (device.attributes.power_w !== undefined) device.attributes.power_w = 0;
      break;
    case "open_cover":
      device.state = "open";
      device.attributes.current_position = 100;
      break;
    case "close_cover":
      device.state = "closed";
      device.attributes.current_position = 0;
      break;
    case "set_position":
      device.attributes.current_position = data.position ?? 50;
      device.state = (data.position ?? 50) > 0 ? "open" : "closed";
      break;
    case "set_brightness":
      device.attributes.brightness = data.brightness ?? 100;
      device.state = (data.brightness ?? 100) > 0 ? "on" : "off";
      break;
    case "media_play":   device.state = "playing"; break;
    case "media_pause":  device.state = "paused";  break;
    default: break;
  }
  store.saveDevices(devices);
  return { ok: true, isReal: false };
}

// ── Commandes ──────────────────────────────────────────────────────────────────
type CmdFn = (msg: Message, args: string[]) => Promise<string | null>;

const COMMANDS: Record<string, CmdFn> = {

  // ── Utilitaires ────────────────────────────────────────────────────────────

  ping: async () => {
    const ms = client ? Math.max(0, client.ws.ping) : 0;
    const bar = "█".repeat(Math.round(ms / 20)).padEnd(10, "░");
    const qual = ms < 80 ? "🟢 Excellent" : ms < 150 ? "🟡 Correct" : "🔴 Élevé";
    return `🏓 **Pong !**\n\`${bar}\` **${ms}ms** — ${qual}`;
  },

  status: async () => {
    const ha = store.getHaConfig();
    const stats = getBotStats();
    const devices: any[] = store.getDevices();
    const actifs = devices.filter((d) => d.state === "on" || d.state === "open" || d.state === "playing").length;
    const uptime = process.uptime();
    return [
      `⚡ **NexusBot — Statut NEXUS Panel**`,
      ``,
      `🤖 Bot : \`${stats.name}\` | 📡 Ping : **${stats.ping}ms** | 🏠 **${stats.guilds}** serveur(s)`,
      `👥 Membres : **${stats.members}** | 🎯 Commandes traitées : **${stats.commandsHandled}**`,
      ``,
      `🏠 Home Assistant : ${ha.isConnected ? `✅ **Connecté** — ${ha.url}` : "❌ **Déconnecté**"}`,
      `💡 Appareils : **${devices.length}** au total, **${actifs}** actifs`,
      `⏱️ Uptime panel : **${formatUptime(uptime)}**`,
    ].join("\n");
  },

  ha: async () => {
    const ha = store.getHaConfig();
    if (!ha.isConnected) return "❌ **Home Assistant** n'est pas connecté au panel NEXUS.\nConfigurez l'URL et le token dans **Paramètres → Home Assistant**.";
    const devices: any[] = store.getDevices();
    const byType = devices.reduce((acc: any, d) => { acc[d.type] = (acc[d.type] || 0) + 1; return acc; }, {});
    const lines = Object.entries(byType).map(([t, n]) => `${typeEmoji(t)} ${t} : **${n}**`);
    const actifs = devices.filter((d) => d.state === "on" || d.state === "open" || d.state === "playing").length;
    return [
      `🏠 **Home Assistant** — Connexion active`,
      `🔗 \`${ha.url}\``,
      ``,
      `📦 Appareils : **${devices.length}** | ✅ Actifs : **${actifs}**`,
      lines.join(" · "),
    ].join("\n");
  },

  aide: async () => [
    `📋 **Commandes NexusBot** — Préfixe \`${PREFIX}\``,
    ``,
    `**📡 Informations**`,
    `\`${PREFIX}ping\`                    — Latence du bot`,
    `\`${PREFIX}status\`                  — Statut global du panel`,
    `\`${PREFIX}ha\`                      — Résumé Home Assistant`,
    `\`${PREFIX}temp\`                    — Températures d'un ZimaOS _(interactif)_`,
    ``,
    `**💡 Appareils**`,
    `\`${PREFIX}appareils\`               — Liste tous les appareils`,
    `\`${PREFIX}appareil <nom>\`          — Détails d'un appareil`,
    `\`${PREFIX}allumer <nom>\`           — Allume un appareil`,
    `\`${PREFIX}eteindre <nom>\`          — Éteint un appareil`,
    `\`${PREFIX}luminosite <nom> <0-100>\` — Règle la luminosité`,
    `\`${PREFIX}volet <nom> <ouvert|ferme|0-100>\` — Contrôle un volet`,
    ``,
    `**🛠️ Gestion**`,
    `\`${PREFIX}ajouter\`                 — Ajoute un appareil _(interactif)_`,
    `\`${PREFIX}supprimer <nom>\`         — Supprime un appareil fictif`,
    `\`${PREFIX}aide\`                    — Affiche cette aide`,
  ].join("\n"),

  // ── Températures ZimaOS (interactif) ───────────────────────────────────────

  temp: async (msg) => {
    const hosts = getHosts();
    if (hosts.length === 0) return "❌ Aucun système surveillé configuré.";

    const list = hosts.map((h, i) => `\`${i + 1}\` — **${h.name}** (\`${h.ip}\`)`).join("\n");
    const choice = await awaitReply(
      msg,
      `🌡️ **Températures ZimaOS** — Quel système ?\n\n${list}\n\n_Répondez avec le numéro (ex: \`1\`) — 30s_`,
      (m) => /^\d+$/.test(m.content.trim())
    );
    if (!choice) return null; // délai dépassé, message déjà envoyé

    const idx = parseInt(choice.content.trim(), 10) - 1;
    const host = hosts[idx];
    if (!host) return `❌ Numéro invalide. Choisissez entre 1 et ${hosts.length}.`;

    const chan = msg.channel as TextChannel;
    await chan.send(`🔄 Lecture des températures de **${host.name}**...`);

    const stats = await getZimaStats(host);
    if (!stats.reachable) {
      return `❌ **${host.name}** inaccessible${stats.reason ? ` : ${stats.reason}` : ""}.`;
    }

    const cpuTemp = stats.cpu.temperature != null ? `**${stats.cpu.temperature.toFixed(1)}°C**` : "_Non disponible_";
    const cpuUsage = stats.cpu.usage != null ? `${stats.cpu.usage.toFixed(1)}%` : "N/A";
    const diskTemp = stats.disk.temperature.available
      ? `**${stats.disk.temperature.data}°C**`
      : `_${stats.disk.temperature.reason ?? "Non disponible"}_`;
    const diskHealth = stats.disk.health.available ? stats.disk.health.data : "_N/A_";
    const ram = stats.ram.usedGb != null
      ? `${stats.ram.usedGb.toFixed(1)} / ${stats.ram.totalGb?.toFixed(1)} Go (${stats.ram.usagePct?.toFixed(0)}%)`
      : "Non disponible";
    const uptime = stats.uptimeSeconds != null ? formatUptime(stats.uptimeSeconds) : "N/A";
    const gpuInfo = stats.gpu.available && stats.gpu.data
      ? `${stats.gpu.data.freqMhz}MHz / ${stats.gpu.data.maxFreqMhz}MHz (${stats.gpu.data.usagePct.toFixed(0)}%)`
      : "Non disponible";

    return [
      `🌡️ **Températures — ${host.name}** (\`${host.ip}\`)`,
      ``,
      `🖥️ CPU : ${cpuTemp} · Usage : **${cpuUsage}**`,
      `💾 Disque : ${diskTemp} · Santé : ${diskHealth}`,
      `🧠 RAM : **${ram}**`,
      `🎮 GPU : **${gpuInfo}**`,
      `⏱️ Uptime : **${uptime}**`,
      `🐧 OS : \`${stats.os}\``,
    ].join("\n");
  },

  // ── Liste des appareils ────────────────────────────────────────────────────

  appareils: async () => {
    const devices: any[] = store.getDevices();
    if (devices.length === 0) return "📭 Aucun appareil enregistré.";

    const byRoom = devices.reduce((acc: Record<string, any[]>, d) => {
      const r = d.room || "Sans pièce";
      (acc[r] = acc[r] || []).push(d);
      return acc;
    }, {});

    const lines: string[] = [`💡 **Appareils** — ${devices.length} au total`, ``];
    for (const [room, devs] of Object.entries(byRoom)) {
      lines.push(`**📍 ${room}**`);
      for (const d of devs) {
        lines.push(`  ${stateEmoji(d)} ${typeEmoji(d.type)} **${d.name}** — ${stateLabel(d)}`);
      }
      lines.push(``);
    }
    return lines.join("\n").trimEnd();
  },

  appareil: async (msg, args) => {
    const query = args.join(" ");
    if (!query) return `❌ Usage : \`${PREFIX}appareil <nom>\``;
    const result = findDevice(query);
    if (!result) return `❌ Appareil introuvable : **${query}**. Utilisez \`${PREFIX}appareils\` pour voir la liste.`;
    if ("multiple" in result) {
      const names = result.multiple.map((d: any) => `• ${d.name}`).join("\n");
      return `⚠️ Plusieurs appareils correspondent à **${query}** :\n${names}\n\nSoyez plus précis.`;
    }
    const d = result.device;
    const extras: string[] = [];
    if (d.attributes.brightness !== undefined) extras.push(`💡 Luminosité : **${d.attributes.brightness}%**`);
    if (d.attributes.current_position !== undefined) extras.push(`🪟 Position : **${d.attributes.current_position}%**`);
    if (d.attributes.temperature !== undefined) extras.push(`🌡️ Consigne : **${d.attributes.temperature}°C**`);
    if (d.attributes.current_temperature !== undefined) extras.push(`🌡️ Actuelle : **${d.attributes.current_temperature}°C**`);
    if (d.attributes.power_w !== undefined) extras.push(`⚡ Puissance : **${Math.round(d.attributes.power_w)}W**`);
    if (d.attributes.volume_level !== undefined) extras.push(`🔊 Volume : **${Math.round(d.attributes.volume_level * 100)}%**`);
    if (d.attributes.media_title) extras.push(`🎵 **${d.attributes.media_title}** — ${d.attributes.media_artist ?? ""}`);
    return [
      `${typeEmoji(d.type)} **${d.name}**`,
      `📍 Pièce : **${d.room}**`,
      `📌 ID : \`${d.id}\``,
      `🔘 État : ${stateEmoji(d)} **${stateLabel(d)}**`,
      ...(extras.length ? [``, ...extras] : []),
    ].join("\n");
  },

  // ── Contrôle des appareils ─────────────────────────────────────────────────

  allumer: async (msg, args) => {
    const query = args.join(" ");
    if (!query) return `❌ Usage : \`${PREFIX}allumer <nom de l'appareil>\``;
    const result = findDevice(query);
    if (!result) return `❌ Appareil introuvable : **${query}**.`;
    if ("multiple" in result) {
      return `⚠️ Plusieurs appareils correspondent :\n${result.multiple.map((d: any) => `• **${d.name}**`).join("\n")}\n\nSoyez plus précis.`;
    }
    const d = result.device;
    if (d.state === "on" || d.state === "open" || d.state === "playing") {
      return `ℹ️ **${d.name}** est déjà actif (${stateLabel(d)}).`;
    }
    const service = d.type === "cover" ? "open_cover" : "turn_on";
    const { ok, isReal } = await executeHA(d.id, service);
    if (!ok) return `❌ Impossible de contrôler **${d.name}**.`;
    store.addDiscordLog({ timestamp: new Date().toISOString(), user: msg.author.username, command: `${PREFIX}allumer ${query}`, response: `✅ ${d.name} allumé/ouvert (${isReal ? "HA réel" : "mode local"})` });
    store.logActivity("discord", `NexusBot : allumer ${d.name}`, msg.author.username);
    return `✅ **${d.name}** allumé/ouvert — ${isReal ? "commande envoyée à Home Assistant" : "état local mis à jour"}.`;
  },

  eteindre: async (msg, args) => {
    const query = args.join(" ");
    if (!query) return `❌ Usage : \`${PREFIX}eteindre <nom de l'appareil>\``;
    const result = findDevice(query);
    if (!result) return `❌ Appareil introuvable : **${query}**.`;
    if ("multiple" in result) {
      return `⚠️ Plusieurs appareils correspondent :\n${result.multiple.map((d: any) => `• **${d.name}**`).join("\n")}\n\nSoyez plus précis.`;
    }
    const d = result.device;
    if (d.state === "off" || d.state === "closed") {
      return `ℹ️ **${d.name}** est déjà inactif (${stateLabel(d)}).`;
    }
    const service = d.type === "cover" ? "close_cover" : "turn_off";
    const { ok, isReal } = await executeHA(d.id, service);
    if (!ok) return `❌ Impossible de contrôler **${d.name}**.`;
    store.addDiscordLog({ timestamp: new Date().toISOString(), user: msg.author.username, command: `${PREFIX}eteindre ${query}`, response: `⚪ ${d.name} éteint/fermé (${isReal ? "HA réel" : "mode local"})` });
    store.logActivity("discord", `NexusBot : éteindre ${d.name}`, msg.author.username);
    return `⚪ **${d.name}** éteint/fermé — ${isReal ? "commande envoyée à Home Assistant" : "état local mis à jour"}.`;
  },

  luminosite: async (msg, args) => {
    const val = parseInt(args[args.length - 1], 10);
    if (isNaN(val) || val < 0 || val > 100) return `❌ Usage : \`${PREFIX}luminosite <nom> <0-100>\`\nEx : \`${PREFIX}luminosite salon led 75\``;
    const query = args.slice(0, -1).join(" ");
    if (!query) return `❌ Précisez le nom de l'appareil.`;
    const result = findDevice(query);
    if (!result) return `❌ Appareil introuvable : **${query}**.`;
    if ("multiple" in result) return `⚠️ Plusieurs appareils correspondent. Soyez plus précis.`;
    const d = result.device;
    if (d.type !== "light") return `❌ **${d.name}** n'est pas un appareil lumineux (type : \`${d.type}\`).`;
    const { ok, isReal } = await executeHA(d.id, "set_brightness", { brightness: val });
    if (!ok) return `❌ Impossible de contrôler **${d.name}**.`;
    store.addDiscordLog({ timestamp: new Date().toISOString(), user: msg.author.username, command: `${PREFIX}luminosite ${query} ${val}`, response: `💡 ${d.name} → ${val}%` });
    store.logActivity("discord", `NexusBot : luminosité ${d.name} → ${val}%`, msg.author.username);
    return `💡 **${d.name}** — luminosité réglée à **${val}%** ${isReal ? "(Home Assistant)" : "(mode local)"}.`;
  },

  volet: async (msg, args) => {
    const last = args[args.length - 1]?.toLowerCase();
    if (!last) return `❌ Usage : \`${PREFIX}volet <nom> <ouvert|ferme|0-100>\``;

    let service: string;
    let data: Record<string, any> = {};
    const pct = parseInt(last, 10);

    if (last === "ouvert" || last === "ouvrir") { service = "open_cover"; }
    else if (last === "ferme" || last === "fermer" || last === "fermé") { service = "close_cover"; }
    else if (!isNaN(pct) && pct >= 0 && pct <= 100) { service = "set_position"; data = { position: pct }; }
    else return `❌ Valeur invalide : \`${last}\`. Utilisez \`ouvert\`, \`ferme\` ou un pourcentage (0-100).`;

    const query = args.slice(0, -1).join(" ");
    if (!query) return `❌ Précisez le nom du volet.`;
    const result = findDevice(query);
    if (!result) return `❌ Volet introuvable : **${query}**.`;
    if ("multiple" in result) return `⚠️ Plusieurs appareils correspondent. Soyez plus précis.`;
    const d = result.device;
    if (d.type !== "cover") return `❌ **${d.name}** n'est pas un volet (type : \`${d.type}\`).`;

    const { ok, isReal } = await executeHA(d.id, service, data);
    if (!ok) return `❌ Impossible de contrôler **${d.name}**.`;
    const label = service === "open_cover" ? "ouvert" : service === "close_cover" ? "fermé" : `position ${pct}%`;
    store.addDiscordLog({ timestamp: new Date().toISOString(), user: msg.author.username, command: `${PREFIX}volet ${query} ${last}`, response: `🪟 ${d.name} → ${label}` });
    store.logActivity("discord", `NexusBot : volet ${d.name} → ${label}`, msg.author.username);
    return `🪟 **${d.name}** — ${label} ${isReal ? "(Home Assistant)" : "(mode local)"}.`;
  },

  // ── Ajout interactif d'un appareil ────────────────────────────────────────

  ajouter: async (msg) => {
    const TYPES = ["light", "switch", "cover", "climate", "media_player"];
    const typeList = TYPES.map((t, i) => `\`${i + 1}\` ${typeEmoji(t)} \`${t}\``).join("\n");

    // 1. Nom
    const nomMsg = await awaitReply(msg,
      `🛠️ **Ajout d'un appareil** _(étape 1/3)_\n\nQuel est le **nom** de l'appareil ?\n_Ex : Lampe Bureau, Prise Imprimante..._`
    );
    if (!nomMsg) return null;
    const nom = nomMsg.content.trim();
    if (!nom || nom.length > 50) return "❌ Nom invalide (1–50 caractères).";

    // 2. Type
    const typeMsg = await awaitReply(msg,
      `🛠️ **Ajout d'un appareil** _(étape 2/3)_\n\nQuel est le **type** de **${nom}** ?\n\n${typeList}\n\n_Répondez avec le numéro._`,
      (m) => /^[1-5]$/.test(m.content.trim())
    );
    if (!typeMsg) return null;
    const type = TYPES[parseInt(typeMsg.content.trim()) - 1];

    // 3. Pièce
    const pieceMsg = await awaitReply(msg,
      `🛠️ **Ajout d'un appareil** _(étape 3/3)_\n\nDans quelle **pièce** se trouve **${nom}** ?\n_Ex : Salon, Cuisine, Chambre Mathieu..._`
    );
    if (!pieceMsg) return null;
    const room = pieceMsg.content.trim();
    if (!room || room.length > 40) return "❌ Nom de pièce invalide (1–40 caractères).";

    // Génère un ID unique et ajoute
    const safeName = norm(nom).replace(/\s+/g, "_");
    const id = `${type}.${safeName}_${Date.now().toString(36)}`;
    const baseAttrs: Record<string, any> = {};
    if (type === "light") { baseAttrs.brightness = 0; baseAttrs.color_temp = "warm"; baseAttrs.power_w = 0; }
    if (type === "switch") { baseAttrs.power_w = 0; baseAttrs.today_energy_kwh = 0; }
    if (type === "cover") { baseAttrs.current_position = 0; }
    if (type === "climate") { baseAttrs.current_temperature = 19.0; baseAttrs.temperature = 20.0; }
    if (type === "media_player") { baseAttrs.volume_level = 0.5; }

    const newDevice = { id, name: nom, type, state: "off", room, attributes: baseAttrs };
    const devices: any[] = store.getDevices();
    devices.push(newDevice);
    store.saveDevices(devices);

    store.addDiscordLog({ timestamp: new Date().toISOString(), user: msg.author.username, command: `${PREFIX}ajouter`, response: `✅ Appareil ajouté : ${nom} (${type}) dans ${room}` });
    store.logActivity("discord", `NexusBot : appareil ajouté ${nom}`, `${type} — ${room}`);

    return [
      `✅ **${nom}** ajouté avec succès !`,
      ``,
      `${typeEmoji(type)} Type : \`${type}\` | 📍 Pièce : **${room}**`,
      `🆔 ID : \`${id}\``,
      ``,
      `_Visible dans le panel → page Domotique._`,
    ].join("\n");
  },

  // ── Suppression d'un appareil ──────────────────────────────────────────────

  supprimer: async (msg, args) => {
    const query = args.join(" ");
    if (!query) return `❌ Usage : \`${PREFIX}supprimer <nom de l'appareil>\``;
    const result = findDevice(query);
    if (!result) return `❌ Appareil introuvable : **${query}**.`;
    if ("multiple" in result) {
      return `⚠️ Plusieurs appareils correspondent :\n${result.multiple.map((d: any) => `• **${d.name}**`).join("\n")}\n\nSoyez plus précis.`;
    }
    const d = result.device;

    // Confirmation
    const confirm = await awaitReply(msg,
      `⚠️ **Confirmation** — Supprimer **${d.name}** (\`${d.id}\`) ?\n\nRépondez \`oui\` pour confirmer ou \`non\` pour annuler.`,
      (m) => /^(oui|non)$/i.test(m.content.trim())
    );
    if (!confirm) return null;
    if (confirm.content.trim().toLowerCase() !== "oui") return "✖️ Suppression annulée.";

    const devices: any[] = store.getDevices().filter((x: any) => x.id !== d.id);
    store.saveDevices(devices);
    store.addDiscordLog({ timestamp: new Date().toISOString(), user: msg.author.username, command: `${PREFIX}supprimer ${query}`, response: `🗑️ Appareil supprimé : ${d.name}` });
    store.logActivity("discord", `NexusBot : appareil supprimé ${d.name}`, msg.author.username);
    return `🗑️ **${d.name}** supprimé du panel.`;
  },
};

// ── Démarrage du bot ──────────────────────────────────────────────────────────
export async function startDiscordBot(): Promise<void> {
  const token = process.env.DISCORD_BOT_TOKEN || store.getDiscordConfig().token;
  if (!token) {
    console.log("[NexusBot] Aucun token trouvé — bot non démarré. Définissez DISCORD_BOT_TOKEN pour l'activer.");
    return;
  }

  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers,
    ],
  });

  client.once(Events.ClientReady, (c) => {
    console.log(`[NexusBot] ✅ Connecté en tant que ${c.user.tag} — ${c.guilds.cache.size} serveur(s)`);
    c.user.setActivity("NEXUS Panel · .aide", { type: ActivityType.Watching });
    store.setDiscordConfig({ botName: c.user.username, status: "online" });
    store.addDiscordLog({
      timestamp: new Date().toISOString(),
      user: "NexusBot",
      command: "Connexion",
      response: `✅ ${c.user.tag} connecté — ${c.guilds.cache.size} serveur(s) | Préfixe : \`${PREFIX}\` | Tapez \`${PREFIX}aide\` pour la liste des commandes`,
    });
    store.logActivity("discord", "NexusBot démarré", c.user.tag);
  });

  client.on(Events.MessageCreate, async (msg: Message) => {
    if (msg.author.bot) return;
    if (!msg.content.startsWith(PREFIX)) return;

    const raw = msg.content.slice(PREFIX.length).trim();
    const parts = raw.split(/\s+/);
    const cmdName = parts[0]?.toLowerCase();
    const args = parts.slice(1);

    const handler = COMMANDS[cmdName];
    if (!handler) {
      // Suggère la commande la plus proche
      const closest = Object.keys(COMMANDS).find((k) => k.startsWith(cmdName[0]));
      const hint = closest ? ` Vouliez-vous dire \`${PREFIX}${closest}\` ?` : ` Tapez \`${PREFIX}aide\` pour la liste.`;
      await msg.reply(`❓ Commande \`${PREFIX}${cmdName}\` inconnue.${hint}`).catch(() => {});
      return;
    }

    commandsHandled++;
    try {
      const response = await handler(msg, args);
      if (response) {
        await msg.reply(response);
        // Enregistre dans le terminal uniquement si pas déjà enregistré par la commande
        if (!["allumer", "eteindre", "luminosite", "volet", "ajouter", "supprimer"].includes(cmdName)) {
          store.addDiscordLog({
            timestamp: new Date().toISOString(),
            user: msg.author.username,
            command: `${PREFIX}${cmdName}${args.length ? " " + args.join(" ") : ""}`,
            response: response.replace(/\*\*/g, "").replace(/`/g, "").slice(0, 120),
          });
        }
      }
    } catch (err: any) {
      const errMsg = `❌ Erreur interne : ${err.message}`;
      await msg.reply(errMsg).catch(() => {});
      console.error(`[NexusBot] Erreur commande .${cmdName} :`, err);
    }
  });

  client.on(Events.GuildCreate, (guild) => {
    console.log(`[NexusBot] Rejoint : ${guild.name}`);
    store.addDiscordLog({
      timestamp: new Date().toISOString(),
      user: "NexusBot",
      command: "Nouveau serveur",
      response: `🎉 NexusBot a rejoint **${guild.name}** (${guild.memberCount} membres)`,
    });
  });

  client.on(Events.GuildDelete, (guild) => {
    console.log(`[NexusBot] Retiré de : ${guild.name}`);
    store.addDiscordLog({
      timestamp: new Date().toISOString(),
      user: "NexusBot",
      command: "Serveur quitté",
      response: `👋 NexusBot a quitté **${guild.name}**`,
    });
  });

  client.on(Events.Error, (err) => {
    console.error("[NexusBot] Erreur WebSocket :", err.message);
  });

  try {
    await client.login(token);
  } catch (err: any) {
    console.error("[NexusBot] ❌ Échec de connexion :", err.message);
    store.addDiscordLog({
      timestamp: new Date().toISOString(),
      user: "NexusBot",
      command: "Connexion",
      response: `❌ Échec de connexion : ${err.message}`,
    });
    client = null;
  }
}

export async function stopDiscordBot(): Promise<void> {
  if (client) {
    await client.destroy();
    client = null;
    console.log("[NexusBot] Arrêté.");
  }
}
