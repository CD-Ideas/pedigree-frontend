"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";

/* ─── Types ─── */
interface Dog {
  id: number;
  name: string;
  sex: string;
  color: string | null;
  dob: string | null;
  reg_number: string;
  profile_image_url: string | null;
  sire_id: number | null;
  dam_id: number | null;
  sire_name: string | null;
  dam_name: string | null;
}

const LOGO = "https://i.imgur.com/9RJG2QN.png";

const TC: Record<string, string> = {
  "GR CH": "#1d5bbf", CH: "#c02828", ROM: "#0d7468", POR: "#6d30b0",
  "1XW": "#0d7468", "2XW": "#b45a0a", "3XW": "#8a6518",
  "4XW": "#b03878", "5XW": "#6d30b0", "6XW": "#6d30b0",
  "1XL": "#0d7468", "2XL": "#b45a0a",
};

const TITLE_PATTERNS = ["GR CH", "CH", "ROM", "POR", "1XW", "2XW", "3XW", "4XW", "5XW", "6XW", "1XL", "2XL", "3XL"];

function extractTitles(name: string): string[] {
  const upper = name?.toUpperCase() || "";
  return TITLE_PATTERNS.filter(t => upper.includes(t));
}

/* ─── Animated Counter ─── */
function AnimatedCount({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!value) return;
    const duration = 800;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.floor(ease * value));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);
  return <>{display.toLocaleString()}</>;
}

