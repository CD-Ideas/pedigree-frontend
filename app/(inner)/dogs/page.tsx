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
  "GR CH": "#1d5bbf", CH: "#c02828", ROM: "#0d7468", POR: "#6d30b0",
  "1XW": "#0d7468", "2XW": "#b45a0a", "3XW": "#8a6518",
  "4XW": "#b03878", "5XW": "#6d30b0", "6XW": "#6d30b0", "7XW": "#6d30b0",
  "1XL": "#0d7468", "2XL": "#b45a0a", "3XL": "#8a6518",
};

const MALE_COLOR = "#1d5bbf";
const FEMALE_COLOR = "#9f1239";

function SexIcon({ sex }: { sex: string }) {
  const male = sex === "MALE";
  return (
    <span
      className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold"
      style={{
        background: male ? "rgba(29,91,191,0.1)" : "rgba(159,18,57,0.1)",
        color: male ? MALE_COLOR : FEMALE_COLOR,
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
      className="group block overflow-hidden transition-all duration-300 hover:scale-[1.02] animate-reveal"
      style={{
        background: "#FAF7F2",
        border: "2px solid #C9B29F",
        borderRadius: "8px",
        animationDelay: `${index * 30}ms`,
      }}
    >
      {/* Photo or Placeholder */}
      <div className="relative h-32 overflow-hidden">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={dog.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={(e) => { const t = e.target as HTMLImageElement; t.onerror = null; t.src = "/logo.png"; t.style.opacity = "0.3"; t.style.objectFit = "contain"; t.style.padding = "8px"; }}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              background: "#FAFAFA",
            }}
          >
            <span
              className="text-3xl opacity-30"
              style={{
                fontFamily: "var(--font-table)",
                color: dog.sex === "MALE" ? MALE_COLOR : FEMALE_COLOR,
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
                className="text-[12px] font-bold px-1.5 py-0.5 rounded"
                style={{
                  background: "#FAF7F2",
                  border: "1px solid #C9B29F",
                  color: TITLE_COLORS[t] || "#1C1C1C",
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
      </div>

      {/* Info */}
      <div className="px-3 pb-3 pt-2 relative">
        <h3
          className="font-semibold text-xs leading-tight mb-1 transition-colors line-clamp-2"
          style={{ color: getDogColor(dog.name), fontFamily: "var(--font-table)" }}
        >
          {dog.name}
        </h3>

        {dog.color && (
          <p className="text-[12px] mb-1.5" style={{ color: "#4A4A4A" }}>
            {dog.color}
          </p>
        )}

        {/* Parents */}
        <div className="space-y-0.5 mt-1.5">
          {dog.sire_name && (
            <div className="flex items-center gap-1.5 text-[12px]">
              <span
                className="w-1 h-1 rounded-full flex-shrink-0"
                style={{ background: "#1d5bbf" }}
              />
              <span style={{ color: "#1d5bbf" }}>Sire:</span>
              <span
                className="truncate"
                style={{ color: "#1d5bbf" }}
              >
                {dog.sire_name}
              </span>
            </div>
          )}
          {dog.dam_name && (
            <div className="flex items-center gap-1.5 text-[12px]">
              <span
                className="w-1 h-1 rounded-full flex-shrink-0"
                style={{ background: "#9f1239" }}
              />
              <span style={{ color: "#9f1239" }}>Dam:</span>
              <span
                className="truncate"
                style={{ color: "#9f1239" }}
              >
                {dog.dam_name}
              </span>
            </div>
          )}
          {!dog.sire_name && !dog.dam_name && (
            <div className="text-[12px]" style={{ color: "#4A4A4A" }}>
              No parents recorded
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between mt-2 pt-1.5 text-[12px]"
          style={{
            borderTop: "2px solid #C9B29F",
            color: "#4A4A4A",
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
    <div style={{ background: "#EDE4D5", minHeight: "100vh" }}>
      <style>{`
        .dogs-search:focus { border-color: #C9B29F !important; }
        .sort-btn { transition: all 0.2s ease; }
        .sort-btn:hover { background: rgba(201,178,159,0.15) !important; color: #1C1C1C !important; }
        .sort-btn-active { background: rgba(201,178,159,0.2) !important; color: #1C1C1C !important; }
        .page-btn { transition: all 0.2s ease; }
        .page-btn:hover:not(:disabled) { background: rgba(201,178,159,0.15) !important; color: #1C1C1C !important; }
      `}</style>
      {/* Header */}
      <div className="flex items-end justify-between mb-4">
        <div>
          <h1 style={{ fontFamily: "var(--font-table)", fontSize: "1.6rem", fontWeight: 900, color: "#1C1C1C" }}>
            Dogs
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "#4A4A4A" }}>
            <span style={{ fontFamily: "var(--font-mono)", color: "#1C1C1C", fontWeight: 600 }}>
              {total.toLocaleString()}
            </span>{" "}
            dogs in database
          </p>
        </div>
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
              background: "#FAFAFA",
              border: "2px solid #C9B29F",
              color: "#1C1C1C",
              fontFamily: "var(--font-table)",
            }}
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all hover:scale-[1.02]"
            style={{ background: "#C9B29F", color: "#1C1C1C", fontFamily: "var(--font-table)", border: "2px solid #C9B29F" }}
          >
            Search
          </button>
        </form>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="px-3 py-2 rounded-lg text-xs font-medium relative transition-colors"
          style={{
            background: showFilters ? "rgba(201,178,159,0.2)" : "#FAFAFA",
            border: "2px solid #C9B29F",
            color: "#1C1C1C",
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

      {/* Filter Panel */}
      {showFilters && (
        <div
          style={{
            background: "#FAF7F2",
            border: "2px solid #C9B29F",
            borderRadius: "8px",
          }}
          className="p-3 mb-3 animate-reveal"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
            <div>
              <label className="text-[12px] uppercase tracking-wider mb-1.5 block" style={{ color: "#4A4A4A" }}>
                Sex
              </label>
              <select
                value={sexFilter}
                onChange={(e) => { setSexFilter(e.target.value); setPage(1); }}
                className="w-full rounded-lg px-3 py-1.5 text-xs"
                style={{
                  background: "#FAFAFA",
                  border: "2px solid #C9B29F",
                  color: "#1C1C1C",
                }}
              >
                <option value="">All</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </select>
            </div>
            <div>
              <label className="text-[12px] uppercase tracking-wider mb-1.5 block" style={{ color: "#4A4A4A" }}>
                Color
              </label>
              <select
                value={colorFilter}
                onChange={(e) => { setColorFilter(e.target.value); setPage(1); }}
                className="w-full rounded-lg px-3 py-1.5 text-xs"
                style={{
                  background: "#FAFAFA",
                  border: "2px solid #C9B29F",
                  color: "#1C1C1C",
                }}
              >
                <option value="">All colors</option>
                {filterColors.slice(0, 50).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[12px] uppercase tracking-wider mb-1.5 block" style={{ color: "#4A4A4A" }}>
                Title
              </label>
              <select
                value={titleFilter}
                onChange={(e) => { setTitleFilter(e.target.value); setPage(1); }}
                className="w-full rounded-lg px-3 py-1.5 text-xs"
                style={{
                  background: "#FAFAFA",
                  border: "2px solid #C9B29F",
                  color: "#1C1C1C",
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
                style={{ color: "#1C1C1C" }}
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
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                style={{ color: "#c02828", background: "rgba(192,40,40,0.08)", border: "2px solid rgba(192,40,40,0.2)" }}
              >
                Clear all
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sort */}
      <div className="flex items-center gap-2 mb-5">
        <span className="text-[12px] uppercase tracking-wider" style={{ color: "#4A4A4A" }}>
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
            className={`sort-btn px-2.5 py-1 rounded-lg text-xs font-medium ${sort === s.key ? "sort-btn-active" : ""}`}
            style={{
              background: sort === s.key ? "rgba(201,178,159,0.2)" : "transparent",
              color: sort === s.key ? "#1C1C1C" : "#4A4A4A",
              border: sort === s.key ? "2px solid #C9B29F" : "2px solid transparent",
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
          <div className="flex items-center gap-3" style={{ color: "#4A4A4A" }}>
            <div
              className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: "#C9B29F", borderTopColor: "transparent" }}
            />
            Loading...
          </div>
        </div>
      ) : dogs.length === 0 ? (
        <div className="text-center py-20" style={{ color: "#4A4A4A" }}>
          <p>No dogs found matching your filters</p>
          <button onClick={clearFilters} className="text-sm mt-2 underline" style={{ color: "#1C1C1C" }}>
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
          style={{ border: "2px solid #C9B29F", background: "#FAF7F2", borderRadius: "8px" }}
          className="overflow-hidden"
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#1C1C1C", borderBottom: "2px solid #C9B29F" }}>
                <th className="text-left px-3 py-2 text-[12px] uppercase tracking-wider font-bold" style={{ color: "#FAF7F2", fontFamily: "var(--font-table)" }}>Dog</th>
                <th className="text-left px-3 py-2 text-[12px] uppercase tracking-wider font-bold" style={{ color: "#FAF7F2", fontFamily: "var(--font-table)" }}>Sex</th>
                <th className="text-left px-3 py-2 text-[12px] uppercase tracking-wider font-bold hidden md:table-cell" style={{ color: "#FAF7F2", fontFamily: "var(--font-table)" }}>Color</th>
                <th className="text-left px-3 py-2 text-[12px] uppercase tracking-wider font-bold hidden lg:table-cell" style={{ color: "#FAF7F2", fontFamily: "var(--font-table)" }}>Sire</th>
                <th className="text-left px-3 py-2 text-[12px] uppercase tracking-wider font-bold hidden lg:table-cell" style={{ color: "#FAF7F2", fontFamily: "var(--font-table)" }}>Dam</th>
                <th className="text-left px-3 py-2 text-[12px] uppercase tracking-wider font-bold hidden md:table-cell" style={{ color: "#FAF7F2", fontFamily: "var(--font-table)" }}>Titles</th>
              </tr>
            </thead>
            <tbody>
              {dogs.map((dog) => (
                <tr
                  key={dog.id}
                  className="transition-colors"
                  style={{ borderBottom: "1px solid #C9B29F" }}
                >
                  <td className="px-3 py-2">
                    <Link href={`/dogs/${dog.id}`} className="font-bold hover:underline text-[12px]" style={{ color: getDogColor(dog.name), fontFamily: "var(--font-table)" }}>
                      {dog.name}
                    </Link>
                    <div className="text-[12px]" style={{ color: "#4A4A4A", fontFamily: "var(--font-mono)" }}>
                      {dog.reg_number}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <SexIcon sex={dog.sex} />
                  </td>
                  <td className="px-3 py-2 hidden md:table-cell text-xs" style={{ color: "#4A4A4A" }}>
                    {dog.color || "—"}
                  </td>
                  <td className="px-3 py-2 hidden lg:table-cell">
                    {dog.sire_id ? (
                      <Link href={`/dogs/${dog.sire_id}`} className="text-xs hover:underline" style={{ color: MALE_COLOR }}>
                        {dog.sire_name || "Unknown"}
                      </Link>
                    ) : (
                      <span style={{ color: "#4A4A4A" }}>—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 hidden lg:table-cell">
                    {dog.dam_id ? (
                      <Link href={`/dogs/${dog.dam_id}`} className="text-xs hover:underline" style={{ color: FEMALE_COLOR }}>
                        {dog.dam_name || "Unknown"}
                      </Link>
                    ) : (
                      <span style={{ color: "#4A4A4A" }}>—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 hidden md:table-cell">
                    <div className="flex gap-1 flex-wrap">
                      {(dog.titles ?? []).map((t) => (
                        <span
                          key={t}
                          className="text-[12px] font-bold px-1.5 py-0.5 rounded"
                          style={{
                            background: "rgba(201,178,159,0.15)",
                            color: TITLE_COLORS[t] || "#1C1C1C",
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
              background: "#FAF7F2",
              border: "2px solid #C9B29F",
              color: "#1C1C1C",
              fontFamily: "var(--font-table)",
            }}
          >
            Prev
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
                    background: page === p ? "#C9B29F" : "#FAF7F2",
                    color: page === p ? "#1C1C1C" : "#4A4A4A",
                    border: "2px solid #C9B29F",
                    fontFamily: "var(--font-table)",
                  }}
                >
                  {p}
                </button>
              );
            })}
            <span className="text-xs px-2" style={{ color: "#4A4A4A", fontFamily: "var(--font-mono)" }}>
              of {totalPages}
            </span>
          </div>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="page-btn px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider disabled:opacity-30 transition-all"
            style={{
              background: "#FAF7F2",
              border: "2px solid #C9B29F",
              color: "#1C1C1C",
              fontFamily: "var(--font-table)",
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
