"use client";

import clsx from "clsx";

export default function UnitPill({
  symbol,
  onClick,
  className,
  interactive = true,
}: {
  symbol: string;
  onClick?: () => void;
  className?: string;
  interactive?: boolean;
}) {
  const sharedStyle = {
    fontSize: 15,
    fontWeight: 500,
    letterSpacing: "0.04em",
    color: "var(--color-ink-muted)",
  };

  if (!interactive) {
    return (
      <div
        className={clsx("inline-flex items-center leading-none", className)}
        style={sharedStyle}
      >
        {symbol}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx("inline-flex items-center gap-1 leading-none", className)}
      style={sharedStyle}
    >
      <span>{symbol}</span>
      <svg width="9" height="9" viewBox="0 0 10 10" style={{ opacity: 0.45 }} aria-hidden>
        <path d="M2 4 L5 7 L8 4" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
