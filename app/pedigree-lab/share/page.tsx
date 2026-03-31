"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getDogColor } from "@/app/utils/colors";

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */
function riskColor(coi: number): string {
  if (coi < 5) return "#22c55e";
  if (coi < 10) return "#eab308";
  if (coi < 15) return "#f97316";
  if (coi < 20) return "#ef4444";
  return "#dc2626";
}

function calcCOIFromTree(rows: { gen: number; pos: number; dog_id: number | null; name: string }[]): number {
  if (!rows || rows.length === 0) return 0;
  const sireAncestors: Map<number, number[]> = new Map();
  const damAncestors: Map<number, number[]> = new Map();
  for (const row of rows) {
    if (!row.dog_id || row.gen < 1) continue;
    const halfGen = Math.pow(2, row.gen - 1);
    const isSireSide = row.pos < halfGen;
    const map = isSireSide ? sireAncestors : damAncestors;
    if (!map.has(row.dog_id)) map.set(row.dog_id, []);
    map.get(row.dog_id)!.push(row.gen);
  }
  let coi = 0;
  for (const [dogId, sireGens] of sireAncestors) {
    const damGens = damAncestors.get(dogId);
    if (!damGens) continue;
    for (const sg of sireGens) {
      for (const dg of damGens) {
        coi += Math.pow(0.5, sg + dg + 1);
      }
    }
  }
  return coi * 100;
}

