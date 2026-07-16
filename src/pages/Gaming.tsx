import React, { useState, useEffect } from "react";
import {
  Gamepad2, Trophy, Monitor, RefreshCw, Settings2, ChevronDown, ChevronUp,
  ExternalLink, Star, Clock, User, Check, Eye, EyeOff, Save, Zap,
} from "lucide-react";
import axios from "axios";

interface GamingConfig {
  xboxGamertag: string; psnId: string;
  steamId: string; steamApiKey: string; epicUsername: string;
}
interface SteamPlayer {
  personaname: string; avatarfull: string; personastate: number;
  gameextrainfo?: string; gameid?: string; profileurl: string;
}
interface SteamGame {
  name: string; playtime_2weeks: number; playtime_forever: number;
  img_icon_url: string; appid: number;
}

const STEAM_STATES = ["Hors ligne", "En ligne", "Occupé", "Absent", "Mode veille", "À la recherche", "En jeu", "Invisible"];

function stateDot(state: number) {
  if (state === 0) return "bg-gray-600";
  if (state === 1) return "bg-emerald-400";
  if (state >= 2 && state <= 5) return "bg-amber-400";
  return "bg-blue-400";
}

function fmtHours(mins: number) {
  if (mins < 60) return `${mins}min`;
  return `${(mins / 60).toFixed(0)}h`;
}

