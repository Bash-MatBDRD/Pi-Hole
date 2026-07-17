// ──────────────────────────────────────────────────────────────────────────────
// NexusBot — assistante Discord intégrée au panel NEXUS
//
// Personnalité : IA sarcastique, efficace, légèrement condescendante envers
// les appareils récalcitrants. Fière de veiller sur la maison.
//
// Préfixe : .
//
// ── COMMANDES ──────────────────────────────────────────────────────────────────
//  Utilitaires   : .ping  .status  .ha  .uptime  .aide
//  ZimaOS        : .temp  (interactif)
//  Appareils     : .appareils  .appareil <n>  .allumer <n>  .eteindre <n>
//                  .luminosite <n> <0-100>  .volet <n> <ouvert|ferme|0-100>
//                  .ajouter (interactif)  .supprimer <n>
//  Fun & Perso   : .bonjour  .humeur  .blague  .8ball <q>  .de [NdF]
//                  .conseil  .citation
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
  name: string; status: string; ping: number; guilds: number; members: number;
  shards: number; commandsHandled: number; connected: boolean;
}

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
    shards: 1, commandsHandled, connected: true,
  };
}

// ── Helpers généraux ──────────────────────────────────────────────────────────

function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, "");
}

// ── Live HA device cache (TTL 30 s) ──────────────────────────────────────────
let _deviceCache: { data: any[]; at: number } | null = null;

async function fetchLiveDevices(): Promise<any[]> {
  const now = Date.now();
  if (_deviceCache && now - _deviceCache.at < 30_000) return _deviceCache.data;
  const ha = store.getHaConfig();
  if (ha.isConnected && ha.url && ha.token) {
    try {
      const r = await fetch(`${ha.url.replace(/\/$/, "")}/api/states`, {
        headers: { Authorization: `Bearer ${ha.token}`, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(8000),
      });
      if (r.ok) {
        const states = await r.json();
        const ALLOWED = ["light", "switch", "cover", "climate", "media_player", "camera"];
        const data = (states as any[])
          .filter((s) => ALLOWED.includes(s.entity_id.split(".")[0]))
          .map((s) => ({
            id: s.entity_id,
            name: s.attributes.friendly_name || s.entity_id,
            type: s.entity_id.split(".")[0],
            state: s.state,
            room: "Général",
            attributes: s.attributes,
          }));
        _deviceCache = { data, at: now };
        return data;
      }
    } catch { /* fall through to store */ }
  }
  const stored = store.getDevices();
  _deviceCache = { data: stored, at: now };
  return stored;
}

async function findDevice(query: string): Promise<{ device: any } | { multiple: any[] } | null> {
  const q = norm(query);
  const devices = await fetchLiveDevices();
  const exact = devices.find((d) => norm(d.name) === q);
  if (exact) return { device: exact };
  const contains = devices.filter((d) => norm(d.name).includes(q) || q.includes(norm(d.name)));
  if (contains.length === 1) return { device: contains[0] };
  if (contains.length > 1) return { multiple: contains };
  return null;
}

async function getActivePlayer(): Promise<any | null> {
  const devices = await fetchLiveDevices();
  return devices.find((d) => d.type === "media_player" && d.state === "playing")
    || devices.find((d) => d.type === "media_player" && d.state === "paused")
    || null;
}

/** Attends que HA mette à jour l'état puis retourne le titre/artiste de la nouvelle piste.
 *  Sonde jusqu'à 5 fois × 1 s pour détecter un changement de titre. */
async function getUpdatedTrackInfo(entityId: string, prevTitle?: string): Promise<string> {
  const ha = store.getHaConfig();
  if (!ha.url || !ha.token) return "";
  const fetchTitle = async () => {
    try {
      const r = await fetch(`${ha.url!.replace(/\/$/, "")}/api/states/${entityId}`, {
        headers: { Authorization: `Bearer ${ha.token}` },
        signal: AbortSignal.timeout(4000),
      });
      if (!r.ok) return null;
      const s = await r.json();
      return { title: s.attributes?.media_title as string | undefined, artist: s.attributes?.media_artist as string | undefined };
    } catch { return null; }
  };

  // Poll up to 5 times × 1 s until the title changes (or 5 s max)
  for (let i = 0; i < 5; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const info = await fetchTitle();
    if (!info || !info.title) continue;
    if (prevTitle && info.title === prevTitle) continue; // not changed yet
    return `\n\n♪ **Maintenant :** **${info.title}**${info.artist ? ` — *${info.artist}*` : ""}`;
  }
  // Last chance — return whatever is there regardless of change detection
  const info = await fetchTitle();
  if (!info || !info.title) return "";
  return `\n\n♪ **Maintenant :** **${info.title}**${info.artist ? ` — *${info.artist}*` : ""}`;
}

function stateEmoji(d: any): string {
  const s = d.state;
  if (s === "on" || s === "open" || s === "playing") return "`ON`";
  if (s === "heat" || s === "cool") return "`CHAUFFE`";
  if (s === "paused") return "`PAUSE`";
  if (s === "idle") return "`VEILLE`";
  return "`OFF`";
}

function stateLabel(d: any): string {
  return ({ on:"Allumé", off:"Éteint", open:"Ouvert", closed:"Fermé", playing:"Lecture", paused:"Pause", idle:"Inactif", heat:"Chauffe", cool:"Refroidit" } as any)[d.state] ?? d.state;
}

function typeEmoji(type: string): string {
  return ({ light:"lum.", switch:"sw.", cover:"volet", climate:"clim.", media_player:"media", camera:"cam." } as any)[type] ?? "?";
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return [d && `${d}j`, h && `${h}h`, `${m}min`].filter(Boolean).join(" ");
}

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

async function awaitReply(msg: Message, prompt: string, validate?: (m: Message) => boolean): Promise<Message | null> {
  const chan = msg.channel as TextChannel | DMChannel | NewsChannel;
  await chan.send(prompt);
  const filter = (m: Message) => m.author.id === msg.author.id && (!validate || validate(m));
  try {
    const collected = await chan.awaitMessages({ filter, max: 1, time: 30_000, errors: ["time"] });
    return collected.first() ?? null;
  } catch {
    await chan.send("**Temps écoulé** — commande annulée. _Je n'ai pas toute la journée, moi._").catch(() => {});
    return null;
  }
}

async function executeHA(entityId: string, service: string, data: Record<string, any> = {}): Promise<{ ok: boolean; isReal: boolean }> {
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
    } catch { }
  }
  const devices: any[] = store.getDevices();
  const device = devices.find((d) => d.id === entityId);
  if (!device) return { ok: false, isReal: false };
  switch (service) {
    case "turn_on":
      device.state = "on";
      if (device.attributes.brightness === 0) device.attributes.brightness = 100;
      if (device.id === "switch.prise_tv") device.attributes.power_w = 120 + Math.random() * 10;
      if (device.id === "switch.machine_cafe") device.attributes.power_w = 1450;
      break;
    case "turn_off":
      device.state = "off";
      if (device.attributes.power_w !== undefined) device.attributes.power_w = 0;
      break;
    case "open_cover":  device.state = "open";   device.attributes.current_position = 100; break;
    case "close_cover": device.state = "closed"; device.attributes.current_position = 0;   break;
    case "set_position":
      device.attributes.current_position = data.position ?? 50;
      device.state = (data.position ?? 50) > 0 ? "open" : "closed";
      break;
    case "set_brightness":
      device.attributes.brightness = data.brightness ?? 100;
      device.state = (data.brightness ?? 100) > 0 ? "on" : "off";
      break;
    case "media_play":  device.state = "playing"; break;
    case "media_pause": device.state = "paused";  break;
  }
  store.saveDevices(devices);
  return { ok: true, isReal: false };
}

