"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from "framer-motion";
import { useDrag } from "@use-gesture/react";
import { useConverter, selectActive, selectCategoryState, type Side } from "@/store/converter";
import { CATEGORIES, CATEGORY_ORDER, convert, type CategoryId } from "@/lib/units";
import { formatForUnit } from "@/lib/format";
import { clamp, lerp, lerpColor, rgb } from "@/lib/math";
import NumberDisplay from "./NumberDisplay";
import UnitPill from "./UnitPill";
import UnitDrawer from "./UnitDrawer";
import ScrubDial from "./ScrubDial";
import SwapButton from "./SwapButton";
import CategoryDock from "./CategoryDock";

const ShaderBackground = dynamic(
  () => import("./ShaderBackground").then((m) => ({ default: m.ShaderBackground })),
  { ssr: false }
);

const ACCENT_BY_CATEGORY: Record<CategoryId, string> = {
  temperature: "var(--color-orange)",
  weight:      "var(--color-lime)",
  length:      "var(--color-cyan)",
  volume:      "var(--color-yellow)",
  speed:       "var(--color-purple)",
  area:        "var(--color-rose)",
};

type ActiveZone = "from" | "to";

// Three-stop temperature palette for the LCD plate
const TEMP_COLD: [number, number, number] = [188, 232, 236];   // icy cyan
const TEMP_MID: [number, number, number]  = [214, 218, 190];   // default LCD green-grey
const TEMP_HOT: [number, number, number]  = [255, 120, 40];    // safety orange

// Weight: olive tone deepens with mass
const WEIGHT_EMPTY: [number, number, number] = [232, 234, 214];
const WEIGHT_HEAVY: [number, number, number] = [176, 172, 120];

// Volume fill color (deep amber)
const VOL_FILL: [number, number, number] = [214, 138, 20];

