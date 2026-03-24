"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getDogColor } from "@/app/utils/colors";

const steelFrame = {
  border: "1.5px solid rgba(255,255,255,0.06)",
  boxShadow: "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)",
  background: "linear-gradient(180deg, rgba(30,30,30,0.85) 0%, rgba(22,22,22,0.9) 100%)",
  backdropFilter: "blur(16px)",
};

interface TitleAlert {
  id: string;
  dog_id?: number;
  pedigree_id?: number;
  dog: string;
  title: string;
  color: "blue" | "red" | "gold";
  photo_url?: string;
  username?: string;
  date_posted?: string;
}

interface UserData {
  id: number;
  username: string;
  email: string;
  role: string;
  profile_picture?: string;
}

const NAV_ITEMS = [
  { icon: "🧬", label: "Bloodline Calculator", href: "/breeding-calculator", desc: "COI & linebreeding analysis", color: "#a78bfa" },
  { icon: "🌍", label: "Community Pedigrees", href: "/community", desc: "Browse all pedigrees", color: "#34d399" },
  { icon: "👑", label: "Dog of the Month", href: "/dog-of-the-month", desc: "Monthly photo contest", color: "#f97316" },
  { icon: "🐕", label: "Dogs", href: "/dogs", desc: "Browse dog database", color: "#f472b6" },
  { icon: "🔦", label: "Lineage Spotlight", href: "/pedigree/spotlight", desc: "Explore lineage trees", color: "#f59e0b" },
  { icon: "🏪", label: "Marketplace", href: "/marketplace", desc: "Buy, sell & advertise", color: "#ef4444" },
  { icon: "📋", label: "My Pedigrees", href: "/dashboard/pedigrees", desc: "Your published pedigrees", color: "#60a5fa" },
  { icon: "🧪", label: "Pedigree Lab", href: "/pedigree-lab", desc: "Create & publish pedigrees", color: "#22c55e" },
  { icon: "🎨", label: "Puppy Color Predictor", href: "/puppy-predictor", desc: "Predict coat colors", color: "#fb923c" },
];

