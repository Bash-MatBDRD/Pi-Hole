import React, { useState, useEffect, useRef } from "react";
import {
  Activity,
  Cpu,
  Database,
  Disc,
  Flame,
  HardDrive,
  Home,
  Info,
  Lightbulb,
  Maximize2,
  MessageSquare,
  Music,
  Power,
  RefreshCw,
  Sliders,
  Sparkles,
  Terminal,
  Thermometer,
  Tv,
  User,
  Users,
  Video,
  Volume2,
  Wifi,
  WifiOff,
  ChevronRight,
  Copy,
  Check,
  Code,
  Settings,
  X,
  Play,
  Pause,
  SkipForward,
  Eye,
  Send,
  Lock,
  Server,
  AlertTriangle,
  FolderLock,
  Calendar,
  FileText,
  CheckSquare,
  Compass,
  CloudSun,
  Star,
  LogOut,
  Download,
  Bell,
  SlidersHorizontal
} from "lucide-react";

interface Device {
  id: string;
  name: string;
  type: string;
  state: string;
  room: string;
  attributes: {
    brightness?: number;
    color_temp?: string;
    power_w?: number;
    today_energy_kwh?: number;
    current_temperature?: number;
    temperature?: number;
    volume_level?: number;
    media_title?: string;
    media_artist?: string;
    media_duration?: number;
    media_position?: number;
    motion_detected?: boolean;
    fps?: number;
  };
}

interface DiscordLog {
  timestamp: string;
  user: string;
  command: string;
  response: string;
}

interface ZimaStats {
  name: string;
  ip: string;
  os: string;
  platform: string;
  uptime: number;
  cpu: { usage: number; temperature: number };
  ram: { used: number; total: number; usage: number };
  disk: {
    path: string;
    type: string;
    total: number;
    used: number;
    usage: number;
    temperature: number;
    health: string;
    readSpeed: number;
    writeSpeed: number;
  };
}

interface SystemStats {
  zima1: ZimaStats;
  zima2: ZimaStats;
  discordBot: {
    name: string;
    status: string;
    ping: number;
    guilds: number;
    members: number;
    shards: number;
    commandsHandled: number;
  };
}

