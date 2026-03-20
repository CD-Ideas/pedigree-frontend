"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";

/* ─── Types ─── */
interface MarketplaceAd {
  id: number;
  title: string;
  description: string;
  category: string;
  price: number | null;
  location: string;
  photos: string[];
  views: number;
  is_verified: boolean;
  created_at: string;
  expires_at: string;
  user_id: number;
  dog_id: number | null;
}

interface MarketplaceResponse {
  ads: MarketplaceAd[];
  total: number;
  totalPages: number;
  page: number;
}

/* ─── Constants ─── */
const LOGO = "https://i.imgur.com/cAvQemZ.png";

const CATEGORIES = [
  { key: "dogs_for_sale", label: "Dogs for Sale", icon: "\uD83D\uDC15", color: "#ef4444" },
  { key: "stud_service", label: "Stud Service", icon: "\uD83D\uDC8E", color: "#8b5cf6" },
  { key: "litters_for_sale", label: "Litters for Sale", icon: "\uD83C\uDF7C", color: "#f472b6" },
  { key: "supplies_gear", label: "Supplies & Gear", icon: "\uD83C\uDF92", color: "#22c55e" },
  { key: "courier_services", label: "Courier Services", icon: "\uD83D\uDE9A", color: "#60a5fa" },
  { key: "puppies_wanted", label: "Puppies Wanted", icon: "\uD83D\uDCE2", color: "#e8c86e" },
];

const CATEGORY_MAP: Record<string, { label: string; icon: string; color: string }> = {};
for (const c of CATEGORIES) CATEGORY_MAP[c.key] = c;

const LIMIT = 12;

/* ─── Helpers ─── */
function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function formatPrice(price: number | null): string {
  if (price === null || price === undefined) return "Contact for Price";
  return `$${price.toLocaleString()}`;
}

