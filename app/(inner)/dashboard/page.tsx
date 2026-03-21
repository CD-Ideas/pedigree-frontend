"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getDogColor } from "@/app/utils/colors";

const steelFrame = {
  border: "1.5px solid rgba(212,168,85,0.15)",
  boxShadow: "0 4px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04), 0 0 0 1px rgba(90,70,50,0.3)",
  background: "linear-gradient(160deg, rgba(42,36,32,0.95) 0%, rgba(28,23,20,0.98) 100%)",
  backdropFilter: "blur(12px)",
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
  blue: { bg: "linear-gradient(135deg, rgba(96,165,250,0.1), rgba(96,165,250,0.03))", border: "rgba(96,165,250,0.35)", text: "#60a5fa", glow: "rgba(96,165,250,0.2)" },
  red: { bg: "linear-gradient(135deg, rgba(239,68,68,0.1), rgba(239,68,68,0.03))", border: "rgba(239,68,68,0.35)", text: "#ef4444", glow: "rgba(239,68,68,0.2)" },
  gold: { bg: "linear-gradient(135deg, rgba(212,168,85,0.1), rgba(212,168,85,0.03))", border: "rgba(212,168,85,0.35)", text: "#d4a855", glow: "rgba(212,168,85,0.2)" },
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
            style={{ color: "var(--accent-gold)", fontFamily: "var(--font-table)", textShadow: "0 0 12px rgba(212,168,85,0.3)" }}>
            Menu
          </h2>

          <nav className="space-y-0.5">
            {NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href}
                className="dash-nav-item flex items-center gap-3 px-3 py-2.5 rounded-lg group"
                style={{ fontFamily: "var(--font-table)" }}>
                <span className="text-base w-6 text-center transition-transform group-hover:scale-110">{item.icon}</span>
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
                  style={{ background: c.bg, border: `1px solid ${c.border}`, boxShadow: `0 0 25px ${c.glow}, inset 0 1px 0 rgba(255,255,255,0.05)` }}>
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
                  className="dash-action-item flex items-center gap-3 px-3 py-2.5 rounded-lg group">
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                    style={{ background: `${action.color}15`, border: `1px solid ${action.color}30` }}>
                    {action.icon}
                  </span>
                  <span className="text-sm font-medium group-hover:text-[var(--accent-gold)] transition-colors"
                    style={{ color: "var(--text-primary)", fontFamily: "var(--font-table)" }}>
                    {action.label}
                  </span>
                  <span className="dash-arrow ml-auto text-xs" style={{ color: "var(--text-muted)" }}>→</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Activity Placeholder */}
          <div className="dash-box-hover rounded-xl p-5" style={steelFrame}>
            <h2 className="text-[10px] uppercase tracking-widest font-bold mb-4 flex items-center gap-2"
              style={{ color: "var(--accent-gold)", fontFamily: "var(--font-table)", textShadow: "0 0 12px rgba(212,168,85,0.3)" }}>
              <span style={{ width: 16, height: 2, background: "linear-gradient(90deg, var(--accent-gold), transparent)", borderRadius: 1 }} />
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
          <div className="flex flex-col items-center text-center pb-4" style={{ borderBottom: "1px solid rgba(90,70,50,0.3)" }}>
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
          <div className="pb-4" style={{ borderBottom: "1px solid rgba(90,70,50,0.3)" }}>
            <h3 className="text-[10px] uppercase tracking-widest font-bold mb-3"
              style={{ color: "var(--accent-gold)", fontFamily: "var(--font-table)", textShadow: "0 0 10px rgba(212,168,85,0.25)" }}>
              Subscription
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
          <div className="pb-4" style={{ borderBottom: "1px solid rgba(90,70,50,0.3)" }}>
            <button className="dash-panel-btn w-full flex items-center gap-3 px-3 py-2.5 rounded-lg"
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
              className="dash-panel-btn flex items-center gap-3 px-3 py-2.5 rounded-lg"
              style={{ fontFamily: "var(--font-table)" }}>
              <span className="text-base">⚙️</span>
              <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>Account Settings</span>
            </Link>
            <button onClick={handleLogout}
              className="dash-panel-btn w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:!bg-red-500/10"
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
