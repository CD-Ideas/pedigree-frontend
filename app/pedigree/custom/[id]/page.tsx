"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getDogColor } from "@/app/utils/colors";

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
  user_id: number | null;
  creator_username: string | null;
}

interface TreeRow {
  gen: number;
  pos: number;
  dog_id: number | null;
  name: string;
  sex: string | null;
}

const LOGO = "/logo.png";

/* ─── Helpers ─── */

function getXWColor(name: string): string | null {
  const nameUpper = (name || "").toUpperCase();
  const match = nameUpper.match(/\b(\d+)X[WL]\b/);
  if (!match) return null;
  const num = parseInt(match[1]);
  if (num === 1) return "#0d7468";
  if (num === 2) return "#b45a0a";
  if (num === 4) return "#b03878";
  if (num >= 5) return "#6d30b0";
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
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }).toUpperCase();
  } catch (_e) {
    return iso;
  }
}

/* ─── Share Buttons ─── */
function ShareButton({ dogName }: { dogName: string }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: `${dogName} - Pedigree Platform`, url }); } catch (_e) {}
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  return (
    <button onClick={share}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105"
      style={{
        background: copied ? "#d4edda" : "#FAF7F2",
        color: copied ? "#155724" : "#1C1C1C",
        border: "2px solid #EDE4D5",
        fontFamily: "var(--font-table)",
      }}>
      {copied ? "Copied!" : "Share"}
    </button>
  );
}

function TelegramButton({ dogName }: { dogName: string }) {
  const handleClick = () => {
    const url = window.location.href;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}`, "_blank");
  };
  return (
    <button onClick={handleClick}
      className="inline-flex items-center justify-center w-10 h-10 rounded-lg transition-all hover:scale-110"
      style={{ background: "#FAF7F2", border: "2px solid #EDE4D5" }}
      title="Share on Telegram">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="#0088cc">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
      </svg>
    </button>
  );
}

function WhatsAppButton({ dogName }: { dogName: string }) {
  const handleClick = () => {
    const url = window.location.href;
    window.open(`https://wa.me/?text=${encodeURIComponent(url)}`, "_blank");
  };
  return (
    <button onClick={handleClick}
      className="inline-flex items-center justify-center w-10 h-10 rounded-lg transition-all hover:scale-110"
      style={{ background: "#FAF7F2", border: "2px solid #EDE4D5" }}
      title="Share on WhatsApp">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="#25d366">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
      </svg>
    </button>
  );
}

