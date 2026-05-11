"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useConverter, selectActive, selectCategoryState, type Side } from "@/store/converter";
import { CATEGORIES, CATEGORY_ORDER, convert, getVisualMax, getStepConfig, type CategoryId } from "@/lib/units";
import { formatForUnit } from "@/lib/format";
import { useFxRates, formatRateAge } from "@/lib/fx";
import { clamp, lerp, lerpColor } from "@/lib/math";
import NumberDisplay from "./NumberDisplay";
import UnitPill from "./UnitPill";
import UnitDrawer from "./UnitDrawer";
import ScrubDial from "./ScrubDial";
import SwapButton from "./SwapButton";
import CategoryDock from "./CategoryDock";

type ActiveZone = "from" | "to";

const CATEGORY_ACCENT: Record<CategoryId, string> = {
  temperature: "#FF3300",
  currency:    "#10B981",
  weight:      "#32CD32",
  length:      "#00FFFF",
  volume:      "#FFD700",
  speed:       "#FF7F50",
  area:        "#0055FF",
};

export default function Americanizer() {
  const setActive       = useConverter((s) => s.setActive);
  const setValue        = useConverter((s) => s.setValue);
  const setUnit         = useConverter((s) => s.setUnit);
  const swap            = useConverter((s) => s.swap);
  const resetCategory   = useConverter((s) => s.resetCategory);
  const active          = useConverter(selectActive);
  const cat             = useConverter(selectCategoryState);

  const { lastUpdated, isLoading, onCooldown, refresh } = useFxRates();

  // lastUpdated is included so toVal recomputes when live rates arrive
  const current = useMemo(() => {
    const def = CATEGORIES[active];
    return {
      category: active,
      def,
      fromUnit: cat.fromUnit,
      toUnit:   cat.toUnit,
      fromVal:  cat.value,
      // eslint-disable-next-line react-hooks/exhaustive-deps
      toVal:    convert(active, cat.value, cat.fromUnit, cat.toUnit),
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, cat, lastUpdated]);

  const [drawer, setDrawer] = useState<null | Side>(null);
  const [zone, setZone] = useState<ActiveZone>("from");

  useEffect(() => {
    if (active === "temperature") {
      setUnit("from", "c");
      setUnit("to", "f");
    }
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  const stepConfig = useMemo(
    () => getStepConfig(current.category, current.fromUnit),
    [current.category, current.fromUnit]
  );

  const fromText = formatForUnit(current.category, current.fromUnit, current.fromVal);
  const toText   = formatForUnit(current.category, current.toUnit,  current.toVal);

  const fromUnitDef = current.def.units.find((u) => u.id === current.fromUnit)!;
  const toUnitDef   = current.def.units.find((u) => u.id === current.toUnit)!;

  const onScrub = (delta: number) => {
    if (zone === "from") setValue("from", current.fromVal + delta);
    else setValue("to", current.toVal + delta);
  };

  // -------------------------------------------------------------------------
  // Context-aware motion pipeline
  // -------------------------------------------------------------------------
  const valueMV = useMotionValue(current.fromVal);
  useEffect(() => { valueMV.set(current.fromVal); }, [current.fromVal, valueMV]);

  const springed = useSpring(valueMV, { stiffness: 180, damping: 26, mass: 0.6 });

  // --- Base unit conversions (category-gated to avoid cross-contamination) ---

  const tempC = useTransform(springed, (v) => {
    if (current.category !== "temperature") return 25;
    const u = current.def.units.find((x) => x.id === current.fromUnit);
    return u ? u.toBase(v) : v;
  });

  const weightKg = useTransform(springed, (v) => {
    if (current.category !== "weight") return 0;
    const u = current.def.units.find((x) => x.id === current.fromUnit);
    return u ? u.toBase(v) : v;
  });

  const volumeLiters = useTransform(springed, (v) => {
    if (current.category !== "volume") return 0;
    const u = current.def.units.find((x) => x.id === current.fromUnit);
    return u ? u.toBase(v) : v;
  });

  const lengthM = useTransform(springed, (v) => {
    if (current.category !== "length") return 0;
    const u = current.def.units.find((x) => x.id === current.fromUnit);
    return u ? u.toBase(v) : v;
  });

  const speedMs = useTransform(springed, (v) => {
    if (current.category !== "speed") return 0;
    const u = current.def.units.find((x) => x.id === current.fromUnit);
    return u ? u.toBase(v) : v;
  });

  const areaM2 = useTransform(springed, (v) => {
    if (current.category !== "area") return 0;
    const u = current.def.units.find((x) => x.id === current.fromUnit);
    return u ? u.toBase(v) : v;
  });

  const currencyUsd = useTransform(springed, (v) => {
    if (current.category !== "currency") return 0;
    const u = current.def.units.find((x) => x.id === current.fromUnit);
    return u ? u.toBase(v) : v;
  });

  // --- Visual effects ---

  // Temperature: ambient radial gradient — icy-blue at ≤0°C → neutral at 22°C → warm-orange at ≥45°C
  const tempGradient = useTransform(tempC, (t) => {
    if (current.category !== "temperature") return "none";
    const tt = clamp(t, -20, 45);
    if (tt <= 22) {
      const k = clamp(1 - tt / 22, 0, 1);
      const c = lerpColor([100, 190, 255], [210, 230, 255], 1 - k);
      const a = lerp(0, 0.32, k).toFixed(2);
      return `radial-gradient(ellipse 130% 70% at 50% 0%, rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a}), transparent 70%)`;
    }
    const k = (tt - 22) / 23;
    const c = lerpColor([255, 200, 140], [255, 88, 20], k);
    const a = lerp(0, 0.32, k).toFixed(2);
    return `radial-gradient(ellipse 130% 70% at 50% 0%, rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a}), transparent 70%)`;
  });

  // Weight: Bricolage Grotesque variable font-weight 200→800
  const weightFontWeight = useTransform(weightKg, (w) => {
    if (current.category !== "weight") return 400;
    const max = getVisualMax("weight", current.fromUnit);
    return Math.round(lerp(200, 800, clamp(Math.abs(w) / max, 0, 1)));
  });

  // Volume: accent-tinted fill rises from the bottom (0→100% height)
  const volFillHeight = useTransform(volumeLiters, (v) => {
    if (current.category !== "volume") return "0%";
    const max = getVisualMax("volume", current.fromUnit);
    return `${lerp(0, 100, clamp(Math.abs(v) / max, 0, 1)).toFixed(1)}%`;
  });

  // Length: letter-spacing expansion (tight at 0 → open at max)
  const lengthLetterSpacing = useTransform(lengthM, (v) => {
    if (current.category !== "length") return "-0.045em";
    const max = getVisualMax("length", current.fromUnit);
    const t = clamp(Math.abs(v) / max, 0, 1);
    return `${lerp(-0.045, 0.1, t).toFixed(4)}em`;
  });

  // Speed: italic skew — upright at 0 → leaning forward at max
  const speedSkew = useTransform(speedMs, (v) => {
    if (current.category !== "speed") return "0deg";
    const max = getVisualMax("speed", current.fromUnit);
    const t = clamp(Math.abs(v) / max, 0, 1);
    return `${lerp(0, -8, t).toFixed(2)}deg`;
  });

  // Area: outline frame scale (invisible at 0 → full-size at max)
  const areaOutlineScale = useTransform(areaM2, (v) => {
    if (current.category !== "area") return 0;
    const max = getVisualMax("area", current.fromUnit);
    return clamp(Math.abs(v) / max, 0, 1);
  });

  // Currency: emerald fill rises from bottom — intensifies as USD value grows
  const moneyGradient = useTransform(currencyUsd, (usd) => {
    if (current.category !== "currency") return "none";
    const t = clamp(Math.abs(usd) / 10_000, 0, 1);
    const a = lerp(0, 0.22, t).toFixed(2);
    return `linear-gradient(to top, rgba(16, 185, 129, ${a}) 0%, rgba(16, 185, 129, ${(parseFloat(a) * 0.3).toFixed(2)}) 40%, transparent 75%)`;
  });

  return (
    <div style={{ height: "100dvh", touchAction: "pan-y" }}>
      <motion.main
        className="relative h-full flex flex-col overflow-hidden"
        style={{
          background: "var(--color-canvas)",
          color: "var(--color-ink-active)",
          ["--color-accent" as string]:        CATEGORY_ACCENT[active],
          ["--num-font-weight" as string]:     weightFontWeight,
          ["--num-letter-spacing" as string]:  lengthLetterSpacing,
          ["--num-skew" as string]:            speedSkew,
        }}
      >
        {/* Temperature ambient gradient */}
        {current.category === "temperature" && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0"
            style={{ backgroundImage: tempGradient }}
          />
        )}

        {/* Volume rising fill */}
        {current.category === "volume" && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute bottom-0 left-0 right-0 z-0"
            style={{ height: volFillHeight, background: "var(--color-accent)", opacity: 0.06 }}
          />
        )}

        {/* Currency money-green bloom */}
        {current.category === "currency" && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0"
            style={{ backgroundImage: moneyGradient }}
          />
        )}

        {/* Header */}
        <header
          className="relative z-10 flex items-center justify-between"
          style={{ padding: "calc(env(safe-area-inset-top) + 14px) 24px 14px" }}
        >
          <span style={{ fontSize: 10, letterSpacing: "0.24em", fontWeight: 600, color: "var(--color-ink-muted)", textTransform: "uppercase" }}>
            Americanizer
          </span>
          <span style={{ fontSize: 10, letterSpacing: "0.14em", fontWeight: 500, color: "var(--color-accent)", textTransform: "uppercase" }}>
            {current.def.label}
          </span>
        </header>

        {/* Zone 1 — FROM */}
        <ValueRow
          formatted={fromText}
          rawValue={current.fromVal}
          unitSymbol={fromUnitDef.label}
          unitName={fromUnitDef.longLabel}
          active={zone === "from"}
          onActivate={() => setZone("from")}
          onCommit={(n) => setValue("from", n)}
          onOpenPicker={() => current.category !== "temperature" && setDrawer("from")}
          interactive={current.category !== "temperature"}
        />

        {/* Zone 2 — Invisible Trackpad */}
        <section className="relative z-10 flex-1 min-h-0 flex items-center justify-center">
          {/* Area: minimalist 1px outline frame that scales up with value */}
          {current.category === "area" && (
            <motion.div
              aria-hidden
              className="pointer-events-none absolute"
              style={{
                inset: 16,
                border: "1px solid var(--color-accent)",
                scale: areaOutlineScale,
                opacity: areaOutlineScale,
              }}
            />
          )}

          <ScrubDial
            value={zone === "from" ? current.fromVal : current.toVal}
            onDelta={onScrub}
            onReset={resetCategory}
            stepConfig={stepConfig}
          />
          {current.category !== "temperature" && (
            <div className="absolute" style={{ top: 12, right: 16 }}>
              <SwapButton onSwap={swap} accent="var(--color-accent)" />
            </div>
          )}

          {/* Currency rate refresh + age — bottom-left, mirrors mute button on the right */}
          {current.category === "currency" && (
            <div
              className="absolute flex items-center gap-2"
              style={{ left: 16, bottom: 20, zIndex: 20 }}
            >
              <button
                onClick={(e) => { e.stopPropagation(); void refresh(); }}
                onPointerDown={(e) => e.stopPropagation()}
                disabled={isLoading || onCooldown}
                aria-label="Refresh exchange rates"
                style={{
                  width: 28, height: 28, borderRadius: "50%",
                  border: "none", background: "transparent",
                  color: "var(--color-ink-muted)", cursor: isLoading || onCooldown ? "default" : "pointer",
                  opacity: isLoading || onCooldown ? 0.2 : 0.45,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  padding: 0, transition: "opacity 0.2s ease",
                }}
              >
                <svg
                  width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden
                  className={isLoading ? "animate-spin" : ""}
                >
                  <path d="M1 4v6h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M3.51 15a9 9 0 1 0 .49-4.5L1 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {formatRateAge(lastUpdated) && (
                <span style={{
                  fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase",
                  color: "var(--color-ink-muted)", opacity: 0.55, fontWeight: 500,
                  userSelect: "none",
                }}>
                  {formatRateAge(lastUpdated)}
                </span>
              )}
            </div>
          )}
        </section>

        {/* Zone 3 — TO */}
        <ValueRow
          formatted={toText}
          rawValue={current.toVal}
          unitSymbol={toUnitDef.label}
          unitName={toUnitDef.longLabel}
          active={zone === "to"}
          onActivate={() => setZone("to")}
          onCommit={(n) => setValue("to", n)}
          onOpenPicker={() => current.category !== "temperature" && setDrawer("to")}
          interactive={current.category !== "temperature"}
          copyOnFocus
        />

        <CategoryDock active={current.category} onChange={setActive} />

        <footer className="relative z-10 mb-3 flex justify-center">
          <a
            href="https://samirhusain.info"
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 9, letterSpacing: "0.12em", color: "var(--color-ink-muted)", opacity: 0.45 }}
          >
            about the developer
          </a>
        </footer>

        <UnitDrawer
          open={drawer === "from"}
          onOpenChange={(o) => setDrawer(o ? "from" : null)}
          category={current.def}
          selectedUnitId={current.fromUnit}
          title={`${current.def.label} · FROM`}
          accent="var(--color-accent)"
          onSelect={(id) => setUnit("from", id)}
        />
        <UnitDrawer
          open={drawer === "to"}
          onOpenChange={(o) => setDrawer(o ? "to" : null)}
          category={current.def}
          selectedUnitId={current.toUnit}
          title={`${current.def.label} · TO`}
          accent="var(--color-accent)"
          onSelect={(id) => setUnit("to", id)}
        />
      </motion.main>
    </div>
  );
}

