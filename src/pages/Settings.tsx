import React, { useState, useEffect } from "react";
import {
  User, Lock, Sliders, RefreshCw, Eye, EyeOff, Check, AlertTriangle,
  Palette, Shapes, Type, Sparkles, Save, Play, History, Trash2, HardDrive,
  Server, Wifi, MessageSquare, Cloud, Plus, ChevronDown, ChevronUp, TestTube,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence } from "motion/react";
import {
  logoColors, getThemeColor, getLogoStyle, getLetterStyle,
  getContainerShape, getFontClass,
  type LogoColor, type LogoStyle,
} from "../lib/theme";
import Splashscreen, { BOOT_ANIMATION_NAMES, BOOT_VARIANTS } from "../components/Splashscreen";
import axios from "axios";

const TABS = ["profil", "logo", "boot", "systeme", "hotes", "activite"] as const;
type Tab = typeof TABS[number];

const FONT_OPTIONS: { id: LogoStyle["font"]; label: string }[] = [
  { id: "system", label: "Défaut" }, { id: "serif", label: "Serif" },
  { id: "mono",   label: "Mono"   }, { id: "impact", label: "Impact" },
  { id: "italic", label: "Italic" }, { id: "display", label: "Display" },
];
const EFFECT_OPTIONS: { id: LogoStyle["effect"]; label: string }[] = [
  { id: "glow",     label: "Glow"     }, { id: "neon",     label: "Neon"     },
  { id: "gradient", label: "Gradient" }, { id: "outline",  label: "Outline"  },
  { id: "hologram", label: "Holo"     }, { id: "plain",    label: "Basique"  },
];
const SHAPE_OPTIONS: { id: LogoStyle["shape"]; label: string }[] = [
  { id: "rounded", label: "Arrondi" }, { id: "square", label: "Carré" }, { id: "circle", label: "Cercle" },
];
const BOOT_DESCRIPTIONS: Record<string, string> = {
  Nexus: "Logo animé avec lueurs", Windows: "Style Windows 11", iOS: "Style démarrage iPhone",
  Matrix: "Pluie de code japonais", Minimal: "Texte épuré, lettre par lettre",
  Netflix: "Intro rouge cinématique", Void: "Trou noir cosmique",
  Apple: "Démarrage macOS épuré", HUD: "Radar militaire & boot log",
  Aurora: "Aurores boréales animées", Glitch: "Corruption numérique",
  Storm: "Tempête électrique", "Rétro": "Terminal DOS old school",
  TikTok: "Logo décalé R/G/B style TikTok", Sakura: "Pétales de cerisier",
  Or: "Luxe & élégance dorée", Feu: "Flammes & braises animées",
  Glace: "Cristaux de glace & froideur", "Nexus OS": "Boot terminal ASCII",
  Hologramme: "Cercles concentriques", "Glitch RGB": "Aberration chromatique intense",
  Radar: "Sweep radar révélateur", DNA: "Double hélice animée",
};

// ── Mini visual thumbnail for each boot animation ─────────────────────────────
function BootThumb({ anim }: { anim: string }) {
  const def = BOOT_VARIANTS[anim];
  if (!def) return <div className="w-full rounded-lg" style={{ paddingBottom: "62%", background: "#111" }} />;
  return (
    <div className="relative w-full rounded-lg overflow-hidden" style={{ paddingBottom: "62%", background: def.bg }}>
      <div className="absolute inset-0">
        {/* Deco layer */}
        {def.deco === "grid" && (
          <div className="absolute inset-0" style={{
            backgroundImage: `linear-gradient(${def.accent}22 1px, transparent 1px), linear-gradient(90deg, ${def.accent}22 1px, transparent 1px)`,
            backgroundSize: "9px 9px"
          }} />
        )}
        {def.deco === "matrix" && (
          <div className="absolute inset-0" style={{
            background: `repeating-linear-gradient(0deg, ${def.accent}20 0px, transparent 3px, transparent 9px)`,
          }} />
        )}
        {def.deco === "scan" && (
          <div className="absolute inset-x-0" style={{
            top: "35%", height: "30%",
            background: `linear-gradient(transparent, ${def.accent}20, transparent)`
          }} />
        )}
        {def.deco === "glitch" && (
          <div className="absolute inset-0" style={{
            background: `repeating-linear-gradient(0deg, ${def.accent}18 0px, transparent 2px, transparent 5px)`
          }} />
        )}
        {(def.deco === "aurora" || def.deco === "particles") && (
          <div className="absolute inset-0" style={{
            background: `linear-gradient(180deg, ${def.accent}18 0%, transparent 60%)`
          }} />
        )}
        {/* Glow */}
        <div className="absolute inset-0" style={{
          background: `radial-gradient(ellipse at 50% 25%, ${def.accentGlow}, transparent 70%)`,
          opacity: 0.55,
        }} />
        {/* Text + progress */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-2">
          {def.title ? (
            <span style={{
              color: def.accent, fontSize: 7, fontWeight: 900, letterSpacing: "0.12em",
              textAlign: "center", lineHeight: 1,
              fontFamily: def.font.includes("mono") ? "monospace" : "inherit",
            }}>
              {def.title.slice(0, 14)}
            </span>
          ) : (
            <div className="h-5 w-5 rounded-full" style={{ border: `2px solid ${def.accent}`, opacity: 0.7 }} />
          )}
          <div className="w-[60%] h-0.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
            <div className="h-full rounded-full" style={{ width: "65%", background: def.accent }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)}
      className="h-7 w-12 rounded-full relative transition-all flex-shrink-0"
      style={{ background: on ? "rgba(99,102,241,0.35)" : "rgba(255,255,255,0.06)", border: `1px solid ${on ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.1)"}` }}>
      <div className="absolute top-1 h-5 w-5 rounded-full transition-all duration-200"
        style={{ background: on ? "#6366f1" : "#374151", left: on ? "calc(100% - 22px)" : 4 }} />
    </button>
  );
}

