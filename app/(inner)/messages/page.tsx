"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { playChatBubble } from "@/app/sounds";
import { io, Socket } from "socket.io-client";

/* ─── Types ─── */
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

interface Reaction { emoji: string; user_id: number; }

interface UserData { id: number; username: string; }

/* ─── Helpers ─── */
function formatTime(d: string) {
  try {
    const date = new Date(d + "Z");
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60000) return "now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    if (diff < 604800000) return date.toLocaleDateString("en-US", { weekday: "short" });
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch { return d; }
}

function formatFullTime(d: string) {
  try {
    const date = new Date(d + "Z");
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  } catch { return d; }
}

function formatDateSeparator(d: string) {
  try {
    const date = new Date(d + "Z");
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diff = today.getTime() - msgDay.getTime();
    if (diff === 0) return "Today";
    if (diff === 86400000) return "Yesterday";
    if (diff < 604800000) return date.toLocaleDateString("en-US", { weekday: "long" });
    return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  } catch { return ""; }
}

function formatLastSeen(seconds: number | null) {
  if (seconds === null) return "";
  if (seconds < 60) return "last seen just now";
  if (seconds < 3600) return `last seen ${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `last seen ${Math.floor(seconds / 3600)}h ago`;
  return `last seen ${Math.floor(seconds / 86400)}d ago`;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function shouldShowDate(msgs: Message[], idx: number) {
  if (idx === 0) return true;
  const prev = new Date(msgs[idx - 1].created_at + "Z");
  const curr = new Date(msgs[idx].created_at + "Z");
  return prev.toDateString() !== curr.toDateString();
}

/* ─── Avatar Component ─── */
function Avatar({ src, username, size = "w-10 h-10", textSize = "text-sm" }: { src: string | null; username: string; size?: string; textSize?: string }) {
  if (src && src.startsWith("emoji:")) {
    return (
      <span className={`${size} rounded-full flex items-center justify-center flex-shrink-0`}
        style={{ background: "#FAF7F2", border: "2px solid #C9B29F" }}>
        <span className={textSize}>{src.replace("emoji:", "")}</span>
      </span>
    );
  }
  if (src) {
    return (
      <img src={src} alt="" className={`${size} rounded-full object-cover flex-shrink-0`}
        style={{ border: "2px solid #C9B29F" }} />
    );
  }
  return (
    <span className={`${size} rounded-full flex items-center justify-center font-bold flex-shrink-0`}
      style={{ background: "#C9B29F", color: "#1C1C1C" }}>
      <span className={textSize}>{(username || "?")[0].toUpperCase()}</span>
    </span>
  );
}

/* ─── Main Component ─── */
function MessagesContent() {
  const searchParams = useSearchParams();
  const [user, setUser] = useState<UserData | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [threadMessages, setThreadMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Compose
  const [showCompose, setShowCompose] = useState(false);
  const [toUsername, setToUsername] = useState("");
  const [subject, setSubject] = useState("");
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [composeMsg, setComposeMsg] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<{ url: string; name: string; size: number; isImage: boolean; isVoice?: boolean }[]>([]);
  const [otherUserStatus, setOtherUserStatus] = useState<{ online: boolean; last_active: string | null; seconds_ago: number | null } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [convSearch, setConvSearch] = useState("");
  const [onlineUserIds, setOnlineUserIds] = useState<Set<number>>(new Set());
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [typingUserId, setTypingUserId] = useState<number | null>(null);
  const [showGroupCreate, setShowGroupCreate] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupMembers, setGroupMembers] = useState<string[]>([]);
  const [groupMemberInput, setGroupMemberInput] = useState("");
  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reactions state
  const [reactions, setReactions] = useState<Record<number, Reaction[]>>({});
  const [reactionPickerMsgId, setReactionPickerMsgId] = useState<number | null>(null);
  const [emojiPanelOpen, setEmojiPanelOpen] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const EMOJI_CATEGORIES: { name: string; emojis: string[] }[] = [
    { name: "Smileys", emojis: ["😀","😁","😂","🤣","😃","😄","😅","😆","😉","😊","😋","😎","😍","🥰","😘","😗","😙","😚","🙂","🤗","🤩","🤔","🤨","😐","😑","😶","🙄","😏","😣","😥","😮","🤐","😯","😪","😫","😴","😌","😛","😜","😝","🤤","😒","😓","😔","😕","🙃","🤑","😲","🤯","😬","🥴","😵","🤮","🤢","🤧","😷","🤒","🤕"] },
    { name: "Gestures", emojis: ["👍","👎","👊","✊","🤛","🤜","🤞","✌️","🤟","🤘","👌","🤌","👈","👉","👆","👇","☝️","👋","🤚","🖐️","✋","🖖","👏","🙌","🤲","🤝","🙏","💪","🦾"] },
    { name: "Hearts", emojis: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❤️‍🔥","💕","💞","💓","💗","💖","💘","💝"] },
    { name: "Animals", emojis: ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🐔","🐧","🐦","🐤","🦄","🐴","🐺","🦇","🐝","🐛","🦋","🐌","🐞"] },
    { name: "Food", emojis: ["🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍈","🍒","🍑","🥭","🍍","🥥","🥝","🍅","🥑","🍕","🍔","🍟","🌭","🍿","🧁","🍰","🍩","🍪"] },
    { name: "Objects", emojis: ["⚽","🏀","🏈","⚾","🎾","🏐","🎱","🏆","🥇","🥈","🥉","🎯","🎮","🎲","🎭","🎨","🎬","🎤","🎧","🎵","🎶","🔥","⭐","🌟","💫","✨","⚡","💥","💯","💢","🎉","🎊"] },
  ];

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Close reaction picker on click outside
  useEffect(() => {
    const handler = () => { setReactionPickerMsgId(null); setEmojiPanelOpen(false); };
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);

  // Init user
  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "null");
      if (u) setUser(u);
    } catch {}
    const to = searchParams.get("to");
    const subj = searchParams.get("subject");
    if (to) {
      setToUsername(to);
      if (subj) setSubject(subj);
      setShowCompose(true);
    }
  }, [searchParams]);

  // ─── Socket.io Connection ───
  useEffect(() => {
    if (!user) return;
    const socket = io(window.location.origin, {
      path: "/socket.io/",
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[Socket] Connected:", socket.id);
      socket.emit("auth", { userId: user.id, username: user.username });
    });

    // Real-time: new message from someone
    socket.on("message:new", (msg: Message) => {
      // If this thread is open, append message
      setThreadMessages(prev => {
        if (prev.length > 0 && prev[0].thread_id === msg.thread_id) {
          if (prev.some(m => m.id === msg.id)) return prev; // dedupe
          playChatBubble();
          setTimeout(() => { chatContainerRef.current && (chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight); }, 50);
          return [...prev, msg];
        }
        return prev;
      });
      // Update thread list
      setThreads(prev => {
        const existing = prev.find(t => t.thread_id === msg.thread_id);
        if (existing) {
          return prev.map(t => t.thread_id === msg.thread_id
            ? { ...t, last_body: msg.body, last_time: msg.created_at, unread_count: t.unread_count + 1 }
            : t);
        }
        // New thread — refresh
        fetchThreads();
        return prev;
      });
    });

    // Real-time: message confirmed sent
    socket.on("message:sent", (msg: Message) => {
      setThreadMessages(prev => {
        // Replace optimistic message with confirmed one
        const lastOptimistic = prev.findIndex(m => m.id === msg.id || (m.from_user_id === msg.from_user_id && m.body === msg.body && !m.thread_id));
        if (lastOptimistic >= 0) {
          const updated = [...prev];
          updated[lastOptimistic] = msg;
          return updated;
        }
        return prev;
      });
    });

    // Real-time: message read by recipient
    socket.on("message:read", ({ messageId }: { messageId: number }) => {
      setThreadMessages(prev => prev.map(m => m.id === messageId ? { ...m, is_read: 1 } : m));
    });

    // Real-time: entire thread read
    socket.on("thread:read", ({ threadId }: { threadId: string }) => {
      setThreadMessages(prev => prev.map(m => m.thread_id === threadId ? { ...m, is_read: 1 } : m));
    });

    // Real-time: typing indicator
    socket.on("typing:update", ({ userId, typing }: { userId: number; typing: boolean }) => {
      setTypingUserId(typing ? userId : null);
    });

    // Real-time: reaction updates
    socket.on("reaction:update", ({ messageId, reactions: msgReactions }: { messageId: number; reactions: Reaction[] }) => {
      setReactions(prev => ({ ...prev, [messageId]: msgReactions }));
    });

    // Real-time: online users list
    socket.on("users:online", (ids: number[]) => {
      setOnlineUserIds(new Set(ids));
    });

    socket.on("disconnect", () => {
      console.log("[Socket] Disconnected");
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  // Fetch threads
  const fetchThreads = useCallback(() => {
    if (!user) return;
    fetch(`/api/messages?userId=${user.id}&folder=threads`)
      .then(r => r.json())
      .then(data => { setThreads(data.threads || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user]);

  useEffect(() => { if (user) { setLoading(true); fetchThreads(); } }, [user, fetchThreads]);

  // Auto-open thread from URL
  useEffect(() => {
    const targetUser = searchParams.get("user");
    if (targetUser && threads.length > 0 && !selectedThread) {
      const thread = threads.find(t => t.other_username.toLowerCase() === targetUser.toLowerCase());
      if (thread) openThread(thread.thread_id);
    }
  }, [threads, searchParams]);

  // Poll threads every 15s
  useEffect(() => {
    if (!user) return;
    const i = setInterval(fetchThreads, 15000);
    return () => clearInterval(i);
  }, [user, fetchThreads]);

  // Poll online users
  useEffect(() => {
    const fetchOnline = () => {
      fetch("/api/heartbeat").then(r => r.json()).then(d => {
        const ids = new Set<number>((d.online_members || []).map((m: { id: number }) => m.id));
        setOnlineUserIds(ids);
      }).catch(() => {});
    };
    fetchOnline();
    const i = setInterval(fetchOnline, 30000);
    return () => clearInterval(i);
  }, []);

  // Poll other user status
  useEffect(() => {
    if (!selectedThread) { setOtherUserStatus(null); return; }
    const thread = threads.find(t => t.thread_id === selectedThread);
    if (!thread) return;
    const check = () => {
      fetch(`/api/users/status?username=${encodeURIComponent(thread.other_username)}`)
        .then(r => r.json()).then(setOtherUserStatus).catch(() => {});
    };
    check();
    const i = setInterval(check, 15000);
    return () => clearInterval(i);
  }, [selectedThread, threads]);

  // Poll active conversation every 5s
  useEffect(() => {
    if (!user || !selectedThread) return;
    const i = setInterval(() => {
      fetch(`/api/messages?userId=${user.id}&threadId=${selectedThread}`)
        .then(r => r.json())
        .then(data => {
          const newMsgs: Message[] = data.messages || [];
          setThreadMessages(prev => {
            if (newMsgs.length !== prev.length || (newMsgs.length > 0 && prev.length > 0 && newMsgs[newMsgs.length - 1].id !== prev[prev.length - 1].id)) {
              if (newMsgs.length > prev.length) {
                const latest = newMsgs[newMsgs.length - 1];
                if (latest && latest.from_user_id !== user.id) playChatBubble();
              }
              setTimeout(() => { chatContainerRef.current && (chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight); }, 50);
              return newMsgs;
            }
            if (JSON.stringify(newMsgs.map(m => m.is_read)) !== JSON.stringify(prev.map(m => m.is_read))) return newMsgs;
            return prev;
          });
        }).catch(() => {});
    }, 5000);
    return () => clearInterval(i);
  }, [user, selectedThread]);

  const openThread = (threadId: string) => {
    if (!user) return;
    setSelectedThread(threadId);
    setThreadLoading(true);
    setShowCompose(false);
    setMobileShowChat(true);
    fetch(`/api/messages?userId=${user.id}&threadId=${threadId}`)
      .then(r => r.json())
      .then(data => {
        const msgs = data.messages || [];
        setThreadMessages(msgs);
        setThreadLoading(false);
        setThreads(prev => prev.map(t => t.thread_id === threadId ? { ...t, unread_count: 0 } : t));
        setTimeout(() => { chatContainerRef.current && (chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight); }, 50);
        // Fetch reactions for loaded messages
        fetchReactions(msgs);
        // Emit thread:read via socket for real-time read receipts
        if (socketRef.current) {
          socketRef.current.emit("thread:read", { threadId, readerId: user.id });
        }
        // Mark notifications read
        const thread = threads.find(t => t.thread_id === threadId);
        if (thread) {
          fetch("/api/notifications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "mark_read_by_sender", userId: user.id, senderName: thread.other_username }),
          }).then(() => window.dispatchEvent(new Event("refreshNotifications"))).catch(() => {});
        }
      }).catch(() => setThreadLoading(false));
  };

  // Fetch reactions for a set of messages
  const fetchReactions = useCallback((messages: Message[]) => {
    if (messages.length === 0) return;
    const ids = messages.map(m => m.id).join(",");
    fetch(`/api/messages/reactions?messageIds=${ids}`)
      .then(r => r.json())
      .then(data => {
        if (data.reactions) setReactions(data.reactions);
      })
      .catch(() => {});
  }, []);

  // Toggle a reaction on a message
  const toggleReaction = (messageId: number, emoji: string) => {
    if (!user || !socketRef.current) return;
    const existing = reactions[messageId] || [];
    const alreadyReacted = existing.some(r => r.emoji === emoji && r.user_id === user.id);
    if (alreadyReacted) {
      socketRef.current.emit("reaction:remove", { messageId, emoji, userId: user.id });
      setReactions(prev => ({
        ...prev,
        [messageId]: (prev[messageId] || []).filter(r => !(r.emoji === emoji && r.user_id === user.id)),
      }));
    } else {
      socketRef.current.emit("reaction:add", { messageId, emoji, userId: user.id });
      setReactions(prev => ({
        ...prev,
        [messageId]: [...(prev[messageId] || []), { emoji, user_id: user.id }],
      }));
    }
  };

  // Voice recording helpers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (audioBlob.size === 0) return;
        // Upload voice note
        if (!user) return;
        setUploading(true);
        try {
          const fd = new FormData();
          fd.append("userId", String(user.id));
          fd.append("file", audioBlob, `voice_${Date.now()}.webm`);
          const res = await fetch("/api/messages/upload", { method: "POST", body: fd });
          const data = await res.json();
          if (data.success) {
            setPendingAttachments(prev => [...prev, { url: data.url, name: "Voice Note", size: data.size, isImage: false, isVoice: true }]);
          }
        } catch {}
        setUploading(false);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch {
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      if (data.success) setPendingAttachments(prev => [...prev, { url: data.url, name: data.name, size: data.size, isImage: data.isImage }]);
    } catch {}
    setUploading(false);
    e.target.value = "";
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
        body: JSON.stringify({ fromUserId: user.id, toUsername: thread.other_username, subject: thread.subject || "", body: msgBody, threadId: selectedThread, attachments: attachmentsJson }),
      });
      const data = await res.json();
      if (!data.error) {
        setReplyText("");
        setPendingAttachments([]);
        setThreadMessages(prev => [...prev, { id: data.messageId || Date.now(), from_user_id: user.id, to_user_id: thread.other_user_id, body: msgBody, created_at: new Date().toISOString(), is_read: 0, attachments: attachmentsJson || undefined, thread_id: selectedThread } as Message]);
        setThreads(prev => prev.map(t => t.thread_id === selectedThread ? { ...t, last_body: msgBody, last_time: new Date().toISOString() } : t));
        setTimeout(() => { chatContainerRef.current && (chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight); }, 50);
      }
    } catch {}
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
        body: JSON.stringify({ fromUserId: user.id, toUsername: toUsername.trim(), subject: subject.trim(), body: replyText.trim() }),
      });
      const data = await res.json();
      if (data.error) { setComposeMsg(data.error); }
      else {
        setComposeMsg("Sent!");
        setToUsername(""); setSubject(""); setReplyText("");
        setTimeout(() => { setShowCompose(false); setComposeMsg(""); fetchThreads(); if (data.thread_id) openThread(data.thread_id); }, 800);
      }
    } catch { setComposeMsg("Failed"); }
    setSending(false);
  };

  const deleteThread = async (threadId: string) => {
    if (!user || !confirm("Delete this entire conversation?")) return;
    const res = await fetch(`/api/messages?userId=${user.id}&threadId=${threadId}`);
    const data = await res.json();
    for (const msg of (data.messages || [])) {
      await fetch(`/api/messages/${msg.id}?userId=${user.id}`, { method: "DELETE" });
    }
    setThreads(prev => prev.filter(t => t.thread_id !== threadId));
    if (selectedThread === threadId) { setSelectedThread(null); setThreadMessages([]); setMobileShowChat(false); }
  };

  if (!user) return null;
  const selectedThreadData = threads.find(t => t.thread_id === selectedThread);
  const filteredThreads = threads.filter(t => t.other_username.toLowerCase().includes(convSearch.toLowerCase()));

  return (
    <div className="flex overflow-hidden" style={{ height: "calc(100vh - 90px)", maxWidth: "1200px", margin: "0 auto", border: "2px solid #C9B29F", borderRadius: "8px", background: "#FAF7F2" }}>
      {/* ─── Left: Thread List ─── */}
      <div className={`${mobileShowChat ? "hidden md:flex" : "flex"} flex-col w-full md:w-[340px] flex-shrink-0`}
        style={{ background: "#FAF7F2", borderRight: "2px solid #C9B29F" }}>
        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between flex-shrink-0"
          style={{ background: "#1C1C1C" }}>
          <span className="text-sm font-bold" style={{ color: "#FAF7F2", fontFamily: "var(--font-table)" }}>Messages</span>
          <div className="flex items-center gap-2">
            <button onClick={() => { setShowCompose(!showCompose); setSelectedThread(null); setMobileShowChat(false); }}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
              style={{ background: "#C9B29F", color: "#1C1C1C", fontSize: "16px" }}
              title="New Message">
              ✏️
            </button>
            <button onClick={() => { setShowGroupCreate(true); setMobileShowChat(true); setSelectedThread(null); setShowCompose(false); }}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
              style={{ background: "#C9B29F", color: "#1C1C1C", fontSize: "16px" }}
              title="Create Group">
              👥
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2" style={{ borderBottom: "2px solid #C9B29F" }}>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "#FAF7F2", border: "2px solid #C9B29F" }}>
            <span style={{ color: "#4A4A4A", fontSize: "14px" }}>🔍</span>
            <input value={convSearch} onChange={e => setConvSearch(e.target.value)}
              placeholder="Search or start new chat"
              className="flex-1 bg-transparent text-xs outline-none"
              style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }} />
          </div>
        </div>

        {/* Thread List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#C9B29F", borderTopColor: "transparent" }} />
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="text-center py-12 px-4">
              <span className="text-4xl block mb-3">💬</span>
              <p className="text-sm font-medium" style={{ color: "#1C1C1C" }}>No conversations</p>
              <p className="text-xs mt-1" style={{ color: "#4A4A4A" }}>Tap ✏️ to start a new chat</p>
            </div>
          ) : filteredThreads.map(t => {
            const isOnline = onlineUserIds.has(t.other_user_id);
            const isSelected = selectedThread === t.thread_id;
            return (
              <button key={t.thread_id} onClick={() => openThread(t.thread_id)}
                className="w-full text-left px-3 py-3 flex items-center gap-3 transition-all"
                style={{
                  background: isSelected ? "#FAF7F2" : "transparent",
                  borderBottom: "1px solid #C9B29F",
                }}>
                {/* Avatar with online dot */}
                <div className="relative flex-shrink-0">
                  <Avatar src={t.other_profile_picture} username={t.other_username} />
                  {isOnline && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                      style={{ background: "#22c55e", borderColor: "#FAFAFA" }} />
                  )}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold truncate" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>
                      {t.other_username}
                    </span>
                    <span className="text-[12px] flex-shrink-0 ml-2" style={{ color: t.unread_count > 0 ? "#C9B29F" : "#6B6B6B", fontWeight: t.unread_count > 0 ? 700 : 400 }}>
                      {formatTime(t.last_time)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-xs truncate" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)", fontWeight: t.unread_count > 0 ? 600 : 400 }}>
                      {t.last_body.substring(0, 50)}
                    </p>
                    {t.unread_count > 0 && (
                      <span className="flex-shrink-0 ml-2 w-5 h-5 rounded-full flex items-center justify-center text-[12px] font-bold"
                        style={{ background: "#C9B29F", color: "#1C1C1C" }}>
                        {t.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Right: Chat Area ─── */}
      <div className={`${mobileShowChat ? "flex" : "hidden md:flex"} flex-col flex-1`}
        style={{ background: "#FAF7F2" }}>

        {/* Create Group Chat */}
        {showGroupCreate ? (
          <div className="flex flex-col h-full">
            <div className="px-4 py-3 flex items-center gap-3 flex-shrink-0"
              style={{ background: "#1C1C1C" }}>
              <button onClick={() => { setShowGroupCreate(false); setMobileShowChat(false); }}
                className="text-lg" style={{ color: "#FAF7F2" }}>←</button>
              <span className="text-sm font-bold" style={{ color: "#FAF7F2", fontFamily: "var(--font-table)" }}>Create Group Chat</span>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4">
              <span className="text-5xl">👥</span>
              <div className="w-full max-w-sm space-y-3">
                <input value={groupName} onChange={e => setGroupName(e.target.value)}
                  placeholder="Group name..."
                  className="w-full rounded-lg px-4 py-3 text-sm outline-none"
                  style={{ background: "#FAF7F2", border: "2px solid #C9B29F", color: "#1C1C1C", fontFamily: "var(--font-table)" }} />
                <div>
                  <div className="flex gap-2">
                    <input value={groupMemberInput} onChange={e => setGroupMemberInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" && groupMemberInput.trim()) {
                          e.preventDefault();
                          if (!groupMembers.includes(groupMemberInput.trim())) {
                            setGroupMembers(prev => [...prev, groupMemberInput.trim()]);
                          }
                          setGroupMemberInput("");
                        }
                      }}
                      placeholder="Add member username..."
                      className="flex-1 rounded-lg px-4 py-3 text-sm outline-none"
                      style={{ background: "#FAF7F2", border: "2px solid #C9B29F", color: "#1C1C1C", fontFamily: "var(--font-table)" }} />
                    <button onClick={() => {
                      if (groupMemberInput.trim() && !groupMembers.includes(groupMemberInput.trim())) {
                        setGroupMembers(prev => [...prev, groupMemberInput.trim()]);
                        setGroupMemberInput("");
                      }
                    }}
                      className="px-4 py-2 rounded-lg text-sm font-bold"
                      style={{ background: "#C9B29F", color: "#1C1C1C", fontFamily: "var(--font-table)" }}>
                      Add
                    </button>
                  </div>
                  {groupMembers.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {groupMembers.map((m, i) => (
                        <span key={i} className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium"
                          style={{ background: "#FAF7F2", border: "2px solid #C9B29F", color: "#1C1C1C", fontFamily: "var(--font-table)" }}>
                          {m}
                          <button onClick={() => setGroupMembers(prev => prev.filter((_, j) => j !== i))}
                            className="ml-1 text-red-400 hover:text-red-600">✕</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={() => {
                  if (!groupName.trim() || groupMembers.length === 0 || !user || !socketRef.current) return;
                  // Resolve usernames to IDs via a quick search
                  const memberNames = groupMembers;
                  // For now, emit with usernames — server can resolve
                  socketRef.current.emit("group:create", {
                    name: groupName.trim(),
                    createdBy: user.id,
                    memberUsernames: memberNames,
                    memberIds: [], // Server will resolve from usernames
                  });
                  setGroupName("");
                  setGroupMembers([]);
                  setShowGroupCreate(false);
                  setMobileShowChat(false);
                }}
                  disabled={!groupName.trim() || groupMembers.length === 0}
                  className="w-full py-3 rounded-lg text-sm font-bold uppercase tracking-wider transition-all disabled:opacity-40"
                  style={{ background: "#1C1C1C", color: "#FAF7F2", fontFamily: "var(--font-table)" }}>
                  Create Group ({groupMembers.length} member{groupMembers.length !== 1 ? "s" : ""})
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* Compose New Message */}
        {!showGroupCreate && showCompose ? (
          <div className="flex flex-col h-full">
            <div className="px-4 py-3 flex items-center gap-3 flex-shrink-0"
              style={{ background: "#1C1C1C" }}>
              <button onClick={() => { setShowCompose(false); setMobileShowChat(false); }}
                className="text-lg" style={{ color: "#FAF7F2" }}>←</button>
              <span className="text-sm font-bold" style={{ color: "#FAF7F2", fontFamily: "var(--font-table)" }}>New Message</span>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4">
              <span className="text-5xl">✉️</span>
              <div className="w-full max-w-sm space-y-3">
                <input value={toUsername} onChange={e => setToUsername(e.target.value)}
                  placeholder="Username..."
                  className="w-full rounded-lg px-4 py-3 text-sm outline-none"
                  style={{ background: "#FAF7F2", border: "2px solid #C9B29F", color: "#1C1C1C", fontFamily: "var(--font-table)" }} />
                <input value={subject} onChange={e => setSubject(e.target.value)}
                  placeholder="Subject (optional)"
                  className="w-full rounded-lg px-4 py-3 text-sm outline-none"
                  style={{ background: "#FAF7F2", border: "2px solid #C9B29F", color: "#1C1C1C", fontFamily: "var(--font-table)" }} />
                <textarea value={replyText} onChange={e => setReplyText(e.target.value)}
                  placeholder="Write your message..."
                  rows={4}
                  className="w-full rounded-lg px-4 py-3 text-sm outline-none resize-none"
                  style={{ background: "#FAF7F2", border: "2px solid #C9B29F", color: "#1C1C1C", fontFamily: "var(--font-table)" }} />
                {composeMsg && <p className="text-xs text-center" style={{ color: composeMsg === "Sent!" ? "#22c55e" : "#ef4444" }}>{composeMsg}</p>}
                <button onClick={sendNewMessage} disabled={sending || !toUsername.trim() || !replyText.trim()}
                  className="w-full py-3 rounded-lg text-sm font-bold uppercase tracking-wider transition-all disabled:opacity-40"
                  style={{ background: "#1C1C1C", color: "#FAF7F2", fontFamily: "var(--font-table)" }}>
                  {sending ? "Sending..." : "Send Message"}
                </button>
              </div>
            </div>
          </div>
        ) : !showGroupCreate && selectedThread && selectedThreadData ? (
          <div className="flex flex-col h-full">
            {/* Chat Header */}
            <div className="px-4 py-3 flex items-center justify-between flex-shrink-0"
              style={{ background: "#1C1C1C" }}>
              <div className="flex items-center gap-3">
                <button onClick={() => { setMobileShowChat(false); setSelectedThread(null); }}
                  className="md:hidden text-lg" style={{ color: "#FAF7F2" }}>←</button>
                <a href={`/profile/${selectedThreadData.other_username}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                  <div className="relative">
                    <Avatar src={selectedThreadData.other_profile_picture} username={selectedThreadData.other_username} size="w-9 h-9" textSize="text-xs" />
                    {onlineUserIds.has(selectedThreadData.other_user_id) && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                        style={{ background: "#22c55e", borderColor: "#1C1C1C" }} />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: "#FAF7F2", fontFamily: "var(--font-table)" }}>
                      {selectedThreadData.other_username}
                    </p>
                    <p className="text-[12px]" style={{ color: "#C9B29F", fontFamily: "var(--font-table)" }}>
                      {otherUserStatus?.online ? "online" : otherUserStatus ? formatLastSeen(otherUserStatus.seconds_ago) : ""}
                    </p>
                  </div>
                </a>
              </div>
              <div className="flex items-center gap-2">
                {selectedThreadData.marketplace_ad_id && (
                  <a href={`/marketplace/${selectedThreadData.marketplace_ad_id}`}
                    className="px-3 py-1.5 rounded-lg text-[12px] font-bold uppercase"
                    style={{ background: "#C9B29F", color: "#1C1C1C", fontFamily: "var(--font-table)" }}>
                    View Listing
                  </a>
                )}
                <button onClick={() => deleteThread(selectedThread)}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
                  style={{ color: "#FAF7F2", fontSize: "14px" }}>
                  🗑️
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
              style={{ background: "#FAF7F2" }}>
              {threadLoading ? (
                <div className="flex justify-center py-16">
                  <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: "#C9B29F", borderTopColor: "transparent" }} />
                </div>
              ) : threadMessages.map((msg, idx) => {
                const isMine = msg.from_user_id === user.id;
                const showDate = shouldShowDate(threadMessages, idx);
                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div className="flex justify-center my-3">
                        <span className="px-3 py-1 rounded-lg text-[12px] font-medium"
                          style={{ background: "#FAF7F2", color: "#4A4A4A", border: "1px solid #EDE4D5", fontFamily: "var(--font-table)" }}>
                          {formatDateSeparator(msg.created_at)}
                        </span>
                      </div>
                    )}
                    <div className={`flex ${isMine ? "justify-end" : "justify-start"} mb-1`}>
                      <div className="max-w-[75%]"
                        onContextMenu={(e) => { e.preventDefault(); setReactionPickerMsgId(msg.id); }}
                        onTouchStart={() => { longPressTimer.current = setTimeout(() => setReactionPickerMsgId(msg.id), 500); }}
                        onTouchEnd={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
                        onTouchMove={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
                        style={{ position: "relative" }}>
                        <div className="rounded-2xl px-3.5 py-2"
                          style={{
                            background: isMine ? "#C9B29F" : "#FAFAFA",
                            borderRadius: isMine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                          }}>
                          <p className="text-[13px] leading-relaxed" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)", wordBreak: "break-word" }}>
                            {msg.body}
                          </p>
                          {/* Attachments */}
                          {msg.attachments && msg.attachments !== "" && (() => {
                            try {
                              const atts = JSON.parse(msg.attachments);
                              return (
                                <div className="mt-1.5 space-y-1">
                                  {atts.map((att: { url: string; name: string; size: number; isImage: boolean; isVoice?: boolean }, i: number) => {
                                    const isVoice = att.isVoice || (att.name && att.name.toLowerCase().includes("voice")) || (att.url && (att.url.endsWith(".webm") || att.url.endsWith(".ogg")));
                                    if (att.isImage) {
                                      return (
                                        <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" className="block">
                                          <img src={att.url} alt={att.name} className="max-w-full rounded-lg max-h-52 object-cover" />
                                        </a>
                                      );
                                    }
                                    if (isVoice) {
                                      return (
                                        <div key={i} className="flex items-center gap-2 px-2.5 py-2 rounded-lg"
                                          style={{ background: isMine ? "rgba(0,0,0,0.08)" : "#FAF7F2", minWidth: "180px" }}>
                                          <audio controls preload="metadata" style={{ height: "32px", width: "100%" }}>
                                            <source src={att.url} type="audio/webm" />
                                            <source src={att.url} type="audio/ogg" />
                                          </audio>
                                        </div>
                                      );
                                    }
                                    return (
                                      <a key={i} href={att.url} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs hover:opacity-80"
                                        style={{ background: isMine ? "rgba(0,0,0,0.08)" : "#FAF7F2", color: "#1C1C1C", fontFamily: "var(--font-table)" }}>
                                        📎 <span className="truncate">{att.name}</span>
                                        <span className="text-[12px] flex-shrink-0" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>{formatFileSize(att.size)}</span>
                                      </a>
                                    );
                                  })}
                                </div>
                              );
                            } catch { return null; }
                          })()}
                        </div>
                        {/* Reaction picker on hover */}
                        {reactionPickerMsgId === msg.id && (
                          <div className="absolute" onClick={(e) => e.stopPropagation()}
                            style={{
                              [isMine ? "right" : "left"]: 0,
                              bottom: "-36px",
                              zIndex: 20,
                            }}>
                            {/* Quick reaction bar */}
                            <div className="flex items-center gap-1"
                              style={{
                                background: "#FAFAFA",
                                border: "2px solid #C9B29F",
                                borderRadius: "8px",
                                padding: "4px 8px",
                              }}>
                              {["👍", "❤️", "😂", "😮", "😢", "🔥"].map(em => (
                                <button key={em} onClick={() => { toggleReaction(msg.id, em); setReactionPickerMsgId(null); setEmojiPanelOpen(false); }}
                                  className="hover:scale-130 transition-transform"
                                  style={{ fontSize: "18px", padding: "2px 4px", lineHeight: 1, background: "none", border: "none", cursor: "pointer" }}>
                                  {em}
                                </button>
                              ))}
                              <button onClick={() => setEmojiPanelOpen(prev => !prev)}
                                className="hover:scale-110 transition-transform"
                                style={{ fontSize: "16px", padding: "2px 6px", lineHeight: 1, background: "none", border: "2px solid #C9B29F", borderRadius: "50%", cursor: "pointer", color: "#4A4A4A", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                +
                              </button>
                            </div>
                            {/* Full emoji panel */}
                            {emojiPanelOpen && (
                              <div style={{
                                position: "absolute",
                                [isMine ? "right" : "left"]: 0,
                                top: "40px",
                                width: "280px",
                                maxHeight: "300px",
                                overflowY: "auto",
                                background: "#FAFAFA",
                                border: "2px solid #C9B29F",
                                borderRadius: "8px",
                                padding: "8px",
                              }}>
                                {EMOJI_CATEGORIES.map(cat => (
                                  <div key={cat.name} className="mb-2">
                                    <div style={{ fontSize: "12px", fontWeight: 600, color: "#4A4A4A", textTransform: "uppercase", letterSpacing: "0.05em", padding: "4px 2px", fontFamily: "var(--font-body)" }}>{cat.name}</div>
                                    <div className="flex flex-wrap">
                                      {cat.emojis.map(em => (
                                        <button key={em} onClick={() => { toggleReaction(msg.id, em); setReactionPickerMsgId(null); setEmojiPanelOpen(false); }}
                                          className="hover:bg-[#EDE4D5] transition-colors"
                                          style={{ fontSize: "20px", padding: "3px", lineHeight: 1, background: "none", border: "none", cursor: "pointer", borderRadius: "8px" }}>
                                          {em}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        {/* Reactions display */}
                        {reactions[msg.id] && reactions[msg.id].length > 0 && (() => {
                          const grouped: Record<string, number[]> = {};
                          for (const r of reactions[msg.id]) {
                            if (!grouped[r.emoji]) grouped[r.emoji] = [];
                            grouped[r.emoji].push(r.user_id);
                          }
                          return (
                            <div className={`flex flex-wrap gap-1 mt-0.5 ${isMine ? "justify-end" : "justify-start"}`}>
                              {Object.entries(grouped).map(([emoji, userIds]) => {
                                const iReacted = user ? userIds.includes(user.id) : false;
                                return (
                                  <button key={emoji} onClick={() => toggleReaction(msg.id, emoji)}
                                    className="flex items-center gap-1 px-2 py-1 transition-all hover:scale-105"
                                    style={{
                                      background: iReacted ? "#EDE4D5" : "#FAF7F2",
                                      border: iReacted ? "2px solid #C9B29F" : "1px solid #C9B29F",
                                      borderRadius: "8px",
                                      fontSize: "14px",
                                      fontFamily: "var(--font-table)",
                                      color: "#1C1C1C",
                                      cursor: "pointer",
                                    }}>
                                    <span>{emoji}</span>
                                    <span style={{ fontSize: "12px", fontWeight: 600 }}>{userIds.length}</span>
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })()}
                        {/* Time + Read receipt */}
                        <div className={`flex items-center gap-1 mt-0.5 px-1 ${isMine ? "justify-end" : ""}`}>
                          <span className="text-[12px]" style={{ color: "#4A4A4A" }}>{formatFullTime(msg.created_at)}</span>
                          {isMine && (
                            <span style={{ color: msg.is_read ? "#1d5bbf" : "#6B6B6B", fontSize: "12px" }}>
                              {msg.is_read ? "✓✓" : "✓"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {/* Typing indicator */}
              {typingUserId && selectedThreadData && typingUserId === selectedThreadData.other_user_id && (
                <div className="flex justify-start mb-1">
                  <div className="rounded-2xl px-4 py-2" style={{ background: "#FAFAFA", borderRadius: "18px 18px 18px 4px" }}>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: "#C9B29F", animationDelay: "0ms" }} />
                      <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: "#C9B29F", animationDelay: "150ms" }} />
                      <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: "#C9B29F", animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Bar */}
            <div className="px-3 py-2.5 flex-shrink-0" style={{ background: "#FAF7F2", borderTop: "2px solid #C9B29F" }}>
              {/* Pending attachments */}
              {pendingAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {pendingAttachments.map((att, i) => (
                    <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[12px]"
                      style={{ background: "#FAF7F2", border: "1px solid #C9B29F" }}>
                      {att.isImage ? <img src={att.url} alt="" className="w-8 h-8 rounded object-cover" /> : (att as { isVoice?: boolean }).isVoice ? <span>🎤</span> : <span>📎</span>}
                      <span className="truncate max-w-[80px]" style={{ color: "#1C1C1C" }}>{att.name}</span>
                      <button onClick={() => setPendingAttachments(prev => prev.filter((_, j) => j !== i))} className="text-red-400">✕</button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-end gap-2">
                <button onClick={() => imageInputRef.current?.click()} disabled={uploading}
                  className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110"
                  style={{ background: "#FAF7F2", border: "2px solid #C9B29F" }}>
                  {uploading ? <span className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#C9B29F", borderTopColor: "transparent" }} /> : <span className="text-base">📎</span>}
                </button>
                <input ref={imageInputRef} type="file" className="hidden" accept="image/*,.pdf,.doc,.docx,.txt,.zip" onChange={handleFileUpload} />
                <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.txt,.zip" onChange={handleFileUpload} />
                {/* Microphone / Voice Note button */}
                <button onClick={isRecording ? stopRecording : startRecording} disabled={uploading}
                  className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110"
                  style={{
                    background: isRecording ? "#ef4444" : "#FAF7F2",
                    border: isRecording ? "2px solid #ef4444" : "2px solid #C9B29F",
                    color: isRecording ? "#FAFAFA" : "#1C1C1C",
                  }}>
                  {isRecording ? <span className="text-xs font-bold" style={{ fontFamily: "var(--font-table)" }}>{formatRecordingTime(recordingTime)}</span> : <span className="text-base">🎤</span>}
                </button>
                <textarea
                  value={replyText}
                  onChange={e => {
                    setReplyText(e.target.value);
                    // Emit typing indicator
                    if (socketRef.current && selectedThreadData) {
                      socketRef.current.emit("typing:start", { fromUserId: user.id, toUserId: selectedThreadData.other_user_id });
                      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                      typingTimeoutRef.current = setTimeout(() => {
                        socketRef.current?.emit("typing:stop", { fromUserId: user.id, toUserId: selectedThreadData.other_user_id });
                      }, 3000);
                    }
                  }}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                  placeholder="Type a message..."
                  rows={1}
                  className="flex-1 rounded-lg px-4 py-2.5 text-sm outline-none resize-none"
                  style={{ background: "#FAF7F2", border: "2px solid #C9B29F", color: "#1C1C1C", fontFamily: "var(--font-table)", minHeight: "40px", maxHeight: "120px", overflowY: "auto" }}
                  onInput={(e) => { const t = e.target as HTMLTextAreaElement; t.style.height = "40px"; t.style.height = Math.min(t.scrollHeight, 120) + "px"; }}
                />
                <button onClick={sendReply} disabled={sending || (!replyText.trim() && pendingAttachments.length === 0)}
                  className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110 disabled:opacity-40"
                  style={{ background: "#C9B29F", color: "#1C1C1C" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center h-full gap-3" >
            <span className="text-6xl opacity-30">💬</span>
            <p className="text-lg font-medium" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>Pedigree Platform Messenger</p>
            <p className="text-xs" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>Select a conversation or start a new one</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: "#EDE4D5" }} />}>
      <MessagesContent />
    </Suspense>
  );
}
