import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AnimatePresence } from "motion/react";
import { Eye, EyeOff, Lock, User, AlertTriangle } from "lucide-react";

import Splashscreen from "./components/Splashscreen";
import LockScreen   from "./components/LockScreen";
import Sidebar       from "./components/Sidebar";
import TopBar        from "./components/TopBar";
import StatusBar     from "./components/StatusBar";

import Dashboard  from "./pages/Dashboard";
import Domotique  from "./pages/Domotique";
import Spotify    from "./pages/Spotify";
import Discord    from "./pages/Discord";
import ZimaOS     from "./pages/ZimaOS";
import Fichiers   from "./pages/Fichiers";
import Settings   from "./pages/Settings";
import Meteo      from "./pages/Meteo";
import Reseau     from "./pages/Reseau";
import Notes      from "./pages/Notes";
import Terminal   from "./pages/Terminal";
import Gaming     from "./pages/Gaming";

import { getThemeColor, getLogoStyle, getLetterStyle, getContainerShape, getFontClass } from "./lib/theme";

// ──────────────────────────────────────────────────────────────────────────────
// Auth state helpers
// ──────────────────────────────────────────────────────────────────────────────
function useTheme() {
  const [color, setColor] = useState(getThemeColor);
  const [style, setStyle] = useState(getLogoStyle);
  useEffect(() => {
    const onC = () => setColor(getThemeColor());
    const onS = () => setStyle(getLogoStyle());
    window.addEventListener("nexus-logo-color-change", onC);
    window.addEventListener("nexus-logo-style-change", onS);
    return () => {
      window.removeEventListener("nexus-logo-color-change", onC);
      window.removeEventListener("nexus-logo-style-change", onS);
    };
  }, []);
  return { color, style };
}

