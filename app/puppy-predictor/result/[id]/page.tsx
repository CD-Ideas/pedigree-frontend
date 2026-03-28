"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface PredictionResult { phenotype: string; percentage: number; carriers: string[]; }
interface PredictionData {
  share_id: string;
  sire_name: string | null;
  dam_name: string | null;
  sire_dog_id: number | null;
  dam_dog_id: number | null;
  sire_genotype: { K: string; A: string; B: string; D: string; E: string };
  dam_genotype: { K: string; A: string; B: string; D: string; E: string };
  results_json: PredictionResult[];
  litter_simulation: { id: number; phenotype: string; sex: string; carriers: string[] }[] | null;
  created_at: string;
}

function getSwatchGradient(phenotype: string): string {
  const p = phenotype.toLowerCase();
  if (p.includes("isabella") && p.includes("brindle")) return "linear-gradient(135deg, #c4a882, #a08060 30%, #c4a882 50%, #a08060 70%, #c4a882)";
  if (p.includes("isabella")) return "linear-gradient(135deg, #c4a882, #b09070)";
  if (p.includes("blue") && p.includes("brindle")) return "linear-gradient(135deg, #7a8a9e, #5a6a7e 30%, #8a9aae 50%, #5a6a7e 70%, #7a8a9e)";
  if (p.includes("blue") && p.includes("fawn")) return "linear-gradient(135deg, #b0c0d0, #8a9aae)";
  if (p.includes("blue") && p.includes("tan")) return "linear-gradient(135deg, #7a8a9e 60%, #c4a050 90%)";
  if (p.includes("blue")) return "linear-gradient(135deg, #7a8a9e, #5a6a7e)";
  if (p.includes("chocolate") && p.includes("brindle")) return "linear-gradient(135deg, #8B4513, #6B3410 30%, #9B5523 50%, #6B3410 70%, #8B4513)";
  if (p.includes("chocolate")) return "linear-gradient(135deg, #8B4513, #6B3410)";
  if (p.includes("red nose")) return "linear-gradient(135deg, #d4a050, #c49040, #b08030)";
  if (p.includes("red") || (p.includes("fawn") && !p.includes("blue"))) return "linear-gradient(135deg, #c4953a, #a07828)";
  if (p.includes("brindle")) return "linear-gradient(135deg, #2a2a2a, #1a1a1a 30%, #3a3a3a 50%, #c4953a 55%, #2a2a2a 70%)";
  if (p.includes("agouti") || p.includes("wild") || p.includes("sable")) return "linear-gradient(135deg, #8a7a5a, #6a5a3a 40%, #a08a6a 60%, #6a5a3a)";
  if (p.includes("tan")) return "linear-gradient(135deg, #1a1a1a 60%, #c4a050 90%)";
  if (p.includes("black")) return "linear-gradient(135deg, #1a1a1a, #0a0a0a)";
  return "linear-gradient(135deg, #888, #666)";
}

function getSwatchSolid(phenotype: string): string {
  const p = phenotype.toLowerCase();
  if (p.includes("isabella")) return "#c4a882";
  if (p.includes("blue")) return "#7a8a9e";
  if (p.includes("chocolate")) return "#8B4513";
  if (p.includes("red") || p.includes("fawn")) return "#c4953a";
  if (p.includes("sable") || p.includes("agouti")) return "#a08a6a";
  return "#1a1a1a";
}

