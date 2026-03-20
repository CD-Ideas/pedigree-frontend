"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";

const LOGO = "https://i.imgur.com/cAvQemZ.png";


interface FamousDog { id: number; name: string; photo_url: string | null; view_count: number; }
interface LineagePath { gen: number; path: string; }
interface SpotlightResult {
  id: number; name: string; photo_url: string | null; sex: string | null;
  birthdate: string | null; owner: string | null; breeder: string | null;
  registration_number: string | null; css_class: string | null;
  view_count: number; offspring_count: number;
  posted_date: string | null;
  num_paths: number; min_gen: number; coi: number; blood_pct: number;
  titles: string[]; gen_label: string; lineage_paths: LineagePath[];
}
interface TargetDog { id: number; name: string; photo_url: string | null; }

const SORT_OPTIONS = [
  { key: "closest", label: "Closest Relation", icon: "🧬" },
  { key: "titles", label: "Highest Titles", icon: "🏆" },
  { key: "views", label: "Most Popular", icon: "👁" },
  { key: "recent", label: "Recently Posted", icon: "📅" },
];

const TITLE_COLORS: Record<string, string> = {
  "GR CH": "#60a5fa", "CH": "#fc8181", "ROM": "#22d3ee", "POR": "#a78bfa",
  "7XW": "#c084fc", "6XW": "#c084fc", "5XW": "#c084fc", "4XW": "#f472b6",
  "3XW": "#d4a855", "2XW": "#fb923c", "1XW": "#2dd4bf",
  "3XL": "#2dd4bf", "2XL": "#fb923c", "1XL": "#2dd4bf",
};

