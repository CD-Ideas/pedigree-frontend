"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { getDogColor } from "@/app/utils/colors";

/* ═══════════════════════════════════════════════════
   TYPES & CONSTANTS
   ═══════════════════════════════════════════════════ */

interface Genotype { K: string; A: string; B: string; D: string; E: string; S: string; }
interface PredictionResult { phenotype: string; percentage: number; carriers: string[]; }
interface SimulatedPuppy { id: number; phenotype: string; sex: string; carriers: string[]; }
interface SearchDog { dog_id: number; registered_name: string; photo_url: string | null; sex: string; color: string | null; }
interface HistoryEntry { share_id: string; sire_name: string | null; dam_name: string | null; sire_dog_id: number | null; dam_dog_id: number | null; created_at: string; }

const DEFAULT_GENO: Genotype = { K: "ky/ky", A: "Ay/Ay", B: "BB", D: "DD", E: "EE", S: "S/S" };

const K_OPTIONS = ["KB/KB", "KB/kbr", "KB/ky", "kbr/kbr", "kbr/ky", "ky/ky"];
const A_OPTIONS = ["Ay/Ay", "Ay/aw", "Ay/at", "Ay/a", "aw/aw", "aw/at", "aw/a", "at/at", "at/a", "a/a"];
const B_OPTIONS = ["BB", "Bb", "bb"];
const D_OPTIONS = ["DD", "Dd", "dd"];
const E_OPTIONS = ["EE", "Ee", "ee"];
const S_OPTIONS = ["S/S", "S/sp", "sp/sp", "S/sw", "sp/sw", "sw/sw"];

const LOCUS_INFO: Record<string, string> = {
  K: "Controls solid color vs pattern. KB = solid (dominant), kbr = brindle, ky = allows A locus pattern.",
  A: "Controls pattern type. Ay = sable/red, aw = wild sable/agouti, at = tan points, a = recessive black.",
  B: "Controls black vs chocolate pigment. B = black (dominant), b = chocolate/liver (recessive).",
  D: "Controls color intensity. D = full color (dominant), d = dilute/blue (recessive).",
  E: "Controls extension of eumelanin. E = normal (dominant), e = red/fawn — restricts all dark pigment.",
  S: "Controls white markings. S = solid/no white (dominant), sp = piebald (white patches), sw = extreme white (mostly white).",
};

/* ─── Coat color → likely genotype mapping (for "I Don't Know" mode) ─── */
const COAT_PRESETS: Record<string, { label: string; geno: Genotype; swatch: string }> = {
  black: { label: "Black", geno: { K: "KB/KB", A: "Ay/Ay", B: "BB", D: "DD", E: "EE", S: "S/S" }, swatch: "#1a1a1a" },
  black_carrier: { label: "Black (likely carrier)", geno: { K: "KB/ky", A: "Ay/at", B: "Bb", D: "Dd", E: "Ee", S: "S/sp" }, swatch: "#2a2a2a" },
  black_white: { label: "Black & White", geno: { K: "KB/KB", A: "Ay/Ay", B: "BB", D: "DD", E: "EE", S: "sp/sp" }, swatch: "#1a1a1a" },
  blue: { label: "Blue", geno: { K: "KB/KB", A: "Ay/Ay", B: "BB", D: "dd", E: "EE", S: "S/S" }, swatch: "#7a8a9e" },
  blue_carrier: { label: "Blue (likely carrier)", geno: { K: "KB/ky", A: "Ay/at", B: "Bb", D: "dd", E: "Ee", S: "S/sp" }, swatch: "#6a7a8e" },
  blue_white: { label: "Blue & White", geno: { K: "KB/KB", A: "Ay/Ay", B: "BB", D: "dd", E: "EE", S: "sp/sp" }, swatch: "#7a8a9e" },
  chocolate: { label: "Chocolate/Liver", geno: { K: "KB/KB", A: "Ay/Ay", B: "bb", D: "DD", E: "EE", S: "S/S" }, swatch: "#8B4513" },
  isabella: { label: "Isabella/Lilac", geno: { K: "KB/KB", A: "Ay/Ay", B: "bb", D: "dd", E: "EE", S: "S/S" }, swatch: "#c4a882" },
  red_fawn: { label: "Red/Fawn", geno: { K: "ky/ky", A: "Ay/Ay", B: "BB", D: "DD", E: "ee", S: "S/S" }, swatch: "#c4953a" },
  red_white: { label: "Red & White", geno: { K: "ky/ky", A: "Ay/Ay", B: "BB", D: "DD", E: "ee", S: "sp/sp" }, swatch: "#c4953a" },
  red_nose: { label: "Red Nose Fawn", geno: { K: "ky/ky", A: "Ay/Ay", B: "bb", D: "DD", E: "ee", S: "S/S" }, swatch: "#d4a050" },
  blue_fawn: { label: "Blue Fawn", geno: { K: "ky/ky", A: "Ay/Ay", B: "BB", D: "dd", E: "ee", S: "S/S" }, swatch: "#b0c0d0" },
  black_brindle: { label: "Black Brindle", geno: { K: "kbr/ky", A: "Ay/Ay", B: "BB", D: "DD", E: "EE", S: "S/S" }, swatch: "#2a2a2a" },
  brindle_white: { label: "Brindle & White", geno: { K: "kbr/ky", A: "Ay/Ay", B: "BB", D: "DD", E: "EE", S: "sp/sp" }, swatch: "#2a2a2a" },
  blue_brindle: { label: "Blue Brindle", geno: { K: "kbr/ky", A: "Ay/Ay", B: "BB", D: "dd", E: "EE", S: "S/S" }, swatch: "#7a8a9e" },
  chocolate_brindle: { label: "Chocolate Brindle", geno: { K: "kbr/ky", A: "Ay/Ay", B: "bb", D: "DD", E: "EE", S: "S/S" }, swatch: "#8B4513" },
  fawn_sable: { label: "Fawn/Sable", geno: { K: "ky/ky", A: "Ay/Ay", B: "BB", D: "DD", E: "EE", S: "S/S" }, swatch: "#c4953a" },
  black_tan: { label: "Black & Tan", geno: { K: "ky/ky", A: "at/at", B: "BB", D: "DD", E: "EE", S: "S/S" }, swatch: "#1a1a1a" },
  blue_tan: { label: "Blue & Tan", geno: { K: "ky/ky", A: "at/at", B: "BB", D: "dd", E: "EE", S: "S/S" }, swatch: "#7a8a9e" },
  buckskin: { label: "Buckskin", geno: { K: "ky/ky", A: "Ay/Ay", B: "BB", D: "DD", E: "Ee", S: "S/S" }, swatch: "#d4b078" },
  tri_black: { label: "Tri-Color (Black)", geno: { K: "ky/ky", A: "at/at", B: "BB", D: "DD", E: "EE", S: "sp/sp" }, swatch: "#1a1a1a" },
  tri_blue: { label: "Tri-Color (Blue)", geno: { K: "ky/ky", A: "at/at", B: "BB", D: "dd", E: "EE", S: "sp/sp" }, swatch: "#7a8a9e" },
  tri_choc: { label: "Tri-Color (Chocolate)", geno: { K: "ky/ky", A: "at/at", B: "bb", D: "DD", E: "EE", S: "sp/sp" }, swatch: "#8B4513" },
  seal: { label: "Seal", geno: { K: "KB/ky", A: "Ay/Ay", B: "BB", D: "DD", E: "EE", S: "S/S" }, swatch: "#2a1a0a" },
  white: { label: "Mostly White", geno: { K: "ky/ky", A: "Ay/Ay", B: "BB", D: "DD", E: "EE", S: "sw/sw" }, swatch: "#f0f0f0" },
};

