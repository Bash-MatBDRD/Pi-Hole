import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Folder, File, Download, Upload, Trash2, Share2, ArrowLeft, RefreshCw,
  Server, Copy, Check, AlertTriangle, HardDrive,
} from "lucide-react";
import axios from "axios";

interface FileEntry {
  name: string; path: string; isDirectory: boolean; sizeBytes: number; modifiedAt: string | null;
}
interface HostSummary { id: string; name: string; ip: string; isLocal: boolean; }

function formatSize(bytes: number) {
  if (bytes === 0) return "—";
  const units = ["o", "Ko", "Mo", "Go", "To"];
  let i = 0; let val = bytes;
  while (val >= 1024 && i < units.length - 1) { val /= 1024; i++; }
  return `${val.toFixed(val < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

export default function Fichiers() {
  const [hosts, setHosts]     = useState<HostSummary[]>([]);
  const [host, setHost]       = useState<string>("");
  const [dirPath, setDirPath] = useState("");
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [root, setRoot]       = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied]   = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    axios.get("/api/hosts").then((r) => {
      setHosts(r.data.hosts);
      if (r.data.hosts.length > 0) setHost((prev) => prev || r.data.hosts[0].id);
    }).catch(() => {});
  }, []);

  const load = useCallback(async (h: string, p: string) => {
    if (!h) return;
    setLoading(true); setError("");
    try {
      const r = await axios.get(`/api/files/${h}`, { params: { path: p } });
      setEntries(r.data.entries);
      setRoot(r.data.root);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Impossible de lister ce dossier");
      setEntries([]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (host) load(host, dirPath); }, [host, dirPath, load]);

  const switchHost = (h: string) => { setHost(h); setDirPath(""); setShareUrl(null); };
  const openDir = (p: string) => { setDirPath(p); setShareUrl(null); };
  const goUp = () => {
    const parts = dirPath.split("/").filter(Boolean);
    parts.pop();
    setDirPath(parts.join("/"));
  };

  const download = (path: string) => {
    window.open(`/api/files/${host}/download?path=${encodeURIComponent(path)}`, "_blank");
  };

  const share = async (entry: FileEntry) => {
    try {
      const r = await axios.post(`/api/files/${host}/share`, { path: entry.path, filename: entry.name });
      setShareUrl(`${window.location.origin}${r.data.url}`);
      setCopied(false);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Impossible de créer le lien de partage");
    }
  };

  const remove = async (entry: FileEntry) => {
    if (!confirm(`Supprimer "${entry.name}" ?`)) return;
    try {
      await axios.delete(`/api/files/${host}`, { params: { path: entry.path, isDirectory: entry.isDirectory } });
      load(host, dirPath);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Suppression impossible");
    }
  };

  const upload = async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    form.append("path", dirPath);
    try {
      await axios.post(`/api/files/${host}/upload`, form, { headers: { "Content-Type": "multipart/form-data" } });
      load(host, dirPath);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Envoi impossible");
    }
  };

  const breadcrumbs = dirPath.split("/").filter(Boolean);

  return (
    <div className="p-5 space-y-5 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white tracking-wide">Fichiers</h1>
          <p className="text-xs text-gray-600 mt-0.5">Stockage, transfert et partage sur tous les systèmes surveillés</p>
        </div>
        <button onClick={() => load(host, dirPath)} className="text-gray-600 hover:text-gray-400 transition-colors p-2">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Host switcher */}
      <div className="flex gap-2 flex-wrap">
        {hosts.map((h) => (
          <button key={h.id} onClick={() => switchHost(h.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              host === h.id ? "text-white" : "text-gray-500 hover:text-gray-300"
            }`}
            style={host === h.id
              ? { background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.3)" }
              : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <Server className="h-3.5 w-3.5" />
            {h.name} <span className="text-gray-600 font-mono text-[10px]">({h.ip})</span>
          </button>
        ))}
      </div>

      {/* Breadcrumb + actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-mono">
          {dirPath && (
            <button onClick={goUp} className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400">
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
          )}
          <HardDrive className="h-3.5 w-3.5 text-gray-600" />
          <span className="text-gray-700">{root}</span>
          {breadcrumbs.map((b, i) => (
            <React.Fragment key={i}>
              <span className="text-gray-700">/</span>
              <button onClick={() => openDir(breadcrumbs.slice(0, i + 1).join("/"))} className="hover:text-white text-gray-400">{b}</button>
            </React.Fragment>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
          <button onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white transition-all"
            style={{ background: "rgba(99,102,241,0.9)" }}>
            <Upload className="h-3.5 w-3.5" /> Transférer un fichier
          </button>
        </div>
      </div>

      {shareUrl && (
        <div className="flex items-center gap-2 rounded-xl px-3 py-2.5"
          style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}>
          <Share2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span className="text-[11px] text-emerald-300 truncate flex-1">{shareUrl}</span>
          <button
            onClick={() => { navigator.clipboard.writeText(shareUrl); setCopied(true); }}
            className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded-lg"
            style={{ background: "rgba(34,197,94,0.1)" }}>
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} {copied ? "Copié" : "Copier"}
          </button>
          <span className="text-[9px] text-gray-600 shrink-0">Valide 24h</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[11px] text-red-300"
          style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* File list */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
        {loading ? (
          <div className="text-center py-16 text-gray-700 text-sm">Chargement…</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16 text-gray-700 text-sm">Dossier vide</div>
        ) : (
          <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
            {entries.map((entry) => (
              <div key={entry.path} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02] group">
                <button
                  onClick={() => entry.isDirectory ? openDir(entry.path) : undefined}
                  className={`flex items-center gap-2.5 flex-1 min-w-0 text-left ${entry.isDirectory ? "cursor-pointer" : "cursor-default"}`}>
                  {entry.isDirectory
                    ? <Folder className="h-4 w-4 text-indigo-400 shrink-0" />
                    : <File className="h-4 w-4 text-gray-500 shrink-0" />}
                  <span className="text-xs text-gray-200 truncate">{entry.name}</span>
                </button>
                <span className="text-[10px] text-gray-600 font-mono w-16 text-right shrink-0">{entry.isDirectory ? "" : formatSize(entry.sizeBytes)}</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  {!entry.isDirectory && (
                    <>
                      <button onClick={() => download(entry.path)} title="Télécharger" className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white">
                        <Download className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => share(entry)} title="Partager (lien temporaire)" className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-emerald-400">
                        <Share2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                  <button onClick={() => remove(entry)} title="Supprimer" className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-red-400">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
