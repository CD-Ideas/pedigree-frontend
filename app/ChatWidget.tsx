"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply || "Something went wrong." },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Connection error. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open chat assistant"
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 9999,
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "#1C1C1C",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 26,
            transition: "transform 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          💬
        </button>
      )}

      {/* Chat window */}
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 9999,
            width: 380,
            maxWidth: "calc(100vw - 32px)",
            height: 520,
            maxHeight: "calc(100vh - 48px)",
            borderRadius: 16,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            background: "#FAF7F2",
            border: "1px solid #C9B29F",
            boxShadow: "0 8px 40px rgba(0,0,0,0.2)",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "14px 16px",
              background: "#1C1C1C",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 22 }}>🐾</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>Rex</div>
                <div style={{ fontSize: 11, opacity: 0.85 }}>Your Pedigree Platform Assistant</div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: "rgba(255,255,255,0.2)",
                border: "none",
                color: "#fff",
                width: 30,
                height: 30,
                borderRadius: "50%",
                cursor: "pointer",
                fontSize: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "12px 14px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {messages.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  color: "#4A4A4A",
                  marginTop: 40,
                  fontSize: 14,
                  lineHeight: 1.6,
                }}
              >
                <img src="/logo.png" alt="" style={{ width: 48, height: 48, margin: "0 auto 8px", opacity: 0.6 }} />
                <div style={{ fontWeight: 600, fontFamily: "var(--font-table)" }}>Welcome!</div>
                <div>Ask me how to use the site, search dogs, breeding tools, marketplace, and more.</div>
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "82%",
                  padding: "10px 14px",
                  borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  background:
                    m.role === "user"
                      ? "#1C1C1C"
                      : "#FAFAFA",
                  color: m.role === "user" ? "#fff" : "#1C1C1C",
                  fontSize: 14,
                  lineHeight: 1.5,
                  border: m.role === "assistant" ? "1px solid #C9B29F" : "none",
                  wordBreak: "break-word",
                  whiteSpace: "pre-wrap",
                }}
              >
                {m.content}
              </div>
            ))}
            {loading && (
              <div
                style={{
                  alignSelf: "flex-start",
                  padding: "10px 14px",
                  borderRadius: "16px 16px 16px 4px",
                  background: "#FAFAFA",
                  border: "1px solid #C9B29F",
                  fontSize: 14,
                  color: "#4A4A4A",
                }}
              >
                <span className="typing-dots">Thinking</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div
            style={{
              padding: "10px 12px",
              borderTop: "1px solid #C9B29F",
              display: "flex",
              gap: 8,
              background: "#FAFAFA",
            }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Type your question..."
              disabled={loading}
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #C9B29F",
                background: "#FAF7F2",
                color: "#1C1C1C",
                fontSize: 14,
                outline: "none",
                fontFamily: "inherit",
              }}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                border: "none",
                background: loading || !input.trim()
                  ? "#4A4A4A"
                  : "#1C1C1C",
                color: "#fff",
                cursor: loading || !input.trim() ? "default" : "pointer",
                fontSize: 14,
                fontWeight: 600,
                fontFamily: "inherit",
                transition: "opacity 0.2s",
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}

      <style>{`
        .typing-dots::after {
          content: '';
          animation: dots 1.2s steps(4, end) infinite;
        }
        @keyframes dots {
          0%  { content: ''; }
          25% { content: '.'; }
          50% { content: '..'; }
          75% { content: '...'; }
        }
      `}</style>
    </>
  );
}
