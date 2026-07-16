import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Terminal as TermIcon, PlugZap, X, ChevronDown,
  Server, RefreshCw, Copy, Check, AlertCircle,
} from "lucide-react";
import axios from "axios";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Host { id: string; name: string; ip: string; isLocal: boolean; sshConfigured: boolean; }
type Status = "idle" | "connecting" | "connected" | "error" | "disconnected";

// ── NEXUS xterm theme (catppuccin-flavoured indigo) ───────────────────────────
const TERM_THEME = {
  background: "#050505", foreground: "#cdd6f4",
  cursor: "#6366f1",     cursorAccent: "#050505",
  selectionBackground: "rgba(99,102,241,0.25)",
  selectionForeground: "#ffffff",
  black: "#1e1e2e",      brightBlack: "#45475a",
  red: "#f38ba8",        brightRed: "#f38ba8",
  green: "#a6e3a1",      brightGreen: "#a6e3a1",
  yellow: "#f9e2af",     brightYellow: "#f9e2af",
  blue: "#89b4fa",       brightBlue: "#89b4fa",
  magenta: "#cba6f7",    brightMagenta: "#cba6f7",
  cyan: "#89dceb",       brightCyan: "#89dceb",
  white: "#cdd6f4",      brightWhite: "#ffffff",
};

const BANNER = [
  "\r\n",
  "  \x1b[38;2;99;102;241m╔═╗╔═╗╦ ╦╔═╗╔═╗\x1b[0m",
  "  \x1b[38;2;99;102;241m║╔╗║╣ ╚╦╝║  ╚═╗\x1b[0m",
  "  \x1b[38;2;99;102;241m╝╚╝╚═╝ ╩ ╚═╝╚═╝\x1b[0m  \x1b[90mTerminal — SSH Interactif\x1b[0m",
  "\r\n  \x1b[90m• Sélectionnez un hôte ZimaOS dans le menu ci-dessus\x1b[0m",
  "  \x1b[90m• Cliquez sur \x1b[38;2;99;102;241mConnecter\x1b[90m pour démarrer une session\x1b[0m",
  "  \x1b[90m• Préfixe de commande NexusBot :\x1b[0m \x1b[38;2;99;102;241m.\x1b[0m",
  "\r\n",
];