function ValueRow({
  formatted,
  rawValue,
  unitSymbol,
  unitName,
  active,
  onActivate,
  onCommit,
  onOpenPicker,
  copyOnFocus,
  interactive,
}: {
  formatted: string;
  rawValue: number;
  unitSymbol: string;
  unitName: string;
  active: boolean;
  onActivate: () => void;
  onCommit: (n: number) => void;
  onOpenPicker: () => void;
  copyOnFocus?: boolean;
  interactive?: boolean;
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
      className="relative z-10 shrink-0 cursor-pointer"
      onClick={onActivate}
      style={{
        padding: "16px 24px 20px",
        opacity: active ? 1 : 0.3,
        transition: "opacity 0.2s ease",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 10,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "var(--color-ink-muted)",
          marginBottom: 10,
          fontWeight: 500,
          textAlign: "center",
        }}
      >
        {unitName}
      </div>

      <div className="flex items-baseline justify-center gap-4 px-2">
        <div
          className="min-w-0"
          onClick={(e) => e.stopPropagation()}
        >
          <NumberDisplay
            className="text-[88px] sm:text-[108px] leading-none"
            formatted={formatted}
            rawValue={rawValue}
            onCommit={onCommit}
            onFocus={copyOnFocus ? handleCopy : undefined}
          />
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <UnitPill
            symbol={copied ? "✓" : unitSymbol}
            onClick={interactive === false ? undefined : onOpenPicker}
            interactive={interactive}
          />
        </div>
      </div>

      {/* Thin accent rule at the base of the active zone */}
      <div
        style={{
          height: 1,
          background: "var(--color-accent)",
          marginTop: 14,
          opacity: active ? 0.7 : 0,
          transition: "opacity 0.2s ease",
        }}
      />
    </section>
  );
}
