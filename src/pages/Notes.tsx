import React, { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Pin, PinOff, RefreshCw, StickyNote, Check } from "lucide-react";
import axios from "axios";

interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
}

const COLORS: { id: string; label: string; bg: string; border: string; text: string }[] = [
  { id: "indigo",  label: "Indigo",   bg: "rgba(99,102,241,0.1)",  border: "rgba(99,102,241,0.25)",  text: "#818cf8" },
  { id: "emerald", label: "Émeraude", bg: "rgba(34,197,94,0.08)",  border: "rgba(34,197,94,0.2)",    text: "#4ade80" },
  { id: "amber",   label: "Ambre",    bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.25)",  text: "#fbbf24" },
  { id: "rose",    label: "Rose",     bg: "rgba(244,63,94,0.09)",  border: "rgba(244,63,94,0.22)",   text: "#fb7185" },
  { id: "cyan",    label: "Cyan",     bg: "rgba(6,182,212,0.09)",  border: "rgba(6,182,212,0.22)",   text: "#22d3ee" },
  { id: "purple",  label: "Violet",   bg: "rgba(168,85,247,0.09)", border: "rgba(168,85,247,0.22)",  text: "#c084fc" },
];

function getColor(id: string) { return COLORS.find(c => c.id === id) || COLORS[0]; }

