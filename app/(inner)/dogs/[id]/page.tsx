"use client";

import { useEffect, useState } from "react";
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
  registration_number: string | null;
  sire: { id: number; name: string; sex: string } | null;
  dam: { id: number; name: string; sex: string } | null;
  sire_id: number | null; dam_id: number | null;
  pedigree: Ancestor[];
  offspring: Offspring[];
  siblings: { full: Sibling[]; halfSire: Sibling[]; halfDam: Sibling[]; };
  genetic_contributions: Genetic[];
}

const TC: Record<string, string> = {
  "GR CH": "#fbbf24", CH: "#60a5fa", ROM: "#34d399", POR: "#a78bfa",
  "1XW": "#f97316", "2XW": "#f97316", "3XW": "#f97316",
  "4XW": "#ef4444", "5XW": "#ef4444", "1XL": "#fb7185",
};

/* ─── Helpers ─── */
function getXWColor(name: string): string | null {
  const m = (name || "").toUpperCase().match(/\b(\d+)X[WL]\b/);
  if (!m) return null;
  const n = parseInt(m[1]);
  if (n === 1) return "rgba(45,212,191,0.95)";
  if (n === 2) return "rgba(251,146,60,0.95)";
  if (n === 4) return "rgba(52,211,153,0.95)";
  if (n >= 5) return "rgba(192,132,252,0.95)";
  return null;
}

function DogLink({ dogId, name, isMale }: { dogId: number | null; name: string; isMale?: boolean }) {
  const nameUpper = (name || "").toUpperCase();
  const isGrCh = /\bGR\s*CH\b/.test(nameUpper);
  const isCh = !isGrCh && /\bCH\b/.test(nameUpper);
  const xwColor = !isGrCh && !isCh ? getXWColor(name) : null;
  const hasTitle = isGrCh || isCh || xwColor || /\b\d+X[WL]\b/i.test(nameUpper);
  const color = isGrCh ? "rgba(96,165,250,0.95)" : isCh ? "rgba(252,129,129,0.95)" : xwColor ? xwColor : !hasTitle ? "rgba(176,190,206,0.85)" : isMale === true ? "var(--male-color)" : isMale === false ? "var(--female-color)" : "var(--accent-gold)";
  if (!dogId) return <span className="text-sm" style={{ color: "var(--text-muted)" }}>{name}</span>;
  return (
    <Link href={`/dogs/${dogId}`} className="text-sm hover:underline" style={{ color }}>
      {name}
    </Link>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-center py-2" style={{ borderBottom: "1px solid var(--border)" }}>
      <span className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</span>
      <span className="text-sm font-medium text-right" style={{ color: "var(--text-primary)" }}>{value}</span>
    </div>
  );
}

