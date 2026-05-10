"use client";

import { motion } from "framer-motion";
import clsx from "clsx";
import { CATEGORIES, CATEGORY_ORDER, type CategoryId } from "@/lib/units";
import { clickHaptic } from "@/lib/haptics";

const ACCENTS: Record<CategoryId, string> = {
  temperature: "var(--color-orange)",
  weight: "var(--color-lime)",
  length: "var(--color-cyan)",
  volume: "var(--color-yellow)",
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
        className="relative grid grid-cols-4 gap-2 p-2 rounded-2xl chassis"
        style={{ boxShadow: "var(--shadow-hard)" }}
      >
        {CATEGORY_ORDER.map((id) => {
          const isActive = id === active;
          const label = CATEGORIES[id].label.slice(0, 4).toUpperCase();
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
              className={clsx(
                "relative h-11 rounded-xl ui-mono uppercase text-[11px] tracking-[0.16em]",
                "flex items-center justify-center",
                "border-[1.5px] border-ink/0"
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="dock-active"
                  className="absolute inset-0 rounded-xl"
                  style={{
                    background: ACCENTS[id],
                    border: "1.5px solid var(--color-ink)",
                    boxShadow: "var(--shadow-hard-sm)",
                  }}
                  transition={{ type: "spring", stiffness: 520, damping: 40 }}
                />
              )}
              <span
                className={clsx(
                  "relative",
                  isActive ? "text-ink font-semibold" : "text-[color:var(--color-ink-soft)]"
                )}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
