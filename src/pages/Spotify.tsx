import React, { useState, useEffect } from "react";
import {
  Music, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  RefreshCw, Tv, Power, Home as HomeIcon, AlertCircle, Wifi, WifiOff,
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown, RotateCcw,
  Mic, Settings, ArrowLeft, Search,
} from "lucide-react";
import axios from "axios";

interface Device { id: string; name: string; type: string; state: string; room: string; attributes: any; }

function fmt(s: number) {
  if (!s || !Number.isFinite(s)) return "--:--";
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

const FIRESTICK_APPS = [
  { name: "Netflix",     color: "#e50914", bg: "rgba(229,9,20,0.15)",   border: "rgba(229,9,20,0.3)"   },
  { name: "YouTube",     color: "#ff0000", bg: "rgba(255,0,0,0.12)",    border: "rgba(255,0,0,0.25)"   },
  { name: "Prime Video", color: "#00a8e0", bg: "rgba(0,168,224,0.12)",  border: "rgba(0,168,224,0.25)" },
  { name: "Disney+",     color: "#1133a9", bg: "rgba(17,51,169,0.15)",  border: "rgba(17,51,169,0.3)"  },
  { name: "Twitch",      color: "#9146ff", bg: "rgba(145,70,255,0.12)", border: "rgba(145,70,255,0.25)"},
  { name: "Plex",        color: "#e5a00d", bg: "rgba(229,160,13,0.12)", border: "rgba(229,160,13,0.25)"},
  { name: "Crunchyroll", color: "#f47521", bg: "rgba(244,117,33,0.12)", border: "rgba(244,117,33,0.25)"},
  { name: "Apple TV+",   color: "#a0a0a0", bg: "rgba(160,160,160,0.1)", border: "rgba(160,160,160,0.2)"},
];

function RemoteBtn({ label, onClick, accent = false, large = false }: { label: React.ReactNode; onClick?: () => void; accent?: boolean; large?: boolean }) {
  return (
    <button onClick={onClick}
      className={`${large ? "h-12 w-12" : "h-10 w-10"} rounded-xl flex items-center justify-center text-sm font-bold transition-all hover:scale-95 active:scale-90 select-none`}
      style={{
        background: accent ? "rgba(6,182,212,0.2)" : "rgba(255,255,255,0.05)",
        border: accent ? "1px solid rgba(6,182,212,0.35)" : "1px solid rgba(255,255,255,0.09)",
        color: accent ? "#06b6d4" : "#9ca3af",
      }}>
      {label}
    </button>
  );
}

export default function Spotify() {
  const [devices,      setDevices]      = useState<Device[]>([]);
  const [areaNames,    setAreaNames]    = useState<Record<string, string>>({});
  const [activeApp,    setActiveApp]    = useState("Home");
  const [firestickOn,  setFirestickOn]  = useState(true);
  const [loading,      setLoading]      = useState(true);
  const [haConnected,  setHaConnected]  = useState(false);

  const fetch = async () => {
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
    fetch();
    const id = setInterval(fetch, 5000);
    return () => clearInterval(id);
  }, []);

  const mediaPlayers  = devices.filter(d => d.type === "media_player");
  const activePlayer  = mediaPlayers.find(d => d.state === "playing") || mediaPlayers[0];
  const isPlaying     = activePlayer?.state === "playing";

  const track = {
    title:    activePlayer?.attributes?.media_title    || "Aucune lecture",
    artist:   activePlayer?.attributes?.media_artist   || "",
    album:    activePlayer?.attributes?.media_album_name || "",
    img:      activePlayer?.attributes?.entity_picture  || activePlayer?.attributes?.media_image_url || "",
    duration: activePlayer?.attributes?.media_duration || 0,
    position: activePlayer?.attributes?.media_position || 0,
    volume:   activePlayer?.attributes?.volume_level   ?? 0.5,
  };

  const progress = track.duration > 0 ? Math.min(100, (track.position / track.duration) * 100) : 0;

  const cmd = async (service: string, data?: any) => {
    if (!activePlayer) return;
    try { await axios.post("/api/home-assistant/command", { entity_id: activePlayer.id, service, data }); await fetch(); } catch {}
  };

  const roomLabel = (d: Device) => areaNames[d.room] || d.room || "—";

  return (
    <div className="p-5 max-w-6xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white tracking-wide">Spotify & FireStick</h1>
          <p className="text-xs text-gray-600 mt-0.5">Contrôle média via Home Assistant</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full ${haConnected ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
            {haConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {haConnected ? "HA connecté" : "HA hors ligne"}
          </div>
          <button onClick={fetch} className="p-2 text-gray-600 hover:text-gray-400 transition-colors">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {!haConnected && !loading && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-amber-300"
          style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="text-xs">Home Assistant non connecté — configurez l'URL et le token dans <strong>Réglages</strong>.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* ── SPOTIFY PLAYER (3/5) ────────────────────────────────────────── */}
        <div className="lg:col-span-3 rounded-2xl overflow-hidden"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(168,85,247,0.15)" }}>

          {/* Album art section */}
          <div className="relative h-44 flex items-center justify-center overflow-hidden"
            style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.18) 0%, rgba(99,102,241,0.18) 100%)" }}>
            {track.img ? (
              <img src={track.img} alt="album art"
                className="w-full h-full object-cover absolute inset-0 opacity-50" />
            ) : null}
            <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(5,5,5,0.9) 0%, transparent 60%)" }} />
            <div className="absolute inset-0 flex items-center justify-center">
              {isPlaying ? (
                <div className="flex gap-1 items-end">
                  {[6, 10, 8, 12, 7, 10, 9].map((h, i) => (
                    <div key={i} className="w-1.5 rounded-full animate-bounce"
                      style={{ height: h * 3, background: "rgba(168,85,247,0.7)", animationDelay: `${i * 0.1}s` }} />
                  ))}
                </div>
              ) : (
                <Music className="h-16 w-16 text-purple-500/30" />
              )}
            </div>
            <div className="absolute bottom-3 left-4 right-4">
              <h3 className="text-base font-black text-white truncate drop-shadow-lg">{track.title}</h3>
              {track.artist && <p className="text-xs text-white/60 mt-0.5 truncate">{track.artist}</p>}
              {track.album  && <p className="text-[9px] text-white/40 mt-0.5 truncate">{track.album}</p>}
            </div>
          </div>

          {/* Controls */}
          <div className="p-5 space-y-4">
            {/* Progress bar */}
            {track.duration > 0 && (
              <div>
                <div className="h-1 rounded-full bg-white/5 overflow-hidden mb-1.5 cursor-pointer relative">
                  <div className="h-full rounded-full transition-all duration-1000 relative"
                    style={{ width: `${progress}%`, background: "linear-gradient(90deg, #a855f7, #6366f1)" }}>
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-white shadow-lg" />
                  </div>
                </div>
                <div className="flex justify-between text-[9px] text-gray-600 font-mono">
                  <span>{fmt(track.position)}</span>
                  <span>{fmt(track.duration)}</span>
                </div>
              </div>
            )}

            {/* Play controls */}
            <div className="flex items-center justify-center gap-5">
              <button onClick={() => cmd("media_previous_track")} disabled={!activePlayer}
                className="text-gray-500 hover:text-gray-200 transition-colors disabled:opacity-30">
                <SkipBack className="h-5 w-5" />
              </button>
              <button onClick={() => cmd(isPlaying ? "media_pause" : "media_play")} disabled={!activePlayer}
                className="h-13 w-13 h-12 w-12 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-30 shadow-xl"
                style={{ background: "linear-gradient(135deg, #a855f7, #6366f1)", boxShadow: "0 0 20px rgba(168,85,247,0.4)" }}>
                {isPlaying
                  ? <Pause className="h-5 w-5 text-white" />
                  : <Play  className="h-5 w-5 text-white ml-0.5" />}
              </button>
              <button onClick={() => cmd("media_next_track")} disabled={!activePlayer}
                className="text-gray-500 hover:text-gray-200 transition-colors disabled:opacity-30">
                <SkipForward className="h-5 w-5" />
              </button>
            </div>

            {/* Volume */}
            <div className="flex items-center gap-3">
              <button onClick={() => cmd("volume_set", { volume_level: 0 })} className="text-gray-600 shrink-0">
                <VolumeX className="h-3.5 w-3.5" />
              </button>
              <div className="flex-1 relative h-1.5">
                <input type="range" min="0" max="1" step="0.05"
                  value={track.volume}
                  onChange={e => cmd("volume_set", { volume_level: parseFloat(e.target.value) })}
                  disabled={!activePlayer}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer disabled:opacity-30 absolute inset-0"
                  style={{ accentColor: "#a855f7" }} />
              </div>
              <button onClick={() => cmd("volume_set", { volume_level: 1 })} className="text-gray-500 shrink-0">
                <Volume2 className="h-3.5 w-3.5" />
              </button>
              <span className="text-[10px] text-gray-600 font-mono w-8 text-right">{Math.round(track.volume * 100)}%</span>
            </div>

            {/* Device list */}
            {mediaPlayers.length > 0 && (
              <div className="space-y-1 pt-1 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <div className="text-[8px] text-gray-700 uppercase tracking-widest mb-2">Lecteurs disponibles</div>
                {mediaPlayers.map((mp) => (
                  <div key={mp.id}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all ${mp.id === activePlayer?.id ? "border" : "hover:bg-white/3 border border-transparent"}`}
                    style={mp.id === activePlayer?.id ? { background: "rgba(168,85,247,0.08)", borderColor: "rgba(168,85,247,0.2)" } : {}}>
                    <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${mp.state === "playing" ? "bg-purple-400 animate-pulse" : mp.state === "paused" ? "bg-amber-400" : "bg-gray-700"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-white font-semibold truncate">{mp.name}</p>
                      {mp.state === "playing" && mp.attributes?.media_title && (
                        <p className="text-[8px] text-gray-600 truncate">{mp.attributes.media_title}</p>
                      )}
                    </div>
                    <span className="text-[8px] text-gray-600 shrink-0">{roomLabel(mp)}</span>
                    <span className={`text-[8px] font-semibold shrink-0 ${mp.state === "playing" ? "text-purple-400" : "text-gray-700"}`}>
                      {mp.state === "playing" ? "▶" : mp.state === "paused" ? "⏸" : "•"}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {mediaPlayers.length === 0 && haConnected && (
              <p className="text-[10px] text-gray-600 text-center pt-2">
                Aucun lecteur détecté dans Home Assistant.
              </p>
            )}
          </div>
        </div>

        {/* ── FIRESTICK REMOTE (2/5) ──────────────────────────────────────── */}
        <div className="lg:col-span-2 rounded-2xl p-5 flex flex-col"
          style={{ background: "rgba(6,182,212,0.03)", border: "1px solid rgba(6,182,212,0.12)" }}>

          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <Tv className="h-4 w-4 text-cyan-400" />
              <span className="text-sm font-bold text-white">FireStick TV</span>
            </div>
            <button onClick={() => setFirestickOn(!firestickOn)}
              className={`h-8 w-8 rounded-xl flex items-center justify-center transition-all ${firestickOn ? "border border-emerald-500/30" : "border border-white/8"}`}
              style={{ background: firestickOn ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.04)" }}>
              <Power className={`h-3.5 w-3.5 ${firestickOn ? "text-emerald-400" : "text-gray-600"}`} />
            </button>
          </div>

          {firestickOn ? (
            <div className="flex-1 space-y-4">
              {/* Current app */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] text-gray-400">Application :</span>
                <span className="text-[10px] font-bold text-white">{activeApp}</span>
              </div>

              {/* App grid */}
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  onClick={() => setActiveApp("Home")}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all ${activeApp === "Home" ? "border" : "hover:bg-white/5 border border-transparent"}`}
                  style={activeApp === "Home" ? { background: "rgba(6,182,212,0.12)", borderColor: "rgba(6,182,212,0.3)", color: "#06b6d4" } : {}}>
                  <HomeIcon className="h-4 w-4" style={{ color: activeApp === "Home" ? "#06b6d4" : "#6b7280" }} />
                  <span className="text-[7px] font-semibold" style={{ color: activeApp === "Home" ? "#06b6d4" : "#6b7280" }}>Accueil</span>
                </button>
                {FIRESTICK_APPS.map((app) => (
                  <button key={app.name}
                    onClick={() => setActiveApp(app.name)}
                    className={`flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all ${activeApp === app.name ? "border" : "hover:bg-white/5 border border-transparent"}`}
                    style={activeApp === app.name ? { background: app.bg, borderColor: app.border } : {}}>
                    <div className="h-5 w-5 rounded-lg flex items-center justify-center text-[8px] font-black"
                      style={{ background: `${app.color}25`, color: app.color }}>
                      {app.name[0]}
                    </div>
                    <span className="text-[7px] font-semibold text-gray-600 truncate w-full text-center px-0.5"
                      style={{ color: activeApp === app.name ? app.color : undefined }}>
                      {app.name.split(" ")[0]}
                    </span>
                  </button>
                ))}
              </div>

              {/* D-Pad remote */}
              <div className="space-y-3">
                <div className="text-[8px] text-gray-700 uppercase tracking-widest text-center">Télécommande</div>

                {/* Navigation ring */}
                <div className="flex justify-center">
                  <div className="relative w-32 h-32">
                    {/* Center OK */}
                    <button className="absolute inset-0 m-auto h-10 w-10 rounded-full flex items-center justify-center text-xs font-black transition-all hover:scale-95 active:scale-90"
                      style={{ background: "rgba(6,182,212,0.2)", border: "2px solid rgba(6,182,212,0.4)", color: "#06b6d4" }}>
                      OK
                    </button>
                    {/* Up */}
                    <button className="absolute top-0 left-1/2 -translate-x-1/2 h-10 w-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-white transition-all hover:scale-95 active:scale-90"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}>
                      <ChevronUp className="h-5 w-5" />
                    </button>
                    {/* Down */}
                    <button className="absolute bottom-0 left-1/2 -translate-x-1/2 h-10 w-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-white transition-all hover:scale-95 active:scale-90"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}>
                      <ChevronDown className="h-5 w-5" />
                    </button>
                    {/* Left */}
                    <button className="absolute left-0 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-white transition-all hover:scale-95 active:scale-90"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}>
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    {/* Right */}
                    <button className="absolute right-0 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-white transition-all hover:scale-95 active:scale-90"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}>
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { icon: ArrowLeft,   label: "Retour"  },
                    { icon: HomeIcon,    label: "Home"    },
                    { icon: Search,      label: "Chercher"},
                    { icon: Mic,         label: "Alexa"   },
                  ].map(({ icon: Icon, label }) => (
                    <button key={label}
                      className="flex flex-col items-center gap-1 py-2 rounded-xl transition-all hover:bg-white/6 active:scale-95"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <Icon className="h-3.5 w-3.5 text-gray-500" />
                      <span className="text-[7px] text-gray-700">{label}</span>
                    </button>
                  ))}
                </div>

                {/* Playback */}
                <div className="flex justify-center gap-2">
                  {["⏮", "⏪", "⏯", "⏩", "⏭"].map(btn => (
                    <button key={btn}
                      className="h-9 w-9 rounded-xl flex items-center justify-center text-xs transition-all hover:scale-95 active:scale-90"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", color: "#6b7280" }}>
                      {btn}
                    </button>
                  ))}
                </div>

                {/* Volume row */}
                <div className="flex justify-center gap-2">
                  {[
                    { label: "VOL −" }, { label: "MUTE" }, { label: "VOL +" },
                  ].map(({ label }) => (
                    <button key={label}
                      className="flex-1 py-2 rounded-xl text-[9px] font-bold transition-all hover:scale-95 active:scale-90"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#9ca3af" }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-700">
              <Tv className="h-12 w-12 opacity-20" />
              <p className="text-sm">FireStick hors tension</p>
              <button onClick={() => setFirestickOn(true)}
                className="text-[10px] text-cyan-500 hover:underline">Allumer</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
