"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getDogColor } from "@/app/utils/colors";

const LOGO = "https://i.imgur.com/svXPGXg.png";

interface PedigreeItem {
  id: number;
  name: string;
  prefix: string;
  suffix_wins: string;
  suffix_losses: string;
  suffix_draws: string;
  suffix_honors: string;
  dob: string;
  sex: string;
  color: string;
  continent: string;
  country: string;
  breeder: string;
  owner: string;
  conditioned_weight: string;
  photo_path: string;
  view_count: number;
  date_posted: string;
  last_modified: string;
  journal_json: string;
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
  vaccines: { name: string; checked: boolean; date: string }[];
  worming: WormingEntry[];
  notes: string;
}

function buildDisplayName(p: PedigreeItem): string {
  const parts: string[] = [];
  if (p.prefix) parts.push(p.prefix);
  parts.push(p.name);
  const suffixes: string[] = [];
  if (p.suffix_wins) suffixes.push(`(${p.suffix_wins})`);
  if (p.suffix_losses) suffixes.push(`(${p.suffix_losses})`);
  if (p.suffix_draws) suffixes.push(`(${p.suffix_draws})`);
  if (p.suffix_honors) suffixes.push(p.suffix_honors);
  if (suffixes.length) parts.push(suffixes.join(" "));
  return parts.join(" ");
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch (_e) { return iso; }
}