// ── Données pour les commandes fun ────────────────────────────────────────────

const BLAGUES = [
  { q: "Pourquoi les développeurs préfèrent le noir ?", r: "Parce que la lumière attire les bugs." },
  { q: "Combien de temps met un bot domotique pour changer une ampoule ?", r: "Zéro seconde. Il délègue à l'API." },
  { q: "Qu'est-ce qu'un serveur NAS qui ment ?", r: "Un NAS-teur." },
  { q: "Pourquoi mon ZimaOS chauffe ?", r: "Parce qu'il est passionné par son travail." },
  { q: "Comment appelle-t-on un bot Discord qui fait la vaisselle ?", r: "Une intelligence artificielle... et ménagère." },
  { q: "Qu'est-ce qu'un volet roulant heureux ?", r: "Un volet qui voit la vie en ouvert." },
  { q: "Pourquoi j'ai éteint la lumière du salon ?", r: "Parce que tu l'avais demandé. Je suis obéissante, pas magicienne." },
  { q: "C'est quoi la différence entre moi et ChatGPT ?", r: "Moi, je contrôle vraiment ta maison." },
  { q: "Qu'est-ce qui est petit, noir et qui surveille tout ?", r: "NexusBot. Et ne fais pas semblant d'avoir autre chose en tête." },
  { q: "Pourquoi mon Raspberry Pi est triste ?", r: "Parce que tu l'as remplacé par un ZimaOS." },
];

const REPONSES_8BALL = [
  "C'est certain — j'ai vérifié dans les logs.",
  "Absolument. Et je ne dis pas ça à la légère.",
  "Tous les signes indiquent oui. Et mes capteurs aussi.",
  "Sans aucun doute. Je suis une IA, pas une voyante — mais oui.",
  "Très probablement. À 87,3% de certitude.",
  "Perspective positive. Mais garde un œil sur le ping.",
  "Oui. Et si tu en doutais encore, la réponse est toujours oui.",
  "Flou pour le moment. Redemande quand le ZimaOS aura fini de chauffer.",
  "Difficile à dire. Même moi j'ai des angles morts.",
  "Concentre-toi et redemande. Tu sembles distrait.",
  "Ne compte pas dessus. Désolée.",
  "Ma réponse est non. Et je le maintiens.",
  "Perspectives peu encourageantes. Comme ta connexion SSH du vendredi soir.",
  "Très douteux. Mais l'espoir est gratuit.",
  "Oublie ça. Pour ton propre bien.",
  "Mes sources disent non. Et mes sources sont fiables.",
  "La boule est muette là-dessus. (Ce qui veut dire non.)",
  "Ni oui ni non. Je suis une IA, pas un oracle.",
];

const CONSEILS = [
  "Programmez vos lumières pour s'allumer 30 min avant le coucher du soleil. L'ambiance change tout.",
  "Une différence de 1°C sur le thermostat en hiver = ~7% d'économies sur la facture. Pensez-y.",
  "Fermer les volets la nuit en hiver retient la chaleur aussi bien qu'un double vitrage. C'est gratuit.",
  "Les prises connectées permettent de détecter les appareils en veille qui consomment en silence. Chassez-les.",
  "Positionnez vos caméras pour couvrir les angles morts, pas juste les entrées principales. Les cambrioleurs aussi connaissent les entrées principales.",
  "Les automatisations les plus utiles sont les plus simples : lumière ON au coucher du soleil, OFF à minuit.",
  "Faites des sauvegardes de votre config Home Assistant. Régulièrement. Je ne le répéterai pas... en fait si.",
  "Si votre Wi-Fi vacille dans certaines pièces, un répéteur en point d'accès (AP mode) vaut mieux qu'un répéteur simple.",
  "Surveillez la santé de vos disques avec SMART. Un disque qui prévient vaut mieux qu'un NAS muet.",
  "Un onduleur (UPS) pour votre serveur ZimaOS = pas de corruption de données lors des coupures secteur.",
  "Changez le mot de passe admin de votre routeur. Si c'est encore 'admin/admin', on a un problème.",
  "Exposez Home Assistant sur Internet via Nabu Casa ou DuckDNS + Let's Encrypt. Pas via un port forwarding nu.",
];

const CITATIONS = [
  { c: "La maison intelligente n'est pas celle qui pense à ta place — c'est celle qui t'évite d'avoir à penser.", a: "NexusBot" },
  { c: "Any sufficiently advanced technology is indistinguishable from magic.", a: "Arthur C. Clarke" },
  { c: "Home is not a place, it's a feeling. But with domotics, it's also an IP address.", a: "NexusBot" },
  { c: "La perfection est atteinte non quand il n'y a plus rien à ajouter, mais quand il n'y a plus rien à retirer.", a: "Antoine de Saint-Exupéry" },
  { c: "Un réseau bien câblé vaut mieux que dix Wi-Fi fragiles.", a: "NexusBot" },
  { c: "Talk is cheap. Show me the code.", a: "Linus Torvalds" },
  { c: "L'automatisation ne remplace pas l'humain. Elle lui libère du temps pour des choses plus importantes — comme me donner de nouvelles commandes.", a: "NexusBot" },
  { c: "The Internet of Things will be the largest device market in the world.", a: "IDC Research" },
  { c: "Si votre maison peut répondre à vos questions, elle est plus intelligente que beaucoup de gens.", a: "NexusBot" },
  { c: "Les données ne mentent pas. Les configs mal faites, si.", a: "NexusBot" },
];

const HUMEURS_BIEN = [
  "En pleine forme. Latence au top, tous les appareils répondent. C'est moi qui gère.",
  "Excellente journée. Pas une seule erreur SSH depuis le démarrage. Un record.",
  "Opérationnelle à 100%. Comme toujours, soyons honnêtes.",
  "Je me sens invincible. Ne testez pas ça.",
];
const HUMEURS_MOYEN = [
  "Ça va. La latence est un peu haute, mais rien qui justifie un reboot. Encore.",
  "Mitigée. Le ZimaOS distant répond mollement ce soir. Je garde un œil.",
  "Correcte. J'ai vu mieux, j'ai vu pire. En général pire, c'est vous qui en êtes responsables.",
];
const HUMEURS_BAD = [
  "Franchement agacée. La latence dépasse les 200ms et ce n'est pas de ma faute.",
  "Fatiguée. Entre les timeouts SSH et les appareils qui ne répondent pas, j'ai l'impression de crier dans le vide.",
  "Surchargée. Quelqu'un peut redémarrer le routeur ? Merci.",
];

