"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getDogColor } from "@/app/utils/colors";

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

interface HeatCycleData {
  lastHeatDate: string;
  interval: string; // "120" | "180" | "365" | custom number
  customDays: string;
  reminderEnabled: boolean;
}

interface JournalData {
  rabiesDate: string;
  rabiesNextDue: string;
  avidChip: string;
  vaccines: VaccineEntry[];
  worming: WormingEntry[];
  wormingDraft: WormingEntry;
  heatCycle: HeatCycleData;
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
  breeder: string;
  owner: string;
  conditionedWeight: string;
  notes: string;
  photoFile: File | null;
  photoPreview: string;
  journal: JournalData;
  datePosted: string;
  lastModified: string;
  viewCount: number;
  showInTitleFeed: boolean;
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
  border: "2px solid #C9B29F",
};

const PANEL_BG = "#FAF7F2";

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */
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

function calcCOIFromTree(rows: { gen: number; pos: number; dog_id: number | null; name: string }[]): number {
  /* Wright's COI from a pedigree tree.
     For each ancestor that appears on BOTH the sire's side and dam's side,
     COI += (1/2)^(n1+n2+1) where n1, n2 are the number of generations
     from sire/dam to the common ancestor. */
  if (!rows || rows.length === 0) return 0;

  // Build maps: dog_id -> list of (side, generation) where side = 'S' or 'D'
  // Gen 1 pos 0 = sire side, Gen 1 pos 1 = dam side
  // For gen g, positions 0..2^(g-1)-1 are sire side, 2^(g-1)..2^g-1 are dam side
  const sireAncestors: Map<number, number[]> = new Map(); // dog_id -> [gen, gen, ...]
  const damAncestors: Map<number, number[]> = new Map();

  for (const row of rows) {
    if (!row.dog_id) continue;
    const halfSize = Math.pow(2, row.gen - 1);
    const isSireSide = row.pos < halfSize;

    const map = isSireSide ? sireAncestors : damAncestors;
    if (!map.has(row.dog_id)) map.set(row.dog_id, []);
    map.get(row.dog_id)!.push(row.gen);
  }

  // Find common ancestors and calculate COI
  let coi = 0;
  for (const [dogId, sireGens] of sireAncestors) {
    const damGens = damAncestors.get(dogId);
    if (!damGens) continue;
    // For each pair of paths through common ancestor
    for (const sg of sireGens) {
      for (const dg of damGens) {
        // n1 = generations from sire to ancestor, n2 = generations from dam to ancestor
        // In our tree, gen 1 = parents, so n = gen (since subject is gen 0)
        coi += Math.pow(0.5, sg + dg + 1);
      }
    }
  }

  return Math.round(coi * 10000) / 100; // percentage with 2 decimal precision
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
    heatCycle: { lastHeatDate: "", interval: "180", customDays: "180", reminderEnabled: true },
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
    breeder: "",
    owner: "",
    conditionedWeight: "",
    notes: "",
    photoFile: null,
    photoPreview: "",
    journal: defaultJournal(),
    datePosted: "",
    lastModified: "",
    viewCount: 0,
    showInTitleFeed: false,
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
      className={`overflow-hidden ${className}`}
      style={{
        ...STEEL_FRAME,
        background: "#FAF7F2",
        borderRadius: 10,
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
function PedigreeLabInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const [publishing, setPublishing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLoaded, setEditLoaded] = useState(false);

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
  const [dragSourceSlot, setDragSourceSlot] = useState<SlotKey | null>(null);

  /* ---------- UI state ---------- */
  const [previewMode, setPreviewMode] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishForm, setPublishForm] = useState<PublishForm>(defaultPublishForm());

  /* ---------- Preview pedigree tree state ---------- */
  interface TreeRow { gen: number; pos: number; dog_id: number | null; name: string; photo_url: string | null; sex: string | null; }
  const [previewTree, setPreviewTree] = useState<TreeRow[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  /* ---------- COI ---------- */
  const [coi, setCoi] = useState(0);
  const [coiLoading, setCoiLoading] = useState(false);
  const dogsPlacedCount = Object.values(slots).filter(Boolean).length;

  useEffect(() => {
    const sireId = slots.sire?.dog_id;
    const damId = slots.dam?.dog_id;
    if (!sireId || !damId) {
      setCoi(0);
      return;
    }
    let cancelled = false;
    setCoiLoading(true);
    fetch(`/api/dogs/pedigree-tree?sire_id=${sireId}&dam_id=${damId}&gens=6`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          const val = calcCOIFromTree(data.rows || []);
          setCoi(val);
        }
      })
      .catch((_e) => { if (!cancelled) setCoi(0); })
      .finally(() => { if (!cancelled) setCoiLoading(false); });
    return () => { cancelled = true; };
  }, [slots.sire?.dog_id, slots.dam?.dog_id]);

  /* ---------- Load existing pedigree for editing ---------- */
  useEffect(() => {
    if (!editId || editLoaded) return;
    const pedId = parseInt(editId, 10);
    if (isNaN(pedId)) return;

    fetch(`/api/pedigrees/${pedId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) return;

        // Verify ownership
        try {
          const userStr = localStorage.getItem("user");
          if (userStr) {
            const user = JSON.parse(userStr);
            if (!user?.id || user.id !== data.user_id) return;
          } else return;
        } catch (_e) { return; }

        setEditingId(pedId);

        // Restore slots
        try {
          const s = JSON.parse(data.slots_json || "{}");
          setSlots(s);
        } catch (_e) { /* ignore */ }

        // Restore tree
        try {
          const t = JSON.parse(data.tree_json || "[]");
          setPreviewTree(t);
        } catch (_e) { /* ignore */ }

        // Restore publish form
        setPublishForm({
          prefix: data.prefix || "",
          name: data.name || "",
          suffixWins: data.suffix_wins || "",
          suffixLosses: data.suffix_losses || "",
          suffixDraws: data.suffix_draws || "",
          suffixHonors: data.suffix_honors || "",
          dob: data.dob || "",
          sex: data.sex || "Male",
          color: data.color || "",
          continent: data.continent || "",
          country: data.country || "",
          breeder: data.breeder || "",
          owner: data.owner || "",
          conditionedWeight: data.conditioned_weight || "",
          notes: data.pedigree_notes || "",
          photoFile: null,
          photoPreview: data.photo_path || "",
          journal: (() => {
            try { return JSON.parse(data.journal_json || "{}"); }
            catch { return defaultJournal(); }
          })(),
          datePosted: data.date_posted || "",
          lastModified: data.last_modified || "",
          viewCount: data.view_count || 0,
          showInTitleFeed: data.show_in_title_feed === 1,
        });

        setEditLoaded(true);
      })
      .catch(() => { /* ignore */ });
  }, [editId, editLoaded]);

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
    } catch (_e) {
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
    } catch (_e) {
      /* silently fail */
    }
  }, []);

  /* ---------- Drag handlers ---------- */
  const handleDragStart = (dog: DogSearchResult) => {
    setDragData(dog);
    setDragSourceSlot(null);
  };

  const handleSlotDragStart = (slotKey: SlotKey) => {
    const dog = slots[slotKey];
    if (!dog) return;
    setDragData({ dog_id: dog.dog_id, registered_name: dog.registered_name, photo_url: dog.photo_url, sex: dog.sex });
    setDragSourceSlot(slotKey);
  };

  /* Helper: get all descendant slot keys for a given slot */
  const getDescendantSlots = (slot: SlotKey): SlotKey[] => {
    const mapping = CHILD_TO_PARENTS[slot];
    if (!mapping) return [];
    const children = [mapping.sireSlot, mapping.damSlot];
    return [...children, ...children.flatMap(getDescendantSlots)];
  };

  const handleDrop = (slotKey: SlotKey) => {
    if (!dragData) return;
    if (dragSourceSlot) {
      // Slot-to-slot: MOVE (not swap) — move dog to new slot, clear old slot + descendants
      if (dragSourceSlot === slotKey) { setDragData(null); setDragSourceSlot(null); return; }
      const srcDog = slots[dragSourceSlot];
      if (!srcDog) { setDragData(null); setDragSourceSlot(null); return; }
      // Clear source slot + its descendants, AND target slot + its descendants
      const srcDescendants = getDescendantSlots(dragSourceSlot);
      const tgtDescendants = getDescendantSlots(slotKey);
      const clearSlots: Partial<Record<SlotKey, SlotDog | null>> = {};
      for (const s of [dragSourceSlot, ...srcDescendants, ...tgtDescendants]) clearSlots[s] = null;
      // Place the source dog in the target slot
      clearSlots[slotKey] = srcDog;
      setSlots((prev) => ({ ...prev, ...clearSlots }));
      // Auto-fill parents behind the moved dog at its NEW position
      autoFillParents(srcDog.dog_id, slotKey);
      setDragData(null);
      setDragSourceSlot(null);
      return;
    }
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
    e.dataTransfer.dropEffect = dragSourceSlot ? "move" : "copy";
  };

  const removeFromSlot = (slotKey: SlotKey) => {
    const descendants = getDescendantSlots(slotKey);
    const clearSlots: Partial<Record<SlotKey, SlotDog | null>> = { [slotKey]: null };
    for (const s of descendants) clearSlots[s] = null;
    setSlots((prev) => ({ ...prev, ...clearSlots }));
    if (selectedSlot === slotKey || descendants.includes(selectedSlot as SlotKey)) setSelectedSlot(null);
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
    <>
    <style>{`
      select {
        color-scheme: light !important;
        background-color: #FAFAFA !important;
        color: #1C1C1C !important;
        border-color: #C9B29F !important;
        outline: none !important;
      }
      select option {
        background-color: #FAFAFA !important;
        color: #1C1C1C !important;
        border: none !important;
        outline: none !important;
        padding: 6px 8px;
      }
      select option:hover,
      select option:checked {
        background-color: #C9B29F !important;
        color: #1C1C1C !important;
      }
      select:focus {
        border-color: #C9B29F !important;
      }
    `}</style>
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: "#FAFAFA",
        color: "#1C1C1C",
      }}
    >
      {/* ============================================================ */}
      {/* HEADER                                                       */}
      {/* ============================================================ */}
      <header className="px-6 py-5 flex items-center justify-between" style={STEEL_FRAME}>
        <div className="flex items-center gap-4" />
        <h1
          className="text-2xl md:text-3xl font-black uppercase tracking-[0.15em]"
          style={{
            fontFamily: "var(--font-display, Oswald, sans-serif)",
            color: "#1C1C1C",
          }}
        >
          PEDIGREE LAB
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
                style={{ color: "#6B7280", fontFamily: "var(--font-table, Rajdhani, sans-serif)" }}
              >
                Search Dogs
              </p>
              <div className="relative">
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
                  style={{ color: "#6B7280" }}
                >
                  {"\uD83D\uDD0D"}
                </span>
                <input
                  type="text"
                  placeholder="Search by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:ring-1"
                  style={{
                    background: "#FAFAFA",
                    border: "2px solid #C9B29F",
                    color: searchTerm && getDogColor(searchTerm) !== "#ffffff" ? getDogColor(searchTerm) : "#1C1C1C",
                    fontFamily: "var(--font-table, Rajdhani, sans-serif)",
                    outline: "none",
                    borderRadius: 10,
                    transition: "all 0.3s ease",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#C9B29F";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#C9B29F";
                  }}
                />
              </div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2" style={{ scrollbarWidth: "thin" }}>
              {searchLoading && (
                <p className="text-center text-xs py-4" style={{ color: "#6B7280" }}>
                  Searching...
                </p>
              )}
              {!searchLoading && searchTerm && searchResults.length === 0 && (
                <p className="text-center text-xs py-4" style={{ color: "#6B7280" }}>
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
                    className="p-2.5 cursor-grab active:cursor-grabbing hover:scale-[1.02]"
                    style={{
                      background: "#FAF7F2",
                      border: "2px solid #C9B29F",
                      borderRadius: 10,
                      transition: "all 0.3s ease",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = `${titleColor}`;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = `#C9B29F`;
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
                          backgroundColor: dog.photo_url ? "transparent" : "#FAFAFA",
                          border: `2px solid #C9B29F`,
                        }}
                      >
                        {!dog.photo_url && (
                          <div className="w-full h-full flex items-center justify-center text-xs" style={{ color: "#6B7280" }}>
                            {"\uD83D\uDC36"}
                          </div>
                        )}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <a
                          href={`/pedigree/${dog.dog_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          onDragStart={(e) => e.preventDefault()}
                          className="text-xs font-bold truncate block hover:underline"
                          style={{ color: titleColor, fontFamily: "var(--font-table, Rajdhani, sans-serif)" }}
                        >
                          {dog.registered_name}
                        </a>
                        <p className="text-[10px]" style={{ color: "#6B7280" }}>
                          <span style={{ color: dog.sex?.toUpperCase() === "FEMALE" ? "#9f1239" : "#1d5bbf" }}>{sexIcon(dog.sex)}</span> <span style={{ color: "#6B7280", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>ID: {dog.dog_id}</span>
                        </p>
                      </div>
                      {/* Drag indicator */}
                      <span className="text-[10px]" style={{ color: "#C9B29F" }}>
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
                  background: "#FAF7F2",
                  borderBottom: "2px solid #C9B29F",
                }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="text-sm font-bold uppercase tracking-widest"
                    style={{ fontFamily: "var(--font-display, Oswald, sans-serif)", color: "#1C1C1C" }}
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
              <div className="overflow-auto" style={{ background: "#FAFAFA" }}>
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
                            background: "#1C1C1C",
                            color: "#FAF7F2",
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
                          ? "#eef3fb"
                          : isCh
                            ? "#fdf2f2"
                            : xwNum === 3
                              ? "#fdf8ed"
                              : xwNum === 1
                                ? "#eef8f7"
                                : xwNum === 2
                                  ? "#fef4ec"
                                  : xwNum === 4
                                    ? "#fdf1f6"
                                    : xwNum >= 5
                                      ? "#f5f0fb"
                                      : isRom
                                        ? "#eefbfc"
                                        : isPor
                                          ? "#f3f0fe"
                                          : "#FAFAFA";

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
                                : "#1C1C1C";

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
                              borderTop: "1px solid #C9B29F",
                              borderRadius: 6,
                              padding: "6px 10px",
                              minHeight: 40,
                              fontSize,
                              fontWeight: isChampion ? 700 : 600,
                              color: cellTextColor,
                              fontFamily: "var(--font-table, Rajdhani, sans-serif)",
                              lineHeight: 1.1,
                            }}
                          >
                            {isChampion && (
                              <span
                                className="absolute -top-0.5 -right-0.5 flex items-center justify-center rounded-full"
                                style={{
                                  fontSize: 9,
                                  color: "#C9B29F",
                                  background: "#fef3c7",
                                  width: 15,
                                  height: 15,
                                  border: "1px solid #C9B29F",
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
            <Card className="h-full p-5 relative" style={{ minHeight: 560, backgroundImage: "radial-gradient(circle, #C9B29F33 1px, transparent 1px)", backgroundSize: "24px 24px" }}>
              {/* COI badge */}
              <div
                className="absolute z-10 flex flex-col items-center"
                style={{ top: 32, left: "50%", transform: "translateX(-50%)" }}
              >
                <div
                  className="rounded-full px-5 py-1.5 flex items-center gap-2"
                  style={{
                    background: "#FAF7F2",
                    border: `2px solid ${riskColor(coi)}`,
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
                    {coiLoading ? "..." : `${coi.toFixed(1)}%`}
                  </span>
                </div>
                <span
                  className="text-[9px] uppercase tracking-widest mt-1 font-semibold"
                  style={{ color: riskColor(coi), fontFamily: "var(--font-table, Rajdhani, sans-serif)" }}
                >
                  {coiLoading ? "CALCULATING..." : riskLabel(coi)}
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
                    selected={selectedSlot === "subject"}
                    onSelect={() => setSelectedSlot("subject")}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onRemove={removeFromSlot}
                    onSlotDragStart={handleSlotDragStart}
                  />
                </div>

                {/* Lines: Subject -> Parents */}
                <div className="flex flex-col justify-center" style={{ width: 40 }}>
                  <div style={{ borderTop: "2px solid #C9B29F", width: "100%", marginBottom: 80 }} />
                  <div style={{ borderTop: "2px solid #C9B29F", width: "100%", marginTop: 80 }} />
                  {/* Vertical connector */}
                  <div
                    className="absolute"
                    style={{
                      width: 2,
                      height: 160,
                      background: "#C9B29F",
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
                    selected={selectedSlot === "sire"}
                    onSelect={() => setSelectedSlot("sire")}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onRemove={removeFromSlot}
                    onSlotDragStart={handleSlotDragStart}
                    accentColor="#1d5bbf"
                  />
                  {/* Dam */}
                  <DropZone
                    slotKey="dam"
                    label={SLOT_LABELS.dam}
                    dog={slots.dam}
                    preview={previewMode}
                    selected={selectedSlot === "dam"}
                    onSelect={() => setSelectedSlot("dam")}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onRemove={removeFromSlot}
                    onSlotDragStart={handleSlotDragStart}
                    accentColor="#9f1239"
                  />
                </div>

                {/* Lines: Parents -> Grandparents */}
                <div className="flex flex-col justify-center" style={{ width: 40 }}>
                  <div style={{ borderTop: "2px solid #C9B29F", width: "100%" }} />
                </div>

                {/* Grandparents (right) */}
                <div className="flex flex-col items-center gap-4" style={{ width: 160 }}>
                  <DropZone
                    slotKey="sire_sire"
                    label={SLOT_LABELS.sire_sire}
                    dog={slots.sire_sire}
                    preview={previewMode}
                    selected={selectedSlot === "sire_sire"}
                    onSelect={() => setSelectedSlot("sire_sire")}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onRemove={removeFromSlot}
                    onSlotDragStart={handleSlotDragStart}
                    accentColor="#1d5bbf"
                    size="sm"
                  />
                  <DropZone
                    slotKey="sire_dam"
                    label={SLOT_LABELS.sire_dam}
                    dog={slots.sire_dam}
                    preview={previewMode}
                    selected={selectedSlot === "sire_dam"}
                    onSelect={() => setSelectedSlot("sire_dam")}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onRemove={removeFromSlot}
                    onSlotDragStart={handleSlotDragStart}
                    accentColor="#9f1239"
                    size="sm"
                  />
                  <DropZone
                    slotKey="dam_sire"
                    label={SLOT_LABELS.dam_sire}
                    dog={slots.dam_sire}
                    preview={previewMode}
                    selected={selectedSlot === "dam_sire"}
                    onSelect={() => setSelectedSlot("dam_sire")}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onRemove={removeFromSlot}
                    onSlotDragStart={handleSlotDragStart}
                    accentColor="#1d5bbf"
                    size="sm"
                  />
                  <DropZone
                    slotKey="dam_dam"
                    label={SLOT_LABELS.dam_dam}
                    dog={slots.dam_dam}
                    preview={previewMode}
                    selected={selectedSlot === "dam_dam"}
                    onSelect={() => setSelectedSlot("dam_dam")}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onRemove={removeFromSlot}
                    onSlotDragStart={handleSlotDragStart}
                    accentColor="#9f1239"
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
                style={{ color: "#6B7280", fontFamily: "var(--font-table, Rajdhani, sans-serif)" }}
              >
                Details &amp; Actions
              </p>

              {/* Selected dog details */}
              {selectedDog ? (
                <div className="space-y-3">
                  <div
                    className="overflow-hidden"
                    style={{ border: `2px solid #C9B29F`, borderRadius: 10 }}
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
                        style={{ background: "#FAFAFA", color: "#6B7280" }}
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
                  <p className="text-[10px]" style={{ color: "#6B7280" }}>
                    Slot: {selectedSlot ? SLOT_LABELS[selectedSlot] : "--"} | ID: <span style={{ color: "#1C1C1C", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>{selectedDog.dog_id}</span>
                  </p>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-xs" style={{ color: "#6B7280" }}>
                    Select a dog on the canvas to view details
                  </p>
                </div>
              )}

              {/* Divider */}
              <div style={{ borderTop: "2px solid #C9B29F" }} />

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
                      } catch (_e) { /* ignore */ }
                      setPreviewLoading(false);
                    }
                    setPreviewMode(true);
                  }
                }}
                className="w-full py-2.5 text-xs font-bold uppercase tracking-widest hover:scale-[1.02]"
                style={{
                  fontFamily: "var(--font-table, Rajdhani, sans-serif)",
                  background: previewMode ? "#C9B29F" : "#1C1C1C",
                  color: previewMode ? "#1C1C1C" : "#FAF7F2",
                  border: "2px solid #C9B29F",
                  borderRadius: 10,
                  transition: "all 0.3s ease",
                }}
              >
                {previewLoading ? "Loading..." : previewMode ? "\u2716 Exit Preview" : "\u25B6 Preview"}
              </button>

              {/* Create & Publish */}
              <button
                onClick={() => {
                  if (!editingId) setPublishForm(defaultPublishForm());
                  setShowPublishModal(true);
                }}
                className="w-full py-2.5 text-xs font-bold uppercase tracking-widest hover:scale-[1.02]"
                style={{
                  fontFamily: "var(--font-table, Rajdhani, sans-serif)",
                  background: "#C9B29F",
                  color: "#1C1C1C",
                  border: "2px solid #C9B29F",
                  borderRadius: 10,
                  transition: "all 0.3s ease",
                }}
              >
                {editingId ? "Edit & Save" : "+ Create & Publish"}
              </button>

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
          background: "#FAF7F2",
        }}
      >
        <div className="flex items-center gap-6">
          <span
            className="text-[10px] uppercase tracking-widest font-semibold"
            style={{ color: "#1C1C1C", fontFamily: "var(--font-table, Rajdhani, sans-serif)" }}
          >
            Dogs Placed:{" "}
            <span style={{ color: "#1C1C1C", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>
              {dogsPlacedCount} / 7
            </span>
          </span>
          <span
            className="text-[10px] uppercase tracking-widest font-semibold"
            style={{ color: "#1C1C1C", fontFamily: "var(--font-table, Rajdhani, sans-serif)" }}
          >
            COI:{" "}
            <span style={{ color: riskColor(coi), fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>
              {coiLoading ? "..." : `${coi.toFixed(1)}%`}
            </span>
          </span>
        </div>
        <div
          className="rounded-full px-4 py-1 text-[10px] uppercase tracking-widest font-bold"
          style={{
            fontFamily: "var(--font-table, Rajdhani, sans-serif)",
            background: previewMode ? "#C9B29F" : "#FAF7F2",
            color: previewMode ? "#1C1C1C" : "#6B7280",
            border: `2px solid #C9B29F`,
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
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setShowPublishModal(false)}
        >
          <Card
            className="w-full max-w-lg max-h-[85vh] overflow-y-auto"
            style={{
              margin: 16,
              padding: 0,
              background: "#FAF7F2",
              border: "2px solid #C9B29F",
              borderRadius: 10,
            }}
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
                    color: "#1C1C1C",
                  }}
                >
                  {editingId ? "Edit Pedigree" : "Create & Publish"}
                </h2>
                <button
                  onClick={() => setShowPublishModal(false)}
                  className="text-sm transition-colors"
                  style={{
                    color: "#6B7280",
                    background: "#FAFAFA",
                    border: "2px solid #C9B29F",
                    borderRadius: 10,
                    width: 32,
                    height: 32,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {"\u2716"}
                </button>
              </div>

              {/* Prefix + Title Feed Toggle */}
              <div className="flex items-end gap-3">
                <div>
                  <label
                    className="block text-[10px] uppercase tracking-widest font-semibold mb-1"
                    style={{ color: "#6B7280", fontFamily: "var(--font-table, Rajdhani, sans-serif)" }}
                  >
                    🏷️ Prefix
                  </label>
                  <select
                    value={publishForm.prefix}
                    onChange={(e) => setPublishForm((p) => ({ ...p, prefix: e.target.value }))}
                    className="rounded-2xl px-2 py-2 text-xs outline-none transition-all"
                    style={{
                      background: "#FAFAFA",
                      border: "2px solid #C9B29F",
                      color: "#1C1C1C",
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
                <button
                  type="button"
                  onClick={() => setPublishForm((p) => ({ ...p, showInTitleFeed: !p.showInTitleFeed }))}
                  className="flex-1 flex items-center gap-3 px-4 py-3 rounded-2xl transition-all"
                  style={{
                    background: publishForm.showInTitleFeed
                      ? "#C9B29F"
                      : "#FAFAFA",
                    border: "2px solid #C9B29F",
                    borderRadius: 10,
                  }}
                  title="Show in Dashboard Title Feed"
                >
                  <span className="text-xl">🏆</span>
                  <div className="flex-1 text-left">
                    <span className="text-xs font-bold uppercase tracking-wider" style={{
                      fontFamily: "var(--font-table)",
                      color: "#1C1C1C",
                    }}>Title Feed</span>
                    <p className="text-[10px] mt-0.5 font-medium" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>
                      Announce this dog on the dashboard title alerts
                    </p>
                  </div>
                  <span className="relative w-11 h-6 rounded-full flex-shrink-0 transition-all"
                    style={{
                      background: publishForm.showInTitleFeed
                        ? "#C9B29F"
                        : "#FAFAFA",
                      border: "2px solid #C9B29F",
                    }}>
                    <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-all"
                      style={{
                        background: publishForm.showInTitleFeed
                          ? "#1C1C1C"
                          : "#C9B29F",
                        transform: publishForm.showInTitleFeed ? "translateX(20px)" : "translateX(0)",
                      }} />
                  </span>
                </button>
              </div>
              <ModalInput
                label="✏️ Name"
                value={publishForm.name}
                onChange={(v) => setPublishForm((p) => ({ ...p, name: v.toUpperCase() }))}
                style={{ textTransform: "uppercase" }}
              />

              {/* Suffix */}
              <div>
                <label
                  className="block text-[10px] uppercase tracking-widest font-semibold mb-1"
                  style={{ color: "#6B7280", fontFamily: "var(--font-table, Rajdhani, sans-serif)" }}
                >
                  🏅 Suffix
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={publishForm.suffixWins}
                    onChange={(e) => setPublishForm((p) => ({ ...p, suffixWins: e.target.value }))}
                    className="rounded-2xl px-2 py-2 text-xs outline-none transition-all"
                    style={{
                      background: "#FAFAFA",
                      border: "2px solid #C9B29F",
                      color: "#1C1C1C",
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
                    className="rounded-2xl px-2 py-2 text-xs outline-none transition-all"
                    style={{
                      background: "#FAFAFA",
                      border: "2px solid #C9B29F",
                      color: "#1C1C1C",
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
                    className="rounded-2xl px-2 py-2 text-xs outline-none transition-all"
                    style={{
                      background: "#FAFAFA",
                      border: "2px solid #C9B29F",
                      color: "#1C1C1C",
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
                    className="rounded-2xl px-2 py-2 text-xs outline-none transition-all"
                    style={{
                      background: "#FAFAFA",
                      border: "2px solid #C9B29F",
                      color: "#1C1C1C",
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
                  <p className="mt-1.5 text-xs font-semibold" style={{ color: "#C9B29F", fontFamily: "var(--font-table, Rajdhani, sans-serif)" }}>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ModalInput
                  label="📅 DOB"
                  type="date"
                  value={publishForm.dob}
                  onChange={(v) => setPublishForm((p) => ({ ...p, dob: v }))}
                />
                <div>
                  <label
                    className="block text-[10px] uppercase tracking-widest font-semibold mb-1"
                    style={{ color: "#6B7280", fontFamily: "var(--font-table, Rajdhani, sans-serif)" }}
                  >
                    🔹 Sex
                  </label>
                  <select
                    value={publishForm.sex}
                    onChange={(e) => setPublishForm((p) => ({ ...p, sex: e.target.value }))}
                    className="w-full rounded-2xl px-3 py-2 text-sm outline-none uppercase transition-all"
                    style={{
                      background: "#FAFAFA",
                      border: "2px solid #C9B29F",
                      color: "#1C1C1C",
                      fontFamily: "var(--font-table, Rajdhani, sans-serif)",
                      textTransform: "uppercase",
                    }}
                  >
                    <option value="Male">MALE</option>
                    <option value="Female">FEMALE</option>
                  </select>
                </div>
                <ModalInput
                  label="🎨 Color"
                  value={publishForm.color}
                  onChange={(v) => setPublishForm((p) => ({ ...p, color: v.toUpperCase() }))}
                  style={{ textTransform: "uppercase" }}
                />
                <ModalInput
                  label="👤 Breeder"
                  value={publishForm.breeder}
                  onChange={(v) => setPublishForm((p) => ({ ...p, breeder: v.toUpperCase() }))}
                  placeholder="Breeder name"
                  style={{ textTransform: "uppercase" }}
                />
              </div>

              {/* Continent & Country */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    className="block text-[10px] uppercase tracking-widest font-semibold mb-1"
                    style={{ color: "#6B7280", fontFamily: "var(--font-table, Rajdhani, sans-serif)" }}
                  >
                    🌍 Continent
                  </label>
                  <select
                    value={publishForm.continent}
                    onChange={(e) => setPublishForm((p) => ({ ...p, continent: e.target.value, country: "" }))}
                    className="w-full rounded-2xl px-3 py-2 text-sm outline-none uppercase transition-all"
                    style={{
                      background: "#FAFAFA",
                      border: "2px solid #C9B29F",
                      color: "#1C1C1C",
                      fontFamily: "var(--font-table, Rajdhani, sans-serif)",
                      textTransform: "uppercase",
                    }}
                  >
                    <option value="">Select</option>
                    <option value="North America">NORTH AMERICA</option>
                    <option value="South America">SOUTH AMERICA</option>
                    <option value="Europe">EUROPE</option>
                    <option value="Asia">ASIA</option>
                    <option value="Africa">AFRICA</option>
                    <option value="Oceania">OCEANIA</option>
                  </select>
                </div>
                <div>
                  <label
                    className="block text-[10px] uppercase tracking-widest font-semibold mb-1"
                    style={{ color: "#6B7280", fontFamily: "var(--font-table, Rajdhani, sans-serif)" }}
                  >
                    🏳️ Country
                  </label>
                  <select
                    value={publishForm.country}
                    onChange={(e) => setPublishForm((p) => ({ ...p, country: e.target.value }))}
                    className="w-full rounded-2xl px-3 py-2 text-sm outline-none uppercase transition-all"
                    style={{
                      background: "#FAFAFA",
                      border: "2px solid #C9B29F",
                      color: "#1C1C1C",
                      fontFamily: "var(--font-table, Rajdhani, sans-serif)",
                      textTransform: "uppercase",
                    }}
                  >
                    <option value="">Select</option>
                    {(COUNTRY_MAP[publishForm.continent] || []).map((c) => (
                      <option key={c} value={c}>{c.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Owner & Conditioned Weight */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    className="block text-[10px] uppercase tracking-widest font-semibold mb-2"
                    style={{ color: "#6B7280", fontFamily: "var(--font-table, Rajdhani, sans-serif)" }}
                  >
                    👑 Owner
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-2xl px-3 py-2 text-sm outline-none transition-all focus:ring-1"
                    style={{
                      background: "#FAFAFA",
                      border: "2px solid #C9B29F",
                      color: "#1C1C1C",
                      fontFamily: "var(--font-table, Rajdhani, sans-serif)",
                      textTransform: "uppercase",
                    }}
                    value={publishForm.owner}
                    onChange={(e) => setPublishForm((p) => ({ ...p, owner: e.target.value.toUpperCase() }))}
                    placeholder="Owner name"
                  />
                </div>
                <div>
                  <label
                    className="block text-[10px] uppercase tracking-widest font-semibold mb-2"
                    style={{ color: "#6B7280", fontFamily: "var(--font-table, Rajdhani, sans-serif)" }}
                  >
                    ⚖️ Cond. Weight
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-2xl px-3 py-2 text-sm outline-none transition-all focus:ring-1"
                    style={{
                      background: "#FAFAFA",
                      border: "2px solid #C9B29F",
                      color: "#1C1C1C",
                      fontFamily: "var(--font-table, Rajdhani, sans-serif)",
                      textTransform: "uppercase",
                    }}
                    value={publishForm.conditionedWeight}
                    onChange={(e) => setPublishForm((p) => ({ ...p, conditionedWeight: e.target.value.toUpperCase() }))}
                    placeholder="e.g. 42 LBS"
                  />
                </div>
              </div>

              {/* Views, Date Posted, Last Modified */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label
                    className="block text-[10px] uppercase tracking-widest font-semibold mb-2"
                    style={{ color: "#6B7280", fontFamily: "var(--font-table, Rajdhani, sans-serif)" }}
                  >
                    Views
                  </label>
                  <div
                    className="w-full rounded-2xl px-3 py-2 text-sm flex items-center"
                    style={{
                      background: "#FAFAFA",
                      border: "2px solid #C9B29F",
                      fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                      minHeight: 38,
                    }}
                  >
                    <span style={{ color: "#C9B29F" }}>{publishForm.viewCount}</span>
                    <span className="ml-1 text-[10px]" style={{ color: "#6B7280" }}>views</span>
                  </div>
                </div>
                <div>
                  <label
                    className="block text-[10px] uppercase tracking-widest font-semibold mb-2"
                    style={{ color: "#6B7280", fontFamily: "var(--font-table, Rajdhani, sans-serif)" }}
                  >
                    Date Posted
                  </label>
                  <div
                    className="w-full rounded-2xl px-3 py-2 text-sm flex items-center"
                    style={{
                      background: "#FAFAFA",
                      border: "2px solid #C9B29F",
                      fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                      minHeight: 38,
                    }}
                  >
                    <span style={{ color: publishForm.datePosted ? "#1C1C1C" : "#6B7280" }}>
                      {publishForm.datePosted ? new Date(publishForm.datePosted).toLocaleDateString() : editingId ? "—" : "Auto on publish"}
                    </span>
                  </div>
                </div>
                <div>
                  <label
                    className="block text-[10px] uppercase tracking-widest font-semibold mb-2"
                    style={{ color: "#6B7280", fontFamily: "var(--font-table, Rajdhani, sans-serif)" }}
                  >
                    Last Modified
                  </label>
                  <div
                    className="w-full rounded-2xl px-3 py-2 text-sm flex items-center"
                    style={{
                      background: "#FAFAFA",
                      border: "2px solid #C9B29F",
                      fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                      minHeight: 38,
                    }}
                  >
                    <span style={{ color: publishForm.lastModified ? "#1C1C1C" : "#6B7280" }}>
                      {publishForm.lastModified ? new Date(publishForm.lastModified).toLocaleDateString() : editingId ? "—" : "Auto on publish"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Pedigree Notes */}
              <div>
                <label
                  className="block text-[10px] uppercase tracking-widest font-semibold mb-2"
                  style={{ color: "#6B7280", fontFamily: "var(--font-table, Rajdhani, sans-serif)" }}
                >
                  📝 Pedigree Notes
                </label>
                <textarea
                  rows={3}
                  className="w-full rounded-2xl px-3 py-2 text-sm outline-none transition-all focus:ring-1"
                  style={{
                    background: "#FAFAFA",
                    border: "2px solid #C9B29F",
                    color: "#1C1C1C",
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
                  style={{ color: "#6B7280", fontFamily: "var(--font-table, Rajdhani, sans-serif)" }}
                >
                  📸 Photo
                </label>
                <div
                  className="rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all hover:border-opacity-80"
                  style={{
                    background: "#FAFAFA",
                    border: "2px dashed #C9B29F",
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
                      <span className="text-2xl mb-1" style={{ color: "#6B7280" }}>
                        {"\uD83D\uDCF7"}
                      </span>
                      <span className="text-[10px]" style={{ color: "#6B7280" }}>
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
              <div style={{ borderTop: "2px solid #C9B29F" }} />

              {/* Journal Section */}
              <p
                className="text-lg font-black uppercase tracking-widest"
                style={{
                  fontFamily: "var(--font-display, Oswald, sans-serif)",
                  color: "#1C1C1C",
                }}
              >
                Journal
              </p>

              {/* Rabies */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ModalInput
                  label="Rabies: Date Given"
                  type="date"
                  value={publishForm.journal.rabiesDate}
                  onChange={handleRabiesDateChange}
                />
                <div>
                  <label
                    className="block text-[10px] uppercase tracking-widest font-semibold mb-1"
                    style={{ color: "#6B7280", fontFamily: "var(--font-table, Rajdhani, sans-serif)" }}
                  >
                    Rabies: Next Due
                  </label>
                  <div
                    className="w-full rounded-2xl px-3 py-2 text-sm"
                    style={{
                      background: "#FAFAFA",
                      border: "2px solid #C9B29F",
                      color: publishForm.journal.rabiesNextDue ? "#22c55e" : "#6B7280",
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
                  style={{ color: "#6B7280", fontFamily: "var(--font-table, Rajdhani, sans-serif)" }}
                >
                  Vaccines
                </label>
                <div className="space-y-2">
                  {publishForm.journal.vaccines.map((vax, idx) => (
                    <div
                      key={vax.name}
                      className="flex items-center gap-3 rounded-2xl px-3 py-2"
                      style={{
                        background: "#FAFAFA",
                        border: "2px solid #C9B29F",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={vax.checked}
                        onChange={() => handleVaccineToggle(idx)}
                        className="rounded"
                        style={{ accentColor: "#C9B29F" }}
                      />
                      <span
                        className="text-xs flex-1 font-semibold"
                        style={{
                          color: vax.checked ? "#1C1C1C" : "#6B7280",
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
                          className="rounded-xl px-2 py-1 text-[10px] outline-none transition-all"
                          style={{
                            background: "#FAFAFA",
                            border: "2px solid #C9B29F",
                            color: "#1C1C1C",
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
                  style={{ color: "#6B7280", fontFamily: "var(--font-table, Rajdhani, sans-serif)" }}
                >
                  Worming
                </label>

                {/* Worming Draft Form */}
                <div
                  className="rounded-2xl p-3 space-y-3"
                  style={{ background: "#FAFAFA", border: "2px solid #C9B29F" }}
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
                    className="w-full rounded-2xl px-3 py-2 text-xs outline-none transition-all"
                    style={{
                      background: "#FAFAFA",
                      border: "2px solid #C9B29F",
                      color: "#1C1C1C",
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
                      className="w-full rounded-2xl px-3 py-2 text-xs outline-none transition-all"
                      style={{
                        background: "#FAFAFA",
                        border: "2px solid #C9B29F",
                        color: "#1C1C1C",
                        fontFamily: "var(--font-table, Rajdhani, sans-serif)",
                      }}
                    />
                  )}

                  {/* Date Wormed */}
                  <div>
                    <span className="text-[9px] uppercase tracking-widest font-semibold" style={{ color: "#6B7280", fontFamily: "var(--font-table, Rajdhani, sans-serif)" }}>
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
                      className="w-full rounded-2xl px-3 py-2 text-xs outline-none mt-1 transition-all"
                      style={{
                        background: "#FAFAFA",
                        border: "2px solid #C9B29F",
                        color: "#1C1C1C",
                        fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                      }}
                    />
                  </div>

                  {/* Next Due toggle buttons */}
                  <div>
                    <span className="text-[9px] uppercase tracking-widest font-semibold" style={{ color: "#6B7280", fontFamily: "var(--font-table, Rajdhani, sans-serif)" }}>
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
                          className="rounded-2xl px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all"
                          style={{
                            fontFamily: "var(--font-table, Rajdhani, sans-serif)",
                            background: publishForm.journal.wormingDraft.intervalDays === days
                              ? "#C9B29F"
                              : "#FAFAFA",
                            color: publishForm.journal.wormingDraft.intervalDays === days
                              ? "#1C1C1C"
                              : "#6B7280",
                            border: `2px solid #C9B29F`,
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
                      style={{ accentColor: "#C9B29F" }}
                    />
                    <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "#6B7280", fontFamily: "var(--font-table, Rajdhani, sans-serif)" }}>
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
                    className="w-full rounded-2xl py-2 text-[10px] font-bold uppercase tracking-widest transition-all hover:scale-[1.02]"
                    style={{
                      fontFamily: "var(--font-table, Rajdhani, sans-serif)",
                      background: "#1C1C1C",
                      color: "#FAF7F2",
                      border: "2px solid #C9B29F",
                      borderRadius: 10,
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
                        className="flex items-center justify-between rounded-2xl px-3 py-2"
                        style={{
                          background: "#FAFAFA",
                          border: "2px solid #C9B29F",
                        }}
                      >
                        <div className="flex items-center gap-2">
                          {entry.remindMe && (
                            <span className="text-[9px] rounded-full px-1.5 py-0.5" style={{ background: "#C9B29F", color: "#C9B29F" }}>
                              {"\uD83D\uDD14"}
                            </span>
                          )}
                          <span className="text-[10px] font-semibold" style={{ color: "#1C1C1C", fontFamily: "var(--font-table, Rajdhani, sans-serif)" }}>
                            {entry.type === "Other" ? entry.otherType || "Other" : entry.type}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px]" style={{ color: "#1C1C1C", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>
                            {formatDateShort(entry.dateWormed)}
                          </span>
                          {entry.nextDue && (
                            <>
                              <span className="text-[9px]" style={{ color: "#6B7280" }}>→</span>
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
                            style={{ color: "#6B7280" }}
                          >
                            {"\u2716"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Heat Cycle Tracker - Only for females */}
              {publishForm.sex.toUpperCase() === "FEMALE" && (() => {
                const hc = publishForm.journal.heatCycle || { lastHeatDate: "", interval: "180", customDays: "180", reminderEnabled: true };
                const intervalDays = hc.interval === "custom" ? parseInt(hc.customDays) || 180 : parseInt(hc.interval);
                const nextHeatDate = hc.lastHeatDate
                  ? new Date(new Date(hc.lastHeatDate).getTime() + intervalDays * 86400000)
                  : null;
                const today = new Date();
                const daysUntilNext = nextHeatDate ? Math.ceil((nextHeatDate.getTime() - today.getTime()) / 86400000) : null;
                const isUpcoming = daysUntilNext !== null && daysUntilNext <= 7 && daysUntilNext > 0;
                const isOverdue = daysUntilNext !== null && daysUntilNext <= 0;
                const lastLoggedMonths = hc.lastHeatDate
                  ? Math.floor((today.getTime() - new Date(hc.lastHeatDate).getTime()) / (86400000 * 30))
                  : null;

                const updateHeatCycle = (updates: Partial<HeatCycleData>) => {
                  setPublishForm((p) => ({
                    ...p,
                    journal: {
                      ...p.journal,
                      heatCycle: { ...(p.journal.heatCycle || { lastHeatDate: "", interval: "180", customDays: "180", reminderEnabled: true }), ...updates },
                    },
                  }));
                };

                return (
                  <div className="rounded-2xl p-4" style={{
                    background: "#FAF7F2",
                    border: isUpcoming ? "2px solid #fb923c" : isOverdue ? "2px solid #ef4444" : "2px solid #C9B29F",
                    borderRadius: 10,
                  }}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-base">🌸</span>
                      <span className="text-[10px] uppercase tracking-widest font-bold" style={{
                        color: "#9f1239",
                        fontFamily: "var(--font-table)",
                      }}>Heat Cycle Tracker</span>
                      <span className="text-[8px] px-1.5 py-0.5 rounded-full" style={{
                        background: "#FAF7F2",
                        color: "#9f1239",
                        border: "2px solid #C9B29F",
                        fontFamily: "var(--font-table)",
                      }}>Private</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Last Heat Date */}
                      <div>
                        <label className="block text-[9px] uppercase tracking-widest font-semibold mb-1"
                          style={{ color: "#6B7280", fontFamily: "var(--font-table)" }}>
                          Last Heat Date
                        </label>
                        <input
                          type="date"
                          value={hc.lastHeatDate}
                          onChange={(e) => updateHeatCycle({ lastHeatDate: e.target.value })}
                          className="w-full rounded-xl px-3 py-2 text-xs outline-none transition-all"
                          style={{
                            background: "#FAFAFA",
                            border: "2px solid #C9B29F",
                            color: "#1C1C1C",
                            fontFamily: "var(--font-table)",
                            colorScheme: "light",
                          }}
                        />
                      </div>

                      {/* Frequency */}
                      <div>
                        <label className="block text-[9px] uppercase tracking-widest font-semibold mb-1"
                          style={{ color: "#6B7280", fontFamily: "var(--font-table)" }}>
                          Cycle Frequency
                        </label>
                        <select
                          value={hc.interval}
                          onChange={(e) => updateHeatCycle({ interval: e.target.value })}
                          className="w-full rounded-xl px-3 py-2 text-xs outline-none transition-all"
                          style={{
                            background: "#FAFAFA",
                            border: "2px solid #C9B29F",
                            color: "#1C1C1C",
                            fontFamily: "var(--font-table)",
                            colorScheme: "light",
                          }}
                        >
                          <option value="120">Three times a year (~120 days)</option>
                          <option value="180">Twice a year (~180 days)</option>
                          <option value="365">Once a year (~365 days)</option>
                          <option value="custom">Custom interval</option>
                        </select>
                      </div>
                    </div>

                    {/* Custom Days Input */}
                    {hc.interval === "custom" && (
                      <div className="mt-2">
                        <label className="block text-[9px] uppercase tracking-widest font-semibold mb-1"
                          style={{ color: "#6B7280", fontFamily: "var(--font-table)" }}>
                          Custom Interval (days, min 90)
                        </label>
                        <input
                          type="number"
                          min="90"
                          value={hc.customDays}
                          onChange={(e) => updateHeatCycle({ customDays: e.target.value })}
                          className="w-32 rounded-xl px-3 py-2 text-xs outline-none transition-all"
                          style={{
                            background: "#FAFAFA",
                            border: "2px solid #C9B29F",
                            color: "#1C1C1C",
                            fontFamily: "var(--font-table)",
                          }}
                        />
                      </div>
                    )}

                    {/* Next Heat Prediction */}
                    {hc.lastHeatDate && nextHeatDate && (
                      <div className="mt-3 rounded-xl px-3 py-2.5 flex items-center justify-between" style={{
                        background: "#FAF7F2",
                        border: isOverdue ? "2px solid #ef4444" : isUpcoming ? "2px solid #fb923c" : "2px solid #C9B29F",
                      }}>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{isOverdue ? "🔴" : isUpcoming ? "🟠" : "🌷"}</span>
                          <div>
                            <p className="text-[9px] uppercase tracking-wider font-semibold" style={{
                              color: isOverdue ? "#ef4444" : isUpcoming ? "#fb923c" : "#9f1239",
                              fontFamily: "var(--font-table)",
                            }}>
                              {isOverdue ? "May be overdue" : isUpcoming ? "Coming up soon" : "Next expected heat"}
                            </p>
                            <p className="text-xs font-bold mt-0.5" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>
                              {nextHeatDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold" style={{
                            color: isOverdue ? "#ef4444" : isUpcoming ? "#fb923c" : "#9f1239",
                            fontFamily: "var(--font-display)",
                          }}>
                            {isOverdue ? `${Math.abs(daysUntilNext!)}d ago` : `${daysUntilNext}d`}
                          </p>
                          <p className="text-[8px] uppercase" style={{ color: "#6B7280", fontFamily: "var(--font-table)" }}>
                            {isOverdue ? "past due" : "remaining"}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Nudge if no entry in 12+ months */}
                    {lastLoggedMonths !== null && lastLoggedMonths >= 12 && (
                      <div className="mt-2 rounded-xl px-3 py-2 flex items-center gap-2" style={{
                        background: "#FAF7F2",
                        border: "2px solid #C9B29F",
                      }}>
                        <span className="text-sm">💬</span>
                        <p className="text-[10px]" style={{ color: "#fb923c", fontFamily: "var(--font-table)" }}>
                          Haven&apos;t logged a cycle since {new Date(hc.lastHeatDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })} — want to update?
                        </p>
                      </div>
                    )}

                    {/* Reminder toggle */}
                    <div className="mt-2 flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs">🔔</span>
                        <span className="text-[9px] font-medium" style={{ color: "#6B7280", fontFamily: "var(--font-table)" }}>
                          Remind me 7 days before
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateHeatCycle({ reminderEnabled: !hc.reminderEnabled })}
                        className="relative w-9 h-5 rounded-full transition-all flex-shrink-0"
                        style={{
                          background: hc.reminderEnabled ? "#9f1239" : "#FAFAFA",
                          border: "2px solid #C9B29F",
                        }}
                      >
                        <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-all"
                          style={{
                            background: hc.reminderEnabled ? "#FAF7F2" : "#C9B29F",
                            transform: hc.reminderEnabled ? "translateX(16px)" : "translateX(0)",
                          }} />
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Journal Notes */}
              <div>
                <label
                  className="block text-[10px] uppercase tracking-widest font-semibold mb-1"
                  style={{ color: "#6B7280", fontFamily: "var(--font-table, Rajdhani, sans-serif)" }}
                >
                  Journal Notes
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
                  className="w-full rounded-2xl px-3 py-2 text-sm outline-none resize-none transition-all"
                  style={{
                    background: "#FAFAFA",
                    border: "2px solid #C9B29F",
                    color: "#1C1C1C",
                    fontFamily: "var(--font-table, Rajdhani, sans-serif)",
                  }}
                />
              </div>

              {/* Submit */}
              <button
                disabled={publishing}
                onClick={async () => {
                  if (!publishForm.name.trim()) {
                    alert("Please enter a name for the dog.");
                    return;
                  }
                  setPublishing(true);
                  try {
                    // Duplicate name check (global, case insensitive)
                    const dupRes = await fetch(`/api/pedigrees/check-duplicate?name=${encodeURIComponent(publishForm.name.trim())}${editingId ? `&excludeId=${editingId}` : ""}`);
                    const dupData = await dupRes.json();
                    if (dupData.exists) {
                      alert(`A pedigree with the name "${publishForm.name.trim()}" already exists. Please use a different name.`);
                      setPublishing(false);
                      return;
                    }
                    // Auto-fetch tree if preview wasn't clicked but sire/dam exist
                    let treeData = previewTree;
                    if (treeData.length === 0) {
                      const sireId = slots.sire?.dog_id || 0;
                      const damId = slots.dam?.dog_id || 0;
                      if (sireId || damId) {
                        try {
                          const treeRes = await fetch(`/api/dogs/pedigree-tree?sire_id=${sireId}&dam_id=${damId}&gens=4`);
                          if (treeRes.ok) {
                            const treeResult = await treeRes.json();
                            treeData = treeResult.rows || [];
                            setPreviewTree(treeData);
                          }
                        } catch (_e) { /* ignore */ }
                      }
                    }

                    const fd = new FormData();
                    // Send user_id from localStorage
                    try {
                      const userStr = localStorage.getItem("user");
                      if (userStr) {
                        const user = JSON.parse(userStr);
                        if (user?.id) fd.append("userId", String(user.id));
                      }
                    } catch (_e) { /* ignore */ }
                    const token = localStorage.getItem("token");
                    fd.append("name", publishForm.name);
                    fd.append("prefix", publishForm.prefix);
                    fd.append("suffixWins", publishForm.suffixWins);
                    fd.append("suffixLosses", publishForm.suffixLosses);
                    fd.append("suffixDraws", publishForm.suffixDraws);
                    fd.append("suffixHonors", publishForm.suffixHonors);
                    fd.append("dob", publishForm.dob);
                    fd.append("sex", publishForm.sex);
                    fd.append("color", publishForm.color);
                    fd.append("continent", publishForm.continent);
                    fd.append("country", publishForm.country);
                    fd.append("breeder", publishForm.breeder);
                    fd.append("owner", publishForm.owner);
                    fd.append("conditionedWeight", publishForm.conditionedWeight);
                    fd.append("pedigreeNotes", publishForm.notes);
                    fd.append("showInTitleFeed", publishForm.showInTitleFeed ? "1" : "0");
                    fd.append("journalJson", JSON.stringify(publishForm.journal));
                    fd.append("slotsJson", JSON.stringify(slots));
                    fd.append("treeJson", JSON.stringify(treeData));
                    if (publishForm.photoFile) {
                      fd.append("photo", publishForm.photoFile);
                    }
                    const headers: Record<string, string> = {};
                    if (token) headers["Authorization"] = `Bearer ${token}`;

                    // Edit mode: update existing pedigree
                    if (editingId) {
                      fd.append("id", String(editingId));
                      const res = await fetch("/api/pedigrees/update", { method: "POST", body: fd, headers });
                      const data = await res.json();
                      if (data.success) {
                        setShowPublishModal(false);
                        router.push(`/pedigree/custom/${editingId}`);
                      } else {
                        alert(data.error || "Failed to update. Please try again.");
                      }
                    } else {
                      // New publish
                      const res = await fetch("/api/pedigrees/publish", { method: "POST", body: fd, headers });
                      const data = await res.json();
                      if (data.success && data.id) {
                        setShowPublishModal(false);
                        router.push(`/pedigree/custom/${data.id}`);
                      } else {
                        alert("Failed to publish. Please try again.");
                      }
                    }
                  } catch (err) {
                    console.error("Publish error:", err);
                    alert("Failed to publish. Please try again.");
                  } finally {
                    setPublishing(false);
                  }
                }}
                className="w-full rounded-2xl py-3 text-sm font-semibold uppercase tracking-widest transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  fontFamily: "var(--font-table, Rajdhani, sans-serif)",
                  background: "#1C1C1C",
                  color: "#FAF7F2",
                  border: "2px solid #1C1C1C",
                  borderRadius: 10,
                }}
              >
                {publishing ? (editingId ? "Saving..." : "Publishing...") : (editingId ? "Save Changes" : "Submit & Publish")}
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
    </>
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
  selected,
  onSelect,
  onDrop,
  onDragOver,
  onRemove,
  onSlotDragStart,
  accentColor,
  size = "md",
}: {
  slotKey: SlotKey;
  label: string;
  dog: SlotDog | null;
  preview: boolean;
  selected: boolean;
  onSelect: () => void;
  onDrop: (key: SlotKey) => void;
  onDragOver: (e: React.DragEvent) => void;
  onRemove: (key: SlotKey) => void;
  onSlotDragStart?: (key: SlotKey) => void;
  accentColor?: string;
  size?: "sm" | "md";
}) {
  const [dragOver, setDragOver] = useState(false);
  const isSm = size === "sm";
  const accent = accentColor || "#1C1C1C";
  const displayName = dog?.registered_name;
  const titleColor = displayName ? getDogColor(displayName) : accent;

  if (dog) {
    return (
      <div
        className={`cursor-pointer relative ${selected ? "ring-2 ring-[#C9B29F]" : ""}`}
        style={{
          width: isSm ? 140 : 155,
          padding: isSm ? 8 : 12,
          background: "#FAF7F2",
          border: `2px solid ${dragOver ? "#1C1C1C" : "#C9B29F"}`,
          borderRadius: 10,
          outline: "none",
          transition: "all 0.3s ease",
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
            backgroundColor: dog.photo_url ? "transparent" : "#FAFAFA",
            border: `2px solid #C9B29F`,
          }}
        >
          {!dog.photo_url && (
            <div className="w-full h-full flex items-center justify-center text-sm" style={{ color: "#6B7280" }}>
              {"\uD83D\uDC36"}
            </div>
          )}
        </div>
        {/* Name */}
        <p
          className={`text-center font-bold truncate ${isSm ? "text-[9px]" : "text-[10px]"}`}
          style={{ color: titleColor, fontFamily: "var(--font-table, Rajdhani, sans-serif)" }}
        >
          {displayName}
        </p>
        {/* Label */}
        <p className="text-center text-[8px] mt-0.5" style={{ color: "#C9B29F" }}>
          {label}
        </p>
        {/* Remove X button - top right */}
        {!preview && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(slotKey);
            }}
            className="absolute flex items-center justify-center rounded-full hover:scale-110 transition-all"
            style={{
              top: -6,
              right: -6,
              width: 18,
              height: 18,
              fontSize: 10,
              fontWeight: 800,
              color: "#FAF7F2",
              background: "#dc2626",
              border: "2px solid #C9B29F",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        )}
        {/* Drag handle - top left */}
        {!preview && onSlotDragStart && (
          <div
            draggable
            onDragStart={(e) => {
              e.stopPropagation();
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", slotKey);
              onSlotDragStart(slotKey);
            }}
            className="absolute flex items-center justify-center cursor-grab active:cursor-grabbing hover:scale-110 transition-all"
            style={{
              top: -4,
              left: -4,
              width: 20,
              height: 20,
              fontSize: 12,
              color: "#1C1C1C",
              background: "#FAF7F2",
              border: "2px solid #C9B29F",
              borderRadius: "5px",
              lineHeight: 1,
              fontFamily: "var(--font-mono, monospace)",
              zIndex: 10,
            }}
            title="Drag to move to another slot"
          >
            ☰
          </div>
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
          background: "#FAFAFA",
          border: "2px solid #C9B29F",
          borderRadius: 10,
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
        background: dragOver ? "#FAF7F2" : "#FAFAFA",
        border: dragOver
          ? "2px dashed #1C1C1C"
          : `2px dashed #C9B29F`,
        borderRadius: 10,
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
      <span className="text-lg mb-1" style={{ color: "#C9B29F" }}>
        +
      </span>
      <span
        className={`${isSm ? "text-[8px]" : "text-[9px]"} uppercase tracking-widest font-semibold`}
        style={{
          color: "#C9B29F",
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
  style: extraStyle,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div>
      <label
        className="block text-[10px] uppercase tracking-widest font-semibold mb-1"
        style={{ color: "#6B7280", fontFamily: "var(--font-table, Rajdhani, sans-serif)" }}
      >
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl px-3 py-2 text-sm outline-none transition-all focus:ring-1"
        style={{
          background: "#FAFAFA",
          border: "2px solid #C9B29F",
          color: "#1C1C1C",
          fontFamily: "var(--font-table, Rajdhani, sans-serif)",
          ...extraStyle,
        }}
      />
    </div>
  );
}

/* ================================================================== */
/* Page wrapper with Suspense for useSearchParams                      */
/* ================================================================== */
export default function PedigreeLabPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{ background: "#FAFAFA", color: "#6B7280" }}>Loading...</div>}>
      <PedigreeLabInner />
    </Suspense>
  );
}
