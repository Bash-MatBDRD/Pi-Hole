import React, { useState, useEffect } from "react";
import {
  Music, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  RefreshCw, Tv, Power, Home as HomeIcon, AlertCircle,
} from "lucide-react";
import axios from "axios";

interface Device { id: string; name: string; type: string; state: string; room: string; attributes: any; }

const FIRESTICK_APPS = [
  { name: "Netflix",     color: "#e50914" },
  { name: "YouTube",     color: "#ff0000" },
  { name: "Prime Video", color: "#00a8e0" },
  { name: "Disney+",     color: "#1133a9" },
  { name: "Twitch",      color: "#9146ff" },
  { name: "Plex",        color: "#e5a00d" },
];

function formatTime(s: number) {
  if (!s || !Number.isFinite(s)) return "--:--";
  const m = Math.floor(s / 60);
  return `${m}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

export default function Spotify() {
  const [devices,     setDevices]     = useState<Device[]>([]);
  const [areaNames,   setAreaNames]   = useState<Record<string, string>>({});
  const [activeApp,   setActiveApp]   = useState("Home");
  const [firestickOn, setFirestickOn] = useState(true);
  const [loading,     setLoading]     = useState(true);
  const [haConnected, setHaConnected] = useState(false);

  const fetchDevices = async () => {
    try {
      const [devRes, cfgRes, areaRes] = await Promise.all([
        axios.get("/api/home-assistant/devices"),
        axios.get("/api/home-assistant/config"),
        axios.get("/api/home-assistant/areas").catch(() => ({ data: {} })),
      ]);
      setDevices(devRes.data || []);
      setHaConnected(cfgRes.data?.isConnected || false);
      if (areaRes.data && typeof areaRes.data === "object") setAreaNames(areaRes.data);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => {
    fetchDevices();
    const id = setInterval(fetchDevices, 5000);
    return () => clearInterval(id);
  }, []);

  const mediaPlayers = devices.filter(d => d.type === "media_player");
  const activePlayer = mediaPlayers.find(d => d.state === "playing") || mediaPlayers[0];
  const isPlaying    = activePlayer?.state === "playing";

  const track = {
    title:    activePlayer?.attributes?.media_title    || "Aucune lecture en cours",
    artist:   activePlayer?.attributes?.media_artist   || "",
    album:    activePlayer?.attributes?.media_album_name || "",
    duration: activePlayer?.attributes?.media_duration || 0,
    position: activePlayer?.attributes?.media_position || 0,
    volume:   activePlayer?.attributes?.volume_level   ?? 0.5,
  };

  const progress = track.duration > 0 ? (track.position / track.duration) * 100 : 0;

  const sendCommand = async (entity_id: string, service: string, data?: any) => {
    try { await axios.post("/api/home-assistant/command", { entity_id, service, data }); await fetchDevices(); }
    catch {}
  };

  const playPause = () => activePlayer && sendCommand(activePlayer.id, isPlaying ? "media_pause" : "media_play");
  const nextTrack = () => activePlayer && sendCommand(activePlayer.id, "media_next_track");
  const prevTrack = () => activePlayer && sendCommand(activePlayer.id, "media_previous_track");
  const setVolume = (v: number) => activePlayer && sendCommand(activePlayer.id, "volume_set", { volume_level: v });

  return (
    <div className="p-5 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white tracking-wide">Spotify & FireStick</h1>
          <p className="text-xs text-gray-600 mt-0.5">Contrôle média via Home Assistant</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[10px]"
            style={{ color: haConnected ? "#22c55e" : "#ef4444" }}>
            <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: haConnected ? "#22c55e" : "#ef4444" }} />
            {haConnected ? "HA connecté" : "HA hors ligne"}
          </div>
          <button onClick={fetchDevices} className="text-gray-600 hover:text-gray-400 transition-colors p-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* HA non configuré */}
      {!haConnected && !loading && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-amber-300"
          style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
          <AlertCircle className="h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold text-xs">Home Assistant non connecté</p>
            <p className="text-[10px] text-amber-400/70 mt-0.5">
              Configurez l'URL et le token dans <strong>Réglages → Système</strong> pour contrôler vos médias.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Spotify Player */}
        <div className="rounded-2xl p-6 flex flex-col items-center"
          style={{ background: "rgba(168,85,247,0.05)", border: "1px solid rgba(168,85,247,0.12)" }}>
          <div className="flex items-center gap-2 self-start mb-6">
            <Music className="h-4 w-4 text-purple-400" />
            <span className="text-sm font-bold text-white">Lecteur Spotify</span>
            {mediaPlayers.length > 0 && (
              <span className="text-[9px] text-gray-600 ml-auto font-mono">{activePlayer?.name}</span>
            )}
          </div>

          {/* Album art placeholder */}
          <div className="w-32 h-32 rounded-2xl flex items-center justify-center mb-5 shadow-2xl relative"
            style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.3) 0%, rgba(99,102,241,0.3) 100%)", border: "1px solid rgba(168,85,247,0.2)" }}>
            <Music className="h-12 w-12 text-purple-300 opacity-60" />
            {isPlaying && (
              <div className="absolute bottom-2 right-2 flex gap-0.5 items-end">
                {[3, 5, 4, 6].map((h, i) => (
                  <div key={i} className="w-1 bg-purple-400 rounded-full animate-bounce"
                    style={{ height: `${h * 2}px`, animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
            )}
          </div>

          {/* Track info */}
          <div className="text-center mb-5 w-full">
            <h3 className="text-base font-bold text-white truncate">{track.title}</h3>
            <p className="text-sm text-gray-500 mt-0.5 truncate">{track.artist}</p>
            {track.album && <p className="text-[10px] text-gray-700 mt-0.5 truncate">{track.album}</p>}
          </div>

          {/* Progress */}
          {track.duration > 0 && (
            <div className="w-full mb-4">
              <div className="h-1 rounded-full bg-white/5 overflow-hidden mb-1.5">
                <div className="h-full rounded-full transition-all duration-1000"
                  style={{ width: `${progress}%`, background: "linear-gradient(90deg, #a855f7, #6366f1)" }} />
              </div>
              <div className="flex justify-between text-[9px] text-gray-600 font-mono">
                <span>{formatTime(track.position)}</span>
                <span>{formatTime(track.duration)}</span>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center gap-4 mb-5">
            <button onClick={prevTrack} disabled={!activePlayer}
              className="text-gray-600 hover:text-gray-300 transition-colors disabled:opacity-30">
              <SkipBack className="h-5 w-5" />
            </button>
            <button onClick={playPause} disabled={!activePlayer}
              className="h-12 w-12 rounded-full flex items-center justify-center transition-all hover:scale-105 disabled:opacity-30"
              style={{ background: "rgba(168,85,247,0.25)", border: "1px solid rgba(168,85,247,0.4)" }}>
              {isPlaying
                ? <Pause className="h-5 w-5 text-purple-300" />
                : <Play  className="h-5 w-5 text-purple-300 ml-0.5" />}
            </button>
            <button onClick={nextTrack} disabled={!activePlayer}
              className="text-gray-600 hover:text-gray-300 transition-colors disabled:opacity-30">
              <SkipForward className="h-5 w-5" />
            </button>
          </div>

          {/* Volume */}
          <div className="w-full flex items-center gap-3">
            <VolumeX className="h-4 w-4 text-gray-700 shrink-0" />
            <input type="range" min="0" max="1" step="0.05"
              value={track.volume}
              onChange={e => setVolume(parseFloat(e.target.value))}
              disabled={!activePlayer}
              className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer disabled:opacity-30"
              style={{ accentColor: "#a855f7" }} />
            <Volume2 className="h-4 w-4 text-gray-500 shrink-0" />
          </div>

          {/* All media players */}
          {mediaPlayers.length > 1 && (
            <div className="w-full mt-5 space-y-1">
              <div className="text-[9px] text-gray-700 uppercase tracking-widest mb-2">Lecteurs disponibles</div>
              {mediaPlayers.map((mp) => (
                <div key={mp.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg ${mp.id === activePlayer?.id ? "bg-purple-500/10 border border-purple-500/15" : "bg-white/2 border border-transparent"}`}>
                  <div className={`h-1.5 w-1.5 rounded-full ${mp.state === "playing" ? "bg-purple-400 animate-pulse" : "bg-gray-700"}`} />
                  <p className="text-[10px] text-white flex-1 truncate">{mp.name}</p>
                  <span className="text-[9px] text-gray-600">{areaNames[mp.room] || mp.room || "Général"}</span>
                </div>
              ))}
            </div>
          )}

          {mediaPlayers.length === 0 && haConnected && (
            <p className="text-[10px] text-gray-600 mt-4 text-center">
              Aucun lecteur multimédia détecté dans Home Assistant.
            </p>
          )}
        </div>

        {/* FireStick TV Remote */}
        <div className="rounded-2xl p-6"
          style={{ background: "rgba(6,182,212,0.04)", border: "1px solid rgba(6,182,212,0.1)" }}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Tv className="h-4 w-4 text-cyan-400" />
              <span className="text-sm font-bold text-white">FireStick TV</span>
            </div>
            <button onClick={() => setFirestickOn(!firestickOn)}
              className={`h-8 w-8 rounded-xl flex items-center justify-center transition-all ${firestickOn ? "bg-emerald-500/15 border border-emerald-500/25" : "bg-white/5 border border-white/8"}`}>
              <Power className={`h-4 w-4 ${firestickOn ? "text-emerald-400" : "text-gray-600"}`} />
            </button>
          </div>

          {firestickOn ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-gray-400">Application active :</span>
                <span className="text-xs font-bold text-white ml-1">{activeApp}</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => setActiveApp("Home")}
                  className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all text-xs font-semibold ${activeApp === "Home" ? "bg-cyan-500/15 border border-cyan-500/25 text-cyan-300" : "hover:bg-white/4 text-gray-500 border border-transparent"}`}>
                  <HomeIcon className="h-5 w-5" />
                  <span className="text-[9px]">Accueil</span>
                </button>
                {FIRESTICK_APPS.map((app) => (
                  <button key={app.name} onClick={() => setActiveApp(app.name)}
                    className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all text-xs font-semibold ${activeApp === app.name ? "border" : "hover:bg-white/4 text-gray-500 border border-transparent"}`}
                    style={activeApp === app.name ? { background: `${app.color}15`, borderColor: `${app.color}30`, color: app.color } : {}}>
                    <div className="h-5 w-5 rounded text-[8px] font-black flex items-center justify-center"
                      style={{ background: `${app.color}30`, color: app.color }}>{app.name[0]}</div>
                    <span className="text-[9px]">{app.name}</span>
                  </button>
                ))}
              </div>

              {/* D-Pad */}
              <div className="flex flex-col items-center gap-2 mt-4">
                <div className="text-[9px] text-gray-700 uppercase tracking-widest mb-1">Télécommande</div>
                <div className="grid grid-cols-3 gap-1.5 w-32">
                  {(["↑","←","OK","→","↓"] as const).map((btn, i) => {
                    const pos = [[1,0],[0,1],[1,1],[2,1],[1,2]][i];
                    return (
                      <button key={btn}
                        className={`h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all hover:scale-95 active:scale-90 ${btn === "OK" ? "bg-cyan-500/20 border border-cyan-500/30 text-cyan-300" : "bg-white/5 border border-white/8 text-gray-400 hover:text-white hover:bg-white/8"}`}
                        style={{ gridColumn: pos[0] + 1, gridRow: pos[1] + 1 }}>
                        {btn}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2 mt-2">
                  {["⏪","⏯","⏩"].map(btn => (
                    <button key={btn}
                      className="h-9 w-9 rounded-xl flex items-center justify-center text-sm transition-all hover:scale-95 bg-white/4 border border-white/6 text-gray-400 hover:text-white hover:bg-white/8">
                      {btn}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-gray-700">
              <Tv className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">FireStick hors tension</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