// ──────────────────────────────────────────────────────────────────────────────
// Login Screen
// ──────────────────────────────────────────────────────────────────────────────
function LoginScreen({ username, password, onLogin }: {
  username: string; password: string; onLogin: () => void;
}) {
  const [inputUser, setInputUser] = useState(username);
  const [inputPwd,  setInputPwd]  = useState("");
  const [showPwd,   setShowPwd]   = useState(false);
  const [showUser,  setShowUser]  = useState(false);
  const [error,     setError]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [focusField, setFocusField] = useState<"user" | "pwd" | null>(null);
  const { color, style } = useTheme();

  const shapeClass = getContainerShape(style);
  const fontClass  = getFontClass(style);
  const letterCSS  = getLetterStyle(color, style);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Small delay for UX feel
    await new Promise(r => setTimeout(r, 350));
    if (inputUser === username && inputPwd === password) {
      onLogin();
    } else {
      setError("Identifiants incorrects");
      setInputPwd("");
      setLoading(false);
    }
  };

  const inputStyle = (focused: boolean, hasError: boolean) => ({
    background: focused ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
    border: hasError
      ? "1px solid rgba(239,68,68,0.4)"
      : focused
      ? `1px solid ${color.border}`
      : "1px solid rgba(255,255,255,0.07)",
    transition: "background 0.2s, border 0.2s",
    boxShadow: focused && !hasError ? `0 0 0 3px ${color.bg}18` : "none",
  });

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden"
      style={{ background: "#02020a" }}>

      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 70% 50% at 50% -5%, ${color.bg}22, transparent 70%)` }} />
      {/* Grid lines */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
          backgroundSize: "60px 60px"
        }} />

      {/* Logo block */}
      <div className="flex flex-col items-center mb-8 relative z-10">
        <div className="relative mb-5">
          {/* Outer glow ring */}
          <div className="absolute inset-0 rounded-2xl blur-xl opacity-40" style={{ background: color.bg, transform: "scale(1.4)" }} />
          <div className={`relative w-16 h-16 ${shapeClass} flex items-center justify-center font-bold text-2xl`} style={letterCSS}>
            <span className={fontClass}>N</span>
          </div>
        </div>
        <h1 className="text-2xl font-black tracking-[0.35em] text-white uppercase">NEXUS</h1>
        <div className="flex items-center gap-2 mt-1.5">
          <div className="h-px w-8" style={{ background: `${color.border}60` }} />
          <p className="text-[9px] text-gray-600 font-semibold tracking-[0.25em] uppercase">PANEL V2.0</p>
          <div className="h-px w-8" style={{ background: `${color.border}60` }} />
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm relative z-10 rounded-2xl shadow-[0_32px_64px_rgba(0,0,0,0.7)]"
        style={{ background: "rgba(6,6,14,0.95)", border: "1px solid rgba(255,255,255,0.07)" }}>

        {/* Card top accent */}
        <div className="h-px w-full rounded-t-2xl" style={{ background: `linear-gradient(to right, transparent, ${color.border}60, transparent)` }} />

        <div className="p-7">
          <div className="mb-6">
            <h2 className="text-base font-bold text-white">Connexion</h2>
            <p className="text-[11px] text-gray-600 mt-0.5">Panel d'accès sécurisé</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Username */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Identifiant</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 h-4 w-4 transition-colors"
                  style={{ color: focusField === "user" ? color.border : "#374151" }} />
                <input
                  type={showUser ? "text" : "password"}
                  autoComplete="off"
                  value={inputUser}
                  onChange={(e) => { setInputUser(e.target.value); setError(""); }}
                  onFocus={() => setFocusField("user")}
                  onBlur={() => setFocusField(null)}
                  placeholder="Identifiant"
                  className="w-full rounded-xl py-3 pl-11 pr-11 text-sm text-white placeholder:text-gray-700 focus:outline-none"
                  style={inputStyle(focusField === "user", !!error)}
                />
                <button type="button" onClick={() => setShowUser(!showUser)}
                  className="absolute right-3.5 top-3.5 transition-colors hover:text-gray-400"
                  style={{ color: "#374151" }}>
                  {showUser ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 transition-colors"
                  style={{ color: focusField === "pwd" ? color.border : "#374151" }} />
                <input
                  type={showPwd ? "text" : "password"}
                  value={inputPwd}
                  onChange={(e) => { setInputPwd(e.target.value); setError(""); }}
                  onFocus={() => setFocusField("pwd")}
                  onBlur={() => setFocusField(null)}
                  placeholder="••••••••"
                  className="w-full rounded-xl py-3 pl-11 pr-11 text-sm text-white placeholder:text-gray-700 focus:outline-none"
                  style={inputStyle(focusField === "pwd", !!error)}
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3.5 top-3.5 transition-colors hover:text-gray-400"
                  style={{ color: "#374151" }}>
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-red-400"
                style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {error}
              </div>
            )}

            <button type="submit" disabled={loading || !inputUser || !inputPwd}
              className="w-full py-3 rounded-xl text-sm font-bold text-white mt-1 transition-all disabled:opacity-50 relative overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${color.bg}, ${color.bg}cc)`, border: `1px solid ${color.border}50` }}>
              <span className={loading ? "opacity-0" : "opacity-100"}>Se connecter</span>
              {loading && (
                <span className="absolute inset-0 flex items-center justify-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
              )}
            </button>
          </form>
        </div>
      </div>

      <p className="text-[9px] text-gray-800 mt-5 tracking-[0.2em] uppercase relative z-10">Accès restreint — panel personnel</p>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// App Layout (authenticated shell)
