"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";

interface SavedView {
  id: number;
  dog_name: string;
  generation: number;
  image_path: string;
  created_at: string;
}

function EditableTitle({ view, onRename }: { view: SavedView; onRename: (id: number, name: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(view.dog_name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const save = () => {
    setEditing(false);
    const trimmed = value.trim();
    if (trimmed && trimmed !== view.dog_name) {
      onRename(view.id, trimmed);
    } else {
      setValue(view.dog_name);
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") { setValue(view.dog_name); setEditing(false); } }}
        className="w-full text-sm font-bold outline-none"
        style={{
          color: "#1C1C1C",
          fontFamily: "var(--font-table)",
          background: "transparent",
          border: "none",
          borderBottom: "2px solid #C9B29F",
          padding: "0 0 2px 0",
        }}
      />
    );
  }

  return (
    <p
      onClick={() => setEditing(true)}
      className="text-sm font-bold truncate cursor-pointer hover:opacity-70"
      title="Click to rename"
      style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}
    >
      {view.dog_name}
    </p>
  );
}

function timeAgo(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins} min${mins > 1 ? "s" : ""} ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} day${days > 1 ? "s" : ""} ago`;
    const months = Math.floor(days / 30);
    return `${months} month${months > 1 ? "s" : ""} ago`;
  } catch {
    return iso;
  }
}

export default function PedigreeFolderPage() {
  const [views, setViews] = useState<SavedView[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const fetchViews = async () => {
    let userId = 0;
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      userId = u?.id || 0;
    } catch {}
    if (!userId) { setLoading(false); return; }
    try {
      const res = await fetch(`/api/pedigree-folder/list?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setViews(data.views || []);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchViews(); }, []);

  const deleteView = async (id: number) => {
    if (!confirm("Delete this saved pedigree?")) return;
    try {
      await fetch(`/api/pedigree-folder/${id}`, { method: "DELETE" });
      fetchViews();
    } catch {}
  };

  const renameView = async (id: number, newName: string) => {
    try {
      const res = await fetch(`/api/pedigree-folder/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dogName: newName }),
      });
      if (res.ok) {
        setViews((prev) => prev.map((v) => v.id === id ? { ...v, dog_name: newName } : v));
      }
    } catch {}
  };

  return (
    <div className="min-h-screen" style={{ background: "#EDE4D5" }}>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1
              className="text-2xl md:text-3xl font-black uppercase tracking-widest"
              style={{ fontFamily: "var(--font-table)", color: "#1C1C1C" }}
            >
              My Saved Pedigrees
            </h1>
            <p className="text-xs mt-1" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>
              Your saved pedigree views
            </p>
          </div>
          <Link
            href="/pedigree-lab"
            className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all hover:scale-105"
            style={{
              background: "#1C1C1C",
              color: "#FAF7F2",
              fontFamily: "var(--font-table)",
              border: "2px solid #C9B29F",
              textDecoration: "none",
            }}
          >
            ← Pedigree Lab
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#C9B29F", borderTopColor: "transparent" }} />
            <span className="ml-3 text-sm" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>Loading...</span>
          </div>
        ) : views.length === 0 ? (
          <div className="text-center py-20">
            <img src="/logo.png" alt="" className="mx-auto mb-6" style={{ width: "80px", height: "80px", opacity: 0.3 }} />
            <p className="text-base font-bold mb-2" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>
              Your saved pedigrees live here
            </p>
            <p className="text-sm mb-6" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>
              Save pedigrees from the Pedigree Lab to view them here
            </p>
            <Link
              href="/pedigree-lab"
              className="inline-block px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all hover:scale-105"
              style={{
                background: "#1C1C1C",
                color: "#FAF7F2",
                fontFamily: "var(--font-table)",
                border: "2px solid #C9B29F",
                textDecoration: "none",
              }}
            >
              Go to Pedigree Lab
            </Link>
          </div>
        ) : (
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            }}
          >
            {views.map((v) => (
              <div
                key={v.id}
                className="rounded-lg overflow-hidden transition-all hover:shadow-lg cursor-pointer"
                style={{ background: "#FAF7F2", border: "2px solid #C9B29F", borderRadius: "8px", maxWidth: "320px" }}
                onClick={() => setExpandedId(v.id)}
              >
                <div className="aspect-[16/9] overflow-hidden" style={{ background: "#FAFAFA" }}>
                  <img src={v.image_path} alt={v.dog_name} className="w-full h-full object-contain" onError={(e) => { const t = e.target as HTMLImageElement; t.onerror = null; t.src = "/logo.png"; t.style.opacity = "0.3"; t.style.padding = "20px"; }} />
                </div>
                <div className="p-3">
                  <div onClick={(e) => e.stopPropagation()}>
                    <EditableTitle view={v} onRename={renameView} />
                  </div>
                  <p className="text-xs mt-1" style={{ color: "#4A4A4A", fontFamily: "var(--font-mono)", fontSize: "12px" }}>
                    {v.generation}G &bull; Saved {timeAgo(v.created_at)}
                  </p>
                  <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                    <a href={v.image_path} download={`${v.dog_name}.png`} className="flex-1 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-center transition-all hover:scale-105" style={{ background: "#1C1C1C", color: "#FAF7F2", fontFamily: "var(--font-table)", textDecoration: "none", fontSize: "12px" }}>
                      Download
                    </a>
                    <button onClick={() => deleteView(v.id)} className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all hover:scale-105" style={{ background: "#ef4444", color: "#fff", border: "none", fontFamily: "var(--font-table)", cursor: "pointer", fontSize: "12px" }}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Modal popup */}
            {expandedId && (() => {
              const v = views.find(x => x.id === expandedId);
              if (!v) return null;
              return (
                <div
                  style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 99998, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
                  onClick={() => setExpandedId(null)}
                >
                  <div
                    style={{ background: "#FAF7F2", borderRadius: "12px", maxWidth: "900px", width: "100%", maxHeight: "90vh", overflow: "hidden", border: "2px solid #C9B29F", boxShadow: "0 8px 40px rgba(0,0,0,0.3)", display: "flex", flexDirection: "column" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Header */}
                    <div style={{ background: "#1C1C1C", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
                      <span style={{ color: "#FAF7F2", fontFamily: "var(--font-table)", fontWeight: 700, fontSize: "14px" }}>{v.dog_name} — {v.generation}G Pedigree</span>
                      <button
                        onClick={() => setExpandedId(null)}
                        style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#FAF7F2", width: 30, height: 30, borderRadius: "50%", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        ✕
                      </button>
                    </div>
                    {/* Image */}
                    <div style={{ overflow: "auto", flex: 1, background: "#FAFAFA", padding: "12px" }}>
                      <img src={v.image_path} alt={v.dog_name} style={{ width: "100%", objectFit: "contain" }} />
                    </div>
                    {/* Footer buttons */}
                    <div style={{ padding: "12px 16px", borderTop: "2px solid #C9B29F", display: "flex", gap: "8px", flexShrink: 0 }}>
                      <a href={v.image_path} download={`${v.dog_name}.png`} className="flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-center transition-all hover:scale-105" style={{ background: "#1C1C1C", color: "#FAF7F2", fontFamily: "var(--font-table)", textDecoration: "none", fontSize: "12px" }}>
                        ↓ Download
                      </a>
                      <button onClick={() => { deleteView(v.id); setExpandedId(null); }} className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all hover:scale-105" style={{ background: "#ef4444", color: "#fff", border: "none", fontFamily: "var(--font-table)", cursor: "pointer", fontSize: "12px" }}>
                        ✕ Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
