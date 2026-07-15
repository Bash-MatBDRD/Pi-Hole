import React, { useState, useEffect, useRef } from "react";
import { Bell, Lock, User, Sliders, RefreshCw, HardDrive, Home } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { getThemeColor, getLogoStyle, getLetterStyle, getContainerShape, getFontClass } from "../lib/theme";

interface Props {
  username: string;
  onLock: () => void;
  onLogout: () => void;
  haConnected: boolean;
  botOnline: boolean;
}

function useClock() {
  const [t, setT] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setT(new Date()), 1000); return () => clearInterval(id); }, []);
  return t;
}

function useTheme() {
  const [color, setColor]   = useState(getThemeColor);
  const [style, setStyle]   = useState(getLogoStyle);
  useEffect(() => {
    const onC = () => setColor(getThemeColor());
    const onS = () => setStyle(getLogoStyle());
    window.addEventListener("nexus-logo-color-change", onC);
    window.addEventListener("nexus-logo-style-change", onS);
    return () => { window.removeEventListener("nexus-logo-color-change", onC); window.removeEventListener("nexus-logo-style-change", onS); };
  }, []);
  return { color, style };
}

export default function TopBar({ username, onLock, onLogout, haConnected, botOnline }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const time  = useClock();
  const { color, style } = useTheme();
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const hours   = time.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const seconds = time.getSeconds().toString().padStart(2, "0");
  const dateStr = time.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });

  const letterCSS  = getLetterStyle(color, style);
  const shapeClass = getContainerShape(style);
  const fontClass  = getFontClass(style);

  return (
    <div className="relative z-30 shrink-0 flex items-center justify-between px-4 h-11 border-b"
      style={{ background: "rgba(5,5,5,0.95)", borderColor: "rgba(255,255,255,0.06)" }}>

      {/* Logo + menu */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2.5 hover:opacity-80 transition-all focus:outline-none"
        >
          <div className={`w-7 h-7 ${shapeClass} flex items-center justify-center text-xs font-bold`} style={letterCSS}>
            <span className={fontClass}>N</span>
          </div>
          <div className="hidden sm:block">
            <div className="text-[11px] font-extrabold text-white tracking-widest leading-none flex items-center gap-1">
              NEXUS <Sliders className="h-2.5 w-2.5 text-gray-600" />
            </div>
            <div className="text-[8px] text-gray-600 font-semibold tracking-wider uppercase mt-0.5">Config Système</div>
          </div>
        </button>

        <div className="hidden md:flex items-center gap-3 border-l pl-4" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="text-[9px] font-extrabold px-1.5 py-0.5 rounded tracking-wide bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">V2.0</div>
          {haConnected && (
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              HA connecté
            </div>
          )}
          {botOnline && (
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
              Bot en ligne
            </div>
          )}
        </div>
      </div>

      {/* Clock */}
      <div className="font-mono text-[11px] font-semibold flex items-center gap-1">
        <span className="text-white">{hours}</span>
        <span style={{ color: color.text }}>:{seconds}</span>
        <span className="text-gray-600 ml-1 hidden sm:inline font-sans text-[10px]">{dateStr}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button onClick={onLock} className="text-gray-600 hover:text-gray-300 transition-colors" title="Verrouiller">
          <Lock className="h-4 w-4" />
        </button>
        <button onClick={() => navigate("/settings")} className="text-gray-600 hover:text-gray-300 transition-colors" title="Profil">
          <User className="h-4 w-4" />
        </button>
      </div>

      {/* Dropdown menu */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="absolute left-4 top-12 w-60 rounded-2xl shadow-2xl z-50 p-3 space-y-1"
          style={{ background: "rgba(7,7,15,0.97)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(16px)" }}
        >
          <div className="text-[9px] font-bold text-gray-600 uppercase tracking-widest px-2 pb-1 border-b mb-1" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            Configuration
          </div>
          {[
            { to: "/settings?tab=logo",  icon: Sliders,    label: "Configurateur Logo" },
            { to: "/settings?tab=boot",  icon: RefreshCw,  label: "Animation Démarrage" },
            { to: "/settings?tab=profil",icon: User,       label: "Profil & Réglages" },
            { to: "/zimaos",             icon: HardDrive,  label: "Diagnostic ZimaOS" },
            { to: "/domotique",          icon: Home,       label: "Domotique HA" },
          ].map(({ to, icon: Icon, label }) => (
            <button
              key={to}
              onClick={() => { navigate(to); setMenuOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-white hover:bg-white/4 transition-colors text-left"
            >
              <Icon className="h-3.5 w-3.5 text-indigo-400" />
              {label}
            </button>
          ))}
          <div className="border-t pt-2 flex justify-between px-1" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <button onClick={() => { onLock(); setMenuOpen(false); }} className="text-[10px] text-gray-500 hover:text-white flex items-center gap-1 transition-colors">
              <Lock className="h-3 w-3" /> Verrouiller
            </button>
            <button onClick={() => { onLogout(); setMenuOpen(false); }} className="text-[10px] text-red-500 hover:text-red-400 flex items-center gap-1 transition-colors">
              Déconnexion
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
