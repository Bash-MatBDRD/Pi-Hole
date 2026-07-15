import React, { useState, useEffect, useRef } from "react";
import {
  Music, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  RefreshCw, Tv, Power, Home as HomeIcon, ChevronLeft,
} from "lucide-react";
import axios from "axios";

interface Device { id: string; name: string; type: string; state: string; room: string; attributes: any; }

const SPOTIFY_TRACKS = [
  { title: "Bohemian Rhapsody", artist: "Queen",      duration: 354 },
  { title: "Starboy",           artist: "The Weeknd", duration: 230 },
  { title: "Blinding Lights",   artist: "The Weeknd", duration: 200 },
  { title: "Another One Bites", artist: "Queen",      duration: 215 },
];

const FIRESTICK_APPS = [
  { name: "Netflix",    color: "#e50914" },
  { name: "YouTube",    color: "#ff0000" },
  { name: "Prime Video",color: "#00a8e0" },
  { name: "Disney+",    color: "#1133a9" },
  { name: "Twitch",     color: "#9146ff" },
  { name: "Plex",       color: "#e5a00d" },
];

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function Spotify() {
  const [devices,       setDevices]       = useState<Device[]>([]);
  const [activeApp,     setActiveApp]     = useState("Home");
  const [firestickOn,   setFirestickOn]   = useState(true);
  const [loading,       setLoading]       = useState(true);
  const progressRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const fetchDevices = async () => {
    try {
      const r = await axios.get("/api/home-assistant/devices");
      setDevices(r.data || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchDevices(); const id = setInterval(fetchDevices, 4000); return () => clearInterval(id); }, []);

  const mediaPlayer = devices.find(d => d.type === "media_player");
  const isPlaying   = mediaPlayer?.state === "playing";
  const track       = {
    title:    mediaPlayer?.attributes?.media_title    || "Aucune lecture",
    artist:   mediaPlayer?.attributes?.media_artist   || "",
    duration: mediaPlayer?.attributes?.media_duration || 300,
    position: mediaPlayer?.attributes?.media_position || 0,
  };

  const sendCommand = async (entity_id: string, service: string, data?: any) => {
    try { await axios.post("/api/home-assistant/command", { entity_id, service, data }); await fetchDevices(); }
    catch {}
  };

  const playPause = () => {
    if (!mediaPlayer) return;
    sendCommand(mediaPlayer.id, isPlaying ? "media_pause" : "media_play");
  };
  const nextTrack = () => {
    if (!mediaPlayer) return;
    sendCommand(mediaPlayer.id, "media_next_track");
  };
  const setVolume = (v: number) => {
    if (!mediaPlayer) return;
    sendCommand(mediaPlayer.id, "volume_set", { volume_level: v });
  };

  const progress = track.duration > 0 ? (track.position / track.duration) * 100 : 0;

  return (
    <div className="p-5 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white tracking-wide">Spotify & FireStick</h1>
          <p className="text-xs text-gray-600 mt-0.5">Contrôle média</p>
        </div>
        <button onClick={fetchDevices} className="text-gray-600 hover:text-gray-400 transition-colors p-2">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Spotify Player */}
        <div className="rounded-2xl p-6 flex flex-col items-center"
          style={{ background: "rgba(168,85,247,0.05)", border: "1px solid rgba(168,85,247,0.12)" }}>
          <div className="flex items-center gap-2 self-start mb-6">
            <Music className="h-4 w-4 text-purple-400" />
            <span className="text-sm font-bold text-white">Lecteur Spotify</span>
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
            <p className="text-sm text-gray-500 mt-0.5">{track.artist}</p>
          </div>

          {/* Progress */}
          <div className="w-full mb-4">
            <div className="h-1 rounded-full bg-white/5 overflow-hidden mb-1.5">
              <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${progress}%`, background: "linear-gradient(90deg, #a855f7, #6366f1)" }} />
            </div>
            <div className="flex justify-between text-[9px] text-gray-600 font-mono">
              <span>{formatTime(track.position)}</span>
              <span>{formatTime(track.duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4 mb-5">
            <button className="text-gray-600 hover:text-gray-300 transition-colors">
              <SkipBack className="h-5 w-5" />
            </button>
            <button
              onClick={playPause}
              className="h-12 w-12 rounded-full flex items-center justify-center transition-all hover:scale-105"
              style={{ background: "rgba(168,85,247,0.25)", border: "1px solid rgba(168,85,247,0.4)" }}>
              {isPlaying
                ? <Pause className="h-5 w-5 text-purple-300" />
                : <Play  className="h-5 w-5 text-purple-300 ml-0.5" />}
            </button>
            <button onClick={nextTrack} className="text-gray-600 hover:text-gray-300 transition-colors">
              <SkipForward className="h-5 w-5" />
            </button>
          </div>

          {/* Volume */}
          <div className="w-full flex items-center gap-3">
            <VolumeX className="h-4 w-4 text-gray-700 shrink-0" />
            <input
              type="range" min="0" max="1" step="0.05"
              value={mediaPlayer?.attributes?.volume_level ?? 0.5}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
              style={{ accentColor: "#a855f7" }}
            />
            <Volume2 className="h-4 w-4 text-gray-500 shrink-0" />
          </div>

          {/* Track list */}
          <div className="w-full mt-5 space-y-1">
            <div className="text-[9px] text-gray-700 uppercase tracking-widest mb-2">Piste suivante</div>
            {SPOTIFY_TRACKS.map((t, i) => (
              <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                track.title === t.title
                  ? "bg-purple-500/10 border border-purple-500/15"
                  : "hover:bg-white/3 border border-transparent"
              }`}>
                <span className="text-[9px] text-gray-700 w-4 text-right font-mono">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-white truncate">{t.title}</p>
                  <p className="text-[9px] text-gray-600 truncate">{t.artist}</p>
                </div>
                <span className="text-[9px] text-gray-700 font-mono">{formatTime(t.duration)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* FireStick TV Remote */}
        <div className="rounded-2xl p-6"
          style={{ background: "rgba(6,182,212,0.04)", border: "1px solid rgba(6,182,212,0.1)" }}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Tv className="h-4 w-4 text-cyan-400" />
              <span className="text-sm font-bold text-white">FireStick TV</span>
            </div>
            <button
              onClick={() => setFirestickOn(!firestickOn)}
              className={`h-8 w-8 rounded-xl flex items-center justify-center transition-all ${
                firestickOn ? "bg-emerald-500/15 border border-emerald-500/25" : "bg-white/5 border border-white/8"
              }`}>
              <Power className={`h-4 w-4 ${firestickOn ? "text-emerald-400" : "text-gray-600"}`} />
            </button>
          </div>

          {firestickOn ? (
            <div className="space-y-4">
              {/* Current app */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-gray-400">Application active:</span>
                <span className="text-xs font-bold text-white ml-1">{activeApp}</span>
              </div>

              {/* App grid */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setActiveApp("Home")}
                  className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all text-xs font-semibold ${
                    activeApp === "Home"
                      ? "bg-cyan-500/15 border border-cyan-500/25 text-cyan-300"
                      : "hover:bg-white/4 text-gray-500 border border-transparent"
                  }`}>
                  <HomeIcon className="h-5 w-5" />
                  <span className="text-[9px]">Accueil</span>
                </button>
                {FIRESTICK_APPS.map((app) => (
                  <button
                    key={app.name}
                    onClick={() => setActiveApp(app.name)}
                    className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all text-xs font-semibold ${
                      activeApp === app.name
                        ? "border"
                        : "hover:bg-white/4 text-gray-500 border border-transparent"
                    }`}
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
                  {["↑","←","OK","→","↓"].map((btn, i) => {
                    const pos = [[1,0],[0,1],[1,1],[2,1],[1,2]][i];
                    return (
                      <button key={btn}
                        className={`h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all hover:scale-95 active:scale-90 ${
                          btn === "OK"
                            ? "bg-cyan-500/20 border border-cyan-500/30 text-cyan-300"
                            : "bg-white/5 border border-white/8 text-gray-400 hover:text-white hover:bg-white/8"
                        }`}
                        style={{ gridColumn: pos[0] + 1, gridRow: pos[1] + 1 }}>
                        {btn}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2 mt-2">
                  {["⏪","⏯","⏩"].map((btn) => (
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
