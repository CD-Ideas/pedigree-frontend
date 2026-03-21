"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getDogColor } from "@/app/utils/colors";

const steelFrame = {
  border: "1.5px solid rgba(30,64,120,0.8)",
  boxShadow: "0 2px 20px rgba(0,0,0,0.25)",
  background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)",
};

interface TitleAlert {
  id: string;
  dog: string;
  title: string;
  color: "blue" | "red" | "gold";
}

interface UserData {
  id: number;
  username: string;
  email: string;
  role: string;
  profile_picture?: string;
}

const NAV_ITEMS = [
  { icon: "🧪", label: "Pedigree Lab", href: "/pedigree-lab", desc: "Create & publish pedigrees" },
  { icon: "🔦", label: "Lineage Spotlight", href: "/pedigree/spotlight", desc: "Explore lineage trees" },
  { icon: "📋", label: "My Pedigrees", href: "/dashboard/pedigrees", desc: "Your published pedigrees" },
  { icon: "🌍", label: "Community Pedigrees", href: "/community", desc: "Browse all pedigrees" },
  { icon: "🐕", label: "Dogs", href: "/dogs", desc: "Browse dog database" },
  { icon: "🧬", label: "Breeding Calculator", href: "/breeding-calculator", desc: "COI & linebreeding analysis" },
  { icon: "🎨", label: "Puppy Color Predictor", href: "/puppy-predictor", desc: "Predict coat colors" },
  { icon: "🏪", label: "Marketplace", href: "/marketplace", desc: "Buy, sell & advertise" },
];

