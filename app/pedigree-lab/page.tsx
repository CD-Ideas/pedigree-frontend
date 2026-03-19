"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */
interface DogSearchResult {
  dog_id: number;
  registered_name: string;
  photo_url: string | null;
  sex?: string;
}

type SlotKey =
  | "subject"
  | "sire"
  | "dam"
  | "sire_sire"
  | "sire_dam"
  | "dam_sire"
  | "dam_dam";

interface SlotDog {
  dog_id: number;
  registered_name: string;
  photo_url: string | null;
  sex?: string;
}

interface VaccineEntry {
  name: string;
  checked: boolean;
  date: string;
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
  vaccines: VaccineEntry[];
  worming: WormingEntry[];
  wormingDraft: WormingEntry;
  notes: string;
}

interface PublishForm {
  prefix: string;
  name: string;
  suffixWins: string;
  suffixLosses: string;
  suffixDraws: string;
  suffixHonors: string;
  dob: string;
  sex: string;
  color: string;
  continent: string;
  country: string;
  notes: string;
  photoFile: File | null;
  photoPreview: string;
  journal: JournalData;
}

/* ------------------------------------------------------------------ */
/* Constants                                                          */
/* ------------------------------------------------------------------ */
const PHOTO_BASE = "https://www.apbt.online-pedigrees.com/";

