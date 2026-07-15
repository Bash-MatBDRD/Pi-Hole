import React, { useState, useEffect, useCallback } from "react";
import {
  Home, Lightbulb, Wind, Thermometer, Tv, Video, Zap,
  RefreshCw, Wifi, WifiOff, Settings, Play, Pause,
  SkipForward, Volume2, Sun, Moon,
  AlertTriangle, Maximize2, ChevronLeft, ChevronRight,
  Layers,
} from "lucide-react";
import axios from "axios";

interface Device {
  id: string; name: string; type: string; state: string; room: string; attributes: any;
}
interface HAConfig { url: string; token: string; isConnected: boolean; }

// ── Room metadata ─────────────────────────────────────────────────────────────
function roomIcon(room: string) {
  const r = room.toLowerCase();
  if (r.includes("salon") || r.includes("living"))                      return "🛋";
  if (r.includes("cuisine") || r.includes("kitchen"))                   return "🍳";
  if (r.includes("salle de bain") || r.includes("bathroom"))            return "🚿";
  if (r.includes("toilette") || r.includes("wc"))                       return "🚽";
  if (r.includes("dressing"))                                            return "👗";
  if (r.includes("chambre") || r.includes("bedroom"))                   return "🛏";
  if (r.includes("jardin") || r.includes("extérieur") || r.includes("outdoor")) return "🌿";
  if (r.includes("couloir") || r.includes("hall") || r.includes("entrée")) return "🚪";
  if (r.includes("garage"))                                              return "🚗";
  if (r.includes("bureau") || r.includes("office"))                     return "💻";
  if (r.includes("général") || r.includes("general"))                   return "🏠";
  return "📦";
}

function roomColor(room: string) {
  const r = room.toLowerCase();
  if (r.includes("salon"))                                    return { main: "#f59e0b", bg: "rgba(245,158,11,0.07)",  border: "rgba(245,158,11,0.18)"  };
  if (r.includes("cuisine"))                                  return { main: "#f97316", bg: "rgba(249,115,22,0.07)",  border: "rgba(249,115,22,0.18)"  };
  if (r.includes("salle de bain"))                            return { main: "#06b6d4", bg: "rgba(6,182,212,0.07)",   border: "rgba(6,182,212,0.18)"   };
  if (r.includes("toilette") || r.includes("wc"))            return { main: "#38bdf8", bg: "rgba(56,189,248,0.07)",  border: "rgba(56,189,248,0.18)"  };
  if (r.includes("dressing"))                                 return { main: "#f472b6", bg: "rgba(244,114,182,0.07)", border: "rgba(244,114,182,0.18)" };
  if (r.includes("chambre parental") || r.includes("parental")) return { main: "#c084fc", bg: "rgba(192,132,252,0.07)", border: "rgba(192,132,252,0.18)" };
  if (r.includes("chambre mathieu"))                          return { main: "#818cf8", bg: "rgba(129,140,248,0.07)", border: "rgba(129,140,248,0.18)" };
  if (r.includes("chambre nicolas"))                          return { main: "#34d399", bg: "rgba(52,211,153,0.07)",  border: "rgba(52,211,153,0.18)"  };
  if (r.includes("chambre laurent"))                          return { main: "#fb923c", bg: "rgba(251,146,60,0.07)",  border: "rgba(251,146,60,0.18)"  };
  if (r.includes("chambre"))                                  return { main: "#a855f7", bg: "rgba(168,85,247,0.07)",  border: "rgba(168,85,247,0.18)"  };
  if (r.includes("jardin") || r.includes("extérieur"))        return { main: "#22c55e", bg: "rgba(34,197,94,0.07)",   border: "rgba(34,197,94,0.18)"   };
  if (r.includes("couloir") || r.includes("entrée"))          return { main: "#94a3b8", bg: "rgba(148,163,184,0.07)", border: "rgba(148,163,184,0.18)" };
  if (r.includes("garage"))                                   return { main: "#78716c", bg: "rgba(120,113,108,0.07)", border: "rgba(120,113,108,0.18)" };
  if (r.includes("bureau"))                                   return { main: "#6366f1", bg: "rgba(99,102,241,0.07)",  border: "rgba(99,102,241,0.18)"  };
  return                                                               { main: "#64748b", bg: "rgba(100,116,139,0.07)", border: "rgba(100,116,139,0.18)" };
}

