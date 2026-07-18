import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Server, Cpu, Database, HardDrive, Thermometer, RefreshCw,
  Activity, Clock, MonitorSmartphone, AlertTriangle, Plus, Trash2, X, Lock,
  Info, ChevronRight, Disc,
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

interface DiskSmart {
  device: string; model: string; serial: string; firmware: string; capacity: string; transport: string;
  powerOnHours: number | null; reallocatedSectors: number | null; pendingSectors: number | null;
  uncorrectable: number | null; health: string; temperature: number | null; rotational: boolean;
}
interface ExtendedProperties {
  cpu: { model: string; architecture: string; cores: number; threads: number; sockets: number; baseFreqMhz: number; cacheKb: number | null; virtualization: string; };
  ram: { totalGb: number | null; type: string; speed: string };
  disks: DiskSmart[];
  motherboard: string;
  kernel: string;
}

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

// ── Context Menu ───────────────────────────────────────────────────────────────
interface CtxMenu { x: number; y: number; serverId: string; serverName: string; isLocal: boolean; }

function ContextMenu({ menu, onProperties, onDelete, onClose }: {
  menu: CtxMenu; onProperties: () => void; onDelete: () => void; onClose: () => void;
}) {
  useEffect(() => {
    const handler = () => onClose();
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [onClose]);

  return (
    <div
      className="fixed z-50 rounded-xl py-1 text-sm shadow-xl min-w-[180px]"
      style={{ left: menu.x, top: menu.y, background: "#111118", border: "1px solid rgba(255,255,255,0.12)" }}
      onClick={(e) => e.stopPropagation()}
    >
      <button onClick={onProperties}
        className="flex items-center gap-2.5 w-full px-3 py-2 hover:bg-white/5 transition-colors text-gray-300 text-xs">
        <Info className="h-3.5 w-3.5 text-indigo-400" /> Propriétés
      </button>
      <div className="h-px my-1" style={{ background: "rgba(255,255,255,0.07)" }} />
      <button onClick={onDelete} disabled={menu.isLocal}
        className={`flex items-center gap-2.5 w-full px-3 py-2 hover:bg-white/5 transition-colors text-xs ${menu.isLocal ? "text-gray-700 cursor-not-allowed" : "text-red-400"}`}>
        <Trash2 className="h-3.5 w-3.5" /> Supprimer {menu.isLocal ? "(hôte local)" : ""}
      </button>
    </div>
  );
}

// ── Properties Modal ───────────────────────────────────────────────────────────
function PropertiesModal({ server, accent, onClose }: { server: ZimaStats; accent: string; onClose: () => void }) {
  const [props, setProps] = useState<ExtendedProperties | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    axios.get(`/api/system/properties/${server.id}`)
      .then(r => setProps(r.data))
      .catch(e => setError(e?.response?.data?.error || "Impossible de récupérer les propriétés"))
      .finally(() => setLoading(false));
  }, [server.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="w-full max-w-2xl rounded-2xl overflow-hidden"
        style={{ background: "#0a0a12", border: "1px solid rgba(255,255,255,0.1)", maxHeight: "85vh", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full" style={{ background: accent }} />
            <h2 className="text-sm font-black text-white">Propriétés — {server.name}</h2>
            <span className="text-[10px] font-mono text-gray-600">{server.ip} · {server.os}</span>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-400 transition-colors"><X className="h-4 w-4" /></button>
        </div>

        <div className="overflow-y-auto custom-scrollbar flex-1 p-5 space-y-5">
          {loading && (
            <div className="text-center py-10">
              <Cpu className="h-8 w-8 mx-auto mb-3 text-indigo-400 animate-pulse" />
              <p className="text-xs text-gray-600">Lecture des composants…</p>
              <p className="text-[10px] text-gray-700 mt-1">Les données SMART peuvent prendre quelques secondes.</p>
            </div>
          )}
          {error && <p className="text-xs text-red-400 flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{error}</p>}

          {props && (
            <>
              {/* CPU */}
              <section>
                <h3 className="flex items-center gap-2 text-xs font-bold text-white mb-3">
                  <Cpu className="h-3.5 w-3.5 text-indigo-400" /> Processeur
                </h3>
                <div className="rounded-xl p-4 space-y-2" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <p className="text-xs font-semibold text-indigo-300">{props.cpu.model || "Inconnu"}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                    {[
                      { label: "Architecture", val: props.cpu.architecture },
                      { label: "Cœurs", val: `${props.cpu.cores} (×${props.cpu.sockets} socket)` },
                      { label: "Threads", val: String(props.cpu.threads) },
                      { label: "Fréq. max", val: props.cpu.baseFreqMhz ? `${props.cpu.baseFreqMhz.toFixed(0)} MHz` : "?" },
                      { label: "Cache L3", val: props.cpu.cacheKb ? `${props.cpu.cacheKb >= 1024 ? (props.cpu.cacheKb/1024).toFixed(1)+" Mo" : props.cpu.cacheKb+" Ko"}` : "?" },
                      { label: "Virtualisation", val: props.cpu.virtualization },
                      { label: "Usage actuel", val: server.cpu.usage !== null ? `${server.cpu.usage.toFixed(1)}%` : "—" },
                      { label: "Température", val: server.cpu.temperature !== null ? `${server.cpu.temperature.toFixed(0)}°C` : "—" },
                    ].map(({ label, val }) => (
                      <div key={label}>
                        <div className="text-[9px] text-gray-700 uppercase tracking-wider">{label}</div>
                        <div className="text-[11px] text-gray-300 font-mono mt-0.5">{val || "?"}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* RAM */}
              <section>
                <h3 className="flex items-center gap-2 text-xs font-bold text-white mb-3">
                  <Database className="h-3.5 w-3.5 text-cyan-400" /> Mémoire RAM
                </h3>
                <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Utilisée", val: server.ram.usedGb !== null ? `${server.ram.usedGb.toFixed(2)} Go` : "—" },
                      { label: "Total", val: server.ram.totalGb !== null ? `${server.ram.totalGb.toFixed(1)} Go` : "—" },
                      { label: "Usage", val: server.ram.usagePct !== null ? `${server.ram.usagePct.toFixed(1)}%` : "—" },
                    ].map(({ label, val }) => (
                      <div key={label}>
                        <div className="text-[9px] text-gray-700 uppercase tracking-wider">{label}</div>
                        <div className="text-[11px] text-gray-300 font-mono mt-0.5">{val}</div>
                      </div>
                    ))}
                  </div>
                  <ProgressBar value={server.ram.usagePct} color="#06b6d4" />
                </div>
              </section>

              {/* Kernel */}
              {props.kernel && props.kernel !== "?" && (
                <div className="flex items-center gap-2 text-[10px] text-gray-600">
                  <ChevronRight className="h-3 w-3" />
                  Kernel : <span className="font-mono text-gray-500">{props.kernel}</span>
                </div>
              )}

              {/* Disques SMART */}
              <section>
                <h3 className="flex items-center gap-2 text-xs font-bold text-white mb-3">
                  <HardDrive className="h-3.5 w-3.5 text-emerald-400" /> Stockage — Données S.M.A.R.T
                </h3>
                {props.disks.length === 0 ? (
                  <Unavailable reason="Aucun disque détecté ou smartctl non disponible (droits root requis)" />
                ) : (
                  <div className="space-y-3">
                    {props.disks.map((disk) => (
                      <div key={disk.device} className="rounded-xl p-4 space-y-3"
                        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Disc className="h-3.5 w-3.5 text-emerald-400" />
                            <span className="text-xs font-semibold text-white font-mono">{disk.device}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${disk.rotational ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"}`}>
                              {disk.rotational ? "HDD" : "SSD/NVMe"}
                            </span>
                            <span className="text-[10px] font-mono text-gray-600">{disk.transport}</span>
                          </div>
                          <span className="text-[11px] font-semibold"
                            style={{ color: disk.health === "Bon état" ? "#10b981" : disk.health === "Attention" ? "#f59e0b" : "#9ca3af" }}>
                            {disk.health}
                          </span>
                        </div>
                        <p className="text-[11px] text-indigo-300 font-medium">{disk.model}</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {[
                            { label: "Numéro de série", val: disk.serial },
                            { label: "Firmware", val: disk.firmware },
                            { label: "Capacité", val: disk.capacity || "?" },
                            { label: "Température", val: disk.temperature !== null ? `${disk.temperature}°C` : "N/A (root)" },
                            { label: "Heures sous tension", val: disk.powerOnHours !== null ? `${disk.powerOnHours.toLocaleString("fr-FR")} h` : "N/A (root)" },
                            { label: "Secteurs réalloués", val: disk.reallocatedSectors !== null ? String(disk.reallocatedSectors) : "N/A (root)", warn: (disk.reallocatedSectors ?? 0) > 0 },
                            { label: "Secteurs en attente", val: disk.pendingSectors !== null ? String(disk.pendingSectors) : "N/A (root)", warn: (disk.pendingSectors ?? 0) > 0 },
                            { label: "Erreurs non corrigées", val: disk.uncorrectable !== null ? String(disk.uncorrectable) : "N/A (root)", warn: (disk.uncorrectable ?? 0) > 0 },
                          ].map(({ label, val, warn }) => (
                            <div key={label}>
                              <div className="text-[9px] text-gray-700 uppercase tracking-wider">{label}</div>
                              <div className={`text-[11px] font-mono mt-0.5 truncate ${warn ? "text-amber-400 font-bold" : "text-gray-300"}`}>{val}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {props.disks.length > 0 && props.disks.every(d => d.health === "N/A (root requis)") && (
                <p className="text-[10px] text-gray-700 flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3" />
                  Les données S.M.A.R.T nécessitent que <code className="text-gray-600">smartctl</code> soit installé et exécuté avec les droits root.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Server Card ────────────────────────────────────────────────────────────────
function ServerCard({ server, accent, isLocal, onDelete, onContextMenu }: {
  server: ZimaStats; accent: string; isLocal: boolean;
  onDelete?: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      className="rounded-2xl p-5 space-y-4 cursor-context-menu"
      onContextMenu={onContextMenu}
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
        <p className="text-[9px] text-gray-700 mt-1">Clic droit → Propriétés pour les données S.M.A.R.T</p>
      </div>
    </div>
  );
}

// ── Add Host Modal ─────────────────────────────────────────────────────────────
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

// ── Main page ──────────────────────────────────────────────────────────────────
export default function ZimaOS() {
  const [stats,   setStats]   = useState<SystemStats | null>(null);
  const [hosts,   setHosts]   = useState<HostSummary[]>([]);
  const [maxCustom, setMaxCustom] = useState(3);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  // Context menu + properties
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null);
  const [propServer, setPropServer] = useState<{ server: ZimaStats; accent: string } | null>(null);

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

  const handleContextMenu = useCallback((e: React.MouseEvent, server: ZimaStats, accent: string, isLocal: boolean) => {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY, serverId: server.id, serverName: server.name, isLocal });
    setPropServer({ server, accent }); // pre-select for properties
  }, []);

  return (
    <div className="p-5 space-y-5 max-w-6xl mx-auto" onClick={() => setCtxMenu(null)}>
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
            {stats.hosts.map((server, i) => {
              const accent = ACCENTS[i % ACCENTS.length];
              const isLocal = hosts.find((h) => h.id === server.id)?.isLocal ?? server.id === "local";
              return (
                <ServerCard
                  key={server.id}
                  server={server}
                  accent={accent}
                  isLocal={isLocal}
                  onDelete={() => deleteHost(server.id)}
                  onContextMenu={(e) => handleContextMenu(e, server, accent, isLocal)}
                />
              );
            })}
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

      {/* Context menu */}
      {ctxMenu && propServer && (
        <ContextMenu
          menu={ctxMenu}
          onProperties={() => { setCtxMenu(null); /* propServer already set */ }}
          onDelete={() => { setCtxMenu(null); deleteHost(ctxMenu.serverId); }}
          onClose={() => setCtxMenu(null)}
        />
      )}

      {/* Properties modal — stays open even after ctx menu closes */}
      {propServer && !ctxMenu && (
        <PropertiesModal
          server={propServer.server}
          accent={propServer.accent}
          onClose={() => setPropServer(null)}
        />
      )}

      {showAdd && <AddHostModal onClose={() => setShowAdd(false)} onAdded={() => { fetchHosts(); fetchStats(); }} />}
    </div>
  );
}