const COUNTRY_MAP: Record<string, string[]> = {
  "North America": ["United States", "Canada", "Mexico", "Antigua and Barbuda", "Bahamas", "Barbados", "Belize", "Cuba", "Dominica", "Dominican Republic", "Grenada", "Guatemala", "Haiti", "Honduras", "Jamaica", "El Salvador", "Costa Rica", "Nicaragua", "Panama", "Puerto Rico", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Trinidad and Tobago"],
  "South America": ["Brazil", "Argentina", "Colombia", "Chile", "Peru", "Venezuela", "Ecuador", "Uruguay", "Paraguay", "Bolivia"],
  "Europe": ["United Kingdom", "Ireland", "Spain", "Portugal", "France", "Germany", "Italy", "Netherlands", "Belgium", "Sweden", "Denmark", "Norway", "Finland", "Poland", "Romania", "Hungary", "Czech Republic", "Greece", "Croatia", "Serbia", "Bulgaria", "Albania", "Russia", "Ukraine", "Turkey"],
  "Asia": ["Philippines", "Japan", "South Korea", "China", "Thailand", "Indonesia", "Vietnam", "India", "Pakistan", "Iran", "Iraq", "Israel", "Saudi Arabia", "UAE", "Malaysia", "Singapore", "Taiwan"],
  "Africa": ["South Africa", "Nigeria", "Kenya", "Egypt", "Morocco", "Ghana", "Tanzania", "Ethiopia", "Cameroon", "Algeria"],
  "Oceania": ["Australia", "New Zealand", "Fiji", "Papua New Guinea"],
};

const SLOT_LABELS: Record<SlotKey, string> = {
  subject: "Subject Dog",
  sire: "Drop Sire",
  dam: "Drop Dam",
  sire_sire: "Sire's Sire",
  sire_dam: "Sire's Dam",
  dam_sire: "Dam's Sire",
  dam_dam: "Dam's Dam",
};

const STEEL_FRAME: React.CSSProperties = {
  border: "1.5px solid rgba(30,64,120,0.8)",
  boxShadow: "0 2px 20px rgba(0,0,0,0.25)",
};

const PANEL_BG =
  "linear-gradient(180deg, #1a1a24 0%, #141418 100%)";

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */
function getDogColor(name: string): string {
  const n = (name || "").toUpperCase();
  if (/\bGR\s*CH\b/.test(n)) return "#60a5fa";   // blue
  if (/(?:^|\s|\()CH\b/.test(n)) return "#fc8181"; // red
  if (/\bROM\b/.test(n)) return "#22d3ee";         // cyan
  if (/\bPOR\b/.test(n)) return "#a78bfa";         // violet
  const xw = n.match(/\b(\d+)X[WL]\b/);
  if (xw) {
    const num = parseInt(xw[1]);
    if (num >= 5) return "#c084fc";  // purple
    if (num === 4) return "#f472b6"; // pink
    if (num === 3) return "#d4a855"; // gold
    if (num === 2) return "#fb923c"; // orange
    if (num === 1) return "#2dd4bf"; // teal
  }
  return "#e2e8f0"; // white for no title
}

function sexIcon(sex?: string): string {
  if (!sex) return "";
  const s = sex.toLowerCase();
  if (s === "male" || s === "m") return "\u2642";
  if (s === "female" || s === "f") return "\u2640";
  return "";
}

function riskColor(coi: number): string {
  if (coi < 5) return "#22c55e";
  if (coi < 10) return "#eab308";
  if (coi < 15) return "#f97316";
  if (coi < 20) return "#ef4444";
  return "#dc2626";
}

function riskLabel(coi: number): string {
  if (coi < 5) return "CLEAN OUTCROSS";
  if (coi < 10) return "MILD LINEBREED";
  if (coi < 15) return "LINEBRED LOCK";
  if (coi < 20) return "TIGHT LINEBREED";
  return "DANGER ZONE";
}

function calcCOI(slots: Record<SlotKey, SlotDog | null>): number {
  /* Simple Wright's COI placeholder: count how many grandparent slots
     share the same dog_id across sire/dam lines. Each match adds ~6.25%. */
  const sireLineIds: number[] = [];
  const damLineIds: number[] = [];

  if (slots.sire) sireLineIds.push(slots.sire.dog_id);
  if (slots.sire_sire) sireLineIds.push(slots.sire_sire.dog_id);
  if (slots.sire_dam) sireLineIds.push(slots.sire_dam.dog_id);

  if (slots.dam) damLineIds.push(slots.dam.dog_id);
  if (slots.dam_sire) damLineIds.push(slots.dam_sire.dog_id);
  if (slots.dam_dam) damLineIds.push(slots.dam_dam.dog_id);

  let sharedCount = 0;
  for (const sid of sireLineIds) {
    for (const did of damLineIds) {
      if (sid === did) sharedCount++;
    }
  }
  return sharedCount * 6.25;
}

function defaultWormingDraft(): WormingEntry {
  const today = new Date().toISOString().split("T")[0];
  return { type: "", otherType: "", dateWormed: today, nextDue: "", intervalDays: 0, remindMe: false };
}

function calcWormingDue(dateWormed: string, days: number): string {
  if (!dateWormed || !days) return "";
  const d = new Date(dateWormed);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function formatDateShort(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function defaultJournal(): JournalData {
  return {
    rabiesDate: "",
    rabiesNextDue: "",
    avidChip: "",
    vaccines: [
      { name: "DHPP", checked: false, date: "" },
      { name: "Bordetella", checked: false, date: "" },
      { name: "Leptospirosis", checked: false, date: "" },
    ],
    worming: [],
    wormingDraft: defaultWormingDraft(),
    notes: "",
  };
}

function defaultPublishForm(): PublishForm {
  return {
    prefix: "",
    name: "",
    suffixWins: "",
    suffixLosses: "",
    suffixDraws: "",
    suffixHonors: "",
    dob: "",
    sex: "Male",
    color: "",
    continent: "",
    country: "",
    notes: "",
    photoFile: null,
    photoPreview: "",
    journal: defaultJournal(),
  };
}

/* ------------------------------------------------------------------ */
/* Card wrapper                                                       */
/* ------------------------------------------------------------------ */
function Card({
  children,
  className = "",
  style = {},
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`rounded-xl ${className}`}
      style={{
        ...STEEL_FRAME,
        background: PANEL_BG,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main Page                                                          */
/* ------------------------------------------------------------------ */
export default function PedigreeLabPage() {
  /* ---------- Search state ---------- */
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<DogSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  /* ---------- Canvas state ---------- */
  const [slots, setSlots] = useState<Record<SlotKey, SlotDog | null>>({
    subject: null,
    sire: null,
    dam: null,
    sire_sire: null,
    sire_dam: null,
    dam_sire: null,
    dam_dam: null,
  });
  const [selectedSlot, setSelectedSlot] = useState<SlotKey | null>(null);
  const [dragData, setDragData] = useState<DogSearchResult | null>(null);

  /* ---------- UI state ---------- */
  const [previewMode, setPreviewMode] = useState(false);
  const [mockMode, setMockMode] = useState(false);
  const [mockNames, setMockNames] = useState<Record<SlotKey, string>>({} as Record<SlotKey, string>);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishForm, setPublishForm] = useState<PublishForm>(defaultPublishForm());

  /* ---------- Preview pedigree tree state ---------- */
  interface TreeRow { gen: number; pos: number; dog_id: number | null; name: string; photo_url: string | null; sex: string | null; }
  const [previewTree, setPreviewTree] = useState<TreeRow[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  /* ---------- COI ---------- */
  const coi = calcCOI(slots);
  const dogsPlacedCount = Object.values(slots).filter(Boolean).length;

  /* ---------- Search with debounce ---------- */
  const doSearch = useCallback(async (term: string) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/dogs/search?q=${encodeURIComponent(term)}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(Array.isArray(data) ? data : data.dogs || []);
      }
    } catch {
      /* silently fail */
    } finally {
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(searchTerm), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchTerm, doSearch]);

  /* ---------- Auto-fill parents from DB ---------- */
  const CHILD_TO_PARENTS: Partial<Record<SlotKey, { sireSlot: SlotKey; damSlot: SlotKey }>> = {
    subject: { sireSlot: "sire", damSlot: "dam" },
    sire: { sireSlot: "sire_sire", damSlot: "sire_dam" },
    dam: { sireSlot: "dam_sire", damSlot: "dam_dam" },
  };

  const autoFillParents = useCallback(async (dogId: number, slotKey: SlotKey) => {
    const mapping = CHILD_TO_PARENTS[slotKey];
    if (!mapping) return; // grandparent slots have no children to fill

    try {
      const res = await fetch(`/api/dogs/family?id=${dogId}`);
      if (!res.ok) return;
      const data = await res.json();

      const updates: Partial<Record<SlotKey, SlotDog | null>> = {};

      if (data.sire) {
        updates[mapping.sireSlot] = {
          dog_id: data.sire.dog_id,
          registered_name: data.sire.registered_name,
          photo_url: data.sire.photo_url,
          sex: data.sire.sex,
        };
      }
      if (data.dam) {
        updates[mapping.damSlot] = {
          dog_id: data.dam.dog_id,
          registered_name: data.dam.registered_name,
          photo_url: data.dam.photo_url,
          sex: data.dam.sex,
        };
      }

      if (Object.keys(updates).length > 0) {
        setSlots((prev) => ({ ...prev, ...updates }));

        // Recursively fill grandparents if sire/dam slots were filled
        if (data.sire && CHILD_TO_PARENTS[mapping.sireSlot]) {
          autoFillParents(data.sire.dog_id, mapping.sireSlot);
        }
        if (data.dam && CHILD_TO_PARENTS[mapping.damSlot]) {
          autoFillParents(data.dam.dog_id, mapping.damSlot);
        }
      }
    } catch {
      /* silently fail */
    }
  }, []);

  /* ---------- Drag handlers ---------- */
  const handleDragStart = (dog: DogSearchResult) => {
    setDragData(dog);
  };

  const handleDrop = (slotKey: SlotKey) => {
    if (!dragData) return;
    setSlots((prev) => ({
      ...prev,
      [slotKey]: {
        dog_id: dragData.dog_id,
        registered_name: dragData.registered_name,
        photo_url: dragData.photo_url,
        sex: dragData.sex,
      },
    }));
    // Auto-fill parents behind the dropped dog
    autoFillParents(dragData.dog_id, slotKey);
    setDragData(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const removeFromSlot = (slotKey: SlotKey) => {
    setSlots((prev) => ({ ...prev, [slotKey]: null }));
    if (selectedSlot === slotKey) setSelectedSlot(null);
  };

  /* ---------- Publish modal helpers ---------- */
  const handleRabiesDateChange = (date: string) => {
    let nextDue = "";
    if (date) {
      const d = new Date(date);
      d.setFullYear(d.getFullYear() + 1);
      nextDue = d.toISOString().split("T")[0];
    }
    setPublishForm((prev) => ({
      ...prev,
      journal: { ...prev.journal, rabiesDate: date, rabiesNextDue: nextDue },
    }));
  };

  const handleVaccineToggle = (idx: number) => {
    setPublishForm((prev) => {
      const vaccines = [...prev.journal.vaccines];
      vaccines[idx] = { ...vaccines[idx], checked: !vaccines[idx].checked };
      return { ...prev, journal: { ...prev.journal, vaccines } };
    });
  };

  const handleVaccineDate = (idx: number, date: string) => {
    setPublishForm((prev) => {
      const vaccines = [...prev.journal.vaccines];
      vaccines[idx] = { ...vaccines[idx], date };
      return { ...prev, journal: { ...prev.journal, vaccines } };
    });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPublishForm((prev) => ({
        ...prev,
        photoFile: file,
        photoPreview: reader.result as string,
      }));
    };
    reader.readAsDataURL(file);
  };

  /* ---------- Selected dog details ---------- */
  const selectedDog = selectedSlot ? slots[selectedSlot] : null;

  /* ================================================================ */
  /* RENDER                                                           */
  /* ================================================================ */
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: "var(--bg-deep, #0b1120)",
        color: "#e2e8f0",
      }}
    >
      {/* ============================================================ */}
      {/* HEADER                                                       */}
      {/* ============================================================ */}
      <header className="px-6 py-5 flex items-center justify-between" style={STEEL_FRAME}>
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-xs uppercase tracking-widest hover:text-white transition-colors"
            style={{ color: "#7a8ba8", fontFamily: "var(--font-table, Rajdhani, sans-serif)" }}
          >
            &larr; Back to Home
          </Link>
        </div>
        <h1
          className="text-2xl md:text-3xl font-black uppercase tracking-[0.15em]"
          style={{
            fontFamily: "var(--font-display, Oswald, sans-serif)",
            background: "linear-gradient(135deg, #d4a855 0%, #f5d994 50%, #d4a855 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {"\uD83E\uDDEC"} PEDIGREE LAB
        </h1>
        <div style={{ width: 120 }} />
      </header>

      {/* ============================================================ */}
      {/* THREE-ZONE LAYOUT                                            */}
      {/* ============================================================ */}
      <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        {/* ---------------------------------------------------------- */}
        {/* LEFT PANE - Search                                         */}
        {/* ---------------------------------------------------------- */}
        <aside
          className="flex-shrink-0 flex flex-col overflow-hidden"
          style={{ width: 280 }}
        >
          <Card className="m-3 flex flex-col flex-1 overflow-hidden" style={{ padding: 0 }}>
            {/* Search header */}
            <div className="p-4 pb-3">
              <p
                className="text-[10px] uppercase tracking-widest font-semibold mb-3"
                style={{ color: "var(--accent-gold, #d4a855)", fontFamily: "var(--font-table, Rajdhani, sans-serif)" }}
              >
                Search Dogs
              </p>
              <div className="relative">
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
                  style={{ color: "#5a6a82" }}
                >
                  {"\uD83D\uDD0D"}
                </span>
                <input
                  type="text"
                  placeholder="Search by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg pl-9 pr-3 py-2 text-sm outline-none transition-all focus:ring-1"
                  style={{
                    background: "var(--bg-deep, #0b1120)",
                    border: "1px solid rgba(30,64,120,0.5)",
                    color: "#e2e8f0",
                    fontFamily: "var(--font-table, Rajdhani, sans-serif)",
                    outline: "none",
                  }}
                />
              </div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2" style={{ scrollbarWidth: "thin" }}>
              {searchLoading && (
                <p className="text-center text-xs py-4" style={{ color: "#5a6a82" }}>
                  Searching...
                </p>
              )}
              {!searchLoading && searchTerm && searchResults.length === 0 && (
                <p className="text-center text-xs py-4" style={{ color: "#5a6a82" }}>
                  No results found
                </p>
              )}
              {searchResults.map((dog) => {
                const titleColor = getDogColor(dog.registered_name);
                return (
                  <div
                    key={dog.dog_id}
                    draggable
                    onDragStart={() => handleDragStart(dog)}
                    className="rounded-lg p-2.5 cursor-grab active:cursor-grabbing transition-all hover:scale-[1.02]"
                    style={{
                      background: "var(--bg-elevated, #1c2740)",
                      border: `1px solid ${titleColor}33`,
                      boxShadow: `0 0 0 0 ${titleColor}00`,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.boxShadow = `0 0 12px ${titleColor}40`;
                      (e.currentTarget as HTMLElement).style.borderColor = `${titleColor}88`;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 0 ${titleColor}00`;
                      (e.currentTarget as HTMLElement).style.borderColor = `${titleColor}33`;
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      {/* Photo */}
                      <div
                        className="w-10 h-10 rounded-md flex-shrink-0 bg-cover bg-center"
                        style={{
                          backgroundImage: dog.photo_url
                            ? `url(${PHOTO_BASE}${dog.photo_url})`
                            : "none",
                          backgroundColor: dog.photo_url ? "transparent" : "#0d1525",
                          border: `1.5px solid ${titleColor}55`,
                        }}
                      >
                        {!dog.photo_url && (
                          <div className="w-full h-full flex items-center justify-center text-xs" style={{ color: "#3a4a62" }}>
                            {"\uD83D\uDC36"}
                          </div>
                        )}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-xs font-bold truncate"
                          style={{ color: titleColor, fontFamily: "var(--font-table, Rajdhani, sans-serif)" }}
                        >
                          {dog.registered_name}
                        </p>
                        <p className="text-[10px]" style={{ color: "#5a6a82" }}>
                          <span style={{ color: dog.sex?.toUpperCase() === "FEMALE" ? "#f472b6" : "#60a5fa" }}>{sexIcon(dog.sex)}</span> ID: {dog.dog_id}
                        </p>
                      </div>
                      {/* Drag indicator */}
                      <span className="text-[10px]" style={{ color: "#3a4a62" }}>
                        {"\u2630"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </aside>

        {/* ---------------------------------------------------------- */}
        {/* MIDDLE - Canvas                                            */}
        {/* ---------------------------------------------------------- */}
        <main className="flex-1 overflow-auto p-3">
          {previewMode && previewTree.length > 0 ? (
            /* ====== PREVIEW: 4-Generation Pedigree Table ====== */
            <Card className="h-full relative overflow-auto" style={{ minHeight: 560, padding: 0 }}>
              {/* Header */}
              <div
                className="px-5 py-3 flex items-center justify-between"
                style={{
                  background: "linear-gradient(180deg, #1a1a24 0%, #141418 100%)",
                  borderBottom: "1.5px solid rgba(30,64,120,0.5)",
                }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="text-sm font-bold uppercase tracking-widest"
                    style={{ fontFamily: "var(--font-display, Oswald, sans-serif)", background: "linear-gradient(135deg, #d4a855 0%, #f5d994 50%, #d4a855 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
                  >
                    Pedigree Preview
                  </span>
                  {slots.subject && (
                    <span className="text-xs" style={{ color: getDogColor(slots.subject.registered_name) }}>
                      — {slots.subject.registered_name}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] uppercase tracking-widest font-bold"
                    style={{ color: riskColor(coi), fontFamily: "var(--font-table, Rajdhani, sans-serif)" }}
                  >
                    COI
                  </span>
                  <span
                    className="text-sm font-black"
                    style={{ color: riskColor(coi), fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}
                  >
                    {coi.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* 4-Gen Table */}
              <div className="overflow-auto" style={{ background: "#e8ecf1" }}>
                <table
                  className="w-full"
                  style={{
                    borderCollapse: "separate",
                    borderSpacing: "3px 3px",
                    fontFamily: "var(--font-table, Rajdhani, sans-serif)",
                    tableLayout: "fixed",
                    padding: 4,
                  }}
                >
                  <thead>
                    <tr>
                      {["First", "Second", "Third", "Fourth"].map((label) => (
                        <th
                          key={label}
                          className="text-center text-[11px] uppercase tracking-widest font-bold py-2"
                          style={{
                            background: "linear-gradient(180deg, #1a1a24 0%, #141418 100%)",
                            color: "#e8ecf1",
                            fontFamily: "var(--font-display, Oswald, sans-serif)",
                            borderRadius: 4,
                          }}
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const TOTAL_ROWS = 16;
                      const genData: Record<number, { pos: number; name: string; dog_id: number | null; sex: string | null }[]> = { 1: [], 2: [], 3: [], 4: [] };
                      for (const row of previewTree) {
                        if (genData[row.gen]) {
                          genData[row.gen].push({ pos: row.pos, name: row.name, dog_id: row.dog_id, sex: row.sex });
                        }
                      }
                      for (const g of [1, 2, 3, 4]) {
                        genData[g].sort((a, b) => a.pos - b.pos);
                      }

                      function getCellStyle(name: string) {
                        const n = (name || "").toUpperCase();
                        const isGrCh = /\bGR\s*CH\b/.test(n);
                        const isCh = !isGrCh && /(?:^|\s|\()CH\b/.test(n);
                        const isRom = /\bROM\b/.test(n);
                        const isPor = /\bPOR\b/.test(n);
                        const xwMatch = n.match(/\b(\d+)X[WL]\b/);
                        const xwNum = xwMatch ? parseInt(xwMatch[1]) : 0;
                        const isChampion = isGrCh || isCh;

                        const cellBg = isGrCh
                          ? "linear-gradient(135deg, rgba(29,91,191,0.18), rgba(29,91,191,0.06), #ffffff)"
                          : isCh
                            ? "linear-gradient(135deg, rgba(192,40,40,0.15), rgba(192,40,40,0.05), #ffffff)"
                            : xwNum === 3
                              ? "linear-gradient(135deg, rgba(180,130,20,0.16), rgba(180,130,20,0.05), #ffffff)"
                              : xwNum === 1
                                ? "linear-gradient(135deg, rgba(13,116,104,0.14), rgba(13,116,104,0.04), #ffffff)"
                                : xwNum === 2
                                  ? "linear-gradient(135deg, rgba(234,88,12,0.14), rgba(234,88,12,0.04), #ffffff)"
                                  : xwNum === 4
                                    ? "linear-gradient(135deg, rgba(219,39,119,0.14), rgba(219,39,119,0.04), #ffffff)"
                                    : xwNum >= 5
                                      ? "linear-gradient(135deg, rgba(109,48,176,0.14), rgba(109,48,176,0.04), #ffffff)"
                                      : isRom
                                        ? "linear-gradient(135deg, rgba(34,211,238,0.14), rgba(34,211,238,0.04), #ffffff)"
                                        : isPor
                                          ? "linear-gradient(135deg, rgba(167,139,250,0.14), rgba(167,139,250,0.04), #ffffff)"
                                          : "linear-gradient(135deg, #ffffff, #f7f8fa)";

                        const cellBorder = isGrCh
                          ? "rgba(29,91,191,0.75)"
                          : isCh
                            ? "rgba(192,40,40,0.7)"
                            : xwNum === 3
                              ? "rgba(160,115,15,0.7)"
                              : xwNum === 1
                                ? "rgba(13,116,104,0.65)"
                                : xwNum === 2
                                  ? "rgba(200,75,8,0.65)"
                                  : xwNum === 4
                                    ? "rgba(176,56,120,0.65)"
                                    : xwNum >= 5
                                      ? "rgba(109,48,176,0.65)"
                                      : isRom
                                        ? "rgba(34,211,238,0.65)"
                                        : isPor
                                          ? "rgba(167,139,250,0.65)"
                                          : "rgba(180,185,195,0.4)";

                        const cellTextColor = isGrCh
                          ? "#1d5bbf"
                          : isCh
                            ? "#c02828"
                            : xwNum === 1 ? "#0d7468" : xwNum === 2 ? "#b45a0a" : xwNum === 3 ? "#8a6518" : xwNum === 4 ? "#b03878" : xwNum >= 5 ? "#6d30b0"
                              : isRom ? "#0e7490" : isPor ? "#6d28d9"
                                : "#3a3a3a";

                        return { cellBg, cellBorder, cellTextColor, isChampion };
                      }

                      function renderCell(dog: { name: string; dog_id: number | null } | undefined, gen: number, rSpan: number, key: string) {
                        const name = dog?.name || "Unknown";
                        const { cellBg, cellBorder, cellTextColor, isChampion } = getCellStyle(name);
                        const fontSize = gen <= 2 ? 13 : gen === 3 ? 12 : 11;
                        return (
                          <td
                            key={key}
                            rowSpan={rSpan > 1 ? rSpan : undefined}
                            className="align-middle relative"
                            style={{
                              background: cellBg,
                              borderLeft: `4px solid ${cellBorder}`,
                              borderTop: "1px solid rgba(255,255,255,0.8)",
                              borderRadius: 6,
                              boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)",
                              padding: "6px 10px",
                              minHeight: 40,
                              fontSize,
                              fontWeight: isChampion ? 700 : 600,
                              color: cellTextColor,
                              fontFamily: "var(--font-table, Rajdhani, sans-serif)",
                              lineHeight: 1.1,
                              textShadow: "0 0.5px 0 rgba(255,255,255,0.5)",
                            }}
                          >
                            {isChampion && (
                              <span
                                className="absolute -top-0.5 -right-0.5 flex items-center justify-center rounded-full"
                                style={{
                                  fontSize: 9,
                                  color: "#b8860b",
                                  background: "linear-gradient(135deg, #fef3c7, #fde68a)",
                                  width: 15,
                                  height: 15,
                                  boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                                  border: "1px solid rgba(184,134,11,0.3)",
                                }}
                              >
                                ★
                              </span>
                            )}
                            {dog?.dog_id ? (
                              <a href={`/pedigree/${dog.dog_id}`} className="hover:underline" style={{ color: cellTextColor, textDecoration: "none" }}>
                                {name}
                              </a>
                            ) : name}
                          </td>
                        );
                      }

                      const tableRows: React.ReactNode[] = [];
                      for (let r = 0; r < TOTAL_ROWS; r++) {
                        const cells: React.ReactNode[] = [];
                        if (r % 8 === 0) cells.push(renderCell(genData[1]?.[Math.floor(r / 8)], 1, 8, "g1"));
                        if (r % 4 === 0) cells.push(renderCell(genData[2]?.[Math.floor(r / 4)], 2, 4, "g2"));
                        if (r % 2 === 0) cells.push(renderCell(genData[3]?.[Math.floor(r / 2)], 3, 2, "g3"));
                        cells.push(renderCell(genData[4]?.[r], 4, 1, "g4"));
                        tableRows.push(<tr key={r}>{cells}</tr>);
                      }
                      return tableRows;
                    })()}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            /* ====== EDIT MODE: Drag & Drop Canvas ====== */
            <Card className="h-full p-5 relative" style={{ minHeight: 560 }}>
              {/* COI badge */}
              <div
                className="absolute z-10 flex flex-col items-center"
                style={{ top: 16, left: "50%", transform: "translateX(-50%)" }}
              >
                <div
                  className="rounded-full px-5 py-1.5 flex items-center gap-2"
                  style={{
                    background: `${riskColor(coi)}18`,
                    border: `1.5px solid ${riskColor(coi)}55`,
                  }}
                >
                  <span
                    className="text-[10px] uppercase tracking-widest font-bold"
                    style={{ color: riskColor(coi), fontFamily: "var(--font-table, Rajdhani, sans-serif)" }}
                  >
                    COI
                  </span>
                  <span
                    className="text-lg font-black"
                    style={{ color: riskColor(coi), fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}
                  >
                    {coi.toFixed(1)}%
                  </span>
                </div>
                <span
                  className="text-[9px] uppercase tracking-widest mt-1 font-semibold"
                  style={{ color: riskColor(coi), fontFamily: "var(--font-table, Rajdhani, sans-serif)" }}
                >
                  {riskLabel(coi)}
                </span>
              </div>

              {/* Pedigree Tree Layout */}
              <div
                className="flex items-center justify-center h-full pt-16"
                style={{ minHeight: 460 }}
              >
                {/* Subject (left) */}
                <div className="flex flex-col items-center" style={{ width: 160 }}>
                  <DropZone
                    slotKey="subject"
                    label={SLOT_LABELS.subject}
                    dog={slots.subject}
                    preview={previewMode}
                    mockMode={mockMode}
                    mockName={mockNames.subject}
                    onMockNameChange={(v) => setMockNames((p) => ({ ...p, subject: v }))}
                    selected={selectedSlot === "subject"}
                    onSelect={() => setSelectedSlot("subject")}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onRemove={removeFromSlot}
                  />
                </div>

                {/* Lines: Subject -> Parents */}
                <div className="flex flex-col justify-center" style={{ width: 40 }}>
                  <div style={{ borderTop: "2px solid rgba(30,64,120,0.6)", width: "100%", marginBottom: 80 }} />
                  <div style={{ borderTop: "2px solid rgba(30,64,120,0.6)", width: "100%", marginTop: 80 }} />
                  {/* Vertical connector */}
                  <div
                    className="absolute"
                    style={{
                      width: 2,
                      height: 160,
                      background: "rgba(30,64,120,0.6)",
                      left: "calc(160px + 20px)",
                      top: "50%",
                      transform: "translateY(-50%)",
                      display: "none", /* handled by flex gap */
                    }}
                  />
                </div>

                {/* Parents (middle) */}
                <div className="flex flex-col items-center gap-10" style={{ width: 160 }}>
                  {/* Sire */}
                  <DropZone
                    slotKey="sire"
                    label={SLOT_LABELS.sire}
                    dog={slots.sire}
                    preview={previewMode}
                    mockMode={mockMode}
                    mockName={mockNames.sire}
                    onMockNameChange={(v) => setMockNames((p) => ({ ...p, sire: v }))}
                    selected={selectedSlot === "sire"}
                    onSelect={() => setSelectedSlot("sire")}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onRemove={removeFromSlot}
                    accentColor="#60a5fa"
                  />
                  {/* Dam */}
                  <DropZone
                    slotKey="dam"
                    label={SLOT_LABELS.dam}
                    dog={slots.dam}
                    preview={previewMode}
                    mockMode={mockMode}
                    mockName={mockNames.dam}
                    onMockNameChange={(v) => setMockNames((p) => ({ ...p, dam: v }))}
                    selected={selectedSlot === "dam"}
                    onSelect={() => setSelectedSlot("dam")}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onRemove={removeFromSlot}
                    accentColor="#f472b6"
                  />
                </div>

                {/* Lines: Parents -> Grandparents */}
                <div className="flex flex-col justify-center" style={{ width: 40 }}>
                  <div style={{ borderTop: "2px solid rgba(30,64,120,0.4)", width: "100%" }} />
                </div>

                {/* Grandparents (right) */}
                <div className="flex flex-col items-center gap-4" style={{ width: 160 }}>
                  <DropZone
                    slotKey="sire_sire"
                    label={SLOT_LABELS.sire_sire}
                    dog={slots.sire_sire}
                    preview={previewMode}
                    mockMode={mockMode}
                    mockName={mockNames.sire_sire}
                    onMockNameChange={(v) => setMockNames((p) => ({ ...p, sire_sire: v }))}
                    selected={selectedSlot === "sire_sire"}
                    onSelect={() => setSelectedSlot("sire_sire")}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onRemove={removeFromSlot}
                    accentColor="#60a5fa"
                    size="sm"
                  />
                  <DropZone
                    slotKey="sire_dam"
                    label={SLOT_LABELS.sire_dam}
                    dog={slots.sire_dam}
                    preview={previewMode}
                    mockMode={mockMode}
                    mockName={mockNames.sire_dam}
                    onMockNameChange={(v) => setMockNames((p) => ({ ...p, sire_dam: v }))}
                    selected={selectedSlot === "sire_dam"}
                    onSelect={() => setSelectedSlot("sire_dam")}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onRemove={removeFromSlot}
                    accentColor="#f472b6"
                    size="sm"
                  />
                  <DropZone
                    slotKey="dam_sire"
                    label={SLOT_LABELS.dam_sire}
                    dog={slots.dam_sire}
                    preview={previewMode}
                    mockMode={mockMode}
                    mockName={mockNames.dam_sire}
                    onMockNameChange={(v) => setMockNames((p) => ({ ...p, dam_sire: v }))}
                    selected={selectedSlot === "dam_sire"}
                    onSelect={() => setSelectedSlot("dam_sire")}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onRemove={removeFromSlot}
                    accentColor="#60a5fa"
                    size="sm"
                  />
                  <DropZone
                    slotKey="dam_dam"
                    label={SLOT_LABELS.dam_dam}
                    dog={slots.dam_dam}
                    preview={previewMode}
                    mockMode={mockMode}
                    mockName={mockNames.dam_dam}
                    onMockNameChange={(v) => setMockNames((p) => ({ ...p, dam_dam: v }))}
                    selected={selectedSlot === "dam_dam"}
                    onSelect={() => setSelectedSlot("dam_dam")}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onRemove={removeFromSlot}
                    accentColor="#f472b6"
                    size="sm"
                  />
                </div>
              </div>
            </Card>
          )}
        </main>

        {/* ---------------------------------------------------------- */}
        {/* RIGHT PANE - Details / Journal                             */}
        {/* ---------------------------------------------------------- */}
        <aside
          className="flex-shrink-0 flex flex-col overflow-hidden"
          style={{ width: 300 }}
        >
          <Card className="m-3 flex flex-col flex-1 overflow-y-auto" style={{ padding: 0 }}>
            <div className="p-4 space-y-4">
              {/* Panel header */}
              <p
                className="text-[10px] uppercase tracking-widest font-semibold"
                style={{ color: "var(--accent-gold, #d4a855)", fontFamily: "var(--font-table, Rajdhani, sans-serif)" }}
              >
                Details &amp; Actions
              </p>

              {/* Selected dog details */}
              {selectedDog ? (
                <div className="space-y-3">
                  <div
                    className="rounded-lg overflow-hidden"
                    style={{ border: `1px solid ${getDogColor(selectedDog.registered_name)}44` }}
                  >
                    {selectedDog.photo_url ? (
                      <img
                        src={`${PHOTO_BASE}${selectedDog.photo_url}`}
                        alt={selectedDog.registered_name}
                        className="w-full h-36 object-cover"
                      />
                    ) : (
                      <div
                        className="w-full h-36 flex items-center justify-center text-3xl"
                        style={{ background: "#0d1525", color: "#3a4a62" }}
                      >
                        {"\uD83D\uDC36"}
                      </div>
                    )}
                  </div>
                  <p
                    className="text-sm font-bold"
                    style={{
                      color: getDogColor(selectedDog.registered_name),
                      fontFamily: "var(--font-table, Rajdhani, sans-serif)",
                    }}
                  >
                    {sexIcon(selectedDog.sex)} {selectedDog.registered_name}
                  </p>
                  <p className="text-[10px]" style={{ color: "#5a6a82" }}>
                    Slot: {selectedSlot ? SLOT_LABELS[selectedSlot] : "--"} | ID: {selectedDog.dog_id}
                  </p>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-xs" style={{ color: "#3a4a62" }}>
                    Select a dog on the canvas to view details
                  </p>
                </div>
              )}

              {/* Divider */}
              <div style={{ borderTop: "1px solid rgba(30,64,120,0.4)" }} />

              {/* Preview toggle */}
              <button
                onClick={async () => {
                  if (previewMode) {
                    setPreviewMode(false);
                    setPreviewTree([]);
                  } else {
                    // Fetch 4-gen tree when sire and/or dam are placed
                    const sireId = slots.sire?.dog_id || 0;
                    const damId = slots.dam?.dog_id || 0;
                    if (sireId || damId) {
                      setPreviewLoading(true);
                      try {
                        const res = await fetch(`/api/dogs/pedigree-tree?sire_id=${sireId}&dam_id=${damId}&gens=4`);
                        if (res.ok) {
                          const data = await res.json();
                          setPreviewTree(data.rows || []);
                        }
                      } catch { /* ignore */ }
                      setPreviewLoading(false);
                    }
                    setPreviewMode(true);
                  }
                }}
                className="w-full rounded-lg py-2.5 text-xs font-bold uppercase tracking-widest transition-all hover:scale-[1.02]"
                style={{
                  fontFamily: "var(--font-table, Rajdhani, sans-serif)",
                  background: previewMode
                    ? "linear-gradient(135deg, #d4a855, #f5d994)"
                    : "var(--bg-elevated, #1c2740)",
                  color: previewMode ? "#0b1120" : "#d4a855",
                  border: `1.5px solid ${previewMode ? "#d4a855" : "rgba(30,64,120,0.6)"}`,
                }}
              >
                {previewLoading ? "Loading..." : previewMode ? "\u2716 Exit Preview" : "\u25B6 Preview"}
              </button>

              {/* Create & Publish */}
              <button
                onClick={() => {
                  setPublishForm(defaultPublishForm());
                  setShowPublishModal(true);
                }}
                className="w-full rounded-lg py-2.5 text-xs font-bold uppercase tracking-widest transition-all hover:scale-[1.02]"
                style={{
                  fontFamily: "var(--font-table, Rajdhani, sans-serif)",
                  background: "linear-gradient(135deg, #d4a855 0%, #f5d994 50%, #d4a855 100%)",
                  color: "#0b1120",
                  border: "1.5px solid #d4a855",
                  boxShadow: "0 0 15px rgba(212,168,85,0.2)",
                }}
              >
                + Create &amp; Publish
              </button>

              {/* Mock Mode */}
              <div className="flex items-center justify-between">
                <span
                  className="text-[10px] uppercase tracking-widest font-semibold"
                  style={{ color: "#5a6a82", fontFamily: "var(--font-table, Rajdhani, sans-serif)" }}
                >
                  Mock Mode
                </span>
                <button
                  onClick={() => setMockMode(!mockMode)}
                  className="relative w-10 h-5 rounded-full transition-colors"
                  style={{
                    background: mockMode ? "#d4a855" : "rgba(30,64,120,0.5)",
                  }}
                >
                  <div
                    className="absolute top-0.5 w-4 h-4 rounded-full transition-transform"
                    style={{
                      background: "#fff",
                      left: mockMode ? 22 : 2,
                      transition: "left 0.2s ease",
                    }}
                  />
                </button>
              </div>
              {mockMode && (
                <p className="text-[10px]" style={{ color: "#d4a855" }}>
                  Mock mode active -- edit names and colors without saving.
                </p>
              )}
            </div>
          </Card>
        </aside>
      </div>

      {/* ============================================================ */}
      {/* BOTTOM STATUS BAR                                            */}
      {/* ============================================================ */}
      <footer
        className="px-6 py-3 flex items-center justify-between"
        style={{
          ...STEEL_FRAME,
          background: "linear-gradient(180deg, #141418 0%, #0e1322 100%)",
        }}
      >
        <div className="flex items-center gap-6">
          <span
            className="text-[10px] uppercase tracking-widest font-semibold"
            style={{ color: "#5a6a82", fontFamily: "var(--font-table, Rajdhani, sans-serif)" }}
          >
            Dogs Placed:{" "}
            <span style={{ color: "#d4a855", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>
              {dogsPlacedCount} / 7
            </span>
          </span>
          <span
            className="text-[10px] uppercase tracking-widest font-semibold"
            style={{ color: "#5a6a82", fontFamily: "var(--font-table, Rajdhani, sans-serif)" }}
          >
            COI:{" "}
            <span style={{ color: riskColor(coi), fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>
              {coi.toFixed(1)}%
            </span>
          </span>
        </div>
        <div
          className="rounded-full px-4 py-1 text-[10px] uppercase tracking-widest font-bold"
          style={{
            fontFamily: "var(--font-table, Rajdhani, sans-serif)",
            background: previewMode ? "rgba(212,168,85,0.15)" : "rgba(30,64,120,0.2)",
            color: previewMode ? "#d4a855" : "#5a6a82",
            border: `1px solid ${previewMode ? "rgba(212,168,85,0.4)" : "rgba(30,64,120,0.4)"}`,
          }}
        >
          {previewMode ? "Preview Mode" : "Edit Mode"}
        </div>
      </footer>

      {/* ============================================================ */}
      {/* PUBLISH MODAL                                                */}
      {/* ============================================================ */}
      {showPublishModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowPublishModal(false)}
        >
          <Card
            className="w-full max-w-lg max-h-[85vh] overflow-y-auto"
            style={{ margin: 16, padding: 0 }}
          >
            <div
              className="p-5 space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between">
                <h2
                  className="text-lg font-black uppercase tracking-widest"
                  style={{
                    fontFamily: "var(--font-display, Oswald, sans-serif)",
                    background: "linear-gradient(135deg, #d4a855 0%, #f5d994 50%, #d4a855 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  Create &amp; Publish
                </h2>
                <button
                  onClick={() => setShowPublishModal(false)}
                  className="text-sm hover:text-white transition-colors"
                  style={{ color: "#5a6a82" }}
                >
                  {"\u2716"}
                </button>
              </div>

              {/* Prefix + Name */}
              <div>
                <label
                  className="block text-[10px] uppercase tracking-widest font-semibold mb-1"
                  style={{ color: "#5a6a82", fontFamily: "var(--font-table, Rajdhani, sans-serif)" }}
                >
                  Prefix
                </label>
                <select
                  value={publishForm.prefix}
                  onChange={(e) => setPublishForm((p) => ({ ...p, prefix: e.target.value }))}
                  className="rounded-lg px-2 py-2 text-xs outline-none"
                  style={{
                    background: "var(--bg-deep, #0b1120)",
                    border: "1px solid rgba(30,64,120,0.5)",
                    color: "#e2e8f0",
                    fontFamily: "var(--font-table, Rajdhani, sans-serif)",
                    width: 90,
                  }}
                >
                  <option value="">None</option>
                  <option value="CH">CH</option>
                  <option value="GR CH">GR CH</option>
                  <option value="DBL GR CH">DBL GR CH</option>
                </select>
              </div>
              <ModalInput
                label="Name"
                value={publishForm.name}
                onChange={(v) => setPublishForm((p) => ({ ...p, name: v }))}
              />

              {/* Suffix */}
              <div>
                <label
                  className="block text-[10px] uppercase tracking-widest font-semibold mb-1"
                  style={{ color: "#5a6a82", fontFamily: "var(--font-table, Rajdhani, sans-serif)" }}
                >
                  Suffix
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={publishForm.suffixWins}
                    onChange={(e) => setPublishForm((p) => ({ ...p, suffixWins: e.target.value }))}
                    className="rounded-lg px-2 py-2 text-xs outline-none"
                    style={{
                      background: "var(--bg-deep, #0b1120)",
                      border: "1px solid rgba(30,64,120,0.5)",
                      color: "#e2e8f0",
                      fontFamily: "var(--font-table, Rajdhani, sans-serif)",
                      width: 90,
                    }}
                  >
                    <option value="">Wins</option>
                    {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                      <option key={n} value={`${n}XW`}>{n}XW</option>
                    ))}
                  </select>
                  <select
                    value={publishForm.suffixLosses}
                    onChange={(e) => setPublishForm((p) => ({ ...p, suffixLosses: e.target.value }))}
                    className="rounded-lg px-2 py-2 text-xs outline-none"
                    style={{
                      background: "var(--bg-deep, #0b1120)",
                      border: "1px solid rgba(30,64,120,0.5)",
                      color: "#e2e8f0",
                      fontFamily: "var(--font-table, Rajdhani, sans-serif)",
                      width: 90,
                    }}
                  >
                    <option value="">Losses</option>
                    {[1,2,3].map((n) => (
                      <option key={n} value={`${n}XL`}>{n}XL</option>
                    ))}
                  </select>
                  <select
                    value={publishForm.suffixDraws}
                    onChange={(e) => setPublishForm((p) => ({ ...p, suffixDraws: e.target.value }))}
                    className="rounded-lg px-2 py-2 text-xs outline-none"
                    style={{
                      background: "var(--bg-deep, #0b1120)",
                      border: "1px solid rgba(30,64,120,0.5)",
                      color: "#e2e8f0",
                      fontFamily: "var(--font-table, Rajdhani, sans-serif)",
                      width: 90,
                    }}
                  >
                    <option value="">Draws</option>
                    {[1,2,3].map((n) => (
                      <option key={n} value={`${n}XD`}>{n}XD</option>
                    ))}
                  </select>
                  <select
                    value={publishForm.suffixHonors}
                    onChange={(e) => setPublishForm((p) => ({ ...p, suffixHonors: e.target.value }))}
                    className="rounded-lg px-2 py-2 text-xs outline-none"
                    style={{
                      background: "var(--bg-deep, #0b1120)",
                      border: "1px solid rgba(30,64,120,0.5)",
                      color: "#e2e8f0",
                      fontFamily: "var(--font-table, Rajdhani, sans-serif)",
                      width: 90,
                    }}
                  >
                    <option value="">Honors</option>
                    <option value="POR">POR</option>
                    <option value="ROM">ROM</option>
                  </select>
                </div>
                {/* Preview of built suffix */}
                {(publishForm.suffixWins || publishForm.suffixLosses || publishForm.suffixDraws || publishForm.suffixHonors) && (
                  <p className="mt-1.5 text-xs font-semibold" style={{ color: "#d4a855", fontFamily: "var(--font-table, Rajdhani, sans-serif)" }}>
                    {[
                      publishForm.suffixWins ? `(${publishForm.suffixWins})` : "",
                      publishForm.suffixLosses ? `(${publishForm.suffixLosses})` : "",
                      publishForm.suffixDraws ? `(${publishForm.suffixDraws})` : "",
                      publishForm.suffixHonors || "",
                    ].filter(Boolean).join(" ")}
                  </p>
                )}
              </div>

              {/* Dog Info */}
              <div className="grid grid-cols-2 gap-3">
                <ModalInput
                  label="DOB"
                  type="date"
                  value={publishForm.dob}
                  onChange={(v) => setPublishForm((p) => ({ ...p, dob: v }))}
                />
                <div>
                  <label
                    className="block text-[10px] uppercase tracking-widest font-semibold mb-1"
                    style={{ color: "#5a6a82", fontFamily: "var(--font-table, Rajdhani, sans-serif)" }}
                  >
                    Sex
                  </label>
                  <select
                    value={publishForm.sex}
                    onChange={(e) => setPublishForm((p) => ({ ...p, sex: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{
                      background: "var(--bg-deep, #0b1120)",
                      border: "1px solid rgba(30,64,120,0.5)",
                      color: "#e2e8f0",
                      fontFamily: "var(--font-table, Rajdhani, sans-serif)",
                    }}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <ModalInput
                  label="Color"
                  value={publishForm.color}
                  onChange={(v) => setPublishForm((p) => ({ ...p, color: v }))}
                />
              </div>

              {/* Continent & Country */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    className="block text-[10px] uppercase tracking-widest font-semibold mb-1"
                    style={{ color: "#5a6a82", fontFamily: "var(--font-table, Rajdhani, sans-serif)" }}
                  >
                    Continent
                  </label>
                  <select
                    value={publishForm.continent}
                    onChange={(e) => setPublishForm((p) => ({ ...p, continent: e.target.value, country: "" }))}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{
                      background: "var(--bg-deep, #0b1120)",
                      border: "1px solid rgba(30,64,120,0.5)",
                      color: "#e2e8f0",
                      fontFamily: "var(--font-table, Rajdhani, sans-serif)",
                    }}
                  >
                    <option value="">Select</option>
                    <option value="North America">North America</option>
                    <option value="South America">South America</option>
                    <option value="Europe">Europe</option>
                    <option value="Asia">Asia</option>
                    <option value="Africa">Africa</option>
                    <option value="Oceania">Oceania</option>
                  </select>
                </div>
                <div>
                  <label
                    className="block text-[10px] uppercase tracking-widest font-semibold mb-1"
                    style={{ color: "#5a6a82", fontFamily: "var(--font-table, Rajdhani, sans-serif)" }}
                  >
                    Country
                  </label>
                  <select
                    value={publishForm.country}
                    onChange={(e) => setPublishForm((p) => ({ ...p, country: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{
                      background: "var(--bg-deep, #0b1120)",
                      border: "1px solid rgba(30,64,120,0.5)",
                      color: "#e2e8f0",
                      fontFamily: "var(--font-table, Rajdhani, sans-serif)",
                    }}
                  >
                    <option value="">Select</option>
                    {(COUNTRY_MAP[publishForm.continent] || []).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label
                  className="block text-[10px] uppercase tracking-widest font-semibold mb-2"
                  style={{ color: "#5a6a82", fontFamily: "var(--font-table, Rajdhani, sans-serif)" }}
                >
                  Notes
                </label>
                <textarea
                  rows={3}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-all focus:ring-1"
                  style={{
                    background: "var(--bg-deep, #0b1120)",
                    border: "1px solid rgba(30,64,120,0.5)",
                    color: "#e2e8f0",
                    fontFamily: "var(--font-table, Rajdhani, sans-serif)",
                    resize: "vertical",
                  }}
                  value={publishForm.notes}
                  onChange={(e) => setPublishForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Additional notes..."
                />
              </div>

              {/* Photo upload */}
              <div>
                <label
                  className="block text-[10px] uppercase tracking-widest font-semibold mb-2"
                  style={{ color: "#5a6a82", fontFamily: "var(--font-table, Rajdhani, sans-serif)" }}
                >
                  Photo
                </label>
                <div
                  className="rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer transition-all hover:border-opacity-80"
                  style={{
                    background: "var(--bg-deep, #0b1120)",
                    border: "2px dashed rgba(30,64,120,0.5)",
                    minHeight: 100,
                  }}
                  onClick={() => document.getElementById("photo-upload")?.click()}
                >
                  {publishForm.photoPreview ? (
                    <img
                      src={publishForm.photoPreview}
                      alt="Preview"
                      className="max-h-32 rounded-lg object-cover"
                    />
                  ) : (
                    <>
                      <span className="text-2xl mb-1" style={{ color: "#3a4a62" }}>
                        {"\uD83D\uDCF7"}
                      </span>
                      <span className="text-[10px]" style={{ color: "#5a6a82" }}>
                        Click to upload photo
                      </span>
                    </>
                  )}
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </div>
              </div>

              {/* Divider */}
              <div style={{ borderTop: "1px solid rgba(30,64,120,0.4)" }} />

              {/* Journal Section */}
              <p
                className="text-lg font-black uppercase tracking-widest"
                style={{
                  fontFamily: "var(--font-display, Oswald, sans-serif)",
                  background: "linear-gradient(135deg, #d4a855 0%, #f5d994 50%, #d4a855 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Journal
              </p>

              {/* Rabies */}
              <div className="grid grid-cols-2 gap-3">
                <ModalInput
                  label="Rabies: Date Given"
                  type="date"
                  value={publishForm.journal.rabiesDate}
                  onChange={handleRabiesDateChange}
                />
                <div>
                  <label
                    className="block text-[10px] uppercase tracking-widest font-semibold mb-1"
                    style={{ color: "#5a6a82", fontFamily: "var(--font-table, Rajdhani, sans-serif)" }}
                  >
                    Rabies: Next Due
                  </label>
                  <div
                    className="w-full rounded-lg px-3 py-2 text-sm"
                    style={{
                      background: "rgba(30,64,120,0.15)",
                      border: "1px solid rgba(30,64,120,0.3)",
                      color: publishForm.journal.rabiesNextDue ? "#22c55e" : "#3a4a62",
                      fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                    }}
                  >
                    {publishForm.journal.rabiesNextDue || "Auto-calculated"}
                  </div>
                </div>
              </div>

              {/* AVID Chip */}
              <ModalInput
                label="AVID Chip"
                value={publishForm.journal.avidChip}
                onChange={(v) =>
                  setPublishForm((p) => ({
                    ...p,
                    journal: { ...p.journal, avidChip: v },
                  }))
                }
                placeholder="Enter chip number..."
              />

              {/* Vaccines */}
              <div>
                <label
                  className="block text-[10px] uppercase tracking-widest font-semibold mb-2"
                  style={{ color: "#5a6a82", fontFamily: "var(--font-table, Rajdhani, sans-serif)" }}
                >
                  Vaccines
                </label>
                <div className="space-y-2">
                  {publishForm.journal.vaccines.map((vax, idx) => (
                    <div
                      key={vax.name}
                      className="flex items-center gap-3 rounded-lg px-3 py-2"
                      style={{
                        background: "var(--bg-deep, #0b1120)",
                        border: "1px solid rgba(30,64,120,0.3)",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={vax.checked}
                        onChange={() => handleVaccineToggle(idx)}
                        className="rounded"
                        style={{ accentColor: "#d4a855" }}
                      />
                      <span
                        className="text-xs flex-1 font-semibold"
                        style={{
                          color: vax.checked ? "#e2e8f0" : "#5a6a82",
                          fontFamily: "var(--font-table, Rajdhani, sans-serif)",
                        }}
                      >
                        {vax.name}
                      </span>
                      {vax.checked && (
                        <input
                          type="date"
                          value={vax.date}
                          onChange={(e) => handleVaccineDate(idx, e.target.value)}
                          className="rounded px-2 py-1 text-[10px] outline-none"
                          style={{
                            background: "var(--bg-elevated, #1c2740)",
                            border: "1px solid rgba(30,64,120,0.4)",
                            color: "#e2e8f0",
                            fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Worming */}
              <div>
                <label
                  className="block text-[10px] uppercase tracking-widest font-semibold mb-2"
                  style={{ color: "#5a6a82", fontFamily: "var(--font-table, Rajdhani, sans-serif)" }}
                >
                  Worming
                </label>

                {/* Worming Draft Form */}
                <div
                  className="rounded-lg p-3 space-y-3"
                  style={{ background: "var(--bg-deep, #0b1120)", border: "1px solid rgba(30,64,120,0.3)" }}
                >
                  {/* Type */}
                  <select
                    value={publishForm.journal.wormingDraft.type}
                    onChange={(e) =>
                      setPublishForm((p) => ({
                        ...p,
                        journal: { ...p.journal, wormingDraft: { ...p.journal.wormingDraft, type: e.target.value, otherType: "" } },
                      }))
                    }
                    className="w-full rounded-lg px-3 py-2 text-xs outline-none"
                    style={{
                      background: "var(--bg-elevated, #1c2740)",
                      border: "1px solid rgba(30,64,120,0.4)",
                      color: "#e2e8f0",
                      fontFamily: "var(--font-table, Rajdhani, sans-serif)",
                    }}
                  >
                    <option value="">Select Type</option>
                    <option value="Ivermectin/Milbemycin">Ivermectin/Milbemycin (heartworm + round/hook)</option>
                    <option value="Pyrantel">Pyrantel (round/hook)</option>
                    <option value="Fenbendazole/Panacur">Fenbendazole/Panacur (broad + giardia)</option>
                    <option value="Other">Other</option>
                  </select>

                  {/* Other text field */}
                  {publishForm.journal.wormingDraft.type === "Other" && (
                    <input
                      type="text"
                      placeholder="Specify type..."
                      value={publishForm.journal.wormingDraft.otherType}
                      onChange={(e) =>
                        setPublishForm((p) => ({
                          ...p,
                          journal: { ...p.journal, wormingDraft: { ...p.journal.wormingDraft, otherType: e.target.value } },
                        }))
                      }
                      className="w-full rounded-lg px-3 py-2 text-xs outline-none"
                      style={{
                        background: "var(--bg-elevated, #1c2740)",
                        border: "1px solid rgba(30,64,120,0.4)",
                        color: "#e2e8f0",
                        fontFamily: "var(--font-table, Rajdhani, sans-serif)",
                      }}
                    />
                  )}

                  {/* Date Wormed */}
                  <div>
                    <span className="text-[9px] uppercase tracking-widest font-semibold" style={{ color: "#5a6a82", fontFamily: "var(--font-table, Rajdhani, sans-serif)" }}>
                      Date Wormed
                    </span>
                    <input
                      type="date"
                      value={publishForm.journal.wormingDraft.dateWormed}
                      onChange={(e) => {
                        const dateWormed = e.target.value;
                        const days = publishForm.journal.wormingDraft.intervalDays;
                        setPublishForm((p) => ({
                          ...p,
                          journal: {
                            ...p.journal,
                            wormingDraft: {
                              ...p.journal.wormingDraft,
                              dateWormed,
                              nextDue: calcWormingDue(dateWormed, days),
                            },
                          },
                        }));
                      }}
                      className="w-full rounded-lg px-3 py-2 text-xs outline-none mt-1"
                      style={{
                        background: "var(--bg-elevated, #1c2740)",
                        border: "1px solid rgba(30,64,120,0.4)",
                        color: "#e2e8f0",
                        fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                      }}
                    />
                  </div>

                  {/* Next Due toggle buttons */}
                  <div>
                    <span className="text-[9px] uppercase tracking-widest font-semibold" style={{ color: "#5a6a82", fontFamily: "var(--font-table, Rajdhani, sans-serif)" }}>
                      Next Due
                    </span>
                    <div className="flex gap-2 mt-1">
                      {[30, 60, 90].map((days) => (
                        <button
                          key={days}
                          type="button"
                          onClick={() => {
                            const dateWormed = publishForm.journal.wormingDraft.dateWormed;
                            setPublishForm((p) => ({
                              ...p,
                              journal: {
                                ...p.journal,
                                wormingDraft: {
                                  ...p.journal.wormingDraft,
                                  intervalDays: days,
                                  nextDue: calcWormingDue(dateWormed, days),
                                },
                              },
                            }));
                          }}
                          className="rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all"
                          style={{
                            fontFamily: "var(--font-table, Rajdhani, sans-serif)",
                            background: publishForm.journal.wormingDraft.intervalDays === days
                              ? "rgba(212,168,85,0.2)"
                              : "var(--bg-elevated, #1c2740)",
                            color: publishForm.journal.wormingDraft.intervalDays === days
                              ? "#d4a855"
                              : "#5a6a82",
                            border: `1px solid ${publishForm.journal.wormingDraft.intervalDays === days ? "rgba(212,168,85,0.5)" : "rgba(30,64,120,0.4)"}`,
                          }}
                        >
                          {days} days
                        </button>
                      ))}
                    </div>
                    {publishForm.journal.wormingDraft.nextDue && (
                      <p className="text-[10px] mt-1" style={{ color: "#22c55e", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>
                        Due: {formatDateShort(publishForm.journal.wormingDraft.nextDue)}
                      </p>
                    )}
                  </div>

                  {/* Remind Me */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={publishForm.journal.wormingDraft.remindMe}
                      onChange={() =>
                        setPublishForm((p) => ({
                          ...p,
                          journal: { ...p.journal, wormingDraft: { ...p.journal.wormingDraft, remindMe: !p.journal.wormingDraft.remindMe } },
                        }))
                      }
                      style={{ accentColor: "#d4a855" }}
                    />
                    <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "#5a6a82", fontFamily: "var(--font-table, Rajdhani, sans-serif)" }}>
                      Remind Me
                    </span>
                  </div>

                  {/* Add Entry Button */}
                  <button
                    type="button"
                    onClick={() => {
                      const draft = publishForm.journal.wormingDraft;
                      if (!draft.type || !draft.dateWormed) return;
                      setPublishForm((p) => ({
                        ...p,
                        journal: {
                          ...p.journal,
                          worming: [...p.journal.worming, { ...draft }],
                          wormingDraft: defaultWormingDraft(),
                        },
                      }));
                    }}
                    className="w-full rounded-lg py-2 text-[10px] font-bold uppercase tracking-widest transition-all hover:scale-[1.02]"
                    style={{
                      fontFamily: "var(--font-table, Rajdhani, sans-serif)",
                      background: "rgba(212,168,85,0.15)",
                      color: "#d4a855",
                      border: "1px solid rgba(212,168,85,0.4)",
                    }}
                  >
                    + Add Worming Entry
                  </button>
                </div>

                {/* Worming History Table */}
                {publishForm.journal.worming.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {publishForm.journal.worming.map((entry, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-lg px-3 py-2"
                        style={{
                          background: "var(--bg-deep, #0b1120)",
                          border: "1px solid rgba(30,64,120,0.3)",
                        }}
                      >
                        <div className="flex items-center gap-2">
                          {entry.remindMe && (
                            <span className="text-[9px] rounded-full px-1.5 py-0.5" style={{ background: "rgba(212,168,85,0.2)", color: "#d4a855" }}>
                              {"\uD83D\uDD14"}
                            </span>
                          )}
                          <span className="text-[10px] font-semibold" style={{ color: "#e2e8f0", fontFamily: "var(--font-table, Rajdhani, sans-serif)" }}>
                            {entry.type === "Other" ? entry.otherType || "Other" : entry.type}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px]" style={{ color: "#e2e8f0", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>
                            {formatDateShort(entry.dateWormed)}
                          </span>
                          {entry.nextDue && (
                            <>
                              <span className="text-[9px]" style={{ color: "#5a6a82" }}>→</span>
                              <span className="text-[10px]" style={{ color: "#22c55e", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>
                                Due: {formatDateShort(entry.nextDue)}
                              </span>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              setPublishForm((p) => ({
                                ...p,
                                journal: { ...p.journal, worming: p.journal.worming.filter((_, i) => i !== idx) },
                              }))
                            }
                            className="text-[10px] hover:text-red-400 transition-colors"
                            style={{ color: "#5a6a82" }}
                          >
                            {"\u2716"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label
                  className="block text-[10px] uppercase tracking-widest font-semibold mb-1"
                  style={{ color: "#5a6a82", fontFamily: "var(--font-table, Rajdhani, sans-serif)" }}
                >
                  Notes
                </label>
                <textarea
                  value={publishForm.journal.notes}
                  onChange={(e) =>
                    setPublishForm((p) => ({
                      ...p,
                      journal: { ...p.journal, notes: e.target.value },
                    }))
                  }
                  rows={3}
                  placeholder="Additional notes..."
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none"
                  style={{
                    background: "var(--bg-deep, #0b1120)",
                    border: "1px solid rgba(30,64,120,0.5)",
                    color: "#e2e8f0",
                    fontFamily: "var(--font-table, Rajdhani, sans-serif)",
                  }}
                />
              </div>

              {/* Submit */}
              <button
                onClick={() => {
                  // Placeholder: would POST to API
                  alert("Published! (placeholder)");
                  setShowPublishModal(false);
                }}
                className="w-full rounded-lg py-3 text-sm font-bold uppercase tracking-widest transition-all hover:scale-[1.02]"
                style={{
                  fontFamily: "var(--font-display, Oswald, sans-serif)",
                  background: "linear-gradient(135deg, #d4a855 0%, #f5d994 50%, #d4a855 100%)",
                  color: "#0b1120",
                  border: "1.5px solid #d4a855",
                  boxShadow: "0 0 20px rgba(212,168,85,0.25)",
                }}
              >
                Submit &amp; Publish
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/* DropZone component                                                  */
/* ================================================================== */
function DropZone({
  slotKey,
  label,
  dog,
  preview,
  mockMode,
  mockName,
  onMockNameChange,
  selected,
  onSelect,
  onDrop,
  onDragOver,
  onRemove,
  accentColor,
  size = "md",
}: {
  slotKey: SlotKey;
  label: string;
  dog: SlotDog | null;
  preview: boolean;
  mockMode: boolean;
  mockName?: string;
  onMockNameChange: (v: string) => void;
  selected: boolean;
  onSelect: () => void;
  onDrop: (key: SlotKey) => void;
  onDragOver: (e: React.DragEvent) => void;
  onRemove: (key: SlotKey) => void;
  accentColor?: string;
  size?: "sm" | "md";
}) {
  const [dragOver, setDragOver] = useState(false);
  const isSm = size === "sm";
  const accent = accentColor || "#d4a855";
  const displayName = mockMode && mockName !== undefined && mockName !== "" ? mockName : dog?.registered_name;
  const titleColor = displayName ? getDogColor(displayName) : accent;

  if (dog) {
    return (
      <div
        className={`rounded-xl cursor-pointer transition-all ${selected ? "ring-2" : ""}`}
        style={{
          width: isSm ? 140 : 155,
          padding: isSm ? 8 : 12,
          background: selected
            ? "rgba(212,168,85,0.08)"
            : "var(--bg-elevated, #1c2740)",
          border: `1.5px solid ${selected ? "#d4a855" : titleColor + "44"}`,
          boxShadow: selected
            ? "0 0 15px rgba(212,168,85,0.15)"
            : `0 0 8px ${titleColor}15`,
          outline: "none",
        }}
        onClick={onSelect}
        onDragOver={(e) => {
          onDragOver(e);
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          onDrop(slotKey);
        }}
      >
        {/* Photo */}
        <div
          className={`rounded-lg bg-cover bg-center mx-auto mb-2 ${isSm ? "w-12 h-12" : "w-16 h-16"}`}
          style={{
            backgroundImage: dog.photo_url
              ? `url(${PHOTO_BASE}${dog.photo_url})`
              : "none",
            backgroundColor: dog.photo_url ? "transparent" : "#0d1525",
            border: `1px solid ${titleColor}44`,
          }}
        >
          {!dog.photo_url && (
            <div className="w-full h-full flex items-center justify-center text-sm" style={{ color: "#3a4a62" }}>
              {"\uD83D\uDC36"}
            </div>
          )}
        </div>
        {/* Name */}
        {mockMode ? (
          <input
            value={mockName || displayName || ""}
            onChange={(e) => onMockNameChange(e.target.value)}
            className="w-full text-center text-[10px] font-bold bg-transparent outline-none border-b"
            style={{
              color: titleColor,
              borderColor: titleColor + "33",
              fontFamily: "var(--font-table, Rajdhani, sans-serif)",
            }}
          />
        ) : (
          <p
            className={`text-center font-bold truncate ${isSm ? "text-[9px]" : "text-[10px]"}`}
            style={{ color: titleColor, fontFamily: "var(--font-table, Rajdhani, sans-serif)" }}
          >
            {displayName}
          </p>
        )}
        {/* Label */}
        <p className="text-center text-[8px] mt-0.5" style={{ color: "#3a4a62" }}>
          {label}
        </p>
        {/* Remove button */}
        {!preview && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(slotKey);
            }}
            className="block mx-auto mt-1 text-[8px] hover:text-red-400 transition-colors"
            style={{ color: "#5a6a82" }}
          >
            remove
          </button>
        )}
      </div>
    );
  }

  /* Empty drop zone */
  if (preview) {
    return (
      <div
        className="rounded-xl"
        style={{
          width: isSm ? 140 : 155,
          height: isSm ? 70 : 90,
          background: "rgba(30,64,120,0.05)",
          border: "1px solid rgba(30,64,120,0.15)",
        }}
      />
    );
  }

  return (
    <div
      className={`rounded-xl flex flex-col items-center justify-center transition-all ${
        dragOver ? "scale-105" : ""
      }`}
      style={{
        width: isSm ? 140 : 155,
        height: isSm ? 70 : 90,
        background: dragOver ? "rgba(212,168,85,0.06)" : "transparent",
        border: dragOver
          ? "2px dashed #d4a855"
          : `2px dashed rgba(30,64,120,0.4)`,
        boxShadow: dragOver ? "0 0 15px rgba(212,168,85,0.1)" : "none",
      }}
      onDragOver={(e) => {
        onDragOver(e);
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        onDrop(slotKey);
      }}
    >
      <span className="text-lg mb-1" style={{ color: dragOver ? "#d4a855" : "#2a3a52" }}>
        +
      </span>
      <span
        className={`${isSm ? "text-[8px]" : "text-[9px]"} uppercase tracking-widest font-semibold`}
        style={{
          color: dragOver ? "#d4a855" : "#3a4a62",
          fontFamily: "var(--font-table, Rajdhani, sans-serif)",
        }}
      >
        {label}
      </span>
    </div>
  );
}

/* ================================================================== */
/* ModalInput helper                                                   */
/* ================================================================== */
function ModalInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label
        className="block text-[10px] uppercase tracking-widest font-semibold mb-1"
        style={{ color: "#5a6a82", fontFamily: "var(--font-table, Rajdhani, sans-serif)" }}
      >
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-all focus:ring-1"
        style={{
          background: "var(--bg-deep, #0b1120)",
          border: "1px solid rgba(30,64,120,0.5)",
          color: "#e2e8f0",
          fontFamily: "var(--font-table, Rajdhani, sans-serif)",
        }}
      />
    </div>
  );
}
