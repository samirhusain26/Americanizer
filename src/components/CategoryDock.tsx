"use client";

import { CATEGORIES, CATEGORY_ORDER, type CategoryId } from "@/lib/units";
import { clickHaptic } from "@/lib/haptics";

const ACCENTS: Record<CategoryId, string> = {
  temperature: "var(--color-orange)",
  weight:      "var(--color-lime)",
  length:      "var(--color-cyan)",
  volume:      "var(--color-yellow)",
  speed:       "var(--color-purple)",
  area:        "var(--color-rose)",
};

const SHORT: Record<CategoryId, string> = {
  temperature: "TEMP",
  weight:      "MASS",
  length:      "DIST",
  volume:      "VOL",
  speed:       "SPD",
  area:        "AREA",
};

interface CategoryDockProps {
  active: CategoryId;
  onChange: (c: CategoryId) => void;
}

export default function CategoryDock({ active, onChange }: CategoryDockProps) {
  return (
    <div
      className="px-4 pb-[calc(env(safe-area-inset-bottom)+14px)] pt-3 rule-t"
      style={{ background: "var(--color-shell-2)" }}
    >
      <div
        className="grid grid-cols-3 gap-1.5 p-1.5 chassis"
        style={{ boxShadow: "var(--shadow-hard)" }}
      >
        {CATEGORY_ORDER.map((id) => {
          const isActive = id === active;
          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                if (id !== active) {
                  clickHaptic(0.4);
                  onChange(id);
                }
              }}
              className="ui-mono uppercase flex flex-col items-center justify-center gap-0.5"
              style={{
                height: 44,
                border: "1.5px solid var(--color-ink)",
                background: isActive ? ACCENTS[id] : "var(--color-shell)",
                color: isActive ? "var(--color-ink)" : "var(--color-ink-soft)",
                boxShadow: isActive ? "var(--shadow-hard-sm)" : "none",
                fontWeight: isActive ? 700 : 500,
                transition: "background 0.1s, color 0.1s",
              }}
            >
              <span style={{ fontSize: 10, letterSpacing: "0.18em" }}>{SHORT[id]}</span>
              <span
                style={{
                  fontSize: 8,
                  letterSpacing: "0.1em",
                  textTransform: "none",
                  opacity: isActive ? 0.65 : 0.55,
                  fontWeight: 500,
                }}
              >
                {CATEGORIES[id].label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
