import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Activity, Home, Music, MessageSquare, Server, Cpu, HardDrive,
  Lightbulb, Thermometer, Tv, Wifi, WifiOff, Bot, Play, Pause,
  ChevronRight, RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

interface Device { id: string; name: string; type: string; state: string; room: string; attributes: any; }
interface ZimaStats { name: string; cpu: { usage: number; temperature: number }; ram: { used: number; total: number; usage: number }; }
interface SystemStats { zima1: ZimaStats; zima2: ZimaStats; discordBot: { name: string; status: string; ping: number; guilds: number; commandsHandled: number; }; }
interface DiscordLog { timestamp: string; user: string; command: string; response: string; }

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl p-4 ${className}`}
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
      {children}
    </div>
  );
}

function StatBadge({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl py-3 px-4"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <span className="text-xl font-black" style={{ color }}>{value}</span>
      <span className="text-[9px] text-gray-600 uppercase tracking-widest mt-0.5">{label}</span>
    </div>
  );
}

export default function Dashboard() {
  const [devices,    setDevices]    = useState<Device[]>([]);
  const [stats,      setStats]      = useState<SystemStats | null>(null);
  const [logs,       setLogs]       = useState<DiscordLog[]>([]);
  const [haConfig,   setHaConfig]   = useState<{ isConnected: boolean }>({ isConnected: false });
  const [loading,    setLoading]    = useState(true);
  const navigate = useNavigate();

  const fetchAll = async () => {
    try {
      const [devRes, statRes, logRes, haRes] = await Promise.all([
        axios.get("/api/home-assistant/devices"),
        axios.get("/api/system/stats"),
        axios.get("/api/discord/logs"),
        axios.get("/api/home-assistant/config"),
      ]);
      setDevices(devRes.data || []);
      setStats(statRes.data);
      setLogs((logRes.data || []).slice(0, 5));
      setHaConfig(haRes.data);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); const id = setInterval(fetchAll, 8000); return () => clearInterval(id); }, []);

  // Computed stats
  const lightsOn    = devices.filter(d => d.type === "light"   && d.state === "on").length;
  const lightsTotal = devices.filter(d => d.type === "light").length;
  const coversOpen  = devices.filter(d => d.type === "cover"   && d.state === "open").length;
  const mediaPlayer = devices.find(d => d.type === "media_player");
  const climate     = devices.find(d => d.type === "climate");
  const cameras     = devices.filter(d => d.type === "camera");
  const totalPower  = devices.reduce((acc, d) => acc + (d.attributes?.power_w || 0), 0);

  const formatUptime = (s: number) => {
    const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60);
    return `${h}h ${m}m`;
  };

  return (
    <div className="p-5 space-y-5 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white tracking-wide">Tableau de Bord</h1>
          <p className="text-xs text-gray-600 mt-0.5">Vue d'ensemble du système NEXUS</p>
        </div>
        <button onClick={fetchAll} className="text-gray-600 hover:text-gray-400 transition-colors p-2">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Status badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatBadge label="Appareils HA" value={devices.length} color="#6366f1" />
        <StatBadge label="Lumières allumées" value={`${lightsOn}/${lightsTotal}`} color="#f59e0b" />
        <StatBadge label="Consommation W" value={`${Math.round(totalPower)}W`} color="#22c55e" />
        <StatBadge label="Caméras" value={cameras.length} color="#06b6d4" />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Left column */}
        <div className="lg:col-span-2 space-y-4">

          {/* HA Status */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Home className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-bold text-white">Home Assistant</span>
              </div>
              <div className={`flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded-full ${
                haConfig.isConnected
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-gray-500/10 text-gray-500 border border-gray-500/20"
              }`}>
                {haConfig.isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                {haConfig.isConnected ? "Connecté" : "Mode demo"}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { icon: Lightbulb, label: "Lumières", val: `${lightsOn} allumées`, color: "#f59e0b" },
                { icon: Thermometer, label: "Température", val: climate ? `${climate.attributes?.current_temperature}°C` : "—", color: "#f97316" },
                { icon: Tv, label: "Volets ouverts", val: String(coversOpen), color: "#06b6d4" },
                { icon: Activity, label: "Puissance", val: `${Math.round(totalPower)}W`, color: "#22c55e" },
              ].map(({ icon: Icon, label, val, color }) => (
                <div key={label} className="rounded-xl p-3 flex flex-col gap-2"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <Icon className="h-4 w-4" style={{ color }} />
                  <div>
                    <div className="text-xs font-bold text-white">{val}</div>
                    <div className="text-[9px] text-gray-600 mt-0.5">{label}</div>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={() => navigate("/domotique")} className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs text-gray-600 hover:text-gray-300 py-2 rounded-xl hover:bg-white/3 transition-all">
              Voir tous les appareils <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </Card>

          {/* ZimaOS quick stats */}
          {stats && (
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <Server className="h-4 w-4 text-indigo-400" />
                <span className="text-sm font-bold text-white">ZimaOS Servers</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[stats.zima1, stats.zima2].map((z) => (
                  <div key={z.name} className="rounded-xl p-3 space-y-2"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div className="text-[10px] font-bold text-white truncate">{z.name}</div>
                    <div className="space-y-1.5">
                      {[
                        { label: "CPU", val: z.cpu.usage, color: "#6366f1" },
                        { label: "RAM", val: z.ram.usage, color: "#06b6d4" },
                      ].map(({ label, val, color }) => (
                        <div key={label}>
                          <div className="flex justify-between text-[9px] text-gray-600 mb-1">
                            <span>{label}</span><span style={{ color }}>{val.toFixed(1)}%</span>
                          </div>
                          <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${val}%`, background: color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => navigate("/zimaos")} className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs text-gray-600 hover:text-gray-300 py-2 rounded-xl hover:bg-white/3 transition-all">
                Diagnostic complet <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </Card>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">

          {/* Now playing */}
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Music className="h-4 w-4 text-purple-400" />
              <span className="text-sm font-bold text-white">Lecture en cours</span>
            </div>
            {mediaPlayer && mediaPlayer.state === "playing" ? (
              <div className="text-center py-3">
                <div className="w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                  style={{ background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.2)" }}>
                  <Music className="h-7 w-7 text-purple-400" />
                </div>
                <p className="text-sm font-bold text-white">{mediaPlayer.attributes?.media_title || "Titre inconnu"}</p>
                <p className="text-xs text-gray-500 mt-0.5">{mediaPlayer.attributes?.media_artist || ""}</p>
                <div className="flex justify-center gap-0.5 items-end mt-3">
                  {[3, 5, 4, 6, 3].map((h, i) => (
                    <div key={i} className="w-1 bg-purple-400 rounded-full animate-bounce"
                      style={{ height: `${h * 2}px`, animationDelay: `${i * 0.1}s` }} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-gray-700">
                <Music className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">Aucune lecture en cours</p>
              </div>
            )}
            <button onClick={() => navigate("/spotify")} className="mt-2 w-full flex items-center justify-center gap-1.5 text-xs text-gray-600 hover:text-gray-300 py-2 rounded-xl hover:bg-white/3 transition-all">
              Contrôle média <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </Card>

          {/* Discord bot */}
          {stats && (
            <Card>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-indigo-400" />
                  <span className="text-sm font-bold text-white">Discord Bot</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
                  {stats.discordBot.status}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Ping",      val: `${stats.discordBot.ping}ms` },
                  { label: "Serveurs",  val: String(stats.discordBot.guilds) },
                  { label: "Membres",   val: String((stats.discordBot as any).members ?? "—") },
                  { label: "Cmds",      val: String(stats.discordBot.commandsHandled) },
                ].map(({ label, val }) => (
                  <div key={label} className="rounded-lg p-2 text-center"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div className="text-sm font-bold text-white">{val}</div>
                    <div className="text-[9px] text-gray-600">{label}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Recent logs */}
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="h-4 w-4 text-indigo-400" />
              <span className="text-sm font-bold text-white">Activité récente</span>
            </div>
            <div className="space-y-2">
              {logs.length === 0 ? (
                <p className="text-xs text-gray-700 text-center py-3">Aucune activité</p>
              ) : logs.map((log, i) => (
                <div key={i} className="text-[10px] rounded-lg px-3 py-2"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="font-semibold text-indigo-400 truncate max-w-24">{log.user}</span>
                    <span className="text-gray-700">{new Date(log.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <p className="text-gray-500 truncate">{log.response}</p>
                </div>
              ))}
            </div>
            <button onClick={() => navigate("/discord")} className="mt-2 w-full flex items-center justify-center gap-1.5 text-xs text-gray-600 hover:text-gray-300 py-2 rounded-xl hover:bg-white/3 transition-all">
              Voir les logs <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </Card>
        </div>
      </div>
    </div>
  );
}
