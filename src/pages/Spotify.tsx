import React, { useState, useEffect } from "react";
import {
  Music, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  RefreshCw, Tv, Power, Home as HomeIcon, AlertCircle, Wifi, WifiOff,
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
  Mic, ArrowLeft, Search, Radio,
} from "lucide-react";
import axios from "axios";

interface Device { id: string; name: string; type: string; state: string; room: string; attributes: any; }

function fmt(s: number) {
  if (!s || !Number.isFinite(s)) return "--:--";
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

const FIRESTICK_APPS = [
  { name: "Netflix",     color: "#e50914", icon: "N"  },
  { name: "YouTube",     color: "#ff0000", icon: "▶"  },
  { name: "Prime",       color: "#00a8e0", icon: "P"  },
  { name: "Disney+",     color: "#1133a9", icon: "D+" },
  { name: "Twitch",      color: "#9146ff", icon: "T"  },
  { name: "Plex",        color: "#e5a00d", icon: "Px" },
];

export default function Spotify() {
  const [devices,     setDevices]     = useState<Device[]>([]);
  const [areaNames,   setAreaNames]   = useState<Record<string, string>>({});
  const [activeApp,   setActiveApp]   = useState("Home");
  const [firestickOn, setFirestickOn] = useState(true);
  const [loading,     setLoading]     = useState(true);
  const [haConnected, setHaConnected] = useState(false);

  const doFetch = async () => {
    try {
      const [devRes, cfgRes, areaRes] = await Promise.all([
        axios.get("/api/home-assistant/devices"),
        axios.get("/api/home-assistant/config"),
        axios.get("/api/home-assistant/areas").catch(() => ({ data: {} })),
      ]);
      setDevices(devRes.data || []);
      setHaConnected(cfgRes.data?.isConnected || false);
      if (areaRes.data && typeof areaRes.data === "object") setAreaNames(areaRes.data);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => {
    doFetch();
    const id = setInterval(doFetch, 5000);
    return () => clearInterval(id);
  }, []);

  const mediaPlayers = devices.filter(d => d.type === "media_player");
  const activePlayer = mediaPlayers.find(d => d.state === "playing") || mediaPlayers[0];
  const isPlaying    = activePlayer?.state === "playing";

  const track = {
    title:    activePlayer?.attributes?.media_title        || "Aucune lecture",
    artist:   activePlayer?.attributes?.media_artist       || "",
    album:    activePlayer?.attributes?.media_album_name   || "",
    img:      activePlayer?.attributes?.entity_picture     || activePlayer?.attributes?.media_image_url || "",
    duration: activePlayer?.attributes?.media_duration     || 0,
    position: activePlayer?.attributes?.media_position     || 0,
    volume:   activePlayer?.attributes?.volume_level       ?? 0.5,
  };

  const progress = track.duration > 0 ? Math.min(100, (track.position / track.duration) * 100) : 0;

  const cmd = async (service: string, data?: any) => {
    if (!activePlayer) return;
    try {
      await axios.post("/api/home-assistant/command", { entity_id: activePlayer.id, service, data });
      await doFetch();
    } catch {}
  };

  const roomLabel = (d: Device | undefined) => d ? (areaNames[d.room] || d.room || "—") : "—";

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: "#050508" }}>

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center justify-between px-5 pt-4 pb-2">
        <div>
          <h1 className="text-lg font-black text-white tracking-wide flex items-center gap-2">
            <Radio className="h-4 w-4 text-purple-400" />
            Spotify & FireStick
          </h1>
          <p className="text-[10px] text-gray-600 mt-0.5">Contrôle média — Home Assistant</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full
            ${haConnected
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
            {haConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {haConnected ? "HA connecté" : "HA hors ligne"}
          </div>
          <button onClick={doFetch} className="p-1.5 rounded-lg text-gray-600 hover:text-gray-400 hover:bg-white/5 transition-all">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {!haConnected && !loading && (
        <div className="mx-5 mb-2 flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs text-amber-300"
          style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.18)" }}>
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          Home Assistant non connecté — configurez l'URL et le token dans <strong className="ml-1">Réglages</strong>.
        </div>
      )}

      {/* ── Main layout ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-5 pb-5">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mt-2">

          {/* ── PLAYER (3/5) ──────────────────────────────────────────────── */}
          <div className="lg:col-span-3 flex flex-col gap-3">

            {/* Album art + track info card */}
            <div className="relative rounded-2xl overflow-hidden"
              style={{ background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.18)" }}>

              {/* Blurred background */}
              {track.img && (
                <img src={track.img} alt=""
                  className="absolute inset-0 w-full h-full object-cover opacity-10 blur-xl scale-110 pointer-events-none" />
              )}

              <div className="relative flex items-center gap-5 p-5">
                {/* Album art */}
                <div className="shrink-0 relative">
                  <div className="h-28 w-28 rounded-xl overflow-hidden shadow-2xl"
                    style={{ boxShadow: "0 8px 32px rgba(168,85,247,0.35)" }}>
                    {track.img
                      ? <img src={track.img} alt="cover" className="w-full h-full object-cover" />
                      : (
                        <div className="w-full h-full flex items-center justify-center"
                          style={{ background: "rgba(168,85,247,0.15)" }}>
                          <Music className="h-10 w-10 text-purple-500/40" />
                        </div>
                      )}
                  </div>
                  {isPlaying && (
                    <div className="absolute -bottom-1 -right-1 flex gap-0.5 items-end bg-black/80 rounded-lg px-1.5 py-1">
                      {[4, 7, 5, 8, 6].map((h, i) => (
                        <div key={i} className="w-0.5 rounded-full animate-bounce"
                          style={{ height: h * 2, background: "#a855f7", animationDelay: `${i * 0.1}s` }} />
                      ))}
                    </div>
                  )}
                </div>

                {/* Track info */}
                <div className="flex-1 min-w-0">
                  <div className="text-[9px] text-purple-500/70 font-bold uppercase tracking-widest mb-1">
                    {activePlayer?.name || "Lecteur"}
                  </div>
                  <h2 className="text-xl font-black text-white truncate leading-tight">{track.title}</h2>
                  {track.artist && <p className="text-sm text-gray-400 mt-1 truncate">{track.artist}</p>}
                  {track.album  && <p className="text-[10px] text-gray-600 mt-0.5 truncate">{track.album}</p>}

                  <div className="mt-3 flex items-center gap-1">
                    <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${
                      activePlayer?.state === "playing" ? "bg-purple-500/20 text-purple-400 border border-purple-500/25"
                      : activePlayer?.state === "paused" ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                      : "bg-white/5 text-gray-600 border border-white/8"}`}>
                      {activePlayer?.state === "playing" ? "● EN LECTURE"
                        : activePlayer?.state === "paused" ? "⏸ EN PAUSE"
                        : activePlayer ? "● INACTIF" : "AUCUN LECTEUR"}
                    </span>
                    <span className="text-[9px] text-gray-700 ml-1">{roomLabel(activePlayer!)}</span>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              {track.duration > 0 && (
                <div className="relative mx-5 mb-4">
                  <div className="h-1 rounded-full bg-white/5 overflow-hidden cursor-pointer"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const pct = (e.clientX - rect.left) / rect.width;
                      cmd("media_seek", { seek_position: pct * track.duration });
                    }}>
                    <div className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${progress}%`, background: "linear-gradient(90deg, #a855f7, #818cf8)" }} />
                  </div>
                  <div className="flex justify-between text-[9px] text-gray-600 font-mono mt-1">
                    <span>{fmt(track.position)}</span>
                    <span>{fmt(track.duration)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Controls card */}
            <div className="rounded-2xl p-5 space-y-4"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>

              {/* Playback buttons */}
              <div className="flex items-center justify-center gap-6">
                <button onClick={() => cmd("media_previous_track")} disabled={!activePlayer}
                  className="h-9 w-9 rounded-xl flex items-center justify-center text-gray-500 hover:text-gray-200 disabled:opacity-25 transition-all hover:bg-white/5">
                  <SkipBack className="h-4 w-4" />
                </button>
                <button onClick={() => cmd(isPlaying ? "media_pause" : "media_play")} disabled={!activePlayer}
                  className="h-14 w-14 rounded-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-30 shadow-xl"
                  style={{ background: "linear-gradient(135deg, #a855f7, #6366f1)", boxShadow: "0 0 28px rgba(168,85,247,0.5)" }}>
                  {isPlaying
                    ? <Pause className="h-6 w-6 text-white" />
                    : <Play  className="h-6 w-6 text-white ml-0.5" />}
                </button>
                <button onClick={() => cmd("media_next_track")} disabled={!activePlayer}
                  className="h-9 w-9 rounded-xl flex items-center justify-center text-gray-500 hover:text-gray-200 disabled:opacity-25 transition-all hover:bg-white/5">
                  <SkipForward className="h-4 w-4" />
                </button>
              </div>

              {/* Volume */}
              <div className="flex items-center gap-3">
                <button onClick={() => cmd("volume_set", { volume_level: 0 })}
                  className="text-gray-700 hover:text-gray-400 transition-colors shrink-0">
                  <VolumeX className="h-3.5 w-3.5" />
                </button>
                <div className="flex-1 relative h-1.5 group cursor-pointer">
                  <input type="range" min="0" max="1" step="0.02"
                    value={track.volume}
                    onChange={e => cmd("volume_set", { volume_level: parseFloat(e.target.value) })}
                    disabled={!activePlayer}
                    className="w-full h-full rounded-full appearance-none cursor-pointer disabled:opacity-30 absolute inset-0"
                    style={{ accentColor: "#a855f7" }} />
                </div>
                <button onClick={() => cmd("volume_set", { volume_level: 1 })}
                  className="text-gray-500 hover:text-gray-300 transition-colors shrink-0">
                  <Volume2 className="h-3.5 w-3.5" />
                </button>
                <span className="text-[10px] text-gray-600 font-mono w-7 text-right shrink-0">
                  {Math.round(track.volume * 100)}%
                </span>
              </div>
            </div>

            {/* Lecteurs list */}
            {mediaPlayers.length > 1 && (
              <div className="rounded-2xl px-4 py-3"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="text-[9px] text-gray-700 uppercase tracking-widest mb-2">Lecteurs disponibles</div>
                <div className="space-y-1">
                  {mediaPlayers.map(mp => (
                    <div key={mp.id}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all cursor-pointer ${mp.id === activePlayer?.id ? "border" : "hover:bg-white/3 border border-transparent"}`}
                      style={mp.id === activePlayer?.id ? { background: "rgba(168,85,247,0.08)", borderColor: "rgba(168,85,247,0.2)" } : {}}>
                      <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                        mp.state === "playing" ? "bg-purple-400 animate-pulse"
                        : mp.state === "paused" ? "bg-amber-400" : "bg-gray-700"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-white font-semibold truncate">{mp.name}</p>
                        {mp.state === "playing" && mp.attributes?.media_title && (
                          <p className="text-[8px] text-gray-600 truncate">{mp.attributes.media_title}</p>
                        )}
                      </div>
                      <span className="text-[8px] text-gray-700 shrink-0">{roomLabel(mp)}</span>
                      <span className={`text-[8px] font-bold shrink-0 ${
                        mp.state === "playing" ? "text-purple-400"
                        : mp.state === "paused" ? "text-amber-400" : "text-gray-700"}`}>
                        {mp.state === "playing" ? "▶" : mp.state === "paused" ? "⏸" : "•"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── FIRESTICK (2/5) ──────────────────────────────────────────────── */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl overflow-hidden h-full"
              style={{ background: "rgba(6,182,212,0.04)", border: "1px solid rgba(6,182,212,0.15)" }}>

              {/* FireStick header */}
              <div className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: "1px solid rgba(6,182,212,0.1)" }}>
                <div className="flex items-center gap-2">
                  <Tv className="h-4 w-4 text-cyan-400" />
                  <span className="text-sm font-bold text-white">FireStick</span>
                  {firestickOn && (
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse ml-1" />
                  )}
                </div>
                <button onClick={() => setFirestickOn(!firestickOn)}
                  className={`h-7 w-7 rounded-lg flex items-center justify-center transition-all ${
                    firestickOn ? "border border-emerald-500/30 text-emerald-400" : "border border-white/8 text-gray-600"}`}
                  style={{ background: firestickOn ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.04)" }}>
                  <Power className="h-3.5 w-3.5" />
                </button>
              </div>

              {firestickOn ? (
                <div className="p-4 space-y-4">

                  {/* App current */}
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                    style={{ background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.15)" }}>
                    <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    <span className="text-[10px] text-gray-400 shrink-0">Application active :</span>
                    <span className="text-[10px] font-bold text-white truncate">{activeApp}</span>
                  </div>

                  {/* App grid */}
                  <div className="grid grid-cols-4 gap-1.5">
                    <button onClick={() => setActiveApp("Home")}
                      className={`flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all ${activeApp === "Home" ? "border" : "hover:bg-white/5 border border-transparent"}`}
                      style={activeApp === "Home" ? { background: "rgba(6,182,212,0.12)", borderColor: "rgba(6,182,212,0.3)" } : {}}>
                      <HomeIcon className="h-3.5 w-3.5" style={{ color: activeApp === "Home" ? "#06b6d4" : "#4b5563" }} />
                      <span className="text-[7px] font-semibold" style={{ color: activeApp === "Home" ? "#06b6d4" : "#4b5563" }}>Home</span>
                    </button>
                    {FIRESTICK_APPS.map(app => (
                      <button key={app.name} onClick={() => setActiveApp(app.name)}
                        className={`flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all ${activeApp === app.name ? "border" : "hover:bg-white/5 border border-transparent"}`}
                        style={activeApp === app.name ? { background: `${app.color}18`, borderColor: `${app.color}40` } : {}}>
                        <div className="h-5 w-5 rounded-md flex items-center justify-center text-[7px] font-black"
                          style={{ background: `${app.color}22`, color: app.color }}>
                          {app.icon}
                        </div>
                        <span className="text-[7px] font-semibold truncate w-full text-center px-0.5"
                          style={{ color: activeApp === app.name ? app.color : "#4b5563" }}>
                          {app.name.split(" ")[0]}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* D-Pad */}
                  <div className="space-y-2.5">
                    <div className="text-[8px] text-gray-700 uppercase tracking-widest text-center">Télécommande</div>

                    <div className="flex justify-center">
                      <div className="relative w-28 h-28">
                        <button className="absolute inset-0 m-auto h-9 w-9 rounded-full flex items-center justify-center text-[11px] font-black transition-all hover:scale-95 active:scale-90"
                          style={{ background: "rgba(6,182,212,0.2)", border: "2px solid rgba(6,182,212,0.4)", color: "#06b6d4" }}>
                          OK
                        </button>
                        {[
                          { dir: "up",    cls: "top-0 left-1/2 -translate-x-1/2", Icon: ChevronUp },
                          { dir: "down",  cls: "bottom-0 left-1/2 -translate-x-1/2", Icon: ChevronDown },
                          { dir: "left",  cls: "left-0 top-1/2 -translate-y-1/2", Icon: ChevronLeft },
                          { dir: "right", cls: "right-0 top-1/2 -translate-y-1/2", Icon: ChevronRight },
                        ].map(({ dir, cls, Icon }) => (
                          <button key={dir}
                            className={`absolute ${cls} h-9 w-9 rounded-xl flex items-center justify-center text-gray-500 hover:text-white transition-all hover:scale-95 active:scale-90`}
                            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                            <Icon className="h-4 w-4" />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Action row */}
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { Icon: ArrowLeft, label: "Retour"   },
                        { Icon: HomeIcon,  label: "Home"     },
                        { Icon: Search,    label: "Recherche"},
                        { Icon: Mic,       label: "Alexa"    },
                      ].map(({ Icon, label }) => (
                        <button key={label}
                          className="flex flex-col items-center gap-1 py-2 rounded-xl transition-all hover:bg-white/5 active:scale-95"
                          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                          <Icon className="h-3 w-3 text-gray-500" />
                          <span className="text-[6px] text-gray-700">{label}</span>
                        </button>
                      ))}
                    </div>

                    {/* Playback row */}
                    <div className="flex justify-center gap-1.5">
                      {["⏮", "⏪", "⏯", "⏩", "⏭"].map(btn => (
                        <button key={btn}
                          className="h-8 w-8 rounded-lg flex items-center justify-center text-xs transition-all hover:scale-95 active:scale-90 text-gray-500 hover:text-gray-300"
                          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                          {btn}
                        </button>
                      ))}
                    </div>

                    {/* Volume */}
                    <div className="flex gap-1.5">
                      {[{ l: "VOL −" }, { l: "MUTE" }, { l: "VOL +" }].map(({ l }) => (
                        <button key={l}
                          className="flex-1 py-2 rounded-xl text-[9px] font-bold transition-all hover:scale-95 active:scale-90 text-gray-500 hover:text-gray-300"
                          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Tv className="h-12 w-12 text-cyan-900/50" />
                  <p className="text-sm text-gray-600">FireStick hors tension</p>
                  <button onClick={() => setFirestickOn(true)}
                    className="text-[10px] text-cyan-500 hover:underline transition-colors">
                    Allumer →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
