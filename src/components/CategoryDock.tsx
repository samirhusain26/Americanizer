"use client";

import { motion } from "framer-motion";
import { CATEGORY_ORDER, type CategoryId } from "@/lib/units";
import { clickHaptic } from "@/lib/haptics";

const LABELS: Record<CategoryId, string> = {
  temperature: "Temp",
  currency:    "FX",
  weight:      "Mass",
  length:      "Dist",
  volume:      "Vol",
  speed:       "Speed",
  area:        "Area",
};

interface CategoryDockProps {
  active: CategoryId;
  onChange: (c: CategoryId) => void;
}

export default function CategoryDock({ active, onChange }: CategoryDockProps) {
  return (
    <div
      style={{
        paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)",
        paddingTop: 12,
      }}
    >
      <div className="flex items-end">
        {CATEGORY_ORDER.map((id, index) => {
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
              className="relative flex flex-1 flex-col items-center"
              style={{
                paddingBottom: 8,
                paddingTop: 4,
                borderLeft: index > 0 ? "1px solid rgba(163,163,163,0.25)" : "none",
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? "var(--color-ink-active)" : "var(--color-ink-muted)",
                  transition: "color 0.15s ease",
                }}
              >
                {LABELS[id]}
              </span>

              {/* Animated 2px underline slides between active categories */}
              {isActive && (
                <motion.div
                  layoutId="category-indicator"
                  className="absolute bottom-0 left-1 right-1"
                  style={{
                    height: 2,
                    background: "var(--color-accent)",
                    borderRadius: 1,
                  }}
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