/* ─── DB color field → preset mapping ─── */
function mapDbColorToPreset(color: string | null): string | null {
  if (!color) return null;
  const c = color.toUpperCase().trim();
  const hasWhite = /\bWHT\b|WHITE|&\s*W\b|\/W\b|W\//.test(c);
  if (/\bBLK\b|BLACK/.test(c) && /BRINDLE|BRNDL/.test(c)) return hasWhite ? "brindle_white" : "black_brindle";
  if (/\bBLU\b|BLUE/.test(c) && /BRINDLE|BRNDL/.test(c)) return hasWhite ? "brindle_white" : "blue_brindle";
  if (/CHOC/.test(c) && /BRINDLE|BRNDL/.test(c)) return hasWhite ? "brindle_white" : "chocolate_brindle";
  if (/BRINDLE|BRNDL/.test(c)) return hasWhite ? "brindle_white" : "black_brindle";
  if (/\bBLK\b|BLACK/.test(c) && /TAN/.test(c)) return "black_tan";
  if (/\bBLU\b|BLUE/.test(c) && /TAN/.test(c)) return "blue_tan";
  if (/RED\s*NOSE|REDNOSE/.test(c)) return "red_nose";
  if (/\bRED\b/.test(c)) return hasWhite ? "red_white" : "red_fawn";
  if (/FAWN/.test(c) && /\bBLU\b|BLUE/.test(c)) return "blue_fawn";
  if (/FAWN|BKSKN|BUCKSKIN/.test(c)) return "buckskin";
  if (/ISABELLA|LILAC/.test(c)) return "isabella";
  if (/CHOC|LIVER/.test(c)) return "chocolate";
  if (/\bBLU\b|BLUE/.test(c)) return hasWhite ? "blue_white" : "blue";
  if (/\bBLK\b|BLACK/.test(c)) return hasWhite ? "black_white" : "black";
  if (/SABLE/.test(c)) return "fawn_sable";
  if (/\bWHT\b|WHITE/.test(c)) return "white";
  return null;
}

/* ═══════════════════════════════════════════════════
   GENETICS ENGINE
   ═══════════════════════════════════════════════════ */

function alleleRank(a: string): number {
  const order: Record<string, number> = { KB: 0, kbr: 1, ky: 2, Ay: 0, aw: 1, at: 2, a: 3, B: 0, b: 1, D: 0, d: 1, E: 0, e: 1, S: 0, sp: 1, sw: 2 };
  return order[a] ?? 99;
}

function punnett(p1: string, p2: string): Record<string, number> {
  const a1 = p1.split("/");
  const a2 = p2.split("/");
  const counts: Record<string, number> = {};
  for (const x of a1) for (const y of a2) {
    const combo = [x, y].sort((a, b) => alleleRank(a) - alleleRank(b)).join("/");
    counts[combo] = (counts[combo] || 0) + 1;
  }
  const total = a1.length * a2.length;
  const probs: Record<string, number> = {};
  for (const [k, v] of Object.entries(counts)) probs[k] = v / total;
  return probs;
}

function getCarriers(k: string, a: string, b: string, d: string, e: string, s: string): string[] {
  const carriers: string[] = [];
  const kA = k.split("/"), bA = b.split("/"), dA = d.split("/"), eA = e.split("/"), aA = a.split("/"), sA = s.split("/");
  // Brindle carrier
  if (kA.includes("KB") && kA.includes("kbr")) carriers.push("Carries Brindle (kbr)");
  if (kA.includes("KB") && kA.includes("ky")) carriers.push("Carries Pattern (ky)");
  // Chocolate carrier
  if (bA[0] === "B" && bA[1] === "b") carriers.push("Carries Chocolate (Bb)");
  // Dilute carrier
  if (dA[0] === "D" && dA[1] === "d") carriers.push("Carries Dilute (Dd)");
  // Red carrier
  if (eA[0] === "E" && eA[1] === "e") carriers.push("Carries Red/Fawn (Ee)");
  // Tan point carrier
  if ((aA[0] === "Ay" || aA[0] === "aw") && aA[1] === "at") carriers.push("Carries Tan Points (at)");
  // Recessive black carrier
  if (aA[1] === "a" && aA[0] !== "a") carriers.push("Carries Recessive Black (a)");
  // White/piebald carrier
  if (sA[0] === "S" && (sA[1] === "sp" || sA[1] === "sw")) carriers.push("Carries White Markings (S/sp)");
  return carriers;
}

function determinePhenotype(k: string, a: string, b: string, d: string, e: string, s: string): string {
  const kA = k.split("/"), aA = a.split("/"), bA = b.split("/"), dA = d.split("/"), eA = e.split("/"), sA = s.split("/");
  const isEe = eA.every(x => x === "e");
  const isBb = bA.every(x => x === "b");
  const isDd = dA.every(x => x === "d");

  // White marking level
  const isExtWhite = sA.every(x => x === "sw"); // sw/sw = extreme white
  const isPiebald = !isExtWhite && (sA.every(x => x === "sp" || x === "sw")); // sp/sp or sp/sw
  const whiteSuffix = isExtWhite ? " (Mostly White)" : isPiebald ? " & White" : "";

  let eumelanin = "Black";
  if (isBb && isDd) eumelanin = "Isabella";
  else if (isBb) eumelanin = "Chocolate";
  else if (isDd) eumelanin = "Blue";

  if (isEe) {
    let base: string;
    if (isBb) base = isDd ? "Isabella Red (Dilute Red Nose)" : "Red Nose Fawn";
    else base = isDd ? "Blue Fawn" : "Red/Fawn";
    return base + whiteSuffix;
  }

  const hasKB = kA.includes("KB");
  const hasKbr = kA.includes("kbr");

  // Tri-color: tan points + white = tri-color
  const isTri = isPiebald || isExtWhite;

  if (hasKB) return `Solid ${eumelanin}${whiteSuffix}`;

  if (hasKbr) {
    const aDom = aA[0];
    if (aDom === "Ay" || aDom === "aw") return `${eumelanin} Brindle${whiteSuffix}`;
    if (aDom === "at") {
      if (isTri) return `Tri-Color ${eumelanin} Brindle Point`;
      return `${eumelanin} Brindle Point${whiteSuffix}`;
    }
    return `Solid ${eumelanin}${whiteSuffix}`;
  }

  const aDom = aA[0];
  if (aDom === "Ay") {
    const base = eumelanin === "Black" ? "Fawn/Sable" : `${eumelanin} Fawn/Sable`;
    return base + whiteSuffix;
  }
  if (aDom === "aw") {
    const base = eumelanin === "Black" ? "Agouti/Wild Sable" : `${eumelanin} Agouti`;
    return base + whiteSuffix;
  }
  if (aDom === "at") {
    if (isTri) return `Tri-Color (${eumelanin})`;
    return `${eumelanin} & Tan${whiteSuffix}`;
  }
  return `Recessive ${eumelanin}${whiteSuffix}`;
}

