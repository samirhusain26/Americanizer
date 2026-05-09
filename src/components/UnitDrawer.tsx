"use client";

import { Drawer } from "vaul";
import type { CategoryDef } from "@/lib/units";
import clsx from "clsx";

interface UnitDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: CategoryDef;
  selectedUnitId: string;
  title: string;
  onSelect: (unitId: string) => void;
}

export default function UnitDrawer({
  open,
  onOpenChange,
  category,
  selectedUnitId,
  title,
  onSelect,
}: UnitDrawerProps) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/60 z-40" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-[#1a1813] text-paper rounded-t-3xl outline-none">
          <Drawer.Title className="sr-only">{title}</Drawer.Title>
          <Drawer.Description className="sr-only">Select a unit</Drawer.Description>
          <div className="mx-auto w-12 h-1.5 rounded-full bg-paper/20 mt-3" />
          <div className="px-6 pt-4 pb-2 ui-mono uppercase tracking-[0.2em] text-[11px] text-paper/60">
            {title}
          </div>
          <ul className="px-2 pb-8 max-h-[70vh] overflow-y-auto">
            {category.units.map((u) => {
              const active = u.id === selectedUnitId;
              return (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(u.id);
                      onOpenChange(false);
                    }}
                    className={clsx(
                      "w-full flex items-baseline justify-between px-4 py-4 rounded-2xl",
                      "transition-colors",
                      active ? "bg-paper/10" : "hover:bg-paper/5"
                    )}
                  >
                    <span className="num-display text-2xl">{u.longLabel}</span>
                    <span className="flex items-center gap-3">
                      <span
                        className={clsx(
                          "ui-mono uppercase text-[10px] tracking-[0.2em]",
                          "px-2 py-1 rounded-full border",
                          u.system === "metric"
                            ? "border-paper/15 text-paper/70"
                            : "border-[color:var(--color-accent)]/40 text-[color:var(--color-accent)]"
                        )}
                      >
                        {u.system === "metric" ? "metric" : "us"}
                      </span>
                      <span className="ui-mono text-paper/80 min-w-12 text-right">{u.label}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
