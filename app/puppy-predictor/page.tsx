"use client";

import { useState } from "react";

/* ─── Allele options per locus ─── */
const K_OPTIONS = ["KB/KB", "KB/kbr", "KB/ky", "kbr/kbr", "kbr/ky", "ky/ky"];
const A_OPTIONS = ["Ay/Ay", "Ay/aw", "Ay/at", "Ay/a", "aw/aw", "aw/at", "aw/a", "at/at", "at/a", "a/a"];
const B_OPTIONS = ["BB", "Bb", "bb"];
const D_OPTIONS = ["DD", "Dd", "dd"];
const E_OPTIONS = ["EE", "Ee", "ee"];

interface Genotype {
  K: string; A: string; B: string; D: string; E: string;
}

const DEFAULT_GENO: Genotype = { K: "ky/ky", A: "Ay/Ay", B: "BB", D: "DD", E: "EE" };

/* ─── Punnett helper ─── */
function punnett(p1: string, p2: string): Record<string, number> {
  const a1 = p1.split("/");
  const a2 = p2.split("/");
  const counts: Record<string, number> = {};
  for (const x of a1) {
    for (const y of a2) {
      const combo = [x, y].sort((a, b) => alleleRank(a) - alleleRank(b)).join("/");
      counts[combo] = (counts[combo] || 0) + 1;
    }
  }
  const total = a1.length * a2.length;
  const probs: Record<string, number> = {};
  for (const [k, v] of Object.entries(counts)) probs[k] = v / total;
  return probs;
}

/* Sort alleles: dominant first */
function alleleRank(a: string): number {
  const order: Record<string, number> = {
    KB: 0, kbr: 1, ky: 2,
    Ay: 0, aw: 1, at: 2, a: 3,
    B: 0, b: 1,
    D: 0, d: 1,
    E: 0, e: 1,
  };
  return order[a] ?? 99;
}

/* ─── Phenotype determination ─── */
function determinePhenotype(k: string, a: string, b: string, d: string, e: string): string {
  const kAlleles = k.split("/");
  const aAlleles = a.split("/");
  const bAlleles = b.split("/");
  const dAlleles = d.split("/");
  const eAlleles = e.split("/");

  const isEE = eAlleles.every(x => x === "e"); // ee = red/fawn
  const isBB = bAlleles.every(x => x === "b"); // bb = chocolate/liver
  const isDD = dAlleles.every(x => x === "d"); // dd = dilute

  // Base eumelanin color
  let eumelanin = "black";
  if (isBB && isDD) eumelanin = "isabella";
  else if (isBB) eumelanin = "chocolate";
  else if (isDD) eumelanin = "blue";

  // ee overrides everything — red/fawn base
  if (isEE) {
    if (isBB) {
      if (isDD) return "Isabella Red (Dilute Red Nose)";
      return "Red Nose Fawn";
    }
    if (isDD) return "Blue Fawn";
    return "Red/Fawn";
  }

  // K locus determines solid vs pattern
  const hasKB = kAlleles.includes("KB");
  const hasKbr = kAlleles.includes("kbr");

  // KB is dominant — solid eumelanin
  if (hasKB) {
    if (eumelanin === "black") return "Solid Black";
    if (eumelanin === "blue") return "Solid Blue";
    if (eumelanin === "chocolate") return "Solid Chocolate";
    return "Solid Isabella";
  }

  // kbr — brindle (needs A locus pattern that shows phaeomelanin)
  if (hasKbr) {
    // A locus: dominant allele determines pattern
    const aDom = aAlleles[0]; // sorted dominant first
    if (aDom === "Ay" || aDom === "aw") {
      // Sable/agouti base — brindle shows
      if (eumelanin === "black") return "Black Brindle";
      if (eumelanin === "blue") return "Blue Brindle";
      if (eumelanin === "chocolate") return "Chocolate Brindle";
      return "Isabella Brindle";
    }
    if (aDom === "at") {
      // Tan point base — brindle on tan points only
      if (eumelanin === "black") return "Black Brindle Point";
      if (eumelanin === "blue") return "Blue Brindle Point";
      if (eumelanin === "chocolate") return "Chocolate Brindle Point";
      return "Isabella Brindle Point";
    }
    // aa — recessive black, no phaeomelanin for brindle
    if (eumelanin === "black") return "Solid Black";
    if (eumelanin === "blue") return "Solid Blue";
    if (eumelanin === "chocolate") return "Solid Chocolate";
    return "Solid Isabella";
  }

  // ky/ky — A locus pattern fully expressed
  const aDom = aAlleles[0];
  if (aDom === "Ay") {
    // Sable/Red
    if (eumelanin === "black") return "Fawn/Sable";
    if (eumelanin === "blue") return "Blue Fawn/Sable";
    if (eumelanin === "chocolate") return "Chocolate Fawn/Sable";
    return "Isabella Fawn/Sable";
  }
  if (aDom === "aw") {
    // Wild sable/agouti
    if (eumelanin === "black") return "Agouti/Wild Sable";
    if (eumelanin === "blue") return "Blue Agouti";
    if (eumelanin === "chocolate") return "Chocolate Agouti";
    return "Isabella Agouti";
  }
  if (aDom === "at") {
    // Tan points
    if (eumelanin === "black") return "Black & Tan";
    if (eumelanin === "blue") return "Blue & Tan";
    if (eumelanin === "chocolate") return "Chocolate & Tan";
    return "Isabella & Tan";
  }
  // aa — recessive black
  if (eumelanin === "black") return "Recessive Black";
  if (eumelanin === "blue") return "Recessive Blue";
  if (eumelanin === "chocolate") return "Recessive Chocolate";
  return "Recessive Isabella";
}

