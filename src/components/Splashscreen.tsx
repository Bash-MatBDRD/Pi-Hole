import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { getThemeColor, getLogoStyle, getLetterStyle, getContainerShape, getFontClass } from "../lib/theme";

interface Props { onComplete: () => void; }

const BOOT_STEPS = [
  "Vérification de l'intégrité du système...",
  "Chargement des modules NEXUS...",
  "Initialisation des services domotiques...",
  "Connexion aux serveurs ZimaOS...",
  "Synchronisation Discord Bot...",
  "Chargement de l'interface utilisateur...",
  "NEXUS PANEL — Prêt.",
];

export default function Splashscreen({ onComplete }: Props) {
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState(0);
  const color = getThemeColor();
  const style = getLogoStyle();

  useEffect(() => {
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 6 + 2;
      if (p >= 100) { p = 100; clearInterval(interval); setTimeout(onComplete, 500); }
      setProgress(Math.min(p, 100));
      setStep(Math.min(Math.floor(p / (100 / BOOT_STEPS.length)), BOOT_STEPS.length - 1));
    }, 120);
    return () => clearInterval(interval);
  }, [onComplete]);

  const letterCSS  = getLetterStyle(color, style);
  const shapeClass = getContainerShape(style);
  const fontClass  = getFontClass(style);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{
        background: "#02020a",
        backgroundImage: `radial-gradient(ellipse 80% 60% at 50% -10%, ${color.bg}, transparent)`,
      }}
    >
      {/* Ambient blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full blur-3xl"
            style={{
              width: `${120 + i * 60}px`,
              height: `${120 + i * 60}px`,
              background: color.glow,
              opacity: 0.04 + i * 0.01,
              left: `${10 + i * 18}%`,
              top: `${15 + i * 12}%`,
            }}
            animate={{ x: [0, 20, -10, 0], y: [0, -15, 10, 0] }}
            transition={{ duration: 6 + i * 2, repeat: Infinity, ease: "easeInOut", delay: i * 0.7 }}
          />
        ))}
      </div>

      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-sm flex flex-col items-center"
      >
        {/* Logo */}
        <div className="relative mb-8">
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
            className={`absolute inset-0 blur-xl rounded-full`}
            style={{ background: color.glow, opacity: 0.3 }}
          />
          <div
            className={`relative w-20 h-20 ${shapeClass} ${getThemeColor() ? "" : ""} flex items-center justify-center text-3xl font-bold`}
            style={letterCSS}
          >
            <span className={fontClass}>N</span>
          </div>
        </div>

        <h1 className="text-2xl font-black tracking-[0.3em] text-white uppercase mb-1">NEXUS PANEL</h1>
        <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-10 font-mono">v2.0 — Système d'initialisation</p>

        {/* Progress bar */}
        <div className="w-full px-4">
          <div className="h-[2px] w-full bg-white/5 rounded-full overflow-hidden mb-3">
            <motion.div
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${color.hex}, ${color.glow})` }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </div>
          <div className="flex justify-between items-center">
            <p className="text-[10px] text-gray-600 font-mono truncate">{BOOT_STEPS[step]}</p>
            <span className="text-[10px] font-mono ml-3 shrink-0" style={{ color: color.text }}>
              {Math.round(progress)}%
            </span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
