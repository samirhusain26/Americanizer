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
        <Drawer.Overlay className="fixed inset-0 bg-ink/50 z-40" />
        <Drawer.Content
          className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl outline-none"
          style={{
            background: "var(--color-shell)",
            borderTop: "1.5px solid var(--color-ink)",
            borderLeft: "1.5px solid var(--color-ink)",
            borderRight: "1.5px solid var(--color-ink)",
            boxShadow: "0 -6px 0 0 var(--color-ink)",
          }}
        >
          <Drawer.Title className="sr-only">{title}</Drawer.Title>
          <Drawer.Description className="sr-only">Select a unit</Drawer.Description>
          <div
            className="mx-auto w-14 h-1.5 rounded-full mt-3"
            style={{ background: "var(--color-ink)" }}
          />
          <div className="px-6 pt-5 pb-3 ui-mono uppercase tracking-[0.2em] text-[11px] text-[color:var(--color-ink-soft)] rule-b">
            {title}
          </div>
          <ul className="px-3 py-3 pb-8 max-h-[70vh] overflow-y-auto space-y-2">
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
                      "border-[1.5px] transition-[transform,box-shadow] duration-75",
                      active
                        ? "chip-press"
                        : ""
                    )}
                    style={{
                      background: active ? "var(--color-orange)" : "var(--color-shell-2)",
                      borderColor: "var(--color-ink)",
                      boxShadow: active ? "var(--shadow-hard-sm)" : "2px 2px 0 0 rgba(20,20,15,0.35)",
                    }}
                  >
                    <span className="num-display text-2xl">{u.longLabel}</span>
                    <span className="flex items-center gap-3">
                      <span
                        className="ui-mono uppercase text-[10px] tracking-[0.2em] px-2 py-1 rounded-full"
                        style={{
                          background: u.system === "us" ? "var(--color-ink)" : "var(--color-shell-3)",
                          color: u.system === "us" ? "var(--color-shell)" : "var(--color-ink)",
                          border: "1.5px solid var(--color-ink)",
                        }}
                      >
                        {u.system === "metric" ? "metric" : "us"}
                      </span>
                      <span className="ui-mono min-w-12 text-right">{u.label}</span>
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
