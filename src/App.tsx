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
import AI         from "./pages/AI";
import Settings   from "./pages/Settings";

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
  const [error,     setError]     = useState("");
  const { color, style } = useTheme();

  const shapeClass = getContainerShape(style);
  const fontClass  = getFontClass(style);
  const letterCSS  = getLetterStyle(color, style);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputUser === username && inputPwd === password) { onLogin(); }
    else { setError("Identifiants incorrects"); setInputPwd(""); }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 font-sans"
      style={{ background: "#02020a", backgroundImage: `radial-gradient(ellipse 80% 60% at 50% -10%, ${color.bg}, transparent)` }}>

      {/* Logo block */}
      <div className="flex flex-col items-center mb-8">
        <div className={`w-16 h-16 ${shapeClass} flex items-center justify-center font-bold text-2xl shadow-lg mb-4`} style={letterCSS}>
          <span className={fontClass}>N</span>
        </div>
        <h1 className="text-2xl font-black tracking-[0.3em] text-white uppercase">NEXUS</h1>
        <p className="text-[10px] text-gray-600 font-semibold tracking-widest uppercase mt-1">PANEL V2.0</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-md rounded-2xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
        style={{ background: "rgba(7,7,15,0.9)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <h2 className="text-lg font-bold text-white mb-1">Connexion</h2>
        <p className="text-xs text-gray-600 mb-6">Entrez vos identifiants pour accéder au panel.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500">Identifiant</label>
            <div className="relative">
              <User className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-700" />
              <input
                type="text"
                value={inputUser}
                onChange={(e) => { setInputUser(e.target.value); setError(""); }}
                placeholder="Mathieu"
                className="w-full rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder:text-gray-700 focus:outline-none transition-colors"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500">Mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-700" />
              <input
                type={showPwd ? "text" : "password"}
                value={inputPwd}
                onChange={(e) => { setInputPwd(e.target.value); setError(""); }}
                placeholder="••••••••"
                className="w-full rounded-xl py-3 pl-11 pr-11 text-sm text-white placeholder:text-gray-700 focus:outline-none transition-colors"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              />
              <button type="button" onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3.5 top-3.5 text-gray-700 hover:text-gray-400 transition-colors">
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-xs">
              <AlertTriangle className="h-3.5 w-3.5" /> {error}
            </div>
          )}

          <button type="submit"
            className="w-full py-3 rounded-xl text-sm font-bold text-white mt-2 transition-all hover:opacity-90"
            style={{ background: color.bg, border: `1px solid ${color.border}` }}>
            Se connecter
          </button>
        </form>
      </div>

      <p className="text-[10px] text-gray-700 mt-6 tracking-wide">Accès restreint — panel personnel</p>
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
              <Route path="/ai"        element={<AI />} />
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
        onLogin={() => setIsLoggedIn(true)}
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