function getDogColor(name: string): string {
  const n = (name || "").toUpperCase();
  if (/\bGR\s*CH\b/.test(n)) return "#60a5fa";
  if (/(?:^|\s|\()CH\b/.test(n)) return "#fc8181";
  if (/\bROM\b/.test(n)) return "#22d3ee";
  if (/\bPOR\b/.test(n)) return "#a78bfa";
  const xw = n.match(/\b(\d+)X[WL]\b/);
  if (xw) {
    const num = parseInt(xw[1]);
    if (num >= 5) return "#c084fc";
    if (num === 4) return "#f472b6";
    if (num === 3) return "#d4a855";
    if (num === 2) return "#fb923c";
    if (num === 1) return "#2dd4bf";
  }
  return "#ffffff";
}

function QuickSearch({ onSelectDog, famousDogs }: { onSelectDog?: (dogId: number) => void; famousDogs: FamousDog[] }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ dog_id: number; registered_name: string; photo_url: string | null }[]>([]);
  const [open, setOpen] = useState(false);
  const [lineage, setLineage] = useState<{ dog: { id: number; name: string; photo_url: string | null }; legendaryMatches: { id: number; name: string; photo_url: string | null; count: number }[] } | null>(null);
  const [lineageLoading, setLineageLoading] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);
  const [genDepth, setGenDepth] = useState(8);
  const lineageListRef = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchLineage = async (dogId: number, dogName: string, dogPhoto: string | null, overrideGen?: number) => {
    setLineageLoading(true);
    setLineage(null);
    setOpen(false);
    const gen = overrideGen ?? genDepth;
    try {
      const res = await fetch(`/api/dogs/${dogId}?gen=${gen}`);
      const data = await res.json();
      const pedigree = data.pedigree || [];
      const ancestorIds = new Set(pedigree.map((a: { ancestor_id: number }) => a.ancestor_id).filter(Boolean));
      const ancestorNames = new Map(pedigree.map((a: { ancestor_id: number; ancestor_name: string }) => [a.ancestor_id, a.ancestor_name]));

      // Cross-reference with famous dogs
      const matches: { id: number; name: string; photo_url: string | null; count: number }[] = [];
      for (const f of famousDogs) {
        if (ancestorIds.has(f.id)) {
          matches.push({ id: f.id, name: f.name, photo_url: f.photo_url, count: 1 });
        } else {
          // Also check by name match in pedigree
          const nameMatch = pedigree.find((a: { ancestor_name: string }) =>
            a.ancestor_name && a.ancestor_name.toUpperCase().includes(f.name.toUpperCase())
          );
          if (nameMatch) {
            matches.push({ id: f.id, name: f.name, photo_url: f.photo_url, count: 1 });
          }
        }
      }
      // Count occurrences and track generations
      for (const m of matches) {
        const found = pedigree.filter((a: { ancestor_id: number; ancestor_name: string; generation: number }) =>
          a.ancestor_id === m.id || (a.ancestor_name && a.ancestor_name.toUpperCase().includes(m.name.toUpperCase()))
        );
        m.count = found.length;
        (m as any).gens = found.map((a: { generation: number }) => a.generation).sort((a: number, b: number) => a - b);
      }
      matches.sort((a, b) => b.count - a.count);

      setLineage({ dog: { id: dogId, name: dogName, photo_url: dogPhoto }, legendaryMatches: matches });
    } catch (_e) {
      setLineage(null);
    }
    setLineageLoading(false);
  };

  const search = (q: string) => {
    setQuery(q);
    setLineage(null);
    if (timer.current) clearTimeout(timer.current);

    const urlMatch = q.match(/pedigreeplatform\.com\/(?:pedigree|dogs)\/(\d+)/);
    if (urlMatch) {
      const dogId = urlMatch[1];
      fetch(`/api/dogs/${dogId}`)
        .then(r => r.json())
        .then(data => {
          if (data && data.registered_name) {
            setResults([{ dog_id: Number(dogId), registered_name: data.registered_name, photo_url: data.photo_url }]);
            setOpen(true);
          }
        })
        .catch(() => {});
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

  // Build pie chart for lineage
  const renderPie = () => {
    if (!lineage || lineage.legendaryMatches.length === 0) return null;
    const matches = lineage.legendaryMatches;
    const total = matches.reduce((s, m) => s + m.count, 0);
    const radius = 110, cx = 130, cy = 130;
    let cumAngle = -90;
    const slices = matches.map((m, i) => {
      const angle = (m.count / total) * 360;
      const startAngle = cumAngle;
      const endAngle = cumAngle + angle;
      const midAngle = (startAngle + endAngle) / 2;
      cumAngle = endAngle;
      return { ...m, angle, startAngle, endAngle, midAngle, color: getDogColor(m.name), idx: i };
    });

    return (
      <div className="flex flex-col lg:flex-row gap-4 items-start mt-4">
        <div className="flex-shrink-0 relative">
          <style>{`@keyframes pieSpinIn { from { transform: rotate(-180deg) scale(0.5); opacity: 0; } to { transform: rotate(0deg) scale(1); opacity: 1; } } .lineage-pie { animation: pieSpinIn 0.8s ease-out; }`}</style>
          <svg width="260" height="260" viewBox="0 0 260 260" className="lineage-pie">
            {slices.map((s) => {
              const sr = (s.startAngle * Math.PI) / 180;
              const er = (s.endAngle * Math.PI) / 180;
              const x1 = cx + radius * Math.cos(sr), y1 = cy + radius * Math.sin(sr);
              const x2 = cx + radius * Math.cos(er), y2 = cy + radius * Math.sin(er);
              const la = s.angle > 180 ? 1 : 0;
              const isH = hovered === s.idx;
              return (
                <path key={s.idx} d={`M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${la} 1 ${x2} ${y2} Z`}
                      fill={s.color} stroke="rgba(11,17,32,0.8)" strokeWidth="2"
                      style={{ transform: isH ? "scale(1.06)" : "none", transformOrigin: `${cx}px ${cy}px`, transition: "all 0.2s", filter: isH ? `drop-shadow(0 0 10px ${s.color})` : "none", cursor: "pointer" }}
                      onMouseEnter={() => { setHovered(s.idx); const el = lineageListRef.current?.children[s.idx] as HTMLElement; if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" }); }} onMouseLeave={() => setHovered(null)} />
              );
            })}
            <circle cx={cx} cy={cy} r="55" fill="var(--bg-deep)" stroke="rgba(30,64,120,0.5)" strokeWidth="1" />
            <text x={cx} y={cy - 8} textAnchor="middle" fill="var(--accent-gold)" fontSize="14" fontWeight="bold" fontFamily="var(--font-table)">{matches.length}</text>
            <text x={cx} y={cy + 10} textAnchor="middle" fill="var(--text-muted)" fontSize="8" fontFamily="var(--font-table)">Legendary</text>
          </svg>
          {hovered !== null && slices[hovered] && (
            <div className="absolute top-1 left-1 px-2 py-1 rounded-lg text-[10px] font-bold"
                 style={{ background: "var(--bg-elevated)", border: `1px solid ${slices[hovered].color}`, color: slices[hovered].color, fontFamily: "var(--font-table)", boxShadow: "0 4px 15px rgba(0,0,0,0.4)" }}>
              {slices[hovered].name}: {slices[hovered].count}x ({((slices[hovered].count / total) * 100).toFixed(1)}%)
            </div>
          )}
        </div>
        <div ref={lineageListRef} className="flex-1 space-y-1 w-full max-h-[280px] overflow-y-auto">
          {slices.map((s) => (
            <div key={s.idx} className="rounded-lg flex items-center gap-2 px-3 py-2 transition-all cursor-pointer"
                 style={{
                   background: hovered === s.idx ? `${s.color}20` : "rgba(255,255,255,0.03)",
                   border: `1px solid ${hovered === s.idx ? s.color + "60" : "rgba(255,255,255,0.06)"}`,
                   transform: hovered === s.idx ? "translateX(4px)" : "none", transition: "all 0.2s",
                 }}
                 onMouseEnter={() => setHovered(s.idx)} onMouseLeave={() => setHovered(null)}
                 onClick={() => { if (onSelectDog) onSelectDog(s.id); }}>
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: s.color }} />
              {s.photo_url ? (
                <img src={s.photo_url.startsWith("http") ? s.photo_url : `https://www.apbt.online-pedigrees.com/${s.photo_url}`}
                     alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0" style={{ border: "1px solid var(--border)" }} />
              ) : (
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[9px]"
                     style={{ background: "var(--bg-deep)", border: "1px solid var(--border)" }}>🐕</div>
              )}
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold truncate block" style={{ color: s.color, fontFamily: "var(--font-table)" }}>{s.name}</span>
                {(s as any).gens && (s as any).gens.length > 0 && (
                  <span className="text-[9px] block mt-0.5" style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                    Gen: {(s as any).gens.join(",")}
                  </span>
                )}
              </div>
              <span className="text-sm font-bold flex-shrink-0" style={{ color: s.color, fontFamily: "var(--font-mono)" }}>{s.count}x</span>
              <span className="text-xs font-bold flex-shrink-0" style={{ color: "var(--accent-gold)", fontFamily: "var(--font-mono)" }}>({((s.count / total) * 100).toFixed(1)}%)</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div ref={ref} className="relative mb-5">
      <div className="glow-gold rounded-xl overflow-hidden" style={{ border: "1.5px solid rgba(30,64,120,0.8)", boxShadow: "0 2px 20px rgba(0,0,0,0.25)", background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)" }}>
        <div className="px-4 py-3 flex items-center gap-3">
          <span className="text-lg">🔍</span>
          <input
            type="text"
            placeholder="Search by dog name or paste a pedigree URL to trace lineage..."
            value={query}
            onChange={(e) => search(e.target.value)}
            onFocus={() => { if (results.length > 0) setOpen(true); }}
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: query && getDogColor(query) !== "#ffffff" ? getDogColor(query) : "var(--text-primary)", fontFamily: "var(--font-table)" }}
          />
          {(query || lineage) && (
            <button onClick={() => { setQuery(""); setResults([]); setOpen(false); setLineage(null); }} className="text-xs opacity-50 hover:opacity-100">✕</button>
          )}
        </div>

        {/* Lineage results inside the box */}
        {lineageLoading && (
          <div className="px-4 py-6 text-center">
            <div className="inline-flex items-center gap-2">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-table)" }}>Tracing lineage back to legendary dogs...</span>
            </div>
          </div>
        )}
        {lineage && (
          <div className="px-4 pb-4">
            <div className="flex items-center gap-2 mb-2 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
              <span className="text-xs">🧬</span>
              <span className="text-xs font-semibold flex-1" style={{ color: "var(--accent-gold)", fontFamily: "var(--font-table)" }}>
                Lineage of <a href={`/pedigree/${lineage.dog.id}`} className="underline hover:brightness-125" style={{ color: getDogColor(lineage.dog.name) }}>{lineage.dog.name}</a>
              </span>
              <div className="flex items-center gap-1">
                {[6, 8, 10, 12].map((g) => (
                  <button key={g}
                    onClick={() => { setGenDepth(g); fetchLineage(lineage.dog.id, lineage.dog.name, lineage.dog.photo_url, g); }}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all"
                    style={{
                      fontFamily: "var(--font-table)",
                      background: genDepth === g ? "var(--accent-gold)" : "rgba(255,255,255,0.06)",
                      color: genDepth === g ? "#000" : "var(--accent-gold)",
                      border: `1px solid ${genDepth === g ? "var(--accent-gold)" : "rgba(255,255,255,0.1)"}`,
                    }}>
                    {g}G
                  </button>
                ))}
              </div>
            </div>
            {lineage.legendaryMatches.length > 0 ? (
              <>
                <p className="text-[10px] mb-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)" }}>
                  Found {lineage.legendaryMatches.length} legendary {lineage.legendaryMatches.length === 1 ? "dog" : "dogs"} in pedigree. Click to run Find Tightest.
                </p>
                {renderPie()}
              </>
            ) : (
              <p className="text-xs py-4 text-center" style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)" }}>
                No legendary dogs found in this dog&apos;s pedigree.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Search dropdown */}
      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 rounded-xl overflow-hidden z-50 max-h-80 overflow-y-auto"
             style={{ background: "var(--bg-elevated)", border: "1.5px solid rgba(30,64,120,0.8)", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
          {results.map((d) => {
            const color = getDogColor(d.registered_name);
            return (
              <button key={d.dog_id} onClick={() => { fetchLineage(d.dog_id, d.registered_name, d.photo_url); setQuery(d.registered_name); setResults([]); setOpen(false); }}
                 className="w-full flex items-center gap-3 px-4 py-2.5 transition-all hover:bg-white/5 text-left"
                 style={{ borderBottom: "1px solid rgba(40,44,60,0.3)" }}>
                {d.photo_url ? (
                  <img src={d.photo_url.startsWith("http") ? d.photo_url : `https://www.apbt.online-pedigrees.com/${d.photo_url}`}
                       alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" style={{ border: "1px solid var(--border)" }} />
                ) : (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm"
                       style={{ background: "var(--bg-deep)", border: "2px solid var(--border)" }}>🐕</div>
                )}
                <span className="text-sm font-semibold truncate" style={{ color, fontFamily: "var(--font-table)" }}>
                  {d.registered_name}
                </span>
              </button>
            );
          })}
        </div>
      )}
      {open && query.length >= 2 && results.length === 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 rounded-xl px-4 py-3 text-center text-xs z-50"
             style={{ background: "var(--bg-elevated)", border: "1.5px solid rgba(30,64,120,0.8)", color: "var(--text-muted)", fontFamily: "var(--font-table)" }}>
          No dogs found for &quot;{query}&quot;
        </div>
      )}
    </div>
  );
}

export default function SpotlightPage() {
  const [famous, setFamous] = useState<FamousDog[]>([]);
  const [selectedDog, setSelectedDog] = useState<number>(2); // Jeep default
  const [fromYear, setFromYear] = useState(2015);
  const [toYear, setToYear] = useState(2026);
  const [sort, setSort] = useState("closest");
  const [results, setResults] = useState<SpotlightResult[]>([]);
  const [target, setTarget] = useState<TargetDog | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load famous dogs on mount
  useEffect(() => {
    fetch("/api/spotlight/famous")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setFamous(d); })
      .catch(() => {});
  }, []);

  // Re-fetch when sort changes (after initial search)
  useEffect(() => {
    if (searched && !loading) runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectedDogName = famous.find((f) => f.id === selectedDog)?.name || `Dog #${selectedDog}`;

  const runSearch = async () => {
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/spotlight?dog_id=${selectedDog}&from=${fromYear}&to=${toYear}&sort=${sort}&limit=20`);
      const data = await res.json();
      setTarget(data.target || null);
      setResults(data.results || []);
      setTotal(data.total || 0);
    } catch (_e) {
      setResults([]);
      setTotal(0);
    }
    setLoading(false);
  };

  const filteredFamous = famous.filter((f) =>
    !searchText || f.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: currentYear - 1970 + 1 }, (_, i) => 1970 + i);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-deep)" }}>
      <style>{`
        .glow-gold:hover { border-color: #d4a855 !important; }
        .glow-blue:hover { border-color: #60a5fa !important; }
        .glow-teal:hover { border-color: #2dd4bf !important; }
      `}</style>
      <div className="ambient-bg" />

      <main className="max-w-7xl mx-auto px-4 md:px-5 py-5">

        {/* ── Hero Header ── */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-2xl">🔬</span>
            <h1 className="font-bold" style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", fontWeight: 700, letterSpacing: "0.02em" }}>
              LINEAGE{" "}
              <span style={{
                background: "linear-gradient(135deg, #d4a853, #f5d78e, #d4a853)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>SPOTLIGHT</span>
            </h1>
          </div>
          <p className="text-xs max-w-xl mx-auto" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-table)" }}>
            Trace the tightest bloodlines. Pick a legendary dog, set a time range, and discover the closest descendants bred in that era.
          </p>
        </div>

        {/* ── Search Controls ── */}
        <div ref={dropdownRef} className="glow-teal rounded-xl p-3 md:p-4 mb-5"
             style={{ border: "1.5px solid rgba(30,64,120,0.8)", boxShadow: "0 2px 20px rgba(0,0,0,0.25)", background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)", backdropFilter: "blur(20px)" }}>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">

            {/* Dog Selector Dropdown */}
            <div className="md:col-span-5">
              <label className="block text-[10px] uppercase tracking-widest font-semibold mb-1.5"
                     style={{ color: "var(--accent-gold)", fontFamily: "var(--font-table)" }}>
                🏛 Select Legendary Dog
              </label>
              <button onClick={() => setDropdownOpen(!dropdownOpen)}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-all"
                      style={{ background: "var(--bg-elevated)", border: dropdownOpen ? "1px solid var(--accent-gold)" : "1px solid var(--border)",
                               fontFamily: "var(--font-table)" }}>
                <span className="truncate" style={{ color: getDogColor(selectedDogName) }}>{selectedDogName}</span>
                <svg className={`w-4 h-4 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            {/* Year Range */}
            <div className="md:col-span-2">
              <label className="block text-[10px] uppercase tracking-widest font-semibold mb-1.5"
                     style={{ color: "var(--accent-gold)", fontFamily: "var(--font-table)" }}>
                📅 From Year
              </label>
              <select value={fromYear} onChange={(e) => setFromYear(Number(e.target.value))}
                      className="w-full px-2.5 py-2 rounded-lg text-xs outline-none appearance-none cursor-pointer"
                      style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-table)" }}>
                {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] uppercase tracking-widest font-semibold mb-1.5"
                     style={{ color: "var(--accent-gold)", fontFamily: "var(--font-table)" }}>
                📅 To Year
              </label>
              <select value={toYear} onChange={(e) => setToYear(Number(e.target.value))}
                      className="w-full px-2.5 py-2 rounded-lg text-xs outline-none appearance-none cursor-pointer"
                      style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-table)" }}>
                {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            {/* Search Button */}
            <div className="md:col-span-3">
              <label className="block text-[10px] uppercase tracking-widest font-semibold mb-1.5 opacity-0"
                     style={{ fontFamily: "var(--font-table)" }}>Action</label>
              <button onClick={runSearch} disabled={loading}
                      className="w-full py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all hover:scale-[1.02] disabled:opacity-50"
                      style={{
                        background: "linear-gradient(135deg, var(--accent-red), #991b1b)",
                        color: "#fff", fontFamily: "var(--font-table)", letterSpacing: "0.1em",
                        boxShadow: "0 4px 20px rgba(220,38,38,0.3)",
                      }}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    Scanning...
                  </span>
                ) : "🔍 Find Tightest"}
              </button>
            </div>
          </div>

          {/* Legendary Dog Dropdown List */}
          {dropdownOpen && (
            <div className="mt-2 rounded-lg" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", boxShadow: "0 10px 40px rgba(0,0,0,0.4)" }}>
              <div className="p-1.5">
                <input
                  type="text" placeholder="Search dogs..." value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md text-xs outline-none"
                  style={{ background: "var(--bg-deep)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-table)" }}
                  autoFocus
                />
              </div>
              <div style={{ maxHeight: 288, overflowY: "auto" }}>
                {filteredFamous.map((f) => (
                  <button key={f.id} onClick={() => { setSelectedDog(f.id); setDropdownOpen(false); setSearchText(""); }}
                          className="w-full text-left px-3 py-2 flex items-center gap-2 transition-all hover:bg-white/5"
                          style={{ borderBottom: "1px solid rgba(40,44,60,0.3)" }}>
                    {f.photo_url ? (
                      <img src={f.photo_url.startsWith("http") ? f.photo_url : `https://www.apbt.online-pedigrees.com/${f.photo_url}`}
                           alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0" style={{ border: "1px solid var(--border)" }} />
                    ) : (
                      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px]"
                           style={{ background: "var(--bg-deep)", border: "2px solid var(--border)" }}>🐕</div>
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold truncate" style={{ color: getDogColor(f.name), fontFamily: "var(--font-table)" }}>
                        {f.name}
                      </span>
                      <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>
                        {f.view_count?.toLocaleString()} views
                      </span>
                    </div>
                    {selectedDog === f.id && <span className="text-xs" style={{ color: "var(--accent-gold)" }}>✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sort Controls */}
          {searched && (
            <div className="flex items-center gap-1.5 mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
              <span className="text-[9px] uppercase tracking-widest font-semibold mr-1.5" style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)" }}>
                Sort by:
              </span>
              {SORT_OPTIONS.map((s) => (
                <button key={s.key}
                        onClick={() => { setSort(s.key); }}
                        className="text-[10px] px-2 py-1 rounded-md font-semibold transition-all"
                        style={{
                          background: sort === s.key ? "var(--accent-gold-glow-strong)" : "var(--bg-elevated)",
                          color: sort === s.key ? "var(--accent-gold)" : "var(--text-secondary)",
                          border: sort === s.key ? "1px solid rgba(212,168,85,0.3)" : "1px solid var(--border)",
                          fontFamily: "var(--font-table)",
                        }}>
                  {s.icon} {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Quick Search Bar ── */}
        <QuickSearch famousDogs={famous} onSelectDog={(dogId) => {
          setSelectedDog(dogId);
          // Auto-trigger search after selecting
          setTimeout(() => {
            setLoading(true);
            setSearched(true);
            fetch(`/api/spotlight?dog_id=${dogId}&from=${fromYear}&to=${toYear}&sort=${sort}&limit=20`)
              .then(r => r.json())
              .then(data => { setTarget(data.target || null); setResults(data.results || []); setTotal(data.total || 0); })
              .catch(() => { setResults([]); setTotal(0); })
              .finally(() => setLoading(false));
          }, 100);
        }} />

        {/* ── Results ── */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-flex flex-col items-center gap-3">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--accent-red)", borderTopColor: "transparent" }} />
                <div className="absolute inset-2 rounded-full border-2 border-b-transparent animate-spin" style={{ borderColor: "var(--accent-gold)", borderBottomColor: "transparent", animationDirection: "reverse", animationDuration: "0.8s" }} />
                <div className="absolute inset-0 flex items-center justify-center text-xl">🧬</div>
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-table)" }}>Scanning Pedigrees...</p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)" }}>Tracing bloodlines across 434,000+ dogs</p>
              </div>
            </div>
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <div className="text-center py-12">
            <div className="text-2xl mb-2 opacity-30">🔍</div>
            <p className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)" }}>
              No descendants found in that year range. Try expanding the date range.
            </p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <>
            {/* Result Summary */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {target?.photo_url && (
                  <img src={target.photo_url.startsWith("http") ? target.photo_url : `https://www.apbt.online-pedigrees.com/${target.photo_url}`}
                       alt="" className="w-8 h-8 rounded-full object-cover" style={{ border: "1px solid var(--accent-gold)" }} />
                )}
                <div>
                  <h2 className="text-sm font-bold" style={{ fontFamily: "var(--font-table)", color: getDogColor(target?.name || "") }}>{target?.name}</h2>
                  <p className="text-[10px]" style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)" }}>
                    {total.toLocaleString()} descendants found · Top {results.length} shown
                  </p>
                </div>
              </div>
              <span className="text-[10px] px-3 py-1 rounded-full font-semibold"
                    style={{ background: "var(--accent-red-glow)", color: "var(--accent-red-bright)", border: "1px solid rgba(220,38,38,0.2)", fontFamily: "var(--font-table)" }}>
                {fromYear}–{toYear}
              </span>
            </div>

            {/* Card Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
              {results.map((r, idx) => (
                <Link key={r.id} href={`/pedigree/${r.id}`}
                      className="glow-blue group rounded-xl overflow-hidden transition-all hover:scale-[1.02] hover:shadow-xl relative"
                      style={{
                        border: "1.5px solid rgba(30,64,120,0.8)", boxShadow: "0 2px 20px rgba(0,0,0,0.25)", background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)",
                        animationDelay: `${idx * 50}ms`,
                      }}>

                  {/* Rank Badge */}
                  <div className="absolute top-2 left-2 z-10 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                       style={{
                         background: idx === 0 ? "linear-gradient(135deg, #fbbf24, #f59e0b)" : idx === 1 ? "linear-gradient(135deg, #9ca3af, #6b7280)" : idx === 2 ? "linear-gradient(135deg, #d97706, #92400e)" : "var(--bg-elevated)",
                         color: idx < 3 ? "#000" : "var(--text-secondary)",
                         border: idx >= 3 ? "1px solid var(--border)" : "none",
                         fontFamily: "var(--font-mono)",
                       }}>
                    {idx + 1}
                  </div>

                  {/* Blood % + COI Badges */}
                  <div className="absolute top-2 right-2 z-10 flex flex-col gap-0.5 items-end">
                    <div className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                         style={{ background: "rgba(0,0,0,0.7)", color: "#ef4444", fontFamily: "var(--font-mono)", backdropFilter: "blur(10px)" }}>
                      🩸 {r.blood_pct}% {target?.name?.split("'S ")[1]?.split(" ")[0] || "Blood"}
                    </div>
                    <div className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                         style={{ background: "rgba(0,0,0,0.7)", color: r.coi >= 10 ? "#ef4444" : r.coi >= 5 ? "#f59e0b" : "#22c55e", fontFamily: "var(--font-mono)", backdropFilter: "blur(10px)" }}>
                      COI {r.coi}%
                    </div>
                  </div>

                  {/* Photo */}
                  <div className="aspect-[4/3] overflow-hidden" style={{ background: "var(--bg-deep)" }}>
                    {r.photo_url ? (
                      <img src={r.photo_url} alt={r.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl opacity-20">🐕</div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-2.5">
                    <h3 className="text-xs font-bold truncate mb-0.5" style={{ color: getDogColor(r.name), fontFamily: "var(--font-table)" }}>
                      {r.name}
                    </h3>

                    {/* Titles */}
                    {r.titles.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {r.titles.map((t) => (
                          <span key={t} className="text-[9px] px-1.5 py-0.5 rounded font-bold"
                                style={{ background: `${TITLE_COLORS[t] || "#888"}20`, color: TITLE_COLORS[t] || "#888", fontFamily: "var(--font-mono)" }}>
                            {t}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Relation */}
                    <div className="text-[10px] mb-1.5 flex items-center gap-1.5" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-table)" }}>
                      <span>🧬</span>
                      <span>{r.gen_label}</span>
                      <span style={{ color: "var(--text-muted)" }}>·</span>
                      <span>{r.num_paths} path{r.num_paths > 1 ? "s" : ""}</span>
                    </div>

                    {/* Lineage Path Preview */}
                    {r.lineage_paths.length > 0 && (
                      <div className="text-[9px] px-2 py-1.5 rounded-lg mb-2" style={{ background: "var(--bg-deep)", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                        Gen {r.lineage_paths[0].gen}: {r.lineage_paths[0].path}
                        {r.lineage_paths.length > 1 && <span style={{ color: "var(--accent-gold)" }}> +{r.lineage_paths.length - 1} more</span>}
                      </div>
                    )}

                    {/* Meta */}
                    <div className="flex items-center justify-between text-[9px]" style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)" }}>
                      <span>🎂 {r.birthdate?.slice(0, 4) || "—"}</span>
                      <span>{r.owner || r.breeder || "—"}</span>
                      <span>👁 {(r.view_count || 0).toLocaleString()}</span>
                    </div>
                    {r.posted_date && (
                      <div className="text-[9px] mt-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)" }}>
                        📅 Posted: {r.posted_date}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* ── Pre-search state ── */}
        {!searched && !loading && (
          <div className="text-center py-10">
            <div className="text-4xl mb-3 opacity-30">🧬</div>
            <h3 className="text-sm font-semibold mb-1.5" style={{ fontFamily: "var(--font-table)", color: "var(--accent-gold)" }}>
              Select a legendary dog and hit &quot;Find Tightest&quot;
            </h3>
            <p className="text-[10px] max-w-md mx-auto" style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)" }}>
              The system will scan all registered pedigrees to find the dogs most tightly bred to your selected foundation dog, ranked by coefficient of inbreeding (COI).
            </p>

            {/* Famous Dogs Preview Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 mt-6 max-w-4xl mx-auto">
              {famous.slice(0, 10).map((f) => (
                <button key={f.id} onClick={() => { setSelectedDog(f.id); }}
                        className="glow-gold rounded-lg overflow-hidden transition-all hover:scale-105 group"
                        style={{
                          border: selectedDog === f.id ? "2px solid var(--accent-gold)" : "1.5px solid rgba(30,64,120,0.8)", boxShadow: "0 2px 20px rgba(0,0,0,0.25)", background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)",
                        }}>
                  <div className="aspect-square overflow-hidden" style={{ background: "var(--bg-deep)" }}>
                    {f.photo_url ? (
                      <img src={f.photo_url.startsWith("http") ? f.photo_url : `https://www.apbt.online-pedigrees.com/${f.photo_url}`}
                           alt="" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl opacity-20">🐕</div>
                    )}
                  </div>
                  <div className="p-1.5">
                    <span className="text-[8px] font-bold truncate block"
                          style={{ color: selectedDog === f.id ? "var(--accent-gold)" : getDogColor(f.name), fontFamily: "var(--font-table)" }}>
                      {f.name}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
