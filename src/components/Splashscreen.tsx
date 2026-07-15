import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { getThemeColor, getLogoStyle, getLetterStyle, getContainerShape, getFontClass } from "../lib/theme";

interface Props {
  onComplete: () => void;
  variant?: string;
  /** When true, auto-dismisses after a short preview instead of a full boot cycle. */
  previewMode?: boolean;
}

const BOOT_STEPS = [
  "Vérification de l'intégrité du système...",
  "Chargement des modules NEXUS...",
  "Initialisation des services domotiques...",
  "Connexion aux serveurs ZimaOS...",
  "Synchronisation Discord Bot...",
  "Chargement de l'interface utilisateur...",
  "NEXUS PANEL — Prêt.",
];

// ── Per-variant visual identity ─────────────────────────────────────────────
// Each named boot animation gets a distinct palette, title treatment and a
// signature decorative layer, so picking a different one in Réglages actually
// changes what you see instead of only the label.
interface VariantDef {
  bg: string;
  accent: string;
  accentGlow: string;
  title: string;
  subtitle: string;
  font: string;
  deco: "blobs" | "matrix" | "grid" | "scan" | "glitch" | "aurora" | "particles" | "none";
  progressStyle: "bar" | "dots" | "ring" | "segmented";
}

const VARIANTS: Record<string, VariantDef> = {
  Nexus:   { bg: "#02020a", accent: "#6366f1", accentGlow: "rgba(99,102,241,0.5)",  title: "NEXUS PANEL",   subtitle: "v2.0 — Système d'initialisation",     font: "font-black tracking-[0.3em]", deco: "blobs",     progressStyle: "bar" },
  Windows: { bg: "#000814", accent: "#38bdf8", accentGlow: "rgba(56,189,248,0.5)",  title: "NEXUS",         subtitle: "Démarrage du système en cours",        font: "font-light tracking-[0.2em]", deco: "grid",      progressStyle: "dots" },
  iOS:     { bg: "#050505", accent: "#f5f5f7", accentGlow: "rgba(245,245,247,0.35)",title: "NEXUS",         subtitle: "Glissez pour continuer une fois prêt", font: "font-semibold tracking-tight", deco: "none",      progressStyle: "ring" },
  Matrix:  { bg: "#000500", accent: "#22ff66", accentGlow: "rgba(34,255,102,0.5)",  title: "N3XUS_PANEL",   subtitle: "> décryptage du système en cours_",    font: "font-mono tracking-[0.25em]", deco: "matrix",    progressStyle: "segmented" },
  Minimal: { bg: "#0a0a0a", accent: "#e5e7eb", accentGlow: "rgba(229,231,235,0.25)",title: "Nexus",         subtitle: "Chargement",                           font: "font-thin tracking-[0.4em]",  deco: "none",      progressStyle: "bar" },
  Netflix: { bg: "#000000", accent: "#e50914", accentGlow: "rgba(229,9,20,0.6)",    title: "NEXUS",         subtitle: "N",                                    font: "font-black tracking-tighter",  deco: "scan",      progressStyle: "bar" },
  Void:    { bg: "#000000", accent: "#3f3f46", accentGlow: "rgba(63,63,70,0.4)",    title: "NEXUS",         subtitle: "...",                                  font: "font-thin tracking-[0.5em]",  deco: "none",      progressStyle: "bar" },
  Apple:   { bg: "#000000", accent: "#f5f5f7", accentGlow: "rgba(245,245,247,0.3)", title: "",              subtitle: "",                                     font: "",                            deco: "none",      progressStyle: "ring" },
  HUD:     { bg: "#000a05", accent: "#00ffcc", accentGlow: "rgba(0,255,204,0.5)",   title: "N.E.X.U.S",     subtitle: "// SYSTEM DIAGNOSTICS ONLINE //",      font: "font-mono tracking-[0.3em]",  deco: "grid",      progressStyle: "segmented" },
  Aurora:  { bg: "#050214", accent: "#a855f7", accentGlow: "rgba(168,85,247,0.5)",  title: "NEXUS",         subtitle: "Réveil du système...",                 font: "font-light tracking-[0.35em]", deco: "aurora",    progressStyle: "bar" },
  Glitch:  { bg: "#050505", accent: "#ff2e63", accentGlow: "rgba(255,46,99,0.5)",   title: "N3XU5",         subtitle: "S̶Y̶S̶T̶E̶M̶ ̶E̶R̶R̶O̶R̶ — récupération...",   font: "font-black tracking-widest",  deco: "glitch",    progressStyle: "segmented" },
  Storm:   { bg: "#0b0f1a", accent: "#38bdf8", accentGlow: "rgba(56,189,248,0.45)", title: "NEXUS",         subtitle: "Orage numérique en approche...",       font: "font-bold tracking-[0.25em]", deco: "particles", progressStyle: "bar" },
  Rétro:      { bg: "#100800", accent: "#ffb000", accentGlow: "rgba(255,176,0,0.5)",  title: "N E X U S",   subtitle: "BOOT SEQUENCE 8-BIT",                  font: "font-mono tracking-[0.3em]",  deco: "scan",      progressStyle: "segmented" },
  TikTok:     { bg: "#000000", accent: "#25f4ee", accentGlow: "rgba(37,244,238,0.5)", title: "NEXUS",       subtitle: "Pour vous",                             font: "font-black tracking-tight",   deco: "glitch",    progressStyle: "bar" },
  Sakura:     { bg: "#1a0510", accent: "#f9a8d4", accentGlow: "rgba(249,168,212,0.5)",title: "Nexus",       subtitle: "Douceur du printemps numérique",       font: "font-light tracking-[0.3em]", deco: "particles", progressStyle: "ring" },
  Or:         { bg: "#0a0700", accent: "#facc15", accentGlow: "rgba(250,204,21,0.55)",title: "NEXUS",       subtitle: "Édition dorée",                        font: "font-black tracking-[0.3em]", deco: "blobs",     progressStyle: "bar" },
  Feu:        { bg: "#0f0400", accent: "#f97316", accentGlow: "rgba(249,115,22,0.55)",title: "NEXUS",       subtitle: "Ignition du système",                  font: "font-black tracking-[0.25em]", deco: "particles", progressStyle: "segmented" },
  Glace:      { bg: "#020a12", accent: "#67e8f9", accentGlow: "rgba(103,232,249,0.5)",title: "NEXUS",       subtitle: "Système gelé — dégivrage...",          font: "font-light tracking-[0.3em]", deco: "aurora",    progressStyle: "bar" },
  "Nexus OS": { bg: "#04040c", accent: "#818cf8", accentGlow: "rgba(129,140,248,0.5)",title: "NEXUS OS",    subtitle: "Kernel v2.0 — chargement natif",       font: "font-mono tracking-[0.2em]",  deco: "grid",      progressStyle: "segmented" },
  Hologramme: { bg: "#020617", accent: "#38bdf8", accentGlow: "rgba(56,189,248,0.55)",title: "NEXUS",       subtitle: "Projection holographique...",          font: "font-light tracking-[0.4em]", deco: "scan",      progressStyle: "ring" },
  "Glitch RGB": { bg: "#020202", accent: "#ff003c", accentGlow: "rgba(0,255,255,0.4)",title: "N3XUS",       subtitle: "R̷G̷B̷ ̷D̷E̷S̷Y̷N̷C̷",                       font: "font-black tracking-widest",  deco: "glitch",    progressStyle: "segmented" },
  Radar:      { bg: "#020a08", accent: "#4ade80", accentGlow: "rgba(74,222,128,0.5)",title: "NEXUS",       subtitle: "Balayage radar du réseau...",          font: "font-mono tracking-[0.25em]", deco: "grid",      progressStyle: "ring" },
  DNA:        { bg: "#080014", accent: "#c084fc", accentGlow: "rgba(192,132,252,0.5)",title: "NEXUS",      subtitle: "Séquençage du système...",             font: "font-light tracking-[0.3em]", deco: "aurora",    progressStyle: "bar" },
};

