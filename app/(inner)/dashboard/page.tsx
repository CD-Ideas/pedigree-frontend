"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getDogColor } from "@/app/utils/colors";

const steelFrame = {
  background: "#FAF7F2",
  border: "2px solid #C9B29F",
  borderRadius: "8px",
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
  { icon: "📋", label: "My Pedigrees", href: "/dashboard/pedigrees", desc: "Your published pedigrees", color: "#60a5fa" },
  { icon: "🧪", label: "Pedigree Lab", href: "/pedigree-lab", desc: "Create & publish pedigrees", color: "#22c55e" },
  { icon: "🧬", label: "Bloodline Calculator", href: "/bloodline-calculator", desc: "COI & linebreeding analysis", color: "#a78bfa" },
  { icon: "🔦", label: "Lineage Spotlight", href: "/pedigree/spotlight", desc: "Explore lineage trees", color: "#f59e0b" },
  { icon: "🌍", label: "Community Pedigrees", href: "/community", desc: "Browse all pedigrees", color: "#34d399" },
  { icon: "🐾", label: "Dogs", href: "/dogs", desc: "Browse dog database", color: "#f472b6" },
  { icon: "👑", label: "Dog of the Month", href: "/dog-of-the-month", desc: "Monthly photo contest", color: "#f97316" },
  { icon: "🎨", label: "Puppy Color Predictor", href: "/puppy-predictor", desc: "Predict coat colors", color: "#fb923c" },
  { icon: "🏪", label: "Marketplace", href: "/marketplace", desc: "Buy, sell & advertise", color: "#ef4444" },
  { icon: "🤰", label: "Whelping Calculator", href: "/dashboard/whelping-calculator", desc: "Predict puppy due dates", color: "#e879a0" },
];