export default function TerminalPage() {
  const [hosts,        setHosts]        = useState<Host[]>([]);
  const [selectedId,   setSelectedId]   = useState("");
  const [status,       setStatus]       = useState<Status>("idle");
  const [errorMsg,     setErrorMsg]     = useState("");
  const [connName,     setConnName]     = useState("");
  const [showDrop,     setShowDrop]     = useState(false);
  const [copied,       setCopied]       = useState(false);
  const [histEntry,    setHistEntry]    = useState("");

  const wrapRef     = useRef<HTMLDivElement>(null);
  const termElRef   = useRef<HTMLDivElement>(null);
  const termRef     = useRef<any>(null);
  const fitRef      = useRef<any>(null);
  const wsRef       = useRef<WebSocket | null>(null);
  const obsRef      = useRef<ResizeObserver | null>(null);
  const statusRef   = useRef<Status>("idle");

  statusRef.current = status;

  // ── Load available hosts ───────────────────────────────────────────────────
  useEffect(() => {
    axios.get("/api/hosts").then(({ data }) => {
      // Show all non-local hosts — SSH errors are handled gracefully when connecting
      const viable: Host[] = (data.hosts || []).filter((h: Host) => !h.isLocal);
      setHosts(viable);
      if (viable.length > 0) setSelectedId(viable[0].id);
    }).catch(() => {});
    return () => { wsRef.current?.close(); obsRef.current?.disconnect(); };
  }, []);

  // ── Initialise xterm (lazy import to keep bundle lean) ─────────────────────
  useEffect(() => {
    if (!termElRef.current) return;
    let term: any, fit: any, disposed = false;

    import("@xterm/xterm").then(({ Terminal }) =>
      import("@xterm/addon-fit").then(({ FitAddon }) => {
        if (disposed) return;
        term = new Terminal({
          theme: TERM_THEME,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          fontSize: 13, lineHeight: 1.45,
          cursorBlink: true, cursorStyle: "bar",
          allowTransparency: true, scrollback: 8000,
        });
        fit = new FitAddon();
        term.loadAddon(fit);
        term.open(termElRef.current!);
        setTimeout(() => fit.fit(), 80);

        termRef.current = term;
        fitRef.current  = fit;

        // Resize observer
        const obs = new ResizeObserver(() => {
          fit.fit();
          const ws = wsRef.current;
          if (ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }));
          }
        });
        if (wrapRef.current) obs.observe(wrapRef.current);
        obsRef.current = obs;

        // User input → WebSocket
        term.onData((data: string) => {
          const ws = wsRef.current;
          if (ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "input", data: btoa(unescape(encodeURIComponent(data))) }));
          }
        });

        // Welcome banner
        BANNER.forEach(line => term.writeln(line));
      })
    );

    return () => {
      disposed = true;
      obsRef.current?.disconnect();
      termRef.current?.dispose();
    };
  }, []);

  // ── Connect ────────────────────────────────────────────────────────────────
  const connect = useCallback(() => {
    if (!selectedId || statusRef.current === "connecting" || statusRef.current === "connected") return;
    const term = termRef.current; if (!term) return;

    setStatus("connecting"); setErrorMsg("");
    term.writeln("\r\n\x1b[38;2;99;102;241m[NEXUS]\x1b[0m \x1b[90mÉtablissement de la connexion SSH…\x1b[0m");

    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(
      `${proto}//${window.location.host}/api/terminal?host=${encodeURIComponent(selectedId)}`
    );
    wsRef.current = ws;

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data as string);
        switch (msg.type) {
          case "data":
            term.write(decodeURIComponent(escape(atob(msg.data))));
            break;
          case "connected":
            setStatus("connected"); setConnName(msg.host);
            term.writeln(`\r\n\x1b[38;2;34;197;94m✓ Session ouverte → ${msg.host} (${msg.ip})\x1b[0m\r\n`);
            fitRef.current?.fit();
            ws.send(JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }));
            break;
          case "error":
            setStatus("error"); setErrorMsg(msg.message || "Erreur inconnue");
            term.writeln(`\r\n\x1b[38;2;239;68;68m✗ ${msg.message}\x1b[0m\r\n`);
            break;
          case "disconnected":
            setStatus("disconnected");
            term.writeln("\r\n\x1b[90m[NEXUS] Session SSH fermée.\x1b[0m\r\n");
            break;
        }
      } catch {}
    };
    ws.onclose  = () => { if (statusRef.current === "connected") setStatus("disconnected"); };
    ws.onerror  = () => {
      setStatus("error"); setErrorMsg("WebSocket refusé");
      term.writeln("\r\n\x1b[38;2;239;68;68m✗ Impossible d'ouvrir le WebSocket.\x1b[0m\r\n");
    };
  }, [selectedId]);

  // ── Disconnect ─────────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    wsRef.current?.close(); wsRef.current = null;
    setStatus("idle"); setConnName("");
    termRef.current?.writeln("\r\n\x1b[90m[NEXUS] Déconnecté.\x1b[0m\r\n");
  }, []);

  const clearTerm = () => termRef.current?.clear();
  const focusTerm = () => termRef.current?.focus();

  const copyCmd = () => {
    if (!histEntry.trim()) return;
    navigator.clipboard.writeText(histEntry);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
    const ws = wsRef.current;
    const term = termRef.current;
    if (ws?.readyState === WebSocket.OPEN && term) {
      const cmd = histEntry + "\r";
      ws.send(JSON.stringify({ type: "input", data: btoa(cmd) }));
      setHistEntry("");
    }
  };

  // ── Derived UI ─────────────────────────────────────────────────────────────
  const selectedHost = hosts.find(h => h.id === selectedId);
  const statusConfig: Record<Status, { color: string; dot: string; label: string }> = {
    idle:         { color: "#6b7280", dot: "bg-gray-600",   label: "Non connecté"  },
    connecting:   { color: "#f59e0b", dot: "bg-amber-400",  label: "Connexion…"    },
    connected:    { color: "#22c55e", dot: "bg-emerald-400", label: `Connecté — ${connName}` },
    error:        { color: "#ef4444", dot: "bg-red-500",    label: `Erreur${errorMsg ? ": " + errorMsg : ""}` },
    disconnected: { color: "#6b7280", dot: "bg-gray-600",   label: "Déconnecté"    },
  };
  const sc = statusConfig[status];
  const canConnect    = !!selectedId && status !== "connecting" && status !== "connected";
  const isConnected   = status === "connected";

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 68px)" }} onClick={() => setShowDrop(false)}>

      {/* ── Top Bar ───────────────────────────────────────────────────────── */}
      <div
        className="shrink-0 flex items-center gap-2 px-4 py-2"
        style={{ background: "rgba(5,5,8,0.9)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>

        {/* Title */}
        <TermIcon className="h-4 w-4 text-indigo-400 shrink-0" />
        <span className="text-xs font-black text-white tracking-widest uppercase">Terminal</span>

        <div className="h-4 w-px bg-white/10 mx-0.5" />

        {/* Host dropdown */}
        <div className="relative" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => setShowDrop(!showDrop)}
            disabled={isConnected}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all disabled:opacity-50"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <Server className="h-3 w-3 text-indigo-400 shrink-0" />
            <span className="text-white font-semibold">{selectedHost?.name || "Choisir un hôte"}</span>
            {selectedHost && <span className="text-gray-600 font-mono text-[9px] hidden sm:block">{selectedHost.ip}</span>}
            <ChevronDown className="h-3 w-3 text-gray-600" />
          </button>

          {showDrop && hosts.length > 0 && (
            <div className="absolute top-full mt-1 left-0 z-50 rounded-xl overflow-hidden min-w-52 shadow-2xl"
              style={{ background: "rgba(8,8,20,0.98)", border: "1px solid rgba(99,102,241,0.2)" }}>
              <div className="px-3 py-2 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <span className="text-[9px] text-gray-600 uppercase tracking-widest">Hôtes SSH disponibles</span>
              </div>
              {hosts.map(h => (
                <button key={h.id}
                  onClick={() => { setSelectedId(h.id); setShowDrop(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-xs transition-colors ${h.id === selectedId ? "bg-indigo-500/15 text-indigo-300" : "hover:bg-white/5 text-white"}`}>
                  <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: h.id === selectedId ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.05)" }}>
                    <Server className="h-3.5 w-3.5" style={{ color: h.id === selectedId ? "#818cf8" : "#6b7280" }} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold truncate">{h.name}</p>
                    <p className="text-gray-600 font-mono text-[9px]">{h.ip}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Status pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono shrink-0"
          style={{ background: sc.color + "12", border: `1px solid ${sc.color}30` }}>
          <span className={`h-1.5 w-1.5 rounded-full ${sc.dot} ${status === "connecting" || status === "connected" ? "animate-pulse" : ""}`} />
          <span style={{ color: sc.color }}>{sc.label}</span>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Quick-send input (visible when connected) */}
        {isConnected && (
          <div className="flex items-center gap-1.5 rounded-lg overflow-hidden"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <span className="pl-3 text-indigo-400 font-mono text-xs select-none">$</span>
            <input
              value={histEntry}
              onChange={e => setHistEntry(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") copyCmd(); }}
              placeholder="commande rapide…"
              className="bg-transparent text-xs text-white placeholder:text-gray-700 focus:outline-none py-1.5 w-36"
            />
            <button onClick={copyCmd}
              className="px-2 py-1.5 text-gray-600 hover:text-indigo-400 transition-colors">
              {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            </button>
          </div>
        )}

        {/* Clear */}
        <button onClick={clearTerm}
          className="p-1.5 rounded-lg text-gray-700 hover:text-gray-400 hover:bg-white/5 transition-all"
          title="Effacer le terminal">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>

        {/* Connect / Disconnect */}
        {!isConnected ? (
          <button onClick={connect} disabled={!canConnect || hosts.length === 0}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-white transition-all disabled:opacity-40 shrink-0"
            style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.3), rgba(99,102,241,0.15))", border: "1px solid rgba(99,102,241,0.35)" }}>
            <PlugZap className="h-3.5 w-3.5 text-indigo-300" />
            {status === "connecting" ? "Connexion…" : "Connecter"}
          </button>
        ) : (
          <button onClick={disconnect}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" }}>
            <X className="h-3.5 w-3.5" />Déconnecter
          </button>
        )}
      </div>

      {/* ── No hosts state ──────────────────────────────────────────────────── */}
      {hosts.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-700">
          <div className="relative">
            <div className="absolute inset-0 blur-2xl opacity-20 rounded-full"
              style={{ background: "rgba(99,102,241,0.5)", transform: "scale(2)" }} />
            <div className="relative h-20 w-20 rounded-3xl flex items-center justify-center"
              style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.15)" }}>
              <TermIcon className="h-9 w-9 text-indigo-900" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-600">Aucun hôte SSH configuré</p>
            <p className="text-xs text-gray-700 mt-1">Ajoutez un hôte ZimaOS dans les <span className="text-indigo-600">Réglages → Hôtes</span></p>
            <p className="text-xs text-gray-700 mt-0.5">puis activez les identifiants SSH.</p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px]"
            style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.12)", color: "#f87171" }}>
            <AlertCircle className="h-3 w-3" />SSH non configuré
          </div>
        </div>
      )}

      {/* ── xterm container ─────────────────────────────────────────────────── */}
      {hosts.length > 0 && (
        <div
          ref={wrapRef}
          className="flex-1 overflow-hidden cursor-text"
          style={{ background: "#050505" }}
          onClick={focusTerm}
        >
          <div ref={termElRef} className="h-full w-full" style={{ padding: "6px 4px" }} />
        </div>
      )}
    </div>
  );
}
