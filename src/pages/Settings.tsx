import React, { useState, useEffect } from "react";
import {
  User, Lock, Sliders, RefreshCw, Eye, EyeOff, Check, AlertTriangle,
  Palette, Shapes, Type, Sparkles, Save, Play, History, Trash2, HardDrive,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence } from "motion/react";
import {
  logoColors, getThemeColor, getLogoStyle, getLetterStyle,
  getContainerShape, getFontClass, getEffectClass,
  type LogoColor, type LogoStyle,
} from "../lib/theme";
import Splashscreen, { BOOT_ANIMATION_NAMES } from "../components/Splashscreen";
import axios from "axios";

const TABS = ["profil", "logo", "boot", "activite"] as const;
type Tab = typeof TABS[number];

const FONT_OPTIONS: { id: LogoStyle["font"]; label: string }[] = [
  { id: "system",  label: "Défaut"  },
  { id: "serif",   label: "Serif"   },
  { id: "mono",    label: "Mono"    },
  { id: "impact",  label: "Impact"  },
  { id: "italic",  label: "Italic"  },
  { id: "display", label: "Display" },
];

const EFFECT_OPTIONS: { id: LogoStyle["effect"]; label: string }[] = [
  { id: "glow",     label: "Glow"     },
  { id: "neon",     label: "Neon"     },
  { id: "gradient", label: "Gradient" },
  { id: "outline",  label: "Outline"  },
  { id: "hologram", label: "Holo"     },
  { id: "plain",    label: "Basique"  },
];

const SHAPE_OPTIONS: { id: LogoStyle["shape"]; label: string }[] = [
  { id: "rounded", label: "Arrondi" },
  { id: "square",  label: "Carré"   },
  { id: "circle",  label: "Cercle"  },
];

const BOOT_ANIMATIONS = BOOT_ANIMATION_NAMES;

const BOOT_DESCRIPTIONS: Record<string, string> = {
  Nexus: "Identité par défaut du panel", Windows: "Points de chargement classiques",
  iOS: "Anneau de progression épuré", Matrix: "Pluie de caractères verts",
  Minimal: "Le strict nécessaire", Netflix: "Flash rouge dramatique",
  Void: "Obscurité presque totale", Apple: "Anneau monochrome silencieux",
  HUD: "Grille tactique façon interface militaire", Aurora: "Vagues de lumière violette",
  Glitch: "Texte instable, interférences", Storm: "Particules électriques bleutées",
  "Rétro": "Segments façon console 8-bit", TikTok: "Flashs cyan énergiques",
  Sakura: "Particules roses délicates", Or: "Éclat doré premium",
  Feu: "Particules orange incandescentes", Glace: "Vagues cyan glacées",
  "Nexus OS": "Démarrage noyau façon terminal", Hologramme: "Balayage bleu holographique",
  "Glitch RGB": "Interférences chromatiques", Radar: "Balayage circulaire vert",
  DNA: "Vagues violettes en double hélice",
};

