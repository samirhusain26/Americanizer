"use client";

import { useDrag } from "@use-gesture/react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { useCallback, useMemo, useRef } from "react";
import { clickHaptic, toggleMute } from "@/lib/haptics";

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
type GestureMode = "pending" | "spin" | "slide";

export default function ScrubDial({ value: _value, onDelta, size = 200 }: ScrubDialProps) {
  const PX_PER_DETENT = 12;
  const RAD_PER_DETENT = (Math.PI * 2) / 30; // ~12° per detent
  const LOCK_THRESHOLD_PX = 6;
  const INNER_LOCK_RATIO = 0.45;

  const lastDetentBucket = useRef(0);
  const lastAngleBucket = useRef(0);
  const mode = useRef<GestureMode>("pending");
  const center = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const accumAngle = useRef(0);
  const prevAngle = useRef(0);

  const knobRef = useRef<HTMLDivElement>(null);
  const wheelAccum = useRef(0);
  const wheelLastTs = useRef(0);

  const jolt = useMotionValue(0);
  const rotation = useMotionValue(0);

  const tickJolt = useCallback(() => {
    jolt.set(1);
    requestAnimationFrame(() => jolt.set(0));
  }, [jolt]);

  const emitDetents = useCallback(
    (detents: number, v: number) => {
      const step = stepFromVelocity(v);
      const sign = detents > 0 ? 1 : -1;
      onDelta(sign * Math.abs(detents) * step);
      tickJolt();
      clickHaptic(Math.min(1, 0.3 + v * 0.3));
    },
    [onDelta, tickJolt]
  );

  const bind = useDrag(
    ({ first, xy: [px, py], movement: [mx, my], velocity: [vx, vy] }) => {
      if (first) {
        lastDetentBucket.current = 0;
        lastAngleBucket.current = 0;
        accumAngle.current = 0;
        rotation.set(0);
        mode.current = "pending";
        const rect = knobRef.current?.getBoundingClientRect();
        if (rect) {
          center.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
          prevAngle.current = Math.atan2(py - center.current.y, px - center.current.x);
        }
        return;
      }

      const v = Math.max(Math.abs(vx), Math.abs(vy));

      if (mode.current === "pending") {
        if (Math.hypot(mx, my) < LOCK_THRESHOLD_PX) return;

        const dx = px - center.current.x;
        const dy = py - center.current.y;
        const r = Math.hypot(dx, dy);
        const radius = (knobRef.current?.getBoundingClientRect().width ?? size) / 2;

        if (r > radius * INNER_LOCK_RATIO) {
          // tangential-vs-radial test
          const rx = dx / (r || 1);
          const ry = dy / (r || 1);
          const tx = -ry;
          const ty = rx;
          const mLen = Math.hypot(mx, my) || 1;
          const along = (mx * tx + my * ty) / mLen;
          mode.current = Math.abs(along) > 0.6 ? "spin" : "slide";
        } else {
          mode.current = "slide";
        }
        // reset anchors on lock so the measured motion starts at the lock moment
        prevAngle.current = Math.atan2(py - center.current.y, px - center.current.x);
      }

      if (mode.current === "spin") {
        const angle = Math.atan2(py - center.current.y, px - center.current.x);
        let delta = angle - prevAngle.current;
        if (delta > Math.PI) delta -= Math.PI * 2;
        else if (delta < -Math.PI) delta += Math.PI * 2;
        accumAngle.current += delta;
        prevAngle.current = angle;

        // 1:1 finger tracking — rotate the rim by the actual angle the finger moved.
        rotation.set(accumAngle.current);

        const bucket = Math.trunc(accumAngle.current / RAD_PER_DETENT);
        if (bucket !== lastAngleBucket.current) {
          const detents = bucket - lastAngleBucket.current;
          lastAngleBucket.current = bucket;
          emitDetents(detents, v);
        }
        return;
      }

      // slide: linear scrub, up/right increases. Rotate rim proportionally so
      // the knob still feels alive without spinning faster than the finger.
      const linear = mx - my;
      rotation.set((linear / (size * Math.PI)) * Math.PI);
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
        const step = stepFromVelocity(vel);
        onDelta(sign * step);
        rotation.set(rotation.get() + sign * RAD_PER_DETENT);
        tickJolt();
        clickHaptic(Math.min(1, 0.3 + vel * 0.3));
      }
    },
    [onDelta, rotation, tickJolt]
  );

  // Direct 1:1 mapping — no value-driven rotation, no per-detent kicker.
  const rotDeg = useTransform(rotation, (r) => (r * 180) / Math.PI);
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
        ref={knobRef}
        className="relative touch-none cursor-grab active:cursor-grabbing"
        style={{
          width: size,
          height: size,
          y: joltCssY,
        }}
      >
        {/* Hard-shadow plinth (no blur) — lift offset driven by weight category */}
        <div
          aria-hidden
          className="absolute rounded-full"
          style={{
            inset: 0,
            background: "var(--color-ink)",
            transform: "translate(var(--dial-lift-x, 4px), var(--dial-lift-y, 6px))",
            zIndex: 0,
          }}
        />

        {/* Rotating outer knurled rim with inset cap & indicator */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            rotate: rotDeg,
            background: knurlBg,
            border: "1.5px solid var(--color-ink)",
            boxShadow:
              "inset 0 2px 3px rgba(255,255,255,0.35)," +
              "inset 0 -3px 6px rgba(0,0,0,0.55)",
            zIndex: 1,
          }}
        >
          {/* Inset cap (rotates with rim — TE style) */}
          <div
            aria-hidden
            className="absolute rounded-full pointer-events-none"
            style={{
              inset: "13%",
              background:
                "radial-gradient(circle at 35% 28%," +
                " #fafaf6 0%," +
                " #ecebe4 25%," +
                " #cfcec6 65%," +
                " #a9a89f 100%)",
              border: "1px solid var(--color-ink)",
              boxShadow:
                "inset 0 4px 6px rgba(255,255,255,0.45)," +
                "inset 0 -10px 16px rgba(0,0,0,0.32)",
            }}
          />

        </motion.div>

        {/* Drag + wheel capture layer (on top) */}
        <div
          {...bind()}
          onWheel={onWheel}
          className="absolute inset-0 z-20 rounded-full"
        />

        {/* Center mute button — above drag layer, non-rotating */}
        <button
          onClick={(e) => { e.stopPropagation(); toggleMute(); }}
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: "22%",
            height: "22%",
            transform: "translate(-50%, -50%)",
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 50% 65%," +
              " #b8b7af 0%," +
              " #d6d5cd 55%," +
              " #eceae3 100%)",
            border: "1px solid var(--color-ink)",
            boxShadow:
              "inset 0 3px 4px rgba(0,0,0,0.45)," +
              "inset 0 -1px 2px rgba(255,255,255,0.5)",
            zIndex: 30,
            cursor: "pointer",
          }}
        />
      </motion.div>
    </div>
  );
}
