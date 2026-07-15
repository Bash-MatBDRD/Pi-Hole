import React, { useState, useEffect } from "react";
import { Wifi, WifiOff, Server, Music, Bot } from "lucide-react";
import axios from "axios";

export default function StatusBar() {
  const [haConnected, setHaConnected] = useState(false);
  const [botPing, setBotPing]         = useState<number | null>(null);
  const [nowPlaying, setNowPlaying]   = useState<string | null>(null);
  const [time, setTime]               = useState(new Date());

  useEffect(() => {
    const tick = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const [haRes, statsRes] = await Promise.all([
          axios.get("/api/home-assistant/config"),
          axios.get("/api/system/stats"),
        ]);
        setHaConnected(haRes.data?.isConnected || false);
        setBotPing(statsRes.data?.discordBot?.ping ?? null);
        const devices = await axios.get("/api/home-assistant/devices");
        const mp = devices.data?.find((d: any) => d.type === "media_player" && d.state === "playing");
        setNowPlaying(mp ? `${mp.attributes?.media_artist || ""} — ${mp.attributes?.media_title || ""}` : null);
      } catch {}
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="shrink-0 h-6 flex items-center justify-between px-4 text-[10px] font-mono border-t"
      style={{ background: "rgba(5,5,5,0.95)", borderColor: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.35)" }}
    >
      <div className="flex items-center gap-4">
        {/* HA status */}
        <div className="flex items-center gap-1">
          {haConnected
            ? <><Wifi className="h-3 w-3 text-emerald-600" /><span>HA: Connecté</span></>
            : <><WifiOff className="h-3 w-3 text-gray-700" /><span>HA: Hors ligne</span></>
          }
        </div>
        {/* Bot ping */}
        {botPing !== null && (
          <div className="hidden sm:flex items-center gap-1">
            <Bot className="h-3 w-3 text-indigo-600" />
            <span>Bot: {botPing}ms</span>
          </div>
        )}
        {/* Now playing */}
        {nowPlaying && (
          <div className="hidden md:flex items-center gap-1 max-w-48 truncate">
            <Music className="h-3 w-3 text-purple-600 shrink-0" />
            <span className="truncate">{nowPlaying}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Server className="h-3 w-3" />
        <span>NEXUS PANEL v2.0</span>
        <span className="ml-2">
          {time.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </span>
      </div>
    </div>
  );
}