/* ─── Dog Card ─── */
function DogCard({ dog, index }: { dog: Dog; index: number }) {
  const isMale = dog.sex === "MALE" || dog.sex === "M";
  const titles = extractTitles(dog.name);
  const hasTitle = titles.length > 0;
  const photoUrl = dog.profile_image_url
    ? dog.profile_image_url.startsWith("http") ? dog.profile_image_url : `https://www.apbt.online-pedigrees.com/${dog.profile_image_url}`
    : null;

  return (
    <Link href={`/pedigree/${dog.id}`}
      className="group block overflow-hidden transition-all duration-300 hover:-translate-y-1"
      style={{
        background: "#FAF7F2",
        border: "2px solid #C9B29F",
        borderRadius: "10px",
        animation: `cardReveal 0.4s ease both`,
        animationDelay: `${index * 25}ms`,
      }}>
      {/* Photo */}
      <div className="relative h-36 overflow-hidden" style={{ borderBottom: "2px solid #C9B29F" }}>
        {photoUrl ? (
          <img src={photoUrl} alt={dog.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"
            style={{ background: "#FAFAFA" }}>
            <span className="text-5xl opacity-20 transition-all duration-500 group-hover:opacity-30 group-hover:scale-125"
              style={{ color: isMale ? "#1d5bbf" : "#9f1239" }}>
              {isMale ? "\u2642" : "\u2640"}
            </span>
          </div>
        )}

        {/* Sex badge */}
        <div className="absolute top-1.5 right-1.5">
          <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold"
            style={{
              background: isMale ? "#1d5bbf" : "#9f1239",
              color: "#fff",
            }}>
            {isMale ? "\u2642" : "\u2640"}
          </span>
        </div>

        {/* Title badges */}
        {hasTitle && (
          <div className="absolute top-1.5 left-1.5 flex gap-1 flex-wrap">
            {titles.slice(0, 3).map((t) => (
              <span key={t} className="text-[8px] font-bold px-1.5 py-0.5 rounded"
                style={{
                  background: "#FAF7F2",
                  border: "1px solid #C9B29F",
                  color: TC[t] || "#1C1C1C",
                  fontFamily: "var(--font-table)",
                  letterSpacing: "0.05em",
                }}>
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="px-2.5 pb-2.5 pt-2 relative">
        <h3 className="text-xs font-bold leading-tight mb-1 line-clamp-2 transition-colors duration-200"
          style={{ color: hasTitle ? "#1d5bbf" : "#1C1C1C", fontFamily: "var(--font-table)" }}>
          {dog.name}
        </h3>

        {dog.color && (
          <span className="inline-block text-[9px] px-1.5 py-0.5 rounded mb-1.5"
            style={{ background: "#FAFAFA", border: "1px solid #C9B29F", color: "#6B7280", fontFamily: "var(--font-table)" }}>
            {dog.color}
          </span>
        )}

        {/* Parents */}
        <div className="space-y-0.5">
          {dog.sire_name && (
            <div className="flex items-center gap-1 text-[9px]" style={{ fontFamily: "var(--font-table)" }}>
              <span className="w-1 h-1 rounded-lg flex-shrink-0" style={{ background: "#1d5bbf" }} />
              <span className="truncate" style={{ color: "#1d5bbf" }}>{dog.sire_name}</span>
            </div>
          )}
          {dog.dam_name && (
            <div className="flex items-center gap-1 text-[9px]" style={{ fontFamily: "var(--font-table)" }}>
              <span className="w-1 h-1 rounded-lg flex-shrink-0" style={{ background: "#9f1239" }} />
              <span className="truncate" style={{ color: "#9f1239" }}>{dog.dam_name}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-1.5 pt-1 text-[8px]"
          style={{ borderTop: "1px solid #C9B29F", color: "#6B7280", fontFamily: "var(--font-mono)" }}>
          <span>{dog.reg_number}</span>
          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-semibold"
            style={{ color: "#1d5bbf", fontFamily: "var(--font-table)" }}>
            View →
          </span>
        </div>
      </div>
    </Link>
  );
}

/* ─── Main Public Dogs Page ─── */
export default function PublicDogsPage() {
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sexFilter, setSexFilter] = useState("");
  const [colorFilter, setColorFilter] = useState("");
  const [hasPhotoFilter, setHasPhotoFilter] = useState(false);
  const [sort, setSort] = useState("name");
  const [order, setOrder] = useState("asc");
  const [filterColors, setFilterColors] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const LIMIT = 30;

  const fetchDogs = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page), limit: String(LIMIT), sort, order,
    });
    if (search) params.set("search", search);
    if (sexFilter) params.set("sex", sexFilter);
    if (colorFilter) params.set("color", colorFilter);
    if (hasPhotoFilter) params.set("hasPhoto", "true");
    fetch(`/api/dogs?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setDogs(data.dogs || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
        if (data.filters?.colors) setFilterColors(data.filters.colors.filter(Boolean).sort());
        setLoading(false);
        setInitialLoad(false);
      })
      .catch(() => { setLoading(false); setInitialLoad(false); });
  }, [page, search, sexFilter, colorFilter, hasPhotoFilter, sort, order]);

  useEffect(() => { fetchDogs(); }, [fetchDogs]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const clearFilters = () => {
    setSexFilter(""); setColorFilter(""); setHasPhotoFilter(false);
    setSearch(""); setSearchInput(""); setPage(1);
  };

  const activeFilters = [sexFilter, colorFilter, hasPhotoFilter].filter(Boolean).length;

  const goToPage = (p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Keyboard shortcut: / to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "#EDE4D5" }}>
      {/* Keyframe animations */}
      <style>{`
        @keyframes cardReveal {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes countUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ─── Nav ─── */}
      <nav className="sticky top-0 z-50 px-4 md:px-6 py-2.5 flex items-center justify-between"
        style={{ background: "#FAF7F2", borderBottom: "2px solid #C9B29F" }}>
        <Link href="/" className="flex items-center gap-2.5">
          <img src={LOGO} alt="Logo" className="w-10 h-10 rounded-lg" />
          <span style={{
            fontFamily: "var(--font-table)", fontWeight: 700, fontSize: "1rem",
            color: "#1C1C1C",
          }}>
            Pedigree Platform
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/pedigree" className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105"
            style={{ color: "#6B7280", fontFamily: "var(--font-table)" }}>
            Search
          </Link>
          <Link href="/login"
            className="px-3.5 py-1.5 text-xs font-semibold transition-all hover:scale-105"
            style={{ background: "#1d5bbf", color: "#fff", fontFamily: "var(--font-table)", borderRadius: "10px" }}>
            Sign In
          </Link>
        </div>
      </nav>

      {/* ─── Hero Header ─── */}
      <div className="relative overflow-hidden">
        <div className="relative max-w-[1600px] mx-auto px-4 md:px-6 pt-8 pb-5">
          {/* Title row */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Link href="/" className="text-[10px] font-medium hover:underline transition-colors"
                  style={{ color: "#6B7280", fontFamily: "var(--font-table)" }}>
                  Home
                </Link>
                <span style={{ color: "#6B7280", fontSize: "10px" }}>/</span>
                <span className="text-[10px] font-medium"
                  style={{ color: "#1d5bbf", fontFamily: "var(--font-table)" }}>
                  Dogs
                </span>
              </div>
              <h1 style={{
                fontFamily: "var(--font-display)", fontWeight: 700,
                fontSize: "clamp(1.6rem, 4vw, 2.4rem)", lineHeight: 1.1,
                color: "#1C1C1C",
              }}>
                Browse <span style={{ color: "#1d5bbf" }}>Dogs</span>
              </h1>
              <p className="mt-1.5" style={{
                fontFamily: "var(--font-table)", fontSize: "13px", color: "#6B7280",
              }}>
                Explore <span style={{ color: "#1d5bbf", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                  <AnimatedCount value={total} />
                </span> registered dogs — filter by sex, color, titles &amp; more
              </p>
            </div>

            {/* Quick stats */}
            <div className="flex items-center gap-3">
              {[
                { label: "Total", value: total, color: "#1d5bbf" },
              ].map((s) => (
                <div key={s.label} className="text-right">
                  <div className="text-lg font-bold" style={{ color: s.color, fontFamily: "var(--font-mono)" }}>
                    {s.value.toLocaleString()}
                  </div>
                  <div className="text-[9px] uppercase tracking-wider" style={{ color: "#6B7280", fontFamily: "var(--font-table)" }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ─── Search Bar ─── */}
          <form onSubmit={handleSearch} className="relative mb-4">
            <div className="flex gap-2">
              <div className="flex-1 flex items-center overflow-hidden transition-all duration-200"
                style={{
                  background: "#FAF7F2",
                  border: "2px solid #C9B29F",
                  borderRadius: "10px",
                }}>
                <div className="pl-3.5 pr-2 flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round">
                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                  </svg>
                </div>
                <input ref={searchRef}
                  type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search by name... press / to focus"
                  className="flex-1 bg-transparent outline-none py-2.5 pr-3"
                  style={{ fontFamily: "var(--font-table)", fontSize: "13px", color: "#1C1C1C" }}
                />
                {searchInput && (
                  <button type="button" onClick={() => { setSearchInput(""); setSearch(""); setPage(1); }}
                    className="pr-3 text-xs" style={{ color: "#6B7280" }}>✕</button>
                )}
              </div>
              <button type="submit"
                className="px-5 py-2.5 text-xs font-bold transition-all hover:scale-105 flex-shrink-0"
                style={{
                  background: "#1d5bbf", color: "#fff",
                  fontFamily: "var(--font-table)", letterSpacing: "0.04em", textTransform: "uppercase",
                  borderRadius: "10px",
                }}>
                Search
              </button>
            </div>
          </form>

          {/* ─── Filter Bar ─── */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Sex filter pills */}
            <div className="flex items-center gap-1 p-0.5" style={{ border: "2px solid #C9B29F", borderRadius: "10px", background: "#FAF7F2" }}>
              {[
                { label: "All", value: "", icon: "" },
                { label: "Males", value: "MALE", icon: "\u2642" },
                { label: "Females", value: "FEMALE", icon: "\u2640" },
              ].map((f) => (
                <button key={f.value} onClick={() => { setSexFilter(f.value); setPage(1); }}
                  className="px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all"
                  style={{
                    fontFamily: "var(--font-table)",
                    background: sexFilter === f.value
                      ? f.value === "MALE" ? "rgba(29,91,191,0.12)" : f.value === "FEMALE" ? "rgba(159,18,57,0.12)" : "rgba(29,91,191,0.08)"
                      : "transparent",
                    color: sexFilter === f.value
                      ? f.value === "MALE" ? "#1d5bbf" : f.value === "FEMALE" ? "#9f1239" : "#1d5bbf"
                      : "#6B7280",
                    border: "1px solid transparent",
                  }}>
                  {f.icon && <span className="mr-1">{f.icon}</span>}{f.label}
                </button>
              ))}
            </div>

            {/* Color filter */}
            <select value={colorFilter}
              onChange={(e) => { setColorFilter(e.target.value); setPage(1); }}
              className="px-3 py-1.5 text-[11px] font-medium appearance-none cursor-pointer"
              style={{
                background: colorFilter ? "rgba(29,91,191,0.08)" : "#FAF7F2",
                border: "2px solid #C9B29F",
                borderRadius: "10px",
                color: colorFilter ? "#1d5bbf" : "#6B7280",
                fontFamily: "var(--font-table)",
                paddingRight: "24px",
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%236B7280'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 8px center",
              }}>
              <option value="">All Colors</option>
              {filterColors.slice(0, 40).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Photo filter */}
            <button onClick={() => { setHasPhotoFilter(!hasPhotoFilter); setPage(1); }}
              className="px-3 py-1.5 text-[11px] font-medium transition-all flex items-center gap-1.5"
              style={{
                background: hasPhotoFilter ? "rgba(29,91,191,0.08)" : "#FAF7F2",
                border: "2px solid #C9B29F",
                borderRadius: "10px",
                color: hasPhotoFilter ? "#1d5bbf" : "#6B7280",
                fontFamily: "var(--font-table)",
              }}>
              📷 {hasPhotoFilter ? "With Photos \u2713" : "Has Photo"}
            </button>

            {/* More filters toggle */}
            <button onClick={() => setShowFilters(!showFilters)}
              className="px-3 py-1.5 text-[11px] font-medium transition-all relative"
              style={{
                background: showFilters ? "#FAFAFA" : "#FAF7F2",
                border: "2px solid #C9B29F",
                borderRadius: "10px",
                color: showFilters ? "#1d5bbf" : "#6B7280",
                fontFamily: "var(--font-table)",
              }}>
              ⚙ Sort
              {activeFilters > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-lg flex items-center justify-center text-[8px] font-bold"
                  style={{ background: "#1d5bbf", color: "#fff" }}>
                  {activeFilters}
                </span>
              )}
            </button>

            {/* Clear all */}
            {(search || activeFilters > 0) && (
              <button onClick={clearFilters}
                className="text-[11px] font-medium px-3 py-1.5 transition-all hover:scale-105"
                style={{ color: "#dc2626", background: "rgba(220,38,38,0.06)", fontFamily: "var(--font-table)", border: "2px solid #C9B29F", borderRadius: "10px" }}>
                ✕ Clear
              </button>
            )}
          </div>

          {/* Sort panel */}
          {showFilters && (
            <div className="mt-2 p-3 flex flex-wrap items-center gap-2"
              style={{ border: "2px solid #C9B29F", borderRadius: "10px", background: "#FAF7F2", animation: "cardReveal 0.2s ease both" }}>
              <span className="text-[10px] uppercase tracking-wider mr-1" style={{ color: "#6B7280", fontFamily: "var(--font-table)" }}>
                Sort by:
              </span>
              {[
                { key: "name", label: "Name", icon: "Aa" },
                { key: "id", label: "ID", icon: "#" },
                { key: "created", label: "Date Added", icon: "📅" },
              ].map((s) => (
                <button key={s.key}
                  onClick={() => {
                    if (sort === s.key) setOrder(order === "asc" ? "desc" : "asc");
                    else { setSort(s.key); setOrder("asc"); }
                    setPage(1);
                  }}
                  className="px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1.5"
                  style={{
                    background: sort === s.key ? "rgba(29,91,191,0.08)" : "transparent",
                    color: sort === s.key ? "#1d5bbf" : "#6B7280",
                    border: sort === s.key ? "1px solid #C9B29F" : "1px solid transparent",
                    fontFamily: "var(--font-table)",
                  }}>
                  <span className="opacity-70">{s.icon}</span> {s.label}
                  {sort === s.key && <span className="ml-0.5">{order === "asc" ? "\u2191" : "\u2193"}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Content ─── */}
      <div className="max-w-[1600px] mx-auto px-4 md:px-6 pb-10">
        {/* Results info */}
        {search && !loading && (
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xs" style={{ color: "#6B7280", fontFamily: "var(--font-table)" }}>
              Showing results for
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-md"
              style={{ background: "rgba(29,91,191,0.06)", color: "#1d5bbf", fontFamily: "var(--font-table)" }}>
              &ldquo;{search}&rdquo;
            </span>
          </div>
        )}

        {/* Loading state */}
        {loading ? (
          <div className="py-20">
            {initialLoad ? (
              /* Skeleton grid for initial load */
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
                {Array.from({ length: 18 }).map((_, i) => (
                  <div key={i} className="overflow-hidden" style={{ border: "2px solid #C9B29F", borderRadius: "10px", background: "#FAF7F2" }}>
                    <div className="h-36" style={{
                      background: "linear-gradient(90deg, #FAF7F2 0%, #FAFAFA 50%, #FAF7F2 100%)",
                      backgroundSize: "200% 100%",
                      animation: "shimmer 1.5s infinite",
                    }} />
                    <div className="p-2.5 space-y-2">
                      <div className="h-3 rounded" style={{ background: "#e5e0d8", width: "80%" }} />
                      <div className="h-2 rounded" style={{ background: "#e5e0d8", width: "50%" }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3" style={{ color: "#6B7280", fontFamily: "var(--font-table)" }}>
                <div className="w-5 h-5 rounded-lg border-2 border-t-transparent animate-spin"
                  style={{ borderColor: "#1d5bbf", borderTopColor: "transparent" }} />
                Loading dogs...
              </div>
            )}
          </div>
        ) : dogs.length === 0 ? (
          /* Empty state */
          <div className="text-center py-20">
            <div className="text-6xl mb-4 opacity-30">🐕</div>
            <h3 className="text-lg font-bold mb-2" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>
              No dogs found
            </h3>
            <p className="text-sm mb-4" style={{ color: "#6B7280", fontFamily: "var(--font-table)" }}>
              Try adjusting your search or filters
            </p>
            <button onClick={clearFilters}
              className="px-5 py-2 text-sm font-semibold transition-all hover:scale-105"
              style={{ background: "rgba(29,91,191,0.06)", color: "#1d5bbf", border: "2px solid #C9B29F", fontFamily: "var(--font-table)", borderRadius: "10px" }}>
              Clear All Filters
            </button>
          </div>
        ) : (
          /* Dog Grid */
          <>
            <div ref={gridRef}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
              {dogs.map((dog, i) => (
                <DogCard key={dog.id} dog={dog} index={i} />
              ))}
            </div>

            {/* ─── Pagination ─── */}
            {totalPages > 1 && (
              <div className="mt-8 flex flex-col items-center gap-3">
                {/* Page info */}
                <div className="text-[11px]" style={{ color: "#6B7280", fontFamily: "var(--font-table)" }}>
                  Showing <span style={{ color: "#1d5bbf", fontWeight: 700 }}>{((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, total)}</span> of{" "}
                  <span style={{ color: "#1C1C1C", fontWeight: 600 }}>{total.toLocaleString()}</span> dogs
                </div>

                {/* Page controls */}
                <div className="flex items-center gap-1.5">
                  {/* Prev */}
                  <button onClick={() => goToPage(page - 1)} disabled={page === 1}
                    className="px-3 py-1.5 text-xs font-medium disabled:opacity-20 transition-all hover:scale-105"
                    style={{ background: "#FAF7F2", color: "#6B7280", border: "2px solid #C9B29F", fontFamily: "var(--font-table)", borderRadius: "10px" }}>
                    ←
                  </button>

                  {/* Page numbers */}
                  {(() => {
                    const pages: (number | string)[] = [];
                    if (totalPages <= 7) {
                      for (let i = 1; i <= totalPages; i++) pages.push(i);
                    } else {
                      pages.push(1);
                      if (page > 3) pages.push("...");
                      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
                      if (page < totalPages - 2) pages.push("...");
                      pages.push(totalPages);
                    }
                    return pages.map((p, i) =>
                      typeof p === "string" ? (
                        <span key={`dots-${i}`} className="px-1 text-xs" style={{ color: "#6B7280" }}>…</span>
                      ) : (
                        <button key={p} onClick={() => goToPage(p)}
                          className="w-8 h-8 text-xs font-bold transition-all hover:scale-105"
                          style={{
                            background: page === p ? "#1d5bbf" : "#FAF7F2",
                            color: page === p ? "#fff" : "#6B7280",
                            border: page === p ? "2px solid #1d5bbf" : "2px solid #C9B29F",
                            fontFamily: "var(--font-mono)",
                            borderRadius: "10px",
                          }}>
                          {p}
                        </button>
                      )
                    );
                  })()}

                  {/* Next */}
                  <button onClick={() => goToPage(page + 1)} disabled={page === totalPages}
                    className="px-3 py-1.5 text-xs font-medium disabled:opacity-20 transition-all hover:scale-105"
                    style={{ background: "#FAF7F2", color: "#6B7280", border: "2px solid #C9B29F", fontFamily: "var(--font-table)", borderRadius: "10px" }}>
                    →
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ─── CTA Banner ─── */}
        <div className="mt-10 p-6 text-center relative overflow-hidden"
          style={{
            background: "#FAF7F2",
            border: "2px solid #C9B29F",
            borderRadius: "10px",
          }}>
          <h2 style={{ fontFamily: "var(--font-table)", fontWeight: 700, fontSize: "1.1rem", color: "#1C1C1C" }}>
            Want to add your dogs?
          </h2>
          <p className="mt-1.5 mb-4" style={{ fontFamily: "var(--font-table)", fontSize: "12px", color: "#6B7280" }}>
            Create an account to register dogs, build pedigree trees, track litters, and more.
          </p>
          <Link href="/register"
            className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold transition-all hover:scale-105"
            style={{
              background: "#1d5bbf", color: "#fff",
              fontFamily: "var(--font-table)", letterSpacing: "0.04em", textTransform: "uppercase",
              borderRadius: "10px",
            }}>
            Get Started Free →
          </Link>
        </div>
      </div>

      {/* ─── Footer ─── */}
      <footer className="text-center py-6" style={{ borderTop: "2px solid #C9B29F" }}>
        <div className="flex items-center justify-center gap-2 mb-2">
          <img src={LOGO} alt="Logo" className="w-8 h-8 rounded-lg" />
          <span style={{
            fontFamily: "var(--font-table)", fontWeight: 700, fontSize: "12px",
            color: "#1C1C1C",
          }}>Pedigree Platform</span>
        </div>
        <div className="flex items-center justify-center gap-4">
          <Link href="/pedigree" className="text-[10px] hover:underline" style={{ color: "#6B7280" }}>Search</Link>
          <Link href="/privacy" className="text-[10px] hover:underline" style={{ color: "#6B7280" }}>Privacy</Link>
          <Link href="/terms" className="text-[10px] hover:underline" style={{ color: "#6B7280" }}>Terms</Link>
          <Link href="/contact" className="text-[10px] hover:underline" style={{ color: "#6B7280" }}>Contact</Link>
        </div>
      </footer>
    </div>
  );
}