/* ─── Ad Card ─── */
function AdCard({ ad, index }: { ad: MarketplaceAd; index: number }) {
  const cat = CATEGORY_MAP[ad.category];
  const photo = ad.photos && ad.photos.length > 0 ? ad.photos[0] : null;

  return (
    <Link
      href={`/marketplace/${ad.id}`}
      className="group block rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
      style={{
        background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)",
        border: "1.5px solid rgba(30,64,120,0.3)",
        animation: "cardReveal 0.4s ease both",
        animationDelay: `${index * 40}ms`,
      }}
    >
      {/* Photo */}
      <div className="relative h-48 overflow-hidden">
        {photo ? (
          <img
            src={photo}
            alt={ad.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #0c1929 0%, #152744 50%, #1a2e4a 100%)" }}
          >
            <span className="text-5xl opacity-20">{cat?.icon || "\uD83D\uDC15"}</span>
          </div>
        )}

        {/* Category badge */}
        {cat && (
          <div
            className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-1 rounded-full backdrop-blur-md"
            style={{
              background: `${cat.color}22`,
              border: `1px solid ${cat.color}44`,
            }}
          >
            <span className="text-[10px]">{cat.icon}</span>
            <span
              className="text-[9px] font-bold uppercase tracking-wide"
              style={{ color: cat.color, fontFamily: "var(--font-table)" }}
            >
              {cat.label}
            </span>
          </div>
        )}

        {/* Views badge */}
        <div
          className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-0.5 rounded-full backdrop-blur-md"
          style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <span className="text-[9px]" style={{ color: "#d4a855", fontFamily: "var(--font-mono)" }}>
            {"\uD83D\uDC41"} {(ad.views || 0).toLocaleString()}
          </span>
        </div>

        {/* Verified */}
        {ad.is_verified && (
          <div
            className="absolute bottom-2.5 right-2.5 flex items-center gap-1 px-2 py-0.5 rounded-full backdrop-blur-md"
            style={{ background: "rgba(34,197,94,0.2)", border: "1px solid rgba(34,197,94,0.4)" }}
          >
            <span className="text-[9px] font-bold" style={{ color: "#22c55e", fontFamily: "var(--font-table)" }}>
              {"\u2713"} Verified
            </span>
          </div>
        )}

        {/* Bottom gradient */}
        <div
          className="absolute inset-x-0 bottom-0 h-16"
          style={{ background: "linear-gradient(transparent, #0e1828)" }}
        />
      </div>

      {/* Info */}
      <div className="px-3.5 pb-3.5 -mt-2 relative">
        <h3
          className="text-sm font-bold leading-tight mb-1.5 line-clamp-2 transition-colors duration-200 group-hover:text-[#e8c86e]"
          style={{ color: "var(--text-primary, #e2e8f0)", fontFamily: "var(--font-table)" }}
        >
          {ad.title}
        </h3>

        {/* Price */}
        <div
          className="text-base font-black mb-2"
          style={{
            color: ad.price !== null && ad.price !== undefined ? "#22c55e" : "#5a6a82",
            fontFamily: "var(--font-mono)",
          }}
        >
          {formatPrice(ad.price)}
        </div>

        {/* Location & time */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-[10px]" style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}>
            <span>{"\uD83D\uDCCD"}</span>
            <span className="truncate max-w-[120px]">{ad.location || "Unknown"}</span>
          </div>
          <span className="text-[10px]" style={{ color: "#5a6a82", fontFamily: "var(--font-mono)" }}>
            {timeAgo(ad.created_at)}
          </span>
        </div>
      </div>
    </Link>
  );
}

/* ─── Main Marketplace Page ─── */
export default function MarketplacePage() {
  const [ads, setAds] = useState<MarketplaceAd[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);

  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sort, setSort] = useState("newest");

  const searchRef = useRef<HTMLInputElement>(null);

  const fetchAds = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT), sort });
    if (category) params.set("category", category);
    if (search) params.set("search", search);

    fetch(`/api/marketplace?${params}`)
      .then((r) => r.json())
      .then((data: MarketplaceResponse) => {
        setAds(data.ads || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
        setLoading(false);
        setInitialLoad(false);
      })
      .catch(() => {
        setLoading(false);
        setInitialLoad(false);
      });
  }, [page, category, search, sort]);

  useEffect(() => {
    fetchAds();
  }, [fetchAds]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const handleCategoryClick = (key: string) => {
    setCategory(category === key ? "" : key);
    setPage(1);
  };

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
    <div className="min-h-screen" style={{ background: "var(--bg-deep, #0b1120)" }}>
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
      `}</style>

      {/* ─── Nav ─── */}
      <nav
        className="sticky top-0 z-50 px-4 md:px-6 py-2.5 flex items-center justify-between"
        style={{
          background: "rgba(11,17,32,0.95)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid var(--border, rgba(30,64,120,0.3))",
        }}
      >
        <Link href="/" className="flex items-center gap-2.5">
          <img src={LOGO} alt="Logo" className="w-7 h-7 rounded-lg" />
          <span
            style={{
              fontFamily: "var(--font-table)",
              fontWeight: 700,
              fontSize: "1rem",
              background: "linear-gradient(135deg, #e8c86e, #d4a855, #b8860b)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Pedigree Platform
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/browse"
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105"
            style={{ color: "var(--text-secondary, #94a3b8)", fontFamily: "var(--font-table)" }}
          >
            Dogs
          </Link>
          <Link
            href="/marketplace/create"
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
            style={{
              background: "linear-gradient(135deg, #e8c86e, #b8860b)",
              color: "#000",
              fontFamily: "var(--font-table)",
            }}
          >
            + Create Ad
          </Link>
        </div>
      </nav>

      {/* ─── Hero Header ─── */}
      <div className="relative overflow-hidden">
        {/* Ambient glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] opacity-[0.07]"
          style={{ background: "radial-gradient(ellipse, rgba(212,168,85,1) 0%, transparent 70%)" }}
        />

        <div className="relative max-w-[1200px] mx-auto px-4 md:px-6 pt-8 pb-5">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/"
              className="text-[10px] font-medium hover:underline transition-colors"
              style={{ color: "var(--text-muted, #5a6a82)", fontFamily: "var(--font-table)" }}
            >
              Home
            </Link>
            <span style={{ color: "var(--text-muted, #5a6a82)", fontSize: "10px" }}>/</span>
            <span
              className="text-[10px] font-medium"
              style={{ color: "#e8c86e", fontFamily: "var(--font-table)" }}
            >
              Marketplace
            </span>
          </div>

          {/* Title */}
          <h1
            className="text-3xl md:text-4xl font-black uppercase tracking-widest"
            style={{
              fontFamily: "var(--font-display, Oswald, sans-serif)",
              background: "linear-gradient(135deg, #e8c86e, #d4a855)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            MARKETPLACE
          </h1>
          <p
            className="mt-1.5 text-sm"
            style={{ color: "var(--text-secondary, #94a3b8)", fontFamily: "var(--font-table)" }}
          >
            Buy, sell, and connect with breeders worldwide
          </p>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 md:px-6 pb-10">
        {/* ─── Category Filter Cards ─── */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          {CATEGORIES.map((cat) => {
            const isActive = category === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => handleCategoryClick(cat.key)}
                className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-left transition-all duration-300 hover:scale-[1.02]"
                style={{
                  background: isActive
                    ? `linear-gradient(135deg, ${cat.color}18, ${cat.color}08)`
                    : "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)",
                  border: isActive
                    ? `1.5px solid ${cat.color}66`
                    : "1.5px solid rgba(30,64,120,0.3)",
                  backdropFilter: "blur(12px)",
                }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                  style={{ background: `${cat.color}18`, border: `1px solid ${cat.color}33` }}
                >
                  {cat.icon}
                </div>
                <div>
                  <div
                    className="text-xs font-bold"
                    style={{
                      color: isActive ? cat.color : "var(--text-primary, #e2e8f0)",
                      fontFamily: "var(--font-table)",
                    }}
                  >
                    {cat.label}
                  </div>
                  <div
                    className="text-[9px] mt-0.5"
                    style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}
                  >
                    {isActive ? "Click to clear" : "Browse listings"}
                  </div>
                </div>
                {isActive && (
                  <div className="ml-auto">
                    <span
                      className="text-[10px] font-bold"
                      style={{ color: cat.color }}
                    >
                      {"\u2713"}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* ─── Search & Sort Bar ─── */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div
              className="flex-1 flex items-center rounded-lg overflow-hidden transition-all duration-200"
              style={{
                background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)",
                border: "1.5px solid rgba(30,64,120,0.3)",
              }}
            >
              <div className="pl-3.5 pr-2 flex-shrink-0">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#5a6a82"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </div>
              <input
                ref={searchRef}
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search ads by title or description... press / to focus"
                className="flex-1 bg-transparent outline-none py-2.5 pr-3"
                style={{ fontFamily: "var(--font-table)", fontSize: "13px", color: "var(--text-primary, #e2e8f0)" }}
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput("");
                    setSearch("");
                    setPage(1);
                  }}
                  className="pr-3 text-xs"
                  style={{ color: "#5a6a82" }}
                >
                  {"\u2715"}
                </button>
              )}
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg text-xs font-bold transition-all hover:scale-105 flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #e8c86e, #b8860b)",
                color: "#000",
                fontFamily: "var(--font-table)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              Search
            </button>
          </form>

          {/* Sort dropdown */}
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
            className="rounded-lg px-3 py-2.5 text-xs font-medium appearance-none cursor-pointer"
            style={{
              background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)",
              border: "1.5px solid rgba(30,64,120,0.3)",
              color: "var(--text-secondary, #94a3b8)",
              fontFamily: "var(--font-table)",
              paddingRight: "30px",
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%234b5f80'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 10px center",
              minWidth: "140px",
            }}
          >
            <option value="newest">Newest First</option>
            <option value="most_viewed">Most Viewed</option>
          </select>
        </div>

        {/* Active filters info */}
        {(search || category) && !loading && (
          <div className="mb-4 flex items-center gap-2 flex-wrap">
            {search && (
              <span
                className="text-xs font-bold px-2.5 py-1 rounded-md"
                style={{
                  background: "rgba(212,168,85,0.1)",
                  color: "#e8c86e",
                  fontFamily: "var(--font-table)",
                  border: "1px solid rgba(212,168,85,0.2)",
                }}
              >
                &ldquo;{search}&rdquo;
              </span>
            )}
            {category && CATEGORY_MAP[category] && (
              <span
                className="text-xs font-bold px-2.5 py-1 rounded-md flex items-center gap-1"
                style={{
                  background: `${CATEGORY_MAP[category].color}15`,
                  color: CATEGORY_MAP[category].color,
                  fontFamily: "var(--font-table)",
                  border: `1px solid ${CATEGORY_MAP[category].color}33`,
                }}
              >
                {CATEGORY_MAP[category].icon} {CATEGORY_MAP[category].label}
              </span>
            )}
            <button
              onClick={() => {
                setCategory("");
                setSearch("");
                setSearchInput("");
                setPage(1);
              }}
              className="text-[11px] font-medium px-3 py-1 rounded-lg transition-all hover:scale-105"
              style={{
                color: "#ef4444",
                background: "rgba(239,68,68,0.08)",
                fontFamily: "var(--font-table)",
              }}
            >
              {"\u2715"} Clear
            </button>
            <span
              className="text-[11px] ml-auto"
              style={{ color: "#5a6a82", fontFamily: "var(--font-mono)" }}
            >
              {total} result{total !== 1 ? "s" : ""}
            </span>
          </div>
        )}

        {/* ─── Content ─── */}
        {loading ? (
          <div className="py-16">
            {initialLoad ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-xl overflow-hidden"
                    style={{
                      border: "1.5px solid rgba(30,64,120,0.3)",
                      background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)",
                    }}
                  >
                    <div
                      className="h-48"
                      style={{
                        background:
                          "linear-gradient(90deg, #0e1828 0%, #152744 50%, #0e1828 100%)",
                        backgroundSize: "200% 100%",
                        animation: "shimmer 1.5s infinite",
                      }}
                    />
                    <div className="p-3.5 space-y-2">
                      <div className="h-4 rounded" style={{ background: "#152744", width: "75%" }} />
                      <div className="h-3 rounded" style={{ background: "#152744", width: "40%" }} />
                      <div className="h-3 rounded" style={{ background: "#152744", width: "60%" }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="flex items-center justify-center gap-3"
                style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}
              >
                <div
                  className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: "#e8c86e", borderTopColor: "transparent" }}
                />
                Loading ads...
              </div>
            )}
          </div>
        ) : ads.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4 opacity-30">{"\uD83D\uDED2"}</div>
            <h3
              className="text-lg font-bold mb-2"
              style={{ color: "var(--text-primary, #e2e8f0)", fontFamily: "var(--font-table)" }}
            >
              No ads found
            </h3>
            <p
              className="text-sm mb-6"
              style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}
            >
              Try adjusting your search or category filter
            </p>
            <Link
              href="/marketplace/create"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold transition-all hover:scale-105"
              style={{
                background: "linear-gradient(135deg, #e8c86e, #b8860b)",
                color: "#000",
                fontFamily: "var(--font-table)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                boxShadow: "0 4px 20px rgba(212,168,85,0.2)",
              }}
            >
              + Post the First Ad
            </Link>
          </div>
        ) : (
          <>
            {/* Ad Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {ads.map((ad, i) => (
                <AdCard key={ad.id} ad={ad} index={i} />
              ))}
            </div>

            {/* ─── Pagination ─── */}
            {totalPages > 1 && (
              <div className="mt-8 flex flex-col items-center gap-3">
                <div
                  className="text-[11px]"
                  style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}
                >
                  Showing{" "}
                  <span style={{ color: "#e8c86e", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                    {(page - 1) * LIMIT + 1}&ndash;{Math.min(page * LIMIT, total)}
                  </span>{" "}
                  of{" "}
                  <span style={{ color: "var(--text-primary, #e2e8f0)", fontWeight: 600 }}>
                    {total.toLocaleString()}
                  </span>{" "}
                  ads
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => goToPage(page - 1)}
                    disabled={page === 1}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-20 transition-all hover:scale-105"
                    style={{
                      background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)",
                      color: "var(--text-secondary, #94a3b8)",
                      border: "1.5px solid rgba(30,64,120,0.3)",
                      fontFamily: "var(--font-table)",
                    }}
                  >
                    {"\u2190"}
                  </button>

                  {(() => {
                    const pages: (number | string)[] = [];
                    if (totalPages <= 7) {
                      for (let i = 1; i <= totalPages; i++) pages.push(i);
                    } else {
                      pages.push(1);
                      if (page > 3) pages.push("...");
                      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++)
                        pages.push(i);
                      if (page < totalPages - 2) pages.push("...");
                      pages.push(totalPages);
                    }
                    return pages.map((p, i) =>
                      typeof p === "string" ? (
                        <span key={`dots-${i}`} className="px-1 text-xs" style={{ color: "#5a6a82" }}>
                          {"\u2026"}
                        </span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => goToPage(p)}
                          className="w-8 h-8 rounded-lg text-xs font-bold transition-all hover:scale-105"
                          style={{
                            background:
                              page === p
                                ? "linear-gradient(135deg, #e8c86e, #b8860b)"
                                : "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)",
                            color: page === p ? "#000" : "#5a6a82",
                            border: page === p ? "none" : "1.5px solid rgba(30,64,120,0.3)",
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          {p}
                        </button>
                      )
                    );
                  })()}

                  <button
                    onClick={() => goToPage(page + 1)}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-20 transition-all hover:scale-105"
                    style={{
                      background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)",
                      color: "var(--text-secondary, #94a3b8)",
                      border: "1.5px solid rgba(30,64,120,0.3)",
                      fontFamily: "var(--font-table)",
                    }}
                  >
                    {"\u2192"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ─── CTA Banner ─── */}
        <div
          className="mt-10 rounded-xl p-6 text-center relative overflow-hidden"
          style={{
            background: "linear-gradient(160deg, rgba(212,168,85,0.06), rgba(14,15,20,0.98))",
            border: "1px solid rgba(212,168,85,0.15)",
          }}
        >
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{ background: "linear-gradient(90deg, transparent, rgba(212,168,85,0.3), transparent)" }}
          />
          <h2
            style={{
              fontFamily: "var(--font-table)",
              fontWeight: 700,
              fontSize: "1.1rem",
              color: "var(--text-primary, #e2e8f0)",
            }}
          >
            Ready to sell or advertise?
          </h2>
          <p
            className="mt-1.5 mb-4"
            style={{ fontFamily: "var(--font-table)", fontSize: "12px", color: "#5a6a82" }}
          >
            Create a listing to reach thousands of breeders and enthusiasts.
          </p>
          <Link
            href="/marketplace/create"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold transition-all hover:scale-105"
            style={{
              background: "linear-gradient(135deg, #e8c86e, #b8860b)",
              color: "#000",
              fontFamily: "var(--font-table)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              boxShadow: "0 4px 20px rgba(212,168,85,0.2)",
            }}
          >
            Create Ad {"\u2192"}
          </Link>
        </div>
      </div>

      {/* ─── Footer ─── */}
      <footer className="text-center py-6" style={{ borderTop: "1px solid var(--border, rgba(30,64,120,0.3))" }}>
        <div className="flex items-center justify-center gap-2 mb-2">
          <img src={LOGO} alt="Logo" className="w-5 h-5 rounded" />
          <span
            style={{
              fontFamily: "var(--font-table)",
              fontWeight: 700,
              fontSize: "12px",
              background: "linear-gradient(135deg, #e8c86e, #d4a855)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Pedigree Platform
          </span>
        </div>
        <div className="flex items-center justify-center gap-4">
          <Link href="/" className="text-[10px] hover:underline" style={{ color: "#5a6a82" }}>
            Home
          </Link>
          <Link href="/browse" className="text-[10px] hover:underline" style={{ color: "#5a6a82" }}>
            Dogs
          </Link>
          <Link href="/marketplace" className="text-[10px] hover:underline" style={{ color: "#e8c86e" }}>
            Marketplace
          </Link>
          <Link href="/privacy" className="text-[10px] hover:underline" style={{ color: "#5a6a82" }}>
            Privacy
          </Link>
          <Link href="/terms" className="text-[10px] hover:underline" style={{ color: "#5a6a82" }}>
            Terms
          </Link>
        </div>
      </footer>
    </div>
  );
}
