"use client";

import { motion } from "framer-motion";
import { clickHaptic } from "@/lib/haptics";

export default function SwapButton({
  onSwap,
  accent = "var(--color-orange)",
}: {
  onSwap: () => void;
  accent?: string;
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.94, rotate: 180 }}
      transition={{ type: "spring", stiffness: 420, damping: 22 }}
      onClick={() => {
        clickHaptic(0.6);
        onSwap();
      }}
      aria-label="Swap units"
      className="w-12 h-12 grid place-items-center chip chip-press"
      style={{ background: "var(--color-shell)" }}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
        <path d="M5 3v10m0 0l-3-3m3 3l3-3" stroke="var(--color-ink)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15 17V7m0 0l-3 3m3-3l3 3" stroke={accent} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </motion.button>
  );
}
