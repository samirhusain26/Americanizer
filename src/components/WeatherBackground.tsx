"use client";

import { useState } from "react";
import { motion, AnimatePresence, useMotionValueEvent, useTransform, type MotionValue } from "framer-motion";
import { clamp, lerpColor, rgb } from "@/lib/math";

// ---------------------------------------------------------------------------
// Color palette helpers
// ---------------------------------------------------------------------------
const SKY_ICY_TOP:   [number, number, number] = [61, 106, 158];
const SKY_ICY_BOT:   [number, number, number] = [168, 200, 224];
const SKY_COOL_TOP:  [number, number, number] = [100, 149, 195];
const SKY_COOL_BOT:  [number, number, number] = [168, 196, 218];
const SKY_WARM_TOP:  [number, number, number] = [130, 172, 210];
const SKY_WARM_BOT:  [number, number, number] = [200, 220, 235];
const SKY_HOT_TOP:   [number, number, number] = [232, 184, 48];
const SKY_HOT_BOT:   [number, number, number] = [240, 208, 96];
const SKY_SCORCH_TOP: [number, number, number] = [208, 64, 16];
const SKY_SCORCH_BOT: [number, number, number] = [232, 112, 48];

function getSkyColors(t: number): { top: string; bot: string } {
  // < 0°C: icy blue
  if (t <= 0) {
    const k = clamp((t + 20) / 20, 0, 1); // -20→0: fade in
    const top = lerpColor(SKY_ICY_TOP, SKY_ICY_TOP, k);
    const bot = lerpColor(SKY_ICY_BOT, SKY_ICY_BOT, k);
    return { top: rgb(top), bot: rgb(bot) };
  }
  // 0–15°C: icy → cool
  if (t <= 15) {
    const k = t / 15;
    return { top: rgb(lerpColor(SKY_ICY_TOP, SKY_COOL_TOP, k)), bot: rgb(lerpColor(SKY_ICY_BOT, SKY_COOL_BOT, k)) };
  }
  // 15–25°C: cool → warm
  if (t <= 25) {
    const k = (t - 15) / 10;
    return { top: rgb(lerpColor(SKY_COOL_TOP, SKY_WARM_TOP, k)), bot: rgb(lerpColor(SKY_COOL_BOT, SKY_WARM_BOT, k)) };
  }
  // 25–35°C: warm → golden
  if (t <= 35) {
    const k = (t - 25) / 10;
    return { top: rgb(lerpColor(SKY_WARM_TOP, SKY_HOT_TOP, k)), bot: rgb(lerpColor(SKY_WARM_BOT, SKY_HOT_BOT, k)) };
  }
  // 35°C+: golden → scorching
  const k = clamp((t - 35) / 10, 0, 1);
  return { top: rgb(lerpColor(SKY_HOT_TOP, SKY_SCORCH_TOP, k)), bot: rgb(lerpColor(SKY_HOT_BOT, SKY_SCORCH_BOT, k)) };
}

// ---------------------------------------------------------------------------
// Scene definitions
// ---------------------------------------------------------------------------
interface Scene {
  icon: string;
  range: [number, number];
}

const SCENES: Scene[] = [
  { icon: "extreme-snow",      range: [-Infinity, -5] },
  { icon: "overcast-day-snow", range: [-5, 8] },
  { icon: "overcast",          range: [8, 15] },
  { icon: "partly-cloudy-day", range: [15, 22] },
  { icon: "mostly-clear-day",  range: [22, 28] },
  { icon: "clear-day",         range: [28, 35] },
  { icon: "sun-hot",           range: [35, Infinity] },
];

function getScene(t: number): Scene {
  for (const scene of SCENES) {
    if (t >= scene.range[0] && t < scene.range[1]) return scene;
  }
  // Fallback — should never happen given Infinity bounds
  return SCENES[SCENES.length - 1];
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function WeatherBackground({ tempC }: { tempC: MotionValue<number> }) {
  const skyGradient = useTransform(tempC, (t) => {
    const { top, bot } = getSkyColors(t);
    return `linear-gradient(180deg, ${top} 0%, ${bot} 100%)`;
  });

  const [currentScene, setCurrentScene] = useState<Scene>(() => getScene(tempC.get()));

  useMotionValueEvent(tempC, "change", (t) => {
    const next = getScene(t);
    if (next.icon !== currentScene.icon) {
      setCurrentScene(next);
    }
  });

  return (
    <motion.div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
        zIndex: 0,
        background: skyGradient,
      }}
    >
      <AnimatePresence mode="wait">
        <motion.img
          key={currentScene.icon}
          src={`/meteocons/${currentScene.icon}.svg`}
          alt=""
          aria-hidden
          width={160}
          height={160}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.85 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          style={{
            position: "absolute",
            top: "15%",
            left: "50%",
            translateX: "-50%",
            width: 160,
            height: 160,
          }}
        />
      </AnimatePresence>
    </motion.div>
  );
}