export const BOOT_ANIMATION_NAMES = Object.keys(VARIANTS);

function useCountUp(target: number, onDone: () => void, speedMs: number) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 8 + 3;
      if (p >= target) { p = target; clearInterval(interval); setTimeout(onDone, 400); }
      setProgress(Math.min(p, target));
    }, speedMs);
    return () => clearInterval(interval);
  }, [onDone, target, speedMs]);
  return progress;
}

function Deco({ kind, accent, glow }: { kind: VariantDef["deco"]; accent: string; glow: string }) {
  if (kind === "blobs") {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <motion.div key={i} className="absolute rounded-full blur-3xl"
            style={{ width: `${120 + i * 60}px`, height: `${120 + i * 60}px`, background: glow, opacity: 0.04 + i * 0.01, left: `${10 + i * 18}%`, top: `${15 + i * 12}%` }}
            animate={{ x: [0, 20, -10, 0], y: [0, -15, 10, 0] }}
            transition={{ duration: 6 + i * 2, repeat: Infinity, ease: "easeInOut", delay: i * 0.7 }} />
        ))}
      </div>
    );
  }
  if (kind === "grid") {
    return (
      <div className="pointer-events-none absolute inset-0 opacity-20"
        style={{ backgroundImage: `linear-gradient(${accent}33 1px, transparent 1px), linear-gradient(90deg, ${accent}33 1px, transparent 1px)`, backgroundSize: "40px 40px" }} />
    );
  }
  if (kind === "matrix") {
    const cols = 24;
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-40 font-mono text-xs" style={{ color: accent }}>
        {[...Array(cols)].map((_, i) => (
          <motion.div key={i} className="absolute top-0" style={{ left: `${(i / cols) * 100}%` }}
            initial={{ y: -200 }} animate={{ y: "110vh" }}
            transition={{ duration: 2.5 + (i % 5), repeat: Infinity, ease: "linear", delay: i * 0.15 }}>
            {Array.from({ length: 14 }).map((_, j) => <div key={j}>{String.fromCharCode(0x30a0 + ((i * 7 + j * 13) % 96))}</div>)}
          </motion.div>
        ))}
      </div>
    );
  }
  if (kind === "scan") {
    return (
      <motion.div className="pointer-events-none absolute inset-x-0 h-24 blur-xl"
        style={{ background: `linear-gradient(180deg, transparent, ${accent}22, transparent)` }}
        animate={{ top: ["-10%", "110%"] }} transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }} />
    );
  }
  if (kind === "glitch") {
    return (
      <motion.div className="pointer-events-none absolute inset-0"
        animate={{ opacity: [0, 0.15, 0, 0.1, 0], x: [0, -3, 2, -1, 0] }}
        transition={{ duration: 0.4, repeat: Infinity, repeatDelay: 1.2 }}
        style={{ background: `repeating-linear-gradient(0deg, ${accent}22 0px, transparent 2px, transparent 4px)` }} />
    );
  }
  if (kind === "aurora") {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {[...Array(3)].map((_, i) => (
          <motion.div key={i} className="absolute inset-x-0 h-1/2 blur-3xl rounded-full"
            style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)`, opacity: 0.12, top: `${i * 25}%` }}
            animate={{ x: ["-20%", "20%", "-20%"] }} transition={{ duration: 8 + i * 2, repeat: Infinity, ease: "easeInOut" }} />
        ))}
      </div>
    );
  }
  if (kind === "particles") {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {[...Array(18)].map((_, i) => (
          <motion.div key={i} className="absolute rounded-full" style={{ width: 3, height: 3, background: accent, left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%` }}
            animate={{ opacity: [0, 1, 0], y: [0, -30, -60] }} transition={{ duration: 2 + (i % 4), repeat: Infinity, delay: i * 0.2 }} />
        ))}
      </div>
    );
  }
  return null;
}

