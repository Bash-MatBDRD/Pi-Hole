import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Home, Lightbulb, Wind, Thermometer, Tv, Video, Zap,
  RefreshCw, Wifi, WifiOff, Settings, Play, Pause,
  SkipForward, Volume2, ChevronDown, ChevronUp, Sun, Moon,
  Eye, EyeOff, AlertTriangle, Maximize2,
} from "lucide-react";
import axios from "axios";

interface Device {
  id: string; name: string; type: string; state: string; room: string; attributes: any;
}
interface HAConfig { url: string; token: string; isConnected: boolean; }

const TABS = ["Tous", "Lumières", "Volets", "Climat", "Média", "Caméras", "Prises"] as const;
type Tab = typeof TABS[number];

const TYPE_ICONS: Record<string, React.ElementType> = {
  light: Lightbulb, cover: Wind, climate: Thermometer,
  media_player: Tv, camera: Video, switch: Zap,
};
const TYPE_COLORS: Record<string, string> = {
  light: "#f59e0b", cover: "#06b6d4", climate: "#f97316",
  media_player: "#a855f7", camera: "#22c55e", switch: "#6366f1",
};
const TAB_TYPES: Record<Tab, string[]> = {
  "Tous": [], "Lumières": ["light"], "Volets": ["cover"],
  "Climat": ["climate"], "Média": ["media_player"],
  "Caméras": ["camera"], "Prises": ["switch"],
};

// ── Light Card ────────────────────────────────────────────────────────────────
function LightCard({ device, onCommand }: { device: Device; onCommand: (id: string, svc: string, d?: any) => Promise<void> }) {
  const isOn = device.state === "on";
  const bri  = device.attributes?.brightness ?? 0;
  const color = "#f59e0b";
  const colorRgb = device.attributes?.rgb_color;

  const bulbColor = colorRgb
    ? `rgb(${colorRgb[0]},${colorRgb[1]},${colorRgb[2]})`
    : isOn ? "#fbbf24" : "#374151";

  return (
    <div className="rounded-2xl p-4 transition-all select-none"
      style={{
        background: isOn ? "rgba(251,191,36,0.06)" : "rgba(255,255,255,0.03)",
        border: isOn ? "1px solid rgba(251,191,36,0.2)" : "1px solid rgba(255,255,255,0.06)",
        boxShadow: isOn ? `0 0 24px rgba(251,191,36,0.08)` : "none",
      }}>
      {/* Bulb visual + toggle */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* Bulb glow */}
          <div className="relative flex items-center justify-center w-10 h-10">
            {isOn && (
              <div className="absolute inset-0 rounded-full animate-pulse"
                style={{ background: `radial-gradient(circle, ${bulbColor}40 0%, transparent 70%)`, transform: "scale(1.6)" }} />
            )}
            <div className="relative w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: isOn ? `${color}18` : "rgba(255,255,255,0.04)", border: `1px solid ${isOn ? color + "30" : "rgba(255,255,255,0.08)"}` }}>
              <Lightbulb className="h-5 w-5 transition-colors"
                style={{ color: isOn ? bulbColor : "#374151", filter: isOn ? `drop-shadow(0 0 4px ${bulbColor})` : "none" }} />
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-white leading-tight">{device.name}</p>
            <p className="text-[9px] text-gray-600 mt-0.5">{device.room}</p>
          </div>
        </div>
        {/* Toggle */}
        <button onClick={() => onCommand(device.id, isOn ? "turn_off" : "turn_on")}
          className="h-6 w-11 rounded-full relative flex items-center px-1 transition-all flex-shrink-0"
          style={{ background: isOn ? `${color}35` : "rgba(255,255,255,0.07)", border: `1px solid ${isOn ? color + "55" : "rgba(255,255,255,0.1)"}` }}>
          <div className="h-3.5 w-3.5 rounded-full transition-all duration-200 shadow-md"
            style={{ background: isOn ? color : "#4b5563", transform: isOn ? "translateX(18px)" : "translateX(0)" }} />
        </button>
      </div>

      {/* Brightness bar */}
      {isOn && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-[9px]">
            <span className="text-gray-600 flex items-center gap-1"><Moon className="h-2.5 w-2.5" /> Luminosité</span>
            <span style={{ color }}>{bri}%</span>
          </div>
          <div className="relative h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="absolute left-0 top-0 h-full rounded-full transition-all"
              style={{ width: `${bri}%`, background: `linear-gradient(to right, ${color}80, ${color})` }} />
            <input type="range" min="0" max="100" value={bri}
              onChange={e => onCommand(device.id, "set_brightness", { brightness: +e.target.value })}
              className="absolute inset-0 w-full opacity-0 cursor-pointer h-full" />
          </div>
          {/* Color temp */}
          <div className="flex gap-1.5 mt-2">
            {(["warm", "daylight", "cool"] as const).map((t, i) => (
              <button key={t} onClick={() => onCommand(device.id, "set_color_temp", { color_temp: t })}
                className="flex-1 py-1 rounded-lg text-[9px] font-semibold transition-all"
                style={{
                  background: device.attributes?.color_temp === t ? `${color}20` : "rgba(255,255,255,0.04)",
                  border: `1px solid ${device.attributes?.color_temp === t ? color + "40" : "rgba(255,255,255,0.06)"}`,
                  color: device.attributes?.color_temp === t ? color : "#6b7280",
                }}>
                {i === 0 ? "🔥 Chaud" : i === 1 ? "☀ Jour" : "❄ Froid"}
              </button>
            ))}
          </div>
        </div>
      )}

      {!isOn && (
        <div className="text-[9px] uppercase tracking-widest font-semibold text-gray-700 mt-1">Éteint</div>
      )}
    </div>
  );
}

