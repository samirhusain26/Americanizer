"use client";

import { useDrag } from "@use-gesture/react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { useCallback, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
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

/* ---------- Knob mesh ---------- */

/**
 * Lathed profile for the knob body: a short cylinder with a top bevel,
 * skirt, and base. Returned as a LatheGeometry-compatible point list.
 */
function useKnobProfile() {
  return useMemo(() => {
    // x = radius, y = height (along axis)
    // Assembled bottom→top.
    const pts: THREE.Vector2[] = [
      new THREE.Vector2(0.0,  -0.24),
      new THREE.Vector2(0.90, -0.24),
      new THREE.Vector2(0.98, -0.22),
      new THREE.Vector2(1.00, -0.18),
      new THREE.Vector2(1.00,  0.12),   // straight skirt (knurled area)
      new THREE.Vector2(0.96,  0.16),   // top bevel in
      new THREE.Vector2(0.88,  0.19),
      new THREE.Vector2(0.80,  0.20),   // top face outer
      new THREE.Vector2(0.00,  0.20),   // top face center
    ];
    return pts;
  }, []);
}

function KnurledRim({ radius = 1.0, height = 0.30, yCenter = -0.03, teeth = 120 }) {
  // Thin cylinder of tiny teeth covering the skirt area — gives real
  // knurled silhouette (not just a texture).
  const group = useRef<THREE.Group>(null);
  const toothGeom = useMemo(() => new THREE.BoxGeometry(0.022, height, 0.022), [height]);
  const toothMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#e8e8e2"),
        metalness: 0.15,
        roughness: 0.55,
      }),
    []
  );

  return (
    <group ref={group} position={[0, yCenter, 0]}>
      {Array.from({ length: teeth }).map((_, i) => {
        const a = (i / teeth) * Math.PI * 2;
        const x = Math.cos(a) * radius;
        const z = Math.sin(a) * radius;
        return (
          <mesh key={i} position={[x, 0, z]} rotation={[0, -a, 0]} geometry={toothGeom} material={toothMat} />
        );
      })}
    </group>
  );
}

function Knob({ rotationY, joltY }: { rotationY: { get: () => number }; joltY: { get: () => number } }) {
  const group = useRef<THREE.Group>(null);
  const profile = useKnobProfile();
  const lathe = useMemo(() => new THREE.LatheGeometry(profile, 96), [profile]);
  const body = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#f2f1ec"),
        metalness: 0.1,
        roughness: 0.42,
      }),
    []
  );
  const cap = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#e2e1dc"),
        metalness: 0.25,
        roughness: 0.35,
      }),
    []
  );
  const indicator = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#ff5a1f"),
        metalness: 0.0,
        roughness: 0.45,
        emissive: new THREE.Color("#ff5a1f"),
        emissiveIntensity: 0.12,
      }),
    []
  );

  useFrame(() => {
    if (!group.current) return;
    const r = typeof rotationY.get === "function" ? rotationY.get() : 0;
    group.current.rotation.y = r;
    group.current.position.y = joltY.get() * -0.015;
  });

  return (
    <group ref={group}>
      {/* Body (lathed) */}
      <mesh geometry={lathe} material={body} castShadow receiveShadow />
      {/* Top inset cap */}
      <mesh position={[0, 0.201, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow material={cap}>
        <circleGeometry args={[0.55, 64]} />
      </mesh>
      {/* Center dimple (slight recess) */}
      <mesh position={[0, 0.195, 0]} rotation={[-Math.PI / 2, 0, 0]} material={cap}>
        <ringGeometry args={[0.14, 0.16, 64]} />
      </mesh>
      {/* Knurled rim */}
      <KnurledRim radius={1.005} height={0.28} yCenter={-0.02} teeth={140} />
      {/* Orange indicator pill on top face */}
      <mesh position={[0, 0.206, -0.7]} rotation={[-Math.PI / 2, 0, 0]} castShadow material={indicator}>
        <circleGeometry args={[0.07, 32]} />
      </mesh>
      {/* Indicator housing — subtle raised ring */}
      <mesh position={[0, 0.207, -0.7]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.075, 0.09, 32]} />
        <meshStandardMaterial color="#14140f" metalness={0.2} roughness={0.6} />
      </mesh>
    </group>
  );
}

/* ---------- Outer component ---------- */

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
        rotation.set(rotation.get() + sign * (Math.PI / 10));
        tickJolt();
        clickHaptic(Math.min(1, 0.3 + v * 0.3));
      }
      if (last) {
        // keep current rotation; don't snap — value-driven rest angle is used visually
      }
    },
    { axis: undefined, filterTaps: true, pointer: { capture: true } }
  );

  const onWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      e.preventDefault();
      // Scroll down (positive deltaY) → decrease; scroll up → increase.
      const delta = -e.deltaY;
      wheelAccum.current += delta;

      const now = performance.now();
      const dt = Math.max(1, now - (wheelLastTs.current || now));
      wheelLastTs.current = now;
      const vel = Math.abs(delta) / dt; // px per ms

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

  const joltCssY = useTransform(jolt, [0, 1], [0, -1]);

  return (
    <div className="flex items-center justify-center select-none">
      <motion.div
        className="relative touch-none cursor-grab active:cursor-grabbing"
        style={{
          width: size,
          height: size,
          y: joltCssY,
          filter: "drop-shadow(6px 6px 0 #14140f)",
        }}
      >
        {/* Drag capture layer (above canvas so pointer events always land here) */}
        <div {...bind()} onWheel={onWheel} className="absolute inset-0 z-20 rounded-full" />

        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position: [0, 6, 0.0001], fov: 18 }}
          gl={{ antialias: true, alpha: true }}
          style={{
            borderRadius: 9999,
            background:
              "radial-gradient(circle at 50% 45%, #f4f4f0 0%, #e6e6df 65%, #d6d6cd 100%)",
            border: "1.5px solid #14140f",
          }}
        >
          {/* Studio lighting */}
          <ambientLight intensity={0.55} />
          <directionalLight
            position={[3, 4, 2]}
            intensity={1.6}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
          <directionalLight position={[-3, 2, -2]} intensity={0.55} color={"#cfe4ff"} />
          <pointLight position={[0, 2, 2]} intensity={0.35} />

          {/* Rim/fill lights to fake environment reflections */}
          <directionalLight position={[0, 3, -3]} intensity={0.4} color={"#fff3e0"} />
          <directionalLight position={[-2, -1, 2]} intensity={0.25} color={"#ffffff"} />

          <Knob rotationY={totalRot} joltY={jolt} />

          {/* Shadow plane */}
          <mesh position={[0, -0.25, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <circleGeometry args={[1.4, 64]} />
            <shadowMaterial opacity={0.45} />
          </mesh>
        </Canvas>
      </motion.div>
    </div>
  );
}