/* ─── Search Component ─── */
function PedigreeSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ dog_id: number; registered_name: string; photo_url: string | null }[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const search = (q: string) => {
    setQuery(q);
    if (timer.current) clearTimeout(timer.current);
    const urlMatch = q.match(/pedigreeplatform\.com\/(?:pedigree|dogs)\/(\d+)/);
    if (urlMatch) {
      window.location.href = `/pedigree/${urlMatch[1]}`;
      return;
    }
    if (q.length < 2) { setResults([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/dogs/search?q=${encodeURIComponent(q)}&limit=10`);
        const data = await res.json();
        setResults(data.dogs || []);
        setOpen(true);
      } catch (_e) { setResults([]); }
    }, 300);
  };

  return (
    <div ref={ref} className="relative">
      <div className="glow-gold rounded-xl overflow-hidden" style={{ border: "2px solid #C9B29F",  background: "#FAF7F2",  }}>
        <div className="px-4 py-2.5 flex items-center gap-3">
          <span className="text-base">🔍</span>
          <input type="text" placeholder="Search by dog name or paste a pedigree URL..."
            value={query} onChange={(e) => search(e.target.value)}
            onFocus={() => { if (results.length > 0) setOpen(true); }}
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }} />
          {query && <button onClick={() => { setQuery(""); setResults([]); setOpen(false); }} className="text-xs opacity-50 hover:opacity-100">✕</button>}
        </div>
      </div>
      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 rounded-xl overflow-hidden z-50 max-h-80 overflow-y-auto"
             style={{ background: "#FAF7F2", border: "2px solid #C9B29F",  }}>
          {results.map((d) => (
            <a key={d.dog_id} href={`/pedigree/${d.dog_id}`}
               className="flex items-center gap-3 px-4 py-2.5 transition-all hover:bg-white/5"
               style={{ borderBottom: "1px solid #C9B29F" }}>
              {d.photo_url ? (
                <img src={d.photo_url.startsWith("http") ? d.photo_url : `https://www.apbt.online-pedigrees.com/${d.photo_url}`}
                     alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" style={{ border: "2px solid #C9B29F" }} />
              ) : (
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm"
                     style={{ background: "#FAFAFA", border: "2px solid #C9B29F" }}>🐕</div>
              )}
              <span className="text-sm font-semibold truncate" style={{ color: getDogColor(d.registered_name), fontFamily: "var(--font-table)" }}>
                {d.registered_name}
              </span>
            </a>
          ))}
        </div>
      )}
      {open && query.length >= 2 && results.length === 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 rounded-xl px-4 py-3 text-center text-xs z-50"
             style={{ background: "#FAF7F2", border: "2px solid #C9B29F", color: "#6B7280", fontFamily: "var(--font-table)" }}>
          No dogs found for &quot;{query}&quot;
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
        <p style={{ color: "#6B7280", fontFamily: "var(--font-table)", fontSize: "15px" }}>No pedigree data available</p>
      </div>
    );

  const maxAvailGen = Math.max(...gens);
  const maxGen = Math.min(displayGens, maxAvailGen);
  const genLabels = ["First", "Second", "Third", "Fourth", "Fifth"];

  return (
    <div className="relative">
      {/* Controls bar */}
      <div className="absolute top-1 right-2 z-10 flex items-center gap-2">
        <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: "#1C1C1C", borderRadius: "8px" }}>
          {[3, 4, 5].map((g) => (
            <button key={g} onClick={() => { setDisplayGens(g); setZoom(1); if (containerRef.current) containerRef.current.scrollLeft = 0; }}
              className="px-3 py-1 rounded-md flex items-center justify-center text-xs font-bold transition-all"
              style={{
                background: displayGens === g ? "#C9B29F" : "transparent",
                color: displayGens === g ? "#1C1C1C" : "#FAF7F2",
                border: "1px solid transparent",
                fontFamily: "var(--font-table)",
                letterSpacing: "0.03em",
                borderRadius: "6px",
              }}>
              {g}G
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: "#1C1C1C", borderRadius: "8px" }}>
          <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))} className="w-7 h-7 rounded-md flex items-center justify-center text-sm font-bold transition-all" style={{ color: "#FAF7F2" }}>−</button>
          <span className="text-xs px-1.5 font-bold" style={{ color: "#C9B29F", fontFamily: "var(--font-table)", minWidth: "36px", textAlign: "center" }}>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))} className="w-7 h-7 rounded-md flex items-center justify-center text-sm font-bold transition-all" style={{ color: "#FAF7F2" }}>+</button>
          <button onClick={() => setZoom(1)} className="ml-0.5 px-2.5 py-1 rounded-md flex items-center justify-center text-[11px] font-bold transition-all" style={{ color: "#FAF7F2", fontFamily: "var(--font-table)", opacity: 0.7 }}>Reset</button>
        </div>
      </div>

      <div ref={containerRef} className="overflow-x-auto overflow-y-hidden pb-1 pt-7" style={{ cursor: zoom !== 1 ? "grab" : "default" }}>
        <div style={{ transform: `scale(${zoom})`, transformOrigin: "top left", transition: "transform 0.2s", minWidth: "900px" }}>
          <div className="text-center mb-2">
            <h3 style={{ fontFamily: "var(--font-table)", fontWeight: 700, fontSize: "15px", letterSpacing: "0.08em", textTransform: "uppercase", color: "#1C1C1C" }}>
              {maxGen} Generation Pedigree
            </h3>
          </div>

          {/* Column headers */}
          <div className="mb-1" style={{ display: "grid", gridTemplateColumns: `170px repeat(${maxGen}, 1fr)`, gap: "4px" }}>
            <div className="px-1.5 py-1 text-center" style={{ fontFamily: "var(--font-table)", fontWeight: 700, fontSize: "11px", color: "#1C1C1C", textTransform: "uppercase", letterSpacing: "0.1em" }}>Dog</div>
            {gens.filter((g) => g <= maxGen).map((g) => (
              <div key={g} className="px-1.5 py-1 text-center" style={{ fontFamily: "var(--font-table)", fontWeight: 700, fontSize: "11px", color: "#1C1C1C", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                {genLabels[g - 1] || `Gen ${g}`}
              </div>
            ))}
          </div>

          {/* Tree grid */}
          <div style={{ display: "grid", gridTemplateColumns: `170px repeat(${maxGen}, 1fr)`, gap: "4px" }}>
            {/* Root dog */}
            <div className="flex items-center" style={{ minWidth: 0, overflow: "hidden" }}>
              <div className="w-full rounded-lg px-2 py-1.5 font-bold" style={{
                background: `linear-gradient(135deg, ${getDogColor(dogName)}10, #FAF7F2)`,
                border: `2px solid ${getDogColor(dogName)}`,
                color: getDogColor(dogName),
                fontFamily: "var(--font-table)",
                fontSize: "12px",
                borderRadius: "8px",
              }}>
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

                    const isRom = /\bROM\b/.test(nameUpper);
                    const isPor = /\bPOR\b/.test(nameUpper);
                    const cellTint = isGrCh
                      ? "rgba(96,165,250,0.15)"
                      : isCh
                        ? "rgba(252,129,129,0.15)"
                        : isRom
                          ? "rgba(34,211,238,0.15)"
                          : isPor
                            ? "rgba(167,139,250,0.15)"
                            : xwNum === 1
                              ? "rgba(45,212,191,0.15)"
                              : xwNum === 2
                                ? "rgba(251,146,60,0.15)"
                                : xwNum === 3
                                  ? "rgba(212,168,85,0.15)"
                                  : xwNum === 4
                                    ? "rgba(244,114,182,0.15)"
                                    : xwNum >= 5
                                      ? "rgba(192,132,252,0.15)"
                                      : "rgba(58,58,58,0.15)";

                    const cellBorderColor = isGrCh ? "#1d5bbf"
                      : isCh ? "#c02828"
                        : isRom ? "#0d7468"
                          : isPor ? "#6d30b0"
                            : xwNum === 1 ? "#0d7468"
                              : xwNum === 2 ? "#b45a0a"
                                : xwNum === 3 ? "#8a6518"
                                  : xwNum === 4 ? "#b03878"
                                    : xwNum >= 5 ? "#6d30b0"
                                      : "#3a3a3a";

                    const cellTextColor = isGrCh ? "#1d5bbf"
                      : isCh ? "#c02828"
                        : isRom ? "#0d7468"
                          : isPor ? "#6d30b0"
                            : xwNum === 1 ? "#0d7468" : xwNum === 2 ? "#b45a0a" : xwNum === 3 ? "#8a6518"
                              : xwNum === 4 ? "#b03878" : xwNum >= 5 ? "#6d30b0" : "#3a3a3a";

                    const hasLink = !!a.dog_id;

                    return (
                      <div key={`${gen}-${i}`}
                        className="flex-1 rounded-lg px-2.5 py-1.5 flex items-center group relative transition-all duration-200"
                        style={{
                          background: `linear-gradient(135deg, ${cellTint}, #FAF7F2)`,
                          border: "2px solid #EDE4D5",
                          borderLeftColor: cellBorderColor,
                          borderLeftWidth: "4px",
                          borderRadius: "8px",
                          minHeight: cellMinH,
                          cursor: hasLink ? "pointer" : "default",
                        }}
                      >
                        {isChampion && (
                          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center rounded-lg" style={{
                            fontSize: "9px", color: "#8a6518",
                            background: "#F5EDE0",
                            width: "15px", height: "15px",
                            border: "1px solid #C9B29F",
                          }}>★</span>
                        )}
                        {hasLink ? (
                          <Link href={`/pedigree/${a.dog_id}`}
                            className="font-medium truncate block w-full group-hover:underline"
                            style={{
                              color: cellTextColor, fontSize, fontFamily: "var(--font-table)",
                              fontWeight: isChampion ? 700 : 600, lineHeight: 1.1,
                            }}>
                            {a.name}
                          </Link>
                        ) : (
                          <span className="truncate" style={{ color: "#6B7280", fontSize, fontFamily: "var(--font-table)", lineHeight: 1.2 }}>
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

/* ─── Auth Button ─── */
function NavAuthButton() {
  const [user, setUser] = useState<{ id: number; username: string } | null>(null);
  useEffect(() => {
    try {
      const u = localStorage.getItem("user");
      if (u) setUser(JSON.parse(u));
    } catch (_e) { /* ignore */ }
  }, []);

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>
          {user.username}
        </span>
        <button
          onClick={() => { localStorage.removeItem("token"); localStorage.removeItem("refreshToken"); localStorage.removeItem("user"); window.location.reload(); }}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
          style={{ background: "rgba(220,38,38,0.15)", color: "#ef4444", border: "1px solid rgba(220,38,38,0.3)", fontFamily: "var(--font-table)" }}>
          Logout
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link href="/login" className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-105"
        style={{ background: "#1C1C1C", color: "#FAF7F2", fontFamily: "var(--font-table)", letterSpacing: "0.02em" }}>
        Sign In
      </Link>
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
  const [isOwner, setIsOwner] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setLoading(true);
    fetch(`/api/pedigrees/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setPed(null); setLoading(false); return; }
        setPed(data);
        // Parse tree
        try { setTree(JSON.parse(data.tree_json || "[]")); } catch (_e) { setTree([]); }
        // Check if current user is the owner
        try {
          const userStr = localStorage.getItem("user");
          if (userStr) {
            const user = JSON.parse(userStr);
            if (user?.id && data.user_id && user.id === data.user_id) {
              setIsOwner(true);
            }
          }
        } catch (_e) { /* ignore */ }
        // Increment view count
        fetch(`/api/pedigrees/${id}/view`, { method: "POST" }).catch(() => {});
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const userStr = localStorage.getItem("user");
      if (!userStr) return;
      const user = JSON.parse(userStr);
      const res = await fetch(`/api/pedigrees/${id}?userId=${user.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        router.push("/pedigree-lab");
      } else {
        alert(data.error || "Failed to delete pedigree");
        setDeleting(false);
        setShowDeleteConfirm(false);
      }
    } catch {
      alert("Failed to delete pedigree");
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#EDE4D5" }}>
        <div className="flex flex-col items-center gap-4">
          <img src={LOGO} alt="Logo" className="w-24 animate-pulse" style={{ height: "auto" }} />
          <div className="flex items-center gap-3" style={{ color: "#6B7280", fontFamily: "var(--font-table)" }}>
            <div className="w-5 h-5 rounded-lg border-2 border-t-transparent animate-spin" style={{ borderColor: "#C9B29F", borderTopColor: "transparent" }} />
            Loading pedigree...
          </div>
        </div>
      </div>
    );

  if (!ped)
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#EDE4D5" }}>
        <div className="text-center">
          <div className="text-6xl mb-4">🐕</div>
          <h2 className="text-xl font-bold mb-2" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>Pedigree Not Found</h2>
          <p className="text-sm mb-6" style={{ color: "#6B7280" }}>This pedigree doesn&apos;t exist or has been removed.</p>
          <Link href="/" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all hover:scale-105"
            style={{ background: "#1C1C1C", color: "#FAF7F2", fontFamily: "var(--font-table)" }}>
            ← Back to Home
          </Link>
        </div>
      </div>
    );

  const displayName = buildDisplayName(ped);
  const isMale = ped.sex === "Male" || ped.sex === "MALE" || ped.sex === "M";
  const sexColor = isMale ? "#1d5bbf" : "#9f1239";
  const titleColor = getDogColor(displayName);
  const hasTitles = titleColor !== "#3a3a3a";

  const titlePatterns = ["GR CH", "CH", "ROM", "POR", "1XW", "2XW", "3XW", "4XW", "5XW", "6XW", "1XL", "2XL", "3XL"];
  const titles = titlePatterns.filter((t) => displayName.toUpperCase().includes(t));

  // Parse slots for sire/dam display
  let slots: Record<string, { dog_id: number; registered_name: string; photo_url: string | null; sex?: string } | null> = {};
  try { slots = JSON.parse(ped.slots_json || "{}"); } catch (_e) { slots = {}; }

  const sire = slots.sire || null;
  const dam = slots.dam || null;

  const photoUrl = ped.photo_path || null;

  return (
    <div className="min-h-screen" style={{ background: "#EDE4D5" }}>
      <style>{`
        .glow-gold { transition: border-color 0.3s ease; }
        .glow-gold:hover { border-color: #C9B29F !important; }
        .glow-blue { transition: border-color 0.3s ease; }
        .glow-blue:hover { border-color: #C9B29F !important; }
        .glow-pink { transition: border-color 0.3s ease; }
        .glow-pink:hover { border-color: #C9B29F !important; }
        .glow-teal { transition: border-color 0.3s ease; }
        .glow-teal:hover { border-color: #C9B29F !important; }
      `}</style>

      <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-4 space-y-3">
        {/* Share toolbar */}
        <div className="flex items-center justify-end gap-2">
          <ShareButton dogName={displayName} />
          <TelegramButton dogName={displayName} />
          <WhatsAppButton dogName={displayName} />
        </div>

        {/* ─── Dog Name Header ─── */}
        <div className="rounded-lg px-4 py-2 relative"
          style={{
            border: `2px solid ${hasTitles ? titleColor : "#3a3a3a"}`,
            background: hasTitles
              ? `linear-gradient(135deg, ${titleColor}10, #FAF7F2)`
              : `linear-gradient(135deg, rgba(58,58,58,0.15), #FAF7F2)`,
            borderRadius: "8px",
          }}>
          <div className="text-center">
            <h1 style={{
              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontWeight: 700,
              fontSize: "clamp(1rem, 2.5vw, 1.5rem)", letterSpacing: "0.02em",
              color: titleColor,
            }}>
              {displayName}
            </h1>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="text-[10px] px-2 py-0.5 rounded-lg" style={{
                background: "rgba(201,178,159,0.15)", color: "#1C1C1C",
                fontFamily: "var(--font-mono)", border: "2px solid #C9B29F",
              }}>
                Community Pedigree
              </span>
              {ped.creator_username && (
                <span className="text-[10px] px-2 py-0.5 rounded-lg" style={{
                  background: "rgba(201,178,159,0.12)", color: "#1C1C1C",
                  fontFamily: "var(--font-table)", border: "1px solid rgba(96,165,250,0.3)",
                }}>
                  by {ped.creator_username}
                </span>
              )}
              {isOwner && (
                <>
                  <Link href={`/pedigree-lab?edit=${ped.id}`}
                    className="text-[10px] px-2 py-0.5 rounded-lg font-semibold transition-all hover:scale-105"
                    style={{
                      background: "rgba(34,197,94,0.12)", color: "#22c55e",
                      fontFamily: "var(--font-table)", border: "1px solid rgba(34,197,94,0.3)",
                    }}>
                    ✎ Edit
                  </Link>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-[10px] px-2 py-0.5 rounded-lg font-semibold transition-all hover:scale-105"
                    style={{
                      background: "rgba(239,68,68,0.12)", color: "#ef4444",
                      fontFamily: "var(--font-table)", border: "1px solid rgba(239,68,68,0.3)",
                    }}>
                    ✕ Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ─── Photo + Details ─── */}
        <div className="glow-gold rounded-xl overflow-hidden" style={{ border: "2px solid #C9B29F",  background: "#FAFAFA",  minHeight: "220px" }}>
          <div className="flex flex-col sm:flex-row sm:items-stretch h-full">
            {/* Photo */}
            <div className="flex-shrink-0 relative m-2 w-full sm:w-[200px] h-[200px]">
              {photoUrl ? (
                <img src={photoUrl} alt={displayName} className="rounded-md w-full sm:w-[200px] h-[200px]" style={{ objectFit: "fill" }} />
              ) : (
                <div className="rounded-md flex items-center justify-center w-full sm:w-[200px] h-[200px]"
                  style={{ background: isMale ? "rgba(29,91,191,0.08)" : "rgba(159,18,57,0.08)" }}>
                  <span className="text-2xl opacity-10" style={{ color: sexColor }}>{isMale ? "♂" : "♀"}</span>
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex-1 py-2 pr-2.5 pl-0.5 overflow-y-auto" style={{ fontFamily: "var(--font-table)" }}>
              <div className="space-y-0" style={{ fontSize: "13px", lineHeight: "1.6" }}>
                {ped.breeder && (
                  <div><span style={{ color: "#6B7280", fontWeight: 700 }}>BREEDER: </span><span style={{ color: "#1C1C1C" }}>{ped.breeder}</span></div>
                )}
                {ped.owner && (
                  <div><span style={{ color: "#6B7280", fontWeight: 700 }}>OWNER: </span><span style={{ color: "#1C1C1C" }}>{ped.owner}</span></div>
                )}
                <div>
                  <span style={{ color: "#6B7280", fontWeight: 700 }}>SEX: </span>
                  <span style={{ color: sexColor, fontWeight: 700 }}>{isMale ? "♂" : "♀"} {ped.sex?.toUpperCase()}</span>
                </div>
                {ped.color && (
                  <div><span style={{ color: "#6B7280", fontWeight: 700 }}>COLOR: </span><span style={{ color: "#1C1C1C" }}>{ped.color}</span></div>
                )}
                {ped.dob && (
                  <div><span style={{ color: "#6B7280", fontWeight: 700 }}>DOB: </span><span style={{ color: "#1C1C1C" }}>{ped.dob}</span></div>
                )}
                {ped.conditioned_weight && (
                  <div><span style={{ color: "#6B7280", fontWeight: 700 }}>CONDITIONED WEIGHT: </span><span style={{ color: "#1C1C1C" }}>{ped.conditioned_weight}</span></div>
                )}
                {ped.continent && (
                  <div><span style={{ color: "#6B7280", fontWeight: 700 }}>LOCATION: </span><span style={{ color: "#1C1C1C" }}>{ped.country ? `${ped.country}, ${ped.continent}` : ped.continent}</span></div>
                )}
                {ped.date_posted && (
                  <div><span style={{ color: "#6B7280", fontWeight: 700 }}>POSTED: </span><span style={{ color: "#1C1C1C" }}>{formatDate(ped.date_posted)}</span></div>
                )}
                {ped.last_modified && (
                  <div><span style={{ color: "#6B7280", fontWeight: 700 }}>LAST MODIFIED: </span><span style={{ color: "#1C1C1C" }}>{formatDate(ped.last_modified)}</span></div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ─── Pedigree Notes ─── */}
        {ped.pedigree_notes && (
          <div className="glow-gold rounded-xl px-3 py-2" style={{
            border: "2px solid #C9B29F",

            background: "#FAFAFA",
            
          }}>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0" style={{ background: "rgba(201,178,159,0.15)", border: "2px solid #C9B29F" }}>
                <span className="text-[10px]">📝</span>
              </div>
              <span className="text-xs font-semibold flex-shrink-0" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>Pedigree Notes:</span>
              <p className="text-xs" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)", lineHeight: "1.4" }}>
                {ped.pedigree_notes}
              </p>
            </div>
          </div>
        )}

        {/* ─── Sire / Dam links ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="glow-blue rounded-xl p-2.5"
            style={{ border: "2px solid #C9B29F",  background: "#FAFAFA",  }}>
            <div className="text-[9px] uppercase tracking-wider mb-0.5 font-semibold" style={{ color: "#1d5bbf", letterSpacing: "0.1em" }}>♂ Sire (Father)</div>
            {sire ? (
              <Link href={`/pedigree/${sire.dog_id}`} className="text-sm font-bold hover:underline" style={{ color: getDogColor(sire.registered_name) }}>
                {sire.registered_name}
              </Link>
            ) : <span className="text-sm" style={{ color: "#6B7280" }}>Unknown</span>}
          </div>
          <div className="glow-pink rounded-xl p-2.5"
            style={{ border: "2px solid #C9B29F",  background: "#FAFAFA",  }}>
            <div className="text-[9px] uppercase tracking-wider mb-0.5 font-semibold" style={{ color: "#9f1239", letterSpacing: "0.1em" }}>♀ Dam (Mother)</div>
            {dam ? (
              <Link href={`/pedigree/${dam.dog_id}`} className="text-sm font-bold hover:underline" style={{ color: getDogColor(dam.registered_name) }}>
                {dam.registered_name}
              </Link>
            ) : <span className="text-sm" style={{ color: "#6B7280" }}>Unknown</span>}
          </div>
        </div>

        {/* ─── Pedigree Tree ─── */}
        <div className="rounded-xl overflow-hidden" style={{
          border: "2px solid #C9B29F",
          borderRadius: "10px",
        }}>
          <div className="flex items-center justify-between px-4 py-2.5" style={{
            background: "#1C1C1C",
            borderBottom: "2px solid #C9B29F",
          }}>
            <div className="flex items-center gap-2.5">
              <span className="text-sm">🌳</span>
              <span className="text-sm font-semibold" style={{ color: "#FAF7F2", fontFamily: "var(--font-table)" }}>Pedigree</span>
              {tree.length > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-lg font-medium" style={{
                  background: "rgba(201,178,159,0.3)",
                  color: "#C9B29F",
                  fontFamily: "var(--font-table)",
                }}>
                  {tree.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3" style={{ fontFamily: "var(--font-table)", fontSize: "10px", color: "#C9B29F" }}>
              <span>👁 {((ped.view_count || 0) + 1).toLocaleString()} views</span>
            </div>
          </div>
          <div className="p-3 md:p-4" style={{ background: "#FAFAFA" }}>
            <PedigreeTreeView tree={tree} dogName={displayName} isMale={isMale} />
          </div>
        </div>

        {/* ─── Journal (Owner Only) ─── */}
        {isOwner && ped.journal_json && (() => {
          let journal: { rabiesDate?: string; rabiesNextDue?: string; avidChip?: string; vaccines?: { name: string; checked: boolean; date: string }[]; worming?: { type: string; otherType: string; dateWormed: string; nextDue: string; intervalDays: number; remindMe: boolean }[]; notes?: string } = {};
          try { journal = JSON.parse(ped.journal_json); } catch (_e) { /* ignore */ }
          const hasContent = journal.rabiesDate || journal.avidChip || journal.vaccines?.some(v => v.checked) || (journal.worming && journal.worming.length > 0) || journal.notes;
          if (!hasContent) return null;

          const fmtDate = (iso: string) => {
            if (!iso) return "—";
            try { return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }); } catch (_e) { return iso; }
          };

          return (
            <div className="rounded-xl overflow-hidden" style={{
              border: "2px solid #C9B29F",
              background: "#FAFAFA",
            }}>
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-2.5" style={{
                background: "#1C1C1C",
                borderBottom: "2px solid #C9B29F",
              }}>
                <div className="flex items-center gap-2.5">
                  <span className="text-sm">📋</span>
                  <span className="text-sm font-bold uppercase tracking-widest" style={{
                    fontFamily: "var(--font-display)",
                    color: "#FAF7F2",
                    
                  }}>
                    Journal
                  </span>
                </div>
                <span className="text-[9px] px-2 py-0.5 rounded-lg" style={{
                  background: "rgba(220,38,38,0.12)", color: "#ef4444",
                  fontFamily: "var(--font-table)", border: "1px solid rgba(220,38,38,0.3)",
                }}>
                  Private — Only You
                </span>
              </div>

              <div className="p-4 space-y-4">
                {/* Rabies */}
                {journal.rabiesDate && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] uppercase tracking-widest font-semibold block mb-1" style={{ color: "#6B7280", fontFamily: "var(--font-table)" }}>Rabies: Date Given</span>
                      <span className="text-sm" style={{ color: "#1C1C1C", fontFamily: "var(--font-mono)" }}>{fmtDate(journal.rabiesDate)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-widest font-semibold block mb-1" style={{ color: "#6B7280", fontFamily: "var(--font-table)" }}>Rabies: Next Due</span>
                      <span className="text-sm" style={{ color: "#22c55e", fontFamily: "var(--font-mono)" }}>{fmtDate(journal.rabiesNextDue || "")}</span>
                    </div>
                  </div>
                )}

                {/* AVID Chip */}
                {journal.avidChip && (
                  <div>
                    <span className="text-[10px] uppercase tracking-widest font-semibold block mb-1" style={{ color: "#6B7280", fontFamily: "var(--font-table)" }}>AVID Chip</span>
                    <span className="text-sm" style={{ color: "#1C1C1C", fontFamily: "var(--font-mono)" }}>{journal.avidChip}</span>
                  </div>
                )}

                {/* Vaccines */}
                {journal.vaccines && journal.vaccines.some(v => v.checked) && (
                  <div>
                    <span className="text-[10px] uppercase tracking-widest font-semibold block mb-2" style={{ color: "#6B7280", fontFamily: "var(--font-table)" }}>Vaccines</span>
                    <div className="space-y-1.5">
                      {journal.vaccines.filter(v => v.checked).map(v => (
                        <div key={v.name} className="flex items-center justify-between rounded-lg px-3 py-2"
                          style={{ background: "#FAF7F2", border: "2px solid #EDE4D5" }}>
                          <span className="text-xs font-semibold" style={{ color: "#22c55e", fontFamily: "var(--font-table)" }}>✓ {v.name}</span>
                          {v.date && <span className="text-[10px]" style={{ color: "#1C1C1C", fontFamily: "var(--font-mono)" }}>{fmtDate(v.date)}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Worming History */}
                {journal.worming && journal.worming.length > 0 && (
                  <div>
                    <span className="text-[10px] uppercase tracking-widest font-semibold block mb-2" style={{ color: "#6B7280", fontFamily: "var(--font-table)" }}>Worming History</span>
                    <div className="space-y-1.5">
                      {journal.worming.map((w, i) => (
                        <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2"
                          style={{ background: "#FAF7F2", border: "2px solid #EDE4D5" }}>
                          <div className="flex items-center gap-2">
                            {w.remindMe && <span className="text-[9px]">🔔</span>}
                            <span className="text-xs font-semibold" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>
                              {w.type === "Other" ? w.otherType || "Other" : w.type}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px]" style={{ color: "#1C1C1C", fontFamily: "var(--font-mono)" }}>{fmtDate(w.dateWormed)}</span>
                            {w.nextDue && (
                              <>
                                <span className="text-[9px]" style={{ color: "#6B7280" }}>→</span>
                                <span className="text-[10px]" style={{ color: "#22c55e", fontFamily: "var(--font-mono)" }}>Due: {fmtDate(w.nextDue)}</span>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Journal Notes */}
                {journal.notes && (
                  <div>
                    <span className="text-[10px] uppercase tracking-widest font-semibold block mb-1" style={{ color: "#6B7280", fontFamily: "var(--font-table)" }}>Journal Notes</span>
                    <p className="text-sm leading-relaxed" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>{journal.notes}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* ─── Footer ─── */}
        <footer className="text-center py-8 mt-8" style={{ borderTop: "1px solid #D6CEBF" }}>
          <div className="flex items-center justify-center gap-2 mb-3">
            <img src={LOGO} alt="Logo" className="w-12" style={{ height: "auto" }} />
            <span style={{
              fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "14px",
              color: "#1C1C1C",
            }}>Pedigree Platform</span>
          </div>
          <p className="text-xs" style={{ color: "#6B7280", fontFamily: "var(--font-table)" }}>
            The modern pedigree hub for breeders, owners, and enthusiasts.
          </p>
          <div className="flex items-center justify-center gap-4 mt-3">
            <Link href="/privacy" className="text-xs hover:underline" style={{ color: "#6B7280" }}>Privacy</Link>
            <Link href="/terms" className="text-xs hover:underline" style={{ color: "#6B7280" }}>Terms</Link>
            <Link href="/contact" className="text-xs hover:underline" style={{ color: "#6B7280" }}>Contact</Link>
          </div>
        </footer>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.4)",  }}>
          <div className="rounded-xl p-6 max-w-sm w-full" style={{
            background: "#FAF7F2",
            border: "1px solid rgba(239,68,68,0.3)",
            
          }}>
            <div className="text-center mb-4">
              <span className="text-3xl">⚠️</span>
            </div>
            <h3 className="text-sm font-bold text-center mb-2" style={{ color: "#ef4444", fontFamily: "var(--font-display)", letterSpacing: "0.03em" }}>
              Delete Pedigree
            </h3>
            <p className="text-xs text-center mb-1" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>
              Are you sure you want to permanently delete
            </p>
            <p className="text-xs text-center font-bold mb-4" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>
              {ped?.name || "this pedigree"}?
            </p>
            <p className="text-[10px] text-center mb-5" style={{ color: "#ef4444", fontFamily: "var(--font-table)" }}>
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all hover:scale-105"
                style={{
                  background: "#C9B29F",
                  color: "#FAF7F2",
                  fontFamily: "var(--font-table)",
                  letterSpacing: "0.05em",
                }}>
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all hover:scale-105"
                style={{
                  background: "#ef4444",
                  color: "#fff",
                  fontFamily: "var(--font-table)",
                  letterSpacing: "0.05em",
                  
                }}>
                {deleting ? "Deleting..." : "Delete Forever"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