const ALERT_COLORS = {
  blue: { bg: "rgba(96,165,250,0.08)", border: "rgba(96,165,250,0.3)", text: "#60a5fa", glow: "rgba(96,165,250,0.15)" },
  red: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.3)", text: "#ef4444", glow: "rgba(239,68,68,0.15)" },
  gold: { bg: "rgba(212,168,85,0.08)", border: "rgba(212,168,85,0.3)", text: "#d4a855", glow: "rgba(212,168,85,0.15)" },
};

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [alerts, setAlerts] = useState<TitleAlert[]>([
    { id: "1", dog: "TURNER'S PABLO", title: "Grand Champion", color: "blue" },
    { id: "2", dog: "BWK'S ATLAS", title: "Champion", color: "gold" },
  ]);
  const [unreadMessages] = useState(0);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<{ dog_id: number; registered_name: string }[]>([]);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "null");
      if (u) setUser(u);
    } catch (_e) {}
  }, []);

  const dismissAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSearch = (val: string) => {
    setSearchQ(val);
    if (val.length < 2) { setSearchResults([]); setShowSearch(false); return; }
    const timer = setTimeout(() => {
      fetch(`/api/dogs/search?q=${encodeURIComponent(val)}&limit=6`)
        .then((r) => r.json())
        .then((d) => { setSearchResults(d.dogs || d); setShowSearch(true); })
        .catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    router.push("/");
  };

  const renderAvatar = (size: string, textSize: string) => {
    const pp = user?.profile_picture;
    if (pp?.startsWith("emoji:")) {
      return (
        <div className={`${size} rounded-full flex items-center justify-center`}
          style={{ background: "linear-gradient(135deg, #1a2744, #0e1828)", border: "3px solid var(--accent-gold)" }}>
          <span className={textSize}>{pp.replace("emoji:", "")}</span>
        </div>
      );
    }
    if (pp) {
      return <img src={pp} alt="" className={`${size} rounded-full object-cover`} style={{ border: "3px solid var(--accent-gold)" }} />;
    }
    return (
      <div className={`${size} rounded-full flex items-center justify-center font-bold`}
        style={{ background: "linear-gradient(135deg, var(--accent-gold), #b8860b)", color: "#000", border: "3px solid var(--accent-gold)" }}>
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
            style={{ color: "var(--accent-gold)", fontFamily: "var(--font-table)" }}>
            Menu
          </h2>

          <nav className="space-y-0.5">
            {NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all hover:bg-white/5 group"
                style={{ fontFamily: "var(--font-table)" }}>
                <span className="text-base w-6 text-center">{item.icon}</span>
                <div>
                  <span className="text-sm font-medium group-hover:text-[var(--accent-gold)] transition-colors"
                    style={{ color: "var(--text-primary)" }}>
                    {item.label}
                  </span>
                  <p className="text-[9px] mt-0.5" style={{ color: "var(--text-muted)" }}>{item.desc}</p>
                </div>
              </Link>
            ))}
          </nav>

          {/* Pedigree Search */}
          <div className="mt-4 pt-4 relative" style={{ borderTop: "1px solid rgba(30,64,120,0.4)" }}>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{ background: "rgba(30,64,120,0.15)", border: "1px solid rgba(30,64,120,0.3)" }}>
              <span className="text-xs">🔍</span>
              <input
                type="text"
                value={searchQ}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search pedigrees..."
                className="flex-1 bg-transparent text-xs outline-none"
                style={{ color: "var(--text-primary)", fontFamily: "var(--font-table)", minWidth: 0 }}
              />
            </div>
            {showSearch && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 rounded-lg overflow-hidden z-50"
                style={{ background: "var(--bg-elevated, #151d2e)", border: "1px solid rgba(30,64,120,0.8)", boxShadow: "0 10px 30px rgba(0,0,0,0.5)", maxHeight: 200, overflowY: "auto" }}>
                {searchResults.map((r) => (
                  <a key={r.dog_id} href={`/pedigree/${r.dog_id}`}
                    className="block px-3 py-2 text-xs hover:bg-white/5 transition-colors"
                    style={{ color: getDogColor(r.registered_name), fontFamily: "var(--font-table)", borderBottom: "1px solid rgba(30,64,120,0.2)" }}>
                    {r.registered_name}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ─── Main Content ─── */}
      <main className="flex-1 min-w-0">
        {/* Title Alert Banners */}
        {alerts.length > 0 && (
          <div className="space-y-2 mb-6">
            {alerts.map((alert) => {
              const c = ALERT_COLORS[alert.color];
              return (
                <div key={alert.id}
                  className="rounded-lg px-4 py-3 flex items-center justify-between animate-pulse-subtle"
                  style={{ background: c.bg, border: `1px solid ${c.border}`, boxShadow: `0 0 20px ${c.glow}` }}>
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🏆</span>
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: c.text, fontFamily: "var(--font-table)" }}>
                        New Title: {alert.title}
                      </span>
                      <span className="text-xs ml-2" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-table)" }}>
                        for <strong style={{ color: getDogColor(alert.dog) }}>{alert.dog}</strong>
                      </span>
                    </div>
                  </div>
                  <button onClick={() => dismissAlert(alert.id)}
                    className="text-xs px-2 py-1 rounded hover:bg-white/10 transition-colors"
                    style={{ color: c.text }}>
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Welcome */}
        <div className="mb-6">
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", fontWeight: 700 }}>
            Welcome back, <span style={{ color: "var(--accent-gold)" }}>{user?.username || "User"}</span>
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
          <div className="rounded-xl p-5" style={steelFrame}>
            <h2 className="text-[10px] uppercase tracking-widest font-bold mb-4"
              style={{ color: "var(--accent-gold)", fontFamily: "var(--font-table)" }}>
              Quick Actions
            </h2>
            <div className="space-y-2">
              {[
                { label: "Create New Pedigree", href: "/pedigree-lab", icon: "🧪", color: "#22c55e" },
                { label: "Search Dogs", href: "/dogs", icon: "🔍", color: "#60a5fa" },
                { label: "Post Ad on Marketplace", href: "/marketplace/create", icon: "📢", color: "#d4a855" },
                { label: "Predict Puppy Colors", href: "/puppy-predictor", icon: "🎨", color: "#f472b6" },
              ].map((action) => (
                <Link key={action.href} href={action.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all hover:bg-white/5 group">
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                    style={{ background: `${action.color}15`, border: `1px solid ${action.color}30` }}>
                    {action.icon}
                  </span>
                  <span className="text-sm font-medium group-hover:text-[var(--accent-gold)] transition-colors"
                    style={{ color: "var(--text-primary)", fontFamily: "var(--font-table)" }}>
                    {action.label}
                  </span>
                  <span className="ml-auto text-xs" style={{ color: "var(--text-muted)" }}>→</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Activity Placeholder */}
          <div className="rounded-xl p-5" style={steelFrame}>
            <h2 className="text-[10px] uppercase tracking-widest font-bold mb-4"
              style={{ color: "var(--accent-gold)", fontFamily: "var(--font-table)" }}>
              Recent Activity
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
          <div className="flex flex-col items-center text-center pb-4" style={{ borderBottom: "1px solid rgba(30,64,120,0.4)" }}>
            {renderAvatar("w-16 h-16", "text-2xl")}
            <p className="text-sm font-bold mt-3" style={{ color: "var(--accent-gold)", fontFamily: "var(--font-table)" }}>
              {user?.username || "User"}
            </p>
            <span className="text-[10px] px-2 py-0.5 rounded-full mt-1"
              style={{ background: "rgba(212,168,85,0.1)", color: "var(--accent-gold)", border: "1px solid rgba(212,168,85,0.2)", fontFamily: "var(--font-table)" }}>
              {user?.role || "Member"}
            </span>
          </div>

          {/* Subscription */}
          <div className="pb-4" style={{ borderBottom: "1px solid rgba(30,64,120,0.4)" }}>
            <h3 className="text-[10px] uppercase tracking-widest font-bold mb-3"
              style={{ color: "var(--accent-gold)", fontFamily: "var(--font-table)" }}>
              Subscription
            </h3>
            <div className="rounded-lg p-3"
              style={{ background: "linear-gradient(135deg, rgba(212,168,85,0.08), rgba(184,134,11,0.04))", border: "1px solid rgba(212,168,85,0.2)" }}>
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
          <div className="pb-4" style={{ borderBottom: "1px solid rgba(30,64,120,0.4)" }}>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-white/5"
              style={{ fontFamily: "var(--font-table)" }}>
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
            </button>
          </div>

          {/* Account & Logout */}
          <div className="space-y-0.5">
            <Link href="/account"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-white/5"
              style={{ fontFamily: "var(--font-table)" }}>
              <span className="text-base">⚙️</span>
              <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>Account Settings</span>
            </Link>
            <button onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-red-500/5"
              style={{ fontFamily: "var(--font-table)" }}>
              <span className="text-base">🚪</span>
              <span className="text-xs font-medium" style={{ color: "#ef4444" }}>Logout</span>
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
