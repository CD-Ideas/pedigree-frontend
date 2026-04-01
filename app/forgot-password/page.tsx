"use client";

import { useState } from "react";
import Link from "next/link";

const LOGO = "/logo.png";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#EDE4D5" }}>
      <Link
        href="/login"
        className="fixed top-6 left-6 flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all z-10"
        style={{ color: "#1C1C1C", fontFamily: "var(--font-table)", fontSize: "1rem", fontWeight: 600, letterSpacing: "0.05em", border: "2px solid #C9B29F", borderRadius: "8px", background: "#FAF7F2" }}
      >
        <span style={{ fontSize: "1.3rem" }}>&larr;</span> BACK
      </Link>

      <div className="rounded-lg p-6 w-full max-w-md" style={{ background: "#FAF7F2", border: "2px solid #C9B29F", borderRadius: "8px" }}>
        <div className="flex flex-col items-center mb-5">
          <img src={LOGO} alt="Pedigree Platform" width={140} height={140} className="rounded-lg mb-3" />
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "1.75rem", color: "#1C1C1C" }}>
            Forgot Password
          </h1>
          <p style={{ color: "#6B6B6B", fontSize: "0.9rem" }}>
            Enter your email to reset your password
          </p>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label
                style={{ fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "0.85rem", letterSpacing: "0.06em", color: "#1C1C1C" }}
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
                className="w-full px-4 py-2.5 rounded-lg outline-none transition-all focus:ring-1 focus:ring-[#C9B29F]"
                style={{
                  background: "#FAFAFA",
                  border: "2px solid #C9B29F",
                  color: "#1C1C1C",
                  fontFamily: "var(--font-table)",
                  borderRadius: "8px",
                }}
              />
            </div>

            <button type="submit"
              className="w-full py-3 rounded-lg text-sm font-bold uppercase tracking-wider transition-all"
              style={{ background: "#1C1C1C", color: "#FAF7F2", fontFamily: "var(--font-table)", borderRadius: "8px" }}>
              Send Reset Link
            </button>
          </form>
        ) : (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-lg mx-auto mb-4 flex items-center justify-center"
              style={{ background: "rgba(34,197,94,0.1)", border: "2px solid rgba(34,197,94,0.3)" }}>
              <span className="text-3xl" style={{ color: "#22c55e" }}>&#10003;</span>
            </div>
            <p style={{ color: "#1C1C1C", fontFamily: "var(--font-table)", fontSize: "1rem", fontWeight: 600 }}>
              Check your email
            </p>
            <p className="mt-2" style={{ color: "#6B6B6B", fontSize: "0.85rem" }}>
              If an account exists for <strong style={{ color: "#1C1C1C" }}>{email}</strong>, we&apos;ve sent a password reset link.
            </p>
          </div>
        )}

        <p className="text-center mt-6" style={{ color: "#6B6B6B", fontSize: "0.9rem" }}>
          Remember your password?{" "}
          <Link href="/login" className="hover:underline" style={{ color: "#1C1C1C", fontWeight: 600 }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
