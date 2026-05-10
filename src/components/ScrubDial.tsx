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

  // Precompute knurl tick count CSS for the rim
  const knurlBg = useMemo(
    () =>
      "repeating-conic-gradient(from 0deg," +
      "rgba(20,20,15,0.55) 0deg 1.1deg," +
      "rgba(255,255,255,0.65) 1.1deg 2.2deg)",
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
            left: 6,
            top: 10,
            width: size,
            height: size,
            background: "rgba(20,20,15,0.18)",
            filter: "blur(10px)",
          }}
        />

        {/* Outer bezel (metal rim with knurl) */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: knurlBg,
            border: "1.5px solid var(--color-ink)",
            boxShadow:
              "inset 0 2px 2px rgba(255,255,255,0.7)," +
              "inset 0 -3px 3px rgba(0,0,0,0.35)," +
              "0 4px 0 #14140f",
          }}
        />

        {/* Rotating layer (knurl shimmer + indicator) */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            rotate: rotDeg,
            background:
              "conic-gradient(from 0deg," +
              "rgba(255,255,255,0.0) 0deg," +
              "rgba(255,255,255,0.25) 40deg," +
              "rgba(0,0,0,0.15) 90deg," +
              "rgba(255,255,255,0.0) 180deg," +
              "rgba(255,255,255,0.25) 220deg," +
              "rgba(0,0,0,0.15) 270deg," +
              "rgba(255,255,255,0.0) 360deg)",
            mixBlendMode: "overlay",
          }}
        >
          {/* Indicator pip (travels with rotation, sits at 12 o'clock base) */}
          <div
            aria-hidden
            className="absolute rounded-full"
            style={{
              left: "50%",
              top: "8%",
              width: 14,
              height: 14,
              transform: "translateX(-50%)",
              background: "var(--color-orange)",
              border: "1.5px solid var(--color-ink)",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.55)," +
                "inset 0 -2px 2px rgba(0,0,0,0.35)",
            }}
          />
        </motion.div>

        {/* Inset cap (non-rotating face) */}
        <div
          className="absolute rounded-full"
          style={{
            inset: "16%",
            background:
              "radial-gradient(circle at 35% 30%," +
              " #ffffff 0%," +
              " #efeee8 18%," +
              " #d8d7d1 55%," +
              " #bdbcb4 100%)",
            boxShadow:
              "inset 0 3px 4px rgba(255,255,255,0.75)," +
              "inset 0 -6px 10px rgba(0,0,0,0.35)," +
              "0 1px 0 rgba(255,255,255,0.6)",
            border: "1.5px solid rgba(20,20,15,0.35)",
          }}
        />

        {/* Center dimple */}
        <div
          className="absolute rounded-full"
          style={{
            left: "50%",
            top: "50%",
            width: "18%",
            height: "18%",
            transform: "translate(-50%,-50%)",
            background:
              "radial-gradient(circle at 50% 60%," +
              " #c9c8c0 0%," +
              " #e5e4de 60%," +
              " #f0efe9 100%)",
            boxShadow:
              "inset 0 2px 3px rgba(0,0,0,0.35)," +
              "inset 0 -1px 1px rgba(255,255,255,0.6)",
            border: "1px solid rgba(20,20,15,0.25)",
          }}
        />

        {/* Gloss highlight arc */}
        <div
          aria-hidden
          className="absolute rounded-full pointer-events-none"
          style={{
            inset: "18%",
            background:
              "radial-gradient(ellipse 70% 30% at 50% 10%," +
              " rgba(255,255,255,0.7) 0%," +
              " rgba(255,255,255,0) 70%)",
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