// ── Camera Card ───────────────────────────────────────────────────────────────
function CameraCard({ device, haConnected }: { device: Device; haConnected: boolean }) {
  const [imgTs, setImgTs]     = useState(Date.now());
  const [imgOk, setImgOk]     = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const motion = device.attributes?.motion_detected;

  const snapshotUrl = haConnected
    ? `/api/home-assistant/camera-proxy/${device.id}?t=${imgTs}`
    : null;

  return (
    <>
      <div className="rounded-2xl overflow-hidden transition-all"
        style={{
          border: motion ? "1px solid rgba(239,68,68,0.35)" : "1px solid rgba(255,255,255,0.06)",
          background: "rgba(5,5,8,0.9)",
          boxShadow: motion ? "0 0 20px rgba(239,68,68,0.1)" : "none",
        }}>
        {/* Camera feed */}
        <div className="relative bg-black" style={{ aspectRatio: "16/9" }}>
          {snapshotUrl && (
            <img src={snapshotUrl} alt={device.name}
              onLoad={() => setImgOk(true)}
              onError={() => setImgOk(false)}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity ${imgOk ? "opacity-100" : "opacity-0"}`}
            />
          )}
          {/* Placeholder / no feed */}
          {(!haConnected || !imgOk) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center"
              style={{ background: "radial-gradient(circle at 50% 40%, rgba(34,197,94,0.05), transparent 70%)" }}>
              <Video className="h-10 w-10 text-gray-800 mb-2" />
              <p className="text-[9px] text-gray-700">{haConnected ? "Flux indisponible" : "HA non connecté"}</p>
            </div>
          )}
          {/* HUD overlays */}
          <div className="absolute top-2 left-2 flex items-center gap-1.5">
            <div className={`h-1.5 w-1.5 rounded-full ${motion ? "bg-red-500 animate-pulse" : "bg-emerald-500"}`} />
            <span className="text-[9px] font-bold text-white/80 uppercase tracking-wider">{motion ? "MOUVEMENT" : "LIVE"}</span>
          </div>
          <div className="absolute top-2 right-2 flex gap-1">
            <button onClick={() => setImgTs(Date.now())}
              className="p-1 rounded-lg backdrop-blur-sm transition-all hover:bg-white/10"
              style={{ background: "rgba(0,0,0,0.5)" }}>
              <RefreshCw className="h-3 w-3 text-white/70" />
            </button>
            <button onClick={() => setFullscreen(true)}
              className="p-1 rounded-lg backdrop-blur-sm transition-all hover:bg-white/10"
              style={{ background: "rgba(0,0,0,0.5)" }}>
              <Maximize2 className="h-3 w-3 text-white/70" />
            </button>
          </div>
          <div className="absolute bottom-2 right-2">
            <span className="text-[9px] text-white/40 font-mono">{device.attributes?.fps ?? 15}fps</span>
          </div>
        </div>
        {/* Info bar */}
        <div className="px-3 py-2.5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-white">{device.name}</p>
            <p className="text-[9px] text-gray-600">{device.room}</p>
          </div>
          {motion && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <AlertTriangle className="h-3 w-3 text-red-400" />
              <span className="text-[9px] font-semibold text-red-400">Mouvement</span>
            </div>
          )}
        </div>
      </div>
      {/* Fullscreen modal */}
      {fullscreen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.92)" }}
          onClick={() => setFullscreen(false)}>
          {snapshotUrl
            ? <img src={`/api/home-assistant/camera-proxy/${device.id}?t=${Date.now()}`} alt={device.name} className="max-w-full max-h-full rounded-2xl" />
            : <div className="text-gray-600 text-sm">Flux indisponible</div>
          }
        </div>
      )}
    </>
  );
}

// ── Cover Card ────────────────────────────────────────────────────────────────
function CoverCard({ device, onCommand }: { device: Device; onCommand: (id: string, svc: string, d?: any) => Promise<void> }) {
  const pos  = device.attributes?.current_position ?? 0;
  const isOpen = device.state === "open";
  const color  = "#06b6d4";

  return (
    <div className="rounded-2xl p-4 transition-all"
      style={{ background: "rgba(6,182,212,0.04)", border: `1px solid ${isOpen ? "rgba(6,182,212,0.2)" : "rgba(255,255,255,0.06)"}` }}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* Shutter visual */}
          <div className="relative w-10 h-10 rounded-2xl overflow-hidden flex items-end"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(6,182,212,0.2)" }}>
            <div className="w-full transition-all duration-500 rounded-t-sm"
              style={{ height: `${100 - pos}%`, background: "rgba(6,182,212,0.3)", borderTop: "1px solid rgba(6,182,212,0.5)" }} />
          </div>
          <div>
            <p className="text-xs font-bold text-white leading-tight">{device.name}</p>
            <p className="text-[9px] text-gray-600">{device.room}</p>
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={() => onCommand(device.id, "open_cover")}
            className="px-2 py-1 rounded-lg text-[9px] font-semibold transition-all"
            style={{ background: isOpen ? `${color}20` : "rgba(255,255,255,0.04)", color: isOpen ? color : "#6b7280" }}>
            ↑ Ouvrir
          </button>
          <button onClick={() => onCommand(device.id, "close_cover")}
            className="px-2 py-1 rounded-lg text-[9px] font-semibold transition-all"
            style={{ background: !isOpen ? `${color}20` : "rgba(255,255,255,0.04)", color: !isOpen ? color : "#6b7280" }}>
            ↓ Fermer
          </button>
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between text-[9px]">
          <span className="text-gray-600">Ouverture</span>
          <span style={{ color }}>{pos}%</span>
        </div>
        <div className="relative h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div className="absolute left-0 top-0 h-full rounded-full transition-all"
            style={{ width: `${pos}%`, background: `linear-gradient(to right, ${color}60, ${color})` }} />
          <input type="range" min="0" max="100" value={pos}
            onChange={e => onCommand(device.id, "set_position", { position: +e.target.value })}
            className="absolute inset-0 w-full opacity-0 cursor-pointer h-full" />
        </div>
      </div>
    </div>
  );
}

// ── Climate Card ──────────────────────────────────────────────────────────────
function ClimateCard({ device, onCommand }: { device: Device; onCommand: (id: string, svc: string, d?: any) => Promise<void> }) {
  const cur = device.attributes?.current_temperature ?? 20;
  const tgt = device.attributes?.temperature ?? 21;
  const color = "#f97316";
  const isHeating = device.state === "heat";

  // Arc progress: map 15-30°C range to 0-100%
  const arcPct = Math.min(100, Math.max(0, ((tgt - 15) / 15) * 100));
  const r = 28; const circ = 2 * Math.PI * r;
  const dash = (arcPct / 100) * circ * 0.75; // 75% of circle

  return (
    <div className="rounded-2xl p-4 transition-all"
      style={{ background: isHeating ? "rgba(249,115,22,0.05)" : "rgba(255,255,255,0.03)", border: `1px solid ${isHeating ? "rgba(249,115,22,0.2)" : "rgba(255,255,255,0.06)"}` }}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs font-bold text-white">{device.name}</p>
          <p className="text-[9px] text-gray-600">{device.room}</p>
        </div>
        <div className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${isHeating ? "bg-orange-500/15 text-orange-400" : "bg-gray-800 text-gray-500"}`}>
          {isHeating ? "🔥 Chauffe" : "En veille"}
        </div>
      </div>
      {/* Arc gauge */}
      <div className="flex items-center gap-4">
        <div className="relative w-16 h-16 flex-shrink-0">
          <svg className="w-16 h-16" style={{ transform: "rotate(135deg)" }}>
            <circle cx="32" cy="32" r={r} fill="none" strokeWidth="4" stroke="rgba(255,255,255,0.06)"
              strokeDasharray={`${circ * 0.75} ${circ}`} strokeLinecap="round" />
            <circle cx="32" cy="32" r={r} fill="none" strokeWidth="4" stroke={color}
              strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 3px ${color})`, transition: "stroke-dasharray 0.5s ease" }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-base font-black text-white leading-none">{tgt}°</span>
          </div>
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex justify-between text-[9px]">
            <span className="text-gray-600">Actuelle</span>
            <span className="text-orange-300 font-bold">{cur}°C</span>
          </div>
          <div className="flex gap-1">
            <button onClick={() => onCommand(device.id, "set_temperature", { temperature: Math.max(15, tgt - 0.5) })}
              className="flex-1 py-1 rounded-lg text-xs font-bold text-gray-500 hover:text-white transition-all hover:bg-white/5">−</button>
            <span className="flex-1 text-center text-xs font-bold" style={{ color }}>{tgt}°C</span>
            <button onClick={() => onCommand(device.id, "set_temperature", { temperature: Math.min(30, tgt + 0.5) })}
              className="flex-1 py-1 rounded-lg text-xs font-bold text-gray-500 hover:text-white transition-all hover:bg-white/5">+</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Switch Card ───────────────────────────────────────────────────────────────
function SwitchCard({ device, onCommand }: { device: Device; onCommand: (id: string, svc: string, d?: any) => Promise<void> }) {
  const isOn = device.state === "on";
  const power = device.attributes?.power_w ?? 0;
  const energy = device.attributes?.today_energy_kwh ?? 0;
  const color = "#6366f1";
  // Ring: 0-2000W range
  const r = 22; const circ = 2 * Math.PI * r;
  const pct = Math.min(100, (power / 2000) * 100);

  return (
    <div className="rounded-2xl p-4 transition-all"
      style={{ background: isOn ? "rgba(99,102,241,0.05)" : "rgba(255,255,255,0.03)", border: `1px solid ${isOn ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.06)"}` }}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* Power ring */}
          <div className="relative w-10 h-10">
            <svg className="w-10 h-10" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="20" cy="20" r={r} fill="none" strokeWidth="3" stroke="rgba(255,255,255,0.06)" />
              <circle cx="20" cy="20" r={r} fill="none" strokeWidth="3" stroke={isOn ? color : "#374151"}
                strokeDasharray={`${(pct / 100) * circ} ${circ}`} strokeLinecap="round"
                style={{ transition: "stroke-dasharray 0.4s ease", filter: isOn ? `drop-shadow(0 0 3px ${color})` : "none" }} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <Zap className="h-3.5 w-3.5" style={{ color: isOn ? color : "#4b5563" }} />
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-white leading-tight">{device.name}</p>
            <p className="text-[9px] text-gray-600">{device.room}</p>
          </div>
        </div>
        <button onClick={() => onCommand(device.id, isOn ? "turn_off" : "turn_on")}
          className="h-6 w-11 rounded-full relative flex items-center px-1 transition-all flex-shrink-0"
          style={{ background: isOn ? `${color}35` : "rgba(255,255,255,0.07)", border: `1px solid ${isOn ? color + "55" : "rgba(255,255,255,0.1)"}` }}>
          <div className="h-3.5 w-3.5 rounded-full transition-all duration-200"
            style={{ background: isOn ? color : "#4b5563", transform: isOn ? "translateX(18px)" : "translateX(0)" }} />
        </button>
      </div>
      {isOn && (
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl p-2 text-center"
            style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.12)" }}>
            <div className="text-[9px] text-gray-600 mb-0.5">Puissance</div>
            <div className="text-sm font-black" style={{ color }}>{power.toFixed(0)}W</div>
          </div>
          <div className="rounded-xl p-2 text-center"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="text-[9px] text-gray-600 mb-0.5">Aujourd'hui</div>
            <div className="text-sm font-black text-white">{energy.toFixed(2)}<span className="text-[9px] text-gray-600 font-normal"> kWh</span></div>
          </div>
        </div>
      )}
      {!isOn && <div className="text-[9px] uppercase tracking-widest font-semibold text-gray-700 mt-1">Éteint</div>}
    </div>
  );
}

