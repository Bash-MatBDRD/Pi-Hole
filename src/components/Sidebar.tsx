import React, { useState, useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Home, Music, MessageSquare, Server, Sparkles,
  Settings, Lock, LogOut, ChevronRight, Pin, PinOff,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getThemeColor, getLogoStyle, getLetterStyle, getContainerShape, getFontClass } from "../lib/theme";

interface Props {
  onLock: () => void;
  onLogout: () => void;
  spotifyTrack?: { title: string; artist: string; playing: boolean } | null;
}

const NAV_GROUPS = [
  {
    label: "Accueil",
    items: [
      { to: "/dashboard", icon: LayoutDashboard, label: "Tableau de bord" },
    ],
  },
  {
    label: "Domotique",
    items: [
      { to: "/domotique", icon: Home,           label: "Domotique HA" },
      { to: "/spotify",   icon: Music,          label: "Spotify & FireStick" },
      { to: "/discord",   icon: MessageSquare,  label: "Discord Bot" },
    ],
  },
  {
    label: "Système",
    items: [
      { to: "/zimaos",   icon: Server,    label: "ZimaOS Diagnostic" },
      { to: "/ai",       icon: Sparkles,  label: "Copilote IA" },
      { to: "/settings", icon: Settings,  label: "Réglages" },
    ],
  },
];

function useTheme() {
  const [color, setColor] = useState(getThemeColor);
  const [style, setStyle] = useState(getLogoStyle);
  useEffect(() => {
    const onC = () => setColor(getThemeColor());
    const onS = () => setStyle(getLogoStyle());
    window.addEventListener("nexus-logo-color-change", onC);
    window.addEventListener("nexus-logo-style-change", onS);
    return () => {
      window.removeEventListener("nexus-logo-color-change", onC);
      window.removeEventListener("nexus-logo-style-change", onS);
    };
  }, []);
  return { color, style };
}

export default function Sidebar({ onLock, onLogout, spotifyTrack }: Props) {
  const [hovered, setHovered]   = useState(false);
  const [pinned, setPinned]     = useState(() => localStorage.getItem("nexus-sidebar-pinned") !== "false");
  const location = useLocation();
  const { color, style } = useTheme();
  const ref = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const expanded = hovered || pinned;

  const togglePin = () => {
    const next = !pinned;
    setPinned(next);
    localStorage.setItem("nexus-sidebar-pinned", String(next));
  };

  const letterCSS  = getLetterStyle(color, style);
  const shapeClass = getContainerShape(style);
  const fontClass  = getFontClass(style);

  return (
    <>
      {/* Hover trigger strip when collapsed */}
      {!expanded && (
        <div
          className="fixed left-0 top-11 bottom-6 w-1 z-40 cursor-pointer"
          style={{ background: `linear-gradient(to bottom, transparent, ${color.glow}, transparent)`, opacity: 0.4 }}
          onMouseEnter={() => setHovered(true)}
        />
      )}

      <motion.aside
        ref={ref}
        animate={{ width: expanded ? 240 : 0, opacity: expanded ? 1 : 0 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="fixed left-0 top-11 bottom-6 z-40 flex flex-col overflow-hidden shrink-0"
        style={{
          background: "rgba(5,5,8,0.97)",
          borderRight: expanded ? "1px solid rgba(255,255,255,0.06)" : "none",
          backdropFilter: "blur(20px)",
          boxShadow: expanded ? "10px 0 40px rgba(0,0,0,0.6)" : "none",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { if (!pinned) setHovered(false); }}
      >
        {expanded && (
          <div className="flex flex-col h-full w-60 px-3 py-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-5 px-1">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 ${shapeClass} flex items-center justify-center text-sm font-bold shrink-0`} style={letterCSS}>
                  <span className={fontClass}>N</span>
                </div>
                <div>
                  <div className="text-[11px] font-black text-white tracking-widest leading-none">NEXUS</div>
                  <div className="text-[8px] text-gray-600 tracking-wider uppercase mt-0.5">SYSTEM PANEL</div>
                </div>
              </div>
              <button
                onClick={togglePin}
                className="text-gray-700 hover:text-gray-400 transition-colors p-1"
                title={pinned ? "Détacher" : "Épingler"}
              >
                {pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
              </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 space-y-5 overflow-y-auto custom-scrollbar">
              {NAV_GROUPS.map((group) => (
                <div key={group.label} className="space-y-0.5">
                  <div className="text-[9px] font-bold text-gray-700 uppercase tracking-widest px-2 pb-1.5">
                    {group.label}
                  </div>
                  {group.items.map(({ to, icon: Icon, label }) => (
                    <NavLink key={to} to={to} onClick={() => { if (!pinned) setHovered(false); }}>
                      {({ isActive }) => (
                        <div
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                            isActive
                              ? "text-white"
                              : "text-gray-500 hover:text-gray-200 hover:bg-white/4"
                          }`}
                          style={isActive ? { background: color.bg, border: `1px solid ${color.border}` } : {}}
                        >
                          <Icon className="h-4 w-4 shrink-0" style={isActive ? { color: color.text } : {}} />
                          <span>{label}</span>
                          {isActive && <ChevronRight className="h-3 w-3 ml-auto opacity-50" />}
                        </div>
                      )}
                    </NavLink>
                  ))}
                </div>
              ))}
            </nav>

            {/* Spotify mini-player */}
            <AnimatePresence>
              {spotifyTrack && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="mt-3 rounded-xl px-3 py-2.5 mb-2"
                  style={{ background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.15)" }}
                >
                  <div className="flex items-center gap-2">
                    <Music className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-white truncate">{spotifyTrack.title}</p>
                      <p className="text-[9px] text-gray-500 truncate">{spotifyTrack.artist}</p>
                    </div>
                    {spotifyTrack.playing && (
                      <div className="flex gap-0.5 items-end shrink-0 ml-auto">
                        {[3, 5, 4, 6].map((h, i) => (
                          <div
                            key={i}
                            className="w-0.5 bg-purple-400 rounded-full animate-bounce"
                            style={{ height: `${h}px`, animationDelay: `${i * 0.1}s` }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bottom actions */}
            <div className="space-y-0.5 pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <button
                onClick={onLock}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:text-gray-300 hover:bg-white/4 transition-all"
              >
                <Lock className="h-4 w-4" />
                <span>Verrouiller</span>
              </button>
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-900 hover:text-red-400 hover:bg-red-500/5 transition-all"
              >
                <LogOut className="h-4 w-4" />
                <span>Déconnexion</span>
              </button>
            </div>
          </div>
        )}
      </motion.aside>

      {/* Main content offset when sidebar is pinned */}
      {pinned && <div className="w-60 shrink-0" />}
    </>
  );
}