function getNoseEyeInfo(phenotype: string): { nose: string; noseColor: string; eyes: string } {
  const p = phenotype.toLowerCase();
  if (p.includes("isabella") || (p.includes("red nose") && p.includes("dilute"))) {
    return { nose: "Isabella/Pink Nose", noseColor: "#c4a882", eyes: "Light Amber/Green" };
  }
  if (p.includes("chocolate") || p.includes("red nose") || p.includes("liver")) {
    return { nose: "Red/Liver Nose", noseColor: "#8B4513", eyes: "Amber/Hazel" };
  }
  if (p.includes("blue")) {
    return { nose: "Blue/Gray Nose", noseColor: "#7a8a9e", eyes: "Gray/Amber" };
  }
  if (p.includes("red/fawn") || p.includes("fawn/sable") || p.includes("buckskin")) {
    return { nose: "Black Nose", noseColor: "#1a1a1a", eyes: "Dark Brown" };
  }
  return { nose: "Black Nose", noseColor: "#1a1a1a", eyes: "Dark Brown" };
}

function predictLitter(sire: Genotype, dam: Genotype): PredictionResult[] {
  const kP = punnett(sire.K, dam.K), aP = punnett(sire.A, dam.A);
  const bP = punnett(sire.B, dam.B), dP = punnett(sire.D, dam.D), eP = punnett(sire.E, dam.E);
  const sP = punnett(sire.S, dam.S);

  const phenoMap: Record<string, { pct: number; carrierSets: Record<string, number> }> = {};

  for (const [kG, kPr] of Object.entries(kP))
    for (const [aG, aPr] of Object.entries(aP))
      for (const [bG, bPr] of Object.entries(bP))
        for (const [dG, dPr] of Object.entries(dP))
          for (const [eG, ePr] of Object.entries(eP))
            for (const [sG, sPr] of Object.entries(sP)) {
              const prob = kPr * aPr * bPr * dPr * ePr * sPr;
              const pheno = determinePhenotype(kG, aG, bG, dG, eG, sG);
              const carriers = getCarriers(kG, aG, bG, dG, eG, sG);
              if (!phenoMap[pheno]) phenoMap[pheno] = { pct: 0, carrierSets: {} };
              phenoMap[pheno].pct += prob;
              for (const c of carriers) {
                phenoMap[pheno].carrierSets[c] = (phenoMap[pheno].carrierSets[c] || 0) + prob;
              }
            }

  return Object.entries(phenoMap)
    .map(([phenotype, { pct, carrierSets }]) => {
      // Only show carrier if >30% of that phenotype's puppies carry it
      const carriers = Object.entries(carrierSets)
        .filter(([, cp]) => cp / pct > 0.3)
        .map(([name, cp]) => `${name} (${Math.round(cp / pct * 100)}%)`);
      return { phenotype, percentage: Math.round(pct * 1000) / 10, carriers };
    })
    .filter(x => x.percentage > 0)
    .sort((a, b) => b.percentage - a.percentage);
}

function simulateLitter(results: PredictionResult[], count: number): SimulatedPuppy[] {
  const puppies: SimulatedPuppy[] = [];
  const names = ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot", "Golf", "Hotel"];
  for (let i = 0; i < count; i++) {
    let rand = Math.random() * 100;
    let chosen = results[results.length - 1];
    for (const r of results) {
      rand -= r.percentage;
      if (rand <= 0) { chosen = r; break; }
    }
    puppies.push({
      id: i + 1,
      phenotype: chosen.phenotype,
      sex: Math.random() > 0.5 ? "Male" : "Female",
      carriers: chosen.carriers,
    });
  }
  return puppies.map((p, i) => ({ ...p, id: i + 1 }));
}

/* ═══════════════════════════════════════════════════
   COLOR SWATCH HELPERS
   ═══════════════════════════════════════════════════ */

function getSwatchGradient(phenotype: string): string {
  const p = phenotype.toLowerCase();
  const hasWhite = p.includes("& white") || p.includes("mostly white");
  // Strip white suffix for base color matching
  const base = p.replace(/\s*&\s*white/g, "").replace(/\s*\(mostly white\)/g, "").trim();

  let gradient: string;
  if (base.includes("isabella") && base.includes("brindle")) gradient = "linear-gradient(135deg, #c4a882, #a08060 30%, #c4a882 50%, #a08060 70%, #c4a882)";
  else if (base.includes("isabella") && base.includes("red")) gradient = "linear-gradient(135deg, #d4b896, #c4a882)";
  else if (base.includes("isabella") && base.includes("tan")) gradient = "linear-gradient(135deg, #c4a882 60%, #c4a050 90%)";
  else if (base.includes("isabella")) gradient = "linear-gradient(135deg, #c4a882, #b09070)";
  else if (base.includes("blue") && base.includes("brindle")) gradient = "linear-gradient(135deg, #7a8a9e, #5a6a7e 30%, #8a9aae 50%, #5a6a7e 70%, #7a8a9e)";
  else if (base.includes("blue") && base.includes("fawn")) gradient = "linear-gradient(135deg, #b0c0d0, #8a9aae)";
  else if (base.includes("blue") && base.includes("tan")) gradient = "linear-gradient(135deg, #7a8a9e 60%, #c4a050 90%)";
  else if (base.includes("blue") && base.includes("agouti")) gradient = "linear-gradient(135deg, #8a9aae, #6a7a8e 40%, #9aaabe 60%, #6a7a8e)";
  else if (base.includes("blue")) gradient = "linear-gradient(135deg, #7a8a9e, #5a6a7e)";
  else if (base.includes("chocolate") && base.includes("brindle")) gradient = "linear-gradient(135deg, #8B4513, #6B3410 30%, #9B5523 50%, #6B3410 70%, #8B4513)";
  else if (base.includes("chocolate") && base.includes("tan")) gradient = "linear-gradient(135deg, #8B4513 60%, #c4a050 90%)";
  else if (base.includes("chocolate")) gradient = "linear-gradient(135deg, #8B4513, #6B3410)";
  else if (base.includes("red nose")) gradient = "linear-gradient(135deg, #d4a050, #c49040, #b08030)";
  else if (base.includes("red") || (base.includes("fawn") && !base.includes("blue"))) gradient = "linear-gradient(135deg, #c4953a, #a07828)";
  else if (base.includes("brindle") && base.includes("black")) gradient = "linear-gradient(135deg, #2a2a2a, #1a1a1a 30%, #3a3a3a 50%, #c4953a 55%, #2a2a2a 70%)";
  else if (base.includes("brindle")) gradient = "linear-gradient(135deg, #3a3a3a, #1a1a1a 30%, #4a4a4a 50%, #c4953a 55%, #2a2a2a 70%)";
  else if (base.includes("agouti") || base.includes("wild")) gradient = "linear-gradient(135deg, #8a7a5a, #6a5a3a 40%, #a08a6a 60%, #6a5a3a)";
  else if (base.includes("sable")) gradient = "linear-gradient(135deg, #c4953a, #a07828, #8a6820)";
  else if (base.includes("tan") && base.includes("black")) gradient = "linear-gradient(135deg, #1a1a1a 60%, #c4a050 90%)";
  else if (base.includes("tri-color") && base.includes("blue")) gradient = "linear-gradient(135deg, #7a8a9e 35%, #c4a050 50%, #f0f0f0 75%)";
  else if (base.includes("tri-color") && base.includes("chocolate")) gradient = "linear-gradient(135deg, #8B4513 35%, #c4a050 50%, #f0f0f0 75%)";
  else if (base.includes("tri-color")) gradient = "linear-gradient(135deg, #1a1a1a 35%, #c4a050 50%, #f0f0f0 75%)";
  else if (base.includes("seal")) gradient = "linear-gradient(135deg, #1a1a1a, #2a1a0a 40%, #3a2a1a 60%, #1a1a1a)";
  else if (base.includes("black")) gradient = "linear-gradient(135deg, #1a1a1a, #0a0a0a)";
  else gradient = "linear-gradient(135deg, #888, #666)";

  // Add white patches to gradient for piebald/extreme white
  if (p.includes("mostly white")) return `linear-gradient(135deg, #f5f5f5 0%, #f0f0f0 40%, ${getSwatchSolid(phenotype)} 60%, #f5f5f5 90%)`;
  if (hasWhite) return gradient.replace("135deg", "135deg, #f5f5f5 0%, #f0f0f0 15%") + "";
  return gradient;
}

