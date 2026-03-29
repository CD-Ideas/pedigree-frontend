"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const LOGO = "https://i.imgur.com/9RJG2QN.png";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"error" | "success">("error");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("registered") === "true") {
      setMessage("Account created successfully! Please log in.");
      setMessageType("success");
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok && data?.data?.accessToken) {
        localStorage.setItem("token", data.data.accessToken);
        localStorage.setItem("refreshToken", data.data.refreshToken || "");
        localStorage.setItem("user", JSON.stringify(data.data.user || null));
        setMessage("Login successful");
        setMessageType("success");
        const redirect = searchParams.get("redirect") || localStorage.getItem("loginRedirect") || "/dashboard";
        localStorage.removeItem("loginRedirect");
        router.push(redirect);
      } else {
        setMessage(data?.error?.message || data?.message || "Login failed");
        setMessageType("error");
      }
    } catch (_e) {
      setMessage("Server error");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <Link
      href="/"
      className="fixed top-6 left-6 flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all z-10"
      style={{ color: "#1C1C1C", fontFamily: "var(--font-table)", fontSize: "1rem", fontWeight: 600, letterSpacing: "0.05em", border: "2px solid #C9B29F", borderRadius: "10px", background: "#FAF7F2" }}
    >
      <span style={{ fontSize: "1.3rem" }}>&larr;</span> BACK
    </Link>
    <div className="rounded-2xl p-6 w-full max-w-md" style={{ background: "#FAF7F2", border: "2px solid #C9B29F", borderRadius: "10px" }}>
      <div className="flex flex-col items-center mb-5">
        <img
          src={LOGO}
          alt="Pedigree Platform"
          width={88}
          height={88}
          className="rounded-lg mb-3"
         
        />
        <h1
          style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "1.75rem", color: "#1C1C1C" }}
        >
          Welcome Back
        </h1>
        <p style={{ color: "#6B7280", fontSize: "0.9rem" }}>
          Sign in to your account
        </p>
      </div>

      <form onSubmit={handleLogin} className="space-y-3.5">
        <div>
          <label
            style={{ fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "0.85rem", letterSpacing: "0.06em", color: "#1C1C1C" }}
            className="block mb-1 uppercase"
          >
            Username
          </label>
          <input
            type="text"
            placeholder="Enter username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="w-full px-4 py-2.5 rounded-lg outline-none transition-all focus:ring-1 focus:ring-[#C9B29F]"
            style={{
              background: "#FAFAFA",
              border: "2px solid #C9B29F",
              color: "#1C1C1C",
              fontFamily: "var(--font-body)",
              borderRadius: "10px",
            }}
          />
        </div>

        <div>
          <label
            style={{ fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "0.85rem", letterSpacing: "0.06em", color: "#1C1C1C" }}
            className="block mb-1 uppercase"
          >
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 pr-12 rounded-lg outline-none transition-all focus:ring-1 focus:ring-[#C9B29F]"
              style={{
                background: "#FAFAFA",
                border: "2px solid #C9B29F",
                color: "#1C1C1C",
                fontFamily: "var(--font-body)",
                borderRadius: "10px",
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded transition-colors"
              style={{ color: "#6B7280" }}
            >
              {showPassword ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Forgot Password */}
        <div className="text-right">
          <Link href="/forgot-password" className="text-xs hover:underline" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>
            Forgot Password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-lg text-sm font-bold uppercase tracking-wider transition-all disabled:opacity-50"
          style={{ background: "#1C1C1C", color: "#FAF7F2", fontFamily: "var(--font-table)", borderRadius: "10px" }}
        >
          {loading ? "Signing in..." : "Login"}
        </button>

        {message && (
          <p
            className="text-center text-sm mt-2"
            style={{
              color: messageType === "success" ? "#22c55e" : "#ef4444",
            }}
          >
            {message}
          </p>
        )}
      </form>

      <p className="text-center mt-6" style={{ color: "#6B7280", fontSize: "0.9rem" }}>
        Don&apos;t have an account?{" "}
        <Link href="/register" className="hover:underline" style={{ color: "#1C1C1C", fontWeight: 600 }}>
          Sign up
        </Link>
      </p>
    </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#EDE4D5" }}>
      <Suspense fallback={<div className="text-center" style={{ color: "#6B7280" }}>Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