// ──────────────────────────────────────────────────────────────────────────────
function AppLayout({ onLock, onLogout, username }: {
  onLock: () => void; onLogout: () => void; username: string;
}) {
  const [spotifyTrack, setSpotifyTrack] = useState<{ title: string; artist: string; playing: boolean } | null>(null);
  const [haConnected,  setHaConnected]  = useState(false);
  const [botOnline,    setBotOnline]    = useState(false);

  useEffect(() => {
    const poll = async () => {
      try {
        const [devicesRes, statsRes, haRes] = await Promise.all([
          fetch("/api/home-assistant/devices").then(r => r.json()),
          fetch("/api/system/stats").then(r => r.json()),
          fetch("/api/home-assistant/config").then(r => r.json()),
        ]);
        const mp = devicesRes?.find((d: any) => d.type === "media_player" && d.state === "playing");
        setSpotifyTrack(mp ? { title: mp.attributes?.media_title || "Inconnu", artist: mp.attributes?.media_artist || "", playing: true } : null);
        setBotOnline(statsRes?.discordBot?.status === "online");
        setHaConnected(haRes?.isConnected || false);
      } catch {}
    };
    poll();
    const id = setInterval(poll, 8000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden text-white" style={{ background: "#050505" }}>
      <Router>
        <Sidebar onLock={onLock} onLogout={onLogout} spotifyTrack={spotifyTrack} />
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          <TopBar username={username} onLock={onLock} onLogout={onLogout} haConnected={haConnected} botOnline={botOnline} />
          <main className="flex-1 overflow-y-auto custom-scrollbar">
            <Routes>
              <Route path="/"          element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/domotique" element={<Domotique />} />
              <Route path="/spotify"   element={<Spotify />} />
              <Route path="/discord"   element={<Discord />} />
              <Route path="/zimaos"    element={<ZimaOS />} />
              <Route path="/fichiers"  element={<Fichiers />} />
              <Route path="/meteo"     element={<Meteo />} />
              <Route path="/reseau"    element={<Reseau />} />
              <Route path="/notes"     element={<Notes />} />
              <Route path="/terminal"  element={<Terminal />} />
              <Route path="/gaming"    element={<Gaming />} />
              <Route path="/settings"  element={<Settings />} />
              <Route path="*"          element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
          <StatusBar />
        </div>
      </Router>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Root App
// ──────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [showSplash, setShowSplash] = useState(() => localStorage.getItem("nexus-show-boot") !== "false");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLocked,   setIsLocked]   = useState(false);

  // Persisted profile
  const [username, setUsername] = useState(() => localStorage.getItem("nexus_username") || "Mathieu");
  const [password, setPassword] = useState(() => localStorage.getItem("nexus_password") || "260209");
  const [email,    setEmail]    = useState(() => localStorage.getItem("nexus_email")    || "mathieu@nexus.local");

  // Keep profile in sync across settings page changes
  useEffect(() => {
    const onUpdate = () => {
      setUsername(localStorage.getItem("nexus_username") || "Mathieu");
      setPassword(localStorage.getItem("nexus_password") || "260209");
      setEmail(localStorage.getItem("nexus_email")       || "mathieu@nexus.local");
    };
    window.addEventListener("nexus-profile-update", onUpdate);
    return () => window.removeEventListener("nexus-profile-update", onUpdate);
  }, []);

  if (showSplash) {
    return (
      <AnimatePresence>
        <Splashscreen onComplete={() => setShowSplash(false)} />
      </AnimatePresence>
    );
  }

  if (!isLoggedIn) {
    return (
      <LoginScreen
        username={username}
        password={password}
        onLogin={() => {
          setIsLoggedIn(true);
          fetch("/api/activity", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ category: "auth", action: "Connexion", details: username }),
          }).catch(() => {});
        }}
      />
    );
  }

  return (
    <>
      <AnimatePresence>
        {isLocked && (
          <LockScreen
            username={username}
            password={password}
            onUnlock={() => setIsLocked(false)}
            onLogout={() => { setIsLoggedIn(false); setIsLocked(false); }}
          />
        )}
      </AnimatePresence>

      <AppLayout
        onLock={()   => setIsLocked(true)}
        onLogout={() => { setIsLoggedIn(false); setIsLocked(false); }}
        username={username}
      />
    </>
  );
}
