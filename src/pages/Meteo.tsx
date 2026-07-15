import React, { useState, useEffect, useRef } from "react";
import { Cloud, RefreshCw, Search, MapPin, Wind, Droplets, Thermometer, Eye } from "lucide-react";
import axios from "axios";

// ── WMO weather codes → FR ────────────────────────────────────────────────────
function wx(code: number): { emoji: string; label: string } {
  if (code === 0)                     return { emoji: "☀️",  label: "Ciel dégagé" };
  if (code === 1)                     return { emoji: "🌤️",  label: "Peu nuageux" };
  if (code === 2)                     return { emoji: "⛅",  label: "Partiellement nuageux" };
  if (code === 3)                     return { emoji: "☁️",  label: "Couvert" };
  if (code === 45 || code === 48)     return { emoji: "🌫️",  label: "Brouillard" };
  if (code >= 51 && code <= 55)       return { emoji: "🌦️",  label: "Bruine" };
  if (code >= 56 && code <= 57)       return { emoji: "🌧️",  label: "Bruine verglaçante" };
  if (code >= 61 && code <= 63)       return { emoji: "🌧️",  label: "Pluie" };
  if (code === 65)                    return { emoji: "🌧️",  label: "Pluie forte" };
  if (code >= 66 && code <= 67)       return { emoji: "🌧️",  label: "Pluie verglaçante" };
  if (code >= 71 && code <= 73)       return { emoji: "❄️",  label: "Neige" };
  if (code === 75)                    return { emoji: "❄️",  label: "Neige forte" };
  if (code === 77)                    return { emoji: "🌨️",  label: "Grésil" };
  if (code >= 80 && code <= 81)       return { emoji: "🌦️",  label: "Averses" };
  if (code === 82)                    return { emoji: "🌦️",  label: "Averses violentes" };
  if (code >= 85 && code <= 86)       return { emoji: "🌨️",  label: "Averses de neige" };
  if (code === 95)                    return { emoji: "⛈️",  label: "Orage" };
  if (code >= 96 && code <= 99)       return { emoji: "⛈️",  label: "Orage avec grêle" };
  return { emoji: "🌡️", label: "Inconnu" };
}

function dayFR(dateStr: string): string {
  const days = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  const d = new Date(dateStr + "T12:00:00");
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Aujourd'hui";
  const tom = new Date(today); tom.setDate(today.getDate() + 1);
  if (d.toDateString() === tom.toDateString()) return "Demain";
  return days[d.getDay()];
}

interface WeatherData {
  city: string;
  current: {
    temp: number; feelsLike: number; humidity: number;
    windSpeed: number; code: number; precip: number;
  };
  hourly: { time: string; temp: number; code: number }[];
  daily: { date: string; code: number; max: number; min: number; precip: number }[];
}

