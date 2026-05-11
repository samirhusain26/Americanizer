"use client";

import { useDrag } from "@use-gesture/react";
import { useCallback, useRef, useState } from "react";
import { clickHaptic, getMuted, toggleMute } from "@/lib/haptics";
import { type StepConfig } from "@/lib/units";

const DEFAULT_STEPS: StepConfig = { slow: 0.1, medium: 1, fast: 10, turbo: 100 };

interface ScrubDialProps {
  value: number;
  onDelta: (delta: number) => void;
  onReset?: () => void;
  stepConfig?: StepConfig;
  size?: number; // unused — kept for API compat
}

function stepFromVelocity(vAbs: number, cfg: StepConfig): number {
  if (vAbs < 0.4) return cfg.slow;
  if (vAbs < 1.4) return cfg.medium;
  if (vAbs < 3.0) return cfg.fast;
  return cfg.turbo;
}

/**
 * Invisible horizontal trackpad. The entire zone is draggable;
 * all physics (detents, velocity tiers, haptics) are preserved.
 */
export default function ScrubDial({ value: _value, onDelta, onReset, stepConfig = DEFAULT_STEPS, size: _size = 200 }: ScrubDialProps) {
  const PX_PER_DETENT = 12;

  const lastDetentBucket = useRef(0);
  const wheelAccum = useRef(0);
  const wheelLastTs = useRef(0);
  const lastTapTs = useRef(0);
  const [isMuted, setIsMuted] = useState(getMuted);

  const emitDetents = useCallback(
    (detents: number, v: number) => {
      const step = stepFromVelocity(v, stepConfig);
      const sign = detents > 0 ? 1 : -1;
      onDelta(sign * Math.abs(detents) * step);
      clickHaptic(Math.min(1, 0.3 + v * 0.3));
    },
    [onDelta, stepConfig]
  );

  // Slide mode: up/right increases (mx − my), same detent pitch as before
  const bind = useDrag(
    ({ first, movement: [mx, my], velocity: [vx, vy] }) => {
      if (first) {
        lastDetentBucket.current = 0;
        return;
      }
      const v = Math.max(Math.abs(vx), Math.abs(vy));
      const linear = mx - my;
      const bucket = Math.trunc(linear / PX_PER_DETENT);
      if (bucket !== lastDetentBucket.current) {
        const detents = bucket - lastDetentBucket.current;
        lastDetentBucket.current = bucket;
        emitDetents(detents, v);
      }
    },
    { axis: undefined, filterTaps: true, pointer: { capture: true } }
  );

  const onWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      e.preventDefault();
      const delta = -e.deltaY;
      wheelAccum.current += delta;
      const now = performance.now();
      const dt = Math.max(1, now - (wheelLastTs.current || now));
      wheelLastTs.current = now;
      const vel = Math.abs(delta) / dt;
      while (Math.abs(wheelAccum.current) >= PX_PER_DETENT) {
        const sign = wheelAccum.current > 0 ? 1 : -1;
        wheelAccum.current -= sign * PX_PER_DETENT;
        onDelta(sign * stepFromVelocity(vel, stepConfig));
        clickHaptic(Math.min(1, 0.3 + vel * 0.3));
      }
    },
    [onDelta]
  );

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center select-none">
      {/* Ultra-thin rule */}
      <div
        style={{
          width: "68%",
          height: 1,
          background: "var(--color-ink-muted)",
          opacity: 0.22,
        }}
      />

      {/* Gesture hint */}
      <p
        style={{
          marginTop: 16,
          fontSize: 9,
          letterSpacing: "0.24em",
          textTransform: "uppercase",
          color: "var(--color-ink-muted)",
          opacity: 0.55,
          fontWeight: 500,
          userSelect: "none",
        }}
      >
        Swipe or scroll to adjust
      </p>

      {/* Full-area capture layer — sits above content, below mute button */}
      <div
        {...bind()}
        onWheel={onWheel}
        onClick={() => {
          const now = Date.now();
          if (now - lastTapTs.current < 300) {
            onReset?.();
            lastTapTs.current = 0;
          } else {
            lastTapTs.current = now;
          }
        }}
        style={{
          position: "absolute",
          inset: 0,
          cursor: "ew-resize",
          touchAction: "pan-y",
          zIndex: 10,
        }}
      />

      {/* Mute button — above capture layer */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleMute();
          setIsMuted(getMuted());
        }}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label={isMuted ? "Unmute clicks" : "Mute clicks"}
        style={{
          position: "absolute",
          right: 20,
          bottom: 20,
          width: 30,
          height: 30,
          borderRadius: "50%",
          border: "none",
          background: "transparent",
          color: "var(--color-ink-muted)",
          cursor: "pointer",
          zIndex: 20,
          opacity: isMuted ? 0.25 : 0.45,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
          transition: "opacity 0.2s ease",
        }}
      >
        {isMuted ? (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M11 5L6 9H2v6h4l5 4V5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M11 5L6 9H2v6h4l5 4V5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
    </div>
  );
}
