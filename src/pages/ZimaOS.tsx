import React, { useState, useEffect } from "react";
import {
  Server, Cpu, Database, HardDrive, Thermometer, RefreshCw,
  Wifi, Activity, Clock,
} from "lucide-react";
import axios from "axios";

interface ZimaStats {
  name: string; ip: string; os: string; platform: string; uptime: number;
  cpu: { usage: number; temperature: number };
  ram: { used: number; total: number; usage: number };
  disk: { path: string; type: string; total: number; used: number; usage: number; temperature: number; health: string; readSpeed: number; writeSpeed: number; };
}
interface SystemStats {
  zima1: ZimaStats; zima2: ZimaStats;
  discordBot: { name: string; status: string; ping: number; guilds: number; members: number; shards: number; commandsHandled: number; };
}

function formatUptime(s: number) {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${d}j ${h}h ${m}m`;
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(value, 100)}%`, background: color }} />
    </div>
  );
}

function ServerCard({ server, accent }: { server: ZimaStats; accent: string }) {
  return (
    <div className="rounded-2xl p-5 space-y-4"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-black text-white">{server.name}</h2>
          <p className="text-[10px] text-gray-600 font-mono mt-0.5">{server.ip} · {server.os}</p>
          <p className="text-[10px] text-gray-700 mt-0.5">{server.platform}</p>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full"
          style={{ background: `${accent}15`, border: `1px solid ${accent}30`, color: accent }}>
          <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: accent }} />
          En ligne
        </div>
      </div>

      {/* Uptime */}
      <div className="flex items-center gap-2 rounded-xl px-3 py-2"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
        <Clock className="h-3.5 w-3.5 text-gray-600" />
        <span className="text-[10px] text-gray-500">Uptime:</span>
        <span className="text-[10px] font-mono text-white ml-auto">{formatUptime(server.uptime)}</span>
      </div>

      {/* CPU */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Cpu className="h-3.5 w-3.5 text-indigo-400" />
            <span className="text-xs font-semibold text-white">Processeur</span>
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <span style={{ color: accent }}>{server.cpu.usage.toFixed(1)}%</span>
            <span className="text-gray-700">·</span>
            <span className="text-orange-400 flex items-center gap-1">
              <Thermometer className="h-3 w-3" />{server.cpu.temperature}°C
            </span>
          </div>
        </div>
        <ProgressBar value={server.cpu.usage} color={accent} />
      </div>

      {/* RAM */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Database className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-xs font-semibold text-white">Mémoire RAM</span>
          </div>
          <span className="text-[10px] text-cyan-400">{server.ram.used.toFixed(2)} / {server.ram.total} Go ({server.ram.usage.toFixed(1)}%)</span>
        </div>
        <ProgressBar value={server.ram.usage} color="#06b6d4" />
      </div>

      {/* Disk */}
      <div className="rounded-xl p-3 space-y-2"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <HardDrive className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs font-semibold text-white">Stockage</span>
          </div>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
            server.disk.health === "Excellent" || server.disk.health === "Parfait"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
          }`}>{server.disk.health}</span>
        </div>
        <ProgressBar value={server.disk.usage} color="#10b981" />
        <div className="grid grid-cols-2 gap-2 mt-2">
          {[
            { label: "Utilisé",     val: `${server.disk.used.toFixed(1)} Go` },
            { label: "Total",       val: `${server.disk.total.toFixed(1)} Go` },
            { label: "Lecture",     val: `${server.disk.readSpeed.toFixed(1)} Mo/s` },
            { label: "Écriture",    val: `${server.disk.writeSpeed.toFixed(1)} Mo/s` },
            { label: "Température", val: `${server.disk.temperature.toFixed(1)}°C` },
            { label: "Chemin",      val: server.disk.path },
          ].map(({ label, val }) => (
            <div key={label}>
              <div className="text-[9px] text-gray-700 uppercase tracking-wider">{label}</div>
              <div className="text-[10px] font-mono text-gray-400 mt-0.5 truncate">{val}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ZimaOS() {
  const [stats,   setStats]   = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try { const r = await axios.get("/api/system/stats"); setStats(r.data); }
    catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchStats(); const id = setInterval(fetchStats, 5000); return () => clearInterval(id); }, []);

  return (
    <div className="p-5 space-y-5 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white tracking-wide">ZimaOS Diagnostic</h1>
          <p className="text-xs text-gray-600 mt-0.5">Surveillance des serveurs en temps réel</p>
        </div>
        <button onClick={fetchStats} className="text-gray-600 hover:text-gray-400 transition-colors p-2">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-700">
          <Server className="h-10 w-10 mx-auto mb-3 opacity-30 animate-pulse" />
          <p className="text-sm">Chargement des statistiques...</p>
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ServerCard server={stats.zima1} accent="#6366f1" />
            <ServerCard server={stats.zima2} accent="#06b6d4" />
          </div>

          {/* Discord bot card */}
          <div className="rounded-2xl p-5"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-4 w-4 text-indigo-400" />
              <h2 className="text-sm font-black text-white">Discord Bot — {stats.discordBot.name}</h2>
              <div className="ml-auto flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
                {stats.discordBot.status}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Ping",       val: `${stats.discordBot.ping} ms`,              color: "#6366f1" },
                { label: "Serveurs",   val: String(stats.discordBot.guilds),             color: "#22c55e" },
                { label: "Membres",    val: String(stats.discordBot.members),            color: "#06b6d4" },
                { label: "Commandes",  val: String(stats.discordBot.commandsHandled),    color: "#f59e0b" },
              ].map(({ label, val, color }) => (
                <div key={label} className="rounded-xl p-3 text-center"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="text-lg font-black" style={{ color }}>{val}</div>
                  <div className="text-[9px] text-gray-600 mt-0.5 uppercase tracking-wider">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-20 text-gray-700">
          <p className="text-sm">Impossible de récupérer les statistiques</p>
        </div>
      )}
    </div>
  );
}
