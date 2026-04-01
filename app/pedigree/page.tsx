"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";

const LOGO = "/logo.png";

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
  "GR CH": "#1d5bbf", CH: "#c02828", ROM: "#0d7468", POR: "#6d30b0",
  "1XW": "#0d7468", "2XW": "#b45a0a", "3XW": "#8a6518",
  "4XW": "#b03878", "5XW": "#6d30b0", "6XW": "#6d30b0", "7XW": "#6d30b0",
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
    <div className="min-h-screen" style={{ background: "#EDE4D5" }}>
      {/* Nav */}
      <nav className="sticky top-0 z-50 px-4 md:px-6 py-3 flex items-center justify-between"
           style={{ background: "#FAF7F2", borderBottom: "2px solid #C9B29F" }}>
        <Link href="/" className="flex items-center gap-3">
          <img src={LOGO} alt="Logo" className="w-12" style={{ height: "auto" }} />
          <span style={{
            fontFamily: "var(--font-table)", fontWeight: 700, fontSize: "1.1rem",
            color: "#1C1C1C",
          }}>
            Pedigree Platform
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/login"
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hidden sm:inline-flex"
            style={{ color: "#1C1C1C", border: "2px solid #C9B29F", fontFamily: "var(--font-table)", borderRadius: "8px" }}>
            Sign In
          </Link>
          <Link href="/register"
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{ background: "#1C1C1C", color: "#FAF7F2", fontFamily: "var(--font-table)", borderRadius: "8px" }}>
            Sign Up
          </Link>
        </div>
      </nav>

      {/* Hero / Search */}
      <section className="relative px-4 md:px-6 pt-12 pb-8">
        <div className="relative max-w-3xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src={LOGO} alt="Logo" className="w-28" style={{ height: "auto" }} />
          </div>
          <h1 style={{
            fontFamily: "var(--font-table)", fontSize: "clamp(1.8rem, 5vw, 3rem)", fontWeight: 700,
            lineHeight: 1.1, color: "#1C1C1C",
          }}>
            Pedigree <span style={{ color: "#C9B29F" }}>Hub</span>
          </h1>
          <p className="mt-3 mb-8 max-w-lg mx-auto" style={{ fontFamily: "var(--font-table)", fontSize: "15px", color: "#6B6B6B", lineHeight: 1.6 }}>
            Search over <span style={{ color: "#1C1C1C", fontWeight: 700 }}>500,000+</span> dogs.
            View pedigrees, bloodlines, offspring, siblings &amp; genetic stats — all free.
          </p>

          {/* Search Box */}
          <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto">
            <div className="rounded-lg overflow-hidden transition-all duration-300"
              style={{
                background: "#FAF7F2",
                border: "2px solid #C9B29F",
                borderRadius: "8px",
              }}>
              <div className="flex items-center px-5 py-4 gap-4">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C9B29F" strokeWidth="2.5" strokeLinecap="round">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
                <input ref={inputRef}
                  type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by dog name... e.g. Honeybunch, Jeep, Bullyson"
                  className="flex-1 bg-transparent outline-none"
                  style={{ fontFamily: "var(--font-table)", fontSize: "16px", color: "#1C1C1C", fontWeight: 500 }}
                />
                <button type="submit"
                  className="px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex-shrink-0"
                  style={{
                    background: "#1C1C1C", color: "#FAF7F2",
                    fontFamily: "var(--font-table)", letterSpacing: "0.04em", textTransform: "uppercase",
                    borderRadius: "8px",
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
              { label: "Males", value: "MALE" },
              { label: "Females", value: "FEMALE" },
            ].map((f) => (
              <button key={f.value} onClick={() => setSexFilter(f.value)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  fontFamily: "var(--font-table)",
                  background: sexFilter === f.value ? "#1C1C1C" : "#FAF7F2",
                  color: sexFilter === f.value ? "#FAF7F2" : "#6B6B6B",
                  border: "2px solid #C9B29F",
                }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 md:px-6 pb-12">
        {/* Search Results */}
        {searched && (
          <section className="mb-12">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex items-center gap-3" style={{ color: "#6B6B6B", fontFamily: "var(--font-table)" }}>
                  <div className="w-5 h-5 rounded-lg border-2 border-t-transparent animate-spin"
                       style={{ borderColor: "#C9B29F", borderTopColor: "transparent" }} />
                  Searching...
                </div>
              </div>
            ) : results.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <p style={{ fontFamily: "var(--font-table)", fontSize: "14px", color: "#6B6B6B" }}>
                    Found <span style={{ color: "#1C1C1C", fontWeight: 700 }}>{total.toLocaleString()}</span> results for &ldquo;{query}&rdquo;
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
                        className="group rounded-lg overflow-hidden transition-all hover:scale-[1.02]"
                        style={{ border: "2px solid #C9B29F", background: "#FAF7F2", borderRadius: "8px" }}>
                        {/* Photo or placeholder */}
                        <div className="h-36 relative overflow-hidden">
                          {photo ? (
                            <img src={photo} alt={dog.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"
                                 style={{ background: isMale ? "rgba(29,91,191,0.08)" : "rgba(159,18,57,0.08)" }}>
                              <span className="text-5xl opacity-15" style={{ color: isMale ? "#1d5bbf" : "#9f1239" }}>
                                {isMale ? "M" : "F"}
                              </span>
                            </div>
                          )}
                          {/* Sex badge */}
                          <span className="absolute top-2 left-2 text-xs font-bold px-2 py-1 rounded-lg"
                            style={{
                              background: isMale ? "#1d5bbf" : "#9f1239",
                              color: "#FAF7F2", fontFamily: "var(--font-table)",
                            }}>
                            {isMale ? "Male" : "Female"}
                          </span>
                          {/* Title badges */}
                          {titles.length > 0 && (
                            <div className="absolute top-2 right-2 flex gap-1">
                              {titles.slice(0, 2).map((t) => (
                                <span key={t} className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                                  style={{ background: "#FAF7F2", color: TC[t] || "#1C1C1C", fontFamily: "var(--font-table)", border: "1px solid #C9B29F" }}>
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        {/* Info */}
                        <div className="p-3.5">
                          <h3 className="text-sm font-bold truncate transition-colors"
                              style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>
                            {dog.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1.5">
                            {dog.color && (
                              <span className="text-[10px] px-2 py-0.5 rounded-lg"
                                style={{ background: "#FAFAFA", color: "#6B6B6B", fontFamily: "var(--font-table)", border: "1px solid #C9B29F" }}>
                                {dog.color}
                              </span>
                            )}
                            <span className="text-[10px]" style={{ color: "#6B6B6B", fontFamily: "var(--font-mono)" }}>
                              {dog.reg_number}
                            </span>
                          </div>
                          {(dog.sire_name || dog.dam_name) && (
                            <div className="mt-2 pt-2 flex flex-col gap-0.5" style={{ borderTop: "1px solid #C9B29F" }}>
                              {dog.sire_name && (
                                <div className="text-[10px] truncate" style={{ fontFamily: "var(--font-table)" }}>
                                  <span style={{ color: "#1d5bbf" }}>Sire:</span>{" "}
                                  <span style={{ color: "#6B6B6B" }}>{dog.sire_name}</span>
                                </div>
                              )}
                              {dog.dam_name && (
                                <div className="text-[10px] truncate" style={{ fontFamily: "var(--font-table)" }}>
                                  <span style={{ color: "#9f1239" }}>Dam:</span>{" "}
                                  <span style={{ color: "#6B6B6B" }}>{dog.dam_name}</span>
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
                      style={{ background: "#FAF7F2", color: "#1C1C1C", border: "2px solid #C9B29F", fontFamily: "var(--font-table)", borderRadius: "8px" }}>
                      Prev
                    </button>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "#6B6B6B" }}>
                      Page {page} of {totalPages}
                    </span>
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                      className="px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-30"
                      style={{ background: "#FAF7F2", color: "#1C1C1C", border: "2px solid #C9B29F", fontFamily: "var(--font-table)", borderRadius: "8px" }}>
                      Next
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16">
                <p style={{ color: "#6B6B6B", fontFamily: "var(--font-table)", fontSize: "15px" }}>
                  No dogs found for &ldquo;{query}&rdquo;
                </p>
                <p className="mt-2" style={{ color: "#6B6B6B", fontFamily: "var(--font-table)", fontSize: "12px" }}>
                  Try a different name or check the spelling
                </p>
              </div>
            )}
          </section>
        )}

        {/* Famous Dogs (shown when no search) */}
        {!searched && (
          <section>
            <div className="text-center mb-6">
              <h2 style={{ fontFamily: "var(--font-table)", fontWeight: 700, fontSize: "1.3rem", color: "#1C1C1C" }}>
                Legendary Bloodlines
              </h2>
              <p style={{ fontFamily: "var(--font-table)", fontSize: "13px", color: "#6B6B6B", marginTop: "4px" }}>
                Start exploring with the most iconic dogs in APBT history
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {FAMOUS_DOGS.map((dog) => {
                const isMale = dog.sex === "M";
                return (
                  <Link key={dog.id} href={`/pedigree/${dog.id}`}
                    className="group rounded-lg p-5 text-center transition-all hover:scale-[1.03]"
                    style={{
                      background: "#FAF7F2",
                      border: "2px solid #C9B29F",
                      borderRadius: "8px",
                    }}>
                    <div className="w-16 h-16 rounded-lg mx-auto mb-3 flex items-center justify-center text-2xl"
                      style={{
                        background: isMale ? "rgba(29,91,191,0.08)" : "rgba(159,18,57,0.08)",
                        border: `2px solid ${isMale ? "#1d5bbf" : "#9f1239"}`,
                        color: isMale ? "#1d5bbf" : "#9f1239",
                      }}>
                      {isMale ? "M" : "F"}
                    </div>
                    <h3 className="text-sm font-bold truncate transition-colors"
                        style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>
                      {dog.name}
                    </h3>
                    <div className="flex items-center justify-center gap-2 mt-1.5">
                      {dog.color && (
                        <span className="text-[10px]" style={{ color: "#6B6B6B", fontFamily: "var(--font-table)" }}>{dog.color}</span>
                      )}
                    </div>
                    <div className="mt-3 text-xs font-semibold px-3 py-1.5 rounded-lg inline-block transition-all group-hover:scale-105"
                      style={{
                        background: "#1C1C1C", color: "#FAF7F2",
                        fontFamily: "var(--font-table)", borderRadius: "8px",
                      }}>
                      View Pedigree
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Features Callout */}
        {!searched && (
          <section className="mt-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { title: "4-Gen Pedigree Trees", desc: "Interactive lineage visualization with clickable ancestors" },
                { title: "Genetic Stats", desc: "See bloodline percentages and coefficient of inbreeding" },
                { title: "Share Anywhere", desc: "Share pedigree links via WhatsApp, Telegram, or social media" },
              ].map((f, i) => (
                <div key={i} className="rounded-lg p-5 text-center"
                  style={{
                    background: "#FAF7F2",
                    border: "2px solid #C9B29F",
                    borderRadius: "8px",
                  }}>
                  <h3 style={{ fontFamily: "var(--font-table)", fontWeight: 700, fontSize: "14px", color: "#1C1C1C" }}>{f.title}</h3>
                  <p className="mt-1" style={{ fontFamily: "var(--font-table)", fontSize: "12px", color: "#6B6B6B" }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        {!searched && (
          <section className="mt-12 text-center rounded-lg p-8"
            style={{
              background: "#FAF7F2",
              border: "2px solid #C9B29F",
              borderRadius: "8px",
            }}>
            <h2 style={{ fontFamily: "var(--font-table)", fontWeight: 700, fontSize: "1.3rem", color: "#1C1C1C" }}>
              Want to build your own pedigrees?
            </h2>
            <p className="mt-2 mb-5" style={{ fontFamily: "var(--font-table)", fontSize: "14px", color: "#6B6B6B" }}>
              Create an account to register dogs, build pedigree trees, track litters, and more.
            </p>
            <Link href="/register"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-lg text-sm font-bold transition-all"
              style={{
                background: "#1C1C1C", color: "#FAF7F2",
                fontFamily: "var(--font-table)", letterSpacing: "0.04em", textTransform: "uppercase",
                borderRadius: "8px",
              }}>
              Get Started Free
            </Link>
          </section>
        )}
      </div>

      {/* Footer */}
      <footer className="text-center py-8 mt-4" style={{ borderTop: "2px solid #C9B29F" }}>
        <div className="flex items-center justify-center gap-2 mb-3">
          <img src={LOGO} alt="Logo" className="w-12" style={{ height: "auto" }} />
          <span style={{
            fontFamily: "var(--font-table)", fontWeight: 700, fontSize: "14px",
            color: "#1C1C1C",
          }}>Pedigree Platform</span>
        </div>
        <p className="text-xs" style={{ color: "#6B6B6B", fontFamily: "var(--font-table)" }}>
          The modern pedigree hub for breeders, owners, and enthusiasts.
        </p>
        <div className="flex items-center justify-center gap-4 mt-3">
          <Link href="/privacy" className="text-xs hover:underline" style={{ color: "#6B6B6B" }}>Privacy</Link>
          <Link href="/terms" className="text-xs hover:underline" style={{ color: "#6B6B6B" }}>Terms</Link>
          <Link href="/contact" className="text-xs hover:underline" style={{ color: "#6B6B6B" }}>Contact</Link>
        </div>
      </footer>
    </div>
  );
}
