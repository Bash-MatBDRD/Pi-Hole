import React, { useState, useEffect } from "react";
import {
  Activity, Home, Music, MessageSquare, Server, Lightbulb,
  Thermometer, Tv, Wind, Wifi, WifiOff, Bot, ChevronRight,
  RefreshCw, Zap, Video, Clock, TrendingUp, HardDrive, Cpu,
  MemoryStick, Gamepad2, Circle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

interface Device { id: string; name: string; type: string; state: string; room: string; attributes: any; }
interface ZimaStats {
  name: string; ip: string; reachable: boolean; reason?: string;
  cpu: { usage: number | null; temperature: number | null };
  ram: { usedGb: number | null; totalGb: number | null; usagePct: number | null };
  disk?: { usage: number | null; usedGb: number | null; totalGb: number | null };
  uptimeSeconds: number | null;
  os: string;
}
interface SystemStats {
  hosts: ZimaStats[];
  discordBot: { name: string; status: string; ping: number; guilds: number; commandsHandled: number; members?: number };
}
interface ActivityEntry { ts: number; category: string; action: string; details?: string; }

function Bar({ val, color, warn }: { val: number; color: string; warn?: boolean }) {
  const pct = Math.min(100, Math.max(0, val));
  const c = warn && pct > 85 ? "#ef4444" : color;
  return (
    <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
      <div className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, background: `linear-gradient(to right, ${c}60, ${c})` }} />
    </div>
  );
}

function uptime(s: number | null) {
  if (!s) return "—";
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}j ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const CAT_COLOR: Record<string, string> = {
  auth: "#6366f1", domotique: "#f59e0b", settings: "#06b6d4",
  system: "#22c55e", files: "#a855f7", discord: "#8b5cf6", notes: "#f97316",
};