/* ------------------------------------------------------------------ */
/* Share Preview Inner                                                */
/* ------------------------------------------------------------------ */
function SharePreviewInner() {
  const searchParams = useSearchParams();
  const sireId = searchParams.get("sire") || "0";
  const damId = searchParams.get("dam") || "0";
  const name = searchParams.get("name") || "Pedigree Preview";

  const [tree, setTree] = useState<{ gen: number; pos: number; dog_id: number | null; name: string; sex: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [coi, setCoi] = useState(0);

  useEffect(() => {
    if (sireId === "0" && damId === "0") {
      setLoading(false);
      return;
    }

    const fetchTree = fetch(`/api/dogs/pedigree-tree?sire_id=${sireId}&dam_id=${damId}&gens=5`)
      .then((r) => r.json())
      .then((data) => {
        setTree(data.rows || []);
      })
      .catch(() => {});

    const fetchCoi = fetch(`/api/dogs/pedigree-tree?sire_id=${sireId}&dam_id=${damId}&gens=6`)
      .then((r) => r.json())
      .then((data) => {
        const c = calcCOIFromTree(data.rows || []);
        setCoi(c);
      })
      .catch(() => {});

    Promise.all([fetchTree, fetchCoi]).finally(() => setLoading(false));
  }, [sireId, damId]);

  function getCellStyle(cellName: string) {
    const n = (cellName || "").toUpperCase();
    const isGrCh = /\bGR\s*CH\b/.test(n);
    const isCh = !isGrCh && /(?:^|\s|\()CH\b/.test(n);
    const isRom = /\bROM\b/.test(n);
    const isPor = /\bPOR\b/.test(n);
    const xwMatch = n.match(/\b(\d+)X[WL]\b/);
    const xwNum = xwMatch ? parseInt(xwMatch[1]) : 0;
    const isChampion = isGrCh || isCh;

    const cellTint = isGrCh
      ? "rgba(96,165,250,0.15)"
      : isCh ? "rgba(252,129,129,0.15)"
      : isRom ? "rgba(34,211,238,0.15)"
      : isPor ? "rgba(167,139,250,0.15)"
      : xwNum === 1 ? "rgba(45,212,191,0.15)"
      : xwNum === 2 ? "rgba(251,146,60,0.15)"
      : xwNum === 3 ? "rgba(212,168,85,0.15)"
      : xwNum === 4 ? "rgba(244,114,182,0.15)"
      : xwNum >= 5 ? "rgba(192,132,252,0.15)"
      : "rgba(58,58,58,0.15)";
    const cellBg = `linear-gradient(135deg, ${cellTint}, #FAF7F2)`;

    const cellBorder = isGrCh ? "#1d5bbf"
      : isCh ? "#c02828"
      : isRom ? "#0d7468"
      : isPor ? "#6d30b0"
      : xwNum === 1 ? "#0d7468"
      : xwNum === 2 ? "#b45a0a"
      : xwNum === 3 ? "#8a6518"
      : xwNum === 4 ? "#b03878"
      : xwNum >= 5 ? "#6d30b0"
      : "#3a3a3a";

    const cellTextColor = isGrCh ? "#1d5bbf"
      : isCh ? "#c02828"
      : isRom ? "#0d7468"
      : isPor ? "#6d30b0"
      : xwNum === 1 ? "#0d7468" : xwNum === 2 ? "#b45a0a" : xwNum === 3 ? "#8a6518" : xwNum === 4 ? "#b03878" : xwNum >= 5 ? "#6d30b0"
      : "#3a3a3a";

    return { cellBg, cellBorder, cellTextColor, isChampion };
  }

  const hasGen5 = tree.some((r) => r.gen === 5);

  function renderCell(dog: { name: string; dog_id: number | null } | undefined, gen: number, rSpan: number, key: string) {
    const cellName = dog?.name || "Unknown";
    const { cellBg, cellBorder, cellTextColor, isChampion } = getCellStyle(cellName);
    const fontSize = hasGen5
      ? (gen <= 1 ? 11 : gen === 2 ? 10 : gen === 3 ? 10 : 9.5)
      : (gen <= 2 ? 13 : gen === 3 ? 12 : 11);
    return (
      <td
        key={key}
        rowSpan={rSpan > 1 ? rSpan : undefined}
        className="align-middle relative"
        style={{
          background: cellBg,
          border: "2px solid #EDE4D5",
          borderLeftColor: cellBorder,
          borderLeftWidth: hasGen5 ? "3px" : "4px",
          borderRadius: 8,
          padding: hasGen5 ? "3px 6px" : "6px 10px",
          minHeight: hasGen5 ? 20 : 40,
          fontSize,
          fontWeight: isChampion ? 700 : 600,
          color: cellTextColor,
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          lineHeight: 1.1,
        }}
      >
        {isChampion && (
          <span
            className="absolute -top-0.5 -right-0.5 flex items-center justify-center rounded-lg"
            style={{
              fontSize: hasGen5 ? 7 : 9,
              color: "#8a6518",
              background: "#F5EDE0",
              width: hasGen5 ? 12 : 15,
              height: hasGen5 ? 12 : 15,
              border: "1px solid #C9B29F",
            }}
          >
            ★
          </span>
        )}
        {dog?.dog_id ? (
          <a href={`/pedigree/${dog.dog_id}`} className="hover:underline" style={{ color: cellTextColor, textDecoration: "none" }}>
            {cellName}
          </a>
        ) : cellName}
      </td>
    );
  }

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#EDE4D5" }}
      >
        <div className="text-center">
          <div className="text-lg font-bold" style={{ color: "#1C1C1C", fontFamily: "var(--font-display)" }}>
            Loading Pedigree...
          </div>
        </div>
      </div>
    );
  }

  if (tree.length === 0) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#EDE4D5" }}
      >
        <div className="text-center">
          <div className="text-lg font-bold mb-4" style={{ color: "#1C1C1C", fontFamily: "var(--font-display)" }}>
            Pedigree not found
          </div>
          <Link
            href="/pedigree-lab"
            className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{
              background: "#1C1C1C",
              color: "#FAF7F2",
            }}
          >
            Go to Pedigree Lab
          </Link>
        </div>
      </div>
    );
  }

  const TOTAL_ROWS = hasGen5 ? 32 : 16;
  const genKeys = hasGen5 ? [1, 2, 3, 4, 5] : [1, 2, 3, 4];
  const genData: Record<number, { pos: number; name: string; dog_id: number | null; sex: string | null }[]> = {};
  for (const g of genKeys) genData[g] = [];
  for (const row of tree) {
    if (genData[row.gen]) {
      genData[row.gen].push({ pos: row.pos, name: row.name, dog_id: row.dog_id, sex: row.sex });
    }
  }
  for (const g of genKeys) {
    genData[g].sort((a, b) => a.pos - b.pos);
  }

  const tableRows: React.ReactNode[] = [];
  if (hasGen5) {
    for (let r = 0; r < TOTAL_ROWS; r++) {
      const cells: React.ReactNode[] = [];
      if (r % 16 === 0) cells.push(renderCell(genData[1]?.[Math.floor(r / 16)], 1, 16, "g1"));
      if (r % 8 === 0) cells.push(renderCell(genData[2]?.[Math.floor(r / 8)], 2, 8, "g2"));
      if (r % 4 === 0) cells.push(renderCell(genData[3]?.[Math.floor(r / 4)], 3, 4, "g3"));
      if (r % 2 === 0) cells.push(renderCell(genData[4]?.[Math.floor(r / 2)], 4, 2, "g4"));
      cells.push(renderCell(genData[5]?.[r], 5, 1, "g5"));
      tableRows.push(<tr key={r}>{cells}</tr>);
    }
  } else {
    for (let r = 0; r < TOTAL_ROWS; r++) {
      const cells: React.ReactNode[] = [];
      if (r % 8 === 0) cells.push(renderCell(genData[1]?.[Math.floor(r / 8)], 1, 8, "g1"));
      if (r % 4 === 0) cells.push(renderCell(genData[2]?.[Math.floor(r / 4)], 2, 4, "g2"));
      if (r % 2 === 0) cells.push(renderCell(genData[3]?.[Math.floor(r / 2)], 3, 2, "g3"));
      cells.push(renderCell(genData[4]?.[r], 4, 1, "g4"));
      tableRows.push(<tr key={r}>{cells}</tr>);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: "#EDE4D5" }}>
      {/* Pedigree Card */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: "#FAF7F2",
            border: "2px solid #C9B29F",
          }}
        >
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
                style={{ fontFamily: "var(--font-display)", color: "#1C1C1C" }}
              >
                Pedigree Preview
              </span>
              <span className="text-xs" style={{ color: getDogColor(name) }}>
                — {decodeURIComponent(name)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="text-[10px] uppercase tracking-widest font-bold"
                style={{ color: riskColor(coi), fontFamily: "var(--font-table)" }}
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

          {/* Table */}
          <div className="overflow-auto" style={{ background: "#FAFAFA" }}>
            <table
              className="w-full"
              style={{
                borderCollapse: "separate",
                borderSpacing: "3px 3px",
                fontFamily: "var(--font-table)",
                tableLayout: "fixed",
                padding: 4,
              }}
            >
              <thead>
                <tr>
                  {(hasGen5 ? ["First", "Second", "Third", "Fourth", "Fifth"] : ["First", "Second", "Third", "Fourth"]).map((label) => (
                    <th
                      key={label}
                      className="text-center text-[11px] uppercase tracking-widest font-bold py-2"
                      style={{
                        background: "#1C1C1C",
                        color: "#FAF7F2",
                        fontFamily: "var(--font-display)",
                        borderRadius: 4,
                      }}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>{tableRows}</tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-4">
          <span
            className="text-[10px]"
            style={{ color: "#6B7280", fontFamily: "var(--font-table)" }}
          >
            Shared from{" "}
            <a href="https://pedigreeplatform.com" style={{ color: "#B8860B", textDecoration: "none" }}>
              PedigreePlatform.com
            </a>
          </span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page Wrapper                                                       */
/* ------------------------------------------------------------------ */
export default function SharePreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ background: "#EDE4D5" }}>
          <div className="text-lg font-bold" style={{ color: "#1C1C1C", fontFamily: "var(--font-display)" }}>
            Loading...
          </div>
        </div>
      }
    >
      <SharePreviewInner />
    </Suspense>
  );
}