export default function App() {
  // Authentication, Lock & Boot states
  const [isBooting, setIsBooting] = useState(true);
  const [bootProgress, setBootProgress] = useState(0);
  const [bootStep, setBootStep] = useState("Vérification de l'intégrité de NEXUS PANEL...");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  
  // Custom Profile states (Screen 7)
  const [username, setUsername] = useState<string>(() => {
    return localStorage.getItem("nexus_username") || "Mathieu";
  });
  const [email, setEmail] = useState<string>(() => {
    return localStorage.getItem("nexus_email") || "mathieu@nexus.local";
  });
  const [userPassword, setUserPassword] = useState<string>(() => {
    return localStorage.getItem("nexus_password") || "260209";
  });
  
  // Inputs for forms
  const [usernameInput, setUsernameInput] = useState(() => {
    return localStorage.getItem("nexus_username") || "Mathieu";
  });
  const [passwordInput, setPasswordInput] = useState("");
  const [lockPasswordInput, setLockPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [lockError, setLockError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Logo Configurator (Screen 5)
  const [logoColor, setLogoColor] = useState<string>(() => {
    return localStorage.getItem("nexus_logo_color") || "Indigo";
  });
  const [logoFont, setLogoFont] = useState<string>(() => {
    return localStorage.getItem("nexus_logo_font") || "Défaut";
  });
  const [logoEffect, setLogoEffect] = useState<string>(() => {
    return localStorage.getItem("nexus_logo_effect") || "Glow";
  });
  const [logoShape, setLogoShape] = useState<string>(() => {
    return localStorage.getItem("nexus_logo_shape") || "Arrondi";
  });

  // Boot Animation Selection (Screen 6)
  const [bootAnimation, setBootAnimation] = useState<string>(() => {
    return localStorage.getItem("nexus_boot_animation") || "Nexus";
  });
  const [showBootOnStart, setShowBootOnStart] = useState<boolean>(() => {
    return localStorage.getItem("nexus_show_boot_on_start") !== "false";
  });

  // Active Menu View
  const [activeMenu, setActiveMenu] = useState<string>("dashboard"); // dashboard, zimaos, domotique, discord, logo, boot, profile, agenda, notes, taches, weather, favorites

  // Sidebar hover and Top Logo Config Menu state
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);

  // Spotify & FireStick TV States
  const [isSpotifyPlaying, setIsSpotifyPlaying] = useState(false);
  const [spotifyVolume, setSpotifyVolume] = useState(40);
  const [spotifyTrackIndex, setSpotifyTrackIndex] = useState(0);
  const [spotifyTrackProgress, setSpotifyTrackProgress] = useState(120);
  const [activeFirestickApp, setActiveFirestickApp] = useState("Home");
  const [isFirestickOn, setIsFirestickOn] = useState(true);

  const spotifyTracks = [
    { title: "Bohemian Rhapsody", artist: "Queen", duration: 354 },
    { title: "Starboy", artist: "The Weeknd", duration: 230 },
    { title: "Blinding Lights", artist: "The Weeknd", duration: 200 },
    { title: "Another One Bites the Dust", artist: "Queen", duration: 215 },
  ];

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Save to localStorage effects
  useEffect(() => {
    localStorage.setItem("nexus_username", username);
  }, [username]);
  useEffect(() => {
    localStorage.setItem("nexus_email", email);
  }, [email]);
  useEffect(() => {
    localStorage.setItem("nexus_password", userPassword);
  }, [userPassword]);
  useEffect(() => {
    localStorage.setItem("nexus_logo_color", logoColor);
  }, [logoColor]);
  useEffect(() => {
    localStorage.setItem("nexus_logo_font", logoFont);
  }, [logoFont]);
  useEffect(() => {
    localStorage.setItem("nexus_logo_effect", logoEffect);
  }, [logoEffect]);
  useEffect(() => {
    localStorage.setItem("nexus_logo_shape", logoShape);
  }, [logoShape]);
  useEffect(() => {
    localStorage.setItem("nexus_boot_animation", bootAnimation);
  }, [bootAnimation]);
  useEffect(() => {
    localStorage.setItem("nexus_show_boot_on_start", String(showBootOnStart));
  }, [showBootOnStart]);

  // Domain Stats
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [discordLogs, setDiscordLogs] = useState<DiscordLog[]>([]);
  const [haConfig, setHaConfig] = useState({ url: "", token: "", isConnected: false });
  const [deviceFilterRoom, setDeviceFilterRoom] = useState<string>("All");
  const [deviceFilterType, setDeviceFilterType] = useState<string>("All");

  // Home Assistant Credentials Configuration Form
  const [haUrlInput, setHaUrlInput] = useState("");
  const [haTokenInput, setHaTokenInput] = useState("");
  const [configSuccess, setConfigSuccess] = useState("");
  const [configError, setConfigError] = useState("");

  // Terminal State for Discord command simulator
  const [terminalInput, setTerminalInput] = useState("");
  const [terminalLogs, setTerminalLogs] = useState<Array<{ sender: string; text: string; time: string }>>([
    { sender: "Système", text: "Client Discord connecté en mode écoute.", time: "09:08:15" },
    { sender: "Mathieu", text: "/ha status", time: "09:08:26" },
    { sender: "Bot NEXUS", text: "✅ Home Assistant: Connecté | 9 appareils détectés.", time: "09:08:26" }
  ]);

  // Quote state ("Défi du Jour")
  const [quoteInput, setQuoteInput] = useState("");
  const [dailyQuote, setDailyQuote] = useState("Sous le ciel tout se fond dans le rien, mais rien ne se perd.");

  // Live clocks
  const [timeStr, setTimeStr] = useState("11:08");
  const [secondsStr, setSecondsStr] = useState("32");
  const [dateStr, setDateStr] = useState("Mercredi 15 juillet");

  // Notifications
  const [activeToast, setActiveToast] = useState<string | null>(null);

  // Setup the boot progression sequence
  useEffect(() => {
    if (!showBootOnStart) {
      setIsBooting(false);
      return;
    }
    const steps = [
      { progress: 15, text: "Initialisation du noyau NEXUS PANEL..." },
      { progress: 35, text: "Chargement du microprogramme ZimaOS (192.168.1.3)..." },
      { progress: 55, text: "Examen des disques (.1.3: HDD 1To | .1.25: NVMe + SSD)..." },
      { progress: 75, text: "Liaison avec la passerelle locale Home Assistant (192.168.1.25)..." },
      { progress: 95, text: "Démarrage du bot Discord en tâche de fond..." },
      { progress: 100, text: "Nexus Panel prêt à l'exécution." }
    ];

    let stepIdx = 0;
    const interval = setInterval(() => {
      if (stepIdx < steps.length) {
        setBootProgress(steps[stepIdx].progress);
        setBootStep(steps[stepIdx].text);
        stepIdx++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setIsBooting(false);
        }, 500);
      }
    }, 280);

    return () => clearInterval(interval);
  }, [showBootOnStart]);

  // Refresh stats
  useEffect(() => {
    if (!isLoggedIn || isLocked) return;

    fetchStats();
    fetchDevices();
    fetchLogs();
    fetchHaConfig();

    const statsInterval = setInterval(fetchStats, 3000);
    const devicesInterval = setInterval(fetchDevices, 4000);

    const clockInterval = setInterval(() => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
      setSecondsStr(now.toLocaleTimeString("fr-FR", { second: "2-digit" }));
      setDateStr(now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }));
    }, 1000);

    return () => {
      clearInterval(statsInterval);
      clearInterval(devicesInterval);
      clearInterval(clockInterval);
    };
  }, [isLoggedIn, isLocked]);

  // Simulated Spotify real-time track progress ticking
  useEffect(() => {
    if (!isSpotifyPlaying) return;
    const interval = setInterval(() => {
      setSpotifyTrackProgress((prev) => {
        const trackDuration = spotifyTracks[spotifyTrackIndex]?.duration || 200;
        if (prev >= trackDuration) {
          setSpotifyTrackIndex((idx) => (idx + 1) % spotifyTracks.length);
          return 0;
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isSpotifyPlaying, spotifyTrackIndex, spotifyTracks]);

  // Helper for popup messages
  const triggerToast = (msg: string) => {
    setActiveToast(msg);
    setTimeout(() => {
      setActiveToast(null);
    }, 3000);
  };

  // APIs
  const fetchStats = async () => {
    try {
      const res = await fetch("/api/system/stats");
      if (res.ok) {
        const data = await res.json();
        setSystemStats(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDevices = async () => {
    try {
      const res = await fetch("/api/home-assistant/devices");
      if (res.ok) {
        const data = await res.json();
        setDevices(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/discord/logs");
      if (res.ok) {
        const data = await res.json();
        setDiscordLogs(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchHaConfig = async () => {
    try {
      const res = await fetch("/api/home-assistant/config");
      if (res.ok) {
        const data = await res.json();
        setHaConfig(data);
        setHaUrlInput(data.url);
        setHaTokenInput(data.token);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const controlDevice = async (entity_id: string, service: string, data?: any) => {
    try {
      const res = await fetch("/api/home-assistant/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity_id, service, data })
      });
      if (res.ok) {
        fetchDevices();
        triggerToast(`Signal envoyé avec succès pour ${entity_id.split('.')[1]}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    const normalizedInput = usernameInput.trim().toLowerCase();
    const isCorrectUser = 
      normalizedInput === "mathieu" || 
      normalizedInput === "mat" || 
      normalizedInput === "mathieu@nexus.local" || 
      normalizedInput === "mat@nexus.local";
    
    if (isCorrectUser && passwordInput === "260209") {
      const activeName = normalizedInput.includes("mat") ? "Mat" : "Mathieu";
      setUsername(activeName);
      setEmail(`${activeName.toLowerCase()}@nexus.local`);
      setIsLoggedIn(true);
      triggerToast(`Heureux de vous revoir, ${activeName}.`);
    } else {
      setLoginError("Identifiants de sécurité invalides. Seul Mathieu ou Mat est autorisé.");
    }
  };

  const handleUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLockError("");
    if (lockPasswordInput === "260209") {
      setIsLocked(false);
      setLockPasswordInput("");
      triggerToast("Panel déverrouillé.");
    } else {
      setLockError("Mot de passe incorrect.");
    }
  };

  const handleSaveHaConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigSuccess("");
    setConfigError("");

    try {
      const res = await fetch("/api/home-assistant/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: haUrlInput, token: haTokenInput })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setConfigSuccess("Configuration Domotique mise à jour.");
        setHaConfig(data.config);
        fetchDevices();
        triggerToast("Token Home Assistant enregistré.");
      } else {
        setConfigError("Impossible de se connecter.");
      }
    } catch (err: any) {
      setConfigError(`Erreur: ${err.message}`);
    }
  };

  const handleSendTerminal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalInput.trim()) return;

    const cmd = terminalInput.trim();
    setTerminalInput("");

    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];

    // User input
    const newLogs = [...terminalLogs, { sender: username, text: cmd, time: timeStr }];

    // Simple response mapping
    let responseText = "Commande inconnue. Tapez /help pour la liste des commandes.";
    if (cmd.toLowerCase() === "/help") {
      responseText = "Commandes valides : /help, /ha status, /zima status, /zima check, /ping, /clear";
    } else if (cmd.toLowerCase() === "/ha status") {
      responseText = `🏠 Home Assistant (${haConfig.url || "192.168.1.25"}) : ${haConfig.isConnected ? "En ligne" : "Connecté (Simulation)"} · ${devices.length} entités détectées.`;
    } else if (cmd.toLowerCase() === "/zima status") {
      responseText = "💾 Diagnostic ZimaOS :\n- 192.168.1.3 (Principal): HDD 1To Sain [UP]\n- 192.168.1.25 (Stockage): SSD NVMe + SSD [UP]";
    } else if (cmd.toLowerCase() === "/zima check") {
      responseText = "🔍 Analyse des disques en cours...\n- /mnt/hdd_principal: HDD 1To sain à 100%, température 41°C\n- /mnt/ssd_nvme_storage: SSD NVMe 1To + SSD 2To sains à 100%, température 32°C";
    } else if (cmd.toLowerCase() === "/ping") {
      responseText = `pong ! Ping réseau : ${systemStats?.discordBot.ping || 19}ms`;
    } else if (cmd.toLowerCase() === "/clear") {
      setTerminalLogs([]);
      return;
    }

    setTerminalLogs([...newLogs, { sender: "Bot NEXUS", text: responseText, time: timeStr }]);
    triggerToast("Commande exécutée.");
  };

  // Render beautiful interactive thumbnail images for boot animation styles (Screen 6)
  const renderBootPreviewThumbnail = (anim: string) => {
    switch (anim) {
      case "Nexus":
        return (
          <div className="w-full h-16 rounded-lg bg-[#0c1224] border border-[#1b253e] flex items-center justify-center relative overflow-hidden mb-2">
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-950/40 to-[#0c1224]"></div>
            <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center text-white font-extrabold text-[10px] shadow-[0_0_8px_#6366f1]">N</div>
          </div>
        );
      case "iOS":
        return (
          <div className="w-full h-16 rounded-lg bg-[#080d1a] border border-[#1b253e] flex items-center justify-center mb-2">
            <span className="text-white text-xl"></span>
          </div>
        );
      case "Windows":
        return (
          <div className="w-full h-16 rounded-lg bg-[#00102a] border border-[#1b253e] flex items-center justify-center mb-2">
            <div className="grid grid-cols-2 gap-0.5 w-5 h-5 transform rotate-45">
              <div className="bg-cyan-500 w-2 h-2"></div>
              <div className="bg-cyan-500 w-2 h-2"></div>
              <div className="bg-cyan-500 w-2 h-2"></div>
              <div className="bg-cyan-500 w-2 h-2"></div>
            </div>
          </div>
        );
      case "Minimal":
        return (
          <div className="w-full h-16 rounded-lg bg-[#050811] border border-[#1b253e] flex items-center justify-center mb-2">
            <div className="w-4 h-4 border-2 border-slate-500 border-t-white rounded-full animate-spin"></div>
          </div>
        );
      case "Netflix":
        return (
          <div className="w-full h-16 rounded-lg bg-black border border-[#1b253e] flex items-center justify-center mb-2">
            <span className="text-red-600 font-extrabold text-xs tracking-wider uppercase">NEXUS</span>
          </div>
        );
      case "Matrix":
        return (
          <div className="w-full h-16 rounded-lg bg-black border border-[#1b253e] flex flex-col justify-center gap-0.5 px-2 overflow-hidden mb-2 font-mono text-[5px] text-emerald-500 leading-none">
            <div className="truncate opacity-80">1010100100010110</div>
            <div className="truncate opacity-50">0010101101001010</div>
            <div className="truncate opacity-25">1101010101110001</div>
          </div>
        );
      case "Void":
        return (
          <div className="w-full h-16 rounded-lg bg-slate-950 border border-[#1b253e] flex items-center justify-center relative overflow-hidden mb-2">
            <div className="absolute w-8 h-8 rounded-full border-2 border-purple-500/30 animate-pulse"></div>
            <div className="w-3 h-3 bg-indigo-500 rounded-full animate-ping"></div>
          </div>
        );
      case "Apple":
        return (
          <div className="w-full h-16 rounded-lg bg-[#111] border border-[#1b253e] flex flex-col justify-center gap-0.5 p-1 items-center mb-2">
            <div className="w-full h-1 bg-red-500"></div>
            <div className="w-full h-1 bg-orange-500"></div>
            <div className="w-full h-1 bg-yellow-500"></div>
            <div className="w-full h-1 bg-green-500"></div>
            <div className="w-full h-1 bg-blue-500"></div>
          </div>
        );
      case "HUD":
        return (
          <div className="w-full h-16 rounded-lg bg-[#03150d] border border-[#1b253e] flex items-center justify-center relative mb-2 font-mono text-[7px] text-emerald-400">
            <div className="w-8 h-8 rounded-full border border-emerald-500/40 flex items-center justify-center">
              <span className="animate-ping">+</span>
            </div>
            <span className="absolute bottom-1 right-1 text-[4px]">SYS_OK</span>
          </div>
        );
      case "Aurora":
        return (
          <div className="w-full h-16 rounded-lg bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-purple-500/20 border border-[#1b253e] flex items-center justify-center mb-2 overflow-hidden">
            <div className="text-[8px] text-cyan-300 font-bold animate-pulse">AURORA</div>
          </div>
        );
      case "Glitch":
        return (
          <div className="w-full h-16 rounded-lg bg-[#0a0710] border border-[#1b253e] flex items-center justify-center relative mb-2 font-black text-xs">
            <span className="text-white relative z-10">GLITCH</span>
            <span className="absolute text-cyan-400 translate-x-[-1px] translate-y-[1px] opacity-70">GLITCH</span>
            <span className="absolute text-rose-500 translate-x-[1px] translate-y-[-1px] opacity-70">GLITCH</span>
          </div>
        );
      case "Rétro":
        return (
          <div className="w-full h-16 rounded-lg bg-[#240c00] border border-[#1b253e] flex flex-col items-center justify-center mb-2 relative overflow-hidden">
            <div className="w-4 h-4 rounded-full bg-orange-500 animate-pulse"></div>
            <div className="w-full h-[1px] bg-yellow-500/40 absolute bottom-3"></div>
            <div className="w-full h-[1px] bg-yellow-500/20 absolute bottom-1"></div>
          </div>
        );
      case "TikTok":
        return (
          <div className="w-full h-16 rounded-lg bg-black border border-[#1b253e] flex items-center justify-center mb-2 relative">
            <span className="text-white font-bold text-[10px] z-10 flex items-center gap-1">🎵 TOK</span>
            <div className="absolute text-cyan-400 translate-x-[-2px] text-[10px] font-bold">🎵 TOK</div>
            <div className="absolute text-red-500 translate-x-[2px] text-[10px] font-bold">🎵 TOK</div>
          </div>
        );
      case "Sakura":
        return (
          <div className="w-full h-16 rounded-lg bg-[#24131d] border border-[#1b253e] flex flex-wrap gap-1 p-2 items-center justify-center mb-2">
            <span className="text-rose-300 text-[10px] font-semibold">✿ SAKURA ✿</span>
          </div>
        );
      case "Storm":
        return (
          <div className="w-full h-16 rounded-lg bg-[#001424] border border-[#1b253e] flex items-center justify-center mb-2">
            <span className="text-yellow-400 font-bold text-xs animate-bounce">⚡ STORM</span>
          </div>
        );
      case "Or":
        return (
          <div className="w-full h-16 rounded-lg bg-gradient-to-tr from-yellow-700/30 via-yellow-600/10 to-yellow-500/40 border border-yellow-500/20 flex items-center justify-center mb-2">
            <span className="text-yellow-400 text-[10px] font-bold tracking-widest">GOLD</span>
          </div>
        );
      case "Feu":
        return (
          <div className="w-full h-16 rounded-lg bg-gradient-to-t from-red-600/30 via-orange-500/10 to-[#0a0710] border border-red-500/20 flex items-center justify-center mb-2">
            <span className="text-red-400 text-[10px] font-bold tracking-widest animate-pulse">FIRE</span>
          </div>
        );
      case "Glace":
        return (
          <div className="w-full h-16 rounded-lg bg-[#091b29] border border-cyan-500/20 flex items-center justify-center mb-2">
            <span className="text-cyan-200 text-[10px] font-bold tracking-widest">ICE</span>
          </div>
        );
      case "Hologramme":
        return (
          <div className="w-full h-16 rounded-lg bg-[#05111a] border border-cyan-500/30 flex items-center justify-center mb-2 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(#0ea5e9_1px,transparent_1px)] [background-size:4px_4px] opacity-30"></div>
            <span className="text-cyan-400 text-[9px] font-mono tracking-widest z-10 animate-pulse">HOLOGRAM</span>
          </div>
        );
      case "Glitch RGB":
        return (
          <div className="w-full h-16 rounded-lg bg-black border border-red-500/20 flex mb-2 overflow-hidden">
            <div className="w-1/3 h-full bg-red-600/20"></div>
            <div className="w-1/3 h-full bg-green-600/20"></div>
            <div className="w-1/3 h-full bg-blue-600/20"></div>
          </div>
        );
      case "Radar":
        return (
          <div className="w-full h-16 rounded-lg bg-[#02140a] border border-emerald-500/30 flex items-center justify-center mb-2 relative overflow-hidden">
            <div className="w-6 h-6 rounded-full border border-emerald-500/30 flex items-center justify-center">
              <div className="w-1 h-1 bg-emerald-400 rounded-full animate-ping"></div>
            </div>
          </div>
        );
      case "DNA":
        return (
          <div className="w-full h-16 rounded-lg bg-[#0d071a] border border-purple-500/30 flex items-center justify-center mb-2">
            <span className="text-purple-400 font-extrabold text-[10px] animate-pulse">🧬 DNA</span>
          </div>
        );
      default:
        return (
          <div className="w-full h-16 rounded-lg bg-[#0c1224] border border-[#1b253e] flex items-center justify-center mb-2">
            <span className="text-indigo-400 text-[10px] font-bold">PREVIEW</span>
          </div>
        );
    }
  };

  // Color mapper for our dynamic custom logo preview & layout (Screen 5)
  const getColorClass = (col: string) => {
    switch (col) {
      case "Indigo": return "bg-indigo-600 shadow-indigo-500/50 text-white";
      case "Violet": return "bg-violet-600 shadow-violet-500/50 text-white";
      case "Cyan": return "bg-cyan-500 shadow-cyan-400/50 text-black";
      case "Émeraude": return "bg-emerald-500 shadow-emerald-400/50 text-black";
      case "Rose": return "bg-pink-500 shadow-pink-400/50 text-white";
      case "Ambre": return "bg-amber-500 shadow-amber-400/50 text-black";
      case "Blanc": return "bg-white shadow-white/50 text-black";
      case "Pink": return "bg-rose-500 shadow-rose-400/50 text-white";
      case "Orange": return "bg-orange-500 shadow-orange-400/50 text-black";
      case "Lime": return "bg-lime-500 shadow-lime-400/50 text-black";
      case "Teal": return "bg-teal-500 shadow-teal-400/50 text-white";
      case "Or": return "bg-yellow-600 shadow-yellow-500/50 text-white";
      case "Rouge": return "bg-red-500 shadow-red-400/50 text-white";
      case "Ciel": return "bg-sky-500 shadow-sky-400/50 text-black";
      default: return "bg-indigo-600 shadow-indigo-500/50 text-white";
    }
  };

  const getFontFamilyClass = (f: string) => {
    switch (f) {
      case "Défaut": return "logo-font-default";
      case "Serif": return "logo-font-serif";
      case "Mono": return "logo-font-mono";
      case "Impact": return "logo-font-impact";
      case "Italic": return "logo-font-italic";
      case "Display": return "logo-font-display";
      default: return "logo-font-default";
    }
  };

  const getShapeClass = (s: string) => {
    switch (s) {
      case "Arrondi": return "rounded-xl";
      case "Carré": return "rounded-none";
      case "Cercle": return "rounded-full";
      default: return "rounded-xl";
    }
  };

  const getEffectStyle = (eff: string, col: string) => {
    const colHex = {
      Indigo: "#6366f1", Violet: "#8b5cf6", Cyan: "#06b6d4", Émeraude: "#10b981",
      Rose: "#ec4899", Ambre: "#f59e0b", Blanc: "#ffffff", Pink: "#f43f5e",
      Orange: "#f97316", Lime: "#84cc16", Teal: "#14b8a6", Or: "#d4af37",
      Rouge: "#ef4444", Ciel: "#0ea5e9"
    }[col] || "#6366f1";

    return {
      "--accent-border-color": colHex,
      "--accent-glow-color": `${colHex}80`
    } as React.CSSProperties;
  };

  const getEffectClass = (eff: string) => {
    switch (eff) {
      case "Glow": return "logo-effect-glow";
      case "Néon": return "logo-effect-neon";
      case "Gradient": return "logo-effect-gradient";
      case "Contour": return "logo-effect-contour";
      case "Hologramme": return "logo-effect-hologram";
      case "Simple": return "logo-effect-simple";
      default: return "logo-effect-glow";
    }
  };

  // Filter entities
  const rooms = ["All", "Salon", "Cuisine", "Chambre", "Extérieur"];
  const types = ["All", "light", "cover", "switch", "climate", "media_player", "camera"];

  const filteredDevices = devices.filter((d) => {
    const roomMatch = deviceFilterRoom === "All" || d.room === deviceFilterRoom;
    const typeMatch = deviceFilterType === "All" || d.type === deviceFilterType;
    return roomMatch && typeMatch;
  });

  const activeLights = devices.filter(d => d.type === "light" && d.state === "on").length;
  const activeSwitches = devices.filter(d => d.type === "switch" && d.state === "on").length;
  const salonTemp = devices.find(d => d.id === "climate.thermostat_salon")?.attributes.current_temperature || 21.0;

  // Render different custom boot animation sequences dynamically (Screen 6 preview or starting)
  const renderBootAnimation = () => {
    switch (bootAnimation) {
      case "Matrix":
        return (
          <div className="absolute inset-0 bg-black text-emerald-500 font-mono text-[10px] p-4 opacity-30 select-none overflow-hidden leading-none z-0">
            {Array.from({ length: 15 }).map((_, i) => (
              <div key={i} className="animate-pulse tracking-widest whitespace-nowrap overflow-hidden">
                {Array.from({ length: 80 }).map(() => String.fromCharCode(33 + Math.floor(Math.random() * 90))).join("")}
              </div>
            ))}
          </div>
        );
      case "iOS":
        return (
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-black font-black text-3xl"></span>
            </div>
          </div>
        );
      case "Windows":
        return (
          <div className="flex flex-col items-center justify-center space-y-6">
            <div className="grid grid-cols-2 gap-1 w-12 h-12 transform rotate-45">
              <div className="bg-red-500 w-5.5 h-5.5"></div>
              <div className="bg-green-500 w-5.5 h-5.5"></div>
              <div className="bg-blue-500 w-5.5 h-5.5"></div>
              <div className="bg-yellow-500 w-5.5 h-5.5"></div>
            </div>
            <div className="win-dot-container mt-4">
              <div className="win-dot"></div>
              <div className="win-dot"></div>
              <div className="win-dot"></div>
              <div className="win-dot"></div>
              <div className="win-dot"></div>
            </div>
          </div>
        );
      case "Netflix":
        return (
          <div className="flex flex-col items-center justify-center">
            <h1 className="text-6xl font-black text-red-600 tracking-wider animate-bounce">NEXUS</h1>
            <div className="h-1 w-32 bg-red-600 animate-pulse mt-2"></div>
          </div>
        );
      case "Storm":
        return (
          <div className="flex flex-col items-center justify-center">
            <Flame className="h-16 w-16 text-yellow-500 animate-bounce" />
            <span className="text-xs text-yellow-500 tracking-widest uppercase mt-2">ALIMENTATION ÉLECTRIQUE ACTIVE</span>
          </div>
        );
      case "Void":
        return (
          <div className="relative w-24 h-24 flex items-center justify-center">
            <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full animate-pulse"></div>
            <div className="absolute w-16 h-16 border-4 border-indigo-400 rounded-full animate-ping"></div>
            <div className="w-8 h-8 bg-indigo-500 rounded-full"></div>
          </div>
        );
      default: // Nexus style
        return (
          <div className="flex flex-col items-center">
            <div
              style={getEffectStyle(logoEffect, logoColor)}
              className={`w-16 h-16 ${getShapeClass(logoShape)} ${getEffectClass(logoEffect)} ${getColorClass(logoColor)} flex items-center justify-center font-bold text-2xl shadow-lg transition-all duration-300`}
            >
              <span className={getFontFamilyClass(logoFont)}>N</span>
            </div>
            <h1 className="text-2xl font-black tracking-widest text-white mt-4 uppercase">NEXUS PANEL</h1>
          </div>
        );
    }
  };

  // BOOT SCREEN (Matches Screen 6 configurations)
  if (isBooting) {
    return (
      <div className="min-h-screen bg-[#04060d] flex flex-col items-center justify-center p-6 text-slate-300 font-sans relative">
        <div className="w-full max-w-lg bg-[#080d1a] border border-[#172240] rounded-2xl p-8 relative z-10 flex flex-col items-center shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
          {renderBootAnimation()}

          <div className="mt-8 text-center w-full">
            <span className="text-[10px] text-indigo-400 font-mono tracking-widest uppercase block mb-1">
              Initialisation du Système
            </span>
            <p className="text-xs text-slate-400 font-mono font-medium truncate h-5">
              {bootStep}
            </p>

            <div className="w-full bg-[#0d1527] rounded-full h-1.5 mt-4 overflow-hidden border border-[#1b2b4f]">
              <div
                className="bg-indigo-500 h-full rounded-full transition-all duration-150"
                style={{ width: `${bootProgress}%` }}
              ></div>
            </div>
            <span className="text-[10px] text-slate-500 font-mono mt-2 block">
              Chargement · {bootProgress}%
            </span>
          </div>
        </div>
      </div>
    );
  }

  // LOGIN SCREEN (Matches Screen 1)
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#050811] flex flex-col items-center justify-center p-4 text-slate-300 font-sans">
        <div className="flex flex-col items-center text-center mb-6">
          {/* Customizable Logo dynamically updated! */}
          <div
            style={getEffectStyle(logoEffect, logoColor)}
            className={`w-16 h-16 ${getShapeClass(logoShape)} ${getEffectClass(logoEffect)} ${getColorClass(logoColor)} flex items-center justify-center font-extrabold text-2xl shadow-lg mb-4 transition-all duration-300`}
          >
            <span className={getFontFamilyClass(logoFont)}>N</span>
          </div>

          <h1 className="text-2xl font-extrabold tracking-widest text-white uppercase">NEXUS</h1>
          <p className="text-[11px] text-slate-500 font-semibold tracking-widest uppercase mt-1">PANEL V1.5.0</p>
        </div>

        <div className="w-full max-w-md bg-[#090d1a] border border-[#161e35] rounded-2xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <h2 className="text-lg font-bold text-white mb-1">Connexion</h2>
          <p className="text-xs text-slate-500 mb-6 font-medium">Entrez vos identifiants pour accéder au panel.</p>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Identifiant ou E-mail</label>
              <div className="relative">
                <span className="absolute left-3.5 top-3.5 text-slate-600"><User className="h-4 w-4" /></span>
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="bypass@nexus.local"
                  required
                  className="w-full bg-[#0d1424] border border-[#1b253e] rounded-xl py-3 pl-11 pr-4 text-xs font-sans text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Mot de passe</label>
              <div className="relative">
                <span className="absolute left-3.5 top-3.5 text-slate-600"><Lock className="h-4 w-4" /></span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-[#0d1424] border border-[#1b253e] rounded-xl py-3 pl-11 pr-11 text-xs font-sans text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-600 hover:text-slate-400 transition-colors"
                >
                  <Eye className="h-4 w-4" />
                </button>
              </div>
            </div>

            {loginError && (
              <p className="text-red-400 text-[11px] font-medium pt-1 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                {loginError}
              </p>
            )}

            <button
              type="submit"
              className="w-full bg-[#1c284d] hover:bg-[#253668] text-white font-bold py-3 px-4 rounded-xl text-xs tracking-wider transition-colors mt-6 shadow-md"
            >
              Se connecter
            </button>
          </form>
        </div>

        <p className="text-[11px] text-slate-600 font-medium mt-6 tracking-wide">
          Accès restreint — panel personnel
        </p>
      </div>
    );
  }

  // DESKTOP LOCK SCREEN OVERLAY (Matches Screen 8)
  if (isLocked) {
    return (
      <div className="min-h-screen bg-[#050811] flex flex-col items-center justify-center p-6 text-slate-300 font-sans relative">
        <div className="text-center mb-10">
          <h1 className="text-6xl font-light text-white tracking-tight">{timeStr}</h1>
          <p className="text-sm text-slate-400 font-medium mt-2 uppercase tracking-wide">{dateStr}</p>
        </div>

        <div className="flex flex-col items-center w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center text-white text-2xl font-black mb-3 shadow-[0_0_20px_rgba(99,102,241,0.4)]">
            {username.charAt(0).toUpperCase()}
          </div>
          <h2 className="text-base font-bold text-white mb-0.5">{username}</h2>
          <span className="text-xs text-slate-500 font-medium">{email}</span>

          <form onSubmit={handleUnlockSubmit} className="w-full mt-6 space-y-3">
            <div className="relative">
              <input
                type="password"
                value={lockPasswordInput}
                onChange={(e) => setLockPasswordInput(e.target.value)}
                placeholder="Mot de passe"
                required
                className="w-full bg-[#090d1a] border border-[#161e35] rounded-xl py-3 px-4 text-xs font-sans text-white placeholder:text-slate-600 text-center focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {lockError && (
              <p className="text-red-400 text-[11px] font-medium pt-1 flex items-center justify-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                {lockError}
              </p>
            )}

            <button
              type="submit"
              className="w-full bg-[#1c284d] hover:bg-[#253668] text-white font-bold py-3 px-4 rounded-xl text-xs tracking-wider transition-colors shadow-md"
            >
              Déverrouiller
            </button>
          </form>

          <button
            onClick={() => {
              setIsLoggedIn(false);
              setIsLocked(false);
            }}
            className="mt-6 text-xs text-slate-500 hover:text-slate-400 flex items-center gap-1 font-medium transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" /> Se déconnecter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050811] text-slate-300 flex flex-col font-sans relative antialiased">
      {/* Toast Notifier */}
      {activeToast && (
        <div className="fixed bottom-6 right-6 bg-[#090d1a] border border-[#1e2d54] text-slate-200 px-4 py-3 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] z-50 flex items-center gap-3 animate-fade-in-up">
          <span className="h-2 w-2 rounded-full bg-indigo-500 animate-ping"></span>
          <span className="text-xs font-medium font-sans">{activeToast}</span>
        </div>
      )}

      {/* HEADER BAR (With Interactive Logo Config menu at the top-left) */}
      <div className="bg-[#070b16] border-b border-[#131a2e] px-4 py-2 flex items-center justify-between text-xs font-medium relative z-30">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsHeaderMenuOpen(!isHeaderMenuOpen)}
            className="flex items-center gap-3 hover:opacity-80 transition-all text-left focus:outline-none focus:ring-0"
            title="Menu Configuration"
          >
            <div
              style={getEffectStyle(logoEffect, logoColor)}
              className={`w-8 h-8 ${getShapeClass(logoShape)} ${getEffectClass(logoEffect)} ${getColorClass(logoColor)} flex items-center justify-center font-bold text-[11px] shadow-sm transition-all duration-300`}
            >
              <span className={getFontFamilyClass(logoFont)}>N</span>
            </div>
            <div>
              <h3 className="text-xs font-extrabold text-white tracking-widest flex items-center gap-1 leading-none">
                NEXUS
                <Sliders className="h-3 w-3 text-slate-500" />
              </h3>
              <span className="text-[8px] text-slate-500 block font-semibold tracking-wider uppercase mt-0.5">Config Système</span>
            </div>
          </button>

          <div className="hidden sm:flex items-center gap-3 border-l border-[#131a2e] pl-4">
            <div className="bg-[#1c284d] text-indigo-300 text-[9px] font-extrabold px-1.5 py-0.5 rounded tracking-wide">
              V2.0
            </div>
            <div className="flex items-center gap-1.5 text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px]">Bot en ligne</span>
            </div>
          </div>
        </div>

        {/* Floating Configuration Dropdown Menu */}
        {isHeaderMenuOpen && (
          <div className="absolute left-4 top-11 w-64 bg-[#090d1a]/95 backdrop-blur-md border border-[#1e2d54] rounded-2xl shadow-[0_15px_50px_rgba(0,0,0,0.8)] z-50 p-4 space-y-3 animate-fade-in text-slate-300">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pb-1 border-b border-[#131a2e]">
              Configuration du Système
            </div>
            <div className="space-y-1">
              <button 
                onClick={() => { setActiveMenu("logo"); setIsHeaderMenuOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-300 hover:text-white hover:bg-[#131a2e] rounded-xl text-xs font-semibold transition-colors text-left"
              >
                <Sliders className="h-4 w-4 text-indigo-400" />
                <span>Configurateur Logo</span>
              </button>
              <button 
                onClick={() => { setActiveMenu("boot"); setIsHeaderMenuOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-300 hover:text-white hover:bg-[#131a2e] rounded-xl text-xs font-semibold transition-colors text-left"
              >
                <RefreshCw className="h-4 w-4 text-indigo-400" />
                <span>Animation Démarrage</span>
              </button>
              <button 
                onClick={() => { setActiveMenu("profile"); setIsHeaderMenuOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-300 hover:text-white hover:bg-[#131a2e] rounded-xl text-xs font-semibold transition-colors text-left"
              >
                <Settings className="h-4 w-4 text-indigo-400" />
                <span>Profil & API Domotique</span>
              </button>
              <button 
                onClick={() => { setActiveMenu("zimaos"); setIsHeaderMenuOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-300 hover:text-white hover:bg-[#131a2e] rounded-xl text-xs font-semibold transition-colors text-left"
              >
                <HardDrive className="h-4 w-4 text-indigo-400" />
                <span>Diagnostic ZimaOS</span>
              </button>
            </div>
            <div className="border-t border-[#131a2e] pt-2 flex justify-between items-center">
              <button
                onClick={() => { setIsLocked(true); setIsHeaderMenuOpen(false); }}
                className="text-[10px] text-slate-400 hover:text-white font-medium flex items-center gap-1"
              >
                <Lock className="h-3 w-3" /> Verrouiller
              </button>
              <button
                onClick={() => { setIsLoggedIn(false); setIsHeaderMenuOpen(false); }}
                className="text-[10px] text-red-400 hover:text-red-300 font-medium flex items-center gap-1"
              >
                <LogOut className="h-3 w-3" /> Déconnexion
              </button>
            </div>
          </div>
        )}

        {/* Real-time system clock formatted like Screen 2 */}
        <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px] font-semibold">
          <span className="text-white">{timeStr}</span>
          <span className="text-cyan-500">:{secondsStr}</span>
          <span className="text-slate-500 ml-1 font-sans font-medium hidden sm:inline">{dateStr}</span>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => triggerToast("Aucune notification")} className="text-slate-500 hover:text-slate-300 relative">
            <Bell className="h-4 w-4" />
            <span className="absolute top-0 right-0 h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
          </button>
          <button onClick={() => setActiveMenu("profile")} className="text-slate-500 hover:text-slate-300" title="Profil">
            <User className="h-4 w-4" />
          </button>
          <button onClick={() => setIsLocked(true)} className="text-slate-500 hover:text-slate-300" title="Verrouiller">
            <Lock className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* TWO COLUMN GRID: NAVIGATION SIDEBAR & CONTENT CANVAS */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT-EDGE HOVER TRIGGER AREA FOR SIDEBAR REVEAL */}
        <div 
          onMouseEnter={() => setIsSidebarHovered(true)}
          className="fixed left-0 top-11 bottom-0 w-3 z-40 cursor-pointer group flex items-center justify-center transition-colors hover:bg-indigo-500/10"
          title="Survolez pour afficher la barre latérale"
        >
          {/* Subtle glowing indicator tab in the middle left of the screen */}
          <div className="h-10 w-1 bg-indigo-500/40 rounded-r group-hover:bg-indigo-500 transition-colors"></div>
        </div>

        {/* COLUMN 1: SIDEBAR NAVIGATION (Slides out on hover, overlays content) */}
        <div 
          onMouseEnter={() => setIsSidebarHovered(true)}
          onMouseLeave={() => setIsSidebarHovered(false)}
          className={`fixed left-0 top-11 bottom-0 z-40 w-64 bg-[#070a14]/95 backdrop-blur-md border-r border-[#131a2e] p-4 flex flex-col justify-between overflow-y-auto transition-all duration-300 ease-in-out shadow-[10px_0_40px_rgba(0,0,0,0.7)] ${
            isSidebarHovered ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0 pointer-events-none"
          }`}
        >
          <div className="space-y-6">
            {/* Header Block with Customizable Dynamic Logo & App name */}
            <div className="flex items-center gap-3 pb-4 border-b border-[#131a2e]">
              <div
                style={getEffectStyle(logoEffect, logoColor)}
                className={`w-9 h-9 ${getShapeClass(logoShape)} ${getEffectClass(logoEffect)} ${getColorClass(logoColor)} flex items-center justify-center font-bold text-base shadow-sm transition-all duration-300`}
              >
                <span className={getFontFamilyClass(logoFont)}>N</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-widest font-sans">NEXUS</h3>
                <span className="text-[9px] text-slate-500 block font-semibold tracking-wider">SYSTEM PANEL</span>
              </div>
            </div>

            {/* Sidebar Menu Groups (Matches Screen 4 Exactly) */}
            <div className="space-y-4">
              {/* Category: ACCUEIL */}
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest px-2 block">Accueil</span>
                <button
                  onClick={() => { setActiveMenu("dashboard"); setIsSidebarHovered(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    activeMenu === "dashboard"
                      ? "bg-[#1c284d] text-white"
                      : "text-slate-400 hover:text-slate-200 hover:bg-[#0c1224]"
                  }`}
                >
                  <Activity className="h-4 w-4" />
                  <span>Tableau de bord</span>
                </button>
              </div>

              {/* Category: PRODUCTIVITÉ */}
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest px-2 block">Productivité</span>
                
                <button
                  onClick={() => { setActiveMenu("agenda"); setIsSidebarHovered(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    activeMenu === "agenda"
                      ? "bg-[#1c284d] text-white"
                      : "text-slate-400 hover:text-slate-200 hover:bg-[#0c1224]"
                  }`}
                >
                  <Calendar className="h-4 w-4" />
                  <span>Agenda</span>
                </button>

                <button
                  onClick={() => { setActiveMenu("notes"); setIsSidebarHovered(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    activeMenu === "notes"
                      ? "bg-[#1c284d] text-white"
                      : "text-slate-400 hover:text-slate-200 hover:bg-[#0c1224]"
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  <span>Notes & Mémos</span>
                </button>

                <button
                  onClick={() => { setActiveMenu("taches"); setIsSidebarHovered(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    activeMenu === "taches"
                      ? "bg-[#1c284d] text-white"
                      : "text-slate-400 hover:text-slate-200 hover:bg-[#0c1224]"
                  }`}
                >
                  <CheckSquare className="h-4 w-4" />
                  <span>Tâches</span>
                </button>
              </div>

              {/* Category: MÉDIAS & SOCIAL */}
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest px-2 block">Médias & Social</span>
                
                <button
                  onClick={() => { setActiveMenu("domotique"); setIsSidebarHovered(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    activeMenu === "domotique"
                      ? "bg-[#1c284d] text-white"
                      : "text-slate-400 hover:text-slate-200 hover:bg-[#0c1224]"
                  }`}
                >
                  <Home className="h-4 w-4" />
                  <span>Domotique HA</span>
                </button>

                <button
                  onClick={() => { setActiveMenu("medias"); setIsSidebarHovered(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    activeMenu === "medias"
                      ? "bg-[#1c284d] text-white"
                      : "text-slate-400 hover:text-slate-200 hover:bg-[#0c1224]"
                  }`}
                >
                  <Tv className="h-4 w-4" />
                  <span>Spotify & FireStick TV</span>
                </button>

                <button
                  onClick={() => { setActiveMenu("discord"); setIsSidebarHovered(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    activeMenu === "discord"
                      ? "bg-[#1c284d] text-white"
                      : "text-slate-400 hover:text-slate-200 hover:bg-[#0c1224]"
                  }`}
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Discord Bot</span>
                </button>
              </div>

              {/* Category: OUTILS & SYSTEM */}
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest px-2 block">Outils & Config</span>
                
                <button
                  onClick={() => { setActiveMenu("zimaos"); setIsSidebarHovered(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    activeMenu === "zimaos"
                      ? "bg-[#1c284d] text-white"
                      : "text-slate-400 hover:text-slate-200 hover:bg-[#0c1224]"
                  }`}
                >
                  <HardDrive className="h-4 w-4" />
                  <span>ZimaOS Diagnostic</span>
                </button>

                <button
                  onClick={() => { setActiveMenu("logo"); setIsSidebarHovered(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    activeMenu === "logo"
                      ? "bg-[#1c284d] text-white"
                      : "text-slate-400 hover:text-slate-200 hover:bg-[#0c1224]"
                  }`}
                >
                  <Sliders className="h-4 w-4" />
                  <span>Configurateur Logo</span>
                </button>

                <button
                  onClick={() => setActiveMenu("boot")}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    activeMenu === "boot"
                      ? "bg-[#1c284d] text-white"
                      : "text-slate-400 hover:text-slate-200 hover:bg-[#0c1224]"
                  }`}
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Animation Démarrage</span>
                </button>

                <button
                  onClick={() => setActiveMenu("profile")}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    activeMenu === "profile"
                      ? "bg-[#1c284d] text-white"
                      : "text-slate-400 hover:text-slate-200 hover:bg-[#0c1224]"
                  }`}
                >
                  <Settings className="h-4 w-4" />
                  <span>Profil & API</span>
                </button>
              </div>
            </div>
          </div>

          {/* USER CARD BLOCK AT BOTTOM (Matches Screen 4 Sidebar foot) */}
          <div className="pt-4 border-t border-[#131a2e] space-y-2">
            <div className="flex items-center gap-3 px-2 py-1.5">
              <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                {username.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-white block truncate">{username}</span>
                <span className="text-[10px] text-slate-500 block truncate">{email}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => setIsLocked(true)}
                className="flex items-center justify-center gap-1.5 py-2 px-2 bg-[#0c1224] hover:bg-[#161f38] text-slate-400 hover:text-white rounded-xl text-[10px] font-semibold transition-colors"
              >
                <Lock className="h-3 w-3" /> Lock
              </button>
              <button
                onClick={() => {
                  setIsLoggedIn(false);
                  triggerToast("Déconnexion réussie.");
                }}
                className="flex items-center justify-center gap-1.5 py-2 px-2 bg-[#0c1224] hover:bg-red-950/20 text-slate-400 hover:text-red-400 rounded-xl text-[10px] font-semibold transition-colors"
              >
                <LogOut className="h-3 w-3" /> Log out
              </button>
            </div>
          </div>
        </div>

        {/* COLUMN 2: WORKSPACE CANVAS */}
        <div className="flex-1 overflow-y-auto bg-[#050811] p-6 space-y-6">
          
          {/* MENU VIEW: TABLEAU DE BORD (Matches Screen 2 & 3 Exactly) */}
          {activeMenu === "dashboard" && (
            <div className="space-y-6">
              
              {/* Top Greeting Headline */}
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                  Bon retour, <span className="text-emerald-400 text-glow-green">{username}</span>
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  0 événements détectés aujourd'hui · Panel v1.5.0
                </p>
              </div>

              {/* Status KPI Row Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-[#090d1a] border border-[#161e35] p-5 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Statut Système</span>
                    <span className="text-lg font-bold text-white mt-1 block">En ligne</span>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                    <Activity className="h-5 w-5" />
                  </div>
                </div>

                <div className="bg-[#090d1a] border border-[#161e35] p-5 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Sécurité</span>
                    <span className="text-lg font-bold text-white mt-1 block">ÉLEVÉ</span>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-400">
                    <Lock className="h-5 w-5" />
                  </div>
                </div>

                <div className="bg-[#090d1a] border border-[#161e35] p-5 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Utilisateur</span>
                    <span className="text-lg font-bold text-white mt-1 block">1</span>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                    <Users className="h-5 w-5" />
                  </div>
                </div>

                <div className="bg-[#090d1a] border border-[#161e35] p-5 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">CPU / RAM</span>
                    <span className="text-lg font-bold text-white mt-1 block">
                      {systemStats ? `${systemStats.zima1.cpu.usage}% / ${systemStats.zima1.ram.usage}%` : "6% / 42%"}
                    </span>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400">
                    <Cpu className="h-5 w-5" />
                  </div>
                </div>
              </div>

              {/* Three column widgets layout: Left is "Mes Widgets", Right is Logs & Alert banners */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Mes Widgets (Screen 2 & 3 content) */}
                <div className="lg:col-span-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-white">Mes Widgets</h3>
                    <button
                      onClick={() => setActiveMenu("logo")}
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
                    >
                      Personnaliser +
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Spotify Widget */}
                    <div 
                      onClick={() => setActiveMenu("medias")}
                      className="bg-[#090d1a] border border-emerald-500/20 hover:border-emerald-500/40 p-5 rounded-2xl flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.01]"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
                            <Music className="h-4 w-4" />
                            <span>Spotify</span>
                          </div>
                          <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono font-bold">
                            {isSpotifyPlaying ? "ACTIF" : "PAUSE"}
                          </span>
                        </div>
                        <h4 className="text-white font-bold text-sm truncate">{spotifyTracks[spotifyTrackIndex].title}</h4>
                        <p className="text-slate-400 text-xs mt-1 truncate">{spotifyTracks[spotifyTrackIndex].artist} — Enceinte Salon</p>
                      </div>
                      <div className="flex items-center justify-between border-t border-[#161e35] pt-4 mt-6">
                        <span className="text-[9px] text-slate-500 font-semibold uppercase">Gérer le média →</span>
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={() => {
                              setIsSpotifyPlaying(!isSpotifyPlaying);
                              triggerToast(isSpotifyPlaying ? "Pause" : "Lecture");
                            }} 
                            className="p-1.5 bg-[#050811] border border-[#161e35] hover:border-emerald-500 rounded-lg text-slate-400 hover:text-white"
                          >
                            {isSpotifyPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Weather Widget */}
                    <div className="bg-[#090d1a] border border-blue-500/20 p-5 rounded-2xl flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 text-blue-400 text-xs font-bold mb-3">
                          <CloudSun className="h-4 w-4" />
                          <span>Météo</span>
                        </div>
                        <span className="text-white text-lg font-bold">21°C</span>
                        <p className="text-slate-400 text-xs mt-1">Nuageux · Vent modéré 12km/h</p>
                      </div>
                      <div className="border-t border-[#161e35] pt-4 mt-6 flex justify-between text-[10px] text-slate-500 font-semibold">
                        <span>HUMIDITÉ : 64%</span>
                        <span>PRÉCIPITATIONS : 10%</span>
                      </div>
                    </div>

                    {/* Security Intrusion Status Widget */}
                    <div className="bg-[#090d1a] border border-red-500/20 p-5 rounded-2xl md:col-span-2">
                      <div className="flex items-center justify-between border-b border-[#161e35] pb-3 mb-4">
                        <div className="flex items-center gap-2 text-red-400 text-xs font-bold">
                          <Lock className="h-4 w-4" />
                          <span>Sécurité</span>
                        </div>
                        <span className="bg-red-500/10 text-red-400 text-[10px] font-bold px-2 rounded border border-red-500/20">
                          ÉLEVÉ
                        </span>
                      </div>

                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <span className="text-white text-base font-bold">Surveillance active</span>
                          <span className="text-[10px] text-slate-500 block mt-0.5">Tout est normal dans l'habitation</span>
                        </div>
                        <div className="flex gap-4 text-center font-mono">
                          <div className="px-3 py-1.5 bg-[#050811] border border-[#161e35] rounded-xl">
                            <span className="text-[9px] text-slate-500 block">Événements</span>
                            <span className="text-xs font-bold text-slate-300">0</span>
                          </div>
                          <div className="px-3 py-1.5 bg-[#050811] border border-[#161e35] rounded-xl">
                            <span className="text-[9px] text-slate-500 block">Alertes</span>
                            <span className="text-xs font-bold text-amber-500">18</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 text-[11px] font-mono border-t border-[#161e35] pt-3">
                        <div className="flex items-center gap-2 text-slate-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                          <span className="text-slate-500">14/07 18:25</span>
                          <span>Tentative d'unlock échouée - IP locale</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                          <span className="text-slate-500">14/07 18:22</span>
                          <span>Tentative d'unlock échouée - IP locale</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side Widgets (Screen 2 & 3 right columns) */}
                <div className="lg:col-span-4 space-y-6">
                  {/* Activité Récente Card */}
                  <div className="bg-[#090d1a] border border-[#161e35] p-5 rounded-2xl flex flex-col h-[280px]">
                    <div className="flex items-center justify-between border-b border-[#161e35] pb-3 mb-4">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Activité Récente</h4>
                      <Lock className="h-3.5 w-3.5 text-slate-600" />
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-4 pr-1 font-mono text-[11px]">
                      <div className="relative pl-4 border-l border-indigo-500/30 space-y-1">
                        <span className="absolute left-[-3.5px] top-1 h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
                        <p className="text-slate-200">Connexion locale: {username}</p>
                        <span className="text-[9px] text-slate-500">Aujourd'hui 09:08:26</span>
                      </div>
                      
                      <div className="relative pl-4 border-l border-indigo-500/30 space-y-1">
                        <span className="absolute left-[-3.5px] top-1 h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
                        <p className="text-slate-200">Unlock successful for user: Mat</p>
                        <span className="text-[9px] text-slate-500">Hier 18:25:57</span>
                      </div>

                      <div className="relative pl-4 border-l border-indigo-500/30 space-y-1">
                        <span className="absolute left-[-3.5px] top-1 h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
                        <p className="text-slate-200">Volet Roulant Salon réglé</p>
                        <span className="text-[9px] text-slate-500">Hier 17:15:30</span>
                      </div>
                    </div>
                  </div>

                  {/* Alertes Sécurité Alert Box */}
                  <div className="bg-[#1c1809] border border-amber-500/20 p-4 rounded-xl flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-xs font-bold text-amber-500">Alertes Sécurité</h5>
                      <p className="text-[11px] text-slate-400 mt-1">18 alerte(s) détectée(s) lors du cycle d'analyse.</p>
                    </div>
                  </div>

                  {/* Actions Rapides Buttons */}
                  <div className="bg-[#090d1a] border border-[#161e35] p-5 rounded-2xl">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Actions Rapides</h4>
                    <div className="space-y-2">
                      <button
                        onClick={() => triggerToast("Rapport généré et prêt à l'export.")}
                        className="w-full bg-emerald-950/20 hover:bg-emerald-900/20 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500 py-3 px-4 rounded-xl text-xs font-bold transition-all text-left flex justify-between items-center"
                      >
                        <span>Générer un rapport</span>
                        <ChevronRight className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => triggerToast("Lancement de l'analyse réseau...")}
                        className="w-full bg-teal-950/20 hover:bg-teal-900/20 text-teal-400 border border-teal-500/20 hover:border-teal-500 py-3 px-4 rounded-xl text-xs font-bold transition-all text-left flex justify-between items-center"
                      >
                        <span>Vérifier les services</span>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* MENU VIEW: ZIMAOS DIAGNOSTIC (Highlights specific NVMe vs HDD specs as requested) */}
          {activeMenu === "zimaos" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <HardDrive className="text-indigo-400 h-6 w-6" />
                  <span>Diagnostics ZimaOS Local</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Surveillance du stockage principal et de l'environnement de virtualisation de Mathieu.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* HOST 1: Principal - 192.168.1.3 (1To HDD) */}
                <div className="bg-[#090d1a] border border-[#161e35] p-6 rounded-2xl flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start border-b border-[#161e35] pb-3 mb-4">
                      <div>
                        <h3 className="font-bold text-white text-sm">ZimaOS Principal (Bot Host)</h3>
                        <span className="text-[10px] text-indigo-400 font-mono">IP: 192.168.1.3</span>
                      </div>
                      <span className="bg-indigo-500/10 text-indigo-400 text-[10px] font-mono px-2 py-0.5 rounded border border-indigo-500/20">
                        MAIN UNIT
                      </span>
                    </div>

                    <div className="space-y-4">
                      {/* Storage specs highlighting Mathieu's 1TB HDD! */}
                      <div className="p-4 bg-[#050811] rounded-xl border border-[#131a2e] space-y-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-300 flex items-center gap-1.5">
                            <Disc className="h-4 w-4 text-indigo-400" />
                            HDD de 1To Stockage
                          </span>
                          <span className="text-slate-500 font-mono">41.0% utilisé</span>
                        </div>
                        <div className="w-full bg-[#131a2e] rounded-full h-2 overflow-hidden">
                          <div className="bg-indigo-500 h-full rounded-full" style={{ width: "41%" }}></div>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                          <span>382.4 Go utilisés</span>
                          <span>931.5 Go total</span>
                        </div>
                      </div>

                      {/* Health stats */}
                      <div className="grid grid-cols-2 gap-3 text-center text-xs font-mono">
                        <div className="p-3 bg-[#050811] rounded-xl border border-[#131a2e]">
                          <span className="text-[9px] text-slate-500 block">TEMP DISQUE</span>
                          <span className="text-white font-bold block mt-1">41°C</span>
                        </div>
                        <div className="p-3 bg-[#050811] rounded-xl border border-[#131a2e]">
                          <span className="text-[9px] text-slate-500 block">SANTÉ MATÉRIEL</span>
                          <span className="text-emerald-400 font-bold block mt-1">Parfait</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-[#131a2e] pt-4 mt-6 flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>CPU: Intel Celeron N5105</span>
                    <span>OS: ZimaOS v1.2.4</span>
                  </div>
                </div>

                {/* HOST 2: Stockage & HA - 192.168.1.25 (SSD NVMe + SSD) */}
                <div className="bg-[#090d1a] border border-[#161e35] p-6 rounded-2xl flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start border-b border-[#161e35] pb-3 mb-4">
                      <div>
                        <h3 className="font-bold text-white text-sm">ZimaOS Stockage (NAS & HA)</h3>
                        <span className="text-[10px] text-indigo-400 font-mono">IP: 192.168.1.25</span>
                      </div>
                      <span className="bg-cyan-500/10 text-cyan-400 text-[10px] font-mono px-2 py-0.5 rounded border border-cyan-500/20">
                        NAS & CONTROLLER
                      </span>
                    </div>

                    <div className="space-y-4">
                      {/* Storage specs highlighting Mathieu's SSD NVMe + SSD storage! */}
                      <div className="p-4 bg-[#050811] rounded-xl border border-[#131a2e] space-y-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-300 flex items-center gap-1.5">
                            <HardDrive className="h-4 w-4 text-cyan-400" />
                            SSD NVMe + SSD (Crucial)
                          </span>
                          <span className="text-slate-500 font-mono">30.1% utilisé</span>
                        </div>
                        <div className="w-full bg-[#131a2e] rounded-full h-2 overflow-hidden">
                          <div className="bg-cyan-500 h-full rounded-full" style={{ width: "30.1%" }}></div>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                          <span>842.1 Go utilisés</span>
                          <span>2794.5 Go total (1To NVMe + 2To SSD)</span>
                        </div>
                      </div>

                      {/* Health stats */}
                      <div className="grid grid-cols-2 gap-3 text-center text-xs font-mono">
                        <div className="p-3 bg-[#050811] rounded-xl border border-[#131a2e]">
                          <span className="text-[9px] text-slate-500 block">TEMP NVME</span>
                          <span className="text-white font-bold block mt-1">32°C</span>
                        </div>
                        <div className="p-3 bg-[#050811] rounded-xl border border-[#131a2e]">
                          <span className="text-[9px] text-slate-500 block">DÉBIT LECTURE</span>
                          <span className="text-cyan-400 font-bold block mt-1">520 Mo/s</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-[#131a2e] pt-4 mt-6 flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>CPU: Intel Celeron J4125</span>
                    <span>OS: ZimaOS v1.2.4</span>
                  </div>
                </div>

              </div>

              {/* Disk diagnostic logs simulator */}
              <div className="bg-[#090d1a] border border-[#161e35] p-5 rounded-2xl">
                <div className="flex justify-between items-center border-b border-[#161e35] pb-3 mb-4">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Planificateur de tâches & Diagnostics S.M.A.R.T</h4>
                  <button onClick={() => triggerToast("Rapports d'erreur vides. Tout est sain.")} className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold">
                    Lancer l'analyse complète
                  </button>
                </div>
                <div className="space-y-3 font-mono text-xs text-slate-400">
                  <div className="p-3 bg-[#050811] rounded-xl border border-[#131a2e] flex items-center justify-between">
                    <span>192.168.1.3 (HDD Seagate 1To)</span>
                    <span className="text-emerald-400 font-semibold">[ S.M.A.R.T OK - 0 Bad Sectors ]</span>
                  </div>
                  <div className="p-3 bg-[#050811] rounded-xl border border-[#131a2e] flex items-center justify-between">
                    <span>192.168.1.25 (M.2 NVMe SSD 1To)</span>
                    <span className="text-emerald-400 font-semibold">[ S.M.A.R.T OK - 100% Lifespan Left ]</span>
                  </div>
                  <div className="p-3 bg-[#050811] rounded-xl border border-[#131a2e] flex items-center justify-between">
                    <span>192.168.1.25 (SATA SSD 2To)</span>
                    <span className="text-emerald-400 font-semibold">[ S.M.A.R.T OK - 99% Lifespan Left ]</span>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* MENU VIEW: DOMOTIQUE HOME ASSISTANT */}
          {activeMenu === "domotique" && (
            <div className="space-y-6">
              <div className="flex flex-wrap justify-between items-center gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Home className="text-indigo-400 h-6 w-6" />
                    <span>Contrôle Domotique Home Assistant</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Gérez les lumières, prises, volets et thermostats reliés à votre passerelle locale.
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <div className="bg-[#090d1a] border border-[#161e35] px-4 py-2 rounded-xl text-center">
                    <span className="text-[9px] text-slate-500 block uppercase font-bold">LUMIÈRES ON</span>
                    <span className="text-base font-extrabold text-indigo-400">{activeLights}</span>
                  </div>
                  <div className="bg-[#090d1a] border border-[#161e35] px-4 py-2 rounded-xl text-center">
                    <span className="text-[9px] text-slate-500 block uppercase font-bold">PRISES ACTIVES</span>
                    <span className="text-base font-extrabold text-amber-500">{activeSwitches}</span>
                  </div>
                  <div className="bg-[#090d1a] border border-[#161e35] px-4 py-2 rounded-xl text-center">
                    <span className="text-[9px] text-slate-500 block uppercase font-bold">TEMPÉRATURE</span>
                    <span className="text-base font-extrabold text-cyan-400">{salonTemp}°C</span>
                  </div>
                </div>
              </div>

              {/* Filters Row */}
              <div className="bg-[#090d1a] border border-[#161e35] p-4 rounded-xl flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-semibold">Pièce :</span>
                  <div className="flex gap-1">
                    {rooms.map((room) => (
                      <button
                        key={room}
                        onClick={() => setDeviceFilterRoom(room)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                          deviceFilterRoom === room
                            ? "bg-indigo-600 text-white"
                            : "bg-[#050811] border border-[#161e35] text-slate-400 hover:text-white"
                        }`}
                      >
                        {room}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-semibold">Type :</span>
                  <div className="flex gap-1">
                    {types.map((t) => (
                      <button
                        key={t}
                        onClick={() => setDeviceFilterType(t)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                          deviceFilterType === t
                            ? "bg-indigo-600 text-white"
                            : "bg-[#050811] border border-[#161e35] text-slate-400 hover:text-white"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Devices Grid list */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Salon LED */}
                <div className="bg-[#090d1a] border border-[#161e35] p-5 rounded-2xl space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                        <Lightbulb className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-xs">LED Salon</h4>
                        <span className="text-[10px] text-slate-500 block">Salon · Lumière</span>
                      </div>
                    </div>
                    <button
                      onClick={() => controlDevice("light.salon_led", "toggle")}
                      className="bg-[#050811] border border-[#161e35] hover:border-indigo-500 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all text-slate-400"
                    >
                      Basculer
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Luminosité</span>
                    <span className="font-mono text-white">85%</span>
                  </div>
                  <div className="w-full bg-[#131a2e] rounded-full h-1.5">
                    <div className="bg-indigo-500 h-full rounded-full" style={{ width: "85%" }}></div>
                  </div>
                </div>

                {/* Volet Roulant Salon */}
                <div className="bg-[#090d1a] border border-[#161e35] p-5 rounded-2xl space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                        <SlidersHorizontal className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-xs">Volet Roulant</h4>
                        <span className="text-[10px] text-slate-500 block">Salon · Volet</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => controlDevice("cover.salon_volet", "open_cover")}
                      className="flex-1 bg-[#050811] border border-[#161e35] hover:border-indigo-500 hover:text-white py-2 rounded-xl text-xs font-bold transition-all text-slate-400"
                    >
                      Ouvrir
                    </button>
                    <button
                      onClick={() => controlDevice("cover.salon_volet", "close_cover")}
                      className="flex-1 bg-[#050811] border border-[#161e35] hover:border-indigo-500 hover:text-white py-2 rounded-xl text-xs font-bold transition-all text-slate-400"
                    >
                      Fermer
                    </button>
                  </div>
                </div>

                {/* Thermostat Salon */}
                <div className="bg-[#090d1a] border border-[#161e35] p-5 rounded-2xl space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                        <Thermometer className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-xs">Thermostat</h4>
                        <span className="text-[10px] text-slate-500 block">Salon · Climat</span>
                      </div>
                    </div>
                    <span className="text-white font-mono font-bold text-sm bg-[#050811] border border-[#161e35] px-2 py-0.5 rounded">
                      {salonTemp}°C
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => triggerToast("Température réglée à 21.5°C")}
                      className="flex-1 bg-[#050811] border border-[#161e35] hover:border-indigo-500 hover:text-white py-2 rounded-xl text-xs font-bold transition-all text-slate-400"
                    >
                      Chauffer (+0.5°C)
                    </button>
                  </div>
                </div>

                {/* Prise Cafetière */}
                <div className="bg-[#090d1a] border border-[#161e35] p-5 rounded-2xl space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                        <Power className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-xs">Cafetière</h4>
                        <span className="text-[10px] text-slate-500 block">Cuisine · Prise</span>
                      </div>
                    </div>
                    <button
                      onClick={() => controlDevice("switch.cafetiere", "toggle")}
                      className="bg-[#050811] border border-[#161e35] hover:border-indigo-500 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all text-slate-400"
                    >
                      Bouton
                    </button>
                  </div>
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>État :</span>
                    <span className="font-bold text-red-400">DÉSACTIVÉ</span>
                  </div>
                </div>

                {/* Caméra Entrée Live simulation */}
                <div className="bg-[#090d1a] border border-[#161e35] p-5 rounded-2xl md:col-span-2 space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Video className="h-5 w-5 text-indigo-400" />
                      <span className="font-bold text-white text-xs">Caméra Allée & Entrée</span>
                    </div>
                    <span className="bg-red-500/15 text-red-400 text-[10px] font-bold px-2 rounded-md border border-red-500/20">
                      LIVE · 15 FPS
                    </span>
                  </div>

                  <div className="h-44 bg-slate-950 border border-[#161e35] rounded-xl relative overflow-hidden flex items-center justify-center">
                    {/* Simulated visual video scanline stream */}
                    <div className="absolute inset-0 bg-gradient-to-t from-transparent via-indigo-950/20 to-transparent pointer-events-none"></div>
                    <div className="absolute top-2 left-2 text-[10px] text-slate-500 font-mono">
                      CAM_01 · {dateStr}
                    </div>
                    <span className="text-slate-600 text-xs font-semibold uppercase flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-slate-700 animate-pulse"></span>
                      Aucun mouvement suspect détecté
                    </span>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* MENU VIEW: SPOTIFY & FIRESTICK TV */}
          {activeMenu === "medias" && (
            <div className="space-y-6">
              
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Tv className="text-indigo-400 h-6 w-6" />
                  <span>Médias & Divertissement de Mathieu</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Contrôlez votre clé FireStick TV et gérez la lecture musicale Spotify de la maison connectée.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* COLUMN 1: SPOTIFY PLAYER */}
                <div className="lg:col-span-7 bg-[#090d1a] border border-emerald-500/20 p-6 rounded-2xl flex flex-col justify-between space-y-6 relative overflow-hidden shadow-[0_0_20px_rgba(16,185,129,0.05)]">
                  {/* Neon Glow effect background */}
                  <div className="absolute top-0 right-0 h-44 w-44 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
                  
                  <div className="flex justify-between items-start border-b border-[#161e35] pb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400">
                        <Music className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-sm">Spotify Connect</h3>
                        <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">Enceinte Salon · Active</span>
                      </div>
                    </div>
                    <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-500/20 font-mono">
                      {isSpotifyPlaying ? "EN LECTURE" : "EN PAUSE"}
                    </span>
                  </div>

                  {/* Player Body with Song Info and Rotating Disc Visual */}
                  <div className="flex flex-col sm:flex-row items-center gap-6 py-4">
                    {/* Glowing CD Cover Representation */}
                    <div className="relative shrink-0">
                      <div className={`w-28 h-28 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-700 p-1 shadow-[0_0_25px_rgba(16,185,129,0.2)] flex items-center justify-center relative ${isSpotifyPlaying ? "animate-[spin_10s_linear_infinite]" : ""}`}>
                        <div className="w-full h-full rounded-full bg-[#050811] flex items-center justify-center">
                          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                            <span className="text-emerald-400 text-xs font-bold font-mono">N</span>
                          </div>
                        </div>
                        {/* CD center hole */}
                        <div className="absolute w-4 h-4 bg-[#090d1a] border border-[#161e35] rounded-full top-12 left-12"></div>
                      </div>
                      <div className="absolute bottom-0 right-0 bg-emerald-500 p-1.5 rounded-full border border-[#090d1a] shadow-lg">
                        <Music className="h-3 w-3 text-black" />
                      </div>
                    </div>

                    <div className="text-center sm:text-left flex-1 space-y-2">
                      <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-widest block">Lecture en cours</span>
                      <h4 className="text-lg font-extrabold text-white leading-tight">
                        {spotifyTracks[spotifyTrackIndex].title}
                      </h4>
                      <p className="text-xs text-slate-400 font-medium">
                        {spotifyTracks[spotifyTrackIndex].artist}
                      </p>
                      <div className="pt-2 flex flex-wrap gap-1.5 justify-center sm:justify-start">
                        <span className="text-[9px] bg-[#161e35] text-slate-300 font-bold px-2 py-0.5 rounded-md border border-[#1e2d54]">
                          320 Kbps AAC
                        </span>
                        <span className="text-[9px] bg-[#161e35] text-slate-300 font-bold px-2 py-0.5 rounded-md border border-[#1e2d54]">
                          Stéréo HD
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1.5">
                    <div 
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickX = e.clientX - rect.left;
                        const percentage = clickX / rect.width;
                        const newProgress = Math.floor(percentage * spotifyTracks[spotifyTrackIndex].duration);
                        setSpotifyTrackProgress(newProgress);
                        triggerToast(`Position réglée à ${formatTime(newProgress)}`);
                      }}
                      className="w-full bg-[#0c1224] border border-[#131a2e] rounded-full h-2 cursor-pointer relative overflow-hidden"
                    >
                      <div 
                        className="bg-emerald-500 h-full rounded-full transition-all"
                        style={{ width: `${(spotifyTrackProgress / spotifyTracks[spotifyTrackIndex].duration) * 100}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500 font-semibold font-mono">
                      <span>{formatTime(spotifyTrackProgress)}</span>
                      <span>{formatTime(spotifyTracks[spotifyTrackIndex].duration)}</span>
                    </div>
                  </div>

                  {/* Playback Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-[#161e35]">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => {
                          const prevIdx = (spotifyTrackIndex - 1 + spotifyTracks.length) % spotifyTracks.length;
                          setSpotifyTrackIndex(prevIdx);
                          setSpotifyTrackProgress(0);
                          triggerToast("Piste précédente");
                        }}
                        className="p-2.5 bg-[#050811] border border-[#161e35] hover:border-emerald-500 rounded-xl text-slate-400 hover:text-white transition-all"
                        title="Précédent"
                      >
                        <SkipForward className="h-4 w-4 transform rotate-180" />
                      </button>

                      <button 
                        onClick={() => {
                          setIsSpotifyPlaying(!isSpotifyPlaying);
                          triggerToast(isSpotifyPlaying ? "Musique mise en pause" : "Musique reprise");
                        }}
                        className="p-3 bg-emerald-500 hover:bg-emerald-600 rounded-xl text-black font-extrabold transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                        title={isSpotifyPlaying ? "Pause" : "Lecture"}
                      >
                        {isSpotifyPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-black" />}
                      </button>

                      <button 
                        onClick={() => {
                          const nextIdx = (spotifyTrackIndex + 1) % spotifyTracks.length;
                          setSpotifyTrackIndex(nextIdx);
                          setSpotifyTrackProgress(0);
                          triggerToast("Piste suivante");
                        }}
                        className="p-2.5 bg-[#050811] border border-[#161e35] hover:border-emerald-500 rounded-xl text-slate-400 hover:text-white transition-all"
                        title="Suivant"
                      >
                        <SkipForward className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Volume setting */}
                    <div className="flex items-center gap-2 min-w-[140px] flex-1 sm:flex-initial">
                      <Volume2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      <input 
                        type="range"
                        min="0"
                        max="100"
                        value={spotifyVolume}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setSpotifyVolume(val);
                        }}
                        className="w-full h-1 bg-[#131a2e] rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      />
                      <span className="text-[10px] text-slate-400 font-mono font-bold w-6 text-right shrink-0">{spotifyVolume}%</span>
                    </div>
                  </div>

                </div>

                {/* COLUMN 2: FIRESTICK TV REMOTE CONTROL */}
                <div className="lg:col-span-5 bg-[#090d1a] border border-indigo-500/20 p-6 rounded-2xl flex flex-col justify-between space-y-6 relative overflow-hidden shadow-[0_0_20px_rgba(99,102,241,0.05)]">
                  
                  {/* Header Title with Power Toggle */}
                  <div className="flex justify-between items-center border-b border-[#161e35] pb-4">
                    <div className="flex items-center gap-2">
                      <Tv className="h-5 w-5 text-indigo-400" />
                      <h3 className="font-bold text-white text-sm">Télécommande FireStick</h3>
                    </div>
                    <button 
                      onClick={() => {
                        setIsFirestickOn(!isFirestickOn);
                        triggerToast(isFirestickOn ? "Clé FireStick éteinte" : "Clé FireStick allumée");
                      }}
                      className={`p-2 rounded-full border transition-all ${isFirestickOn ? "bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/20"}`}
                      title={isFirestickOn ? "Éteindre" : "Allumer"}
                    >
                      <Power className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Remote Status Dashboard */}
                  <div className="p-3 bg-[#050811] rounded-xl border border-[#131a2e] flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[9px] text-slate-500 block font-semibold uppercase">Application Active</span>
                      <span className="font-bold text-white block mt-0.5">
                        {isFirestickOn ? activeFirestickApp : "Système Éteint"}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-slate-500 block font-semibold uppercase">Statut Clé TV</span>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full inline-block mt-0.5 ${isFirestickOn ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" : "bg-slate-500/15 text-slate-500 border border-slate-500/20"}`}>
                        {isFirestickOn ? "CONNECTÉ (.1.30)" : "HORS LIGNE"}
                      </span>
                    </div>
                  </div>

                  {/* Hot App Launcher Keys */}
                  <div className="space-y-2">
                    <span className="text-[9px] text-slate-500 block font-bold uppercase tracking-wider">Lancement d'Applications</span>
                    <div className="grid grid-cols-2 gap-2">
                      {["YouTube", "Netflix", "Disney+", "Prime Video"].map((app) => (
                        <button
                          key={app}
                          disabled={!isFirestickOn}
                          onClick={() => {
                            setActiveFirestickApp(app);
                            triggerToast(`Lancement de ${app} sur la FireStick...`);
                          }}
                          className={`py-2 px-3 rounded-xl border text-xs font-bold text-slate-300 transition-all text-center ${
                            !isFirestickOn
                              ? "border-[#131a2e] text-slate-600 bg-transparent cursor-not-allowed"
                              : activeFirestickApp === app
                                ? "bg-indigo-600/20 border-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.2)]"
                                : "bg-[#050811] border-[#161e35] hover:border-indigo-500 hover:text-white"
                          }`}
                        >
                          {app}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Circular D-Pad Control interface */}
                  <div className="flex flex-col items-center justify-center py-2">
                    <div className="relative w-36 h-36 rounded-full bg-[#050811] border border-[#1a264a] flex items-center justify-center shadow-lg">
                      
                      {/* UP button */}
                      <button 
                        disabled={!isFirestickOn}
                        onClick={() => triggerToast("FireStick : Bouton Haut")}
                        className="absolute top-1 left-12 right-12 h-8 text-slate-500 hover:text-white flex justify-center items-center rounded-t-full transition-all disabled:opacity-30"
                      >
                        <span className="text-xs">▲</span>
                      </button>

                      {/* DOWN button */}
                      <button 
                        disabled={!isFirestickOn}
                        onClick={() => triggerToast("FireStick : Bouton Bas")}
                        className="absolute bottom-1 left-12 right-12 h-8 text-slate-500 hover:text-white flex justify-center items-center rounded-b-full transition-all disabled:opacity-30"
                      >
                        <span className="text-xs">▼</span>
                      </button>

                      {/* LEFT button */}
                      <button 
                        disabled={!isFirestickOn}
                        onClick={() => triggerToast("FireStick : Bouton Gauche")}
                        className="absolute left-1 top-12 bottom-12 w-8 text-slate-500 hover:text-white flex justify-center items-center rounded-l-full transition-all disabled:opacity-30"
                      >
                        <span className="text-xs">◀</span>
                      </button>

                      {/* RIGHT button */}
                      <button 
                        disabled={!isFirestickOn}
                        onClick={() => triggerToast("FireStick : Bouton Droite")}
                        className="absolute right-1 top-12 bottom-12 w-8 text-slate-500 hover:text-white flex justify-center items-center rounded-r-full transition-all disabled:opacity-30"
                      >
                        <span className="text-xs">▶</span>
                      </button>

                      {/* CENTRAL SELECT BUTTON */}
                      <button 
                        disabled={!isFirestickOn}
                        onClick={() => triggerToast("FireStick : Bouton Sélectionner (OK)")}
                        className="w-16 h-16 rounded-full bg-[#0d152a] border border-[#1e2d5c] hover:border-indigo-500 flex items-center justify-center font-bold text-xs text-white shadow-md active:scale-95 transition-all disabled:opacity-40"
                      >
                        OK
                      </button>

                    </div>
                  </div>

                  {/* Core TV actions row */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs border-t border-[#161e35] pt-4">
                    <button 
                      disabled={!isFirestickOn}
                      onClick={() => {
                        setActiveFirestickApp("Home");
                        triggerToast("Retour au menu d'accueil FireStick");
                      }}
                      className="py-2 bg-[#050811] hover:bg-[#0c1224] border border-[#161e35] text-slate-400 hover:text-white rounded-xl font-bold transition-all disabled:opacity-30"
                    >
                      MENU
                    </button>
                    <button 
                      disabled={!isFirestickOn}
                      onClick={() => triggerToast("Action Retour")}
                      className="py-2 bg-[#050811] hover:bg-[#0c1224] border border-[#161e35] text-slate-400 hover:text-white rounded-xl font-bold transition-all disabled:opacity-30"
                    >
                      RETOUR
                    </button>
                    <button 
                      disabled={!isFirestickOn}
                      onClick={() => triggerToast("Action Home")}
                      className="py-2 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 hover:border-indigo-500 text-indigo-400 hover:text-white rounded-xl font-bold transition-all disabled:opacity-30"
                    >
                      ACCUEIL
                    </button>
                  </div>

                </div>

              </div>

            </div>
          )}

          {/* MENU VIEW: DISCORD BOT TERMINAL */}
          {activeMenu === "discord" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Terminal className="text-indigo-400 h-6 w-6" />
                  <span>Terminal Console du Bot Discord</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Pilotez votre infrastructure à distance. Saisissez des commandes Discord à exécuter.
                </p>
              </div>

              {/* Bot KPI Banner */}
              <div className="bg-[#090d1a] border border-[#161e35] p-5 rounded-2xl grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#050811] p-3 rounded-xl border border-[#131a2e]">
                  <span className="text-[10px] text-slate-500 block font-semibold uppercase">Nom du Bot</span>
                  <span className="text-sm font-bold text-white block mt-1">NEXUS BOT</span>
                </div>
                <div className="bg-[#050811] p-3 rounded-xl border border-[#131a2e]">
                  <span className="text-[10px] text-slate-500 block font-semibold uppercase">Latence (Ping)</span>
                  <span className="text-sm font-bold text-emerald-400 block mt-1">
                    {systemStats?.discordBot.ping || 18}ms
                  </span>
                </div>
                <div className="bg-[#050811] p-3 rounded-xl border border-[#131a2e]">
                  <span className="text-[10px] text-slate-500 block font-semibold uppercase">Commandes Gérées</span>
                  <span className="text-sm font-bold text-white block mt-1">489</span>
                </div>
                <div className="bg-[#050811] p-3 rounded-xl border border-[#131a2e]">
                  <span className="text-[10px] text-slate-500 block font-semibold uppercase">Serveurs (Guilds)</span>
                  <span className="text-sm font-bold text-white block mt-1">3</span>
                </div>
              </div>

              {/* Terminal Screen Block */}
              <div className="bg-[#030509] border border-[#161e35] rounded-2xl overflow-hidden flex flex-col h-[400px]">
                <div className="bg-[#090d1a] px-4 py-2 flex justify-between items-center text-xs text-slate-400 border-b border-[#161e35]">
                  <span className="font-bold flex items-center gap-1.5 font-mono">
                    <span className="text-indigo-400 font-extrabold">&gt;_</span> CONSOLE TERMINAL
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTerminalLogs([])}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                    >
                      Effacer
                    </button>
                  </div>
                </div>

                {/* Console Log stream */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs text-slate-300">
                  {terminalLogs.map((log, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between text-slate-500 text-[10px]">
                        <span>[ {log.sender} ]</span>
                        <span>{log.time}</span>
                      </div>
                      <p className="whitespace-pre-wrap pl-3 border-l border-indigo-500/20 text-indigo-100">{log.text}</p>
                    </div>
                  ))}
                </div>

                {/* Prompt command line form */}
                <form onSubmit={handleSendTerminal} className="p-3 bg-[#090d1a] border-t border-[#161e35] flex gap-2">
                  <span className="text-slate-500 font-bold self-center font-mono pl-2">&gt;</span>
                  <input
                    type="text"
                    value={terminalInput}
                    onChange={(e) => setTerminalInput(e.target.value)}
                    placeholder="Saisir /help pour lister les commandes du Bot..."
                    className="flex-1 bg-transparent border-none text-xs font-mono focus:outline-none focus:ring-0 text-white"
                  />
                  <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-xl">
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>

            </div>
          )}

          {/* MENU VIEW: LOGO CONFIGURATOR (Matches Screen 5) */}
          {activeMenu === "logo" && (
            <div className="space-y-6">
              
              <div className="flex justify-between items-center border-b border-[#131a2e] pb-3">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Sliders className="text-indigo-400 h-6 w-6" />
                    <span>Configurateur Visuel Logo</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Personnalisez le logo de votre système de manière interactive.
                  </p>
                </div>
                <span className="bg-[#1c284d] text-indigo-300 text-[10px] font-bold px-3 py-1 rounded-full border border-indigo-500/20">
                  Aperçu en temps réel
                </span>
              </div>

              {/* Two Column Creator Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Left Side Options Selectors */}
                <div className="lg:col-span-8 space-y-6">
                  
                  {/* Option 1: Colors selection (Matches Screen 5 Color Options grid) */}
                  <div className="space-y-3">
                    <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">Couleur</span>
                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                      {["Indigo", "Violet", "Cyan", "Émeraude", "Rose", "Ambre", "Blanc", "Pink", "Orange", "Lime", "Teal", "Or", "Rouge", "Ciel"].map((col) => (
                        <button
                          key={col}
                          onClick={() => {
                            setLogoColor(col);
                            triggerToast(`Couleur modifiée: ${col}`);
                          }}
                          className={`p-3 rounded-xl text-center text-[11px] font-semibold transition-all relative ${
                            logoColor === col
                              ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-[#050811] scale-105"
                              : ""
                          } ${getColorClass(col)}`}
                        >
                          {logoColor === col && (
                            <span className="absolute top-1 right-1 h-1.5 w-1.5 bg-white rounded-full"></span>
                          )}
                          <span className="block truncate">{col}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Option 2: Fonts selection */}
                  <div className="space-y-3">
                    <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">Police de caractère</span>
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                      {["Défaut", "Serif", "Mono", "Impact", "Italic", "Display"].map((f) => (
                        <button
                          key={f}
                          onClick={() => {
                            setLogoFont(f);
                            triggerToast(`Police modifiée: ${f}`);
                          }}
                          className={`p-4 bg-[#090d1a] border rounded-xl text-center transition-all ${
                            logoFont === f
                              ? "border-indigo-500 text-white shadow-sm shadow-indigo-500/20 font-bold"
                              : "border-[#161e35] text-slate-400 hover:text-slate-200 hover:bg-[#0c1224]"
                          }`}
                        >
                          <span className={`block text-lg mb-1 ${getFontFamilyClass(f)}`}>N</span>
                          <span className="text-[10px] block font-medium">{f}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Option 3: Visual Effect */}
                  <div className="space-y-3">
                    <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">Effet visuel</span>
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                      {["Glow", "Néon", "Gradient", "Contour", "Hologramme", "Simple"].map((eff) => (
                        <button
                          key={eff}
                          onClick={() => {
                            setLogoEffect(eff);
                            triggerToast(`Effet visuel modifié: ${eff}`);
                          }}
                          className={`p-4 bg-[#090d1a] border rounded-xl text-center transition-all ${
                            logoEffect === eff
                              ? "border-indigo-500 text-white shadow-sm shadow-indigo-500/20 font-bold"
                              : "border-[#161e35] text-slate-400 hover:text-slate-200 hover:bg-[#0c1224]"
                          }`}
                        >
                          <div className="w-10 h-10 mx-auto rounded-lg bg-indigo-950 flex items-center justify-center font-bold text-indigo-400 mb-2">
                            N
                          </div>
                          <span className="text-[10px] block font-bold capitalize">{eff}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Option 4: Container Shape */}
                  <div className="space-y-3">
                    <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">Forme du conteneur</span>
                    <div className="grid grid-cols-3 gap-3">
                      {["Arrondi", "Carré", "Cercle"].map((sh) => (
                        <button
                          key={sh}
                          onClick={() => {
                            setLogoShape(sh);
                            triggerToast(`Forme modifiée: ${sh}`);
                          }}
                          className={`p-4 bg-[#090d1a] border rounded-xl text-center transition-all ${
                            logoShape === sh
                              ? "border-indigo-500 text-white shadow-sm shadow-indigo-500/20 font-bold"
                              : "border-[#161e35] text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          <span className="text-xs block font-bold">{sh}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Right Side Live Preview Window (Matches Screen 5 Preview Block) */}
                <div className="lg:col-span-4 space-y-6">
                  <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">Aperçu</span>
                  
                  <div className="bg-[#090d1a] border border-[#161e35] p-8 rounded-2xl flex flex-col items-center justify-center min-h-[300px] text-center shadow-lg relative overflow-hidden">
                    {/* Animated dynamic customizable preview card block */}
                    <div
                      style={getEffectStyle(logoEffect, logoColor)}
                      className={`w-20 h-20 ${getShapeClass(logoShape)} ${getEffectClass(logoEffect)} ${getColorClass(logoColor)} flex items-center justify-center font-black text-3xl shadow-xl transition-all duration-300`}
                    >
                      <span className={getFontFamilyClass(logoFont)}>N</span>
                    </div>

                    <h4 className="text-lg font-extrabold text-white mt-6 uppercase tracking-widest">NEXUS</h4>
                    
                    <div className="mt-6 pt-6 border-t border-[#131a2e] w-full space-y-2 text-left text-xs text-slate-400 font-mono">
                      <div className="flex justify-between">
                        <span>Couleur:</span>
                        <span className="text-white font-bold">{logoColor}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Police:</span>
                        <span className="text-white font-bold">{logoFont}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Effet:</span>
                        <span className="text-white font-bold">{logoEffect}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Forme:</span>
                        <span className="text-white font-bold">{logoShape}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      triggerToast("Configuration sauvegardée localement.");
                    }}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl text-xs font-bold transition-all shadow-md"
                  >
                    Appliquer globalement
                  </button>
                </div>

              </div>

            </div>
          )}

          {/* MENU VIEW: BOOT ANIMATION PICKER (Matches Screen 6) */}
          {activeMenu === "boot" && (
            <div className="space-y-6">
              
              <div className="border-b border-[#131a2e] pb-3">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <RefreshCw className="text-indigo-400 h-6 w-6" />
                  <span>Animation de démarrage</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Sélectionnez l'effet d'animation à afficher à chaque initialisation de NEXUS PANEL.
                </p>
              </div>

              {/* Slider Show boot toggle (Matches Screen 6 Switch slider) */}
              <div className="bg-[#090d1a] border border-[#161e35] p-5 rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-sm">Afficher l'animation de démarrage</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Si désactivée, l'application s'ouvre directement.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setShowBootOnStart(!showBootOnStart);
                    triggerToast(`L'animation de boot est désormais ${!showBootOnStart ? 'activée' : 'désactivée'}.`);
                  }}
                  className={`w-12 h-6 rounded-full p-1 transition-all ${
                    showBootOnStart ? "bg-indigo-600" : "bg-slate-800"
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full transition-all ${
                      showBootOnStart ? "translate-x-6" : "translate-x-0"
                    }`}
                  ></div>
                </button>
              </div>

              {/* Animation Options Grid (Matches Screen 6) */}
              <div className="space-y-4">
                <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">
                  Styles d'animations de Boot
                </span>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    "Nexus", "iOS", "Windows", "Minimal", "Netflix", "Matrix", "Void",
                    "Apple", "HUD", "Aurora", "Glitch", "Rétro", "TikTok", "Sakura",
                    "Storm", "Or", "Feu", "Glace", "Hologramme", "Glitch RGB", "Radar", "DNA"
                  ].map((anim) => (
                    <button
                      key={anim}
                      onClick={() => {
                        setBootAnimation(anim);
                        triggerToast(`Style de boot sélectionné: ${anim}`);
                        // Trigger immediate temporary preview test
                        setIsBooting(true);
                        setBootProgress(0);
                        setTimeout(() => setIsBooting(false), 2000);
                      }}
                      className={`p-3 bg-[#090d1a] border rounded-2xl text-left transition-all flex flex-col justify-between h-auto relative ${
                        bootAnimation === anim
                          ? "border-indigo-500 ring-2 ring-indigo-500/20"
                          : "border-[#161e35] hover:border-slate-500"
                      }`}
                    >
                      {/* Visual style thumbnail image */}
                      {renderBootPreviewThumbnail(anim)}

                      <div className="flex justify-between items-center w-full mt-1">
                        <span className="text-xs font-bold text-white capitalize">{anim}</span>
                        {bootAnimation === anim && (
                          <span className="h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_8px_#6366f1]"></span>
                        )}
                      </div>
                      
                      <p className="text-[10px] text-slate-500 mt-1 leading-tight font-medium h-[32px] overflow-hidden">
                        {anim === "Matrix" && "Japonaise style terminal"}
                        {anim === "iOS" && "Sleek Apple smartphone style"}
                        {anim === "Windows" && "Chargement Windows 11"}
                        {anim === "Netflix" && "Cinéma rouge intense"}
                        {anim === "Storm" && "Intensité foudroyante"}
                        {anim === "Void" && "Trou noir cosmique"}
                        {anim === "Minimal" && "Chargement discret"}
                        {anim !== "Matrix" && anim !== "iOS" && anim !== "Windows" && anim !== "Netflix" && anim !== "Storm" && anim !== "Void" && anim !== "Minimal" && `Effet de style ${anim}`}
                      </p>

                      <span className="text-[9px] text-indigo-400 hover:underline font-bold mt-2 cursor-pointer block">
                        Aperçu live &gt;
                      </span>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* MENU VIEW: PROFILE & PERSONAL INFO SETTINGS (Matches Screen 7) */}
          {activeMenu === "profile" && (
            <div className="space-y-6">
              
              <div className="border-b border-[#131a2e] pb-3">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <User className="text-indigo-400 h-6 w-6" />
                  <span>Profil & Informations Personnelles</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Configurez vos accès, identifiants, mot de passe et sécurité double facteur.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Left side profile picture block */}
                <div className="lg:col-span-4 bg-[#090d1a] border border-[#161e35] p-6 rounded-2xl flex flex-col items-center text-center">
                  <div className="w-24 h-24 rounded-full bg-indigo-600 flex items-center justify-center text-white text-4xl font-extrabold shadow-[0_0_25px_rgba(99,102,241,0.3)] mb-4">
                    {username.charAt(0).toUpperCase()}
                  </div>
                  
                  <h3 className="text-base font-bold text-white">{username}</h3>
                  <span className="text-xs text-slate-500 font-medium block mt-1">Administrateur</span>
                  <span className="text-[10px] text-slate-600 font-mono block">{email}</span>

                  <div className="mt-4 pt-4 border-t border-[#131a2e] w-full text-left space-y-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 font-medium">Statut du compte :</span>
                      <span className="text-emerald-400 font-bold">Vérifié</span>
                    </div>
                  </div>

                  <button
                    onClick={() => triggerToast("Téléchargement d'avatar non implémenté.")}
                    className="w-full mt-6 bg-[#0c1224] hover:bg-[#161f38] border border-[#161e35] text-slate-300 py-2 rounded-xl text-xs font-bold transition-all"
                  >
                    Changer la photo
                  </button>
                </div>

                {/* Right side form fields (Matches Screen 7) */}
                <div className="lg:col-span-8 space-y-6">
                  
                  {/* Card: Personal info */}
                  <div className="bg-[#090d1a] border border-[#161e35] p-6 rounded-2xl space-y-4">
                    <h4 className="text-sm font-bold text-white">Informations Personnelles</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs text-slate-400">Nom d'utilisateur</label>
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="w-full bg-[#050811] border border-[#161e35] rounded-xl py-3 px-4 text-xs font-sans text-white focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs text-slate-400">Adresse Email</label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-[#050811] border border-[#161e35] rounded-xl py-3 px-4 text-xs font-sans text-white focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        onClick={() => triggerToast("Informations personnelles enregistrées.")}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-6 rounded-xl text-xs transition-colors"
                      >
                        Sauvegarder
                      </button>
                    </div>
                  </div>

                  {/* Card: Passwords */}
                  <div className="bg-[#090d1a] border border-[#161e35] p-6 rounded-2xl space-y-4">
                    <h4 className="text-sm font-bold text-white">Sécurité & Mot de passe</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs text-slate-400">Mot de passe actuel</label>
                        <input
                          type="password"
                          value={userPassword}
                          onChange={(e) => setUserPassword(e.target.value)}
                          className="w-full bg-[#050811] border border-[#161e35] rounded-xl py-3 px-4 text-xs font-sans text-white focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs text-slate-400">Nouveau mot de passe</label>
                        <input
                          type="password"
                          placeholder="••••••••"
                          className="w-full bg-[#050811] border border-[#161e35] rounded-xl py-3 px-4 text-xs font-sans text-white focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        onClick={() => triggerToast("Mot de passe mis à jour avec succès.")}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl text-xs transition-colors"
                      >
                        Mettre à jour le mot de passe
                      </button>
                    </div>
                  </div>

                  {/* Card: Discord 2FA */}
                  <div className="bg-[#090d1a] border border-[#161e35] p-6 rounded-2xl space-y-4">
                    <h4 className="text-sm font-bold text-white">Discord 2FA</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Configurez votre ID Discord pour recevoir des codes de vérification par DM lors de connexions inhabituelles.
                    </p>

                    <div className="flex gap-3">
                      <input
                        type="text"
                        placeholder="ex. 123456789012345678"
                        className="flex-1 bg-[#050811] border border-[#161e35] rounded-xl py-3 px-4 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        onClick={() => triggerToast("2FA lié à Discord.")}
                        className="bg-[#0c1224] hover:bg-[#161f38] border border-[#161e35] text-slate-300 py-3 px-6 rounded-xl text-xs font-bold transition-all"
                      >
                        Lier le compte
                      </button>
                    </div>
                  </div>

                </div>

              </div>

            </div>
          )}

          {/* MENU VIEW: AGENDA */}
          {activeMenu === "agenda" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Calendar className="text-indigo-400 h-6 w-6" />
                  <span>Agenda de Mathieu</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">Gérez votre emploi du temps et rappels domotiques.</p>
              </div>

              <div className="bg-[#090d1a] border border-[#161e35] p-6 rounded-2xl space-y-4">
                <div className="flex justify-between items-center border-b border-[#161e35] pb-3 mb-4">
                  <h3 className="text-sm font-bold text-white">Rendez-vous à venir</h3>
                  <button onClick={() => triggerToast("Rendez-vous ajouté.")} className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold">+ Ajouter</button>
                </div>
                
                <div className="space-y-3">
                  <div className="p-4 bg-[#050811] rounded-xl border border-[#131a2e] flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-indigo-400 font-mono uppercase block font-bold">15 Juillet · 14:00</span>
                      <span className="text-xs font-bold text-white">Maintenance Serveur ZimaOS Principal</span>
                    </div>
                    <span className="text-xs text-slate-500 font-medium font-mono">[ Rappel DM ]</span>
                  </div>

                  <div className="p-4 bg-[#050811] rounded-xl border border-[#131a2e] flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-indigo-400 font-mono uppercase block font-bold">18 Juillet · 10:30</span>
                      <span className="text-xs font-bold text-white">Mise à jour firmware de la passerelle Home Assistant</span>
                    </div>
                    <span className="text-xs text-slate-500 font-medium font-mono">[ Rappel Vocal ]</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MENU VIEW: NOTES */}
          {activeMenu === "notes" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <FileText className="text-indigo-400 h-6 w-6" />
                  <span>Notes & Mémos</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">Stockez vos idées, commandes importantes et listes locales.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#090d1a] border border-[#161e35] p-6 rounded-2xl space-y-4">
                  <h3 className="text-sm font-bold text-white">Aide mémoire commandes ZimaOS</h3>
                  <p className="text-xs text-slate-400 leading-relaxed font-mono whitespace-pre-wrap bg-[#050811] p-4 rounded-xl border border-[#131a2e]">
                    {`# Connexion locale SSH:\nssh root@192.168.1.3\n\n# Redémarrer container Home Assistant:\ndocker restart homeassistant\n\n# Backup disk stockage:\nrsync -avz --progress /mnt/ssd_nvme_storage /mnt/backup_external`}
                  </p>
                </div>

                <div className="bg-[#090d1a] border border-[#161e35] p-6 rounded-2xl flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white mb-2">Note Rapide</h3>
                    <textarea
                      placeholder="Saisir vos mémos ou idées de configuration ici..."
                      className="w-full h-32 bg-[#050811] border border-[#161e35] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <button
                    onClick={() => triggerToast("Note enregistrée avec succès.")}
                    className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-xs font-bold"
                  >
                    Enregistrer la note
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MENU VIEW: TACHES */}
          {activeMenu === "taches" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <CheckSquare className="text-indigo-400 h-6 w-6" />
                  <span>Tâches Système</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">Suivi des tâches de maintenance de votre maison connectée.</p>
              </div>

              <div className="bg-[#090d1a] border border-[#161e35] p-6 rounded-2xl space-y-4">
                <div className="flex justify-between items-center border-b border-[#161e35] pb-3 mb-4">
                  <h3 className="text-sm font-bold text-white">Liste des tâches</h3>
                  <button onClick={() => triggerToast("Tâche ajoutée.")} className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold">+ Ajouter</button>
                </div>

                <div className="space-y-3 text-xs font-medium">
                  <div className="p-4 bg-[#050811] rounded-xl border border-[#131a2e] flex items-center gap-3">
                    <input type="checkbox" defaultChecked className="rounded text-indigo-600" />
                    <span className="line-through text-slate-500">Configurer le token d'authentification longue durée Home Assistant</span>
                  </div>

                  <div className="p-4 bg-[#050811] rounded-xl border border-[#131a2e] flex items-center gap-3">
                    <input type="checkbox" defaultChecked className="rounded text-indigo-600" />
                    <span className="line-through text-slate-500">Monter le HDD de 1To sur ZimaOS Principal</span>
                  </div>

                  <div className="p-4 bg-[#050811] rounded-xl border border-[#131a2e] flex items-center gap-3">
                    <input type="checkbox" className="rounded text-indigo-600 focus:ring-0" />
                    <span className="text-white">Ajuster la vitesse de rotation des ventilateurs du NAS (.1.25)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
