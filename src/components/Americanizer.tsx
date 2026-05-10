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

const ACCENT_BY_CATEGORY: Record<CategoryId, string> = {
  temperature: "var(--color-orange)",
  weight: "var(--color-lime)",
  length: "var(--color-cyan)",
  volume: "var(--color-yellow)",
};

type ActiveZone = "from" | "to";

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

  return (
    <main
      className="relative h-[100dvh] flex flex-col overflow-hidden"
      style={{ background: "var(--color-shell)", color: "var(--color-ink)", ["--accent" as string]: accent }}
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
    </main>
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
      {/* meta line — active dot + unit name */}
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

      {/* LCD */}
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