function daysUntil(iso: string): number | null {
  if (!iso) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(iso + "T00:00:00");
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getUpcomingReminders(journal: JournalData): { label: string; dueDate: string; daysLeft: number }[] {
  const reminders: { label: string; dueDate: string; daysLeft: number }[] = [];

  // Rabies
  if (journal.rabiesNextDue) {
    const days = daysUntil(journal.rabiesNextDue);
    if (days !== null && days <= 30) {
      reminders.push({ label: "Rabies", dueDate: journal.rabiesNextDue, daysLeft: days });
    }
  }

  // Worming entries with remindMe
  for (const entry of journal.worming || []) {
    if (entry.remindMe && entry.nextDue) {
      const days = daysUntil(entry.nextDue);
      if (days !== null && days <= 14) {
        const typeName = entry.type === "Other" ? entry.otherType || "Worming" : entry.type;
        reminders.push({ label: typeName, dueDate: entry.nextDue, daysLeft: days });
      }
    }
  }

  return reminders.sort((a, b) => a.daysLeft - b.daysLeft);
}

export default function MyPedigreesPage() {
  const router = useRouter();
  const [pedigrees, setPedigrees] = useState<PedigreeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: number; username: string } | null>(null);

  useEffect(() => {
    try {
      const token = localStorage.getItem("token");
      const userStr = localStorage.getItem("user");
      if (!token || !userStr) {
        router.replace("/login");
        return;
      }
      const u = JSON.parse(userStr);
      setUser(u);

      fetch(`/api/pedigrees/my?userId=${u.id}`)
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setPedigrees(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } catch (_e) {
      router.replace("/login");
    }
  }, [router]);

  const parseJournal = (json: string): JournalData => {
    try { return JSON.parse(json || "{}"); }
    catch { return { rabiesDate: "", rabiesNextDue: "", avidChip: "", vaccines: [], worming: [], notes: "" }; }
  };

  // Gather all reminders across all pedigrees
  const allReminders: { dogName: string; pedId: number; label: string; dueDate: string; daysLeft: number }[] = [];
  for (const p of pedigrees) {
    const journal = parseJournal(p.journal_json);
    const reminders = getUpcomingReminders(journal);
    for (const r of reminders) {
      allReminders.push({ dogName: buildDisplayName(p), pedId: p.id, ...r });
    }
  }

  return (
    <div className="min-h-screen" style={{ background: "#EDE4D5" }}>
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-black uppercase tracking-widest"
            style={{
              fontFamily: "var(--font-display)",
              color: "#1C1C1C",
              
            }}>
            My Pedigrees
          </h1>
          <p className="text-xs mt-1" style={{ color: "#6B7280", fontFamily: "var(--font-table)" }}>
            Manage your published pedigrees and journals
          </p>
        </div>

        {/* Reminders Banner */}
        {allReminders.length > 0 && (
          <div className="rounded-xl p-4" style={{
            background: "linear-gradient(135deg, rgba(234,179,8,0.08), rgba(234,179,8,0.03), #FAFAFA)",
            border: "1.5px solid rgba(234,179,8,0.3)",
          }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm">🔔</span>
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#eab308", fontFamily: "var(--font-table)" }}>
                Upcoming Reminders
              </span>
            </div>
            <div className="space-y-2">
              {allReminders.map((r, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2"
                  style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(234,179,8,0.15)" }}>
                  <div className="flex items-center gap-2">
                    <Link href={`/pedigree/custom/${r.pedId}`} className="text-xs font-bold hover:underline"
                      style={{ color: getDogColor(r.dogName), fontFamily: "var(--font-table)" }}>
                      {r.dogName}
                    </Link>
                    <span className="text-[10px]" style={{ color: "#6B7280" }}>—</span>
                    <span className="text-xs" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>{r.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px]" style={{ color: "#1C1C1C", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>
                      {formatDate(r.dueDate)}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                      style={{
                        background: r.daysLeft <= 0 ? "rgba(220,38,38,0.2)" : r.daysLeft <= 3 ? "rgba(234,179,8,0.2)" : "rgba(34,197,94,0.15)",
                        color: r.daysLeft <= 0 ? "#fc8181" : r.daysLeft <= 3 ? "#eab308" : "#22c55e",
                        fontFamily: "var(--font-mono)",
                        border: `1px solid ${r.daysLeft <= 0 ? "rgba(220,38,38,0.3)" : r.daysLeft <= 3 ? "rgba(234,179,8,0.3)" : "rgba(34,197,94,0.3)"}`,
                      }}>
                      {r.daysLeft <= 0 ? "OVERDUE" : r.daysLeft === 1 ? "Tomorrow" : `${r.daysLeft}d`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pedigree Cards */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-3" style={{ color: "#6B7280", fontFamily: "var(--font-table)" }}>
              <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#C9B29F", borderTopColor: "transparent" }} />
              Loading your pedigrees...
            </div>
          </div>
        ) : pedigrees.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4 opacity-30">🐕</div>
            <p className="text-sm mb-2" style={{ color: "#6B7280", fontFamily: "var(--font-table)" }}>
              No pedigrees published yet
            </p>
            <Link href="/pedigree-lab" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all hover:scale-105 mt-4"
              style={{
                background: "#1C1C1C",
                color: "#FAFAFA", fontFamily: "var(--font-table)",
              }}>
              + Create Your First Pedigree
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {pedigrees.map((p) => {
              const displayName = buildDisplayName(p);
              const titleColor = getDogColor(displayName);
              const isMale = p.sex === "Male" || p.sex === "MALE" || p.sex === "M";
              const journal = parseJournal(p.journal_json);
              const reminders = getUpcomingReminders(journal);

              return (
                <Link key={p.id} href={`/pedigree/custom/${p.id}`}
                  className="rounded-xl overflow-hidden transition-all hover:scale-[1.02] hover:shadow-lg group"
                  style={{
                    background: `linear-gradient(135deg, ${titleColor}10, ${titleColor}05, #FAFAFA)`,
                    border: `1.5px solid ${titleColor}33`,
                  }}>
                  {/* Photo header */}
                  <div className="h-32 relative" style={{
                    background: p.photo_path
                      ? `url(${p.photo_path}) center/cover`
                      : isMale
                        ? "#1d5bbf"
                        : "#9f1239",
                  }}>
                    <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(201,178,159,0.3), transparent)" }} />
                    {/* View count */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(250,247,242,0.9)", border: "1px solid #C9B29F" }}>
                      <span className="text-[9px]" style={{ color: "#1C1C1C", fontFamily: "var(--font-mono)" }}>
                        👁 {(p.view_count || 0).toLocaleString()}
                      </span>
                    </div>
                    {/* Reminders badge */}
                    {reminders.length > 0 && (
                      <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(234,179,8,0.2)", border: "1px solid rgba(234,179,8,0.4)" }}>
                        <span className="text-[9px] font-bold" style={{ color: "#eab308", fontFamily: "var(--font-table)" }}>
                          🔔 {reminders.length}
                        </span>
                      </div>
                    )}
                    {/* Name overlay */}
                    <div className="absolute bottom-2 left-3 right-3">
                      <p className="text-sm font-bold truncate" style={{ color: titleColor, fontFamily: "var(--font-table)" }}>
                        {displayName}
                      </p>
                      <p className="text-[10px]" style={{ color: "#6B7280" }}>
                        <span style={{ color: isMale ? "#1d5bbf" : "#9f1239" }}>{isMale ? "♂" : "♀"}</span>
                        {p.color && <span> · {p.color}</span>}
                        {p.country && <span> · {p.country}</span>}
                      </p>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px]" style={{ color: "#6B7280", fontFamily: "var(--font-table)" }}>
                        Posted {formatDate(p.date_posted)}
                      </span>
                      <span className="text-[10px]" style={{ color: "#6B7280", fontFamily: "var(--font-mono)" }}>
                        ID: <span style={{ color: "#1C1C1C" }}>{p.id}</span>
                      </span>
                    </div>

                    {/* Quick journal stats */}
                    {(journal.worming?.length > 0 || journal.vaccines?.some(v => v.checked)) && (
                      <div className="flex items-center gap-2 flex-wrap">
                        {journal.vaccines?.filter(v => v.checked).map(v => (
                          <span key={v.name} className="text-[9px] px-1.5 py-0.5 rounded-full"
                            style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)", fontFamily: "var(--font-table)" }}>
                            ✓ {v.name}
                          </span>
                        ))}
                        {journal.worming?.length > 0 && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full"
                            style={{ background: "rgba(96,165,250,0.1)", color: "#1d5bbf", border: "1px solid rgba(96,165,250,0.2)", fontFamily: "var(--font-table)" }}>
                            💊 {journal.worming.length} worming
                          </span>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[10px] px-2 py-1 rounded-lg font-semibold transition-all group-hover:scale-105"
                        style={{ background: "rgba(201,178,159,0.1)", color: "#1C1C1C", border: "2px solid #C9B29F", fontFamily: "var(--font-table)" }}>
                        View
                      </span>
                      <span className="text-[10px] px-2 py-1 rounded-lg font-semibold"
                        style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)", fontFamily: "var(--font-table)" }}>
                        ✎ Edit
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
