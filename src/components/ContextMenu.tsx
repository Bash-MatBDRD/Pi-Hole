import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Home, Music, MessageSquare, Server,
  FolderOpen, Settings, Lock, LogOut, RefreshCw, Network,
  Cloud, StickyNote, Terminal, Copy, Check, ExternalLink,
  Zap, ChevronRight,
} from "lucide-react";
import { getThemeColor } from "../lib/theme";

interface MenuItem {
  type: "item" | "separator" | "label";
  icon?: React.ElementType;
  label?: string;
  shortcut?: string;
  danger?: boolean;
  accent?: boolean;
  action?: () => void;
  href?: string;
  disabled?: boolean;
}

interface Props {
  onLock: () => void;
  onLogout: () => void;
}

const NAV_ITEMS = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Tableau de bord"   },
  { to: "/domotique", icon: Home,            label: "Domotique HA"      },
  { to: "/spotify",   icon: Music,           label: "Spotify & FireStick"},
  { to: "/discord",   icon: MessageSquare,   label: "Discord Bot"       },
  { to: "/zimaos",    icon: Server,          label: "ZimaOS Diagnostic" },
  { to: "/terminal",  icon: Terminal,        label: "Terminal SSH"      },
  { to: "/reseau",    icon: Network,         label: "Réseau"            },
  { to: "/meteo",     icon: Cloud,           label: "Météo"             },
  { to: "/notes",     icon: StickyNote,      label: "Notes"             },
  { to: "/fichiers",  icon: FolderOpen,      label: "Fichiers"          },
  { to: "/settings",  icon: Settings,        label: "Réglages"          },
];

