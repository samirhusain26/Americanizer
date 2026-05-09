"use client";

import clsx from "clsx";

export default function UnitPill({
  label,
  onClick,
  className,
}: {
  label: string;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "ui-mono uppercase text-[11px] tracking-[0.18em]",
        "px-3 py-1.5 rounded-full",
        "bg-paper/8 text-paper/80 hover:text-paper",
        "border border-paper/10 hover:border-paper/25",
        "transition-colors active:scale-[0.97]",
        className
      )}
    >
      {label}
    </button>
  );
}
