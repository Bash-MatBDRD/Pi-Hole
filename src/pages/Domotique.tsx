import React, { useState, useEffect, useCallback } from "react";
import {
  Home, Lightbulb, Wind, Thermometer, Tv, Video, Zap,
  Power, ChevronDown, ChevronUp, RefreshCw, Wifi, WifiOff,
  Sun, Moon, Settings, Play, Pause, SkipForward, Volume2,
} from "lucide-react";
import axios from "axios";

interface Device { id: string; name: string; type: string; state: string; room: string; attributes: any; }
interface HAConfig { url: string; token: string; isConnected: boolean; }

const TABS = ["Tous", "Lumières", "Volets", "Climat", "Média", "Caméras", "Prises"] as const;
type Tab = typeof TABS[number];

const TYPE_ICONS: Record<string, React.ElementType> = {
  light:        Lightbulb,
  cover:        Wind,
  climate:      Thermometer,
  media_player: Tv,
  camera:       Video,
  switch:       Zap,
};

const TYPE_COLORS: Record<string, string> = {
  light:        "#f59e0b",
  cover:        "#06b6d4",
  climate:      "#f97316",
  media_player: "#a855f7",
  camera:       "#22c55e",
  switch:       "#6366f1",
};

const TAB_TYPES: Record<Tab, string[]> = {
  "Tous":    [],
  "Lumières": ["light"],
  "Volets":  ["cover"],
  "Climat":  ["climate"],
  "Média":   ["media_player"],
  "Caméras": ["camera"],
  "Prises":  ["switch"],
};

