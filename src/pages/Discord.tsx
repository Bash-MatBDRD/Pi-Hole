import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, RefreshCw, Bot, Users, Zap, Clock } from "lucide-react";
import axios from "axios";

interface DiscordLog { timestamp: string; user: string; command: string; response: string; }
interface BotStats { name: string; status: string; ping: number; guilds: number; members: number; shards: number; commandsHandled: number; }

export default function Discord() {
  const [logs,      setLogs]      = useState<DiscordLog[]>([]);
  const [bot,       setBot]       = useState<BotStats | null>(null);
  const [input,     setInput]     = useState("");
  const [loading,   setLoading]   = useState(true);
  const [sending,   setSending]   = useState(false);
  const termRef = useRef<HTMLDivElement>(null);

  const fetchAll = async () => {
    try {
      const [logRes, statsRes] = await Promise.all([
        axios.get("/api/discord/logs"),
        axios.get("/api/system/stats"),
      ]);
      setLogs(logRes.data || []);
      setBot(statsRes.data?.discordBot || null);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); const id = setInterval(fetchAll, 5000); return () => clearInterval(id); }, []);

  useEffect(() => {
    if (termRef.current) termRef.current.scrollTop = 0;
  }, [logs]);

  const sendLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      await axios.post("/api/discord/logs", { user: "Dashboard", command: input, response: `💬 Message envoyé: ${input}` });
      setInput("");
      await fetchAll();
    } catch {} finally { setSending(false); }
  };

  const formatTime = (ts: string) =>
    new Date(ts).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const formatDate = (ts: string) =>
    new Date(ts).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });

  // Stable color per username
  const userColor = (user: string) => {
    const colors = ["#818cf8","#34d399","#f59e0b","#f472b6","#38bdf8","#a78bfa","#fb923c"];
    let hash = 0;
    for (let i = 0; i < user.length; i++) hash = user.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="p-5 space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white tracking-wide">Discord Bot</h1>
          <p className="text-xs text-gray-600 mt-0.5">Activité et journaux du bot</p>
        </div>
        <button onClick={fetchAll} className="text-gray-600 hover:text-gray-400 transition-colors p-2">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Bot status cards */}
      {bot && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Zap,     label: "Ping",      val: `${bot.ping} ms`,           color: "#6366f1" },
            { icon: Users,   label: "Serveurs",   val: String(bot.guilds),         color: "#22c55e" },
            { icon: Users,   label: "Membres",    val: String(bot.members),        color: "#06b6d4" },
            { icon: Clock,   label: "Commandes",  val: String(bot.commandsHandled),color: "#f59e0b" },
          ].map(({ icon: Icon, label, val, color }) => (
            <div key={label} className="rounded-2xl p-4"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-7 w-7 rounded-lg flex items-center justify-center"
                  style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
                  <Icon className="h-3.5 w-3.5" style={{ color }} />
                </div>
              </div>
              <div className="text-lg font-black" style={{ color }}>{val}</div>
              <div className="text-[9px] text-gray-600 uppercase tracking-wider mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Bot status banner */}
      {bot && (
        <div className="rounded-2xl p-4 flex items-center gap-3"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <Bot className="h-5 w-5 text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">{bot.name}</p>
            <p className="text-[10px] text-gray-600 mt-0.5">Shard #{bot.shards} · {bot.commandsHandled} commandes traitées</p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-full font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
            {bot.status}
          </div>
        </div>
      )}

      {/* Terminal log */}
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="px-4 py-3 flex items-center justify-between"
          style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-indigo-400" />
            <span className="text-xs font-bold text-white">Journal d'activité</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 font-mono">{logs.length} entrées</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-red-500/60" />
            <div className="h-2 w-2 rounded-full bg-yellow-500/60" />
            <div className="h-2 w-2 rounded-full bg-emerald-500/60" />
          </div>
        </div>

        <div
          ref={termRef}
          className="h-80 overflow-y-auto custom-scrollbar font-mono text-[11px] space-y-px"
          style={{ background: "rgba(2,2,10,0.8)" }}
        >
          {loading ? (
            <div className="flex items-center justify-center h-full text-gray-700">
              <RefreshCw className="h-5 w-5 animate-spin mr-2" />Chargement...
            </div>
          ) : logs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-700">
              Aucun journal disponible
            </div>
          ) : (
            logs.map((log, i) => {
              const uc = userColor(log.user);
              return (
                <div key={i} className="px-4 py-2 hover:bg-white/[0.02] transition-colors border-b"
                  style={{ borderColor: "rgba(255,255,255,0.03)" }}>
                  <div className="flex items-start gap-3">
                    <span className="text-gray-700 shrink-0 w-28 text-right">{formatDate(log.timestamp)} {formatTime(log.timestamp)}</span>
                    <span className="shrink-0 font-bold px-1.5 py-0.5 rounded text-[10px]"
                      style={{ color: uc, background: `${uc}15` }}>{log.user}</span>
                    <div className="min-w-0 flex-1">
                      {log.command && (
                        <div className="text-amber-400/70 truncate mb-0.5 text-[10px]">$ {log.command}</div>
                      )}
                      <div className="text-emerald-400/80 truncate text-[10px]">{log.response}</div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input */}
        <form onSubmit={sendLog}
          className="px-4 py-3 flex items-center gap-3"
          style={{ background: "rgba(255,255,255,0.02)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <span className="text-indigo-400 font-mono text-xs shrink-0">$</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ajouter une entrée au journal..."
            className="flex-1 bg-transparent text-xs text-white placeholder:text-gray-700 focus:outline-none font-mono"
          />
          <button type="submit" disabled={!input.trim() || sending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-400 hover:text-white transition-all disabled:opacity-30"
            style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}>
            <Send className="h-3.5 w-3.5" />
            {sending ? "..." : "Envoyer"}
          </button>
        </form>
      </div>
    </div>
  );
}
