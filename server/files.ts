// ──────────────────────────────────────────────────────────────────────────────
// File browsing / download / upload / share-link for both ZimaOS boxes.
//
// "local"  -> plain Node `fs` calls (this process's own filesystem).
// "remote" -> SFTP over the same SSH credentials used for system stats.
//
// All paths are resolved against a configurable per-host root and validated
// to stay inside it (no `..` escape), since this exposes real files on real
// machines.
// ──────────────────────────────────────────────────────────────────────────────
import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import crypto from "crypto";
import type { Response } from "express";
import SftpClient from "ssh2-sftp-client";
import { HOSTS, isRemoteConfigured, remoteConnectConfig, type HostKey } from "./hosts";

export const filesConfig: Record<HostKey, { root: string }> = {
  local: { root: process.env.LOCAL_FILES_ROOT || "/DATA" },
  remote: { root: process.env.REMOTE_FILES_ROOT || "/DATA" },
};

export interface FileEntry {
  name: string;
  path: string; // relative to the host's configured root
  isDirectory: boolean;
  sizeBytes: number;
  modifiedAt: string | null;
}

function resolveLocalPath(relPath: string): string {
  const root = path.resolve(filesConfig.local.root);
  const resolved = path.resolve(root, "." + path.sep + relPath.replace(/^\/+/, ""));
  if (!resolved.startsWith(root)) throw new Error("Chemin invalide");
  return resolved;
}

function resolveRemotePath(relPath: string): string {
  const root = path.posix.resolve(filesConfig.remote.root);
  const resolved = path.posix.resolve(root, "./" + relPath.replace(/^\/+/, ""));
  if (!resolved.startsWith(root)) throw new Error("Chemin invalide");
  return resolved;
}

async function withSftp<T>(fn: (sftp: SftpClient) => Promise<T>): Promise<T> {
  if (!isRemoteConfigured()) throw new Error("SSH non configuré pour le ZimaOS Principal");
  const sftp = new SftpClient();
  try {
    await sftp.connect(remoteConnectConfig());
    return await fn(sftp);
  } finally {
    await sftp.end().catch(() => {});
  }
}

export async function listDir(hostKey: HostKey, relPath: string): Promise<FileEntry[]> {
  if (hostKey === "local") {
    const abs = resolveLocalPath(relPath);
    const entries = await fsp.readdir(abs, { withFileTypes: true });
    const results: FileEntry[] = [];
    for (const entry of entries) {
      const entryAbs = path.join(abs, entry.name);
      const stat = await fsp.stat(entryAbs).catch(() => null);
      results.push({
        name: entry.name,
        path: path.posix.join(relPath.replace(/^\/+/, ""), entry.name),
        isDirectory: entry.isDirectory(),
        sizeBytes: stat?.size ?? 0,
        modifiedAt: stat?.mtime?.toISOString() ?? null,
      });
    }
    return results;
  }

  return withSftp(async (sftp) => {
    const abs = resolveRemotePath(relPath);
    const list = await sftp.list(abs);
    return list.map((item) => ({
      name: item.name,
      path: path.posix.join(relPath.replace(/^\/+/, ""), item.name),
      isDirectory: item.type === "d",
      sizeBytes: item.size,
      modifiedAt: item.modifyTime ? new Date(item.modifyTime).toISOString() : null,
    }));
  });
}

export async function streamDownload(hostKey: HostKey, relPath: string, res: Response, filename: string) {
  res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
  res.setHeader("Content-Type", "application/octet-stream");
  if (hostKey === "local") {
    const abs = resolveLocalPath(relPath);
    await fsp.access(abs, fs.constants.R_OK);
    fs.createReadStream(abs).pipe(res);
    return;
  }
  return withSftp(async (sftp) => {
    const abs = resolveRemotePath(relPath);
    await sftp.get(abs, res as any);
  });
}

export async function uploadFile(hostKey: HostKey, relDirPath: string, filename: string, tmpFilePath: string) {
  if (hostKey === "local") {
    const abs = resolveLocalPath(path.posix.join(relDirPath.replace(/^\/+/, ""), filename));
    await fsp.mkdir(path.dirname(abs), { recursive: true });
    await fsp.copyFile(tmpFilePath, abs);
    await fsp.unlink(tmpFilePath).catch(() => {});
    return;
  }
  return withSftp(async (sftp) => {
    const abs = resolveRemotePath(path.posix.join(relDirPath.replace(/^\/+/, ""), filename));
    await sftp.mkdir(path.posix.dirname(abs), true).catch(() => {});
    await sftp.put(tmpFilePath, abs);
    await fsp.unlink(tmpFilePath).catch(() => {});
  });
}

export async function deleteEntry(hostKey: HostKey, relPath: string, isDirectory: boolean) {
  if (hostKey === "local") {
    const abs = resolveLocalPath(relPath);
    if (isDirectory) await fsp.rm(abs, { recursive: true, force: true });
    else await fsp.unlink(abs);
    return;
  }
  return withSftp(async (sftp) => {
    const abs = resolveRemotePath(relPath);
    if (isDirectory) await sftp.rmdir(abs, true);
    else await sftp.delete(abs);
  });
}

// ── Share links (local-network "airdrop"-style temporary download URLs) ───────
interface ShareEntry {
  hostKey: HostKey;
  relPath: string;
  filename: string;
  expiresAt: number;
}
const shares = new Map<string, ShareEntry>();
const SHARE_TTL_MS = 24 * 60 * 60 * 1000;

export function createShareLink(hostKey: HostKey, relPath: string, filename: string): { token: string; expiresAt: number } {
  const token = crypto.randomBytes(16).toString("hex");
  const expiresAt = Date.now() + SHARE_TTL_MS;
  shares.set(token, { hostKey, relPath, filename, expiresAt });
  return { token, expiresAt };
}

export function resolveShare(token: string): ShareEntry | null {
  const entry = shares.get(token);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    shares.delete(token);
    return null;
  }
  return entry;
}

export function hostLabel(hostKey: HostKey) {
  return HOSTS[hostKey].name;
}