function DeviceCard({ device, onCommand }: { device: Device; onCommand: (entity_id: string, service: string, data?: any) => Promise<void> }) {
  const Icon  = TYPE_ICONS[device.type] || Zap;
  const color = TYPE_COLORS[device.type] || "#6366f1";
  const isOn  = device.state === "on" || device.state === "open" || device.state === "playing" || device.state === "heat";

  const toggle = () => {
    if (device.type === "cover") {
      onCommand(device.id, isOn ? "close_cover" : "open_cover");
    } else {
      onCommand(device.id, isOn ? "turn_off" : "turn_on");
    }
  };

  return (
    <div className="rounded-2xl p-4 transition-all"
      style={{
        background: isOn ? `${color}08` : "rgba(255,255,255,0.03)",
        border: isOn ? `1px solid ${color}25` : "1px solid rgba(255,255,255,0.06)",
      }}>
      {/* Header row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: isOn ? `${color}20` : "rgba(255,255,255,0.05)", border: `1px solid ${isOn ? color + "30" : "rgba(255,255,255,0.08)"}` }}>
            <Icon className="h-4 w-4" style={{ color: isOn ? color : "#6b7280" }} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white truncate">{device.name}</p>
            <p className="text-[9px] text-gray-600 mt-0.5">{device.room}</p>
          </div>
        </div>

        {/* Toggle */}
        <button
          onClick={toggle}
          className="h-7 w-12 rounded-full relative transition-all flex items-center px-1"
          style={{ background: isOn ? `${color}30` : "rgba(255,255,255,0.06)", border: `1px solid ${isOn ? color + "50" : "rgba(255,255,255,0.1)"}` }}
        >
          <div className="h-4 w-4 rounded-full transition-all duration-200"
            style={{ background: isOn ? color : "#374151", transform: isOn ? "translateX(20px)" : "translateX(0)" }} />
        </button>
      </div>

      {/* State label */}
      <div className="text-[9px] uppercase tracking-widest font-semibold"
        style={{ color: isOn ? color : "#4b5563" }}>
        {device.state === "on" ? "Allumé" : device.state === "off" ? "Éteint" : device.state === "open" ? "Ouvert" : device.state === "closed" ? "Fermé" : device.state === "playing" ? "Lecture" : device.state === "paused" ? "En pause" : device.state === "heat" ? "Chauffe" : device.state}
      </div>

      {/* Attributes */}
      <div className="mt-2 space-y-1.5">
        {/* Brightness */}
        {device.type === "light" && device.state === "on" && device.attributes?.brightness !== undefined && (
          <div>
            <div className="flex justify-between text-[9px] text-gray-600 mb-1">
              <span>Luminosité</span><span style={{ color }}>{device.attributes.brightness}%</span>
            </div>
            <input
              type="range" min="0" max="100" value={device.attributes.brightness}
              onChange={(e) => onCommand(device.id, "set_brightness", { brightness: parseInt(e.target.value) })}
              className="w-full h-1 rounded-full appearance-none cursor-pointer"
              style={{ accentColor: color }}
            />
          </div>
        )}

        {/* Cover position */}
        {device.type === "cover" && (
          <div>
            <div className="flex justify-between text-[9px] text-gray-600 mb-1">
              <span>Position</span><span style={{ color }}>{device.attributes?.current_position ?? 0}%</span>
            </div>
            <input
              type="range" min="0" max="100" value={device.attributes?.current_position ?? 0}
              onChange={(e) => onCommand(device.id, "set_position", { position: parseInt(e.target.value) })}
              className="w-full h-1 rounded-full appearance-none cursor-pointer"
              style={{ accentColor: color }}
            />
          </div>
        )}

        {/* Climate temp */}
        {device.type === "climate" && (
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg p-2 text-center"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="text-[9px] text-gray-600">Actuelle</div>
              <div className="text-sm font-bold text-orange-400">{device.attributes?.current_temperature}°C</div>
            </div>
            <div className="rounded-lg p-2 text-center"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="text-[9px] text-gray-600">Cible</div>
              <div className="text-sm font-bold text-white">{device.attributes?.temperature}°C</div>
            </div>
          </div>
        )}

        {/* Media player */}
        {device.type === "media_player" && (
          <div className="space-y-1.5">
            {device.attributes?.media_title && (
              <div className="text-[9px] text-gray-500 truncate">
                {device.attributes.media_artist} — {device.attributes.media_title}
              </div>
            )}
            <div className="flex items-center gap-2">
              <button onClick={() => onCommand(device.id, device.state === "playing" ? "media_pause" : "media_play")}
                className="h-6 w-6 rounded-full flex items-center justify-center transition-all"
                style={{ background: `${color}20`, border: `1px solid ${color}30` }}>
                {device.state === "playing" ? <Pause className="h-3 w-3" style={{ color }} /> : <Play className="h-3 w-3" style={{ color }} />}
              </button>
              <button onClick={() => onCommand(device.id, "media_next_track")}
                className="h-6 w-6 rounded-full flex items-center justify-center transition-all hover:bg-white/5">
                <SkipForward className="h-3 w-3 text-gray-500" />
              </button>
              {device.attributes?.volume_level !== undefined && (
                <div className="flex-1 flex items-center gap-1.5">
                  <Volume2 className="h-3 w-3 text-gray-600 shrink-0" />
                  <input
                    type="range" min="0" max="1" step="0.05" value={device.attributes.volume_level}
                    onChange={(e) => onCommand(device.id, "volume_set", { volume_level: parseFloat(e.target.value) })}
                    className="flex-1 h-1 rounded-full appearance-none cursor-pointer"
                    style={{ accentColor: color }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Switch power */}
        {device.type === "switch" && device.attributes?.power_w !== undefined && (
          <div className="text-[9px] text-gray-600">
            <span style={{ color: "#22c55e" }}>{device.attributes.power_w.toFixed(1)}W</span>
            {device.attributes.today_energy_kwh !== undefined && ` · ${device.attributes.today_energy_kwh.toFixed(2)} kWh`}
          </div>
        )}

        {/* Camera */}
        {device.type === "camera" && (
          <div className="text-[9px]">
            <span className={device.attributes?.motion_detected ? "text-red-400" : "text-gray-600"}>
              {device.attributes?.motion_detected ? "⚠ Mouvement détecté" : "Aucun mouvement"} · {device.attributes?.fps ?? 15} FPS
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Domotique() {
  const [devices,   setDevices]   = useState<Device[]>([]);
  const [haConfig,  setHaConfig]  = useState<HAConfig>({ url: "", token: "", isConnected: false });
  const [tab,       setTab]       = useState<Tab>("Tous");
  const [loading,   setLoading]   = useState(true);
  const [configOpen, setConfigOpen] = useState(false);
  const [urlInput,  setUrlInput]  = useState("");
  const [tokenInput,setTokenInput] = useState("");
  const [connecting,setConnecting] = useState(false);
  const [connError, setConnError] = useState("");

  const fetchDevices = useCallback(async () => {
    try {
      const [devRes, haRes] = await Promise.all([
        axios.get("/api/home-assistant/devices"),
        axios.get("/api/home-assistant/config"),
      ]);
      setDevices(devRes.data || []);
      setHaConfig(haRes.data);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchDevices();
    const id = setInterval(fetchDevices, 5000);
    return () => clearInterval(id);
  }, [fetchDevices]);

  useEffect(() => {
    setUrlInput(haConfig.url || "");
  }, [haConfig.url]);

  const connectHA = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnecting(true); setConnError("");
    try {
      const res = await axios.post("/api/home-assistant/config", { url: urlInput, token: tokenInput });
      if (res.data.success) { setHaConfig(res.data.config); setConfigOpen(false); await fetchDevices(); }
      else setConnError(res.data.message || "Erreur de connexion");
    } catch (err: any) {
      setConnError(err.response?.data?.message || "Impossible de joindre Home Assistant");
    } finally { setConnecting(false); }
  };

  const sendCommand = useCallback(async (entity_id: string, service: string, data?: any) => {
    try {
      await axios.post("/api/home-assistant/command", { entity_id, service, data });
      setTimeout(fetchDevices, 300);
    } catch {}
  }, [fetchDevices]);

  const filtered = tab === "Tous" ? devices : devices.filter(d => TAB_TYPES[tab].includes(d.type));
  const byRoom   = filtered.reduce<Record<string, Device[]>>((acc, d) => {
    if (!acc[d.room]) acc[d.room] = [];
    acc[d.room].push(d);
    return acc;
  }, {});

  return (
    <div className="p-5 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white tracking-wide">Domotique HA</h1>
          <p className="text-xs text-gray-600 mt-0.5">Contrôle des appareils Home Assistant</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchDevices} className="text-gray-600 hover:text-gray-400 transition-colors p-2">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => setConfigOpen(!configOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <Settings className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-gray-400">Config HA</span>
          </button>
        </div>
      </div>

      {/* HA Connection status */}
      <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-semibold ${
        haConfig.isConnected
          ? "bg-emerald-500/5 border border-emerald-500/15 text-emerald-400"
          : "bg-amber-500/5 border border-amber-500/15 text-amber-500"
      }`}>
        {haConfig.isConnected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
        {haConfig.isConnected
          ? `Connecté à Home Assistant · ${devices.length} appareils`
          : "Mode démo — configurez l'URL et le token pour vous connecter à votre vrai HA"}
      </div>

      {/* Config panel */}
      {configOpen && (
        <form onSubmit={connectHA} className="rounded-2xl p-4 space-y-3"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <h3 className="text-sm font-bold text-white">Connexion Home Assistant</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-1 block">URL</label>
              <input
                type="text" value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
                placeholder="http://192.168.1.25:8123"
                className="w-full rounded-xl py-2.5 px-3 text-xs text-white placeholder:text-gray-700 focus:outline-none transition-colors"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-1 block">Token Long-Lived</label>
              <input
                type="password" value={tokenInput} onChange={(e) => setTokenInput(e.target.value)}
                placeholder="eyJhbGci..."
                className="w-full rounded-xl py-2.5 px-3 text-xs text-white placeholder:text-gray-700 focus:outline-none transition-colors"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              />
            </div>
          </div>
          {connError && <p className="text-red-400 text-xs">{connError}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={connecting || !urlInput || !tokenInput}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-500/20 border border-indigo-500/30 hover:bg-indigo-500/30 transition-all disabled:opacity-40">
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
        {TABS.map((t) => {
          const count = t === "Tous" ? devices.length : devices.filter(d => TAB_TYPES[t].includes(d.type)).length;
          return (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                tab === t
                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                  : "text-gray-600 hover:text-gray-400 hover:bg-white/4 border border-transparent"
              }`}>
              {t}
              <span className={`text-[9px] px-1 rounded font-mono ${tab === t ? "bg-indigo-500/20 text-indigo-400" : "bg-white/5 text-gray-700"}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Devices grid */}
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
        <div className="space-y-6">
          {Object.entries(byRoom).map(([room, roomDevices]) => (
            <div key={room}>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px flex-1 bg-white/5" />
                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">{room}</span>
                <div className="h-px flex-1 bg-white/5" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {roomDevices.map((device) => (
                  <DeviceCard key={device.id} device={device} onCommand={sendCommand} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
