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
}

const HUMAN_BASELINE: Record<CategoryId, CategoryState> = {
  temperature: { fromUnit: "c", toUnit: "f", value: 22 },
  weight:      { fromUnit: "kg", toUnit: "lb", value: 70 },
  length:      { fromUnit: "m", toUnit: "in", value: 1 },
  volume:      { fromUnit: "l", toUnit: "floz", value: 1 },
};

export const useConverter = create<ConverterState>()(
  persist(
    (set, get) => ({
      active: "temperature",
      perCategory: HUMAN_BASELINE,

      setActive: (c) => set({ active: c }),

      setValue: (side, next) => {
        const { active, perCategory } = get();
        const cur = perCategory[active];
        const valueFrom =
          side === "from"
            ? next
            : convert(active, next, cur.toUnit, cur.fromUnit);
        set({
          perCategory: { ...perCategory, [active]: { ...cur, value: valueFrom } },
        });
      },

      setUnit: (side, unitId) => {
        const { active, perCategory } = get();
        const cur = perCategory[active];
        if (side === "from") {
          // Preserve the displayed FROM number; recompute nothing — value stays in NEW from-unit.
          // (Visually the FROM number stays the same, the TO number recomputes.)
          set({ perCategory: { ...perCategory, [active]: { ...cur, fromUnit: unitId } } });
        } else {
          // Preserve the displayed TO number, so the FROM value must be recomputed.
          const displayedTo = convert(active, cur.value, cur.fromUnit, cur.toUnit);
          const newFromValue = convert(active, displayedTo, unitId, cur.fromUnit);
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
        const newValueInFrom = convert(active, cur.value, cur.fromUnit, cur.toUnit);
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
    }),
    {
      name: "americanizer:v1",
      // Hydration safety: only persist what we need.
      partialize: (s) => ({ active: s.active, perCategory: s.perCategory }),
    }
  )
);

export const selectActive = (s: ConverterState) => s.active;
export const selectCategoryState = (s: ConverterState) => s.perCategory[s.active];
