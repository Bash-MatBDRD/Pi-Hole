import React, { useState, useEffect } from "react";
import {
  Server, Cpu, Database, HardDrive, Thermometer, RefreshCw,
  Activity, Clock, MonitorSmartphone, AlertTriangle, Plus, Trash2, X, Lock,
} from "lucide-react";
import axios from "axios";

interface MetricResult<T> { available: boolean; reason?: string; data?: T; }

interface ZimaStats {
  id: string; name: string; ip: string; reachable: boolean; reason?: string; os: string;
  uptimeSeconds: number | null;
  cpu: { usage: number | null; temperature: number | null };
  ram: { usedGb: number | null; totalGb: number | null; usagePct: number | null };
  disk: {
    path: string; totalGb: number | null; usedGb: number | null; usagePct: number | null;
    temperature: MetricResult<number>; health: MetricResult<string>;
  };
  gpu: MetricResult<{ freqMhz: number; maxFreqMhz: number; usagePct: number }>;
}
interface SystemStats {
  hosts: ZimaStats[];
  discordBot: { name: string; status: string; ping: number; guilds: number; members: number; shards: number; commandsHandled: number; };
}
interface HostSummary { id: string; name: string; ip: string; isLocal: boolean; sshConfigured: boolean; }

const ACCENTS = ["#6366f1", "#06b6d4", "#22c55e", "#f59e0b", "#e879f9"];

function formatUptime(s: number | null) {
  if (s === null) return "—";
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${d}j ${h}h ${m}m`;
}

function ProgressBar({ value, color }: { value: number | null; color: string }) {
  return (
    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(value ?? 0, 100)}%`, background: value === null ? "#3f3f46" : color }} />
    </div>
  );
}

function Unavailable({ reason }: { reason?: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
      <AlertTriangle className="h-3 w-3" />
      <span>Non disponible{reason ? ` — ${reason}` : ""}</span>
    </div>
  );
}