function DogSilhouette({ phenotype, size = 64 }: { phenotype: string; size?: number }) {
  const p = phenotype.toLowerCase();
  const isBrindle = p.includes("brindle");
  const isTanPoint = p.includes("tan") || p.includes("brindle point");
  const baseColor = getSwatchSolid(phenotype);
  const id = `dog-r-${phenotype.replace(/[^a-zA-Z]/g, "")}`;

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {isBrindle && (
          <pattern id={`brindle-${id}`} patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(30)">
            <rect width="8" height="8" fill={baseColor} />
            <rect width="3" height="8" fill="rgba(180,140,60,0.7)" />
          </pattern>
        )}
        {isTanPoint && (
          <linearGradient id={`tan-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="60%" stopColor={baseColor} />
            <stop offset="85%" stopColor="#c4a050" />
          </linearGradient>
        )}
      </defs>
      <path d="M25 30 C20 28, 15 22, 12 18 C10 15, 8 16, 10 20 C12 24, 14 28, 18 32
               L18 35 C12 38, 8 45, 8 52 C8 58, 10 62, 12 65 L12 82 C12 86, 16 86, 16 82 L16 72
               C18 74, 22 76, 28 76 L28 82 C28 86, 32 86, 32 82 L32 76
               C36 76, 40 75, 44 73 L50 73 C54 75, 58 76, 62 76 L62 82 C62 86, 66 86, 66 82 L66 76
               C72 76, 76 74, 78 72 L78 82 C78 86, 82 86, 82 82 L82 65
               C84 62, 86 58, 86 52 C86 45, 82 38, 76 35 L76 32
               C80 28, 82 24, 84 20 C86 16, 84 15, 82 18 C79 22, 74 28, 69 30
               C64 28, 56 26, 47 26 C38 26, 30 28, 25 30 Z"
            fill={isBrindle ? `url(#brindle-${id})` : isTanPoint ? `url(#tan-${id})` : baseColor}
            stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
      <circle cx="22" cy="28" r="2" fill="white" opacity="0.8" />
      <circle cx="22" cy="28" r="1" fill="#333" />
      <circle cx="10" cy="20" r="1.5" fill={p.includes("red nose") || p.includes("chocolate") || p.includes("isabella") ? "#8B4513" : "#1a1a1a"} />
    </svg>
  );
}

export default function PredictionResultPage() {
  const params = useParams();
  const [data, setData] = useState<PredictionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!params.id) return;
    fetch(`/api/color-predictions?shareId=${params.id}`)
      .then(r => { if (!r.ok) throw new Error("Not found"); return r.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setError("Prediction not found"); setLoading(false); });
  }, [params.id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#080c14" }}>
      <p className="text-sm animate-pulse" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>Loading prediction...</p>
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "#080c14" }}>
      <p className="text-sm" style={{ color: "#ef4444", fontFamily: "var(--font-table)" }}>{error || "Not found"}</p>
    </div>
  );

  const results = data.results_json;

  return (
    <div className="min-h-screen" style={{ background: "#080c14" }}>
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 style={{
            fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "2rem",
            color: "#1C1C1C",
            
          }}>
            LITTER COLOR PREDICTION
          </h1>
          <div className="flex items-center justify-center gap-3 text-sm" style={{ fontFamily: "var(--font-table)" }}>
            <span style={{ color: "#60a5fa" }}>♂ {data.sire_name || "Sire"}</span>
            <span style={{ color: "#64748b" }}>×</span>
            <span style={{ color: "#f472b6" }}>♀ {data.dam_name || "Dam"}</span>
          </div>
          <p className="text-[10px]" style={{ color: "#64748b", fontFamily: "var(--font-mono)" }}>
            Created {new Date(data.created_at).toLocaleDateString()}
          </p>
        </div>

        {/* Genotypes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: "Sire Genotype", geno: data.sire_genotype, color: "#60a5fa", icon: "♂" },
            { label: "Dam Genotype", geno: data.dam_genotype, color: "#f472b6", icon: "♀" },
          ].map(g => (
            <div key={g.label} className="rounded-lg p-3 space-y-1" style={{
              background: "#FAF7F2",
              border: `1px solid ${g.color}30`,
            }}>
              <h3 className="text-xs font-bold" style={{ color: g.color, fontFamily: "var(--font-table)" }}>
                {g.icon} {g.label}
              </h3>
              <div className="grid grid-cols-5 gap-1 text-[10px]" style={{ fontFamily: "var(--font-mono)", color: "#6B7280" }}>
                {Object.entries(g.geno).map(([k, v]) => (
                  <div key={k}><span style={{ color: "#1C1C1C" }}>{k}:</span> {v}</div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Results */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {results.map((r, i) => (
            <div key={i} className="rounded-xl p-4 transition-all hover:scale-[1.02]" style={{
              background: "#FAF7F2",
              border: "2px solid #C9B29F", 
            }}>
              <div className="flex items-center gap-3 mb-3">
                <DogSilhouette phenotype={r.phenotype} size={56} />
                <div className="flex-1">
                  <div className="w-full h-10 rounded-lg relative overflow-hidden" style={{
                    background: getSwatchGradient(r.phenotype),
                  }}>
                    {r.phenotype.toLowerCase().includes("brindle") && (
                      <div className="absolute inset-0" style={{
                        background: "repeating-linear-gradient(60deg, transparent, transparent 6px, rgba(0,0,0,0.25) 6px, rgba(0,0,0,0.25) 10px)",
                      }} />
                    )}
                    <div className="absolute top-1 right-2 px-2 py-0.5 rounded-full text-xs font-bold"
                      style={{ background: "rgba(0,0,0,0.6)", color: "#1C1C1C", fontFamily: "var(--font-mono)", fontSize: "0.7rem" }}>
                      {r.percentage}%
                    </div>
                  </div>
                </div>
              </div>
              <h3 className="text-sm font-bold" style={{ color: "#1C1C1C", fontFamily: "var(--font-display)" }}>{r.phenotype}</h3>
              <div className="mt-2 w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                <div className="h-full rounded-full" style={{ width: `${r.percentage}%`, background: "#C9B29F" }} />
              </div>
              {r.carriers.length > 0 && (
                <div className="mt-2 space-y-0.5">
                  {r.carriers.map((c, ci) => (
                    <div key={ci} className="flex items-center gap-1.5 text-[10px]" style={{ color: "#f59e0b" }}>
                      <span>⚠</span><span>{c}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Back link */}
        <div className="text-center pt-4">
          <Link href="/puppy-predictor"
            className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105 inline-block"
            style={{
              background: "#1C1C1C", color: "#FAF7F2",
              fontFamily: "var(--font-table)", letterSpacing: "0.03em",
            }}>
            TRY YOUR OWN PREDICTION
          </Link>
        </div>
      </div>
    </div>
  );
}
