// Notification sound utilities using Web Audio API
// No external sound files needed — all tones generated programmatically

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (_e) {
      return null;
    }
  }
  return audioCtx;
}

function isMuted(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem("soundMuted") === "true";
}

/**
 * Bell notification chime — soft ding for navbar bell notifications.
 * Two sine wave tones at 800Hz and 1000Hz, 150ms duration, gentle fade.
 */
export function playNotifChime(): void {
  if (isMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const duration = 0.15;

  // First tone — 800Hz
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = "sine";
  osc1.frequency.value = 800;
  gain1.gain.setValueAtTime(0.15, now);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start(now);
  osc1.stop(now + duration);

  // Second tone — 1000Hz, layered
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = "sine";
  osc2.frequency.value = 1000;
  gain2.gain.setValueAtTime(0.12, now);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(now);
  osc2.stop(now + duration);
}

/**
 * New message pop — quick double pop for new messages when not on the messages page.
 * Two pops at 600Hz, 50ms each with 80ms gap.
 */
export function playMessagePop(): void {
  if (isMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // First pop
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = "sine";
  osc1.frequency.value = 600;
  gain1.gain.setValueAtTime(0.18, now);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start(now);
  osc1.stop(now + 0.05);

  // Second pop — after 80ms gap
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = "sine";
  osc2.frequency.value = 600;
  gain2.gain.setValueAtTime(0.18, now + 0.13);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(now + 0.13);
  osc2.stop(now + 0.18);
}

/**
 * Chat bubble sound — subtle rising tone for messages in an active conversation.
 * Rising tone from 400Hz to 600Hz, 100ms, soft.
 */
export function playChatBubble(): void {
  if (isMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const duration = 0.1;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(400, now);
  osc.frequency.linearRampToValueAtTime(600, now + duration);
  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration);
}
