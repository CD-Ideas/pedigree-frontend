"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";

const LOGO = "https://i.imgur.com/cAvQemZ.png";

interface DogResult {
  id: number;
  name: string;
  sex: string;
  color: string | null;
  reg_number: string;
  titles: string[];
  profile_image_url: string | null;
  sire_name: string | null;
  dam_name: string | null;
}

const TC: Record<string, string> = {
  "GR CH": "#fbbf24", CH: "#60a5fa", ROM: "#34d399",
  "1XW": "#f97316", "2XW": "#f97316", "3XW": "#f97316",
  "4XW": "#ef4444", "5XW": "#ef4444",
};

const FAMOUS_DOGS = [
  { id: 3, name: "CH Crenshaw's Honeybunch (3XW) ROM", sex: "F", color: "BKSKN" },
  { id: 13270, name: "CH Jeep ROM", sex: "M", color: "RED/REDNOSE" },
  { id: 516, name: "Walling's Bullyson (2XW)(1XL)", sex: "M", color: "BKSKN" },
  { id: 5765, name: "CH Chinaman ROM", sex: "M", color: "BLK" },
  { id: 2, name: "CH Carver's Cracker (3XW)(1XL)", sex: "M", color: "BKSKN" },
  { id: 12, name: "GR CH Buck ROM", sex: "M", color: "BRDL" },
  { id: 7, name: "Tudor's Dibo (3XW)", sex: "M", color: "BDL&WHT" },
  { id: 42, name: "CH Red Boy", sex: "M", color: "RED" },
];

