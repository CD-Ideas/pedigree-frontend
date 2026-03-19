"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

/* ─── Types ─── */
interface PublishedPedigree {
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
  pedigree_notes: string;
  journal_json: string;
  slots_json: string;
  tree_json: string;
  photo_path: string;
  view_count: number;
  date_posted: string;
  last_modified: string;
}

interface TreeRow {
  gen: number;
  pos: number;
  dog_id: number | null;
  name: string;
  sex: string | null;
}

const LOGO = "https://i.imgur.com/cAvQemZ.png";

/* ─── Helpers ─── */
function getDogCardColor(name: string): string {
  const n = (name || "").toUpperCase();
  if (/\bGR\s*CH\b/.test(n)) return "#60a5fa";
  if (/(?:^|\s|\()CH\b/.test(n)) return "#fc8181";
  const xw = n.match(/\b(\d+)X[WL]\b/);
  if (xw) {
    const num = parseInt(xw[1]);
    if (num === 1) return "#2dd4bf";
    if (num === 2) return "#fb923c";
    if (num === 3) return "#d4a855";
    if (num === 4) return "#f472b6";
    if (num >= 5) return "#c084fc";
  }
  if (/\bROM\b/.test(n)) return "#22d3ee";
  if (/\bPOR\b/.test(n)) return "#a78bfa";
  return "#e0e0e0";
}

function getXWColor(name: string): string | null {
  const nameUpper = (name || "").toUpperCase();
  const match = nameUpper.match(/\b(\d+)X[WL]\b/);
  if (!match) return null;
  const num = parseInt(match[1]);
  if (num === 1) return "#2dd4bf";
  if (num === 2) return "#fb923c";
  if (num === 4) return "#f472b6";
  if (num >= 5) return "#c084fc";
  return null;
}

function buildDisplayName(ped: PublishedPedigree): string {
  const parts: string[] = [];
  if (ped.prefix) parts.push(ped.prefix);
  parts.push(ped.name);
  const suffixes: string[] = [];
  if (ped.suffix_wins) suffixes.push(`(${ped.suffix_wins})`);
  if (ped.suffix_losses) suffixes.push(`(${ped.suffix_losses})`);
  if (ped.suffix_draws) suffixes.push(`(${ped.suffix_draws})`);
  if (ped.suffix_honors) suffixes.push(ped.suffix_honors);
  if (suffixes.length) parts.push(suffixes.join(" "));
  return parts.join(" ");
}

function formatDate(iso: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

/* ─── Search Component ─── */
function NavSearch() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ dog_id: number; registered_name: string }[]>([]);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (q.length < 2) { setResults([]); return; }
    const t = setTimeout(() => {
      fetch(`/api/dogs/search?q=${encodeURIComponent(q)}&limit=8`)
        .then((r) => r.json())
        .then((d) => { setResults(d); setShow(true); })
        .catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="relative">
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => results.length > 0 && setShow(true)}
        onBlur={() => setTimeout(() => setShow(false), 200)}
        placeholder="Search dogs..."
        className="w-full rounded-lg px-3 py-2 text-sm outline-none"
        style={{
          background: "var(--bg-elevated, #151d2e)",
          border: "1px solid rgba(30,64,120,0.5)",
          color: "var(--text-primary, #e2e8f0)",
          fontFamily: "var(--font-table, Rajdhani, sans-serif)",
        }}
      />
      {show && results.length > 0 && (
        <div
          className="absolute top-full mt-1 left-0 right-0 rounded-lg overflow-hidden z-50"
          style={{
            background: "var(--bg-elevated, #151d2e)",
            border: "1px solid rgba(30,64,120,0.5)",
            maxHeight: 300,
            overflowY: "auto",
          }}
        >
          {results.map((r) => (
            <Link
              key={r.dog_id}
              href={`/pedigree/${r.dog_id}`}
              className="block px-3 py-2 text-sm hover:bg-white/5 transition-colors"
              style={{ color: getDogCardColor(r.registered_name), fontFamily: "var(--font-table)" }}
            >
              {r.registered_name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Pedigree Tree ─── */
function PedigreeTreeView({ tree, dogName, isMale }: { tree: TreeRow[]; dogName: string; isMale: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [displayGens, setDisplayGens] = useState(4);

  const byGen: Record<number, TreeRow[]> = {};
  tree.forEach((r) => {
    if (!byGen[r.gen]) byGen[r.gen] = [];
    byGen[r.gen].push(r);
  });
  Object.values(byGen).forEach((arr) => arr.sort((a, b) => a.pos - b.pos));

  const gens = Object.keys(byGen).map(Number).sort();
  if (gens.length === 0)
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4 opacity-30">🌳</div>
        <p style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)", fontSize: "15px" }}>No pedigree data available</p>
      </div>
    );

  const maxAvailGen = Math.max(...gens);
  const maxGen = Math.min(displayGens, maxAvailGen);
  const genLabels = ["First", "Second", "Third", "Fourth", "Fifth"];

  return (
    <div className="relative">
      {/* Controls bar */}
      <div className="absolute top-1 right-2 z-10 flex items-center gap-2">
        <div className="flex items-center gap-0.5 rounded-md p-0.5" style={{ background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)", border: "1px solid rgba(30,64,120,0.8)" }}>
          {[3, 4].map((g) => (
            <button key={g} onClick={() => { setDisplayGens(g); setZoom(1); if (containerRef.current) containerRef.current.scrollLeft = 0; }}
              className="px-2 h-5 rounded flex items-center justify-center text-[10px] font-bold transition-all"
              style={{
                background: displayGens === g ? "linear-gradient(135deg, rgba(212,168,85,0.2), rgba(212,168,85,0.08))" : "transparent",
                color: displayGens === g ? "var(--accent-gold)" : "var(--text-muted)",
                border: displayGens === g ? "1px solid rgba(212,168,85,0.3)" : "1px solid transparent",
                fontFamily: "var(--font-table)",
              }}>
              {g}G
            </button>
          ))}
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))} className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold" style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>−</button>
          <span className="text-[9px] px-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))} className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold" style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>+</button>
          <button onClick={() => setZoom(1)} className="ml-0.5 px-1.5 h-5 rounded flex items-center justify-center text-[9px]" style={{ background: "var(--bg-elevated)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>Reset</button>
        </div>
      </div>

      <div ref={containerRef} className="overflow-x-auto overflow-y-hidden pb-1 pt-7" style={{ cursor: zoom !== 1 ? "grab" : "default" }}>
        <div style={{ transform: `scale(${zoom})`, transformOrigin: "top left", transition: "transform 0.2s", minWidth: "900px" }}>
          <div className="text-center mb-2">
            <h3 style={{ fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "13px", letterSpacing: "0.06em", textTransform: "uppercase", color: "#4a5568" }}>
              {maxGen} Generation Pedigree
            </h3>
          </div>

          {/* Column headers */}
          <div className="mb-1" style={{ display: "grid", gridTemplateColumns: `170px repeat(${maxGen}, 1fr)`, gap: "4px" }}>
            <div className="px-1.5 py-1 text-center" style={{ fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "10px", color: "#4a5568", textTransform: "uppercase", letterSpacing: "0.1em" }}>Dog</div>
            {gens.filter((g) => g <= maxGen).map((g) => (
              <div key={g} className="px-1.5 py-1 text-center" style={{ fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "10px", color: "#4a5568", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                {genLabels[g - 1] || `Gen ${g}`}
              </div>
            ))}
          </div>

          {/* Tree grid */}
          <div style={{ display: "grid", gridTemplateColumns: `170px repeat(${maxGen}, 1fr)`, gap: "4px" }}>
            {/* Root dog */}
            <div className="flex items-center" style={{ minWidth: 0, overflow: "hidden" }}>
              <div className="w-full rounded-lg px-2 py-1.5 font-bold" style={{
                background: "linear-gradient(135deg, #fef9ee, #fdf3dc)",
                border: "2px solid rgba(161,120,40,0.5)",
                color: "#7a5c10",
                boxShadow: "0 2px 8px rgba(161,120,40,0.15), inset 0 1px 0 rgba(255,255,255,0.8)",
                fontFamily: "var(--font-table)",
                fontSize: "12px",
              }}>
                <div style={{ fontSize: "8px" }} className="uppercase tracking-wider opacity-60 mb-0.5">
                  {isMale ? "♂" : "♀"} Subject
                </div>
                <span className="block" style={{ wordBreak: "break-word", whiteSpace: "normal" }}>{dogName}</span>
              </div>
            </div>

            {/* Generation columns */}
            {gens.filter((g) => g <= maxGen).map((gen) => {
              const ancestors = byGen[gen] || [];
              const cellMinH = gen <= 1 ? "40px" : gen === 2 ? "34px" : gen === 3 ? "28px" : "24px";
              const fontSize = gen <= 1 ? "13px" : gen === 2 ? "12px" : "11px";

              return (
                <div key={gen} className="flex flex-col gap-1" style={{ minWidth: 0, overflow: "hidden" }}>
                  {ancestors.slice(0, Math.pow(2, gen)).map((a, i) => {
                    const nameUpper = (a.name || "").toUpperCase();
                    const isGrCh = /\bGR\s*CH\b/.test(nameUpper);
                    const isCh = !isGrCh && /\bCH\b/.test(nameUpper);
                    const isChampion = isGrCh || isCh;
                    const xwMatch = nameUpper.match(/\b(\d+)X[WL]\b/);
                    const xwNum = xwMatch ? parseInt(xwMatch[1]) : 0;

                    const cellBg = isGrCh
                      ? "linear-gradient(135deg, rgba(29,91,191,0.18), rgba(29,91,191,0.06), #ffffff)"
                      : isCh
                        ? "linear-gradient(135deg, rgba(192,40,40,0.15), rgba(192,40,40,0.05), #ffffff)"
                        : xwNum === 3
                          ? "linear-gradient(135deg, rgba(180,130,20,0.16), rgba(180,130,20,0.05), #ffffff)"
                          : xwNum === 1
                            ? "linear-gradient(135deg, rgba(13,116,104,0.14), rgba(13,116,104,0.04), #ffffff)"
                            : xwNum === 2
                              ? "linear-gradient(135deg, rgba(234,88,12,0.14), rgba(234,88,12,0.04), #ffffff)"
                              : xwNum === 4
                                ? "linear-gradient(135deg, rgba(219,39,119,0.14), rgba(219,39,119,0.04), #ffffff)"
                                : xwNum >= 5
                                  ? "linear-gradient(135deg, rgba(109,48,176,0.14), rgba(109,48,176,0.04), #ffffff)"
                                  : "linear-gradient(135deg, #ffffff, #f7f8fa)";

                    const cellBorder = isGrCh ? "rgba(29,91,191,0.75)"
                      : isCh ? "rgba(192,40,40,0.7)"
                        : xwNum === 3 ? "rgba(160,115,15,0.7)"
                          : xwNum === 1 ? "rgba(13,116,104,0.65)"
                            : xwNum === 2 ? "rgba(200,75,8,0.65)"
                              : xwNum === 4 ? "rgba(176,56,120,0.65)"
                                : xwNum >= 5 ? "rgba(109,48,176,0.65)"
                                  : "rgba(180,185,195,0.4)";

                    const cellTextColor = isGrCh ? "#1d5bbf"
                      : isCh ? "#c02828"
                        : xwNum === 1 ? "#0d7468" : xwNum === 2 ? "#b45a0a" : xwNum === 3 ? "#8a6518"
                          : xwNum === 4 ? "#b03878" : xwNum >= 5 ? "#6d30b0" : "#3a3a3a";

                    const hasLink = !!a.dog_id;

                    return (
                      <div key={`${gen}-${i}`}
                        className="flex-1 rounded-lg px-2.5 py-1.5 flex items-center group relative transition-all duration-200 hover:shadow-lg hover:-translate-y-[1px]"
                        style={{
                          background: cellBg,
                          borderLeft: `4px solid ${cellBorder}`,
                          minHeight: cellMinH,
                          cursor: hasLink ? "pointer" : "default",
                          boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)",
                          borderTop: "1px solid rgba(255,255,255,0.8)",
                        }}
                      >
                        {isChampion && (
                          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center rounded-full" style={{
                            fontSize: "9px", color: "#b8860b",
                            background: "linear-gradient(135deg, #fef3c7, #fde68a)",
                            width: "15px", height: "15px",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                            border: "1px solid rgba(184,134,11,0.3)",
                          }}>★</span>
                        )}
                        {hasLink ? (
                          <Link href={`/pedigree/${a.dog_id}`}
                            className="font-medium truncate block w-full group-hover:underline"
                            style={{
                              color: cellTextColor, fontSize, fontFamily: "var(--font-table)",
                              fontWeight: isChampion ? 700 : 600, lineHeight: 1.1,
                              textShadow: "0 0.5px 0 rgba(255,255,255,0.5)",
                            }}>
                            {a.name}
                          </Link>
                        ) : (
                          <span className="truncate" style={{ color: "#888", fontSize, fontFamily: "var(--font-table)", lineHeight: 1.2 }}>
                            {a.name || "Unknown"}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function PublishedPedigreePage() {
  const params = useParams();
  const id = params.id as string;
  const [ped, setPed] = useState<PublishedPedigree | null>(null);
  const [loading, setLoading] = useState(true);
  const [tree, setTree] = useState<TreeRow[]>([]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/pedigrees/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setPed(null); setLoading(false); return; }
        setPed(data);
        // Parse tree
        try { setTree(JSON.parse(data.tree_json || "[]")); } catch { setTree([]); }
        // Increment view count
        fetch(`/api/pedigrees/${id}/view`, { method: "POST" }).catch(() => {});
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-deep)" }}>
        <div className="flex flex-col items-center gap-4">
          <img src={LOGO} alt="Logo" className="w-12 h-12 rounded-xl animate-pulse" />
          <div className="flex items-center gap-3" style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)" }}>
            <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--accent-gold)", borderTopColor: "transparent" }} />
            Loading pedigree...
          </div>
        </div>
      </div>
    );

  if (!ped)
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-deep)" }}>
        <div className="text-center">
          <div className="text-6xl mb-4">🐕</div>
          <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-table)" }}>Pedigree Not Found</h2>
          <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>This pedigree doesn&apos;t exist or has been removed.</p>
          <Link href="/" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all hover:scale-105"
            style={{ background: "linear-gradient(135deg, var(--accent-gold), #b8860b)", color: "#000", fontFamily: "var(--font-table)" }}>
            ← Back to Home
          </Link>
        </div>
      </div>
    );

  const displayName = buildDisplayName(ped);
  const isMale = ped.sex === "Male" || ped.sex === "MALE" || ped.sex === "M";
  const sexColor = isMale ? "var(--male-color, #60a5fa)" : "var(--female-color, #f472b6)";
  const titleColor = getDogCardColor(displayName);
  const hasTitles = titleColor !== "#e0e0e0";

  const titlePatterns = ["GR CH", "CH", "ROM", "POR", "1XW", "2XW", "3XW", "4XW", "5XW", "6XW", "1XL", "2XL", "3XL"];
  const titles = titlePatterns.filter((t) => displayName.toUpperCase().includes(t));

  // Parse slots for sire/dam display
  let slots: Record<string, { dog_id: number; registered_name: string; photo_url: string | null; sex?: string } | null> = {};
  try { slots = JSON.parse(ped.slots_json || "{}"); } catch { slots = {}; }

  const sire = slots.sire || null;
  const dam = slots.dam || null;

  const photoUrl = ped.photo_path || null;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-deep)" }}>
      <style>{`
        .glow-gold { transition: border-color 0.3s ease; }
        .glow-gold:hover { border-color: #d4a855 !important; }
        .glow-blue { transition: border-color 0.3s ease; }
        .glow-blue:hover { border-color: #60a5fa !important; }
        .glow-pink { transition: border-color 0.3s ease; }
        .glow-pink:hover { border-color: #f472b6 !important; }
        .glow-teal { transition: border-color 0.3s ease; }
        .glow-teal:hover { border-color: #2dd4bf !important; }
      `}</style>

      {/* ─── Top Nav ─── */}
      <nav className="sticky top-0 z-50 px-4 md:px-6 py-3 flex items-center justify-between"
        style={{ background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)", backdropFilter: "blur(20px)", borderBottom: "1.5px solid rgba(30,64,120,0.8)" }}>
        <Link href="/" className="flex items-center gap-3">
          <img src={LOGO} alt="Logo" className="w-8 h-8 rounded-lg" />
          <span style={{
            fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.25rem",
            background: "linear-gradient(135deg, #e8c86e, #d4a855, #b8860b)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            letterSpacing: "0.02em",
          }}>
            Pedigree Platform
          </span>
        </Link>
        <div className="flex-1 max-w-md mx-4">
          <NavSearch />
        </div>
        <div className="flex items-center gap-2">
          <Link href="/login" className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-105"
            style={{ background: "linear-gradient(135deg, var(--accent-gold), #b8860b)", color: "#000", fontFamily: "var(--font-table)", letterSpacing: "0.02em" }}>
            Sign In
          </Link>
        </div>
      </nav>

      <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-4 space-y-3">

        {/* ─── Dog Name Header ─── */}
        <div className="rounded-lg px-4 py-2 relative"
          style={{ border: "1.5px solid rgba(30,64,120,0.8)", boxShadow: "0 2px 20px rgba(0,0,0,0.25)", background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)" }}>
          {titles.length > 0 && (
            <div className="h-0.5 -mx-4 -mt-2 mb-2 rounded-t-lg" style={{ background: "linear-gradient(90deg, var(--accent-red, #fc8181), var(--accent-gold, #d4a855), var(--accent-red, #fc8181))" }} />
          )}
          <Link href="/" className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold hover:underline transition-colors flex items-center gap-1"
            style={{ color: "var(--accent-gold, #d4a855)", fontFamily: "var(--font-table)" }}>
            ← Back
          </Link>
          <div className="text-center">
            <h1 style={{
              fontFamily: "var(--font-display)", fontWeight: 700,
              fontSize: "clamp(1rem, 2.5vw, 1.5rem)", letterSpacing: "0.02em",
              color: hasTitles ? "var(--accent-gold, #d4a855)" : "var(--text-primary, #e2e8f0)",
            }}>
              {displayName}
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{
              background: "rgba(212,168,85,0.15)", color: "#d4a855",
              fontFamily: "var(--font-mono)", border: "1px solid rgba(212,168,85,0.3)",
            }}>
              Community Pedigree
            </span>
          </div>
        </div>

        {/* ─── Photo + Details ─── */}
        <div className="glow-gold rounded-xl overflow-hidden" style={{ border: "1.5px solid rgba(30,64,120,0.8)", boxShadow: "0 2px 20px rgba(0,0,0,0.25)", background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)", minHeight: "220px" }}>
          <div className="flex flex-col sm:flex-row sm:items-stretch h-full">
            {/* Photo */}
            <div className="flex-shrink-0 relative m-2" style={{ width: "200px", height: "200px" }}>
              {photoUrl ? (
                <img src={photoUrl} alt={displayName} className="rounded-md" style={{ width: "200px", height: "200px", objectFit: "fill" }} />
              ) : (
                <div className="rounded-md flex items-center justify-center"
                  style={{ width: "200px", height: "200px", background: isMale ? "linear-gradient(135deg, #0c1929, #1a2e4a)" : "linear-gradient(135deg, #29101c, #3d1a2e)" }}>
                  <span className="text-2xl opacity-10" style={{ color: sexColor }}>{isMale ? "♂" : "♀"}</span>
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex-1 py-2 pr-2.5 pl-0.5 overflow-y-auto" style={{ fontFamily: "var(--font-table)" }}>
              <div className="space-y-0" style={{ fontSize: "13px", lineHeight: "1.6" }}>
                {ped.breeder && (
                  <div><span style={{ color: "var(--text-muted, #64748b)", fontWeight: 700 }}>BREEDER: </span><span style={{ color: "var(--text-primary, #e2e8f0)" }}>{ped.breeder}</span></div>
                )}
                {ped.owner && (
                  <div><span style={{ color: "var(--text-muted, #64748b)", fontWeight: 700 }}>OWNER: </span><span style={{ color: "var(--text-primary, #e2e8f0)" }}>{ped.owner}</span></div>
                )}
                <div>
                  <span style={{ color: "var(--text-muted, #64748b)", fontWeight: 700 }}>SEX: </span>
                  <span style={{ color: sexColor, fontWeight: 700 }}>{isMale ? "♂" : "♀"} {ped.sex?.toUpperCase()}</span>
                </div>
                {ped.color && (
                  <div><span style={{ color: "var(--text-muted, #64748b)", fontWeight: 700 }}>COLOR: </span><span style={{ color: "var(--text-primary, #e2e8f0)" }}>{ped.color}</span></div>
                )}
                {ped.dob && (
                  <div><span style={{ color: "var(--text-muted, #64748b)", fontWeight: 700 }}>DOB: </span><span style={{ color: "var(--text-primary, #e2e8f0)" }}>{ped.dob}</span></div>
                )}
                {ped.conditioned_weight && (
                  <div><span style={{ color: "var(--text-muted, #64748b)", fontWeight: 700 }}>CONDITIONED WEIGHT: </span><span style={{ color: "var(--text-primary, #e2e8f0)" }}>{ped.conditioned_weight}</span></div>
                )}
                {ped.continent && (
                  <div><span style={{ color: "var(--text-muted, #64748b)", fontWeight: 700 }}>LOCATION: </span><span style={{ color: "var(--text-primary, #e2e8f0)" }}>{ped.country ? `${ped.country}, ${ped.continent}` : ped.continent}</span></div>
                )}
                {ped.date_posted && (
                  <div><span style={{ color: "var(--text-muted, #64748b)", fontWeight: 700 }}>POSTED: </span><span style={{ color: "var(--text-primary, #e2e8f0)" }}>{formatDate(ped.date_posted)}</span></div>
                )}
                {ped.last_modified && (
                  <div><span style={{ color: "var(--text-muted, #64748b)", fontWeight: 700 }}>LAST MODIFIED: </span><span style={{ color: "var(--text-primary, #e2e8f0)" }}>{formatDate(ped.last_modified)}</span></div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ─── Sire / Dam links ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="glow-blue rounded-xl p-2.5"
            style={{ border: "1.5px solid rgba(30,64,120,0.8)", boxShadow: "0 2px 20px rgba(0,0,0,0.25)", background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)" }}>
            <div className="text-[9px] uppercase tracking-wider mb-0.5 font-semibold" style={{ color: "var(--male-color, #60a5fa)", letterSpacing: "0.1em" }}>♂ Sire (Father)</div>
            {sire ? (
              <Link href={`/pedigree/${sire.dog_id}`} className="text-sm font-bold hover:underline" style={{ color: getDogCardColor(sire.registered_name) }}>
                {sire.registered_name}
              </Link>
            ) : <span className="text-sm" style={{ color: "var(--text-muted)" }}>Unknown</span>}
          </div>
          <div className="glow-pink rounded-xl p-2.5"
            style={{ border: "1.5px solid rgba(30,64,120,0.8)", boxShadow: "0 2px 20px rgba(0,0,0,0.25)", background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)" }}>
            <div className="text-[9px] uppercase tracking-wider mb-0.5 font-semibold" style={{ color: "var(--female-color, #f472b6)", letterSpacing: "0.1em" }}>♀ Dam (Mother)</div>
            {dam ? (
              <Link href={`/pedigree/${dam.dog_id}`} className="text-sm font-bold hover:underline" style={{ color: getDogCardColor(dam.registered_name) }}>
                {dam.registered_name}
              </Link>
            ) : <span className="text-sm" style={{ color: "var(--text-muted)" }}>Unknown</span>}
          </div>
        </div>

        {/* ─── Pedigree Tree ─── */}
        <div className="glow-teal rounded-xl overflow-hidden" style={{
          border: "1.5px solid rgba(50,50,55,0.9)",
          boxShadow: "0 4px 30px rgba(0,0,0,0.35), 0 0 60px rgba(0,0,0,0.1)",
        }}>
          <div className="flex items-center justify-between px-4 py-2.5" style={{
            background: "linear-gradient(180deg, #1a1a24 0%, #141418 100%)",
            borderBottom: "1px solid rgba(30,64,120,0.5)",
          }}>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{
                background: "rgba(45,212,191,0.15)", border: "1px solid rgba(45,212,191,0.3)",
              }}>
                <span className="text-sm">🌳</span>
              </div>
              <span className="text-sm font-semibold" style={{ color: "#d4a855", fontFamily: "var(--font-table)" }}>Pedigree</span>
            </div>
            <div className="flex items-center gap-3" style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#9a7020" }}>
              <span>👁 {((ped.view_count || 0) + 1).toLocaleString()} views</span>
            </div>
          </div>
          <div className="p-3 md:p-4" style={{ background: "linear-gradient(180deg, #eef1f5 0%, #e4e8ee 100%)" }}>
            <PedigreeTreeView tree={tree} dogName={displayName} isMale={isMale} />
          </div>
        </div>

        {/* ─── Pedigree Notes ─── */}
        {ped.pedigree_notes && (
          <div className="glow-gold rounded-xl p-4" style={{
            border: "1.5px solid rgba(30,64,120,0.8)",
            boxShadow: "0 2px 20px rgba(0,0,0,0.25)",
            background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)",
          }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(212,168,85,0.15)", border: "1px solid rgba(212,168,85,0.3)" }}>
                <span className="text-sm">📝</span>
              </div>
              <span className="text-sm font-semibold" style={{ color: "#d4a855", fontFamily: "var(--font-table)" }}>Pedigree Notes</span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary, #e2e8f0)", fontFamily: "var(--font-table)" }}>
              {ped.pedigree_notes}
            </p>
          </div>
        )}

        {/* ─── Footer ─── */}
        <footer className="text-center py-8 mt-8" style={{ borderTop: "1px solid var(--border, rgba(30,64,120,0.5))" }}>
          <div className="flex items-center justify-center gap-2 mb-3">
            <img src={LOGO} alt="Logo" className="w-6 h-6 rounded" />
            <span style={{
              fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "14px",
              background: "linear-gradient(135deg, #e8c86e, #d4a855)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>Pedigree Platform</span>
          </div>
          <p className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)" }}>
            The modern pedigree hub for breeders, owners, and enthusiasts.
          </p>
          <div className="flex items-center justify-center gap-4 mt-3">
            <Link href="/privacy" className="text-xs hover:underline" style={{ color: "var(--text-muted)" }}>Privacy</Link>
            <Link href="/terms" className="text-xs hover:underline" style={{ color: "var(--text-muted)" }}>Terms</Link>
            <Link href="/contact" className="text-xs hover:underline" style={{ color: "var(--text-muted)" }}>Contact</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
