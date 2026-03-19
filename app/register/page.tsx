"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const LOGO = "https://i.imgur.com/cAvQemZ.png";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"error" | "success">("error");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    if (password !== confirmPassword) {
      setMessage("Passwords do not match");
      setMessageType("error");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("Account created successfully!");
        setMessageType("success");
        setTimeout(() => router.push("/login?registered=true"), 1000);
      } else {
        setMessage(data?.error?.message || data?.message || "Registration failed");
        setMessageType("error");
      }
    } catch {
      setMessage("Server error");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Link
        href="/"
        className="fixed top-6 left-6 flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all hover:bg-white/10 z-10 border border-[var(--accent-gold)]/30"
        style={{ color: "var(--accent-gold)", fontFamily: "var(--font-table)", fontSize: "1rem", fontWeight: 600, letterSpacing: "0.05em" }}
      >
        <span style={{ fontSize: "1.3rem" }}>&larr;</span> BACK
      </Link>
      <div className="glass-card rounded-2xl p-6 w-full max-w-md animate-scale-reveal">
        <div className="flex flex-col items-center mb-5">
          <img
            src={LOGO}
            alt="Pedigree Platform"
            width={88}
            height={88}
            className="rounded-xl mb-3"
            style={{ boxShadow: "0 0 30px rgba(220,38,38,0.3)" }}
          />
          <h1
            style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "1.75rem" }}
            className="text-white"
          >
            Create Account
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Join the ultimate pedigree platform
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-3.5">
          <div>
            <label
              style={{ fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "0.85rem", letterSpacing: "0.06em" }}
              className="block mb-1 uppercase"
            >
              Username
            </label>
            <input
              type="text"
              placeholder="Choose a username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
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

          <div>
            <label
              style={{ fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "0.85rem", letterSpacing: "0.06em" }}
              className="block mb-1 uppercase"
            >
              Email
            </label>
            <input
              type="email"
              placeholder="Enter email"
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

          <div>
            <label
              style={{ fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "0.85rem", letterSpacing: "0.06em" }}
              className="block mb-1 uppercase"
            >
              Password
            </label>
            <input
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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

          <div>
            <label
              style={{ fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "0.85rem", letterSpacing: "0.06em" }}
              className="block mb-1 uppercase"
            >
              Confirm Password
            </label>
            <input
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 rounded-lg text-sm"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>

          {message && (
            <p
              className="text-center text-sm mt-2"
              style={{
                color: messageType === "success" ? "var(--accent-green)" : "var(--accent-red-bright)",
              }}
            >
              {message}
            </p>
          )}
        </form>

        <p className="text-center mt-6" style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          Already have an account?{" "}
          <Link href="/login" className="hover:underline" style={{ color: "var(--accent-red-bright)" }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