/* ─── Pedigree Tree ─── */
function PedigreeTree({ pedigree, dogName }: { pedigree: Ancestor[]; dogName: string }) {
  const byGen: Record<number, Ancestor[]> = {};
  pedigree.forEach((a) => {
    if (!byGen[a.generation]) byGen[a.generation] = [];
    byGen[a.generation].push(a);
  });

  const gens = Object.keys(byGen).map(Number).sort();
  if (gens.length === 0)
    return <p className="text-sm" style={{ color: "var(--text-muted)" }}>No pedigree data available</p>;

  const maxGen = Math.min(Math.max(...gens), 4);
  const genLabels = ["Parents", "Grandparents", "Great-Grandparents", "GG-Grandparents"];

  return (
    <div className="overflow-x-auto">
      <div className="text-center mb-2">
        <h3 style={{
          fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "13px", letterSpacing: "0.06em",
          textTransform: "uppercase", color: "var(--accent-gold)"
        }}>{maxGen} Generation Pedigree</h3>
      </div>
      <div className="flex gap-px mb-1 min-w-[800px]">
        <div className="w-40 flex-shrink-0 text-[9px] uppercase tracking-wider px-1.5 py-0.5"
             style={{ color: "var(--text-muted)" }}>Dog</div>
        {gens.filter(g => g <= maxGen).map((g) => (
          <div key={g} className="flex-1 text-[9px] uppercase tracking-wider px-1.5 py-0.5 text-center"
               style={{ color: "var(--text-muted)" }}>{genLabels[g - 1] || `Gen ${g}`}</div>
        ))}
      </div>
      <div className="flex gap-px min-w-[800px]">
        <div className="w-40 flex-shrink-0 flex items-center">
          <div className="w-full rounded-lg px-2 py-1.5 text-xs font-bold"
               style={{ background: "var(--bg-elevated)", border: "2px solid var(--accent-gold)", color: "var(--accent-gold)" }}>
            {dogName}
          </div>
        </div>
        {gens.filter(g => g <= maxGen).map((gen) => {
          const ancestors = byGen[gen] || [];
          const rows = Math.pow(2, gen);
          return (
            <div key={gen} className="flex-1 flex flex-col gap-px">
              {ancestors.slice(0, rows).map((a, i) => {
                const isMale = a.position?.toLowerCase().includes("sire") || a.position?.includes("_S_") || a.css_class?.includes("male") || i % 2 === 0;
                const nameUp = (a.ancestor_name || "").toUpperCase();
                const isGrCh = /\bGR\s*CH\b/.test(nameUp);
                const isCh = !isGrCh && /\bCH\b/.test(nameUp);
                const xwC = !isGrCh && !isCh ? getXWColor(a.ancestor_name || "") : null;
                const xwM = nameUp.match(/\b(\d+)X[WL]\b/); const xwN = xwM ? parseInt(xwM[1]) : 0;
                const xwBgMap: Record<number,string> = {1:"rgba(45,212,191,0.12)",2:"rgba(251,146,60,0.12)",4:"rgba(52,211,153,0.12)"};
                const xwBdMap: Record<number,string> = {1:"rgba(45,212,191,0.6)",2:"rgba(251,146,60,0.6)",4:"rgba(52,211,153,0.6)"};
                const cellBg = isGrCh ? "linear-gradient(135deg, rgba(59,130,246,0.18), rgba(59,130,246,0.06))" : isCh ? "linear-gradient(135deg, rgba(239,68,68,0.18), rgba(239,68,68,0.06))" : xwC && xwN !== 3 ? `linear-gradient(135deg, ${xwN >= 5 ? "rgba(192,132,252,0.12)" : xwBgMap[xwN] || "rgba(35,35,38,0.95)"}, rgba(28,28,32,0.9))` : "linear-gradient(135deg, rgba(176,190,206,0.08), rgba(176,190,206,0.03))";
                const cellBorder = isGrCh ? "rgba(59,130,246,0.7)" : isCh ? "rgba(239,68,68,0.7)" : xwC && xwN !== 3 ? (xwN >= 5 ? "rgba(192,132,252,0.6)" : xwBdMap[xwN] || "rgba(212,175,55,0.7)") : "rgba(176,190,206,0.4)";
                const cellText = isGrCh ? "rgba(96,165,250,0.95)" : isCh ? "rgba(252,129,129,0.95)" : xwC && xwN !== 3 ? xwC : "rgba(176,190,206,0.85)";
                return (
                  <div key={`${gen}-${i}`}
                       className="flex-1 rounded px-1 py-px text-xs leading-tight flex items-center"
                       style={{
                         background: cellBg,
                         borderLeft: `2px solid ${cellBorder}`,
                         minHeight: gen <= 2 ? "28px" : "18px",
                       }}>
                    {a.ancestor_id ? (
                      <Link href={`/dogs/${a.ancestor_id}`}
                            className="hover:underline font-medium truncate"
                            style={{ color: cellText, fontSize: gen >= 3 ? "9px" : "10px", lineHeight: 1.1 }}>
                        {a.ancestor_name}
                      </Link>
                    ) : (
                      <span className="truncate" style={{ color: "var(--text-secondary)", fontSize: gen >= 3 ? "9px" : "10px", lineHeight: 1.1 }}>
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
  );
}

/* ─── Offspring Tab ─── */
function OffspringTab({ offspring }: { offspring: Offspring[] }) {
  if (!offspring.length)
    return <p className="text-sm py-8 text-center" style={{ color: "var(--text-muted)" }}>No offspring recorded</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            <th className="text-left px-2 py-1 text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Offspring</th>
            <th className="text-left px-2 py-1 text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Sire</th>
            <th className="text-left px-2 py-1 text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Dam</th>
          </tr>
        </thead>
        <tbody>
          {offspring.map((o, i) => (
            <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}
                className="hover:bg-[var(--bg-hover)] transition-colors">
              <td className="px-2 py-0.5" style={{ fontSize: "10px", fontWeight: 600, lineHeight: 1.1 }}>
                <DogLink dogId={o.offspring_id} name={o.offspring_name} />
              </td>
              <td className="px-2 py-0.5" style={{ fontSize: "10px", fontWeight: 600, lineHeight: 1.1 }}>
                <DogLink dogId={o.sire_id} name={o.sire_name || "—"} isMale={true} />
              </td>
              <td className="px-2 py-0.5" style={{ fontSize: "10px", fontWeight: 600, lineHeight: 1.1 }}>
                <DogLink dogId={o.dam_id} name={o.dam_name || "—"} isMale={false} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Siblings Tab ─── */
function SiblingsTab({ siblings }: { siblings: Dog["siblings"] }) {
  const total = (siblings.full?.length || 0) + (siblings.halfSire?.length || 0) + (siblings.halfDam?.length || 0);
  if (!total) return <p className="text-sm py-8 text-center" style={{ color: "var(--text-muted)" }}>No siblings recorded</p>;

  const Section = ({ title, list, color }: { title: string; list: Sibling[]; color: string }) => {
    if (!list?.length) return null;
    return (
      <div className="mb-4">
        <h4 className="text-[10px] uppercase tracking-wider font-medium mb-2 flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
          {title}
          <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: "var(--bg-elevated)", color, fontFamily: "var(--font-mono)" }}>
            {list.length}
          </span>
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5">
          {list.map((s, i) => (
            <div key={i} className="rounded-md px-2.5 py-1.5 text-xs" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
              <DogLink dogId={s.sibling_id} name={s.sibling_name} />
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div>
      <Section title="Full Siblings" list={siblings.full} color="var(--accent-gold)" />
      <Section title="Half Siblings (Same Sire)" list={siblings.halfSire} color="var(--male-color)" />
      <Section title="Half Siblings (Same Dam)" list={siblings.halfDam} color="var(--female-color)" />
    </div>
  );
}

/* ─── PedStats Tab ─── */
function PedStatsTab({ genetics }: { genetics: Genetic[] }) {
  if (!genetics.length)
    return <p className="text-sm py-8 text-center" style={{ color: "var(--text-muted)" }}>No genetic contribution data</p>;

  const maxPct = genetics[0]?.percentage || 1;

  return (
    <div>
      <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
        Genetic contribution of ancestors to this dog&apos;s pedigree
      </p>
      <div className="space-y-2">
        {genetics.map((g, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-48 flex-shrink-0 truncate">
              <DogLink dogId={g.ancestor_id} name={g.ancestor_name} />
            </div>
            <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.max((g.percentage / maxPct) * 100, 2)}%`,
                  background: g.percentage >= 20
                    ? "var(--accent-red)"
                    : g.percentage >= 10
                    ? "var(--accent-gold)"
                    : "var(--accent-blue)",
                }}
              />
            </div>
            <span className="w-16 text-right text-xs font-mono font-bold"
                  style={{
                    color: g.percentage >= 20 ? "var(--accent-red)" : g.percentage >= 10 ? "var(--accent-gold)" : "var(--text-primary)",
                  }}>
              {g.percentage.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function DogDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [dog, setDog] = useState<Dog | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pedigree" | "offspring" | "siblings" | "pedstats">("pedigree");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/dogs/${id}`)
      .then((r) => r.json())
      .then((data) => { setDog(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading)
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex items-center gap-3" style={{ color: "var(--text-muted)" }}>
          <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
               style={{ borderColor: "var(--accent-gold)", borderTopColor: "transparent" }} />
          Loading...
        </div>
      </div>
    );

  if (!dog || (dog as any).error)
    return (
      <div className="text-center py-32">
        <div className="text-4xl mb-3">🐕</div>
        <p style={{ color: "var(--accent-red)" }}>Dog not found</p>
        <Link href="/dogs" className="text-sm mt-3 inline-block underline" style={{ color: "var(--accent-gold)" }}>Back to Dogs</Link>
      </div>
    );

  const isMale = dog.sex === "MALE" || dog.sex === "M";
  const originalUrl = `https://www.apbt.online-pedigrees.com/modules.php?name=Public&file=printPedigree&dog_id=${dog.id}`;

  const photoUrl = dog.photo_url
    ? dog.photo_url.startsWith("http")
      ? dog.photo_url
      : `https://www.apbt.online-pedigrees.com/${dog.photo_url}`
    : null;

  // Extract titles from name (CH, ROM, GR CH, etc.)
  const titlePatterns = ["GR CH", "CH", "ROM", "POR"];
  const titles = titlePatterns.filter(t => dog.registered_name?.toUpperCase().includes(t));

  const tabs = [
    { key: "pedigree" as const, label: "Pedigree", count: dog.pedigree?.length || 0 },
    { key: "offspring" as const, label: "Offspring", count: dog.offspring?.length || 0 },
    { key: "siblings" as const, label: "Siblings", count: (dog.siblings?.full?.length || 0) + (dog.siblings?.halfSire?.length || 0) + (dog.siblings?.halfDam?.length || 0) },
    { key: "pedstats" as const, label: "PedStats", count: dog.genetic_contributions?.length || 0 },
  ];

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
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
      `}</style>
      <Link href="/dogs" className="inline-flex items-center gap-1 text-xs hover:underline" style={{ color: "var(--text-secondary)" }}>
        ← Back to Dogs
      </Link>

      {/* Hero */}
      <div className="glow-gold rounded-xl overflow-hidden animate-reveal"
           style={{ border: "1.5px solid rgba(30,64,120,0.8)", boxShadow: "0 2px 20px rgba(0,0,0,0.25)", background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)" }}>
        <div className="flex flex-col md:flex-row">
          <div className="md:w-56 lg:w-64 flex-shrink-0">
            {photoUrl ? (
              <img src={photoUrl} alt={dog.registered_name} className="w-full h-48 md:h-full object-cover" />
            ) : (
              <div className="w-full h-48 md:h-full min-h-[160px] flex items-center justify-center"
                   style={{ background: isMale ? "linear-gradient(135deg, #1a2540, #1e3a5f)" : "linear-gradient(135deg, #2a1a30, #4a2040)" }}>
                <span className="text-5xl opacity-15" style={{ color: isMale ? "var(--male-color)" : "var(--female-color)" }}>
                  {isMale ? "♂" : "♀"}
                </span>
              </div>
            )}
          </div>

          <div className="flex-1 p-4 md:p-5">
            {titles.length > 0 && (
              <div className="flex gap-1.5 flex-wrap mb-2">
                {titles.map((t: string) => (
                  <span key={t} className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                        style={{ background: "rgba(212,168,85,0.12)", color: TC[t] || "var(--accent-gold)" }}>{t}</span>
                ))}
              </div>
            )}

            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", lineHeight: 1.1, color: "var(--text-primary)" }}>
              {dog.registered_name}
            </h1>

            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {dog.sex && (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full"
                      style={{ background: isMale ? "rgba(91,141,239,0.12)" : "rgba(212,107,163,0.12)", color: isMale ? "var(--male-color)" : "var(--female-color)" }}>
                  {isMale ? "♂" : "♀"} {dog.sex}
                </span>
              )}
              {dog.color && <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}>{dog.color}</span>}
              {dog.view_count > 0 && (
                <span className="text-[10px]" style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                  {dog.view_count.toLocaleString()} views
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5 mt-3">
              <div className="glow-blue rounded-xl p-2.5" style={{ border: "1.5px solid rgba(30,64,120,0.8)", boxShadow: "0 2px 20px rgba(0,0,0,0.25)", background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)" }}>
                <div className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>Sire (Father)</div>
                {dog.sire ? (
                  <Link href={`/dogs/${dog.sire.id}`} className="text-xs font-medium hover:underline" style={{ color: "var(--male-color)" }}>
                    ♂ {dog.sire.name}
                  </Link>
                ) : <span className="text-xs" style={{ color: "var(--text-muted)" }}>Unknown</span>}
              </div>
              <div className="glow-pink rounded-xl p-2.5" style={{ border: "1.5px solid rgba(30,64,120,0.8)", boxShadow: "0 2px 20px rgba(0,0,0,0.25)", background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)" }}>
                <div className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>Dam (Mother)</div>
                {dog.dam ? (
                  <Link href={`/dogs/${dog.dam.id}`} className="text-xs font-medium hover:underline" style={{ color: "var(--female-color)" }}>
                    ♀ {dog.dam.name}
                  </Link>
                ) : <span className="text-xs" style={{ color: "var(--text-muted)" }}>Unknown</span>}
              </div>
            </div>

            <div className="flex items-center gap-3 mt-3 text-[10px] flex-wrap" style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
              <span>{dog.reg_number}</span>
              {dog.registration_number && <span>Reg#: {dog.registration_number}</span>}
              {dog.posted_date && <span>Posted: {dog.posted_date}</span>}
              {dog.modified_date && <span>Modified: {dog.modified_date}</span>}
              <a href={originalUrl} target="_blank" rel="noopener" className="hover:underline" style={{ color: "var(--accent-blue)" }}>
                View Original ↗
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Details + Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div>
          <div className="glow-teal rounded-xl p-4" style={{ border: "1.5px solid rgba(30,64,120,0.8)", boxShadow: "0 2px 20px rgba(0,0,0,0.25)", background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)" }}>
            <h3 className="text-[10px] uppercase tracking-wider font-medium mb-3" style={{ color: "var(--text-muted)" }}>Details</h3>
            <InfoRow label="Color" value={dog.color} />
            <InfoRow label="Date of Birth" value={dog.birthdate} />
            <InfoRow label="Date of Death" value={dog.death_date} />
            <InfoRow label="Chain Weight" value={dog.chain_weight} />
            <InfoRow label="Cond. Weight" value={dog.conditioned_weight} />
            <InfoRow label="Breeder" value={dog.breeder} />
            <InfoRow label="Owner" value={dog.owner} />
            {dog.description && (
              <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Description</div>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{dog.description}</p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="flex gap-1 mb-3 rounded-xl p-1" style={{ border: "1.5px solid rgba(30,64,120,0.8)", background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)" }}>
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1.5"
                style={{
                  background: tab === t.key ? "var(--bg-elevated)" : "transparent",
                  color: tab === t.key ? "var(--accent-gold)" : "var(--text-muted)",
                  border: tab === t.key ? "1px solid var(--border-bright)" : "1px solid transparent",
                }}
              >
                {t.label}
                {t.count > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "var(--bg-deep)", fontFamily: "var(--font-mono)" }}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="glow-purple rounded-xl p-4" style={{ border: "1.5px solid rgba(30,64,120,0.8)", boxShadow: "0 2px 20px rgba(0,0,0,0.25)", background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)" }}>
            {tab === "pedigree" && <PedigreeTree pedigree={dog.pedigree || []} dogName={dog.registered_name} />}
            {tab === "offspring" && <OffspringTab offspring={dog.offspring || []} />}
            {tab === "siblings" && <SiblingsTab siblings={dog.siblings || { full: [], halfSire: [], halfDam: [] }} />}
            {tab === "pedstats" && <PedStatsTab genetics={dog.genetic_contributions || []} />}
          </div>
        </div>
      </div>
    </div>
  );
}