const TYPE_LABEL: Record<string, string> = {
  light: "Lumière", cover: "Volet", climate: "Thermostat",
  media_player: "Lecteur", camera: "Caméra", switch: "Prise",
};

// ── Small device cards used inside room detail ────────────────────────────────
function LightCard({ device, onCommand }: { device: Device; onCommand: (id: string, svc: string, d?: any) => Promise<void> }) {
  const isOn = device.state === "on";
  const bri = device.attributes?.brightness ?? 0;
  const colorRgb = device.attributes?.rgb_color;
  const bulbColor = colorRgb
    ? `rgb(${colorRgb[0]},${colorRgb[1]},${colorRgb[2]})`
    : isOn ? "#fbbf24" : "#374151";
  const accent = "#f59e0b";

  return (
    <div className="rounded-2xl p-4 transition-all select-none"
      style={{
        background: isOn ? "rgba(251,191,36,0.06)" : "rgba(255,255,255,0.03)",
        border: isOn ? "1px solid rgba(251,191,36,0.2)" : "1px solid rgba(255,255,255,0.06)",
        boxShadow: isOn ? "0 0 24px rgba(251,191,36,0.07)" : "none",
      }}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 flex items-center justify-center">
            {isOn && <div className="absolute inset-0 rounded-full animate-pulse"
              style={{ background: `radial-gradient(circle, ${bulbColor}40 0%, transparent 70%)`, transform: "scale(1.6)" }} />}
            <div className="relative w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: isOn ? `${accent}18` : "rgba(255,255,255,0.04)", border: `1px solid ${isOn ? accent + "30" : "rgba(255,255,255,0.08)"}` }}>
              <Lightbulb className="h-5 w-5" style={{ color: isOn ? bulbColor : "#374151", filter: isOn ? `drop-shadow(0 0 4px ${bulbColor})` : "none" }} />
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-white leading-tight">{device.name}</p>
            <p className="text-[9px] text-gray-600 mt-0.5">{isOn ? `${bri}%` : "Éteint"}</p>
          </div>
        </div>
        <button onClick={() => onCommand(device.id, isOn ? "turn_off" : "turn_on")}
          className="h-6 w-11 rounded-full relative flex items-center px-1 transition-all flex-shrink-0"
          style={{ background: isOn ? `${accent}35` : "rgba(255,255,255,0.07)", border: `1px solid ${isOn ? accent + "55" : "rgba(255,255,255,0.1)"}` }}>
          <div className="h-3.5 w-3.5 rounded-full transition-all duration-200 shadow-md"
            style={{ background: isOn ? accent : "#4b5563", transform: isOn ? "translateX(18px)" : "translateX(0)" }} />
        </button>
      </div>
      {isOn && (
        <div className="space-y-1.5">
          <div className="relative h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="absolute left-0 top-0 h-full rounded-full transition-all"
              style={{ width: `${bri}%`, background: `linear-gradient(to right, ${accent}80, ${accent})` }} />
            <input type="range" min="0" max="100" value={bri}
              onChange={e => onCommand(device.id, "set_brightness", { brightness: +e.target.value })}
              className="absolute inset-0 w-full opacity-0 cursor-pointer h-full" />
          </div>
          <div className="flex gap-1.5">
            {(["warm", "daylight", "cool"] as const).map((t, i) => (
              <button key={t} onClick={() => onCommand(device.id, "set_color_temp", { color_temp: t })}
                className="flex-1 py-1 rounded-lg text-[9px] font-semibold transition-all"
                style={{
                  background: device.attributes?.color_temp === t ? `${accent}20` : "rgba(255,255,255,0.04)",
                  border: `1px solid ${device.attributes?.color_temp === t ? accent + "40" : "rgba(255,255,255,0.06)"}`,
                  color: device.attributes?.color_temp === t ? accent : "#6b7280",
                }}>
                {i === 0 ? "🔥" : i === 1 ? "☀" : "❄"}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CoverCard({ device, onCommand }: { device: Device; onCommand: (id: string, svc: string, d?: any) => Promise<void> }) {
  const pos = device.attributes?.current_position ?? 0;
  const isOpen = device.state === "open";
  const color = "#06b6d4";
  return (
    <div className="rounded-2xl p-4" style={{ background: "rgba(6,182,212,0.04)", border: `1px solid ${isOpen ? "rgba(6,182,212,0.2)" : "rgba(255,255,255,0.06)"}` }}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-2xl overflow-hidden flex items-end"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(6,182,212,0.2)" }}>
            <div className="w-full transition-all duration-500"
              style={{ height: `${100 - pos}%`, background: "rgba(6,182,212,0.3)", borderTop: "1px solid rgba(6,182,212,0.5)" }} />
          </div>
          <div>
            <p className="text-xs font-bold text-white">{device.name}</p>
            <p className="text-[9px] text-gray-600">{pos}% ouvert</p>
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={() => onCommand(device.id, "open_cover")}
            className="px-2 py-1 rounded-lg text-[9px] font-semibold"
            style={{ background: isOpen ? `${color}20` : "rgba(255,255,255,0.04)", color: isOpen ? color : "#6b7280" }}>↑</button>
          <button onClick={() => onCommand(device.id, "close_cover")}
            className="px-2 py-1 rounded-lg text-[9px] font-semibold"
            style={{ background: !isOpen ? `${color}20` : "rgba(255,255,255,0.04)", color: !isOpen ? color : "#6b7280" }}>↓</button>
        </div>
      </div>
      <div className="relative h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div className="absolute left-0 top-0 h-full rounded-full" style={{ width: `${pos}%`, background: `linear-gradient(to right, ${color}60, ${color})` }} />
        <input type="range" min="0" max="100" value={pos}
          onChange={e => onCommand(device.id, "set_position", { position: +e.target.value })}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-full" />
      </div>
    </div>
  );
}

function ClimateCard({ device, onCommand }: { device: Device; onCommand: (id: string, svc: string, d?: any) => Promise<void> }) {
  const cur = device.attributes?.current_temperature ?? 20;
  const tgt = device.attributes?.temperature ?? 21;
  const color = "#f97316";
  const isHeating = device.state === "heat";
  const r = 28; const circ = 2 * Math.PI * r;
  const arcPct = Math.min(100, Math.max(0, ((tgt - 15) / 15) * 100));
  const dash = (arcPct / 100) * circ * 0.75;
  return (
    <div className="rounded-2xl p-4" style={{ background: isHeating ? "rgba(249,115,22,0.05)" : "rgba(255,255,255,0.03)", border: `1px solid ${isHeating ? "rgba(249,115,22,0.2)" : "rgba(255,255,255,0.06)"}` }}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs font-bold text-white">{device.name}</p>
          <div className={`mt-1 px-2 py-0.5 rounded-full text-[9px] font-semibold inline-block ${isHeating ? "bg-orange-500/15 text-orange-400" : "bg-gray-800 text-gray-500"}`}>
            {isHeating ? "🔥 Chauffe" : "En veille"}
          </div>
        </div>
        <div className="relative w-16 h-16 flex-shrink-0">
          <svg className="w-16 h-16" style={{ transform: "rotate(135deg)" }}>
            <circle cx="32" cy="32" r={r} fill="none" strokeWidth="4" stroke="rgba(255,255,255,0.06)"
              strokeDasharray={`${circ * 0.75} ${circ}`} strokeLinecap="round" />
            <circle cx="32" cy="32" r={r} fill="none" strokeWidth="4" stroke={color}
              strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 3px ${color})`, transition: "stroke-dasharray 0.5s ease" }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-base font-black text-white">{tgt}°</span>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between text-[9px] text-gray-600 mb-2">
        <span>Actuelle: <span className="text-orange-300 font-bold">{cur}°C</span></span>
        <span>Cible: <span style={{ color }} className="font-bold">{tgt}°C</span></span>
      </div>
      <div className="flex gap-1">
        <button onClick={() => onCommand(device.id, "set_temperature", { temperature: Math.max(15, tgt - 0.5) })}
          className="flex-1 py-1.5 rounded-xl text-sm font-bold text-gray-500 hover:text-white hover:bg-white/5 transition-all">−</button>
        <button onClick={() => onCommand(device.id, "set_temperature", { temperature: Math.min(30, tgt + 0.5) })}
          className="flex-1 py-1.5 rounded-xl text-sm font-bold text-gray-500 hover:text-white hover:bg-white/5 transition-all">+</button>
      </div>
    </div>
  );
}

function SwitchCard({ device, onCommand }: { device: Device; onCommand: (id: string, svc: string, d?: any) => Promise<void> }) {
  const isOn = device.state === "on";
  const power = device.attributes?.power_w ?? 0;
  const color = "#6366f1";
  return (
    <div className="rounded-2xl p-4" style={{ background: isOn ? "rgba(99,102,241,0.05)" : "rgba(255,255,255,0.03)", border: `1px solid ${isOn ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.06)"}` }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: isOn ? `${color}18` : "rgba(255,255,255,0.04)", border: `1px solid ${isOn ? color + "30" : "rgba(255,255,255,0.08)"}` }}>
            <Zap className="h-5 w-5" style={{ color: isOn ? color : "#374151" }} />
          </div>
          <div>
            <p className="text-xs font-bold text-white">{device.name}</p>
            <p className="text-[9px] text-gray-600">{isOn ? `${power.toFixed(0)}W` : "Éteint"}</p>
          </div>
        </div>
        <button onClick={() => onCommand(device.id, isOn ? "turn_off" : "turn_on")}
          className="h-6 w-11 rounded-full relative flex items-center px-1 transition-all flex-shrink-0"
          style={{ background: isOn ? `${color}35` : "rgba(255,255,255,0.07)", border: `1px solid ${isOn ? color + "55" : "rgba(255,255,255,0.1)"}` }}>
          <div className="h-3.5 w-3.5 rounded-full transition-all duration-200"
            style={{ background: isOn ? color : "#4b5563", transform: isOn ? "translateX(18px)" : "translateX(0)" }} />
        </button>
      </div>
    </div>
  );
}

function MediaCard({ device, onCommand }: { device: Device; onCommand: (id: string, svc: string, d?: any) => Promise<void> }) {
  const isPlaying = device.state === "playing";
  const vol = device.attributes?.volume_level ?? 0.5;
  const color = "#a855f7";
  const title = device.attributes?.media_title;
  const artist = device.attributes?.media_artist;
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: isPlaying ? "rgba(168,85,247,0.06)" : "rgba(255,255,255,0.03)", border: `1px solid ${isPlaying ? "rgba(168,85,247,0.22)" : "rgba(255,255,255,0.06)"}` }}>
      <div className="relative h-16 flex items-center justify-center overflow-hidden"
        style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.12), rgba(99,102,241,0.08))" }}>
        <div className="flex gap-1 items-end h-8">
          {[3, 5, 7, 4, 6, 5, 3].map((h, i) => (
            <div key={i} className={`w-1 rounded-full ${isPlaying ? "animate-bounce" : ""}`}
              style={{ height: `${h * 3}px`, background: `rgba(168,85,247,${isPlaying ? 0.6 : 0.2})`, animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
      </div>
      <div className="p-3 space-y-2">
        <div>
          <p className="text-xs font-bold text-white truncate">{device.name}</p>
          {title ? (
            <p className="text-[9px] text-purple-300/60 truncate">{artist} — {title}</p>
          ) : (
            <p className="text-[9px] text-gray-700">{device.state}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onCommand(device.id, isPlaying ? "media_pause" : "media_play")}
            className="h-7 w-7 rounded-full flex items-center justify-center"
            style={{ background: `${color}25`, border: `1px solid ${color}35` }}>
            {isPlaying ? <Pause className="h-3.5 w-3.5" style={{ color }} /> : <Play className="h-3.5 w-3.5" style={{ color }} />}
          </button>
          <button onClick={() => onCommand(device.id, "media_next_track")}
            className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-white/5">
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

function CameraCard({ device, haConnected }: { device: Device; haConnected: boolean }) {
  const [imgTs, setImgTs] = useState(Date.now());
  const [imgOk, setImgOk] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const motion = device.attributes?.motion_detected;
  const snapshotUrl = haConnected ? `/api/home-assistant/camera-proxy/${device.id}?t=${imgTs}` : null;

  return (
    <>
      <div className="rounded-2xl overflow-hidden" style={{ border: motion ? "1px solid rgba(239,68,68,0.35)" : "1px solid rgba(255,255,255,0.06)", background: "rgba(5,5,8,0.9)" }}>
        <div className="relative bg-black" style={{ aspectRatio: "16/9" }}>
          {snapshotUrl && (
            <img src={snapshotUrl} alt={device.name} onLoad={() => setImgOk(true)} onError={() => setImgOk(false)}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity ${imgOk ? "opacity-100" : "opacity-0"}`} />
          )}
          {(!haConnected || !imgOk) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center"
              style={{ background: "radial-gradient(circle at 50% 40%, rgba(34,197,94,0.05), transparent 70%)" }}>
              <Video className="h-8 w-8 text-gray-800 mb-1" />
              <p className="text-[9px] text-gray-700">{haConnected ? "Flux indisponible" : "HA non connecté"}</p>
            </div>
          )}
          <div className="absolute top-2 left-2 flex items-center gap-1.5">
            <div className={`h-1.5 w-1.5 rounded-full ${motion ? "bg-red-500 animate-pulse" : "bg-emerald-500"}`} />
            <span className="text-[9px] font-bold text-white/80 uppercase">{motion ? "MOUVEMENT" : "LIVE"}</span>
          </div>
          <div className="absolute top-2 right-2 flex gap-1">
            <button onClick={() => setImgTs(Date.now())} className="p-1 rounded-lg" style={{ background: "rgba(0,0,0,0.5)" }}>
              <RefreshCw className="h-3 w-3 text-white/70" />
            </button>
            <button onClick={() => setFullscreen(true)} className="p-1 rounded-lg" style={{ background: "rgba(0,0,0,0.5)" }}>
              <Maximize2 className="h-3 w-3 text-white/70" />
            </button>
          </div>
        </div>
        <div className="px-3 py-2 flex items-center justify-between">
          <p className="text-xs font-bold text-white">{device.name}</p>
          {motion && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <AlertTriangle className="h-3 w-3 text-red-400" />
              <span className="text-[9px] text-red-400">Mouvement</span>
            </div>
          )}
        </div>
      </div>
      {fullscreen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.92)" }} onClick={() => setFullscreen(false)}>
          {snapshotUrl
            ? <img src={`/api/home-assistant/camera-proxy/${device.id}?t=${Date.now()}`} alt={device.name} className="max-w-full max-h-full rounded-2xl" />
            : <div className="text-gray-600 text-sm">Flux indisponible</div>
          }
        </div>
      )}
    </>
  );
}

// ── Device card dispatcher ────────────────────────────────────────────────────
function DeviceCard({ device, onCommand, haConnected }: { device: Device; onCommand: (id: string, svc: string, d?: any) => Promise<void>; haConnected: boolean }) {
  if (device.type === "light")        return <LightCard  device={device} onCommand={onCommand} />;
  if (device.type === "cover")        return <CoverCard  device={device} onCommand={onCommand} />;
  if (device.type === "climate")      return <ClimateCard device={device} onCommand={onCommand} />;
  if (device.type === "switch")       return <SwitchCard device={device} onCommand={onCommand} />;
  if (device.type === "media_player") return <MediaCard  device={device} onCommand={onCommand} />;
  if (device.type === "camera")       return <CameraCard device={device} haConnected={haConnected} />;
  return null;
}

// ── Room Card (main grid view) ────────────────────────────────────────────────
function RoomCard({ name, devices, onClick }: { name: string; devices: Device[]; onClick: () => void }) {
  const c = roomColor(name);
  const icon = roomIcon(name);
  const activeDevices = devices.filter(d => d.state === "on" || d.state === "open" || d.state === "playing" || d.state === "heat");

  // Count by type
  const counts: Record<string, number> = {};
  for (const d of devices) counts[d.type] = (counts[d.type] || 0) + 1;

  const typeIcons: Record<string, React.ElementType> = {
    light: Lightbulb, cover: Wind, climate: Thermometer,
    media_player: Tv, camera: Video, switch: Zap,
  };

  return (
    <button onClick={onClick}
      className="w-full text-left rounded-2xl p-5 transition-all hover:scale-[1.02] active:scale-[0.99] group"
      style={{ background: c.bg, border: `1px solid ${c.border}` }}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-2xl">{icon}</div>
          <div>
            <p className="text-sm font-bold text-white">{name}</p>
            <p className="text-[10px] mt-0.5" style={{ color: c.main }}>
              {devices.length} appareil{devices.length !== 1 ? "s" : ""}
              {activeDevices.length > 0 && <span className="text-gray-500"> · {activeDevices.length} actif{activeDevices.length !== 1 ? "s" : ""}</span>}
            </p>
          </div>
        </div>
        <div className="p-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: "rgba(255,255,255,0.06)" }}>
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </div>
      </div>

      {/* Type summary pills */}
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(counts).map(([type, count]) => {
          const Icon = typeIcons[type];
          if (!Icon) return null;
          const active = devices.filter(d => d.type === type && (d.state === "on" || d.state === "open" || d.state === "playing" || d.state === "heat")).length;
          return (
            <div key={type} className="flex items-center gap-1 px-2 py-1 rounded-lg"
              style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <Icon className="h-3 w-3" style={{ color: active > 0 ? c.main : "#4b5563" }} />
              <span className="text-[9px] font-semibold" style={{ color: active > 0 ? c.main : "#6b7280" }}>
                {active > 0 ? `${active}/` : ""}{count}
              </span>
            </div>
          );
        })}
      </div>

      {/* Active indicator */}
      {activeDevices.length > 0 && (
        <div className="mt-3 flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: c.main }} />
          <span className="text-[9px] font-semibold" style={{ color: c.main }}>
            {activeDevices.map(d => d.name).slice(0, 2).join(", ")}{activeDevices.length > 2 ? ` +${activeDevices.length - 2}` : ""}
          </span>
        </div>
      )}
    </button>
  );
}

// ── Room Detail View ──────────────────────────────────────────────────────────
function RoomDetail({
  name, devices, onBack, onCommand, haConnected
}: {
  name: string; devices: Device[];
  onBack: () => void;
  onCommand: (id: string, svc: string, d?: any) => Promise<void>;
  haConnected: boolean;
}) {
  const c = roomColor(name);
  const icon = roomIcon(name);

  // Group devices by type
  const byType: Record<string, Device[]> = {};
  const typeOrder = ["light", "climate", "cover", "switch", "media_player", "camera"];
  for (const type of typeOrder) {
    const group = devices.filter(d => d.type === type);
    if (group.length > 0) byType[type] = group;
  }
  // Anything else
  for (const d of devices) {
    if (!typeOrder.includes(d.type)) {
      byType[d.type] = byType[d.type] || [];
      byType[d.type].push(d);
    }
  }

  const activeCount = devices.filter(d => d.state === "on" || d.state === "open" || d.state === "playing" || d.state === "heat").length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-500 hover:text-white transition-all hover:bg-white/5">
          <ChevronLeft className="h-4 w-4" /> Retour
        </button>
        <div className="flex items-center gap-3 flex-1">
          <span className="text-2xl">{icon}</span>
          <div>
            <h1 className="text-xl font-black text-white">{name}</h1>
            <p className="text-xs mt-0.5" style={{ color: c.main }}>
              {devices.length} appareils · {activeCount} actif{activeCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Sections by type */}
      {Object.entries(byType).map(([type, devs]) => (
        <div key={type}>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.05)" }} />
            <span className="text-[9px] font-bold uppercase tracking-widest text-gray-600 px-2">
              {TYPE_LABEL[type] || type}s ({devs.length})
            </span>
            <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.05)" }} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {devs.map(d => (
              <DeviceCard key={d.id} device={d} onCommand={onCommand} haConnected={haConnected} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── HA Config Panel ───────────────────────────────────────────────────────────
function HAConfigPanel({
  haConfig, onSave, onClose
}: {
  haConfig: HAConfig;
  onSave: (url: string, token: string) => Promise<void>;
  onClose: () => void;
}) {
  const [url, setUrl] = useState(haConfig.url || "");
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      await onSave(url, token);
      onClose();
    } catch (err: any) {
      setError(err.message || "Erreur de connexion");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl p-5 mb-4" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-bold text-white">Configuration Home Assistant</span>
        <button onClick={onClose} className="text-xs text-gray-600 hover:text-gray-400">✕</button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">URL publique</label>
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://monha.duckdns.org:8123"
            className="w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-gray-700 focus:outline-none"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Long-Lived Access Token</label>
          <input value={token} onChange={e => setToken(e.target.value)} placeholder="eyJh..."
            className="w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-gray-700 focus:outline-none"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
        </div>
        {error && <p className="text-xs text-red-400 px-1">{error}</p>}
        <button type="submit" disabled={saving || !url}
          className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
          style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.25)" }}>
          {saving ? "Connexion…" : "Connecter"}
        </button>
      </form>
    </div>
  );
}

// ── Main Domotique Page ───────────────────────────────────────────────────────
export default function Domotique() {
  const [devices,    setDevices]    = useState<Device[]>([]);
  const [haConfig,   setHaConfig]   = useState<HAConfig>({ url: "", token: "", isConnected: false });
  const [areaNames,  setAreaNames]  = useState<Record<string, string>>({});
  const [loading,    setLoading]    = useState(true);
  const [configOpen, setConfigOpen] = useState(false);
  const [connError,  setConnError]  = useState("");
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);

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

  const connectHA = async (url: string, token: string) => {
    const res = await axios.post("/api/home-assistant/config", { url, token });
    if (res.data.success) {
      setHaConfig(res.data.config);
      await fetchAll();
    } else {
      throw new Error(res.data.message || "Erreur de connexion");
    }
  };

  const sendCommand = useCallback(async (entity_id: string, service: string, data?: any) => {
    try {
      await axios.post("/api/home-assistant/command", { entity_id, service, data });
      setTimeout(fetchAll, 350);
    } catch {}
  }, [fetchAll]);

  // Resolve room display name
  const resolveRoom = (device: Device) => {
    const id = device.room; // already the area_id from server
    return areaNames[id] || device.room || "Général";
  };

  // Build rooms map
  const byRoom = devices.reduce<Record<string, Device[]>>((acc, d) => {
    const r = resolveRoom(d);
    if (!acc[r]) acc[r] = [];
    acc[r].push(d);
    return acc;
  }, {});

  // Sort rooms: real rooms first, "Général" last
  const roomNames = Object.keys(byRoom).sort((a, b) => {
    if (a === "Général") return 1;
    if (b === "Général") return -1;
    return a.localeCompare(b, "fr");
  });

  const totalActive = devices.filter(d => d.state === "on" || d.state === "open" || d.state === "playing" || d.state === "heat").length;

  // ── Room detail view ────────────────────────────────────────────────────────
  if (selectedRoom && byRoom[selectedRoom]) {
    return (
      <div className="p-5 max-w-7xl mx-auto">
        <RoomDetail
          name={selectedRoom}
          devices={byRoom[selectedRoom]}
          onBack={() => setSelectedRoom(null)}
          onCommand={sendCommand}
          haConnected={haConfig.isConnected}
        />
      </div>
    );
  }

  // ── Rooms grid view ─────────────────────────────────────────────────────────
  return (
    <div className="p-5 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white tracking-wide">Domotique</h1>
          <p className="text-xs text-gray-600 mt-0.5">
            {haConfig.isConnected
              ? `${roomNames.length} pièces · ${devices.length} appareils · ${totalActive} actifs`
              : "Mode démo"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchAll()} className="p-2 text-gray-600 hover:text-gray-400 transition-colors">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button onClick={() => setConfigOpen(!configOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: haConfig.isConnected ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.05)",
              border: haConfig.isConnected ? "1px solid rgba(16,185,129,0.2)" : "1px solid rgba(255,255,255,0.08)"
            }}>
            {haConfig.isConnected
              ? <><Wifi className="h-3.5 w-3.5 text-emerald-400" /><span className="text-emerald-400">HA Connecté</span></>
              : <><WifiOff className="h-3.5 w-3.5 text-gray-500" /><span className="text-gray-400">Config HA</span></>
            }
          </button>
        </div>
      </div>

      {/* Config panel */}
      {configOpen && (
        <HAConfigPanel haConfig={haConfig} onSave={connectHA} onClose={() => setConfigOpen(false)} />
      )}

      {/* Not connected banner */}
      {!haConfig.isConnected && !configOpen && (
        <div className="rounded-xl p-4 flex items-center gap-3"
          style={{ background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.14)" }}>
          <WifiOff className="h-4 w-4 text-amber-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-amber-400">Mode démo — données simulées</p>
            <p className="text-[9px] text-gray-600 mt-0.5">Connecte ton Home Assistant pour contrôler tes vrais appareils.</p>
          </div>
          <button onClick={() => setConfigOpen(true)}
            className="text-[10px] font-bold text-amber-500 px-3 py-1.5 rounded-lg hover:bg-amber-500/10 transition-all shrink-0">
            Connecter
          </button>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="rounded-2xl h-36 animate-pulse" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }} />
          ))}
        </div>
      ) : roomNames.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Layers className="h-12 w-12 text-gray-800 mb-3" />
          <p className="text-sm font-semibold text-gray-600">Aucune pièce trouvée</p>
          <p className="text-xs text-gray-700 mt-1">Connecte Home Assistant ou configure tes zones dans HA.</p>
        </div>
      ) : (
        <>
          {/* Summary strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: "Pièces", val: roomNames.length, icon: Home, color: "#6366f1" },
              { label: "Appareils", val: devices.length, icon: Layers, color: "#06b6d4" },
              { label: "Actifs", val: totalActive, icon: Zap, color: "#22c55e" },
              { label: "Lumières", val: devices.filter(d => d.type === "light" && d.state === "on").length + "/" + devices.filter(d => d.type === "light").length, icon: Lightbulb, color: "#f59e0b" },
            ].map(({ label, val, icon: Icon, color }) => (
              <div key={label} className="rounded-xl px-3 py-2.5 flex items-center gap-2.5"
                style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="p-1.5 rounded-lg shrink-0" style={{ background: `${color}14` }}>
                  <Icon className="h-3.5 w-3.5" style={{ color }} />
                </div>
                <div>
                  <div className="text-sm font-black text-white">{val}</div>
                  <div className="text-[9px] text-gray-600">{label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Rooms grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {roomNames.map(room => (
              <RoomCard
                key={room}
                name={room}
                devices={byRoom[room]}
                onClick={() => setSelectedRoom(room)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
