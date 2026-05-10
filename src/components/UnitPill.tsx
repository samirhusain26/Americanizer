"use client";

import clsx from "clsx";

export default function UnitPill({
  symbol,
  onClick,
  className,
}: {
  symbol: string;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "ui-mono font-semibold",
        "chip chip-press",
        "inline-flex items-center gap-1.5 leading-none",
        "px-2.5 py-2 shrink-0",
        className
      )}
      style={{
        background: "var(--color-shell)",
        color: "var(--color-ink)",
        fontSize: 14,
      }}
    >
      <span>{symbol}</span>
      <svg width="10" height="10" viewBox="0 0 10 10" style={{ opacity: 0.7 }} aria-hidden>
        <path d="M2 4 L5 7 L8 4" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
