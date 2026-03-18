"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

/* ─── Types ─── */
interface Ancestor {
  ancestor_id: number;
  ancestor_name: string;
  position: string;
  generation: number;
  css_class: string;
}
interface Offspring {
  offspring_id: number; offspring_name: string;
  sire_id: number; sire_name: string;
  dam_id: number; dam_name: string;
  photo_url: string | null;
}
interface Sibling { sibling_id: number; sibling_name: string; relation: string; sire_id: number; dam_id: number; }
interface Genetic { ancestor_id: number; ancestor_name: string; percentage: number; }
interface Dog {
  id: number; registered_name: string; sex: string; color: string | null;
  birthdate: string | null; death_date: string | null; reg_number: string;
  photo_url: string | null; description: string | null;
  view_count: number; breeder: string | null; owner: string | null;
  chain_weight: string | null; conditioned_weight: string | null;
  posted_date: string | null; modified_date: string | null;
  registration_number: string | null; offspring_count: number;
  full_siblings_count: number; half_siblings_sire_count: number; half_siblings_dam_count: number;
  sire: { id: number; name: string; sex: string; photo_url: string | null } | null;
  dam: { id: number; name: string; sex: string; photo_url: string | null } | null;
  sire_id: number | null; dam_id: number | null;
  pedigree: Ancestor[];
  offspring: Offspring[];
  siblings: { full: Sibling[]; halfSire: Sibling[]; halfDam: Sibling[]; };
  genetic_contributions: Genetic[];
}

const LOGO = "https://i.imgur.com/cAvQemZ.png";

const TC: Record<string, string> = {
  "GR CH": "#60a5fa", CH: "#fc8181", ROM: "#22d3ee", POR: "#a78bfa",
  "1XW": "#2dd4bf", "2XW": "#fb923c", "3XW": "#d4a855",
  "4XW": "#f472b6", "5XW": "#c084fc", "6XW": "#c084fc", "7XW": "#c084fc",
  "1XL": "#2dd4bf", "2XL": "#fb923c", "3XL": "#d4a855",
};

/* ─── Dog Color Helper ─── */
function getDogCardColor(name: string): string {
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
  if (/\bPOR\b/.test(n)) return "#a78bfa";
  return "#e0e0e0"; // dark gray for no title
}

function cardStyle(cc: string) {
  const isWhite = cc === "#e0e0e0" || cc === "#e8eaed";
  return {
    background: isWhite ? `linear-gradient(135deg, ${cc}30, ${cc}18)` : `linear-gradient(135deg, ${cc}20, ${cc}10)`,
    border: isWhite ? `1px solid ${cc}50` : `1px solid ${cc}35`,
    boxShadow: isWhite ? `0 1px 4px ${cc}25` : `0 1px 4px ${cc}15`,
  };
}

/* ─── DogLink ─── */
function getXWColor(name: string): string | null {
  const nameUpper = (name || "").toUpperCase();
  const match = nameUpper.match(/\b(\d+)X[WL]\b/);
  if (!match) return null;
  const num = parseInt(match[1]);
  if (num === 1) return "#2dd4bf";    // dark teal
  if (num === 2) return "#fb923c";     // dark orange
  if (num === 4) return "#f472b6";     // dark pink
  if (num >= 5) return "#c084fc";     // dark purple
  return null; // 3XW handled by gold/subject
}

function DogLink({ dogId, name, isMale }: { dogId: number | null; name: string; isMale?: boolean }) {
  const nameUpper = (name || "").toUpperCase();
  const isGrCh = /\bGR\s*CH\b/.test(nameUpper);
  const isCh = !isGrCh && /\bCH\b/.test(nameUpper);
  const xwColor = !isGrCh && !isCh ? getXWColor(name) : null;
  const isRom = !isGrCh && !isCh && !xwColor && /\bROM\b/.test(nameUpper);
  const isPor = !isGrCh && !isCh && !xwColor && !isRom && /\bPOR\b/.test(nameUpper);
  const hasTitle = isGrCh || isCh || xwColor || isRom || isPor || /\b\d+X[WL]\b/i.test(nameUpper);
  const color = isGrCh ? "#60a5fa" : isCh ? "#fc8181" : xwColor ? xwColor : isRom ? "#22d3ee" : isPor ? "#a78bfa" : !hasTitle ? "#e0e0e0" : isMale === true ? "#60a5fa" : isMale === false ? "#f472b6" : "#d4a855";
  if (!dogId) return <span style={{ color: "var(--text-muted)" }}>{name}</span>;
  return (
    <Link href={`/pedigree/${dogId}`} className="hover:underline transition-colors" style={{ color }}>
      {name}
    </Link>
  );
}

/* ─── Share Buttons ─── */
function ShareButton({ dogName }: { dogName: string }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: `${dogName} - Pedigree Platform`, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  return (
    <button onClick={share}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105"
      style={{
        background: copied ? "rgba(34,197,94,0.15)" : "rgba(212,168,85,0.1)",
        color: copied ? "var(--accent-green)" : "var(--accent-gold)",
        border: `1px solid ${copied ? "rgba(34,197,94,0.3)" : "rgba(212,168,85,0.2)"}`,
      }}>
      {copied ? "✓ Copied!" : "🔗 Share"}
    </button>
  );
}

function TelegramButton({ dogName }: { dogName: string }) {
  const handleClick = () => {
    const url = window.location.href;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}`, "_blank");
  };
  return (
    <button onClick={handleClick}
      className="inline-flex items-center justify-center w-10 h-10 rounded-lg transition-all hover:scale-110"
      style={{ background: "rgba(0,136,204,0.12)", border: "1px solid rgba(0,136,204,0.25)" }}
      title="Share on Telegram">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="#0088cc">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
      </svg>
    </button>
  );
}

function WhatsAppButton({ dogName }: { dogName: string }) {
  const handleClick = () => {
    const url = window.location.href;
    window.open(`https://wa.me/?text=${encodeURIComponent(url)}`, "_blank");
  };
  return (
    <button onClick={handleClick}
      className="inline-flex items-center justify-center w-10 h-10 rounded-lg transition-all hover:scale-110"
      style={{ background: "rgba(37,211,102,0.12)", border: "1px solid rgba(37,211,102,0.25)" }}
      title="Share on WhatsApp">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="#25d366">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
      </svg>
    </button>
  );
}

