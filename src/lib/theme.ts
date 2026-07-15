import type { CSSProperties } from "react";

export const logoColors = [
  { id: "indigo",  label: "Indigo",   bg: "rgba(79,110,247,0.22)",  border: "rgba(79,110,247,0.4)",  glow: "rgba(79,110,247,0.5)",  text: "rgba(100,130,255,0.9)", hex: "#4f6ef7" },
  { id: "violet",  label: "Violet",   bg: "rgba(139,92,246,0.22)",  border: "rgba(139,92,246,0.4)",  glow: "rgba(139,92,246,0.5)",  text: "rgba(167,139,250,0.9)", hex: "#8b5cf6" },
  { id: "cyan",    label: "Cyan",     bg: "rgba(34,211,238,0.18)",  border: "rgba(34,211,238,0.4)",  glow: "rgba(34,211,238,0.5)",  text: "rgba(34,211,238,0.9)",  hex: "#22d3ee" },
  { id: "emerald", label: "Émeraude", bg: "rgba(16,185,129,0.18)",  border: "rgba(16,185,129,0.4)",  glow: "rgba(16,185,129,0.5)",  text: "rgba(16,185,129,0.9)",  hex: "#10b981" },
  { id: "rose",    label: "Rose",     bg: "rgba(244,63,94,0.18)",   border: "rgba(244,63,94,0.4)",   glow: "rgba(244,63,94,0.5)",   text: "rgba(244,63,94,0.9)",   hex: "#f43f5e" },
  { id: "amber",   label: "Ambre",    bg: "rgba(245,158,11,0.18)",  border: "rgba(245,158,11,0.4)",  glow: "rgba(245,158,11,0.5)",  text: "rgba(245,158,11,0.9)",  hex: "#f59e0b" },
  { id: "white",   label: "Blanc",    bg: "rgba(255,255,255,0.1)",  border: "rgba(255,255,255,0.3)", glow: "rgba(255,255,255,0.4)", text: "rgba(255,255,255,0.9)", hex: "#ffffff" },
  { id: "pink",    label: "Pink",     bg: "rgba(236,72,153,0.18)",  border: "rgba(236,72,153,0.4)",  glow: "rgba(236,72,153,0.5)",  text: "rgba(236,72,153,0.9)",  hex: "#ec4899" },
  { id: "orange",  label: "Orange",   bg: "rgba(249,115,22,0.18)",  border: "rgba(249,115,22,0.4)",  glow: "rgba(249,115,22,0.5)",  text: "rgba(249,115,22,0.9)",  hex: "#f97316" },
  { id: "teal",    label: "Teal",     bg: "rgba(20,184,166,0.18)",  border: "rgba(20,184,166,0.4)",  glow: "rgba(20,184,166,0.5)",  text: "rgba(20,184,166,0.9)",  hex: "#14b8a6" },
  { id: "sky",     label: "Ciel",     bg: "rgba(14,165,233,0.18)",  border: "rgba(14,165,233,0.4)",  glow: "rgba(14,165,233,0.5)",  text: "rgba(14,165,233,0.9)",  hex: "#0ea5e9" },
  { id: "red",     label: "Rouge",    bg: "rgba(239,68,68,0.18)",   border: "rgba(239,68,68,0.4)",   glow: "rgba(239,68,68,0.5)",   text: "rgba(239,68,68,0.9)",   hex: "#ef4444" },
] as const;

export type LogoColor = typeof logoColors[number];

export type LogoStyle = {
  font:   "system" | "serif" | "mono" | "impact" | "italic" | "display";
  effect: "glow" | "neon" | "gradient" | "outline" | "hologram" | "plain";
  shape:  "rounded" | "square" | "circle";
};

const COLOR_KEY  = "nexus-logo-color";
const STYLE_KEY  = "nexus-logo-style";

export function getThemeColor(): LogoColor {
  try {
    const id = localStorage.getItem(COLOR_KEY) || "indigo";
    return logoColors.find((c) => c.id === id) || logoColors[0];
  } catch { return logoColors[0]; }
}

export function getLogoStyle(): LogoStyle {
  try {
    const raw = localStorage.getItem(STYLE_KEY);
    return raw ? JSON.parse(raw) : { font: "system", effect: "glow", shape: "rounded" };
  } catch { return { font: "system", effect: "glow", shape: "rounded" }; }
}

export function getLetterStyle(color: LogoColor, style: LogoStyle): CSSProperties {
  switch (style.effect) {
    case "glow":
      return {
        background: color.bg,
        border: `2px solid ${color.border}`,
        boxShadow: `0 0 22px ${color.glow}, inset 0 0 8px ${color.bg}`,
        color: color.text,
        "--accent-glow-color": color.glow,
        "--accent-border-color": color.hex,
      } as CSSProperties;
    case "neon":
      return {
        background: "transparent",
        border: `2px solid ${color.hex}`,
        boxShadow: `0 0 35px ${color.glow}, inset 0 0 15px ${color.bg}`,
        color: color.text,
        "--accent-glow-color": color.glow,
        "--accent-border-color": color.hex,
      } as CSSProperties;
    case "gradient":
      return {
        background: `linear-gradient(135deg, ${color.hex} 0%, #1e1b4b 100%)`,
        border: "1px solid rgba(255,255,255,0.15)",
        color: "#fff",
      } as CSSProperties;
    case "outline":
      return {
        background: "transparent",
        border: `2px dashed ${color.hex}`,
        color: color.text,
        "--accent-border-color": color.hex,
      } as CSSProperties;
    case "hologram":
      return {
        border: `1px solid ${color.hex}`,
        boxShadow: `0 0 10px ${color.glow}`,
        opacity: 0.85,
        color: color.text,
        "--accent-border-color": color.hex,
        "--accent-glow-color": color.glow,
      } as CSSProperties;
    case "plain":
    default:
      return {
        background: "#0f172a",
        border: "2px solid #1e293b",
        color: color.text,
      } as CSSProperties;
  }
}

export function getContainerShape(style: LogoStyle): string {
  switch (style.shape) {
    case "square":  return "rounded-none";
    case "circle":  return "rounded-full";
    default:        return "rounded-xl";
  }
}

export function getFontClass(style: LogoStyle): string {
  return `logo-font-${style.font}`;
}

export function getEffectClass(style: LogoStyle): string {
  return `logo-effect-${style.effect}`;
}
