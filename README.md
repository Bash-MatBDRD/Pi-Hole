# NEXUS Panel V2.0

Panel de contrôle personnel full-stack — domotique, Discord, ZimaOS et utilitaires quotidiens.

---

## Stack

| Couche | Techno |
|---|---|
| Frontend | React 19 + TypeScript + Tailwind CSS v4 + Vite |
| Backend | Express + TypeScript (`server.ts`) |
| Bot Discord | discord.js v14 (même processus que le panel) |
| Persistence | JSON file (`data/nexus-store.json`) via `server/store.ts` |
| SSH | `ssh2` — commandes distantes + terminal WebSocket |
| Météo | Open-Meteo API (gratuit, sans clé) |

---

## Lancer le projet

```bash
npm run dev        # dev (tsx server.ts + Vite HMR)
npm run build      # build production
npm start          # production (node dist/server.js)
```

Accessible sur le port **5000**.

---

## Secrets requis

| Variable | Rôle |
|---|---|
| `DISCORD_BOT_TOKEN` | Token du bot Discord (NexusBot) |
| `SESSION_SECRET` | Secret de session Express |

Variables optionnelles (SSH vers ZimaOS distant) :

| Variable | Rôle |
|---|---|
| `ZIMA2_SSH_HOST` | IP de l'hôte ZimaOS distant |
| `ZIMA2_SSH_USER` | Utilisateur SSH |
| `ZIMA2_SSH_PASSWORD` | Mot de passe SSH |

---

## Salons (pages)

### Accueil
| Page | Route | Description |
|---|---|---|
| Tableau de bord | `/dashboard` | Statut global, activité récente, accès rapide |

### Domotique
| Page | Route | Description |
|---|---|---|
| Domotique HA | `/domotique` | Appareils Home Assistant — contrôle lumières, volets, prises |
| Spotify & FireStick | `/spotify` | Lecteur en cours, contrôle FireStick |
| Discord Bot | `/discord` | Statut NexusBot, logs de commandes, section « À propos » |

### Système
| Page | Route | Description |
|---|---|---|
| ZimaOS Diagnostic | `/zimaos` | CPU, RAM, température, disques — local et distant |
| Terminal SSH | `/terminal` | Shell SSH interactif via WebSocket + xterm.js |
| Réseau | `/reseau` | Ping live sur tous les services (HA, Discord, Internet, ZimaOS) |
| Fichiers | `/fichiers` | Explorateur de fichiers sur les hôtes |

### Quotidien
| Page | Route | Description |
|---|---|---|
| Météo | `/meteo` | Météo temps réel, prévisions 24h + 7 jours, recherche de ville |
| Notes | `/notes` | Post-its colorés persistants — 6 couleurs, épinglage |

### Réglages
| Page | Route | Description |
|---|---|---|
| Réglages | `/settings` | Profil, thème, Home Assistant, hôtes ZimaOS, bot |

---

## NexusBot

Bot Discord intégré. Préfixe : `.`  
Statut : 🔴 Ne pas déranger — *Joue à Config ZimaOS*

### Commandes

**Utilitaires**
| Commande | Description |
|---|---|
| `.ping` | Latence WebSocket du bot |
| `.status` | Statut complet (hôtes, HA, uptime) |
| `.ha` | Résumé des appareils Home Assistant |
| `.uptime` | Uptime du panel et du bot |
| `.aide` | Liste toutes les commandes |

**ZimaOS**
| Commande | Description |
|---|---|
| `.temp` | Température CPU (interactif : choisir local ou distant) |
| `.appareils` | Liste tous les appareils domotiques |
| `.appareil <nom>` | Détail d'un appareil (recherche floue) |
| `.allumer <nom>` | Allumer un appareil |
| `.eteindre <nom>` | Éteindre un appareil |
| `.luminosite <nom> <0-100>` | Régler la luminosité |
| `.volet <nom> <0-100>` | Régler la position d'un volet |
| `.ajouter` | Ajouter un appareil (assistant interactif 3 étapes) |
| `.supprimer` | Supprimer un appareil (interactif) |

**Fun**
| Commande | Description |
|---|---|
| `.bonjour` | Salutation personnalisée selon l'heure |
| `.humeur` | Humeur du bot basée sur la latence |
| `.blague` | Blague tech/domotique en spoiler |
| `.8ball <question>` | Boule magique — 18 réponses |
| `.de [NdF]` | Lance des dés — ex. `.de 2d20` (max 20×1000) |
| `.conseil` | Conseil domotique aléatoire |
| `.citation` | Citation tech/IA |

> Commandes interactives (`.temp`, `.ajouter`, `.supprimer`) : timeout 30 secondes.

---

## Architecture

```
├── server.ts              # Point d'entrée — Express + WebSocket SSH + Vite
├── server/
│   ├── store.ts           # Persistence JSON (appareils, notes, config, logs)
│   ├── discord.ts         # NexusBot complet (discord.js v14)
│   ├── hosts.ts           # Gestion des hôtes ZimaOS + execRemote SSH
│   ├── system.ts          # Lecture stats CPU/RAM/temp (local + SSH)
│   └── files.ts           # Explorateur de fichiers (listing, download, upload)
├── src/
│   ├── pages/             # Une page par salon
│   ├── components/        # Sidebar, TopBar, StatusBar, LockScreen, Splashscreen
│   └── lib/theme.ts       # Système de thème (couleur + style de logo)
└── data/
    └── nexus-store.json   # Données persistantes (auto-créé au premier démarrage)
```

### Flux de données

```
Navigateur
  └─ React (Vite HMR dev / dist prod)
       ├─ HTTP/REST → Express (port 5000)
       │    ├─ /api/home-assistant/*   → proxy HA
       │    ├─ /api/system/stats       → SSH ZimaOS
       │    ├─ /api/meteo              → Open-Meteo
       │    ├─ /api/notes              → store JSON
       │    └─ /api/reseau             → ping services
       └─ WebSocket wss://.../api/terminal → SSH shell live
```

---

## Persistence

Toutes les données sont stockées dans `data/nexus-store.json` :
- Config Home Assistant (URL + token)
- Config Discord bot
- Appareils domotiques personnalisés
- Hôtes ZimaOS
- Notes
- Config météo (ville, lat/lng)
- Logs d'activité (pruning automatique hebdomadaire)

> Aucune base de données externe requise. Le fichier JSON est debounced (écriture différée 500 ms) pour éviter les écritures trop fréquentes.

---

## Authentification

Auth 100% côté client — identifiants stockés dans `localStorage`.  
Le panel supporte : splash screen → login → session → verrouillage (`LockScreen`).  
Les APIs Express ne sont pas protégées côté serveur (usage personnel, réseau local).

---

*NEXUS Panel V2.0 — usage personnel / accès restreint*
