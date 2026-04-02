"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

const pgCard = {
  border: "2px solid #C9B29F",
  background: "#FAF7F2",
  borderRadius: "8px",
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
            background: "#FAF7F2",
            border: "2px solid #C9B29F",
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
          className="rounded-lg object-cover"
          style={{
            border: "2px solid #C9B29F",
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
          background: "#C9B29F",
          color: "#1C1C1C",
          border: "2px solid #C9B29F",
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
          <span className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" style={{ color: "#C9B29F" }} />
          <span
            className="text-xs"
            style={{
              color: "#4A4A4A",
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
        <div className="p-8 text-center" style={pgCard}>
          <span className="text-4xl block mb-4">👤</span>
          <h2
            className="text-lg font-bold mb-2"
            style={{
              color: "#1C1C1C",
              fontFamily: "var(--font-table)",
            }}
          >
            User not found
          </h2>
          <p
            className="text-xs mb-4"
            style={{
              color: "#4A4A4A",
              fontFamily: "var(--font-table)",
            }}
          >
            The user &quot;{username}&quot; does not exist or has been removed.
          </p>
          <Link
            href="/dashboard"
            className="text-xs font-medium px-4 py-2 rounded-lg inline-block transition-colors hover:opacity-80"
            style={{
              background: "#FAF7F2",
              color: "#1C1C1C",
              border: "2px solid #C9B29F",
              borderRadius: "8px",
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
    <div className="max-w-3xl mx-auto py-6 px-4 space-y-6" style={{ background: "#EDE4D5", minHeight: "100vh" }}>
      {/* Profile Header */}
      <div className="p-6" style={pgCard}>
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
                  color: "#1C1C1C",
                  fontFamily: "var(--font-table)",
                }}
              >
                {user.username}
              </h1>
              <span
                className="text-[12px] px-2 py-0.5 rounded-full"
                style={{
                  background: "#FAF7F2",
                  color: "#1C1C1C",
                  border: "2px solid #C9B29F",
                  fontFamily: "var(--font-table)",
                }}
              >
                {user.role || "Member"}
              </span>
              {currentUsername && currentUsername !== user.username && (
                <>
                  <button
                    onClick={() => router.push(`/messages?to=${encodeURIComponent(user.username)}`)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[12px] font-semibold transition-all hover:scale-105"
                    style={{
                      background: "#FAF7F2",
                      border: "2px solid #C9B29F",
                      borderRadius: "8px",
                      color: "#1C1C1C",
                      fontFamily: "var(--font-table)",
                    }}
                    title={`Message ${user.username}`}
                  >
                    <span>💬</span> Message
                  </button>
                  <button
                    onClick={toggleBlock}
                    disabled={blockLoading}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[12px] font-semibold transition-all hover:scale-105"
                    style={{
                      background: isBlocked ? "#FEF2F2" : "#FAF7F2",
                      border: `2px solid ${isBlocked ? "#ef4444" : "#C9B29F"}`,
                      borderRadius: "8px",
                      color: isBlocked ? "#ef4444" : "#4A4A4A",
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
                  background: online ? "#22c55e" : "#4A4A4A",
                }}
              />
              <span
                className="text-xs"
                style={{
                  color: online ? "#22c55e" : "#4A4A4A",
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
                className="text-[12px] mt-2"
                style={{
                  color: "#4A4A4A",
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
      <div className="p-5" style={pgCard}>
        <h2
          className="text-[12px] uppercase tracking-widest font-bold mb-4 flex items-center gap-2"
          style={{
            color: "#1C1C1C",
            fontFamily: "var(--font-table)",
          }}
        >
          <span
            style={{
              width: 16,
              height: 2,
              background: "#C9B29F",
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
                color: "#4A4A4A",
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
                className="flex items-center justify-between px-3 py-2.5 rounded-lg transition-all group"
                style={{ fontFamily: "var(--font-table)", borderRadius: "8px" }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-base w-6 text-center">🧬</span>
                  <span
                    className="text-sm font-medium truncate transition-colors"
                    style={{ color: "#1C1C1C" }}
                  >
                    {ped.name}
                  </span>
                </div>
                <span
                  className="text-[12px] flex-shrink-0 ml-3"
                  style={{ color: "#4A4A4A" }}
                >
                  {formatDate(ped.created_at)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Marketplace Ads */}
      <div className="p-5" style={pgCard}>
        <h2
          className="text-[12px] uppercase tracking-widest font-bold mb-4 flex items-center gap-2"
          style={{
            color: "#1C1C1C",
            fontFamily: "var(--font-table)",
          }}
        >
          <span
            style={{
              width: 16,
              height: 2,
              background: "#C9B29F",
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
                color: "#4A4A4A",
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
                className="flex items-center justify-between px-3 py-2.5 rounded-lg transition-all group"
                style={{ fontFamily: "var(--font-table)", borderRadius: "8px" }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-base w-6 text-center">🏷️</span>
                  <div className="min-w-0">
                    <span
                      className="text-sm font-medium truncate block transition-colors"
                      style={{ color: "#1C1C1C" }}
                    >
                      {ad.title}
                    </span>
                    {ad.price != null && (
                      <span
                        className="text-[12px] font-bold"
                        style={{ color: "#22c55e" }}
                      >
                        ${Number(ad.price).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
                <span
                  className="text-[12px] flex-shrink-0 ml-3"
                  style={{ color: "#4A4A4A" }}
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
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => setShowPhotoModal(false)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img
              src={user.profile_picture}
              alt={user.username}
              style={{
                maxWidth: "90vw",
                maxHeight: "85vh",
                objectFit: "contain",
                border: "2px solid #C9B29F",
                borderRadius: "8px",
              }}
            />
            <button
              onClick={() => setShowPhotoModal(false)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all hover:scale-110"
              style={{
                background: "#FAF7F2",
                color: "#1C1C1C",
                border: "2px solid #C9B29F",
              }}
            >
              ✕
            </button>
            <p className="text-center mt-3 text-sm font-medium" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>
              {user.username}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
