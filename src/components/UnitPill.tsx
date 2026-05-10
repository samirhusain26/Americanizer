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
        "px-4 py-2 rounded-full",
        "chip chip-press transition-[transform,box-shadow] duration-75",
        "flex items-center gap-2 text-[14px]",
        className
      )}
    >
      <span
        className="w-2.5 h-2.5 rounded-full shrink-0"
        style={{ background: accentColor, border: "1px solid var(--color-ink)" }}
      />
      <span>{label}</span>
      {symbol ? (
        <span
          className="ml-1 px-1.5 py-0.5 rounded-md text-[11px] tracking-[0.05em]"
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
