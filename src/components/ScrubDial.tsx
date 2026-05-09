"use client";

import { useDrag } from "@use-gesture/react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { useCallback, useRef } from "react";
import { clickHaptic } from "@/lib/haptics";

interface ScrubDialProps {
  /** Current numeric value (display only — drives the indicator angle). */
  value: number;
  /** Called with a delta to apply: parent owns truth, applies via store. */
  onDelta: (delta: number) => void;
  /** Optional minimum value (used to compute velocity step floor). */
  min?: number;
  /** Visual diameter (px). */
  size?: number;
}

/**
 * Velocity-tiered step.
 * Slow scrub  → 0.1
 * Medium      → 1
 * Fast flick  → 10
 * Hard flick  → 100
 *
 * Velocity is in px/ms (use-gesture units). Empirical thresholds.
 */
function stepFromVelocity(vAbs: number): number {
  if (vAbs < 0.4) return 0.1;
  if (vAbs < 1.4) return 1;
  if (vAbs < 3.0) return 10;
  return 100;
}

export default function ScrubDial({ value, onDelta, size = 220 }: ScrubDialProps) {
  // Cumulative pixel travel since drag-start, used to throttle detents to a fixed pixel pitch.
  const accumPx = useRef(0);
  const lastDetentBucket = useRef(0);
  // 12 px per detent feels right for a knob this size.
  const PX_PER_DETENT = 12;

  // Indicator rotation: each unit of value rotates the indicator ~6deg, but we wrap visually.
  const rotation = useMotionValue(0);
  const jolt = useMotionValue(0); // 1px rim jolt per detent

  const tickJolt = useCallback(() => {
    jolt.set(1);
    requestAnimationFrame(() => jolt.set(0));
  }, [jolt]);

  const bind = useDrag(
    ({ first, last, movement: [mx, my], velocity: [vx, vy], direction: [dx] }) => {
      if (first) {
        accumPx.current = 0;
        lastDetentBucket.current = 0;
      }

      // Combine horizontal + vertical pointer travel; up/right = increase.
      const linear = mx - my;
      accumPx.current = linear;
      const bucket = Math.trunc(linear / PX_PER_DETENT);

      if (bucket !== lastDetentBucket.current) {
        const detents = bucket - lastDetentBucket.current;
        lastDetentBucket.current = bucket;

        const v = Math.max(Math.abs(vx), Math.abs(vy));
        const step = stepFromVelocity(v);
        const sign = detents > 0 ? 1 : -1;
        const magnitude = Math.abs(detents) * step;

        onDelta(sign * magnitude);
        rotation.set(rotation.get() + sign * 18); // visual feedback
        tickJolt();
        clickHaptic(Math.min(1, 0.3 + v * 0.3));
      }

      if (last) {
        // Snap rotation back near the resting indicator angle for the value.
        // The actual indicator angle is computed off `value` below.
        rotation.set(0);
      }
      // suppress unused
      void dx;
    },
    { axis: undefined, filterTaps: true, pointer: { capture: true } }
  );

  // Resting indicator angle: a non-linear wrap so the knob feels infinite.
  // Map fractional part of value to 0..360 deg.
  const restAngle = ((value % 36) / 36) * 360;
  const rotateY = useTransform(jolt, [0, 1], [0, -1]);

  return (
    <div className="flex items-center justify-center select-none">
      <motion.div
        className="relative touch-none cursor-grab active:cursor-grabbing"
        style={{ width: size, height: size, y: rotateY }}
      >
        <div {...bind()} className="absolute inset-0 z-10 rounded-full" />
        {/* Outer ring */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 30% 25%, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 55%), radial-gradient(circle at 70% 80%, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 60%), #1b1a16",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(0,0,0,0.6), 0 24px 60px -20px rgba(0,0,0,0.7)",
          }}
        />

        {/* Tick ring */}
        <svg viewBox="-50 -50 100 100" className="absolute inset-0 w-full h-full text-paper/35">
          {Array.from({ length: 60 }).map((_, i) => {
            const angle = (i / 60) * Math.PI * 2;
            const r1 = 44;
            const r2 = i % 5 === 0 ? 39 : 41.5;
            const x1 = Math.cos(angle) * r1;
            const y1 = Math.sin(angle) * r1;
            const x2 = Math.cos(angle) * r2;
            const y2 = Math.sin(angle) * r2;
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="currentColor"
                strokeWidth={i % 5 === 0 ? 0.8 : 0.4}
                strokeLinecap="round"
              />
            );
          })}
        </svg>

        {/* Inner knurled disc + indicator */}
        <motion.div
          className="absolute inset-[10%] rounded-full"
          style={{
            background:
              "conic-gradient(from 0deg, #1f1d18, #2a2823, #1f1d18, #2a2823, #1f1d18, #2a2823, #1f1d18)",
            rotate: restAngle,
          }}
        >
          {/* Indicator notch */}
          <div
            className="absolute left-1/2 -translate-x-1/2 top-2 w-1.5 h-6 rounded-full"
            style={{ background: "var(--color-accent)" }}
          />
          {/* Center hub */}
          <div className="absolute inset-[28%] rounded-full bg-[#16140f] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]" />
        </motion.div>
      </motion.div>
    </div>
  );
}
