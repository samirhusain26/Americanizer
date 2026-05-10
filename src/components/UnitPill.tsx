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
        "ui-mono uppercase tracking-[0.08em] font-semibold",
        "px-2.5 py-2 rounded-xl",
        "chip chip-press transition-[transform,box-shadow] duration-75",
        "flex flex-col items-center gap-1 text-[11px] leading-none",
        className
      )}
    >
      {symbol ? (
        <span
          className="px-1.5 py-0.5 rounded-md text-[13px] tracking-[0.03em] font-bold"
          style={{
            background: "var(--color-ink)",
            color: "var(--color-shell)",
          }}
        >
          {symbol}
        </span>
      ) : (
        <span
          className="w-2 h-2 rounded-full"
          style={{ background: accentColor, border: "1px solid var(--color-ink)" }}
        />
      )}
      <span className="text-[10px]">{label}</span>
    </button>
  );
}