function formatDate(ts: number) {
  const d = new Date(ts);
  const today = new Date();
  const diff = today.getDate() - d.getDate();
  if (diff === 0 && d.getMonth() === today.getMonth()) return "Aujourd'hui " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (diff === 1) return "Hier " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) + " " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export default function Notes() {
  const [notes,   setNotes]   = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [editId,  setEditId]  = useState<string | null>(null);
  const [delId,   setDelId]   = useState<string | null>(null);

  // New note form
  const [newTitle,   setNewTitle]   = useState("");
  const [newContent, setNewContent] = useState("");
  const [newColor,   setNewColor]   = useState("indigo");

  const fetch_ = async () => {
    try {
      const { data } = await axios.get("/api/notes");
      setNotes(data.notes || []);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetch_(); }, []);

  const createNote = async () => {
    if (!newContent.trim()) return;
    try {
      await axios.post("/api/notes", { title: newTitle.trim(), content: newContent.trim(), color: newColor });
      setNewTitle(""); setNewContent(""); setNewColor("indigo"); setShowNew(false);
      await fetch_();
    } catch {}
  };

  const updateNote = async (id: string, patch: Partial<Note>) => {
    try {
      await axios.put(`/api/notes/${id}`, patch);
      await fetch_();
    } catch {}
  };

  const deleteNote = async (id: string) => {
    try {
      await axios.delete(`/api/notes/${id}`);
      setDelId(null); setEditId(null);
      await fetch_();
    } catch {}
  };

  const sorted = [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.updatedAt - a.updatedAt;
  });

  return (
    <div className="p-5 space-y-5 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white tracking-wide">Notes</h1>
          <p className="text-xs text-gray-600 mt-0.5">{notes.length} note{notes.length !== 1 ? "s" : ""} enregistrée{notes.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetch_} className="p-2 text-gray-600 hover:text-gray-400 transition-colors">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button onClick={() => { setShowNew(true); setEditId(null); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white transition-all"
            style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.3)" }}>
            <Plus className="h-4 w-4" />Nouvelle note
          </button>
        </div>
      </div>

      {/* New note form */}
      {showNew && (
        <div className="rounded-2xl p-5 space-y-4"
          style={{ background: getColor(newColor).bg, border: `1px solid ${getColor(newColor).border}` }}>
          <input
            autoFocus
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="Titre (optionnel)"
            className="w-full bg-transparent text-sm font-bold text-white placeholder:text-white/30 focus:outline-none"
          />
          <textarea
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
            placeholder="Écrivez votre note ici…"
            rows={4}
            className="w-full bg-transparent text-xs text-white/80 placeholder:text-white/30 focus:outline-none resize-none leading-relaxed"
          />
          {/* Color picker */}
          <div className="flex items-center gap-2 flex-wrap">
            {COLORS.map(c => (
              <button key={c.id} onClick={() => setNewColor(c.id)}
                className="h-5 w-5 rounded-full transition-all border-2"
                style={{
                  background: c.text,
                  borderColor: newColor === c.id ? "white" : "transparent",
                  transform: newColor === c.id ? "scale(1.2)" : "scale(1)",
                }} />
            ))}
          </div>
          <div className="flex items-center gap-2 justify-end">
            <button onClick={() => setShowNew(false)}
              className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors">
              Annuler
            </button>
            <button onClick={createNote} disabled={!newContent.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-40"
              style={{ background: getColor(newColor).text + "30", border: `1px solid ${getColor(newColor).text}50` }}>
              <Check className="h-3.5 w-3.5" />Enregistrer
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && notes.length === 0 && !showNew && (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-700">
          <StickyNote className="h-10 w-10 opacity-30" />
          <p className="text-sm">Aucune note — créez-en une avec le bouton ci-dessus</p>
        </div>
      )}

      {/* Notes grid */}
      {sorted.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map(note => {
            const col = getColor(note.color);
            const isEditing = editId === note.id;
            const isDeleting = delId === note.id;

            return (
              <div key={note.id}
                className="rounded-2xl p-4 flex flex-col gap-3 transition-all cursor-pointer group"
                style={{ background: col.bg, border: `1px solid ${isEditing ? col.text + "50" : col.border}` }}
                onClick={() => !isEditing && setEditId(note.id)}
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <input
                        autoFocus
                        defaultValue={note.title}
                        onClick={e => e.stopPropagation()}
                        onBlur={e => updateNote(note.id, { title: e.target.value })}
                        placeholder="Titre"
                        className="bg-transparent text-sm font-bold text-white placeholder:text-white/30 focus:outline-none w-full"
                      />
                    ) : (
                      <p className="text-xs font-bold truncate" style={{ color: col.text }}>
                        {note.title || "Sans titre"}
                        {note.pinned && <span className="ml-1 opacity-60">📌</span>}
                      </p>
                    )}
                  </div>
                  {/* Actions (visible on hover/edit) */}
                  <div className={`flex items-center gap-1 shrink-0 transition-opacity ${isEditing ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                    onClick={e => e.stopPropagation()}>
                    <button onClick={() => updateNote(note.id, { pinned: !note.pinned })}
                      className="p-1 rounded transition-colors hover:bg-white/10" title={note.pinned ? "Désépingler" : "Épingler"}>
                      {note.pinned
                        ? <PinOff className="h-3 w-3 text-gray-400" />
                        : <Pin    className="h-3 w-3 text-gray-400" />}
                    </button>
                    {/* Color picker inline */}
                    {isEditing && COLORS.map(c => (
                      <button key={c.id} onClick={() => updateNote(note.id, { color: c.id })}
                        className="h-3.5 w-3.5 rounded-full border"
                        style={{
                          background: c.text,
                          borderColor: note.color === c.id ? "white" : "transparent",
                        }} />
                    ))}
                    <button onClick={() => isDeleting ? deleteNote(note.id) : setDelId(note.id)}
                      className="p-1 rounded transition-colors hover:bg-red-500/20">
                      <Trash2 className="h-3 w-3 text-red-400" />
                    </button>
                  </div>
                </div>

                {/* Delete confirmation */}
                {isDeleting && !isEditing && (
                  <div className="text-[10px] text-red-300 flex items-center gap-2"
                    onClick={e => e.stopPropagation()}>
                    <span>Supprimer ?</span>
                    <button onClick={() => deleteNote(note.id)}
                      className="px-2 py-0.5 rounded bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30 transition-colors">Oui</button>
                    <button onClick={() => setDelId(null)}
                      className="px-2 py-0.5 rounded hover:bg-white/10 transition-colors text-gray-400">Non</button>
                  </div>
                )}

                {/* Content */}
                {isEditing ? (
                  <textarea
                    defaultValue={note.content}
                    onClick={e => e.stopPropagation()}
                    onBlur={e => { updateNote(note.id, { content: e.target.value }); setEditId(null); }}
                    rows={5}
                    className="bg-transparent text-xs text-white/80 focus:outline-none resize-none leading-relaxed w-full"
                  />
                ) : (
                  <p className="text-xs text-white/70 leading-relaxed whitespace-pre-wrap line-clamp-6">{note.content}</p>
                )}

                {/* Footer */}
                <p className="text-[9px] text-white/25 mt-auto">{formatDate(note.updatedAt)}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
