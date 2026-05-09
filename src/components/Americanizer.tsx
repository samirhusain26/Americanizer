"use client";

import { useMemo, useState } from "react";
import { useConverter, selectActive, selectCategoryState, type Side } from "@/store/converter";
import { CATEGORIES, convert } from "@/lib/units";
import { formatForUnit } from "@/lib/format";
import NumberDisplay from "./NumberDisplay";
import UnitPill from "./UnitPill";
import UnitDrawer from "./UnitDrawer";
import ScrubDial from "./ScrubDial";
import SwapButton from "./SwapButton";
import CategoryDock from "./CategoryDock";

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

  const fromLabel = current.def.units.find((u) => u.id === current.fromUnit)!.label;
  const toLabel = current.def.units.find((u) => u.id === current.toUnit)!.label;

  return (
    <main className="relative min-h-[100dvh] flex flex-col bg-canvas text-paper overflow-hidden">
      {/* Status row */}
      <header className="px-6 pt-[calc(env(safe-area-inset-top)+18px)] pb-2 flex items-center justify-between">
        <span className="ui-mono uppercase text-[11px] tracking-[0.25em] text-paper/55">
          Americanizer
        </span>
        <span className="ui-mono uppercase text-[11px] tracking-[0.25em] text-paper/55">
          {current.def.label}
        </span>
      </header>

      {/* Zone 1 — FROM */}
      <section className="px-6 pt-6">
        <div className="flex items-end gap-3">
          <NumberDisplay
            className="text-[6.5rem] sm:text-[8rem] flex-1 min-w-0"
            formatted={fromText}
            rawValue={current.fromVal}
            onCommit={(n) => setValue("from", n)}
          />
          <UnitPill label={fromLabel} onClick={() => setDrawer("from")} className="mb-3" />
        </div>
      </section>

      {/* Zone 2 — engine */}
      <section className="flex-1 flex flex-col items-center justify-center gap-4">
        <ScrubDial value={current.fromVal} onDelta={(d) => setValue("from", current.fromVal + d)} />
        <SwapButton onSwap={swap} />
      </section>

      {/* Zone 3 — TO */}
      <section className="px-6 pb-2">
        <div className="flex items-end gap-3">
          <NumberDisplay
            className="text-[6.5rem] sm:text-[8rem] flex-1 min-w-0 text-paper/85"
            formatted={toText}
            rawValue={current.toVal}
            onCommit={(n) => setValue("to", n)}
          />
          <UnitPill label={toLabel} onClick={() => setDrawer("to")} className="mb-3" />
        </div>
      </section>

      {/* Dock */}
      <CategoryDock active={current.category} onChange={setActive} />

      {/* Drawers */}
      <UnitDrawer
        open={drawer === "from"}
        onOpenChange={(o) => setDrawer(o ? "from" : null)}
        category={current.def}
        selectedUnitId={current.fromUnit}
        title={`${current.def.label} — From`}
        onSelect={(id) => setUnit("from", id)}
      />
      <UnitDrawer
        open={drawer === "to"}
        onOpenChange={(o) => setDrawer(o ? "to" : null)}
        category={current.def}
        selectedUnitId={current.toUnit}
        title={`${current.def.label} — To`}
        onSelect={(id) => setUnit("to", id)}
      />
    </main>
  );
}
