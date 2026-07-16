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
npm install    # une seule fois
npm run dev    # dev (tsx server.ts + Vite HMR) → http://localhost:5000
npm run build  # build production
npm start      # production (node dist/server.cjs)
```

Accessible sur le port **5000**.

---

## Secrets requis

| Variable | Rôle |
|---|---|
| `SESSION_SECRET` | Secret de session Express ✅ |
| `DISCORD_BOT_TOKEN` | Token du bot Discord (NexusBot) |

Variables optionnelles (SSH vers ZimaOS distant) :

| Variable | Rôle |
|---|---|
| `ZIMA2_SSH_HOST` | IP de l'hôte ZimaOS distant |
| `ZIMA2_SSH_USER` | Utilisateur SSH |
| `ZIMA2_SSH_PASSWORD` | Mot de passe SSH |
| `LOCAL_FILES_ROOT` | Racine de l'explorateur fichiers local (défaut `/DATA`) |
| `REMOTE_FILES_ROOT` | Racine de l'explorateur fichiers distant (défaut `/DATA`) |

---

## Pages

### Accueil
| Page | Route | Description |
|---|---|---|
| Tableau de bord | `/dashboard` | Statut global, activité récente, accès rapide |

### Domotique
| Page | Route | Description |
|---|---|---|
| Domotique HA | `/domotique` | Appareils Home Assistant — contrôle lumières, volets, prises, lecteurs |
| Spotify & FireStick | `/spotify` | Lecteur en cours, **shuffle**, **répétition**, **like ❤️**, contrôle FireStick |
| Discord Bot | `/discord` | Statut NexusBot, logs de commandes |

### Système
| Page | Route | Description |
|---|---|---|
| ZimaOS Diagnostic | `/zimaos` | CPU, RAM, température, disques — local et distant |
| Terminal SSH | `/terminal` | Shell SSH interactif via WebSocket + xterm.js |
| Réseau | `/reseau` | Ping live sur tous les services |
| Fichiers | `/fichiers` | Explorateur de fichiers sur les hôtes |

### Quotidien
| Page | Route | Description |
|---|---|---|
| Météo | `/meteo` | Météo temps réel, prévisions 24h + 7 jours |
| Notes | `/notes` | Notes persistantes |

---

## NexusBot — Commandes Discord

Préfixe : `.`

### 📡 Informations
| Commande | Description |
|---|---|
| `.ping` | Latence WebSocket |
| `.status` | Rapport complet du panel |
| `.ha` | Résumé Home Assistant |
| `.uptime` | Temps de fonctionnement |
| `.temp` | Températures ZimaOS _(interactif)_ |

### 💡 Appareils _(live depuis HA si connecté, sinon cache local)_
| Commande | Description |
|---|---|
| `.appareils` | Liste tous les appareils par pièce |
| `.appareil <nom>` | Fiche détaillée d'un appareil |
| `.allumer <nom>` | Allume / ouvre un appareil |
| `.eteindre <nom>` | Éteint / ferme un appareil |
| `.luminosite <nom> <0-100>` | Luminosité d'une lumière |
| `.volet <nom> <ouvert\|ferme\|%>` | Contrôle un volet |
| `.ajouter` | Ajoute un appareil _(interactif)_ |
| `.supprimer <nom>` | Supprime un appareil fictif |

### 🎵 Musique _(sur le lecteur actif, sans changer d'appareil)_
| Commande | Description |
|---|---|
| `.musique <titre>` | Recherche et lance une musique |
| `.pause` | Met en pause |
| `.reprendre` | Reprend la lecture |
| `.suivant` | Piste suivante |
| `.precedent` | Piste précédente |
| `.shuffle` | Active / désactive l'aléatoire |
| `.boucle` | Cycle répétition : off → tout → ×1 |
| `.liker` | Affiche la musique en cours (like panel) |
| `.musique_info` | Infos complètes de la lecture |

### 🎉 Fun & Personnalité
| Commande | Description |
|---|---|
| `.bonjour` | Salutation personnalisée |
| `.humeur` | Humeur du moment |
| `.blague` | Blague tech/domotique |
| `.8ball <question>` | La boule magique répond |
| `.de [NdF]` | Lancer de dés (ex : `.de 2d6`) |
| `.conseil` | Conseil domotique du jour |
| `.citation` | Citation inspirante |

---

## Nouveautés V2.0

### 🎵 Spotify amélioré
- **Album art** affiché dans le lecteur et en fond flouté
- **Shuffle** — bouton direct dans le lecteur (sync HA)
- **Répétition** — cycle off → tout → ×1 (sync HA)
- **Like ❤️** — favoris locaux par titre/artiste (localStorage)
- **Bot Discord** : `.musique`, `.pause`, `.suivant`, `.shuffle`, `.boucle`…

### 🏠 Domotique enrichie
- Détection automatique **PSN / Xbox / Spotify / Fire TV / Chromecast / Apple**
- Icône et couleur propres à chaque marque dans les cartes lecteurs
- Appareils live depuis HA (cache 30 s dans le bot Discord)

### 🎛️ Sidebar Dynamic Island
- Mini-player style **iOS Dynamic Island** en bas de la sidebar
- **Album art** miniature
- Boutons **⏮ ⏯ ⏭** directement dans la sidebar
- Clic sur la pochette → page Spotify

---

## Architecture

```
server.ts              # Point d'entrée Express + Vite proxy + WebSocket SSH
server/
│   ├── store.ts       # Persistence JSON (debounced 500ms)
│   ├── discord.ts     # NexusBot (commandes + live HA devices)
│   ├── system.ts      # Stats CPU/RAM/temp (local + SSH)
│   └── files.ts       # Explorateur de fichiers (SFTP)
src/
│   ├── pages/         # Une page par salon
│   ├── components/    # Sidebar (Dynamic Island), TopBar, StatusBar…
│   └── lib/theme.ts   # Système de thème (couleur + style logo)
data/
│   └── nexus-store.json  # Données persistantes (auto-créé au démarrage)
```

### Flux de données

```
Navigateur
  └─ React (Vite HMR dev / dist prod)
       ├─ HTTP/REST → Express (port 5000)
       │    ├─ /api/home-assistant/*   → proxy HA (live états + services)
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
- Config météo
- Logs d'activité (pruning automatique hebdomadaire)

> Aucune base de données externe requise. JSON debounced (500 ms).

---

## Authentification

Auth 100% côté client — identifiants stockés dans `localStorage`.
Flux : splash screen → login → session → verrouillage (`LockScreen`).
Les APIs Express ne sont pas protégées côté serveur (usage personnel, réseau local).

---

*NEXUS Panel V2.0 — usage personnel / accès restreint*
