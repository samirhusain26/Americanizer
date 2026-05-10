"use client";

import { useMemo, useState } from "react";
import { useConverter, selectActive, selectCategoryState, type Side } from "@/store/converter";
import { CATEGORIES, convert, type CategoryId } from "@/lib/units";
import { formatForUnit } from "@/lib/format";
import NumberDisplay from "./NumberDisplay";
import UnitPill from "./UnitPill";
import UnitDrawer from "./UnitDrawer";
import ScrubDial from "./ScrubDial";
import SwapButton from "./SwapButton";
import CategoryDock from "./CategoryDock";

const ACCENT_BY_CATEGORY: Record<CategoryId, "orange" | "lime" | "cyan"> = {
  temperature: "orange",
  weight: "lime",
  length: "cyan",
  volume: "orange",
};

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

  const fromText = formatForUnit(current.category, current.fromUnit, current.fromVal);
  const toText = formatForUnit(current.category, current.toUnit, current.toVal);

  const fromUnitDef = current.def.units.find((u) => u.id === current.fromUnit)!;
  const toUnitDef = current.def.units.find((u) => u.id === current.toUnit)!;
  const fromLabel = fromUnitDef.longLabel;
  const toLabel = toUnitDef.longLabel;
  const fromSymbol = fromUnitDef.label;
  const toSymbol = toUnitDef.label;
  const accent = ACCENT_BY_CATEGORY[current.category];

  return (
    <main
      className="relative min-h-[100dvh] flex flex-col overflow-hidden"
      style={{ background: "var(--color-shell)", color: "var(--color-ink)" }}
    >
      {/* Chassis header */}
      <header
        className="px-5 pt-[calc(env(safe-area-inset-top)+14px)] pb-3 flex items-center justify-between rule-b"
        style={{ background: "var(--color-shell-2)" }}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: "var(--color-orange)", border: "1px solid var(--color-ink)" }}
          />
          <span className="ui-mono uppercase text-[11px] tracking-[0.28em]">
            AMERICANIZER
          </span>
        </div>
        <span className="ui-mono uppercase text-[10px] tracking-[0.28em] text-[color:var(--color-ink-soft)]">
          {current.def.label} / v1
        </span>
      </header>

      {/* Zone 1 — FROM screen */}
      <section className="px-5 pt-5 pb-5 rule-b">
        <div className="flex items-center justify-end mb-2">
          <UnitPill
            label={fromLabel}
            symbol={fromSymbol}
            onClick={() => setDrawer("from")}
            accent={accent}
          />
        </div>
        <div
          className="lcd rounded-2xl px-5 py-5"
          style={{ border: "1.5px solid var(--color-ink)" }}
        >
          <NumberDisplay
            className="text-[5rem] sm:text-[6.5rem] leading-none"
            formatted={fromText}
            rawValue={current.fromVal}
            onCommit={(n) => setValue("from", n)}
          />
        </div>
      </section>

      {/* Zone 2 — engine */}
      <section
        className="flex-1 flex items-center justify-center gap-6 py-6 rule-b"
        style={{ background: "var(--color-shell-2)" }}
      >
        <ScrubDial value={current.fromVal} onDelta={(d) => setValue("from", current.fromVal + d)} />
        <div className="flex flex-col items-center gap-3">
          <SwapButton onSwap={swap} />
          <span className="ui-mono uppercase text-[9px] tracking-[0.28em] text-[color:var(--color-ink-soft)]">
            SWAP
          </span>
        </div>
      </section>

      {/* Zone 3 — TO screen */}
      <section className="px-5 pt-5 pb-5 rule-b">
        <div className="flex items-center justify-end mb-2">
          <UnitPill
            label={toLabel}
            symbol={toSymbol}
            onClick={() => setDrawer("to")}
            accent={accent}
          />
        </div>
        <div
          className="lcd rounded-2xl px-5 py-5"
          style={{ border: "1.5px solid var(--color-ink)" }}
        >
          <NumberDisplay
            className="text-[5rem] sm:text-[6.5rem] leading-none"
            formatted={toText}
            rawValue={current.toVal}
            onCommit={(n) => setValue("to", n)}
          />
        </div>
      </section>

      <CategoryDock active={current.category} onChange={setActive} />

      <UnitDrawer
        open={drawer === "from"}
        onOpenChange={(o) => setDrawer(o ? "from" : null)}
        category={current.def}
        selectedUnitId={current.fromUnit}
        title={current.def.label}
        onSelect={(id) => setUnit("from", id)}
      />
      <UnitDrawer
        open={drawer === "to"}
        onOpenChange={(o) => setDrawer(o ? "to" : null)}
        category={current.def}
        selectedUnitId={current.toUnit}
        title={current.def.label}
        onSelect={(id) => setUnit("to", id)}
      />
    </main>
  );
}