/* ─── Color swatch mapping ─── */
function getSwatchColor(phenotype: string): string {
  const p = phenotype.toLowerCase();
  if (p.includes("isabella") && p.includes("brindle")) return "linear-gradient(135deg, #c4a882, #a08060 30%, #c4a882 50%, #a08060 70%, #c4a882)";
  if (p.includes("isabella") && p.includes("red")) return "linear-gradient(135deg, #d4b896, #c4a882)";
  if (p.includes("isabella")) return "linear-gradient(135deg, #c4a882, #b09070)";
  if (p.includes("blue") && p.includes("brindle")) return "linear-gradient(135deg, #7a8a9e, #5a6a7e 30%, #8a9aae 50%, #5a6a7e 70%, #7a8a9e)";
  if (p.includes("blue") && p.includes("fawn")) return "linear-gradient(135deg, #b0c0d0, #8a9aae)";
  if (p.includes("blue") && p.includes("tan")) return "linear-gradient(135deg, #7a8a9e 60%, #c4a050 90%)";
  if (p.includes("blue")) return "linear-gradient(135deg, #7a8a9e, #5a6a7e)";
  if (p.includes("chocolate") && p.includes("brindle")) return "linear-gradient(135deg, #8B4513, #6B3410 30%, #9B5523 50%, #6B3410 70%, #8B4513)";
  if (p.includes("chocolate") && p.includes("tan")) return "linear-gradient(135deg, #8B4513 60%, #c4a050 90%)";
  if (p.includes("chocolate")) return "linear-gradient(135deg, #8B4513, #6B3410)";
  if (p.includes("red nose")) return "linear-gradient(135deg, #d4a050, #c49040, #b08030)";
  if (p.includes("red") || p.includes("fawn/sable") || p.includes("fawn")) return "linear-gradient(135deg, #c4953a, #a07828)";
  if (p.includes("black") && p.includes("brindle")) return "linear-gradient(135deg, #2a2a2a, #1a1a1a 30%, #3a3a3a 50%, #c4953a 55%, #2a2a2a 70%, #1a1a1a)";
  if (p.includes("black") && p.includes("tan")) return "linear-gradient(135deg, #1a1a1a 60%, #c4a050 90%)";
  if (p.includes("agouti") || p.includes("wild")) return "linear-gradient(135deg, #8a7a5a, #6a5a3a 40%, #a08a6a 60%, #6a5a3a)";
  if (p.includes("sable")) return "linear-gradient(135deg, #c4953a, #a07828, #8a6820)";
  if (p.includes("black")) return "linear-gradient(135deg, #1a1a1a, #0a0a0a)";
  return "linear-gradient(135deg, #888, #666)";
}

