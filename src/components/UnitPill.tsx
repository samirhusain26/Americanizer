"use client";

import clsx from "clsx";

export default function UnitPill({
  label,
  symbol,
  onClick,
  className,
  accent = "orange",
}: {
  label: string;
  symbol?: string;
  onClick?: () => void;
  className?: string;
  accent?: "orange" | "lime" | "cyan";
}) {
  const accentColor =
    accent === "lime" ? "var(--color-lime)"
    : accent === "cyan" ? "var(--color-cyan)"
    : "var(--color-orange)";

  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "ui-mono uppercase tracking-[0.1em] font-semibold",
        "px-3 py-1.5 rounded-full",
        "chip chip-press transition-[transform,box-shadow] duration-75",
        "inline-flex items-center gap-1.5 text-[11px] leading-none",
        className
      )}
    >
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ background: accentColor, border: "1px solid var(--color-ink)" }}
      />
      <span>{label}</span>
      {symbol ? (
        <span
          className="px-1 py-0.5 rounded text-[10px] tracking-[0.03em] font-bold"
          style={{
            background: "var(--color-ink)",
            color: "var(--color-shell)",
          }}
        >
          {symbol}
        </span>
      ) : null}
    </button>
  );
}