export default function Settings() {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>((searchParams.get("tab") as Tab) || "profil");

  // Profile state
  const [username,    setUsername]    = useState(() => localStorage.getItem("nexus_username") || "Mathieu");
  const [email,       setEmail]       = useState(() => localStorage.getItem("nexus_email")    || "mathieu@nexus.local");
  const [currentPwd,  setCurrentPwd]  = useState("");
  const [newPwd,      setNewPwd]      = useState("");
  const [confirmPwd,  setConfirmPwd]  = useState("");
  const [showPwd,     setShowPwd]     = useState(false);
  const [profileMsg,  setProfileMsg]  = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Logo state
  const [colorId,     setColorId]     = useState(() => localStorage.getItem("nexus-logo-color") || "indigo");
  const [logoStyle,   setLogoStyle]   = useState<LogoStyle>(getLogoStyle);

  // Boot state
  const [bootAnim,    setBootAnim]    = useState(() => localStorage.getItem("nexus_boot_animation") || "Nexus");
  const [showBoot,    setShowBoot]    = useState(() => localStorage.getItem("nexus-show-boot") !== "false");
  const [previewAnim, setPreviewAnim] = useState<string | null>(null);

  // Activity log state
  const [activity,    setActivity]    = useState<{ id: string; ts: number; category: string; action: string; details?: string }[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  useEffect(() => {
    if (tab !== "activite") return;
    setActivityLoading(true);
    axios.get("/api/activity?limit=100")
      .then((r) => setActivity(r.data.entries))
      .finally(() => setActivityLoading(false));
  }, [tab]);

  const selectedColor = logoColors.find(c => c.id === colorId) || logoColors[0];

  // Preview logo
  const letterCSS  = getLetterStyle(selectedColor, logoStyle);
  const shapeClass = getContainerShape(logoStyle);
  const fontClass  = getFontClass(logoStyle);

  const logAction = (category: string, action: string, details?: string) => {
    axios.post("/api/activity", { category, action, details }).catch(() => {});
  };

  // Apply logo changes live
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
    logAction("settings", "Style du logo modifié", `${next.effect}/${next.font}/${next.shape}`);
  };

  // Save profile
  const saveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    const storedPwd = localStorage.getItem("nexus_password") || "260209";
    if (currentPwd !== storedPwd) { setProfileMsg({ type: "err", text: "Mot de passe actuel incorrect" }); return; }
    if (newPwd && newPwd !== confirmPwd) { setProfileMsg({ type: "err", text: "Les mots de passe ne correspondent pas" }); return; }

    localStorage.setItem("nexus_username", username);
    localStorage.setItem("nexus_email", email);
    if (newPwd) localStorage.setItem("nexus_password", newPwd);
    window.dispatchEvent(new Event("nexus-profile-update"));
    logAction("settings", "Profil mis à jour", newPwd ? "nom, email et mot de passe" : "nom et email");

    setProfileMsg({ type: "ok", text: "Profil mis à jour avec succès" });
    setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
    setTimeout(() => setProfileMsg(null), 3000);
  };

  // Save boot
  const saveBoot = () => {
    localStorage.setItem("nexus_boot_animation", bootAnim);
    localStorage.setItem("nexus-show-boot", String(showBoot));
    logAction("settings", "Animation de démarrage enregistrée", bootAnim);
  };

  return (
    <div className="p-5 space-y-5 max-w-3xl mx-auto">
      <div>
        <h1 className="text-xl font-black text-white tracking-wide">Réglages</h1>
        <p className="text-xs text-gray-600 mt-0.5">Configuration du système NEXUS</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
        {[
          { id: "profil",   icon: User,      label: "Profil" },
          { id: "logo",     icon: Sliders,   label: "Logo" },
          { id: "boot",     icon: RefreshCw, label: "Démarrage" },
          { id: "activite", icon: History,   label: "Activité" },
        ].map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => setTab(id as Tab)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              tab === id
                ? "bg-white/8 text-white"
                : "text-gray-600 hover:text-gray-400"
            }`}>
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Profile tab */}
      {tab === "profil" && (
        <form onSubmit={saveProfile} className="space-y-4 rounded-2xl p-5"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <h2 className="text-sm font-bold text-white">Profil utilisateur</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-1 block">Nom d'utilisateur</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl py-2.5 px-3 text-sm text-white focus:outline-none transition-colors"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-1 block">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl py-2.5 px-3 text-sm text-white focus:outline-none transition-colors"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
            </div>
          </div>

          <div className="border-t pt-4 space-y-3" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <h3 className="text-xs font-bold text-white">Changer le mot de passe</h3>
            {[
              { label: "Mot de passe actuel", value: currentPwd, setter: setCurrentPwd },
              { label: "Nouveau mot de passe", value: newPwd,    setter: setNewPwd },
              { label: "Confirmer",           value: confirmPwd, setter: setConfirmPwd },
            ].map(({ label, value, setter }) => (
              <div key={label}>
                <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-1 block">{label}</label>
                <div className="relative">
                  <input type={showPwd ? "text" : "password"} value={value}
                    onChange={(e) => setter(e.target.value)} placeholder="••••••••"
                    className="w-full rounded-xl py-2.5 px-3 pr-11 text-sm text-white placeholder:text-gray-700 focus:outline-none transition-colors"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-3 text-gray-600 hover:text-gray-400 transition-colors">
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
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

          <button type="submit"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90"
            style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.3)" }}>
            <Save className="h-3.5 w-3.5" /> Enregistrer
          </button>
        </form>
      )}

      {/* Logo tab */}
      {tab === "logo" && (
        <div className="space-y-4 rounded-2xl p-5"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Configurateur Logo</h2>
            {/* Live preview */}
            <div className={`w-12 h-12 ${shapeClass} flex items-center justify-center font-bold text-lg`} style={letterCSS}>
              <span className={fontClass}>N</span>
            </div>
          </div>

          {/* Color picker */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Palette className="h-3.5 w-3.5 text-gray-500" />
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Couleur</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {logoColors.map((c) => (
                <button key={c.id} onClick={() => applyColor(c.id)} title={c.label}
                  className="h-8 w-8 rounded-lg transition-all hover:scale-110"
                  style={{
                    background: c.hex,
                    border: colorId === c.id ? `2px solid white` : "2px solid transparent",
                    boxShadow: colorId === c.id ? `0 0 10px ${c.glow}` : "none",
                  }} />
              ))}
            </div>
          </div>

          {/* Effect */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-gray-500" />
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Effet</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {EFFECT_OPTIONS.map(({ id, label }) => (
                <button key={id} onClick={() => applyStyle({ ...logoStyle, effect: id })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    logoStyle.effect === id
                      ? "text-white"
                      : "text-gray-600 hover:text-gray-400 hover:bg-white/4"
                  }`}
                  style={logoStyle.effect === id ? { background: selectedColor.bg, border: `1px solid ${selectedColor.border}` } : { border: "1px solid rgba(255,255,255,0.06)" }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Font */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Type className="h-3.5 w-3.5 text-gray-500" />
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Police</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {FONT_OPTIONS.map(({ id, label }) => (
                <button key={id} onClick={() => applyStyle({ ...logoStyle, font: id })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    logoStyle.font === id
                      ? "text-white"
                      : "text-gray-600 hover:text-gray-400 hover:bg-white/4"
                  }`}
                  style={logoStyle.font === id ? { background: selectedColor.bg, border: `1px solid ${selectedColor.border}` } : { border: "1px solid rgba(255,255,255,0.06)" }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Shape */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Shapes className="h-3.5 w-3.5 text-gray-500" />
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Forme</span>
            </div>
            <div className="flex gap-2">
              {SHAPE_OPTIONS.map(({ id, label }) => (
                <button key={id} onClick={() => applyStyle({ ...logoStyle, shape: id })}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                    logoStyle.shape === id
                      ? "text-white"
                      : "text-gray-600 hover:text-gray-400 hover:bg-white/4"
                  }`}
                  style={logoStyle.shape === id ? { background: selectedColor.bg, border: `1px solid ${selectedColor.border}` } : { border: "1px solid rgba(255,255,255,0.06)" }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/8 border border-emerald-500/15 rounded-lg px-3 py-2">
            <Check className="h-3.5 w-3.5" /> Les changements sont appliqués en temps réel
          </div>
        </div>
      )}

      {/* Boot tab */}
      {tab === "boot" && (
        <div className="space-y-4 rounded-2xl p-5"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <h2 className="text-sm font-bold text-white">Animation de démarrage</h2>

          {/* Show boot toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div>
              <p className="text-xs font-semibold text-white">Afficher au démarrage</p>
              <p className="text-[10px] text-gray-600 mt-0.5">Affiche l'animation à chaque chargement</p>
            </div>
            <button onClick={() => setShowBoot(!showBoot)}
              className="h-7 w-12 rounded-full relative transition-all"
              style={{ background: showBoot ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.06)", border: `1px solid ${showBoot ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.1)"}` }}>
              <div className="h-4 w-4 rounded-full transition-all duration-200"
                style={{ background: showBoot ? "#6366f1" : "#374151", transform: showBoot ? "translateX(20px) translateY(-2px)" : "translateX(4px) translateY(-2px)" }} />
            </button>
          </div>

          {/* Animation selection */}
          <div>
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Animation ({BOOT_ANIMATIONS.length} options)</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {BOOT_ANIMATIONS.map((anim) => (
                <div key={anim} onClick={() => setBootAnim(anim)}
                  className={`relative rounded-xl p-3 text-left cursor-pointer transition-all group ${
                    bootAnim === anim ? "text-white" : "text-gray-500 hover:text-gray-300 hover:bg-white/4"
                  }`}
                  style={bootAnim === anim ? { background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)" } : { border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-semibold">{anim}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setPreviewAnim(anim); }}
                      title="Aperçu"
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-white/10">
                      <Play className="h-3 w-3" />
                    </button>
                  </div>
                  <p className="text-[9px] text-gray-600 leading-snug">{BOOT_DESCRIPTIONS[anim]}</p>
                  {bootAnim === anim && (
                    <div className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-indigo-400" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <button onClick={saveBoot}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90"
            style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.3)" }}>
            <Save className="h-3.5 w-3.5" /> Enregistrer
          </button>
        </div>
      )}

      {/* Activity log tab */}
      {tab === "activite" && (
        <div className="space-y-4 rounded-2xl p-5"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">Journal d'activité</h2>
              <p className="text-[10px] text-gray-600 mt-0.5">Chaque action du panel est enregistrée en permanence sur le disque</p>
            </div>
            <button onClick={() => { setActivityLoading(true); axios.get("/api/activity?limit=100").then((r) => setActivity(r.data.entries)).finally(() => setActivityLoading(false)); }}
              className="text-gray-600 hover:text-gray-400 p-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-cyan-300 rounded-lg px-3 py-2"
            style={{ background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.2)" }}>
            <HardDrive className="h-3.5 w-3.5 shrink-0" />
            Les réglages, appareils, systèmes et configurations sont permanents. Seul ce journal (le cache) est
            automatiquement nettoyé une fois par semaine pour libérer de l'espace.
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
