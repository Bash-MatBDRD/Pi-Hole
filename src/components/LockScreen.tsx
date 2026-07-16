import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Lock, Eye, EyeOff, LogOut, Music2 } from "lucide-react";
import { getThemeColor, getLogoStyle, getLetterStyle, getContainerShape, getFontClass } from "../lib/theme";

interface SpotifyTrack { title: string; artist: string; playing: boolean; img?: string; entityId?: string }

interface Props {
  username: string;
  password: string;
  onUnlock: () => void;
  onLogout: () => void;
  spotifyTrack?: SpotifyTrack | null;
}

export default function LockScreen({ username, password, onUnlock, onLogout, spotifyTrack }: Props) {
  const [input, setInput]     = useState("");
  const [error, setError]     = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [shake, setShake]     = useState(false);
  const [time, setTime]       = useState(new Date());

  const color = getThemeColor();
  const style = getLogoStyle();

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input === password) { setInput(""); onUnlock(); }
    else {
      setError("Mot de passe incorrect"); setInput("");
      setShake(true); setTimeout(() => setShake(false), 500);
    }
  };

  const hours   = time.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const dateStr = time.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none"
      style={{
        background: "#02020a",
        backgroundImage: `radial-gradient(ellipse 80% 60% at 50% -10%, ${color.bg}, transparent)`,
      }}
    >
      {/* Time */}
      <div className="text-center mb-10">
        <div className="text-6xl font-thin text-white tracking-tight font-mono">{hours}</div>
        <div className="text-sm text-gray-500 mt-2 capitalize">{dateStr}</div>
      </div>

      {/* Avatar + form */}
      <motion.div
        animate={shake ? { x: [-8, 8, -6, 6, 0] } : { x: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center w-full max-w-xs"
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-3 shadow-lg"
          style={{ background: color.hex, boxShadow: `0 0 20px ${color.glow}` }}
        >
          {username.charAt(0).toUpperCase()}
        </div>
        <p className="text-base font-semibold text-white mb-0.5">{username}</p>
        <p className="text-xs text-gray-600 mb-6">Panel Personnel</p>

        <form onSubmit={handleSubmit} className="w-full space-y-3">
          <div className="relative">
            <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-600" />
            <input
              type={showPwd ? "text" : "password"}
              value={input}
              onChange={(e) => { setInput(e.target.value); setError(""); }}
              placeholder="Mot de passe"
              autoFocus
              className="w-full bg-white/4 border border-white/10 rounded-xl py-3 pl-11 pr-11 text-sm text-white placeholder:text-gray-600 text-center focus:outline-none focus:border-white/20 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              className="absolute right-3.5 top-3.5 text-gray-600 hover:text-gray-400 transition-colors"
            >
              {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {error && <p className="text-red-400 text-xs text-center">{error}</p>}

          <button
            type="submit"
            className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ background: color.bg, border: `1px solid ${color.border}` }}
          >
            Déverrouiller
          </button>
        </form>

        <button
          onClick={onLogout}
          className="mt-6 text-xs text-gray-600 hover:text-gray-400 flex items-center gap-1.5 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" /> Se déconnecter
        </button>
      </motion.div>

      {/* Spotify mini-player at the bottom */}
      <AnimatePresence>
        {spotifyTrack && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-3 rounded-2xl"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              backdropFilter: "blur(20px)",
              minWidth: 260, maxWidth: 360,
            }}
          >
            {spotifyTrack.img ? (
              <img src={spotifyTrack.img} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: color.bg }}>
                <Music2 className="h-4 w-4 text-white" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">{spotifyTrack.title}</p>
              <p className="text-[10px] text-gray-500 truncate">{spotifyTrack.artist}</p>
            </div>
            {/* Animated bars */}
            <div className="flex items-end gap-[2px] h-4 shrink-0">
              {[0, 150, 75, 225].map((delay) => (
                <span key={delay} className="w-[3px] rounded-full animate-pulse"
                  style={{ background: color.hex, height: spotifyTrack.playing ? "100%" : "30%",
                    animationDelay: `${delay}ms`, animationDuration: "900ms" }} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
