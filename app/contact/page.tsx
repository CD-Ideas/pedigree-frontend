"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const steelFrame = {
  border: "1.5px solid rgba(255,255,255,0.06)",
  boxShadow: "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)",
  background: "linear-gradient(180deg, rgba(30,30,30,0.85) 0%, rgba(22,22,22,0.9) 100%)",
  backdropFilter: "blur(16px)",
};

const inputStyle = {
  background: "rgba(20,20,25,0.8)",
  border: "1px solid rgba(212,168,85,0.15)",
  color: "var(--text-primary)",
  fontFamily: "var(--font-table)",
};

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [nameAutoFilled, setNameAutoFilled] = useState(false);
  const [emailAutoFilled, setEmailAutoFilled] = useState(false);

  // Auto-fill name and email if logged in
  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "null");
      if (u?.username) {
        setName(u.username);
        setNameAutoFilled(true);
        // Fetch email from account API
        fetch("/api/account", { credentials: "include" })
          .then(r => r.json())
          .then(data => {
            if (data.email) {
              setEmail(data.email);
              setEmailAutoFilled(true);
            }
          })
          .catch(() => {});
      }
    } catch {}
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      setStatus({ type: "error", text: "All fields are required" });
      return;
    }
    setSending(true);
    setStatus(null);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), subject: subject.trim(), message: message.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus({ type: "success", text: "Message sent successfully! We'll get back to you soon." });
        if (!nameAutoFilled) setName("");
        if (!emailAutoFilled) setEmail("");
        setSubject("");
        setMessage("");
      } else {
        setStatus({ type: "error", text: data.error || "Failed to send message" });
      }
    } catch {
      setStatus({ type: "error", text: "Failed to send message. Please try again." });
    }
    setSending(false);
  };

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <h1
          className="text-2xl font-bold mb-2"
          style={{
            fontFamily: "var(--font-display)",
            background: "linear-gradient(135deg, #e8c86e, #d4a855, #b8860b)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Contact Us
        </h1>
        <p className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)" }}>
          Have a question, feedback, or need help? Send us a message.
        </p>
      </div>

      {/* Form */}
      <div className="rounded-xl p-6" style={steelFrame}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name & Email row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold mb-1.5"
                style={{ color: "var(--accent-gold)", fontFamily: "var(--font-table)" }}>
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => !nameAutoFilled && setName(e.target.value)}
                placeholder="Enter your name..."
                readOnly={nameAutoFilled}
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all focus:ring-1 focus:ring-[rgba(212,168,85,0.3)]"
                style={{ ...inputStyle, opacity: nameAutoFilled ? 0.7 : 1, cursor: nameAutoFilled ? "not-allowed" : "text" }}
                maxLength={100}
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold mb-1.5"
                style={{ color: "var(--accent-gold)", fontFamily: "var(--font-table)" }}>
                Your Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => !emailAutoFilled && setEmail(e.target.value)}
                placeholder="Enter your email..."
                readOnly={emailAutoFilled}
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all focus:ring-1 focus:ring-[rgba(212,168,85,0.3)]"
                style={{ ...inputStyle, opacity: emailAutoFilled ? 0.7 : 1, cursor: emailAutoFilled ? "not-allowed" : "text" }}
                maxLength={200}
              />
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-bold mb-1.5"
              style={{ color: "var(--accent-gold)", fontFamily: "var(--font-table)" }}>
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="What is this about?"
              className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all focus:ring-1 focus:ring-[rgba(212,168,85,0.3)]"
              style={inputStyle}
              maxLength={200}
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-bold mb-1.5"
              style={{ color: "var(--accent-gold)", fontFamily: "var(--font-table)" }}>
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your message here..."
              rows={6}
              className="w-full rounded-lg px-3 py-2.5 text-sm outline-none resize-none transition-all focus:ring-1 focus:ring-[rgba(212,168,85,0.3)]"
              style={inputStyle}
              maxLength={5000}
            />
            <p className="text-right text-[10px] mt-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)" }}>
              {message.length}/5000
            </p>
          </div>

          {/* Status */}
          {status && (
            <p className="text-xs font-medium px-3 py-2 rounded-lg"
              style={{
                background: status.type === "success" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                color: status.type === "success" ? "#22c55e" : "#ef4444",
                border: `1px solid ${status.type === "success" ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
                fontFamily: "var(--font-table)",
              }}>
              {status.text}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={sending}
            className="w-full py-3 rounded-lg text-sm font-semibold uppercase tracking-wider transition-all hover:scale-[1.02] disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #e8c86e, #b8860b)",
              color: "#000",
              fontFamily: "var(--font-table)",
            }}
          >
            {sending ? "Sending..." : "Send Message"}
          </button>
        </form>
      </div>

      {/* Back link */}
      <div className="text-center mt-6">
        <Link
          href="/"
          className="text-xs transition-colors hover:opacity-80"
          style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)" }}
        >
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}