const ALERT_COLORS = {
  blue: { bg: "linear-gradient(135deg, rgba(96,165,250,0.1), rgba(96,165,250,0.03))", border: "rgba(96,165,250,0.35)", text: "#60a5fa", glow: "rgba(96,165,250,0.2)" },
  red: { bg: "linear-gradient(135deg, rgba(239,68,68,0.1), rgba(239,68,68,0.03))", border: "rgba(239,68,68,0.35)", text: "#ef4444", glow: "rgba(239,68,68,0.2)" },
  gold: { bg: "linear-gradient(135deg, rgba(212,168,85,0.1), rgba(212,168,85,0.03))", border: "rgba(212,168,85,0.35)", text: "#d4a855", glow: "rgba(212,168,85,0.2)" },
};

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [alerts, setAlerts] = useState<TitleAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<{ dog_id: number; registered_name: string }[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const AVATAR_OPTIONS = [
    { id: "dog1", emoji: "🐕" }, { id: "dog2", emoji: "🐶" }, { id: "dog3", emoji: "🐾" },
    { id: "wolf", emoji: "🐺" }, { id: "bone", emoji: "🦴" }, { id: "star", emoji: "⭐" },
    { id: "fire", emoji: "🔥" }, { id: "crown", emoji: "👑" }, { id: "trophy", emoji: "🏆" },
    { id: "shield", emoji: "🛡️" }, { id: "diamond", emoji: "💎" }, { id: "bolt", emoji: "⚡" },
  ];

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "null");
      if (u) {
        setUser(u);
        fetch(`/api/messages/unread?userId=${u.id}`)
          .then(r => r.json())
          .then(d => setUnreadMessages(d.unread || 0))
          .catch(() => {});
      }
    } catch (_e) {}

    // Fetch real title alerts
    const dismissed = JSON.parse(localStorage.getItem("dismissed_title_alerts") || "[]");
    fetch("/api/dogs/titled?limit=10")
      .then((r) => r.json())
      .then((data) => {
        const filtered = (data.alerts || []).filter((a: TitleAlert) => !dismissed.includes(a.id));
        setAlerts(filtered);
      })
      .catch(() => {})
      .finally(() => setAlertsLoading(false));

  }, []);

  const handleAvatarSelect = async (emoji: string) => {
    if (!user?.id) return;
    setAvatarUploading(true);
    try {
      const avatarValue = emoji ? `emoji:${emoji}` : "";
      const res = await fetch("/api/account/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, profile_picture: avatarValue }),
      });
      const data = await res.json();
      if (!data.error) {
        setUser({ ...user, profile_picture: avatarValue });
        const u = JSON.parse(localStorage.getItem("user") || "{}");
        u.profile_picture = avatarValue;
        localStorage.setItem("user", JSON.stringify(u));
      }
    } catch (_e) {}
    setAvatarUploading(false);
    setShowAvatarPicker(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    if (file.size > 5 * 1024 * 1024) return;
    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append("userId", String(user.id));
      fd.append("avatar", file);
      const res = await fetch("/api/account/upload-avatar", { method: "POST", body: fd });
      const data = await res.json();
      if (data.profile_picture) {
        setUser({ ...user, profile_picture: data.profile_picture });
        const u = JSON.parse(localStorage.getItem("user") || "{}");
        u.profile_picture = data.profile_picture;
        localStorage.setItem("user", JSON.stringify(u));
      }
    } catch (_e) {}
    setAvatarUploading(false);
    setShowAvatarPicker(false);
    e.target.value = "";
  };

  const dismissAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    // Persist dismissed alerts so they don't come back on refresh
    try {
      const dismissed = JSON.parse(localStorage.getItem("dismissed_title_alerts") || "[]");
      dismissed.push(id);
      localStorage.setItem("dismissed_title_alerts", JSON.stringify(dismissed));
    } catch (_e) {}
  };

  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const handleSearch = (val: string) => {
    setSearchQ(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (val.length < 2) { setSearchResults([]); setShowSearch(false); return; }
    searchTimerRef.current = setTimeout(() => {
      fetch(`/api/dogs/search?q=${encodeURIComponent(val)}&limit=6`)
        .then((r) => r.json())
        .then((d) => { setSearchResults(d.dogs || d); setShowSearch(true); })
        .catch(() => {});
    }, 300);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    router.push("/");
  };

  const renderAvatar = (size: string, textSize: string) => {
    const pp = user?.profile_picture;
    const isPhoto = pp && !pp.startsWith("emoji:");
    const roundStyle = isPhoto ? "rounded-2xl" : "rounded-full";
    if (pp?.startsWith("emoji:")) {
      return (
        <div className={`${size} rounded-full flex items-center justify-center`}
          style={{ background: "linear-gradient(135deg, #1a2744, #0e1828)", border: "3px solid var(--accent-gold)" }}>
          <span className={textSize}>{pp.replace("emoji:", "")}</span>
        </div>
      );
    }
    if (pp) {
      return <img src={pp} alt="" className="rounded-2xl object-cover" style={{ border: "3px solid var(--accent-gold)", width: "120px", height: "90px" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />;
    }
    return (
      <div className={`${size} rounded-full flex items-center justify-center font-bold`}
        style={{ background: "linear-gradient(135deg, var(--accent-gold), #b8860b)", color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.3)", border: "3px solid var(--accent-gold)" }}>
        <span className={textSize}>{(user?.username || "U")[0].toUpperCase()}</span>
      </div>
    );
  };

  return (
    <div className="flex gap-6 min-h-[calc(100vh-120px)]">
      {/* ─── Left Sidebar ─── */}
      <aside className="w-64 flex-shrink-0 hidden lg:block">
        <div className="rounded-xl p-4 sticky top-20" style={steelFrame}>
          <h2 className="text-[10px] uppercase tracking-widest font-bold mb-4 px-2"
            style={{ color: "var(--accent-gold)", fontFamily: "var(--font-table)", textShadow: "0 0 12px rgba(212,168,85,0.3)" }}>
            📋 Menu
          </h2>

          <nav className="space-y-0.5">
            {NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href}
                className="dash-nav-item flex items-center gap-3 px-3 py-2.5 rounded-lg group"
                style={{ fontFamily: "var(--font-table)", "--item-color": item.color.replace("#", "").match(/.{2}/g)!.map(h => parseInt(h, 16)).join(",") } as React.CSSProperties}>
                <span className="text-base w-6 text-center transition-transform group-hover:scale-125 group-hover:drop-shadow-lg">{item.icon}</span>
                <div>
                  <span className="dash-nav-label text-sm font-medium transition-colors"
                    style={{ color: "var(--text-primary)" }}>
                    {item.label}
                  </span>
                  <p className="text-[9px] mt-0.5" style={{ color: "var(--text-muted)" }}>{item.desc}</p>
                </div>
              </Link>
            ))}
          </nav>

        </div>
      </aside>

      {/* ─── Main Content ─── */}
      <main className="flex-1 min-w-0">
        {/* Title Alert Banners */}
        {alertsLoading ? (
          <div className="mb-6 flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)" }}>
            <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
            Loading title alerts...
          </div>
        ) : alerts.length > 0 ? (
          <div className="space-y-2 mb-6">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "var(--accent-gold)", fontFamily: "var(--font-table)" }}>
                🏆 Recent Titled Dogs
              </span>
              <span className="text-[10px]" style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)" }}>
                User-published titles
              </span>
            </div>
            {alerts.map((alert) => {
              const c = ALERT_COLORS[alert.color];
              return (
                <div key={alert.id}
                  className="rounded-lg px-4 py-3 flex items-center justify-between animate-pulse-subtle transition-all hover:scale-[1.01] cursor-pointer"
                  onClick={() => {
                    if (alert.pedigree_id) router.push(`/pedigree/custom/${alert.pedigree_id}`);
                    else if (alert.dog_id) router.push(`/pedigree/${alert.dog_id}`);
                  }}
                  style={{ background: c.bg, border: `1px solid ${c.border}`, boxShadow: `0 0 25px ${c.glow}, inset 0 1px 0 rgba(255,255,255,0.05)` }}>
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{alert.color === "blue" ? "🥇" : "🏆"}</span>
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: c.text, fontFamily: "var(--font-table)" }}>
                        {alert.title}
                      </span>
                      <span className="text-xs ml-2" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-table)" }}>
                        <strong style={{ color: getDogColor(alert.dog) }}>{alert.dog}</strong>
                        {alert.username && (
                          <span className="ml-2 text-[10px]" style={{ color: "var(--text-muted)" }}>
                            by {alert.username}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); dismissAlert(alert.id); }}
                    className="text-xs px-2 py-1 rounded hover:bg-white/10 transition-colors"
                    style={{ color: c.text }}>
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        ) : null}

        {/* Welcome */}
        <div className="mb-6">
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", fontWeight: 700 }}>
            Welcome back, <span style={{ background: "linear-gradient(135deg, #e8c86e, #d4a855, #b8860b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{user?.username || "User"}</span>
          </h1>
          <p className="text-xs mt-1" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-table)" }}>
            APBT Pedigree Platform Dashboard
          </p>
        </div>

        {/* Quick Access Cards - Mobile (hidden on desktop since sidebar handles it) */}
        <div className="lg:hidden grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href}
              className="rounded-lg p-3 flex flex-col items-center gap-2 transition-all hover:scale-[1.02] hover:bg-white/5"
              style={steelFrame}>
              <span className="text-2xl">{item.icon}</span>
              <span className="text-[10px] font-medium text-center" style={{ color: "var(--text-primary)", fontFamily: "var(--font-table)" }}>
                {item.label}
              </span>
            </Link>
          ))}
        </div>

        {/* Feature Cards Grid */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Quick Actions */}
          <div className="dash-box-hover rounded-xl p-5" style={steelFrame}>
            <h2 className="text-[10px] uppercase tracking-widest font-bold mb-4 flex items-center gap-2"
              style={{ color: "var(--accent-gold)", fontFamily: "var(--font-table)", textShadow: "0 0 12px rgba(212,168,85,0.3)" }}>
              <span style={{ width: 16, height: 2, background: "linear-gradient(90deg, var(--accent-gold), transparent)", borderRadius: 1 }} />
              ⚡ Quick Actions
            </h2>
            <div className="space-y-2">
              {[
                { label: "Create New Pedigree", href: "/pedigree-lab", icon: "🧪", color: "#22c55e" },
                { label: "Search Dogs", href: "/dogs", icon: "🔍", color: "#60a5fa" },
                { label: "Post Ad on Marketplace", href: "/marketplace/create", icon: "📢", color: "#d4a855" },
                { label: "Predict Puppy Colors", href: "/puppy-predictor", icon: "🎨", color: "#f472b6" },
              ].map((action) => (
                <Link key={action.href} href={action.href}
                  className="dash-nav-item flex items-center gap-3 px-3 py-2.5 rounded-lg group"
                  style={{ "--item-color": action.color.replace("#", "").match(/.{2}/g)!.map(h => parseInt(h, 16)).join(",") } as React.CSSProperties}>
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-transform group-hover:scale-110"
                    style={{ background: `${action.color}15`, border: `1px solid ${action.color}30` }}>
                    {action.icon}
                  </span>
                  <span className="dash-nav-label text-sm font-medium transition-colors"
                    style={{ color: "var(--text-primary)", fontFamily: "var(--font-table)" }}>
                    {action.label}
                  </span>
                  <span className="dash-arrow ml-auto text-xs transition-all" style={{ color: "var(--text-muted)" }}>→</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Activity Placeholder */}
          <div className="dash-box-hover rounded-xl p-5" style={steelFrame}>
            <h2 className="text-[10px] uppercase tracking-widest font-bold mb-4 flex items-center gap-2"
              style={{ color: "var(--accent-gold)", fontFamily: "var(--font-table)", textShadow: "0 0 12px rgba(212,168,85,0.3)" }}>
              <span style={{ width: 16, height: 2, background: "linear-gradient(90deg, var(--accent-gold), transparent)", borderRadius: 1 }} />
              📊 Recent Activity
            </h2>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <span className="text-3xl mb-3">📊</span>
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)", fontFamily: "var(--font-table)" }}>
                Activity Feed
              </p>
              <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)" }}>
                Your recent pedigree activity will appear here
              </p>
            </div>
          </div>

        </div>
      </main>

      {/* ─── Right Panel ─── */}
      <aside className="w-56 flex-shrink-0 hidden xl:block">
        <div className="rounded-xl p-4 sticky top-20 space-y-4" style={steelFrame}>
          {/* Profile */}
          <div className="flex flex-col items-center text-center pb-4 relative" style={{ borderBottom: "1px solid rgba(30,64,120,0.3)" }}>
            <div className="relative group cursor-pointer" onClick={() => setShowAvatarPicker(!showAvatarPicker)}>
              {renderAvatar("w-24 h-24", "text-3xl")}
              <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: "rgba(0,0,0,0.5)" }}>
                <span className="text-white text-[10px] font-bold" style={{ fontFamily: "var(--font-table)" }}>
                  {avatarUploading ? "..." : "Change"}
                </span>
              </div>
            </div>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            {/* Avatar Picker */}
            {showAvatarPicker && (
              <>
                <div className="fixed inset-0 z-[60]" onClick={() => setShowAvatarPicker(false)} />
                <div className="absolute top-20 left-1/2 -translate-x-1/2 w-48 sm:w-56 rounded-xl overflow-hidden z-[70]"
                  onClick={(e) => e.stopPropagation()}
                  style={{ background: "linear-gradient(180deg, #2a2420 0%, #1c1714 100%)", border: "1.5px solid rgba(90,70,50,0.6)", boxShadow: "0 12px 40px rgba(0,0,0,0.6)" }}>
                  <div className="px-3 py-2" style={{ borderBottom: "1px solid rgba(90,70,50,0.4)" }}>
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--accent-gold)", fontFamily: "var(--font-table)" }}>Choose Avatar</p>
                  </div>
                  <button onClick={() => { setShowAvatarPicker(false); avatarInputRef.current?.click(); }}
                    className="w-full flex items-center gap-2 px-3 py-2 transition-colors hover:bg-white/5"
                    style={{ borderBottom: "1px solid rgba(30,64,120,0.3)", color: "var(--text-secondary)", fontFamily: "var(--font-table)", fontSize: "0.75rem" }}>
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs" style={{ background: "rgba(212,168,85,0.1)", border: "1px solid rgba(212,168,85,0.3)" }}>📷</span>
                    Upload Photo
                  </button>
                  <div className="p-2 grid grid-cols-6 gap-1.5">
                    {AVATAR_OPTIONS.map((av) => (
                      <button key={av.id} onClick={() => handleAvatarSelect(av.emoji)} title={av.id}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-sm transition-all hover:scale-110"
                        style={{
                          background: user?.profile_picture === `emoji:${av.emoji}` ? "rgba(212,168,85,0.25)" : "rgba(60,45,35,0.5)",
                          border: user?.profile_picture === `emoji:${av.emoji}` ? "2px solid var(--accent-gold)" : "1px solid rgba(90,70,50,0.4)",
                        }}>
                        {av.emoji}
                      </button>
                    ))}
                  </div>
                  {user?.profile_picture && (
                    <button onClick={() => handleAvatarSelect("")}
                      className="w-full flex items-center justify-center gap-1 px-3 py-1.5 transition-colors hover:bg-red-500/5 text-[10px]"
                      style={{ borderTop: "1px solid rgba(90,70,50,0.3)", color: "#ef4444", fontFamily: "var(--font-table)" }}>
                      Remove
                    </button>
                  )}
                </div>
              </>
            )}
            <p className="text-sm font-bold mt-3" style={{ color: "var(--accent-gold)", fontFamily: "var(--font-table)" }}>
              {user?.username || "User"}
            </p>
            <span className="text-[10px] px-2 py-0.5 rounded-full mt-1"
              style={{ background: "rgba(212,168,85,0.1)", color: "var(--accent-gold)", border: "1px solid rgba(212,168,85,0.2)", fontFamily: "var(--font-table)" }}>
              {user?.role || "Member"}
            </span>
          </div>

          {/* Subscription */}
          <div className="pb-4" style={{ borderBottom: "1px solid rgba(30,64,120,0.3)" }}>
            <h3 className="text-[10px] uppercase tracking-widest font-bold mb-3"
              style={{ color: "var(--accent-gold)", fontFamily: "var(--font-table)", textShadow: "0 0 10px rgba(212,168,85,0.25)" }}>
              💳 Subscription
            </h3>
            <div className="rounded-lg p-3"
              style={{ background: "linear-gradient(135deg, rgba(212,168,85,0.1), rgba(184,134,11,0.05))", border: "1px solid rgba(212,168,85,0.25)", boxShadow: "0 0 15px rgba(212,168,85,0.06)" }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">★</span>
                <span className="text-xs font-bold" style={{ color: "var(--accent-gold)", fontFamily: "var(--font-display)" }}>
                  FREE PLAN
                </span>
              </div>
              <p className="text-[10px]" style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)" }}>
                Basic access to all features
              </p>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#22c55e" }} />
                <span className="text-[10px] font-bold" style={{ color: "#22c55e", fontFamily: "var(--font-table)" }}>Active</span>
              </div>
            </div>
          </div>

          {/* Messaging */}
          <div className="pb-4" style={{ borderBottom: "1px solid rgba(30,64,120,0.3)" }}>
            <a href="/messages" className="dash-nav-item w-full flex items-center gap-3 px-3 py-2.5 rounded-lg"
              style={{ fontFamily: "var(--font-table)", "--item-color": "96,165,250" } as React.CSSProperties}>
              <span className="relative">
                <span className="text-base">🔔</span>
                {unreadMessages > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold"
                    style={{ background: "#ef4444", color: "#fff" }}>
                    {unreadMessages}
                  </span>
                )}
              </span>
              <div className="text-left">
                <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>Messages</span>
                <p className="text-[9px]" style={{ color: "var(--text-muted)" }}>
                  {unreadMessages > 0 ? `${unreadMessages} unread` : "No new messages"}
                </p>
              </div>
            </a>
          </div>

          {/* Account & Logout */}
          <div className="space-y-0.5">
            <Link href="/account"
              className="dash-nav-item flex items-center gap-3 px-3 py-2.5 rounded-lg group"
              style={{ fontFamily: "var(--font-table)", "--item-color": "167,139,250" } as React.CSSProperties}>
              <span className="text-base transition-transform group-hover:scale-110">⚙️</span>
              <span className="dash-nav-label text-xs font-medium transition-colors" style={{ color: "var(--text-primary)" }}>Account Settings</span>
            </Link>
            <button onClick={handleLogout}
              className="dash-nav-item w-full flex items-center gap-3 px-3 py-2.5 rounded-lg group"
              style={{ fontFamily: "var(--font-table)", "--item-color": "239,68,68" } as React.CSSProperties}>
              <span className="text-base transition-transform group-hover:scale-110">🚪</span>
              <span className="dash-nav-label text-xs font-medium transition-colors" style={{ color: "#ef4444" }}>Logout</span>
            </button>
          </div>
        </div>

      </aside>

    </div>
  );
}
