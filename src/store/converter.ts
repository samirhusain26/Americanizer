"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CATEGORIES, convert, type CategoryId } from "@/lib/units";

export type Side = "from" | "to";

interface CategoryState {
  fromUnit: string;
  toUnit: string;
  /** Authoritative value, expressed in the FROM unit. */
  value: number;
}

interface ConverterState {
  active: CategoryId;
  perCategory: Record<CategoryId, CategoryState>;

  setActive: (c: CategoryId) => void;

  /** Set value at a side; the other side recomputes via convert(). */
  setValue: (side: Side, next: number) => void;

  /** Replace the unit at a side. The displayed numeric on that side is preserved
   *  by recomputing the underlying FROM-value so the OTHER side stays stable. */
  setUnit: (side: Side, unitId: string) => void;

  /** Swap from/to units (and hence the displayed sides). */
  swap: () => void;

  /** Reset the active category to its human-baseline defaults. */
  resetCategory: () => void;
}

const HUMAN_BASELINE: Record<CategoryId, CategoryState> = {
  temperature: { fromUnit: "c",   toUnit: "f",    value: 22 },
  currency:    { fromUnit: "usd", toUnit: "inr",  value: 100 },
  weight:      { fromUnit: "kg",  toUnit: "lb",   value: 70 },
  length:      { fromUnit: "m",   toUnit: "in",   value: 1 },
  volume:      { fromUnit: "l",   toUnit: "floz", value: 1 },
  speed:       { fromUnit: "kmh", toUnit: "mph",  value: 100 },
  area:        { fromUnit: "m2",  toUnit: "ft2",  value: 100 },
};

function clampToMin(active: CategoryId, fromUnitId: string, value: number): number {
  const cat = CATEGORIES[active];
  if (cat.minInBase === undefined) return value;
  const fromUnit = cat.units.find((u) => u.id === fromUnitId);
  if (!fromUnit) return value;
  return Math.max(fromUnit.fromBase(cat.minInBase), value);
}

export const useConverter = create<ConverterState>()(
  persist(
    (set, get) => ({
      active: "temperature",
      perCategory: HUMAN_BASELINE,

      setActive: (c) => set({ active: c }),

      setValue: (side, next) => {
        const { active, perCategory } = get();
        const cur = perCategory[active];
        const raw =
          side === "from"
            ? next
            : convert(active, next, cur.toUnit, cur.fromUnit);
        const valueFrom = clampToMin(active, cur.fromUnit, raw);
        set({
          perCategory: { ...perCategory, [active]: { ...cur, value: valueFrom } },
        });
      },

      setUnit: (side, unitId) => {
        const { active, perCategory } = get();
        const cur = perCategory[active];
        if (side === "from") {
          // Preserve the displayed FROM number; value stays in NEW from-unit — but clamp it.
          const value = clampToMin(active, unitId, cur.value);
          set({ perCategory: { ...perCategory, [active]: { ...cur, fromUnit: unitId, value } } });
        } else {
          // Preserve the displayed TO number, so the FROM value must be recomputed.
          const displayedTo = convert(active, cur.value, cur.fromUnit, cur.toUnit);
          const newFromValue = clampToMin(active, cur.fromUnit, convert(active, displayedTo, unitId, cur.fromUnit));
          set({
            perCategory: {
              ...perCategory,
              [active]: { ...cur, toUnit: unitId, value: newFromValue },
            },
          });
        }
      },

      swap: () => {
        const { active, perCategory } = get();
        const cur = perCategory[active];
        const newValueInFrom = clampToMin(
          active,
          cur.toUnit,
          convert(active, cur.value, cur.fromUnit, cur.toUnit)
        );
        set({
          perCategory: {
            ...perCategory,
            [active]: {
              fromUnit: cur.toUnit,
              toUnit: cur.fromUnit,
              value: newValueInFrom,
            },
          },
        });
      },

      resetCategory: () => {
        const { active, perCategory } = get();
        set({ perCategory: { ...perCategory, [active]: HUMAN_BASELINE[active] } });
      },
    }),
    {
      name: "americanizer:v1",
      partialize: (s) => ({ active: s.active, perCategory: s.perCategory }),
      // Spread defaults first so any category added after a prior save gets its baseline.
      merge: (persisted, current) => {
        const p = persisted as { active?: CategoryId; perCategory?: Partial<Record<CategoryId, CategoryState>> };
        return {
          ...current,
          ...(p.active ? { active: p.active } : {}),
          perCategory: { ...current.perCategory, ...p.perCategory },
        };
      },
    }
  )
);

export const selectActive = (s: ConverterState) => s.active;
export const selectCategoryState = (s: ConverterState) =>
  s.perCategory[s.active] ?? HUMAN_BASELINE[s.active];