const capName = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [alerts, setAlerts] = useState<TitleAlert[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [titleAlertCount, setTitleAlertCount] = useState(0);
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

    // Fetch title alerts (used by notifications)
    const dismissed = JSON.parse(localStorage.getItem("dismissed_title_alerts") || "[]");
    fetch("/api/dogs/titled?limit=10")
      .then((r) => r.json())
      .then((data) => {
        const filtered = (data.alerts || []).filter((a: TitleAlert) => !dismissed.includes(a.id));
        setAlerts(filtered);
      })
      .catch(() => {});

  }, []);

  useEffect(() => {
    let userId = 0;
    try { const u = JSON.parse(localStorage.getItem("user") || "{}"); userId = u?.id || 0; } catch {}
    if (!userId) return;
    fetch(`/api/title-alerts?userId=${userId}`)
      .then(r => r.ok ? r.json() : { unread_count: 0 })
      .then(d => {
        setTitleAlertCount(d.unread_count || 0);
        if (d.unread_count > 0 && (window as any).__playTitleChime) {
          (window as any).__playTitleChime();
        }
      })
      .catch(() => {});
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
    const roundStyle = isPhoto ? "rounded-lg" : "rounded-full";
    if (pp?.startsWith("emoji:")) {
      return (
        <div className={`${size} rounded-full flex items-center justify-center`}
          style={{ background: "#FAF7F2", border: "2px solid #C9B29F" }}>
          <span className={textSize}>{pp.replace("emoji:", "")}</span>
        </div>
      );
    }
    if (pp) {
      return (
        <div className={`${size} rounded-full flex items-center justify-center overflow-hidden`}
          style={{ background: "#FAF7F2", border: "2px solid #C9B29F" }}>
          <img src={pp} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; const parent = e.currentTarget.parentElement; if (parent) parent.innerHTML = `<span class="${textSize}" style="color:#C9B29F">📷</span>`; }} />
        </div>
      );
    }
    return (
      <div className={`${size} rounded-full flex items-center justify-center font-bold`}
        style={{ background: "#C9B29F", color: "#1C1C1C", border: "2px solid #C9B29F" }}>
        <span className={textSize}>{(user?.username || "U")[0].toUpperCase()}</span>
      </div>
    );
  };

  return (
    <div className="flex gap-6 min-h-[calc(100vh-120px)]" style={{ background: "#EDE4D5", minHeight: "100vh" }}>
      {/* ─── Left Sidebar ─── */}
      <aside className="w-64 flex-shrink-0 hidden lg:block">
        <div className="rounded-lg p-4 sticky top-20" style={steelFrame}>
          <h2 className="text-[12px] uppercase tracking-widest font-bold mb-4 px-2"
            style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>
            📋 Menu
          </h2>

          <nav className="space-y-0.5">
            {NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href}
                className="dash-nav-item flex items-center gap-3 px-3 py-2.5 rounded-lg group"
                style={{ fontFamily: "var(--font-table)", "--item-color": item.color.replace("#", "").match(/.{2}/g)!.map(h => parseInt(h, 16)).join(",") } as React.CSSProperties}>
                <span className="text-base w-6 text-center transition-transform group-hover:scale-125">{item.icon}</span>
                <div>
                  <span className="dash-nav-label text-sm font-medium transition-colors"
                    style={{ color: "#1C1C1C" }}>
                    {item.label}
                  </span>
                  <p className="text-[12px] mt-0.5" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>{item.desc}</p>
                </div>
              </Link>
            ))}
          </nav>

        </div>
      </aside>

      {/* ─── Main Content ─── */}
      <main className="flex-1 min-w-0">
        {/* Welcome */}
        <div className="mb-6">
          <h1 style={{ fontFamily: "var(--font-table)", fontSize: "1.6rem", fontWeight: 900, color: "#1C1C1C" }}>
            Welcome back, <span style={{ color: "#C9B29F" }}>{user?.username ? capName(user.username) : "User"}</span>
          </h1>
          <p className="text-xs mt-1" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>
            APBT Pedigree Platform Dashboard
          </p>
        </div>

        {/* Quick Access Cards - Mobile (hidden on desktop since sidebar handles it) */}
        <div className="lg:hidden grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href}
              className="rounded-lg p-3 flex flex-col items-center gap-2 transition-all hover:scale-[1.02]"
              style={steelFrame}>
              <span className="text-2xl">{item.icon}</span>
              <span className="text-[12px] font-medium text-center" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>
                {item.label}
              </span>
            </Link>
          ))}
        </div>

        {/* Feature Cards Grid */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Quick Actions */}
          <div className="dash-box-hover rounded-lg p-5" style={steelFrame}>
            <h2 className="text-[12px] uppercase tracking-widest font-bold mb-4 flex items-center gap-2"
              style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>
              <span style={{ width: 16, height: 2, background: "#C9B29F", borderRadius: 1 }} />
              ⚡ Quick Actions
            </h2>
            <div className="space-y-2">
              {[
                { label: "Search Dogs", href: "/dogs", icon: "🔍", color: "#60a5fa" },
                { label: "Create New Pedigree", href: "/pedigree-lab", icon: "🧪", color: "#22c55e" },
                { label: "Bloodline Calculator", href: "/bloodline-calculator", icon: "🧬", color: "#a78bfa" },
                { label: "Post Ad on Marketplace", href: "/marketplace/create", icon: "📢", color: "#C9B29F" },
              ].map((action) => (
                <Link key={action.href} href={action.href}
                  className="dash-nav-item flex items-center gap-3 px-3 py-2.5 rounded-lg group"
                  style={{ "--item-color": action.color.replace("#", "").match(/.{2}/g)!.map(h => parseInt(h, 16)).join(",") } as React.CSSProperties}>
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-transform group-hover:scale-110"
                    style={{ background: `${action.color}15`, border: `2px solid ${action.color}30` }}>
                    {action.icon}
                  </span>
                  <span className="dash-nav-label text-sm font-medium transition-colors"
                    style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>
                    {action.label}
                  </span>
                  <span className="dash-arrow ml-auto text-xs transition-all" style={{ color: "#4A4A4A" }}>→</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Tools & Features */}
          <div className="dash-box-hover rounded-lg p-5" style={steelFrame}>
            <h2 className="text-[12px] uppercase tracking-widest font-bold mb-4 flex items-center gap-2"
              style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>
              <span style={{ width: 16, height: 2, background: "#C9B29F", borderRadius: 1 }} />
              🛠️ Tools
            </h2>
            <div className="space-y-2">
              {[
                { label: "New Title Alerts", href: "/dashboard/new-title-alerts", icon: "🏆", color: "#f59e0b" },
                { label: "Marketplace", href: "/marketplace", icon: "🛒", color: "#3b82f6" },
                { label: "My Affiliates", href: "/dashboard/affiliates", icon: "🤝", color: "#10b981" },
              ].map((tool) => (
                <Link key={tool.href} href={tool.href}
                  className="dash-nav-item flex items-center gap-3 px-3 py-2.5 rounded-lg group"
                  style={{ "--item-color": tool.color.replace("#", "").match(/.{2}/g)!.map(h => parseInt(h, 16)).join(",") } as React.CSSProperties}>
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-transform group-hover:scale-110"
                    style={{ background: `${tool.color}15`, border: `2px solid ${tool.color}30` }}>
                    {tool.icon}
                  </span>
                  <span className="dash-nav-label text-sm font-medium transition-colors"
                    style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>
                    {tool.label}
                  </span>
                  {tool.label === "New Title Alerts" && titleAlertCount > 0 && (
                    <span style={{ background: "#ef4444", color: "#fff", fontSize: "10px", fontWeight: 700, borderRadius: "50%", width: 18, height: 18, display: "inline-flex", alignItems: "center", justifyContent: "center", marginLeft: 4 }}>
                      {titleAlertCount}
                    </span>
                  )}
                  <span className="dash-arrow ml-auto text-xs transition-all" style={{ color: "#4A4A4A" }}>→</span>
                </Link>
              ))}
            </div>
          </div>

        </div>
      </main>

      {/* ─── Right Panel ─── */}
      <aside className="w-56 flex-shrink-0 hidden xl:block">
        <div className="rounded-lg p-4 sticky top-20 space-y-4" style={steelFrame}>
          {/* Profile */}
          <div className="flex flex-col items-center text-center pb-4 relative" style={{ borderBottom: "2px solid #C9B29F" }}>
            <div className="relative group cursor-pointer" onClick={() => setShowAvatarPicker(!showAvatarPicker)}>
              {renderAvatar("w-24 h-24", "text-3xl")}
              <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: "rgba(0,0,0,0.4)" }}>
                <span className="text-white text-[12px] font-bold" style={{ fontFamily: "var(--font-table)" }}>
                  {avatarUploading ? "..." : "Change"}
                </span>
              </div>
            </div>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            {/* Avatar Picker */}
            {showAvatarPicker && (
              <>
                <div className="fixed inset-0 z-[60]" onClick={() => setShowAvatarPicker(false)} />
                <div className="absolute top-20 left-1/2 -translate-x-1/2 w-48 sm:w-56 overflow-hidden z-[70]"
                  onClick={(e) => e.stopPropagation()}
                  style={{ background: "#FAFAFA", border: "2px solid #C9B29F", borderRadius: "8px" }}>
                  <div className="px-3 py-2" style={{ borderBottom: "2px solid #C9B29F" }}>
                    <p className="text-[12px] font-bold uppercase tracking-wider" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>Choose Avatar</p>
                  </div>
                  <button onClick={() => { setShowAvatarPicker(false); avatarInputRef.current?.click(); }}
                    className="w-full flex items-center gap-2 px-3 py-2 transition-colors hover:bg-black/5"
                    style={{ borderBottom: "2px solid #C9B29F", color: "#1C1C1C", fontFamily: "var(--font-table)", fontSize: "0.75rem" }}>
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs" style={{ background: "#FAF7F2", border: "2px solid #C9B29F" }}>📷</span>
                    Upload Photo
                  </button>
                  <div className="p-2 grid grid-cols-6 gap-1.5">
                    {AVATAR_OPTIONS.map((av) => (
                      <button key={av.id} onClick={() => handleAvatarSelect(av.emoji)} title={av.id}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-sm transition-all hover:scale-110"
                        style={{
                          background: user?.profile_picture === `emoji:${av.emoji}` ? "#FAF7F2" : "#FAFAFA",
                          border: user?.profile_picture === `emoji:${av.emoji}` ? "2px solid #C9B29F" : "2px solid #C9B29F",
                        }}>
                        {av.emoji}
                      </button>
                    ))}
                  </div>
                  {user?.profile_picture && (
                    <button onClick={() => handleAvatarSelect("")}
                      className="w-full flex items-center justify-center gap-1 px-3 py-1.5 transition-colors hover:bg-red-500/5 text-[12px]"
                      style={{ borderTop: "2px solid #C9B29F", color: "#ef4444", fontFamily: "var(--font-table)" }}>
                      Remove
                    </button>
                  )}
                </div>
              </>
            )}
            <p className="text-sm font-bold mt-3" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>
              {user?.username ? capName(user.username) : "User"}
            </p>
            <span className="text-[12px] px-2 py-0.5 rounded-full mt-1"
              style={{ background: "#FAF7F2", color: "#C9B29F", border: "2px solid #C9B29F", fontFamily: "var(--font-table)" }}>
              {user?.role || "Member"}
            </span>
          </div>

          {/* Subscription */}
          <div className="pb-4" style={{ borderBottom: "2px solid #C9B29F" }}>
            <h3 className="text-[12px] uppercase tracking-widest font-bold mb-3"
              style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>
              💳 Subscription
            </h3>
            <div className="p-3"
              style={{ background: "#FAF7F2", border: "2px solid #C9B29F", borderRadius: "8px" }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">★</span>
                <span className="text-xs font-bold" style={{ color: "#C9B29F", fontFamily: "var(--font-table)" }}>
                  FREE PLAN
                </span>
              </div>
              <p className="text-[12px]" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>
                Basic access to all features
              </p>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#22c55e" }} />
                <span className="text-[12px] font-bold" style={{ color: "#22c55e", fontFamily: "var(--font-table)" }}>Active</span>
              </div>
            </div>
          </div>

          {/* Messaging */}
          <div className="pb-4" style={{ borderBottom: "2px solid #C9B29F" }}>
            <a href="/messages" className="dash-nav-item w-full flex items-center gap-3 px-3 py-2.5 rounded-lg"
              style={{ fontFamily: "var(--font-table)", "--item-color": "96,165,250" } as React.CSSProperties}>
              <span className="relative">
                <span className="text-base">🔔</span>
                {unreadMessages > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[12px] font-bold"
                    style={{ background: "#ef4444", color: "#fff" }}>
                    {unreadMessages}
                  </span>
                )}
              </span>
              <div className="text-left">
                <span className="text-xs font-medium" style={{ color: "#1C1C1C" }}>Messages</span>
                <p className="text-[12px]" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>
                  {unreadMessages > 0 ? `${unreadMessages} unread` : "No new messages"}
                </p>
              </div>
            </a>
          </div>

          {/* Support Messages */}
          <div className="pb-4" style={{ borderBottom: "2px solid #C9B29F" }}>
            <a href="/dashboard/support" className="dash-nav-item w-full flex items-center gap-3 px-3 py-2.5 rounded-lg"
              style={{ fontFamily: "var(--font-table)", "--item-color": "212,168,85" } as React.CSSProperties}>
              <span className="text-base">📩</span>
              <div className="text-left">
                <span className="text-xs font-medium" style={{ color: "#1C1C1C" }}>Support Messages</span>
                <p className="text-[12px]" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>
                  View replies from support
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
              <span className="dash-nav-label text-xs font-medium transition-colors" style={{ color: "#1C1C1C" }}>Account Settings</span>
            </Link>
            <Link href="/contact"
              className="dash-nav-item flex items-center gap-3 px-3 py-2.5 rounded-lg group"
              style={{ fontFamily: "var(--font-table)", "--item-color": "212,168,85" } as React.CSSProperties}>
              <span className="text-base transition-transform group-hover:scale-110">📩</span>
              <span className="dash-nav-label text-xs font-medium transition-colors" style={{ color: "#1C1C1C" }}>Contact Support</span>
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
