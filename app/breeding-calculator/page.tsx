"use client";

import { useState, useRef, useEffect, useCallback } from "react";

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
function getDogColor(name: string): string {
  const n = (name || "").toUpperCase();
  if (/\bGR\s*CH\b/.test(n)) return "#60a5fa";
  if (/(?:^|\s|\()CH\b/.test(n)) return "#fc8181";
  const xw = n.match(/\b(\d+)X[WL]\b/);
  if (xw) {
    const num = parseInt(xw[1]);
    if (num === 1) return "#2dd4bf";
    if (num === 2) return "#fb923c";
    if (num === 3) return "#d4a855";
    if (num === 4) return "#f472b6";
    if (num >= 5) return "#c084fc";
  }
  if (/\bROM\b/.test(n)) return "#22d3ee";
  return "#e8e8e8";
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
/* Tachometer Gauge                                                    */
/* ------------------------------------------------------------------ */
function TachoGauge({ coi }: { coi: number }) {
  const clampedCoi = Math.min(coi, 35);
  const angle = -135 + (clampedCoi / 35) * 270;
  const color = riskColor(coi);
  const danger = coi >= 20;

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
        <path
          d="M 30 160 A 110 110 0 0 1 250 160"
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="18"
          strokeLinecap="round"
        />
        {/* Colored arc */}
        <path
          d="M 30 160 A 110 110 0 0 1 250 160"
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth="18"
          strokeLinecap="round"
          opacity="0.7"
        />
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
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
              <text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.3)" fontSize="9" fontFamily="var(--font-mono)">
                {val}%
              </text>
            </g>
          );
        })}
        {/* Needle */}
        <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: "140px 155px", transition: "transform 1s cubic-bezier(0.34, 1.56, 0.64, 1)" }}>
          <line x1="140" y1="155" x2="140" y2="60" stroke={color} strokeWidth="3" strokeLinecap="round" />
          <circle cx="140" cy="155" r="8" fill={color} />
          <circle cx="140" cy="155" r="4" fill="#0b1120" />
        </g>
        {/* Center value */}
        <text x="140" y="140" textAnchor="middle" fill={color} fontSize="32" fontWeight="900" fontFamily="var(--font-table)">
          {coi.toFixed(1)}%
        </text>
      </svg>
      <div
        className={`text-sm font-black uppercase tracking-[0.2em] mt-1 ${danger ? "animate-pulse" : ""}`}
        style={{ color, fontFamily: "var(--font-table)", textShadow: danger ? `0 0 20px ${color}` : "none" }}
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
    } catch { setResults([]); }
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
        } catch {}
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
    <div ref={containerRef} className="flex-1 relative rounded-2xl overflow-hidden" style={{
      background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)",
      border: selected ? `1.5px solid ${color}` : "1.5px solid rgba(30,64,120,0.8)",
      boxShadow: selected ? `0 0 30px ${color}20, 0 2px 20px rgba(0,0,0,0.25)` : "0 2px 20px rgba(0,0,0,0.25)",
      transition: "all 0.3s ease",
    }}>
      {/* Header bar */}
      <div className="flex items-center gap-2 px-5 py-3" style={{ borderBottom: `1px solid ${selected ? `${color}30` : "rgba(30,64,120,0.4)"}` }}>
        <span className="text-lg">{icon}</span>
        <span className="text-sm font-black uppercase tracking-[0.15em]" style={{ color, fontFamily: "var(--font-table)" }}>{label}</span>
        {selected && (
          <button onClick={clear} className="ml-auto text-xs px-2 py-0.5 rounded" style={{ color: "#ef4444", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
            ✕
          </button>
        )}
      </div>

      <div className="p-5">
        {selected ? (
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0" style={{ border: `2px solid ${color}40`, background: "#0a1020" }}>
              {photoSrc ? (
                <img src={photoSrc} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl opacity-20">🐕</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-lg font-black truncate" style={{ color: getDogColor(selected.registered_name), fontFamily: "var(--font-table)" }}>
                {selected.registered_name}
              </p>
              <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-mono)" }}>
                APBT-{selected.dog_id}
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
              className="w-full rounded-xl px-4 py-4 text-sm outline-none placeholder-white/20"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(30,64,120,0.5)",
                color: "#e2e8f0",
                fontFamily: "var(--font-table)",
              }}
            />
            {loading && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${color}60`, borderTopColor: "transparent" }} />
            )}
            {showDrop && results.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 rounded-xl overflow-hidden z-50 max-h-72 overflow-y-auto" style={{ background: "#0e1828", border: "1px solid rgba(30,64,120,0.6)", boxShadow: "0 12px 40px rgba(0,0,0,0.6)" }}>
                {results.map((dog) => {
                  const src = dog.photo_url ? (dog.photo_url.startsWith("http") ? dog.photo_url : `https://www.apbt.online-pedigrees.com/${dog.photo_url}`) : null;
                  return (
                    <button key={dog.dog_id} onClick={() => pick(dog)} className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5">
                      <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-black/50">
                        {src ? <img src={src} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs opacity-20">🐕</div>}
                      </div>
                      <span className="text-sm font-semibold truncate" style={{ color: getDogColor(dog.registered_name) }}>{dog.registered_name}</span>
                    </button>
                  );
                })}
              </div>
            )}
            {showDrop && results.length === 0 && query.length >= 2 && !loading && (
              <div className="absolute top-full left-0 right-0 mt-2 rounded-xl px-4 py-3 text-sm z-50" style={{ background: "#0e1828", border: "1px solid rgba(30,64,120,0.4)", color: "rgba(255,255,255,0.25)" }}>
                No dogs found for &ldquo;{query}&rdquo;
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shared Ancestor Donut                                               */
/* ------------------------------------------------------------------ */
function DonutChart({ ancestors }: { ancestors: SharedAncestor[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const total = ancestors.reduce((s, a) => s + a.count, 0);
  const size = 240;
  const cx = size / 2, cy = size / 2;
  const outerR = 105, innerR = 65;
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
    const col = PIE_COLORS[i % PIE_COLORS.length];
    return (
      <path key={i} d={d} fill={col} opacity={hovered === i ? 1 : 0.8}
        onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}
        style={{ cursor: "pointer", transition: "opacity 0.2s, transform 0.2s", transform: hovered === i ? `scale(1.03)` : "scale(1)", transformOrigin: `${cx}px ${cy}px` }} />
    );
  });

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices}
        <text x={cx} y={cy - 8} textAnchor="middle" fill="#d4a855" fontSize="28" fontWeight="900" fontFamily="var(--font-table)">
          {ancestors.length}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="10" fontFamily="var(--font-mono)">
          SHARED
        </text>
      </svg>
      {hovered !== null && ancestors[hovered] && (
        <div className="text-center px-3 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(30,64,120,0.4)" }}>
          <span className="text-sm font-bold" style={{ color: PIE_COLORS[hovered % PIE_COLORS.length] }}>{ancestors[hovered].name}</span>
          <span className="text-xs ml-2" style={{ color: "#d4a855" }}>{ancestors[hovered].count}x ({((ancestors[hovered].count / total) * 100).toFixed(1)}%)</span>
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
  const [genDepth, setGenDepth] = useState<number>(8);
  const [includeHalf, setIncludeHalf] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [coi, setCoi] = useState<number | null>(null);
  const [sharedAncestors, setSharedAncestors] = useState<SharedAncestor[]>([]);
  const [hasResults, setHasResults] = useState(false);

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

      setCoi(coiVal * 100);
      setSharedAncestors(shared);
      setHasResults(true);
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
    <div className="min-h-screen pb-20" style={{ background: "var(--bg-deep)" }}>
      <style>{`
        @keyframes pulse-gold { 0%, 100% { box-shadow: 0 0 20px rgba(212,168,85,0.3); } 50% { box-shadow: 0 0 40px rgba(212,168,85,0.6); } }
        @keyframes slide-up { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slide-up { animation: slide-up 0.6s ease-out forwards; }
        .breed-btn-ready { animation: pulse-gold 2s ease-in-out infinite; }
      `}</style>

      {/* Header */}
      <div className="max-w-[1200px] mx-auto px-6 pt-10 pb-2">
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl font-black tracking-tight" style={{ fontFamily: "var(--font-table)", color: "var(--accent-gold, #d4a855)", textShadow: "0 0 60px rgba(212,168,85,0.2)" }}>
            Breeding Calculator
          </h1>
          <p className="mt-2 text-sm tracking-[0.2em] uppercase" style={{ color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-mono)" }}>
            Know Your Cross Before You Make It
          </p>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 mt-8">
        {/* Dog slots */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <DogSlot label="DOG 1 — SIRE" color="#60a5fa" icon="♂" selected={sire} onSelect={setSire} />
          <div className="hidden md:flex items-center justify-center px-3">
            <span className="text-3xl font-black" style={{ color: bothReady ? "#d4a855" : "rgba(255,255,255,0.08)" }}>×</span>
          </div>
          <DogSlot label="DOG 2 — DAM" color="#f472b6" icon="♀" selected={dam} onSelect={setDam} />
        </div>

        {/* Gen depth + Calculate button */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-8">
          {/* Gen buttons */}
          <div className="flex items-center gap-2">
            <span className="text-xs tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-mono)" }}>DEPTH</span>
            {[6, 8, 10].map((g) => (
              <button key={g} onClick={() => { setGenDepth(g); if (hasResults) calculate(g); }}
                className="px-4 py-1.5 rounded-lg text-sm font-black transition-all"
                style={{
                  fontFamily: "var(--font-table)",
                  background: genDepth === g ? "rgba(212,168,85,0.15)" : "rgba(255,255,255,0.02)",
                  color: genDepth === g ? "#d4a855" : "rgba(255,255,255,0.2)",
                  border: genDepth === g ? "1px solid rgba(212,168,85,0.4)" : "1px solid rgba(30,64,120,0.4)",
                }}>
                {g}G
              </button>
            ))}
          </div>

          {/* Calculate Breeding button */}
          <button onClick={() => calculate()} disabled={!bothReady || calculating}
            className={`px-14 py-4 rounded-2xl text-lg font-black uppercase tracking-[0.15em] transition-all ${bothReady && !calculating ? "breed-btn-ready cursor-pointer" : "cursor-not-allowed"}`}
            style={{
              fontFamily: "var(--font-table)",
              background: bothReady && !calculating ? "linear-gradient(135deg, #d4a855 0%, #a07830 100%)" : "rgba(212,168,85,0.08)",
              color: bothReady && !calculating ? "#fff" : "rgba(212,168,85,0.2)",
              border: bothReady ? "1px solid rgba(212,168,85,0.5)" : "1px solid rgba(212,168,85,0.08)",
            }}>
            {calculating ? (
              <span className="flex items-center gap-2">
                <span className="inline-block w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                CALCULATING...
              </span>
            ) : "CALCULATE BREEDING"}
          </button>

          {/* What-if toggle */}
          <label className="flex items-center gap-2 cursor-pointer text-xs" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-mono)" }}>
            <div className="relative inline-block w-9 h-5 rounded-full transition-colors" style={{ background: includeHalf ? "rgba(212,168,85,0.2)" : "rgba(255,255,255,0.06)" }}
              onClick={() => setIncludeHalf(!includeHalf)}>
              <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform" style={{ transform: includeHalf ? "translateX(16px)" : "translateX(0)", background: includeHalf ? "#d4a855" : "rgba(255,255,255,0.3)" }} />
            </div>
            HALF-SIB MODE
          </label>
        </div>

        {/* Results */}
        {hasResults && coi !== null && (
          <div className="space-y-6 animate-slide-up">
            {/* Tachometer + Risk Assessment */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-4">
              {/* Gauge */}
              <div className="rounded-2xl p-8 flex flex-col items-center justify-center" style={{ background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)", border: "1.5px solid rgba(30,64,120,0.8)", boxShadow: "0 2px 20px rgba(0,0,0,0.25)" }}>
                <TachoGauge coi={coi} />
              </div>

              {/* Risk card */}
              <div className="rounded-2xl p-6" style={{ background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)", border: `1.5px solid ${riskColor(coi)}40`, boxShadow: "0 2px 20px rgba(0,0,0,0.25)" }}>
                <p className="text-xs tracking-[0.2em] uppercase mb-5" style={{ color: riskColor(coi), fontFamily: "var(--font-mono)" }}>RISK ASSESSMENT</p>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2" style={{ borderBottom: "1px solid rgba(30,64,120,0.3)" }}>
                    <span className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>COI</span>
                    <span className="text-lg font-black" style={{ color: riskColor(coi), fontFamily: "var(--font-table)" }}>{coi.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between items-center py-2" style={{ borderBottom: "1px solid rgba(30,64,120,0.3)" }}>
                    <span className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>Shared Ancestors</span>
                    <span className="text-lg font-black" style={{ color: "#e2e8f0", fontFamily: "var(--font-table)" }}>{directShared.length}</span>
                  </div>
                  {topAncestor && topAncestor.sireGens.length > 0 && topAncestor.damGens.length > 0 && (
                    <div className="flex justify-between items-center py-2" style={{ borderBottom: "1px solid rgba(30,64,120,0.3)" }}>
                      <span className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>Most Repeated</span>
                      <span className="text-sm font-black truncate max-w-[200px] text-right" style={{ color: getDogColor(topAncestor.name), fontFamily: "var(--font-table)" }}>
                        {topAncestor.name} ({topAncestor.count}x)
                      </span>
                    </div>
                  )}
                  {/* Verdict */}
                  <div className="mt-4 rounded-xl px-5 py-4" style={{ background: `${riskColor(coi)}08`, border: `1px solid ${riskColor(coi)}25` }}>
                    <p className="text-sm font-semibold leading-relaxed" style={{ color: riskColor(coi), fontFamily: "var(--font-mono)" }}>
                      {riskVerdict(coi, topAncestor)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Ancestor Overlap + List */}
            <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4">
              {/* Donut */}
              <div className="rounded-2xl p-6 flex flex-col items-center" style={{ background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)", border: "1.5px solid rgba(30,64,120,0.8)", boxShadow: "0 2px 20px rgba(0,0,0,0.25)" }}>
                <p className="text-xs tracking-[0.2em] uppercase mb-4" style={{ color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-mono)" }}>ANCESTOR OVERLAP</p>
                {directShared.length > 0 ? <DonutChart ancestors={directShared} /> : (
                  <div className="flex-1 flex items-center justify-center py-10">
                    <p className="text-sm" style={{ color: "rgba(255,255,255,0.15)" }}>No shared blood</p>
                  </div>
                )}
              </div>

              {/* Shared list */}
              <div className="rounded-2xl p-6" style={{ background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)", border: "1.5px solid rgba(30,64,120,0.8)", boxShadow: "0 2px 20px rgba(0,0,0,0.25)" }}>
                <p className="text-xs tracking-[0.2em] uppercase mb-4" style={{ color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-mono)" }}>
                  SHARED ANCESTORS ({directShared.length})
                </p>
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {directShared.map((a, i) => {
                    const photoSrc = a.photo ? (a.photo.startsWith("http") ? a.photo : `https://www.apbt.online-pedigrees.com/${a.photo}`) : null;
                    return (
                      <div key={a.id} className="flex items-center gap-3 rounded-xl px-4 py-3 transition-all hover:bg-white/[0.02]" style={{ border: "1px solid rgba(30,64,120,0.3)" }}>
                        <div className="w-2 h-8 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0" style={{ background: "#0a1020" }}>
                          {photoSrc ? <img src={photoSrc} alt="" className="w-full h-full object-cover" /> : (
                            <div className="w-full h-full flex items-center justify-center text-xs font-black" style={{ color: PIE_COLORS[i % PIE_COLORS.length] }}>{i + 1}</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black truncate" style={{ color: getDogColor(a.name), fontFamily: "var(--font-table)" }}>{a.name}</p>
                          <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-mono)" }}>
                            Sire: Gen {a.sireGens.join(",")} · Dam: Gen {a.damGens.join(",")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-base font-black" style={{ color: PIE_COLORS[i % PIE_COLORS.length], fontFamily: "var(--font-table)" }}>{a.count}x</span>
                          <span className="text-xs font-bold" style={{ color: "#d4a855", fontFamily: "var(--font-mono)" }}>
                            ({((a.count / directShared.reduce((s, x) => s + x.count, 0)) * 100).toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {directShared.length === 0 && (
                    <div className="text-center py-12">
                      <p className="text-sm" style={{ color: "rgba(255,255,255,0.15)" }}>No shared ancestors in {genDepth} generations. Clean slate.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
