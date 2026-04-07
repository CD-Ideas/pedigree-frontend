"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getDogColor } from "@/app/utils/colors";

/* ─── Types ─── */
interface SearchResult { dog_id: number; registered_name: string; photo_url: string | null }
interface SavedWhelping {
  id: number; dam_name: string; dam_id: number | null;
  breed_date_1: string; breed_date_2: string;
  earliest_due: string; expected_due: string; latest_due: string;
  note: string; date_saved: string; checklist_state?: string;
}

/* ─── Gestation milestones (days from breeding) ─── */
const MILESTONES = [
  { day: 7, label: "Fertilization", desc: "Eggs are fertilized in the oviduct" },
  { day: 14, label: "Embryos reach uterus", desc: "Embryos travel to the uterine horns" },
  { day: 21, label: "Implantation", desc: "Embryos implant into uterine wall. Morning sickness may begin" },
  { day: 25, label: "Heartbeat detectable", desc: "Fetal heartbeats can be detected via ultrasound" },
  { day: 28, label: "Ultrasound confirmation", desc: "Vet can confirm pregnancy and estimate litter size" },
  { day: 35, label: "Organ development", desc: "Organs are forming. Dam's appetite increases" },
  { day: 42, label: "Skeletal formation", desc: "Skeletons begin to calcify. X-ray becomes possible" },
  { day: 45, label: "X-ray recommended", desc: "Best time for X-ray to count puppies accurately" },
  { day: 49, label: "Puppies fully formed", desc: "Puppies have fur and are nearly fully developed" },
  { day: 56, label: "Nesting behavior", desc: "Dam starts nesting. Prepare whelping box" },
  { day: 58, label: "Temperature monitoring", desc: "Start taking temperature twice daily. Drop below 99°F signals labor within 24hrs" },
  { day: 63, label: "Expected due date", desc: "Average gestation is 63 days (range: 58-68 days)" },
];

/* ─── Whelping supply checklist ─── */
const CHECKLIST = [
  "Whelping box (clean, warm, draft-free)",
  "Clean towels and blankets",
  "Heating pad or heat lamp",
  "Bulb syringe (clear airways)",
  "Dental floss or hemostats (cord clamping)",
  "Scissors (sterilized, for cord cutting)",
  "Iodine solution (cord disinfection)",
  "Digital thermometer",
  "Puppy scale (gram scale)",
  "Puppy milk replacer (emergency)",
  "Vet emergency number on hand",
  "Notebook for recording birth times & weights",
];

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}
function formatDateISO(date: Date): string {
  return date.toISOString().split("T")[0];
}
function addDays(date: Date, days: number): Date {
  const d = new Date(date); d.setDate(d.getDate() + days); return d;
}
function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

const steelFrame = { background: "#FAF7F2", border: "2px solid #C9B29F", borderRadius: "8px" };

