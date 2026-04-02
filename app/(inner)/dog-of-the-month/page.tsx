"use client";

import { useState } from "react";
import Link from "next/link";

const PG_CARD = {
  background: "#FAF7F2",
  border: "2px solid #C9B29F",
  borderRadius: "8px",
};

const INPUT_STYLE = {
  background: "#FAFAFA",
  border: "2px solid #C9B29F",
  color: "#1C1C1C",
  fontFamily: "var(--font-table)",
  borderRadius: "8px",
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
          <span className="text-5xl block">
            👑
          </span>
        </div>
        <h1 style={{
          fontFamily: "var(--font-table)",
          fontWeight: 700,
          fontSize: "1.6rem",
          color: "#1C1C1C",
          letterSpacing: "0.02em",
        }}>
          Dog of the Month
        </h1>
        <p className="mt-1 text-sm" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>
          Monthly photo contest &bull; Community voting &bull; Prizes &amp; crowns for winners
        </p>
      </div>

      {/* Coming Soon Badge */}
      <div className="rounded-lg p-4 sm:p-8 text-center" style={{
        ...PG_CARD,
      }}>
        <span className="block animate-pulse"
          style={{
            fontFamily: "var(--font-table)",
            fontWeight: 700,
            fontSize: "2rem",
            color: "#1C1C1C",
            letterSpacing: "0.08em",
            textTransform: "uppercase" as const,
          }}>
          Coming Soon
        </span>
      </div>

      {/* Teaser Description */}
      <div className="rounded-lg p-6" style={PG_CARD}>
        <h2 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2"
          style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>
          What&apos;s Coming
        </h2>
        <p className="leading-relaxed"
          style={{
            fontFamily: "var(--font-table)",
            fontSize: "0.9rem",
            color: "#4A4A4A",
            lineHeight: 1.8,
          }}>
          Get ready to crown the ultimate champion! Owners will submit standout photos of their
          registered pedigree dogs. The community votes each month. Winners earn a permanent
          <span style={{ color: "#1C1C1C", fontWeight: 600 }}> crown badge</span> on their dog&apos;s profile,
          homepage spotlight, and exclusive prizes. Launching soon — stay tuned!
        </p>
      </div>

      {/* Feature Preview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: "📸", title: "Submit Photos", desc: "Upload your best shots of registered pedigree dogs", color: "#3b82f6" },
          { icon: "🗳️", title: "Community Votes", desc: "The community picks the champion every month", color: "#a855f7" },
          { icon: "🏆", title: "Win Prizes", desc: "Permanent crown badge, spotlight, and exclusive rewards", color: "#1C1C1C" },
        ].map((item, i) => (
          <div key={i} className="rounded-lg p-3 sm:p-5 text-center transition-all hover:scale-[1.02]"
            style={{
              ...PG_CARD,
            }}>
            <span className="text-3xl mb-3 block">
              {item.icon}
            </span>
            <p className="text-sm font-bold mb-1"
              style={{ color: item.color, fontFamily: "var(--font-table)" }}>
              {item.title}
            </p>
            <p className="text-[12px]"
              style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>
              {item.desc}
            </p>
          </div>
        ))}
      </div>

      {/* Email Notification */}
      <div className="rounded-lg p-6" style={PG_CARD}>
        <h2 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2"
          style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>
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
            className="px-6 py-3 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all hover:scale-[1.02]"
            style={{
              background: submitted ? "#22c55e" : "#1C1C1C",
              color: "#FAF7F2",
              fontFamily: "var(--font-table)",
              borderRadius: "8px",
            }}>
            {submitted ? "Subscribed!" : "Notify Me"}
          </button>
        </form>
      </div>

      {/* CTA */}
      <div className="flex justify-center">
        <Link href="/dogs"
          className="px-8 py-3 rounded-lg text-sm font-semibold uppercase tracking-wider transition-all hover:scale-[1.02]"
          style={{
            background: "#1C1C1C",
            color: "#FAF7F2",
            fontFamily: "var(--font-table)",
            borderRadius: "8px",
          }}>
          Explore Pedigree Dogs
        </Link>
      </div>
    </div>
  );
}
