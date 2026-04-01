"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";

const steelFrame = {
  border: "2px solid #C9B29F",
  background: "#FAF7F2",
  borderRadius: "8px",
};

interface SupportMessage {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
}

interface Reply {
  id: number;
  sender_type: string;
  sender_name: string;
  message: string;
  created_at: string;
}

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
  } catch { return d; }
}

export default function SupportPage() {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [originalMessage, setOriginalMessage] = useState<SupportMessage | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ id: number; username: string; role: string } | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch all support messages
  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "null");
      if (!u?.id) { setLoading(false); return; }
      setCurrentUser({ id: u.id, username: u.username, role: u.role || "user" });
      fetch(`/api/support?userId=${u.id}&username=${encodeURIComponent(u.username)}&role=${u.role || "user"}`)
        .then(r => r.json())
        .then(data => {
          if (data.messages) setMessages(data.messages);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
      // Mark all support notifications as read on page load
      fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_read_support", userId: u.id }),
      }).then(() => {
        window.dispatchEvent(new Event("notifications-updated"));
      }).catch(() => {});
    } catch { setLoading(false); }
  }, []);

  // Fetch replies when selecting a message + mark support notifications as read
  useEffect(() => {
    if (!selected || !currentUser) return;
    fetch(`/api/support/replies?message_id=${selected}&userId=${currentUser.id}`)
      .then(r => r.json())
      .then(data => {
        if (data.message) setOriginalMessage(data.message);
        if (data.replies) setReplies(data.replies);
      })
      .catch(() => {});
    // Mark support notifications as read
    fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_read_support", userId: currentUser.id }),
    }).then(() => {
      window.dispatchEvent(new Event("notifications-updated"));
    }).catch(() => {});
  }, [selected, currentUser]);

  // Scroll to bottom when replies change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "auto" });
  }, [replies]);

  const sendReply = async () => {
    if (!replyText.trim() || !selected || sending || !currentUser) return;
    setSending(true);
    try {
      const res = await fetch("/api/support/replies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message_id: selected, message: replyText.trim(), userId: currentUser.id, username: currentUser.username }),
      });
      const data = await res.json();
      if (data.success) {
        setReplyText("");
        // Refresh replies
        const r2 = await fetch(`/api/support/replies?message_id=${selected}&userId=${currentUser.id}`);
        const d2 = await r2.json();
        if (d2.replies) setReplies(d2.replies);
      }
    } catch {}
    setSending(false);
  };

  const deleteTicket = async (id: number) => {
    if (!currentUser || !confirm("Delete this ticket? It will only be removed from your view.")) return;
    try {
      await fetch(`/api/support?id=${id}&userId=${currentUser.id}&role=${currentUser.role}`, { method: "DELETE" });
      setMessages(prev => prev.filter(m => m.id !== id));
      if (selected === id) {
        setSelected(null);
        setReplies([]);
        setOriginalMessage(null);
      }
    } catch {}
  };

  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "1.6rem",
            color: "#1C1C1C",
            
            
          }}>
            My Support Messages
          </h1>
          <p className="text-sm" style={{ color: "#6B6B6B", fontFamily: "var(--font-table)" }}>
            Your conversations with support
          </p>
        </div>
        <Link href="/contact" className="px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all hover:scale-[1.03]"
          style={{ background: "#1C1C1C", color: "#FAF7F2", fontFamily: "var(--font-table)" }}>
          + New Message
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <span className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" style={{ color: "#1C1C1C" }} />
        </div>
      ) : messages.length === 0 ? (
        <div className="rounded-lg p-12 text-center" style={steelFrame}>
          <span className="text-4xl block mb-3">📭</span>
          <p className="text-sm font-medium" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>No support messages yet</p>
          <p className="text-xs mt-1" style={{ color: "#6B6B6B", fontFamily: "var(--font-table)" }}>Contact support to get help</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ minHeight: "500px" }}>
          {/* Message List */}
          <div className="md:col-span-1 rounded-lg overflow-hidden" style={steelFrame}>
            <div className="px-4 py-3" style={{ borderBottom: "2px solid #C9B29F" }}>
              <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>
                Tickets ({messages.length})
              </p>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: "450px" }}>
              {messages.map(m => (
                <button key={m.id} onClick={() => setSelected(m.id)}
                  className="w-full text-left px-4 py-3 transition-all"
                  style={{
                    borderBottom: "1px solid #C9B29F",
                    background: selected === m.id ? "rgba(201,178,159,0.15)" : "transparent",
                  }}>
                  <div className="flex items-center justify-between">
                    <div className="truncate">
                      <p className="text-xs font-semibold truncate" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>
                        {m.subject}
                      </p>
                      <p className="text-[10px] truncate" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)", opacity: 0.8 }}>
                        {m.name}
                      </p>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full ml-2 flex-shrink-0" style={{
                      background: m.status === "new" ? "rgba(234,179,8,0.15)" : m.status === "replied" ? "rgba(34,197,94,0.15)" : "rgba(107,114,128,0.15)",
                      color: m.status === "new" ? "#eab308" : m.status === "replied" ? "#22c55e" : "#6B6B6B",
                      fontFamily: "var(--font-table)",
                    }}>
                      {m.status}
                    </span>
                  </div>
                  <p className="text-[10px] truncate mt-0.5" style={{ color: "#6B6B6B", fontFamily: "var(--font-table)" }}>
                    {m.message}
                  </p>
                  <p className="text-[9px] mt-1" style={{ color: "#6B6B6B", fontFamily: "var(--font-table)" }}>
                    {formatDate(m.created_at)}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Conversation Thread */}
          <div className="md:col-span-2 rounded-lg flex flex-col overflow-hidden" style={steelFrame}>
            {selected && originalMessage ? (
              <>
                {/* Thread Header */}
                <div className="px-4 py-3 flex-shrink-0 flex items-center justify-between" style={{ borderBottom: "2px solid #C9B29F" }}>
                  <div>
                    <p className="text-sm font-bold" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>
                      {originalMessage.subject}
                    </p>
                    <p className="text-[10px]" style={{ color: "#6B6B6B", fontFamily: "var(--font-table)" }}>
                      Opened {formatDate(originalMessage.created_at)}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteTicket(selected!)}
                    className="px-3 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all hover:scale-105"
                    style={{
                      background: "rgba(239,68,68,0.1)",
                      border: "1px solid rgba(239,68,68,0.3)",
                      color: "#ef4444",
                      fontFamily: "var(--font-table)",
                    }}
                  >
                    Delete
                  </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background: "#FAF7F2", maxHeight: "350px" }}>
                  {/* Original message */}
                  <div className="flex justify-end">
                    <div className="max-w-[75%] rounded-lg px-3 py-2" style={{ background: "rgba(187,247,208,0.8)" }}>
                      <p className="text-xs" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)", wordBreak: "break-word" }}>
                        {originalMessage.message}
                      </p>
                      <p className="text-[9px] mt-1 text-right" style={{ color: "#6B6B6B", fontFamily: "var(--font-table)" }}>
                        {formatDate(originalMessage.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* Replies */}
                  {replies.map(r => (
                    <div key={r.id} className={`flex ${r.sender_type === "user" ? "justify-end" : "justify-start"}`}>
                      <div className="max-w-[75%] rounded-lg px-3 py-2" style={{
                        background: r.sender_type === "user" ? "rgba(187,247,208,0.8)" : "rgba(255,255,255,0.9)",
                        border: r.sender_type === "admin" ? "2px solid #C9B29F" : "none",
                      }}>
                        {r.sender_type === "admin" && (
                          <p className="text-[9px] font-bold mb-1" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>⚡ Support Team</p>
                        )}
                        <p className="text-xs" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)", wordBreak: "break-word" }}>
                          {r.message}
                        </p>
                        <p className="text-[9px] mt-1" style={{ color: "#6B6B6B", textAlign: r.sender_type === "user" ? "right" : "left", fontFamily: "var(--font-table)" }}>
                          {formatDate(r.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                {/* Reply Input */}
                <div className="px-4 py-3 flex-shrink-0" style={{ borderTop: "2px solid #C9B29F" }}>
                  <div className="flex gap-2">
                    <textarea
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                      placeholder="Type your reply..."
                      rows={1}
                      className="flex-1 rounded-lg px-3 py-2.5 text-sm outline-none resize-none"
                      style={{ background: "#FAFAFA", border: "2px solid #C9B29F", color: "#1C1C1C", fontFamily: "var(--font-table)", minHeight: "42px", maxHeight: "100px", overflowY: "auto" }}
                      onInput={(e) => { const t = e.target as HTMLTextAreaElement; t.style.height = "42px"; t.style.height = Math.min(t.scrollHeight, 100) + "px"; }}
                    />
                    <button onClick={sendReply} disabled={sending || !replyText.trim()}
                      className="px-4 py-2.5 rounded-lg text-xs font-semibold uppercase transition-all hover:scale-[1.03] disabled:opacity-40"
                      style={{ background: "#1C1C1C", color: "#FAF7F2", fontFamily: "var(--font-table)" }}>
                      {sending ? "..." : "Send"}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-16">
                <span className="text-3xl mb-3">💬</span>
                <p className="text-sm font-medium" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>
                  Select a ticket to view
                </p>
                <p className="text-[10px] mt-1" style={{ color: "#6B6B6B", fontFamily: "var(--font-table)" }}>
                  Click a ticket on the left to see the conversation
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
