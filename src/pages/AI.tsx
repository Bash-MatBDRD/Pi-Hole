import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles, Send, Copy, Check, AlertTriangle, RefreshCw,
  Zap, Code, ChevronDown, ChevronUp, Bot,
} from "lucide-react";
import axios from "axios";

interface Message {
  id: number;
  type: "user" | "ai" | "error";
  text: string;
  actionPerformed?: string;
  friendlyResponse?: string;
  haServiceCalls?: { domain: string; service: string; entity_id: string; data: string }[];
  discordCodeSnippet?: string;
  simulated?: boolean;
}

let idCounter = 0;

export default function AI() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: idCounter++,
      type: "ai",
      text: "",
      friendlyResponse: "👋 Bonjour ! Je suis votre co-pilote IA. Décrivez ce que vous voulez faire avec vos appareils en langage naturel et je m'occupe du reste.",
    },
  ]);
  const [input,    setInput]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [copied,   setCopied]   = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: Message = { id: idCounter++, type: "user", text: input };
    setMessages(prev => [...prev, userMsg]);
    const query = input;
    setInput("");
    setLoading(true);

    try {
      const res = await axios.post("/api/ai/command", { prompt: query });
      const data = res.data;

      const aiMsg: Message = {
        id: idCounter++,
        type: "ai",
        text: "",
        actionPerformed:   data.actionPerformed,
        friendlyResponse:  data.friendlyResponse,
        haServiceCalls:    data.haServiceCalls,
        discordCodeSnippet: data.discordCodeSnippet,
        simulated:         data.simulated,
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id: idCounter++, type: "error",
        text: err.response?.data?.error || "Erreur lors de l'appel IA",
      }]);
    } finally { setLoading(false); }
  };

  const copyCode = async (code: string, id: number) => {
    await navigator.clipboard.writeText(code);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const SUGGESTIONS = [
    "Éteins toutes les lumières du salon",
    "Ferme les volets et monte la température à 22°C",
    "Allume la LED du salon à 50% avec couleur chaude",
    "Mets en pause la musique",
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-88px)] max-w-4xl mx-auto">
      {/* Header */}
      <div className="p-5 pb-3 shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-5 w-5 text-indigo-400" />
          <h1 className="text-xl font-black text-white tracking-wide">Copilote IA</h1>
        </div>
        <p className="text-xs text-gray-600">Contrôlez vos appareils en langage naturel via Gemini</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-5 space-y-4 pb-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}>
            {msg.type === "user" ? (
              <div className="max-w-[80%] px-4 py-3 rounded-2xl text-sm text-white"
                style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.3)" }}>
                {msg.text}
              </div>
            ) : msg.type === "error" ? (
              <div className="max-w-[80%] flex items-start gap-2 px-4 py-3 rounded-2xl text-sm"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <span className="text-red-400">{msg.text}</span>
              </div>
            ) : (
              <div className="max-w-[90%] w-full space-y-3">
                {/* AI avatar + response */}
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="h-4 w-4 text-indigo-400" />
                  </div>
                  <div className="rounded-2xl px-4 py-3 flex-1"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <p className="text-sm text-gray-200 leading-relaxed">{msg.friendlyResponse}</p>
                    {msg.simulated && (
                      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-amber-500/70">
                        <AlertTriangle className="h-3 w-3" />
                        Mode démo — configurez GEMINI_API_KEY pour activer l'IA réelle
                      </div>
                    )}
                  </div>
                </div>

                {/* Action summary */}
                {msg.actionPerformed && (
                  <div className="ml-11 px-4 py-2 rounded-xl text-[11px] text-indigo-300"
                    style={{ background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.12)" }}>
                    <span className="text-gray-600 mr-1">→</span> {msg.actionPerformed}
                  </div>
                )}

                {/* HA Service calls */}
                {msg.haServiceCalls && msg.haServiceCalls.length > 0 && (
                  <div className="ml-11 rounded-xl overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <button
                      onClick={() => setExpanded(expanded === msg.id ? null : msg.id)}
                      className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-semibold text-gray-500 hover:text-gray-300 transition-colors">
                      <span className="flex items-center gap-1.5">
                        <Zap className="h-3 w-3 text-emerald-500" />
                        {msg.haServiceCalls.length} commande{msg.haServiceCalls.length > 1 ? "s" : ""} HA exécutée{msg.haServiceCalls.length > 1 ? "s" : ""}
                      </span>
                      {expanded === msg.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                    {expanded === msg.id && (
                      <div className="px-3 pb-3 space-y-1.5">
                        {msg.haServiceCalls.map((call, i) => (
                          <div key={i} className="flex items-center gap-2 text-[10px] font-mono px-2 py-1.5 rounded-lg"
                            style={{ background: "rgba(255,255,255,0.03)" }}>
                            <span className="text-emerald-400">{call.domain}.{call.service}</span>
                            <span className="text-gray-600">→</span>
                            <span className="text-gray-400 truncate">{call.entity_id}</span>
                            {call.data && call.data !== "" && (
                              <span className="text-amber-400/70 ml-auto shrink-0">{call.data}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Discord code snippet */}
                {msg.discordCodeSnippet && (
                  <div className="ml-11 rounded-xl overflow-hidden"
                    style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="flex items-center justify-between px-3 py-2"
                      style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                        <Code className="h-3 w-3 text-indigo-400" />
                        Commande Discord générée
                      </div>
                      <button
                        onClick={() => copyCode(msg.discordCodeSnippet!, msg.id)}
                        className="flex items-center gap-1 text-[9px] text-gray-600 hover:text-gray-300 transition-colors">
                        {copied === msg.id ? <><Check className="h-3 w-3 text-emerald-400" />Copié</> : <><Copy className="h-3 w-3" />Copier</>}
                      </button>
                    </div>
                    <pre className="text-[10px] text-emerald-300 p-3 overflow-x-auto font-mono leading-relaxed max-h-48 custom-scrollbar"
                      style={{ background: "rgba(2,2,10,0.6)" }}>
                      {msg.discordCodeSnippet}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Bot className="h-4 w-4 text-indigo-400 animate-pulse" />
            </div>
            <div className="px-4 py-3 rounded-2xl flex items-center gap-2"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <RefreshCw className="h-3.5 w-3.5 text-indigo-400 animate-spin" />
              <span className="text-xs text-gray-500">Analyse en cours...</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 2 && !loading && (
        <div className="px-5 pb-3 flex gap-2 flex-wrap shrink-0">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => setInput(s)}
              className="text-[10px] px-3 py-1.5 rounded-lg text-gray-500 hover:text-gray-200 transition-all"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-5 pb-5 shrink-0">
        <form onSubmit={sendCommand}
          className="flex items-center gap-3 px-4 py-3 rounded-2xl"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)" }}>
          <Sparkles className="h-4 w-4 text-indigo-400 shrink-0" />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ex: Éteins les lumières du salon et ferme les volets..."
            disabled={loading}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-gray-700 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="h-8 w-8 rounded-xl flex items-center justify-center transition-all hover:scale-105 disabled:opacity-30"
            style={{ background: "rgba(99,102,241,0.25)", border: "1px solid rgba(99,102,241,0.35)" }}>
            <Send className="h-3.5 w-3.5 text-indigo-300" />
          </button>
        </form>
      </div>
    </div>
  );
}