export default function Meteo() {
  const [data,     setData]     = useState<WeatherData | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [search,   setSearch]   = useState("");
  const [results,  setResults]  = useState<{ name: string; country: string; lat: number; lng: number; tz: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [showRes,  setShowRes]  = useState(false);
  const searchRef = useRef<NodeJS.Timeout | null>(null);
  const hourRef   = useRef<HTMLDivElement>(null);

  const fetchWeather = async () => {
    setLoading(true); setError("");
    try {
      const { data: d } = await axios.get("/api/meteo");
      setData(d);
    } catch (e: any) {
      setError(e.response?.data?.error || "Impossible de charger la météo.");
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchWeather(); }, []);

  // Scroll hourly to current hour
  useEffect(() => {
    if (data && hourRef.current) {
      const currentHour = new Date().getHours();
      const idx = data.hourly.findIndex(h => new Date(h.time).getHours() === currentHour);
      if (idx > 0) hourRef.current.scrollLeft = idx * 72;
    }
  }, [data]);

  const handleSearch = (val: string) => {
    setSearch(val);
    if (searchRef.current) clearTimeout(searchRef.current);
    if (!val.trim()) { setResults([]); setShowRes(false); return; }
    searchRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data: res } = await axios.get(`/api/meteo/search?q=${encodeURIComponent(val)}`);
        setResults(res.results || []);
        setShowRes(true);
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 400);
  };

  const selectCity = async (r: typeof results[0]) => {
    setShowRes(false); setSearch(""); setLoading(true);
    try {
      await axios.post("/api/meteo/config", { latitude: r.lat, longitude: r.lng, city: r.name, timezone: r.tz });
      await fetchWeather();
    } catch { setLoading(false); }
  };

  const cur = data?.current;
  const weather = cur ? wx(cur.code) : null;

  return (
    <div className="p-5 space-y-5 max-w-4xl mx-auto">

      {/* Header + Search */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-white tracking-wide">Météo</h1>
          <p className="text-xs text-gray-600 mt-0.5 flex items-center gap-1">
            <MapPin className="h-3 w-3" />{data?.city || "Chargement…"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <Search className="h-3.5 w-3.5 text-gray-500" />
              <input
                value={search}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Changer de ville…"
                className="bg-transparent text-xs text-white placeholder:text-gray-600 focus:outline-none w-36"
              />
              {searching && <RefreshCw className="h-3 w-3 text-gray-600 animate-spin" />}
            </div>
            {showRes && results.length > 0 && (
              <div className="absolute top-full mt-1 left-0 right-0 z-50 rounded-xl overflow-hidden shadow-2xl"
                style={{ background: "rgba(8,8,18,0.98)", border: "1px solid rgba(255,255,255,0.1)" }}>
                {results.map((r, i) => (
                  <button key={i} onClick={() => selectCity(r)}
                    className="w-full px-3 py-2.5 text-left text-xs hover:bg-white/5 transition-colors flex items-center justify-between gap-2">
                    <span className="text-white font-semibold">{r.name}</span>
                    <span className="text-gray-500 text-[10px]">{r.country}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={fetchWeather} className="p-2 text-gray-600 hover:text-gray-400 transition-colors">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-24 gap-3 text-gray-600">
          <RefreshCw className="h-5 w-5 animate-spin" />Chargement de la météo…
        </div>
      )}

      {error && !loading && (
        <div className="rounded-2xl p-5 text-center text-sm text-red-400"
          style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
          {error}
        </div>
      )}

      {data && !loading && (
        <>
          {/* Current conditions */}
          <div className="rounded-2xl p-6 relative overflow-hidden"
            style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)" }}>
            <div className="absolute top-0 right-0 w-48 h-48 pointer-events-none"
              style={{ background: "radial-gradient(ellipse at top right, rgba(99,102,241,0.08), transparent 70%)" }} />
            <div className="flex items-start justify-between gap-4 relative z-10">
              <div>
                <div className="text-7xl leading-none font-black text-white">{Math.round(cur!.temp)}°</div>
                <div className="text-lg font-semibold text-indigo-300 mt-1">{weather!.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">Ressenti {Math.round(cur!.feelsLike)}°C</div>
              </div>
              <div className="text-7xl">{weather!.emoji}</div>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t relative z-10"
              style={{ borderColor: "rgba(99,102,241,0.15)" }}>
              {[
                { icon: Droplets,    label: "Humidité",    val: `${cur!.humidity}%` },
                { icon: Wind,        label: "Vent",        val: `${Math.round(cur!.windSpeed)} km/h` },
                { icon: Thermometer, label: "Précipitations", val: `${cur!.precip} mm` },
              ].map(({ icon: Icon, label, val }) => (
                <div key={label} className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-indigo-400 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-white">{val}</div>
                    <div className="text-[9px] text-gray-600 uppercase tracking-wider">{label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Hourly forecast */}
          <div className="rounded-2xl overflow-hidden"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="px-4 py-3 flex items-center gap-2"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <Cloud className="h-4 w-4 text-indigo-400" />
              <span className="text-xs font-bold text-white">Prévisions heure par heure</span>
            </div>
            <div ref={hourRef} className="flex gap-1 overflow-x-auto custom-scrollbar px-3 py-3"
              style={{ scrollbarWidth: "thin" }}>
              {data.hourly.map((h, i) => {
                const hDate = new Date(h.time);
                const isNow = Math.abs(hDate.getTime() - Date.now()) < 1800000;
                return (
                  <div key={i} className="flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl shrink-0 w-[68px] transition-all"
                    style={{
                      background: isNow ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.02)",
                      border: isNow ? "1px solid rgba(99,102,241,0.25)" : "1px solid rgba(255,255,255,0.04)",
                    }}>
                    <span className="text-[9px] text-gray-500 font-mono">
                      {hDate.getHours().toString().padStart(2, "0")}h
                    </span>
                    <span className="text-base">{wx(h.code).emoji}</span>
                    <span className={`text-xs font-bold ${isNow ? "text-indigo-300" : "text-white"}`}>
                      {Math.round(h.temp)}°
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 7-day forecast */}
          <div className="rounded-2xl overflow-hidden"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="px-4 py-3 flex items-center gap-2"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <Eye className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-bold text-white">Prévisions 7 jours</span>
            </div>
            <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
              {data.daily.map((d, i) => {
                const w = wx(d.code);
                return (
                  <div key={i} className="flex items-center gap-4 px-4 py-3 hover:bg-white/[0.015] transition-colors">
                    <span className="text-xs font-bold text-gray-400 w-20 shrink-0">{dayFR(d.date)}</span>
                    <span className="text-xl shrink-0">{w.emoji}</span>
                    <span className="text-xs text-gray-500 flex-1">{w.label}</span>
                    {d.precip > 0 && (
                      <span className="text-[10px] text-cyan-400 flex items-center gap-1 shrink-0">
                        <Droplets className="h-3 w-3" />{d.precip}mm
                      </span>
                    )}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-bold text-white">{Math.round(d.max)}°</span>
                      <span className="text-xs text-gray-600">{Math.round(d.min)}°</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
