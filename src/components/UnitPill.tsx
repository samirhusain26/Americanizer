"use client";

import clsx from "clsx";

export default function UnitPill({
  label,
  onClick,
  className,
  accent = "orange",
}: {
  label: string;
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
        "ui-mono uppercase text-[12px] tracking-[0.14em]",
        "px-4 py-2 rounded-full",
        "chip chip-press transition-[transform,box-shadow] duration-75",
        "flex items-center gap-2",
        className
      )}
    >
      <span
        className="w-2 h-2 rounded-full"
        style={{ background: accentColor, border: "1px solid var(--color-ink)" }}
      />
      <span>{label}</span>
    </button>
  );
}
