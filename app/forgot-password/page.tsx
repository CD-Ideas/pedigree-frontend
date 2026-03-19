"use client";

import { useState } from "react";
import Link from "next/link";

const LOGO = "https://i.imgur.com/cAvQemZ.png";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Link
        href="/login"
        className="fixed top-6 left-6 flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all hover:bg-white/10 z-10 border border-[var(--accent-gold)]/30"
        style={{ color: "var(--accent-gold)", fontFamily: "var(--font-table)", fontSize: "1rem", fontWeight: 600, letterSpacing: "0.05em" }}
      >
        <span style={{ fontSize: "1.3rem" }}>&larr;</span> BACK
      </Link>

      <div className="glass-card rounded-2xl p-6 w-full max-w-md animate-scale-reveal">
        <div className="flex flex-col items-center mb-5">
          <img src={LOGO} alt="Pedigree Platform" width={88} height={88} className="rounded-xl mb-3"
            style={{ boxShadow: "0 0 30px rgba(220,38,38,0.3)" }} />
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "1.75rem" }} className="text-white">
            Forgot Password
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Enter your email to reset your password
          </p>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label
                style={{ fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "0.85rem", letterSpacing: "0.06em" }}
                className="block mb-1 uppercase"
              >
                Email
              </label>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-lg outline-none transition-all focus:ring-1"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-body)",
                }}
              />
            </div>

            <button type="submit" className="btn-primary w-full py-3 rounded-lg text-sm">
              Send Reset Link
            </button>
          </form>
        ) : (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)" }}>
              <span className="text-3xl">✓</span>
            </div>
            <p style={{ color: "var(--text-primary)", fontFamily: "var(--font-table)", fontSize: "1rem", fontWeight: 600 }}>
              Check your email
            </p>
            <p className="mt-2" style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
              If an account exists for <strong style={{ color: "var(--accent-gold)" }}>{email}</strong>, we&apos;ve sent a password reset link.
            </p>
          </div>
        )}

        <p className="text-center mt-6" style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          Remember your password?{" "}
          <Link href="/login" className="hover:underline" style={{ color: "var(--accent-red-bright)" }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