// ── Media Player Card ─────────────────────────────────────────────────────────
function MediaCard({ device, onCommand }: { device: Device; onCommand: (id: string, svc: string, d?: any) => Promise<void> }) {
  const isPlaying = device.state === "playing";
  const vol  = device.attributes?.volume_level ?? 0.5;
  const color = "#a855f7";
  const title  = device.attributes?.media_title;
  const artist = device.attributes?.media_artist;
  const isFirestick = device.id?.includes("firestick") || device.name?.toLowerCase().includes("fire") || device.name?.toLowerCase().includes("tv");

  return (
    <div className="rounded-2xl overflow-hidden transition-all"
      style={{ background: isPlaying ? "rgba(168,85,247,0.06)" : "rgba(255,255,255,0.03)", border: `1px solid ${isPlaying ? "rgba(168,85,247,0.22)" : "rgba(255,255,255,0.06)"}` }}>
      {/* Art banner */}
      <div className="relative h-20 flex items-center justify-center overflow-hidden"
        style={{ background: `linear-gradient(135deg, rgba(168,85,247,0.12), rgba(99,102,241,0.08))` }}>
        {isFirestick ? (
          <div className="flex flex-col items-center gap-1">
            <Tv className="h-8 w-8 text-purple-400/60" />
            <span className="text-[9px] text-purple-400/50 font-bold tracking-widest">FIRESTICK</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <div className="flex gap-1 items-end h-8">
              {[3,5,7,4,6,5,3].map((h, i) => (
                <div key={i} className={`w-1 rounded-full ${isPlaying ? "animate-bounce" : ""}`}
                  style={{ height: `${h * 3}px`, background: `rgba(168,85,247,${isPlaying ? 0.6 : 0.2})`, animationDelay: `${i * 0.1}s` }} />
              ))}
            </div>
          </div>
        )}
        <div className="absolute top-2 right-2">
          <div className={`h-1.5 w-1.5 rounded-full ${isPlaying ? "bg-purple-400 animate-pulse" : "bg-gray-700"}`} />
        </div>
      </div>
      {/* Controls */}
      <div className="p-3 space-y-2.5">
        <div>
          <p className="text-xs font-bold text-white truncate">{device.name}</p>
          {title ? (
            <p className="text-[9px] text-purple-300/60 truncate mt-0.5">{artist} — {title}</p>
          ) : (
            <p className="text-[9px] text-gray-700 mt-0.5">{device.room} · {device.state}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onCommand(device.id, isPlaying ? "media_pause" : "media_play")}
            className="h-7 w-7 rounded-full flex items-center justify-center transition-all"
            style={{ background: `${color}25`, border: `1px solid ${color}35` }}>
            {isPlaying ? <Pause className="h-3.5 w-3.5" style={{ color }} /> : <Play className="h-3.5 w-3.5" style={{ color }} />}
          </button>
          <button onClick={() => onCommand(device.id, "media_next_track")}
            className="h-7 w-7 rounded-full flex items-center justify-center transition-all hover:bg-white/5">
            <SkipForward className="h-3.5 w-3.5 text-gray-600" />
          </button>
          <div className="flex-1 flex items-center gap-1.5">
            <Volume2 className="h-3 w-3 text-gray-700 shrink-0" />
            <div className="relative flex-1 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="absolute left-0 top-0 h-full rounded-full"
                style={{ width: `${vol * 100}%`, background: `linear-gradient(to right, ${color}60, ${color})` }} />
              <input type="range" min="0" max="1" step="0.05" value={vol}
                onChange={e => onCommand(device.id, "volume_set", { volume_level: parseFloat(e.target.value) })}
                className="absolute inset-0 w-full opacity-0 cursor-pointer h-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Room Icon ─────────────────────────────────────────────────────────────────
function roomIcon(room: string) {
  const r = room.toLowerCase();
  if (r.includes("salon") || r.includes("living")) return "🛋";
  if (r.includes("cuisine") || r.includes("kitchen")) return "🍳";
  if (r.includes("chambre") || r.includes("bedroom") || r.includes("room")) return "🛏";
  if (r.includes("salle de bain") || r.includes("bathroom")) return "🚿";
  if (r.includes("bureau") || r.includes("office")) return "💻";
  if (r.includes("extérieur") || r.includes("jardin") || r.includes("outdoor")) return "🌿";
  if (r.includes("couloir") || r.includes("hall") || r.includes("entrée")) return "🚪";
  if (r.includes("garage")) return "🚗";
  return "🏠";
}

// ── Main Domotique Page ───────────────────────────────────────────────────────
export default function Domotique() {
  const [devices,   setDevices]   = useState<Device[]>([]);
  const [haConfig,  setHaConfig]  = useState<HAConfig>({ url: "", token: "", isConnected: false });
  const [areaNames, setAreaNames] = useState<Record<string, string>>({});
  const [tab,       setTab]       = useState<Tab>("Tous");
  const [loading,   setLoading]   = useState(true);
  const [configOpen, setConfigOpen] = useState(false);
  const [urlInput,  setUrlInput]  = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connError, setConnError] = useState("");

  const fetchAll = useCallback(async () => {
    try {
      const [devRes, haRes, areaRes] = await Promise.all([
        axios.get("/api/home-assistant/devices"),
        axios.get("/api/home-assistant/config"),
        axios.get("/api/home-assistant/areas").catch(() => ({ data: {} })),
      ]);
      setDevices(devRes.data || []);
      setHaConfig(haRes.data);
      if (areaRes.data && typeof areaRes.data === "object") setAreaNames(areaRes.data);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, 6000);
    return () => clearInterval(id);
  }, [fetchAll]);

  useEffect(() => { setUrlInput(haConfig.url || ""); }, [haConfig.url]);

  const connectHA = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnecting(true); setConnError("");
    try {
      const res = await axios.post("/api/home-assistant/config", { url: urlInput, token: tokenInput });
      if (res.data.success) { setHaConfig(res.data.config); setConfigOpen(false); await fetchAll(); }
      else setConnError(res.data.message || "Erreur de connexion");
    } catch (err: any) {
      setConnError(err.response?.data?.message || "Impossible de joindre le serveur Home Assistant");
    } finally { setConnecting(false); }
  };

  const sendCommand = useCallback(async (entity_id: string, service: string, data?: any) => {
    try {
      await axios.post("/api/home-assistant/command", { entity_id, service, data });
      setTimeout(fetchAll, 350);
    } catch {}
  }, [fetchAll]);

  // Resolve room name: prefer area registry name, fallback to device.room
  const resolveRoom = (device: Device) => {
    const id = device.attributes?.area_id || device.room;
    return areaNames[id] || device.room || "Général";
  };

  const filtered = tab === "Tous" ? devices : devices.filter(d => TAB_TYPES[tab].includes(d.type));
  const byRoom   = filtered.reduce<Record<string, Device[]>>((acc, d) => {
    const r = resolveRoom(d);
    if (!acc[r]) acc[r] = [];
    acc[r].push(d);
    return acc;
  }, {});

  // Count by tab
  const counts = Object.fromEntries(
    TABS.map(t => [t, t === "Tous" ? devices.length : devices.filter(d => TAB_TYPES[t].includes(d.type)).length])
  );

  return (
    <div className="p-5 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white tracking-wide">Domotique HA</h1>
          <p className="text-xs text-gray-600 mt-0.5">
            {haConfig.isConnected ? `${devices.length} appareils · ${Object.keys(byRoom).length} pièces` : "Mode démo"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchAll} className="text-gray-600 hover:text-gray-400 transition-colors p-2">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button onClick={() => setConfigOpen(!configOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={{ background: haConfig.isConnected ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.05)", border: haConfig.isConnected ? "1px solid rgba(16,185,129,0.2)" : "1px solid rgba(255,255,255,0.08)" }}>
            <Settings className="h-3.5 w-3.5" style={{ color: haConfig.isConnected ? "#10b981" : "#6b7280" }} />
            <span style={{ color: haConfig.isConnected ? "#10b981" : "#9ca3af" }}>
              {haConfig.isConnected ? "HA Connecté" : "Config HA"}
            </span>
          </button>
        </div>
      </div>

      {/* Connection status banner */}
      {!haConfig.isConnected && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs"
          style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)" }}>
          <WifiOff className="h-4 w-4 text-amber-500 shrink-0" />
          <span className="text-amber-500/80">Mode démo — configurez l'URL et le token pour vous connecter à votre vrai HA.</span>
          <button onClick={() => setConfigOpen(true)}
            className="ml-auto px-2 py-1 rounded-lg text-[10px] font-bold text-amber-400 transition-all hover:bg-amber-500/10">
            Configurer →
          </button>
        </div>
      )}

      {/* Config panel */}
      {configOpen && (
        <form onSubmit={connectHA} className="rounded-2xl p-4 space-y-3"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Connexion Home Assistant</h3>
            <button type="button" onClick={() => setConfigOpen(false)} className="text-gray-600 hover:text-gray-400 text-xs">✕</button>
          </div>
          <p className="text-[10px] text-gray-700">
            ⚠️ L'URL doit être accessible depuis Internet (Nabu Casa, tunnel Cloudflare, ou IP publique). Les IP locales (192.168.x.x) ne sont pas joignables depuis Replit.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-1 block">URL publique HA</label>
              <input type="text" value={urlInput} onChange={e => setUrlInput(e.target.value)}
                placeholder="https://monha.duckdns.org:8123"
                className="w-full rounded-xl py-2.5 px-3 text-xs text-white placeholder:text-gray-700 focus:outline-none"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-1 block">Token Long-Lived</label>
              <input type="password" value={tokenInput} onChange={e => setTokenInput(e.target.value)}
                placeholder="eyJhbGci..."
                className="w-full rounded-xl py-2.5 px-3 text-xs text-white placeholder:text-gray-700 focus:outline-none"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
            </div>
          </div>
          {connError && <p className="text-red-400 text-xs flex items-center gap-1.5"><AlertTriangle className="h-3 w-3" />{connError}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={connecting || !urlInput || !tokenInput}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-40"
              style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.3)" }}>
              {connecting ? "Connexion..." : "Se connecter"}
            </button>
            <button type="button" onClick={() => setConfigOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:text-gray-300 transition-colors">
              Annuler
            </button>
          </div>
        </form>
      )}

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              tab === t ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30" : "text-gray-600 hover:text-gray-400 border border-transparent hover:bg-white/4"
            }`}>
            {t}
            {counts[t] > 0 && (
              <span className={`text-[9px] px-1 rounded font-mono ${tab === t ? "bg-indigo-500/20 text-indigo-400" : "bg-white/5 text-gray-700"}`}>{counts[t]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Device grid by room */}
      {loading ? (
        <div className="text-center py-20 text-gray-700">
          <RefreshCw className="h-8 w-8 mx-auto mb-3 opacity-30 animate-spin" />
          <p className="text-sm">Chargement des appareils...</p>
        </div>
      ) : Object.entries(byRoom).length === 0 ? (
        <div className="text-center py-20 text-gray-700">
          <Home className="h-8 w-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aucun appareil dans cette catégorie</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(byRoom).map(([room, roomDevices]) => (
            <div key={room}>
              {/* Room header */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-base leading-none">{roomIcon(room)}</span>
                <span className="text-sm font-bold text-white/80">{room}</span>
                <span className="text-[9px] text-gray-700 font-mono">{roomDevices.length} appareil{roomDevices.length > 1 ? "s" : ""}</span>
                <div className="h-px flex-1 bg-white/5" />
              </div>
              {/* Device cards: cameras full-width in 2col, others in 3col */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {roomDevices.map(device => {
                  if (device.type === "camera") {
                    return (
                      <div key={device.id} className="sm:col-span-2 lg:col-span-1">
                        <CameraCard device={device} haConnected={haConfig.isConnected} />
                      </div>
                    );
                  }
                  if (device.type === "light") return <LightCard key={device.id} device={device} onCommand={sendCommand} />;
                  if (device.type === "cover")  return <CoverCard  key={device.id} device={device} onCommand={sendCommand} />;
                  if (device.type === "climate") return <ClimateCard key={device.id} device={device} onCommand={sendCommand} />;
                  if (device.type === "switch") return <SwitchCard  key={device.id} device={device} onCommand={sendCommand} />;
                  if (device.type === "media_player") return <MediaCard key={device.id} device={device} onCommand={sendCommand} />;
                  // Generic fallback
                  return (
                    <div key={device.id} className="rounded-2xl p-4"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <p className="text-xs font-bold text-white">{device.name}</p>
                      <p className="text-[9px] text-gray-600">{device.state}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
