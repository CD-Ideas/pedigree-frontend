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
  is_verified: boolean;
  created_at: string;
  expires_at: string;
  user_id: number;
  dog_id: number | null;
  contact_phone: string | null;
  contact_email: string | null;
  contact_venmo: string | null;
  contact_paypal: string | null;
}

/* ─── Constants ─── */
const LOGO = "https://i.imgur.com/cAvQemZ.png";

const CATEGORIES: Record<string, { label: string; icon: string; color: string }> = {
  dogs_for_sale: { label: "Dogs for Sale", icon: "\uD83D\uDC15", color: "#ef4444" },
  stud_service: { label: "Stud Service", icon: "\uD83D\uDC8E", color: "#8b5cf6" },
  litters_for_sale: { label: "Litters for Sale", icon: "\uD83C\uDF7C", color: "#f472b6" },
  supplies_gear: { label: "Supplies & Gear", icon: "\uD83C\uDF92", color: "#22c55e" },
  courier_services: { label: "Courier Services", icon: "\uD83D\uDE9A", color: "#60a5fa" },
  puppies_wanted: { label: "Puppies Wanted", icon: "\uD83D\uDCE2", color: "#e8c86e" },
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-deep, #0b1120)" }}>
        <div className="flex items-center gap-3" style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}>
          <div
            className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: "#e8c86e", borderTopColor: "transparent" }}
          />
          Loading ad...
        </div>
      </div>
    );
  }

  if (error || !ad) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "var(--bg-deep, #0b1120)" }}>
        <div className="text-5xl opacity-30">{"\uD83D\uDEAB"}</div>
        <h2
          className="text-lg font-bold"
          style={{ color: "var(--text-primary, #e2e8f0)", fontFamily: "var(--font-table)" }}
        >
          {error || "Ad not found"}
        </h2>
        <Link
          href="/marketplace"
          className="px-5 py-2 rounded-lg text-xs font-bold transition-all hover:scale-105"
          style={{
            background: "linear-gradient(135deg, #e8c86e, #b8860b)",
            color: "#000",
            fontFamily: "var(--font-table)",
          }}
        >
          Back to Marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-deep, #0b1120)" }}>
      <div className="max-w-[1000px] mx-auto px-4 md:px-6 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-4">
          <Link
            href="/"
            className="text-[10px] font-medium hover:underline"
            style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}
          >
            Home
          </Link>
          <span style={{ color: "#5a6a82", fontSize: "10px" }}>/</span>
          <Link
            href="/marketplace"
            className="text-[10px] font-medium hover:underline"
            style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}
          >
            Marketplace
          </Link>
          <span style={{ color: "#5a6a82", fontSize: "10px" }}>/</span>
          <span className="text-[10px] font-medium" style={{ color: "#e8c86e", fontFamily: "var(--font-table)" }}>
            {ad.title}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* ─── Left Column: Photos ─── */}
          <div className="lg:col-span-3 space-y-3">
            {/* Main Photo */}
            <div
              className="relative rounded-xl overflow-hidden"
              style={{
                background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)",
                border: "1.5px solid rgba(30,64,120,0.3)",
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
                className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg backdrop-blur-md"
                style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(212,168,85,0.2)" }}
              >
                <img src={LOGO} alt="" className="w-4 h-4 rounded" />
                <span
                  className="text-[9px] font-bold"
                  style={{
                    background: "linear-gradient(135deg, #e8c86e, #d4a855)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
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
                          ? "2px solid #e8c86e"
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
                background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)",
                border: "1.5px solid rgba(30,64,120,0.3)",
                backdropFilter: "blur(12px)",
              }}
            >
              <h3
                className="text-xs font-bold uppercase tracking-widest mb-3"
                style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}
              >
                Description
              </h3>
              <p
                className="text-sm leading-relaxed whitespace-pre-wrap"
                style={{ color: "var(--text-primary, #e2e8f0)", fontFamily: "var(--font-table)" }}
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
                  background: "linear-gradient(135deg, rgba(212,168,85,0.08), rgba(212,168,85,0.02))",
                  border: "1.5px solid rgba(212,168,85,0.25)",
                }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(212,168,85,0.15)" }}
                >
                  <span className="text-lg">{"\uD83D\uDCDC"}</span>
                </div>
                <div>
                  <div className="text-xs font-bold" style={{ color: "#e8c86e", fontFamily: "var(--font-table)" }}>
                    View Pedigree
                  </div>
                  <div className="text-[10px]" style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}>
                    This ad is linked to a registered pedigree
                  </div>
                </div>
                <span className="ml-auto text-sm" style={{ color: "#e8c86e" }}>
                  {"\u2192"}
                </span>
              </Link>
            )}
          </div>

          {/* ─── Right Column: Details ─── */}
          <div className="lg:col-span-2 space-y-4">
            {/* Title & Price Card */}
            <div
              className="rounded-xl p-5"
              style={{
                background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)",
                border: "1.5px solid rgba(30,64,120,0.3)",
                backdropFilter: "blur(12px)",
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
                  background: "linear-gradient(135deg, #e8c86e, #d4a855)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {ad.title}
              </h1>

              {/* Verified badge */}
              {ad.is_verified && (
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
                  color: ad.price !== null && ad.price !== undefined ? "#22c55e" : "#5a6a82",
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
                  <div className="text-[10px] uppercase tracking-wider" style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}>
                    Location
                  </div>
                  <div className="text-xs font-bold" style={{ color: "var(--text-primary, #e2e8f0)", fontFamily: "var(--font-table)" }}>
                    {ad.location || "Not specified"}
                  </div>
                </div>
              </div>

              {/* Dates & Expiry Countdown */}
              <div className="flex flex-wrap gap-4 pt-3" style={{ borderTop: "1px solid rgba(30,64,120,0.3)" }}>
                <div>
                  <div className="text-[9px] uppercase tracking-wider" style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}>
                    Posted
                  </div>
                  <div className="text-[11px] font-medium" style={{ color: "var(--text-primary, #e2e8f0)", fontFamily: "var(--font-mono)" }}>
                    {formatDate(ad.created_at)}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-wider" style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}>
                    Expires
                  </div>
                  <div className="text-[11px] font-medium" style={{ color: "var(--text-primary, #e2e8f0)", fontFamily: "var(--font-mono)" }}>
                    {formatDate(ad.expires_at)}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-wider" style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}>
                    Views
                  </div>
                  <div className="text-[11px] font-bold" style={{ color: "#e8c86e", fontFamily: "var(--font-mono)" }}>
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
                  background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)",
                  border: "1.5px solid rgba(212,168,85,0.25)",
                  backdropFilter: "blur(12px)",
                }}
              >
                <h3
                  className="text-xs font-bold uppercase tracking-widest mb-3"
                  style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}
                >
                  Manage Your Ad
                </h3>
                <div className="flex gap-2">
                  <Link
                    href={`/marketplace/${ad.id}/edit`}
                    className="flex-1 text-center rounded-lg px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all hover:scale-[1.02]"
                    style={{
                      background: "linear-gradient(135deg, #e8c86e, #b8860b)",
                      color: "#000",
                      fontFamily: "var(--font-table)",
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
                            background: "rgba(148,163,184,0.1)",
                            color: "#94a3b8",
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

            {/* Contact Info Card */}
            {(ad.contact_phone || ad.contact_email || ad.contact_venmo || ad.contact_paypal) && (
              <div
                className="rounded-xl p-5"
                style={{
                  background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)",
                  border: "1.5px solid rgba(30,64,120,0.3)",
                  backdropFilter: "blur(12px)",
                }}
              >
                <h3
                  className="text-xs font-bold uppercase tracking-widest mb-3"
                  style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}
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
                        <div className="text-[9px] uppercase tracking-wider" style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}>
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
                        <div className="text-[9px] uppercase tracking-wider" style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}>
                          Email
                        </div>
                        <a
                          href={`mailto:${ad.contact_email}`}
                          className="text-xs font-bold hover:underline"
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
                        <div className="text-[9px] uppercase tracking-wider" style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}>
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
                        <div className="text-[9px] uppercase tracking-wider" style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}>
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
                    background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)",
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
                          background: "rgba(30,64,120,0.15)",
                          border: "1px solid rgba(30,64,120,0.3)",
                          color: "var(--text-primary, #e2e8f0)",
                          fontFamily: "var(--font-table)",
                        }}
                      />
                      <div className="flex gap-2">
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
                          className="px-4 py-1.5 rounded-lg text-[11px] font-medium transition-all hover:scale-105"
                          style={{
                            background: "rgba(148,163,184,0.1)",
                            color: "#94a3b8",
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
      <footer className="text-center py-6 mt-8" style={{ borderTop: "1px solid var(--border, rgba(30,64,120,0.3))" }}>
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
          <Link href="/" className="text-[10px] hover:underline" style={{ color: "#5a6a82" }}>Home</Link>
          <Link href="/marketplace" className="text-[10px] hover:underline" style={{ color: "#e8c86e" }}>Marketplace</Link>
          <Link href="/privacy" className="text-[10px] hover:underline" style={{ color: "#5a6a82" }}>Privacy</Link>
          <Link href="/terms" className="text-[10px] hover:underline" style={{ color: "#5a6a82" }}>Terms</Link>
        </div>
      </footer>
    </div>
  );
}
