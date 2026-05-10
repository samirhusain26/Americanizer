"use client";

import { useDrag } from "@use-gesture/react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { useCallback, useMemo, useRef } from "react";
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

/**
 * 2D skeuomorphic knurled knob: stacked radial/conic gradients compose a
 * metal-rimmed dial with a recessed cap, indicator dot, and subtle shading.
 */
export default function ScrubDial({ value, onDelta, size = 260 }: ScrubDialProps) {
  const lastDetentBucket = useRef(0);
  const PX_PER_DETENT = 12;
  const wheelAccum = useRef(0);
  const wheelLastTs = useRef(0);

  const jolt = useMotionValue(0);
  const rotation = useMotionValue(0);

  const tickJolt = useCallback(() => {
    jolt.set(1);
    requestAnimationFrame(() => jolt.set(0));
  }, [jolt]);

  const bind = useDrag(
    ({ first, movement: [mx, my], velocity: [vx, vy] }) => {
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
        rotation.set(rotation.get() + sign * (Math.PI / 10));
        tickJolt();
        clickHaptic(Math.min(1, 0.3 + v * 0.3));
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
        const step = stepFromVelocity(vel);
        onDelta(sign * step);
        rotation.set(rotation.get() + sign * (Math.PI / 10));
        tickJolt();
        clickHaptic(Math.min(1, 0.3 + vel * 0.3));
      }
    },
    [onDelta, rotation, tickJolt]
  );

  // Value-driven resting rotation blends with drag rotation.
  const restRad = ((value % 36) / 36) * Math.PI * 2;
  const totalRot = useTransform(rotation, (r) => r + restRad);
  const rotDeg = useTransform(totalRot, (r) => (r * 180) / Math.PI);
  const joltCssY = useTransform(jolt, [0, 1], [0, -1]);

  // Knurled rim: crisp alternating dark/light radial teeth
  const knurlBg = useMemo(
    () =>
      "repeating-conic-gradient(from 0deg," +
      "#1a1a14 0deg 3deg," +
      "#6a6a60 3deg 4deg," +
      "#2a2a22 4deg 6deg)",
    []
  );

  return (
    <div className="flex items-center justify-center select-none">
      <motion.div
        className="relative touch-none cursor-grab active:cursor-grabbing"
        style={{
          width: size,
          height: size,
          y: joltCssY,
        }}
      >
        {/* Drop shadow plate */}
        <div
          aria-hidden
          className="absolute rounded-full"
          style={{
            left: 4,
            top: 12,
            width: size,
            height: size,
            background: "rgba(20,20,15,0.28)",
            filter: "blur(14px)",
          }}
        />

        {/* Rotating outer knurled rim */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            rotate: rotDeg,
            background: knurlBg,
            boxShadow:
              "inset 0 2px 3px rgba(255,255,255,0.35)," +
              "inset 0 -3px 6px rgba(0,0,0,0.55)",
          }}
        />

        {/* Outer bezel outline + radial shading (non-rotating) */}
        <div
          aria-hidden
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            border: "1.5px solid var(--color-ink)",
            boxShadow:
              "0 6px 0 #14140f," +
              "0 10px 22px rgba(0,0,0,0.22)",
            background:
              "radial-gradient(circle at 50% 30%," +
              " rgba(255,255,255,0.35) 0%," +
              " rgba(255,255,255,0) 45%)," +
              "radial-gradient(circle at 50% 85%," +
              " rgba(0,0,0,0.35) 0%," +
              " rgba(0,0,0,0) 40%)",
          }}
        />

        {/* Inner recessed ring (divides rim from cap) */}
        <div
          aria-hidden
          className="absolute rounded-full pointer-events-none"
          style={{
            inset: "13%",
            background: "#14140f",
            boxShadow:
              "inset 0 2px 3px rgba(0,0,0,0.8)," +
              "inset 0 -1px 0 rgba(255,255,255,0.08)",
          }}
        />

        {/* Inset cap (non-rotating face) */}
        <div
          aria-hidden
          className="absolute rounded-full pointer-events-none"
          style={{
            inset: "15%",
            background:
              "radial-gradient(circle at 35% 28%," +
              " #fafaf6 0%," +
              " #ecebe4 22%," +
              " #cfcec6 60%," +
              " #a9a89f 100%)",
            boxShadow:
              "inset 0 4px 6px rgba(255,255,255,0.85)," +
              "inset 0 -10px 16px rgba(0,0,0,0.3)",
            border: "1px solid rgba(20,20,15,0.5)",
          }}
        />

        {/* Rotating indicator line on cap */}
        <motion.div
          className="absolute pointer-events-none"
          style={{
            inset: "15%",
            rotate: rotDeg,
          }}
          aria-hidden
        >
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "6%",
              width: 4,
              height: "22%",
              transform: "translateX(-50%)",
              background: "var(--color-orange)",
              borderRadius: 2,
              border: "1px solid var(--color-ink)",
              boxShadow: "0 1px 0 rgba(255,255,255,0.4)",
            }}
          />
        </motion.div>

        {/* Center dimple */}
        <div
          aria-hidden
          className="absolute rounded-full pointer-events-none"
          style={{
            left: "50%",
            top: "50%",
            width: "22%",
            height: "22%",
            transform: "translate(-50%,-50%)",
            background:
              "radial-gradient(circle at 50% 65%," +
              " #b8b7af 0%," +
              " #d6d5cd 55%," +
              " #eceae3 100%)",
            boxShadow:
              "inset 0 3px 4px rgba(0,0,0,0.45)," +
              "inset 0 -1px 2px rgba(255,255,255,0.7)," +
              "0 1px 0 rgba(255,255,255,0.5)",
            border: "1px solid rgba(20,20,15,0.4)",
          }}
        />

        {/* Top gloss highlight on cap */}
        <div
          aria-hidden
          className="absolute rounded-full pointer-events-none"
          style={{
            inset: "17%",
            background:
              "radial-gradient(ellipse 65% 28% at 50% 12%," +
              " rgba(255,255,255,0.8) 0%," +
              " rgba(255,255,255,0) 75%)",
          }}
        />

        {/* Drag + wheel capture layer (on top) */}
        <div
          {...bind()}
          onWheel={onWheel}
          className="absolute inset-0 z-20 rounded-full"
        />
      </motion.div>
    </div>
  );
}