export default function PedigreeHub() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DogResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [sexFilter, setSexFilter] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const doSearch = async (q: string, p: number, sex: string) => {
    setLoading(true);
    setSearched(true);
    try {
      let url = `/api/dogs?q=${encodeURIComponent(q)}&page=${p}&limit=20`;
      if (sex) url += `&sex=${sex}`;
      const res = await fetch(url);
      const data = await res.json();
      setResults(data.dogs || []);
      setTotalPages(data.totalPages || 0);
      setTotal(data.total || 0);
    } catch (_e) {
      setResults([]);
    }
    setLoading(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setPage(1);
      doSearch(query, 1, sexFilter);
    }
  };

  useEffect(() => {
    if (searched && query.trim()) doSearch(query, page, sexFilter);
  }, [page]);

  useEffect(() => {
    if (searched && query.trim()) {
      setPage(1);
      doSearch(query, 1, sexFilter);
    }
  }, [sexFilter]);

  const photoUrl = (dog: any) => {
    if (!dog.profile_image_url) return null;
    return dog.profile_image_url.startsWith("http") ? dog.profile_image_url : `https://www.apbt.online-pedigrees.com/${dog.profile_image_url}`;
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-deep)" }}>
      {/* ─── Nav ─── */}
      <nav className="sticky top-0 z-50 px-4 md:px-6 py-3 flex items-center justify-between"
           style={{ background: "rgba(11,17,32,0.95)", backdropFilter: "blur(20px)", borderBottom: "1px solid var(--border)" }}>
        <Link href="/" className="flex items-center gap-3">
          <img src={LOGO} alt="Logo" className="w-8 h-8 rounded-lg" />
          <span style={{
            fontFamily: "var(--font-table)", fontWeight: 700, fontSize: "1.1rem",
            background: "linear-gradient(135deg, #e8c86e, #d4a855, #b8860b)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            Pedigree Platform
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/login"
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-105 hidden sm:inline-flex"
            style={{ color: "var(--accent-gold)", border: "1px solid rgba(212,168,85,0.3)", fontFamily: "var(--font-table)" }}>
            Sign In
          </Link>
          <Link href="/register"
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-105"
            style={{ background: "linear-gradient(135deg, var(--accent-gold), #b8860b)", color: "#000", fontFamily: "var(--font-table)" }}>
            Sign Up
          </Link>
        </div>
      </nav>

      {/* ─── Hero / Search ─── */}
      <section className="relative px-4 md:px-6 pt-12 pb-8">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full opacity-10"
             style={{ background: "radial-gradient(circle, rgba(212,168,85,0.5) 0%, transparent 70%)" }} />
        <div className="relative max-w-3xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src={LOGO} alt="Logo" className="w-14 h-14 rounded-xl" style={{ boxShadow: "0 0 30px rgba(220,38,38,0.2)" }} />
          </div>
          <h1 style={{
            fontFamily: "var(--font-table)", fontSize: "clamp(1.8rem, 5vw, 3rem)", fontWeight: 700,
            lineHeight: 1.1, color: "var(--text-primary)",
          }}>
            Pedigree <span style={{ color: "var(--accent-gold)" }}>Hub</span>
          </h1>
          <p className="mt-3 mb-8 max-w-lg mx-auto" style={{ fontFamily: "var(--font-table)", fontSize: "15px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
            Search over <span style={{ color: "var(--accent-gold)", fontWeight: 700 }}>500,000+</span> dogs.
            View pedigrees, bloodlines, offspring, siblings &amp; genetic stats — all free.
          </p>

          {/* Search Box */}
          <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto">
            <div className="rounded-2xl overflow-hidden transition-all duration-300"
              style={{
                background: "linear-gradient(160deg, rgba(25,27,35,0.95), rgba(14,15,20,0.98))",
                border: "1px solid rgba(212,168,85,0.25)",
                boxShadow: "0 0 40px rgba(212,168,85,0.06), 0 8px 32px rgba(0,0,0,0.4)",
              }}>
              <div className="flex items-center px-5 py-4 gap-4">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-gold)" strokeWidth="2.5" strokeLinecap="round">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
                <input ref={inputRef}
                  type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by dog name... e.g. Honeybunch, Jeep, Bullyson"
                  className="flex-1 bg-transparent outline-none"
                  style={{ fontFamily: "var(--font-table)", fontSize: "16px", color: "var(--text-primary)", fontWeight: 500 }}
                />
                <button type="submit"
                  className="px-6 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105 flex-shrink-0"
                  style={{
                    background: "linear-gradient(135deg, var(--accent-gold), #b8860b)", color: "#000",
                    fontFamily: "var(--font-table)", letterSpacing: "0.04em", textTransform: "uppercase",
                  }}>
                  Search
                </button>
              </div>
            </div>
          </form>

          {/* Sex filter pills */}
          <div className="flex items-center justify-center gap-2 mt-4">
            {[
              { label: "All", value: "" },
              { label: "♂ Males", value: "MALE" },
              { label: "♀ Females", value: "FEMALE" },
            ].map((f) => (
              <button key={f.value} onClick={() => setSexFilter(f.value)}
                className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={{
                  fontFamily: "var(--font-table)",
                  background: sexFilter === f.value ? "rgba(212,168,85,0.15)" : "rgba(255,255,255,0.04)",
                  color: sexFilter === f.value ? "var(--accent-gold)" : "var(--text-muted)",
                  border: sexFilter === f.value ? "1px solid rgba(212,168,85,0.3)" : "1px solid rgba(255,255,255,0.06)",
                }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 md:px-6 pb-12">
        {/* ─── Search Results ─── */}
        {searched && (
          <section className="mb-12">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex items-center gap-3" style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)" }}>
                  <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                       style={{ borderColor: "var(--accent-gold)", borderTopColor: "transparent" }} />
                  Searching...
                </div>
              </div>
            ) : results.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <p style={{ fontFamily: "var(--font-table)", fontSize: "14px", color: "var(--text-secondary)" }}>
                    Found <span style={{ color: "var(--accent-gold)", fontWeight: 700 }}>{total.toLocaleString()}</span> results for &ldquo;{query}&rdquo;
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {results.map((dog) => {
                    const isMale = dog.sex === "MALE" || dog.sex === "M";
                    const photo = photoUrl(dog);
                    const titlePatterns = ["GR CH", "CH", "ROM", "1XW", "2XW", "3XW", "4XW", "5XW"];
                    const titles = titlePatterns.filter(t => dog.name?.toUpperCase().includes(t));
                    return (
                      <Link key={dog.id} href={`/pedigree/${dog.id}`}
                        className="group rounded-xl overflow-hidden transition-all hover:scale-[1.02] hover:shadow-lg"
                        style={{ border: "1.5px solid rgba(30,64,120,0.8)", boxShadow: "0 2px 20px rgba(0,0,0,0.25)", background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)" }}>
                        {/* Photo or gradient */}
                        <div className="h-36 relative overflow-hidden">
                          {photo ? (
                            <img src={photo} alt={dog.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"
                                 style={{ background: isMale ? "linear-gradient(135deg, #0c1929, #1a2e4a)" : "linear-gradient(135deg, #29101c, #3d1a2e)" }}>
                              <span className="text-5xl opacity-15" style={{ color: isMale ? "var(--male-color)" : "var(--female-color)" }}>
                                {isMale ? "♂" : "♀"}
                              </span>
                            </div>
                          )}
                          {/* Sex badge */}
                          <span className="absolute top-2 left-2 text-xs font-bold px-2 py-1 rounded-lg"
                            style={{
                              background: isMale ? "rgba(96,165,250,0.9)" : "rgba(244,114,182,0.9)",
                              color: "#000", fontFamily: "var(--font-table)",
                            }}>
                            {isMale ? "♂ Male" : "♀ Female"}
                          </span>
                          {/* Title badges */}
                          {titles.length > 0 && (
                            <div className="absolute top-2 right-2 flex gap-1">
                              {titles.slice(0, 2).map((t) => (
                                <span key={t} className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                                  style={{ background: "rgba(0,0,0,0.7)", color: TC[t] || "var(--accent-gold)", fontFamily: "var(--font-table)" }}>
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        {/* Info */}
                        <div className="p-3.5">
                          <h3 className="text-sm font-bold truncate group-hover:text-[var(--accent-gold)] transition-colors"
                              style={{ color: "var(--text-primary)", fontFamily: "var(--font-table)" }}>
                            {dog.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1.5">
                            {dog.color && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full"
                                style={{ background: "var(--bg-elevated)", color: "var(--text-muted)", fontFamily: "var(--font-table)" }}>
                                {dog.color}
                              </span>
                            )}
                            <span className="text-[10px]" style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                              {dog.reg_number}
                            </span>
                          </div>
                          {(dog.sire_name || dog.dam_name) && (
                            <div className="mt-2 pt-2 flex flex-col gap-0.5" style={{ borderTop: "1px solid var(--border)" }}>
                              {dog.sire_name && (
                                <div className="text-[10px] truncate" style={{ fontFamily: "var(--font-table)" }}>
                                  <span style={{ color: "var(--male-color)" }}>♂</span>{" "}
                                  <span style={{ color: "var(--text-muted)" }}>{dog.sire_name}</span>
                                </div>
                              )}
                              {dog.dam_name && (
                                <div className="text-[10px] truncate" style={{ fontFamily: "var(--font-table)" }}>
                                  <span style={{ color: "var(--female-color)" }}>♀</span>{" "}
                                  <span style={{ color: "var(--text-muted)" }}>{dog.dam_name}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                      className="px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-30"
                      style={{ background: "var(--bg-surface)", color: "var(--text-secondary)", border: "1px solid var(--border)", fontFamily: "var(--font-table)" }}>
                      ← Prev
                    </button>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--text-muted)" }}>
                      Page {page} of {totalPages}
                    </span>
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                      className="px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-30"
                      style={{ background: "var(--bg-surface)", color: "var(--text-secondary)", border: "1px solid var(--border)", fontFamily: "var(--font-table)" }}>
                      Next →
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16">
                <div className="text-5xl mb-4 opacity-30">🔍</div>
                <p style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)", fontSize: "15px" }}>
                  No dogs found for &ldquo;{query}&rdquo;
                </p>
                <p className="mt-2" style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)", fontSize: "12px" }}>
                  Try a different name or check the spelling
                </p>
              </div>
            )}
          </section>
        )}

        {/* ─── Famous Dogs (shown when no search) ─── */}
        {!searched && (
          <section>
            <div className="text-center mb-6">
              <h2 style={{ fontFamily: "var(--font-table)", fontWeight: 700, fontSize: "1.3rem", color: "var(--text-primary)" }}>
                🏆 Legendary Bloodlines
              </h2>
              <p style={{ fontFamily: "var(--font-table)", fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
                Start exploring with the most iconic dogs in APBT history
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {FAMOUS_DOGS.map((dog) => {
                const isMale = dog.sex === "M";
                return (
                  <Link key={dog.id} href={`/pedigree/${dog.id}`}
                    className="group rounded-xl p-5 text-center transition-all hover:scale-[1.03]"
                    style={{
                      background: "linear-gradient(160deg, rgba(25,27,35,0.95), rgba(14,15,20,0.98))",
                      border: "1px solid rgba(255,255,255,0.07)",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
                    }}>
                    <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl"
                      style={{
                        background: isMale ? "rgba(96,165,250,0.1)" : "rgba(244,114,182,0.1)",
                        border: `2px solid ${isMale ? "rgba(96,165,250,0.25)" : "rgba(244,114,182,0.25)"}`,
                        color: isMale ? "var(--male-color)" : "var(--female-color)",
                      }}>
                      {isMale ? "♂" : "♀"}
                    </div>
                    <h3 className="text-sm font-bold truncate group-hover:text-[var(--accent-gold)] transition-colors"
                        style={{ color: "var(--text-primary)", fontFamily: "var(--font-table)" }}>
                      {dog.name}
                    </h3>
                    <div className="flex items-center justify-center gap-2 mt-1.5">
                      {dog.color && (
                        <span className="text-[10px]" style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)" }}>{dog.color}</span>
                      )}
                    </div>
                    <div className="mt-3 text-xs font-semibold px-3 py-1.5 rounded-lg inline-block transition-all group-hover:scale-105"
                      style={{
                        background: "rgba(212,168,85,0.08)", color: "var(--accent-gold)",
                        border: "1px solid rgba(212,168,85,0.15)", fontFamily: "var(--font-table)",
                      }}>
                      View Pedigree →
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ─── Features Callout ─── */}
        {!searched && (
          <section className="mt-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { icon: "🌳", title: "4-Gen Pedigree Trees", desc: "Interactive lineage visualization with clickable ancestors" },
                { icon: "🧬", title: "Genetic Stats", desc: "See bloodline percentages and coefficient of inbreeding" },
                { icon: "🔗", title: "Share Anywhere", desc: "Share pedigree links via WhatsApp, Telegram, or social media" },
              ].map((f, i) => (
                <div key={i} className="rounded-xl p-5 text-center"
                  style={{
                    background: "linear-gradient(160deg, rgba(25,27,35,0.95), rgba(14,15,20,0.98))",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}>
                  <div className="text-3xl mb-2">{f.icon}</div>
                  <h3 style={{ fontFamily: "var(--font-table)", fontWeight: 700, fontSize: "14px", color: "var(--accent-gold)" }}>{f.title}</h3>
                  <p className="mt-1" style={{ fontFamily: "var(--font-table)", fontSize: "12px", color: "var(--text-muted)" }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ─── CTA ─── */}
        {!searched && (
          <section className="mt-12 text-center rounded-2xl p-8"
            style={{
              background: "linear-gradient(160deg, rgba(212,168,85,0.06), rgba(14,15,20,0.98))",
              border: "1px solid rgba(212,168,85,0.15)",
            }}>
            <h2 style={{ fontFamily: "var(--font-table)", fontWeight: 700, fontSize: "1.3rem", color: "var(--text-primary)" }}>
              Want to build your own pedigrees?
            </h2>
            <p className="mt-2 mb-5" style={{ fontFamily: "var(--font-table)", fontSize: "14px", color: "var(--text-muted)" }}>
              Create an account to register dogs, build pedigree trees, track litters, and more.
            </p>
            <Link href="/register"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold transition-all hover:scale-105"
              style={{
                background: "linear-gradient(135deg, var(--accent-gold), #b8860b)", color: "#000",
                fontFamily: "var(--font-table)", letterSpacing: "0.04em", textTransform: "uppercase",
                boxShadow: "0 4px 20px rgba(212,168,85,0.25)",
              }}>
              Get Started Free →
            </Link>
          </section>
        )}
      </div>

      {/* ─── Footer ─── */}
      <footer className="text-center py-8 mt-4" style={{ borderTop: "1px solid var(--border)" }}>
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
          <Link href="/" className="text-xs hover:underline" style={{ color: "var(--text-muted)" }}>Home</Link>
          <Link href="/privacy" className="text-xs hover:underline" style={{ color: "var(--text-muted)" }}>Privacy</Link>
          <Link href="/terms" className="text-xs hover:underline" style={{ color: "var(--text-muted)" }}>Terms</Link>
          <Link href="/contact" className="text-xs hover:underline" style={{ color: "var(--text-muted)" }}>Contact</Link>
        </div>
      </footer>
    </div>
  );
}
