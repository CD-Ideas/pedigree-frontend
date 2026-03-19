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
    { href: "/dogs", label: "Dogs" },
    { href: "/breeding-calculator", label: "Breeding Calc" },
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
            <div className="flex items-center gap-3 ml-4">
              {userName && (
                <span className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                  {userName}
                </span>
              )}
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{
                  color: "var(--accent-red)",
                  background: "rgba(220,38,38,0.08)",
                  border: "1px solid rgba(220,38,38,0.15)",
                }}
              >
                Logout
              </button>
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