function Card({ children, className = "", gradient = "" }: { children: React.ReactNode; className?: string; gradient?: string }) {
  return (
    <div className={`rounded-2xl p-5 ${className}`}
      style={{ background: gradient || "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
      {children}
    </div>
  );
}

export default function Gaming() {
  const [cfg,        setCfg]        = useState<GamingConfig>({ xboxGamertag: "", psnId: "", steamId: "", steamApiKey: "", epicUsername: "" });
  const [steamData,  setSteamData]  = useState<{ configured: boolean; player?: SteamPlayer; recentGames?: SteamGame[]; error?: string } | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [steamLoading, setSteamLoading] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [form,       setForm]       = useState<GamingConfig>({ xboxGamertag: "", psnId: "", steamId: "", steamApiKey: "", epicUsername: "" });
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [showKey,    setShowKey]    = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const cfgRes = await axios.get("/api/gaming/config");
      setCfg(cfgRes.data);
      setForm(cfgRes.data);
    } catch {}
    setLoading(false);
  };

  const loadSteam = async () => {
    setSteamLoading(true);
    try {
      const r = await axios.get("/api/gaming/steam");
      setSteamData(r.data);
    } catch {
      setSteamData({ configured: false });
    }
    setSteamLoading(false);
  };

  useEffect(() => { loadAll(); }, []);
  useEffect(() => {
    if (cfg.steamId && cfg.steamApiKey) loadSteam();
    else setSteamData({ configured: false });
  }, [cfg.steamId, cfg.steamApiKey]);

  const save = async () => {
    setSaving(true);
    try {
      await axios.put("/api/gaming/config", form);
      setCfg(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {}
    setSaving(false);
  };

  const inp = (field: keyof GamingConfig) => ({
    value: form[field],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [field]: e.target.value })),
  });

  // ── Xbox presence state simulation (no live API without key)
  const xboxConfigured = !!cfg.xboxGamertag;
  const psnConfigured  = !!cfg.psnId;

  return (
    <div className="p-5 space-y-5 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white tracking-wide flex items-center gap-2.5">
            <Gamepad2 className="h-5 w-5 text-indigo-400" />
            Gaming Hub
          </h1>
          <p className="text-xs text-gray-600 mt-0.5">Xbox Live · PlayStation Network · Steam</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { loadSteam(); }}
            className="p-2 rounded-xl text-gray-600 hover:text-gray-400 hover:bg-white/5 transition-all">
            <RefreshCw className={`h-4 w-4 ${steamLoading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => setConfigOpen(!configOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-500 hover:text-white transition-all"
            style={{ background: configOpen ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <Settings2 className="h-3.5 w-3.5" />
            Comptes
            {configOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>
      </div>

      {/* Platform Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Xbox Live */}
        <Card>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center font-black text-sm"
              style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.25)", color: "#10b981" }}>
              X
            </div>
            <div>
              <div className="text-sm font-bold text-white">Xbox Live</div>
              <div className="text-[9px] text-gray-600 uppercase tracking-widest">Microsoft Gaming</div>
            </div>
            {xboxConfigured && (
              <div className="ml-auto flex items-center gap-1 text-[9px] text-emerald-400 font-semibold">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Configuré
              </div>
            )}
          </div>

          {xboxConfigured ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.12)" }}>
                <div className="h-10 w-10 rounded-xl flex items-center justify-center text-base font-black"
                  style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}>
                  {cfg.xboxGamertag.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{cfg.xboxGamertag}</p>
                  <p className="text-[9px] text-gray-500 mt-0.5">Profil Xbox</p>
                </div>
                <a href={`https://www.xbox.com/fr-FR/play/user/${encodeURIComponent(cfg.xboxGamertag)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="ml-auto p-1.5 rounded-lg hover:bg-white/5 text-gray-600 hover:text-gray-300 transition-all">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Profil", val: "Xbox Live", icon: User },
                  { label: "Store", val: "Xbox.com", icon: Star },
                ].map(({ label, val, icon: Icon }) => (
                  <div key={label} className="p-2.5 rounded-xl text-center"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <Icon className="h-3.5 w-3.5 text-gray-600 mx-auto mb-1" />
                    <div className="text-[9px] font-bold text-white">{val}</div>
                    <div className="text-[8px] text-gray-700">{label}</div>
                  </div>
                ))}
              </div>
              <p className="text-[9px] text-gray-700 text-center">
                API Xbox Live non disponible sans clé Azure.<br />
                <a href={`https://www.xbox.com/fr-FR/play/user/${encodeURIComponent(cfg.xboxGamertag)}`}
                  target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:underline">
                  Voir le profil complet →
                </a>
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <div className="h-12 w-12 rounded-2xl flex items-center justify-center text-xl font-black opacity-20"
                style={{ background: "rgba(16,185,129,0.1)", color: "#10b981" }}>X</div>
              <div className="text-center">
                <p className="text-xs text-gray-600 font-semibold">Gamertag non configuré</p>
                <p className="text-[10px] text-gray-700 mt-0.5">Ajoutez votre gamertag ci-dessous</p>
              </div>
              <button onClick={() => setConfigOpen(true)}
                className="text-[10px] text-emerald-500 hover:underline">Configurer →</button>
            </div>
          )}
        </Card>

        {/* PlayStation Network */}
        <Card>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center font-black text-sm"
              style={{ background: "rgba(0,70,255,0.15)", border: "1px solid rgba(0,70,255,0.25)", color: "#3b82f6" }}>
              PS
            </div>
            <div>
              <div className="text-sm font-bold text-white">PlayStation</div>
              <div className="text-[9px] text-gray-600 uppercase tracking-widest">PlayStation Network</div>
            </div>
            {psnConfigured && (
              <div className="ml-auto flex items-center gap-1 text-[9px] text-blue-400 font-semibold">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                Configuré
              </div>
            )}
          </div>

          {psnConfigured ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.12)" }}>
                <div className="h-10 w-10 rounded-xl flex items-center justify-center text-xs font-black"
                  style={{ background: "rgba(59,130,246,0.15)", color: "#3b82f6" }}>
                  {cfg.psnId.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{cfg.psnId}</p>
                  <p className="text-[9px] text-gray-500 mt-0.5">PSN ID</p>
                </div>
                <a href={`https://psnprofiles.com/${encodeURIComponent(cfg.psnId)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="ml-auto p-1.5 rounded-lg hover:bg-white/5 text-gray-600 hover:text-gray-300 transition-all">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Profil PSN", val: cfg.psnId, icon: User },
                  { label: "Trophées", val: "PSNProfiles", icon: Trophy },
                ].map(({ label, val, icon: Icon }) => (
                  <div key={label} className="p-2.5 rounded-xl text-center"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <Icon className="h-3.5 w-3.5 text-gray-600 mx-auto mb-1" />
                    <div className="text-[9px] font-bold text-white truncate">{val}</div>
                    <div className="text-[8px] text-gray-700">{label}</div>
                  </div>
                ))}
              </div>
              <p className="text-[9px] text-gray-700 text-center">
                <a href={`https://psnprofiles.com/${encodeURIComponent(cfg.psnId)}`}
                  target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                  Voir les trophées sur PSNProfiles →
                </a>
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Trophy className="h-10 w-10 text-blue-900 opacity-30" />
              <div className="text-center">
                <p className="text-xs text-gray-600 font-semibold">PSN ID non configuré</p>
                <p className="text-[10px] text-gray-700 mt-0.5">Ajoutez votre identifiant PSN</p>
              </div>
              <button onClick={() => setConfigOpen(true)}
                className="text-[10px] text-blue-400 hover:underline">Configurer →</button>
            </div>
          )}
        </Card>

        {/* Steam */}
        <Card>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center font-black text-sm"
              style={{ background: "rgba(23,167,175,0.15)", border: "1px solid rgba(23,167,175,0.25)", color: "#17a7af" }}>
              S
            </div>
            <div>
              <div className="text-sm font-bold text-white">Steam</div>
              <div className="text-[9px] text-gray-600 uppercase tracking-widest">Valve Corporation</div>
            </div>
            {steamData?.configured && steamData?.player && (
              <div className="ml-auto flex items-center gap-1 text-[9px] font-semibold"
                style={{ color: steamData.player.personastate === 1 ? "#22c55e" : "#6b7280" }}>
                <div className={`h-1.5 w-1.5 rounded-full ${stateDot(steamData.player.personastate)}`} />
                {STEAM_STATES[steamData.player.personastate] ?? "En ligne"}
              </div>
            )}
          </div>

          {steamData?.configured ? (
            steamLoading ? (
              <div className="flex items-center justify-center py-10">
                <RefreshCw className="h-5 w-5 text-gray-600 animate-spin" />
              </div>
            ) : steamData.error ? (
              <div className="text-xs text-red-400 text-center py-6 px-2">
                Erreur API Steam : {steamData.error}
              </div>
            ) : steamData.player ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: "rgba(23,167,175,0.05)", border: "1px solid rgba(23,167,175,0.12)" }}>
                  <img src={steamData.player.avatarfull} alt="avatar"
                    className="h-10 w-10 rounded-xl object-cover" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{steamData.player.personaname}</p>
                    {steamData.player.gameextrainfo ? (
                      <p className="text-[9px] text-teal-400 mt-0.5 flex items-center gap-1">
                        <Zap className="h-2.5 w-2.5" />{steamData.player.gameextrainfo}
                      </p>
                    ) : (
                      <p className="text-[9px] text-gray-500 mt-0.5">
                        {STEAM_STATES[steamData.player.personastate] ?? "En ligne"}
                      </p>
                    )}
                  </div>
                  <a href={steamData.player.profileurl} target="_blank" rel="noopener noreferrer"
                    className="ml-auto p-1.5 rounded-lg hover:bg-white/5 text-gray-600 hover:text-gray-300 transition-all">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>

                {steamData.recentGames && steamData.recentGames.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[9px] text-gray-700 uppercase tracking-widest flex items-center gap-1.5">
                      <Clock className="h-2.5 w-2.5" /> Jeux récents
                    </div>
                    {steamData.recentGames.map((g) => (
                      <div key={g.appid} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg"
                        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                        <img
                          src={`https://media.steampowered.com/steamcommunity/public/images/apps/${g.appid}/${g.img_icon_url}.jpg`}
                          alt={g.name}
                          className="h-5 w-5 rounded shrink-0"
                          onError={(e) => { (e.target as any).style.display = "none"; }}
                        />
                        <span className="text-[10px] text-white flex-1 truncate">{g.name}</span>
                        <span className="text-[9px] text-gray-600 font-mono shrink-0">{fmtHours(g.playtime_2weeks)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-gray-600 text-center py-6">Aucune donnée Steam disponible</div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Monitor className="h-10 w-10 text-teal-900 opacity-30" />
              <div className="text-center">
                <p className="text-xs text-gray-600 font-semibold">Steam non configuré</p>
                <p className="text-[10px] text-gray-700 mt-0.5">Ajoutez votre Steam ID 64 + clé API</p>
              </div>
              <button onClick={() => setConfigOpen(true)}
                className="text-[10px] text-teal-400 hover:underline">Configurer →</button>
            </div>
          )}
        </Card>
      </div>

      {/* Config Panel */}
      {configOpen && (
        <Card>
          <div className="flex items-center gap-2 mb-5">
            <Settings2 className="h-4 w-4 text-indigo-400" />
            <h2 className="text-sm font-bold text-white">Configuration des comptes</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            {/* Xbox */}
            <div className="space-y-1.5">
              <label className="text-[9px] text-gray-500 font-bold uppercase tracking-widest block flex items-center gap-1">
                <span className="h-4 w-4 rounded bg-emerald-500/20 inline-flex items-center justify-center text-[8px] font-black text-emerald-400">X</span>
                Xbox Gamertag
              </label>
              <input type="text" placeholder="MonGamertag" {...inp("xboxGamertag")}
                className="w-full rounded-xl py-2.5 px-3 text-sm text-white placeholder:text-gray-700 focus:outline-none"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
            </div>

            {/* PSN */}
            <div className="space-y-1.5">
              <label className="text-[9px] text-gray-500 font-bold uppercase tracking-widest block flex items-center gap-1">
                <span className="h-4 w-4 rounded bg-blue-500/20 inline-flex items-center justify-center text-[8px] font-black text-blue-400">PS</span>
                PSN ID
              </label>
              <input type="text" placeholder="MonPSNID" {...inp("psnId")}
                className="w-full rounded-xl py-2.5 px-3 text-sm text-white placeholder:text-gray-700 focus:outline-none"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
            </div>

            {/* Epic */}
            <div className="space-y-1.5">
              <label className="text-[9px] text-gray-500 font-bold uppercase tracking-widest block">Epic Games</label>
              <input type="text" placeholder="Nom d'utilisateur Epic" {...inp("epicUsername")}
                className="w-full rounded-xl py-2.5 px-3 text-sm text-white placeholder:text-gray-700 focus:outline-none"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
            </div>

            {/* Steam ID */}
            <div className="space-y-1.5">
              <label className="text-[9px] text-gray-500 font-bold uppercase tracking-widest block">Steam ID 64</label>
              <input type="text" placeholder="76561198xxxxxxxxx" {...inp("steamId")}
                className="w-full rounded-xl py-2.5 px-3 text-sm text-white placeholder:text-gray-700 focus:outline-none"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
              <p className="text-[9px] text-gray-700">
                <a href="https://steamid.io" target="_blank" rel="noopener noreferrer" className="text-teal-500 hover:underline">
                  Trouver mon Steam ID 64 →
                </a>
              </p>
            </div>

            {/* Steam API Key */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[9px] text-gray-500 font-bold uppercase tracking-widest block">
                Clé API Steam (gratuite)
                <a href="https://steamcommunity.com/dev/apikey" target="_blank" rel="noopener noreferrer"
                  className="text-teal-500 hover:underline ml-1 normal-case tracking-normal font-normal">
                  Obtenir une clé →
                </a>
              </label>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  placeholder="XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                  {...inp("steamApiKey")}
                  className="w-full rounded-xl py-2.5 px-3 pr-11 text-sm text-white placeholder:text-gray-700 focus:outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                />
                <button type="button" onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-2.5 text-gray-600 hover:text-gray-400">
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50"
            style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.3)" }}>
            {saved ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Save className="h-3.5 w-3.5" />}
            {saved ? "Enregistré !" : saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </Card>
      )}
    </div>
  );
}
