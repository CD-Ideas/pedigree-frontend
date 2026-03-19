"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Stats {
  total: number;
  withSire: number;
  withDam: number;
  withPhoto: number;
  withDob: number;
  breeds: { breed: string; count: number }[];
  recentDogs: {
    id: string;
    name: string;
    sex: string;
    color: string;
    reg_number: string;
    created_at: string;
  }[];
}

function StatCard({ label, value, icon, color, iconBg, iconBorder }: { label: string; value: string; icon: string; color: string; iconBg: string; iconBorder: string }) {
  return (
    <div className="rounded-lg p-3 relative overflow-hidden"
         style={{ border: "1.5px solid rgba(30,64,120,0.8)", boxShadow: "0 2px 20px rgba(0,0,0,0.25)", background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)" }}>
      <div className="absolute top-2 right-2 w-8 h-8 rounded-lg flex items-center justify-center"
           style={{ background: iconBg, border: `1px solid ${iconBorder}` }}>
        <span className="text-sm" style={{ color }}>{icon}</span>
      </div>
      <div className="text-xl font-bold" style={{ color, fontFamily: "var(--font-mono)" }}>{value}</div>
      <div className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>{label}</div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats);
  }, []);

  if (!stats) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex items-center gap-3" style={{ color: "var(--text-muted)" }}>
          <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
               style={{ borderColor: "var(--accent-gold)", borderTopColor: "transparent" }} />
          Loading dashboard...
        </div>
      </div>
    );
  }

  const cards = [
    { label: "Total Dogs", value: stats.total.toLocaleString(), icon: "🐕", color: "var(--accent-gold)", iconBg: "rgba(212,168,85,0.15)", iconBorder: "rgba(212,168,85,0.3)" },
    { label: "With Sire", value: stats.withSire.toLocaleString(), icon: "♂", color: "var(--male-color)", iconBg: "rgba(96,165,250,0.15)", iconBorder: "rgba(96,165,250,0.3)" },
    { label: "With Dam", value: stats.withDam.toLocaleString(), icon: "♀", color: "var(--female-color)", iconBg: "rgba(244,114,182,0.15)", iconBorder: "rgba(244,114,182,0.3)" },
    { label: "With Photo", value: stats.withPhoto.toLocaleString(), icon: "📷", color: "var(--accent-green)", iconBg: "rgba(74,222,128,0.15)", iconBorder: "rgba(74,222,128,0.3)" },
    { label: "With DOB", value: stats.withDob.toLocaleString(), icon: "📅", color: "var(--accent-blue)", iconBg: "rgba(96,165,250,0.15)", iconBorder: "rgba(96,165,250,0.3)" },
  ];

  return (
    <div>
      <div className="mb-5">
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", fontWeight: 700 }}>Dashboard</h1>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
          APBT Pedigree Platform Overview
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 mb-5">
        {cards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {/* Breeds */}
        <div className="rounded-lg p-4" style={{ border: "1.5px solid rgba(30,64,120,0.8)", boxShadow: "0 2px 20px rgba(0,0,0,0.25)", background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)" }}>
          <h2 className="text-[10px] uppercase tracking-wider font-medium mb-3" style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)" }}>
            By Breed
          </h2>
          {stats.breeds.length > 0 ? (
            <div className="space-y-2">
              {stats.breeds.map((b) => (
                <div key={b.breed} className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "var(--text-primary)" }}>{b.breed || "Unknown"}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                        style={{ background: "var(--bg-elevated)", color: "var(--accent-gold)", fontFamily: "var(--font-mono)" }}>
                    {b.count.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>No breed data</p>
          )}
        </div>

        {/* Recent Dogs */}
        <div className="rounded-lg p-4" style={{ border: "1.5px solid rgba(30,64,120,0.8)", boxShadow: "0 2px 20px rgba(0,0,0,0.25)", background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)" }}>
          <h2 className="text-[10px] uppercase tracking-wider font-medium mb-3" style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)" }}>
            Recently Added
          </h2>
          <div className="space-y-1.5">
            {stats.recentDogs.map((d) => (
              <Link key={d.id} href={`/dogs/${d.id}`}
                    className="flex items-center justify-between py-1.5 group rounded-lg px-2 -mx-2 transition-colors hover:bg-[var(--bg-hover)]"
                    style={{ borderBottom: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px]"
                        style={{
                          background: d.sex === "MALE" ? "rgba(91,141,239,0.12)" : "rgba(212,107,163,0.12)",
                          color: d.sex === "MALE" ? "var(--male-color)" : "var(--female-color)",
                        }}>
                    {d.sex === "MALE" ? "♂" : "♀"}
                  </span>
                  <div>
                    <div className="text-xs font-medium group-hover:text-[var(--accent-gold)] transition-colors"
                         style={{ color: "var(--text-primary)" }}>
                      {d.name}
                    </div>
                    {d.color && (
                      <div className="text-[9px]" style={{ color: "var(--text-muted)" }}>{d.color}</div>
                    )}
                  </div>
                </div>
                <span className="text-[9px]" style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                  {d.reg_number}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