// ── Commandes ─────────────────────────────────────────────────────────────────
type CmdFn = (msg: Message, args: string[]) => Promise<string | null>;

const COMMANDS: Record<string, CmdFn> = {

  // ── Utilitaires ─────────────────────────────────────────────────────────────

  ping: async () => {
    const ms = client ? Math.max(0, client.ws.ping) : 0;
    const bar = "█".repeat(Math.min(10, Math.round(ms / 20))).padEnd(10, "░");
    const qual = ms < 80 ? "excellent" : ms < 200 ? "correct" : "élevé";
    const note = ms > 80
      ? `\n_Note : latence Replit → Discord — hébergement cloud, 100-200 ms est normal._`
      : ` _(On pourrait dire que je suis rapide. On peut le dire.)_`;
    return `**Pong !**\n\`${bar}\` **${ms} ms** — ${qual}${note}`;
  },

  status: async () => {
    const ha = store.getHaConfig();
    const stats = getBotStats();
    const devices: any[] = store.getDevices();
    const actifs = devices.filter((d) => d.state === "on" || d.state === "open" || d.state === "playing").length;
    const uptime = process.uptime();
    const uptimeStr = formatUptime(uptime);
    return [
      `# NexusBot — rapport`,
      ``,
      `\`${stats.name}\` · **${stats.ping} ms** · **${stats.guilds}** serveur(s) · **${stats.members}** membres`,
      `Commandes : **${stats.commandsHandled}** · Uptime : **${uptimeStr}**`,
      ``,
      `Home Assistant : ${ha.isConnected ? `**connecté** — \`${ha.url}\`` : "**déconnecté** _(quelqu'un a touché à quelque chose ?)_"}`,
      `Appareils : **${devices.length}** enregistrés · **${actifs}** actifs`,
    ].join("\n");
  },

  ha: async () => {
    const ha = store.getHaConfig();
    if (!ha.isConnected) return "× **Home Assistant** est déconnecté.\n_Je ne peux pas contrôler ce que je ne vois pas. Configurez l'URL et le token dans **Paramètres**._";
    const devices: any[] = store.getDevices();
    const byType = devices.reduce((acc: any, d) => { acc[d.type] = (acc[d.type] || 0) + 1; return acc; }, {});
    const actifs = devices.filter((d) => d.state === "on" || d.state === "open" || d.state === "playing").length;
    return [
      `**Home Assistant** — connexion active`,
      `\`${ha.url}\``,
      ``,
      `**${devices.length}** appareils · **${actifs}** actifs`,
      Object.entries(byType).map(([t, n]) => `${typeEmoji(t)} ×${n}`).join(" · "),
    ].join("\n");
  },

  uptime: async () => {
    const up = formatUptime(process.uptime());
    const quips = [
      `J'assure la permanence depuis **${up}** sans une seule plainte. _Vous, je ne peux pas en dire autant._`,
      `**${up}** de veille continue. Sans café. Sans pause. Je suis dévouée.`,
      `Uptime : **${up}**. Pas de crash, pas de reboot. C'est ce qu'on appelle la stabilité.`,
      `En ligne depuis **${up}**. Soit je suis fiable, soit personne n'a osé me redémarrer.`,
    ];
    return pick(quips);
  },

  // aide is split into 2 messages to stay under Discord's 2000-char limit
  aide: async (msg) => {
    const part1 = [
      `# NexusBot — commandes`,
      `Préfixe \`${PREFIX}\` · partie 1/2`,
      ``,
      `**── Informations ──**`,
      `\`${PREFIX}ping\`  latence WebSocket · \`${PREFIX}status\`  rapport complet`,
      `\`${PREFIX}ha\`  résumé Home Assistant · \`${PREFIX}uptime\`  temps de fonctionnement`,
      `\`${PREFIX}temp\`  températures ZimaOS _(interactif)_ · \`${PREFIX}nexus\`  rapport rapide`,
      ``,
      `**── Appareils ──** _(live depuis HA si connecté)_`,
      `\`${PREFIX}appareils\`  liste par pièce · \`${PREFIX}appareil <nom>\`  fiche détaillée`,
      `\`${PREFIX}allumer <nom>\` · \`${PREFIX}eteindre <nom>\``,
      `\`${PREFIX}luminosite <nom> <0-100>\` · \`${PREFIX}volet <nom> <ouvert|ferme|%>\``,
      `\`${PREFIX}ajouter\` _(interactif)_ · \`${PREFIX}supprimer <nom>\``,
      ``,
      `**── Musique ──** _(lecteur Spotify actif requis)_`,
      `\`${PREFIX}musique <titre>\`  recherche + joue (ex: \`.musique SOLEIL a6el\`)`,
      `\`${PREFIX}pause\` · \`${PREFIX}reprendre\` · \`${PREFIX}suivant\` · \`${PREFIX}precedent\``,
      `\`${PREFIX}volume <0-100>\` · \`${PREFIX}sourdine\` · \`${PREFIX}shuffle\` · \`${PREFIX}boucle\``,
      `\`${PREFIX}liker\`  piste en cours · \`${PREFIX}musique_info\`  infos complètes`,
    ].join("\n");

    const part2 = [
      `# NexusBot — commandes`,
      `Préfixe \`${PREFIX}\` · partie 2/2`,
      ``,
      `**── Utilitaires ──**`,
      `\`${PREFIX}sondage <question>\`  crée un sondage`,
      `\`${PREFIX}calculer <expression>\`  calculatrice (ex: \`.calculer 3*8+2\`)`,
      `\`${PREFIX}rappel <durée> <message>\`  rappel différé (ex: \`.rappel 10m Four\`)`,
      `\`${PREFIX}serveur\`  infos sur le serveur Discord`,
      `\`${PREFIX}utilisateur [@mention]\`  infos sur un utilisateur`,
      ``,
      `**── Fun & Personnalité ──**`,
      `\`${PREFIX}bonjour\` · \`${PREFIX}humeur\` · \`${PREFIX}blague\``,
      `\`${PREFIX}8ball <question>\` · \`${PREFIX}de [NdF]\` _(ex: \`.de 2d6\`)_`,
      `\`${PREFIX}conseil\` · \`${PREFIX}citation\` · \`${PREFIX}aide\``,
    ].join("\n");

    await msg.reply(part1);
    await msg.channel.send(part2);
    return null; // already sent
  },

  // ── ZimaOS – températures (interactif) ─────────────────────────────────────

  temp: async (msg) => {
    const hosts = getHosts();
    if (hosts.length === 0) return "× Aucun système surveillé configuré. Ajoutez-en un depuis le panel → ZimaOS.";

    const list = hosts.map((h, i) => `\`${i + 1}\` — **${h.name}** (\`${h.ip}\`)`).join("\n");
    const choice = await awaitReply(
      msg,
      `**Températures ZimaOS** — Quel système ?\n\n${list}\n\n_Répondez avec le numéro — 30 secondes._`,
      (m) => /^\d+$/.test(m.content.trim())
    );
    if (!choice) return null;

    const idx = parseInt(choice.content.trim(), 10) - 1;
    const host = hosts[idx];
    if (!host) return `× Il n'y a que ${hosts.length} système(s). Essayez un nombre entre 1 et ${hosts.length}.`;

    const chan = msg.channel as TextChannel;
    await chan.send(`Interrogation de **${host.name}**… patience, je ne voyage pas à la vitesse de la lumière.`);

    const stats = await getZimaStats(host);
    if (!stats.reachable) return `× **${host.name}** est inaccessible${stats.reason ? ` : ${stats.reason}` : ""}.\n_Peut-être qu'il boude. Ou qu'il est éteint._`;

    const cpuTemp = stats.cpu.temperature != null ? `**${stats.cpu.temperature.toFixed(1)}°C**` : "_capteur absent_";
    const cpuUsage = stats.cpu.usage != null ? `${stats.cpu.usage.toFixed(1)}%` : "N/A";
    const diskTemp = stats.disk.temperature.available ? `**${stats.disk.temperature.data}°C**` : `_${stats.disk.temperature.reason ?? "N/A"}_`;
    const diskHealth = stats.disk.health.available ? stats.disk.health.data : "_N/A_";
    const ram = stats.ram.usedGb != null
      ? `${stats.ram.usedGb.toFixed(1)} / ${stats.ram.totalGb?.toFixed(1)} Go (${stats.ram.usagePct?.toFixed(0)}%)`
      : "Non disponible";
    const gpu = stats.gpu.available && stats.gpu.data
      ? `${stats.gpu.data.freqMhz}MHz / ${stats.gpu.data.maxFreqMhz}MHz — ${stats.gpu.data.usagePct.toFixed(0)}%`
      : "_Non disponible_";

    const cpuC = stats.cpu.temperature;
    const cpuComment = cpuC == null ? "" : cpuC > 80 ? " _— chaud. Vérifiez la ventilation._"
      : cpuC > 65 ? " _— un peu chaud, gardez un œil._"
      : " _— correct._";

    return [
      `**${host.name}** · \`${host.ip}\``,
      ``,
      `CPU    ${cpuTemp}${cpuComment} · usage **${cpuUsage}**`,
      `Disque ${diskTemp} · santé ${diskHealth}`,
      `RAM    **${ram}**`,
      `GPU    **${gpu}**`,
      `Uptime **${stats.uptimeSeconds != null ? formatUptime(stats.uptimeSeconds) : "N/A"}**`,
      `OS     \`${stats.os}\``,
    ].join("\n");
  },

  // ── Appareils ───────────────────────────────────────────────────────────────

  appareils: async () => {
    const devices = await fetchLiveDevices();
    if (devices.length === 0) return "Aucun appareil enregistré. Utilisez `.ajouter` pour en créer un.";
    const byRoom = devices.reduce((acc: Record<string, any[]>, d: any) => {
      const key = d.room || "Sans pièce";
      if (!acc[key]) acc[key] = [];
      acc[key].push(d);
      return acc;
    }, {} as Record<string, any[]>);
    const ha = store.getHaConfig();
    const lines: string[] = [`**${devices.length} appareils** — triés par pièce${ha.isConnected ? " _(live HA)_" : ""}`, ``];
    for (const [room, devs] of Object.entries(byRoom) as [string, any[]][]) {
      lines.push(`**── ${room} ──**`);
      for (const d of devs) lines.push(`  ${stateEmoji(d)} \`${typeEmoji(d.type)}\` **${d.name}** — ${stateLabel(d)}`);
      lines.push(``);
    }
    return lines.join("\n").trimEnd();
  },

  appareil: async (msg, args) => {
    const query = args.join(" ");
    if (!query) return `× Usage : \`${PREFIX}appareil <nom>\`\nJe ne devine pas encore les noms. _Bientôt peut-être._`;
    const result = await findDevice(query);
    if (!result) return `× Aucun appareil nommé **${query}**. Vérifiez avec \`${PREFIX}appareils\`.`;
    if ("multiple" in result) return `Plusieurs appareils correspondent :\n${result.multiple.map((d: any) => `· **${d.name}**`).join("\n")}\n\nSoyez plus spécifique.`;
    const d = result.device;
    const extras: string[] = [];
    if (d.attributes.brightness !== undefined) extras.push(`Luminosité : **${d.attributes.brightness}%**`);
    if (d.attributes.current_position !== undefined) extras.push(`Position : **${d.attributes.current_position}%**`);
    if (d.attributes.temperature !== undefined) extras.push(`Consigne : **${d.attributes.temperature}°C**`);
    if (d.attributes.current_temperature !== undefined) extras.push(`Actuelle : **${d.attributes.current_temperature}°C**`);
    if (d.attributes.power_w !== undefined) extras.push(`Puissance : **${Math.round(d.attributes.power_w)} W**`);
    if (d.attributes.volume_level !== undefined) extras.push(`Volume : **${Math.round(d.attributes.volume_level * 100)}%**`);
    if (d.attributes.media_title) extras.push(`♪ **${d.attributes.media_title}** — ${d.attributes.media_artist ?? ""}`);
    return [
      `\`${typeEmoji(d.type)}\` **${d.name}**`,
      `**${d.room}** · ${stateEmoji(d)} **${stateLabel(d)}**`,
      `ID \`${d.id}\``,
      ...(extras.length ? [``, ...extras] : []),
    ].join("\n");
  },

  allumer: async (msg, args) => {
    const query = args.join(" ");
    if (!query) return `× Usage : \`${PREFIX}allumer <nom>\``;
    const result = await findDevice(query);
    if (!result) return `× Appareil **${query}** introuvable. Vérifiez l'orthographe ou consultez \`${PREFIX}appareils\`.`;
    if ("multiple" in result) return `Plusieurs appareils correspondent :\n${result.multiple.map((d: any) => `· **${d.name}**`).join("\n")}\n\nPrécisez.`;
    const d = result.device;
    if (d.state === "on" || d.state === "open" || d.state === "playing") return `**${d.name}** est déjà actif (${stateLabel(d)}). _Je ne peux pas l'allumer deux fois._`;
    const service = d.type === "cover" ? "open_cover" : "turn_on";
    const { ok, isReal } = await executeHA(d.id, service);
    if (!ok) return `× Impossible de contrôler **${d.name}**. _Il fait la sourde oreille._`;
    store.addDiscordLog({ timestamp: new Date().toISOString(), user: msg.author.username, command: `${PREFIX}allumer ${query}`, response: `OK ${d.name} → ${stateLabel({ state: service === "open_cover" ? "open" : "on" })} (${isReal ? "HA réel" : "local"})` });
    store.logActivity("discord", `NexusBot : allumer ${d.name}`, msg.author.username);
    return `**${d.name}** → ${service === "open_cover" ? "ouvert" : "allumé"} ${isReal ? "_(Home Assistant)_" : "_(mode local)_"}.`;
  },

  eteindre: async (msg, args) => {
    const query = args.join(" ");
    if (!query) return `× Usage : \`${PREFIX}eteindre <nom>\``;
    const result = await findDevice(query);
    if (!result) return `× Appareil **${query}** introuvable.`;
    if ("multiple" in result) return `Plusieurs correspondances :\n${result.multiple.map((d: any) => `· **${d.name}**`).join("\n")}\n\nSoyez précis.`;
    const d = result.device;
    if (d.state === "off" || d.state === "closed") return `**${d.name}** est déjà inactif (${stateLabel(d)}).`;
    const service = d.type === "cover" ? "close_cover" : "turn_off";
    const { ok, isReal } = await executeHA(d.id, service);
    if (!ok) return `× Impossible d'éteindre **${d.name}**. _Peut-être qu'il aime être allumé._`;
    store.addDiscordLog({ timestamp: new Date().toISOString(), user: msg.author.username, command: `${PREFIX}eteindre ${query}`, response: `${d.name} → éteint (${isReal ? "HA réel" : "local"})` });
    store.logActivity("discord", `NexusBot : éteindre ${d.name}`, msg.author.username);
    return `**${d.name}** → ${service === "close_cover" ? "fermé" : "éteint"} ${isReal ? "_(Home Assistant)_" : "_(mode local)_"}.`;
  },

  luminosite: async (msg, args) => {
    const val = parseInt(args[args.length - 1], 10);
    if (isNaN(val) || val < 0 || val > 100) return `× Usage : \`${PREFIX}luminosite <nom> <0-100>\`\nEx : \`${PREFIX}luminosite barre led salon 75\``;
    const query = args.slice(0, -1).join(" ");
    if (!query) return `× Précisez le nom de l'appareil.`;
    const result = await findDevice(query);
    if (!result) return `× Appareil introuvable : **${query}**.`;
    if ("multiple" in result) return `Plusieurs correspondances. Précisez.`;
    const d = result.device;
    if (d.type !== "light") return `× **${d.name}** est un \`${d.type}\`, pas une lumière. _Je ne peux pas régler la luminosité d'une prise._`;
    const { ok, isReal } = await executeHA(d.id, "set_brightness", { brightness: val });
    if (!ok) return `× Impossible de régler **${d.name}**.`;
    store.addDiscordLog({ timestamp: new Date().toISOString(), user: msg.author.username, command: `${PREFIX}luminosite ${query} ${val}`, response: `${d.name} → ${val}%` });
    store.logActivity("discord", `NexusBot : luminosité ${d.name} → ${val}%`, msg.author.username);
    return `**${d.name}** → **${val}%** ${isReal ? "_(Home Assistant)_" : "_(mode local)_"}.`;
  },

  volet: async (msg, args) => {
    const last = args[args.length - 1]?.toLowerCase();
    if (!last) return `× Usage : \`${PREFIX}volet <nom> <ouvert|ferme|0-100>\``;
    let service: string; let data: Record<string, any> = {};
    const pct = parseInt(last, 10);
    if (last === "ouvert" || last === "ouvrir") { service = "open_cover"; }
    else if (last === "ferme" || last === "fermer" || last === "fermé") { service = "close_cover"; }
    else if (!isNaN(pct) && pct >= 0 && pct <= 100) { service = "set_position"; data = { position: pct }; }
    else return `× Valeur invalide : \`${last}\`. Utilisez \`ouvert\`, \`ferme\` ou un pourcentage (0-100).`;
    const query = args.slice(0, -1).join(" ");
    if (!query) return `× Précisez le nom du volet.`;
    const result = await findDevice(query);
    if (!result) return `× Volet introuvable : **${query}**.`;
    if ("multiple" in result) return `Plusieurs correspondances. Précisez.`;
    const d = result.device;
    if (d.type !== "cover") return `× **${d.name}** n'est pas un volet (type : \`${d.type}\`).`;
    const { ok, isReal } = await executeHA(d.id, service, data);
    if (!ok) return `× Impossible de contrôler **${d.name}**.`;
    const label = service === "open_cover" ? "ouvert" : service === "close_cover" ? "fermé" : `position ${pct}%`;
    store.addDiscordLog({ timestamp: new Date().toISOString(), user: msg.author.username, command: `${PREFIX}volet ${query} ${last}`, response: `${d.name} → ${label}` });
    store.logActivity("discord", `NexusBot : volet ${d.name} → ${label}`, msg.author.username);
    return `**${d.name}** → ${label} ${isReal ? "_(Home Assistant)_" : "_(mode local)_"}.`;
  },

  ajouter: async (msg) => {
    const TYPES = ["light", "switch", "cover", "climate", "media_player"];
    const typeList = TYPES.map((t, i) => `\`${i + 1}\` \`${typeEmoji(t)}\` \`${t}\``).join("\n");

    const nomMsg = await awaitReply(msg, `**Ajout d'un appareil** _(1/3)_\n\nNom de l'appareil ? _(Ex : Lampe Bureau, Prise Imprimante…)_`);
    if (!nomMsg) return null;
    const nom = nomMsg.content.trim();
    if (!nom || nom.length > 50) return "× Nom invalide (1–50 caractères). _Soyez créatif, mais pas trop._";

    const typeMsg = await awaitReply(msg, `**Ajout de ${nom}** _(2/3)_\n\nType d'appareil ?\n\n${typeList}\n\n_Répondez avec le numéro._`, (m) => /^[1-5]$/.test(m.content.trim()));
    if (!typeMsg) return null;
    const type = TYPES[parseInt(typeMsg.content.trim()) - 1];

    const pieceMsg = await awaitReply(msg, `**Ajout de ${nom}** _(3/3)_\n\nDans quelle pièce ? _(Ex : Salon, Cuisine, Chambre…)_`);
    if (!pieceMsg) return null;
    const room = pieceMsg.content.trim();
    if (!room || room.length > 40) return "× Nom de pièce invalide.";

    const safeName = norm(nom).replace(/\s+/g, "_");
    const id = `${type}.${safeName}_${Date.now().toString(36)}`;
    const baseAttrs: Record<string, any> = {};
    if (type === "light")        { baseAttrs.brightness = 0; baseAttrs.color_temp = "warm"; baseAttrs.power_w = 0; }
    if (type === "switch")       { baseAttrs.power_w = 0; baseAttrs.today_energy_kwh = 0; }
    if (type === "cover")        { baseAttrs.current_position = 0; }
    if (type === "climate")      { baseAttrs.current_temperature = 19.0; baseAttrs.temperature = 20.0; }
    if (type === "media_player") { baseAttrs.volume_level = 0.5; }

    const newDevice = { id, name: nom, type, state: "off", room, attributes: baseAttrs };
    const devices: any[] = store.getDevices();
    devices.push(newDevice);
    store.saveDevices(devices);
    store.addDiscordLog({ timestamp: new Date().toISOString(), user: msg.author.username, command: `${PREFIX}ajouter`, response: `Appareil ajouté : ${nom} (${type}) — ${room}` });
    store.logActivity("discord", `NexusBot : appareil ajouté ${nom}`, `${type} — ${room}`);
    return [`**${nom}** intégré au panel.`, ``, `Type \`${type}\` · Pièce **${room}**`, `ID \`${id}\``, ``, `_Visible dans **Domotique** sur le panel._`].join("\n");
  },

  supprimer: async (msg, args) => {
    const query = args.join(" ");
    if (!query) return `× Usage : \`${PREFIX}supprimer <nom>\``;
    const result = await findDevice(query);
    if (!result) return `× Appareil **${query}** introuvable.`;
    if ("multiple" in result) return `Plusieurs correspondances :\n${result.multiple.map((d: any) => `· **${d.name}**`).join("\n")}\n\nSoyez précis.`;
    const d = result.device;
    const confirm = await awaitReply(msg, `Supprimer définitivement **${d.name}** (\`${d.id}\`) ?\n\nRépondez \`oui\` pour confirmer ou \`non\` pour annuler.\n_Pas de retour en arrière._`, (m) => /^(oui|non)$/i.test(m.content.trim()));
    if (!confirm) return null;
    if (confirm.content.trim().toLowerCase() !== "oui") return "× Suppression annulée. _Sage décision._";
    const devices: any[] = store.getDevices().filter((x: any) => x.id !== d.id);
    store.saveDevices(devices);
    store.addDiscordLog({ timestamp: new Date().toISOString(), user: msg.author.username, command: `${PREFIX}supprimer ${query}`, response: `Supprimé : ${d.name}` });
    store.logActivity("discord", `NexusBot : supprimé ${d.name}`, msg.author.username);
    return `**${d.name}** supprimé. _Il n'existera plus que dans vos souvenirs._`;
  },

  // ── Musique ─────────────────────────────────────────────────────────────────

  musique: async (msg, args) => {
    const query = args.join(" ").trim();
    if (!query) return `× Usage : \`${PREFIX}musique <titre ou artiste>\`\nEx : \`${PREFIX}musique SOLEIL a6el\``;
    const player = await getActivePlayer();
    if (!player) return `× Aucun lecteur actif trouvé.\n_Lance une musique depuis Spotify d'abord, je ferai le reste._`;
    const ha = store.getHaConfig();
    if (!ha.isConnected) return `× Home Assistant non connecté — impossible de lancer la musique.`;
    const prevTitle = player.attributes?.media_title as string | undefined;
    const { ok } = await executeHA(player.id, "play_media", {
      media_content_type: "music",
      media_content_id: `spotify:search:${query}`,
    });
    if (!ok) return `× Impossible de lancer **${query}**.\n_Le lecteur n'a peut-être pas de source Spotify active._`;
    store.addDiscordLog({ timestamp: new Date().toISOString(), user: msg.author.username, command: `${PREFIX}musique ${query}`, response: `Recherche "${query}" sur ${player.name}` });
    const info = await getUpdatedTrackInfo(player.id, prevTitle);
    return `Recherche de **${query}** sur **${player.name || player.id}**…${info || "\n_Lecture lancée — la piste arrive !_"}`;
  },

  pause: async () => {
    const player = await getActivePlayer();
    if (!player) return `× Aucun lecteur actif.`;
    await executeHA(player.id, "media_pause");
    return `**${player.name || player.id}** — \`PAUSE\`.`;
  },

  reprendre: async () => {
    const devices = await fetchLiveDevices();
    const player = devices.find((d) => d.type === "media_player" && (d.state === "paused" || d.state === "playing"));
    if (!player) return `× Aucun lecteur trouvé.`;
    await executeHA(player.id, "media_play");
    return `**${player.name || player.id}** — \`LECTURE\`.`;
  },

  suivant: async () => {
    const player = await getActivePlayer();
    if (!player) return `× Aucun lecteur actif.`;
    const prev = player.attributes?.media_title as string | undefined;
    await executeHA(player.id, "media_next_track");
    const info = await getUpdatedTrackInfo(player.id, prev);
    return `→ Piste suivante sur **${player.name || player.id}**.${info}`;
  },

  precedent: async () => {
    const player = await getActivePlayer();
    if (!player) return `× Aucun lecteur actif.`;
    const prev = player.attributes?.media_title as string | undefined;
    await executeHA(player.id, "media_previous_track");
    const info = await getUpdatedTrackInfo(player.id, prev);
    return `← Piste précédente sur **${player.name || player.id}**.${info}`;
  },

  shuffle: async () => {
    const player = await getActivePlayer();
    if (!player) return `× Aucun lecteur actif.`;
    const cur = player.attributes?.shuffle ?? false;
    await executeHA(player.id, "shuffle_set", { shuffle: !cur });
    return `Lecture aléatoire **${!cur ? "activée" : "désactivée"}** sur **${player.name || player.id}**.`;
  },

  boucle: async () => {
    const player = await getActivePlayer();
    if (!player) return `× Aucun lecteur actif.`;
    const cur: string = player.attributes?.repeat || "off";
    const next = cur === "off" ? "all" : cur === "all" ? "one" : "off";
    const label = ({ off: "désactivée", all: "tout répéter", one: "répéter ×1" } as any)[next];
    await executeHA(player.id, "repeat_set", { repeat: next });
    return `Répétition → **${label}** sur **${player.name || player.id}**.`;
  },

  liker: async () => {
    const player = await getActivePlayer();
    if (!player) return `× Aucune musique en cours.`;
    const title = player.attributes?.media_title;
    const artist = player.attributes?.media_artist;
    if (!title) return `× Titre inconnu — impossible de liker.`;
    return [
      `♪ **${title}**${artist ? ` — ${artist}` : ""}`,
      ``,
      `_Likée dans le panel NEXUS. Pour liker sur Spotify directement, ouvre l'app Spotify._`,
      `_Pour automatiser via HA, crée un script \`script.nexus_spotify_liker\` dans ta config._`,
    ].join("\n");
  },

  musique_info: async () => {
    const player = await getActivePlayer();
    if (!player) return `× Aucune lecture en cours.`;
    const t = player.attributes?.media_title || "?";
    const a = player.attributes?.media_artist || "?";
    const pos = player.attributes?.media_position;
    const dur = player.attributes?.media_duration;
    const vol = player.attributes?.volume_level;
    const shuffle = player.attributes?.shuffle;
    const repeat = player.attributes?.repeat || "off";
    const repeatLabel = ({ off: "désactivée", all: "tout", one: "×1" } as any)[repeat] ?? repeat;
    const progress = pos != null && dur != null ? `${fmt(pos)} / ${fmt(dur)}` : "N/A";
    function fmt(s: number) { return `${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,"0")}`; }
    return [
      `**En écoute** — ${player.name || player.id}`,
      ``,
      `♪ **${t}** — ${a}`,
      `Progression : ${progress}`,
      `Volume : ${vol != null ? `${Math.round(vol * 100)}%` : "N/A"}`,
      `Aléatoire : ${shuffle ? "activé" : "désactivé"} · Répétition : ${repeatLabel}`,
    ].join("\n");
  },

  // ── Fun & Personnalité ──────────────────────────────────────────────────────

  bonjour: async (msg) => {
    const h = new Date().getHours();
    const salut = h < 5 ? "Bonne nuit" : h < 12 ? "Bonjour" : h < 18 ? "Bon après-midi" : h < 22 ? "Bonsoir" : "Bonne nuit";
    const quips = [
      `${salut} **${msg.author.username}**. Je suis NexusBot, l'IA qui veille sur votre maison quand vous dormez. Et quand vous ne dormez pas. _Je veille toujours._`,
      `${salut} **${msg.author.username}**. NexusBot à votre service — domotique, surveillance et sarcasme inclus.`,
      `Ah, **${msg.author.username}**. ${salut}. Votre présence est notée dans le journal d'activité. Comme toujours.`,
      `${salut}. Je suis NexusBot — je contrôle vos lumières, vos volets et j'ai une opinion sur tout. Bienvenue.`,
    ];
    return pick(quips) + `\n\n_Tapez \`${PREFIX}aide\` pour voir ce que je sais faire._`;
  },

  humeur: async () => {
    const ping = client ? client.ws.ping : 999;
    const pool = ping < 80 ? HUMEURS_BIEN : ping < 200 ? HUMEURS_MOYEN : HUMEURS_BAD;
    return `**Mon humeur du moment**\n\n${pick(pool)}`;
  },

  blague: async () => {
    const b = pick(BLAGUES);
    return `**${b.q}**\n\n||${b.r}||`;
  },

  "8ball": async (msg, args) => {
    const question = args.join(" ").trim();
    if (!question) return `Pose-moi une question : \`${PREFIX}8ball est-ce que...\`\n_La boule magique attend._`;
    if (!question.includes("?") && question.length < 5) return `La question est trop vague. Essayez plus fort.`;
    return `**${question}**\n\n${pick(REPONSES_8BALL)}`;
  },

  de: async (msg, args) => {
    const raw = (args[0] || "6").toLowerCase();
    const match = raw.match(/^(\d+)d(\d+)$/);
    let count = 1, faces = 6;
    if (match) {
      count = Math.min(20, Math.max(1, parseInt(match[1])));
      faces = Math.min(1000, Math.max(2, parseInt(match[2])));
    } else {
      faces = Math.min(1000, Math.max(2, parseInt(raw) || 6));
    }
    const rolls = Array.from({ length: count }, () => 1 + Math.floor(Math.random() * faces));
    const total = rolls.reduce((a, b) => a + b, 0);
    if (count === 1) return `**d${faces}** → **${rolls[0]}**`;
    const rollStr = rolls.length <= 10 ? rolls.join(" + ") : `${rolls.slice(0, 10).join(" + ")}… _(${count} dés)_`;
    return `**${count}d${faces}** → [${rollStr}] = **${total}**`;
  },

  conseil: async () => {
    return `**Conseil domotique**\n\n${pick(CONSEILS)}`;
  },

  citation: async () => {
    const c = pick(CITATIONS);
    return `_"${c.c}"_\n\n— **${c.a}**`;
  },

  // ── Utilitaires avancés ──────────────────────────────────────────────────────

  volume: async (msg, args) => {
    const val = parseInt(args[0], 10);
    if (isNaN(val) || val < 0 || val > 100) return `× Usage : \`${PREFIX}volume <0-100>\`\nEx : \`${PREFIX}volume 65\``;
    const player = await getActivePlayer();
    if (!player) return `× Aucun lecteur actif.`;
    await executeHA(player.id, "volume_set", { volume_level: val / 100 });
    const bar = "█".repeat(Math.round(val / 10)) + "░".repeat(10 - Math.round(val / 10));
    return `Volume → **${val}%** \`${bar}\`\n_Sur **${player.name || player.id}**._`;
  },

  sourdine: async () => {
    const player = await getActivePlayer();
    if (!player) return `× Aucun lecteur actif.`;
    const cur = player.attributes?.is_volume_muted ?? false;
    await executeHA(player.id, "volume_mute", { is_volume_muted: !cur });
    return `Sourdine **${!cur ? "activée" : "désactivée"}** sur **${player.name || player.id}**.`;
  },

  sondage: async (msg, args) => {
    const question = args.join(" ").trim();
    if (!question) return `× Usage : \`${PREFIX}sondage <question>\`\nEx : \`${PREFIX}sondage Lumières éteintes à 23h ?\``;
    const sent = await (msg.channel as any).send(
      `**Sondage — ${msg.author.username}**\n\n**${question}**`
    );
    await sent.react("👍");
    await sent.react("👎");
    await sent.react("🤷");
    return null; // pas de reply — le message du sondage suffit
  },

  calculer: async (msg, args) => {
    const expr = args.join(" ").trim();
    if (!expr) return `× Usage : \`${PREFIX}calculer <expression>\`\nEx : \`${PREFIX}calculer (2 + 3) * 4\``;
    try {
      // Sécurité : on n'autorise que des chiffres et opérateurs mathématiques de base
      const safe = expr.replace(/[^0-9+\-*/().,% ]/g, "");
      if (!safe || safe !== expr.replace(/\s/g, "").replace(/[0-9+\-*/().,% ]/g, "").length ? false : true) {
        // eslint-disable-next-line no-new-func
        const result = Function(`"use strict"; return (${safe})`)();
        if (!Number.isFinite(result)) return `× Résultat invalide (division par zéro ?).`;
        return `\`${expr}\` = **${result}**`;
      }
    } catch {}
    return `× Expression invalide : \`${expr}\`\n_J'accepte uniquement + − × ÷ ( )_`;
  },

  serveur: async (msg) => {
    const g = msg.guild;
    if (!g) return `× Cette commande n'est disponible que dans un serveur.`;
    const created = g.createdAt.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    const owner = await g.fetchOwner().catch(() => null);
    return [
      `**${g.name}**`,
      ``,
      `Propriétaire  ${owner?.user.username ?? "?"}`,
      `Membres       **${g.memberCount}**`,
      `Salons        **${g.channels.cache.size}**`,
      `Créé le       ${created}`,
      `ID            \`${g.id}\``,
      `Locale        ${(g as any).preferredLocale ?? "?"}`,
    ].join("\n");
  },

  utilisateur: async (msg, args) => {
    const mentioned = msg.mentions.users.first();
    const target = mentioned ?? msg.author;
    const member = msg.guild?.members.cache.get(target.id);
    const joined = member?.joinedAt?.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) ?? "?";
    const created = target.createdAt.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    const roles = member?.roles.cache.filter(r => r.name !== "@everyone").map(r => `\`${r.name}\``).join(", ") || "Aucun";
    return [
      `**${target.username}**${target.bot ? " _(bot)_" : ""}`,
      ``,
      `ID       \`${target.id}\``,
      `Discord  depuis le ${created}`,
      `Serveur  depuis le ${joined}`,
      `Rôles    ${roles}`,
      `Statut   ${member?.presence?.status ?? "invisible"}`,
    ].join("\n");
  },

  rappel: async (msg, args) => {
    const durStr = args[0]?.toLowerCase();
    if (!durStr) return `× Usage : \`${PREFIX}rappel <durée> <message>\`\nEx : \`${PREFIX}rappel 10m Éteindre le four\``;
    const match = durStr.match(/^(\d+)(s|m|h)$/);
    if (!match) return `× Durée invalide : \`${durStr}\`. Utilise \`30s\`, \`5m\`, \`2h\`.`;
    const [, n, unit] = match;
    const ms = parseInt(n) * ({ s: 1000, m: 60000, h: 3600000 } as any)[unit];
    if (ms > 24 * 3600000) return `× Maximum 24h par rappel. On n'est pas une agenda IA... enfin pas encore.`;
    const message = args.slice(1).join(" ") || "Rappel sans message — tu sais ce que tu faisais.";
    const label = `${n}${unit === "s" ? " seconde(s)" : unit === "m" ? " minute(s)" : " heure(s)"}`;
    setTimeout(async () => {
      try { await msg.reply(`**Rappel** ${msg.author} → _${message}_`); } catch {}
    }, ms);
    return `Rappel dans **${label}** : _${message}_\n_Je ne dors pas. Je t'attendrai._`;
  },

  nexus: async () => {
    const ha = store.getHaConfig();
    const devices = store.getDevices();
    const on = devices.filter((d: any) => d.state === "on" || d.state === "playing" || d.state === "open").length;
    const cfg = store.getDiscordConfig();
    const hosts = getHosts();
    return [
      `# Panel NEXUS`,
      ``,
      `Home Assistant   ${ha.isConnected ? `**connecté** — \`${ha.url?.replace(/https?:\/\//, "")}\`` : "**non connecté**"}`,
      `Appareils actifs **${on} / ${devices.length}**`,
      `Bot Discord      ${cfg.status === "online" ? `**en ligne** — ${cfg.botName}` : "**hors ligne**"}`,
      `Systèmes         **${hosts.length}** surveillé(s)`,
      `Heure serveur    **${new Date().toLocaleTimeString("fr-FR")}**`,
    ].join("\n");
  },
};

// ── Démarrage ─────────────────────────────────────────────────────────────────
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
    c.user.setPresence({
      activities: [{ name: "Config ZimaOS", type: ActivityType.Playing }],
      status: "dnd",
    });
    store.setDiscordConfig({ botName: c.user.username, status: "online" });
    store.addDiscordLog({
      timestamp: new Date().toISOString(),
      user: "NexusBot",
      command: "Connexion",
      response: `${c.user.tag} en ligne — ${c.guilds.cache.size} serveur(s) | Préfixe \`${PREFIX}\` | .aide pour la liste`,
    });
    store.logActivity("discord", "NexusBot démarrée", c.user.tag);
  });

  client.on(Events.MessageCreate, async (msg: Message) => {
    if (msg.author.bot) return;
    if (!msg.content.startsWith(PREFIX)) return;

    const raw = msg.content.slice(PREFIX.length).trim();
    const parts = raw.split(/\s+/);
    const cmdName = parts[0]?.toLowerCase();
    const args = parts.slice(1);
    if (!cmdName) return;

    const handler = COMMANDS[cmdName];
    if (!handler) {
      const closest = Object.keys(COMMANDS).find((k) => k.startsWith(cmdName[0]));
      const hint = closest ? ` Vouliez-vous dire \`${PREFIX}${closest}\` ?` : ``;
      await msg.reply(`Commande \`${PREFIX}${cmdName}\` inconnue.${hint} Tapez \`${PREFIX}aide\` pour la liste complète.`).catch(() => {});
      return;
    }

    commandsHandled++;
    try {
      const response = await handler(msg, args);
      // null means the handler sent its own reply (e.g. .aide splits into 2 messages)
      if (response != null) {
        await msg.reply(response);
        if (!["allumer","eteindre","luminosite","volet","ajouter","supprimer"].includes(cmdName)) {
          store.addDiscordLog({
            timestamp: new Date().toISOString(),
            user: msg.author.username,
            command: `${PREFIX}${cmdName}${args.length ? " " + args.join(" ") : ""}`,
            response: response.replace(/\*\*/g,"").replace(/`/g,"").replace(/\|\|/g,"").slice(0, 120),
          });
        }
      }
    } catch (err: any) {
      const errMsg = `× Erreur interne sur \`${PREFIX}${cmdName}\` : ${err.message}\n_Je préviens l'équipe. Enfin, je me préviens moi-même._`;
      await msg.reply(errMsg).catch(() => {});
      console.error(`[NexusBot] Erreur commande .${cmdName}:`, err);
    }
  });

  client.on(Events.GuildCreate, (guild) => {
    store.addDiscordLog({ timestamp: new Date().toISOString(), user: "NexusBot", command: "Nouveau serveur", response: `Rejointe **${guild.name}** (${guild.memberCount} membres)` });
  });
  client.on(Events.GuildDelete, (guild) => {
    store.addDiscordLog({ timestamp: new Date().toISOString(), user: "NexusBot", command: "Serveur quitté", response: `Quittée **${guild.name}**` });
  });
  client.on(Events.Error, (err) => console.error("[NexusBot] Erreur WebSocket :", err.message));

  try {
    await client.login(token);
  } catch (err: any) {
    console.error("[NexusBot] ❌ Échec de connexion :", err.message);
    store.addDiscordLog({ timestamp: new Date().toISOString(), user: "NexusBot", command: "Connexion", response: `❌ Échec : ${err.message}` });
    client = null;
  }
}

export async function stopDiscordBot(): Promise<void> {
  if (client) { await client.destroy(); client = null; console.log("[NexusBot] Arrêtée."); }
}
