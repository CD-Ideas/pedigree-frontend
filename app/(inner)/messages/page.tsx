"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const GLASS_BOX = {
  background: "linear-gradient(180deg, rgba(30,30,30,0.85) 0%, rgba(22,22,22,0.9) 100%)",
  backdropFilter: "blur(16px)",
  border: "1.5px solid rgba(255,255,255,0.06)",
  boxShadow: "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)",
};

interface Thread {
  thread_id: string;
  other_user_id: number;
  other_username: string;
  other_profile_picture: string | null;
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
  attachments?: string;
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
  const [pendingAttachments, setPendingAttachments] = useState<{ url: string; name: string; size: number; isImage: boolean }[]>([]);
  const [otherUserStatus, setOtherUserStatus] = useState<{ online: boolean; last_active: string | null; seconds_ago: number | null } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const composeFileRef = useRef<HTMLInputElement>(null);
  const composeImageRef = useRef<HTMLInputElement>(null);
  const [composePendingAttachments, setComposePendingAttachments] = useState<{ url: string; name: string; size: number; isImage: boolean }[]>([]);
  const [onlineData, setOnlineData] = useState<{ members_online: number; guests_online: number; online_members: { id: number; username: string; profile_picture: string | null }[] }>({ members_online: 0, guests_online: 0, online_members: [] });
  const [showAllOnline, setShowAllOnline] = useState(false);
  const [onlineSearch, setOnlineSearch] = useState("");
  const [convSearch, setConvSearch] = useState("");

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

