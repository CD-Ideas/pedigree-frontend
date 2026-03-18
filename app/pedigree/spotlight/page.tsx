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
  "GR CH": "#fbbf24", "CH": "#f59e0b", "ROM": "#a78bfa", "POR": "#60a5fa",
  "7XW": "#ef4444", "6XW": "#ef4444", "5XW": "#ef4444", "4XW": "#f97316",
  "3XW": "#f97316", "2XW": "#eab308", "1XW": "#84cc16",
  "3XL": "#6b7280", "2XL": "#6b7280", "1XL": "#6b7280",
};

function QuickSearch({ onSelectDog }: { onSelectDog?: (dogId: number) => void }) {
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

    // Detect pasted URLs — select that dog in the legendary dropdown and trigger Find Tightest
    const urlMatch = q.match(/pedigreeplatform\.com\/(?:pedigree|dogs)\/(\d+)/);
    if (urlMatch && onSelectDog) {
      onSelectDog(Number(urlMatch[1]));
      setQuery("");
      setOpen(false);
      return;
    }

    if (q.length < 2) { setResults([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/dogs/search?q=${encodeURIComponent(q)}&limit=10`);
        const data = await res.json();
        setResults(data.dogs || []);
        setOpen(true);
      } catch { setResults([]); }
    }, 300);
  };

  return (
    <div ref={ref} className="relative mb-5">
      <div className="glow-gold rounded-xl overflow-hidden" style={{ border: "1.5px solid rgba(30,64,120,0.8)", boxShadow: "0 2px 20px rgba(0,0,0,0.25)", background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)" }}>
        <div className="px-4 py-3 flex items-center gap-3">
          <span className="text-lg">🔍</span>
          <input
            type="text"
            placeholder="Search by dog name or paste a pedigree URL..."
            value={query}
            onChange={(e) => search(e.target.value)}
            onFocus={() => { if (results.length > 0) setOpen(true); }}
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-table)" }}
          />
          {query && (
            <button onClick={() => { setQuery(""); setResults([]); setOpen(false); }} className="text-xs opacity-50 hover:opacity-100">✕</button>
          )}
        </div>
      </div>
      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 rounded-xl overflow-hidden z-50 max-h-80 overflow-y-auto"
             style={{ background: "var(--bg-elevated)", border: "1.5px solid rgba(30,64,120,0.8)", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
          {results.map((d) => {
            const nameUpper = (d.registered_name || "").toUpperCase();
            const isGrCh = /\bGR\s*CH\b/.test(nameUpper);
            const isCh = !isGrCh && /\bCH\b/.test(nameUpper);
            const color = isGrCh ? "#60a5fa" : isCh ? "#fc8181" : "var(--text-primary)";
            return (
              <a key={d.dog_id} href={`/pedigree/${d.dog_id}`}
                 className="flex items-center gap-3 px-4 py-2.5 transition-all hover:bg-white/5"
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
              </a>
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
    } catch {
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

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 px-4 md:px-6 py-2.5 flex items-center justify-between"
           style={{ background: "rgba(11,17,32,0.95)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(220,38,38,0.1)" }}>
        <Link href="/" className="flex items-center gap-2">
          <img src={LOGO} alt="Logo" className="w-8 h-8 rounded-full" />
          <span className="text-base font-bold" style={{
            fontFamily: "var(--font-display)",
            background: "linear-gradient(135deg, #d4a853, #f5d78e, #d4a853)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>Pedigree Platform</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/pedigree/spotlight" className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                style={{ background: "var(--accent-gold-glow-strong)", color: "var(--accent-gold)", fontFamily: "var(--font-table)", border: "1px solid rgba(212,168,85,0.2)" }}>
            🔬 Lineage Spotlight
          </Link>
          <Link href="/login" className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all hover:scale-105"
                style={{ background: "linear-gradient(135deg, var(--accent-red), #991b1b)", color: "#fff", fontFamily: "var(--font-table)" }}>
            Sign In
          </Link>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 md:px-5 py-5">

        {/* ── Hero Header ── */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-2xl">🔬</span>
            <h1 className="text-xl md:text-2xl font-bold" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.02em" }}>
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
        <div className="glow-teal rounded-xl p-3 md:p-4 mb-5"
             style={{ border: "1.5px solid rgba(30,64,120,0.8)", boxShadow: "0 2px 20px rgba(0,0,0,0.25)", background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)", backdropFilter: "blur(20px)" }}>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">

            {/* Dog Selector Dropdown */}
            <div className="md:col-span-5" ref={dropdownRef}>
              <label className="block text-[10px] uppercase tracking-widest font-semibold mb-1.5"
                     style={{ color: "var(--accent-gold)", fontFamily: "var(--font-table)" }}>
                🏛 Select Legendary Dog
              </label>
              <div className="relative">
                <button onClick={() => setDropdownOpen(!dropdownOpen)}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-all"
                        style={{ background: "var(--bg-elevated)", border: dropdownOpen ? "1px solid var(--accent-gold)" : "1px solid var(--border)",
                                 fontFamily: "var(--font-table)", color: "var(--text-primary)" }}>
                  <span className="truncate">{selectedDogName}</span>
                  <svg className={`w-4 h-4 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {dropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 rounded-lg overflow-hidden z-50 max-h-64 overflow-y-auto"
                       style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
                    <div className="p-1.5 sticky top-0" style={{ background: "var(--bg-elevated)" }}>
                      <input
                        type="text" placeholder="Search dogs..." value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-md text-xs outline-none"
                        style={{ background: "var(--bg-deep)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-table)" }}
                        autoFocus
                      />
                    </div>
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
                          <span className="block text-xs font-semibold truncate" style={{ color: selectedDog === f.id ? "var(--accent-gold)" : "var(--text-primary)", fontFamily: "var(--font-table)" }}>
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
                )}
              </div>
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
        <QuickSearch onSelectDog={(dogId) => {
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
                  <h2 className="text-sm font-bold" style={{ fontFamily: "var(--font-table)", color: "var(--accent-gold)" }}>{target?.name}</h2>
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
                    <h3 className="text-xs font-bold truncate mb-0.5" style={{ color: "var(--accent-gold)", fontFamily: "var(--font-table)" }}>
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
            <h3 className="text-sm font-semibold mb-1.5" style={{ fontFamily: "var(--font-table)", color: "var(--text-secondary)" }}>
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
                          style={{ color: selectedDog === f.id ? "var(--accent-gold)" : "var(--text-secondary)", fontFamily: "var(--font-table)" }}>
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
