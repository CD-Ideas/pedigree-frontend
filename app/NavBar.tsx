"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { getDogColor } from "@/app/utils/colors";

const LOGO = "https://i.imgur.com/cAvQemZ.png";


function NavSearch() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ dog_id: number; registered_name: string; photo_url?: string | null }[]>([]);
  const [show, setShow] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setShow(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const doSearch = (val: string) => {
    setQ(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    // URL paste detection
    const urlMatch = val.match(/pedigreeplatform\.com\/(?:pedigree|dogs)\/(\d+)/);
    if (urlMatch) {
      fetch(`/api/dogs/${urlMatch[1]}`)
        .then((r) => r.json())
        .then((data) => {
          if (data?.registered_name) {
            setResults([{ dog_id: Number(urlMatch[1]), registered_name: data.registered_name, photo_url: data.photo_url }]);
            setShow(true);
          }
        })
        .catch(() => {});
      return;
    }
    if (val.length < 2) { setResults([]); setShow(false); return; }
    timerRef.current = setTimeout(() => {
      fetch(`/api/dogs/search?q=${encodeURIComponent(val)}&limit=8`)
        .then((r) => r.json())
        .then((d) => { setResults(d.dogs || d); setShow(true); })
        .catch(() => {});
    }, 300);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all duration-300 focus-within:scale-[1.02]" style={{
        background: "linear-gradient(135deg, rgba(30,64,120,0.25), rgba(20,40,80,0.15))",
        border: "1.5px solid rgba(96,165,250,0.3)",
        boxShadow: "0 0 15px rgba(96,165,250,0.08), inset 0 1px 0 rgba(255,255,255,0.05)",
        backdropFilter: "blur(10px)",
      }}>
        <span className="text-sm" style={{ filter: "drop-shadow(0 0 4px rgba(96,165,250,0.5))" }}>🔍</span>
        <input
          type="text"
          value={q}
          onChange={(e) => doSearch(e.target.value)}
          onFocus={() => results.length > 0 && setShow(true)}
          placeholder="Search dog or paste URL..."
          className="flex-1 bg-transparent text-xs outline-none"
          style={{ color: q && getDogColor(q) !== "#ffffff" ? getDogColor(q) : "var(--text-primary, #e2e8f0)", fontFamily: "var(--font-table, Rajdhani, sans-serif)", minWidth: 0 }}
        />
        {q && <button onClick={() => { setQ(""); setResults([]); setShow(false); }} className="text-[10px] opacity-50 hover:opacity-100">✕</button>}
      </div>
      {show && results.length > 0 && (
        <div
          className="absolute top-full mt-1 left-0 right-0 rounded-lg overflow-hidden z-[100]"
          style={{
            background: "var(--bg-elevated, #151d2e)",
            border: "1px solid rgba(30,64,120,0.8)",
            maxHeight: 300,
            overflowY: "auto",
            boxShadow: "0 15px 50px rgba(0,0,0,0.5)",
          }}
        >
          {results.map((r) => {
            const photoSrc = r.photo_url
              ? r.photo_url.startsWith("http") ? r.photo_url : `https://www.apbt.online-pedigrees.com/${r.photo_url}`
              : null;
            return (
              <a
                key={r.dog_id}
                href={`/pedigree/${r.dog_id}`}
                className="flex items-center gap-2 px-3 py-2 transition-all hover:bg-white/5 text-xs"
                style={{ borderBottom: "1px solid rgba(40,44,60,0.3)" }}
              >
                {photoSrc ? (
                  <img src={photoSrc} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0" style={{ border: "1px solid var(--border, rgba(30,64,120,0.5))" }} />
                ) : (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px]"
                       style={{ background: "var(--bg-deep, #0b1120)", border: "1px solid var(--border, rgba(30,64,120,0.5))" }}>🐕</div>
                )}
                <span className="font-semibold truncate" style={{ color: getDogColor(r.registered_name), fontFamily: "var(--font-table)" }}>
                  {r.registered_name}
                </span>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState(0);
  const [userPicture, setUserPicture] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  const AVATAR_OPTIONS = [
    { id: "dog1", emoji: "🐕", label: "Dog" },
    { id: "dog2", emoji: "🐶", label: "Puppy" },
    { id: "dog3", emoji: "🐾", label: "Paw" },
    { id: "wolf", emoji: "🐺", label: "Wolf" },
    { id: "bone", emoji: "🦴", label: "Bone" },
    { id: "star", emoji: "⭐", label: "Star" },
    { id: "fire", emoji: "🔥", label: "Fire" },
    { id: "crown", emoji: "👑", label: "Crown" },
    { id: "trophy", emoji: "🏆", label: "Trophy" },
    { id: "shield", emoji: "🛡️", label: "Shield" },
    { id: "diamond", emoji: "💎", label: "Diamond" },
    { id: "bolt", emoji: "⚡", label: "Bolt" },
  ];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setLoggedIn(true);
      try {
        const u = JSON.parse(localStorage.getItem("user") || "null");
        if (u?.id) setUserId(u.id);
        if (u?.username) setUserName(u.username);
        else if (u?.email) setUserName(u.email);
        if (u?.profile_picture) setUserPicture(u.profile_picture);
      } catch (_e) {}
    } else {
      setLoggedIn(false);
      setUserName("");
      setUserPicture("");
    }
  }, [pathname, mounted]); // re-check on every navigation and on mount

  const handleAvatarSelect = useCallback(async (emoji: string) => {
    if (!userId) return;
    setAvatarUploading(true);
    try {
      const avatarValue = emoji ? `emoji:${emoji}` : "";
      const res = await fetch("/api/account/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, profile_picture: avatarValue }),
      });
      const data = await res.json();
      if (!data.error) {
        setUserPicture(avatarValue);
        const u = JSON.parse(localStorage.getItem("user") || "{}");
        u.profile_picture = avatarValue;
        localStorage.setItem("user", JSON.stringify(u));
      }
    } catch (_e) {}
    setAvatarUploading(false);
    setShowAvatarPicker(false);
  }, [userId]);

  const handleAvatarUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    if (file.size > 5 * 1024 * 1024) return;
    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append("userId", String(userId));
      fd.append("avatar", file);
      const res = await fetch("/api/account/upload-avatar", { method: "POST", body: fd });
      const data = await res.json();
      if (data.profile_picture) {
        setUserPicture(data.profile_picture);
        const u = JSON.parse(localStorage.getItem("user") || "{}");
        u.profile_picture = data.profile_picture;
        localStorage.setItem("user", JSON.stringify(u));
      }
    } catch (_e) {}
    setAvatarUploading(false);
    e.target.value = "";
  }, [userId]);

  // Don't show navbar on landing, login, register
  if (pathname === "/" || pathname === "/login" || pathname === "/register") return null;

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    setLoggedIn(false);
    router.push("/");
  };

  const links = [
    { href: "/dashboard", label: "Dashboard" },
  ];

  return (
    <nav
      style={{
        background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)",
        borderBottom: "1.5px solid rgba(30,64,120,0.8)",
        backdropFilter: "blur(20px)",
      }}
      className="sticky top-0 z-50 overflow-visible"
    >
      <div className="max-w-[1600px] mx-auto px-6 flex items-center justify-between h-14 overflow-visible">
        <Link href="/" className="flex items-center gap-3">
          <img src={LOGO} alt="Logo" className="w-8 h-8 rounded-lg" />
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "1.25rem",
              background: "linear-gradient(135deg, #e8c86e, #d4a855, #b8860b)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              letterSpacing: "0.02em",
            }}
          >
            Pedigree Platform
          </span>
        </Link>
        {mounted && loggedIn && pathname !== "/dashboard" && (
          <Link
            href="/dashboard"
            className="ml-4 flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all hover:scale-[1.02]"
            style={{
              color: "var(--accent-gold, #d4a855)",
              fontFamily: "var(--font-table, Rajdhani, sans-serif)",
              background: "rgba(212,168,85,0.06)",
              border: "1px solid rgba(212,168,85,0.15)",
            }}
          >
            ← Back
          </Link>
        )}
        {pathname.startsWith("/pedigree/") && pathname !== "/pedigree/spotlight" && (
          <div className="flex-1 max-w-md mx-4 overflow-visible">
            <NavSearch />
          </div>
        )}
        <div className="flex items-center gap-1">
          {loggedIn && links.map((link) => {
            const isActive =
              pathname === link.href ||
              pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  color: isActive
                    ? "var(--accent-gold)"
                    : "var(--text-secondary)",
                  background: isActive
                    ? "rgba(212,168,85,0.08)"
                    : "transparent",
                }}
              >
                {link.label}
              </Link>
            );
          })}

          {!mounted ? (
            <div className="ml-4" style={{ width: 80 }} />
          ) : loggedIn ? (
            <div className="relative ml-4">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors"
                style={{
                  color: dropdownOpen ? "var(--accent-gold)" : "var(--text-secondary)",
                  background: dropdownOpen ? "rgba(212,168,85,0.08)" : "transparent",
                  border: "1px solid transparent",
                  fontFamily: "var(--font-table)",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                }}
              >
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold relative cursor-pointer overflow-hidden flex-shrink-0"
                  style={{ background: userPicture?.startsWith("emoji:") ? "linear-gradient(135deg, #1a2744, #0e1828)" : "linear-gradient(135deg, var(--accent-gold), #b8860b)", color: "#000", border: "2px solid var(--accent-gold)" }}
                  onClick={(e) => { e.stopPropagation(); setShowAvatarPicker(!showAvatarPicker); }}
                  title="Click to change profile picture"
                >
                  {userPicture?.startsWith("emoji:") ? (
                    <span className="text-sm">{userPicture.replace("emoji:", "")}</span>
                  ) : userPicture ? (
                    <img src={userPicture} alt="" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    (userName || "U")[0].toUpperCase()
                  )}
                  {avatarUploading && (
                    <span className="absolute inset-0 flex items-center justify-center rounded-full" style={{ background: "rgba(0,0,0,0.6)" }}>
                      <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                    </span>
                  )}
                </span>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                {/* Avatar Picker Popup */}
                {showAvatarPicker && (
                  <>
                    <div className="fixed inset-0 z-[60]" onClick={(e) => { e.stopPropagation(); setShowAvatarPicker(false); }} />
                    <div className="absolute right-0 top-full mt-2 w-64 rounded-xl overflow-hidden z-[70]"
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        background: "linear-gradient(180deg, #2a2420 0%, #1c1714 100%)",
                        border: "1.5px solid rgba(90,70,50,0.6)",
                        boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
                      }}>
                      <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(90,70,50,0.4)" }}>
                        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--accent-gold)", fontFamily: "var(--font-table)" }}>
                          Choose Avatar
                        </p>
                      </div>
                      {/* Upload Photo Option */}
                      <button
                        onClick={() => { setShowAvatarPicker(false); avatarInputRef.current?.click(); }}
                        className="w-full flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/5"
                        style={{ borderBottom: "1px solid rgba(90,70,50,0.3)", color: "var(--text-secondary)", fontFamily: "var(--font-table)", fontSize: "0.8rem" }}>
                        <span className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(212,168,85,0.1)", border: "1px solid rgba(212,168,85,0.3)" }}>📷</span>
                        Upload Photo
                      </button>
                      {/* Avatar Grid */}
                      <div className="p-3 grid grid-cols-6 gap-2">
                        {AVATAR_OPTIONS.map((av) => (
                          <button
                            key={av.id}
                            onClick={() => handleAvatarSelect(av.emoji)}
                            title={av.label}
                            className="w-9 h-9 rounded-full flex items-center justify-center text-lg transition-all hover:scale-110 hover:bg-white/10"
                            style={{
                              background: userPicture === `emoji:${av.emoji}` ? "rgba(212,168,85,0.25)" : "rgba(60,45,35,0.5)",
                              border: userPicture === `emoji:${av.emoji}` ? "2px solid var(--accent-gold)" : "1px solid rgba(90,70,50,0.4)",
                            }}
                          >
                            {av.emoji}
                          </button>
                        ))}
                      </div>
                      {/* Remove avatar option */}
                      {userPicture && (
                        <button
                          onClick={() => handleAvatarSelect("")}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 transition-colors hover:bg-red-500/5 text-xs"
                          style={{ borderTop: "1px solid rgba(90,70,50,0.3)", color: "#ef4444", fontFamily: "var(--font-table)" }}>
                          Remove Avatar
                        </button>
                      )}
                    </div>
                  </>
                )}
                {userName}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  style={{ transform: dropdownOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-56 rounded-xl overflow-hidden z-50"
                    style={{
                      background: "linear-gradient(180deg, #0e1828 0%, #0b1120 100%)",
                      border: "1.5px solid rgba(30,64,120,0.8)",
                      boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
                    }}>
                    {/* User info */}
                    <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(30,64,120,0.4)" }}>
                      <p className="text-sm font-bold" style={{ color: "var(--accent-gold)", fontFamily: "var(--font-table)" }}>{userName}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>Admin</p>
                    </div>

                    {/* Account Settings */}
                    <div className="py-1">
                      <Link href="/account"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-white/5"
                        style={{ color: "var(--text-secondary)", fontFamily: "var(--font-table)", fontSize: "0.8rem" }}>
                        <span className="text-sm">⚙️</span>
                        Account Settings
                      </Link>
                    </div>

                    {/* Divider */}
                    <div style={{ borderTop: "1px solid rgba(30,64,120,0.4)" }} />

                    {/* Logout */}
                    <div className="py-1">
                      <button
                        onClick={() => { setDropdownOpen(false); handleLogout(); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-red-500/5 text-left"
                        style={{ color: "#ef4444", fontFamily: "var(--font-table)", fontSize: "0.8rem" }}>
                        <span className="text-sm">🚪</span>
                        Logout
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 ml-4">
              <Link
                href="/login"
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                style={{ color: "var(--text-secondary)" }}
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: "var(--accent-gold)",
                  color: "#000",
                }}
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
