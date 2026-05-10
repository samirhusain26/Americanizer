"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from "framer-motion";
import { useConverter, selectActive, selectCategoryState, type Side } from "@/store/converter";
import { CATEGORIES, convert, type CategoryId } from "@/lib/units";
import { formatForUnit } from "@/lib/format";
import NumberDisplay from "./NumberDisplay";
import UnitPill from "./UnitPill";
import UnitDrawer from "./UnitDrawer";
import ScrubDial from "./ScrubDial";
import SwapButton from "./SwapButton";
import CategoryDock from "./CategoryDock";

const ACCENT_BY_CATEGORY: Record<CategoryId, string> = {
  temperature: "var(--color-orange)",
  weight: "var(--color-lime)",
  length: "var(--color-cyan)",
  volume: "var(--color-yellow)",
};

type ActiveZone = "from" | "to";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpColor = (a: [number, number, number], b: [number, number, number], t: number) =>
  [Math.round(lerp(a[0], b[0], t)), Math.round(lerp(a[1], b[1], t)), Math.round(lerp(a[2], b[2], t))] as const;
const rgb = (c: readonly [number, number, number], alpha = 1) =>
  alpha === 1 ? `rgb(${c[0]}, ${c[1]}, ${c[2]})` : `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})`;

// Three-stop temperature palette for the LCD plate
const TEMP_COLD: [number, number, number] = [188, 232, 236];   // icy cyan
const TEMP_MID: [number, number, number] = [214, 218, 190];    // default LCD green-grey
const TEMP_HOT: [number, number, number] = [255, 120, 40];     // safety orange

// Weight: olive tone to deepen as mass grows — kept light enough to preserve
// ink-on-LCD contrast for the number glyphs.
const WEIGHT_EMPTY: [number, number, number] = [232, 234, 214];
const WEIGHT_HEAVY: [number, number, number] = [176, 172, 120];

// Volume fill color (deep amber — saturated enough to read against LCD green)
const VOL_FILL: [number, number, number] = [214, 138, 20];

