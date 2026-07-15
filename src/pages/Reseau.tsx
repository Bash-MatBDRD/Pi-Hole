import React, { useState, useEffect } from "react";
import { Wifi, WifiOff, RefreshCw, Globe, Server, MessageSquare, Home, Clock, Activity } from "lucide-react";
import axios from "axios";

interface ServiceCheck {
  name: string;
  ok: boolean;
  latency: number;
  error?: string;
  statusCode?: number;
  note?: string;
}

interface HostCheck {
  name: string;
  ip: string;
  ok: boolean | null;
  latency: number;
  error?: string;
  method: string;
  note?: string;
}

interface ReseauData {
  services: ServiceCheck[];
  hosts: HostCheck[];
  checkedAt: string;
}

function LatencyBar({ ms, max = 500 }: { ms: number; max?: number }) {
  const pct = Math.min(100, (ms / max) * 100);
  const color = ms < 100 ? "#22c55e" : ms < 300 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1 w-16 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[10px] font-mono" style={{ color }}>{ms}ms</span>
    </div>
  );
}

function StatusDot({ ok }: { ok: boolean | null }) {
  if (ok === null) return <span className="h-2 w-2 rounded-full bg-gray-600 shrink-0" />;
  return (
    <span className={`h-2 w-2 rounded-full shrink-0 ${ok ? "animate-pulse" : ""}`}
      style={{ background: ok ? "#22c55e" : "#ef4444" }} />
  );
}

function serviceIcon(name: string) {
  if (name.toLowerCase().includes("internet"))  return <Globe className="h-4 w-4 text-cyan-400" />;
  if (name.toLowerCase().includes("discord"))   return <MessageSquare className="h-4 w-4 text-indigo-400" />;
  if (name.toLowerCase().includes("assistant")) return <Home className="h-4 w-4 text-emerald-400" />;
  return <Activity className="h-4 w-4 text-gray-400" />;
}

export default function Reseau() {
  const [data,    setData]    = useState<ReseauData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUp,  setLastUp]  = useState<string>("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: d } = await axios.get("/api/reseau");
      setData(d);
      setLastUp(new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 30_000);
    return () => clearInterval(id);
  }, []);

  const allServices = data ? [...data.services, ...data.hosts] : [];
  const online = allServices.filter(s => s.ok === true).length;
  const total  = allServices.length;

  return (
    <div className="p-5 space-y-5 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white tracking-wide">Réseau</h1>
          <p className="text-xs text-gray-600 mt-0.5">Statut des services et hôtes surveillés</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUp && (
            <span className="text-[10px] text-gray-700 flex items-center gap-1">
              <Clock className="h-3 w-3" />Mis à jour à {lastUp}
            </span>
          )}
          <button onClick={fetchData} disabled={loading}
            className="p-2 text-gray-600 hover:text-gray-400 transition-colors disabled:opacity-40">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Summary */}
      {data && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "En ligne",    val: online,         color: "#22c55e" },
            { label: "Hors ligne",  val: total - online, color: "#ef4444" },
            { label: "Total",       val: total,          color: "#6366f1" },
          ].map(({ label, val, color }) => (
            <div key={label} className="rounded-2xl p-4 text-center"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="text-2xl font-black" style={{ color }}>{val}</div>
              <div className="text-[9px] text-gray-600 uppercase tracking-wider mt-1">{label}</div>
            </div>
          ))}
        </div>
      )}

      {loading && !data && (
        <div className="flex items-center justify-center py-24 gap-3 text-gray-600">
          <RefreshCw className="h-5 w-5 animate-spin" />Analyse du réseau…
        </div>
      )}

      {/* Services */}
      {data && (
        <div className="rounded-2xl overflow-hidden"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="px-4 py-3 flex items-center gap-2"
            style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <Globe className="h-4 w-4 text-cyan-400" />
            <span className="text-xs font-bold text-white">Services externes</span>
          </div>
          <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
            {data.services.map((svc, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 hover:bg-white/[0.015] transition-colors">
                <StatusDot ok={svc.ok} />
                <div className="shrink-0">{serviceIcon(svc.name)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white">{svc.name}</p>
                  {svc.error && <p className="text-[10px] text-red-400 truncate">{svc.error}</p>}
                  {svc.note  && <p className="text-[10px] text-gray-500 truncate">{svc.note}</p>}
                  {svc.statusCode && <p className="text-[10px] text-gray-600">HTTP {svc.statusCode}</p>}
                </div>
                <div className="shrink-0">
                  {svc.ok ? (
                    <LatencyBar ms={svc.latency} />
                  ) : (
                    <span className="text-[10px] text-red-400 flex items-center gap-1">
                      <WifiOff className="h-3 w-3" />Hors ligne
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ZimaOS hosts */}
      {data && data.hosts.length > 0 && (
        <div className="rounded-2xl overflow-hidden"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="px-4 py-3 flex items-center gap-2"
            style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <Server className="h-4 w-4 text-indigo-400" />
            <span className="text-xs font-bold text-white">Hôtes ZimaOS</span>
          </div>
          <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
            {data.hosts.map((h, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 hover:bg-white/[0.015] transition-colors">
                <StatusDot ok={h.ok} />
                <Server className="h-4 w-4 text-indigo-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white">{h.name}</p>
                  <p className="text-[10px] text-gray-600 font-mono">{h.ip}</p>
                  {h.note  && <p className="text-[10px] text-gray-500">{h.note}</p>}
                  {h.error && <p className="text-[10px] text-red-400 truncate">{h.error}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[9px] px-2 py-0.5 rounded-full font-mono"
                    style={{ background: "rgba(255,255,255,0.05)", color: "#6b7280" }}>
                    {h.method.toUpperCase()}
                  </span>
                  {h.ok === true && <LatencyBar ms={h.latency} max={2000} />}
                  {h.ok === false && (
                    <span className="text-[10px] text-red-400 flex items-center gap-1">
                      <WifiOff className="h-3 w-3" />Inaccessible
                    </span>
                  )}
                  {h.ok === null && (
                    <span className="text-[10px] text-gray-600">Non vérifié</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Auto-refresh note */}
      <p className="text-[9px] text-gray-700 text-center">Rafraîchissement automatique toutes les 30 secondes</p>
    </div>
  );
}
