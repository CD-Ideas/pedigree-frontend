"use client";

import { useState } from "react";

export default function ContactPage() {
  const [sent, setSent] = useState(false);

  return (
    <div className="min-h-screen px-4 py-20">
      <div className="max-w-2xl mx-auto">
        <h1 style={{ fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "2rem" }} className="text-white mb-2">Contact Us</h1>
        <p style={{ fontFamily: "var(--font-table)", fontSize: "13px", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
          Have a question, feedback, or need support? We&apos;d love to hear from you.
        </p>

        {/* Contact info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="rounded-xl p-4" style={{ background: "rgba(25,27,35,0.95)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <h3 style={{ fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "12px", color: "var(--accent-gold)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>Email</h3>
            <a href="mailto:support@pedigreeplatform.com" className="break-all" style={{ fontFamily: "var(--font-table)", fontSize: "13px", color: "#fff" }}>support@pedigreeplatform.com</a>
          </div>
          <div className="rounded-xl p-4" style={{ background: "rgba(25,27,35,0.95)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <h3 style={{ fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "12px", color: "var(--accent-gold)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>Response Time</h3>
            <p style={{ fontFamily: "var(--font-table)", fontSize: "13px", color: "#fff" }}>Within 24 hours</p>
          </div>
        </div>

        {/* Contact form */}
        <div className="rounded-xl p-6" style={{ background: "rgba(25,27,35,0.95)", border: "1px solid rgba(255,255,255,0.07)" }}>
          {sent ? (
            <div className="text-center py-8">
              <div style={{ fontSize: "32px", marginBottom: "12px" }}>&#10003;</div>
              <h3 style={{ fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "16px", color: "#fff", marginBottom: "8px" }}>Message Sent!</h3>
              <p style={{ fontFamily: "var(--font-table)", fontSize: "13px", color: "var(--text-secondary)" }}>We&apos;ll get back to you within 24 hours.</p>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); setSent(true); }} className="space-y-4">
              <div>
                <label style={{ fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-secondary)" }} className="block mb-1.5">Email</label>
                <input type="email" required placeholder="your@email.com"
                  className="w-full px-4 py-2.5 rounded-lg outline-none"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", fontFamily: "var(--font-table)", fontSize: "13px" }} />
              </div>
              <div>
                <label style={{ fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-secondary)" }} className="block mb-1.5">Subject</label>
                <input type="text" required placeholder="What's this about?"
                  className="w-full px-4 py-2.5 rounded-lg outline-none"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", fontFamily: "var(--font-table)", fontSize: "13px" }} />
              </div>
              <div>
                <label style={{ fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-secondary)" }} className="block mb-1.5">Message</label>
                <textarea required rows={5} placeholder="Tell us more..."
                  className="w-full px-4 py-2.5 rounded-lg outline-none resize-none"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", fontFamily: "var(--font-table)", fontSize: "13px" }} />
              </div>
              <button type="submit" className="btn-primary w-full py-2.5 rounded-lg" style={{ fontSize: "12px", fontWeight: 600 }}>
                Send Message
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
