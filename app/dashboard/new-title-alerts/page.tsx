"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface TitleAlert {
  id: number;
  name: string;
  prefix: string;
  suffix_wins: string;
  suffix_losses: string;
  breeder: string;
  owner: string;
  country: string;
  continent: string;
  sex: string;
  date_posted: string;
  photo_path: string;
  creator_username: string;
  is_read: number;
}

export default function NewTitleAlertsPage() {
  const [alerts, setAlerts] = useState<TitleAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    let userId = 0;
    try { const u = JSON.parse(localStorage.getItem("user") || "{}"); userId = u?.id || 0; } catch {}
    fetch(`/api/title-alerts?userId=${userId}`)
      .then(r => r.ok ? r.json() : { alerts: [] })
      .then(d => { setAlerts(d.alerts || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const markRead = async (alertId: number) => {
    let userId = 0;
    try { const u = JSON.parse(localStorage.getItem("user") || "{}"); userId = u?.id || 0; } catch {}
    if (!userId) return;
    await fetch("/api/title-alerts/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, alertId }),
    });
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, is_read: 1 } : a));
  };

  const markAllRead = async () => {
    let userId = 0;
    try { const u = JSON.parse(localStorage.getItem("user") || "{}"); userId = u?.id || 0; } catch {}
    if (!userId) return;
    await fetch("/api/title-alerts/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, readAll: true }),
    });
    setAlerts(prev => prev.map(a => ({ ...a, is_read: 1 })));
  };

  const filtered = filter === "all" ? alerts
    : filter === "week" ? alerts.filter(a => {
        const diff = Date.now() - new Date(a.date_posted).getTime();
        return diff < 7 * 24 * 60 * 60 * 1000;
      })
    : alerts.filter(a => a.continent === filter);

  const continents = [...new Set(alerts.map(a => a.continent).filter(Boolean))];

  const buildDisplayName = (a: TitleAlert) => {
    let name = a.name;
    if (a.prefix && a.prefix !== "None") name = a.prefix + " " + name;
    const parts = [];
    if (a.suffix_wins && a.suffix_wins !== "0") parts.push(a.suffix_wins + "XW");
    if (a.suffix_losses && a.suffix_losses !== "0") parts.push(a.suffix_losses + "XL");
    if (parts.length > 0) name += " " + parts.join(" ");
    return name;
  };

  return (
    <div className="min-h-screen" style={{ background: "#EDE4D5" }}>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-widest" style={{ fontFamily: "var(--font-table)", color: "#1C1C1C" }}>
              New Title Alerts
            </h1>
            <p className="text-xs mt-1" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>
              Recently announced dogs from breeders worldwide
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard/new-title-map" className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all hover:scale-105" style={{ background: "#1C1C1C", color: "#FAF7F2", fontFamily: "var(--font-table)", border: "2px solid #C9B29F", textDecoration: "none" }}>
              View World Map
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <button onClick={() => setFilter("all")} className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all" style={{ background: filter === "all" ? "#1C1C1C" : "#FAF7F2", color: filter === "all" ? "#FAF7F2" : "#1C1C1C", border: "2px solid #C9B29F", fontFamily: "var(--font-table)" }}>All</button>
          <button onClick={() => setFilter("week")} className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all" style={{ background: filter === "week" ? "#1C1C1C" : "#FAF7F2", color: filter === "week" ? "#FAF7F2" : "#1C1C1C", border: "2px solid #C9B29F", fontFamily: "var(--font-table)" }}>This Week</button>
          {continents.map(c => (
            <button key={c} onClick={() => setFilter(c)} className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all" style={{ background: filter === c ? "#1C1C1C" : "#FAF7F2", color: filter === c ? "#FAF7F2" : "#1C1C1C", border: "2px solid #C9B29F", fontFamily: "var(--font-table)" }}>{c}</button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#C9B29F", borderTopColor: "transparent" }} />
            <span className="ml-3 text-sm" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>Loading...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <img src="/logo.png" alt="Pedigree Platform" className="mx-auto mb-4 opacity-30" style={{ width: "64px", height: "64px" }} />
            <p className="text-sm font-bold" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>No title alerts yet</p>
            <p className="text-xs mt-1" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>Dogs published with "Show in Dashboard Alerts" will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(a => (
              <Link key={a.id} href={`/pedigree/custom/${a.id}`} onClick={() => markRead(a.id)} className="flex items-center gap-4 p-4 rounded-lg transition-all hover:shadow-lg" style={{ background: "#FAF7F2", border: a.is_read ? "2px solid #D6CEBF" : "2px solid #C9B29F", borderRadius: "8px", textDecoration: "none", opacity: a.is_read ? 0.7 : 1 }}>
                <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0" style={{ border: "2px solid #C9B29F", background: "#FAFAFA" }}>
                  {a.photo_path ? (
                    <img src={a.photo_path.startsWith("/") ? a.photo_path : `/uploads/${a.photo_path}`} alt={a.name} className="w-full h-full object-cover" onError={(e) => { const t = e.target as HTMLImageElement; t.onerror = null; t.src = "/logo.png"; t.style.opacity = "0.3"; t.style.padding = "4px"; }} />
                  ) : (
                    <img src="/logo.png" alt="Pedigree Platform" className="w-full h-full object-contain opacity-30 p-1" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)", fontWeight: a.is_read ? 400 : 700 }}>{buildDisplayName(a)}</p>
                  <p className="text-xs mt-0.5" style={{ color: a.is_read ? "#999" : "#4A4A4A", fontFamily: "var(--font-table)" }}>
                    {a.sex === "Male" ? "\u2642" : "\u2640"} {a.breeder ? `Breeder: ${a.breeder}` : ""} {a.country ? `\u2022 ${a.country}` : ""} {a.continent ? `(${a.continent})` : ""}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs" style={{ color: a.is_read ? "#999" : "#4A4A4A", fontFamily: "var(--font-mono)" }}>{new Date(a.date_posted).toLocaleDateString()}</p>
                  {a.country && <p className="text-xs mt-0.5" style={{ color: "#C9B29F", fontFamily: "var(--font-table)" }}>{"\ud83d\udccd"} {a.country}</p>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
