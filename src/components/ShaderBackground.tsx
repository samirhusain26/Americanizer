"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import type { ShaderMaterial } from "three";
import type { CategoryId } from "@/lib/units";

const CATEGORY_INDEX: Record<CategoryId, number> = {
  temperature: 0,
  currency:    1,
  weight:      2,
  length:      3,
  volume:      4,
  speed:       5,
  area:        6,
};

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision mediump float;

  uniform float u_time;
  uniform int   u_category;
  uniform float u_value;

  varying vec2 vUv;

  // ─── Noise helpers ────────────────────────────────────────────────────────
  float hash(vec2 p) {
    p = fract(p * vec2(234.56, 789.01));
    p += dot(p, p + 45.23);
    return fract(p.x * p.y);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i),         hash(i + vec2(1.0, 0.0)), f.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 3; i++) { v += a * vnoise(p); p *= 2.1; a *= 0.5; }
    return v;
  }

  // ─── Base shell colour ────────────────────────────────────────────────────
  #define BASE vec3(0.918, 0.918, 0.894)

  // ─── Temperature ─────────────────────────────────────────────────────────
  // val 0 = -10°C (ice), 1 = 50°C (hot)
  vec3 tempEffect(vec2 uv, float t, float val) {
    vec3 col = BASE;

    float cold = smoothstep(0.35, 0.1, val);
    float hot  = smoothstep(0.65, 0.9, val);

    if (cold > 0.001) {
      // Icy angular fbm — bias toward vertical streaks with low-frequency noise
      vec2 p = uv * vec2(6.0, 10.0);
      p.x += sin(p.y * 2.3 + t * 0.2) * 0.15;
      float n = fbm(p);
      // Angular: threshold the noise for crystalline facets
      float crystal = step(0.52, n) * step(n, 0.62) + step(0.35, n) * step(n, 0.38);
      vec3 iceColor  = vec3(0.82, 0.90, 0.97);
      col = mix(col, iceColor, crystal * cold * 0.45);
      // Subtle blue-white tint across whole area
      col = mix(col, vec3(0.88, 0.92, 0.97), cold * 0.12);
    }

    if (hot > 0.001) {
      // Upward turbulent flow — animated sine warp in y
      vec2 p = uv * vec2(4.0, 5.0);
      p.x += sin(p.y * 3.1 + t * 1.1) * (0.3 * hot);
      p.y -= t * 0.35 * hot;          // flow upward
      float n = fbm(p + t * 0.05);
      // Orange-amber shimmer
      vec3 heatColor = mix(vec3(0.96, 0.82, 0.62), vec3(0.97, 0.70, 0.42), n);
      col = mix(col, heatColor, n * hot * 0.38);
    }

    return col;
  }

  // ─── Weight ───────────────────────────────────────────────────────────────
  // val 0 = 0 kg (empty), 1 = 150 kg (heavy)
  vec3 weightEffect(vec2 uv, float t, float val) {
    // Dot stipple matrix
    float dotScale = mix(18.0, 38.0, val);
    vec2 cell = fract(uv * dotScale) - 0.5;
    float cellId = hash(floor(uv * dotScale));

    // Vary dot radius by value and a bit of hash noise
    float baseRadius = mix(0.08, 0.32, val);
    float radius = baseRadius * (0.7 + 0.3 * cellId);

    // Only show dots in cells where hash < density
    float density = mix(0.20, 0.70, val);
    float showDot = step(cellId, density);

    float dot = 1.0 - smoothstep(radius - 0.02, radius + 0.02, length(cell));
    dot *= showDot;

    // Colour darkens toward olive as weight increases
    vec3 lightDot = vec3(0.74, 0.75, 0.71);
    vec3 heavyDot = vec3(0.60, 0.62, 0.52);
    vec3 dotColor = mix(lightDot, heavyDot, val);

    return mix(BASE, dotColor, dot * 0.80);
  }

  // ─── Length ───────────────────────────────────────────────────────────────
  // val 0 = mm (fine), 1 = km (coarse)
  vec3 lengthEffect(vec2 uv, float t, float val) {
    vec3 col = BASE;

    // Horizon in the vertical middle
    float horizon = 0.5;
    float vy = uv.y - horizon;

    // Perspective: map y to depth 0..1 (0 at horizon)
    float depth = abs(vy) + 0.001;

    // Grid spacing shrinks with depth (perspective), and grows with val
    float baseLines = mix(14.0, 3.5, val);  // lines at ground plane
    float gridX = fract(uv.x * baseLines / depth);
    float gridY = fract(depth * baseLines * 2.0);

    // Fade grid out near horizon (infinite distance)
    float horizonFade = smoothstep(0.0, 0.18, depth);
    // Also fade beyond 0.5 depth for subtlety
    float edgeFade = smoothstep(0.50, 0.25, depth);
    float fade = horizonFade * edgeFade;

    // Only draw below AND above the horizon (both halves)
    float lineW = 0.025;
    float lx = smoothstep(lineW, 0.0, min(gridX, 1.0 - gridX));
    float ly = smoothstep(lineW, 0.0, min(gridY, 1.0 - gridY));
    float grid = max(lx, ly) * fade;

    // Accent color: slate blue-grey
    vec3 gridColor = vec3(0.70, 0.73, 0.79);
    col = mix(col, gridColor, grid * 0.45);

    return col;
  }

  // ─── Volume ───────────────────────────────────────────────────────────────
  // val 0 = empty, 1 = 10 L
  // uv.y=0 is BOTTOM, uv.y=1 is TOP
  vec3 volumeEffect(vec2 uv, float t, float val) {
    // Surface sloshing: sine wave animated
    float surfaceY = val * 0.72 + 0.04;   // fill level, max 76% of height
    float slosh = sin(uv.x * 5.5 + t * 1.4) * 0.018 * val
                + sin(uv.x * 11.0 - t * 0.9) * 0.008 * val;
    float surface = surfaceY + slosh;

    // Distance from surface for soft edge
    float distToSurface = uv.y - surface;

    // Below surface = liquid
    float liquid = smoothstep(0.010, -0.010, distToSurface);

    // Liquid body: amber, slightly darkened at bottom
    float depth = 1.0 - (uv.y / max(surface, 0.001));
    depth = clamp(depth, 0.0, 1.0);
    vec3 liquidSurface = vec3(0.94, 0.81, 0.52);
    vec3 liquidDeep    = vec3(0.82, 0.65, 0.38);
    vec3 liquidColor   = mix(liquidSurface, liquidDeep, depth * 0.6);

    // Small highlight shimmer at surface
    float shimmer = smoothstep(0.008, 0.0, abs(distToSurface))
                  * (0.5 + 0.5 * sin(uv.x * 18.0 + t * 2.5));
    liquidColor = mix(liquidColor, vec3(1.0, 0.95, 0.82), shimmer * 0.35 * val);

    return mix(BASE, liquidColor, liquid * 0.55);
  }

  // ─── Speed ────────────────────────────────────────────────────────────────
  // val 0 = still, 1 = 50 m/s
  vec3 speedEffect(vec2 uv, float t, float val) {
    vec3 col = BASE;

    // 8 horizontal motion streaks at fixed Y positions
    // Fixed positions (must be compile-time constants for WebGL 1 compat)
    float yPos[8];
    yPos[0] = 0.08;
    yPos[1] = 0.18;
    yPos[2] = 0.30;
    yPos[3] = 0.41;
    yPos[4] = 0.55;
    yPos[5] = 0.64;
    yPos[6] = 0.76;
    yPos[7] = 0.88;

    float stripeW[8];
    stripeW[0] = 0.012;
    stripeW[1] = 0.008;
    stripeW[2] = 0.015;
    stripeW[3] = 0.010;
    stripeW[4] = 0.009;
    stripeW[5] = 0.013;
    stripeW[6] = 0.008;
    stripeW[7] = 0.011;

    // Each streak needs a threshold to appear — stagger by val
    float thresholds[8];
    thresholds[0] = 0.05;
    thresholds[1] = 0.18;
    thresholds[2] = 0.10;
    thresholds[3] = 0.30;
    thresholds[4] = 0.45;
    thresholds[5] = 0.22;
    thresholds[6] = 0.60;
    thresholds[7] = 0.38;

    // Streak animation speeds (relative)
    float speeds[8];
    speeds[0] = 1.0;
    speeds[1] = 1.6;
    speeds[2] = 0.8;
    speeds[3] = 1.3;
    speeds[4] = 2.0;
    speeds[5] = 1.1;
    speeds[6] = 1.7;
    speeds[7] = 0.9;

    for (int i = 0; i < 8; i++) {
      float visible = step(thresholds[i], val);

      // Streak moves rightward, wraps
      float offset = fract(uv.x - t * speeds[i] * val * 0.28);

      // Streak: sharp leading edge, long trailing fade
      float streak = (1.0 - offset) * smoothstep(0.0, 0.15, offset);
      // Long high-speed streaks at large val, short at low val
      float lengthMask = smoothstep(1.0, 0.5, offset * mix(4.0, 1.5, val));
      streak *= lengthMask;

      // Vertical profile: thin gaussian around yPos
      float dy = abs(uv.y - yPos[i]);
      float stripe = exp(-dy * dy / (stripeW[i] * stripeW[i] * 2.0));

      // Purple-grey streaks
      float intensity = streak * stripe * visible * mix(0.18, 0.38, val);
      vec3 streakColor = vec3(0.68, 0.65, 0.80);
      col = mix(col, streakColor, intensity);
    }

    return col;
  }

  // ─── Area ─────────────────────────────────────────────────────────────────
  // val 0 = cm² (fine), 1 = km² (coarse)
  vec3 areaEffect(vec2 uv, float t, float val) {
    vec3 col = BASE;

    // Square grid that zooms out with value
    float scale = mix(20.0, 4.0, val);
    vec2 gridUv = uv * scale;
    vec2 cell   = floor(gridUv);
    vec2 local  = fract(gridUv);

    // Grid lines
    float lineW = 0.04;
    float lx = smoothstep(lineW, 0.0, local.x) + smoothstep(1.0 - lineW, 1.0, local.x);
    float ly = smoothstep(lineW, 0.0, local.y) + smoothstep(1.0 - lineW, 1.0, local.y);
    float grid = clamp(lx + ly, 0.0, 1.0);
    vec3 gridColor = vec3(0.75, 0.72, 0.76);
    col = mix(col, gridColor, grid * 0.35);

    // Rose-tinted accent squares — random cells, density up with value
    float cellHash = hash(cell + floor(t * 0.2));  // slow drift
    float accentDensity = mix(0.04, 0.22, val);
    float isAccent = step(1.0 - accentDensity, cellHash);

    // Fill the interior of accent cells (not the grid line)
    float interior = (1.0 - lx) * (1.0 - ly);
    vec3 roseColor = vec3(0.93, 0.80, 0.84);
    col = mix(col, roseColor, isAccent * interior * 0.42);

    return col;
  }

  // ─── Main ──────────────────────────────────────────────────────────────────
  void main() {
    vec2 uv = vUv;
    float t   = u_time;
    float val = clamp(u_value, 0.0, 1.0);

    vec3 col = BASE;

    if      (u_category == 0) col = tempEffect(uv, t, val);
    else if (u_category == 1) col = weightEffect(uv, t, val);
    else if (u_category == 2) col = lengthEffect(uv, t, val);
    else if (u_category == 3) col = volumeEffect(uv, t, val);
    else if (u_category == 4) col = speedEffect(uv, t, val);
    else if (u_category == 5) col = areaEffect(uv, t, val);

    gl_FragColor = vec4(col, 1.0);
  }
