"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const LOGO = "https://i.imgur.com/cAvQemZ.png";

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setLoggedIn(true);
      try {
        const u = JSON.parse(localStorage.getItem("user") || "null");
        if (u?.username) setUserName(u.username);
        else if (u?.email) setUserName(u.email);
      } catch {}
    } else {
      setLoggedIn(false);
    }
  }, [pathname]); // re-check on every navigation

  // Don't show navbar on landing, login, register, or pedigree pages (pedigree has its own header)
  if (pathname === "/" || pathname === "/login" || pathname === "/register" || pathname.startsWith("/pedigree")) return null;

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
      className="sticky top-0 z-50"
    >
      <div className="max-w-[1600px] mx-auto px-6 flex items-center justify-between h-14">
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

          {loggedIn ? (
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
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: "linear-gradient(135deg, var(--accent-gold), #b8860b)", color: "#000" }}>
                  {(userName || "U")[0].toUpperCase()}
                </span>
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

                    {/* Links */}
                    <div className="py-1">
                      {[
                        { href: "/dogs", label: "Dogs", icon: "🐕" },
                        { href: "/pedigree/spotlight", label: "Lineage Spotlight", icon: "🔦" },
                        { href: "/breeding-calculator", label: "Breeding Calculator", icon: "🧬" },
                      ].map((item) => (
                        <Link key={item.href} href={item.href}
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-white/5"
                          style={{ color: pathname === item.href ? "var(--accent-gold)" : "var(--text-secondary)", fontFamily: "var(--font-table)", fontSize: "0.8rem" }}>
                          <span className="text-sm">{item.icon}</span>
                          {item.label}
                        </Link>
                      ))}
                    </div>

                    {/* Divider */}
                    <div style={{ borderTop: "1px solid rgba(30,64,120,0.4)" }} />

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
