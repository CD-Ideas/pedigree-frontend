"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getDogColor } from "@/app/utils/colors";

const capName = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

const LOGO = "/logo.png";
const PER_PAGE = 24;

type SortOption = "newest" | "oldest" | "most_viewed" | "az" | "za";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "most_viewed", label: "Most Viewed" },
  { value: "az", label: "A → Z" },
  { value: "za", label: "Z → A" },
];

const COUNTRY_MAP: Record<string, string[]> = {
  "North America": ["United States", "Canada", "Mexico", "Antigua and Barbuda", "Bahamas", "Barbados", "Belize", "Cuba", "Dominica", "Dominican Republic", "Grenada", "Guatemala", "Haiti", "Honduras", "Jamaica", "El Salvador", "Costa Rica", "Nicaragua", "Panama", "Puerto Rico", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Trinidad and Tobago"],
  "South America": ["Brazil", "Argentina", "Colombia", "Chile", "Peru", "Venezuela", "Ecuador", "Uruguay", "Paraguay", "Bolivia"],
  "Europe": ["United Kingdom", "Ireland", "Spain", "Portugal", "France", "Germany", "Italy", "Netherlands", "Belgium", "Sweden", "Denmark", "Norway", "Finland", "Poland", "Romania", "Hungary", "Czech Republic", "Greece", "Croatia", "Serbia", "Bulgaria", "Albania", "Russia", "Ukraine", "Turkey"],
  "Asia": ["Philippines", "Japan", "South Korea", "China", "Thailand", "Indonesia", "Vietnam", "India", "Pakistan", "Iran", "Iraq", "Israel", "Saudi Arabia", "UAE", "Malaysia", "Singapore", "Taiwan"],
  "Africa": ["South Africa", "Nigeria", "Kenya", "Egypt", "Morocco", "Ghana", "Tanzania", "Ethiopia", "Cameroon", "Algeria"],
  "Oceania": ["Australia", "New Zealand", "Fiji", "Papua New Guinea"],
};

const ALL_CONTINENTS = Object.keys(COUNTRY_MAP);
const ALL_COUNTRIES = Object.values(COUNTRY_MAP).flat().sort();

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
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortOption>("newest");
  const [filterContinent, setFilterContinent] = useState("");
  const [filterCountry, setFilterCountry] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [sexFilter, setSexFilter] = useState("");
  const [hasPhotoFilter, setHasPhotoFilter] = useState(false);

  useEffect(() => {
    fetch("/api/pedigrees/community")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setPedigrees(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, sort, filterContinent, filterCountry, sexFilter, hasPhotoFilter]);

  // Get available countries based on continent selection
  const availableCountries = filterContinent
    ? COUNTRY_MAP[filterContinent] || []
    : ALL_COUNTRIES;

  const filtered = pedigrees
    .filter((p) => {
      // Search filter
      if (search.trim()) {
        const q = search.toUpperCase();
        const display = buildDisplayName(p).toUpperCase();
        if (
          !display.includes(q) &&
          !(p.creator || "").toUpperCase().includes(q) &&
          !(p.country || "").toUpperCase().includes(q) &&
          !(p.breeder || "").toUpperCase().includes(q)
        ) return false;
      }
      // Continent filter
      if (filterContinent && p.continent !== filterContinent) return false;
      // Country filter
      if (filterCountry && p.country !== filterCountry) return false;
      // Sex filter
      if (sexFilter && (p.sex || "").toUpperCase() !== sexFilter) return false;
      // Has photo filter
      if (hasPhotoFilter && !p.photo_path) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sort) {
        case "newest": return new Date(b.date_posted).getTime() - new Date(a.date_posted).getTime();
        case "oldest": return new Date(a.date_posted).getTime() - new Date(b.date_posted).getTime();
        case "most_viewed": return (b.view_count || 0) - (a.view_count || 0);
        case "az": return buildDisplayName(a).localeCompare(buildDisplayName(b));
        case "za": return buildDisplayName(b).localeCompare(buildDisplayName(a));
        default: return 0;
      }
    });

  const activeFilters = [filterContinent, filterCountry, sexFilter, hasPhotoFilter].filter(Boolean).length;

  const clearFilters = () => {
    setFilterContinent("");
    setFilterCountry("");
    setSexFilter("");
    setHasPhotoFilter(false);
  };

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="min-h-screen" style={{ background: "#EDE4D5" }}>
      <style>{`
        @keyframes cardReveal {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1
              className="text-2xl font-black uppercase tracking-widest"
              style={{
                fontFamily: "var(--font-table)",
                background: "#C9B29F",
              }}
            >
              Community Pedigrees
            </h1>
            <p
              className="text-xs mt-1"
              style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}
            >
              Browse pedigrees created by the community
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* View toggle */}
            <div
              className="flex rounded-lg overflow-hidden"
              style={{ border: "2px solid #C9B29F", background: "#FAF7F2" }}
            >
              <button
                onClick={() => { setViewMode("grid"); setPage(1); }}
                className="px-3 py-1.5 text-xs font-medium transition-all"
                style={{
                  background: viewMode === "grid" ? "rgba(201,178,159,0.25)" : "transparent",
                  color: viewMode === "grid" ? "#1C1C1C" : "#4A4A4A",
                  fontFamily: "var(--font-table)",
                }}
              >
                Grid
              </button>
              <button
                onClick={() => { setViewMode("table"); setPage(1); }}
                className="px-3 py-1.5 text-xs font-medium transition-all"
                style={{
                  background: viewMode === "table" ? "rgba(201,178,159,0.25)" : "transparent",
                  color: viewMode === "table" ? "#1C1C1C" : "#4A4A4A",
                  fontFamily: "var(--font-table)",
                }}
              >
                Table
              </button>
            </div>

            {/* Search */}
            <div className="relative flex-1 sm:w-72">
              <input
                type="text"
                placeholder="Search by name, creator, country..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg px-4 py-2 text-xs outline-none"
                style={{
                  background: "#FAFAFA",
                  border: "2px solid #C9B29F",
                  color: "#1C1C1C",
                  fontFamily: "var(--font-table)",
                }}
              />
              <span
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm"
                style={{ color: "#4A4A4A" }}
              >
                🔍
              </span>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-4">
          <span
            className="text-[12px] px-3 py-1 rounded-full"
            style={{
              background: "rgba(201,178,159,0.1)",
              color: "#1C1C1C",
              border: "2px solid #C9B29F",
              fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
            }}
          >
            {pedigrees.length} Published
          </span>
          {(search.trim() || activeFilters > 0) && (
            <span
              className="text-[12px] px-3 py-1 rounded-full"
              style={{
                background: "rgba(96,165,250,0.1)",
                color: "#1d5bbf",
                border: "1px solid rgba(96,165,250,0.2)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {filtered.length} Found
            </span>
          )}
        </div>

        {/* Sort & Filters Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="rounded-lg px-3 py-1.5 text-[12px] outline-none cursor-pointer"
            style={{
              background: "#FAF7F2",
              border: "2px solid #C9B29F",
              color: "#1C1C1C",
              fontFamily: "var(--font-table)",
            }}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Filters toggle button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-3 py-1.5 rounded-lg text-[12px] font-medium relative transition-colors"
            style={{
              background: showFilters ? "rgba(201,178,159,0.2)" : "#FAFAFA",
              border: "2px solid #C9B29F",
              color: "#1C1C1C",
              fontFamily: "var(--font-table)",
            }}
          >
            Filters
            {activeFilters > 0 && (
              <span
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[12px] font-bold"
                style={{ background: "#C9B29F", color: "#1C1C1C" }}
              >
                {activeFilters}
              </span>
            )}
          </button>
        </div>

        {/* Collapsible Filters Panel */}
        {showFilters && (
          <div
            style={{
              background: "#FAF7F2",
              border: "2px solid #C9B29F",
              borderRadius: "8px",
            }}
            className="p-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
              {/* Continent */}
              <div>
                <label className="text-[12px] uppercase tracking-wider mb-1.5 block" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>
                  Continent
                </label>
                <select
                  value={filterContinent}
                  onChange={(e) => {
                    setFilterContinent(e.target.value);
                    setFilterCountry("");
                  }}
                  className="w-full rounded-lg px-3 py-1.5 text-xs outline-none cursor-pointer"
                  style={{
                    background: "#FAFAFA",
                    border: "2px solid #C9B29F",
                    color: filterContinent ? "#1C1C1C" : "#4A4A4A",
                  }}
                >
                  <option value="">All Continents</option>
                  {ALL_CONTINENTS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Country */}
              <div>
                <label className="text-[12px] uppercase tracking-wider mb-1.5 block" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>
                  Country
                </label>
                <select
                  value={filterCountry}
                  onChange={(e) => {
                    const country = e.target.value;
                    setFilterCountry(country);
                    if (country && !filterContinent) {
                      for (const [cont, countries] of Object.entries(COUNTRY_MAP)) {
                        if (countries.includes(country)) {
                          setFilterContinent(cont);
                          break;
                        }
                      }
                    }
                  }}
                  className="w-full rounded-lg px-3 py-1.5 text-xs outline-none cursor-pointer"
                  style={{
                    background: "#FAFAFA",
                    border: "2px solid #C9B29F",
                    color: filterCountry ? "#1C1C1C" : "#4A4A4A",
                  }}
                >
                  <option value="">All Countries</option>
                  {availableCountries.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Sex */}
              <div>
                <label className="text-[12px] uppercase tracking-wider mb-1.5 block" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>
                  Sex
                </label>
                <select
                  value={sexFilter}
                  onChange={(e) => { setSexFilter(e.target.value); setPage(1); }}
                  className="w-full rounded-lg px-3 py-1.5 text-xs outline-none cursor-pointer"
                  style={{
                    background: "#FAFAFA",
                    border: "2px solid #C9B29F",
                    color: sexFilter ? "#1C1C1C" : "#4A4A4A",
                  }}
                >
                  <option value="">All</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </div>

              {/* Has Photo */}
              <div className="flex items-end">
                <label
                  className="flex items-center gap-2 text-xs cursor-pointer select-none"
                  style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}
                >
                  <input
                    type="checkbox"
                    checked={hasPhotoFilter}
                    onChange={(e) => { setHasPhotoFilter(e.target.checked); setPage(1); }}
                    className="accent-[#C9B29F]"
                  />
                  Has photo
                </label>
              </div>

              {/* Clear All */}
              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                  style={{ color: "#c02828", background: "rgba(192,40,40,0.08)", border: "2px solid rgba(192,40,40,0.2)", fontFamily: "var(--font-table)" }}
                >
                  Clear all
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pedigree Cards */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div
              className="flex items-center gap-3"
              style={{
                color: "#4A4A4A",
                fontFamily: "var(--font-table)",
              }}
            >
              <div
                className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                style={{
                  borderColor: "#C9B29F",
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
              style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}
            >
              {search.trim()
                ? "No pedigrees match your search"
                : "No community pedigrees yet. Be the first to publish!"}
            </p>
          </div>
        ) : (
          <>
            {viewMode === "table" ? (
              /* Table View */
              <div
                style={{ border: "2px solid #C9B29F", background: "#FAF7F2", borderRadius: "8px" }}
                className="overflow-hidden"
              >
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: "#1C1C1C", borderBottom: "2px solid #C9B29F" }}>
                      <th className="text-left px-3 py-2 text-[12px] uppercase tracking-wider font-bold" style={{ color: "#FAF7F2", fontFamily: "var(--font-table)" }}>Dog Name</th>
                      <th className="text-left px-3 py-2 text-[12px] uppercase tracking-wider font-bold" style={{ color: "#FAF7F2", fontFamily: "var(--font-table)" }}>Sex</th>
                      <th className="text-left px-3 py-2 text-[12px] uppercase tracking-wider font-bold hidden md:table-cell" style={{ color: "#FAF7F2", fontFamily: "var(--font-table)" }}>Creator</th>
                      <th className="text-left px-3 py-2 text-[12px] uppercase tracking-wider font-bold hidden md:table-cell" style={{ color: "#FAF7F2", fontFamily: "var(--font-table)" }}>Country</th>
                      <th className="text-left px-3 py-2 text-[12px] uppercase tracking-wider font-bold hidden lg:table-cell" style={{ color: "#FAF7F2", fontFamily: "var(--font-table)" }}>Breeder</th>
                      <th className="text-left px-3 py-2 text-[12px] uppercase tracking-wider font-bold hidden lg:table-cell" style={{ color: "#FAF7F2", fontFamily: "var(--font-table)" }}>Date Posted</th>
                      <th className="text-left px-3 py-2 text-[12px] uppercase tracking-wider font-bold" style={{ color: "#FAF7F2", fontFamily: "var(--font-table)" }}>Views</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((p) => {
                      const displayName = buildDisplayName(p);
                      const titleColor = getDogColor(displayName);
                      const isMale = p.sex === "Male" || p.sex === "MALE" || p.sex === "M";
                      return (
                        <tr
                          key={p.id}
                          className="transition-colors"
                          style={{ borderBottom: "1px solid #C9B29F" }}
                        >
                          <td className="px-3 py-2">
                            <Link href={`/pedigree/custom/${p.id}`} className="font-bold hover:underline text-[12px]" style={{ color: titleColor, fontFamily: "var(--font-table)" }}>
                              {displayName}
                            </Link>
                            <div className="text-[12px]" style={{ color: "#4A4A4A", fontFamily: "var(--font-mono)" }}>
                              ID: {p.id}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold"
                              style={{
                                background: isMale ? "rgba(29,91,191,0.1)" : "rgba(159,18,57,0.1)",
                                color: isMale ? "#1d5bbf" : "#9f1239",
                              }}
                            >
                              {isMale ? "\u2642" : "\u2640"}
                            </span>
                          </td>
                          <td className="px-3 py-2 hidden md:table-cell text-xs" style={{ color: "#1d5bbf", fontFamily: "var(--font-table)" }}>
                            {p.creator ? <Link href={`/profile/${encodeURIComponent(p.creator)}`} className="hover:underline" style={{ color: "#1d5bbf" }}>{capName(p.creator)}</Link> : "\u2014"}
                          </td>
                          <td className="px-3 py-2 hidden md:table-cell text-xs" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>
                            {p.country || "\u2014"}
                          </td>
                          <td className="px-3 py-2 hidden lg:table-cell text-xs" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>
                            {p.breeder || "\u2014"}
                          </td>
                          <td className="px-3 py-2 hidden lg:table-cell text-xs" style={{ color: "#4A4A4A", fontFamily: "var(--font-mono)" }}>
                            {formatDate(p.date_posted)}
                          </td>
                          <td className="px-3 py-2 text-xs" style={{ color: "#4A4A4A", fontFamily: "var(--font-mono)" }}>
                            {(p.view_count || 0).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {paginated.map((p, index) => {
                const displayName = buildDisplayName(p);
                const titleColor = getDogColor(displayName);
                const isMale =
                  p.sex === "Male" || p.sex === "MALE" || p.sex === "M";

                return (
                  <Link
                    key={p.id}
                    href={`/pedigree/custom/${p.id}`}
                    className="rounded-lg overflow-hidden transition-all hover:scale-[1.02] group"
                    style={{
                      background: "#FAF7F2",
                      border: "2px solid #C9B29F",
                      borderRadius: "8px",
                      animation: "cardReveal 0.4s ease both",
                      animationDelay: `${index * 30}ms`,
                    }}
                  >
                    {/* Photo area */}
                    <div
                      className="h-20 relative"
                      style={{
                        background: p.photo_path
                          ? `url(${p.photo_path}) center/cover`
                          : `linear-gradient(135deg, ${titleColor}15, #FAF7F2)`,
                      }}
                    >
                      {/* View count */}
                      <div
                        className="absolute top-1.5 right-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full"
                        style={{
                          background: "rgba(250,247,242,0.9)",
                          border: "1px solid #C9B29F",
                        }}
                      >
                        <span
                          className="text-[12px]"
                          style={{
                            color: "#1C1C1C",
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          👁 {(p.view_count || 0).toLocaleString()}
                        </span>
                      </div>
                      {/* Creator badge */}
                      {p.creator && (
                        <div
                          className="absolute top-1.5 left-1.5 flex items-center px-1.5 py-0.5 rounded-full"
                          style={{
                            background: "rgba(250,247,242,0.9)",
                            border: "1px solid #C9B29F",
                          }}
                        >
                          <Link
                            href={`/profile/${encodeURIComponent(p.creator)}`}
                            className="text-[12px] font-bold hover:underline"
                            style={{
                              color: "#1d5bbf",
                              fontFamily: "var(--font-table)",
                            }}
                          >
                            {capName(p.creator)}
                          </Link>
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="px-2 py-1.5">
                      <p
                        className="text-[12px] font-bold truncate"
                        style={{
                          color: titleColor,
                          fontFamily: "var(--font-table)",
                        }}
                      >
                        {displayName}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span
                          className="text-[12px]"
                          style={{ color: isMale ? "#1d5bbf" : "#9f1239" }}
                        >
                          {isMale ? "♂" : "♀"}
                        </span>
                        {p.country && (
                          <span className="text-[12px]" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>
                            · {p.country}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[12px]" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>
                          {formatDate(p.date_posted)}
                        </span>
                        <span className="text-[12px]" style={{ color: "#4A4A4A", fontFamily: "var(--font-mono)" }}>
                          ID: <span style={{ color: "#1C1C1C" }}>{p.id}</span>
                        </span>
                      </div>
                      {/* Breeder/Owner badges */}
                      {(p.breeder || p.owner) && (
                        <div className="flex items-center gap-1 flex-wrap mt-1">
                          {p.breeder && (
                            <span className="text-[12px] px-1 py-0.5 rounded-full" style={{
                              background: "rgba(201,178,159,0.1)",
                              color: "#1C1C1C",
                              border: "1px solid #C9B29F",
                              fontFamily: "var(--font-table)",
                            }}>
                              B: {p.breeder}
                            </span>
                          )}
                          {p.owner && (
                            <span className="text-[12px] px-1 py-0.5 rounded-full" style={{
                              background: "rgba(34,197,94,0.1)",
                              color: "#22c55e",
                              border: "1px solid rgba(34,197,94,0.2)",
                              fontFamily: "var(--font-table)",
                            }}>
                              O: {p.owner}
                            </span>
                          )}
                        </div>
                      )}
                      {/* View Pedigree button */}
                      <div className="mt-1.5">
                        <span
                          className="text-[12px] px-2 py-0.5 rounded-lg font-semibold transition-all group-hover:scale-105 inline-block"
                          style={{
                            background: "rgba(201,178,159,0.1)",
                            color: "#1C1C1C",
                            border: "2px solid #C9B29F",
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all"
                  style={{
                    background: page === 1 ? "#EDE4D5" : "#FAF7F2",
                    border: "2px solid #C9B29F",
                    color: page === 1 ? "#4A4A4A" : "#1C1C1C",
                    fontFamily: "var(--font-table)",
                    cursor: page === 1 ? "not-allowed" : "pointer",
                    opacity: page === 1 ? 0.5 : 1,
                  }}
                >
                  ← Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                  .map((p, idx, arr) => (
                    <span key={p}>
                      {idx > 0 && arr[idx - 1] !== p - 1 && (
                        <span className="text-[12px] px-1" style={{ color: "#4A4A4A" }}>…</span>
                      )}
                      <button
                        onClick={() => setPage(p)}
                        className="w-8 h-8 rounded-lg text-[12px] font-semibold transition-all"
                        style={{
                          background: page === p ? "#1C1C1C" : "#FAF7F2",
                          border: "2px solid #C9B29F",
                          color: page === p ? "#FAF7F2" : "#1C1C1C",
                          fontFamily: "var(--font-table)",
                        }}
                      >
                        {p}
                      </button>
                    </span>
                  ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all"
                  style={{
                    background: page === totalPages ? "#EDE4D5" : "#FAF7F2",
                    border: "2px solid #C9B29F",
                    color: page === totalPages ? "#4A4A4A" : "#1C1C1C",
                    fontFamily: "var(--font-table)",
                    cursor: page === totalPages ? "not-allowed" : "pointer",
                    opacity: page === totalPages ? 0.5 : 1,
                  }}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