  // Auto-poll threads every 15 seconds
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      fetchThreads();
    }, 15000);
    return () => clearInterval(interval);
  }, [user]);

  // Fetch who's online
  useEffect(() => {
    const fetchOnline = () => {
      fetch("/api/heartbeat").then(r => r.json()).then(d => setOnlineData(d)).catch(() => {});
    };
    fetchOnline();
    const interval = setInterval(fetchOnline, 60000);
    return () => clearInterval(interval);
  }, []);

  // Poll other user's online status
  useEffect(() => {
    if (!selectedThread) { setOtherUserStatus(null); return; }
    const thread = threads.find(t => t.thread_id === selectedThread);
    if (!thread) return;
    const checkStatus = () => {
      fetch(`/api/users/status?username=${encodeURIComponent(thread.other_username)}`)
        .then(r => r.json())
        .then(data => setOtherUserStatus(data))
        .catch(() => {});
    };
    checkStatus();
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, [selectedThread, threads]);

  // Auto-poll active conversation every 5 seconds
  useEffect(() => {
    if (!user || !selectedThread) return;
    const interval = setInterval(() => {
      fetch(`/api/messages?userId=${user.id}&threadId=${selectedThread}`)
        .then(r => r.json())
        .then(data => {
          const newMsgs = data.messages || [];
          setThreadMessages(prev => {
            if (newMsgs.length !== prev.length || (newMsgs.length > 0 && prev.length > 0 && newMsgs[newMsgs.length - 1].id !== prev[prev.length - 1].id)) {
              // New messages arrived — scroll to bottom
              setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
              return newMsgs;
            }
            // Update read status without replacing (for Seen/Delivered updates)
            if (JSON.stringify(newMsgs.map((m: Message) => m.is_read)) !== JSON.stringify(prev.map((m: Message) => m.is_read))) {
              return newMsgs;
            }
            return prev;
          });
        })
        .catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, [user, selectedThread]);

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: "reply" | "compose") => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 10 * 1024 * 1024) { alert("File too large (max 10MB)"); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("userId", String(user.id));
      fd.append("file", file);
      const res = await fetch("/api/messages/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.success) {
        const att = { url: data.url, name: data.name, size: data.size, isImage: data.isImage };
        if (target === "reply") setPendingAttachments(prev => [...prev, att]);
        else setComposePendingAttachments(prev => [...prev, att]);
      }
    } catch (_e) {}
    setUploading(false);
    e.target.value = "";
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const sendReply = async () => {
    if (!user || (!replyText.trim() && pendingAttachments.length === 0) || !selectedThread) return;
    const thread = threads.find(t => t.thread_id === selectedThread);
    if (!thread) return;
    setSending(true);
    try {
      const attachmentsJson = pendingAttachments.length > 0 ? JSON.stringify(pendingAttachments) : "";
      const msgBody = replyText.trim() || (pendingAttachments.length > 0 ? `📎 ${pendingAttachments.map(a => a.name).join(", ")}` : "");
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromUserId: user.id,
          toUsername: thread.other_username,
          subject: thread.subject || "",
          body: msgBody,
          threadId: selectedThread,
          attachments: attachmentsJson,
        }),
      });
      const data = await res.json();
      if (!data.error) {
        setReplyText("");
        setPendingAttachments([]);
        openThread(selectedThread);
      }
    } catch (_e) {}
    setSending(false);
  };

  const sendNewMessage = async () => {
    if (!user || !toUsername.trim() || (!replyText.trim() && composePendingAttachments.length === 0)) return;
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
          body: replyText.trim() || (composePendingAttachments.length > 0 ? `📎 ${composePendingAttachments.map(a => a.name).join(", ")}` : ""),
          attachments: composePendingAttachments.length > 0 ? JSON.stringify(composePendingAttachments) : "",
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

  const formatLastSeen = (seconds: number | null) => {
    if (seconds === null) return "Never";
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (!user) return null;

  const selectedThreadData = threads.find(t => t.thread_id === selectedThread);

  return (
    <div className="max-w-5xl mx-auto space-y-4 px-2 sm:px-0">
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
          className="px-5 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all hover:scale-[1.03]"
          style={{
            background: "linear-gradient(135deg, #e8c86e, #b8860b)",
            color: "#000",
            fontFamily: "var(--font-table)",
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
              <textarea value={subject} onChange={e => setSubject(e.target.value)}
                placeholder="Subject..."
                rows={1}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none"
                style={{ background: "rgba(20,20,25,0.8)", border: "1px solid rgba(212,168,85,0.15)", color: "var(--text-primary)", fontFamily: "var(--font-table)", minHeight: "38px", maxHeight: "80px", overflowY: "auto" }}
                onInput={(e) => { const t = e.target as HTMLTextAreaElement; t.style.height = "38px"; t.style.height = Math.min(t.scrollHeight, 80) + "px"; }} />
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
              className="px-4 py-2 rounded-lg text-xs font-semibold uppercase"
              style={{ background: "linear-gradient(135deg, #e8e8e8, #b0b0b0, #d8d8d8, #a0a0a0)", color: "#000", fontFamily: "var(--font-table)" }}>
              Cancel
            </button>
            <button onClick={sendNewMessage} disabled={sending || !toUsername.trim() || !replyText.trim()}
              className="px-5 py-2 rounded-lg text-xs font-semibold uppercase transition-all hover:scale-[1.03] disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #e8c86e, #b8860b)", color: "#000", fontFamily: "var(--font-table)" }}>
              {sending ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      )}

      {/* Main Layout: Thread List + Chat + Online */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4" style={{ minHeight: "min(500px, 70vh)" }}>
        {/* Thread List */}
        <div className="md:col-span-1 rounded-xl overflow-hidden" style={GLASS_BOX}>
          <div className="px-4 py-3 flex-shrink-0" style={{ borderBottom: "1px solid rgba(212,168,85,0.1)" }}>
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-widest font-semibold"
                style={{ color: "#d4a855", fontFamily: "var(--font-table)" }}>
                Conversations
              </p>
              <p className="text-[9px]" style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)" }}>
                <span style={{ color: "#d4a855", fontWeight: 700 }}>{threads.length}</span> total
              </p>
            </div>
            <input
              type="text"
              placeholder="Search conversations..."
              value={convSearch}
              onChange={e => setConvSearch(e.target.value)}
              className="w-full mt-2 rounded-lg px-2.5 py-1.5 text-[10px] outline-none"
              style={{
                background: "rgba(20,20,25,0.8)",
                border: "1px solid rgba(212,168,85,0.15)",
                color: "var(--text-primary)",
                fontFamily: "var(--font-table)",
              }}
            />
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: "290px" }}>
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
            ) : threads.filter(t => t.other_username.toLowerCase().includes(convSearch.toLowerCase())).length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-[10px]" style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)" }}>
                  No conversations found
                </p>
              </div>
            ) : threads.filter(t => t.other_username.toLowerCase().includes(convSearch.toLowerCase())).map(t => {
              const accentColor = selectedThread === t.thread_id ? "#d4a855" : t.unread_count > 0 ? "#60a5fa" : "#d4a855";
              return (
              <button key={t.thread_id} onClick={() => { openThread(t.thread_id); setShowCompose(false); }}
                className="w-full text-left mx-2 my-1.5 rounded-lg p-2.5 hover:scale-[1.02]"
                style={{
                  background: selectedThread === t.thread_id
                    ? `linear-gradient(135deg, ${accentColor}18, ${accentColor}08, #0b1120)`
                    : t.unread_count > 0
                    ? `linear-gradient(135deg, #60a5fa12, #60a5fa06, #0b1120)`
                    : `linear-gradient(135deg, ${accentColor}0a, ${accentColor}05, #0b1120)`,
                  border: selectedThread === t.thread_id ? `1px solid ${accentColor}55` : `1px solid ${accentColor}22`,
                  transition: "all 0.3s ease",
                  width: "calc(100% - 16px)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 0 12px ${accentColor}30`;
                  (e.currentTarget as HTMLElement).style.borderColor = `${accentColor}66`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow = "none";
                  (e.currentTarget as HTMLElement).style.borderColor = selectedThread === t.thread_id ? `${accentColor}55` : `${accentColor}22`;
                }}
              >
                <div className="flex items-center gap-2.5">
                  {/* Photo */}
                  {t.other_profile_picture ? (
                    <div
                      className="w-10 h-10 rounded-md flex-shrink-0 bg-cover bg-center"
                      style={{
                        backgroundImage: `url(${t.other_profile_picture})`,
                        border: `1.5px solid ${accentColor}55`,
                      }}
                    />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-md flex-shrink-0 flex items-center justify-center text-sm font-bold"
                      style={{
                        background: `linear-gradient(135deg, ${accentColor}30, ${accentColor}15)`,
                        border: `1.5px solid ${accentColor}55`,
                        color: accentColor,
                      }}
                    >
                      {(t.other_username || "?")[0].toUpperCase()}
                    </div>
                  )}
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold truncate"
                        style={{ color: accentColor, fontFamily: "var(--font-table)" }}>
                        {t.other_username || "Unknown"}
                      </span>
                      <span className="text-[9px] flex-shrink-0 ml-1" style={{ color: "var(--text-muted)" }}>
                        {formatDate(t.last_time)}
                      </span>
                    </div>
                    {t.subject && (
                      <p className="text-[10px] font-semibold truncate"
                        style={{ color: "var(--text-primary)", fontFamily: "var(--font-table)" }}>
                        {t.subject}
                      </p>
                    )}
                    <p className="text-[10px] truncate"
                      style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)" }}>
                      {t.last_body.substring(0, 60)}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
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
                  </div>
                </div>
              </button>
              );
            })}
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
                    style={{ background: "linear-gradient(135deg, var(--accent-gold), #b8860b)", color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>
                    {(selectedThreadData.other_username || "?")[0].toUpperCase()}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold" style={{ color: "#d4a855", fontFamily: "var(--font-table)" }}>
                        {selectedThreadData.other_username}
                      </p>
                      {otherUserStatus && (
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full" style={{ background: otherUserStatus.online ? "#22c55e" : "#6b7280" }} />
                          <span className="text-[9px] font-medium" style={{ color: otherUserStatus.online ? "#22c55e" : "#6b7280", fontFamily: "var(--font-table)" }}>
                            {otherUserStatus.online ? "Online" : `Last seen ${formatLastSeen(otherUserStatus.seconds_ago)}`}
                          </span>
                        </span>
                      )}
                    </div>
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
              <div className="flex-1 overflow-y-auto px-2 sm:px-4 py-3 space-y-3" style={{ maxHeight: "min(350px, 50vh)", background: "linear-gradient(180deg, #eef1f5 0%, #e4e8ee 100%)" }}>
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
                            ? "#dcfce7"
                            : "#dbeafe",
                          border: isMine
                            ? "1px solid rgba(34,197,94,0.2)"
                            : "1px solid rgba(96,165,250,0.2)",
                          borderRadius: isMine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                        }}>
                        <p className="text-sm whitespace-pre-wrap" style={{ color: "#1a202c", fontFamily: "var(--font-table)", lineHeight: 1.6 }}>
                          {msg.body}
                        </p>
                        {msg.attachments && msg.attachments !== "" && (() => {
                          try {
                            const atts = JSON.parse(msg.attachments);
                            return (
                              <div className="mt-2 space-y-1.5">
                                {atts.map((att: { url: string; name: string; size: number; isImage: boolean }, i: number) => (
                                  att.isImage ? (
                                    <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" className="block">
                                      <img src={att.url} alt={att.name} className="max-w-full rounded-lg max-h-48 object-cover" style={{ border: "1px solid rgba(0,0,0,0.1)" }} />
                                    </a>
                                  ) : (
                                    <a key={i} href={att.url} target="_blank" rel="noopener noreferrer"
                                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all hover:opacity-80"
                                      style={{ background: "rgba(0,0,0,0.06)", color: "#2563eb", fontFamily: "var(--font-table)" }}>
                                      <span>📎</span>
                                      <span className="truncate">{att.name}</span>
                                      <span className="text-[9px] flex-shrink-0" style={{ color: "#6b7280" }}>{formatFileSize(att.size)}</span>
                                    </a>
                                  )
                                ))}
                              </div>
                            );
                          } catch { return null; }
                        })()}
                        <p className={`text-[9px] mt-1 flex items-center gap-1.5 ${isMine ? "justify-end" : ""}`} style={{ color: "#6b7280" }}>
                          {formatFullDate(msg.created_at)}
                          {isMine && (
                            <span style={{ color: msg.is_read ? "#7c3aed" : "#2563eb", fontSize: "10px", fontWeight: 700 }}>
                              {msg.is_read ? "✓✓ Seen" : "✓ Delivered"}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Reply Input */}
              <div className="px-4 py-3 flex-shrink-0" style={{ borderTop: "1px solid rgba(212,168,85,0.1)" }}>
                {/* Pending attachments preview */}
                {pendingAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {pendingAttachments.map((att, i) => (
                      <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px]"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                        {att.isImage ? (
                          <img src={att.url} alt="" className="w-8 h-8 rounded object-cover" />
                        ) : (
                          <span>📎</span>
                        )}
                        <span className="truncate max-w-[100px]" style={{ color: "var(--text-primary)", fontFamily: "var(--font-table)" }}>{att.name}</span>
                        <button onClick={() => setPendingAttachments(prev => prev.filter((_, j) => j !== i))}
                          className="text-red-400 hover:text-red-300 ml-1">✕</button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    disabled={uploading}
                    className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-all hover:scale-105"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                    title="Attach photo"
                  >
                    <span className="text-lg">🖼️</span>
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-all hover:scale-105"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                    title="Attach file"
                  >
                    {uploading ? (
                      <span className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--accent-gold)", borderTopColor: "transparent" }} />
                    ) : (
                      <span className="text-lg">📎</span>
                    )}
                  </button>
                  <input ref={imageInputRef} type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, "reply")} />
                  <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.txt,.zip,.xls,.xlsx,.csv" onChange={e => handleFileUpload(e, "reply")} />
                  <textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                    placeholder="Type a message..."
                    rows={1}
                    className="flex-1 rounded-lg px-3 py-2.5 text-sm outline-none resize-none"
                    style={{ background: "rgba(20,20,25,0.8)", border: "1px solid rgba(212,168,85,0.15)", color: "var(--text-primary)", fontFamily: "var(--font-table)", minHeight: "42px", maxHeight: "120px", overflowY: "auto" }}
                    onInput={(e) => { const t = e.target as HTMLTextAreaElement; t.style.height = "42px"; t.style.height = Math.min(t.scrollHeight, 120) + "px"; }}
                  />
                  <button onClick={sendReply} disabled={sending || !replyText.trim()}
                    className="px-4 py-2.5 rounded-lg text-xs font-semibold uppercase transition-all hover:scale-[1.03] disabled:opacity-40"
                    style={{ background: "linear-gradient(135deg, #e8c86e, #b8860b)", color: "#000", fontFamily: "var(--font-table)" }}>
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

        {/* Who's Online - Right Panel */}
        <div className="hidden md:flex md:flex-col md:col-span-1 rounded-xl overflow-hidden" style={GLASS_BOX}>
          <div className="px-4 py-3 flex-shrink-0" style={{ borderBottom: "1px solid rgba(212,168,85,0.1)" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#22c55e", boxShadow: "0 0 6px #22c55e" }} />
                <p className="text-[10px] uppercase tracking-widest font-semibold"
                  style={{ color: "#d4a855", fontFamily: "var(--font-table)" }}>
                  Online
                </p>
              </div>
              <p className="text-[9px]" style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)" }}>
                <span style={{ color: "#22c55e", fontWeight: 700 }}>{onlineData.members_online}</span> member{onlineData.members_online !== 1 ? "s" : ""} : <span style={{ color: "#d4a855", fontWeight: 700 }}>{onlineData.guests_online}</span> guest{onlineData.guests_online !== 1 ? "s" : ""}
              </p>
            </div>
            <input
              type="text"
              value={onlineSearch}
              onChange={e => setOnlineSearch(e.target.value)}
              placeholder="Search online..."
              className="w-full mt-2 rounded-lg px-2.5 py-1.5 text-[10px] outline-none"
              style={{
                background: "rgba(20,20,25,0.8)",
                border: "1px solid rgba(212,168,85,0.15)",
                color: "var(--text-primary)",
                fontFamily: "var(--font-table)",
              }}
            />
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: "290px" }}>
            {(() => {
              const filtered = onlineData.online_members.filter(m =>
                m.username.toLowerCase().includes(onlineSearch.toLowerCase())
              );
              return filtered.length > 0 ? (
                <div className="py-1">
                  {filtered.map(m => (
                    <a key={m.id} href={`/profile/${m.username}`}
                      className="block mx-2 my-1.5 rounded-lg p-2.5 hover:scale-[1.02] transition-all"
                      style={{
                        background: `linear-gradient(135deg, #22c55e0a, #22c55e05, #0b1120)`,
                        border: `1px solid #22c55e22`,
                      }}>
                      <div className="flex items-center gap-2.5">
                        <div className="relative flex-shrink-0">
                          {m.profile_picture ? (
                            <img src={m.profile_picture} alt="" className="w-10 h-8 rounded-md object-cover"
                              style={{ border: "1.5px solid #22c55e55" }} />
                          ) : (
                            <div className="w-10 h-10 rounded-md flex items-center justify-center text-sm font-bold"
                              style={{
                                background: `linear-gradient(135deg, #22c55e30, #22c55e15)`,
                                border: `1.5px solid #22c55e55`,
                                color: "#22c55e",
                              }}>
                              {m.username[0].toUpperCase()}
                            </div>
                          )}
                          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                            style={{ background: "#22c55e", borderColor: "#1e1e1e" }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-bold truncate block"
                            style={{ color: "#22c55e", fontFamily: "var(--font-table)" }}>
                            {m.username}
                          </span>
                          <span className="text-[9px]" style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)" }}>
                            Online now
                          </span>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center">
                  <p className="text-[10px]" style={{ color: "var(--text-muted)", fontFamily: "var(--font-table)" }}>
                    {onlineSearch ? "No matches" : "No members online"}
                  </p>
                </div>
              );
            })()}
          </div>
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