export default function Americanizer() {
  const setActive = useConverter((s) => s.setActive);
  const setValue = useConverter((s) => s.setValue);
  const setUnit = useConverter((s) => s.setUnit);
  const swap = useConverter((s) => s.swap);
  const active = useConverter(selectActive);
  const cat = useConverter(selectCategoryState);

  const current = useMemo(() => {
    const def = CATEGORIES[active];
    return {
      category: active,
      def,
      fromUnit: cat.fromUnit,
      toUnit: cat.toUnit,
      fromVal: cat.value,
      toVal: convert(active, cat.value, cat.fromUnit, cat.toUnit),
    };
  }, [active, cat]);

  const [drawer, setDrawer] = useState<null | Side>(null);
  const [zone, setZone] = useState<ActiveZone>("from");

  const fromText = formatForUnit(current.category, current.fromUnit, current.fromVal);
  const toText = formatForUnit(current.category, current.toUnit, current.toVal);

  const fromUnitDef = current.def.units.find((u) => u.id === current.fromUnit)!;
  const toUnitDef = current.def.units.find((u) => u.id === current.toUnit)!;
  const accent = ACCENT_BY_CATEGORY[current.category];

  const onScrub = (delta: number) => {
    if (zone === "from") setValue("from", current.fromVal + delta);
    else setValue("to", current.toVal + delta);
  };

  // -------------------------------------------------------------------------
  // Context-aware motion pipeline
  // Feeds the "from" value into a spring, then through category-specific
  // useTransform chains. Outputs are wired into CSS custom properties on the
  // root <main> so existing Tailwind/CSS-token classes react automatically.
  // -------------------------------------------------------------------------
  const valueMV = useMotionValue(current.fromVal);
  useEffect(() => {
    valueMV.set(current.fromVal);
  }, [current.fromVal, valueMV]);

  const springed = useSpring(valueMV, { stiffness: 180, damping: 26, mass: 0.6 });

  // Category-scoped inputs: we read the same motion value but only one
  // category's transforms are meaningfully consumed at a time. The others
  // still compute but they cost next to nothing and stay out of React.
  // LENGTH: meters magnitude
  const lengthMeters = useTransform(springed, (v) => {
    if (current.category !== "length") return 1;
    // express in meters via the current fromUnit's toBase
    const u = current.def.units.find((x) => x.id === current.fromUnit);
    return u ? u.toBase(v) : v;
  });

  // VOLUME: liters magnitude
  const volumeLiters = useTransform(springed, (v) => {
    if (current.category !== "volume") return 0;
    const u = current.def.units.find((x) => x.id === current.fromUnit);
    return u ? u.toBase(v) : v;
  });

  // TEMPERATURE (°C base)
  const tempC = useTransform(springed, (v) => {
    if (current.category !== "temperature") return 25;
    const u = current.def.units.find((x) => x.id === current.fromUnit);
    return u ? u.toBase(v) : v;
  });

  // WEIGHT (kg base)
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
          const k = (tt - 0) / 25;
          c = lerpColor(TEMP_COLD, TEMP_MID, k);
        } else {
          const k = (tt - 25) / 20;
          c = lerpColor(TEMP_MID, TEMP_HOT, k);
        }
        const top = rgb(c);
        const bot = rgb([Math.max(0, c[0] - 18), Math.max(0, c[1] - 18), Math.max(0, c[2] - 18)]);
        return `${stripes}, linear-gradient(180deg, ${top} 0%, ${bot} 100%)`;
      }
      if (current.category === "weight") {
        const k = clamp(w / 150, 0, 1);
        const c = lerpColor(WEIGHT_EMPTY, WEIGHT_HEAVY, k);
        const top = rgb(c);
        const bot = rgb([Math.max(0, c[0] - 18), Math.max(0, c[1] - 18), Math.max(0, c[2] - 18)]);
        return `${stripes}, linear-gradient(180deg, ${top} 0%, ${bot} 100%)`;
      }
      if (current.category === "volume") {
        const fill = clamp(vol / 5, 0, 1);
        const fillPct = fill * 100;
        // Hard-edged amber fill from the bottom. Using solid colors (no alpha)
        // guarantees the fill reads against the LCD stripes; a meniscus band at
        // the waterline sells the "liquid" feel.
        const amberTop = rgb([232, 168, 40]);
        const amberBot = rgb([196, 122, 12]);
        const empty = "#d8dcc6";
        const meniscus = Math.max(0, fillPct - 2);
        const liquid =
          `linear-gradient(0deg, ${amberBot} 0%, ${amberTop} ${meniscus}%,` +
          ` rgba(255,230,140,0.9) ${meniscus}% ${fillPct}%,` +
          ` ${empty} ${fillPct}% 100%)`;
        return `${stripes}, ${liquid}`;
      }
      if (current.category === "length") {
        // Stable green base, but overlaid with a ruler whose spacing
        // matches --rule-size (updated by its own transform below).
        const base = "linear-gradient(180deg, #d8dcc6 0%, #c6caaf 100%)";
        const ticks =
          "repeating-linear-gradient(90deg, rgba(0,0,0,0.08) 0 1px, transparent 1px var(--rule-size, 10px))";
        return `${ticks}, ${stripes}, ${base}`;
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
        // freezing → contracted; hot → aggressive sharpness
        const topDark = tt <= 0 ? 0.02 : lerp(0.14, 0.38, clamp((tt - 25) / 20, 0, 1));
        const botLight = tt <= 0 ? 0.08 : lerp(0.35, 0.55, clamp((tt - 25) / 20, 0, 1));
        const off = tt <= 0 ? 0.5 : lerp(2, 4, clamp((tt - 35) / 10, 0, 1));
        return `inset 0 ${off}px 0 rgba(0,0,0,${topDark}), inset 0 -${off}px 0 rgba(255,255,255,${botLight})`;
      }
      if (current.category === "weight") {
        const k = clamp(w / 150, 0, 1);
        const off = lerp(1.5, 5, k);
        return `inset 0 ${off}px 0 rgba(0,0,0,0.18), inset 0 -${off}px 0 rgba(255,255,255,0.3)`;
      }
      return "var(--lcd-inner-shadow-default)";
    }
  );

  // --- Hard shadow token driven by WEIGHT ---
  // 0kg → 2px, 70kg → 4px, 150kg → 12px. Non-weight categories hold at 4px.
  const shadowOffset = useTransform(weightKg, (w) => {
    if (current.category !== "weight") return 4;
    return w <= 70
      ? lerp(2, 4, clamp(w / 70, 0, 1))
      : lerp(4, 12, clamp((w - 70) / 80, 0, 1));
  });
  const shadowHard = useTransform(shadowOffset, (off) => `${off}px ${off}px 0 0 var(--color-ink)`);
  const dialLiftX = useTransform(shadowOffset, (off) => `${off}px`);
  const dialLiftY = useTransform(shadowOffset, (off) => `${off + 2}px`);

  // --- Caret width driven by LENGTH magnitude ---
  const caretWidth = useTransform(lengthMeters, (m) => {
    // <= 0.1m (cm/mm territory) → 1px, >= 1000m (km/mi) → 8px
    const mag = Math.abs(m);
    if (mag <= 0.1) return "1px";
    if (mag >= 1000) return "8px";
    // log-interp between 0.1 and 1000 (4 decades)
    const k = (Math.log10(mag) - Math.log10(0.1)) / (Math.log10(1000) - Math.log10(0.1));
    return `${lerp(1, 8, clamp(k, 0, 1))}px`;
  });

  // --- Grid rule spacing (length) ---
  const ruleSize = useTransform(lengthMeters, (m) => {
    const mag = Math.abs(m);
    if (mag <= 3) return "10px";
    if (mag >= 100) return "100px";
    if (mag >= 10) {
      const k = clamp((mag - 10) / 90, 0, 1);
      return `${lerp(50, 100, k)}px`;
    }
    const k = clamp((mag - 3) / 7, 0, 1);
    return `${lerp(10, 50, k)}px`;
  });
  const ruleOpacity = useTransform(lengthMeters, () =>
    current.category === "length" ? 0.55 : 0
  );

  // --- Chassis pool shadow (volume pooling at the base) ---
  const poolShadow = useTransform(volumeLiters, (v) => {
    if (current.category !== "volume") return "0 0 0 0 transparent";
    const k = clamp(v / 5, 0, 1);
    const spread = lerp(0, 18, k);
    const alpha = lerp(0, 0.28, k);
    return `inset 0 -${spread}px ${spread * 1.4}px rgba(120, 90, 10, ${alpha})`;
  });

  const containerStyle = useMemo(
    () => ({
      background: "var(--color-shell)",
      color: "var(--color-ink)",
      ["--accent" as string]: accent,
      ["--lcd-bg" as string]: lcdBg,
      ["--lcd-inner-shadow" as string]: lcdInnerShadow,
      ["--shadow-hard" as string]: shadowHard,
      ["--dyn-caret-w" as string]: caretWidth,
      ["--rule-size" as string]: ruleSize,
      ["--rule-opacity" as string]: ruleOpacity,
      ["--pool-shadow" as string]: poolShadow,
      ["--dial-lift-x" as string]: dialLiftX,
      ["--dial-lift-y" as string]: dialLiftY,
    }),
    [accent, lcdBg, lcdInnerShadow, shadowHard, caretWidth, ruleSize, ruleOpacity, poolShadow, dialLiftX, dialLiftY]
  );

  return (
    <motion.main
      className="relative h-[100dvh] flex flex-col overflow-hidden canvas-grid chassis-pool"
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
          {current.def.label} / v1
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
      />

      <CategoryDock active={current.category} onChange={setActive} />

      <footer className="mt-6 mb-4 flex justify-center">
        <a
          href="https://samirhusain.info"
          target="_blank"
          rel="noopener noreferrer"
          className="ui-mono text-[10px] tracking-[0.18em] uppercase underline underline-offset-2"
          style={{ color: "var(--color-ink-soft)" }}
        >
          About the developer
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
}) {
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
        style={{ ["--accent" as string]: accent, padding: "10px 14px" }}
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