function ServerCard({ server, accent, isLocal, onDelete }: { server: ZimaStats; accent: string; isLocal: boolean; onDelete?: () => void }) {
  return (
    <div className="rounded-2xl p-5 space-y-4"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-black text-white">{server.name}</h2>
          <p className="text-[10px] text-gray-600 font-mono mt-0.5">{server.ip} · {server.os}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full"
            style={server.reachable
              ? { background: `${accent}15`, border: `1px solid ${accent}30`, color: accent }
              : { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" }}>
            <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: server.reachable ? accent : "#f87171" }} />
            {server.reachable ? "En ligne" : "Inaccessible"}
          </div>
          {!isLocal && onDelete && (
            <button onClick={onDelete} title="Supprimer ce système" className="text-gray-700 hover:text-red-400 transition-colors p-1">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {!server.reachable && server.reason && (
        <div className="rounded-xl px-3 py-2 text-[10px] text-red-300 flex items-start gap-2"
          style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-px" />
          <span>{server.reason}</span>
        </div>
      )}

      {/* Uptime */}
      <div className="flex items-center gap-2 rounded-xl px-3 py-2"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
        <Clock className="h-3.5 w-3.5 text-gray-600" />
        <span className="text-[10px] text-gray-500">Uptime:</span>
        <span className="text-[10px] font-mono text-white ml-auto">{formatUptime(server.uptimeSeconds)}</span>
      </div>

      {/* CPU */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Cpu className="h-3.5 w-3.5 text-indigo-400" />
            <span className="text-xs font-semibold text-white">Processeur</span>
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <span style={{ color: accent }}>{server.cpu.usage !== null ? `${server.cpu.usage.toFixed(1)}%` : "—"}</span>
            {server.cpu.temperature !== null && (
              <>
                <span className="text-gray-700">·</span>
                <span className="text-orange-400 flex items-center gap-1">
                  <Thermometer className="h-3 w-3" />{server.cpu.temperature.toFixed(0)}°C
                </span>
              </>
            )}
          </div>
        </div>
        <ProgressBar value={server.cpu.usage} color={accent} />
      </div>

      {/* GPU */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <MonitorSmartphone className="h-3.5 w-3.5 text-fuchsia-400" />
            <span className="text-xs font-semibold text-white">GPU</span>
          </div>
          {server.gpu.available && server.gpu.data ? (
            <span className="text-[10px] text-fuchsia-400">
              {server.gpu.data.usagePct.toFixed(0)}% · {server.gpu.data.freqMhz}/{server.gpu.data.maxFreqMhz} MHz
            </span>
          ) : null}
        </div>
        {server.gpu.available && server.gpu.data ? (
          <ProgressBar value={server.gpu.data.usagePct} color="#e879f9" />
        ) : (
          <Unavailable reason={server.gpu.reason} />
        )}
      </div>

      {/* RAM */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Database className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-xs font-semibold text-white">Mémoire RAM</span>
          </div>
          <span className="text-[10px] text-cyan-400">
            {server.ram.usedGb !== null ? `${server.ram.usedGb.toFixed(2)} / ${server.ram.totalGb?.toFixed(1)} Go (${server.ram.usagePct?.toFixed(1)}%)` : "—"}
          </span>
        </div>
        <ProgressBar value={server.ram.usagePct} color="#06b6d4" />
      </div>

      {/* Disk */}
      <div className="rounded-xl p-3 space-y-2"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <HardDrive className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs font-semibold text-white">Stockage</span>
          </div>
          {server.disk.health.available && server.disk.health.data ? (
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
              server.disk.health.data === "Bon état"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
            }`}>{server.disk.health.data}</span>
          ) : (
            <Unavailable reason={server.disk.health.reason} />
          )}
        </div>
        <ProgressBar value={server.disk.usagePct} color="#10b981" />
        <div className="grid grid-cols-2 gap-2 mt-2">
          {[
            { label: "Utilisé",      val: server.disk.usedGb !== null ? `${server.disk.usedGb.toFixed(1)} Go` : "—" },
            { label: "Total",        val: server.disk.totalGb !== null ? `${server.disk.totalGb.toFixed(1)} Go` : "—" },
            { label: "Température",  val: server.disk.temperature.available ? `${server.disk.temperature.data?.toFixed(0)}°C` : "Non disponible" },
            { label: "Chemin",       val: server.disk.path },
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

function AddHostModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [name, setName] = useState("");
  const [ip, setIp] = useState("");
  const [sshUser, setSshUser] = useState("");
  const [sshPassword, setSshPassword] = useState("");
  const [filesRoot, setFilesRoot] = useState("/DATA");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      await axios.post("/api/hosts", { name, ip, sshUser, sshPassword, filesRoot });
      onAdded();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Impossible d'ajouter ce système");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
      <div className="w-full max-w-md rounded-2xl p-5 space-y-4"
        style={{ background: "#0a0a12", border: "1px solid rgba(255,255,255,0.1)" }}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-white">Ajouter un système</h2>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-400"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          {[
            { label: "Nom", value: name, setter: setName, placeholder: "ZimaOS Bureau" },
            { label: "Adresse IP", value: ip, setter: setIp, placeholder: "192.168.1.50" },
            { label: "Utilisateur SSH", value: sshUser, setter: setSshUser, placeholder: "root" },
          ].map(({ label, value, setter, placeholder }) => (
            <div key={label}>
              <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-1 block">{label}</label>
              <input value={value} onChange={(e) => setter(e.target.value)} placeholder={placeholder} required
                className="w-full rounded-xl py-2.5 px-3 text-sm text-white focus:outline-none"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
            </div>
          ))}
          <div>
            <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-1 block">Mot de passe SSH</label>
            <input type="password" value={sshPassword} onChange={(e) => setSshPassword(e.target.value)} placeholder="••••••••" required
              className="w-full rounded-xl py-2.5 px-3 text-sm text-white focus:outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-1 block">Racine des fichiers</label>
            <input value={filesRoot} onChange={(e) => setFilesRoot(e.target.value)} placeholder="/DATA"
              className="w-full rounded-xl py-2.5 px-3 text-sm text-white focus:outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
          </div>
          {error && <p className="text-[11px] text-red-400">{error}</p>}
          <button type="submit" disabled={saving}
            className="w-full py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: "rgba(99,102,241,0.9)" }}>
            {saving ? "Ajout en cours…" : "Ajouter"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ZimaOS() {
  const [stats,   setStats]   = useState<SystemStats | null>(null);
  const [hosts,   setHosts]   = useState<HostSummary[]>([]);
  const [maxCustom, setMaxCustom] = useState(3);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const fetchStats = async () => {
    try { const r = await axios.get("/api/system/stats"); setStats(r.data); }
    catch {} finally { setLoading(false); }
  };
  const fetchHosts = async () => {
    try {
      const r = await axios.get("/api/hosts");
      setHosts(r.data.hosts); setMaxCustom(r.data.maxCustomHosts);
    } catch {}
  };

  useEffect(() => {
    fetchStats(); fetchHosts();
    const id = setInterval(fetchStats, 8000);
    return () => clearInterval(id);
  }, []);

  const customCount = hosts.filter((h) => !h.isLocal && h.id !== "remote").length;
  const canAddMore = customCount < maxCustom;

  const deleteHost = async (id: string) => {
    if (!confirm("Supprimer ce système du panel ?")) return;
    try { await axios.delete(`/api/hosts/${id}`); fetchHosts(); fetchStats(); } catch {}
  };

  return (
    <div className="p-5 space-y-5 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white tracking-wide">ZimaOS Diagnostic</h1>
          <p className="text-xs text-gray-600 mt-0.5">Statistiques système en direct — {hosts.length} système{hosts.length > 1 ? "s" : ""} surveillé{hosts.length > 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          {canAddMore && (
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white transition-all"
              style={{ background: "rgba(99,102,241,0.9)" }}>
              <Plus className="h-3.5 w-3.5" /> Ajouter un système
            </button>
          )}
          <button onClick={() => { fetchStats(); fetchHosts(); }} className="text-gray-600 hover:text-gray-400 transition-colors p-2">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!canAddMore && (
        <p className="text-[10px] text-gray-700 flex items-center gap-1.5">
          <Lock className="h-3 w-3" /> Limite de {maxCustom} systèmes supplémentaires atteinte.
        </p>
      )}

      {loading ? (
        <div className="text-center py-20 text-gray-700">
          <Server className="h-10 w-10 mx-auto mb-3 opacity-30 animate-pulse" />
          <p className="text-sm">Chargement des statistiques...</p>
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {stats.hosts.map((server, i) => (
              <ServerCard key={server.id} server={server} accent={ACCENTS[i % ACCENTS.length]}
                isLocal={hosts.find((h) => h.id === server.id)?.isLocal ?? server.id === "local"}
                onDelete={() => deleteHost(server.id)} />
            ))}
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

      {showAdd && <AddHostModal onClose={() => setShowAdd(false)} onAdded={() => { fetchHosts(); fetchStats(); }} />}
    </div>
  );
}
