# NEXUS Panel V2.0

Tableau de bord domotique full-stack (React + Express + Vite) pour piloter Home Assistant, Spotify et surveiller deux serveurs ZimaOS en temps réel.

## Démarrage

Prérequis : Node.js

1. Installer les dépendances : `npm install`
2. Configurer les secrets si besoin (voir ci-dessous)
3. Lancer l'app : `npm run dev` (port 5000)

## Secrets / variables d'environnement

| Clé | Requis | Description |
|-----|--------|--------------|
| `ZIMA2_SSH_HOST` | Pour les stats du ZimaOS Principal | IP/hostname SSH du 2e ZimaOS (par défaut 192.168.1.25) |
| `ZIMA2_SSH_USER` | idem | Utilisateur SSH |
| `ZIMA2_SSH_PASSWORD` | idem | Mot de passe SSH |
| `LOCAL_FILES_ROOT` | Optionnel | Racine du gestionnaire de fichiers sur le ZimaOS local (par défaut `/DATA`) |
| `REMOTE_FILES_ROOT` | Optionnel | Racine du gestionnaire de fichiers sur le ZimaOS Principal (par défaut `/DATA`) |

Le panel est conçu pour tourner directement sur le ZimaOS local (192.168.1.3) : ses propres stats CPU/GPU/RAM/disque sont lues nativement sur la machine, sans identifiants. Le 2e ZimaOS (192.168.1.25) est interrogé via SSH/SFTP.

Voir `replit.md` pour l'architecture complète.