export default function WhelpingCalculatorPage() {
  const [breedDate, setBreedDate] = useState("");
  const [secondBreedDate, setSecondBreedDate] = useState("");
  const [calculated, setCalculated] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

  /* Dam search */
  const [damQuery, setDamQuery] = useState("");
  const [damResults, setDamResults] = useState<SearchResult[]>([]);
  const [damOpen, setDamOpen] = useState(false);
  const [selectedDam, setSelectedDam] = useState<{ id: number | null; name: string } | null>(null);
  const damRef = useRef<HTMLDivElement>(null);
  const damTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Save / My Whelping */
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [showMyWhelping, setShowMyWhelping] = useState(false);
  const [myWhelpings, setMyWhelpings] = useState<SavedWhelping[]>([]);
  const [loadingWhelpings, setLoadingWhelpings] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [viewingWhelping, setViewingWhelping] = useState<SavedWhelping | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewChecked, setViewChecked] = useState<Set<number>>(new Set());

  /* Get user on mount */
  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      if (u.id) setUserId(u.id);
    } catch (_) {}
  }, []);

  /* Handle ?view={id} query param — auto-open that whelping in view mode */
  useEffect(() => {
    if (!userId) return;
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const viewId = params.get("view");
    if (!viewId) return;
    (async () => {
      try {
        const res = await fetch(`/api/whelpings?userId=${userId}`);
        const data = await res.json();
        const list: SavedWhelping[] = data.whelpings || [];
        setMyWhelpings(list);
        const found = list.find((w) => w.id === parseInt(viewId, 10));
        if (found) {
          viewWhelping(found);
        }
      } catch (_) {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  /* Close dam dropdown on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (damRef.current && !damRef.current.contains(e.target as Node)) setDamOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* Dam search debounce */
  const searchDam = useCallback((q: string) => {
    if (damTimer.current) clearTimeout(damTimer.current);
    if (q.length < 2) { setDamResults([]); setDamOpen(false); return; }
    damTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/dogs/search?q=${encodeURIComponent(q)}&limit=8`);
        const data = await res.json();
        setDamResults(data.dogs || data.results || []);
        setDamOpen(true);
      } catch (_) {}
    }, 300);
  }, []);

  /* Load saved whelpings */
  const loadWhelpings = useCallback(async () => {
    if (!userId) return;
    setLoadingWhelpings(true);
    try {
      const res = await fetch(`/api/whelpings?userId=${userId}`);
      const data = await res.json();
      setMyWhelpings(data.whelpings || []);
    } catch (_) {}
    setLoadingWhelpings(false);
  }, [userId]);

  /* Save whelping (create new or update existing) */
  const handleSave = async () => {
    if (!userId || !breedDate || !calculated) return;
    const damName = selectedDam?.name || damQuery || "Unknown Dam";
    const breedingDate = new Date(breedDate + "T12:00:00");
    setSaving(true);
    setSaveMsg("");
    const payload = {
      userId,
      damName,
      damId: selectedDam?.id || null,
      breedDate1: breedDate,
      breedDate2: secondBreedDate || "",
      earliestDue: formatDateISO(addDays(breedingDate, 58)),
      expectedDue: formatDateISO(addDays(breedingDate, 63)),
      latestDue: formatDateISO(addDays(breedingDate, 68)),
      note,
      checklistState: JSON.stringify(Array.from(checkedItems)),
    };
    try {
      const res = await fetch("/api/whelpings", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { ...payload, id: editingId } : payload),
      });
      const data = await res.json();
      if (data.success) {
        setSaveMsg(editingId ? "Updated!" : "Saved!");
        setTimeout(() => setSaveMsg(""), 3000);
        // Reload list so it shows up immediately in My Whelping
        loadWhelpings();
      }
    } catch (_) {
      setSaveMsg("Error saving");
    }
    setSaving(false);
  };

  /* Delete whelping */
  const handleDelete = async (id: number) => {
    if (!userId) return;
    try {
      await fetch("/api/whelpings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, userId }),
      });
      setMyWhelpings((prev) => prev.filter((w) => w.id !== id));
    } catch (_) {}
  };

  /* View a saved whelping (read-only live tracker) */
  const viewWhelping = (w: SavedWhelping) => {
    setViewingWhelping(w);
    setShowMyWhelping(false);
    try {
      const parsed = w.checklist_state ? JSON.parse(w.checklist_state) : [];
      setViewChecked(new Set(parsed));
    } catch (_) { setViewChecked(new Set()); }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* Toggle checklist item in view mode + auto-save */
  const toggleViewCheck = async (idx: number) => {
    if (!viewingWhelping || !userId) return;
    const next = new Set(viewChecked);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setViewChecked(next);
    // Auto-save
    try {
      await fetch("/api/whelpings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: viewingWhelping.id,
          userId,
          checklistState: JSON.stringify(Array.from(next)),
        }),
      });
    } catch (_) {}
  };

  /* Edit a saved whelping (load into calculator) */
  const editWhelping = (w: SavedWhelping) => {
    setBreedDate(w.breed_date_1);
    setSecondBreedDate(w.breed_date_2 || "");
    setSelectedDam({ id: w.dam_id, name: w.dam_name });
    setDamQuery(w.dam_name);
    setNote(w.note || "");
    setCalculated(true);
    setViewingWhelping(null);
    setShowMyWhelping(false);
    setEditingId(w.id);
    // Load checklist state
    try {
      const parsed = w.checklist_state ? JSON.parse(w.checklist_state) : [];
      setCheckedItems(new Set(parsed));
    } catch (_) { setCheckedItems(new Set()); }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const breedingDate = breedDate ? new Date(breedDate + "T12:00:00") : null;
  const secondDate = secondBreedDate ? new Date(secondBreedDate + "T12:00:00") : null;
  const today = new Date(); today.setHours(12, 0, 0, 0);
  const dueDate = breedingDate ? addDays(breedingDate, 63) : null;
  const earlyDate = breedingDate ? addDays(breedingDate, 58) : null;
  const lateDate = breedingDate ? addDays(breedingDate, 68) : null;
  const daysPregnant = breedingDate ? daysBetween(breedingDate, today) : 0;
  const daysRemaining = dueDate ? daysBetween(today, dueDate) : 0;
  const progressPct = breedingDate ? Math.min(Math.max((daysPregnant / 63) * 100, 0), 100) : 0;
  const currentWeek = Math.ceil(daysPregnant / 7);
  const currentTrimester = daysPregnant <= 21 ? 1 : daysPregnant <= 42 ? 2 : 3;

  const toggleCheck = (idx: number) => {
    setCheckedItems((prev) => { const next = new Set(prev); if (next.has(idx)) next.delete(idx); else next.add(idx); return next; });
  };
  const handleCalculate = () => { if (breedDate) setCalculated(true); };
  const handleReset = () => {
    setBreedDate(""); setSecondBreedDate(""); setCalculated(false);
    setCheckedItems(new Set()); setSelectedDam(null); setDamQuery(""); setNote(""); setSaveMsg("");
    setEditingId(null);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* My Whelping button — own row, top right */}
      <div className="flex justify-end mb-3">
        <button
          onClick={() => { setShowMyWhelping(!showMyWhelping); setViewingWhelping(null); setEditingId(null); if (!showMyWhelping) loadWhelpings(); }}
          className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all hover:scale-105"
          style={{ background: showMyWhelping ? "#1C1C1C" : "#FAF7F2", color: showMyWhelping ? "#FAF7F2" : "#1C1C1C", border: "2px solid #C9B29F", fontFamily: "var(--font-table)", cursor: "pointer" }}>
          {showMyWhelping ? "Calculator" : "My Whelping"}
          {myWhelpings.length > 0 && !showMyWhelping && !viewingWhelping && (
            <span className="ml-2 px-1.5 py-0.5 rounded-full text-[12px]"
              style={{ background: "#C9B29F", color: "#FAFAFA", fontFamily: "var(--font-mono)" }}>
              {myWhelpings.length}
            </span>
          )}
        </button>
      </div>

      {/* Header — fully centered */}
      <div className="text-center mb-6">
        <h1 className="font-black" style={{ fontFamily: "var(--font-table)", fontSize: "1.6rem", fontWeight: 900, letterSpacing: "0.02em", color: "#1C1C1C" }}>
          WHELPING{" "}<span style={{ color: "#C9B29F" }}>CALCULATOR</span>
        </h1>
        <p className="text-xs max-w-xl mx-auto" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>
          Calculate due dates &amp; track pregnancy milestones. Enter your breeding date to estimate whelping day, monitor progress, and prepare supplies.
        </p>
      </div>

      {/* ═══ MY WHELPING LIST ═══ */}
      {showMyWhelping && (
        <div className="rounded-lg p-4 md:p-5 mb-5" style={steelFrame}>
          <h2 className="text-[12px] uppercase tracking-widest font-semibold mb-4"
            style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>
            My Whelping
          </h2>

          {loadingWhelpings && (
            <div className="text-center py-8">
              <div className="inline-flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                <span className="text-xs" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>Loading...</span>
              </div>
            </div>
          )}

          {!loadingWhelpings && myWhelpings.length === 0 && (
            <div className="text-center py-8">
              <p className="text-xs" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>
                No saved whelpings yet. Use the calculator and click &quot;Save This Whelping&quot; to save.
              </p>
            </div>
          )}

          {!loadingWhelpings && myWhelpings.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {myWhelpings.map((w, index) => {
                const expDate = new Date(w.expected_due + "T12:00:00");
                const bd = new Date(w.breed_date_1 + "T12:00:00");
                const dLeft = daysBetween(today, expDate);
                const dp = daysBetween(bd, today);
                const pct = Math.min(Math.max((dp / 63) * 100, 0), 100);
                const titleColor = getDogColor(w.dam_name);
                return (
                  <div key={w.id} onClick={() => viewWhelping(w)}
                    className="rounded-lg overflow-hidden transition-all hover:scale-[1.02] group cursor-pointer"
                    style={{
                      background: "#FAF7F2",
                      border: "2px solid #C9B29F",
                      borderRadius: "8px",
                      animation: "cardReveal 0.4s ease both",
                      animationDelay: `${index * 30}ms`,
                    }}>
                    {/* Top banner — due date */}
                    <div className="h-16 relative flex items-center justify-center"
                      style={{ background: `linear-gradient(135deg, ${titleColor}15, #FAF7F2)` }}>
                      <div className="text-center">
                        <p className="text-[12px] font-bold uppercase tracking-widest" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>Due</p>
                        <p className="text-xs font-bold" style={{ color: "#1C1C1C", fontFamily: "var(--font-mono)" }}>
                          {expDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      </div>
                      {/* Days left badge */}
                      <div className="absolute top-1.5 right-1.5 flex items-center px-1.5 py-0.5 rounded-full"
                        style={{ background: "rgba(250,247,242,0.95)", border: "2px solid #C9B29F" }}>
                        <span className="text-[12px] font-bold"
                          style={{ color: dLeft > 0 ? "#1C1C1C" : dLeft === 0 ? "#22c55e" : "#ef4444", fontFamily: "var(--font-mono)" }}>
                          {dLeft > 0 ? `${dLeft}d` : dLeft === 0 ? "Today" : "Past"}
                        </span>
                      </div>
                      {/* Delete button — always visible */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(w.id); }}
                        className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full flex items-center justify-center transition-all hover:scale-110"
                        style={{ background: "#FAFAFA", border: "2px solid #ef4444", color: "#ef4444", fontFamily: "var(--font-table)", fontSize: "12px", fontWeight: 900, lineHeight: 1 }}
                        title="Delete">
                        ×
                      </button>
                    </div>

                    {/* Details */}
                    <div className="px-2 py-1.5">
                      <p className="text-[12px] font-bold truncate" style={{ color: titleColor, fontFamily: "var(--font-table)" }}>
                        {w.dam_name}
                      </p>
                      <p className="text-[12px] mt-0.5" style={{ color: "#4A4A4A", fontFamily: "var(--font-mono)" }}>
                        Bred: {w.breed_date_1}
                      </p>
                      {w.note && (
                        <p className="text-[12px] mt-0.5 truncate" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>
                          {w.note}
                        </p>
                      )}
                      {/* Mini progress bar */}
                      <div className="relative h-1.5 rounded-full overflow-hidden mt-1" style={{ background: "#EDE4D5" }}>
                        <div className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            background: pct >= 100 ? "#22c55e" : pct >= 85 ? "#f59e0b" : "#C9B29F",
                          }} />
                      </div>
                      <p className="text-[12px] mt-0.5 text-center" style={{ color: "#4A4A4A", fontFamily: "var(--font-mono)" }}>
                        Day {Math.max(0, dp)}/63
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══ VIEW MODE (read-only live tracker) ═══ */}
      {viewingWhelping && !showMyWhelping && (() => {
        const w = viewingWhelping;
        const bd = new Date(w.breed_date_1 + "T12:00:00");
        const sd = w.breed_date_2 ? new Date(w.breed_date_2 + "T12:00:00") : null;
        const exp = new Date(w.expected_due + "T12:00:00");
        const early = new Date(w.earliest_due + "T12:00:00");
        const late = new Date(w.latest_due + "T12:00:00");
        const dp = daysBetween(bd, today);
        const dLeft = daysBetween(today, exp);
        const pct = Math.min(Math.max((dp / 63) * 100, 0), 100);
        const wk = Math.ceil(dp / 7);
        const tri = dp <= 21 ? 1 : dp <= 42 ? 2 : 3;
        const damHref = w.dam_id ? (w.dam_id >= 10000000 ? `/pedigree/custom/${w.dam_id - 10000000}` : `/pedigree/${w.dam_id}`) : null;

        return (
          <>
            {/* Header row with dam + edit button */}
            <div className="rounded-lg p-4 md:p-5 mb-5" style={steelFrame}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] uppercase tracking-widest font-bold mb-1" style={{ color: "#9f1239", fontFamily: "var(--font-table)" }}>Dam</p>
                  {damHref ? (
                    <a href={damHref} target="_blank" rel="noopener noreferrer"
                      className="text-lg font-black hover:underline"
                      style={{ color: getDogColor(w.dam_name), fontFamily: "var(--font-table)" }}>
                      {w.dam_name}
                    </a>
                  ) : (
                    <span className="text-lg font-black" style={{ color: getDogColor(w.dam_name), fontFamily: "var(--font-table)" }}>
                      {w.dam_name}
                    </span>
                  )}
                  <p className="text-[12px] mt-1" style={{ color: "#4A4A4A", fontFamily: "var(--font-mono)" }}>
                    Bred: {w.breed_date_1}{w.breed_date_2 ? ` & ${w.breed_date_2}` : ""}
                  </p>
                  {w.note && (
                    <p className="text-[12px] mt-1" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>
                      <span className="font-bold">Note:</span> {w.note}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => editWhelping(w)}
                    className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all hover:scale-105"
                    style={{ background: "#1C1C1C", color: "#FAFAFA", border: "2px solid #C9B29F", fontFamily: "var(--font-table)", cursor: "pointer" }}>
                    Edit
                  </button>
                  <button onClick={() => { handleDelete(w.id); setViewingWhelping(null); setShowMyWhelping(true); loadWhelpings(); }}
                    className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all hover:scale-105"
                    style={{ background: "#FAFAFA", color: "#ef4444", border: "2px solid #ef4444", fontFamily: "var(--font-table)", cursor: "pointer" }}>
                    Delete
                  </button>
                </div>
              </div>
            </div>

            {/* Due Date Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
              <div className="rounded-lg p-4 text-center" style={steelFrame}>
                <p className="text-[12px] font-bold uppercase tracking-widest mb-1" style={{ color: "#f59e0b", fontFamily: "var(--font-table)" }}>Earliest (Day 58)</p>
                <p className="text-sm font-bold" style={{ color: "#1C1C1C", fontFamily: "var(--font-mono)" }}>{formatDate(early)}</p>
              </div>
              <div className="rounded-lg p-4 text-center" style={{ background: "#1C1C1C", border: "2px solid #C9B29F", borderRadius: "8px" }}>
                <p className="text-[12px] font-bold uppercase tracking-widest mb-1" style={{ color: "#C9B29F", fontFamily: "var(--font-table)" }}>Expected Due Date (Day 63)</p>
                <p className="text-lg font-bold" style={{ color: "#FAFAFA", fontFamily: "var(--font-mono)" }}>{formatDate(exp)}</p>
                {sd && (
                  <p className="text-[12px] mt-1" style={{ color: "#C9B29F", fontFamily: "var(--font-table)" }}>2nd breed due: {formatDate(addDays(sd, 63))}</p>
                )}
              </div>
              <div className="rounded-lg p-4 text-center" style={steelFrame}>
                <p className="text-[12px] font-bold uppercase tracking-widest mb-1" style={{ color: "#ef4444", fontFamily: "var(--font-table)" }}>Latest (Day 68)</p>
                <p className="text-sm font-bold" style={{ color: "#1C1C1C", fontFamily: "var(--font-mono)" }}>{formatDate(late)}</p>
              </div>
            </div>

            {/* Live Pregnancy Progress */}
            <div className="rounded-lg p-4 mb-5" style={steelFrame}>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-[12px] uppercase tracking-widest font-semibold" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>Live Pregnancy Progress</h2>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold" style={{ color: "#4A4A4A", fontFamily: "var(--font-mono)" }}>Week {wk} &middot; Trimester {tri}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: dLeft > 0 ? "#1C1C1C" : "#22c55e", color: "#FAFAFA", fontFamily: "var(--font-mono)" }}>
                    {dLeft > 0 ? `${dLeft} days left` : dp > 68 ? "Overdue" : "Due now"}
                  </span>
                </div>
              </div>
              <div className="relative h-6 rounded-full overflow-hidden" style={{ background: "#EDE4D5", border: "2px solid #C9B29F" }}>
                <div className="h-full rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${pct}%`, background: pct >= 100 ? "linear-gradient(90deg, #22c55e, #16a34a)" : pct >= 85 ? "linear-gradient(90deg, #f59e0b, #ef4444)" : "linear-gradient(90deg, #C9B29F, #8a6518)" }} />
                <span className="absolute inset-0 flex items-center justify-center text-[12px] font-bold" style={{ color: "#1C1C1C", fontFamily: "var(--font-mono)" }}>
                  Day {Math.max(0, dp)} of 63 &middot; {pct.toFixed(0)}%
                </span>
              </div>
              <div className="flex mt-1">
                <div className="flex-1 text-center text-[12px]" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>1st Trimester (1-21)</div>
                <div className="flex-1 text-center text-[12px]" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>2nd Trimester (22-42)</div>
                <div className="flex-1 text-center text-[12px]" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>3rd Trimester (43-63)</div>
              </div>
            </div>

            {/* Milestones Timeline (live) */}
            <div className="rounded-lg p-4 md:p-5 mb-5" style={steelFrame}>
              <h2 className="text-[12px] uppercase tracking-widest font-semibold mb-4" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>Pregnancy Milestones</h2>
              <div className="space-y-0">
                {MILESTONES.map((m, i) => {
                  const md = addDays(bd, m.day);
                  const isPast = today >= md;
                  const isCurrent = dp >= (MILESTONES[i - 1]?.day || 0) && dp < m.day;
                  const isDueDate = m.day === 63;
                  return (
                    <div key={m.day} className="flex items-start gap-3 py-2.5 relative"
                      style={{ borderBottom: i < MILESTONES.length - 1 ? "2px solid #EDE4D5" : "none" }}>
                      <div className="flex flex-col items-center flex-shrink-0 mt-0.5">
                        <div className="w-3 h-3 rounded-full border-2 flex-shrink-0"
                          style={{ background: isPast ? (isDueDate ? "#22c55e" : "#1C1C1C") : isCurrent ? "#f59e0b" : "#EDE4D5", borderColor: isPast ? (isDueDate ? "#22c55e" : "#1C1C1C") : isCurrent ? "#f59e0b" : "#C9B29F" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold" style={{ color: isPast ? "#1C1C1C" : isCurrent ? "#f59e0b" : "#4A4A4A", fontFamily: "var(--font-table)" }}>
                            Day {m.day} &mdash; {m.label}
                          </span>
                          {isCurrent && (
                            <span className="text-[12px] font-bold px-1.5 py-0.5 rounded animate-pulse" style={{ background: "#f59e0b", color: "#FAFAFA", fontFamily: "var(--font-table)" }}>CURRENT</span>
                          )}
                          {isPast && !isCurrent && (
                            <span className="text-[12px] px-1.5 py-0.5 rounded" style={{ background: "#EDE4D5", color: "#4A4A4A", fontFamily: "var(--font-table)" }}>DONE</span>
                          )}
                        </div>
                        <p className="text-[12px] mt-0.5" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>{m.desc}</p>
                      </div>
                      <span className="text-[12px] font-semibold flex-shrink-0 mt-0.5" style={{ color: isDueDate ? "#22c55e" : "#4A4A4A", fontFamily: "var(--font-mono)" }}>
                        {formatDate(md)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Two-column: Checklist + Key Dates Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
              {/* Whelping Supply Checklist (auto-saves) */}
              <div className="rounded-lg p-4" style={steelFrame}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-[12px] uppercase tracking-widest font-semibold" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>Whelping Supply Checklist</h2>
                  <span className="text-[12px] font-bold px-2 py-0.5 rounded"
                    style={{ background: viewChecked.size === CHECKLIST.length ? "#22c55e" : "#EDE4D5", color: viewChecked.size === CHECKLIST.length ? "#FAFAFA" : "#4A4A4A", fontFamily: "var(--font-mono)" }}>
                    {viewChecked.size}/{CHECKLIST.length}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {CHECKLIST.map((item, i) => (
                    <div key={i} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg"
                      style={{ background: viewChecked.has(i) ? "rgba(34, 197, 94, 0.08)" : "transparent", border: viewChecked.has(i) ? "2px solid rgba(34, 197, 94, 0.3)" : "2px solid transparent" }}>
                      <input type="checkbox" checked={viewChecked.has(i)} readOnly disabled className="w-3.5 h-3.5 rounded accent-[#22c55e] cursor-not-allowed" />
                      <span className="text-xs" style={{ color: viewChecked.has(i) ? "#22c55e" : "#4A4A4A", fontFamily: "var(--font-table)", textDecoration: viewChecked.has(i) ? "line-through" : "none" }}>{item}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[12px] mt-2 text-center" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>
                  Click <span className="font-bold" style={{ color: "#1C1C1C" }}>Edit</span> above to modify the checklist.
                </p>
              </div>

              {/* Key Dates Summary */}
              <div className="rounded-lg p-4" style={steelFrame}>
                <h2 className="text-[12px] uppercase tracking-widest font-semibold mb-3" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>Key Dates Summary</h2>
                <div className="space-y-2">
                  {[
                    { label: "Breeding Date", date: bd, color: "#1d5bbf" },
                    ...(sd ? [{ label: "2nd Breeding", date: sd, color: "#6d30b0" }] : []),
                    { label: "Ultrasound Window", date: addDays(bd, 25), color: "#0d7468" },
                    { label: "X-Ray Recommended", date: addDays(bd, 45), color: "#8a6518" },
                    { label: "Start Temp Monitoring", date: addDays(bd, 58), color: "#f59e0b" },
                    { label: "Earliest Due (Day 58)", date: early, color: "#b45a0a" },
                    { label: "Expected Due (Day 63)", date: exp, color: "#22c55e" },
                    { label: "Latest Due (Day 68)", date: late, color: "#ef4444" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5 px-2.5 rounded-lg"
                      style={{ background: i % 2 === 0 ? "rgba(201, 178, 159, 0.1)" : "transparent" }}>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
                        <span className="text-xs font-semibold" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>{item.label}</span>
                      </div>
                      <span className="text-xs font-semibold" style={{ color: item.color, fontFamily: "var(--font-mono)" }}>{formatDate(item.date)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 rounded-lg" style={{ background: "rgba(245, 158, 11, 0.08)", border: "2px solid rgba(245, 158, 11, 0.2)" }}>
                  <p className="text-[12px] leading-relaxed" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>
                    <span className="font-bold" style={{ color: "#f59e0b" }}>Note:</span> Canine gestation averages 63 days but can range from 58-68 days.
                    If your dam has not whelped by day 68, contact your veterinarian immediately.
                    Always consult a vet for pregnancy confirmation and prenatal care.
                  </p>
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {/* ═══ CALCULATOR ═══ */}
      {!showMyWhelping && !viewingWhelping && (
        <>
          {/* Date Input Section */}
          <div className="rounded-lg p-4 md:p-5 mb-5" style={steelFrame}>
            <h2 className="text-[12px] uppercase tracking-widest font-semibold mb-4"
              style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>
              Breeding Details
            </h2>

            {/* Dam search */}
            <div className="mb-4" ref={damRef}>
              <label className="block text-[12px] uppercase tracking-widest font-bold mb-1"
                style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>
                Dam <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={damQuery}
                  onChange={(e) => { setDamQuery(e.target.value); setSelectedDam(null); searchDam(e.target.value); setCalculated(false); }}
                  placeholder="Search dam by name..."
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ ...steelFrame, background: "#FAFAFA", color: "#1C1C1C", fontFamily: "var(--font-table)" }}
                />
                {selectedDam && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-bold px-2 py-0.5 rounded"
                    style={{ background: "#22c55e", color: "#FAFAFA", fontFamily: "var(--font-table)" }}>
                    Selected
                  </span>
                )}
                {damOpen && damResults.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg"
                    style={{ ...steelFrame, background: "#FAFAFA" }}>
                    {damResults.map((d) => (
                      <button key={d.dog_id}
                        className="w-full text-left px-3 py-2 text-xs transition-all hover:bg-[#EDE4D5]"
                        style={{ fontFamily: "var(--font-table)", borderBottom: "2px solid #EDE4D5" }}
                        onClick={() => { setSelectedDam({ id: d.dog_id, name: d.registered_name }); setDamQuery(d.registered_name); setDamOpen(false); }}>
                        <span className="font-bold truncate" style={{ color: getDogColor(d.registered_name) }}>{d.registered_name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* First breeding */}
              <div>
                <label className="block text-[12px] uppercase tracking-widest font-bold mb-1"
                  style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>
                  First Breeding Date <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input type="date" value={breedDate}
                  onChange={(e) => { setBreedDate(e.target.value); setCalculated(false); }}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ ...steelFrame, background: "#FAFAFA", color: "#1C1C1C", fontFamily: "var(--font-mono)" }} />
              </div>
              {/* Second breeding (optional) */}
              <div>
                <label className="block text-[12px] uppercase tracking-widest font-bold mb-1"
                  style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>
                  Second Breeding Date <span className="font-normal opacity-60">(optional)</span>
                </label>
                <input type="date" value={secondBreedDate}
                  onChange={(e) => { setSecondBreedDate(e.target.value); setCalculated(false); }}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ ...steelFrame, background: "#FAFAFA", color: "#1C1C1C", fontFamily: "var(--font-mono)" }} />
              </div>
            </div>

            {/* Note field */}
            {calculated && (
              <div className="mb-4">
                <label className="block text-[12px] uppercase tracking-widest font-bold mb-1"
                  style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>
                  Note <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Natural breeding, progesterone confirmed..."
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ ...steelFrame, background: "#FAFAFA", color: "#1C1C1C", fontFamily: "var(--font-table)" }} />
              </div>
            )}

            <div className="flex gap-3 flex-wrap">
              <button onClick={handleCalculate}
                disabled={!breedDate}
                className="px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all hover:scale-105"
                style={{ background: breedDate ? "#1C1C1C" : "#C9B29F", color: "#FAFAFA", border: "2px solid #C9B29F", fontFamily: "var(--font-table)", cursor: breedDate ? "pointer" : "not-allowed", opacity: breedDate ? 1 : 0.5 }}>
                Calculate Due Date
              </button>
              {calculated && (
                <>
                  <button onClick={handleSave} disabled={saving || !note.trim()}
                    className="px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all hover:scale-105"
                    style={{ background: note.trim() ? "#22c55e" : "#C9B29F", color: "#FAFAFA", border: `2px solid ${note.trim() ? "#22c55e" : "#C9B29F"}`, fontFamily: "var(--font-table)", cursor: note.trim() && !saving ? "pointer" : "not-allowed", opacity: saving || !note.trim() ? 0.5 : 1 }}>
                    {saving ? "Saving..." : editingId ? "Update Whelping" : "Save This Whelping"}
                  </button>
                  <button onClick={handleReset}
                    className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all hover:scale-105"
                    style={{ ...steelFrame, color: "#4A4A4A", fontFamily: "var(--font-table)", cursor: "pointer" }}>
                    Reset
                  </button>
                  {saveMsg && (
                    <span className="self-center text-xs font-bold" style={{ color: saveMsg === "Saved!" ? "#22c55e" : "#ef4444", fontFamily: "var(--font-table)" }}>
                      {saveMsg}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Results */}
          {calculated && breedingDate && dueDate && earlyDate && lateDate && (
            <>
              {/* Due Date Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                <div className="rounded-lg p-4 text-center" style={steelFrame}>
                  <p className="text-[12px] font-bold uppercase tracking-widest mb-1" style={{ color: "#f59e0b", fontFamily: "var(--font-table)" }}>Earliest (Day 58)</p>
                  <p className="text-sm font-bold" style={{ color: "#1C1C1C", fontFamily: "var(--font-mono)" }}>{formatDate(earlyDate)}</p>
                </div>
                <div className="rounded-lg p-4 text-center" style={{ background: "#1C1C1C", border: "2px solid #C9B29F", borderRadius: "8px" }}>
                  <p className="text-[12px] font-bold uppercase tracking-widest mb-1" style={{ color: "#C9B29F", fontFamily: "var(--font-table)" }}>Expected Due Date (Day 63)</p>
                  <p className="text-lg font-bold" style={{ color: "#FAFAFA", fontFamily: "var(--font-mono)" }}>{formatDate(dueDate)}</p>
                  {secondDate && (
                    <p className="text-[12px] mt-1" style={{ color: "#C9B29F", fontFamily: "var(--font-table)" }}>2nd breed due: {formatDate(addDays(secondDate, 63))}</p>
                  )}
                </div>
                <div className="rounded-lg p-4 text-center" style={steelFrame}>
                  <p className="text-[12px] font-bold uppercase tracking-widest mb-1" style={{ color: "#ef4444", fontFamily: "var(--font-table)" }}>Latest (Day 68)</p>
                  <p className="text-sm font-bold" style={{ color: "#1C1C1C", fontFamily: "var(--font-mono)" }}>{formatDate(lateDate)}</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="rounded-lg p-4 mb-5" style={steelFrame}>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-[12px] uppercase tracking-widest font-semibold" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>Pregnancy Progress</h2>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold" style={{ color: "#4A4A4A", fontFamily: "var(--font-mono)" }}>Week {currentWeek} &middot; Trimester {currentTrimester}</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: daysRemaining > 0 ? "#1C1C1C" : "#22c55e", color: "#FAFAFA", fontFamily: "var(--font-mono)" }}>
                      {daysRemaining > 0 ? `${daysRemaining} days left` : daysPregnant > 68 ? "Overdue" : "Due now"}
                    </span>
                  </div>
                </div>
                <div className="relative h-6 rounded-full overflow-hidden" style={{ background: "#EDE4D5", border: "2px solid #C9B29F" }}>
                  <div className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${progressPct}%`, background: progressPct >= 100 ? "linear-gradient(90deg, #22c55e, #16a34a)" : progressPct >= 85 ? "linear-gradient(90deg, #f59e0b, #ef4444)" : "linear-gradient(90deg, #C9B29F, #8a6518)" }} />
                  <span className="absolute inset-0 flex items-center justify-center text-[12px] font-bold" style={{ color: "#1C1C1C", fontFamily: "var(--font-mono)" }}>
                    Day {Math.max(0, daysPregnant)} of 63 &middot; {progressPct.toFixed(0)}%
                  </span>
                </div>
                <div className="flex mt-1">
                  <div className="flex-1 text-center text-[12px]" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>1st Trimester (1-21)</div>
                  <div className="flex-1 text-center text-[12px]" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>2nd Trimester (22-42)</div>
                  <div className="flex-1 text-center text-[12px]" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>3rd Trimester (43-63)</div>
                </div>
              </div>

              {/* Milestones Timeline */}
              <div className="rounded-lg p-4 md:p-5 mb-5" style={steelFrame}>
                <h2 className="text-[12px] uppercase tracking-widest font-semibold mb-4" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>Pregnancy Milestones</h2>
                <div className="space-y-0">
                  {MILESTONES.map((m, i) => {
                    const milestoneDate = addDays(breedingDate, m.day);
                    const isPast = today >= milestoneDate;
                    const isCurrent = daysPregnant >= (MILESTONES[i - 1]?.day || 0) && daysPregnant < m.day;
                    const isDueDate = m.day === 63;
                    return (
                      <div key={m.day} className="flex items-start gap-3 py-2.5 relative"
                        style={{ borderBottom: i < MILESTONES.length - 1 ? "2px solid #EDE4D5" : "none" }}>
                        <div className="flex flex-col items-center flex-shrink-0 mt-0.5">
                          <div className="w-3 h-3 rounded-full border-2 flex-shrink-0"
                            style={{ background: isPast ? (isDueDate ? "#22c55e" : "#1C1C1C") : isCurrent ? "#f59e0b" : "#EDE4D5", borderColor: isPast ? (isDueDate ? "#22c55e" : "#1C1C1C") : isCurrent ? "#f59e0b" : "#C9B29F" }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold" style={{ color: isPast ? "#1C1C1C" : isCurrent ? "#f59e0b" : "#4A4A4A", fontFamily: "var(--font-table)" }}>
                              Day {m.day} &mdash; {m.label}
                            </span>
                            {isCurrent && (
                              <span className="text-[12px] font-bold px-1.5 py-0.5 rounded animate-pulse" style={{ background: "#f59e0b", color: "#FAFAFA", fontFamily: "var(--font-table)" }}>CURRENT</span>
                            )}
                            {isPast && !isCurrent && (
                              <span className="text-[12px] px-1.5 py-0.5 rounded" style={{ background: "#EDE4D5", color: "#4A4A4A", fontFamily: "var(--font-table)" }}>DONE</span>
                            )}
                          </div>
                          <p className="text-[12px] mt-0.5" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>{m.desc}</p>
                        </div>
                        <span className="text-[12px] font-semibold flex-shrink-0 mt-0.5" style={{ color: isDueDate ? "#22c55e" : "#4A4A4A", fontFamily: "var(--font-mono)" }}>
                          {formatDate(milestoneDate)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Two-column: Checklist + Key Dates Summary */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
                <div className="rounded-lg p-4" style={steelFrame}>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-[12px] uppercase tracking-widest font-semibold" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>Whelping Supply Checklist</h2>
                    <span className="text-[12px] font-bold px-2 py-0.5 rounded"
                      style={{ background: checkedItems.size === CHECKLIST.length ? "#22c55e" : "#EDE4D5", color: checkedItems.size === CHECKLIST.length ? "#FAFAFA" : "#4A4A4A", fontFamily: "var(--font-mono)" }}>
                      {checkedItems.size}/{CHECKLIST.length}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {CHECKLIST.map((item, i) => (
                      <label key={i} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all hover:scale-[1.01]"
                        style={{ background: checkedItems.has(i) ? "rgba(34, 197, 94, 0.08)" : "transparent", border: checkedItems.has(i) ? "2px solid rgba(34, 197, 94, 0.3)" : "2px solid transparent" }}>
                        <input type="checkbox" checked={checkedItems.has(i)} onChange={() => toggleCheck(i)} className="w-3.5 h-3.5 rounded accent-[#22c55e]" />
                        <span className="text-xs" style={{ color: checkedItems.has(i) ? "#22c55e" : "#4A4A4A", fontFamily: "var(--font-table)", textDecoration: checkedItems.has(i) ? "line-through" : "none" }}>{item}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg p-4" style={steelFrame}>
                  <h2 className="text-[12px] uppercase tracking-widest font-semibold mb-3" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>Key Dates Summary</h2>
                  <div className="space-y-2">
                    {[
                      { label: "Breeding Date", date: breedingDate, color: "#1d5bbf" },
                      ...(secondDate ? [{ label: "2nd Breeding", date: secondDate, color: "#6d30b0" }] : []),
                      { label: "Ultrasound Window", date: addDays(breedingDate, 25), color: "#0d7468" },
                      { label: "X-Ray Recommended", date: addDays(breedingDate, 45), color: "#8a6518" },
                      { label: "Start Temp Monitoring", date: addDays(breedingDate, 58), color: "#f59e0b" },
                      { label: "Earliest Due (Day 58)", date: earlyDate, color: "#b45a0a" },
                      { label: "Expected Due (Day 63)", date: dueDate, color: "#22c55e" },
                      { label: "Latest Due (Day 68)", date: lateDate, color: "#ef4444" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5 px-2.5 rounded-lg"
                        style={{ background: i % 2 === 0 ? "rgba(201, 178, 159, 0.1)" : "transparent" }}>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
                          <span className="text-xs font-semibold" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>{item.label}</span>
                        </div>
                        <span className="text-xs font-semibold" style={{ color: item.color, fontFamily: "var(--font-mono)" }}>{formatDate(item.date)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-3 rounded-lg" style={{ background: "rgba(245, 158, 11, 0.08)", border: "2px solid rgba(245, 158, 11, 0.2)" }}>
                    <p className="text-[12px] leading-relaxed" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>
                      <span className="font-bold" style={{ color: "#f59e0b" }}>Note:</span> Canine gestation averages 63 days but can range from 58-68 days.
                      If your dam has not whelped by day 68, contact your veterinarian immediately.
                      Always consult a vet for pregnancy confirmation and prenatal care.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Pre-calculate info */}
          {!calculated && (
            <div className="rounded-lg p-6 text-center" style={steelFrame}>
              <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center"
                style={{ background: "#EDE4D5", border: "2px solid #C9B29F" }}>
                <img src="/logo.png" alt="" role="presentation" className="w-8 h-8 object-contain opacity-40" />
              </div>
              <h3 className="text-sm font-bold mb-1.5" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>
                Enter your breeding date to get started
              </h3>
              <p className="text-xs max-w-md mx-auto mb-4" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>
                The calculator will estimate your dam&apos;s due date, track pregnancy progress day by day,
                show key milestones, and provide a whelping supply checklist.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto">
                {[
                  { title: "Due Date", desc: "Day 58-68 window", icon: "📅" },
                  { title: "Milestones", desc: "12 key stages tracked", icon: "📋" },
                  { title: "Checklist", desc: "Whelping supplies", icon: "✅" },
                ].map((f, i) => (
                  <div key={i} className="rounded-lg p-3" style={{ background: "#EDE4D5", border: "2px solid #C9B29F", borderRadius: "8px" }}>
                    <div className="text-lg mb-1">{f.icon}</div>
                    <p className="text-xs font-bold" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>{f.title}</p>
                    <p className="text-[12px]" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
