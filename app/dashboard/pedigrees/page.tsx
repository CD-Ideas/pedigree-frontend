"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getDogColor } from "@/app/utils/colors";

const LOGO = "/logo.png";
const PER_PAGE = 24;

type SortOption = "newest" | "oldest" | "most_viewed" | "az" | "za";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "most_viewed", label: "Most Viewed" },
  { value: "az", label: "A → Z" },
  { value: "za", label: "Z → A" },
];

const COUNTRY_MAP: Record<string, string[]> = {
  "North America": ["United States", "Canada", "Mexico", "Antigua and Barbuda", "Bahamas", "Barbados", "Belize", "Cuba", "Dominica", "Dominican Republic", "Grenada", "Guatemala", "Haiti", "Honduras", "Jamaica", "El Salvador", "Costa Rica", "Nicaragua", "Panama", "Puerto Rico", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Trinidad and Tobago"],
  "South America": ["Brazil", "Argentina", "Colombia", "Chile", "Peru", "Venezuela", "Ecuador", "Uruguay", "Paraguay", "Bolivia"],
  "Europe": ["United Kingdom", "Ireland", "Spain", "Portugal", "France", "Germany", "Italy", "Netherlands", "Belgium", "Sweden", "Denmark", "Norway", "Finland", "Poland", "Romania", "Hungary", "Czech Republic", "Greece", "Croatia", "Serbia", "Bulgaria", "Albania", "Russia", "Ukraine", "Turkey"],
  "Asia": ["Philippines", "Japan", "South Korea", "China", "Thailand", "Indonesia", "Vietnam", "India", "Pakistan", "Iran", "Iraq", "Israel", "Saudi Arabia", "UAE", "Malaysia", "Singapore", "Taiwan"],
  "Africa": ["South Africa", "Nigeria", "Kenya", "Egypt", "Morocco", "Ghana", "Tanzania", "Ethiopia", "Cameroon", "Algeria"],
  "Oceania": ["Australia", "New Zealand", "Fiji", "Papua New Guinea"],
};

const ALL_CONTINENTS = Object.keys(COUNTRY_MAP);
const ALL_COUNTRIES = Object.values(COUNTRY_MAP).flat().sort();

interface PedigreeItem {
  id: number;
  name: string;
  prefix: string;
  suffix_wins: string;
  suffix_losses: string;
  suffix_draws: string;
  suffix_honors: string;
  dob: string;
  sex: string;
  color: string;
  continent: string;
  country: string;
  breeder: string;
  owner: string;
  conditioned_weight: string;
  photo_path: string;
  view_count: number;
  date_posted: string;
  last_modified: string;
  journal_json: string;
}

interface WormingEntry {
  type: string;
  otherType: string;
  dateWormed: string;
  nextDue: string;
  intervalDays: number;
  remindMe: boolean;
}

interface JournalData {
  rabiesDate: string;
  rabiesNextDue: string;
  avidChip: string;
  vaccines: { name: string; checked: boolean; date: string }[];
  worming: WormingEntry[];
  notes: string;
}

function buildDisplayName(p: PedigreeItem): string {
  const parts: string[] = [];
  if (p.prefix) parts.push(p.prefix);
  parts.push(p.name);
  const suffixes: string[] = [];
  if (p.suffix_wins) suffixes.push(`(${p.suffix_wins})`);
  if (p.suffix_losses) suffixes.push(`(${p.suffix_losses})`);
  if (p.suffix_draws) suffixes.push(`(${p.suffix_draws})`);
  if (p.suffix_honors) suffixes.push(p.suffix_honors);
  if (suffixes.length) parts.push(suffixes.join(" "));
  return parts.join(" ");
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch (_e) { return iso; }
}

function daysUntil(iso: string): number | null {
  if (!iso) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(iso + "T00:00:00");
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getUpcomingReminders(journal: JournalData): { label: string; dueDate: string; daysLeft: number }[] {
  const reminders: { label: string; dueDate: string; daysLeft: number }[] = [];

  // Rabies
  if (journal.rabiesNextDue) {
    const days = daysUntil(journal.rabiesNextDue);
    if (days !== null && days <= 30) {
      reminders.push({ label: "Rabies", dueDate: journal.rabiesNextDue, daysLeft: days });
    }
  }

  // Worming entries with remindMe
  for (const entry of journal.worming || []) {
    if (entry.remindMe && entry.nextDue) {
      const days = daysUntil(entry.nextDue);
      if (days !== null && days <= 14) {
        const typeName = entry.type === "Other" ? entry.otherType || "Worming" : entry.type;
        reminders.push({ label: typeName, dueDate: entry.nextDue, daysLeft: days });
      }
    }
  }

  return reminders.sort((a, b) => a.daysLeft - b.daysLeft);
}

export default function MyPedigreesPage() {
  const router = useRouter();
  const [pedigrees, setPedigrees] = useState<PedigreeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: number; username: string } | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");
  const [page, setPage] = useState(1);
  const [filterContinent, setFilterContinent] = useState("");
  const [filterCountry, setFilterCountry] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [sexFilter, setSexFilter] = useState("");
  const [hasPhotoFilter, setHasPhotoFilter] = useState(false);

  useEffect(() => {
    try {
      const token = localStorage.getItem("token");
      const userStr = localStorage.getItem("user");
      if (!token || !userStr) {
        router.replace("/login");
        return;
      }
      const u = JSON.parse(userStr);
      setUser(u);

      fetch(`/api/pedigrees/my?userId=${u.id}`)
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setPedigrees(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } catch (_e) {
      router.replace("/login");
    }
  }, [router]);

  const parseJournal = (json: string): JournalData => {
    try { return JSON.parse(json || "{}"); }
    catch { return { rabiesDate: "", rabiesNextDue: "", avidChip: "", vaccines: [], worming: [], notes: "" }; }
  };

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, sort, filterContinent, filterCountry, sexFilter, hasPhotoFilter]);

  // Get available countries based on continent selection
  const availableCountries = filterContinent
    ? COUNTRY_MAP[filterContinent] || []
    : ALL_COUNTRIES;

  const activeFilters = [filterContinent, filterCountry, sexFilter, hasPhotoFilter].filter(Boolean).length;

  const clearFilters = () => {
    setFilterContinent("");
    setFilterCountry("");
    setSexFilter("");
    setHasPhotoFilter(false);
  };

  // Filter and sort
  const filtered = pedigrees
    .filter((p) => {
      if (search.trim()) {
        const q = search.toUpperCase();
        const display = buildDisplayName(p).toUpperCase();
        if (
          !display.includes(q) &&
          !(p.country || "").toUpperCase().includes(q) &&
          !(p.breeder || "").toUpperCase().includes(q)
        ) return false;
      }
      // Continent filter
      if (filterContinent && p.continent !== filterContinent) return false;
      // Country filter
      if (filterCountry && p.country !== filterCountry) return false;
      // Sex filter
      if (sexFilter && (p.sex || "").toUpperCase() !== sexFilter) return false;
      // Has photo filter
      if (hasPhotoFilter && !p.photo_path) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sort) {
        case "newest": return new Date(b.date_posted).getTime() - new Date(a.date_posted).getTime();
        case "oldest": return new Date(a.date_posted).getTime() - new Date(b.date_posted).getTime();
        case "most_viewed": return (b.view_count || 0) - (a.view_count || 0);
        case "az": return buildDisplayName(a).localeCompare(buildDisplayName(b));
        case "za": return buildDisplayName(b).localeCompare(buildDisplayName(a));
        default: return 0;
      }
    });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // Gather all reminders across all pedigrees
  const allReminders: { dogName: string; pedId: number; label: string; dueDate: string; daysLeft: number }[] = [];
  for (const p of pedigrees) {
    const journal = parseJournal(p.journal_json);
    const reminders = getUpcomingReminders(journal);
    for (const r of reminders) {
      allReminders.push({ dogName: buildDisplayName(p), pedId: p.id, ...r });
    }
  }

  return (
    <div className="min-h-screen" style={{ background: "#EDE4D5" }}>
      <style>{`
        @keyframes cardReveal {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-widest"
              style={{
                fontFamily: "var(--font-table)",
                color: "#1C1C1C",
              }}>
              My Pedigrees
            </h1>
            <p className="text-xs mt-1" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>
              Manage your published pedigrees and journals
            </p>
          </div>

        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-4">
          <span
            className="text-[12px] px-3 py-1 rounded-full"
            style={{
              background: "rgba(201,178,159,0.1)",
              color: "#1C1C1C",
              border: "2px solid #C9B29F",
              fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
            }}
          >
            {pedigrees.length} Published
          </span>
          <Link
            href="/pedigree-lab"
            className="text-[12px] px-3 py-1 rounded-full transition-all hover:scale-105"
            style={{
              background: "rgba(184,134,11,0.25)",
              color: "#8a6518",
              border: "2px solid #B8860B",
              fontFamily: "var(--font-table)",
              fontWeight: 700,
            }}
          >
            🧪 Pedigree Lab →
          </Link>
          {(search.trim() || filterContinent || filterCountry || sexFilter || hasPhotoFilter) && (
            <span
              className="text-[12px] px-3 py-1 rounded-full"
              style={{
                background: "rgba(96,165,250,0.1)",
                color: "#1d5bbf",
                border: "1px solid rgba(96,165,250,0.2)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {filtered.length} Found
            </span>
          )}
        </div>

        {/* Search + Filter Toggle */}
        <div className="flex gap-2">
          <div className="flex-1 relative" style={{ maxWidth: "420px" }}>
            <input
              type="text"
              placeholder="Search by name, country, breeder..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-xs outline-none transition-all"
              style={{
                background: "#FAFAFA",
                border: "2px solid #C9B29F",
                color: "#1C1C1C",
                fontFamily: "var(--font-table)",
              }}
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs" style={{ color: "#4A4A4A" }}>🔍</span>
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="rounded-lg px-3 text-[12px] outline-none cursor-pointer"
            style={{
              background: "#FAF7F2",
              border: "2px solid #C9B29F",
              color: "#1C1C1C",
              fontFamily: "var(--font-table)",
              height: "34px",
            }}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-3 py-2 rounded-lg text-xs font-medium relative transition-colors"
            style={{
              background: showFilters ? "rgba(201,178,159,0.2)" : "#FAFAFA",
              border: "2px solid #C9B29F",
              color: "#1C1C1C",
            }}
          >
            Filters
            {activeFilters > 0 && (
              <span
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[12px] font-bold"
                style={{ background: "#C9B29F", color: "#1C1C1C" }}
              >
                {activeFilters}
              </span>
            )}
          </button>
          <div className="flex rounded-lg overflow-hidden" style={{ border: "2px solid #C9B29F", background: "#FAF7F2" }}>
            <button onClick={() => { setViewMode("grid"); setPage(1); }} className="px-3 py-1.5 text-xs font-medium transition-all" style={{ background: viewMode === "grid" ? "rgba(201,178,159,0.25)" : "transparent", color: viewMode === "grid" ? "#1C1C1C" : "#4A4A4A", fontFamily: "var(--font-table)" }}>Grid</button>
            <button onClick={() => { setViewMode("table"); setPage(1); }} className="px-3 py-1.5 text-xs font-medium transition-all" style={{ background: viewMode === "table" ? "rgba(201,178,159,0.25)" : "transparent", color: viewMode === "table" ? "#1C1C1C" : "#4A4A4A", fontFamily: "var(--font-table)" }}>Table</button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div
            style={{
              background: "#FAF7F2",
              border: "2px solid #C9B29F",
              borderRadius: "8px",
            }}
            className="p-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
              <div>
                <label className="text-[12px] uppercase tracking-wider mb-1.5 block" style={{ color: "#4A4A4A" }}>Continent</label>
                <select
                  value={filterContinent}
                  onChange={(e) => { setFilterContinent(e.target.value); setFilterCountry(""); setPage(1); }}
                  className="w-full rounded-lg px-3 py-1.5 text-xs"
                  style={{ background: "#FAFAFA", border: "2px solid #C9B29F", color: "#1C1C1C" }}
                >
                  <option value="">All</option>
                  {ALL_CONTINENTS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[12px] uppercase tracking-wider mb-1.5 block" style={{ color: "#4A4A4A" }}>Country</label>
                <select
                  value={filterCountry}
                  onChange={(e) => { setFilterCountry(e.target.value); setPage(1); }}
                  className="w-full rounded-lg px-3 py-1.5 text-xs"
                  style={{ background: "#FAFAFA", border: "2px solid #C9B29F", color: "#1C1C1C" }}
                >
                  <option value="">All</option>
                  {availableCountries.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[12px] uppercase tracking-wider mb-1.5 block" style={{ color: "#4A4A4A" }}>Sex</label>
                <select
                  value={sexFilter}
                  onChange={(e) => { setSexFilter(e.target.value); setPage(1); }}
                  className="w-full rounded-lg px-3 py-1.5 text-xs"
                  style={{ background: "#FAFAFA", border: "2px solid #C9B29F", color: "#1C1C1C" }}
                >
                  <option value="">All</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-xs cursor-pointer select-none" style={{ color: "#1C1C1C" }}>
                  <input
                    type="checkbox"
                    checked={hasPhotoFilter}
                    onChange={(e) => { setHasPhotoFilter(e.target.checked); setPage(1); }}
                    className="accent-[#C9B29F]"
                  />
                  Has photo
                </label>
              </div>
              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                  style={{ color: "#c02828", background: "rgba(192,40,40,0.08)", border: "2px solid rgba(192,40,40,0.2)" }}
                >
                  Clear all
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reminders Banner */}
        {allReminders.length > 0 && (
          <div className="rounded-lg p-4" style={{
            background: "linear-gradient(135deg, rgba(234,179,8,0.08), rgba(234,179,8,0.03), #FAFAFA)",
            border: "2px solid rgba(234,179,8,0.3)",
          }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm">🔔</span>
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#eab308", fontFamily: "var(--font-table)" }}>
                Upcoming Reminders
              </span>
            </div>
            <div className="space-y-2">
              {allReminders.map((r, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2"
                  style={{ background: "rgba(201,178,159,0.15)", border: "1px solid rgba(234,179,8,0.15)" }}>
                  <div className="flex items-center gap-2">
                    <Link href={`/pedigree/custom/${r.pedId}`} className="text-xs font-bold hover:underline"
                      style={{ color: getDogColor(r.dogName), fontFamily: "var(--font-table)" }}>
                      {r.dogName}
                    </Link>
                    <span className="text-[12px]" style={{ color: "#4A4A4A" }}>—</span>
                    <span className="text-xs" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>{r.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px]" style={{ color: "#1C1C1C", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>
                      {formatDate(r.dueDate)}
                    </span>
                    <span className="text-[12px] px-1.5 py-0.5 rounded-full font-bold"
                      style={{
                        background: r.daysLeft <= 0 ? "rgba(220,38,38,0.2)" : r.daysLeft <= 3 ? "rgba(234,179,8,0.2)" : "rgba(34,197,94,0.15)",
                        color: r.daysLeft <= 0 ? "#fc8181" : r.daysLeft <= 3 ? "#eab308" : "#22c55e",
                        fontFamily: "var(--font-mono)",
                        border: `1px solid ${r.daysLeft <= 0 ? "rgba(220,38,38,0.3)" : r.daysLeft <= 3 ? "rgba(234,179,8,0.3)" : "rgba(34,197,94,0.3)"}`,
                      }}>
                      {r.daysLeft <= 0 ? "OVERDUE" : r.daysLeft === 1 ? "Tomorrow" : `${r.daysLeft}d`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pedigree Cards */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-3" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>
              <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#C9B29F", borderTopColor: "transparent" }} />
              Loading your pedigrees...
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4 opacity-30">🐕</div>
            <p className="text-sm mb-2" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>
              {search.trim()
                ? "No pedigrees match your search"
                : "No pedigrees published yet"}
            </p>
            {!search.trim() && (
              <Link href="/pedigree-lab" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all hover:scale-105 mt-4"
                style={{
                  background: "#1C1C1C",
                  color: "#FAFAFA", fontFamily: "var(--font-table)",
                }}>
                + Create Your First Pedigree
              </Link>
            )}
          </div>
        ) : (
          <>
          {viewMode === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {paginated.map((p, index) => {
              const displayName = buildDisplayName(p);
              const titleColor = getDogColor(displayName);
              const isMale = p.sex === "Male" || p.sex === "MALE" || p.sex === "M";
              const journal = parseJournal(p.journal_json);
              const reminders = getUpcomingReminders(journal);

              return (
                <Link key={p.id} href={`/pedigree/custom/${p.id}`}
                  className="rounded-lg overflow-hidden transition-all hover:scale-[1.02] group"
                  style={{
                    background: "#FAF7F2",
                    border: "2px solid #C9B29F",
                    borderRadius: "8px",
                    animation: "cardReveal 0.4s ease both",
                    animationDelay: `${index * 30}ms`,
                  }}>
                  {/* Photo area */}
                  <div
                    className="h-20 relative"
                    style={{
                      background: p.photo_path
                        ? `url(${p.photo_path}) center/cover`
                        : `linear-gradient(135deg, ${titleColor}15, #FAF7F2)`,
                    }}
                  >
                    {/* View count */}
                    <div
                      className="absolute top-1.5 right-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full"
                      style={{
                        background: "rgba(250,247,242,0.9)",
                        border: "1px solid #C9B29F",
                      }}
                    >
                      <span
                        className="text-[12px]"
                        style={{
                          color: "#1C1C1C",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        👁 {(p.view_count || 0).toLocaleString()}
                      </span>
                    </div>
                    {/* Reminders badge */}
                    {reminders.length > 0 && (
                      <div
                        className="absolute top-1.5 left-1.5 flex items-center px-1.5 py-0.5 rounded-full"
                        style={{
                          background: "rgba(234,179,8,0.2)",
                          border: "1px solid rgba(234,179,8,0.4)",
                        }}
                      >
                        <span
                          className="text-[12px] font-bold"
                          style={{
                            color: "#eab308",
                            fontFamily: "var(--font-table)",
                          }}
                        >
                          🔔 {reminders.length}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="px-2 py-1.5">
                    <p
                      className="text-[12px] font-bold truncate"
                      style={{
                        color: titleColor,
                        fontFamily: "var(--font-table)",
                      }}
                    >
                      {displayName}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span
                        className="text-[12px]"
                        style={{ color: isMale ? "#1d5bbf" : "#9f1239" }}
                      >
                        {isMale ? "♂" : "♀"}
                      </span>
                      {p.country && (
                        <span className="text-[12px]" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>
                          · {p.country}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[12px]" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>
                        {formatDate(p.date_posted)}
                      </span>
                      <span className="text-[12px]" style={{ color: "#4A4A4A", fontFamily: "var(--font-mono)" }}>
                        ID: <span style={{ color: "#1C1C1C" }}>{p.id}</span>
                      </span>
                    </div>
                    {/* Journal badges */}
                    {(journal.worming?.length > 0 || journal.vaccines?.some(v => v.checked)) && (
                      <div className="flex items-center gap-1 flex-wrap mt-1">
                        {journal.vaccines?.filter(v => v.checked).map(v => (
                          <span key={v.name} className="text-[12px] px-1 py-0.5 rounded-full"
                            style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)", fontFamily: "var(--font-table)" }}>
                            ✓ {v.name}
                          </span>
                        ))}
                        {journal.worming?.length > 0 && (
                          <span className="text-[12px] px-1 py-0.5 rounded-full"
                            style={{ background: "rgba(96,165,250,0.1)", color: "#1d5bbf", border: "1px solid rgba(96,165,250,0.2)", fontFamily: "var(--font-table)" }}>
                            💊 {journal.worming.length} worming
                          </span>
                        )}
                      </div>
                    )}
                    {/* Actions */}
                    <div className="flex items-center gap-1 mt-1.5">
                      <span
                        className="text-[12px] px-2 py-0.5 rounded-lg font-semibold transition-all group-hover:scale-105 inline-block"
                        style={{
                          background: "rgba(201,178,159,0.1)",
                          color: "#1C1C1C",
                          border: "2px solid #C9B29F",
                          fontFamily: "var(--font-table)",
                        }}
                      >
                        View
                      </span>
                      <span
                        className="text-[12px] px-2 py-0.5 rounded-lg font-semibold inline-block"
                        style={{
                          background: "rgba(34,197,94,0.1)",
                          color: "#22c55e",
                          border: "1px solid rgba(34,197,94,0.2)",
                          fontFamily: "var(--font-table)",
                        }}
                      >
                        ✎ Edit
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          ) : (
          /* Table View */
          <div
            style={{ border: "2px solid #C9B29F", background: "#FAF7F2", borderRadius: "8px" }}
            className="overflow-hidden"
          >
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#1C1C1C", borderBottom: "2px solid #C9B29F" }}>
                  <th className="text-left px-3 py-2 text-[12px] uppercase tracking-wider font-medium" style={{ color: "#FAF7F2", fontFamily: "var(--font-table)" }}>Dog Name</th>
                  <th className="text-left px-3 py-2 text-[12px] uppercase tracking-wider font-medium" style={{ color: "#FAF7F2", fontFamily: "var(--font-table)" }}>Sex</th>
                  <th className="text-left px-3 py-2 text-[12px] uppercase tracking-wider font-medium hidden md:table-cell" style={{ color: "#FAF7F2", fontFamily: "var(--font-table)" }}>Country</th>
                  <th className="text-left px-3 py-2 text-[12px] uppercase tracking-wider font-medium hidden md:table-cell" style={{ color: "#FAF7F2", fontFamily: "var(--font-table)" }}>Breeder</th>
                  <th className="text-left px-3 py-2 text-[12px] uppercase tracking-wider font-medium hidden lg:table-cell" style={{ color: "#FAF7F2", fontFamily: "var(--font-table)" }}>Owner</th>
                  <th className="text-left px-3 py-2 text-[12px] uppercase tracking-wider font-medium hidden lg:table-cell" style={{ color: "#FAF7F2", fontFamily: "var(--font-table)" }}>Date Posted</th>
                  <th className="text-left px-3 py-2 text-[12px] uppercase tracking-wider font-medium hidden md:table-cell" style={{ color: "#FAF7F2", fontFamily: "var(--font-table)" }}>Views</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((p) => {
                  const displayName = buildDisplayName(p);
                  const isMale = p.sex === "Male" || p.sex === "MALE" || p.sex === "M";
                  return (
                    <tr key={p.id} className="transition-colors" style={{ borderBottom: "1px solid #C9B29F" }}>
                      <td className="px-3 py-2">
                        <Link href={`/pedigree/custom/${p.id}`} className="font-bold hover:underline text-[12px]" style={{ color: getDogColor(displayName), fontFamily: "var(--font-table)" }}>
                          {displayName}
                        </Link>
                        <div className="text-[12px]" style={{ color: "#4A4A4A", fontFamily: "var(--font-mono)" }}>
                          ID: {p.id}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold"
                          style={{
                            background: isMale ? "rgba(29,91,191,0.1)" : "rgba(159,18,57,0.1)",
                            color: isMale ? "#1d5bbf" : "#9f1239",
                          }}
                        >
                          {isMale ? "♂" : "♀"}
                        </span>
                      </td>
                      <td className="px-3 py-2 hidden md:table-cell text-xs" style={{ color: "#4A4A4A" }}>
                        {p.country || "—"}
                      </td>
                      <td className="px-3 py-2 hidden md:table-cell text-xs" style={{ color: "#4A4A4A" }}>
                        {p.breeder || "—"}
                      </td>
                      <td className="px-3 py-2 hidden lg:table-cell text-xs" style={{ color: "#4A4A4A" }}>
                        {p.owner || "—"}
                      </td>
                      <td className="px-3 py-2 hidden lg:table-cell text-xs" style={{ color: "#4A4A4A", fontFamily: "var(--font-mono)" }}>
                        {formatDate(p.date_posted)}
                      </td>
                      <td className="px-3 py-2 hidden md:table-cell text-xs" style={{ color: "#4A4A4A", fontFamily: "var(--font-mono)" }}>
                        {(p.view_count || 0).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all"
                style={{
                  background: page === 1 ? "#EDE4D5" : "#FAF7F2",
                  border: "2px solid #C9B29F",
                  color: page === 1 ? "#4A4A4A" : "#1C1C1C",
                  fontFamily: "var(--font-table)",
                  cursor: page === 1 ? "not-allowed" : "pointer",
                  opacity: page === 1 ? 0.5 : 1,
                }}
              >
                ← Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                .map((p, idx, arr) => (
                  <span key={p}>
                    {idx > 0 && arr[idx - 1] !== p - 1 && (
                      <span className="text-[12px] px-1" style={{ color: "#4A4A4A" }}>…</span>
                    )}
                    <button
                      onClick={() => setPage(p)}
                      className="w-8 h-8 rounded-lg text-[12px] font-semibold transition-all"
                      style={{
                        background: page === p ? "#1C1C1C" : "#FAF7F2",
                        border: "2px solid #C9B29F",
                        color: page === p ? "#FAF7F2" : "#1C1C1C",
                        fontFamily: "var(--font-table)",
                      }}
                    >
                      {p}
                    </button>
                  </span>
                ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all"
                style={{
                  background: page === totalPages ? "#EDE4D5" : "#FAF7F2",
                  border: "2px solid #C9B29F",
                  color: page === totalPages ? "#4A4A4A" : "#1C1C1C",
                  fontFamily: "var(--font-table)",
                  cursor: page === totalPages ? "not-allowed" : "pointer",
                  opacity: page === totalPages ? 0.5 : 1,
                }}
              >
                Next →
              </button>
            </div>
          )}
          </>
        )}
      </div>
    </div>
  );
}