function ProgressIndicator({ style, progress, accent }: { style: VariantDef["progressStyle"]; progress: number; accent: string }) {
  if (style === "dots") {
    return (
      <div className="flex gap-2 justify-center">
        {[...Array(5)].map((_, i) => (
          <motion.div key={i} className="h-2.5 w-2.5 rounded-full" style={{ background: accent }}
            animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }} />
        ))}
      </div>
    );
  }
  if (style === "ring") {
    const circumference = 2 * Math.PI * 26;
    return (
      <div className="flex flex-col items-center gap-2">
        <svg width="64" height="64" className="-rotate-90">
          <circle cx="32" cy="32" r="26" stroke="rgba(255,255,255,0.08)" strokeWidth="4" fill="none" />
          <circle cx="32" cy="32" r="26" stroke={accent} strokeWidth="4" fill="none" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress / 100)} style={{ transition: "stroke-dashoffset 0.3s ease" }} />
        </svg>
        <span className="text-[10px] font-mono" style={{ color: accent }}>{Math.round(progress)}%</span>
      </div>
    );
  }
  if (style === "segmented") {
    const segs = 20;
    const filled = Math.round((progress / 100) * segs);
    return (
      <div className="flex gap-1 w-full px-4">
        {[...Array(segs)].map((_, i) => (
          <div key={i} className="h-2 flex-1 rounded-sm transition-colors duration-200"
            style={{ background: i < filled ? accent : "rgba(255,255,255,0.06)" }} />
        ))}
      </div>
    );
  }
  return (
    <div className="w-full px-4">
      <div className="h-[2px] w-full bg-white/5 rounded-full overflow-hidden">
        <motion.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${accent}, ${accent}aa)` }}
          animate={{ width: `${progress}%` }} transition={{ duration: 0.3, ease: "easeOut" }} />
      </div>
    </div>
  );
}

export default function Splashscreen({ onComplete, variant, previewMode }: Props) {
  const selected = variant || (typeof window !== "undefined" ? localStorage.getItem("nexus_boot_animation") || "Nexus" : "Nexus");
  const v = VARIANTS[selected] || VARIANTS.Nexus;
  const color = getThemeColor();
  const style = getLogoStyle();

  const speedMs = previewMode ? 90 : 120;
  const progress = useCountUp(100, onComplete, speedMs);
  const step = Math.min(Math.floor(progress / (100 / BOOT_STEPS.length)), BOOT_STEPS.length - 1);

  const letterCSS  = getLetterStyle(color, style);
  const shapeClass = getContainerShape(style);
  const fontClass  = getFontClass(style);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: v.bg, backgroundImage: v.deco === "blobs" ? `radial-gradient(ellipse 80% 60% at 50% -10%, ${v.accentGlow}, transparent)` : undefined }}
    >
      <Deco kind={v.deco} accent={v.accent} glow={v.accentGlow} />

      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-sm flex flex-col items-center"
      >
        {/* Logo */}
        <div className="relative mb-8">
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 blur-xl rounded-full"
            style={{ background: v.accentGlow, opacity: 0.35 }}
          />
          <div className={`relative w-20 h-20 ${shapeClass} flex items-center justify-center text-3xl font-bold`}
            style={{ ...letterCSS, background: `${v.accent}22`, color: v.accent, boxShadow: `0 0 30px ${v.accentGlow}` }}>
            <span className={fontClass}>N</span>
          </div>
        </div>

        {v.title && <h1 className={`text-2xl text-white uppercase mb-1 ${v.font}`}>{v.title}</h1>}
        {v.subtitle && <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-10 font-mono">{v.subtitle}</p>}
        {!v.title && <div className="mb-10" />}

        <ProgressIndicator style={v.progressStyle} progress={progress} accent={v.accent} />

        {v.progressStyle !== "ring" && (
          <div className="w-full px-4 mt-3 flex justify-between items-center">
            <p className="text-[10px] text-gray-600 font-mono truncate">{previewMode ? `Aperçu : ${selected}` : BOOT_STEPS[step]}</p>
            <span className="text-[10px] font-mono ml-3 shrink-0" style={{ color: v.accent }}>{Math.round(progress)}%</span>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
