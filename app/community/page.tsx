"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getDogColor } from "@/app/utils/colors";

const LOGO = "https://i.imgur.com/cAvQemZ.png";

interface CommunityPedigree {
  id: number;
  name: string;
  prefix: string;
  suffix_wins: string;
  suffix_losses: string;
  suffix_draws: string;
  suffix_honors: string;
  dob: string;
  sex: string;
  color: string;
  continent: string;
  country: string;
  breeder: string;
  owner: string;
  conditioned_weight: string;
  photo_path: string;
  view_count: number;
  date_posted: string;
  last_modified: string;
  creator: string;
}

function buildDisplayName(p: CommunityPedigree): string {
  const parts: string[] = [];
  if (p.prefix) parts.push(p.prefix);
  parts.push(p.name);
  const suffixes: string[] = [];
  if (p.suffix_wins) suffixes.push(`(${p.suffix_wins})`);
  if (p.suffix_losses) suffixes.push(`(${p.suffix_losses})`);
  if (p.suffix_draws) suffixes.push(`(${p.suffix_draws})`);
  if (p.suffix_honors) suffixes.push(p.suffix_honors);
  if (suffixes.length) parts.push(suffixes.join(" "));
  return parts.join(" ");
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch (_e) {
    return iso;
  }
}

export default function CommunityPedigreesPage() {
  const [pedigrees, setPedigrees] = useState<CommunityPedigree[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/pedigrees/community")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setPedigrees(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = search.trim()
    ? pedigrees.filter((p) => {
        const q = search.toUpperCase();
        const display = buildDisplayName(p).toUpperCase();
        return (
          display.includes(q) ||
          (p.creator || "").toUpperCase().includes(q) ||
          (p.country || "").toUpperCase().includes(q) ||
          (p.breeder || "").toUpperCase().includes(q)
        );
      })
    : pedigrees;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-deep, #0b1120)" }}>
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1
              className="text-2xl font-black uppercase tracking-widest"
              style={{
                fontFamily: "var(--font-display, Oswald, sans-serif)",
                background:
                  "linear-gradient(135deg, #d4a855 0%, #f5d994 50%, #d4a855 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Community Pedigrees
            </h1>
            <p
              className="text-xs mt-1"
              style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}
            >
              Browse pedigrees created by the community
            </p>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              placeholder="Search by name, creator, country..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg px-4 py-2 text-xs outline-none"
              style={{
                background: "rgba(30,64,120,0.15)",
                border: "1.5px solid rgba(30,64,120,0.4)",
                color: "#e2e8f0",
                fontFamily: "var(--font-table)",
              }}
            />
            <span
              className="absolute right-3 top-1/2 -translate-y-1/2 text-sm"
              style={{ color: "#5a6a82" }}
            >
              🔍
            </span>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-4">
          <span
            className="text-[10px] px-3 py-1 rounded-full"
            style={{
              background: "rgba(212,168,85,0.1)",
              color: "#d4a855",
              border: "1px solid rgba(212,168,85,0.2)",
              fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
            }}
          >
            {pedigrees.length} Published
          </span>
          {search.trim() && (
            <span
              className="text-[10px] px-3 py-1 rounded-full"
              style={{
                background: "rgba(96,165,250,0.1)",
                color: "#60a5fa",
                border: "1px solid rgba(96,165,250,0.2)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {filtered.length} Found
            </span>
          )}
        </div>

        {/* Pedigree Cards */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div
              className="flex items-center gap-3"
              style={{
                color: "var(--text-muted)",
                fontFamily: "var(--font-table)",
              }}
            >
              <div
                className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                style={{
                  borderColor: "var(--accent-gold)",
                  borderTopColor: "transparent",
                }}
              />
              Loading community pedigrees...
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4 opacity-30">🐕</div>
            <p
              className="text-sm"
              style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}
            >
              {search.trim()
                ? "No pedigrees match your search"
                : "No community pedigrees yet. Be the first to publish!"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filtered.map((p) => {
              const displayName = buildDisplayName(p);
              const titleColor = getDogColor(displayName);
              const isMale =
                p.sex === "Male" || p.sex === "MALE" || p.sex === "M";

              return (
                <Link
                  key={p.id}
                  href={`/pedigree/custom/${p.id}`}
                  className="rounded-xl overflow-hidden transition-all hover:scale-[1.02] hover:shadow-lg group"
                  style={{
                    background: `linear-gradient(135deg, ${titleColor}10, ${titleColor}05, #0b1120)`,
                    border: `1.5px solid ${titleColor}33`,
                  }}
                >
                  {/* Photo header */}
                  <div
                    className="h-36 relative"
                    style={{
                      background: p.photo_path
                        ? `url(${p.photo_path}) center/cover`
                        : isMale
                        ? "linear-gradient(135deg, #0c1929, #1a2e4a)"
                        : "linear-gradient(135deg, #29101c, #3d1a2e)",
                    }}
                  >
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(to top, rgba(11,17,32,0.95), transparent 70%)",
                      }}
                    />
                    {/* View count */}
                    <div
                      className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full"
                      style={{
                        background: "rgba(0,0,0,0.5)",
                        border: "1px solid rgba(255,255,255,0.1)",
                      }}
                    >
                      <span
                        className="text-[9px]"
                        style={{
                          color: "#d4a855",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        👁 {(p.view_count || 0).toLocaleString()}
                      </span>
                    </div>
                    {/* Creator badge */}
                    {p.creator && (
                      <div
                        className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full"
                        style={{
                          background: "rgba(96,165,250,0.15)",
                          border: "1px solid rgba(96,165,250,0.3)",
                        }}
                      >
                        <span
                          className="text-[9px] font-bold"
                          style={{
                            color: "#60a5fa",
                            fontFamily: "var(--font-table)",
                          }}
                        >
                          by {p.creator}
                        </span>
                      </div>
                    )}
                    {/* Name overlay */}
                    <div className="absolute bottom-2 left-3 right-3">
                      <p
                        className="text-sm font-bold truncate"
                        style={{
                          color: titleColor,
                          fontFamily: "var(--font-table)",
                        }}
                      >
                        {displayName}
                      </p>
                      <p className="text-[10px]" style={{ color: "#5a6a82" }}>
                        <span
                          style={{ color: isMale ? "#60a5fa" : "#f472b6" }}
                        >
                          {isMale ? "♂" : "♀"}
                        </span>
                        {p.color && <span> · {p.color}</span>}
                        {p.country && <span> · {p.country}</span>}
                      </p>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span
                        className="text-[10px]"
                        style={{
                          color: "#5a6a82",
                          fontFamily: "var(--font-table)",
                        }}
                      >
                        Posted {formatDate(p.date_posted)}
                      </span>
                      <span
                        className="text-[10px]"
                        style={{
                          color: "#5a6a82",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        ID:{" "}
                        <span style={{ color: "#d4a855" }}>{p.id}</span>
                      </span>
                    </div>

                    {/* Info badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {p.breeder && (
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded-full"
                          style={{
                            background: "rgba(212,168,85,0.1)",
                            color: "#d4a855",
                            border: "1px solid rgba(212,168,85,0.2)",
                            fontFamily: "var(--font-table)",
                          }}
                        >
                          Breeder: {p.breeder}
                        </span>
                      )}
                      {p.owner && (
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded-full"
                          style={{
                            background: "rgba(34,197,94,0.1)",
                            color: "#22c55e",
                            border: "1px solid rgba(34,197,94,0.2)",
                            fontFamily: "var(--font-table)",
                          }}
                        >
                          Owner: {p.owner}
                        </span>
                      )}
                    </div>

                    {/* View button */}
                    <div className="flex items-center gap-2 pt-1">
                      <span
                        className="text-[10px] px-2 py-1 rounded-lg font-semibold transition-all group-hover:scale-105"
                        style={{
                          background: "rgba(212,168,85,0.12)",
                          color: "#d4a855",
                          border: "1px solid rgba(212,168,85,0.3)",
                          fontFamily: "var(--font-table)",
                        }}
                      >
                        View Pedigree
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