export default function Dashboard() {
  const [devices,    setDevices]    = useState<Device[]>([]);
  const [stats,      setStats]      = useState<SystemStats | null>(null);
  const [activity,   setActivity]   = useState<ActivityEntry[]>([]);
  const [haConfig,   setHaConfig]   = useState<{ isConnected: boolean }>({ isConnected: false });
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [now,        setNow]        = useState(new Date());
  const navigate = useNavigate();

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const fetchAll = async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const [devRes, statRes, actRes, haRes] = await Promise.allSettled([
        axios.get("/api/home-assistant/devices"),
        axios.get("/api/system/stats"),
        axios.get("/api/activity?limit=8"),
        axios.get("/api/home-assistant/config"),
      ]);
      if (devRes.status  === "fulfilled") setDevices(devRes.value.data || []);
      if (statRes.status === "fulfilled") setStats(statRes.value.data);
      if (actRes.status  === "fulfilled") setActivity((actRes.value.data?.entries ?? actRes.value.data ?? []).slice(0, 6));
      if (haRes.status   === "fulfilled") setHaConfig(haRes.value.data);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchAll(); const id = setInterval(() => fetchAll(), 8000); return () => clearInterval(id); }, []);

  // Computed
  const lightsOn    = devices.filter(d => d.type === "light"   && d.state === "on").length;
  const lightsTotal = devices.filter(d => d.type === "light").length;
  const coversOpen  = devices.filter(d => d.type === "cover"   && d.state === "open").length;
  const covers      = devices.filter(d => d.type === "cover").length;
  const mediaPlayer = devices.find(d => d.type === "media_player" && d.state === "playing") || devices.find(d => d.type === "media_player");
  const climate     = devices.find(d => d.type === "climate");
  const cameras     = devices.filter(d => d.type === "camera");
  const totalPower  = devices.reduce((a, d) => a + (d.attributes?.power_w || 0), 0);
  const switchesOn  = devices.filter(d => d.type === "switch" && d.state === "on").length;

  // Room breakdown
  const byRoom: Record<string, Device[]> = {};
  devices.forEach(d => { if (!byRoom[d.room]) byRoom[d.room] = []; byRoom[d.room].push(d); });
  const rooms = Object.entries(byRoom).filter(([r]) => r !== "Général").slice(0, 6);

  const botOnline = stats?.discordBot?.status === "online";
  const hostsOnline = stats?.hosts.filter(h => h.reachable !== false).length ?? 0;

  const timeStr = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="p-5 space-y-5 max-w-[1600px] mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white tracking-wide">Tableau de bord</h1>
          <p className="text-xs text-gray-600 mt-0.5 capitalize">{dateStr}</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Status indicators */}
          <div className="hidden sm:flex items-center gap-3">
            <div className={`flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full ${haConfig.isConnected ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-gray-500/10 text-gray-500 border border-gray-500/20"}`}>
              <div className={`h-1.5 w-1.5 rounded-full ${haConfig.isConnected ? "bg-emerald-400 animate-pulse" : "bg-gray-600"}`} />
              HA {haConfig.isConnected ? "Live" : "Démo"}
            </div>
            <div className={`flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full ${botOnline ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" : "bg-gray-500/10 text-gray-500 border border-gray-500/20"}`}>
              <div className={`h-1.5 w-1.5 rounded-full ${botOnline ? "bg-indigo-400 animate-pulse" : "bg-gray-600"}`} />
              Bot {botOnline ? "Online" : "Offline"}
            </div>
          </div>
          {/* Live clock */}
          <div className="text-right hidden sm:block">
            <div className="text-base font-black text-white font-mono tracking-wider">{timeStr}</div>
          </div>
          <button onClick={() => fetchAll(true)} disabled={refreshing}
            className="p-2 rounded-xl text-gray-600 hover:text-gray-400 hover:bg-white/5 transition-all disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
        {[
          { label: "Appareils",  value: loading ? "…" : String(devices.length),          color: "#6366f1", icon: Home,        sub: haConfig.isConnected ? "live HA" : "mode démo" },
          { label: "Lumières",   value: loading ? "…" : `${lightsOn}/${lightsTotal}`,     color: "#f59e0b", icon: Lightbulb,   sub: lightsOn > 0 ? "allumées" : "éteintes" },
          { label: "Puissance",  value: loading ? "…" : `${Math.round(totalPower)}W`,     color: "#22c55e", icon: Zap,         sub: `${switchesOn} prise${switchesOn !== 1 ? "s" : ""} active${switchesOn !== 1 ? "s" : ""}` },
          { label: "Volets",     value: loading ? "…" : `${coversOpen}/${covers}`,        color: "#06b6d4", icon: Wind,        sub: coversOpen > 0 ? "ouverts" : "fermés" },
          { label: "Caméras",    value: loading ? "…" : String(cameras.length),           color: "#a855f7", icon: Video,       sub: cameras.length > 0 ? "actives" : "—" },
          { label: "Serveurs",   value: loading ? "…" : `${hostsOnline}/${stats?.hosts.length ?? 0}`, color: "#f97316", icon: Server, sub: "en ligne" },
        ].map(({ label, value, color, icon: Icon, sub }) => (
          <div key={label} className="rounded-xl p-3 flex items-center gap-2.5"
            style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="p-1.5 rounded-lg shrink-0" style={{ background: `${color}14`, border: `1px solid ${color}22` }}>
              <Icon className="h-3 w-3" style={{ color }} />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-black text-white leading-none">{value}</div>
              <div className="text-[9px] text-gray-700 mt-0.5 truncate">{label}</div>
              <div className="text-[8px] text-gray-800 truncate">{sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Left col */}
        <div className="xl:col-span-2 space-y-4">

          {/* HA Overview */}
          <div className="rounded-2xl p-5"
            style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg" style={{ background: haConfig.isConnected ? "rgba(16,185,129,0.1)" : "rgba(107,114,128,0.1)" }}>
                  <Home className="h-4 w-4" style={{ color: haConfig.isConnected ? "#10b981" : "#6b7280" }} />
                </div>
                <div>
                  <span className="text-sm font-bold text-white">Home Assistant</span>
                  {climate && <span className="text-[9px] text-gray-600 ml-2 font-mono">{climate.attributes?.current_temperature ?? "—"}°C</span>}
                </div>
              </div>
              <button onClick={() => navigate("/domotique")}
                className="flex items-center gap-1 text-[10px] text-gray-600 hover:text-gray-300 transition-all">
                Gérer <ChevronRight className="h-3 w-3" />
              </button>
            </div>

            {/* Room breakdown */}
            {rooms.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {rooms.map(([room, devs]) => {
                  const on = devs.filter(d => d.state === "on" || d.state === "open" || d.state === "playing").length;
                  const lights = devs.filter(d => d.type === "light");
                  const lightsOn = lights.filter(d => d.state === "on").length;
                  return (
                    <div key={room} className="rounded-xl p-3"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-white truncate">{room}</span>
                        {on > 0 && <div className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />}
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        {devs.slice(0, 4).map(d => (
                          <div key={d.id}
                            className="text-[8px] px-1.5 py-0.5 rounded-md font-semibold"
                            style={{
                              background: d.state === "on" || d.state === "open" || d.state === "playing"
                                ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.04)",
                              color: d.state === "on" || d.state === "open" || d.state === "playing"
                                ? "#f59e0b" : "#6b7280",
                              border: "1px solid",
                              borderColor: d.state === "on" || d.state === "open" || d.state === "playing"
                                ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.05)",
                            }}>
                            {d.type === "light" ? "💡" : d.type === "cover" ? "🪟" : d.type === "switch" ? "🔌" : d.type === "climate" ? "🌡" : d.type === "media_player" ? "🎵" : "📦"}
                          </div>
                        ))}
                        {devs.length > 4 && <span className="text-[8px] text-gray-700">+{devs.length - 4}</span>}
                      </div>
                      {lights.length > 0 && (
                        <div className="mt-2 text-[8px] text-gray-600">{lightsOn}/{lights.length} lumière{lights.length > 1 ? "s" : ""}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { icon: Lightbulb, color: "#f59e0b", val: `${lightsOn}/${lightsTotal}`, label: "Lumières" },
                  { icon: Thermometer, color: "#f97316", val: climate ? `${climate.attributes?.current_temperature ?? "—"}°C` : "—", label: "Temp." },
                  { icon: Wind, color: "#06b6d4", val: `${coversOpen}/${covers}`, label: "Volets" },
                  { icon: Zap, color: "#22c55e", val: `${Math.round(totalPower)}W`, label: "Puissance" },
                ].map(({ icon: Icon, color, val, label }) => (
                  <div key={label} className="rounded-xl p-3 text-center"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <Icon className="h-3.5 w-3.5 mx-auto mb-1.5" style={{ color }} />
                    <div className="text-sm font-black text-white">{val}</div>
                    <div className="text-[9px] text-gray-600 mt-0.5">{label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ZimaOS Servers */}
          {stats?.hosts && stats.hosts.length > 0 && (
            <div className="rounded-2xl p-5"
              style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg" style={{ background: "rgba(99,102,241,0.1)" }}>
                    <Server className="h-4 w-4 text-indigo-400" />
                  </div>
                  <span className="text-sm font-bold text-white">Serveurs ZimaOS</span>
                </div>
                <button onClick={() => navigate("/zimaos")}
                  className="flex items-center gap-1 text-[10px] text-gray-600 hover:text-gray-300 transition-all">
                  Diagnostic <ChevronRight className="h-3 w-3" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {stats.hosts.map((z, i) => {
                  const unreachable = z.reachable === false;
                  return (
                    <div key={i} className="rounded-xl p-4"
                      style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${unreachable ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.05)"}` }}>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="text-[10px] font-bold text-white">{z.name}</div>
                          <div className="text-[9px] text-gray-700 font-mono">{z.ip}</div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {z.uptimeSeconds != null && !unreachable && (
                            <span className="text-[8px] text-gray-700 font-mono">{uptime(z.uptimeSeconds)}</span>
                          )}
                          <div className={`h-2 w-2 rounded-full ${unreachable ? "bg-red-500" : "bg-emerald-400 animate-pulse"}`} />
                        </div>
                      </div>
                      {unreachable ? (
                        <p className="text-[9px] text-red-400/60">{z.reason || "Inaccessible"}</p>
                      ) : (
                        <div className="space-y-2">
                          <div>
                            <div className="flex justify-between text-[9px] mb-1">
                              <span className="text-gray-600 flex items-center gap-1"><Cpu className="h-2.5 w-2.5" />CPU</span>
                              <span className="text-gray-400 font-mono">{z.cpu.usage?.toFixed(1) ?? "—"}%{z.cpu.temperature ? ` · ${z.cpu.temperature.toFixed(0)}°C` : ""}</span>
                            </div>
                            <Bar val={z.cpu.usage ?? 0} color="#6366f1" warn />
                          </div>
                          <div>
                            <div className="flex justify-between text-[9px] mb-1">
                              <span className="text-gray-600 flex items-center gap-1"><MemoryStick className="h-2.5 w-2.5" />RAM</span>
                              <span className="text-gray-400 font-mono">{z.ram.usedGb?.toFixed(1) ?? "—"}/{z.ram.totalGb?.toFixed(0) ?? "—"}Go</span>
                            </div>
                            <Bar val={z.ram.usagePct ?? 0} color="#06b6d4" warn />
                          </div>
                          {z.disk && z.disk.usage != null && (
                            <div>
                              <div className="flex justify-between text-[9px] mb-1">
                                <span className="text-gray-600 flex items-center gap-1"><HardDrive className="h-2.5 w-2.5" />Disque</span>
                                <span className="text-gray-400 font-mono">{z.disk.usedGb?.toFixed(0) ?? "—"}/{z.disk.totalGb?.toFixed(0) ?? "—"}Go</span>
                              </div>
                              <Bar val={z.disk.usage} color="#a855f7" warn />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right col */}
        <div className="space-y-4">

          {/* Now Playing */}
          <div className="rounded-2xl p-4"
            style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Music className="h-4 w-4 text-purple-400" />
              <span className="text-sm font-bold text-white">Lecture en cours</span>
            </div>
            {mediaPlayer && mediaPlayer.state === "playing" ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center relative"
                    style={{ background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.2)" }}>
                    <Music className="h-5 w-5 text-purple-400" />
                    <div className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{mediaPlayer.attributes?.media_title || "—"}</p>
                    <p className="text-[10px] text-gray-500 truncate mt-0.5">{mediaPlayer.attributes?.media_artist || ""}</p>
                  </div>
                </div>
                <div className="flex gap-0.5 items-end">
                  {[3, 5, 4, 6, 3, 5, 4].map((h, i) => (
                    <div key={i} className="w-1 bg-purple-400/70 rounded-full animate-bounce"
                      style={{ height: `${h * 2}px`, animationDelay: `${i * 0.1}s` }} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-5 text-gray-700">
                <Music className="h-7 w-7 mx-auto mb-2 opacity-20" />
                <p className="text-xs">Aucune lecture</p>
              </div>
            )}
            <button onClick={() => navigate("/spotify")}
              className="mt-3 w-full flex items-center justify-center gap-1.5 text-[10px] text-gray-600 hover:text-gray-300 py-1.5 rounded-xl hover:bg-white/3 transition-all">
              Contrôle média <ChevronRight className="h-3 w-3" />
            </button>
          </div>

          {/* Discord Bot */}
          {stats?.discordBot && (
            <div className="rounded-2xl p-4"
              style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-indigo-400" />
                  <span className="text-sm font-bold text-white">Discord Bot</span>
                </div>
                <div className={`flex items-center gap-1.5 text-[9px] font-semibold px-2 py-1 rounded-full ${botOnline ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-gray-500/10 text-gray-500 border border-gray-500/20"}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${botOnline ? "bg-emerald-400 animate-pulse" : "bg-gray-600"}`} />
                  {botOnline ? "Online" : "Offline"}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { label: "Ping",    val: botOnline ? `${stats.discordBot.ping}ms` : "—" },
                  { label: "Servers", val: String(stats.discordBot.guilds) },
                  { label: "Members", val: String(stats.discordBot.members ?? "—") },
                  { label: "Cmds",    val: String(stats.discordBot.commandsHandled) },
                ].map(({ label, val }) => (
                  <div key={label} className="rounded-lg p-2 text-center"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                    <div className="text-xs font-black text-white">{val}</div>
                    <div className="text-[8px] text-gray-700 mt-0.5">{label}</div>
                  </div>
                ))}
              </div>
              {!botOnline && (
                <button onClick={() => navigate("/settings")}
                  className="mt-2 w-full text-[9px] text-amber-500/70 hover:text-amber-400 text-center py-1 transition-all">
                  Configurer le token Discord →
                </button>
              )}
            </div>
          )}

          {/* Activity Log */}
          <div className="rounded-2xl p-4"
            style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-4 w-4 text-indigo-400" />
              <span className="text-sm font-bold text-white">Activité récente</span>
            </div>
            <div className="space-y-1">
              {activity.length === 0 ? (
                <p className="text-xs text-gray-700 text-center py-3">Aucune activité</p>
              ) : activity.map((log, i) => {
                const color = CAT_COLOR[log.category] || "#6b7280";
                return (
                  <div key={i} className="flex items-start gap-2 px-2 py-1.5 rounded-lg"
                    style={{ background: "rgba(255,255,255,0.015)" }}>
                    <div className="h-1.5 w-1.5 rounded-full mt-1.5 shrink-0" style={{ background: color }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] font-semibold text-white/80 truncate">{log.action}</span>
                        <span className="text-[8px] text-gray-700 shrink-0 flex items-center gap-0.5">
                          <Clock className="h-2 w-2" />
                          {new Date(log.ts).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      {log.details && <p className="text-[8px] text-gray-600 truncate">{log.details}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
