"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { getDogColor } from "@/app/utils/colors";

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */
interface DogSearchResult {
  dog_id: number;
  registered_name: string;
  photo_url: string | null;
}

interface Ancestor {
  ancestor_id: number;
  ancestor_name: string;
  generation: number;
  position: string;
  ancestor_photo: string | null;
}

interface DogDetail {
  registered_name: string;
  sex: string;
  photo_url: string | null;
  pedigree: Ancestor[];
}

interface SharedAncestor {
  id: number;
  name: string;
  sireGens: number[];
  damGens: number[];
  count: number;
  photo: string | null;
}

/* ------------------------------------------------------------------ */
/* Color helpers                                                       */
/* ------------------------------------------------------------------ */

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

function riskVerdict(coi: number, topAncestor?: SharedAncestor): string {
  const pct = coi.toFixed(1);
  if (coi < 5) return `COI: ${pct}%. Clean outcross—fresh blood, new genetics. No overlap worth sweating.`;
  if (coi < 10) return `COI: ${pct}%. Mild linebreed—enough to lock traits, loose enough to stay healthy.${topAncestor ? ` Built on ${topAncestor.name}.` : ""}`;
  if (coi < 15) return `COI: ${pct}%. Linebred lock—gameness incoming. Tight enough to keep that wide head, loose enough you won't eat vet bills.${topAncestor ? ` Heavy on ${topAncestor.name}.` : ""}`;
  if (coi < 20) return `COI: ${pct}%. Tight linebreed. You're stacking the deck hard.${topAncestor ? ` ${topAncestor.name} shows up ${topAncestor.count}x.` : ""} Know your line or back off.`;
  return `COI: ${pct}%. DANGER ZONE. Hips, heart, or worse. You're rolling dice with genetics.${topAncestor ? ` ${topAncestor.name} is everywhere—${topAncestor.count}x deep.` : ""} Back off unless you know exactly what you're doing.`;
}

const PIE_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f43f5e", "#a855f7",
  "#06b6d4", "#84cc16", "#e11d48", "#6366f1",
];