/* ─── Pedigree Tree (Interactive) ─── */
function PedigreeTree({ pedigree, dogName, dogId, isMale }: { pedigree: Ancestor[]; dogName: string; dogId: number; isMale: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [displayGens, setDisplayGens] = useState(4);

  const byGen: Record<number, Ancestor[]> = {};
  pedigree.forEach((a) => {
    if (!byGen[a.generation]) byGen[a.generation] = [];
    byGen[a.generation].push(a);
  });

  // Sort each generation: sires (males) on top, dams (females) below
  // Position format: G1_sire_0, G1_dam_1, G2_S_0, G2_D_1, etc.
  Object.keys(byGen).forEach((g) => {
    byGen[Number(g)].sort((a, b) => {
      // Build a binary sort key from position: sire/S = 0, dam/D = 1 at each level
      const getKey = (pos: string) => {
        if (!pos) return 0;
        // Extract parts after generation prefix
        const parts = pos.replace(/^G\d+_/, "").split("_");
        let key = 0;
        for (const p of parts) {
          key = key * 2;
          if (p.toLowerCase() === "dam" || p === "D" || p === "d") key += 1;
          // sire/S/numeric stays 0
        }
        return key;
      };
      return getKey(a.position) - getKey(b.position);
    });
  });

  const gens = Object.keys(byGen).map(Number).sort();
  if (gens.length === 0)
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4 opacity-30">🌳</div>
        <p style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)", fontSize: "15px" }}>No pedigree data available</p>
      </div>
    );

  const maxAvailGen = Math.max(...gens);
  const maxGen = Math.min(displayGens, maxAvailGen);
  const genLabels = ["First", "Second", "Third", "Fourth", "Fifth"];

  const isMaleAncestor = (a: Ancestor, idx: number) => {
    return a.position?.toLowerCase().includes("sire") || a.position?.includes("_S_") || a.css_class?.includes("male") || idx % 2 === 0;
  };

  return (
    <div className="relative">
      {/* Controls bar */}
      <div className="absolute top-1 right-2 z-10 flex items-center gap-2">
        {/* Generation selector */}
        <div className="flex items-center gap-0.5 rounded-md p-0.5" style={{ background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)", border: "1px solid rgba(30,64,120,0.8)" }}>
          {[3, 4, 5].map((g) => (
            <button key={g} onClick={() => { setDisplayGens(g); setZoom(1); if (containerRef.current) containerRef.current.scrollLeft = 0; }}
              className="px-2 h-5 rounded flex items-center justify-center text-[10px] font-bold transition-all"
              style={{
                background: displayGens === g ? "linear-gradient(135deg, rgba(212,168,85,0.2), rgba(212,168,85,0.08))" : "transparent",
                color: displayGens === g ? "var(--accent-gold)" : "var(--text-muted)",
                border: displayGens === g ? "1px solid rgba(212,168,85,0.3)" : "1px solid transparent",
                fontFamily: "var(--font-table)",
              }}>
              {g}G
            </button>
          ))}
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-0.5">
          <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
            className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold transition-colors"
            style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>−</button>
          <span className="text-[9px] px-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(1.5, z + 0.1))}
            className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold transition-colors"
            style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>+</button>
          <button onClick={() => setZoom(1)}
            className="ml-0.5 px-1.5 h-5 rounded flex items-center justify-center text-[9px] transition-colors"
            style={{ background: "var(--bg-elevated)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>Reset</button>
        </div>
      </div>

      <div ref={containerRef} className="overflow-x-auto overflow-y-hidden pb-1 pt-7"
           style={{ cursor: zoom !== 1 ? "grab" : "default" }}>
        <div style={{
          transform: `scale(${zoom})`, transformOrigin: "top left", transition: "transform 0.2s",
          minWidth: maxGen >= 5 ? "1100px" : "900px",
        }}>
          {/* Generation title */}
          <div className="text-center mb-2">
            <h3 style={{
              fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "13px", letterSpacing: "0.06em",
              textTransform: "uppercase", color: "#4a5568"
            }}>{maxGen} Generation Pedigree</h3>
          </div>

          {/* Column headers */}
          <div className="flex gap-px mb-1">
            <div className="px-1.5 py-1 text-center"
                 style={{ width: maxGen >= 5 ? "130px" : "170px", flexShrink: 0, fontFamily: "var(--font-table)", fontWeight: 600, fontSize: maxGen >= 5 ? "9px" : "10px", color: "#4a5568", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Dog
            </div>
            {gens.filter(g => g <= maxGen).map((g) => {
              const isLastGen = g === maxGen;
              return (
                <div key={g} className="px-1.5 py-1 text-center"
                     style={{ flex: isLastGen ? 2 : 1, fontFamily: "var(--font-table)", fontWeight: 600, fontSize: maxGen >= 5 ? "9px" : "10px", color: "#4a5568", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  {genLabels[g - 1] || `Gen ${g}`}
                </div>
              );
            })}
          </div>

          {/* Tree grid */}
          <div className="flex gap-px">
            {/* Root dog */}
            <div style={{ width: maxGen >= 5 ? "130px" : "170px", flexShrink: 0 }} className="flex items-center">
              <div className="w-full rounded-lg px-2 py-1.5 font-bold"
                   style={{
                     background: "linear-gradient(135deg, #fef9ee, #fdf3dc)",
                     border: "2px solid rgba(161,120,40,0.5)",
                     color: "#7a5c10",
                     boxShadow: "0 2px 8px rgba(161,120,40,0.15), inset 0 1px 0 rgba(255,255,255,0.8)",
                     fontFamily: "var(--font-table)",
                     fontSize: maxGen >= 5 ? "10px" : "12px",
                   }}>
                <div style={{ fontSize: maxGen >= 5 ? "7px" : "8px" }} className="uppercase tracking-wider opacity-60 mb-0.5">
                  {isMale ? "♂" : "♀"} Subject
                </div>
                <span className="block" style={{ wordBreak: "break-word", whiteSpace: "normal" }}>{dogName}</span>
              </div>
            </div>

            {/* Generation columns */}
            {gens.filter(g => g <= maxGen).map((gen) => {
              const ancestors = byGen[gen] || [];
              const isLastGen = gen === maxGen;
              const cellMinH = maxGen >= 5
                ? (gen <= 1 ? "30px" : gen === 2 ? "24px" : gen === 3 ? "20px" : "16px")
                : (gen <= 1 ? "40px" : gen === 2 ? "34px" : gen === 3 ? "28px" : "24px");
              const fontSize = maxGen >= 5
                ? (gen <= 1 ? "11px" : gen === 2 ? "10px" : "9.5px")
                : (gen <= 1 ? "13px" : gen === 2 ? "12px" : "11px");
              return (
                <div key={gen} className="flex flex-col gap-1" style={{ flex: isLastGen ? 2 : 1 }}>
                  {ancestors.slice(0, Math.pow(2, gen)).map((a, i) => {
                    const male = isMaleAncestor(a, i);
                    const hasLink = !!a.ancestor_id;
                    const nameUpper = (a.ancestor_name || "").toUpperCase();
                    const isGrCh = /\bGR\s*CH\b/.test(nameUpper);
                    const isCh = !isGrCh && /\bCH\b/.test(nameUpper);
                    const isChampion = isGrCh || isCh;
                    const xwColor = !isGrCh && !isCh ? getXWColor(a.ancestor_name || "") : null;
                    const xwMatch = (a.ancestor_name || "").toUpperCase().match(/\b(\d+)X[WL]\b/);
                    const xwNum = xwMatch ? parseInt(xwMatch[1]) : 0;
                    const xwBgMap: Record<number, string> = { 1: "rgba(45,212,191,0.12)", 2: "rgba(251,146,60,0.12)", 4: "rgba(52,211,153,0.12)" };
                    const xwBorderMap: Record<number, string> = { 1: "rgba(45,212,191,0.6)", 2: "rgba(251,146,60,0.6)", 4: "rgba(52,211,153,0.6)" };
                    const cellBg = isGrCh
                      ? "linear-gradient(135deg, rgba(96,165,250,0.18), rgba(96,165,250,0.08))"
                      : isCh
                        ? "linear-gradient(135deg, rgba(239,68,68,0.1), rgba(239,68,68,0.03))"
                        : xwNum === 3
                          ? "linear-gradient(135deg, rgba(202,138,4,0.12), rgba(202,138,4,0.03))"
                          : xwNum === 1
                            ? "linear-gradient(135deg, rgba(20,184,166,0.1), rgba(20,184,166,0.03))"
                            : xwNum === 2
                              ? "linear-gradient(135deg, rgba(234,88,12,0.1), rgba(234,88,12,0.03))"
                              : xwNum === 4
                                ? "linear-gradient(135deg, rgba(219,39,119,0.1), rgba(219,39,119,0.03))"
                                : xwNum >= 5
                                  ? "linear-gradient(135deg, rgba(147,51,234,0.1), rgba(147,51,234,0.03))"
                                  : "#f0f2f5";
                    const cellBorder = isGrCh
                      ? "rgba(29,91,191,0.5)"
                      : isCh
                        ? "rgba(192,40,40,0.5)"
                        : xwNum === 3
                          ? "rgba(138,101,24,0.5)"
                          : xwNum === 1
                            ? "rgba(13,116,104,0.5)"
                            : xwNum === 2
                              ? "rgba(180,90,10,0.5)"
                              : xwNum === 4
                                ? "rgba(176,56,120,0.5)"
                                : xwNum >= 5
                                  ? "rgba(109,48,176,0.5)"
                                  : "rgba(0,0,0,0.12)";
                    const cellTextColor = isGrCh
                      ? "#1d5bbf"
                      : isCh
                        ? "#c02828"
                        : xwNum === 1 ? "#0d7468" : xwNum === 2 ? "#b45a0a" : xwNum === 3 ? "#8a6518" : xwNum === 4 ? "#b03878" : xwNum >= 5 ? "#6d30b0" : isChampion ? "#c02828"
                          : "#3a3a3a";
                    return (
                      <div key={`${gen}-${i}`}
                           className="flex-1 rounded-md px-2 py-1 flex items-center group relative transition-all duration-200 hover:shadow-md hover:-translate-y-[1px]"
                           style={{
                             background: cellBg,
                             borderLeft: `${maxGen >= 5 ? "3px" : "4px"} solid ${cellBorder}`,
                             minHeight: cellMinH,
                             cursor: hasLink ? "pointer" : "default",
                             boxShadow: `0 1px 3px rgba(0,0,0,0.08), 0 0 0 0.5px rgba(0,0,0,0.04)`,
                           }}>
                        {isChampion && (
                          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center rounded-full"
                                style={{
                                  fontSize: maxGen >= 5 ? "7px" : "9px",
                                  color: "#b8860b",
                                  background: "linear-gradient(135deg, #fef3c7, #fde68a)",
                                  width: maxGen >= 5 ? "12px" : "15px",
                                  height: maxGen >= 5 ? "12px" : "15px",
                                  boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                                  border: "1px solid rgba(184,134,11,0.3)",
                                }}>★</span>
                        )}
                        {hasLink ? (
                          <Link href={`/pedigree/${a.ancestor_id}`}
                                className="font-medium truncate block w-full group-hover:underline"
                                style={{
                                  color: cellTextColor,
                                  fontSize,
                                  fontFamily: "var(--font-table)",
                                  fontWeight: isChampion ? 700 : 600,
                                  lineHeight: 1.1,
                                  textShadow: "0 0.5px 0 rgba(255,255,255,0.5)",
                                }}>
                            {a.ancestor_name}
                          </Link>
                        ) : (
                          <span className="truncate" style={{
                            color: "#888",
                            fontSize,
                            fontFamily: "var(--font-table)",
                            lineHeight: 1.2,
                          }}>
                            {a.ancestor_name || "Unknown"}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Offspring Tab ─── */
function OffspringTab({ offspring }: { offspring: Offspring[] }) {
  if (!offspring.length)
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3 opacity-30">🐾</div>
        <p style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)" }}>No offspring recorded</p>
      </div>
    );
  return (
    <div className="title-cards grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5">
      {offspring.map((o, i) => {
        const cc = getDogCardColor(o.offspring_name);
        return (
          <div key={i} className="rounded-md flex items-center overflow-hidden transition-all hover:brightness-125"
               style={{
                 ...cardStyle(cc),
                 fontFamily: "var(--font-table)", fontSize: "10px", fontWeight: 600, lineHeight: 1.1,
               }}>
            <div style={{ width: "3px", alignSelf: "stretch", background: cc, flexShrink: 0 }} />
            <div className="px-2.5 py-1.5 truncate">
              <DogLink dogId={o.offspring_id} name={o.offspring_name} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Siblings Tab ─── */
function SiblingsTab({ siblings }: { siblings: Dog["siblings"] }) {
  const [openSib, setOpenSib] = useState<string | null>(null);
  const total = (siblings.full?.length || 0) + (siblings.halfSire?.length || 0) + (siblings.halfDam?.length || 0);
  if (!total) return (
    <div className="text-center py-16">
      <div className="text-4xl mb-3 opacity-30">🐕‍🦺</div>
      <p style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)" }}>No siblings recorded</p>
    </div>
  );

  const sections = [
    { key: "full", label: "Full Siblings", list: siblings.full || [], color: "#d4a855" },
    { key: "halfSire", label: "Half Siblings (Same Sire)", list: siblings.halfSire || [], color: "#60a5fa" },
    { key: "halfDam", label: "Half Siblings (Same Dam)", list: siblings.halfDam || [], color: "#f472b6" },
  ].filter(s => s.list.length > 0);

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {sections.map((s) => (
          <button key={s.key} onClick={() => setOpenSib(openSib === s.key ? null : s.key)}
            className="flex items-center gap-1.5 px-3 py-1 rounded text-[11px] uppercase tracking-wider font-semibold transition-all cursor-pointer"
            style={{
              background: openSib === s.key ? `${s.color}35` : `${s.color}15`,
              border: `1px solid ${s.color}${openSib === s.key ? "60" : "30"}`,
              color: s.color,
              fontFamily: "var(--font-table)",
              letterSpacing: "0.1em",
            }}>
            {s.label}
            <span className="text-[9px] px-1.5 rounded-full" style={{ background: `${s.color}20`, fontFamily: "var(--font-mono)" }}>
              {s.list.length}
            </span>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" style={{ transform: openSib === s.key ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
              <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            </svg>
          </button>
        ))}
      </div>
      {openSib && sections.find(s => s.key === openSib) && (() => {
        const sec = sections.find(s => s.key === openSib)!;
        return (
          <div className="title-cards grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5">
            {sec.list.map((s, i) => {
              const cc = getDogCardColor(s.sibling_name);
              return (
                <div key={i} className="rounded-md flex items-center overflow-hidden transition-all hover:brightness-125"
                     style={{
                       ...cardStyle(cc),
                       fontFamily: "var(--font-table)", fontSize: "10px", fontWeight: 600, lineHeight: 1.1,
                     }}>
                  <div style={{ width: "3px", alignSelf: "stretch", background: cc, flexShrink: 0 }} />
                  <div className="px-2.5 py-1.5 truncate">
                    <DogLink dogId={s.sibling_id} name={s.sibling_name} />
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}

/* ─── PedStats Tab ─── */
function PedStatsTab({ genetics }: { genetics: Genetic[] }) {
  if (!genetics.length)
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3 opacity-30">📊</div>
        <p style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)" }}>No genetic contribution data</p>
      </div>
    );

  const maxPct = genetics[0]?.percentage || 1;
  return (
    <div className="title-cards">
      <p className="text-[10px] mb-2 font-semibold" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-table)" }}>
        Genetic contribution of ancestors to this dog&apos;s pedigree
      </p>
      <div className="space-y-1">
        {genetics.map((g, i) => {
          const cc = getDogCardColor(g.ancestor_name);
          const barColor = `linear-gradient(90deg, ${cc}, ${cc}cc)`;
          const pctColor = cc;
          return (
            <div key={i} className="rounded-md flex items-center overflow-hidden transition-all hover:brightness-125"
                 style={{
                   ...cardStyle(cc),
                 }}>
              <div style={{ width: "3px", alignSelf: "stretch", background: cc, flexShrink: 0 }} />
              <div className="px-2.5 py-1.5 grid items-center gap-2 w-full" style={{ gridTemplateColumns: "250px 1fr 45px", fontFamily: "var(--font-table)", fontSize: "10px", fontWeight: 600, lineHeight: 1.1 }}>
                <div>
                  <DogLink dogId={g.ancestor_id} name={g.ancestor_name} />
                </div>
                <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
                  <div className="h-full rounded-full transition-all duration-700"
                       style={{ width: `${Math.max((g.percentage / maxPct) * 100, 3)}%`, background: barColor }} />
                </div>
                <span className="text-right font-bold"
                      style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: pctColor }}>
                  {g.percentage.toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Photos Tab (Offspring with photos) ─── */
function PhotosTab({ offspring }: { offspring: Offspring[] }) {
  const withPhotos = offspring.filter((o) => o.photo_url);
  if (!withPhotos.length)
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3 opacity-30">📷</div>
        <p style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)" }}>No offspring photos available</p>
      </div>
    );
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1.5">
      {withPhotos.map((o, i) => {
        const src = o.photo_url!.startsWith("http") ? o.photo_url! : `https://www.apbt.online-pedigrees.com/${o.photo_url}`;
        const cc = getDogCardColor(o.offspring_name);
        return (
          <Link key={i} href={`/pedigree/${o.offspring_id}`} className="title-cards group relative rounded-md overflow-hidden transition-all hover:brightness-125"
                style={{ ...cardStyle(cc), background: "var(--bg-elevated)" }}>
            <div style={{ width: "100%", height: "120px", overflow: "hidden" }}>
              <img src={src} alt={o.offspring_name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
            </div>
            <div className="px-1.5 py-1" style={{ ...cardStyle(cc), borderTop: `1px solid ${cc === "#e8eaed" ? cc + "50" : cc + "30"}` }}>
              <p className="font-semibold truncate" style={{ color: cc, fontFamily: "var(--font-table)", fontSize: "9px", lineHeight: 1.1 }}>
                {o.offspring_name}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

/* ─── Titles Tab (Winners only from offspring) ─── */
function TitlesTab({ offspring }: { offspring: Offspring[] }) {
  // Only match dogs with explicit winner/champion titles as whole words at start or in parentheses
  const TITLE_PATTERNS = [
    /\bGR\s*CH\b/i, /(?:^|\s|\()CH\b/i, /\bROM\b/i, /\bPOR\b/i,
    /\b\d+XW\b/i, /\b\d+XL\b/i,
  ];

  const titled = offspring.filter((o) =>
    TITLE_PATTERNS.some((rx) => rx.test(o.offspring_name))
  );

  // Get the HIGHEST priority title for a dog (GR CH > CH > XW/XL > ROM/POR)
  const getTopTitle = (name: string): string | null => {
    const n = name.toUpperCase();
    if (/\bGR\s*CH\b/.test(n)) return "GR CH";
    if (/(?:^|\s|\()CH\b/.test(n)) return "CH";
    const xw = n.match(/\b(\d+XW)\b/);
    if (xw) return xw[1];
    const xl = n.match(/\b(\d+XL)\b/);
    if (xl) return xl[1];
    if (/\bROM\b/.test(n)) return "ROM";
    if (/\bPOR\b/.test(n)) return "POR";
    return null;
  };

  // Group by HIGHEST priority title — each dog appears in only ONE group
  const groups: Record<string, Offspring[]> = {};
  titled.forEach((o) => {
    const t = getTopTitle(o.offspring_name);
    if (t) {
      if (!groups[t]) groups[t] = [];
      groups[t].push(o);
    }
  });

  // Sort order for groups
  const ORDER = ["GR CH", "CH", "7XW", "6XW", "5XW", "4XW", "3XW", "ROM", "POR", "2XW", "1XW", "3XL", "2XL", "1XL"];
  const LABELS: Record<string, string> = {
    "GR CH": "Grand Champions", "CH": "Champions", "ROM": "Register of Merit", "POR": "Produce of Record",
    "7XW": "7x Winners", "6XW": "6x Winners", "5XW": "5x Winners", "4XW": "4x Winners",
    "3XW": "3x Winners", "2XW": "2x Winners", "1XW": "1x Winners",
    "3XL": "3x Losers", "2XL": "2x Losers", "1XL": "1x Losers",
  };
  const sortedKeys = Object.keys(groups).sort((a, b) => {
    const ai = ORDER.indexOf(a);
    const bi = ORDER.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  const [openTitle, setOpenTitle] = useState<string | null>(null);

  if (!titled.length)
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3 opacity-30">🏆</div>
        <p style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)" }}>No Offspring with Titles</p>
      </div>
    );

  return (
    <div>
      <div className="flex flex-wrap gap-1 mb-3">
        {sortedKeys.map((title) => (
          <button key={title} onClick={() => setOpenTitle(openTitle === title ? null : title)}
            className="flex items-center gap-1.5 px-3 py-1 rounded text-[11px] uppercase tracking-wider font-semibold transition-all cursor-pointer"
            style={{
              background: openTitle === title ? `${TC[title] || "#e8eaed"}35` : `${TC[title] || "#e8eaed"}15`,
              border: `1px solid ${TC[title] || "#e8eaed"}${openTitle === title ? "60" : "30"}`,
              color: TC[title] || "#e8eaed",
              fontFamily: "var(--font-table)",
              letterSpacing: "0.1em",
            }}>
            {LABELS[title] || title}
            <span className="text-[9px] px-1.5 rounded-full" style={{ background: `${TC[title] || "#e8eaed"}20`, fontFamily: "var(--font-mono)" }}>
              {groups[title].length}
            </span>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" style={{ transform: openTitle === title ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
              <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            </svg>
          </button>
        ))}
      </div>
      {openTitle && groups[openTitle] && (
        <div className="title-cards grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5 mt-2">
          {groups[openTitle].map((o, i) => {
            const cc = getDogCardColor(o.offspring_name);
            return (
              <div key={i} className="rounded-md flex items-center overflow-hidden transition-all hover:brightness-125"
                   style={{
                     ...cardStyle(cc),
                     fontFamily: "var(--font-table)", fontSize: "10px", fontWeight: 600, lineHeight: 1.1,
                   }}>
                <div style={{ width: "3px", alignSelf: "stretch", background: cc, flexShrink: 0 }} />
                <div className="px-2.5 py-1.5 truncate">
                  <DogLink dogId={o.offspring_id} name={o.offspring_name} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Main Public Pedigree Page ─── */
export default function PublicPedigreePage() {
  const params = useParams();
  const id = params.id as string;
  const [dog, setDog] = useState<Dog | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pedigree" | "photos" | "offspring" | "siblings" | "pedstats" | "titles">("pedigree");
  const [hoverPhoto, setHoverPhoto] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<string>("offspring");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/dogs/${id}`)
      .then((r) => r.json())
      .then((data) => { setDog(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  /* ─── Loading ─── */
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-deep)" }}>
        <div className="flex flex-col items-center gap-4">
          <img src={LOGO} alt="Logo" className="w-12 h-12 rounded-xl animate-pulse" />
          <div className="flex items-center gap-3" style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)" }}>
            <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                 style={{ borderColor: "var(--accent-gold)", borderTopColor: "transparent" }} />
            Loading pedigree...
          </div>
        </div>
      </div>
    );

  /* ─── Not Found ─── */
  if (!dog || (dog as any).error)
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-deep)" }}>
        <div className="text-center">
          <div className="text-6xl mb-4">🐕</div>
          <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-table)" }}>Dog Not Found</h2>
          <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>This pedigree doesn&apos;t exist or has been removed.</p>
          <Link href="/" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all hover:scale-105"
                style={{ background: "linear-gradient(135deg, var(--accent-gold), #b8860b)", color: "#000", fontFamily: "var(--font-table)" }}>
            ← Back to Home
          </Link>
        </div>
      </div>
    );

  const isMale = dog.sex === "MALE" || dog.sex === "M";
  const sexColor = isMale ? "var(--male-color)" : "var(--female-color)";

  const photoUrl = dog.photo_url
    ? dog.photo_url.startsWith("http") ? dog.photo_url : `https://www.apbt.online-pedigrees.com/${dog.photo_url}`
    : null;

  const titlePatterns = ["GR CH", "CH", "ROM", "POR", "1XW", "2XW", "3XW", "4XW", "5XW", "6XW", "1XL", "2XL", "3XL"];
  const titles = titlePatterns.filter(t => dog.registered_name?.toUpperCase().includes(t));

  const TITLE_RX = [/\bGR\s*CH\b/i, /(?:^|\s|\()CH\b/i, /\bROM\b/i, /\bPOR\b/i, /\b\d+XW\b/i, /\b\d+XL\b/i];
  const titledCount = (dog.offspring || []).filter((o: Offspring) => TITLE_RX.some((rx) => rx.test(o.offspring_name))).length;
  const photosCount = (dog.offspring || []).filter((o: Offspring) => o.photo_url).length;

  const tabs = [
    { key: "pedigree" as const, label: "Pedigree", icon: "🌳", count: dog.pedigree?.length || 0 },
    { key: "photos" as const, label: "Photos", icon: "📷", count: photosCount },
    { key: "offspring" as const, label: "Offspring", icon: "🐾", count: dog.offspring?.length || 0 },
    { key: "titles" as const, label: "Titles", icon: "🏆", count: titledCount },
    { key: "siblings" as const, label: "Siblings", icon: "🐕", count: (dog.siblings?.full?.length || 0) + (dog.siblings?.halfSire?.length || 0) + (dog.siblings?.halfDam?.length || 0) },
    { key: "pedstats" as const, label: "PedStats", icon: "📊", count: dog.genetic_contributions?.length || 0 },
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-deep)" }}>
      <style>{`
        .glow-gold { transition: border-color 0.3s ease; }
        .glow-gold:hover { border-color: #d4a855 !important; }
        .glow-blue { transition: border-color 0.3s ease; }
        .glow-blue:hover { border-color: #60a5fa !important; }
        .glow-pink { transition: border-color 0.3s ease; }
        .glow-pink:hover { border-color: #f472b6 !important; }
        .glow-teal { transition: border-color 0.3s ease; }
        .glow-teal:hover { border-color: #2dd4bf !important; }
        .glow-purple { transition: border-color 0.3s ease; }
        .glow-purple:hover { border-color: #a78bfa !important; }
        .glow-orange { transition: border-color 0.3s ease; }
        .glow-orange:hover { border-color: #fb923c !important; }
        .glow-green { transition: border-color 0.3s ease; }
        .glow-green:hover { border-color: #34d399 !important; }
        .glow-red { transition: border-color 0.3s ease; }
        .glow-red:hover { border-color: #ef4444 !important; }
        .title-cards a { text-decoration: none !important; }
        .title-cards a:hover { text-decoration: none !important; }
      `}</style>
      {/* ─── Top Nav ─── */}
      <nav className="sticky top-0 z-50 px-4 md:px-6 py-3 flex items-center justify-between"
           style={{ background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)", backdropFilter: "blur(20px)", borderBottom: "1.5px solid rgba(30,64,120,0.8)" }}>
        <Link href="/" className="flex items-center gap-3">
          <img src={LOGO} alt="Logo" className="w-8 h-8 rounded-lg" />
          <span style={{
            fontFamily: "var(--font-table)", fontWeight: 700, fontSize: "1.1rem",
            background: "linear-gradient(135deg, #e8c86e, #d4a855, #b8860b)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            letterSpacing: "0.02em",
          }}>
            Pedigree Platform
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <ShareButton dogName={dog.registered_name} />
          <TelegramButton dogName={dog.registered_name} />
          <WhatsAppButton dogName={dog.registered_name} />
          <Link href="/login"
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-105"
            style={{
              background: "linear-gradient(135deg, var(--accent-gold), #b8860b)", color: "#000",
              fontFamily: "var(--font-table)", letterSpacing: "0.02em",
            }}>
            Sign In
          </Link>
        </div>
      </nav>

      <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-4 space-y-3">

        {/* ─── Dog Name Header ─── */}
        <div className="rounded-lg px-4 py-2 relative"
             style={{ border: "1.5px solid rgba(30,64,120,0.8)", boxShadow: "0 2px 20px rgba(0,0,0,0.25)", background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)" }}>
          {titles.length > 0 && (
            <div className="h-0.5 -mx-4 -mt-2 mb-2 rounded-t-lg" style={{ background: "linear-gradient(90deg, var(--accent-red), var(--accent-gold), var(--accent-red))" }} />
          )}
          <Link href="/" className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold hover:underline transition-colors flex items-center gap-1"
                style={{ color: "var(--accent-gold)", fontFamily: "var(--font-table)" }}>
            ← Back to Dogs
          </Link>
          <h1 className="text-center" style={{
            fontFamily: "var(--font-table)", fontWeight: 700,
            fontSize: "clamp(1rem, 2.5vw, 1.5rem)", letterSpacing: "0.02em",
            color: titles.length > 0 ? "var(--accent-gold)" : "var(--text-primary)",
          }}>
            {dog.registered_name}
          </h1>
        </div>

        {/* ─── Photo + Details (like original site layout) ─── */}
        <div className="glow-gold rounded-xl overflow-hidden" style={{ border: "1.5px solid rgba(30,64,120,0.8)", boxShadow: "0 2px 20px rgba(0,0,0,0.25)", background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)" }}>
          <div className="flex flex-col sm:flex-row sm:items-stretch">
            {/* Photo — stretches to match text height */}
            <div className="w-48 md:w-56 flex-shrink-0 relative m-2">
              {photoUrl ? (
                <img src={photoUrl} alt={dog.registered_name}
                     className="w-full h-full rounded-md object-cover" />
              ) : (
                <div className="w-full h-full min-h-[120px] rounded-md flex items-center justify-center"
                     style={{ background: isMale ? "linear-gradient(135deg, #0c1929, #1a2e4a)" : "linear-gradient(135deg, #29101c, #3d1a2e)" }}>
                  <span className="text-2xl opacity-10" style={{ color: sexColor }}>{isMale ? "♂" : "♀"}</span>
                </div>
              )}
              {hoverPhoto && (
                <div className="absolute inset-0 z-10 transition-opacity duration-200 rounded-md overflow-hidden">
                  <img src={hoverPhoto} alt="Parent" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            {/* Details as plain text lines (like original) */}
            <div className="flex-1 py-2 pr-2.5 pl-0.5" style={{ fontFamily: "var(--font-table)" }}>
              <div className="space-y-0" style={{ fontSize: "13px", lineHeight: "1.6" }}>
                {dog.breeder && (
                  <div><span style={{ color: "var(--text-muted)", fontWeight: 700 }}>BREEDER: </span><span style={{ color: "var(--text-primary)" }}>{dog.breeder}</span></div>
                )}
                {dog.owner && (
                  <div><span style={{ color: "var(--text-muted)", fontWeight: 700 }}>OWNER: </span><span style={{ color: "var(--text-primary)" }}>{dog.owner}</span></div>
                )}
                {dog.registration_number && (
                  <div><span style={{ color: "var(--text-muted)", fontWeight: 700 }}>REGISTRATION #: </span><span style={{ color: "var(--text-primary)" }}>{dog.registration_number}</span></div>
                )}
                <div>
                  <span style={{ color: "var(--text-muted)", fontWeight: 700 }}>SEX: </span>
                  <span style={{ color: sexColor, fontWeight: 700 }}>{isMale ? "♂" : "♀"} {dog.sex?.toUpperCase()}</span>
                </div>
                {dog.color && (
                  <div><span style={{ color: "var(--text-muted)", fontWeight: 700 }}>COLOR: </span><span style={{ color: "var(--text-primary)" }}>{dog.color}</span></div>
                )}
                {dog.birthdate && (
                  <div><span style={{ color: "var(--text-muted)", fontWeight: 700 }}>DOB: </span><span style={{ color: "var(--text-primary)" }}>{dog.birthdate}</span></div>
                )}
                {dog.death_date && (
                  <div><span style={{ color: "var(--text-muted)", fontWeight: 700 }}>DEATH: </span><span style={{ color: "var(--text-primary)" }}>{dog.death_date}</span></div>
                )}
                {dog.chain_weight && (
                  <div><span style={{ color: "var(--text-muted)", fontWeight: 700 }}>CHAINWEIGHT: </span><span style={{ color: "var(--text-primary)" }}>{dog.chain_weight}</span></div>
                )}
                {dog.conditioned_weight && (
                  <div><span style={{ color: "var(--text-muted)", fontWeight: 700 }}>CONDITIONED WEIGHT: </span><span style={{ color: "var(--text-primary)" }}>{dog.conditioned_weight}</span></div>
                )}
                {dog.posted_date && (
                  <div><span style={{ color: "var(--text-muted)", fontWeight: 700 }}>POSTED: </span><span style={{ color: "var(--text-primary)" }}>{dog.posted_date}</span></div>
                )}
                {dog.modified_date && (
                  <div><span style={{ color: "var(--text-muted)", fontWeight: 700 }}>LAST MODIFIED: </span><span style={{ color: "var(--text-primary)" }}>{dog.modified_date}</span></div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ─── Sire / Dam links (separate section below) ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="glow-blue rounded-xl p-2.5"
               style={{ border: "1.5px solid rgba(30,64,120,0.8)", boxShadow: "0 2px 20px rgba(0,0,0,0.25)", background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)" }}
               onMouseEnter={() => { if (dog.sire?.photo_url) { const u = dog.sire.photo_url; setHoverPhoto(u.startsWith("http") ? u : `https://www.apbt.online-pedigrees.com/${u}`); } }}
               onMouseLeave={() => setHoverPhoto(null)}>
            <div className="text-[9px] uppercase tracking-wider mb-0.5 font-semibold"
                 style={{ color: "var(--male-color)", letterSpacing: "0.1em" }}>♂ Sire (Father)</div>
            {dog.sire ? (
              <Link href={`/pedigree/${dog.sire.id}`} className="text-sm font-bold hover:underline" style={{ color: getDogCardColor(dog.sire.name) }}>
                {dog.sire.name}
              </Link>
            ) : <span className="text-sm" style={{ color: "var(--text-muted)" }}>Unknown</span>}
          </div>
          <div className="glow-pink rounded-xl p-2.5"
               style={{ border: "1.5px solid rgba(30,64,120,0.8)", boxShadow: "0 2px 20px rgba(0,0,0,0.25)", background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)" }}
               onMouseEnter={() => { if (dog.dam?.photo_url) { const u = dog.dam.photo_url; setHoverPhoto(u.startsWith("http") ? u : `https://www.apbt.online-pedigrees.com/${u}`); } }}
               onMouseLeave={() => setHoverPhoto(null)}>
            <div className="text-[9px] uppercase tracking-wider mb-0.5 font-semibold"
                 style={{ color: "var(--female-color)", letterSpacing: "0.1em" }}>♀ Dam (Mother)</div>
            {dog.dam ? (
              <Link href={`/pedigree/${dog.dam.id}`} className="text-sm font-bold hover:underline" style={{ color: getDogCardColor(dog.dam.name) }}>
                {dog.dam.name}
              </Link>
            ) : <span className="text-sm" style={{ color: "var(--text-muted)" }}>Unknown</span>}
          </div>
        </div>

        {/* ─── Pedigree Tree (full width, contrasting frame) ─── */}
        <div className="glow-teal rounded-xl overflow-hidden" style={{
          border: "1.5px solid rgba(30,64,120,0.8)",
          boxShadow: "0 2px 20px rgba(0,0,0,0.25)"
        }}>
          <div className="flex items-center justify-between px-4 py-2" style={{
            background: "linear-gradient(135deg, #1c2740 0%, #161e30 50%, #1c2740 100%)",
            borderBottom: "2px solid rgba(96,165,250,0.2)"
          }}>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{
                background: "rgba(45,212,191,0.15)",
                border: "1px solid rgba(45,212,191,0.3)"
              }}>
                <span className="text-sm">🌳</span>
              </div>
              <span className="text-sm font-semibold" style={{
                color: "var(--accent-gold)",
                fontFamily: "var(--font-table)"
              }}>Pedigree</span>
              {(dog.pedigree?.length || 0) > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{
                  background: "rgba(212,168,85,0.15)",
                  color: "var(--accent-gold)",
                  fontFamily: "var(--font-mono)",
                  border: "1px solid rgba(212,168,85,0.3)"
                }}>
                  {dog.pedigree.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3" style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#9a7020" }}>
              <span>🐾 {dog.offspring?.length || dog.offspring_count || 0} offspring</span>
              <span>🐕 {(dog.siblings?.full?.length || 0) + (dog.siblings?.halfSire?.length || 0) + (dog.siblings?.halfDam?.length || 0)} siblings</span>
              <span>👁 {(dog.view_count || 0).toLocaleString()} views</span>
            </div>
          </div>
          <div className="p-3 md:p-4" style={{
            background: "#e8ecf1",
          }}>
            <PedigreeTree pedigree={dog.pedigree || []} dogName={dog.registered_name} dogId={dog.id} isMale={isMale} />
          </div>
        </div>

        {/* ─── Tab Bar Sections ─── */}
        {(() => {
          const tabs = [
            { key: "offspring", label: "Offspring", icon: "🐾", count: dog.offspring?.length || 0, color: "#fb923c", iconBg: "rgba(251,146,60,0.15)", iconBorder: "rgba(251,146,60,0.3)" },
            { key: "photos", label: "Photos", icon: "📷", count: photosCount, color: "#a78bfa", iconBg: "rgba(167,139,250,0.15)", iconBorder: "rgba(167,139,250,0.3)" },
            { key: "titles", label: "Titles", icon: "🏆", count: titledCount, color: "#d4a855", iconBg: "rgba(212,168,85,0.15)", iconBorder: "rgba(212,168,85,0.3)" },
            { key: "siblings", label: "Siblings", icon: "🐕", count: (dog.siblings?.full?.length || 0) + (dog.siblings?.halfSire?.length || 0) + (dog.siblings?.halfDam?.length || 0), color: "#34d399", iconBg: "rgba(52,211,153,0.15)", iconBorder: "rgba(52,211,153,0.3)" },
            { key: "pedstats", label: "PedStats", icon: "📊", count: dog.genetic_contributions?.length || 0, color: "#ef4444", iconBg: "rgba(239,68,68,0.15)", iconBorder: "rgba(239,68,68,0.3)" },
          ];
          const currentTab = activeTab;
          return (
            <div className="glow-teal rounded-xl overflow-hidden" style={{ border: "1.5px solid rgba(30,64,120,0.8)", boxShadow: "0 2px 20px rgba(0,0,0,0.25)", background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)" }}>
              {/* Tab headers */}
              <div className="flex" style={{
                background: "linear-gradient(180deg, #1a1a24 0%, #141418 100%)",
                borderBottom: "1px solid rgba(30,64,120,0.5)",
              }}>
                {tabs.map((tab) => (
                  <button key={tab.key}
                    onClick={() => setActiveTab(prev => prev === tab.key ? "" : tab.key)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 mx-1 my-1.5 rounded-xl transition-all cursor-pointer"
                    style={{
                      fontFamily: "var(--font-table)",
                      background: currentTab === tab.key ? `${tab.color}15` : "transparent",
                      border: currentTab === tab.key ? `1px solid ${tab.color}40` : "1px solid transparent",
                      boxShadow: currentTab === tab.key ? `0 0 12px ${tab.color}20` : "none",
                    }}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{
                      background: currentTab === tab.key ? `${tab.color}25` : "rgba(255,255,255,0.05)",
                      border: `1px solid ${currentTab === tab.key ? `${tab.color}50` : "rgba(255,255,255,0.1)"}`
                    }}>
                      <span className="text-sm">{tab.icon}</span>
                    </div>
                    <span className="text-sm font-semibold" style={{ color: currentTab === tab.key ? tab.color : "rgba(255,255,255,0.5)", fontFamily: "var(--font-table)" }}>{tab.label}</span>
                    {tab.count > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                            style={{ background: "rgba(212,168,85,0.15)", color: "var(--accent-gold)", fontFamily: "var(--font-mono)" }}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              {/* Tab content */}
              {currentTab && (
                <div className="px-4 pb-4">
                  <div className="pt-3">
                    {currentTab === "offspring" && <OffspringTab offspring={dog.offspring || []} />}
                    {currentTab === "photos" && <PhotosTab offspring={dog.offspring || []} />}
                    {currentTab === "titles" && <TitlesTab offspring={dog.offspring || []} />}
                    {currentTab === "siblings" && <SiblingsTab siblings={dog.siblings || { full: [], halfSire: [], halfDam: [] }} />}
                    {currentTab === "pedstats" && <PedStatsTab genetics={dog.genetic_contributions || []} />}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ─── Footer ─── */}
        <footer className="text-center py-8 mt-8" style={{ borderTop: "1px solid var(--border)" }}>
          <div className="flex items-center justify-center gap-2 mb-3">
            <img src={LOGO} alt="Logo" className="w-6 h-6 rounded" />
            <span style={{
              fontFamily: "var(--font-table)", fontWeight: 700, fontSize: "14px",
              background: "linear-gradient(135deg, #e8c86e, #d4a855)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>Pedigree Platform</span>
          </div>
          <p className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)" }}>
            The modern pedigree hub for breeders, owners, and enthusiasts.
          </p>
          <div className="flex items-center justify-center gap-4 mt-3">
            <Link href="/privacy" className="text-xs hover:underline" style={{ color: "var(--text-muted)" }}>Privacy</Link>
            <Link href="/terms" className="text-xs hover:underline" style={{ color: "var(--text-muted)" }}>Terms</Link>
            <Link href="/contact" className="text-xs hover:underline" style={{ color: "var(--text-muted)" }}>Contact</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
