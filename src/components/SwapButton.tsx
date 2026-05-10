"use client";

import { motion } from "framer-motion";
import { clickHaptic } from "@/lib/haptics";

export default function SwapButton({ onSwap }: { onSwap: () => void }) {
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
      className="w-12 h-12 rounded-full grid place-items-center chip chip-press"
      style={{ background: "var(--color-lime)" }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M7 4 L7 20 M7 4 L3 8 M7 4 L11 8" stroke="var(--color-ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M17 20 L17 4 M17 20 L13 16 M17 20 L21 16" stroke="var(--color-ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </motion.button>
  );
}
