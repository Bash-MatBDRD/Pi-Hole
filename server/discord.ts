// ──────────────────────────────────────────────────────────────────────────────
// NexusBot — bot Discord intégré au panel NEXUS
//
// Démarre automatiquement si DISCORD_BOT_TOKEN est défini (variable d'env /
// secret Replit). Sans token, le module se charge sans erreur et le panel
// continue à fonctionner normalement (stats bot = offline).
// ──────────────────────────────────────────────────────────────────────────────
import { Client, GatewayIntentBits, Events, Message, ActivityType } from "discord.js";
import * as store from "./store";

let client: Client | null = null;
let commandsHandled = 0;

// ── Stats exposées vers l'API ─────────────────────────────────────────────────
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

export function getBotStats(): BotStats {
  const cfg = store.getDiscordConfig();
  if (!client || !client.isReady()) {
    return {
      name: cfg.botName || "NexusBot",
      status: "offline",
      ping: 0,
      guilds: 0,
      members: 0,
      shards: 1,
      commandsHandled,
      connected: false,
    };
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

// ── Commandes bot (préfixe !) ──────────────────────────────────────────────────
const PREFIX = "!";

type CommandHandler = (msg: Message, args: string[]) => Promise<string>;

const COMMANDS: Record<string, CommandHandler> = {
  ping: async () => {
    const latency = client ? Math.max(0, client.ws.ping) : 0;
    return `🏓 Pong ! Latence WebSocket : **${latency}ms**`;
  },

  status: async () => {
    const ha = store.getHaConfig();
    const stats = getBotStats();
    return [
      `⚡ **NexusBot** — Tableau de bord NEXUS Panel`,
      ``,
      `🤖 Bot : \`${stats.name}\` — ${stats.guilds} serveur(s), ${stats.members} membre(s)`,
      `📡 Latence : **${stats.ping}ms** | Commandes traitées : **${stats.commandsHandled}**`,
      `🏠 Home Assistant : ${ha.isConnected ? `✅ Connecté (${ha.url})` : "❌ Déconnecté"}`,
    ].join("\n");
  },

  ha: async (msg, args) => {
    const ha = store.getHaConfig();
    if (!ha.isConnected) return "❌ Home Assistant n'est pas connecté au panel NEXUS.";
    const devices = store.getDevices();
    const on = devices.filter((d: any) =>
      d.state === "on" || d.state === "open" || d.state === "playing"
    ).length;
    const off = devices.length - on;
    return [
      `🏠 **Home Assistant** — ${devices.length} appareils`,
      `• ✅ Actifs : **${on}**`,
      `• ⚪ Inactifs : **${off}**`,
      `• 🔗 URL : \`${ha.url}\``,
    ].join("\n");
  },

  appareils: async () => {
    const devices = store.getDevices();
    const actifs = devices.filter((d: any) =>
      d.state === "on" || d.state === "open" || d.state === "playing"
    );
    if (actifs.length === 0) return "⚪ Aucun appareil actif en ce moment.";
    const lines = actifs.slice(0, 10).map((d: any) => `• **${d.name}** — \`${d.state}\` (${d.room})`);
    if (actifs.length > 10) lines.push(`_…et ${actifs.length - 10} autres_`);
    return `💡 **Appareils actifs (${actifs.length})** :\n` + lines.join("\n");
  },

  aide: async () => {
    return [
      `📋 **Commandes NexusBot** (préfixe \`${PREFIX}\`)`,
      ``,
      `\`${PREFIX}ping\`       — Vérifie la latence du bot`,
      `\`${PREFIX}status\`     — Statut global du panel NEXUS`,
      `\`${PREFIX}ha\`         — Résumé Home Assistant`,
      `\`${PREFIX}appareils\`  — Liste les appareils actifs`,
      `\`${PREFIX}aide\`       — Affiche cette aide`,
    ].join("\n");
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

  // ── Prêt ──────────────────────────────────────────────────────────────────
  client.once(Events.ClientReady, (c) => {
    console.log(`[NexusBot] ✅ Connecté en tant que ${c.user.tag} — ${c.guilds.cache.size} serveur(s)`);
    c.user.setActivity("NEXUS Panel", { type: ActivityType.Watching });
    store.setDiscordConfig({ botName: c.user.username, status: "online" });
    store.addDiscordLog({
      timestamp: new Date().toISOString(),
      user: "NexusBot",
      command: "Connexion",
      response: `✅ ${c.user.tag} connecté — ${c.guilds.cache.size} serveur(s) | Préfixe : \`${PREFIX}\``,
    });
    store.logActivity("discord", "NexusBot démarré", c.user.tag);
  });

  // ── Messages / commandes ──────────────────────────────────────────────────
  client.on(Events.MessageCreate, async (msg: Message) => {
    if (msg.author.bot) return;
    if (!msg.content.startsWith(PREFIX)) return;

    const parts = msg.content.slice(PREFIX.length).trim().split(/\s+/);
    const cmdName = parts[0]?.toLowerCase();
    const args = parts.slice(1);

    const handler = COMMANDS[cmdName];
    if (!handler) return;

    commandsHandled++;

    try {
      const response = await handler(msg, args);
      await msg.reply(response);
      store.addDiscordLog({
        timestamp: new Date().toISOString(),
        user: msg.author.username,
        command: msg.content,
        response,
      });
    } catch (err: any) {
      const errMsg = `❌ Erreur lors de l'exécution de \`${cmdName}\` : ${err.message}`;
      await msg.reply(errMsg).catch(() => {});
      store.addDiscordLog({
        timestamp: new Date().toISOString(),
        user: msg.author.username,
        command: msg.content,
        response: errMsg,
      });
    }
  });

  // ── Nouveau serveur ───────────────────────────────────────────────────────
  client.on(Events.GuildCreate, (guild) => {
    console.log(`[NexusBot] Rejoint : ${guild.name}`);
    store.addDiscordLog({
      timestamp: new Date().toISOString(),
      user: "NexusBot",
      command: "Nouveau serveur",
      response: `🎉 NexusBot a rejoint **${guild.name}** (${guild.memberCount} membres)`,
    });
  });

  // ── Départ d'un serveur ───────────────────────────────────────────────────
  client.on(Events.GuildDelete, (guild) => {
    console.log(`[NexusBot] Retiré de : ${guild.name}`);
    store.addDiscordLog({
      timestamp: new Date().toISOString(),
      user: "NexusBot",
      command: "Serveur quitté",
      response: `👋 NexusBot a quitté **${guild.name}**`,
    });
  });

  // ── Erreurs ───────────────────────────────────────────────────────────────
  client.on(Events.Error, (err) => {
    console.error("[NexusBot] Erreur WebSocket :", err.message);
  });

  // ── Connexion ─────────────────────────────────────────────────────────────
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

// ── Arrêt propre ──────────────────────────────────────────────────────────────
export async function stopDiscordBot(): Promise<void> {
  if (client) {
    await client.destroy();
    client = null;
    console.log("[NexusBot] Arrêté.");
  }
}
