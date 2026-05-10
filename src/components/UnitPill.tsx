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
        "ui-mono uppercase text-[18px] tracking-[0.12em] font-semibold",
        "px-5 py-2.5 rounded-full",
        "chip chip-press transition-[transform,box-shadow] duration-75",
        "flex items-center gap-2",
        className
      )}
    >
      <span
        className="w-2.5 h-2.5 rounded-full"
        style={{ background: accentColor, border: "1px solid var(--color-ink)" }}
      />
      <span>{label}</span>
    </button>
  );
}
