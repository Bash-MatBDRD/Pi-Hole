import React, { useState, useEffect, useRef } from "react";
import {
  User, Lock, Eye, EyeOff, Check, AlertTriangle, Save, Play, History,
  Trash2, HardDrive, Server, Wifi, MessageSquare, Cloud, Plus, Bot,
  ChevronDown, ChevronUp, Palette, Shapes, Type, Sparkles, RefreshCw,
  TestTube, Gamepad2, MapPin, Activity, X, RotateCcw,
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

// ── Reuse small shared components ─────────────────────────────────────────────
const IS = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" };

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block">{label}</label>
      {children}
      {hint && <p className="text-[8px] text-gray-700">{hint}</p>}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input {...props}
      className={`w-full rounded-xl py-2.5 px-3 text-sm text-white placeholder:text-gray-700 focus:outline-none ${props.className || ""}`}
      style={{ ...IS, ...props.style }} />
  );
}

function Btn({ children, onClick, disabled, variant = "primary", className = "" }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean;
  variant?: "primary" | "danger" | "ghost"; className?: string;
}) {
  const styles = {
    primary: { background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.3)" },
    danger:  { background: "rgba(239,68,68,0.1)",  border: "1px solid rgba(239,68,68,0.25)" },
    ghost:   { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" },
  };
  const colors = { primary: "text-white", danger: "text-red-400", ghost: "text-gray-400" };
  return (
    <button onClick={onClick} disabled={disabled}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 ${colors[variant]} ${className}`}
      style={styles[variant]}>
      {children}
    </button>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)}
      className="h-6 w-11 rounded-full relative transition-all shrink-0"
      style={{ background: on ? "rgba(99,102,241,0.35)" : "rgba(255,255,255,0.06)", border: `1px solid ${on ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.1)"}` }}>
      <div className="absolute top-0.5 h-5 w-5 rounded-full transition-all duration-200"
        style={{ background: on ? "#6366f1" : "#374151", left: on ? "calc(100% - 22px)" : 2 }} />
    </button>
  );
}

function Section({ id, icon: Icon, title, badge, children }: {
  id: string; icon: React.ElementType; title: string; badge?: string; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/3 transition-all">
        <div className="p-1.5 rounded-lg" style={{ background: "rgba(99,102,241,0.1)" }}>
          <Icon className="h-4 w-4 text-indigo-400" />
        </div>
        <span className="text-sm font-bold text-white flex-1 text-left">{title}</span>
        {badge && (
          <span className="text-[9px] text-gray-500 px-2 py-0.5 rounded-full"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>{badge}</span>
        )}
        {open ? <ChevronUp className="h-3.5 w-3.5 text-gray-600" /> : <ChevronDown className="h-3.5 w-3.5 text-gray-600" />}
      </button>
      {open && <div className="px-5 pb-5 space-y-4">{children}</div>}
    </div>
  );
}

const FONT_OPTS: { id: LogoStyle["font"]; label: string }[] = [
  { id: "system", label: "Défaut" }, { id: "serif", label: "Serif" },
  { id: "mono",   label: "Mono"   }, { id: "impact", label: "Impact" },
  { id: "italic", label: "Italic" }, { id: "display", label: "Display" },
];
const EFFECT_OPTS: { id: LogoStyle["effect"]; label: string }[] = [
  { id: "glow", label: "Glow" }, { id: "neon", label: "Neon" },
  { id: "gradient", label: "Gradient" }, { id: "outline", label: "Outline" },
  { id: "hologram", label: "Holo" }, { id: "plain", label: "Basique" },
];
const SHAPE_OPTS: { id: LogoStyle["shape"]; label: string }[] = [
  { id: "rounded", label: "Arrondi" }, { id: "square", label: "Carré" }, { id: "circle", label: "Cercle" },
];

const DISC_STATUS_OPTS = [
  { value: "online",    label: "En ligne 🟢"         },
  { value: "idle",      label: "Inactif 🟡"          },
  { value: "dnd",       label: "Ne pas déranger 🔴"  },
  { value: "invisible", label: "Invisible ⚫"        },
];

function BootThumb({ anim }: { anim: string }) {
  const def = BOOT_VARIANTS[anim];
  if (!def) return <div className="w-full rounded-lg" style={{ paddingBottom: "62%", background: "#111" }} />;
  return (
    <div className="relative w-full rounded-lg overflow-hidden" style={{ paddingBottom: "62%", background: def.bg }}>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-2">
        <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 50% 25%, ${def.accentGlow}, transparent 70%)`, opacity: 0.55 }} />
        {def.title ? (
          <span style={{ color: def.accent, fontSize: 7, fontWeight: 900, letterSpacing: "0.12em", textAlign: "center", lineHeight: 1, position: "relative" }}>
            {def.title.slice(0, 14)}
          </span>
        ) : (
          <div className="h-5 w-5 rounded-full" style={{ border: `2px solid ${def.accent}`, opacity: 0.7, position: "relative" }} />
        )}
        <div className="w-[60%] h-0.5 rounded-full overflow-hidden relative" style={{ background: "rgba(255,255,255,0.1)" }}>
          <div className="h-full rounded-full" style={{ width: "65%", background: def.accent }} />
        </div>
      </div>
    </div>
  );
}

export default function Settings() {
  // ── Profile ───────────────────────────────────────────────────────────────
  const [username,   setUsername]   = useState(() => localStorage.getItem("nexus_username") || "Mathieu");
  const [email,      setEmail]      = useState(() => localStorage.getItem("nexus_email")    || "mathieu@nexus.local");
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd,     setNewPwd]     = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showPwd,    setShowPwd]    = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // ── Appearance ────────────────────────────────────────────────────────────
  const [colorId,    setColorId]    = useState(() => localStorage.getItem("nexus-logo-color") || "indigo");
  const [logoStyle,  setLogoStyle]  = useState<LogoStyle>(getLogoStyle);
  const [bootAnim,   setBootAnim]   = useState(() => localStorage.getItem("nexus_boot_animation") || "Nexus");
  const [showBoot,   setShowBoot]   = useState(() => localStorage.getItem("nexus-show-boot") !== "false");
  const [previewAnim, setPreviewAnim] = useState<string | null>(null);

  // ── HA ────────────────────────────────────────────────────────────────────
  const [haUrl,     setHaUrl]     = useState("");
  const [haToken,   setHaToken]   = useState("");
  const [haStatus,  setHaStatus]  = useState<{ ok: boolean; msg: string } | null>(null);
  const [haSaving,  setHaSaving]  = useState(false);
  const [haTesting, setHaTesting] = useState(false);
  const [showHaToken, setShowHaToken] = useState(false);

  // ── Discord ───────────────────────────────────────────────────────────────
  const [discordToken,  setDiscordToken]  = useState("");
  const [discordPrefix, setDiscordPrefix] = useState(".");
  const [discordStatus, setDiscordStatus] = useState("dnd");
  const [discordSaving, setDiscordSaving] = useState(false);
  const [discordRestarting, setDiscordRestarting] = useState(false);
  const [discordMsg,    setDiscordMsg]    = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [showDiscordToken, setShowDiscordToken] = useState(false);

  // ── Météo ─────────────────────────────────────────────────────────────────
  const [meteoCity,      setMeteoCity]      = useState("");
  const [meteoSearch,    setMeteoSearch]    = useState("");
  const [meteoResults,   setMeteoResults]   = useState<{ name: string; lat: number; lng: number; tz: string }[]>([]);
  const [meteoSearching, setMeteoSearching] = useState(false);
  const [meteoSaved,     setMeteoSaved]     = useState(false);

  // ── Hôtes ─────────────────────────────────────────────────────────────────
  const [hosts,       setHosts]       = useState<any[]>([]);
  const [hostEdits,   setHostEdits]   = useState<Record<string, any>>({});
  const [hostSaved,   setHostSaved]   = useState<Record<string, boolean>>({});
  const [showAddHost, setShowAddHost] = useState(false);
  const [newHost,     setNewHost]     = useState({ name: "", ip: "", sshUser: "", sshPassword: "", filesRoot: "/DATA" });
  const [addingHost,  setAddingHost]  = useState(false);

  // ── Activité ──────────────────────────────────────────────────────────────
  const [activity,        setActivity]        = useState<any[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityLoaded,  setActivityLoaded]  = useState(false);

  // ── Derived theme ─────────────────────────────────────────────────────────
  const selectedColor = logoColors.find(c => c.id === colorId) || logoColors[0];
  const letterCSS     = getLetterStyle(selectedColor, logoStyle);
  const shapeClass    = getContainerShape(logoStyle);
  const fontClass     = getFontClass(logoStyle);

  useEffect(() => {
    // Load HA + Discord config
    axios.get("/api/home-assistant/config").then(r => setHaUrl(r.data.url || "")).catch(() => {});
    axios.get("/api/discord/config").then(r => {
      setDiscordPrefix(r.data.prefix || ".");
      setDiscordStatus(r.data.status || "dnd");
    }).catch(() => {});
    axios.get("/api/meteo").then(r => setMeteoCity(r.data.city || "")).catch(() => {});
    axios.get("/api/hosts").then(r => setHosts(r.data.hosts || [])).catch(() => {});
  }, []);

  const log = (category: string, action: string, details?: string) =>
    axios.post("/api/activity", { category, action, details }).catch(() => {});

  // ── Profile save ──────────────────────────────────────────────────────────
  const saveProfile = (e: React.FormEvent) => {
    e.preventDefault(); setProfileMsg(null);
    const stored = localStorage.getItem("nexus_password") || "260209";
    if (currentPwd !== stored) { setProfileMsg({ type: "err", text: "Mot de passe actuel incorrect" }); return; }
    if (newPwd && newPwd !== confirmPwd) { setProfileMsg({ type: "err", text: "Les mots de passe ne correspondent pas" }); return; }
    localStorage.setItem("nexus_username", username);
    localStorage.setItem("nexus_email", email);
    if (newPwd) localStorage.setItem("nexus_password", newPwd);
    window.dispatchEvent(new Event("nexus-profile-update"));
    log("settings", "Profil mis à jour");
    setProfileMsg({ type: "ok", text: "Profil mis à jour" });
    setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
    setTimeout(() => setProfileMsg(null), 3000);
  };

  // ── Appearance ────────────────────────────────────────────────────────────
  const applyColor = (id: string) => {
    setColorId(id);
    localStorage.setItem("nexus-logo-color", id);
    window.dispatchEvent(new Event("nexus-logo-color-change"));
    log("settings", "Couleur du logo modifiée", id);
  };
  const applyStyle = (next: LogoStyle) => {
    setLogoStyle(next);
    localStorage.setItem("nexus-logo-style", JSON.stringify(next));
    window.dispatchEvent(new Event("nexus-logo-style-change"));
  };
  const saveBoot = () => {
    localStorage.setItem("nexus_boot_animation", bootAnim);
    localStorage.setItem("nexus-show-boot", String(showBoot));
    log("settings", "Animation de démarrage", bootAnim);
  };

  // ── HA ────────────────────────────────────────────────────────────────────
  const saveHa = async () => {
    setHaSaving(true);
    try { await axios.put("/api/home-assistant/config", { url: haUrl, ...(haToken ? { token: haToken } : {}) }); }
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

  // ── Discord ───────────────────────────────────────────────────────────────
  const saveDiscord = async () => {
    setDiscordSaving(true);
    try {
      await axios.put("/api/discord/config", {
        prefix: discordPrefix,
        status: discordStatus,
        ...(discordToken ? { token: discordToken } : {}),
      });
      setDiscordMsg({ type: "ok", text: "Paramètres Discord enregistrés" });
      setTimeout(() => setDiscordMsg(null), 3000);
    } catch { setDiscordMsg({ type: "err", text: "Erreur lors de l'enregistrement" }); }
    finally { setDiscordSaving(false); }
  };
  const restartBot = async () => {
    setDiscordRestarting(true); setDiscordMsg(null);
    try {
      const r = await axios.post("/api/discord/restart", discordToken ? { token: discordToken } : {});
      const connected = r.data.stats?.connected;
      setDiscordMsg({ type: connected ? "ok" : "err", text: connected ? "✅ NexusBot reconnecté !" : "❌ Échec de connexion (vérifiez le token)" });
    } catch (err: any) {
      setDiscordMsg({ type: "err", text: `Erreur : ${err.response?.data?.error || err.message}` });
    }
    finally { setDiscordRestarting(false); setTimeout(() => setDiscordMsg(null), 5000); }
  };

  // ── Météo ─────────────────────────────────────────────────────────────────
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
    setMeteoCity(r.name); setMeteoSaved(true); setTimeout(() => setMeteoSaved(false), 2500);
  };

  // ── Hôtes ─────────────────────────────────────────────────────────────────
  const editHost = (id: string, field: string, val: string) =>
    setHostEdits(p => ({ ...p, [id]: { ...(p[id] || {}), [field]: val } }));
  const saveHost = async (id: string) => {
    const patch = hostEdits[id] || {};
    try {
      await axios.put(`/api/hosts/${id}`, patch);
      setHostSaved(p => ({ ...p, [id]: true }));
      setHosts(p => p.map(h => h.id === id ? { ...h, ...patch } : h));
      setTimeout(() => setHostSaved(p => ({ ...p, [id]: false })), 2500);
    } catch {}
  };
  const removeHost = async (id: string) => {
    if (!confirm("Supprimer cet hôte ?")) return;
    await axios.delete(`/api/hosts/${id}`).catch(() => {});
    setHosts(p => p.filter(h => h.id !== id));
  };
  const addHost = async () => {
    if (!newHost.name || !newHost.ip) return;
    setAddingHost(true);
    try {
      const { data } = await axios.post("/api/hosts", newHost);
      setHosts(p => [...p, data.host]);
      setNewHost({ name: "", ip: "", sshUser: "", sshPassword: "", filesRoot: "/DATA" });
      setShowAddHost(false);
    } catch {} finally { setAddingHost(false); }
  };

  const loadActivity = async () => {
    setActivityLoading(true);
    try { const r = await axios.get("/api/activity?limit=100"); setActivity(r.data.entries || []); }
    finally { setActivityLoading(false); setActivityLoaded(true); }
  };

  const CAT_COLOR: Record<string, string> = {
    auth: "#6366f1", domotique: "#f59e0b", settings: "#06b6d4",
    system: "#22c55e", files: "#a855f7", discord: "#8b5cf6", notes: "#f97316",
  };

  return (
    <div className="p-5 space-y-4 max-w-3xl mx-auto">
      <div>
        <h1 className="text-xl font-black text-white tracking-wide">Réglages</h1>
        <p className="text-xs text-gray-600 mt-0.5">Configuration complète du système NEXUS</p>
      </div>

      {/* Boot animation preview overlay */}
      <AnimatePresence>
        {previewAnim && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setPreviewAnim(null)}>
            <div className="relative w-full max-w-md" onClick={e => e.stopPropagation()}>
              <Splashscreen key={previewAnim} onComplete={() => setPreviewAnim(null)} variant={previewAnim} previewMode />
              <button onClick={() => setPreviewAnim(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/80 transition-all z-10">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 1. PROFIL ──────────────────────────────────────────────────────── */}
      <Section id="profil" icon={User} title="Profil utilisateur">
        <form onSubmit={saveProfile} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nom d'utilisateur">
              <Input type="text" value={username} onChange={e => setUsername(e.target.value)} />
            </Field>
            <Field label="Email">
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} />
            </Field>
          </div>
          <div className="border-t pt-4 space-y-3" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <p className="text-xs font-bold text-gray-400">Changer le mot de passe</p>
            {[
              { label: "Mot de passe actuel", value: currentPwd, setter: setCurrentPwd },
              { label: "Nouveau mot de passe", value: newPwd, setter: setNewPwd },
              { label: "Confirmer",            value: confirmPwd, setter: setConfirmPwd },
            ].map(({ label, value, setter }) => (
              <Field key={label} label={label}>
                <div className="relative">
                  <Input type={showPwd ? "text" : "password"} value={value}
                    onChange={e => setter(e.target.value)} placeholder="••••••••" className="pr-10" />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-2.5 text-gray-600 hover:text-gray-400">
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>
            ))}
          </div>
          {profileMsg && (
            <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${profileMsg.type === "ok" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
              {profileMsg.type === "ok" ? <Check className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
              {profileMsg.text}
            </div>
          )}
          <Btn><Save className="h-3.5 w-3.5" />Enregistrer le profil</Btn>
        </form>
      </Section>

      {/* ── 2. APPARENCE ─────────────────────────────────────────────────── */}
      <Section id="apparence" icon={Palette} title="Apparence">
        {/* Logo preview */}
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-gray-400">Configurateur Logo</p>
          <div className={`w-10 h-10 ${shapeClass} flex items-center justify-center font-bold text-base`} style={letterCSS}>
            <span className={fontClass}>N</span>
          </div>
        </div>

        {/* Color */}
        <Field label="Couleur">
          <div className="flex flex-wrap gap-2">
            {logoColors.map(c => (
              <button key={c.id} onClick={() => applyColor(c.id)} title={c.label}
                className="h-7 w-7 rounded-lg transition-all hover:scale-110"
                style={{ background: c.hex, border: colorId === c.id ? "2px solid white" : "2px solid transparent", boxShadow: colorId === c.id ? `0 0 10px ${c.glow}` : "none" }} />
            ))}
          </div>
        </Field>

        {/* Effect + Font + Shape */}
        <div className="grid grid-cols-3 gap-3">
          <Field label="Effet">
            <div className="flex flex-wrap gap-1">
              {EFFECT_OPTS.map(({ id, label }) => (
                <button key={id} onClick={() => applyStyle({ ...logoStyle, effect: id })}
                  className={`px-2 py-1 rounded-lg text-[9px] font-semibold transition-all ${logoStyle.effect === id ? "text-white" : "text-gray-600 hover:text-gray-400"}`}
                  style={logoStyle.effect === id ? { background: selectedColor.bg, border: `1px solid ${selectedColor.border}` } : { border: "1px solid rgba(255,255,255,0.06)" }}>
                  {label}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Police">
            <div className="flex flex-wrap gap-1">
              {FONT_OPTS.map(({ id, label }) => (
                <button key={id} onClick={() => applyStyle({ ...logoStyle, font: id })}
                  className={`px-2 py-1 rounded-lg text-[9px] font-semibold transition-all ${logoStyle.font === id ? "text-white" : "text-gray-600 hover:text-gray-400"}`}
                  style={logoStyle.font === id ? { background: selectedColor.bg, border: `1px solid ${selectedColor.border}` } : { border: "1px solid rgba(255,255,255,0.06)" }}>
                  {label}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Forme">
            <div className="flex flex-wrap gap-1">
              {SHAPE_OPTS.map(({ id, label }) => (
                <button key={id} onClick={() => applyStyle({ ...logoStyle, shape: id })}
                  className={`px-2 py-1 rounded-lg text-[9px] font-semibold transition-all ${logoStyle.shape === id ? "text-white" : "text-gray-600 hover:text-gray-400"}`}
                  style={logoStyle.shape === id ? { background: selectedColor.bg, border: `1px solid ${selectedColor.border}` } : { border: "1px solid rgba(255,255,255,0.06)" }}>
                  {label}
                </button>
              ))}
            </div>
          </Field>
        </div>

        {/* Boot */}
        <div className="border-t pt-4 space-y-3" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-400">Animation de démarrage</p>
            <Toggle on={showBoot} onChange={setShowBoot} />
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {BOOT_ANIMATION_NAMES.map(anim => {
              const sel = bootAnim === anim;
              return (
                <div key={anim} onClick={() => setBootAnim(anim)}
                  className="relative rounded-xl overflow-hidden cursor-pointer group transition-all"
                  style={{ border: sel ? "2px solid rgba(99,102,241,0.7)" : "2px solid rgba(255,255,255,0.06)", boxShadow: sel ? "0 0 12px rgba(99,102,241,0.2)" : "none" }}>
                  <BootThumb anim={anim} />
                  {sel && <div className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full flex items-center justify-center" style={{ background: "#6366f1" }}><Check className="h-2.5 w-2.5 text-white" /></div>}
                  <div className="flex items-center justify-between px-1.5 py-1.5" style={{ background: "rgba(0,0,0,0.7)" }}>
                    <p className={`text-[9px] font-bold truncate ${sel ? "text-indigo-300" : "text-gray-400"}`}>{anim}</p>
                    <button onClick={(e) => { e.stopPropagation(); setPreviewAnim(anim); }}
                      className="ml-1 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10 shrink-0">
                      <Play className="h-2 w-2 text-gray-400" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <Btn onClick={saveBoot}><Save className="h-3.5 w-3.5" />Enregistrer ({bootAnim})</Btn>
        </div>
      </Section>

      {/* ── 3. HOME ASSISTANT ─────────────────────────────────────────────── */}
      <Section id="ha" icon={Wifi} title="Home Assistant">
        <Field label="URL du serveur HA">
          <Input type="url" value={haUrl} onChange={e => setHaUrl(e.target.value)} placeholder="http://192.168.1.25:8123" />
        </Field>
        <Field label="Token d'accès longue durée" hint="Profil HA → Sécurité → Jetons d'accès longue durée">
          <div className="relative">
            <Input type={showHaToken ? "text" : "password"} value={haToken}
              onChange={e => setHaToken(e.target.value)} placeholder="eyJ0eXAi…" className="pr-10" />
            <button type="button" onClick={() => setShowHaToken(!showHaToken)}
              className="absolute right-3 top-2.5 text-gray-600 hover:text-gray-400">
              {showHaToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>
        {haStatus && (
          <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${haStatus.ok ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
            {haStatus.ok ? <Check className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
            {haStatus.msg}
          </div>
        )}
        <div className="flex gap-2 flex-wrap">
          <Btn onClick={saveHa} disabled={haSaving}><Save className="h-3.5 w-3.5" />{haSaving ? "Enregistrement…" : "Enregistrer"}</Btn>
          <Btn onClick={testHa} disabled={haTesting} variant="ghost">
            <TestTube className="h-3.5 w-3.5" />{haTesting ? "Test en cours…" : "Tester la connexion"}
          </Btn>
        </div>
      </Section>

      {/* ── 4. DISCORD BOT ────────────────────────────────────────────────── */}
      <Section id="discord" icon={MessageSquare} title="Discord Bot">
        <Field label="Token du bot Discord" hint="discord.com/developers → Votre app → Bot → Token">
          <div className="relative">
            <Input type={showDiscordToken ? "text" : "password"} value={discordToken}
              onChange={e => setDiscordToken(e.target.value)} placeholder="MTIz…XXXXXXXX (laisser vide pour conserver)" className="pr-10" />
            <button type="button" onClick={() => setShowDiscordToken(!showDiscordToken)}
              className="absolute right-3 top-2.5 text-gray-600 hover:text-gray-400">
              {showDiscordToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Préfixe des commandes">
            <Input type="text" value={discordPrefix} onChange={e => setDiscordPrefix(e.target.value)} placeholder="." maxLength={3} />
          </Field>
          <Field label="Statut du bot">
            <select value={discordStatus} onChange={e => setDiscordStatus(e.target.value)}
              className="w-full rounded-xl py-2.5 px-3 text-sm text-white focus:outline-none"
              style={{ ...IS, appearance: "none" as any }}>
              {DISC_STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
        </div>
        {discordMsg && (
          <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${discordMsg.type === "ok" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
            {discordMsg.type === "ok" ? <Check className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
            {discordMsg.text}
          </div>
        )}
        <div className="flex gap-2 flex-wrap">
          <Btn onClick={saveDiscord} disabled={discordSaving}><Save className="h-3.5 w-3.5" />{discordSaving ? "Enregistrement…" : "Enregistrer"}</Btn>
          <Btn onClick={restartBot} disabled={discordRestarting} variant="ghost">
            <RotateCcw className={`h-3.5 w-3.5 ${discordRestarting ? "animate-spin" : ""}`} />
            {discordRestarting ? "Reconnexion…" : "Relancer le bot"}
          </Btn>
        </div>
      </Section>

      {/* ── 5. MÉTÉO ──────────────────────────────────────────────────────── */}
      <Section id="meteo" icon={Cloud} title="Météo">
        {meteoCity && (
          <div className="flex items-center gap-2 text-xs text-emerald-400 mb-2">
            <MapPin className="h-3.5 w-3.5" />Ville actuelle : <strong>{meteoCity}</strong>
            {meteoSaved && <span className="text-[9px] text-emerald-500 ml-1">✓ Mis à jour</span>}
          </div>
        )}
        <Field label="Rechercher une ville">
          <div className="relative">
            <Input type="text" value={meteoSearch}
              onChange={e => searchMeteo(e.target.value)} placeholder="Paris, Lyon, Toulouse…" />
            {meteoSearching && (
              <div className="absolute right-3 top-2.5"><RefreshCw className="h-4 w-4 text-gray-600 animate-spin" /></div>
            )}
          </div>
          {meteoResults.length > 0 && (
            <div className="mt-1 rounded-xl overflow-hidden" style={{ background: "rgba(8,8,20,0.98)", border: "1px solid rgba(255,255,255,0.08)" }}>
              {meteoResults.map((r, i) => (
                <button key={i} onClick={() => applyMeteoCity(r)}
                  className="w-full text-left px-3 py-2.5 text-xs text-white hover:bg-white/5 transition-colors flex items-center gap-2">
                  <MapPin className="h-3 w-3 text-gray-600 shrink-0" />
                  {r.name}
                </button>
              ))}
            </div>
          )}
        </Field>
      </Section>

      {/* ── 6. GAMING ─────────────────────────────────────────────────────── */}
      <Section id="gaming" icon={Gamepad2} title="Gaming Hub">
        <p className="text-xs text-gray-500">
          Configurez vos comptes Xbox, PlayStation et Steam dans la section{" "}
          <a href="/gaming" className="text-indigo-400 hover:underline font-semibold">Gaming Hub →</a>
        </p>
        <p className="text-[10px] text-gray-700">
          Gamertag Xbox · PSN ID · Steam ID + clé API — tout est configurable directement sur la page Gaming.
        </p>
      </Section>

      {/* ── 7. HÔTES SSH ──────────────────────────────────────────────────── */}
      <Section id="hotes" icon={Server} title="Hôtes SSH" badge={`${hosts.length} hôte${hosts.length !== 1 ? "s" : ""}`}>
        <div className="space-y-3">
          {hosts.map((h) => {
            const edit = hostEdits[h.id] || {};
            const val = (f: string) => (edit[f] ?? h[f] ?? "");
            const set = (f: string) => (e: React.ChangeEvent<HTMLInputElement>) => editHost(h.id, f, e.target.value);
            return (
              <div key={h.id} className="rounded-xl p-4 space-y-3"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${h.isLocal ? "bg-emerald-400" : h.sshConfigured ? "bg-indigo-400" : "bg-gray-600"}`} />
                    <span className="text-xs font-bold text-white">{val("name") || h.name}</span>
                    {h.isLocal && <span className="text-[8px] text-emerald-500 px-1.5 py-0.5 rounded" style={{ background: "rgba(16,185,129,0.1)" }}>local</span>}
                  </div>
                  <div className="flex gap-1">
                    {hostSaved[h.id] && <Check className="h-3.5 w-3.5 text-emerald-400" />}
                    <button onClick={() => saveHost(h.id)}
                      className="px-2 py-1 rounded-lg text-[9px] text-gray-500 hover:text-white hover:bg-white/8 transition-all">
                      Sauvegarder
                    </button>
                    {!h.isLocal && (
                      <button onClick={() => removeHost(h.id)}
                        className="px-2 py-1 rounded-lg text-[9px] text-red-600 hover:text-red-400 hover:bg-red-500/8 transition-all">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Nom"><Input type="text" value={val("name")} onChange={set("name")} /></Field>
                  <Field label="IP / Hostname"><Input type="text" value={val("ip")} onChange={set("ip")} placeholder="192.168.1.x" /></Field>
                  {!h.isLocal && (
                    <>
                      <Field label="Utilisateur SSH"><Input type="text" value={val("sshUser")} onChange={set("sshUser")} placeholder="root" /></Field>
                      <Field label="Mot de passe SSH"><Input type="password" value={val("sshPassword")} onChange={set("sshPassword")} placeholder="••••••••" /></Field>
                    </>
                  )}
                  <Field label="Chemin fichiers" hint="/DATA, /mnt/storage…"><Input type="text" value={val("filesRoot")} onChange={set("filesRoot")} placeholder="/DATA" /></Field>
                </div>
              </div>
            );
          })}

          {/* Add host */}
          {showAddHost ? (
            <div className="rounded-xl p-4 space-y-3"
              style={{ background: "rgba(99,102,241,0.04)", border: "1px solid rgba(99,102,241,0.15)" }}>
              <p className="text-xs font-bold text-white">Nouveau système</p>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Nom"><Input type="text" value={newHost.name} onChange={e => setNewHost(p => ({ ...p, name: e.target.value }))} placeholder="ZimaOS Bureau" /></Field>
                <Field label="IP"><Input type="text" value={newHost.ip} onChange={e => setNewHost(p => ({ ...p, ip: e.target.value }))} placeholder="192.168.1.x" /></Field>
                <Field label="Utilisateur"><Input type="text" value={newHost.sshUser} onChange={e => setNewHost(p => ({ ...p, sshUser: e.target.value }))} placeholder="root" /></Field>
                <Field label="Mot de passe"><Input type="password" value={newHost.sshPassword} onChange={e => setNewHost(p => ({ ...p, sshPassword: e.target.value }))} /></Field>
                <Field label="Chemin fichiers"><Input type="text" value={newHost.filesRoot} onChange={e => setNewHost(p => ({ ...p, filesRoot: e.target.value }))} placeholder="/DATA" /></Field>
              </div>
              <div className="flex gap-2">
                <Btn onClick={addHost} disabled={addingHost || !newHost.name || !newHost.ip}>
                  <Plus className="h-3.5 w-3.5" />{addingHost ? "Ajout…" : "Ajouter"}
                </Btn>
                <Btn onClick={() => setShowAddHost(false)} variant="ghost"><X className="h-3.5 w-3.5" />Annuler</Btn>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAddHost(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs text-gray-600 hover:text-gray-300 transition-all"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.08)" }}>
              <Plus className="h-3.5 w-3.5" />Ajouter un système
            </button>
          )}
        </div>
      </Section>

      {/* ── 8. ACTIVITÉ ───────────────────────────────────────────────────── */}
      <Section id="activite" icon={Activity} title="Journal d'activité">
        {!activityLoaded ? (
          <Btn onClick={loadActivity} disabled={activityLoading} variant="ghost">
            <History className="h-3.5 w-3.5" />{activityLoading ? "Chargement…" : "Charger les 100 dernières entrées"}
          </Btn>
        ) : (
          <div className="space-y-1 max-h-96 overflow-y-auto custom-scrollbar pr-1">
            {activity.length === 0 ? (
              <p className="text-xs text-gray-700 text-center py-4">Aucune activité enregistrée</p>
            ) : activity.map((e: any) => {
              const color = CAT_COLOR[e.category] || "#6b7280";
              return (
                <div key={e.id} className="flex items-start gap-2 px-2.5 py-2 rounded-lg"
                  style={{ background: "rgba(255,255,255,0.015)" }}>
                  <div className="h-1.5 w-1.5 rounded-full mt-1.5 shrink-0" style={{ background: color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[9px] font-semibold text-white/80 truncate">{e.action}</span>
                      <span className="text-[8px] text-gray-700 shrink-0 font-mono">
                        {new Date(e.ts).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })} {new Date(e.ts).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    {e.details && <p className="text-[8px] text-gray-600 truncate mt-0.5">{e.details}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}