function getSwatchSolid(phenotype: string): string {
  const p = phenotype.toLowerCase();
  if (p.includes("mostly white")) return "#f0f0f0";
  if (p.includes("isabella")) return "#c4a882";
  if (p.includes("blue")) return "#7a8a9e";
  if (p.includes("chocolate")) return "#8B4513";
  if (p.includes("red nose")) return "#d4a050";
  if (p.includes("red") || p.includes("fawn")) return "#c4953a";
  if (p.includes("sable") || p.includes("agouti")) return "#a08a6a";
  if (p.includes("seal")) return "#2a1a0a";
  return "#1a1a1a";
}

/* ═══════════════════════════════════════════════════
   DOG SILHOUETTE SVG
   ═══════════════════════════════════════════════════ */

function DogSilhouette({ phenotype, size = 80 }: { phenotype: string; size?: number }) {
  const p = phenotype.toLowerCase();
  const isBrindle = p.includes("brindle");
  const isTanPoint = p.includes("tan") || p.includes("brindle point");
  const hasWhite = p.includes("& white") || p.includes("mostly white");
  const isMostlyWhite = p.includes("mostly white");
  const baseColor = getSwatchSolid(phenotype);
  const id = `dog-${phenotype.replace(/[^a-zA-Z]/g, "")}-${Math.random().toString(36).slice(2, 6)}`;

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {isBrindle && (
          <pattern id={`brindle-${id}`} patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(30)">
            <rect width="8" height="8" fill={baseColor} />
            <rect width="3" height="8" fill={p.includes("fawn") || p.includes("red") ? "#c4953a" : "rgba(180,140,60,0.7)"} />
          </pattern>
        )}
        {isTanPoint && (
          <linearGradient id={`tan-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="60%" stopColor={baseColor} />
            <stop offset="85%" stopColor="#c4a050" />
          </linearGradient>
        )}
        <clipPath id={`body-${id}`}>
          <path d="M25 30 C20 28, 15 22, 12 18 C10 15, 8 16, 10 20 C12 24, 14 28, 18 32
                   L18 35 C12 38, 8 45, 8 52 C8 58, 10 62, 12 65 L12 82 C12 86, 16 86, 16 82 L16 72
                   C18 74, 22 76, 28 76 L28 82 C28 86, 32 86, 32 82 L32 76
                   C36 76, 40 75, 44 73 L50 73 C54 75, 58 76, 62 76 L62 82 C62 86, 66 86, 66 82 L66 76
                   C72 76, 76 74, 78 72 L78 82 C78 86, 82 86, 82 82 L82 65
                   C84 62, 86 58, 86 52 C86 45, 82 38, 76 35 L76 32
                   C80 28, 82 24, 84 20 C86 16, 84 15, 82 18 C79 22, 74 28, 69 30
                   C64 28, 56 26, 47 26 C38 26, 30 28, 25 30 Z" />
        </clipPath>
      </defs>
      {/* Dog body silhouette */}
      <path d="M25 30 C20 28, 15 22, 12 18 C10 15, 8 16, 10 20 C12 24, 14 28, 18 32
               L18 35 C12 38, 8 45, 8 52 C8 58, 10 62, 12 65 L12 82 C12 86, 16 86, 16 82 L16 72
               C18 74, 22 76, 28 76 L28 82 C28 86, 32 86, 32 82 L32 76
               C36 76, 40 75, 44 73 L50 73 C54 75, 58 76, 62 76 L62 82 C62 86, 66 86, 66 82 L66 76
               C72 76, 76 74, 78 72 L78 82 C78 86, 82 86, 82 82 L82 65
               C84 62, 86 58, 86 52 C86 45, 82 38, 76 35 L76 32
               C80 28, 82 24, 84 20 C86 16, 84 15, 82 18 C79 22, 74 28, 69 30
               C64 28, 56 26, 47 26 C38 26, 30 28, 25 30 Z"
            fill={isMostlyWhite ? "#f0f0f0" : isBrindle ? `url(#brindle-${id})` : isTanPoint ? `url(#tan-${id})` : baseColor}
            stroke="#C9B29F" strokeWidth="0.5" />
      {/* White patches for piebald */}
      {hasWhite && !isMostlyWhite && (
        <g clipPath={`url(#body-${id})`}>
          {/* White chest/belly */}
          <ellipse cx="47" cy="68" rx="18" ry="14" fill="#f0f0f0" />
          {/* White blaze on face */}
          <ellipse cx="18" cy="26" rx="5" ry="8" fill="#f0f0f0" />
          {/* White paws */}
          <rect x="10" y="76" width="8" height="10" rx="3" fill="#f0f0f0" />
          <rect x="26" y="76" width="8" height="10" rx="3" fill="#f0f0f0" />
          <rect x="60" y="76" width="8" height="10" rx="3" fill="#f0f0f0" />
          <rect x="76" y="76" width="8" height="10" rx="3" fill="#f0f0f0" />
        </g>
      )}
      {/* Color patches on mostly white */}
      {isMostlyWhite && (
        <g clipPath={`url(#body-${id})`}>
          <ellipse cx="20" cy="28" rx="12" ry="10" fill={baseColor} />
          <ellipse cx="72" cy="55" rx="14" ry="12" fill={baseColor} />
        </g>
      )}
      {/* Eye */}
      <circle cx="22" cy="28" r="2" fill="white" opacity="0.8" />
      <circle cx="22" cy="28" r="1" fill="#333" />
      {/* Ear highlight */}
      <path d="M12 18 C14 20, 16 24, 18 28" stroke="rgba(0,0,0,0.1)" strokeWidth="1" fill="none" />
      {/* Nose */}
      <circle cx="10" cy="20" r="1.5" fill={p.includes("red nose") || p.includes("chocolate") || p.includes("isabella") ? "#8B4513" : "#1a1a1a"} />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════
   SEARCH COMPONENT (for feature #2)
   ═══════════════════════════════════════════════════ */

function DogSearch({ label, onSelect }: { label: string; onSelect: (dog: SearchDog) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchDog[]>([]);
  const [show, setShow] = useState(false);
  const timer = useRef<NodeJS.Timeout | null>(null);

  const doSearch = (val: string) => {
    setQ(val);
    if (timer.current) clearTimeout(timer.current);
    if (val.length < 2) { setResults([]); setShow(false); return; }
    timer.current = setTimeout(() => {
      fetch(`/api/dogs/search?q=${encodeURIComponent(val)}&limit=6`)
        .then(r => r.json())
        .then(d => { setResults(d.dogs || []); setShow(true); })
        .catch(() => {});
    }, 300);
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{
        background: "#FAFAFA",
        border: "2px solid #C9B29F",
      }}>
        <span className="text-xs">🔍</span>
        <input type="text" value={q} onChange={e => doSearch(e.target.value)}
          onFocus={() => results.length > 0 && setShow(true)}
          onBlur={() => setTimeout(() => setShow(false), 200)}
          placeholder={`Search ${label} from database...`}
          className="flex-1 bg-transparent text-xs outline-none"
          style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }} />
        {q && <button onClick={() => { setQ(""); setResults([]); setShow(false); }} className="text-[10px] text-[#6B7280] hover:text-[#1C1C1C]">✕</button>}
      </div>
      {show && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 rounded-lg overflow-hidden z-50 max-h-48 overflow-y-auto"
          style={{ background: "#FAF7F2", border: "2px solid #C9B29F" }}>
          {results.map(d => (
            <button key={d.dog_id} onClick={() => { onSelect(d); setQ(d.registered_name); setShow(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[#F0EBE3] text-xs transition-colors"
              style={{ borderBottom: "1px solid #C9B29F" }}>
              {d.photo_url ? (
                <img src={d.photo_url.startsWith("http") ? d.photo_url : `https://www.apbt.online-pedigrees.com/${d.photo_url}`}
                  alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px]"
                  style={{ background: "#FAFAFA", border: "2px solid #C9B29F" }}>🐕</div>
              )}
              <span className="truncate font-semibold" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>{d.registered_name}</span>
              {d.color && <span className="ml-auto text-[10px]" style={{ color: "#6B7280" }}>{d.color}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════════════ */

export default function PuppyPredictorPage() {
  const [mode, setMode] = useState<"simple" | "advanced">("simple");
  const [sire, setSire] = useState<Genotype>({ ...DEFAULT_GENO });
  const [dam, setDam] = useState<Genotype>({ ...DEFAULT_GENO });
  const [sirePreset, setSirePreset] = useState("");
  const [damPreset, setDamPreset] = useState("");
  const [sireName, setSireName] = useState("");
  const [damName, setDamName] = useState("");
  const [sireDogId, setSireDogId] = useState<number | null>(null);
  const [damDogId, setDamDogId] = useState<number | null>(null);
  const [results, setResults] = useState<PredictionResult[] | null>(null);
  const [litter, setLitter] = useState<SimulatedPuppy[] | null>(null);
  const [litterSize, setLitterSize] = useState(6);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"results" | "simulate" | "compare">("results");

  // Load history on mount
  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "null");
      if (u?.id) {
        fetch(`/api/color-predictions?userId=${u.id}`)
          .then(r => r.json())
          .then(d => { if (d.history) setHistory(d.history); })
          .catch(() => {});
      }
    } catch (_e) {}
  }, []);

  const handlePredict = () => {
    const r = predictLitter(sire, dam);
    setResults(r);
    setLitter(null);
    setShareUrl("");
    setTab("results");
  };

  const handleReset = () => {
    setSire({ ...DEFAULT_GENO });
    setDam({ ...DEFAULT_GENO });
    setSirePreset("");
    setDamPreset("");
    setSireName("");
    setDamName("");
    setSireDogId(null);
    setDamDogId(null);
    setResults(null);
    setLitter(null);
    setShareUrl("");
  };

  const handleSimulate = () => {
    if (!results) return;
    setLitter(simulateLitter(results, litterSize));
    setTab("simulate");
  };

  const handleSave = async () => {
    if (!results) return;
    setSaving(true);
    try {
      const u = JSON.parse(localStorage.getItem("user") || "null");
      const res = await fetch("/api/color-predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: u?.id || null,
          sireName: sireName || null,
          damName: damName || null,
          sireDogId: sireDogId || null,
          damDogId: damDogId || null,
          sireGenotype: sire,
          damGenotype: dam,
          resultsJson: results,
          litterSimulation: litter || null,
        }),
      });
      const data = await res.json();
      if (data.shareId) {
        setShareUrl(`${window.location.origin}/puppy-predictor/result/${data.shareId}`);
        // Refresh history
        if (u?.id) {
          fetch(`/api/color-predictions?userId=${u.id}`)
            .then(r => r.json())
            .then(d => { if (d.history) setHistory(d.history); })
            .catch(() => {});
        }
      }
    } catch (_e) {}
    setSaving(false);
  };

  const handleSelectSirePreset = (key: string) => {
    setSirePreset(key);
    if (COAT_PRESETS[key]) setSire({ ...COAT_PRESETS[key].geno });
  };

  const handleSelectDamPreset = (key: string) => {
    setDamPreset(key);
    if (COAT_PRESETS[key]) setDam({ ...COAT_PRESETS[key].geno });
  };

  const handleSireDbSelect = (dog: SearchDog) => {
    setSireName(dog.registered_name);
    setSireDogId(dog.dog_id);
    const preset = mapDbColorToPreset(dog.color);
    if (preset && COAT_PRESETS[preset]) {
      setSirePreset(preset);
      setSire({ ...COAT_PRESETS[preset].geno });
    }
  };

  const handleDamDbSelect = (dog: SearchDog) => {
    setDamName(dog.registered_name);
    setDamDogId(dog.dog_id);
    const preset = mapDbColorToPreset(dog.color);
    if (preset && COAT_PRESETS[preset]) {
      setDamPreset(preset);
      setDam({ ...COAT_PRESETS[preset].geno });
    }
  };

  const loci: { key: keyof Genotype; label: string; options: string[] }[] = [
    { key: "K", label: "K Locus (Dominant Black / Brindle)", options: K_OPTIONS },
    { key: "A", label: "A Locus (Agouti / Pattern)", options: A_OPTIONS },
    { key: "B", label: "B Locus (Black / Chocolate)", options: B_OPTIONS },
    { key: "D", label: "D Locus (Dilute)", options: D_OPTIONS },
    { key: "E", label: "E Locus (Extension / Red)", options: E_OPTIONS },
    { key: "S", label: "S Locus (White / Piebald)", options: S_OPTIONS },
  ];

  const inputStyle = {
    background: "#FAFAFA",
    border: "2px solid #C9B29F",
    color: "#1C1C1C",
    fontFamily: "var(--font-table)",
    fontSize: "0.85rem",
    borderRadius: "10px",
  };

  return (
    <div className="min-h-screen" style={{ background: "#EDE4D5" }}>
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-8 space-y-6">

        {/* --- Header --- */}
        <div className="text-center space-y-2">
          <h1 style={{
            fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "2.5rem",
            color: "#1C1C1C", letterSpacing: "0.03em",
          }}>
            PUPPY COLOR PREDICTOR
          </h1>
          <p style={{ color: "#6B7280", fontFamily: "var(--font-table)", fontSize: "0.95rem" }}>
            Predict possible coat colors for your litter based on genetics
          </p>
        </div>

        {/* --- Mode Toggle + History --- */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex rounded-lg overflow-hidden" style={{ border: "2px solid #C9B29F" }}>
            <button onClick={() => setMode("simple")}
              className="px-4 py-2 text-xs font-semibold transition-colors"
              style={{
                background: mode === "simple" ? "#C9B29F" : "#FAFAFA",
                color: mode === "simple" ? "#1C1C1C" : "#1C1C1C",
                fontFamily: "var(--font-table)",
              }}>
              I Don&apos;t Know Genotype
            </button>
            <button onClick={() => setMode("advanced")}
              className="px-4 py-2 text-xs font-semibold transition-colors"
              style={{
                background: mode === "advanced" ? "#C9B29F" : "#FAFAFA",
                color: mode === "advanced" ? "#1C1C1C" : "#1C1C1C",
                fontFamily: "var(--font-table)",
              }}>
              Advanced (DNA Tested)
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowGuide(!showGuide)}
              className="px-3 py-2 rounded-lg text-xs font-semibold transition-colors hover:bg-[#F0EBE3]"
              style={{ color: "#1C1C1C", border: "2px solid #C9B29F", fontFamily: "var(--font-table)" }}>
              DNA Test Guide
            </button>
              <button onClick={() => setShowHistory(!showHistory)}
                className="px-3 py-2 rounded-lg text-xs font-semibold transition-colors hover:bg-[#F0EBE3]"
                style={{ color: "#1C1C1C", border: "2px solid #C9B29F", fontFamily: "var(--font-table)" }}>
                History{history.length > 0 ? ` (${history.length})` : ""}
              </button>
          </div>
        </div>

        {/* --- DNA Test Guide (#5) --- */}
        {showGuide && (
          <div className="rounded-lg p-5 space-y-3" style={{
            background: "#FAF7F2",
            border: "2px solid #C9B29F",
          }}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold" style={{ color: "#1C1C1C", fontFamily: "var(--font-display)", letterSpacing: "0.05em" }}>
                DNA COLOR TEST GUIDE
              </h3>
              <button onClick={() => setShowGuide(false)} className="text-xs text-[#6B7280] hover:text-[#1C1C1C]">✕</button>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "#6B7280", fontFamily: "var(--font-table)" }}>
              To get accurate predictions, you need your dog&apos;s coat color genotype from a DNA test. Here are the most popular services:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { name: "Embark", desc: "Most comprehensive APBT panel. Tests all 5 loci plus health markers.", price: "$129-$199" },
                { name: "Wisdom Panel", desc: "Good color panel with breed identification. Tests K, A, B, D, E loci.", price: "$99-$159" },
                { name: "UC Davis VGL", desc: "Gold standard for individual locus testing. Pick specific loci to test.", price: "$25-$50/locus" },
              ].map(s => (
                <div key={s.name} className="rounded-lg p-3 space-y-1" style={{ background: "#FAFAFA", border: "2px solid #C9B29F" }}>
                  <h4 className="text-xs font-bold" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>{s.name}</h4>
                  <p className="text-[11px] leading-tight" style={{ color: "#6B7280" }}>{s.desc}</p>
                  <p className="text-[10px] font-bold" style={{ color: "#1C1C1C" }}>{s.price}</p>
                </div>
              ))}
            </div>
            <p className="text-[11px]" style={{ color: "#6B7280", fontFamily: "var(--font-table)" }}>
              Don&apos;t have DNA results? Use the &quot;I Don&apos;t Know Genotype&quot; mode — select your dog&apos;s visible coat color and we&apos;ll estimate the most likely genotype.
            </p>
          </div>
        )}

        {/* --- History (#8) --- */}
        {showHistory && (
          <div className="rounded-lg p-4 space-y-2" style={{
            background: "#FAF7F2",
            border: "2px solid #C9B29F",
          }}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold" style={{ color: "#1C1C1C", fontFamily: "var(--font-display)", letterSpacing: "0.05em" }}>
                PREDICTION HISTORY
              </h3>
              <div className="flex items-center gap-2">
                {history.length > 0 && !confirmClear && (
                  <button onClick={() => setConfirmClear(true)}
                    className="text-[10px] px-2 py-0.5 rounded-lg transition-all"
                    style={{ background: "#FAFAFA", color: "#ef4444", border: "2px solid #ef4444", fontFamily: "var(--font-table)" }}>
                    Clear All
                  </button>
                )}
                {confirmClear && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px]" style={{ color: "#ef4444", fontFamily: "var(--font-table)" }}>Are you sure?</span>
                    <button onClick={async () => {
                      try {
                        const u = JSON.parse(localStorage.getItem("user") || "null");
                        if (!u?.id) return;
                        await fetch(`/api/color-predictions?userId=${u.id}`, { method: "DELETE" });
                        setHistory([]);
                        setConfirmClear(false);
                      } catch (_e) {}
                    }}
                      className="text-[10px] px-2 py-0.5 rounded-lg transition-all"
                      style={{ background: "#FAFAFA", color: "#ef4444", border: "2px solid #ef4444", fontFamily: "var(--font-table)", fontWeight: 700 }}>
                      Yes, Clear
                    </button>
                    <button onClick={() => setConfirmClear(false)}
                      className="text-[10px] px-2 py-0.5 rounded-lg transition-all"
                      style={{ background: "#FAFAFA", color: "#6B7280", border: "2px solid #C9B29F", fontFamily: "var(--font-table)" }}>
                      Cancel
                    </button>
                  </div>
                )}
                <button onClick={() => { setShowHistory(false); setConfirmClear(false); }} className="text-xs text-[#6B7280] hover:text-[#1C1C1C]">✕</button>
              </div>
            </div>
            {history.length === 0 ? (
              <p className="text-xs text-center py-4" style={{ color: "#6B7280", fontFamily: "var(--font-table)" }}>No prediction history yet.</p>
            ) : (
            <div className="space-y-1">
              {history.map(h => (
                <Link key={h.share_id} href={`/puppy-predictor/result/${h.share_id}`}
                  className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#F0EBE3] transition-colors"
                  style={{ border: "2px solid #C9B29F" }}>
                  <div className="flex items-center gap-3 text-xs" style={{ fontFamily: "var(--font-table)" }}>
                    <span style={{ color: "#1C1C1C" }}>♂ {h.sire_name || `Dog #${h.sire_dog_id || "?"}`}</span>
                    <span style={{ color: "#6B7280" }}>×</span>
                    <span style={{ color: "#1C1C1C" }}>♀ {h.dam_name || `Dog #${h.dam_dog_id || "?"}`}</span>
                  </div>
                  <span className="text-[10px]" style={{ color: "#6B7280", fontFamily: "var(--font-mono)" }}>
                    {new Date(h.created_at).toLocaleDateString()}
                  </span>
                </Link>
              ))}
            </div>
            )}
          </div>
        )}

        {/* --- Input Section --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* -- Sire -- */}
          <div className="rounded-lg p-5 space-y-4" style={{
            background: "#FAF7F2",
            border: "2px solid #C9B29F",
          }}>
            <div className="flex items-center gap-2">
              <span className="text-lg" style={{ color: "#1C1C1C" }}>♂</span>
              <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.3rem", color: "#1C1C1C", letterSpacing: "0.02em" }}>
                SIRE
              </h2>
            </div>

            {/* DB Search (#2) */}
            <DogSearch label="sire" onSelect={handleSireDbSelect} />

            {mode === "simple" ? (
              /* Simple mode (#1) */
              <div className="space-y-2">
                <label className="text-xs font-semibold" style={{ color: "#6B7280", fontFamily: "var(--font-table)" }}>
                  Select visible coat color:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(COAT_PRESETS).map(([key, val]) => (
                    <button key={key} onClick={() => handleSelectSirePreset(key)}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] transition-all"
                      style={{
                        background: sirePreset === key ? "#F0EBE3" : "#FAFAFA",
                        border: sirePreset === key ? "2px solid #1C1C1C" : "2px solid #C9B29F",
                        color: sirePreset === key ? "#1C1C1C" : "#6B7280",
                        fontFamily: "var(--font-table)",
                      }}>
                      <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: val.swatch, border: "2px solid #C9B29F" }} />
                      {val.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Advanced mode */
              <div className="space-y-3">
                {loci.map(l => (
                  <div key={`sire-${l.key}`} className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs font-semibold" style={{ color: "#6B7280", fontFamily: "var(--font-table)" }}>{l.label}</label>
                      <span className="cursor-help text-[10px] w-3.5 h-3.5 rounded-full flex items-center justify-center"
                        style={{ background: "#FAFAFA", color: "#1C1C1C", border: "2px solid #C9B29F" }}
                        title={LOCUS_INFO[l.key]}>?</span>
                    </div>
                    <select value={sire[l.key]} onChange={e => setSire({ ...sire, [l.key]: e.target.value })}
                      className="w-full px-3 py-2 outline-none cursor-pointer" style={inputStyle}>
                      {l.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* -- Dam -- */}
          <div className="rounded-lg p-5 space-y-4" style={{
            background: "#FAF7F2",
            border: "2px solid #C9B29F",
          }}>
            <div className="flex items-center gap-2">
              <span className="text-lg" style={{ color: "#1C1C1C" }}>♀</span>
              <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.3rem", color: "#1C1C1C", letterSpacing: "0.02em" }}>
                DAM
              </h2>
            </div>

            <DogSearch label="dam" onSelect={handleDamDbSelect} />

            {mode === "simple" ? (
              <div className="space-y-2">
                <label className="text-xs font-semibold" style={{ color: "#6B7280", fontFamily: "var(--font-table)" }}>
                  Select visible coat color:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(COAT_PRESETS).map(([key, val]) => (
                    <button key={key} onClick={() => handleSelectDamPreset(key)}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] transition-all"
                      style={{
                        background: damPreset === key ? "#F0EBE3" : "#FAFAFA",
                        border: damPreset === key ? "2px solid #1C1C1C" : "2px solid #C9B29F",
                        color: damPreset === key ? "#1C1C1C" : "#6B7280",
                        fontFamily: "var(--font-table)",
                      }}>
                      <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: val.swatch, border: "2px solid #C9B29F" }} />
                      {val.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {loci.map(l => (
                  <div key={`dam-${l.key}`} className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs font-semibold" style={{ color: "#6B7280", fontFamily: "var(--font-table)" }}>{l.label}</label>
                      <span className="cursor-help text-[10px] w-3.5 h-3.5 rounded-full flex items-center justify-center"
                        style={{ background: "#FAFAFA", color: "#1C1C1C", border: "2px solid #C9B29F" }}
                        title={LOCUS_INFO[l.key]}>?</span>
                    </div>
                    <select value={dam[l.key]} onChange={e => setDam({ ...dam, [l.key]: e.target.value })}
                      className="w-full px-3 py-2 outline-none cursor-pointer" style={inputStyle}>
                      {l.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* --- Action Buttons --- */}
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <button onClick={handlePredict}
            className="px-8 py-3 rounded-lg font-semibold transition-all hover:scale-105 active:scale-95"
            style={{
              background: "#C9B29F", color: "#1C1C1C",
              fontFamily: "var(--font-table)", letterSpacing: "0.05em", fontSize: "1rem",
            }}>
            PREDICT LITTER
          </button>
          <button onClick={handleReset}
            className="px-6 py-3 rounded-lg font-semibold transition-all hover:scale-105 active:scale-95"
            style={{ background: "#FAFAFA", color: "#1C1C1C",
              fontFamily: "var(--font-table)", letterSpacing: "0.05em", fontSize: "1rem",
              border: "2px solid #C9B29F" }}>
            NEW PAIRING
          </button>
        </div>

        {/* === RESULTS SECTION === */}
        {results && (
          <div className="space-y-5">
            {/* Tabs */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex rounded-lg overflow-hidden" style={{ border: "2px solid #C9B29F" }}>
                {(["results", "simulate"] as const).map(t => (
                  <button key={t} onClick={() => { setTab(t); if (t === "simulate" && !litter) handleSimulate(); }}
                    className="px-4 py-2 text-xs font-semibold transition-colors capitalize"
                    style={{
                      background: tab === t ? "#C9B29F" : "#FAFAFA",
                      color: tab === t ? "#1C1C1C" : "#1C1C1C",
                      fontFamily: "var(--font-table)",
                    }}>
                    {t === "results" ? "Predicted Colors" : "Simulate Litter"}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                {/* Save & Share (#4) */}
                {!shareUrl ? (
                  <button onClick={handleSave} disabled={saving}
                    className="px-4 py-2 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                    style={{ background: "#FAFAFA", color: "#1C1C1C", border: "2px solid #C9B29F", fontFamily: "var(--font-table)" }}>
                    {saving ? "Saving..." : "Save & Share"}
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <input type="text" readOnly value={shareUrl}
                      className="px-3 py-1.5 rounded-lg text-[11px] w-64 outline-none"
                      style={{ background: "#FAFAFA", border: "2px solid #C9B29F", color: "#1C1C1C", fontFamily: "var(--font-mono)" }}
                      onClick={e => (e.target as HTMLInputElement).select()} />
                    <button onClick={() => {
                        try { navigator.clipboard.writeText(shareUrl); } catch (_e) {
                          const ta = document.createElement("textarea"); ta.value = shareUrl; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
                        }
                        const btn = document.activeElement as HTMLButtonElement; if (btn) { btn.textContent = "Copied!"; setTimeout(() => { btn.textContent = "Copy"; }, 2000); }
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ background: "#FAFAFA", color: "#1C1C1C", border: "2px solid #C9B29F", fontFamily: "var(--font-table)" }}>
                      Copy
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* -- Results Tab -- */}
            {tab === "results" && (
              <div className="space-y-4">
                <div className="text-center">
                  <h2 style={{
                    fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.4rem",
                    color: "#1C1C1C",
                  }}>
                    PREDICTED LITTER COLORS
                  </h2>
                  <p className="text-xs mt-1" style={{ color: "#6B7280", fontFamily: "var(--font-table)" }}>
                    {results.length} possible phenotype{results.length !== 1 ? "s" : ""}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {results.map((r, i) => (
                    <div key={i} className="rounded-lg p-4 transition-all hover:scale-[1.02]" style={{
                      background: "#FAF7F2",
                      border: "2px solid #C9B29F",
                    }}>
                      {/* Dog silhouette + swatch (#3) */}
                      <div className="flex items-center gap-3 mb-3">
                        <DogSilhouette phenotype={r.phenotype} size={64} />
                        <div className="flex-1">
                          <div className="w-full h-12 rounded-lg relative overflow-hidden" style={{
                            background: getSwatchGradient(r.phenotype),
                            border: "2px solid #C9B29F",
                          }}>
                            {r.phenotype.toLowerCase().includes("brindle") && (
                              <div className="absolute inset-0" style={{
                                background: "repeating-linear-gradient(60deg, transparent, transparent 6px, rgba(0,0,0,0.25) 6px, rgba(0,0,0,0.25) 10px)",
                              }} />
                            )}
                            <div className="absolute top-1 right-2 px-2 py-0.5 rounded-full text-xs font-bold"
                              style={{ background: "rgba(255,255,255,0.85)", color: "#1C1C1C", fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>
                              {r.percentage}%
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Phenotype name */}
                      <h3 className="text-sm font-bold" style={{ color: "#1C1C1C", fontFamily: "var(--font-display)", letterSpacing: "0.02em" }}>
                        {r.phenotype}
                      </h3>

                      {/* Nose & Eye color (#4) */}
                      {(() => {
                        const info = getNoseEyeInfo(r.phenotype);
                        return (
                          <div className="flex items-center gap-3 mt-1.5">
                            <div className="flex items-center gap-1 text-[10px]" style={{ color: "#6B7280", fontFamily: "var(--font-table)" }}>
                              <div className="w-2.5 h-2.5 rounded-full" style={{ background: info.noseColor, border: "2px solid #C9B29F" }} />
                              {info.nose}
                            </div>
                            <div className="text-[10px]" style={{ color: "#6B7280", fontFamily: "var(--font-table)" }}>
                              Eyes: {info.eyes}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Probability bar */}
                      <div className="mt-2 w-full h-1.5 rounded-full overflow-hidden" style={{ background: "#E5DDD3" }}>
                        <div className="h-full rounded-full" style={{ width: `${r.percentage}%`, background: "#C9B29F" }} />
                      </div>

                      {/* Carrier warnings (#6) */}
                      {r.carriers.length > 0 && (
                        <div className="mt-2 space-y-0.5">
                          {r.carriers.map((c, ci) => (
                            <div key={ci} className="flex items-center gap-1.5 text-[10px]" style={{ color: "#b45309", fontFamily: "var(--font-table)" }}>
                              <span>⚠</span>
                              <span>{c}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* -- Simulate Tab (#7) -- */}
            {tab === "simulate" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h2 style={{
                      fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.4rem",
                      color: "#1C1C1C",
                    }}>
                      SIMULATED LITTER
                    </h2>
                    <p className="text-xs mt-0.5" style={{ color: "#6B7280", fontFamily: "var(--font-table)" }}>
                      Random simulation based on probabilities — results vary each time
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs" style={{ color: "#6B7280", fontFamily: "var(--font-table)" }}>Litter size:</label>
                    <select value={litterSize} onChange={e => setLitterSize(Number(e.target.value))}
                      className="px-2 py-1 text-xs outline-none cursor-pointer" style={inputStyle}>
                      {[3, 4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <button onClick={handleSimulate}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                      style={{ background: "#FAFAFA", color: "#1C1C1C", border: "2px solid #C9B29F", fontFamily: "var(--font-table)" }}>
                      Re-roll
                    </button>
                  </div>
                </div>

                {litter && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {litter.map(pup => (
                      <div key={pup.id} className="rounded-lg p-4 text-center space-y-2 transition-all hover:scale-[1.03] hover:-translate-y-1" style={{
                        background: "#FAF7F2",
                        border: "2px solid #C9B29F",
                      }}>
                        <DogSilhouette phenotype={pup.phenotype} size={72} />
                        <div>
                          <p className="text-xs font-bold" style={{ color: "#1C1C1C", fontFamily: "var(--font-mono)" }}>
                            Puppy #{pup.id}
                          </p>
                          <p className="text-[11px] font-semibold mt-0.5" style={{
                            color: "#1C1C1C",
                            fontFamily: "var(--font-table)",
                          }}>
                            {pup.sex === "Male" ? "♂" : "♀"} {pup.sex}
                          </p>
                        </div>
                        <div className="w-full h-6 rounded-lg overflow-hidden relative" style={{
                          background: getSwatchGradient(pup.phenotype),
                          border: "2px solid #C9B29F",
                        }}>
                          {pup.phenotype.toLowerCase().includes("brindle") && (
                            <div className="absolute inset-0" style={{
                              background: "repeating-linear-gradient(60deg, transparent, transparent 4px, rgba(0,0,0,0.25) 4px, rgba(0,0,0,0.25) 7px)",
                            }} />
                          )}
                        </div>
                        <p className="text-[11px] font-semibold" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>
                          {pup.phenotype}
                        </p>
                        {pup.carriers.length > 0 && (
                          <div className="space-y-0.5">
                            {pup.carriers.slice(0, 2).map((c, ci) => (
                              <p key={ci} className="text-[9px]" style={{ color: "#b45309" }}>⚠ {c}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* --- Genetics Reference --- */}
            <div className="rounded-lg p-5 space-y-3" style={{
              background: "#FAF7F2",
              border: "2px solid #C9B29F",
            }}>
              <h3 className="text-xs font-bold" style={{
                fontFamily: "var(--font-table)", letterSpacing: "0.1em",
                color: "#1C1C1C",
              }}>
                GENETICS REFERENCE
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-[11px]" style={{ color: "#6B7280", fontFamily: "var(--font-table)" }}>
                {Object.entries(LOCUS_INFO).map(([key, info]) => (
                  <div key={key} className="space-y-1">
                    <span className="font-bold" style={{ color: "#1C1C1C" }}>{key} Locus</span>
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
