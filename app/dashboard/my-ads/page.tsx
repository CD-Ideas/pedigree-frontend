"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  status: string;
  is_verified: boolean;
  created_at: string;
  expires_at: string;
}

/* ─── Constants ─── */
const LOGO = "/logo.png";

const CATEGORIES: Record<string, { label: string; icon: string; color: string }> = {
  dogs_for_sale: { label: "Dogs for Sale", icon: "\uD83D\uDC15", color: "#ef4444" },
  stud_service: { label: "Stud Service", icon: "\uD83D\uDC8E", color: "#8b5cf6" },
  litters_for_sale: { label: "Litters for Sale", icon: "\uD83C\uDF7C", color: "#f472b6" },
  supplies_gear: { label: "Supplies & Gear", icon: "\uD83C\uDF92", color: "#22c55e" },
  courier_services: { label: "Courier Services", icon: "\uD83D\uDE9A", color: "#60a5fa" },
  puppies_wanted: { label: "Puppies Wanted", icon: "\uD83D\uDCE2", color: "#1C1C1C" },
};

const STATUS_STYLES: Record<string, { bg: string; color: string; border: string; label: string }> = {
  active: { bg: "rgba(34,197,94,0.12)", color: "#22c55e", border: "rgba(34,197,94,0.3)", label: "Active" },
  pending: { bg: "rgba(234,179,8,0.12)", color: "#eab308", border: "rgba(234,179,8,0.3)", label: "Pending" },
  expired: { bg: "rgba(148,163,184,0.12)", color: "#6B7280", border: "rgba(148,163,184,0.3)", label: "Expired" },
  removed: { bg: "rgba(239,68,68,0.12)", color: "#ef4444", border: "rgba(239,68,68,0.3)", label: "Removed" },
};

