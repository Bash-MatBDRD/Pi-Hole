import React, { useState, useEffect } from "react";
import {
  Activity, Home, Music, MessageSquare, Server,
  Lightbulb, Thermometer, Tv, Wind, Wifi, WifiOff, Bot,
  ChevronRight, RefreshCw, Zap, Video, Clock, TrendingUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

interface Device { id: string; name: string; type: string; state: string; room: string; attributes: any; }
interface ZimaStats { name: string; available: boolean; cpu: { usage: number; temperature: number }; ram: { used: number; total: number; usage: number }; disk?: { usage: number; used: number; total: number }; }
interface SystemStats { hosts: ZimaStats[]; zima1: ZimaStats; zima2: ZimaStats; discordBot: { name: string; status: string; ping: number; guilds: number; commandsHandled: number; }; }
interface DiscordLog { timestamp: string; user: string; command: string; response: string; }
interface ActivityLog { timestamp: string; category: string; action: string; details?: string; }

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl p-4 ${className}`}
      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
      {children}
    </div>
  );
}

function StatBar({ label, value, color, unit = "%" }: { label: string; value: number; color: string; unit?: string }) {
  const pct = Math.min(100, Math.max(0, value));
  const warn = pct > 85;
  const actualColor = warn ? "#ef4444" : color;
  return (
    <div>
      <div className="flex justify-between text-[9px] mb-1">
        <span className="text-gray-600">{label}</span>
        <span style={{ color: actualColor }} className="font-bold">{value.toFixed(1)}{unit}</span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: warn ? `linear-gradient(to right, ${actualColor}80, ${actualColor})` : `linear-gradient(to right, ${color}60, ${color})` }} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [devices,    setDevices]    = useState<Device[]>([]);
  const [stats,      setStats]      = useState<SystemStats | null>(null);
  const [activity,   setActivity]   = useState<ActivityLog[]>([]);
  const [haConfig,   setHaConfig]   = useState<{ isConnected: boolean; url?: string }>({ isConnected: false });
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  const fetchAll = async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const [devRes, statRes, actRes, haRes] = await Promise.allSettled([
        axios.get("/api/home-assistant/devices"),
        axios.get("/api/system/stats"),
        axios.get("/api/activity"),
        axios.get("/api/home-assistant/config"),
      ]);
      if (devRes.status === "fulfilled") setDevices(devRes.value.data || []);
      if (statRes.status === "fulfilled") setStats(statRes.value.data);
      if (actRes.status === "fulfilled") {
        const entries = actRes.value.data?.entries ?? actRes.value.data ?? [];
        setActivity(Array.isArray(entries) ? entries.slice(0, 6) : []);
      }
      if (haRes.status === "fulfilled") setHaConfig(haRes.value.data);
    } catch (err) {
      console.warn("[Dashboard] fetchAll error:", err);
    } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchAll(); const id = setInterval(() => fetchAll(), 8000); return () => clearInterval(id); }, []);

  // ── Computed stats ────────────────────────────────────────────────────────
  const lightsOn    = devices.filter(d => d.type === "light"   && d.state === "on").length;
  const lightsTotal = devices.filter(d => d.type === "light").length;
  const coversOpen  = devices.filter(d => d.type === "cover"   && d.state === "open").length;
  const covers      = devices.filter(d => d.type === "cover").length;
  const mediaPlayer = devices.find(d => d.type === "media_player" && d.state === "playing")
    || devices.find(d => d.type === "media_player");
  const climate     = devices.find(d => d.type === "climate");
  const cameras     = devices.filter(d => d.type === "camera");
  const totalPower  = devices.reduce((acc, d) => acc + (d.attributes?.power_w || 0), 0);
  const switchesOn  = devices.filter(d => d.type === "switch" && d.state === "on").length;

  const categoryColor = {
    auth: "#6366f1", domotique: "#f59e0b", settings: "#06b6d4",
    system: "#22c55e", files: "#a855f7", discord: "#8b5cf6",
  };

  const botOnline = stats?.discordBot?.status === "online";

  return (
    <div className="p-5 space-y-5 max-w-7xl mx-auto">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white tracking-wide">Tableau de Bord</h1>
          <p className="text-xs text-gray-600 mt-0.5">Vue d'ensemble · NEXUS Panel</p>
        </div>
        <button onClick={() => fetchAll(true)} disabled={refreshing}
          className="p-2 rounded-xl text-gray-600 hover:text-gray-400 hover:bg-white/5 transition-all disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* ── KPI strip ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: "Appareils HA", value: loading ? "…" : String(devices.length), color: "#6366f1", icon: Home, sub: haConfig.isConnected ? "live" : "démo" },
          { label: "Lumières", value: loading ? "…" : `${lightsOn}/${lightsTotal}`, color: "#f59e0b", icon: Lightbulb, sub: lightsOn > 0 ? "allumées" : "éteintes" },
          { label: "Puissance", value: loading ? "…" : `${Math.round(totalPower)}W`, color: "#22c55e", icon: Zap, sub: `${switchesOn} prise${switchesOn !== 1 ? "s" : ""} active${switchesOn !== 1 ? "s" : ""}` },
          { label: "Caméras", value: loading ? "…" : String(cameras.length), color: "#06b6d4", icon: Video, sub: cameras.length > 0 ? "configurées" : "—" },
        ].map(({ label, value, color, icon: Icon, sub }) => (
          <div key={label} className="rounded-xl p-3.5 flex items-center gap-3"
            style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="p-2 rounded-lg shrink-0" style={{ background: `${color}14`, border: `1px solid ${color}22` }}>
              <Icon className="h-3.5 w-3.5" style={{ color }} />
            </div>
            <div className="min-w-0">
              <div className="text-base font-black text-white leading-none">{value}</div>
              <div className="text-[9px] text-gray-600 mt-0.5 truncate">{label} · <span className="text-gray-700">{sub}</span></div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main grid ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Left col (2/3) */}
        <div className="lg:col-span-2 space-y-4">

          {/* ── Home Assistant card ─────────────────────────────────────── */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg" style={{ background: haConfig.isConnected ? "rgba(16,185,129,0.1)" : "rgba(107,114,128,0.1)" }}>
                  <Home className="h-4 w-4" style={{ color: haConfig.isConnected ? "#10b981" : "#6b7280" }} />
                </div>
                <span className="text-sm font-bold text-white">Home Assistant</span>
              </div>
              <div className={`flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full ${
                haConfig.isConnected
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
              }`}>
                {haConfig.isConnected
                  ? <><Wifi className="h-3 w-3" /> Connecté</>
                  : <><WifiOff className="h-3 w-3" /> Mode démo</>}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              {[
                {
                  icon: Lightbulb, color: "#f59e0b",
                  label: "Lumières",
                  val: `${lightsOn} / ${lightsTotal}`,
                  sub: lightsOn > 0 ? "allumées" : "éteintes",
                },
                {
                  icon: Thermometer, color: "#f97316",
                  label: "Température",
                  val: climate ? `${climate.attributes?.current_temperature ?? "—"}°C` : "—",
                  sub: climate ? `cible ${climate.attributes?.temperature ?? "—"}°C` : "non configuré",
                },
                {
                  icon: Wind, color: "#06b6d4",
                  label: "Volets",
                  val: `${coversOpen} / ${covers}`,
                  sub: coversOpen > 0 ? "ouverts" : "fermés",
                },
                {
                  icon: Zap, color: "#22c55e",
                  label: "Puissance",
                  val: `${Math.round(totalPower)} W`,
                  sub: `${switchesOn} prise${switchesOn !== 1 ? "s" : ""} active${switchesOn !== 1 ? "s" : ""}`,
                },
              ].map(({ icon: Icon, label, val, sub, color }) => (
                <div key={label} className="rounded-xl p-3 space-y-2"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <Icon className="h-3.5 w-3.5" style={{ color }} />
                  <div>
                    <div className="text-sm font-black text-white leading-tight">{val}</div>
                    <div className="text-[9px] text-gray-600 mt-0.5">{label}</div>
                    <div className="text-[9px] text-gray-700 mt-0.5">{sub}</div>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={() => navigate("/domotique")}
              className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-600 hover:text-gray-300 py-2 rounded-xl hover:bg-white/3 transition-all">
              Gérer les appareils <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </Card>

          {/* ── ZimaOS quick stats ──────────────────────────────────────── */}
          {stats && (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg" style={{ background: "rgba(99,102,241,0.1)" }}>
                    <Server className="h-4 w-4 text-indigo-400" />
                  </div>
                  <span className="text-sm font-bold text-white">Serveurs ZimaOS</span>
                </div>
                <span className="text-[9px] text-gray-700 font-mono">
                  {[stats.zima1, stats.zima2].filter(z => z?.available !== false).length} / 2 en ligne
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[stats.zima1, stats.zima2].map((z) => {
                  if (!z) return null;
                  const unavailable = z.available === false;
                  return (
                    <div key={z.name} className="rounded-xl p-3.5 space-y-3"
                      style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${unavailable ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.05)"}` }}>
                      <div className="flex items-center justify-between">
                        <div className="text-[10px] font-bold text-white truncate">{z.name}</div>
                        <div className={`h-1.5 w-1.5 rounded-full ${unavailable ? "bg-red-500" : "bg-emerald-400"}`} />
                      </div>
                      {unavailable ? (
                        <p className="text-[9px] text-red-400/70">Inaccessible — SSH non configuré</p>
                      ) : (
                        <div className="space-y-2">
                          <StatBar label="CPU" value={z.cpu?.usage ?? 0} color="#6366f1" />
                          <StatBar label="RAM" value={z.ram?.usage ?? 0} color="#06b6d4" />
                          {z.disk && <StatBar label="Disque" value={z.disk.usage ?? 0} color="#a855f7" />}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <button onClick={() => navigate("/zimaos")}
                className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs text-gray-600 hover:text-gray-300 py-2 rounded-xl hover:bg-white/3 transition-all">
                Diagnostic complet <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </Card>
          )}
        </div>

        {/* Right col (1/3) */}
        <div className="space-y-4">

          {/* ── Now playing ─────────────────────────────────────────────── */}
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Music className="h-4 w-4 text-purple-400" />
              <span className="text-sm font-bold text-white">Lecture en cours</span>
            </div>
            {mediaPlayer && mediaPlayer.state === "playing" ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center relative"
                    style={{ background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.2)" }}>
                    <Music className="h-5 w-5 text-purple-400" />
                    <div className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{mediaPlayer.attributes?.media_title || "Titre inconnu"}</p>
                    <p className="text-[10px] text-gray-500 truncate mt-0.5">{mediaPlayer.attributes?.media_artist || "—"}</p>
                  </div>
                </div>
                <div className="flex justify-start gap-0.5 items-end">
                  {[3, 5, 4, 6, 3, 5, 4].map((h, i) => (
                    <div key={i} className="w-1 bg-purple-400 rounded-full animate-bounce"
                      style={{ height: `${h * 2}px`, animationDelay: `${i * 0.1}s`, opacity: 0.7 }} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-5 text-gray-700">
                <Music className="h-7 w-7 mx-auto mb-2 opacity-20" />
                <p className="text-xs">Aucune lecture en cours</p>
              </div>
            )}
            <button onClick={() => navigate("/spotify")}
              className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs text-gray-600 hover:text-gray-300 py-2 rounded-xl hover:bg-white/3 transition-all">
              Contrôle média <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </Card>

          {/* ── Discord Bot ─────────────────────────────────────────────── */}
          {stats?.discordBot && (
            <Card>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-indigo-400" />
                  <span className="text-sm font-bold text-white">Discord Bot</span>
                </div>
                <div className={`flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded-full ${
                  botOnline ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-gray-500/10 text-gray-500 border border-gray-500/20"
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${botOnline ? "bg-emerald-400 animate-pulse" : "bg-gray-600"}`} />
                  {stats.discordBot.status}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Ping",     val: `${stats.discordBot.ping}ms` },
                  { label: "Serveurs", val: String(stats.discordBot.guilds) },
                  { label: "Membres",  val: String((stats.discordBot as any).members ?? "—") },
                  { label: "Cmds",     val: String(stats.discordBot.commandsHandled) },
                ].map(({ label, val }) => (
                  <div key={label} className="rounded-lg p-2.5 text-center"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div className="text-sm font-black text-white">{val}</div>
                    <div className="text-[9px] text-gray-600 mt-0.5">{label}</div>
                  </div>
                ))}
              </div>
              <button onClick={() => navigate("/discord")}
                className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs text-gray-600 hover:text-gray-300 py-2 rounded-xl hover:bg-white/3 transition-all">
                Voir les logs <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </Card>
          )}

          {/* ── Activity log ─────────────────────────────────────────────── */}
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-4 w-4 text-indigo-400" />
              <span className="text-sm font-bold text-white">Activité récente</span>
            </div>
            <div className="space-y-1.5">
              {activity.length === 0 ? (
                <p className="text-xs text-gray-700 text-center py-3">Aucune activité</p>
              ) : activity.map((log, i) => {
                const color = categoryColor[log.category as keyof typeof categoryColor] || "#6b7280";
                return (
                  <div key={i} className="flex items-start gap-2.5 px-2.5 py-2 rounded-lg"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                    <div className="h-1.5 w-1.5 rounded-full mt-1.5 shrink-0" style={{ background: color }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-semibold text-white/80 truncate">{log.action}</span>
                        <span className="text-[9px] text-gray-700 shrink-0 flex items-center gap-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          {new Date(log.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      {log.details && <p className="text-[9px] text-gray-600 truncate mt-0.5">{log.details}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
