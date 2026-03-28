"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
  is_verified: number;
  is_paid: number;
  verification_requested: number;
  created_at: string;
  expires_at: string;
  user_id: number;
  dog_id: number | null;
  contact_phone: string | null;
  contact_email: string | null;
  contact_venmo: string | null;
  contact_paypal: string | null;
  username: string | null;
}

/* ─── Constants ─── */
const LOGO = "https://i.imgur.com/cAvQemZ.png";

const CATEGORIES: Record<string, { label: string; icon: string; color: string }> = {
  dogs_for_sale: { label: "Dogs for Sale", icon: "\uD83D\uDC15", color: "#ef4444" },
  stud_service: { label: "Stud Service", icon: "\uD83D\uDC8E", color: "#8b5cf6" },
  litters_for_sale: { label: "Litters for Sale", icon: "\uD83C\uDF7C", color: "#f472b6" },
  supplies_gear: { label: "Supplies & Gear", icon: "\uD83C\uDF92", color: "#22c55e" },
  courier_services: { label: "Courier Services", icon: "\uD83D\uDE9A", color: "#60a5fa" },
  puppies_wanted: { label: "Puppies Wanted", icon: "\uD83D\uDCE2", color: "#1C1C1C" },
};

/* ─── Helpers ─── */
function formatDate(iso: string): string {
  if (!iso) return "\u2014";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatPrice(price: number | null): string {
  if (price === null || price === undefined) return "Contact for Price";
  return `$${price.toLocaleString()}`;
}

function getDaysUntilExpiry(expiresAt: string): number {
  if (!expiresAt) return 0;
  const now = new Date();
  const expires = new Date(expiresAt);
  const diffMs = expires.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/* ─── Main Ad Detail Page ─── */
export default function MarketplaceAdPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  const [ad, setAd] = useState<MarketplaceAd | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSent, setReportSent] = useState(false);

  // Owner state
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [verifyRequesting, setVerifyRequesting] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Get current user from localStorage
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const u = JSON.parse(userStr);
        if (u && u.id) setCurrentUserId(u.id);
      }
    } catch {
      // Not logged in
    }
  }, []);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/marketplace/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Ad not found");
        return r.json();
      })
      .then((data) => {
        setAd(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load ad");
        setLoading(false);
      });
  }, [id]);

  const cat = ad ? CATEGORIES[ad.category] : null;
  const photos = ad?.photos || [];
  const isOwner = ad && currentUserId !== null && currentUserId === ad.user_id;
  const daysUntilExpiry = ad ? getDaysUntilExpiry(ad.expires_at) : 0;

  const handleReport = () => {
    if (!reportReason.trim()) return;
    setReportSent(true);
    setTimeout(() => setShowReport(false), 2000);
  };

  const handleDelete = async () => {
    if (!ad || !currentUserId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/marketplace/${ad.id}?userId=${currentUserId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete ad");
      }
      router.push("/marketplace");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete";
      alert(message);
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#FAFAFA" }}>
        <div className="flex items-center gap-3" style={{ color: "#6B7280", fontFamily: "var(--font-table)" }}>
          <div
            className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: "#C9B29F", borderTopColor: "transparent" }}
          />
          Loading ad...
        </div>
      </div>
    );
  }

  if (error || !ad) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "#FAFAFA" }}>
        <div className="text-5xl opacity-30">{"\uD83D\uDEAB"}</div>
        <h2
          className="text-lg font-bold"
          style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}
        >
          {error || "Ad not found"}
        </h2>
        <Link
          href="/marketplace"
          className="px-5 py-2 rounded-lg text-xs font-bold transition-all hover:scale-105"
          style={{
            background: "#1C1C1C",
            color: "#FAF7F2",
            fontFamily: "var(--font-table)",
          }}
        >
          Back to Marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#FAFAFA" }}>
      <div className="max-w-[1000px] mx-auto px-4 md:px-6 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-4">
          <Link
            href="/"
            className="text-[10px] font-medium hover:underline"
            style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}
          >
            Home
          </Link>
          <span style={{ color: "#6B7280", fontSize: "10px" }}>/</span>
          <Link
            href="/marketplace"
            className="text-[10px] font-medium hover:underline"
            style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}
          >
            Marketplace
          </Link>
          <span style={{ color: "#6B7280", fontSize: "10px" }}>/</span>
          <span className="text-[10px] font-medium" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>
            {ad.title}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* ─── Left Column: Photos ─── */}
          <div className="md:col-span-3 space-y-3">
            {/* Main Photo */}
            <div
              className="relative rounded-xl overflow-hidden"
              style={{
                background: "#FAF7F2",
                border: "2px solid #C9B29F",
                aspectRatio: "4/3",
              }}
            >
              {photos.length > 0 ? (
                <img
                  src={photos[selectedPhoto]}
                  alt={ad.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-7xl opacity-20">{cat?.icon || "\uD83D\uDC15"}</span>
                </div>
              )}

              {/* Watermark */}
              <div
                className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg "
                style={{ background: "rgba(250,247,242,0.9)", border: "2px solid #C9B29F" }}
              >
                <img src={LOGO} alt="" className="w-4 h-4 rounded" />
                <span
                  className="text-[9px] font-bold"
                  style={{
                    background: "#1C1C1C",
                    
                    
                    fontFamily: "var(--font-table)",
                  }}
                >
                  Pedigree Platform
                </span>
              </div>
            </div>

            {/* Thumbnails */}
            {photos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {photos.map((photo, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedPhoto(i)}
                    className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden transition-all duration-200 hover:scale-105"
                    style={{
                      border:
                        selectedPhoto === i
                          ? "2px solid #C9B29F"
                          : "2px solid rgba(30,64,120,0.3)",
                      opacity: selectedPhoto === i ? 1 : 0.6,
                    }}
                  >
                    <img src={photo} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Description */}
            <div
              className="rounded-xl p-5"
              style={{
                background: "#FAF7F2",
                border: "2px solid #C9B29F",
                
              }}
            >
              <h3
                className="text-xs font-bold uppercase tracking-widest mb-3"
                style={{ color: "#6B7280", fontFamily: "var(--font-table)" }}
              >
                Description
              </h3>
              <p
                className="text-sm leading-relaxed whitespace-pre-wrap"
                style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}
              >
                {ad.description}
              </p>
            </div>

            {/* Pedigree Link */}
            {ad.dog_id && (
              <Link
                href={`/pedigree/${ad.dog_id}`}
                className="flex items-center gap-3 rounded-xl p-4 transition-all duration-300 hover:scale-[1.02]"
                style={{
                  background: "rgba(201,178,159,0.06)",
                  border: "1.5px solid rgba(212,168,85,0.25)",
                }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(201,178,159,0.15)" }}
                >
                  <span className="text-lg">{"\uD83D\uDCDC"}</span>
                </div>
                <div>
                  <div className="text-xs font-bold" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>
                    View Pedigree
                  </div>
                  <div className="text-[10px]" style={{ color: "#6B7280", fontFamily: "var(--font-table)" }}>
                    This ad is linked to a registered pedigree
                  </div>
                </div>
                <span className="ml-auto text-sm" style={{ color: "#1C1C1C" }}>
                  {"\u2192"}
                </span>
              </Link>
            )}

            {/* Share Toolbar */}
            <div
              className="rounded-xl p-5 mt-4"
              style={{
                background: "#FAF7F2",
                border: "2px solid #C9B29F",
                
              }}
            >
              <h3
                className="text-xs font-bold uppercase tracking-widest mb-3"
                style={{ color: "#6B7280", fontFamily: "var(--font-table)" }}
              >
                Share This Listing
              </h3>
              <div className="flex gap-2">
                {/* Copy Link */}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`https://pedigreeplatform.com/marketplace/${ad.id}`);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold transition-all hover:scale-[1.02]"
                  style={{
                    background: copied ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.04)",
                    border: copied ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(255,255,255,0.08)",
                    color: copied ? "#22c55e" : "#94a3b8",
                    fontFamily: "var(--font-table)",
                  }}
                >
                  {copied ? "\u2714" : "\uD83D\uDD17"} {copied ? "Copied!" : "Copy Link"}
                </button>

                {/* WhatsApp */}
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`${ad.title}${ad.price ? ` - $${ad.price}` : ""} | Pedigree Platform\nhttps://pedigreeplatform.com/marketplace/${ad.id}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold transition-all hover:scale-[1.02]"
                  style={{
                    background: "rgba(37,211,102,0.08)",
                    border: "1px solid rgba(37,211,102,0.2)",
                    color: "#25d366",
                    fontFamily: "var(--font-table)",
                  }}
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="#25d366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.3 0-4.438-.766-6.149-2.056l-.432-.336-3.2 1.073 1.073-3.2-.336-.432A9.953 9.953 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/></svg>
                  WhatsApp
                </a>

                {/* Telegram */}
                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent(`https://pedigreeplatform.com/marketplace/${ad.id}`)}&text=${encodeURIComponent(`${ad.title}${ad.price ? ` - $${ad.price}` : ""} | Pedigree Platform`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold transition-all hover:scale-[1.02]"
                  style={{
                    background: "rgba(0,136,204,0.08)",
                    border: "1px solid rgba(0,136,204,0.2)",
                    color: "#0088cc",
                    fontFamily: "var(--font-table)",
                  }}
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="#0088cc"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                  Telegram
                </a>
              </div>
            </div>
          </div>

          {/* ─── Right Column: Details ─── */}
          <div className="md:col-span-2 space-y-4">
            {/* Title & Price Card */}
            <div
              className="rounded-xl p-5"
              style={{
                background: "#FAF7F2",
                border: "2px solid #C9B29F",
                
              }}
            >
              {/* Category badge */}
              {cat && (
                <div
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-3"
                  style={{ background: `${cat.color}18`, border: `1px solid ${cat.color}33` }}
                >
                  <span className="text-xs">{cat.icon}</span>
                  <span
                    className="text-[10px] font-bold uppercase tracking-wide"
                    style={{ color: cat.color, fontFamily: "var(--font-table)" }}
                  >
                    {cat.label}
                  </span>
                </div>
              )}

              {/* Title */}
              <h1
                className="text-xl font-black leading-tight mb-3"
                style={{
                  fontFamily: "var(--font-display, Oswald, sans-serif)",
                  background: "#1C1C1C",
                  
                  
                }}
              >
                {ad.title}
              </h1>

              {/* Verified badge */}
              {!!ad.is_verified && (
                <div
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-3"
                  style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)" }}
                >
                  <span className="text-xs">{"\u2713"}</span>
                  <span
                    className="text-[10px] font-bold"
                    style={{ color: "#22c55e", fontFamily: "var(--font-table)" }}
                  >
                    Verified Listing
                  </span>
                </div>
              )}

              {/* Price */}
              <div
                className="text-2xl font-black mb-4"
                style={{
                  color: ad.price !== null && ad.price !== undefined ? "#C9B29F" : "#5a6a82",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {formatPrice(ad.price)}
              </div>

              {/* Location */}
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(96,165,250,0.1)" }}
                >
                  <span className="text-sm">{"\uD83D\uDCCD"}</span>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider" style={{ color: "#6B7280", fontFamily: "var(--font-table)" }}>
                    Location
                  </div>
                  <div className="text-xs font-bold" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>
                    {ad.location || "Not specified"}
                  </div>
                </div>
              </div>

              {/* Listed By */}
              {ad.username && (
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
                    style={{ background: "rgba(201,178,159,0.15)", color: "#1C1C1C", fontFamily: "var(--font-table)" }}
                  >
                    {ad.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] uppercase tracking-wider" style={{ color: "#6B7280", fontFamily: "var(--font-table)" }}>
                      Listed By
                    </div>
                    <div className="text-xs font-bold" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>
                      {ad.username}
                    </div>
                  </div>
                  <a href={`/messages?to=${encodeURIComponent(ad.username)}&subject=${encodeURIComponent(`Re: ${ad.title}`)}&adId=${ad.id}`}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all hover:scale-[1.03]"
                    style={{
                      background: "#1C1C1C",
                      color: "#FAF7F2",
                      fontFamily: "var(--font-display)",
                      
                    }}>
                    Message Seller
                  </a>
                </div>
              )}

              {/* Dates & Expiry Countdown */}
              <div className="flex flex-wrap gap-4 pt-3" style={{ borderTop: "2px solid #C9B29F" }}>
                <div>
                  <div className="text-[9px] uppercase tracking-wider" style={{ color: "#6B7280", fontFamily: "var(--font-table)" }}>
                    Posted
                  </div>
                  <div className="text-[11px] font-medium" style={{ color: "#1C1C1C", fontFamily: "var(--font-mono)" }}>
                    {formatDate(ad.created_at)}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-wider" style={{ color: "#6B7280", fontFamily: "var(--font-table)" }}>
                    Expires
                  </div>
                  <div className="text-[11px] font-medium" style={{ color: "#1C1C1C", fontFamily: "var(--font-mono)" }}>
                    {formatDate(ad.expires_at)}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-wider" style={{ color: "#6B7280", fontFamily: "var(--font-table)" }}>
                    Views
                  </div>
                  <div className="text-[11px] font-bold" style={{ color: "#1C1C1C", fontFamily: "var(--font-mono)" }}>
                    {(ad.views || 0).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Expiry countdown */}
              {ad.expires_at && (
                <div
                  className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={{
                    background: daysUntilExpiry <= 7
                      ? "rgba(239,68,68,0.08)"
                      : "rgba(34,197,94,0.08)",
                    border: daysUntilExpiry <= 7
                      ? "1px solid rgba(239,68,68,0.25)"
                      : "1px solid rgba(34,197,94,0.25)",
                  }}
                >
                  <span className="text-xs">
                    {daysUntilExpiry <= 7 ? "\u26A0" : "\u23F0"}
                  </span>
                  <span
                    className="text-[11px] font-bold"
                    style={{
                      color: daysUntilExpiry <= 0
                        ? "#ef4444"
                        : daysUntilExpiry <= 7
                          ? "#f59e0b"
                          : "#22c55e",
                      fontFamily: "var(--font-table)",
                    }}
                  >
                    {daysUntilExpiry <= 0
                      ? "This listing has expired"
                      : `Expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? "" : "s"}`}
                  </span>
                </div>
              )}
            </div>

            {/* ─── Owner Actions (Edit / Delete) ─── */}
            {isOwner && (
              <div
                className="rounded-xl p-4"
                style={{
                  background: "#FAF7F2",
                  border: "1.5px solid rgba(212,168,85,0.25)",
                  
                }}
              >
                <h3
                  className="text-xs font-bold uppercase tracking-widest mb-3"
                  style={{ color: "#6B7280", fontFamily: "var(--font-table)" }}
                >
                  Manage Your Ad
                </h3>
                <div className="flex gap-2">
                  <Link
                    href={`/marketplace/${ad.id}/edit`}
                    className="flex-1 flex items-center justify-center rounded-lg px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all hover:scale-[1.02]"
                    style={{
                      background: "#1C1C1C",
                      color: "#FAF7F2",
                      fontFamily: "var(--font-table)",
                      textAlign: "center",
                    }}
                  >
                    Edit Ad
                  </Link>
                  {!showDeleteConfirm ? (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="flex-1 rounded-lg px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all hover:scale-[1.02]"
                      style={{
                        background: "rgba(239,68,68,0.15)",
                        color: "#ef4444",
                        border: "1.5px solid rgba(239,68,68,0.3)",
                        fontFamily: "var(--font-table)",
                      }}
                    >
                      Delete Ad
                    </button>
                  ) : (
                    <div className="flex-1 flex flex-col gap-2">
                      <span
                        className="text-[11px] font-bold text-center"
                        style={{ color: "#ef4444", fontFamily: "var(--font-table)" }}
                      >
                        Are you sure?
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          onClick={handleDelete}
                          disabled={deleting}
                          className="flex-1 rounded-lg px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all hover:scale-105 disabled:opacity-50"
                          style={{
                            background: "#ef4444",
                            color: "#fff",
                            fontFamily: "var(--font-table)",
                          }}
                        >
                          {deleting ? "Deleting..." : "Yes, Delete"}
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(false)}
                          className="flex-1 rounded-lg px-2 py-1.5 text-[10px] font-medium transition-all hover:scale-105"
                          style={{
                            background: "#C9B29F",
                            color: "#FAF7F2",
                            fontFamily: "var(--font-table)",
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Verification Section */}
            {isOwner && !ad.is_verified && (
              <div
                className="rounded-xl p-5"
                style={{
                  background: "#FAF7F2",
                  border: ad.verification_requested
                    ? "1.5px solid rgba(234,179,8,0.3)"
                    : "1.5px solid rgba(30,64,120,0.3)",
                  
                }}
              >
                <h3
                  className="text-xs font-bold uppercase tracking-widest mb-2"
                  style={{ color: "#6B7280", fontFamily: "var(--font-table)" }}
                >
                  Verification
                </h3>
                {!!ad.verification_requested ? (
                  <div className="flex items-center gap-2">
                    <span className="text-lg">⏳</span>
                    <div>
                      <p className="text-xs font-bold" style={{ color: "#eab308", fontFamily: "var(--font-table)" }}>
                        Verification Pending
                      </p>
                      <p className="text-[10px]" style={{ color: "#6B7280" }}>
                        Our team is reviewing your listing. You&apos;ll receive an email when verified.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-[10px] mb-3" style={{ color: "#6B7280" }}>
                      Get a verified badge to build trust with buyers. Our team will review your listing.
                    </p>
                    <button
                      onClick={async () => {
                        setVerifyRequesting(true);
                        setVerifyMsg("");
                        try {
                          const res = await fetch(`/api/marketplace/${ad.id}/request-verify`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ userId: currentUserId }),
                          });
                          const data = await res.json();
                          if (data.success) {
                            setVerifyMsg("Verification requested!");
                            setAd({ ...ad, verification_requested: 1 });
                          } else {
                            setVerifyMsg(data.error || "Failed");
                          }
                        } catch {
                          setVerifyMsg("Failed to request");
                        }
                        setVerifyRequesting(false);
                      }}
                      disabled={verifyRequesting}
                      className="w-full rounded-lg px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all hover:scale-[1.02] disabled:opacity-50"
                      style={{
                        background: "rgba(34,197,94,0.12)",
                        color: "#22c55e",
                        border: "1.5px solid rgba(34,197,94,0.3)",
                        fontFamily: "var(--font-table)",
                      }}
                    >
                      {verifyRequesting ? "Requesting..." : "🛡 Request Free Verification"}
                    </button>
                    {verifyMsg && (
                      <p className="text-[10px] text-center mt-2" style={{ color: verifyMsg.includes("!") ? "#22c55e" : "#ef4444" }}>
                        {verifyMsg}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Contact Info Card */}
            {(ad.contact_phone || ad.contact_email || ad.contact_venmo || ad.contact_paypal) && (
              <div
                className="rounded-xl p-5"
                style={{
                  background: "#FAF7F2",
                  border: "2px solid #C9B29F",
                  
                }}
              >
                <h3
                  className="text-xs font-bold uppercase tracking-widest mb-3"
                  style={{ color: "#6B7280", fontFamily: "var(--font-table)" }}
                >
                  Contact Information
                </h3>
                <div className="space-y-3">
                  {ad.contact_phone && (
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: "rgba(34,197,94,0.1)" }}
                      >
                        <span className="text-sm">{"\uD83D\uDCDE"}</span>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase tracking-wider" style={{ color: "#6B7280", fontFamily: "var(--font-table)" }}>
                          Phone
                        </div>
                        <div className="text-xs font-bold" style={{ color: "#22c55e", fontFamily: "var(--font-mono)" }}>
                          {ad.contact_phone}
                        </div>
                      </div>
                    </div>
                  )}

                  {ad.contact_email && (
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: "rgba(96,165,250,0.1)" }}
                      >
                        <span className="text-sm">{"\u2709\uFE0F"}</span>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase tracking-wider" style={{ color: "#6B7280", fontFamily: "var(--font-table)" }}>
                          Email
                        </div>
                        <a
                          href={`mailto:${ad.contact_email}`}
                          className="text-xs font-bold hover:underline break-all"
                          style={{ color: "#60a5fa", fontFamily: "var(--font-mono)" }}
                        >
                          {ad.contact_email}
                        </a>
                      </div>
                    </div>
                  )}

                  {ad.contact_venmo && (
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: "rgba(139,92,246,0.1)" }}
                      >
                        <span className="text-sm font-bold" style={{ color: "#8b5cf6" }}>V</span>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase tracking-wider" style={{ color: "#6B7280", fontFamily: "var(--font-table)" }}>
                          Venmo
                        </div>
                        <div className="text-xs font-bold" style={{ color: "#8b5cf6", fontFamily: "var(--font-mono)" }}>
                          {ad.contact_venmo}
                        </div>
                      </div>
                    </div>
                  )}

                  {ad.contact_paypal && (
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: "rgba(96,165,250,0.1)" }}
                      >
                        <span className="text-sm font-bold" style={{ color: "#60a5fa" }}>P</span>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase tracking-wider" style={{ color: "#6B7280", fontFamily: "var(--font-table)" }}>
                          PayPal
                        </div>
                        <div className="text-xs font-bold" style={{ color: "#60a5fa", fontFamily: "var(--font-mono)" }}>
                          {ad.contact_paypal}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Report Button */}
            <div>
              {!showReport ? (
                <button
                  onClick={() => setShowReport(true)}
                  className="w-full rounded-xl px-4 py-2.5 text-xs font-medium transition-all hover:scale-[1.02]"
                  style={{
                    background: "rgba(239,68,68,0.06)",
                    border: "1.5px solid rgba(239,68,68,0.2)",
                    color: "#ef4444",
                    fontFamily: "var(--font-table)",
                  }}
                >
                  {"\u26A0"} Report / Flag this Listing
                </button>
              ) : (
                <div
                  className="rounded-xl p-4"
                  style={{
                    background: "#FAF7F2",
                    border: "1.5px solid rgba(239,68,68,0.3)",
                  }}
                >
                  {reportSent ? (
                    <div className="text-center py-2">
                      <span className="text-xs font-bold" style={{ color: "#22c55e", fontFamily: "var(--font-table)" }}>
                        Report submitted. Thank you.
                      </span>
                    </div>
                  ) : (
                    <>
                      <h4 className="text-xs font-bold mb-2" style={{ color: "#ef4444", fontFamily: "var(--font-table)" }}>
                        Report this listing
                      </h4>
                      <textarea
                        value={reportReason}
                        onChange={(e) => setReportReason(e.target.value)}
                        placeholder="Describe the issue..."
                        rows={3}
                        className="w-full rounded-lg px-3 py-2 text-xs outline-none resize-none mb-2"
                        style={{
                          background: "#FAFAFA",
                          border: "2px solid #C9B29F",
                          color: "#1C1C1C",
                          fontFamily: "var(--font-table)",
                        }}
                      />
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={handleReport}
                          className="px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:scale-105"
                          style={{
                            background: "rgba(239,68,68,0.15)",
                            color: "#ef4444",
                            border: "1px solid rgba(239,68,68,0.3)",
                            fontFamily: "var(--font-table)",
                          }}
                        >
                          Submit Report
                        </button>
                        <button
                          onClick={() => {
                            setShowReport(false);
                            setReportReason("");
                          }}
                          className="px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:scale-105"
                          style={{
                            background: "rgba(148,163,184,0.15)",
                            color: "#6B7280",
                            border: "1px solid rgba(148,163,184,0.3)",
                            fontFamily: "var(--font-table)",
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Footer ─── */}
      <footer className="text-center py-6 mt-8" style={{ borderTop: "2px solid #C9B29F" }}>
        <div className="flex items-center justify-center gap-2 mb-2">
          <img src={LOGO} alt="Logo" className="w-5 h-5 rounded" />
          <span
            style={{
              fontFamily: "var(--font-table)",
              fontWeight: 700,
              fontSize: "12px",
              background: "#1C1C1C",
              
              
            }}
          >
            Pedigree Platform
          </span>
        </div>
        <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
          <Link href="/" className="text-[10px] hover:underline" style={{ color: "#6B7280" }}>Home</Link>
          <Link href="/marketplace" className="text-[10px] hover:underline" style={{ color: "#1C1C1C" }}>Marketplace</Link>
          <Link href="/privacy" className="text-[10px] hover:underline" style={{ color: "#6B7280" }}>Privacy</Link>
          <Link href="/terms" className="text-[10px] hover:underline" style={{ color: "#6B7280" }}>Terms</Link>
        </div>
      </footer>
    </div>
  );
}
