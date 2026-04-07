"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const LOGO = "/logo.png";

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
    } catch (_e) {
      setMessage("Server error");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#EDE4D5" }}>
      <Link
        href="/"
        className="fixed top-6 left-6 flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all z-10"
        style={{ color: "#1C1C1C", fontFamily: "var(--font-table)", fontSize: "1rem", fontWeight: 600, letterSpacing: "0.05em", border: "2px solid #C9B29F", borderRadius: "8px", background: "#FAF7F2" }}
      >
        <span style={{ fontSize: "1.3rem" }}>&larr;</span> BACK
      </Link>
      <div className="rounded-lg p-6 w-full max-w-md" style={{ background: "#FAF7F2", border: "2px solid #C9B29F", borderRadius: "8px" }}>
        <div className="flex flex-col items-center mb-5">
          <img
            src={LOGO}
            alt="Pedigree Platform"
            width={88}
            height={88}
            className="rounded-lg mb-3"
           
          />
          <h1
            style={{ fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "1.75rem", color: "#1C1C1C" }}
          >
            Create Account
          </h1>
          <p style={{ color: "#4A4A4A", fontSize: "0.9rem" }}>
            Join the ultimate pedigree platform
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-3.5">
          <div>
            <label
              htmlFor="register-username"
              style={{ fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "0.85rem", letterSpacing: "0.06em", color: "#1C1C1C" }}
              className="block mb-1 uppercase"
            >
              Username
            </label>
            <input
              id="register-username"
              type="text"
              placeholder="Choose a username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-lg outline-none transition-all focus:ring-1 focus:ring-[#C9B29F]"
              style={{
                background: "#FAFAFA",
                border: "2px solid #C9B29F",
                color: "#1C1C1C",
                fontFamily: "var(--font-body)",
                borderRadius: "8px",
              }}
            />
          </div>

          <div>
            <label
              htmlFor="register-email"
              style={{ fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "0.85rem", letterSpacing: "0.06em", color: "#1C1C1C" }}
              className="block mb-1 uppercase"
            >
              Email
            </label>
            <input
              id="register-email"
              type="email"
              placeholder="Enter email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-lg outline-none transition-all focus:ring-1 focus:ring-[#C9B29F]"
              style={{
                background: "#FAFAFA",
                border: "2px solid #C9B29F",
                color: "#1C1C1C",
                fontFamily: "var(--font-body)",
                borderRadius: "8px",
              }}
            />
          </div>

          <div>
            <label
              htmlFor="register-password"
              style={{ fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "0.85rem", letterSpacing: "0.06em", color: "#1C1C1C" }}
              className="block mb-1 uppercase"
            >
              Password
            </label>
            <input
              id="register-password"
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-lg outline-none transition-all focus:ring-1 focus:ring-[#C9B29F]"
              style={{
                background: "#FAFAFA",
                border: "2px solid #C9B29F",
                color: "#1C1C1C",
                fontFamily: "var(--font-body)",
                borderRadius: "8px",
              }}
            />
          </div>

          <div>
            <label
              htmlFor="register-confirm-password"
              style={{ fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "0.85rem", letterSpacing: "0.06em", color: "#1C1C1C" }}
              className="block mb-1 uppercase"
            >
              Confirm Password
            </label>
            <input
              id="register-confirm-password"
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-lg outline-none transition-all focus:ring-1 focus:ring-[#C9B29F]"
              style={{
                background: "#FAFAFA",
                border: "2px solid #C9B29F",
                color: "#1C1C1C",
                fontFamily: "var(--font-body)",
                borderRadius: "8px",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg text-sm font-bold uppercase tracking-wider transition-all disabled:opacity-50"
            style={{ background: "#1C1C1C", color: "#FAF7F2", fontFamily: "var(--font-table)", borderRadius: "8px" }}
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>

          {message && (
            <p
              className="text-center text-sm mt-2"
              style={{
                color: messageType === "success" ? "#15803d" : "#dc2626",
              }}
            >
              {message}
            </p>
          )}
        </form>

        <p className="text-center mt-6" style={{ color: "#4A4A4A", fontSize: "0.9rem" }}>
          Already have an account?{" "}
          <Link href="/login" className="hover:underline" style={{ color: "#1C1C1C", fontWeight: 600 }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