/* ─── Predict litter ─── */
function predictLitter(sire: Genotype, dam: Genotype): { phenotype: string; percentage: number }[] {
  const kProbs = punnett(sire.K, dam.K);
  const aProbs = punnett(sire.A, dam.A);
  const bProbs = punnett(sire.B, dam.B);
  const dProbs = punnett(sire.D, dam.D);
  const eProbs = punnett(sire.E, dam.E);

  const phenoCounts: Record<string, number> = {};

  for (const [kGeno, kP] of Object.entries(kProbs)) {
    for (const [aGeno, aP] of Object.entries(aProbs)) {
      for (const [bGeno, bP] of Object.entries(bProbs)) {
        for (const [dGeno, dP] of Object.entries(dProbs)) {
          for (const [eGeno, eP] of Object.entries(eProbs)) {
            const prob = kP * aP * bP * dP * eP;
            const pheno = determinePhenotype(kGeno, aGeno, bGeno, dGeno, eGeno);
            phenoCounts[pheno] = (phenoCounts[pheno] || 0) + prob;
          }
        }
      }
    }
  }

  return Object.entries(phenoCounts)
    .map(([phenotype, percentage]) => ({ phenotype, percentage: Math.round(percentage * 1000) / 10 }))
    .filter(x => x.percentage > 0)
    .sort((a, b) => b.percentage - a.percentage);
}

/* ─── Locus info tooltips ─── */
const LOCUS_INFO: Record<string, string> = {
  K: "Controls solid color vs pattern expression. KB = solid (dominant), kbr = brindle, ky = allows A locus pattern.",
  A: "Controls pattern type. Ay = sable/red, aw = wild sable/agouti, at = tan points, a = recessive black.",
  B: "Controls black vs chocolate pigment. B = black (dominant), b = chocolate/liver (recessive).",
  D: "Controls color intensity. D = full color (dominant), d = dilute/blue (recessive).",
  E: "Controls extension of eumelanin. E = normal (dominant), e = red/fawn — restricts all dark pigment.",
};

