"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getDogColor } from "@/app/utils/colors";

interface TitleAlert {
  id: number;
  name: string;
  prefix: string;
  suffix_wins: string;
  suffix_losses: string;
  suffix_draws: string;
  suffix_honors: string;
  breeder: string;
  owner: string;
  country: string;
  continent: string;
  sex: string;
  date_posted: string;
  photo_path: string;
  creator_username: string;
  is_read: number;
  last_modified: string;
}

export default function NewTitleAlertsPage() {
  const [alerts, setAlerts] = useState<TitleAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [filterContinent, setFilterContinent] = useState("");
  const [filterCountry, setFilterCountry] = useState("");
  const [filterTime, setFilterTime] = useState("");
  const [view, setView] = useState<"grid" | "table">("grid");
  const [page, setPage] = useState(1);
  const perPage = 20;

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

  const buildDisplayName = (a: TitleAlert) => {
    let name = a.name;
    if (a.prefix && a.prefix !== "None") name = a.prefix + " " + name;
    const parts: string[] = [];
    if (a.suffix_wins && a.suffix_wins !== "0" && a.suffix_wins !== "") parts.push(a.suffix_wins);
    if (a.suffix_losses && a.suffix_losses !== "0" && a.suffix_losses !== "") parts.push(a.suffix_losses);
    if (a.suffix_draws && a.suffix_draws !== "0" && a.suffix_draws !== "") parts.push(a.suffix_draws);
    if (a.suffix_honors && a.suffix_honors !== "0" && a.suffix_honors !== "") parts.push(a.suffix_honors);
    if (parts.length > 0) name += " " + parts.join(" ");
    return name;
  };

  // Filter
  let filtered = alerts;
  if (search.trim()) {
    const q = search.toUpperCase();
    filtered = filtered.filter(a =>
      buildDisplayName(a).toUpperCase().includes(q) ||
      (a.breeder || "").toUpperCase().includes(q) ||
      (a.country || "").toUpperCase().includes(q) ||
      (a.creator_username || "").toUpperCase().includes(q)
    );
  }
  if (filterContinent) {
    filtered = filtered.filter(a => a.continent?.toUpperCase() === filterContinent.toUpperCase());
  }
  if (filterCountry) {
    filtered = filtered.filter(a => a.country?.toUpperCase() === filterCountry.toUpperCase());
  }
  if (filterTime === "week") {
    filtered = filtered.filter(a => Date.now() - new Date(a.last_modified || a.date_posted).getTime() < 7 * 24 * 60 * 60 * 1000);
  } else if (filterTime === "month") {
    filtered = filtered.filter(a => Date.now() - new Date(a.last_modified || a.date_posted).getTime() < 30 * 24 * 60 * 60 * 1000);
  }

  // Sort
  if (sort === "oldest") {
    filtered = [...filtered].sort((a, b) => new Date(a.date_posted).getTime() - new Date(b.date_posted).getTime());
  } else {
    filtered = [...filtered].sort((a, b) => new Date(b.date_posted).getTime() - new Date(a.date_posted).getTime());
  }

  // Pagination
  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);
  const continents = [...new Set(alerts.map(a => a.continent).filter(Boolean))].sort();
  const countries = [...new Set(alerts.filter(a => !filterContinent || a.continent?.toUpperCase() === filterContinent.toUpperCase()).map(a => a.country).filter(Boolean))].sort();

  return (
    <div className="min-h-screen" style={{ background: "#EDE4D5" }}>
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-widest" style={{ fontFamily: "var(--font-table)", color: "#1C1C1C" }}>
              New Title Alerts
            </h1>
            <p className="text-xs mt-1" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>
              Recently announced dogs from breeders worldwide &bull; {filtered.length} alerts
            </p>
          </div>
          <Link href="/dashboard/new-title-map" className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all hover:scale-105" style={{ background: "#1C1C1C", color: "#FAF7F2", fontFamily: "var(--font-table)", border: "2px solid #C9B29F", textDecoration: "none" }}>
            View World Map
          </Link>
        </div>

        {/* Search + Sort + Filters + View Toggle */}
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search by name, breeder, country..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full rounded-lg px-4 py-2 text-xs outline-none"
              style={{ background: "#FAF7F2", border: "2px solid #C9B29F", color: "#1C1C1C", fontFamily: "var(--font-table)" }}
            />
          </div>
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            className="rounded-lg px-3 py-2 text-xs outline-none"
            style={{ background: "#FAF7F2", border: "2px solid #C9B29F", color: "#1C1C1C", fontFamily: "var(--font-table)" }}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-3 py-2 rounded-lg text-xs font-bold transition-all"
            style={{ background: showFilters ? "#1C1C1C" : "#FAF7F2", color: showFilters ? "#FAF7F2" : "#1C1C1C", border: "2px solid #C9B29F", fontFamily: "var(--font-table)" }}
          >
            Filters
          </button>
          <div className="flex rounded-lg overflow-hidden" style={{ border: "2px solid #C9B29F" }}>
            <button onClick={() => setView("grid")} className="px-3 py-1.5 text-xs font-bold" style={{ background: view === "grid" ? "#1C1C1C" : "#FAF7F2", color: view === "grid" ? "#FAF7F2" : "#1C1C1C", fontFamily: "var(--font-table)" }}>Grid</button>
            <button onClick={() => setView("table")} className="px-3 py-1.5 text-xs font-bold" style={{ background: view === "table" ? "#1C1C1C" : "#FAF7F2", color: view === "table" ? "#FAF7F2" : "#1C1C1C", fontFamily: "var(--font-table)" }}>Table</button>
          </div>
        </div>

        {/* Filter Dropdowns (toggle) */}
        {showFilters && (
          <div className="rounded-lg p-4 mb-4 flex flex-wrap items-end gap-4" style={{ background: "#FAF7F2", border: "2px solid #C9B29F", borderRadius: "8px" }}>
            <div>
              <label className="block text-[12px] uppercase tracking-widest font-bold mb-1" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>Continent</label>
              <select
                value={filterContinent}
                onChange={e => { setFilterContinent(e.target.value); setFilterCountry(""); setPage(1); }}
                className="rounded-lg px-3 py-2 text-xs outline-none min-w-[180px]"
                style={{ background: "#FAFAFA", border: "2px solid #C9B29F", color: "#1C1C1C", fontFamily: "var(--font-table)" }}
              >
                <option value="">All Continents</option>
                {continents.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[12px] uppercase tracking-widest font-bold mb-1" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>Country</label>
              <select
                value={filterCountry}
                onChange={e => { setFilterCountry(e.target.value); setPage(1); }}
                className="rounded-lg px-3 py-2 text-xs outline-none min-w-[180px]"
                style={{ background: "#FAFAFA", border: "2px solid #C9B29F", color: "#1C1C1C", fontFamily: "var(--font-table)" }}
              >
                <option value="">All Countries</option>
                {countries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[12px] uppercase tracking-widest font-bold mb-1" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>Time</label>
              <select
                value={filterTime}
                onChange={e => { setFilterTime(e.target.value); setPage(1); }}
                className="rounded-lg px-3 py-2 text-xs outline-none min-w-[140px]"
                style={{ background: "#FAFAFA", border: "2px solid #C9B29F", color: "#1C1C1C", fontFamily: "var(--font-table)" }}
              >
                <option value="">All Time</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
            <button
              onClick={() => { setFilterContinent(""); setFilterCountry(""); setFilterTime(""); setPage(1); }}
              className="px-3 py-2 rounded-lg text-xs font-bold transition-all hover:scale-105"
              style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "2px solid rgba(239,68,68,0.3)", fontFamily: "var(--font-table)" }}
            >
              Clear all
            </button>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#C9B29F", borderTopColor: "transparent" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <img src="/logo.png" alt="Pedigree Platform" className="mx-auto mb-4 opacity-30" style={{ width: "64px", height: "64px" }} />
            <p className="text-sm font-bold" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>No title alerts</p>
            <p className="text-xs mt-1" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>Dogs published with &quot;Show in Dashboard Alerts&quot; will appear here for 30 days</p>
          </div>
        ) : view === "table" ? (
          /* Table View */
          <div className="rounded-lg overflow-hidden" style={{ border: "2px solid #C9B29F" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#1C1C1C", borderBottom: "2px solid #C9B29F" }}>
                  <th className="text-left px-3 py-2 text-[12px] uppercase tracking-wider font-bold" style={{ color: "#FAF7F2", fontFamily: "var(--font-table)" }}>Dog Name</th>
                  <th className="text-left px-3 py-2 text-[12px] uppercase tracking-wider font-bold" style={{ color: "#FAF7F2", fontFamily: "var(--font-table)" }}>Sex</th>
                  <th className="text-left px-3 py-2 text-[12px] uppercase tracking-wider font-bold hidden md:table-cell" style={{ color: "#FAF7F2", fontFamily: "var(--font-table)" }}>Breeder</th>
                  <th className="text-left px-3 py-2 text-[12px] uppercase tracking-wider font-bold hidden md:table-cell" style={{ color: "#FAF7F2", fontFamily: "var(--font-table)" }}>Country</th>
                  <th className="text-left px-3 py-2 text-[12px] uppercase tracking-wider font-bold hidden lg:table-cell" style={{ color: "#FAF7F2", fontFamily: "var(--font-table)" }}>Creator</th>
                  <th className="text-left px-3 py-2 text-[12px] uppercase tracking-wider font-bold" style={{ color: "#FAF7F2", fontFamily: "var(--font-table)" }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(a => {
                  const displayName = buildDisplayName(a);
                  const isMale = a.sex?.toUpperCase() === "MALE";
                  return (
                    <tr key={a.id} className="transition-colors" style={{ borderBottom: "2px solid #C9B29F" }}>
                      <td className="px-3 py-2">
                        <Link href={`/pedigree/custom/${a.id}`} onClick={() => markRead(a.id)} className="font-bold hover:underline text-[12px]" style={{ color: getDogColor(displayName), fontFamily: "var(--font-table)" }}>
                          {displayName}
                        </Link>
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-xs" style={{ color: isMale ? "#1d5bbf" : "#9f1239" }}>{isMale ? "\u2642" : "\u2640"}</span>
                      </td>
                      <td className="px-3 py-2 hidden md:table-cell text-xs" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>{a.breeder || "\u2014"}</td>
                      <td className="px-3 py-2 hidden md:table-cell text-xs" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>{a.country || a.continent || "\u2014"}</td>
                      <td className="px-3 py-2 hidden lg:table-cell text-xs" style={{ color: "#1d5bbf", fontFamily: "var(--font-table)" }}>{a.creator_username || "\u2014"}</td>
                      <td className="px-3 py-2 text-xs" style={{ color: "#4A4A4A", fontFamily: "var(--font-mono)" }}>{new Date(a.date_posted).toLocaleDateString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Grid View - Compact Cards */
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {paginated.map(a => {
              const displayName = buildDisplayName(a);
              const isMale = a.sex?.toUpperCase() === "MALE";
              return (
                <Link key={a.id} href={`/pedigree/custom/${a.id}`} onClick={() => markRead(a.id)} className="rounded-lg overflow-hidden transition-all hover:scale-[1.02]" style={{ background: "#FAF7F2", border: "2px solid #C9B29F", borderRadius: "8px", textDecoration: "none" }}>
                  {/* Creator badge */}
                  <div className="px-2 pt-2 pb-1 flex items-center justify-between">
                    {a.creator_username && (
                      <span className="text-[12px] font-bold" style={{ color: "#1d5bbf", fontFamily: "var(--font-table)" }}>{a.creator_username}</span>
                    )}
                    <span className="text-[12px] font-medium" style={{ color: "#1C1C1C", fontFamily: "var(--font-mono)" }}>{new Date(a.date_posted).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>
                  {/* Dog Name */}
                  <div className="px-2 pb-1">
                    <p className="text-sm font-bold truncate" style={{ color: getDogColor(displayName), fontFamily: "var(--font-table)" }}>{displayName}</p>
                    <span className="text-[12px]" style={{ color: isMale ? "#1d5bbf" : "#9f1239" }}>{isMale ? "♂" : "♀"}</span>
                    {a.country && <span className="text-[12px] ml-1 font-medium" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>· {a.country}</span>}
                  </div>
                  {/* Breeder/Owner */}
                  <div className="px-2 pb-2 flex flex-wrap gap-1">
                    {a.breeder && (
                      <span className="text-[12px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(201,178,159,0.2)", color: "#4A4A4A", fontFamily: "var(--font-table)" }}>B: {a.breeder}</span>
                    )}
                    {a.owner && (
                      <span className="text-[12px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(201,178,159,0.2)", color: "#4A4A4A", fontFamily: "var(--font-table)" }}>O: {a.owner}</span>
                    )}
                  </div>
                  {/* View Pedigree */}
                  <div className="px-2 pb-2">
                    <span className="text-[12px] font-bold" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)", border: "2px solid #C9B29F", borderRadius: "8px", padding: "3px 8px" }}>View Pedigree</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: page === 1 ? "#EDE4D5" : "#1C1C1C", color: page === 1 ? "#4A4A4A" : "#FAF7F2", border: "2px solid #C9B29F", fontFamily: "var(--font-table)", cursor: page === 1 ? "default" : "pointer" }}>{"\u2190"} Prev</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)} className="w-8 h-8 rounded-lg text-xs font-bold" style={{ background: page === p ? "#1C1C1C" : "#FAF7F2", color: page === p ? "#FAF7F2" : "#1C1C1C", border: "2px solid #C9B29F", fontFamily: "var(--font-table)" }}>{p}</button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: page === totalPages ? "#EDE4D5" : "#1C1C1C", color: page === totalPages ? "#4A4A4A" : "#FAF7F2", border: "2px solid #C9B29F", fontFamily: "var(--font-table)", cursor: page === totalPages ? "default" : "pointer" }}>Next {"\u2192"}</button>
          </div>
        )}
      </div>
    </div>
  );
}