export default function Americanizer() {
  const setActive = useConverter((s) => s.setActive);
  const setValue  = useConverter((s) => s.setValue);
  const setUnit   = useConverter((s) => s.setUnit);
  const swap      = useConverter((s) => s.swap);
  const active    = useConverter(selectActive);
  const cat       = useConverter(selectCategoryState);

  const current = useMemo(() => {
    const def = CATEGORIES[active];
    return {
      category: active,
      def,
      fromUnit: cat.fromUnit,
      toUnit:   cat.toUnit,
      fromVal:  cat.value,
      toVal:    convert(active, cat.value, cat.fromUnit, cat.toUnit),
    };
  }, [active, cat]);

  const shaderValue = useMemo(() => {
    const u = current.def.units.find((x) => x.id === current.fromUnit);
    const base = u ? u.toBase(current.fromVal) : current.fromVal;
    switch (current.category) {
      case "temperature": return clamp((base + 10) / 60, 0, 1);          // -10°C→50°C
      case "weight":      return clamp(Math.abs(base) / 150, 0, 1);      // 0→150 kg
      case "length":      return clamp(Math.log10(Math.max(Math.abs(base), 0.001) + 1) / 4, 0, 1);
      case "volume":      return clamp(Math.abs(base) / 10, 0, 1);       // 0→10 L
      case "speed":       return clamp(Math.abs(base) / 50, 0, 1);       // 0→50 m/s
      case "area":        return clamp(Math.log10(Math.max(Math.abs(base), 0.01) + 1) / 6, 0, 1);
      default:            return 0.5;
    }
  }, [current]);

  const [drawer, setDrawer] = useState<null | Side>(null);
  const [zone, setZone] = useState<ActiveZone>("from");

  const fromText = formatForUnit(current.category, current.fromUnit, current.fromVal);
  const toText   = formatForUnit(current.category, current.toUnit,  current.toVal);

  const fromUnitDef = current.def.units.find((u) => u.id === current.fromUnit)!;
  const toUnitDef   = current.def.units.find((u) => u.id === current.toUnit)!;
  const accent = ACCENT_BY_CATEGORY[current.category];

  const onScrub = (delta: number) => {
    if (zone === "from") setValue("from", current.fromVal + delta);
    else setValue("to", current.toVal + delta);
  };

  // Swipe left/right on the main canvas to cycle categories
  const bind = useDrag(
    ({ last, movement: [mx], velocity: [vx], direction: [dx], cancel }) => {
      // Abort if primarily vertical (don't steal from ScrubDial or scroll)
      if (last) {
        if (Math.abs(mx) > 60 && Math.abs(vx) > 0.2) {
          const idx = CATEGORY_ORDER.indexOf(active);
          const next = dx < 0
            ? CATEGORY_ORDER[(idx + 1) % CATEGORY_ORDER.length]
            : CATEGORY_ORDER[(idx - 1 + CATEGORY_ORDER.length) % CATEGORY_ORDER.length];
          setActive(next);
        }
      }
    },
    { axis: "x", filterTaps: true, pointer: { touch: true } }
  );

  // -------------------------------------------------------------------------
  // Context-aware motion pipeline
  // -------------------------------------------------------------------------
  const valueMV = useMotionValue(current.fromVal);
  useEffect(() => { valueMV.set(current.fromVal); }, [current.fromVal, valueMV]);

  const springed = useSpring(valueMV, { stiffness: 180, damping: 26, mass: 0.6 });

  const lengthMeters = useTransform(springed, (v) => {
    if (current.category !== "length") return 1;
    const u = current.def.units.find((x) => x.id === current.fromUnit);
    return u ? u.toBase(v) : v;
  });

  const volumeLiters = useTransform(springed, (v) => {
    if (current.category !== "volume") return 0;
    const u = current.def.units.find((x) => x.id === current.fromUnit);
    return u ? u.toBase(v) : v;
  });

  const tempC = useTransform(springed, (v) => {
    if (current.category !== "temperature") return 25;
    const u = current.def.units.find((x) => x.id === current.fromUnit);
    return u ? u.toBase(v) : v;
  });

  const weightKg = useTransform(springed, (v) => {
    if (current.category !== "weight") return 70;
    const u = current.def.units.find((x) => x.id === current.fromUnit);
    return u ? u.toBase(v) : v;
  });

  // --- LCD background per category ---
  const lcdBg = useTransform(
    [tempC, weightKg, volumeLiters] as MotionValue<number>[],
    ([t, w, vol]: number[]) => {
      const stripes =
        "repeating-linear-gradient(0deg, rgba(0,0,0,0.035) 0 1px, transparent 1px 3px)";
      if (current.category === "temperature") {
        const tt = clamp(t, 0, 45);
        let c: readonly [number, number, number];
        if (tt <= 25) {
          c = lerpColor(TEMP_COLD, TEMP_MID, (tt - 0) / 25);
        } else {
          c = lerpColor(TEMP_MID, TEMP_HOT, (tt - 25) / 20);
        }
        const top = rgb(c);
        const bot = rgb([Math.max(0, c[0] - 18), Math.max(0, c[1] - 18), Math.max(0, c[2] - 18)] as [number,number,number]);
        return `${stripes}, linear-gradient(180deg, ${top} 0%, ${bot} 100%)`;
      }
      if (current.category === "weight") {
        const k = clamp(w / 150, 0, 1);
        const c = lerpColor(WEIGHT_EMPTY, WEIGHT_HEAVY, k);
        const top = rgb(c);
        const bot = rgb([Math.max(0, c[0] - 18), Math.max(0, c[1] - 18), Math.max(0, c[2] - 18)] as [number,number,number]);
        return `${stripes}, linear-gradient(180deg, ${top} 0%, ${bot} 100%)`;
      }
      if (current.category === "volume") {
        const fill    = clamp(vol / 5, 0, 1);
        const fillPct = fill * 100;
        const amberTop = rgb([232, 168, 40]);
        const amberBot = rgb([196, 122, 12]);
        const empty    = "#d8dcc6";
        const meniscus = Math.max(0, fillPct - 2);
        const liquid =
          `linear-gradient(0deg, ${amberBot} 0%, ${amberTop} ${meniscus}%,` +
          ` rgba(255,230,140,0.9) ${meniscus}% ${fillPct}%,` +
          ` ${empty} ${fillPct}% 100%)`;
        return `${stripes}, ${liquid}`;
      }
      if (current.category === "length") {
        const base  = "linear-gradient(180deg, #d8dcc6 0%, #c6caaf 100%)";
        const ticks =
          "repeating-linear-gradient(90deg, rgba(0,0,0,0.08) 0 1px, transparent 1px var(--rule-size, 10px))";
        return `${ticks}, ${stripes}, ${base}`;
      }
      if (current.category === "speed") {
        // Subtle purple-grey tint that intensifies with speed
        const speedMs = current.def.units.find((x) => x.id === current.fromUnit)?.toBase(springed.get()) ?? 0;
        const k = clamp(Math.abs(speedMs) / 100, 0, 1); // 100 m/s ≈ 360 km/h
        const c = lerpColor([214, 218, 190], [180, 160, 220], k);
        const top = rgb(c);
        const bot = rgb([Math.max(0, c[0] - 18), Math.max(0, c[1] - 18), Math.max(0, c[2] - 18)] as [number,number,number]);
        return `${stripes}, linear-gradient(180deg, ${top} 0%, ${bot} 100%)`;
      }
      return "var(--lcd-bg-default)";
    }
  );

  // --- LCD inner shadow / physical stress ---
  const lcdInnerShadow = useTransform(
    [tempC, weightKg] as MotionValue<number>[],
    ([t, w]: number[]) => {
      if (current.category === "temperature") {
        const tt = clamp(t, -10, 55);
        const topDark  = tt <= 0 ? 0.02 : lerp(0.14, 0.38, clamp((tt - 25) / 20, 0, 1));
        const botLight = tt <= 0 ? 0.08 : lerp(0.35, 0.55, clamp((tt - 25) / 20, 0, 1));
        const off      = tt <= 0 ? 0.5  : lerp(2, 4, clamp((tt - 35) / 10, 0, 1));
        return `inset 0 ${off}px 0 rgba(0,0,0,${topDark}), inset 0 -${off}px 0 rgba(255,255,255,${botLight})`;
      }
      if (current.category === "weight") {
        const k   = clamp(w / 150, 0, 1);
        const off = lerp(1.5, 5, k);
        return `inset 0 ${off}px 0 rgba(0,0,0,0.18), inset 0 -${off}px 0 rgba(255,255,255,0.3)`;
      }
      return "var(--lcd-inner-shadow-default)";
    }
  );

  // --- Hard shadow token driven by WEIGHT ---
  const shadowOffset = useTransform(weightKg, (w) => {
    if (current.category !== "weight") return 4;
    return w <= 70 ? lerp(2, 4, clamp(w / 70, 0, 1)) : lerp(4, 12, clamp((w - 70) / 80, 0, 1));
  });
  const shadowHard = useTransform(shadowOffset, (off) => `${off}px ${off}px 0 0 var(--color-ink)`);
  const dialLiftX  = useTransform(shadowOffset, (off) => `${off}px`);
  const dialLiftY  = useTransform(shadowOffset, (off) => `${off + 2}px`);

  // --- Caret width driven by LENGTH magnitude ---
  const caretWidth = useTransform(lengthMeters, (m) => {
    const mag = Math.abs(m);
    if (mag <= 0.1)  return "1px";
    if (mag >= 1000) return "8px";
    const k = (Math.log10(mag) - Math.log10(0.1)) / (Math.log10(1000) - Math.log10(0.1));
    return `${lerp(1, 8, clamp(k, 0, 1))}px`;
  });

  // --- Grid rule spacing (length) ---
  const ruleSize = useTransform(lengthMeters, (m) => {
    const mag = Math.abs(m);
    if (mag <= 3)   return "10px";
    if (mag >= 100) return "100px";
    if (mag >= 10)  return `${lerp(50, 100, clamp((mag - 10) / 90, 0, 1))}px`;
    return `${lerp(10, 50, clamp((mag - 3) / 7, 0, 1))}px`;
  });
  const ruleOpacity = useTransform(lengthMeters, () => current.category === "length" ? 0.55 : 0);

  // --- Chassis pool shadow (volume) ---
  const poolShadow = useTransform(volumeLiters, (v) => {
    if (current.category !== "volume") return "0 0 0 0 transparent";
    const k      = clamp(v / 5, 0, 1);
    const spread = lerp(0, 18, k);
    const alpha  = lerp(0, 0.28, k);
    return `inset 0 -${spread}px ${spread * 1.4}px rgba(120, 90, 10, ${alpha})`;
  });

  const containerStyle = {
    background: "var(--color-shell)",
    color: "var(--color-ink)",
    ["--accent" as string]:             accent,
    ["--lcd-bg" as string]:             lcdBg,
    ["--lcd-inner-shadow" as string]:   lcdInnerShadow,
    ["--shadow-hard" as string]:        shadowHard,
    ["--dyn-caret-w" as string]:        caretWidth,
    ["--rule-size" as string]:          ruleSize,
    ["--rule-opacity" as string]:       ruleOpacity,
    ["--pool-shadow" as string]:        poolShadow,
    ["--dial-lift-x" as string]:        dialLiftX,
    ["--dial-lift-y" as string]:        dialLiftY,
  };

  return (
    <div {...bind()} style={{ height: "100dvh", touchAction: "pan-y" }}>
    <motion.main
      className="relative h-full flex flex-col overflow-hidden canvas-grid chassis-pool"
      style={containerStyle}
    >
      {/* Chassis header */}
      <header
        className="px-4 pt-[calc(env(safe-area-inset-top)+8px)] pb-2.5 flex items-center justify-between rule-b ui-mono uppercase"
        style={{
          background: "var(--color-shell-2)",
          fontSize: 10,
          letterSpacing: "0.28em",
          fontWeight: 600,
        }}
      >
        <span className="flex items-center gap-2">
          <span className="screw" />
          <span>AMERICANIZER</span>
        </span>
        <span
          className="flex items-center gap-2"
          style={{ color: "var(--color-ink-soft)" }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              background: accent,
              border: "1.5px solid var(--color-ink)",
              display: "inline-block",
            }}
          />
          {current.def.label}
        </span>
      </header>

      {/* Zone 1 — FROM */}
      <ValueRow
        accent={accent}
        formatted={fromText}
        rawValue={current.fromVal}
        unitSymbol={fromUnitDef.label}
        unitName={fromUnitDef.longLabel}
        active={zone === "from"}
        onActivate={() => setZone("from")}
        onCommit={(n) => setValue("from", n)}
        onOpenPicker={() => setDrawer("from")}
      />

      {/* Zone 2 — engine */}
      <section
        className="flex-1 min-h-0 flex items-center justify-center rule-b relative"
        style={{ background: "var(--color-shell-2)", padding: "20px 0" }}
      >
        <ShaderBackground category={current.category} value={shaderValue} />
        <ScrubDial value={zone === "from" ? current.fromVal : current.toVal} onDelta={onScrub} />

        {/* Swap */}
        <div className="absolute" style={{ top: 14, right: 14 }}>
          <SwapButton onSwap={swap} accent={accent} />
        </div>
      </section>

      {/* Zone 3 — TO */}
      <ValueRow
        accent={accent}
        formatted={toText}
        rawValue={current.toVal}
        unitSymbol={toUnitDef.label}
        unitName={toUnitDef.longLabel}
        active={zone === "to"}
        onActivate={() => setZone("to")}
        onCommit={(n) => setValue("to", n)}
        onOpenPicker={() => setDrawer("to")}
        copyOnFocus
      />

      <CategoryDock active={current.category} onChange={setActive} />

      <footer className="mt-3 mb-2 flex justify-center">
        <a
          href="https://samirhusain.info"
          target="_blank"
          rel="noopener noreferrer"
          className="ui-mono text-[9px] tracking-[0.12em] opacity-60 hover:opacity-100 transition-opacity"
          style={{ color: "var(--color-ink-soft)" }}
        >
          about the developer
        </a>
      </footer>

      <UnitDrawer
        open={drawer === "from"}
        onOpenChange={(o) => setDrawer(o ? "from" : null)}
        category={current.def}
        selectedUnitId={current.fromUnit}
        title={`${current.def.label} · FROM A`}
        accent={accent}
        onSelect={(id) => setUnit("from", id)}
      />
      <UnitDrawer
        open={drawer === "to"}
        onOpenChange={(o) => setDrawer(o ? "to" : null)}
        category={current.def}
        selectedUnitId={current.toUnit}
        title={`${current.def.label} · TO B`}
        accent={accent}
        onSelect={(id) => setUnit("to", id)}
      />
    </motion.main>
    </div>
  );
}

