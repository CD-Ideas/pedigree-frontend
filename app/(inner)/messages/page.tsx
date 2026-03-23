"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const GLASS_BOX = {
  background: "linear-gradient(180deg, rgba(40,40,45,0.95) 0%, rgba(30,30,35,0.95) 100%)",
  backdropFilter: "blur(12px)",
  border: "1.5px solid rgba(212,168,85,0.15)",
  boxShadow: "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)",
};

interface Thread {
  thread_id: string;
  other_user_id: number;
  other_username: string;
  last_body: string;
  subject: string;
  last_time: string;
  unread_count: number;
  msg_count: number;
  marketplace_ad_id: number | null;
}

interface Message {
  id: number;
  from_user_id: number;
  to_user_id: number;
  from_username?: string;
  to_username?: string;
  subject: string;
  body: string;
  is_read: number;
  created_at: string;
  thread_id: string;
  marketplace_ad_id: number | null;
}

interface UserData {
  id: number;
  username: string;
}

function MessagesContent() {
  const searchParams = useSearchParams();
  const [user, setUser] = useState<UserData | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [threadMessages, setThreadMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Compose
  const [showCompose, setShowCompose] = useState(false);
  const [toUsername, setToUsername] = useState("");
  const [subject, setSubject] = useState("");
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [composeMsg, setComposeMsg] = useState("");

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "null");
      if (u) setUser(u);
    } catch (_e) {}
    // Check URL params for marketplace integration
    const to = searchParams.get("to");
    const subj = searchParams.get("subject");
    if (to) {
      setToUsername(to);
      if (subj) setSubject(subj);
      setShowCompose(true);
    }
  }, [searchParams]);

  const fetchThreads = () => {
    if (!user) return;
    fetch(`/api/messages?userId=${user.id}&folder=threads`)
      .then(r => r.json())
      .then(data => {
        setThreads(data.threads || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetchThreads();
  }, [user]);

  const openThread = (threadId: string) => {
    if (!user) return;
    setSelectedThread(threadId);
    setThreadLoading(true);
    fetch(`/api/messages?userId=${user.id}&threadId=${threadId}`)
      .then(r => r.json())
      .then(data => {
        setThreadMessages(data.messages || []);
        setThreadLoading(false);
        // Update thread unread count locally
        setThreads(prev => prev.map(t => t.thread_id === threadId ? { ...t, unread_count: 0 } : t));
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      })
      .catch(() => setThreadLoading(false));
  };

  const sendReply = async () => {
    if (!user || !replyText.trim() || !selectedThread) return;
    const thread = threads.find(t => t.thread_id === selectedThread);
    if (!thread) return;
    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromUserId: user.id,
          toUsername: thread.other_username,
          subject: thread.subject || "",
          body: replyText.trim(),
          threadId: selectedThread,
        }),
      });
      const data = await res.json();
      if (!data.error) {
        setReplyText("");
        openThread(selectedThread);
      }
    } catch (_e) {}
    setSending(false);
  };

  const sendNewMessage = async () => {
    if (!user || !toUsername.trim() || !replyText.trim()) return;
    setSending(true);
    setComposeMsg("");
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromUserId: user.id,
          toUsername: toUsername.trim(),
          subject: subject.trim(),
          body: replyText.trim(),
        }),
      });
      const data = await res.json();
      if (data.error) {
        setComposeMsg(data.error);
      } else {
        setComposeMsg("Message sent!");
        setToUsername("");
        setSubject("");
        setReplyText("");
        setTimeout(() => {
          setShowCompose(false);
          setComposeMsg("");
          fetchThreads();
          if (data.thread_id) openThread(data.thread_id);
        }, 1000);
      }
    } catch (_e) {
      setComposeMsg("Failed to send");
    }
    setSending(false);
  };

  const deleteThread = async (threadId: string) => {
    if (!user || !confirm("Delete this entire conversation?")) return;
    const msgs = threadMessages.length > 0 && selectedThread === threadId
      ? threadMessages
      : [];
    // Delete all messages in thread
    for (const msg of msgs) {
      await fetch(`/api/messages/${msg.id}?userId=${user.id}`, { method: "DELETE" });
    }
    if (msgs.length === 0) {
      // Fetch thread messages first then delete
      const res = await fetch(`/api/messages?userId=${user.id}&threadId=${threadId}`);
      const data = await res.json();
      for (const msg of (data.messages || [])) {
        await fetch(`/api/messages/${msg.id}?userId=${user.id}`, { method: "DELETE" });
      }
    }
    setThreads(prev => prev.filter(t => t.thread_id !== threadId));
    if (selectedThread === threadId) {
      setSelectedThread(null);
      setThreadMessages([]);
    }
  };

  const formatDate = (d: string) => {
    try {
      const date = new Date(d + "Z");
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      if (diff < 60000) return "Just now";
      if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
      if (diff < 86400000) return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch (_e) { return d; }
  };

  const formatFullDate = (d: string) => {
    try {
      const date = new Date(d + "Z");
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch (_e) { return d; }
  };

  if (!user) return null;

  const selectedThreadData = threads.find(t => t.thread_id === selectedThread);

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "1.6rem",
            background: "linear-gradient(135deg, #e8c86e, #d4a855, #b8860b)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            Messages
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted, #5a6a82)", fontFamily: "var(--font-table)" }}>
            Private conversations
          </p>
        </div>
        <button
          onClick={() => { setShowCompose(!showCompose); setSelectedThread(null); setReplyText(""); setComposeMsg(""); }}
          className="px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all hover:scale-[1.03]"
          style={{
            background: "linear-gradient(135deg, #e8c86e, #b8860b)",
            color: "#000",
            fontFamily: "var(--font-display)",
            boxShadow: "0 4px 15px rgba(212,168,85,0.2)",
          }}>
          + New Message
        </button>
      </div>

      {/* Compose Panel */}
      {showCompose && (
        <div className="rounded-xl p-5 space-y-3" style={GLASS_BOX}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2"
              style={{ color: "#d4a855", fontFamily: "var(--font-table)" }}>
              <span style={{ filter: "drop-shadow(0 0 4px rgba(212,168,85,0.5))" }}>✉️</span>
              New Conversation
            </h2>
            <button onClick={() => { setShowCompose(false); setComposeMsg(""); }}
              className="text-sm" style={{ color: "var(--text-muted)" }}>✕</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-semibold mb-1"
                style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}>To (username)</label>
              <input value={toUsername} onChange={e => setToUsername(e.target.value)}
                placeholder="Enter username..."
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: "rgba(20,20,25,0.8)", border: "1px solid rgba(212,168,85,0.15)", color: "var(--text-primary)", fontFamily: "var(--font-table)" }} />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-semibold mb-1"
                style={{ color: "#5a6a82", fontFamily: "var(--font-table)" }}>Subject (optional)</label>
              <input value={subject} onChange={e => setSubject(e.target.value)}
                placeholder="Subject..."
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: "rgba(20,20,25,0.8)", border: "1px solid rgba(212,168,85,0.15)", color: "var(--text-primary)", fontFamily: "var(--font-table)" }} />
            </div>
          </div>
          <textarea value={replyText} onChange={e => setReplyText(e.target.value)}
            placeholder="Write your message..."
            rows={3}
            className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none"
            style={{ background: "rgba(20,20,25,0.8)", border: "1px solid rgba(212,168,85,0.15)", color: "var(--text-primary)", fontFamily: "var(--font-table)" }} />
          {composeMsg && (
            <p className="text-xs" style={{ color: composeMsg === "Message sent!" ? "#22c55e" : "#ef4444", fontFamily: "var(--font-table)" }}>
              {composeMsg}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button onClick={() => { setShowCompose(false); setComposeMsg(""); }}
              className="px-4 py-2 rounded-lg text-xs font-bold uppercase"
              style={{ background: "linear-gradient(135deg, #e8e8e8, #b0b0b0, #d8d8d8, #a0a0a0)", color: "#000", fontFamily: "var(--font-display)" }}>
              Cancel
            </button>
            <button onClick={sendNewMessage} disabled={sending || !toUsername.trim() || !replyText.trim()}
              className="px-5 py-2 rounded-lg text-xs font-bold uppercase transition-all hover:scale-[1.03] disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #e8c86e, #b8860b)", color: "#000", fontFamily: "var(--font-display)" }}>
              {sending ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      )}

      {/* Main Layout: Thread List + Chat */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ minHeight: "500px" }}>
        {/* Thread List */}
        <div className="md:col-span-1 rounded-xl overflow-hidden" style={GLASS_BOX}>
          <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(212,168,85,0.1)" }}>
            <p className="text-[10px] uppercase tracking-widest font-semibold"
              style={{ color: "#d4a855", fontFamily: "var(--font-table)" }}>
              Conversations
            </p>
          </div>
          <div className="max-h-[450px] overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center">
                <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-2"
                  style={{ borderColor: "var(--accent-gold)", borderTopColor: "transparent" }} />
              </div>
            ) : threads.length === 0 ? (
              <div className="p-6 text-center">
                <span className="text-3xl block mb-2">📭</span>
                <p className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)" }}>
                  No conversations yet
                </p>
                <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)" }}>
                  Click &quot;+ New Message&quot; to start
                </p>
              </div>
            ) : threads.map(t => (
              <button key={t.thread_id} onClick={() => { openThread(t.thread_id); setShowCompose(false); }}
                className="w-full text-left px-4 py-3 transition-colors hover:bg-white/5 group"
                style={{
                  borderBottom: "1px solid rgba(255,255,255,0.03)",
                  background: selectedThread === t.thread_id ? "rgba(212,168,85,0.08)" : t.unread_count > 0 ? "rgba(59,130,246,0.04)" : "transparent",
                }}>
                <div className="flex items-center justify-between mb-0.5">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                      style={{ background: "linear-gradient(135deg, var(--accent-gold), #b8860b)", color: "#000" }}>
                      {(t.other_username || "?")[0].toUpperCase()}
                    </span>
                    <span className="text-xs font-bold truncate"
                      style={{ color: t.unread_count > 0 ? "#60a5fa" : "#d4a855", fontFamily: "var(--font-table)" }}>
                      {t.other_username || "Unknown"}
                    </span>
                  </div>
                  <span className="text-[9px] flex-shrink-0 ml-1" style={{ color: "var(--text-muted)" }}>
                    {formatDate(t.last_time)}
                  </span>
                </div>
                {t.subject && (
                  <p className="text-[10px] font-semibold truncate ml-9"
                    style={{ color: "var(--text-primary)", fontFamily: "var(--font-table)" }}>
                    {t.subject}
                  </p>
                )}
                <p className="text-[10px] truncate ml-9"
                  style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)" }}>
                  {t.last_body.substring(0, 60)}
                </p>
                <div className="flex items-center gap-2 ml-9 mt-1">
                  {t.unread_count > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[8px] font-bold"
                      style={{ background: "#3b82f6", color: "#fff" }}>
                      {t.unread_count} new
                    </span>
                  )}
                  {t.marketplace_ad_id && (
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full"
                      style={{ background: "rgba(212,168,85,0.15)", color: "#d4a855", fontFamily: "var(--font-table)" }}>
                      🏪 Ad
                    </span>
                  )}
                  <span className="text-[8px]" style={{ color: "var(--text-muted)" }}>
                    {t.msg_count} msg{t.msg_count !== 1 ? "s" : ""}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat View */}
        <div className="md:col-span-2 rounded-xl flex flex-col" style={GLASS_BOX}>
          {selectedThread && selectedThreadData ? (
            <>
              {/* Chat Header */}
              <div className="px-4 py-3 flex items-center justify-between flex-shrink-0"
                style={{ borderBottom: "1px solid rgba(212,168,85,0.1)" }}>
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: "linear-gradient(135deg, var(--accent-gold), #b8860b)", color: "#000" }}>
                    {(selectedThreadData.other_username || "?")[0].toUpperCase()}
                  </span>
                  <div>
                    <p className="text-sm font-bold" style={{ color: "#d4a855", fontFamily: "var(--font-table)" }}>
                      {selectedThreadData.other_username}
                    </p>
                    {selectedThreadData.subject && (
                      <p className="text-[10px]" style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)" }}>
                        {selectedThreadData.subject}
                      </p>
                    )}
                  </div>
                </div>
                <button onClick={() => deleteThread(selectedThread)}
                  className="text-[10px] px-2 py-1 rounded transition-colors hover:bg-red-500/10"
                  style={{ color: "#ef4444", fontFamily: "var(--font-table)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  Delete
                </button>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ maxHeight: "350px" }}>
                {threadLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                      style={{ borderColor: "var(--accent-gold)", borderTopColor: "transparent" }} />
                  </div>
                ) : threadMessages.map(msg => {
                  const isMine = msg.from_user_id === user.id;
                  return (
                    <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                      <div className="max-w-[75%] rounded-xl px-3.5 py-2.5"
                        style={{
                          background: isMine
                            ? "linear-gradient(135deg, rgba(212,168,85,0.15), rgba(184,134,11,0.1))"
                            : "rgba(255,255,255,0.05)",
                          border: isMine
                            ? "1px solid rgba(212,168,85,0.2)"
                            : "1px solid rgba(255,255,255,0.06)",
                          borderRadius: isMine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                        }}>
                        <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--text-primary)", fontFamily: "var(--font-table)", lineHeight: 1.6 }}>
                          {msg.body}
                        </p>
                        <p className={`text-[9px] mt-1 ${isMine ? "text-right" : ""}`} style={{ color: "var(--text-muted)" }}>
                          {formatFullDate(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Reply Input */}
              <div className="px-4 py-3 flex-shrink-0" style={{ borderTop: "1px solid rgba(212,168,85,0.1)" }}>
                <div className="flex gap-2">
                  <input
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                    placeholder="Type a message..."
                    className="flex-1 rounded-lg px-3 py-2.5 text-sm outline-none"
                    style={{ background: "rgba(20,20,25,0.8)", border: "1px solid rgba(212,168,85,0.15)", color: "var(--text-primary)", fontFamily: "var(--font-table)" }}
                  />
                  <button onClick={sendReply} disabled={sending || !replyText.trim()}
                    className="px-4 py-2.5 rounded-lg text-xs font-bold uppercase transition-all hover:scale-[1.03] disabled:opacity-40"
                    style={{ background: "linear-gradient(135deg, #e8c86e, #b8860b)", color: "#000", fontFamily: "var(--font-display)" }}>
                    {sending ? "..." : "Send"}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-16">
              <span className="text-5xl mb-3">💬</span>
              <p className="text-sm mb-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)" }}>
                Select a conversation
              </p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)" }}>
                or start a new one
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: "var(--bg-primary, #080d18)" }} />}>
      <MessagesContent />
    </Suspense>
  );
}
