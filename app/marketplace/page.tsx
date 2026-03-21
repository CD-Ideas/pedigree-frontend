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
  username: string | null;
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
  { key: "dogs_for_sale", label: "Dogs for Sale", icon: "\uD83D\uDC15", color: "#ef4444", glow: "239,68,68", tag: "HOT" },
  { key: "stud_service", label: "Stud Service", icon: "\uD83D\uDC8E", color: "#8b5cf6", glow: "139,92,246", tag: null },
  { key: "litters_for_sale", label: "Litters for Sale", icon: "\uD83C\uDF7C", color: "#f472b6", glow: "244,114,182", tag: "NEW" },
  { key: "supplies_gear", label: "Supplies & Gear", icon: "\uD83C\uDF92", color: "#22c55e", glow: "34,197,94", tag: null },
  { key: "courier_services", label: "Courier Services", icon: "\uD83D\uDE9A", color: "#60a5fa", glow: "96,165,250", tag: null },
  { key: "puppies_wanted", label: "Puppies Wanted", icon: "\uD83D\uDCE2", color: "#e8c86e", glow: "212,168,85", tag: null },
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

        {/* Listed By */}
        {ad.username && (
          <div className="flex items-center gap-1.5 mb-1.5">
            <div
              className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0"
              style={{ background: "rgba(212,168,85,0.2)", color: "#e8c86e" }}
            >
              {ad.username.charAt(0).toUpperCase()}
            </div>
            <span className="text-[10px] font-medium" style={{ color: "#94a3b8", fontFamily: "var(--font-table)" }}>
              {ad.username}
            </span>
          </div>
        )}

        {/* Location & time & share */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-[10px]" style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}>
            <span>{"\uD83D\uDCCD"}</span>
            <span className="truncate max-w-[80px]">{ad.location || "Unknown"}</span>
            <span style={{ color: "rgba(90,106,130,0.4)" }}>{"\u00B7"}</span>
            <span style={{ fontFamily: "var(--font-mono)" }}>{timeAgo(ad.created_at)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigator.clipboard.writeText(`https://pedigreeplatform.com/marketplace/${ad.id}`);
              }}
              className="w-5 h-5 rounded flex items-center justify-center transition-all hover:scale-110"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
              title="Copy Link"
            >
              <span className="text-[9px]">{"\uD83D\uDD17"}</span>
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`${ad.title}${ad.price ? ` - $${ad.price}` : ""} | Pedigree Platform\nhttps://pedigreeplatform.com/marketplace/${ad.id}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="w-5 h-5 rounded flex items-center justify-center transition-all hover:scale-110"
              style={{ background: "rgba(37,211,102,0.1)", border: "1px solid rgba(37,211,102,0.2)" }}
              title="WhatsApp"
            >
              <svg viewBox="0 0 24 24" width="11" height="11" fill="#25d366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.3 0-4.438-.766-6.149-2.056l-.432-.336-3.2 1.073 1.073-3.2-.336-.432A9.953 9.953 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/></svg>
            </a>
            <a
              href={`https://t.me/share/url?url=${encodeURIComponent(`https://pedigreeplatform.com/marketplace/${ad.id}`)}&text=${encodeURIComponent(`${ad.title}${ad.price ? ` - $${ad.price}` : ""} | Pedigree Platform`)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="w-5 h-5 rounded flex items-center justify-center transition-all hover:scale-110"
              style={{ background: "rgba(0,136,204,0.1)", border: "1px solid rgba(0,136,204,0.2)" }}
              title="Telegram"
            >
              <svg viewBox="0 0 24 24" width="11" height="11" fill="#0088cc"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
            </a>
          </div>
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
      {/* ─── Hero Header ─── */}
      <div className="relative overflow-hidden">
        {/* Ambient glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[600px] h-[200px] opacity-[0.07]"
          style={{ background: "radial-gradient(ellipse, rgba(212,168,85,1) 0%, transparent 70%)" }}
        />

        <div className="relative max-w-[1200px] mx-auto px-4 md:px-6 pt-8 pb-5">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/"
              className="text-[10px] font-medium hover:underline transition-colors"
              style={{ color: "#e8c86e", fontFamily: "var(--font-table)" }}
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

          {/* Title + Create Ad */}
          <div className="flex items-start justify-between">
            <div>
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
            <Link
              href={category ? `/marketplace/create?category=${category}` : "/marketplace/create"}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-bold transition-all hover:scale-105 flex-shrink-0 mt-2"
              style={{
                background: "linear-gradient(135deg, #e8c86e, #b8860b)",
                color: "#000",
                fontFamily: "var(--font-table)",
                letterSpacing: "0.03em",
                boxShadow: "0 2px 12px rgba(212,168,85,0.2)",
              }}
            >
              + Create Ad
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 md:px-6 pb-10">
        {/* ─── Category Filter Cards ─── */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-6">
          {CATEGORIES.map((cat) => {
            const isActive = category === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => handleCategoryClick(cat.key)}
                className="group relative rounded-lg p-2.5 text-left cursor-pointer"
                style={{
                  background: isActive
                    ? `linear-gradient(160deg, rgba(${cat.glow},0.12) 0%, rgba(14,15,20,0.98) 100%)`
                    : "linear-gradient(160deg, rgba(25,27,35,0.95) 0%, rgba(14,15,20,0.98) 100%)",
                  border: isActive
                    ? `1px solid ${cat.color}`
                    : "1px solid rgba(255,255,255,0.07)",
                  transition: "all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                  overflow: "hidden",
                  boxShadow: isActive
                    ? `0 0 30px rgba(${cat.glow},0.12), 0 10px 35px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)`
                    : "0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)",
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = cat.color;
                    e.currentTarget.style.boxShadow = `0 0 30px rgba(${cat.glow},0.12), 0 10px 35px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)`;
                    e.currentTarget.style.transform = "translateY(-4px) scale(1.01)";
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                    e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)";
                    e.currentTarget.style.transform = "translateY(0) scale(1)";
                  }
                }}
              >
                {/* Top accent line */}
                <div
                  className="absolute top-0 left-0 right-0 h-[2px] transition-all duration-400"
                  style={{
                    background: `linear-gradient(90deg, transparent 5%, ${cat.color} 50%, transparent 95%)`,
                    opacity: isActive ? 1 : 0.3,
                  }}
                />
                <div className="flex items-start gap-2">
                  {/* Icon */}
                  <div
                    className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-md"
                    style={{
                      background: `linear-gradient(135deg, rgba(${cat.glow},0.12) 0%, rgba(${cat.glow},0.04) 100%)`,
                      border: `1px solid rgba(${cat.glow},0.2)`,
                    }}
                  >
                    <span className="text-sm">{cat.icon}</span>
                  </div>
                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 style={{ fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "11px", color: isActive ? cat.color : "#fff", letterSpacing: "0.02em" }}>
                        {cat.label}
                      </h3>
                      {cat.tag && (
                        <span style={{
                          fontFamily: "var(--font-table)", fontWeight: 700, fontSize: "8px", letterSpacing: "0.08em",
                          color: cat.tag === "HOT" ? "#ef4444" : "#22c55e",
                          background: cat.tag === "HOT" ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.12)",
                          border: `1px solid ${cat.tag === "HOT" ? "rgba(239,68,68,0.25)" : "rgba(34,197,94,0.25)"}`,
                          padding: "1px 6px", borderRadius: "9999px",
                        }}>{cat.tag}</span>
                      )}
                      {isActive && (
                        <span style={{
                          fontFamily: "var(--font-table)", fontWeight: 700, fontSize: "8px", letterSpacing: "0.08em",
                          color: cat.color,
                          background: `rgba(${cat.glow},0.12)`,
                          border: `1px solid rgba(${cat.glow},0.25)`,
                          padding: "1px 6px", borderRadius: "9999px",
                        }}>{"\u2713"} ACTIVE</span>
                      )}
                    </div>
                    <p style={{ fontFamily: "var(--font-table)", fontSize: "9px", color: "rgba(148,163,184,0.6)", marginTop: "2px", fontWeight: 400 }}>
                      {isActive ? "Click to clear filter" : "Browse listings"}
                    </p>
                  </div>
                </div>
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
          <div className="relative" style={{ minWidth: "120px" }}>
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
              className="rounded-xl px-3 py-2.5 text-xs font-black appearance-none cursor-pointer w-full"
              style={{
                background: "linear-gradient(135deg, #cbd5e1, #94a3b8)",
                color: "#000",
                fontFamily: "var(--font-display)",
                letterSpacing: "0.05em",
                paddingRight: "30px",
                border: "none",
                boxShadow: "0 4px 20px rgba(148,163,184,0.3)",
                transition: "all 0.3s ease",
              }}
            >
            <option value="newest">Newest First</option>
            <option value="most_viewed">Most Viewed</option>
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#000" }}>
              ▼
            </div>
          </div>
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
              href={category ? `/marketplace/create?category=${category}` : "/marketplace/create"}
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
