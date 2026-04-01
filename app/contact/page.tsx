"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const pgCard = {
  border: "2px solid #C9B29F",
  background: "#FAF7F2",
  borderRadius: "8px",
};

const inputStyle = {
  background: "#FAFAFA",
  border: "2px solid #C9B29F",
  color: "#1C1C1C",
  fontFamily: "var(--font-table)",
  borderRadius: "8px",
};

export default function ContactPage() {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [nameAutoFilled, setNameAutoFilled] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  // Auto-fill name if logged in
  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "null");
      if (u?.username) {
        setName(u.username);
        setNameAutoFilled(true);
        if (u?.email) setUserEmail(u.email);
      }
    } catch {}
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !subject.trim() || !message.trim()) {
      setStatus({ type: "error", text: "All fields are required" });
      return;
    }
    setSending(true);
    setStatus(null);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: userEmail || "no-email@pedigreeplatform.com", subject: subject.trim(), message: message.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus({ type: "success", text: "Message sent successfully! We'll get back to you soon." });
        if (!nameAutoFilled) setName("");
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
    <div className="max-w-2xl mx-auto py-10 px-4" style={{ background: "#EDE4D5", minHeight: "100vh" }}>
      {/* Header */}
      <div className="text-center mb-8">
        <h1
          className="text-2xl font-bold mb-2"
          style={{
            fontFamily: "var(--font-display)",
            color: "#1C1C1C",
          }}
        >
          Contact Us
        </h1>
        <p className="text-sm" style={{ color: "#6B6B6B", fontFamily: "var(--font-table)" }}>
          Have a question, feedback, or need help? Send us a message.
        </p>
      </div>

      {/* Form */}
      <div className="rounded-lg p-6" style={pgCard}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-bold mb-1.5"
              style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>
              Your Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => !nameAutoFilled && setName(e.target.value)}
              placeholder="Enter your name..."
              readOnly={nameAutoFilled}
              className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all focus:ring-1 focus:ring-[#C9B29F]"
              style={{ ...inputStyle, opacity: nameAutoFilled ? 0.7 : 1, cursor: nameAutoFilled ? "not-allowed" : "text" }}
              maxLength={100}
            />
          </div>

          {/* Subject */}
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-bold mb-1.5"
              style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="What is this about?"
              className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all focus:ring-1 focus:ring-[#C9B29F]"
              style={inputStyle}
              maxLength={200}
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-bold mb-1.5"
              style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your message here..."
              rows={6}
              className="w-full rounded-lg px-3 py-2.5 text-sm outline-none resize-none transition-all focus:ring-1 focus:ring-[#C9B29F]"
              style={inputStyle}
              maxLength={5000}
            />
            <p className="text-right text-[10px] mt-1" style={{ color: "#6B6B6B", fontFamily: "var(--font-table)" }}>
              {message.length}/5000
            </p>
          </div>

          {/* Status */}
          {status && (
            <p className="text-xs font-medium px-3 py-2 rounded-lg"
              style={{
                background: status.type === "success" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                color: status.type === "success" ? "#22c55e" : "#ef4444",
                border: `2px solid ${status.type === "success" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
                fontFamily: "var(--font-table)",
                borderRadius: "8px",
              }}>
              {status.text}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={sending}
            className="w-full py-3 rounded-lg text-sm font-semibold uppercase tracking-wider transition-all disabled:opacity-50"
            style={{
              background: "#1C1C1C",
              color: "#FAF7F2",
              fontFamily: "var(--font-table)",
              borderRadius: "8px",
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
          style={{ color: "#6B6B6B", fontFamily: "var(--font-table)" }}
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
