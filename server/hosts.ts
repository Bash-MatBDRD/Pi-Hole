// ──────────────────────────────────────────────────────────────────────────────
// Shared host definitions + remote SSH connection helper.
//
// "local"  = the ZimaOS machine actually running this Node process (read via
//            local system calls — no network hop, no credentials needed).
// "remote" = the other ZimaOS box, reached over SSH using credentials
//            provided as secrets (ZIMA2_SSH_HOST / ZIMA2_SSH_USER / ZIMA2_SSH_PASSWORD).
// ──────────────────────────────────────────────────────────────────────────────
import { Client, type ConnectConfig } from "ssh2";

export type HostKey = "local" | "remote";

export const HOSTS: Record<HostKey, { name: string; ip: string }> = {
  local: { name: "ZimaOS Local (hôte du panel)", ip: "192.168.1.3" },
  remote: { name: "ZimaOS Principal", ip: process.env.ZIMA2_SSH_HOST || "192.168.1.25" },
};

export function isRemoteConfigured(): boolean {
  return Boolean(process.env.ZIMA2_SSH_HOST && process.env.ZIMA2_SSH_USER && process.env.ZIMA2_SSH_PASSWORD);
}

export function remoteConnectConfig(): ConnectConfig {
  return {
    host: process.env.ZIMA2_SSH_HOST,
    username: process.env.ZIMA2_SSH_USER,
    password: process.env.ZIMA2_SSH_PASSWORD,
    port: 22,
    readyTimeout: 8000,
  };
}

/** Run a shell command on the remote ZimaOS over SSH and resolve with stdout. */
export function execRemote(command: string, timeoutMs = 8000): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!isRemoteConfigured()) {
      return reject(new Error("SSH non configuré (ZIMA2_SSH_HOST/USER/PASSWORD manquants)"));
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
      .connect(remoteConnectConfig());
  });
}
