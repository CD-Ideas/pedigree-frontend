"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getDogColor } from "@/app/utils/colors";

interface Dog {
  id: number;
  name: string;
  sex: string;
  color: string | null;
  dob: string | null;
  reg_number: string;
  titles?: string[];
  profile_image_url: string | null;
  sire_id: number | null;
  dam_id: number | null;
  sire_name: string | null;
  dam_name: string | null;
  view_count?: number;
  about?: string | null;
}

const TITLE_COLORS: Record<string, string> = {
  "GR CH": "#60a5fa", CH: "#fc8181", ROM: "#22d3ee", POR: "#a78bfa",
  "1XW": "#2dd4bf", "2XW": "#fb923c", "3XW": "#d4a855",
  "4XW": "#f472b6", "5XW": "#c084fc", "6XW": "#c084fc", "7XW": "#c084fc",
  "1XL": "#2dd4bf", "2XL": "#fb923c", "3XL": "#d4a855",
};

function SexIcon({ sex }: { sex: string }) {
  const male = sex === "MALE";
  return (
    <span
      className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold"
      style={{
        background: male ? "rgba(91,141,239,0.15)" : "rgba(212,107,163,0.15)",
        color: male ? "var(--male-color)" : "var(--female-color)",
      }}
    >
      {male ? "♂" : "♀"}
    </span>
  );
}