/* ─── Helpers ─── */
function formatDate(iso: string): string {
  if (!iso) return "\u2014";
  try {
    return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

/* ─── Main My Ads Page ─── */
export default function MyAdsPage() {
  const router = useRouter();
  const [ads, setAds] = useState<MarketplaceAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: number; username: string } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    try {
      const token = localStorage.getItem("token");
      const userStr = localStorage.getItem("user");
      if (!token || !userStr) {
        router.replace("/login");
        return;
      }
      const u = JSON.parse(userStr);
      setUser(u);

      fetch(`/api/marketplace/my-ads?userId=${u.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setAds(data);
          else if (data.ads) setAds(data.ads);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } catch {
      router.replace("/login");
    }
  }, [router]);

  const handleDelete = async (adId: number) => {
    if (!confirm("Are you sure you want to delete this ad? This cannot be undone.")) return;

    setDeletingId(adId);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/marketplace/${adId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setAds((prev) => prev.filter((a) => a.id !== adId));
      }
    } catch {
      // Silent fail
    }
    setDeletingId(null);
  };

  return (
    <div className="min-h-screen" style={{ background: "#EDE4D5" }}>
      {/* ─── Nav ─── */}
      <nav
        className="sticky top-0 z-50 px-4 md:px-6 py-2.5 flex items-center justify-between"
        style={{
          background: "#FAF7F2",

          borderBottom: "1px solid #C9B29F",
        }}
      >
        <Link href="/" className="flex items-center gap-2.5">
          <img src={LOGO} alt="Logo" className="w-14" style={{ height: "auto" }} />
          <span
            style={{
              fontFamily: "var(--font-table)",
              fontWeight: 700,
              fontSize: "1rem",
              color: "#1C1C1C",
              
              
            }}
          >
            Pedigree Platform
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/marketplace"
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105"
            style={{ color: "var(--text-secondary, #94a3b8)", fontFamily: "var(--font-table)" }}
          >
            Marketplace
          </Link>
          <Link
            href="/marketplace/create"
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
            style={{
              background: "#1C1C1C",
              color: "#FAF7F2",
              fontFamily: "var(--font-table)",
            }}
          >
            + Create Ad
          </Link>
        </div>
      </nav>

      <div className="max-w-[1000px] mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1
              className="text-2xl font-black uppercase tracking-widest"
              style={{
                fontFamily: "var(--font-display)",
                background: "#1C1C1C",
                
                
              }}
            >
              MY ADS
            </h1>
            <p className="text-xs mt-1" style={{ color: "#6B7280", fontFamily: "var(--font-table)" }}>
              Manage your marketplace listings
            </p>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3">
            <span
              className="text-[10px] px-3 py-1 rounded-lg"
              style={{
                background: "rgba(201,178,159,0.1)",
                color: "#1C1C1C",
                border: "2px solid #C9B29F",
                fontFamily: "var(--font-mono)",
              }}
            >
              {ads.length} {ads.length === 1 ? "Ad" : "Ads"}
            </span>
            <Link
              href="/marketplace/create"
              className="px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:scale-105"
              style={{
                background: "#1C1C1C",
                color: "#FAF7F2",
                fontFamily: "var(--font-table)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              + Create New Ad
            </Link>
          </div>
        </div>

        {/* Ads List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-3" style={{ color: "#6B7280", fontFamily: "var(--font-table)" }}>
              <div
                className="w-5 h-5 rounded-lg border-2 border-t-transparent animate-spin"
                style={{ borderColor: "#C9B29F", borderTopColor: "transparent" }}
              />
              Loading your ads...
            </div>
          </div>
        ) : ads.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4 opacity-30">{"\uD83D\uDED2"}</div>
            <h3
              className="text-lg font-bold mb-2"
              style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}
            >
              No ads yet
            </h3>
            <p
              className="text-sm mb-6"
              style={{ color: "#6B7280", fontFamily: "var(--font-table)" }}
            >
              Create your first marketplace listing to start selling or advertising.
            </p>
            <Link
              href="/marketplace/create"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold transition-all hover:scale-105"
              style={{
                background: "#1C1C1C",
                color: "#FAF7F2",
                fontFamily: "var(--font-table)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              + Create Your First Ad
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {ads.map((ad) => {
              const cat = CATEGORIES[ad.category];
              const statusStyle = STATUS_STYLES[ad.status] || STATUS_STYLES.active;
              const photo = ad.photos && ad.photos.length > 0 ? ad.photos[0] : null;

              return (
                <div
                  key={ad.id}
                  className="rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.01]"
                  style={{
                    background: "#FAF7F2",
                    border: "2px solid #C9B29F",
                    
                  }}
                >
                  <div className="flex flex-col sm:flex-row">
                    {/* Thumbnail */}
                    <div className="sm:w-36 md:w-40 h-32 sm:h-auto flex-shrink-0 relative overflow-hidden">
                      {photo ? (
                        <img src={photo} alt={ad.title} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center min-h-[100px]"
                          style={{ background: "#C9B29F" }}
                        >
                          <span className="text-3xl opacity-20">{cat?.icon || "\uD83D\uDC15"}</span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-4 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Category badge */}
                            {cat && (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-bold"
                                style={{
                                  background: `${cat.color}18`,
                                  color: cat.color,
                                  border: `1px solid ${cat.color}33`,
                                  fontFamily: "var(--font-table)",
                                }}
                              >
                                {cat.icon} {cat.label}
                              </span>
                            )}

                            {/* Status badge */}
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider"
                              style={{
                                background: statusStyle.bg,
                                color: statusStyle.color,
                                border: `1px solid ${statusStyle.border}`,
                                fontFamily: "var(--font-table)",
                              }}
                            >
                              {statusStyle.label}
                            </span>
                          </div>

                          {/* Views */}
                          <span
                            className="text-[10px] flex items-center gap-1 flex-shrink-0"
                            style={{ color: "#6B7280", fontFamily: "var(--font-mono)" }}
                          >
                            {"\uD83D\uDC41"} {(ad.views || 0).toLocaleString()}
                          </span>
                        </div>

                        {/* Title */}
                        <Link
                          href={`/marketplace/${ad.id}`}
                          className="text-sm font-bold leading-tight hover:underline transition-colors"
                          style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}
                        >
                          {ad.title}
                        </Link>

                        {/* Price */}
                        {ad.price !== null && ad.price !== undefined && (
                          <div
                            className="text-sm font-black mt-1"
                            style={{ color: "#22c55e", fontFamily: "var(--font-mono)" }}
                          >
                            ${ad.price.toLocaleString()}
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: "1px solid #C9B29F" }}>
                        <span className="text-[10px]" style={{ color: "#6B7280", fontFamily: "var(--font-mono)" }}>
                          Created {formatDate(ad.created_at)}
                        </span>

                        <div className="flex items-center gap-2">
                          <Link
                            href={`/marketplace/${ad.id}`}
                            className="px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all hover:scale-105"
                            style={{
                              background: "rgba(201,178,159,0.1)",
                              color: "#1C1C1C",
                              border: "2px solid #C9B29F",
                              fontFamily: "var(--font-table)",
                            }}
                          >
                            View
                          </Link>
                          <Link
                            href={`/marketplace/${ad.id}/edit`}
                            className="px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all hover:scale-105"
                            style={{
                              background: "rgba(96,165,250,0.1)",
                              color: "#60a5fa",
                              border: "1px solid rgba(96,165,250,0.25)",
                              fontFamily: "var(--font-table)",
                            }}
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDelete(ad.id)}
                            disabled={deletingId === ad.id}
                            className="px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all hover:scale-105 disabled:opacity-50"
                            style={{
                              background: "rgba(239,68,68,0.1)",
                              color: "#ef4444",
                              border: "1px solid rgba(239,68,68,0.25)",
                              fontFamily: "var(--font-table)",
                            }}
                          >
                            {deletingId === ad.id ? "..." : "Delete"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Footer ─── */}
      <footer className="text-center py-6 mt-4" style={{ borderTop: "2px solid #C9B29F" }}>
        <div className="flex items-center justify-center gap-2 mb-2">
          <img src={LOGO} alt="Logo" className="w-12" style={{ height: "auto" }} />
          <span
            style={{
              fontFamily: "var(--font-table)",
              fontWeight: 700,
              fontSize: "12px",
              color: "#1C1C1C",
              
              
            }}
          >
            Pedigree Platform
          </span>
        </div>
        <div className="flex items-center justify-center gap-4">
          <Link href="/marketplace" className="text-[10px] hover:underline" style={{ color: "#1C1C1C" }}>Marketplace</Link>
          <Link href="/dashboard/my-ads" className="text-[10px] hover:underline" style={{ color: "#1C1C1C" }}>My Ads</Link>
          <Link href="/privacy" className="text-[10px] hover:underline" style={{ color: "#6B7280" }}>Privacy</Link>
          <Link href="/terms" className="text-[10px] hover:underline" style={{ color: "#6B7280" }}>Terms</Link>
        </div>
      </footer>
    </div>
  );
}