/* ─── Component ─── */
export default function PuppyPredictorPage() {
  const [sire, setSire] = useState<Genotype>({ ...DEFAULT_GENO });
  const [dam, setDam] = useState<Genotype>({ ...DEFAULT_GENO });
  const [results, setResults] = useState<{ phenotype: string; percentage: number }[] | null>(null);

  const loci: { key: keyof Genotype; label: string; options: string[] }[] = [
    { key: "K", label: "K Locus (Dominant Black / Brindle)", options: K_OPTIONS },
    { key: "A", label: "A Locus (Agouti / Pattern)", options: A_OPTIONS },
    { key: "B", label: "B Locus (Black / Chocolate)", options: B_OPTIONS },
    { key: "D", label: "D Locus (Dilute)", options: D_OPTIONS },
    { key: "E", label: "E Locus (Extension / Red)", options: E_OPTIONS },
  ];

  const handlePredict = () => {
    setResults(predictLitter(sire, dam));
  };

  const handleReset = () => {
    setSire({ ...DEFAULT_GENO });
    setDam({ ...DEFAULT_GENO });
    setResults(null);
  };

  const inputStyle = {
    background: "linear-gradient(135deg, rgba(30,64,120,0.15), rgba(20,40,80,0.1))",
    border: "1.5px solid rgba(96,165,250,0.25)",
    color: "#e2e8f0",
    fontFamily: "var(--font-table, Rajdhani, sans-serif)",
    fontSize: "0.85rem",
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-deep, #080c14)" }}>
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-8 space-y-8">

        {/* ─── Header ─── */}
        <div className="text-center space-y-2">
          <h1 style={{
            fontFamily: "var(--font-display, Oswald, sans-serif)",
            fontWeight: 700,
            fontSize: "2.5rem",
            background: "linear-gradient(135deg, #e8c86e, #d4a855, #b8860b)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: "0.03em",
          }}>
            PUPPY COLOR PREDICTOR
          </h1>
          <p style={{ color: "var(--text-muted, #64748b)", fontFamily: "var(--font-table, Rajdhani, sans-serif)", fontSize: "1rem" }}>
            Input sire and dam genotypes to predict possible litter coat colors
          </p>
        </div>

        {/* ─── Genotype Inputs ─── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Sire */}
          <div className="rounded-xl p-5 space-y-4" style={{
            background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)",
            border: "1.5px solid rgba(96,165,250,0.3)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          }}>
            <div className="flex items-center gap-2">
              <span className="text-lg">♂</span>
              <h2 style={{
                fontFamily: "var(--font-display, Oswald, sans-serif)",
                fontWeight: 700,
                fontSize: "1.3rem",
                color: "#60a5fa",
                letterSpacing: "0.02em",
              }}>SIRE GENOTYPE</h2>
            </div>
            {loci.map((l) => (
              <div key={`sire-${l.key}`} className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-semibold" style={{ color: "#94a3b8", fontFamily: "var(--font-table)" }}>{l.label}</label>
                  <span className="cursor-help text-[10px] w-3.5 h-3.5 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(96,165,250,0.15)", color: "#60a5fa", border: "1px solid rgba(96,165,250,0.3)" }}
                    title={LOCUS_INFO[l.key]}>?</span>
                </div>
                <select
                  value={sire[l.key]}
                  onChange={(e) => setSire({ ...sire, [l.key]: e.target.value })}
                  className="w-full rounded-lg px-3 py-2 outline-none cursor-pointer"
                  style={inputStyle}
                >
                  {l.options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>

          {/* Dam */}
          <div className="rounded-xl p-5 space-y-4" style={{
            background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)",
            border: "1.5px solid rgba(244,114,182,0.3)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          }}>
            <div className="flex items-center gap-2">
              <span className="text-lg">♀</span>
              <h2 style={{
                fontFamily: "var(--font-display, Oswald, sans-serif)",
                fontWeight: 700,
                fontSize: "1.3rem",
                color: "#f472b6",
                letterSpacing: "0.02em",
              }}>DAM GENOTYPE</h2>
            </div>
            {loci.map((l) => (
              <div key={`dam-${l.key}`} className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-semibold" style={{ color: "#94a3b8", fontFamily: "var(--font-table)" }}>{l.label}</label>
                  <span className="cursor-help text-[10px] w-3.5 h-3.5 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(244,114,182,0.15)", color: "#f472b6", border: "1px solid rgba(244,114,182,0.3)" }}
                    title={LOCUS_INFO[l.key]}>?</span>
                </div>
                <select
                  value={dam[l.key]}
                  onChange={(e) => setDam({ ...dam, [l.key]: e.target.value })}
                  className="w-full rounded-lg px-3 py-2 outline-none cursor-pointer"
                  style={inputStyle}
                >
                  {l.options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Buttons ─── */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={handlePredict}
            className="px-8 py-3 rounded-xl text-sm font-bold transition-all hover:scale-105 active:scale-95"
            style={{
              background: "linear-gradient(135deg, #e8c86e, #d4a855, #b8860b)",
              color: "#000",
              fontFamily: "var(--font-display, Oswald, sans-serif)",
              letterSpacing: "0.05em",
              fontSize: "1rem",
              boxShadow: "0 4px 20px rgba(212,168,85,0.3)",
            }}
          >
            PREDICT COLORS
          </button>
          <button
            onClick={handleReset}
            className="px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-105 active:scale-95"
            style={{
              background: "rgba(255,255,255,0.05)",
              color: "#94a3b8",
              border: "1px solid rgba(255,255,255,0.1)",
              fontFamily: "var(--font-table, Rajdhani, sans-serif)",
              fontSize: "0.9rem",
            }}
          >
            Reset
          </button>
        </div>

        {/* ─── Results ─── */}
        {results && (
          <div className="space-y-5">
            <div className="text-center">
              <h2 style={{
                fontFamily: "var(--font-display, Oswald, sans-serif)",
                fontWeight: 700,
                fontSize: "1.5rem",
                background: "linear-gradient(135deg, #e8c86e, #d4a855)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                letterSpacing: "0.03em",
              }}>
                PREDICTED LITTER COLORS
              </h2>
              <p className="text-xs mt-1" style={{ color: "#64748b", fontFamily: "var(--font-table)" }}>
                {results.length} possible phenotype{results.length !== 1 ? "s" : ""}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map((r, i) => (
                <div key={i} className="rounded-xl p-4 transition-all hover:scale-[1.02]" style={{
                  background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)",
                  border: "1.5px solid rgba(30,64,120,0.5)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
                }}>
                  {/* Color swatch */}
                  <div className="w-full h-20 rounded-lg mb-3 relative overflow-hidden" style={{
                    background: getSwatchColor(r.phenotype),
                    boxShadow: "inset 0 2px 4px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.2)",
                  }}>
                    {/* Brindle stripe overlay */}
                    {r.phenotype.toLowerCase().includes("brindle") && (
                      <div className="absolute inset-0" style={{
                        background: "repeating-linear-gradient(60deg, transparent, transparent 6px, rgba(0,0,0,0.25) 6px, rgba(0,0,0,0.25) 10px)",
                      }} />
                    )}
                    {/* Percentage badge */}
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-bold"
                      style={{
                        background: "rgba(0,0,0,0.6)",
                        color: "#e8c86e",
                        fontFamily: "var(--font-mono, JetBrains Mono, monospace)",
                        fontSize: "0.75rem",
                        backdropFilter: "blur(4px)",
                      }}>
                      {r.percentage}%
                    </div>
                  </div>

                  {/* Phenotype name */}
                  <h3 className="text-sm font-bold" style={{
                    color: "#e2e8f0",
                    fontFamily: "var(--font-display, Oswald, sans-serif)",
                    letterSpacing: "0.02em",
                  }}>
                    {r.phenotype}
                  </h3>

                  {/* Probability bar */}
                  <div className="mt-2 w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <div className="h-full rounded-full transition-all duration-500" style={{
                      width: `${r.percentage}%`,
                      background: "linear-gradient(90deg, #e8c86e, #d4a855)",
                    }} />
                  </div>
                </div>
              ))}
            </div>

            {/* ─── Genetics Legend ─── */}
            <div className="rounded-xl p-5 space-y-3" style={{
              background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)",
              border: "1px solid rgba(30,64,120,0.3)",
            }}>
              <h3 className="text-xs font-bold" style={{ color: "#64748b", fontFamily: "var(--font-table)", letterSpacing: "0.1em" }}>
                GENETICS REFERENCE
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-[11px]" style={{ color: "#94a3b8", fontFamily: "var(--font-table)" }}>
                {Object.entries(LOCUS_INFO).map(([key, info]) => (
                  <div key={key} className="space-y-1">
                    <span className="font-bold" style={{ color: "#e8c86e" }}>{key} Locus</span>
                    <p className="leading-tight">{info}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
