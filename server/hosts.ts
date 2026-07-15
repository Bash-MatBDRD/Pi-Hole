// ──────────────────────────────────────────────────────────────────────────────
// Shared host definitions + remote SSH connection helper.
//
// Hosts are loaded from the persistent store (server/store.ts) so the user can
// add up to a handful of extra ZimaOS/servers beyond the built-in "local"
// (the machine actually running this Node process — read via local system
// calls, no credentials needed) and "remote" (seeded from the ZIMA2_SSH_*
// secrets) entries.
// ──────────────────────────────────────────────────────────────────────────────
import { Client, type ConnectConfig } from "ssh2";
import { getHost, listHosts, MAX_CUSTOM_HOSTS, type HostRecord } from "./store";

export { MAX_CUSTOM_HOSTS };

export type HostKey = string;
export type { HostRecord };

export function getHosts(): HostRecord[] {
  return listHosts();
}

export function requireHost(id: HostKey): HostRecord {
  const host = getHost(id);
  if (!host) throw new Error("Système introuvable");
  return host;
}

export function isHostConfigured(host: HostRecord): boolean {
  return host.isLocal || Boolean(host.ip && host.sshUser && host.sshPassword);
}

export function hostConnectConfig(host: HostRecord): ConnectConfig {
  return {
    host: host.ip,
    username: host.sshUser,
    password: host.sshPassword,
    port: 22,
    readyTimeout: 8000,
  };
}

/** Run a shell command on a remote host over SSH and resolve with stdout. */
export function execRemote(host: HostRecord, command: string, timeoutMs = 8000): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!isHostConfigured(host)) {
      return reject(new Error(`SSH non configuré pour ${host.name} (adresse/utilisateur/mot de passe manquants)`));
    }
    const conn = new Client();
    const timer = setTimeout(() => {
      conn.end();
      reject(new Error("Délai de connexion SSH dépassé"));
    }, timeoutMs);

    conn
      .on("ready", () => {
        conn.exec(command, (err, stream) => {
          if (err) {
            clearTimeout(timer);
            conn.end();
            return reject(err);
          }
          let out = "";
          let errOut = "";
          stream
            .on("close", () => {
              clearTimeout(timer);
              conn.end();
              resolve(out || errOut);
            })
            .on("data", (d: Buffer) => (out += d.toString()))
            .stderr.on("data", (d: Buffer) => (errOut += d.toString()));
        });
      })
      .on("error", (err) => {
        clearTimeout(timer);
        reject(err);
      })
      .connect(hostConnectConfig(host));
  });
}
