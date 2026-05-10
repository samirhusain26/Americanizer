"use client";

import { Drawer } from "vaul";
import type { CategoryDef } from "@/lib/units";

interface UnitDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: CategoryDef;
  selectedUnitId: string;
  title: string;
  accent: string;
  onSelect: (unitId: string) => void;
}

export default function UnitDrawer({
  open,
  onOpenChange,
  category,
  selectedUnitId,
  title,
  accent,
  onSelect,
}: UnitDrawerProps) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40" style={{ background: "rgba(20,20,15,0.55)" }} />
        <Drawer.Content
          className="fixed bottom-0 left-0 right-0 z-50 outline-none"
          style={{
            background: "var(--color-shell)",
            color: "var(--color-ink)",
            borderTop: "1.5px solid var(--color-ink)",
          }}
        >
          <Drawer.Title className="sr-only">{title}</Drawer.Title>
          <Drawer.Description className="sr-only">Select a unit</Drawer.Description>

          <div
            className="ui-mono uppercase flex justify-between items-center"
            style={{
              padding: "14px 18px",
              background: "var(--color-shell-2)",
              borderBottom: "1.5px solid var(--color-ink)",
              fontSize: 11,
              letterSpacing: "0.22em",
            }}
          >
            <span className="flex items-center gap-2">
              <span
                style={{
                  width: 8,
                  height: 8,
                  background: accent,
                  border: "1.5px solid var(--color-ink)",
                  display: "inline-block",
                }}
              />
              {title}
            </span>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="ui-mono chip chip-press"
              style={{
                background: "var(--color-shell)",
                color: "var(--color-ink)",
                padding: "6px 10px",
                fontSize: 10,
              }}
            >
              CLOSE ✕
            </button>
          </div>

          <div
            className="overflow-y-auto pb-8"
            style={{ maxHeight: "min(70vh, 380px)" }}
          >
            {category.units.map((u) => {
              const sel = u.id === selectedUnitId;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    onSelect(u.id);
                    onOpenChange(false);
                  }}
                  className="w-full flex items-center justify-between text-left"
                  style={{
                    padding: "14px 18px",
                    border: "none",
                    borderBottom: "1px solid var(--color-shell-3)",
                    background: sel ? "var(--color-shell-2)" : "transparent",
                    color: "var(--color-ink)",
                  }}
                >
                  <span className="flex items-center gap-3.5">
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        background: sel ? accent : "transparent",
                        border: "1.5px solid var(--color-ink)",
                        display: "inline-block",
                      }}
                    />
                    <span className="num-display" style={{ fontSize: 22, fontWeight: 600 }}>
                      {u.longLabel}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span
                      className="ui-mono uppercase"
                      style={{
                        fontSize: 10,
                        color: "var(--color-ink-soft)",
                        letterSpacing: "0.18em",
                        border: "1px solid var(--color-ink-soft)",
                        padding: "2px 6px",
                      }}
                    >
                      {u.system === "metric" ? "METRIC" : "US"}
                    </span>
                    <span
                      className="ui-mono"
                      style={{
                        fontSize: 16,
                        fontWeight: 600,
                        minWidth: 56,
                        textAlign: "right",
                      }}
                    >
                      {u.label}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