/* ------------------------------------------------------------------ */
/* Card wrapper — matches spotlight card styling                       */
/* ------------------------------------------------------------------ */
function Card({ children, className = "", style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`rounded-lg ${className}`}
      style={{
        background: "#FAF7F2",
        border: "2px solid #C9B29F",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function SectionHeader({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <p
      className="text-[10px] uppercase tracking-widest font-semibold mb-3"
      style={{ color: color || "#6B6B6B", fontFamily: "var(--font-table)" }}
    >
      {children}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Tachometer Gauge                                                    */
/* ------------------------------------------------------------------ */
function TachoGauge({ coi }: { coi: number }) {
  const clampedCoi = Math.min(coi, 35);
  const targetAngle = -135 + (clampedCoi / 35) * 270;
  const color = riskColor(coi);
  const danger = coi >= 20;
  const [angle, setAngle] = useState(-135);

  useEffect(() => {
    setAngle(-135);
    const timer = setTimeout(() => setAngle(targetAngle), 150);
    return () => clearTimeout(timer);
  }, [targetAngle]);

  return (
    <div className="relative flex flex-col items-center">
      <svg width="280" height="180" viewBox="0 0 280 180">
        <defs>
          <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="30%" stopColor="#eab308" />
            <stop offset="55%" stopColor="#f97316" />
            <stop offset="75%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
        </defs>
        {/* Track */}
        <path d="M 30 160 A 110 110 0 0 1 250 160" fill="none" stroke="#C9B29F" strokeWidth="18" strokeLinecap="round" opacity="0.3" />
        {/* Colored arc */}
        <path d="M 30 160 A 110 110 0 0 1 250 160" fill="none" stroke="url(#gaugeGrad)" strokeWidth="18" strokeLinecap="round" opacity="0.7" />
        {/* Tick marks */}
        {[0, 5, 10, 15, 20, 25, 30, 35].map((val) => {
          const a = (-135 + (val / 35) * 270) * (Math.PI / 180);
          const x1 = 140 + 100 * Math.cos(a);
          const y1 = 155 + 100 * Math.sin(a);
          const x2 = 140 + 115 * Math.cos(a);
          const y2 = 155 + 115 * Math.sin(a);
          const tx = 140 + 128 * Math.cos(a);
          const ty = 155 + 128 * Math.sin(a);
          return (
            <g key={val}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#C9B29F" strokeWidth="1.5" />
              <text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle" fill="#1C1C1C" fontSize="9" fontFamily="var(--font-mono)">{val}%</text>
            </g>
          );
        })}
        {/* Needle */}
        <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: "140px 155px", transition: "transform 1s cubic-bezier(0.34, 1.56, 0.64, 1)" }}>
          <line x1="140" y1="155" x2="140" y2="60" stroke={color} strokeWidth="3" strokeLinecap="round" />
          <circle cx="140" cy="155" r="8" fill={color} />
          <circle cx="140" cy="155" r="4" fill="#FAFAFA" />
        </g>
        {/* Center value */}
        <text x="140" y="140" textAnchor="middle" fill={color} fontSize="32" fontWeight="900" fontFamily="var(--font-mono)">
          {coi.toFixed(1)}%
        </text>
      </svg>
      <div
        className={`text-xs font-bold uppercase tracking-[0.2em] mt-1 ${danger ? "animate-pulse" : ""}`}
        style={{ color, fontFamily: "var(--font-table)" }}
      >
        {riskLabel(coi)}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dog Selector                                                        */
/* ------------------------------------------------------------------ */
function DogSlot({
  label,
  color,
  icon,
  selected,
  onSelect,
}: {
  label: string;
  color: string;
  icon: string;
  selected: DogSearchResult | null;
  onSelect: (dog: DogSearchResult | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DogSearchResult[]>([]);
  const [showDrop, setShowDrop] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setShowDrop(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/dogs/search?q=${encodeURIComponent(q)}&limit=10`);
      const data = await res.json();
      setResults(data.dogs || []);
      setShowDrop(true);
    } catch (_e) { setResults([]); }
    finally { setLoading(false); }
  }, []);

  const handleInput = (val: string) => {
    setQuery(val);
    onSelect(null);
    const urlMatch = val.match(/pedigreeplatform\.com\/pedigree\/(\d+)/);
    if (urlMatch) {
      const dogId = parseInt(urlMatch[1], 10);
      (async () => {
        try {
          const res = await fetch(`/api/dogs/${dogId}`);
          const data = await res.json();
          if (data.registered_name) {
            onSelect({ dog_id: dogId, registered_name: data.registered_name, photo_url: data.photo_url || null });
            setQuery(data.registered_name);
            setShowDrop(false);
          }
        } catch (_e) {}
      })();
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(val), 300);
  };

  const pick = (dog: DogSearchResult) => { onSelect(dog); setQuery(dog.registered_name); setShowDrop(false); };
  const clear = () => { onSelect(null); setQuery(""); setResults([]); };

  const photoSrc = selected?.photo_url
    ? selected.photo_url.startsWith("http") ? selected.photo_url : `https://www.apbt.online-pedigrees.com/${selected.photo_url}`
    : null;

  return (
    <div ref={containerRef} className="flex-1 relative">
      <Card style={{
        borderColor: selected ? color : "#C9B29F",
      }}>
        {/* Header bar */}
        <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: `2px solid #C9B29F` }}>
          <span className="text-sm" style={{ color }}>{icon}</span>
          <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color, fontFamily: "var(--font-table)" }}>{label}</span>
          {selected && (
            <button onClick={clear} className="ml-auto text-[10px] px-2 py-0.5 rounded-md transition-all hover:bg-red-500/10" style={{ color: "#ef4444", background: "#FAFAFA", border: "2px solid #C9B29F" }}>
              Clear
            </button>
          )}
        </div>

        <div className="p-4">
          {selected ? (
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0" style={{ border: "2px solid #C9B29F", background: "#FAFAFA" }}>
                {photoSrc ? (
                  <img src={photoSrc} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl opacity-20">&#x1f415;</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate" style={{ color: getDogColor(selected.registered_name), fontFamily: "var(--font-table)" }}>
                  {selected.registered_name}
                </p>
                <p className="text-[10px] mt-0.5" style={{ fontFamily: "var(--font-mono)" }}>
                  <span style={{ color: "#6B6B6B" }}>ID </span><span style={{ color: "#6B6B6B" }}>{selected.dog_id}</span>
                </p>
              </div>
            </div>
          ) : (
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => handleInput(e.target.value)}
                onFocus={() => results.length > 0 && setShowDrop(true)}
                placeholder={`Search ${label.toLowerCase()} or paste URL...`}
                className="w-full rounded-lg px-3 py-2.5 text-xs outline-none"
                style={{
                  background: "#FAFAFA",
                  border: "2px solid #C9B29F",
                  borderRadius: "8px",
                  color: query && getDogColor(query) !== "#3a3a3a" ? getDogColor(query) : "#1C1C1C",
                  fontFamily: "var(--font-table)",
                }}
              />
              {loading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${color}60`, borderTopColor: "transparent" }} />
              )}
              {showDrop && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 rounded-lg overflow-hidden z-50 max-h-64 overflow-y-auto" style={{ background: "#FAFAFA", border: "2px solid #C9B29F" }}>
                  {results.map((dog) => {
                    const src = dog.photo_url ? (dog.photo_url.startsWith("http") ? dog.photo_url : `https://www.apbt.online-pedigrees.com/${dog.photo_url}`) : null;
                    return (
                      <button key={dog.dog_id} onClick={() => pick(dog)} className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-all hover:bg-[#F0EBE3]" style={{ borderBottom: "1px solid #C9B29F" }}>
                        <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0" style={{ background: "#FAFAFA", border: "2px solid #C9B29F" }}>
                          {src ? <img src={src} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[9px] opacity-20">&#x1f415;</div>}
                        </div>
                        <span className="text-xs font-semibold truncate" style={{ color: getDogColor(dog.registered_name), fontFamily: "var(--font-table)" }}>{dog.registered_name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              {showDrop && results.length === 0 && query.length >= 2 && !loading && (
                <div className="absolute top-full left-0 right-0 mt-1 rounded-lg px-3 py-2.5 text-center text-xs z-50" style={{ background: "#FAFAFA", border: "2px solid #C9B29F", color: "#6B6B6B", fontFamily: "var(--font-table)" }}>
                  No dogs found for &ldquo;{query}&rdquo;
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shared Ancestor Donut                                               */
/* ------------------------------------------------------------------ */
function DonutChart({ ancestors, hoveredIdx, onHover }: { ancestors: SharedAncestor[]; hoveredIdx?: number | null; onHover?: (i: number | null) => void }) {
  const [localHovered, setLocalHovered] = useState<number | null>(null);
  const hovered = hoveredIdx !== undefined ? hoveredIdx : localHovered;
  const setHovered = onHover || setLocalHovered;
  const total = ancestors.reduce((s, a) => s + a.count, 0);
  const size = 220;
  const cx = size / 2, cy = size / 2;
  const outerR = 95, innerR = 60;
  let cumAngle = -90;

  const slices = ancestors.map((a, i) => {
    const fraction = a.count / total;
    const angle = fraction * 360;
    const startAngle = cumAngle;
    const endAngle = cumAngle + angle;
    cumAngle = endAngle;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const largeArc = angle > 180 ? 1 : 0;
    const ox1 = cx + outerR * Math.cos(toRad(startAngle)), oy1 = cy + outerR * Math.sin(toRad(startAngle));
    const ox2 = cx + outerR * Math.cos(toRad(endAngle)), oy2 = cy + outerR * Math.sin(toRad(endAngle));
    const ix1 = cx + innerR * Math.cos(toRad(endAngle)), iy1 = cy + innerR * Math.sin(toRad(endAngle));
    const ix2 = cx + innerR * Math.cos(toRad(startAngle)), iy2 = cy + innerR * Math.sin(toRad(startAngle));
    const d = `M ${ox1} ${oy1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${ox2} ${oy2} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2} Z`;
    const col = getDogColor(a.name);
    return (
      <path key={i} d={d} fill={col} opacity={hovered === i ? 1 : 0.8}
        onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}
        style={{ cursor: "pointer", transition: "opacity 0.2s, transform 0.2s", transform: hovered === i ? `scale(1.04)` : "scale(1)", transformOrigin: `${cx}px ${cy}px` }} />
    );
  });

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices}
        <circle cx={cx} cy={cy} r={innerR - 2} fill="#FAFAFA" stroke="#C9B29F" strokeWidth="2" />
        <text x={cx} y={cy - 6} textAnchor="middle" fill="#1C1C1C" fontSize="22" fontWeight="bold" fontFamily="var(--font-table)">
          {ancestors.length}
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill="#6B6B6B" fontSize="8" fontFamily="var(--font-mono)">
          SHARED
        </text>
      </svg>
      {hovered !== null && ancestors[hovered] && (
        <div className="text-center px-3 py-1.5 rounded-lg" style={{ background: "#FAF7F2", border: "2px solid #C9B29F" }}>
          <span className="text-xs font-bold" style={{ color: getDogColor(ancestors[hovered].name), fontFamily: "var(--font-table)" }}>{ancestors[hovered].name}</span>
          <span className="text-[10px] ml-2" style={{ color: "#6B6B6B", fontFamily: "var(--font-mono)" }}>{ancestors[hovered].count}x ({((ancestors[hovered].count / total) * 100).toFixed(1)}%)</span>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main Page                                                           */
/* ------------------------------------------------------------------ */
export default function BreedingCalculatorPage() {
  const [sire, setSire] = useState<DogSearchResult | null>(null);
  const [dam, setDam] = useState<DogSearchResult | null>(null);
  const [genDepth, setGenDepth] = useState<number>(6);
  const [includeHalf, setIncludeHalf] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [coi, setCoi] = useState<number | null>(null);
  const [sharedAncestors, setSharedAncestors] = useState<SharedAncestor[]>([]);
  const [hasResults, setHasResults] = useState(false);
  const [avk, setAvk] = useState<number | null>(null);
  const [bloodlines, setBloodlines] = useState<{ name: string; pct: number }[]>([]);
  const [sharedHover, setSharedHover] = useState<number | null>(null);
  const sharedListRef = useRef<HTMLDivElement>(null);

  const calculate = async (overrideGen?: number) => {
    if (!sire || !dam) return;
    setCalculating(true);
    setHasResults(false);
    const gen = overrideGen ?? genDepth;

    try {
      const [sireRes, damRes] = await Promise.all([
        fetch(`/api/dogs/${sire.dog_id}?gen=${gen}`).then((r) => r.json()) as Promise<DogDetail>,
        fetch(`/api/dogs/${dam.dog_id}?gen=${gen}`).then((r) => r.json()) as Promise<DogDetail>,
      ]);

      const sirePedigree = sireRes.pedigree || [];
      const damPedigree = damRes.pedigree || [];

      const sireMap = new Map<number, { gens: number[]; name: string; photo: string | null }>();
      for (const a of sirePedigree) {
        const e = sireMap.get(a.ancestor_id);
        if (e) e.gens.push(a.generation);
        else sireMap.set(a.ancestor_id, { gens: [a.generation], name: a.ancestor_name, photo: a.ancestor_photo });
      }

      const damMap = new Map<number, { gens: number[]; name: string; photo: string | null }>();
      for (const a of damPedigree) {
        const e = damMap.get(a.ancestor_id);
        if (e) e.gens.push(a.generation);
        else damMap.set(a.ancestor_id, { gens: [a.generation], name: a.ancestor_name, photo: a.ancestor_photo });
      }

      const shared: SharedAncestor[] = [];
      for (const [id, sireInfo] of sireMap) {
        const damInfo = damMap.get(id);
        if (damInfo) {
          shared.push({ id, name: sireInfo.name, sireGens: sireInfo.gens, damGens: damInfo.gens, count: sireInfo.gens.length + damInfo.gens.length, photo: sireInfo.photo || damInfo.photo });
        }
      }

      if (includeHalf) {
        for (const [id, info] of sireMap) {
          if (!damMap.has(id) && info.gens.length > 1) shared.push({ id, name: info.name, sireGens: info.gens, damGens: [], count: info.gens.length, photo: info.photo });
        }
        for (const [id, info] of damMap) {
          if (!sireMap.has(id) && info.gens.length > 1) shared.push({ id, name: info.name, sireGens: [], damGens: info.gens, count: info.gens.length, photo: info.photo });
        }
      }

      shared.sort((a, b) => b.count - a.count);

      let coiVal = 0;
      for (const anc of shared) {
        if (anc.sireGens.length > 0 && anc.damGens.length > 0) {
          for (const sg of anc.sireGens) {
            for (const dg of anc.damGens) {
              coiVal += Math.pow(0.5, sg + dg + 1);
            }
          }
        }
      }

      /* AVK = Ancestor Loss Coefficient = unique ancestors / total positions */
      const totalPositions = Array.from({ length: gen }, (_, g) => Math.pow(2, g + 1)).reduce((a, b) => a + b, 0);
      const allSireIds = new Set(sirePedigree.map(a => a.ancestor_id));
      const allDamIds = new Set(damPedigree.map(a => a.ancestor_id));
      const uniqueCount = new Set([...allSireIds, ...allDamIds]).size;
      const avkPct = totalPositions > 0 ? (uniqueCount / totalPositions) * 100 : 100;

      /* Bloodline Radar — detect famous lines in combined pedigree */
      const allNames = [...sirePedigree, ...damPedigree].map(a => (a.ancestor_name || "").toUpperCase());
      const LINES: Record<string, string[]> = {
        "Jeep/Redboy": ["JEEP", "REDBOY", "RED BOY"],
        "Carver": ["CARVER", "BLACK WIDOW", "CRACKER"],
        "Eli/Boudreaux": ["ELI", "BOUDREAUX", "BULLYSON"],
        "Chinaman": ["CHINAMAN", "FRISCO"],
        "Bolio/Tombstone": ["BOLIO", "TOMBSTONE"],
        "Tab": ["WHITE'S TAB", "GARRETT'S TAB", "TAB"],
        "Yellow/Tant": ["TANT'S YELLOW", "YELLOW"],
        "Dibo/Tudor": ["TUDOR'S DIBO", "DIBO"],
        "Buck/STP": ["S.T.P", "BUCK"],
        "Honeybunch": ["HONEYBUNCH", "HONEYBU"],
      };
      const lineScores: { name: string; pct: number }[] = [];
      for (const [lineName, keywords] of Object.entries(LINES)) {
        const hits = allNames.filter(n => keywords.some(kw => n.includes(kw))).length;
        if (hits > 0) {
          const pct = Math.min((hits / allNames.length) * 100 * 5, 100); // amplify for visibility
          lineScores.push({ name: lineName, pct: Math.round(pct) });
        }
      }
      lineScores.sort((a, b) => b.pct - a.pct);

      setCoi(coiVal * 100);
      setAvk(avkPct);
      setBloodlines(lineScores);
      setSharedAncestors(shared);
      setHasResults(true);

      /* Save to localStorage for homepage display */
      try {
        localStorage.setItem("breedingCalcResult", JSON.stringify({
          sire: { name: sire.registered_name, photo: sire.photo_url },
          dam: { name: dam.registered_name, photo: dam.photo_url },
          coi: coiVal * 100,
          bloodlines: lineScores.slice(0, 4),
          sharedCount: shared.filter(a => a.sireGens.length > 0 && a.damGens.length > 0).length,
          topAncestor: shared.length > 0 ? shared[0].name : null,
          genDepth: gen,
          timestamp: Date.now(),
        }));
      } catch (_e) {}
    } catch (err) {
      console.error("Calculation error:", err);
    } finally {
      setCalculating(false);
    }
  };

  const recalc = useCallback(() => {
    if (sire && dam && hasResults) calculate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeHalf]);

  useEffect(() => { recalc(); }, [recalc]);

  const topAncestor = sharedAncestors.length > 0 ? sharedAncestors[0] : undefined;
  const directShared = sharedAncestors.filter((a) => a.sireGens.length > 0 && a.damGens.length > 0);
  const bothReady = sire && dam;

  return (
    <div className="min-h-screen" style={{ background: "#EDE4D5" }}>
      <style>{`
        @keyframes slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slide-up { animation: slide-up 0.5s ease-out forwards; }
      `}</style>

      <main className="max-w-7xl mx-auto px-4 md:px-5 py-5">

        {/* Hero Header — matches spotlight */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-2xl">&#x1f9ec;</span>
            <h1 className="font-bold" style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", fontWeight: 700, letterSpacing: "0.02em", color: "#1C1C1C" }}>
              BLOODLINE{" "}
              <span style={{ color: "#1C1C1C" }}>CALCULATOR</span>
            </h1>
          </div>
          <p className="text-xs max-w-xl mx-auto" style={{ color: "#6B6B6B", fontFamily: "var(--font-table)" }}>
            Know your cross before you make it. Select sire and dam, calculate COI, and analyze shared bloodlines across generations.
          </p>
        </div>

        {/* Dog Selector Controls — card wrapper */}
        <Card className="p-3 md:p-4 mb-4">
          <div className="flex flex-col md:flex-row gap-3 mb-3">
            <DogSlot label="Sire" color="#1d5bbf" icon="&#x2642;" selected={sire} onSelect={setSire} />
            <div className="hidden md:flex items-center justify-center px-2">
              <span className="text-xl font-bold" style={{ color: bothReady ? "#1C1C1C" : "#6B6B6B", fontFamily: "var(--font-display)", opacity: bothReady ? 1 : 0.2 }}>&#xd7;</span>
            </div>
            <DogSlot label="Dam" color="#9f1239" icon="&#x2640;" selected={dam} onSelect={setDam} />
          </div>

          {/* Controls row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3" style={{ borderTop: "2px solid #C9B29F" }}>
            {/* Gen buttons */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs uppercase tracking-widest font-bold mr-2" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>
                Depth:
              </span>
              {[6, 8, 10, 12].map((g) => (
                <button key={g} onClick={() => { setGenDepth(g); if (hasResults) calculate(g); }}
                  className="text-[10px] px-2.5 py-1 rounded-lg font-bold transition-all"
                  style={{
                    fontFamily: "var(--font-table)",
                    background: genDepth === g ? "#C9B29F" : "#FAFAFA",
                    color: genDepth === g ? "#FAFAFA" : "#1C1C1C",
                    border: "2px solid #C9B29F",
                    borderRadius: "8px",
                  }}>
                  {g}G
                </button>
              ))}
            </div>

            {/* Calculate button */}
            <button onClick={() => calculate()} disabled={!bothReady || calculating}
              className={`px-8 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all hover:scale-[1.02] disabled:opacity-50 ${bothReady && !calculating ? "cursor-pointer" : "cursor-not-allowed"}`}
              style={{
                fontFamily: "var(--font-table)",
                background: bothReady && !calculating ? "#C9B29F" : "#FAFAFA",
                color: bothReady && !calculating ? "#FAFAFA" : "#6B6B6B",
                border: "2px solid #C9B29F",
                letterSpacing: "0.1em",
              }}>
              {calculating ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  Calculating...
                </span>
              ) : "Calculate Bloodline"}
            </button>

            {/* Half-sib toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <div className="relative inline-block w-8 h-[18px] rounded-full transition-colors" style={{ background: includeHalf ? "#C9B29F" : "#E5E7EB" }}
                onClick={() => setIncludeHalf(!includeHalf)}>
                <span className="absolute top-[2px] left-[2px] w-[14px] h-[14px] rounded-full transition-transform" style={{ transform: includeHalf ? "translateX(14px)" : "translateX(0)", background: includeHalf ? "#1C1C1C" : "#6B6B6B" }} />
              </div>
              <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>Half-Sib Mode</span>
            </label>
          </div>
        </Card>

        {/* Loading state */}
        {calculating && (
          <div className="text-center py-12">
            <div className="inline-flex flex-col items-center gap-3">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#C9B29F", borderTopColor: "transparent" }} />
                <div className="absolute inset-2 rounded-full border-2 border-b-transparent animate-spin" style={{ borderColor: "#1d5bbf", borderBottomColor: "transparent", animationDirection: "reverse", animationDuration: "0.8s" }} />
                <div className="absolute inset-0 flex items-center justify-center text-xl">&#x1f9ec;</div>
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>Analyzing Pedigrees...</p>
                <p className="text-xs mt-1" style={{ color: "#6B6B6B", fontFamily: "var(--font-table)" }}>Computing COI across {genDepth} generations</p>
              </div>
            </div>
          </div>
        )}

        {/* Pre-search empty state */}
        {!hasResults && !calculating && (
          <div className="text-center py-10">
            <div className="text-4xl mb-3 opacity-30">&#x1f9ec;</div>
            <h3 className="text-sm font-semibold mb-1.5" style={{ fontFamily: "var(--font-table)", color: "#1C1C1C" }}>
              Select a sire and dam, then hit &quot;Calculate Bloodline&quot;
            </h3>
            <p className="text-[10px] max-w-md mx-auto" style={{ color: "#6B6B6B", fontFamily: "var(--font-table)" }}>
              The system will cross-reference both pedigrees, compute the Wright coefficient of inbreeding (COI), detect shared ancestors, and map bloodline composition.
            </p>
          </div>
        )}

        {/* Results */}
        {hasResults && coi !== null && !calculating && (
          <div className="space-y-4 animate-slide-up">

            {/* Row 1: Tachometer + Risk Assessment */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Gauge Card */}
              <Card className="p-5 flex flex-col items-center justify-center">
                <SectionHeader color="#22c55e">COI Gauge</SectionHeader>
                <TachoGauge coi={coi} />
              </Card>

              {/* Risk Card */}
              <Card className="p-5">
                <SectionHeader color={riskColor(coi)}>Risk Assessment</SectionHeader>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2" style={{ borderBottom: "2px solid #C9B29F" }}>
                    <span className="text-xs" style={{ color: "#6B6B6B", fontFamily: "var(--font-table)" }}>Coefficient of Inbreeding (COI)</span>
                    <span className="text-sm font-bold" style={{ color: riskColor(coi), fontFamily: "var(--font-mono)" }}>{coi.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between items-center py-2" style={{ borderBottom: "2px solid #C9B29F" }}>
                    <span className="text-xs" style={{ color: "#6B6B6B", fontFamily: "var(--font-table)" }}>Shared Ancestors</span>
                    <span className="text-sm font-bold" style={{ color: "#1C1C1C", fontFamily: "var(--font-mono)" }}>{directShared.length}</span>
                  </div>
                  {topAncestor && topAncestor.sireGens.length > 0 && topAncestor.damGens.length > 0 && (
                    <div className="flex justify-between items-center py-2" style={{ borderBottom: "2px solid #C9B29F" }}>
                      <span className="text-xs" style={{ color: "#6B6B6B", fontFamily: "var(--font-table)" }}>Most Repeated</span>
                      <span className="text-xs font-bold truncate max-w-[120px] sm:max-w-[200px] text-right" style={{ color: getDogColor(topAncestor.name), fontFamily: "var(--font-table)" }}>
                        {topAncestor.name} ({topAncestor.count}x)
                      </span>
                    </div>
                  )}
                  {/* Verdict */}
                  <div className="mt-3 rounded-lg px-4 py-3" style={{ background: "#FAFAFA", border: "2px solid #C9B29F" }}>
                    <p className="text-xs font-semibold leading-relaxed" style={{ color: riskColor(coi), fontFamily: "var(--font-mono)" }}>
                      {riskVerdict(coi, topAncestor)}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Row 2: AVK + Bloodline Radar */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* AVK */}
              {avk !== null && (
                <Card className="p-5">
                  <SectionHeader color={avk > 80 ? "#22c55e" : avk > 60 ? "#eab308" : "#ef4444"}>Ancestor Loss Coefficient (AVK)</SectionHeader>
                  <div className="flex items-end gap-3">
                    <span className="text-3xl font-bold" style={{ color: avk > 80 ? "#22c55e" : avk > 60 ? "#eab308" : "#ef4444", fontFamily: "var(--font-mono)" }}>{avk.toFixed(1)}%</span>
                    <span className="text-[10px] mb-1.5" style={{ color: "#6B6B6B", fontFamily: "var(--font-table)" }}>
                      {avk > 80 ? "High diversity -- wide gene pool" : avk > 60 ? "Moderate -- some repeat ancestors" : "Low diversity -- heavy linebreeding"}
                    </span>
                  </div>
                  <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background: "#E5E7EB" }}>
                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(avk, 100)}%`, background: avk > 80 ? "#22c55e" : avk > 60 ? "#eab308" : "#ef4444" }} />
                  </div>
                </Card>
              )}

              {/* Bloodline Radar */}
              {bloodlines.length > 0 && (
                <Card className="p-5">
                  <SectionHeader color="#6B6B6B">Bloodline Radar</SectionHeader>
                  <div className="space-y-2.5">
                    {bloodlines.slice(0, 8).map((bl, i) => {
                      const colors = ["#8a6518", "#1d5bbf", "#c02828", "#0d7468", "#b03878", "#b45a0a", "#6d30b0", "#0d7468"];
                      const col = colors[i % colors.length];
                      return (
                        <div key={bl.name}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold" style={{ color: col, fontFamily: "var(--font-table)" }}>{bl.name}</span>
                            <span className="text-xs font-bold" style={{ color: col, fontFamily: "var(--font-mono)" }}>{bl.pct}%</span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#E5E7EB" }}>
                            <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${bl.pct}%`, background: col, opacity: 0.8 }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}
            </div>

            {/* Row 3: Donut + Shared Ancestors List */}
            <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
              {/* Donut */}
              <Card className="p-5 flex flex-col items-center">
                <SectionHeader color="#6B6B6B">Ancestor Overlap</SectionHeader>
                {directShared.length > 0 ? <DonutChart ancestors={directShared} hoveredIdx={sharedHover} onHover={(i) => {
                  setSharedHover(i);
                  if (i !== null && sharedListRef.current) {
                    const el = sharedListRef.current.querySelector(`[data-idx="${i}"]`);
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
                  }
                }} /> : (
                  <div className="flex-1 flex items-center justify-center py-8">
                    <p className="text-xs" style={{ color: "#6B6B6B", fontFamily: "var(--font-table)" }}>No shared blood</p>
                  </div>
                )}
              </Card>

              {/* Shared list */}
              <Card className="p-5">
                <SectionHeader color="#6B6B6B">Shared Ancestors ({directShared.length})</SectionHeader>
                <div ref={sharedListRef} className="space-y-1.5 max-h-[320px] sm:max-h-[480px] overflow-y-auto pr-1">
                  {directShared.map((a, i) => {
                    const photoSrc = a.photo ? (a.photo.startsWith("http") ? a.photo : `https://www.apbt.online-pedigrees.com/${a.photo}`) : null;
                    const isHovered = sharedHover === i;
                    return (
                      <div key={a.id} data-idx={i} className="rounded-lg flex items-center gap-2.5 px-3 py-2 transition-all cursor-default"
                        onMouseEnter={() => setSharedHover(i)}
                        onMouseLeave={() => setSharedHover(null)}
                        style={{
                          border: isHovered ? `2px solid ${getDogColor(a.name)}` : "2px solid #C9B29F",
                          background: isHovered ? "#F0EBE3" : "#FAFAFA",
                          transform: isHovered ? "scale(1.01)" : "scale(1)",
                          borderRadius: "8px",
                        }}>
                        <div className="w-2.5 h-7 rounded-full flex-shrink-0" style={{ background: getDogColor(a.name) }} />
                        <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0" style={{ background: "#FAFAFA", border: "2px solid #C9B29F" }}>
                          {photoSrc ? <img src={photoSrc} alt="" className="w-full h-full object-cover" /> : (
                            <div className="w-full h-full flex items-center justify-center text-[9px] font-bold" style={{ color: getDogColor(a.name) }}>{i + 1}</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate" style={{ color: getDogColor(a.name), fontFamily: "var(--font-table)" }}>{a.name}</p>
                          <p className="text-[9px] mt-0.5" style={{ color: "#6B6B6B", fontFamily: "var(--font-mono)" }}>
                            Sire: Gen {a.sireGens.join(",")} &middot; Dam: Gen {a.damGens.join(",")}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="text-sm font-bold" style={{ color: getDogColor(a.name), fontFamily: "var(--font-mono)" }}>{a.count}x</span>
                          <span className="text-[10px] font-bold" style={{ color: "#6B6B6B", fontFamily: "var(--font-mono)" }}>
                            ({((a.count / directShared.reduce((s, x) => s + x.count, 0)) * 100).toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {directShared.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-xs" style={{ color: "#6B6B6B", fontFamily: "var(--font-table)" }}>No shared ancestors in {genDepth} generations. Clean slate.</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