function ValueRow({
  accent,
  formatted,
  rawValue,
  unitSymbol,
  unitName,
  active,
  onActivate,
  onCommit,
  onOpenPicker,
  copyOnFocus,
}: {
  accent: string;
  formatted: string;
  rawValue: number;
  unitSymbol: string;
  unitName: string;
  active: boolean;
  onActivate: () => void;
  onCommit: (n: number) => void;
  onOpenPicker: () => void;
  copyOnFocus?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!copyOnFocus) return;
    navigator.clipboard?.writeText(String(Math.round(rawValue * 1000) / 1000)).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 900);
  };

  return (
    <section
      className="rule-b shrink-0 cursor-pointer"
      onClick={onActivate}
      style={{ padding: "12px 16px 14px", position: "relative" }}
    >
      <div
        className="ui-mono uppercase flex justify-between items-center"
        style={{
          fontSize: 10,
          letterSpacing: "0.22em",
          color: "var(--color-ink-soft)",
          marginBottom: 6,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: active ? accent : "transparent",
            border: `1.5px solid ${active ? "var(--color-ink)" : "var(--color-ink-soft)"}`,
            display: "inline-block",
          }}
        />
        <span>{unitName}</span>
      </div>

      <div
        className="lcd flex items-center justify-between gap-2.5"
        data-active={active}
        style={{
          ["--accent" as string]: copied ? "var(--color-lime)" : accent,
          padding: "10px 14px",
          transition: "box-shadow 0.15s ease",
        }}
      >
        <div
          className="flex-1 min-w-0"
          style={{ overflow: "hidden" }}
          onClick={(e) => e.stopPropagation()}
        >
          <NumberDisplay
            className="text-[60px] sm:text-[68px] leading-none font-semibold"
            formatted={formatted}
            rawValue={rawValue}
            onCommit={onCommit}
            onFocus={copyOnFocus ? handleCopy : undefined}
            showCaret={active}
            caretColor={accent}
          />
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <UnitPill symbol={unitSymbol} onClick={onOpenPicker} />
        </div>
      </div>
    </section>
  );
}
