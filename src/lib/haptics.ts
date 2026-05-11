"use client";

/**
 * Pseudo-haptics: a sharp, short audio click via Web Audio API.
 * Abstracted so a native Capacitor haptic plugin can replace it later.
 */
let ctx: AudioContext | null = null;
let muted = false;

export function toggleMute(): void {
  muted = !muted;
  if (!muted) clickHaptic(1);
}

export function getMuted(): boolean {
  return muted;
}

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
      ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

export function clickHaptic(intensity: number = 1): void {
  const c = getCtx();
  if (!c || muted) return;
  if (c.state === "suspended") c.resume();
  const t = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(2200, t);
  osc.frequency.exponentialRampToValueAtTime(900, t + 0.012);
  const peak = Math.min(0.06, 0.02 + intensity * 0.02);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(peak, t + 0.001);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.025);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + 0.03);
}