function DogCard({ dog, index }: { dog: Dog; index: number }) {
  const photoUrl = dog.profile_image_url
    ? dog.profile_image_url.startsWith("http")
      ? dog.profile_image_url
      : `https://www.apbt.online-pedigrees.com/${dog.profile_image_url}`
    : null;

  return (
    <Link
      href={`/dogs/${dog.id}`}
      className="glow-gold group block rounded-lg overflow-hidden transition-all duration-300 hover:scale-[1.02] animate-reveal"
      style={{
        background: "linear-gradient(180deg, rgba(30,30,30,0.85) 0%, rgba(22,22,22,0.9) 100%)",
        border: "1.5px solid rgba(255,255,255,0.06)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)",
        animationDelay: `${index * 30}ms`,
      }}
    >
      {/* Photo or Gradient Placeholder */}
      <div className="relative h-32 overflow-hidden">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={dog.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              background:
                dog.sex === "MALE"
                  ? "linear-gradient(135deg, #1a2540 0%, #1e3a5f 100%)"
                  : "linear-gradient(135deg, #2a1a30 0%, #4a2040 100%)",
            }}
          >
            <span
              className="text-3xl opacity-20"
              style={{
                fontFamily: "var(--font-display)",
                color: dog.sex === "MALE" ? "var(--male-color)" : "var(--female-color)",
              }}
            >
              {dog.sex === "MALE" ? "♂" : "♀"}
            </span>
          </div>
        )}

        {/* Titles overlay */}
        {(dog.titles ?? []).length > 0 && (
          <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
            {(dog.titles ?? []).map((t) => (
              <span
                key={t}
                className="text-[10px] font-bold px-1.5 py-0.5 rounded backdrop-blur-sm"
                style={{
                  background: "rgba(0,0,0,0.6)",
                  color: TITLE_COLORS[t] || "var(--accent-gold)",
                }}
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Sex badge overlay */}
        <div className="absolute top-2 right-2">
          <SexIcon sex={dog.sex} />
        </div>

        {/* Gradient fade to bottom */}
        <div
          className="absolute inset-x-0 bottom-0 h-16"
          style={{
            background: "linear-gradient(transparent, var(--bg-surface))",
          }}
        />
      </div>

      {/* Info */}
      <div className="px-3 pb-3 -mt-2 relative">
        <h3
          className="font-semibold text-xs leading-tight mb-1 transition-colors line-clamp-2"
          style={{ color: getDogColor(dog.name), fontFamily: "var(--font-table)" }}
        >
          {dog.name}
        </h3>

        {dog.color && (
          <p className="text-[10px] mb-1.5" style={{ color: "var(--text-muted)" }}>
            {dog.color}
          </p>
        )}

        {/* Parents */}
        <div className="space-y-0.5 mt-1.5">
          {dog.sire_name && (
            <div className="flex items-center gap-1.5 text-[10px]">
              <span
                className="w-1 h-1 rounded-full flex-shrink-0"
                style={{ background: "var(--male-color)" }}
              />
              <span style={{ color: "var(--text-muted)" }}>Sire:</span>
              <span
                className="truncate"
                style={{ color: "var(--male-color)", opacity: 0.8 }}
              >
                {dog.sire_name}
              </span>
            </div>
          )}
          {dog.dam_name && (
            <div className="flex items-center gap-1.5 text-[10px]">
              <span
                className="w-1 h-1 rounded-full flex-shrink-0"
                style={{ background: "var(--female-color)" }}
              />
              <span style={{ color: "var(--text-muted)" }}>Dam:</span>
              <span
                className="truncate"
                style={{ color: "var(--female-color)", opacity: 0.8 }}
              >
                {dog.dam_name}
              </span>
            </div>
          )}
          {!dog.sire_name && !dog.dam_name && (
            <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
              No parents recorded
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between mt-2 pt-1.5 text-[9px]"
          style={{
            borderTop: "1px solid var(--border)",
            color: "var(--text-muted)",
            fontFamily: "var(--font-mono)",
          }}
        >
          <span>{dog.reg_number}</span>
          {(dog.view_count || 0) > 0 && <span>{(dog.view_count || 0).toLocaleString()} views</span>}
        </div>
      </div>
    </Link>
  );
}

export default function DogsPage() {
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sexFilter, setSexFilter] = useState("");
  const [colorFilter, setColorFilter] = useState("");
  const urlParams = useSearchParams();
  const [titleFilter, setTitleFilter] = useState(urlParams.get("title") || "");
  const [hasPhotoFilter, setHasPhotoFilter] = useState(false);
  const [sort, setSort] = useState("name");
  const [order, setOrder] = useState("asc");
  const [filterColors, setFilterColors] = useState<string[]>([]);
  const [filterTitles, setFilterTitles] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const fetchDogs = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: viewMode === "grid" ? "24" : "50",
      sort,
      order,
    });
    if (search) params.set("search", search);
    if (sexFilter) params.set("sex", sexFilter);
    if (colorFilter) params.set("color", colorFilter);
    if (titleFilter) params.set("title", titleFilter);
    if (hasPhotoFilter) params.set("hasPhoto", "true");
    fetch(`/api/dogs?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setDogs(data.dogs);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        if (data.filters) {
          if (data.filters.colors)
            setFilterColors(data.filters.colors.filter(Boolean).sort());
          if (data.filters.titles)
            setFilterTitles(data.filters.titles.filter(Boolean).sort());
        }
        setLoading(false);
      });
  }, [page, search, sexFilter, colorFilter, titleFilter, hasPhotoFilter, sort, order, viewMode]);

  useEffect(() => {
    fetchDogs();
  }, [fetchDogs]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const clearFilters = () => {
    setSexFilter("");
    setColorFilter("");
    setTitleFilter("");
    setHasPhotoFilter(false);
    setSearch("");
    setSearchInput("");
    setPage(1);
  };

  const activeFilters = [sexFilter, colorFilter, titleFilter, hasPhotoFilter].filter(Boolean).length;

  const sortOptions = [
    { key: "name", label: "Name" },
    { key: "id", label: "ID" },
    { key: "created", label: "Added" },
    { key: "dob", label: "DOB" },
  ];

  return (
    <div>
      <style>{`
        .glow-gold { transition: all 0.3s ease; }
        .glow-gold:hover { border-color: #d4a855 !important; box-shadow: 0 0 20px rgba(212,168,85,0.15), 0 4px 24px rgba(0,0,0,0.4) !important; }
        .dogs-search:focus { border-color: rgba(212,168,85,0.4) !important; box-shadow: 0 0 15px rgba(212,168,85,0.1), 0 0 0 2px rgba(212,168,85,0.08) !important; }
        .sort-btn { transition: all 0.2s ease; }
        .sort-btn:hover { background: rgba(212,168,85,0.1) !important; color: var(--accent-gold) !important; transform: translateY(-1px); }
        .sort-btn-active { background: linear-gradient(135deg, rgba(212,168,85,0.2), rgba(184,134,11,0.1)) !important; color: var(--accent-gold) !important; box-shadow: 0 0 10px rgba(212,168,85,0.1); }
        .page-btn { transition: all 0.2s ease; }
        .page-btn:hover:not(:disabled) { background: rgba(212,168,85,0.1) !important; color: var(--accent-gold) !important; transform: scale(1.05); }
      `}</style>
      {/* Header */}
      <div className="flex items-end justify-between mb-4">
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", fontWeight: 700 }}>
            🐕 Dogs
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent-gold)" }}>
              {total.toLocaleString()}
            </span>{" "}
            dogs in database
          </p>
        </div>
        {/* View toggle */}
        <div
          className="flex rounded-lg overflow-hidden"
          style={{ border: "1.5px solid rgba(255,255,255,0.06)", background: "rgba(22,22,22,0.9)" }}
        >
          <button
            onClick={() => { setViewMode("grid"); setPage(1); }}
            className="px-3 py-1.5 text-xs font-medium transition-all"
            style={{
              background: viewMode === "grid" ? "linear-gradient(135deg, rgba(212,168,85,0.2), rgba(184,134,11,0.1))" : "transparent",
              color: viewMode === "grid" ? "var(--accent-gold)" : "var(--text-muted)",
              fontFamily: "var(--font-table)",
            }}
          >
            ▦ Grid
          </button>
          <button
            onClick={() => { setViewMode("table"); setPage(1); }}
            className="px-3 py-1.5 text-xs font-medium transition-all"
            style={{
              background: viewMode === "table" ? "linear-gradient(135deg, rgba(212,168,85,0.2), rgba(184,134,11,0.1))" : "transparent",
              color: viewMode === "table" ? "var(--accent-gold)" : "var(--text-muted)",
              fontFamily: "var(--font-table)",
            }}
          >
            ☰ Table
          </button>
        </div>
      </div>

      {/* Search + Filter Toggle */}
      <div className="flex gap-2 mb-3">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name or reg number..."
            className="dogs-search flex-1 rounded-lg px-3 py-2 text-xs transition-all outline-none"
            style={{
              background: "rgba(30,30,30,0.85)",
              border: "1.5px solid rgba(255,255,255,0.06)",
              color: "var(--text-primary)",
              fontFamily: "var(--font-table)",
            }}
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all hover:scale-[1.03]"
            style={{ background: "linear-gradient(135deg, #e8c86e, #b8860b, #d4a855)", color: "#000", fontFamily: "var(--font-table)", boxShadow: "0 2px 10px rgba(212,168,85,0.2), inset 0 1px 0 rgba(255,255,255,0.3)", border: "1px solid rgba(212,168,85,0.4)" }}
          >
            Search
          </button>
        </form>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="px-3 py-2 rounded-lg text-xs font-medium relative transition-colors"
          style={{
            background: showFilters ? "rgba(30,30,30,0.95)" : "rgba(30,30,30,0.85)",
            border: "1.5px solid rgba(255,255,255,0.06)",
            color: "var(--text-primary)",
          }}
        >
          ⚙ Filters
          {activeFilters > 0 && (
            <span
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
              style={{ background: "var(--accent-gold)", color: "#000" }}
            >
              {activeFilters}
            </span>
          )}
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div
          style={{
            background: "linear-gradient(180deg, rgba(30,30,30,0.85) 0%, rgba(22,22,22,0.9) 100%)",
            border: "1.5px solid rgba(255,255,255,0.06)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
          className="rounded-lg p-3 mb-3 animate-reveal"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
            <div>
              <label className="text-[10px] uppercase tracking-wider mb-1.5 block" style={{ color: "var(--text-muted)" }}>
                Sex
              </label>
              <select
                value={sexFilter}
                onChange={(e) => { setSexFilter(e.target.value); setPage(1); }}
                className="w-full rounded-lg px-3 py-1.5 text-xs"
                style={{
                  background: "rgba(30,30,30,0.85)",
                  border: "1.5px solid rgba(255,255,255,0.06)",
                  color: "var(--text-primary)",
                }}
              >
                <option value="">All</option>
                <option value="MALE">♂ Male</option>
                <option value="FEMALE">♀ Female</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider mb-1.5 block" style={{ color: "var(--text-muted)" }}>
                Color
              </label>
              <select
                value={colorFilter}
                onChange={(e) => { setColorFilter(e.target.value); setPage(1); }}
                className="w-full rounded-lg px-3 py-1.5 text-xs"
                style={{
                  background: "rgba(30,30,30,0.85)",
                  border: "1.5px solid rgba(255,255,255,0.06)",
                  color: "var(--text-primary)",
                }}
              >
                <option value="">All colors</option>
                {filterColors.slice(0, 50).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider mb-1.5 block" style={{ color: "var(--text-muted)" }}>
                Title
              </label>
              <select
                value={titleFilter}
                onChange={(e) => { setTitleFilter(e.target.value); setPage(1); }}
                className="w-full rounded-lg px-3 py-1.5 text-xs"
                style={{
                  background: "rgba(30,30,30,0.85)",
                  border: "1.5px solid rgba(255,255,255,0.06)",
                  color: "var(--text-primary)",
                }}
              >
                <option value="">All titles</option>
                {filterTitles.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <label
                className="flex items-center gap-2 text-xs cursor-pointer select-none"
                style={{ color: "var(--text-primary)" }}
              >
                <input
                  type="checkbox"
                  checked={hasPhotoFilter}
                  onChange={(e) => { setHasPhotoFilter(e.target.checked); setPage(1); }}
                  className="accent-[var(--accent-gold)]"
                />
                Has photo
              </label>
            </div>
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                style={{ color: "var(--accent-red)", background: "rgba(224,85,85,0.1)" }}
              >
                Clear all
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sort */}
      <div className="flex items-center gap-2 mb-5">
        <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          Sort by:
        </span>
        {sortOptions.map((s) => (
          <button
            key={s.key}
            onClick={() => {
              if (sort === s.key) {
                setOrder(order === "asc" ? "desc" : "asc");
              } else {
                setSort(s.key);
                setOrder("asc");
              }
              setPage(1);
            }}
            className={`sort-btn px-2.5 py-1 rounded-md text-xs font-medium ${sort === s.key ? "sort-btn-active" : ""}`}
            style={{
              background: sort === s.key ? "linear-gradient(135deg, rgba(212,168,85,0.2), rgba(184,134,11,0.1))" : "transparent",
              color: sort === s.key ? "var(--accent-gold)" : "var(--text-muted)",
              border: sort === s.key ? "1px solid rgba(212,168,85,0.25)" : "1px solid transparent",
              fontFamily: "var(--font-table)",
            }}
          >
            {s.label} {sort === s.key ? (order === "asc" ? "↑" : "↓") : ""}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-3" style={{ color: "var(--text-muted)" }}>
            <div
              className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: "var(--accent-gold)", borderTopColor: "transparent" }}
            />
            Loading...
          </div>
        </div>
      ) : dogs.length === 0 ? (
        <div className="text-center py-20" style={{ color: "var(--text-muted)" }}>
          <div className="text-4xl mb-3">🐕</div>
          <p>No dogs found matching your filters</p>
          <button onClick={clearFilters} className="text-sm mt-2 underline" style={{ color: "var(--accent-gold)" }}>
            Clear filters
          </button>
        </div>
      ) : viewMode === "grid" ? (
        /* Card Grid */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2.5">
          {dogs.map((dog, i) => (
            <DogCard key={dog.id} dog={dog} index={i} />
          ))}
        </div>
      ) : (
        /* Table View */
        <div
          style={{ border: "1.5px solid rgba(255,255,255,0.06)", boxShadow: "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)", background: "linear-gradient(180deg, rgba(30,30,30,0.85) 0%, rgba(22,22,22,0.9) 100%)", backdropFilter: "blur(16px)" }}
          className="rounded-lg overflow-hidden"
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-medium" style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)" }}>Dog</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-medium" style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)" }}>Sex</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-medium hidden md:table-cell" style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)" }}>Color</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-medium hidden lg:table-cell" style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)" }}>Sire</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-medium hidden lg:table-cell" style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)" }}>Dam</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-medium hidden md:table-cell" style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)" }}>Titles</th>
              </tr>
            </thead>
            <tbody>
              {dogs.map((dog) => (
                <tr
                  key={dog.id}
                  className="hover:bg-[var(--bg-hover)] transition-colors"
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <td className="px-3 py-2">
                    <Link href={`/dogs/${dog.id}`} className="font-medium hover:underline" style={{ color: getDogColor(dog.name), fontFamily: "var(--font-table)" }}>
                      {dog.name}
                    </Link>
                    <div className="text-[10px]" style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                      {dog.reg_number}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <SexIcon sex={dog.sex} />
                  </td>
                  <td className="px-3 py-2 hidden md:table-cell text-xs" style={{ color: "var(--text-secondary)" }}>
                    {dog.color || "—"}
                  </td>
                  <td className="px-3 py-2 hidden lg:table-cell">
                    {dog.sire_id ? (
                      <Link href={`/dogs/${dog.sire_id}`} className="text-xs hover:underline" style={{ color: "var(--male-color)" }}>
                        {dog.sire_name || "Unknown"}
                      </Link>
                    ) : (
                      <span style={{ color: "var(--text-muted)" }}>—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 hidden lg:table-cell">
                    {dog.dam_id ? (
                      <Link href={`/dogs/${dog.dam_id}`} className="text-xs hover:underline" style={{ color: "var(--female-color)" }}>
                        {dog.dam_name || "Unknown"}
                      </Link>
                    ) : (
                      <span style={{ color: "var(--text-muted)" }}>—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 hidden md:table-cell">
                    <div className="flex gap-1 flex-wrap">
                      {(dog.titles ?? []).map((t) => (
                        <span
                          key={t}
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                          style={{
                            background: "rgba(212,168,85,0.12)",
                            color: TITLE_COLORS[t] || "var(--accent-gold)",
                          }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="page-btn px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider disabled:opacity-30 transition-all"
            style={{
              background: "rgba(30,30,30,0.85)",
              border: "1.5px solid rgba(255,255,255,0.06)",
              color: "var(--text-primary)",
              fontFamily: "var(--font-table)",
            }}
          >
            ← Prev
          </button>
          <div className="flex items-center gap-2">
            {/* Page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let p: number;
              if (totalPages <= 5) {
                p = i + 1;
              } else if (page <= 3) {
                p = i + 1;
              } else if (page >= totalPages - 2) {
                p = totalPages - 4 + i;
              } else {
                p = page - 2 + i;
              }
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className="page-btn w-8 h-8 rounded-lg text-xs font-bold transition-all"
                  style={{
                    background: page === p ? "linear-gradient(135deg, #e8c86e, #b8860b)" : "rgba(30,30,30,0.85)",
                    color: page === p ? "#000" : "var(--text-secondary)",
                    border: page === p ? "1px solid rgba(212,168,85,0.4)" : "1.5px solid rgba(255,255,255,0.06)",
                    boxShadow: page === p ? "0 2px 10px rgba(212,168,85,0.2)" : "none",
                    fontFamily: "var(--font-table)",
                  }}
                >
                  {p}
                </button>
              );
            })}
            <span className="text-xs px-2" style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
              of {totalPages}
            </span>
          </div>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="page-btn px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider disabled:opacity-30 transition-all"
            style={{
              background: "rgba(30,30,30,0.85)",
              border: "1.5px solid rgba(255,255,255,0.06)",
              color: "var(--text-primary)",
              fontFamily: "var(--font-table)",
            }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
