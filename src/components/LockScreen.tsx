import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Lock, Eye, EyeOff, LogOut } from "lucide-react";
import { getThemeColor, getLogoStyle, getLetterStyle, getContainerShape, getFontClass } from "../lib/theme";

interface Props {
  username: string;
  password: string;
  onUnlock: () => void;
  onLogout: () => void;
}

export default function LockScreen({ username, password, onUnlock, onLogout }: Props) {
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
    </motion.div>
  );
}