export default function ContextMenu({ onLock, onLogout }: Props) {
  const [visible,  setVisible]  = useState(false);
  const [pos,      setPos]      = useState({ x: 0, y: 0 });
  const [copied,   setCopied]   = useState(false);
  const [navOpen,  setNavOpen]  = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const color = getThemeColor();

  const close = useCallback(() => { setVisible(false); setNavOpen(false); }, []);

  // ── Open on right-click ────────────────────────────────────────────────────
  useEffect(() => {
    const onContext = (e: MouseEvent) => {
      // Allow native context menu on inputs / textareas / contenteditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) return;

      e.preventDefault();

      // Smart positioning — keep menu inside viewport
      const menuW = 220;
      const menuH = 340;
      const x = e.clientX + menuW  > window.innerWidth  ? e.clientX - menuW  : e.clientX;
      const y = e.clientY + menuH  > window.innerHeight ? e.clientY - menuH  : e.clientY;

      setPos({ x, y });
      setNavOpen(false);
      setVisible(true);
    };

    document.addEventListener("contextmenu", onContext);
    return () => document.removeEventListener("contextmenu", onContext);
  }, []);

  // ── Close on click-outside / Escape / scroll ───────────────────────────────
  useEffect(() => {
    if (!visible) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    const onScroll = () => close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown",   onKey);
    window.addEventListener("scroll",      onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown",   onKey);
      window.removeEventListener("scroll",      onScroll, true);
    };
  }, [visible, close]);

  // ── Close on route change ─────────────────────────────────────────────────
  useEffect(() => { close(); }, [location.pathname, close]);

  const go = (to: string) => { close(); navigate(to); };

  const copyUrl = () => {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const currentPage = NAV_ITEMS.find(n => location.pathname.startsWith(n.to));

  // ── Build menu ─────────────────────────────────────────────────────────────
  const items: MenuItem[] = [
    // Page actuelle
    { type: "label", label: currentPage?.label || "NEXUS Panel" },

    { type: "item", icon: RefreshCw,   label: "Rafraîchir la page",
      shortcut: "F5",
      action: () => { close(); window.location.reload(); } },

    { type: "item", icon: copied ? Check : Copy,
      label: copied ? "URL copiée !" : "Copier l'URL",
      accent: copied,
      action: copyUrl },

    { type: "separator" },

    // Navigation
    { type: "label", label: "Navigation" },

    // Inline nav submenu trigger
    {
      type: "item",
      icon: Zap,
      label: "Aller à…",
      shortcut: "▸",
      action: () => setNavOpen(v => !v),
    },

    { type: "separator" },

    // Session
    { type: "label", label: "Session" },

    { type: "item", icon: Lock,   label: "Verrouiller",
      shortcut: "⌘L",
      action: () => { close(); onLock(); } },

    { type: "item", icon: LogOut, label: "Déconnexion",
      danger: true,
      action: () => { close(); onLogout(); } },

    { type: "separator" },

    { type: "item", icon: Settings, label: "Réglages",
      action: () => go("/settings") },
  ];

  if (!visible) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] select-none"
      style={{ top: pos.y, left: pos.x }}
    >
      {/* Main menu */}
      <div
        className="w-52 rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background: "rgba(6,6,16,0.97)",
          border: "1px solid rgba(255,255,255,0.09)",
          backdropFilter: "blur(24px)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04)",
          animation: "ctx-in 0.12s ease-out",
        }}
      >
        {/* NEXUS brand strip */}
        <div className="px-3 py-2 flex items-center gap-2"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: `${color.bg}18` }}>
          <div className="h-4 w-4 rounded-md flex items-center justify-center text-[8px] font-black"
            style={{ background: color.bg, border: `1px solid ${color.border}`, color: color.text }}>
            N
          </div>
          <span className="text-[9px] font-black tracking-[0.2em] text-gray-500 uppercase">NEXUS Panel</span>
        </div>

        <div className="py-1.5">
          {items.map((item, i) => {
            if (item.type === "separator") {
              return <div key={i} className="my-1 mx-3 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />;
            }
            if (item.type === "label") {
              return (
                <div key={i} className="px-3 pt-1.5 pb-0.5">
                  <span className="text-[8px] font-bold uppercase tracking-widest text-gray-700">{item.label}</span>
                </div>
              );
            }
            const Icon = item.icon;
            const isNavTrigger = item.label === "Aller à…";
            return (
              <button
                key={i}
                onClick={item.action}
                disabled={item.disabled}
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-left text-xs transition-all disabled:opacity-30
                  ${item.danger
                    ? "text-red-400 hover:bg-red-500/10"
                    : item.accent
                    ? "hover:bg-white/5"
                    : "text-gray-300 hover:bg-white/5 hover:text-white"}`}
              >
                {Icon && (
                  <Icon className="h-3.5 w-3.5 shrink-0"
                    style={{ color: item.danger ? "#f87171" : item.accent ? color.hex : "#6b7280" }} />
                )}
                <span className={`flex-1 truncate ${item.accent ? "font-semibold" : ""}`}
                  style={item.accent ? { color: color.text } : {}}>
                  {item.label}
                </span>
                {item.shortcut && (
                  <span className="text-[9px] font-mono shrink-0"
                    style={{ color: isNavTrigger && navOpen ? color.hex : "#374151" }}>
                    {item.shortcut}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-3 py-1.5 flex items-center justify-between"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <span className="text-[8px] text-gray-800 font-mono">{location.pathname}</span>
          <span className="text-[8px] text-gray-800">v2.0</span>
        </div>
      </div>

      {/* ── Navigation flyout ─────────────────────────────────────────────── */}
      {navOpen && (
        <div
          className="absolute top-[88px] left-full ml-1.5 w-52 rounded-2xl overflow-hidden shadow-2xl"
          style={{
            background: "rgba(6,6,16,0.97)",
            border: "1px solid rgba(255,255,255,0.09)",
            backdropFilter: "blur(24px)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04)",
            animation: "ctx-in 0.1s ease-out",
            // flip left if too close to right edge
            ...(pos.x + 440 > window.innerWidth ? { left: "auto", right: "calc(100% + 6px)" } : {}),
          }}
        >
          <div className="px-3 py-2"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <span className="text-[8px] font-bold uppercase tracking-widest text-gray-700">Pages</span>
          </div>
          <div className="py-1.5">
            {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
              const isActive = location.pathname === to;
              return (
                <button key={to}
                  onClick={() => go(to)}
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs transition-all hover:bg-white/5 text-left"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0"
                    style={{ color: isActive ? color.hex : "#4b5563" }} />
                  <span className="flex-1 truncate"
                    style={{ color: isActive ? color.text : "#d1d5db", fontWeight: isActive ? 700 : 400 }}>
                    {label}
                  </span>
                  {isActive && (
                    <div className="h-1.5 w-1.5 rounded-full shrink-0"
                      style={{ background: color.hex }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Animation keyframes injected once */}
      <style>{`
        @keyframes ctx-in {
          from { opacity: 0; transform: scale(0.95) translateY(-4px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
      `}</style>
    </div>
  );
}
