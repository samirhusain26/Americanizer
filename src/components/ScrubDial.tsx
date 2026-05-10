"use client";

import { useDrag } from "@use-gesture/react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { useCallback, useRef } from "react";
import { clickHaptic } from "@/lib/haptics";

interface ScrubDialProps {
  value: number;
  onDelta: (delta: number) => void;
  size?: number;
}

function stepFromVelocity(vAbs: number): number {
  if (vAbs < 0.4) return 0.1;
  if (vAbs < 1.4) return 1;
  if (vAbs < 3.0) return 10;
  return 100;
}

export default function ScrubDial({ value, onDelta, size = 240 }: ScrubDialProps) {
  const lastDetentBucket = useRef(0);
  const PX_PER_DETENT = 12;

  const jolt = useMotionValue(0);
  const rotation = useMotionValue(0);

  const tickJolt = useCallback(() => {
    jolt.set(1);
    requestAnimationFrame(() => jolt.set(0));
  }, [jolt]);

  const bind = useDrag(
    ({ first, last, movement: [mx, my], velocity: [vx, vy] }) => {
      if (first) lastDetentBucket.current = 0;

      const linear = mx - my;
      const bucket = Math.trunc(linear / PX_PER_DETENT);

      if (bucket !== lastDetentBucket.current) {
        const detents = bucket - lastDetentBucket.current;
        lastDetentBucket.current = bucket;

        const v = Math.max(Math.abs(vx), Math.abs(vy));
        const step = stepFromVelocity(v);
        const sign = detents > 0 ? 1 : -1;
        onDelta(sign * Math.abs(detents) * step);
        rotation.set(rotation.get() + sign * 18);
        tickJolt();
        clickHaptic(Math.min(1, 0.3 + v * 0.3));
      }
      if (last) rotation.set(0);
    },
    { axis: undefined, filterTaps: true, pointer: { capture: true } }
  );

  const restAngle = ((value % 36) / 36) * 360;
  const joltY = useTransform(jolt, [0, 1], [0, -1]);

  const half = size / 2;

  return (
    <div className="flex items-center justify-center select-none">
      <motion.div
        className="relative touch-none cursor-grab active:cursor-grabbing"
        style={{ width: size, height: size, y: joltY }}
      >
        {/* Drag surface */}
        <div {...bind()} className="absolute inset-0 z-20 rounded-full" />

        {/* Hard drop shadow (offset, no blur) */}
        <div
          className="absolute rounded-full bg-ink"
          style={{
            inset: 0,
            transform: "translate(6px, 6px)",
            background: "var(--color-ink)",
          }}
        />

        {/* Outer bezel — chunky white ring */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: "var(--color-shell)",
            border: "1.5px solid var(--color-ink)",
          }}
        />

        {/* Knurled ring */}
        <div
          className="absolute rounded-full knurl"
          style={{
            inset: "6%",
            border: "1.5px solid var(--color-ink)",
            maskImage:
              "radial-gradient(circle, transparent 58%, #000 58.5%, #000 100%)",
            WebkitMaskImage:
              "radial-gradient(circle, transparent 58%, #000 58.5%, #000 100%)",
          }}
        />

        {/* Tick marks on inner chassis */}
        <svg
          viewBox={`-${half} -${half} ${size} ${size}`}
          className="absolute inset-0 w-full h-full pointer-events-none"
        >
          {Array.from({ length: 48 }).map((_, i) => {
            const angle = (i / 48) * Math.PI * 2 - Math.PI / 2;
            const major = i % 4 === 0;
            const r1 = half * 0.58;
            const r2 = half * (major ? 0.50 : 0.54);
            const x1 = Math.cos(angle) * r1;
            const y1 = Math.sin(angle) * r1;
            const x2 = Math.cos(angle) * r2;
            const y2 = Math.sin(angle) * r2;
            return (
              <line
                key={i}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="var(--color-ink)"
                strokeWidth={major ? 1.5 : 0.8}
                strokeLinecap="square"
              />
            );
          })}
        </svg>

        {/* Inner rotating disc — off-white face */}
        <motion.div
          className="absolute rounded-full"
          style={{
            inset: "20%",
            background: "var(--color-shell-2)",
            border: "1.5px solid var(--color-ink)",
            rotate: restAngle,
            boxShadow: "inset 0 2px 0 rgba(255,255,255,0.6), inset 0 -2px 0 rgba(0,0,0,0.08)",
          }}
        >
          {/* Orange indicator dot (TE signature) */}
          <div
            className="absolute"
            style={{
              left: "50%",
              top: "8%",
              width: 14,
              height: 14,
              transform: "translateX(-50%)",
              borderRadius: 999,
              background: "var(--color-orange)",
              border: "1.5px solid var(--color-ink)",
            }}
          />
          {/* Center hub */}
          <div
            className="absolute rounded-full"
            style={{
              inset: "32%",
              background: "var(--color-shell-3)",
              border: "1.5px solid var(--color-ink)",
            }}
          />
        </motion.div>
      </motion.div>
    </div>
  );
}