// ── Card wrapper ──────────────────────────────────────────────────────────────
function Card({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-5 space-y-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-indigo-400" />
        <h2 className="text-sm font-bold text-white">{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ── Field ─────────────────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider block">{label}</label>
      {children}
    </div>
  );
}

const INPUT_STYLE: React.CSSProperties = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" };

export default function Settings() {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>((searchParams.get("tab") as Tab) || "profil");

  // ── Profil ────────────────────────────────────────────────────────────────
  const [username,   setUsername]   = useState(() => localStorage.getItem("nexus_username") || "Mathieu");
  const [email,      setEmail]      = useState(() => localStorage.getItem("nexus_email")    || "mathieu@nexus.local");
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd,     setNewPwd]     = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showPwd,    setShowPwd]    = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // ── Logo ──────────────────────────────────────────────────────────────────
  const [colorId,   setColorId]   = useState(() => localStorage.getItem("nexus-logo-color") || "indigo");
  const [logoStyle, setLogoStyle] = useState<LogoStyle>(getLogoStyle);

  // ── Boot ──────────────────────────────────────────────────────────────────
  const [bootAnim,    setBootAnim]    = useState(() => localStorage.getItem("nexus_boot_animation") || "Nexus");
  const [showBoot,    setShowBoot]    = useState(() => localStorage.getItem("nexus-show-boot") !== "false");
  const [previewAnim, setPreviewAnim] = useState<string | null>(null);

  // ── Système — HA ──────────────────────────────────────────────────────────
  const [haUrl,     setHaUrl]     = useState("");
  const [haToken,   setHaToken]   = useState("");
  const [haStatus,  setHaStatus]  = useState<{ ok: boolean; msg: string } | null>(null);
  const [haSaving,  setHaSaving]  = useState(false);
  const [haTesting, setHaTesting] = useState(false);

  // ── Système — Discord ─────────────────────────────────────────────────────
  const [discordPrefix,  setDiscordPrefix]  = useState(".");
  const [discordStatus,  setDiscordStatus]  = useState("dnd");
  const [discordSaving,  setDiscordSaving]  = useState(false);

  // ── Système — Météo ───────────────────────────────────────────────────────
  const [meteoCity,    setMeteoCity]    = useState("");
  const [meteoSearch,  setMeteoSearch]  = useState("");
  const [meteoResults, setMeteoResults] = useState<{ name: string; country: string; lat: number; lng: number; tz: string }[]>([]);
  const [meteoSearching, setMeteoSearching] = useState(false);
  const [meteoSaved,   setMeteoSaved]   = useState(false);

  // ── Hôtes ─────────────────────────────────────────────────────────────────
  const [hosts,     setHosts]     = useState<any[]>([]);
  const [hostEdits, setHostEdits] = useState<Record<string, any>>({});
  const [hostSaved, setHostSaved] = useState<Record<string, boolean>>({});
  const [showAddHost, setShowAddHost] = useState(false);
  const [newHost, setNewHost] = useState({ name: "", ip: "", sshUser: "", sshPassword: "", filesRoot: "/DATA" });
  const [addingHost, setAddingHost] = useState(false);

  // ── Activité ──────────────────────────────────────────────────────────────
  const [activity, setActivity] = useState<any[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  // ── Load data on tab switch ───────────────────────────────────────────────
  useEffect(() => {
    if (tab === "systeme") {
      axios.get("/api/home-assistant/config").then(r => {
        setHaUrl(r.data.url || "");
      }).catch(() => {});
      axios.get("/api/discord/config").then(r => {
        setDiscordPrefix(r.data.prefix || ".");
        setDiscordStatus(r.data.status || "dnd");
      }).catch(() => {});
      axios.get("/api/meteo").then(r => {
        setMeteoCity(r.data.city || "");
      }).catch(() => {});
    }
    if (tab === "hotes") {
      axios.get("/api/hosts").then(r => {
        setHosts(r.data.hosts || []);
      }).catch(() => {});
    }
    if (tab === "activite") {
      setActivityLoading(true);
      axios.get("/api/activity?limit=100")
        .then(r => setActivity(r.data.entries))
        .finally(() => setActivityLoading(false));
    }
  }, [tab]);

  const selectedColor = logoColors.find(c => c.id === colorId) || logoColors[0];
  const letterCSS  = getLetterStyle(selectedColor, logoStyle);
  const shapeClass = getContainerShape(logoStyle);
  const fontClass  = getFontClass(logoStyle);

  const logAction = (category: string, action: string, details?: string) =>
    axios.post("/api/activity", { category, action, details }).catch(() => {});

  const applyColor = (id: string) => {
    setColorId(id);
    localStorage.setItem("nexus-logo-color", id);
    window.dispatchEvent(new Event("nexus-logo-color-change"));
    logAction("settings", "Couleur du logo modifiée", id);
  };
  const applyStyle = (next: LogoStyle) => {
    setLogoStyle(next);
    localStorage.setItem("nexus-logo-style", JSON.stringify(next));
    window.dispatchEvent(new Event("nexus-logo-style-change"));
  };

  const saveProfile = (e: React.FormEvent) => {
    e.preventDefault(); setProfileMsg(null);
    const storedPwd = localStorage.getItem("nexus_password") || "260209";
    if (currentPwd !== storedPwd) { setProfileMsg({ type: "err", text: "Mot de passe actuel incorrect" }); return; }
    if (newPwd && newPwd !== confirmPwd) { setProfileMsg({ type: "err", text: "Les mots de passe ne correspondent pas" }); return; }
    localStorage.setItem("nexus_username", username);
    localStorage.setItem("nexus_email", email);
    if (newPwd) localStorage.setItem("nexus_password", newPwd);
    window.dispatchEvent(new Event("nexus-profile-update"));
    logAction("settings", "Profil mis à jour");
    setProfileMsg({ type: "ok", text: "Profil mis à jour" });
    setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
    setTimeout(() => setProfileMsg(null), 3000);
  };

  const saveBoot = () => {
    localStorage.setItem("nexus_boot_animation", bootAnim);
    localStorage.setItem("nexus-show-boot", String(showBoot));
    logAction("settings", "Animation de démarrage enregistrée", bootAnim);
  };

  const saveHa = async () => {
    setHaSaving(true);
    try { await axios.put("/api/home-assistant/config", { url: haUrl, token: haToken || undefined }); }
    finally { setHaSaving(false); }
  };
  const testHa = async () => {
    setHaTesting(true); setHaStatus(null);
    try {
      const r = await axios.post("/api/home-assistant/test");
      setHaStatus(r.data.ok ? { ok: true, msg: `Connecté (HTTP ${r.data.status})` } : { ok: false, msg: r.data.error || "Échec" });
    } catch { setHaStatus({ ok: false, msg: "Erreur réseau" }); }
    finally { setHaTesting(false); }
  };

  const saveDiscord = async () => {
    setDiscordSaving(true);
    try { await axios.put("/api/discord/config", { prefix: discordPrefix, status: discordStatus }); }
    finally { setDiscordSaving(false); }
  };

  const searchMeteo = async (q: string) => {
    setMeteoSearch(q);
    if (!q.trim()) { setMeteoResults([]); return; }
    setMeteoSearching(true);
    try {
      const { data } = await axios.get(`/api/meteo/search?q=${encodeURIComponent(q)}`);
      setMeteoResults(data.results || []);
    } catch { setMeteoResults([]); }
    finally { setMeteoSearching(false); }
  };
  const applyMeteoCity = async (r: typeof meteoResults[0]) => {
    setMeteoSearch(""); setMeteoResults([]);
    await axios.post("/api/meteo/config", { latitude: r.lat, longitude: r.lng, city: r.name, timezone: r.tz });
    setMeteoCity(r.name);
    setMeteoSaved(true); setTimeout(() => setMeteoSaved(false), 2000);
  };

  const editHost = (id: string, field: string, val: string) =>
    setHostEdits(prev => ({ ...prev, [id]: { ...(prev[id] || {}), [field]: val } }));
  const saveHost = async (id: string, original: any) => {
    const patch = hostEdits[id] || {};
    try {
      await axios.put(`/api/hosts/${id}`, patch);
      setHostSaved(prev => ({ ...prev, [id]: true }));
      setHosts(prev => prev.map(h => h.id === id ? { ...h, ...patch } : h));
      setTimeout(() => setHostSaved(prev => ({ ...prev, [id]: false })), 2000);
    } catch {}
  };
  const removeHost = async (id: string) => {
    if (!confirm("Supprimer cet hôte ?")) return;
    await axios.delete(`/api/hosts/${id}`).catch(() => {});
    setHosts(prev => prev.filter(h => h.id !== id));
  };
  const addHost = async () => {
    if (!newHost.name || !newHost.ip) return;
    setAddingHost(true);
    try {
      const { data } = await axios.post("/api/hosts", newHost);
      setHosts(prev => [...prev, data.host]);
      setNewHost({ name: "", ip: "", sshUser: "", sshPassword: "", filesRoot: "/DATA" });
      setShowAddHost(false);
    } catch {} finally { setAddingHost(false); }
  };

  const DISC_STATUS_OPTIONS = [
    { value: "online", label: "En ligne 🟢" },
    { value: "idle",   label: "Inactif 🟡" },
    { value: "dnd",    label: "Ne pas déranger 🔴" },
    { value: "invisible", label: "Invisible ⚫" },
  ];

  return (
    <div className="p-5 space-y-5 max-w-3xl mx-auto">
      <div>
        <h1 className="text-xl font-black text-white tracking-wide">Réglages</h1>
        <p className="text-xs text-gray-600 mt-0.5">Configuration du système NEXUS</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 p-1 rounded-xl w-fit" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
        {[
          { id: "profil",   icon: User,           label: "Profil"      },
          { id: "logo",     icon: Sliders,        label: "Logo"        },
          { id: "boot",     icon: RefreshCw,      label: "Démarrage"   },
          { id: "systeme",  icon: Wifi,           label: "Système"     },
          { id: "hotes",    icon: Server,         label: "Hôtes"       },
          { id: "activite", icon: History,        label: "Activité"    },
        ].map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => setTab(id as Tab)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${tab === id ? "bg-white/8 text-white" : "text-gray-600 hover:text-gray-400"}`}>
            <Icon className="h-3.5 w-3.5" />{label}
          </button>
        ))}
      </div>

      {/* ── PROFIL ─────────────────────────────────────────────────────────── */}
      {tab === "profil" && (
        <form onSubmit={saveProfile} className="space-y-4 rounded-2xl p-5"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <h2 className="text-sm font-bold text-white">Profil utilisateur</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nom d'utilisateur">
              <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                className="w-full rounded-xl py-2.5 px-3 text-sm text-white focus:outline-none"
                style={INPUT_STYLE} />
            </Field>
            <Field label="Email">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full rounded-xl py-2.5 px-3 text-sm text-white focus:outline-none"
                style={INPUT_STYLE} />
            </Field>
          </div>
          <div className="border-t pt-4 space-y-3" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <h3 className="text-xs font-bold text-white">Changer le mot de passe</h3>
            {[
              { label: "Mot de passe actuel", value: currentPwd, setter: setCurrentPwd },
              { label: "Nouveau mot de passe", value: newPwd,    setter: setNewPwd    },
              { label: "Confirmer",            value: confirmPwd, setter: setConfirmPwd },
            ].map(({ label, value, setter }) => (
              <Field key={label} label={label}>
                <div className="relative">
                  <input type={showPwd ? "text" : "password"} value={value}
                    onChange={e => setter(e.target.value)} placeholder="••••••••"
                    className="w-full rounded-xl py-2.5 px-3 pr-11 text-sm text-white placeholder:text-gray-700 focus:outline-none"
                    style={INPUT_STYLE} />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-3 text-gray-600 hover:text-gray-400">
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>
            ))}
          </div>
          {profileMsg && (
            <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${
              profileMsg.type === "ok"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-red-500/10 text-red-400 border border-red-500/20"
            }`}>
              {profileMsg.type === "ok" ? <Check className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
              {profileMsg.text}
            </div>
          )}
          <button type="submit" className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white"
            style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.3)" }}>
            <Save className="h-3.5 w-3.5" />Enregistrer
          </button>
        </form>
      )}

      {/* ── LOGO ───────────────────────────────────────────────────────────── */}
      {tab === "logo" && (
        <div className="space-y-4 rounded-2xl p-5"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Configurateur Logo</h2>
            <div className={`w-12 h-12 ${shapeClass} flex items-center justify-center font-bold text-lg`} style={letterCSS}>
              <span className={fontClass}>N</span>
            </div>
          </div>
          {[
            { icon: Palette,  label: "Couleur", content: (
              <div className="flex flex-wrap gap-2">
                {logoColors.map(c => (
                  <button key={c.id} onClick={() => applyColor(c.id)} title={c.label}
                    className="h-8 w-8 rounded-lg transition-all hover:scale-110"
                    style={{ background: c.hex, border: colorId === c.id ? "2px solid white" : "2px solid transparent", boxShadow: colorId === c.id ? `0 0 10px ${c.glow}` : "none" }} />
                ))}
              </div>
            )},
            { icon: Sparkles, label: "Effet", content: (
              <div className="flex flex-wrap gap-2">
                {EFFECT_OPTIONS.map(({ id, label }) => (
                  <button key={id} onClick={() => applyStyle({ ...logoStyle, effect: id })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${logoStyle.effect === id ? "text-white" : "text-gray-600 hover:text-gray-400"}`}
                    style={logoStyle.effect === id ? { background: selectedColor.bg, border: `1px solid ${selectedColor.border}` } : { border: "1px solid rgba(255,255,255,0.06)" }}>
                    {label}
                  </button>
                ))}
              </div>
            )},
            { icon: Type,    label: "Police", content: (
              <div className="flex flex-wrap gap-2">
                {FONT_OPTIONS.map(({ id, label }) => (
                  <button key={id} onClick={() => applyStyle({ ...logoStyle, font: id })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${logoStyle.font === id ? "text-white" : "text-gray-600 hover:text-gray-400"}`}
                    style={logoStyle.font === id ? { background: selectedColor.bg, border: `1px solid ${selectedColor.border}` } : { border: "1px solid rgba(255,255,255,0.06)" }}>
                    {label}
                  </button>
                ))}
              </div>
            )},
            { icon: Shapes,  label: "Forme", content: (
              <div className="flex gap-2">
                {SHAPE_OPTIONS.map(({ id, label }) => (
                  <button key={id} onClick={() => applyStyle({ ...logoStyle, shape: id })}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${logoStyle.shape === id ? "text-white" : "text-gray-600 hover:text-gray-400"}`}
                    style={logoStyle.shape === id ? { background: selectedColor.bg, border: `1px solid ${selectedColor.border}` } : { border: "1px solid rgba(255,255,255,0.06)" }}>
                    {label}
                  </button>
                ))}
              </div>
            )},
          ].map(({ icon: Icon, label, content }) => (
            <div key={label}>
              <div className="flex items-center gap-1.5 mb-2">
                <Icon className="h-3.5 w-3.5 text-gray-500" />
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{label}</span>
              </div>
              {content}
            </div>
          ))}
          <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/8 border border-emerald-500/15 rounded-lg px-3 py-2">
            <Check className="h-3.5 w-3.5" />Les changements sont appliqués en temps réel
          </div>
        </div>
      )}

      {/* ── BOOT ───────────────────────────────────────────────────────────── */}
      {tab === "boot" && (
        <div className="space-y-5 rounded-2xl p-5"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Animation de démarrage</h2>
            <Toggle on={showBoot} onChange={setShowBoot} />
          </div>
          <p className="text-[10px] text-gray-600 -mt-2">
            {showBoot ? "L'animation s'affiche à chaque chargement." : "L'application s'ouvre directement."}
          </p>

          {/* Visual grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {BOOT_ANIMATION_NAMES.map((anim) => {
              const isSelected = bootAnim === anim;
              return (
                <div key={anim}
                  onClick={() => setBootAnim(anim)}
                  className="relative rounded-xl overflow-hidden cursor-pointer transition-all group"
                  style={{
                    border: isSelected ? "2px solid rgba(99,102,241,0.7)" : "2px solid rgba(255,255,255,0.06)",
                    boxShadow: isSelected ? "0 0 16px rgba(99,102,241,0.25)" : "none",
                  }}>
                  {/* Thumbnail */}
                  <BootThumb anim={anim} />
                  {/* Selected checkmark */}
                  {isSelected && (
                    <div className="absolute top-2 right-2 h-5 w-5 rounded-full flex items-center justify-center"
                      style={{ background: "#6366f1" }}>
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}
                  {/* Info row */}
                  <div className="flex items-center justify-between px-2 py-2"
                    style={{ background: "rgba(0,0,0,0.7)" }}>
                    <div className="min-w-0">
                      <p className={`text-[10px] font-bold truncate ${isSelected ? "text-indigo-300" : "text-gray-300"}`}>{anim}</p>
                      <p className="text-[8px] text-gray-600 truncate leading-tight">{BOOT_DESCRIPTIONS[anim] || ""}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setPreviewAnim(anim); }}
                      className="ml-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10 shrink-0">
                      <Play className="h-2.5 w-2.5 text-gray-400" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <button onClick={saveBoot}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white"
            style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.3)" }}>
            <Save className="h-3.5 w-3.5" />Enregistrer ({bootAnim})
          </button>
        </div>
      )}

      {/* ── SYSTÈME ────────────────────────────────────────────────────────── */}
      {tab === "systeme" && (
        <div className="space-y-4">
          {/* Home Assistant */}
          <Card title="Home Assistant" icon={Wifi}>
            <Field label="URL du serveur">
              <input value={haUrl} onChange={e => setHaUrl(e.target.value)}
                placeholder="http://192.168.1.25:8123"
                className="w-full rounded-xl py-2.5 px-3 text-sm text-white placeholder:text-gray-600 focus:outline-none font-mono"
                style={INPUT_STYLE} />
            </Field>
            <Field label="Token d'accès long durée">
              <input type="password" value={haToken} onChange={e => setHaToken(e.target.value)}
                placeholder="eyJhbGci…"
                className="w-full rounded-xl py-2.5 px-3 text-sm text-white placeholder:text-gray-600 focus:outline-none font-mono"
                style={INPUT_STYLE} />
              <p className="text-[9px] text-gray-600 mt-1">Laisser vide pour ne pas changer le token actuel.</p>
            </Field>
            {haStatus && (
              <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${
                haStatus.ok ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-red-500/10 text-red-400 border border-red-500/20"
              }`}>
                {haStatus.ok ? <Check className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                {haStatus.msg}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={saveHa} disabled={haSaving}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-50"
                style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.3)" }}>
                <Save className="h-3.5 w-3.5" />{haSaving ? "Enregistrement…" : "Enregistrer"}
              </button>
              <button onClick={testHa} disabled={haTesting}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-300 disabled:opacity-50"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <TestTube className="h-3.5 w-3.5" />{haTesting ? "Test…" : "Tester la connexion"}
              </button>
            </div>
          </Card>

          {/* Discord */}
          <Card title="NexusBot Discord" icon={MessageSquare}>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Préfixe de commande">
                <input value={discordPrefix} onChange={e => setDiscordPrefix(e.target.value.slice(0, 3))}
                  placeholder="." maxLength={3}
                  className="w-full rounded-xl py-2.5 px-3 text-sm text-white font-mono focus:outline-none"
                  style={INPUT_STYLE} />
              </Field>
              <Field label="Statut du bot">
                <select value={discordStatus} onChange={e => setDiscordStatus(e.target.value)}
                  className="w-full rounded-xl py-2.5 px-3 text-sm text-white focus:outline-none"
                  style={{ ...INPUT_STYLE, appearance: "none" }}>
                  {DISC_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>
            </div>
            <p className="text-[9px] text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-2">
              ⚠️ Le changement de statut prend effet au prochain redémarrage du serveur.
            </p>
            <button onClick={saveDiscord} disabled={discordSaving}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-50"
              style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.3)" }}>
              <Save className="h-3.5 w-3.5" />{discordSaving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </Card>

          {/* Météo */}
          <Card title="Météo — Localisation" icon={Cloud}>
            <p className="text-xs text-gray-500">Ville actuelle : <span className="text-white font-semibold">{meteoCity || "—"}</span></p>
            <Field label="Rechercher une ville">
              <div className="relative">
                <input value={meteoSearch} onChange={e => searchMeteo(e.target.value)}
                  placeholder="Lyon, Tokyo, Montreal…"
                  className="w-full rounded-xl py-2.5 px-3 text-sm text-white placeholder:text-gray-600 focus:outline-none"
                  style={INPUT_STYLE} />
                {meteoSearching && <RefreshCw className="absolute right-3 top-3 h-4 w-4 text-gray-600 animate-spin" />}
                {meteoResults.length > 0 && (
                  <div className="absolute top-full mt-1 left-0 right-0 z-50 rounded-xl overflow-hidden shadow-2xl"
                    style={{ background: "rgba(8,8,18,0.98)", border: "1px solid rgba(255,255,255,0.1)" }}>
                    {meteoResults.map((r, i) => (
                      <button key={i} onClick={() => applyMeteoCity(r)}
                        className="w-full px-3 py-2.5 text-left text-xs hover:bg-white/5 flex items-center justify-between">
                        <span className="text-white font-semibold">{r.name}</span>
                        <span className="text-gray-500 text-[10px]">{r.country}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Field>
            {meteoSaved && (
              <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                <Check className="h-3.5 w-3.5" />Localisation mise à jour
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── HÔTES ──────────────────────────────────────────────────────────── */}
      {tab === "hotes" && (
        <div className="space-y-4">
          {hosts.map((h) => {
            const edits = hostEdits[h.id] || {};
            const saved = hostSaved[h.id] || false;
            return (
              <div key={h.id} className="rounded-2xl p-5 space-y-4"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Server className="h-4 w-4 text-indigo-400" />
                    <div>
                      <p className="text-sm font-bold text-white">{h.name}</p>
                      <p className="text-[10px] text-gray-600 font-mono">{h.ip}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] px-2 py-1 rounded-full font-bold ${h.isLocal ? "text-emerald-400 bg-emerald-400/10" : h.sshConfigured ? "text-cyan-400 bg-cyan-400/10" : "text-amber-400 bg-amber-400/10"}`}>
                      {h.isLocal ? "LOCAL" : h.sshConfigured ? "SSH ✓" : "SSH non configuré"}
                    </span>
                    {!h.isLocal && (
                      <button onClick={() => removeHost(h.id)} className="text-red-500 hover:text-red-400 p-1">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {!h.isLocal && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Nom">
                        <input value={edits.name ?? h.name} onChange={e => editHost(h.id, "name", e.target.value)}
                          className="w-full rounded-xl py-2 px-3 text-xs text-white focus:outline-none"
                          style={INPUT_STYLE} />
                      </Field>
                      <Field label="Adresse IP">
                        <input value={edits.ip ?? h.ip} onChange={e => editHost(h.id, "ip", e.target.value)}
                          className="w-full rounded-xl py-2 px-3 text-xs text-white font-mono focus:outline-none"
                          style={INPUT_STYLE} />
                      </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Utilisateur SSH">
                        <input value={edits.sshUser ?? (h.sshUser || "")} onChange={e => editHost(h.id, "sshUser", e.target.value)}
                          placeholder="root"
                          className="w-full rounded-xl py-2 px-3 text-xs text-white font-mono focus:outline-none"
                          style={INPUT_STYLE} />
                      </Field>
                      <Field label="Mot de passe SSH">
                        <input type="password" value={edits.sshPassword ?? ""} onChange={e => editHost(h.id, "sshPassword", e.target.value)}
                          placeholder="••••••••"
                          className="w-full rounded-xl py-2 px-3 text-xs text-white focus:outline-none"
                          style={INPUT_STYLE} />
                      </Field>
                    </div>
                    <Field label="Racine des fichiers">
                      <input value={edits.filesRoot ?? h.filesRoot} onChange={e => editHost(h.id, "filesRoot", e.target.value)}
                        placeholder="/DATA"
                        className="w-full rounded-xl py-2 px-3 text-xs text-white font-mono focus:outline-none"
                        style={INPUT_STYLE} />
                    </Field>
                    <button onClick={() => saveHost(h.id, h)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white"
                      style={{ background: saved ? "rgba(34,197,94,0.2)" : "rgba(99,102,241,0.2)", border: `1px solid ${saved ? "rgba(34,197,94,0.4)" : "rgba(99,102,241,0.3)"}` }}>
                      {saved ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Save className="h-3.5 w-3.5" />}
                      {saved ? "Enregistré" : "Enregistrer"}
                    </button>
                  </div>
                )}
                {h.isLocal && (
                  <p className="text-[10px] text-gray-600">
                    Hôte local — les statistiques sont lues nativement, aucune configuration SSH nécessaire.
                  </p>
                )}
              </div>
            );
          })}

          {/* Add host */}
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
            <button onClick={() => setShowAddHost(!showAddHost)}
              className="w-full flex items-center justify-between px-5 py-4 text-sm font-bold text-white hover:bg-white/3 transition-colors"
              style={{ background: "rgba(255,255,255,0.02)" }}>
              <span className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-indigo-400" />Ajouter un hôte
              </span>
              {showAddHost ? <ChevronUp className="h-4 w-4 text-gray-600" /> : <ChevronDown className="h-4 w-4 text-gray-600" />}
            </button>
            {showAddHost && (
              <div className="px-5 pb-5 space-y-3" style={{ background: "rgba(255,255,255,0.02)" }}>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Nom">
                    <input value={newHost.name} onChange={e => setNewHost(p => ({ ...p, name: e.target.value }))}
                      placeholder="ZimaOS Bureau"
                      className="w-full rounded-xl py-2 px-3 text-xs text-white focus:outline-none"
                      style={INPUT_STYLE} />
                  </Field>
                  <Field label="Adresse IP">
                    <input value={newHost.ip} onChange={e => setNewHost(p => ({ ...p, ip: e.target.value }))}
                      placeholder="192.168.1.50"
                      className="w-full rounded-xl py-2 px-3 text-xs text-white font-mono focus:outline-none"
                      style={INPUT_STYLE} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Utilisateur SSH">
                    <input value={newHost.sshUser} onChange={e => setNewHost(p => ({ ...p, sshUser: e.target.value }))}
                      placeholder="root"
                      className="w-full rounded-xl py-2 px-3 text-xs text-white font-mono focus:outline-none"
                      style={INPUT_STYLE} />
                  </Field>
                  <Field label="Mot de passe SSH">
                    <input type="password" value={newHost.sshPassword} onChange={e => setNewHost(p => ({ ...p, sshPassword: e.target.value }))}
                      placeholder="••••••••"
                      className="w-full rounded-xl py-2 px-3 text-xs text-white focus:outline-none"
                      style={INPUT_STYLE} />
                  </Field>
                </div>
                <Field label="Racine fichiers">
                  <input value={newHost.filesRoot} onChange={e => setNewHost(p => ({ ...p, filesRoot: e.target.value }))}
                    placeholder="/DATA"
                    className="w-full rounded-xl py-2 px-3 text-xs text-white font-mono focus:outline-none"
                    style={INPUT_STYLE} />
                </Field>
                <button onClick={addHost} disabled={addingHost || !newHost.name || !newHost.ip}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-40"
                  style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.3)" }}>
                  <Plus className="h-3.5 w-3.5" />{addingHost ? "Ajout…" : "Ajouter"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ACTIVITÉ ───────────────────────────────────────────────────────── */}
      {tab === "activite" && (
        <div className="space-y-4 rounded-2xl p-5"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">Journal d'activité</h2>
              <p className="text-[10px] text-gray-600 mt-0.5">Chaque action est enregistrée sur le disque</p>
            </div>
            <button onClick={() => { setActivityLoading(true); axios.get("/api/activity?limit=100").then(r => setActivity(r.data.entries)).finally(() => setActivityLoading(false)); }}
              className="text-gray-600 hover:text-gray-400 p-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-cyan-300 rounded-lg px-3 py-2"
            style={{ background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.2)" }}>
            <HardDrive className="h-3.5 w-3.5 shrink-0" />
            Les réglages et configurations sont permanents. Seul ce journal est nettoyé hebdomadairement.
          </div>
          {activityLoading ? (
            <div className="text-center py-10 text-gray-700 text-xs">Chargement…</div>
          ) : activity.length === 0 ? (
            <div className="text-center py-10 text-gray-700 text-xs">Aucune activité enregistrée</div>
          ) : (
            <div className="divide-y max-h-96 overflow-y-auto custom-scrollbar" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
              {activity.map((entry) => (
                <div key={entry.id} className="flex items-start gap-3 py-2.5">
                  <span className="text-[9px] font-mono text-gray-700 shrink-0 mt-0.5 w-32">
                    {new Date(entry.ts).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 mt-0.5"
                    style={{ background: "rgba(99,102,241,0.1)", color: "#a5b4fc" }}>{entry.category}</span>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-300 truncate">{entry.action}</p>
                    {entry.details && <p className="text-[10px] text-gray-600 truncate">{entry.details}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {previewAnim && (
          <div className="fixed inset-0 z-[10000]">
            <Splashscreen variant={previewAnim} previewMode onComplete={() => setPreviewAnim(null)} />
            <button onClick={() => setPreviewAnim(null)}
              className="absolute top-5 right-5 z-[10001] text-[11px] font-semibold text-white px-3 py-1.5 rounded-lg"
              style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)" }}>
              Fermer l'aperçu
            </button>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