`;

// ─── Inner scene (needs access to useFrame) ────────────────────────────────

interface SceneProps {
  categoryIndex: number;
  value: number;
}

function Scene({ categoryIndex, value }: SceneProps) {
  const matRef = useRef<ShaderMaterial>(null);
  const smoothedVal = useRef(value);

  const uniforms = useMemo(
    () => ({
      u_time:     { value: 0 },
      u_category: { value: 0 },
      u_value:    { value: 0 },
    }),
    []
  );

  useFrame((_, delta) => {
    if (!matRef.current) return;
    // Smooth the value, clamp delta to avoid huge jumps on tab-hide
    const dt = Math.min(delta, 0.1);
    smoothedVal.current += (value - smoothedVal.current) * (1 - Math.pow(1 - 0.04, dt * 60));

    matRef.current.uniforms.u_time.value     += dt;
    matRef.current.uniforms.u_category.value  = categoryIndex;
    matRef.current.uniforms.u_value.value     = smoothedVal.current;
  });

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}

// ─── Public component ──────────────────────────────────────────────────────

interface ShaderBackgroundProps {
  category: CategoryId;
  value: number;
}

export function ShaderBackground({ category, value }: ShaderBackgroundProps) {
  const categoryIndex = CATEGORY_INDEX[category];

  return (
    <Canvas
      gl={{ antialias: false, alpha: false }}
      dpr={[1, 1.5]}
      frameloop="always"
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      <Scene categoryIndex={categoryIndex} value={value} />
    </Canvas>
  );
}
