// ──────────────────────────────────────────────────────────────────────────────
// File browsing / download / upload / share-link for every monitored host.
//
// Local host -> plain Node `fs` calls (this process's own filesystem).
// Remote hosts -> SFTP over the same SSH credentials used for system stats.
//
// All paths are resolved against the host's configurable root and validated
// to stay inside it (no `..` escape), since this exposes real files on real
// machines.
// ──────────────────────────────────────────────────────────────────────────────
import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import crypto from "crypto";
import type { Response } from "express";
import SftpClient from "ssh2-sftp-client";
import { isHostConfigured, hostConnectConfig, requireHost, type HostRecord } from "./hosts";

export interface FileEntry {
  name: string;
  path: string; // relative to the host's configured root
  isDirectory: boolean;
  sizeBytes: number;
  modifiedAt: string | null;
}

function resolveLocalPath(root: string, relPath: string): string {
  const rootAbs = path.resolve(root);
  const resolved = path.resolve(rootAbs, "." + path.sep + relPath.replace(/^\/+/, ""));
  if (!resolved.startsWith(rootAbs)) throw new Error("Chemin invalide");
  return resolved;
}

function resolveRemotePath(root: string, relPath: string): string {
  const rootAbs = path.posix.resolve(root);
  const resolved = path.posix.resolve(rootAbs, "./" + relPath.replace(/^\/+/, ""));
  if (!resolved.startsWith(rootAbs)) throw new Error("Chemin invalide");
  return resolved;
}

async function withSftp<T>(host: HostRecord, fn: (sftp: SftpClient) => Promise<T>): Promise<T> {
  if (!isHostConfigured(host)) throw new Error(`SSH non configuré pour ${host.name}`);
  const sftp = new SftpClient();
  try {
    await sftp.connect(hostConnectConfig(host));
    return await fn(sftp);
  } finally {
    await sftp.end().catch(() => {});
  }
}

export async function listDir(hostId: string, relPath: string): Promise<{ entries: FileEntry[]; root: string }> {
  const host = requireHost(hostId);
  const root = host.filesRoot || "/DATA";
  if (host.isLocal) {
    const abs = resolveLocalPath(root, relPath);
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
    return { entries: results, root };
  }

  const entries = await withSftp(host, async (sftp) => {
    const abs = resolveRemotePath(root, relPath);
    const list = await sftp.list(abs);
    return list.map((item) => ({
      name: item.name,
      path: path.posix.join(relPath.replace(/^\/+/, ""), item.name),
      isDirectory: item.type === "d",
      sizeBytes: item.size,
      modifiedAt: item.modifyTime ? new Date(item.modifyTime).toISOString() : null,
    }));
  });
  return { entries, root };
}

export async function streamDownload(hostId: string, relPath: string, res: Response, filename: string) {
  const host = requireHost(hostId);
  const root = host.filesRoot || "/DATA";
  res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
  res.setHeader("Content-Type", "application/octet-stream");
  if (host.isLocal) {
    const abs = resolveLocalPath(root, relPath);
    await fsp.access(abs, fs.constants.R_OK);
    fs.createReadStream(abs).pipe(res);
    return;
  }
  return withSftp(host, async (sftp) => {
    const abs = resolveRemotePath(root, relPath);
    await sftp.get(abs, res as any);
  });
}

export async function uploadFile(hostId: string, relDirPath: string, filename: string, tmpFilePath: string) {
  const host = requireHost(hostId);
  const root = host.filesRoot || "/DATA";
  if (host.isLocal) {
    const abs = resolveLocalPath(root, path.posix.join(relDirPath.replace(/^\/+/, ""), filename));
    await fsp.mkdir(path.dirname(abs), { recursive: true });
    await fsp.copyFile(tmpFilePath, abs);
    await fsp.unlink(tmpFilePath).catch(() => {});
    return;
  }
  return withSftp(host, async (sftp) => {
    const abs = resolveRemotePath(root, path.posix.join(relDirPath.replace(/^\/+/, ""), filename));
    await sftp.mkdir(path.posix.dirname(abs), true).catch(() => {});
    await sftp.put(tmpFilePath, abs);
    await fsp.unlink(tmpFilePath).catch(() => {});
  });
}

export async function deleteEntry(hostId: string, relPath: string, isDirectory: boolean) {
  const host = requireHost(hostId);
  const root = host.filesRoot || "/DATA";
  if (host.isLocal) {
    const abs = resolveLocalPath(root, relPath);
    if (isDirectory) await fsp.rm(abs, { recursive: true, force: true });
    else await fsp.unlink(abs);
    return;
  }
  return withSftp(host, async (sftp) => {
    const abs = resolveRemotePath(root, relPath);
    if (isDirectory) await sftp.rmdir(abs, true);
    else await sftp.delete(abs);
  });
}

// ── Share links (local-network "airdrop"-style temporary download URLs) ───────
interface ShareEntry {
  hostId: string;
  relPath: string;
  filename: string;
  expiresAt: number;
}
const shares = new Map<string, ShareEntry>();
const SHARE_TTL_MS = 24 * 60 * 60 * 1000;

export function createShareLink(hostId: string, relPath: string, filename: string): { token: string; expiresAt: number } {
  const token = crypto.randomBytes(16).toString("hex");
  const expiresAt = Date.now() + SHARE_TTL_MS;
  shares.set(token, { hostId, relPath, filename, expiresAt });
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
