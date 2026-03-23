"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const LOGO = "https://i.imgur.com/cAvQemZ.png";

/* removed unused dynamic component */
function _REMOVED() { return null; }
function _BreedingCalcPreview_UNUSED() {
  const [data, setData] = useState<{
    sire: { name: string; photo: string | null };
    dam: { name: string; photo: string | null };
    coi: number;
    bloodlines: { name: string; pct: number }[];
    sharedCount: number;
    topAncestor: string | null;
    genDepth: number;
  } | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("breedingCalcResult");
      if (stored) setData(JSON.parse(stored));
    } catch (_e) {}
  }, []);

  const PIE_COLORS = ["#ef4444", "#3b82f6", "#a855f7", "#d4a855", "#22c55e", "#f97316", "#ec4899", "#14b8a6"];

  /* Use stored data or fallback to static example */
  const isLive = !!data;
  const bl = data?.bloodlines?.length ? data.bloodlines : [
    { name: "Jeep/Redboy", pct: 31 }, { name: "Eli/Boudreaux", pct: 22 },
    { name: "Carver", pct: 15 }, { name: "Tab", pct: 12 },
  ];
  const coiVal = data?.coi ?? 4.5;
  const topLine = bl[0];
  const totalPct = bl.reduce((s, b) => s + b.pct, 0);
  const otherPct = Math.max(0, 100 - totalPct);
  const coiColor = coiVal < 5 ? "#22c55e" : coiVal < 10 ? "#eab308" : coiVal < 15 ? "#f97316" : "#ef4444";
  const coiLabel = coiVal < 5 ? "Clean Outcross" : coiVal < 10 ? "Mild Linebreed" : coiVal < 15 ? "Tight Linebreed" : "Danger Zone";

  const insights = isLive ? [
    `${topLine.pct}% ${topLine.name} lineage — dominant bloodline`,
    data.sharedCount > 0 ? `${data.sharedCount} shared ancestors between sire & dam` : "No shared ancestors — clean cross",
    data.topAncestor ? `Most repeated: ${data.topAncestor}` : "Wide genetic diversity",
    coiVal > 10 ? "Test for joint health due to inbreeding overlap" : "Healthy genetic distance",
  ] : [
    "31% Jeep lineage — expect explosive prey drive",
    "Double Jeep on both sides — high impact genetics",
    "22% Red Boy adds gameness & stamina",
    "Test for joint health due to inbreeding overlap",
  ];

  /* Build pie offsets */
  let cumPct = 0;
  const slices = bl.slice(0, 4).map((b, i) => {
    const offset = cumPct;
    cumPct += b.pct;
    return { ...b, offset, color: PIE_COLORS[i % PIE_COLORS.length] };
  });

  return (
    <section id="breeding-calculator" className="py-5 px-4">
      <div className="max-w-5xl mx-auto">
        <h2 className="subtitle-gold text-center mb-0.5" style={{ fontFamily: "var(--font-table)", fontWeight: 500, fontSize: "clamp(0.95rem, 2vw, 1.25rem)" }}>
          Bloodline Calculator
        </h2>
        <p className="text-center mb-3" style={{ color: "rgba(180,180,195,0.7)", fontFamily: "var(--font-table)", fontSize: "10px", fontWeight: 400 }}>
          Know Your Cross Before You Make It
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Pie Chart */}
          <div className="relative rounded-lg p-4" style={{
            background: "linear-gradient(160deg, rgba(25,27,35,0.95) 0%, rgba(14,15,20,0.98) 100%)",
            border: "1px solid rgba(255,255,255,0.07)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}>
            <div className="text-center mb-2">
              {isLive ? (
                <>
                  <span style={{ fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "11px", color: "#60a5fa" }}>{data.sire.name}</span>
                  <span style={{ fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "11px", color: "rgba(255,255,255,0.3)" }}> × </span>
                  <span style={{ fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "11px", color: "#f472b6" }}>{data.dam.name}</span>
                </>
              ) : (
                <>
                  <span style={{ fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "11px", color: "var(--accent-gold)" }}>GR CH Razor&apos;s Edge Bloodfire</span>
                </>
              )}
            </div>
            <div className="flex justify-center">
              <svg width="180" height="180" viewBox="0 0 220 220">
                {slices.map((s, i) => (
                  <circle key={i} cx="110" cy="110" r="85" fill="none" stroke={s.color} strokeWidth="45"
                    strokeDasharray={`${s.pct * 5.34} ${100 * 5.34}`} strokeDashoffset={`${-s.offset * 5.34}`}
                    transform="rotate(-90 110 110)"
                    style={{ filter: `drop-shadow(0 0 8px ${s.color}40)` }} />
                ))}
                {otherPct > 0 && (
                  <circle cx="110" cy="110" r="85" fill="none" stroke="rgba(120,120,140,0.5)" strokeWidth="45"
                    strokeDasharray={`${otherPct * 5.34} ${100 * 5.34}`} strokeDashoffset={`${-cumPct * 5.34}`}
                    transform="rotate(-90 110 110)" />
                )}
                <circle cx="110" cy="110" r="62" fill="rgba(14,15,20,0.95)" />
                <text x="110" y="100" textAnchor="middle" fill="#fff" style={{ fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "22px" }}>{topLine.pct}%</text>
                <text x="110" y="118" textAnchor="middle" fill={slices[0]?.color || "#ef4444"} style={{ fontFamily: "var(--font-table)", fontWeight: 500, fontSize: "10px", letterSpacing: "0.05em" }}>
                  {topLine.name.toUpperCase()}
                </text>
                <text x="110" y="134" textAnchor="middle" fill="rgba(180,180,195,0.6)" style={{ fontFamily: "var(--font-table)", fontWeight: 400, fontSize: "9px" }}>
                  {isLive ? `${data.genDepth}-gen analysis` : "4-gen analysis"}
                </text>
              </svg>
            </div>
            {/* Legend */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2">
              {slices.map((b, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: b.color, boxShadow: `0 0 6px ${b.color}40` }} />
                  <span style={{ fontFamily: "var(--font-table)", fontSize: "11px", color: "rgba(200,200,210,0.85)", fontWeight: 500 }}>{b.name}</span>
                  <span style={{ fontFamily: "var(--font-table)", fontSize: "11px", color: b.color, fontWeight: 700, marginLeft: "auto" }}>{b.pct}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Info & Warnings */}
          <div className="flex flex-col gap-2">
            {/* COI Alert */}
            <div className="rounded-lg p-3" style={{
              background: `linear-gradient(160deg, ${coiColor}10 0%, rgba(14,15,20,0.98) 100%)`,
              border: `1px solid ${coiColor}30`,
              boxShadow: `0 0 25px ${coiColor}08`,
            }}>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: `${coiColor}20`, border: `1px solid ${coiColor}40` }}>
                  <span style={{ fontSize: "12px" }}>⚠️</span>
                </div>
                <span style={{ fontFamily: "var(--font-table)", fontWeight: 700, fontSize: "10px", color: coiColor, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {coiLabel} — {coiVal.toFixed(1)}% COI
                </span>
              </div>
              <p style={{ fontFamily: "var(--font-table)", fontSize: "9.5px", color: "rgba(200,200,210,0.7)", lineHeight: 1.5 }}>
                {isLive && data.topAncestor
                  ? <>{data.topAncestor} appears on <span style={{ color: coiColor, fontWeight: 600 }}>both sire and dam side</span>. {coiVal < 10 ? "Low risk." : "Monitor joint health and temperament stability."}</>
                  : <>Jeep appears on <span style={{ color: "#ef4444", fontWeight: 600 }}>both sire and dam side</span>. Moderate risk. Monitor joint health and temperament stability.</>
                }
              </p>
            </div>

            {/* Breeder Insights */}
            <div className="rounded-lg p-3" style={{
              background: "linear-gradient(160deg, rgba(25,27,35,0.95) 0%, rgba(14,15,20,0.98) 100%)",
              border: "1px solid rgba(255,255,255,0.07)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            }}>
              <h4 style={{ fontFamily: "var(--font-table)", fontWeight: 700, fontSize: "10px", color: "var(--accent-gold)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>
                Breeder Insights {isLive && <span style={{ color: "rgba(255,255,255,0.3)", fontWeight: 400 }}>— Live Result</span>}
              </h4>
              <ul className="space-y-1.5">
                {insights.map((tip, i) => (
                  <li key={i} className="flex items-start gap-1.5" style={{ fontFamily: "var(--font-table)", fontSize: "9.5px", color: "rgba(200,200,210,0.8)", lineHeight: 1.45 }}>
                    <span style={{ color: "var(--accent-gold)", fontSize: "7px", marginTop: "3px" }}>◆</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

            {/* How it works */}
            <div className="rounded-lg p-3" style={{
              background: "linear-gradient(160deg, rgba(25,27,35,0.95) 0%, rgba(14,15,20,0.98) 100%)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}>
              <h4 style={{ fontFamily: "var(--font-table)", fontWeight: 700, fontSize: "10px", color: "#fff", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>
                How It Works
              </h4>
              <div className="flex items-center gap-2">
                {[
                  { step: "1", text: "Enter parents" },
                  { step: "2", text: `We crunch ${isLive ? data.genDepth * 2 : 16} ancestors` },
                  { step: "3", text: "Results light up" },
                ].map((s, i) => (
                  <div key={i} className="flex-1 flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: "linear-gradient(135deg, var(--accent-red, #dc2626), #991b1b)", fontSize: "9px", fontWeight: 700, fontFamily: "var(--font-table)", color: "#fff" }}>
                      {s.step}
                    </div>
                    <span style={{ fontFamily: "var(--font-table)", fontSize: "9px", color: "rgba(200,200,210,0.8)", fontWeight: 500 }}>{s.text}</span>
                    {i < 2 && <span style={{ color: "rgba(255,255,255,0.15)", fontSize: "12px" }}>→</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={() => window.location.href = "#breeding-calculator"}
              className="w-full py-2 rounded-lg text-center"
              style={{
                fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em",
                background: "linear-gradient(135deg, #dc2626, #991b1b)", color: "#fff",
                border: "1px solid rgba(239,68,68,0.3)",
                boxShadow: "0 4px 20px rgba(220,38,38,0.2)",
                cursor: "pointer", transition: "all 0.2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 6px 30px rgba(220,38,38,0.35)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 4px 20px rgba(220,38,38,0.2)"; e.currentTarget.style.transform = "translateY(0)"; }}>
              {isLive ? "Open Bloodline Calculator" : "Try Bloodline Calculator"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [authModal, setAuthModal] = useState(false);
  const openAuth = (redirectTo?: string) => {
    if (redirectTo) localStorage.setItem("loginRedirect", redirectTo);
    else localStorage.removeItem("loginRedirect");
    setAuthModal(true);
  };
  const [mobileMenu, setMobileMenu] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr && userStr !== "null") setIsLoggedIn(true);
    } catch (_e) {}
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!pricingOpen) return;
    const close = () => setPricingOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [pricingOpen]);

  return (
    <>
      {/* ── NavBar ── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 px-4 md:px-6 py-2.5 flex items-center justify-end transition-all duration-300"
        style={{
          background: scrolled ? "rgba(11,17,32,0.95)" : "transparent",
          backdropFilter: scrolled ? "blur(20px)" : "none",
          borderBottom: scrolled ? "1px solid rgba(220,38,38,0.1)" : "1px solid transparent",
        }}
      >
        {/* Mobile hamburger */}
        <button
          className="md:hidden mr-auto"
          onClick={() => setMobileMenu(!mobileMenu)}
          style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-gold)" strokeWidth="2" strokeLinecap="round">
            {mobileMenu ? (
              <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
            ) : (
              <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>
            )}
          </svg>
        </button>
        <div className="hidden md:flex items-center gap-6">
          <a href="#features" style={{ fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--accent-gold)", transition: "color 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--accent-gold-bright)"} onMouseLeave={e => e.currentTarget.style.color = "var(--accent-gold)"}>Features</a>
          <a href="#breeding-calculator" style={{ fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--accent-gold)", transition: "color 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--accent-gold-bright)"} onMouseLeave={e => e.currentTarget.style.color = "var(--accent-gold)"}>Bloodline Calculator</a>
          <a href="#marketplace" style={{ fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--accent-gold)", transition: "color 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--accent-gold-bright)"} onMouseLeave={e => e.currentTarget.style.color = "var(--accent-gold)"}>Marketplace</a>
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setPricingOpen(!pricingOpen); }}
              className="flex items-center gap-1.5"
              style={{ fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: pricingOpen ? "var(--accent-gold-bright)" : "var(--accent-gold)", transition: "color 0.2s", background: "none", border: "none", cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.color = "var(--accent-gold-bright)"}
              onMouseLeave={e => { if (!pricingOpen) e.currentTarget.style.color = "var(--accent-gold)"; }}
            >
              Pricing
              <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ transition: "transform 0.2s", transform: pricingOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                <path d="M2 3.5L5 6.5L8 3.5" />
              </svg>
            </button>
            {pricingOpen && (
              <div className="absolute top-full right-0 mt-3 rounded-xl overflow-hidden"
                style={{ width: "min(320px, 90vw)", background: "rgba(12,13,16,0.97)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 20px 50px rgba(0,0,0,0.6)" }}
                onClick={(e) => e.stopPropagation()}>
                  {/* Free tier */}
                  <div className="px-6 py-6">
                    <div className="flex items-baseline gap-2 mb-4">
                      <span style={{ fontFamily: "var(--font-table)", fontWeight: 500, fontSize: "1.15rem", color: "#fff" }}>Free Trial</span>
                      <span style={{ fontFamily: "var(--font-table)", fontWeight: 500, fontSize: "1.4rem", color: "#fff" }}>$0</span>
                      <span style={{ fontFamily: "var(--font-table)", fontSize: "11px", fontWeight: 400, color: "var(--text-muted)" }}>/3 months</span>
                    </div>
                    <ul className="space-y-2.5 mb-5">
                      {["Unlimited dog registrations", "3-generation pedigree trees", "Basic search & browse", "Share pedigree links"].map((item, i) => (
                        <li key={i} className="flex items-center gap-2.5" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-table)", fontSize: "13px", fontWeight: 400 }}>
                          <span style={{ color: "#22c55e", fontSize: "11px" }}>&#10003;</span>{item}
                        </li>
                      ))}
                    </ul>
                    <Link href="/register" onClick={() => setPricingOpen(false)}
                      className="btn-primary w-full py-2.5 rounded-lg text-center block"
                      style={{ fontSize: "11px", fontWeight: 500 }}>
                      Create Free Account
                    </Link>
                  </div>
              </div>
            )}
          </div>
          <Link href="/login" style={{ fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--accent-gold)", padding: "0.4rem 1.2rem", border: "1px solid rgba(212,168,85,0.3)", borderRadius: "0.5rem", transition: "all 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.color = "var(--accent-gold-bright)"; e.currentTarget.style.borderColor = "var(--accent-gold)"; e.currentTarget.style.boxShadow = "0 0 15px rgba(212,168,85,0.15)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "var(--accent-gold)"; e.currentTarget.style.borderColor = "rgba(212,168,85,0.3)"; e.currentTarget.style.boxShadow = "none"; }}>Login</Link>
          <Link href="/register" style={{ fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#000", padding: "0.4rem 1.2rem", background: "linear-gradient(135deg, var(--accent-gold), #b8860b)", borderRadius: "0.5rem", transition: "all 0.2s", boxShadow: "0 2px 10px rgba(212,168,85,0.25)" }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 20px rgba(212,168,85,0.4)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 2px 10px rgba(212,168,85,0.25)"; e.currentTarget.style.transform = "translateY(0)"; }}>Sign Up</Link>
        </div>
        {/* Mobile: Login + Sign Up always visible */}
        <div className="flex md:hidden items-center gap-3">
          <Link href="/login" style={{ fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--accent-gold)", padding: "0.35rem 0.8rem", border: "1px solid rgba(212,168,85,0.3)", borderRadius: "0.4rem" }}>Login</Link>
          <Link href="/register" style={{ fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#000", padding: "0.35rem 0.8rem", background: "linear-gradient(135deg, var(--accent-gold), #b8860b)", borderRadius: "0.4rem" }}>Sign Up</Link>
        </div>
      </nav>

      {/* ── Mobile Menu Overlay ── */}
      {mobileMenu && (
        <div className="fixed inset-0 z-40 md:hidden" style={{ background: "rgba(5,6,8,0.97)", backdropFilter: "blur(20px)" }}>
          <div className="flex flex-col items-center justify-center h-full gap-6">
            {[
              { label: "Features", href: "#features" },
              { label: "Bloodline Calculator", href: "#breeding-calculator" },
              { label: "Marketplace", href: "#marketplace" },
            ].map((item) => (
              <a key={item.label} href={item.href} onClick={() => setMobileMenu(false)}
                style={{ fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "16px", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--accent-gold)" }}>
                {item.label}
              </a>
            ))}
            <div className="w-12 h-[1px] my-2" style={{ background: "linear-gradient(90deg, transparent, rgba(212,168,85,0.4), transparent)" }} />
            <button onClick={() => { setMobileMenu(false); setPricingOpen(false); setAuthModal(true); }}
              style={{ fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.1em", color: "#fff", background: "linear-gradient(135deg, #dc2626, #991b1b)", padding: "0.6rem 2rem", borderRadius: "0.5rem", border: "none", cursor: "pointer" }}>
              View Pricing
            </button>
          </div>
        </div>
      )}

      <main>
        {/* ── Hero ── */}
        <section className="relative flex items-center justify-center px-4" style={{ minHeight: "26vh", paddingTop: "45px" }}>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] rounded-full opacity-15"
            style={{ background: "radial-gradient(circle, rgba(220,38,38,0.4) 0%, transparent 70%)" }} />
          <div className="relative max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-4 md:gap-8 animate-reveal">
            <img src={LOGO} alt="Pedigree Platform" width={200} height={200} className="rounded-xl flex-shrink-0 w-[110px] h-[110px] md:w-[180px] md:h-[180px]"
              style={{ boxShadow: "0 0 40px rgba(220,38,38,0.3)" }} />
            <div className="text-center md:text-left">
              <h1 style={{ fontFamily: "var(--font-table)", fontSize: "clamp(1.2rem, 3.5vw, 2.2rem)", fontWeight: 500, lineHeight: 1.1 }} className="text-white mb-1.5">
                The Ultimate <span style={{ color: "var(--accent-red-bright)" }}>Pedigree Hub</span>
              </h1>
              <p className="max-w-md mb-3 mx-auto md:mx-0" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-table)", fontSize: "11px", fontWeight: 400, lineHeight: 1.6 }}>
                Track, manage, and share dog pedigrees with the most comprehensive lineage platform.
              </p>
              <Link href="/register" className="btn-primary px-6 py-1.5 rounded-lg" style={{ fontSize: "10px", fontWeight: 500 }}>Get Started Free</Link>
            </div>
          </div>
        </section>

        {/* ── Social Proof Stats ── */}
        <section className="py-3 px-4">
          <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-4 md:gap-10">
            {[
              { value: "10,000+", label: "Dogs Registered" },
              { value: "2,500+", label: "Active Breeders" },
              { value: "50,000+", label: "Pedigrees Generated" },
              { value: "4.9", label: "User Rating", suffix: "/5" },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div style={{ fontFamily: "var(--font-table)", fontWeight: 700, fontSize: "clamp(0.9rem, 2vw, 1.2rem)", color: "var(--accent-gold)", lineHeight: 1 }}>
                  {s.value}{s.suffix && <span style={{ fontSize: "0.65em", color: "var(--text-muted)" }}>{s.suffix}</span>}
                </div>
                <div style={{ fontFamily: "var(--font-table)", fontWeight: 400, fontSize: "9px", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: "2px" }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Features ── */}
        <section id="features" className="py-4 px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="subtitle-gold text-center mb-3" style={{ fontFamily: "var(--font-table)", fontWeight: 500, fontSize: "clamp(0.95rem, 2vw, 1.25rem)" }}>
              Why Pedigree Platform?
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {[
                { icon: "🌳", title: "Pedigree Trees", desc: "Multi-generation interactive lineage visualization", color: "#22c55e", glow: "0,200,80", redirect: "/pedigree/3" },
                { icon: "📋", title: "Dog Registry", desc: "Detailed profiles with titles, weights & records", color: "#3b82f6", glow: "59,130,246", redirect: "/dogs" },
                { icon: "🔗", title: "Easy Sharing", desc: "Share via WhatsApp, Telegram with rich previews", color: "#a855f7", glow: "168,85,247" },
                { icon: "🏆", title: "Title Tracking", desc: "CH, GR CH, ROM tracking across generations", color: "#d4a855", glow: "212,168,85" },
                { icon: "🧬", title: "Puppy Predictor", desc: "Input sire + dam genotypes, predict litter coat colors & probabilities", color: "#ef4444", glow: "239,68,68", redirect: "/puppy-predictor" },
                { icon: "👑", title: "Dog of the Month", desc: "Monthly photo contest with community voting & prizes", color: "#f97316", glow: "249,115,22" },
                { icon: "🔦", title: "Lineage Spotlight", desc: "Search any legendary dog, trace descendants and find the tightest bloodlines ranked by blood %", color: "#1d8cf8", glow: "29,140,248", redirect: "/pedigree/spotlight" },
                { icon: "🧪", title: "Pedigree Lab", desc: "Build custom pedigrees with drag-and-drop, then publish and share", color: "#a78bfa", glow: "167,139,250", redirect: "/pedigree-lab" },
                { icon: "🌍", title: "Community Pedigrees", desc: "Browse and discover pedigrees created by the community", color: "#22d3ee", glow: "34,211,238", redirect: "/community" },
              ].map((f, i) => (
                <div key={i} className="group relative rounded-lg p-2.5 text-center animate-scale-reveal cursor-pointer"
                  onClick={() => {
                    const item = f as Record<string, unknown>;
                    if (item.href) { window.location.href = String(item.href); }
                    else if (item.redirect) { openAuth(String(item.redirect)); }
                    else { openAuth(); }
                  }}
                  style={{
                    animationDelay: `${i * 0.1}s`,
                    background: `linear-gradient(160deg, rgba(25,27,35,0.95) 0%, rgba(14,15,20,0.98) 100%)`,
                    border: "1px solid rgba(255,255,255,0.07)",
                    transition: "all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                    overflow: "hidden",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = f.color;
                    e.currentTarget.style.boxShadow = `0 0 35px rgba(${f.glow},0.15), 0 12px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)`;
                    e.currentTarget.style.transform = "translateY(-5px) scale(1.02)";
                    e.currentTarget.style.background = `linear-gradient(160deg, rgba(30,32,42,0.95) 0%, rgba(16,17,24,0.98) 100%)`;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                    e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)";
                    e.currentTarget.style.transform = "translateY(0) scale(1)";
                    e.currentTarget.style.background = `linear-gradient(160deg, rgba(25,27,35,0.95) 0%, rgba(14,15,20,0.98) 100%)`;
                  }}>
                  {/* Top accent gradient line */}
                  <div className="absolute top-0 left-0 right-0 h-[2px] transition-all duration-400"
                    style={{ background: `linear-gradient(90deg, transparent 5%, ${f.color} 50%, transparent 95%)`, opacity: 0.3 }}
                    ref={el => {
                      if (el) {
                        const parent = el.parentElement;
                        parent?.addEventListener("mouseenter", () => { el.style.opacity = "1"; el.style.height = "3px"; });
                        parent?.addEventListener("mouseleave", () => { el.style.opacity = "0.3"; el.style.height = "2px"; });
                      }
                    }} />
                  {/* Corner glow */}
                  <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full transition-opacity duration-400"
                    style={{ background: `radial-gradient(circle, rgba(${f.glow},0.08) 0%, transparent 70%)`, opacity: 0 }}
                    ref={el => {
                      if (el) {
                        const parent = el.parentElement;
                        parent?.addEventListener("mouseenter", () => el.style.opacity = "1");
                        parent?.addEventListener("mouseleave", () => el.style.opacity = "0");
                      }
                    }} />
                  {/* Icon container with double ring */}
                  <div className="relative mx-auto mb-1.5 w-7 h-7 flex items-center justify-center rounded-md transition-all duration-300"
                    style={{
                      background: `linear-gradient(135deg, rgba(${f.glow},0.12) 0%, rgba(${f.glow},0.04) 100%)`,
                      border: `1px solid rgba(${f.glow},0.2)`,
                      boxShadow: `0 0 0 4px rgba(${f.glow},0.05), 0 4px 12px rgba(0,0,0,0.2)`,
                    }}
                    ref={el => {
                      if (el) {
                        const parent = el.parentElement;
                        parent?.addEventListener("mouseenter", () => {
                          el.style.boxShadow = `0 0 0 4px rgba(${f.glow},0.12), 0 0 20px rgba(${f.glow},0.15), 0 4px 12px rgba(0,0,0,0.2)`;
                          el.style.borderColor = `rgba(${f.glow},0.4)`;
                          el.style.transform = "scale(1.08)";
                        });
                        parent?.addEventListener("mouseleave", () => {
                          el.style.boxShadow = `0 0 0 4px rgba(${f.glow},0.05), 0 4px 12px rgba(0,0,0,0.2)`;
                          el.style.borderColor = `rgba(${f.glow},0.2)`;
                          el.style.transform = "scale(1)";
                        });
                      }
                    }}>
                    <span className="text-sm" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }}>{f.icon}</span>
                  </div>
                  <h3 style={{ fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "11px", color: "#fff", letterSpacing: "0.03em" }} className="mb-0.5">{f.title}</h3>
                  <div className="w-5 h-[1px] mx-auto mb-1" style={{ background: `linear-gradient(90deg, transparent, rgba(${f.glow},0.4), transparent)` }} />
                  <p style={{ color: "rgba(190,190,205,0.75)", fontFamily: "var(--font-table)", fontSize: "9px", fontWeight: 400, lineHeight: 1.45 }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Bloodline Calculator ── */}
        <section id="breeding-calculator" className="py-5 px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="subtitle-gold text-center mb-0.5" style={{ fontFamily: "var(--font-table)", fontWeight: 500, fontSize: "clamp(0.95rem, 2vw, 1.25rem)" }}>
              Bloodline Calculator
            </h2>
            <p className="text-center mb-3" style={{ color: "rgba(180,180,195,0.7)", fontFamily: "var(--font-table)", fontSize: "10px", fontWeight: 400 }}>
              Know Your Cross Before You Make It
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Pie Chart */}
              <div className="relative rounded-lg p-4"
                style={{
                  background: "linear-gradient(160deg, rgba(25,27,35,0.95) 0%, rgba(14,15,20,0.98) 100%)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)",
                }}>
                <div className="text-center mb-2">
                  <span style={{ fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "11px", color: "var(--accent-gold)" }}>GR CH Razor&apos;s Edge Bloodfire</span>
                </div>
                <div className="flex justify-center">
                  <svg width="180" height="180" viewBox="0 0 220 220">
                    <circle cx="110" cy="110" r="85" fill="none" stroke="#ef4444" strokeWidth="45"
                      strokeDasharray={`${31 * 5.34} ${100 * 5.34}`} strokeDashoffset="0"
                      transform="rotate(-90 110 110)"
                      style={{ filter: "drop-shadow(0 0 8px rgba(239,68,68,0.4))" }} />
                    <circle cx="110" cy="110" r="85" fill="none" stroke="#3b82f6" strokeWidth="45"
                      strokeDasharray={`${22 * 5.34} ${100 * 5.34}`} strokeDashoffset={`${-(31) * 5.34}`}
                      transform="rotate(-90 110 110)"
                      style={{ filter: "drop-shadow(0 0 8px rgba(59,130,246,0.3))" }} />
                    <circle cx="110" cy="110" r="85" fill="none" stroke="#a855f7" strokeWidth="45"
                      strokeDasharray={`${15 * 5.34} ${100 * 5.34}`} strokeDashoffset={`${-(31 + 22) * 5.34}`}
                      transform="rotate(-90 110 110)"
                      style={{ filter: "drop-shadow(0 0 6px rgba(168,85,247,0.3))" }} />
                    <circle cx="110" cy="110" r="85" fill="none" stroke="#d4a855" strokeWidth="45"
                      strokeDasharray={`${12 * 5.34} ${100 * 5.34}`} strokeDashoffset={`${-(31 + 22 + 15) * 5.34}`}
                      transform="rotate(-90 110 110)"
                      style={{ filter: "drop-shadow(0 0 6px rgba(212,168,85,0.3))" }} />
                    <circle cx="110" cy="110" r="85" fill="none" stroke="rgba(120,120,140,0.5)" strokeWidth="45"
                      strokeDasharray={`${20 * 5.34} ${100 * 5.34}`} strokeDashoffset={`${-(31 + 22 + 15 + 12) * 5.34}`}
                      transform="rotate(-90 110 110)" />
                    <circle cx="110" cy="110" r="62" fill="rgba(14,15,20,0.95)" />
                    <text x="110" y="100" textAnchor="middle" fill="#fff" style={{ fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "22px" }}>31%</text>
                    <text x="110" y="118" textAnchor="middle" fill="#ef4444" style={{ fontFamily: "var(--font-table)", fontWeight: 500, fontSize: "10px", letterSpacing: "0.05em" }}>JEEP DOMINANT</text>
                    <text x="110" y="134" textAnchor="middle" fill="rgba(180,180,195,0.6)" style={{ fontFamily: "var(--font-table)", fontWeight: 400, fontSize: "9px" }}>4-gen analysis</text>
                  </svg>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2">
                  {[
                    { name: "CH Jeep", pct: "31%", color: "#ef4444" },
                    { name: "Red Boy", pct: "22%", color: "#3b82f6" },
                    { name: "Eli Jr", pct: "15%", color: "#a855f7" },
                    { name: "Carver", pct: "12%", color: "#d4a855" },
                  ].map((b, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: b.color, boxShadow: `0 0 6px ${b.color}40` }} />
                      <span style={{ fontFamily: "var(--font-table)", fontSize: "11px", color: "rgba(200,200,210,0.85)", fontWeight: 500 }}>{b.name}</span>
                      <span style={{ fontFamily: "var(--font-table)", fontSize: "11px", color: b.color, fontWeight: 700, marginLeft: "auto" }}>{b.pct}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Info & Warnings */}
              <div className="flex flex-col gap-2">
                <div className="rounded-lg p-3"
                  style={{
                    background: "linear-gradient(160deg, rgba(239,68,68,0.08) 0%, rgba(14,15,20,0.98) 100%)",
                    border: "1px solid rgba(239,68,68,0.2)",
                    boxShadow: "0 0 25px rgba(239,68,68,0.06)",
                  }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)" }}>
                      <span style={{ fontSize: "12px" }}>⚠️</span>
                    </div>
                    <span style={{ fontFamily: "var(--font-table)", fontWeight: 700, fontSize: "10px", color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.06em" }}>Inbreeding Alert — 4.5% COI</span>
                  </div>
                  <p style={{ fontFamily: "var(--font-table)", fontSize: "9.5px", color: "rgba(200,200,210,0.7)", lineHeight: 1.5 }}>
                    Jeep appears on <span style={{ color: "#ef4444", fontWeight: 600 }}>both sire and dam side</span>. Moderate risk. Monitor joint health and temperament stability.
                  </p>
                </div>

                <div className="rounded-lg p-3"
                  style={{
                    background: "linear-gradient(160deg, rgba(25,27,35,0.95) 0%, rgba(14,15,20,0.98) 100%)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
                  }}>
                  <h4 style={{ fontFamily: "var(--font-table)", fontWeight: 700, fontSize: "10px", color: "var(--accent-gold)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>
                    Breeder Insights
                  </h4>
                  <ul className="space-y-1.5">
                    {[
                      "31% Jeep lineage — expect explosive prey drive",
                      "Double Jeep on both sides — high impact genetics",
                      "22% Red Boy adds gameness & stamina",
                      "Test for joint health due to inbreeding overlap",
                    ].map((tip, i) => (
                      <li key={i} className="flex items-start gap-1.5" style={{ fontFamily: "var(--font-table)", fontSize: "9.5px", color: "rgba(200,200,210,0.8)", lineHeight: 1.45 }}>
                        <span style={{ color: "var(--accent-gold)", fontSize: "7px", marginTop: "3px" }}>◆</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-lg p-3"
                  style={{
                    background: "linear-gradient(160deg, rgba(25,27,35,0.95) 0%, rgba(14,15,20,0.98) 100%)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}>
                  <h4 style={{ fontFamily: "var(--font-table)", fontWeight: 700, fontSize: "10px", color: "#fff", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>
                    How It Works
                  </h4>
                  <div className="flex items-center gap-2">
                    {[
                      { step: "1", text: "Enter parents" },
                      { step: "2", text: "We crunch 16 ancestors" },
                      { step: "3", text: "Results light up" },
                    ].map((s, i) => (
                      <div key={i} className="flex-1 flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: "linear-gradient(135deg, var(--accent-red, #dc2626), #991b1b)", fontSize: "9px", fontWeight: 700, fontFamily: "var(--font-table)", color: "#fff" }}>
                          {s.step}
                        </div>
                        <span style={{ fontFamily: "var(--font-table)", fontSize: "9px", color: "rgba(200,200,210,0.8)", fontWeight: 500 }}>{s.text}</span>
                        {i < 2 && <span style={{ color: "rgba(255,255,255,0.15)", fontSize: "12px" }}>→</span>}
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => openAuth("/breeding-calculator")}
                  className="w-full py-2 rounded-lg text-center"
                  style={{
                    fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em",
                    background: "linear-gradient(135deg, #dc2626, #991b1b)", color: "#fff",
                    border: "1px solid rgba(239,68,68,0.3)",
                    boxShadow: "0 4px 20px rgba(220,38,38,0.2)",
                    cursor: "pointer", transition: "all 0.2s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 6px 30px rgba(220,38,38,0.35)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 4px 20px rgba(220,38,38,0.2)"; e.currentTarget.style.transform = "translateY(0)"; }}>
                  Try Bloodline Calculator
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── Marketplace ── */}
        <section id="marketplace" className="py-4 px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="subtitle-gold text-center mb-1" style={{ fontFamily: "var(--font-table)", fontWeight: 500, fontSize: "clamp(0.95rem, 2vw, 1.25rem)" }}>
              Marketplace
            </h2>
            <p className="text-center mb-3" style={{ color: "rgba(180,180,195,0.7)", fontFamily: "var(--font-table)", fontSize: "10px", fontWeight: 400 }}>
              Buy, sell, and connect with breeders worldwide
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
              {[
                { icon: "🐕", title: "Dogs For Sale", desc: "Browse verified listings from registered breeders", color: "#ef4444", glow: "239,68,68", tag: "HOT", category: "dogs_for_sale" },
                { icon: "💎", title: "Stud Service", desc: "Find proven studs with full pedigree verification", color: "#8b5cf6", glow: "139,92,246", tag: null, category: "stud_service" },
                { icon: "🍼", title: "Litters for Sale", desc: "Reserve puppies from planned breedings", color: "#f472b6", glow: "244,114,182", tag: "NEW", category: "litters_for_sale" },
                { icon: "🎒", title: "Supplies & Gear", desc: "Premium products from trusted vendors", color: "#22c55e", glow: "34,197,94", tag: null, category: "supplies_gear" },
                { icon: "🚚", title: "Courier Services", desc: "Licensed pet transport & delivery", color: "#60a5fa", glow: "96,165,250", tag: null, category: "courier_services" },
                { icon: "📢", title: "Puppies Wanted", desc: "Post what you're looking for", color: "#e8c86e", glow: "212,168,85", tag: null, category: "puppies_wanted" },
              ].map((m, i) => (
                <div key={i} onClick={() => {
                  openAuth(`/marketplace?category=${m.category}`);
                }} className="group relative rounded-lg p-2.5 animate-scale-reveal cursor-pointer block"
                  style={{
                    animationDelay: `${i * 0.08}s`,
                    background: "linear-gradient(160deg, rgba(25,27,35,0.95) 0%, rgba(14,15,20,0.98) 100%)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    transition: "all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                    overflow: "hidden",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = m.color;
                    e.currentTarget.style.boxShadow = `0 0 30px rgba(${m.glow},0.12), 0 10px 35px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)`;
                    e.currentTarget.style.transform = "translateY(-4px) scale(1.01)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                    e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)";
                    e.currentTarget.style.transform = "translateY(0) scale(1)";
                  }}>
                  {/* Top accent line */}
                  <div className="absolute top-0 left-0 right-0 h-[2px] transition-all duration-400"
                    style={{ background: `linear-gradient(90deg, transparent 5%, ${m.color} 50%, transparent 95%)`, opacity: 0.3 }}
                    ref={el => {
                      if (el) {
                        const parent = el.parentElement;
                        parent?.addEventListener("mouseenter", () => { el.style.opacity = "1"; });
                        parent?.addEventListener("mouseleave", () => { el.style.opacity = "0.3"; });
                      }
                    }} />
                  <div className="flex items-start gap-2">
                    {/* Icon */}
                    <div className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-md"
                      style={{ background: `linear-gradient(135deg, rgba(${m.glow},0.12) 0%, rgba(${m.glow},0.04) 100%)`, border: `1px solid rgba(${m.glow},0.2)` }}>
                      <span className="text-sm">{m.icon}</span>
                    </div>
                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 style={{ fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "11px", color: "#fff", letterSpacing: "0.02em" }}>{m.title}</h3>
                        {m.tag && (
                          <span style={{
                            fontFamily: "var(--font-table)", fontWeight: 700, fontSize: "8px", letterSpacing: "0.08em",
                            color: m.tag === "HOT" ? "#ef4444" : "#22c55e",
                            background: m.tag === "HOT" ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.12)",
                            border: `1px solid ${m.tag === "HOT" ? "rgba(239,68,68,0.25)" : "rgba(34,197,94,0.25)"}`,
                            padding: "1px 6px", borderRadius: "9999px",
                          }}>{m.tag}</span>
                        )}
                      </div>
                      <p style={{ color: "rgba(180,180,195,0.7)", fontFamily: "var(--font-table)", fontSize: "9px", fontWeight: 400, lineHeight: 1.4, marginTop: "1px" }}>{m.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center mt-3">
              <button onClick={() => {
                  openAuth("/marketplace");
                }} className="inline-block px-5 py-1.5 rounded-lg"
                style={{
                  fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em",
                  color: "var(--accent-gold)", border: "1px solid rgba(212,168,85,0.3)", transition: "all 0.2s", cursor: "pointer", background: "transparent",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent-gold)"; e.currentTarget.style.boxShadow = "0 0 20px rgba(212,168,85,0.15)"; e.currentTarget.style.color = "var(--accent-gold-bright)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(212,168,85,0.3)"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.color = "var(--accent-gold)"; }}>
                Explore Marketplace
              </button>
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="py-4 px-4" style={{ borderTop: "1px solid var(--border)" }}>
          <div className="max-w-5xl mx-auto">
            {/* Top row */}
            <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-4 mb-4">
              {/* Brand */}
              <div className="flex flex-col items-center md:items-start gap-1.5">
                <div className="flex items-center gap-2">
                  <img src={LOGO} alt="" width={24} height={24} className="rounded-md" />
                  <span style={{ fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "11px", color: "var(--accent-gold)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Pedigree Platform</span>
                </div>
                <p style={{ fontFamily: "var(--font-table)", fontSize: "10px", color: "rgba(200,200,210,0.7)", maxWidth: "240px", lineHeight: 1.5 }} className="text-center md:text-left">
                  The most comprehensive pedigree management platform for breeders worldwide.
                </p>
              </div>

              {/* Quick links */}
              <div className="flex gap-8">
                <div>
                  <h4 style={{ fontFamily: "var(--font-table)", fontWeight: 700, fontSize: "9px", color: "var(--accent-gold-bright)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "6px" }}>Platform</h4>
                  <div className="flex flex-col gap-1.5">
                    {[{ label: "Features", href: "#features" }, { label: "Bloodline Calculator", href: "#breeding-calculator" }, { label: "Marketplace", href: "#marketplace" }].map((l) => (
                      <a key={l.label} href={l.href} style={{ fontFamily: "var(--font-table)", fontSize: "10px", color: "rgba(200,200,210,0.8)", transition: "color 0.2s" }}
                        onMouseEnter={e => e.currentTarget.style.color = "#fff"}
                        onMouseLeave={e => e.currentTarget.style.color = "rgba(200,200,210,0.8)"}>{l.label}</a>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 style={{ fontFamily: "var(--font-table)", fontWeight: 700, fontSize: "9px", color: "var(--accent-gold-bright)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "6px" }}>Legal</h4>
                  <div className="flex flex-col gap-1.5">
                    {[{ label: "Privacy", href: "/privacy" }, { label: "Terms", href: "/terms" }].map((l) => (
                      <Link key={l.label} href={l.href} style={{ fontFamily: "var(--font-table)", fontSize: "10px", color: "rgba(200,200,210,0.8)", transition: "color 0.2s" }}
                        onMouseEnter={e => e.currentTarget.style.color = "#fff"}
                        onMouseLeave={e => e.currentTarget.style.color = "rgba(200,200,210,0.8)"}>{l.label}</Link>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 style={{ fontFamily: "var(--font-table)", fontWeight: 700, fontSize: "9px", color: "var(--accent-gold-bright)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "6px" }}>Support</h4>
                  <div className="flex flex-col gap-1.5">
                    <Link href="/contact" style={{ fontFamily: "var(--font-table)", fontSize: "10px", color: "rgba(200,200,210,0.8)", transition: "color 0.2s" }}
                      onMouseEnter={e => e.currentTarget.style.color = "#fff"}
                      onMouseLeave={e => e.currentTarget.style.color = "rgba(200,200,210,0.8)"}>Contact Us</Link>
                    <a href="mailto:support@pedigreeplatform.com" style={{ fontFamily: "var(--font-table)", fontSize: "10px", color: "rgba(200,200,210,0.8)", transition: "color 0.2s" }}
                      onMouseEnter={e => e.currentTarget.style.color = "#fff"}
                      onMouseLeave={e => e.currentTarget.style.color = "rgba(200,200,210,0.8)"}>support@pedigreeplatform.com</a>
                  </div>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="w-full h-[1px] mb-3" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)" }} />

            {/* Bottom row */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-2">
              <p style={{ color: "rgba(200,200,210,0.6)", fontFamily: "var(--font-table)", fontSize: "10px", fontWeight: 400 }}>&copy; 2026 Pedigree Platform. All rights reserved.</p>
              <div className="flex items-center gap-4">
                <span style={{ fontFamily: "var(--font-table)", fontSize: "10px", color: "var(--accent-gold)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Follow us</span>
                {/* Telegram */}
                <a href="#" aria-label="Telegram" style={{ color: "#26A5E4", transition: "opacity 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.opacity = "0.7"}
                  onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                </a>
                {/* WhatsApp */}
                <a href="#" aria-label="WhatsApp" style={{ color: "#25D366", transition: "opacity 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.opacity = "0.7"}
                  onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                </a>
              </div>
            </div>
          </div>
        </footer>
      </main>

      {/* ── Auth Modal ── */}
      {authModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
          onClick={() => setAuthModal(false)}>
          <div className="relative rounded-2xl p-8 max-w-sm w-full mx-4 animate-scale-reveal"
            style={{
              background: "linear-gradient(160deg, rgba(22,24,30,0.98) 0%, rgba(10,11,14,0.99) 100%)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 25px 60px rgba(0,0,0,0.6), 0 0 40px rgba(220,38,38,0.08)",
            }}
            onClick={e => e.stopPropagation()}>
            {/* Close button */}
            <button onClick={() => setAuthModal(false)}
              className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)", fontSize: "14px", cursor: "pointer", transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.4)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}>
              ✕
            </button>
            {/* Logo */}
            <div className="text-center mb-5">
              <img src={LOGO} alt="Pedigree Platform" width={64} height={64} className="rounded-xl mx-auto mb-3"
                style={{ boxShadow: "0 0 30px rgba(220,38,38,0.2)" }} />
              <h3 style={{ fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "18px", color: "#fff", letterSpacing: "0.02em" }}>
                Sign in to continue
              </h3>
              <p style={{ fontFamily: "var(--font-table)", fontSize: "12px", color: "rgba(180,180,195,0.7)", marginTop: "6px" }}>
                Create an account or log in to access this feature
              </p>
            </div>
            {/* Divider */}
            <div className="w-full h-[1px] mb-5" style={{ background: "linear-gradient(90deg, transparent, rgba(212,168,85,0.3), transparent)" }} />
            {/* Buttons */}
            <div className="flex flex-col gap-3">
              <Link href="/register" onClick={() => setAuthModal(false)}
                className="w-full py-3 rounded-xl text-center block"
                style={{
                  fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.08em",
                  background: "linear-gradient(135deg, var(--accent-gold), #b8860b)", color: "#000",
                  boxShadow: "0 4px 15px rgba(212,168,85,0.25)", transition: "all 0.2s",
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 6px 25px rgba(212,168,85,0.4)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 4px 15px rgba(212,168,85,0.25)"; e.currentTarget.style.transform = "translateY(0)"; }}>
                Create Free Account
              </Link>
              <Link href="/login" onClick={() => setAuthModal(false)}
                className="w-full py-3 rounded-xl text-center block"
                style={{
                  fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.08em",
                  color: "var(--accent-gold)", border: "1px solid rgba(212,168,85,0.3)",
                  transition: "all 0.2s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent-gold)"; e.currentTarget.style.boxShadow = "0 0 20px rgba(212,168,85,0.12)"; e.currentTarget.style.color = "var(--accent-gold-bright)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(212,168,85,0.3)"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.color = "var(--accent-gold)"; }}>
                Log In
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
