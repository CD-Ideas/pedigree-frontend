"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface SavedView {
  id: number;
  dog_name: string;
  generation: number;
  image_path: string;
  created_at: string;
}

export default function PedigreeFolderPage() {
  const [views, setViews] = useState<SavedView[]>([]);
  const [loading, setLoading] = useState(true);

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

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch { return iso; }
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
              📁 My Saved Pedigrees
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
            <img src="/logo.png" alt="" className="mx-auto mb-4 opacity-30" style={{ width: "64px", height: "64px" }} />
            <p className="text-sm font-bold mb-2" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>No saved pedigrees yet</p>
            <p className="text-xs mb-4" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>
              Go to Pedigree Lab, preview a pedigree, and click the 📁 Save button to save it here.
            </p>
            <Link
              href="/pedigree-lab"
              className="inline-block px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all hover:scale-105"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {views.map((v) => (
              <div
                key={v.id}
                className="rounded-lg overflow-hidden transition-all hover:scale-[1.02]"
                style={{ background: "#FAF7F2", border: "2px solid #C9B29F", borderRadius: "8px" }}
              >
                <div className="aspect-[16/9] overflow-hidden" style={{ background: "#FAFAFA" }}>
                  <img
                    src={v.image_path}
                    alt={v.dog_name}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      const t = e.target as HTMLImageElement;
                      t.onerror = null;
                      t.src = "/logo.png";
                      t.style.opacity = "0.3";
                      t.style.padding = "20px";
                    }}
                  />
                </div>
                <div className="p-3">
                  <p className="text-sm font-bold truncate" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>
                    {v.dog_name}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "#4A4A4A", fontFamily: "var(--font-mono)" }}>
                    {v.generation}G • {formatDate(v.created_at)}
                  </p>
                  <div className="flex gap-2 mt-3">
                    <a
                      href={v.image_path}
                      download={`${v.dog_name}.png`}
                      className="flex-1 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-center transition-all hover:scale-105"
                      style={{
                        background: "#1C1C1C",
                        color: "#FAF7F2",
                        fontFamily: "var(--font-table)",
                        textDecoration: "none",
                      }}
                    >
                      ↓ Download
                    </a>
                    <button
                      onClick={() => deleteView(v.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all hover:scale-105"
                      style={{
                        background: "rgba(239,68,68,0.1)",
                        color: "#ef4444",
                        border: "1px solid rgba(239,68,68,0.3)",
                        fontFamily: "var(--font-table)",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
