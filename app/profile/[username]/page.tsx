"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

const steelFrame = {
  border: "1.5px solid rgba(255,255,255,0.06)",
  boxShadow:
    "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)",
  background:
    "linear-gradient(180deg, rgba(30,30,30,0.85) 0%, rgba(22,22,22,0.9) 100%)",
  backdropFilter: "blur(16px)",
};

interface ProfileUser {
  id: number;
  username: string;
  profile_picture: string | null;
  role: string;
  created_at: string;
  last_active: string | null;
}

interface Pedigree {
  id: number;
  name: string;
  created_at: string;
}

interface Ad {
  id: number;
  title: string;
  description: string;
  price: number | null;
  photos: string | null;
  created_at: string;
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return `${Math.floor(diffMonths / 12)}y ago`;
}

function isOnline(lastActive: string | null): boolean {
  if (!lastActive) return false;
  const now = new Date();
  const then = new Date(lastActive);
  return now.getTime() - then.getTime() < 5 * 60 * 1000;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [pedigrees, setPedigrees] = useState<Pedigree[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [profileUserId, setProfileUserId] = useState<number | null>(null);

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "null");
      if (u?.username) setCurrentUsername(u.username);
      if (u?.id) setCurrentUserId(u.id);
    } catch {}
  }, []);

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    setError(null);
    fetch(`/api/profile/${encodeURIComponent(username)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setUser(data.user);
          setPedigrees(data.pedigrees || []);
          setAds(data.ads || []);
          // Check if this user is blocked
          if (data.user?.id) {
            fetch(`/api/users/block?user_id=${data.user.id}`)
              .then(r => r.json())
              .then(d => { if (typeof d.blocked === "boolean") setIsBlocked(d.blocked); })
              .catch(() => {});
          }
        }
      })
      .catch(() => setError("Failed to load profile"))
      .finally(() => setLoading(false));
  }, [username]);

  const toggleBlock = async () => {
    if (!user?.id || blockLoading) return;
    setBlockLoading(true);
    try {
      if (isBlocked) {
        await fetch(`/api/users/block?blocked_id=${user.id}`, { method: "DELETE" });
        setIsBlocked(false);
      } else {
        await fetch("/api/users/block", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ blocked_id: user.id }),
        });
        setIsBlocked(true);
      }
    } catch {}
    setBlockLoading(false);
  };

  const renderAvatar = () => {
    const pp = user?.profile_picture;
    if (pp?.startsWith("emoji:")) {
      return (
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #1a2744, #0e1828)",
            border: "3px solid var(--accent-gold)",
          }}
        >
          <span className="text-3xl">{pp.replace("emoji:", "")}</span>
        </div>
      );
    }
    if (pp) {
      return (
        <img
          src={pp}
          alt={user?.username || ""}
          className="rounded-2xl object-cover"
          style={{
            border: "3px solid var(--accent-gold)",
            width: "120px",
            height: "90px",
          }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      );
    }
    return (
      <div
        className="w-24 h-24 rounded-full flex items-center justify-center font-bold"
        style={{
          background: "linear-gradient(135deg, var(--accent-gold), #b8860b)",
          color: "#fff",
          textShadow: "0 1px 2px rgba(0,0,0,0.3)",
          border: "3px solid var(--accent-gold)",
        }}
      >
        <span className="text-3xl">
          {(user?.username || "U")[0].toUpperCase()}
        </span>
      </div>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <span className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" style={{ color: "var(--accent-gold)" }} />
          <span
            className="text-xs"
            style={{
              color: "var(--text-muted)",
              fontFamily: "var(--font-table)",
            }}
          >
            Loading profile...
          </span>
        </div>
      </div>
    );
  }

  // Error / not found
  if (error || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="rounded-xl p-8 text-center" style={steelFrame}>
          <span className="text-4xl block mb-4">👤</span>
          <h2
            className="text-lg font-bold mb-2"
            style={{
              color: "var(--text-primary)",
              fontFamily: "var(--font-table)",
            }}
          >
            User not found
          </h2>
          <p
            className="text-xs mb-4"
            style={{
              color: "var(--text-muted)",
              fontFamily: "var(--font-table)",
            }}
          >
            The user &quot;{username}&quot; does not exist or has been removed.
          </p>
          <Link
            href="/dashboard"
            className="text-xs font-medium px-4 py-2 rounded-lg inline-block transition-colors hover:opacity-80"
            style={{
              background: "rgba(212,168,85,0.15)",
              color: "#d4a855",
              border: "1px solid rgba(212,168,85,0.3)",
              fontFamily: "var(--font-table)",
            }}
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const online = isOnline(user.last_active);

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
      {/* Profile Header */}
      <div className="rounded-xl p-6" style={steelFrame}>
        <div className="flex items-start gap-5">
          <div className="cursor-pointer transition-transform hover:scale-105" onClick={() => { if (user?.profile_picture && !user.profile_picture.startsWith("emoji:")) setShowPhotoModal(true); }}>
            {renderAvatar()}
          </div>
          <div className="flex-1 min-w-0">
            {/* Username + Role + Message */}
            <div className="flex items-center gap-3 flex-wrap">
              <h1
                className="text-xl font-bold"
                style={{
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-table)",
                }}
              >
                {user.username}
              </h1>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{
                  background: "rgba(212,168,85,0.1)",
                  color: "var(--accent-gold)",
                  border: "1px solid rgba(212,168,85,0.2)",
                  fontFamily: "var(--font-table)",
                }}
              >
                {user.role || "Member"}
              </span>
              {currentUsername && currentUsername !== user.username && (
                <>
                  <button
                    onClick={() => router.push(`/messages?to=${encodeURIComponent(user.username)}`)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-semibold transition-all hover:scale-105"
                    style={{
                      background: "rgba(212,168,85,0.12)",
                      border: "1px solid rgba(212,168,85,0.25)",
                      color: "var(--accent-gold)",
                      fontFamily: "var(--font-table)",
                    }}
                    title={`Message ${user.username}`}
                  >
                    <span>💬</span> Message
                  </button>
                  <button
                    onClick={toggleBlock}
                    disabled={blockLoading}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-semibold transition-all hover:scale-105"
                    style={{
                      background: isBlocked ? "rgba(239,68,68,0.12)" : "rgba(107,114,128,0.12)",
                      border: `1px solid ${isBlocked ? "rgba(239,68,68,0.3)" : "rgba(107,114,128,0.25)"}`,
                      color: isBlocked ? "#ef4444" : "#6b7280",
                      fontFamily: "var(--font-table)",
                      opacity: blockLoading ? 0.5 : 1,
                    }}
                    title={isBlocked ? `Unblock ${user.username}` : `Block ${user.username}`}
                  >
                    <span>{isBlocked ? "🚫" : "🛑"}</span> {isBlocked ? "Unblock" : "Block"}
                  </button>
                </>
              )}
            </div>

            {/* Online Status */}
            <div className="flex items-center gap-1.5 mt-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  background: online ? "#22c55e" : "#6b7280",
                  boxShadow: online ? "0 0 6px #22c55e" : "none",
                }}
              />
              <span
                className="text-xs"
                style={{
                  color: online ? "#22c55e" : "var(--text-muted)",
                  fontFamily: "var(--font-table)",
                }}
              >
                {online
                  ? "Online"
                  : user.last_active
                  ? `Last seen ${timeAgo(user.last_active)}`
                  : "Offline"}
              </span>
            </div>

            {/* Member Since */}
            {user.created_at && (
              <p
                className="text-[11px] mt-2"
                style={{
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-table)",
                }}
              >
                Member since {formatDate(user.created_at)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Published Pedigrees */}
      <div className="rounded-xl p-5" style={steelFrame}>
        <h2
          className="text-[10px] uppercase tracking-widest font-bold mb-4 flex items-center gap-2"
          style={{
            color: "var(--accent-gold)",
            fontFamily: "var(--font-table)",
            textShadow: "0 0 12px rgba(212,168,85,0.3)",
          }}
        >
          <span
            style={{
              width: 16,
              height: 2,
              background:
                "linear-gradient(90deg, var(--accent-gold), transparent)",
              borderRadius: 1,
            }}
          />
          Published Pedigrees
        </h2>

        {pedigrees.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <span className="text-2xl mb-2">🧬</span>
            <p
              className="text-xs"
              style={{
                color: "var(--text-muted)",
                fontFamily: "var(--font-table)",
              }}
            >
              No published pedigrees yet
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {pedigrees.map((ped) => (
              <Link
                key={ped.id}
                href={`/pedigree/custom/${ped.id}`}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg transition-all hover:bg-white/5 group"
                style={{ fontFamily: "var(--font-table)" }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-base w-6 text-center">🧬</span>
                  <span
                    className="text-sm font-medium truncate transition-colors group-hover:text-[#d4a855]"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {ped.name}
                  </span>
                </div>
                <span
                  className="text-[10px] flex-shrink-0 ml-3"
                  style={{ color: "var(--text-muted)" }}
                >
                  {formatDate(ped.created_at)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Marketplace Ads */}
      <div className="rounded-xl p-5" style={steelFrame}>
        <h2
          className="text-[10px] uppercase tracking-widest font-bold mb-4 flex items-center gap-2"
          style={{
            color: "var(--accent-gold)",
            fontFamily: "var(--font-table)",
            textShadow: "0 0 12px rgba(212,168,85,0.3)",
          }}
        >
          <span
            style={{
              width: 16,
              height: 2,
              background:
                "linear-gradient(90deg, var(--accent-gold), transparent)",
              borderRadius: 1,
            }}
          />
          Marketplace Listings
        </h2>

        {ads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <span className="text-2xl mb-2">🏪</span>
            <p
              className="text-xs"
              style={{
                color: "var(--text-muted)",
                fontFamily: "var(--font-table)",
              }}
            >
              No active listings
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {ads.map((ad) => (
              <Link
                key={ad.id}
                href={`/marketplace/${ad.id}`}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg transition-all hover:bg-white/5 group"
                style={{ fontFamily: "var(--font-table)" }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-base w-6 text-center">🏷️</span>
                  <div className="min-w-0">
                    <span
                      className="text-sm font-medium truncate block transition-colors group-hover:text-[#d4a855]"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {ad.title}
                    </span>
                    {ad.price != null && (
                      <span
                        className="text-[10px] font-bold"
                        style={{ color: "#22c55e" }}
                      >
                        ${Number(ad.price).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
                <span
                  className="text-[10px] flex-shrink-0 ml-3"
                  style={{ color: "var(--text-muted)" }}
                >
                  {formatDate(ad.created_at)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Photo Preview Modal */}
      {showPhotoModal && user?.profile_picture && !user.profile_picture.startsWith("emoji:") && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
          onClick={() => setShowPhotoModal(false)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img
              src={user.profile_picture}
              alt={user.username}
              className="rounded-xl"
              style={{
                maxWidth: "90vw",
                maxHeight: "85vh",
                objectFit: "contain",
                border: "2px solid rgba(212,168,85,0.3)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
              }}
            />
            <button
              onClick={() => setShowPhotoModal(false)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all hover:scale-110"
              style={{
                background: "rgba(30,30,30,0.9)",
                color: "#fff",
                border: "1px solid rgba(212,168,85,0.3)",
              }}
            >
              ✕
            </button>
            <p className="text-center mt-3 text-sm font-medium" style={{ color: "var(--accent-gold)", fontFamily: "var(--font-table)" }}>
              {user.username}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
