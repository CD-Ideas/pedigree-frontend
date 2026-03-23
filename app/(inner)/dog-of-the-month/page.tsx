"use client";

import { useState } from "react";
import Link from "next/link";

const GLASS_BOX = {
  background: "linear-gradient(180deg, rgba(30,30,30,0.85) 0%, rgba(22,22,22,0.9) 100%)",
  backdropFilter: "blur(16px)",
  border: "1.5px solid rgba(255,255,255,0.06)",
  boxShadow: "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)",
};

const INPUT_STYLE = {
  background: "rgba(20,20,25,0.8)",
  border: "1px solid rgba(212,168,85,0.15)",
  color: "var(--text-primary, #e2e8f0)",
  fontFamily: "var(--font-table, Rajdhani, sans-serif)",
};

export default function DogOfTheMonthPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      console.log("Notify email:", email);
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 4000);
      setEmail("");
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 px-2 sm:px-0">
      {/* Header */}
      <div className="text-center">
        <div className="relative inline-block mb-3">
          <span className="text-5xl block"
            style={{ filter: "drop-shadow(0 0 20px rgba(212,168,85,0.5))" }}>
            👑
          </span>
        </div>
        <h1 style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: "1.6rem",
          background: "linear-gradient(135deg, #e8c86e, #d4a855, #b8860b)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          letterSpacing: "0.02em",
        }}>
          Dog of the Month
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted, #5a6a82)", fontFamily: "var(--font-table)" }}>
          Monthly photo contest &bull; Community voting &bull; Prizes &amp; crowns for winners
        </p>
      </div>

      {/* Coming Soon Badge */}
      <div className="rounded-xl p-4 sm:p-8 text-center" style={{
        ...GLASS_BOX,
        border: "1.5px solid rgba(212,168,85,0.25)",
        boxShadow: "0 4px 30px rgba(0,0,0,0.4), 0 0 30px rgba(212,168,85,0.06), inset 0 1px 0 rgba(255,255,255,0.05)",
      }}>
        <span className="block animate-pulse"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "2rem",
            background: "linear-gradient(135deg, #e8c86e, #f5e6b8, #b8860b, #e8c86e)",
            backgroundSize: "200% 200%",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: "0.08em",
            textTransform: "uppercase" as const,
          }}>
          Coming Soon
        </span>
      </div>

      {/* Teaser Description */}
      <div className="rounded-xl p-6" style={GLASS_BOX}>
        <h2 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2"
          style={{ color: "var(--accent-gold, #d4a855)", fontFamily: "var(--font-table)" }}>
          <span style={{ filter: "drop-shadow(0 0 4px rgba(212,168,85,0.5))" }}>🌟</span>
          What&apos;s Coming
        </h2>
        <p className="leading-relaxed"
          style={{
            fontFamily: "var(--font-table, Rajdhani, sans-serif)",
            fontSize: "0.9rem",
            color: "rgba(220,220,230,0.85)",
            lineHeight: 1.8,
          }}>
          Get ready to crown the ultimate champion! Owners will submit standout photos of their
          registered pedigree dogs. The community votes each month. Winners earn a permanent
          glowing <span style={{ color: "#d4a855" }}>crown badge</span> on their dog&apos;s profile,
          homepage spotlight, and exclusive prizes. Launching soon — stay tuned!
        </p>
      </div>

      {/* Feature Preview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: "📸", title: "Submit Photos", desc: "Upload your best shots of registered pedigree dogs", color: "#3b82f6" },
          { icon: "🗳️", title: "Community Votes", desc: "The community picks the champion every month", color: "#a855f7" },
          { icon: "🏆", title: "Win Prizes", desc: "Permanent crown badge, spotlight, and exclusive rewards", color: "#d4a855" },
        ].map((item, i) => (
          <div key={i} className="rounded-xl p-3 sm:p-5 text-center transition-all hover:scale-[1.03]"
            style={{
              ...GLASS_BOX,
              borderColor: `${item.color}25`,
              boxShadow: `0 4px 24px rgba(0,0,0,0.4), 0 0 15px ${item.color}08, inset 0 1px 0 rgba(255,255,255,0.04)`,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = `${item.color}50`;
              e.currentTarget.style.boxShadow = `0 4px 30px rgba(0,0,0,0.5), 0 0 25px ${item.color}15, inset 0 1px 0 rgba(255,255,255,0.06)`;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = `${item.color}25`;
              e.currentTarget.style.boxShadow = `0 4px 24px rgba(0,0,0,0.4), 0 0 15px ${item.color}08, inset 0 1px 0 rgba(255,255,255,0.04)`;
            }}>
            <span className="text-3xl mb-3 block"
              style={{ filter: `drop-shadow(0 0 10px ${item.color}50)` }}>
              {item.icon}
            </span>
            <p className="text-sm font-bold mb-1"
              style={{ color: item.color, fontFamily: "var(--font-table)" }}>
              {item.title}
            </p>
            <p className="text-[11px]"
              style={{ color: "var(--text-muted, #5a6a82)", fontFamily: "var(--font-table)" }}>
              {item.desc}
            </p>
          </div>
        ))}
      </div>

      {/* Email Notification */}
      <div className="rounded-xl p-6" style={GLASS_BOX}>
        <h2 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2"
          style={{ color: "var(--accent-gold, #d4a855)", fontFamily: "var(--font-table)" }}>
          <span style={{ filter: "drop-shadow(0 0 4px rgba(212,168,85,0.5))" }}>🔔</span>
          Get Notified on Launch
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email..."
            required
            className="flex-1 rounded-lg px-4 py-3 text-sm outline-none transition-all"
            style={INPUT_STYLE}
          />
          <button
            type="submit"
            className="px-6 py-3 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all hover:scale-[1.03]"
            style={{
              background: submitted
                ? "linear-gradient(135deg, #22c55e, #16a34a)"
                : "linear-gradient(135deg, #e8c86e, #b8860b)",
              color: "#000",
              fontFamily: "var(--font-table)",
              boxShadow: submitted
                ? "0 4px 15px rgba(34,197,94,0.3)"
                : "0 4px 15px rgba(212,168,85,0.2), 0 0 20px rgba(212,168,85,0.1)",
            }}>
            {submitted ? "Subscribed!" : "Notify Me"}
          </button>
        </form>
      </div>

      {/* CTA */}
      <div className="flex justify-center">
        <Link href="/dogs"
          className="px-8 py-3 rounded-lg text-sm font-semibold uppercase tracking-wider transition-all hover:scale-[1.03]"
          style={{
            background: "linear-gradient(135deg, #e8c86e, #b8860b)",
            color: "#000",
            fontFamily: "var(--font-table)",
            boxShadow: "0 4px 20px rgba(212,168,85,0.2), 0 0 25px rgba(212,168,85,0.1), inset 0 1px 0 rgba(255,255,255,0.3)",
          }}>
          Explore Pedigree Dogs
        </Link>
      </div>
    </div>
  );
}
