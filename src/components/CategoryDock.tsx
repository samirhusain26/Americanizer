"use client";

import { motion } from "framer-motion";
import clsx from "clsx";
import { CATEGORIES, CATEGORY_ORDER, type CategoryId } from "@/lib/units";
import { clickHaptic } from "@/lib/haptics";

interface CategoryDockProps {
  active: CategoryId;
  onChange: (c: CategoryId) => void;
}

export default function CategoryDock({ active, onChange }: CategoryDockProps) {
  return (
    <div className="px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-2">
      <div
        className="relative grid grid-cols-4 gap-1 p-1 rounded-full bg-paper/5 border border-paper/10 backdrop-blur"
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
              className={clsx(
                "relative z-10 py-2.5 rounded-full ui-mono uppercase text-[11px] tracking-[0.18em] transition-colors",
                isActive ? "text-canvas" : "text-paper/70 hover:text-paper"
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="dock-active"
                  className="absolute inset-0 rounded-full bg-paper"
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                />
              )}
              <span className="relative">{CATEGORIES[id].label.slice(0, 4)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
