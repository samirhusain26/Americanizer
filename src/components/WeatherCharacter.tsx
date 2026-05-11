"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useConverter, selectActive } from "@/store/converter";
import { CATEGORIES } from "@/lib/units";

type TempState = "cold" | "neutral" | "hot";

const WEATHER_ICON: Record<TempState, string> = {
  cold:    "/meteocons/overcast-day-snow.svg",
  neutral: "/meteocons/partly-cloudy-day.svg",
  hot:     "/meteocons/sun-hot.svg",
};

const STATE_LABEL: Record<TempState, string> = {
  cold: "COLD", neutral: "MILD", hot: "HOT",
};

const variants = {
  initial: { opacity: 0, scale: 1.1,  y: -4 },
  animate: { opacity: 1, scale: 1,    y: 0,
    transition: { type: "spring" as const, stiffness: 440, damping: 22, mass: 0.8 } },
  exit:    { opacity: 0, scale: 0.88, y: 4,
    transition: { duration: 0.11, ease: "easeIn" as const } },
};

function ColdCharacter() {
  return (
    <motion.g
      animate={{ x: [0, -1.5, 1.5, -1.5, 0] }}
      transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.3 }}
    >
      {/* Hood arc behind head */}
      <path d="M25 22 Q25 5 40 5 Q55 5 55 22" fill="var(--color-orange)" stroke="var(--color-ink)" strokeWidth="1.5" strokeLinejoin="round" />
      {/* Head */}
      <circle cx="40" cy="22" r="14" fill="var(--color-shell-2)" stroke="var(--color-ink)" strokeWidth="1.5" />
      {/* Left eye */}
      <rect x="33" y="17" width="4" height="4" rx="1" fill="var(--color-ink)" />
      {/* Right eye */}
      <rect x="43" y="17" width="4" height="4" rx="1" fill="var(--color-ink)" />
      {/* Worried mouth */}
      <path d="M34 28 Q40 25 46 28" stroke="var(--color-ink)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* Scarf */}
      <rect x="27" y="34" width="26" height="6" rx="2" fill="var(--color-orange)" stroke="var(--color-ink)" strokeWidth="1.5" />
      {/* Parka body */}
      <rect x="21" y="39" width="38" height="27" rx="3" fill="var(--color-shell-2)" stroke="var(--color-ink)" strokeWidth="1.5" />
      {/* Parka collar accent */}
      <rect x="21" y="39" width="38" height="9" rx="3" fill="var(--color-orange)" stroke="var(--color-ink)" strokeWidth="1.5" />
      {/* Zip line */}
      <line x1="40" y1="48" x2="40" y2="64" stroke="var(--color-ink)" strokeWidth="1" strokeDasharray="2 2" />
      {/* Left arm tucked */}
      <rect x="9" y="43" width="12" height="9" rx="2" fill="var(--color-shell-2)" stroke="var(--color-ink)" strokeWidth="1.5" />
      {/* Right arm tucked */}
      <rect x="59" y="43" width="12" height="9" rx="2" fill="var(--color-shell-2)" stroke="var(--color-ink)" strokeWidth="1.5" />
      {/* Left leg */}
      <rect x="27" y="66" width="11" height="18" rx="2" fill="var(--color-shell-2)" stroke="var(--color-ink)" strokeWidth="1.5" />
      {/* Right leg */}
      <rect x="42" y="66" width="11" height="18" rx="2" fill="var(--color-shell-2)" stroke="var(--color-ink)" strokeWidth="1.5" />
    </motion.g>
  );
}

function NeutralCharacter() {
  return (
    <motion.g
      animate={{ y: [0, -2, 0] }}
      transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
    >
      {/* Head */}
      <circle cx="40" cy="20" r="14" fill="var(--color-shell-2)" stroke="var(--color-ink)" strokeWidth="1.5" />
      {/* Left eye */}
      <rect x="33" y="15" width="4" height="4" rx="1" fill="var(--color-ink)" />
      {/* Right eye */}
      <rect x="43" y="15" width="4" height="4" rx="1" fill="var(--color-ink)" />
      {/* Smile */}
      <path d="M34 25 Q40 31 46 25" stroke="var(--color-ink)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* Body */}
      <rect x="25" y="37" width="30" height="27" rx="2" fill="var(--color-shell-2)" stroke="var(--color-ink)" strokeWidth="1.5" />
      {/* Left arm */}
      <rect x="8" y="40" width="17" height="8" rx="2" fill="var(--color-shell-2)" stroke="var(--color-ink)" strokeWidth="1.5" />
      {/* Right arm */}
      <rect x="55" y="40" width="17" height="8" rx="2" fill="var(--color-shell-2)" stroke="var(--color-ink)" strokeWidth="1.5" />
      {/* Left leg */}
      <rect x="28" y="64" width="11" height="19" rx="2" fill="var(--color-shell-2)" stroke="var(--color-ink)" strokeWidth="1.5" />
      {/* Right leg */}
      <rect x="41" y="64" width="11" height="19" rx="2" fill="var(--color-shell-2)" stroke="var(--color-ink)" strokeWidth="1.5" />
    </motion.g>
  );
}

function HotCharacter() {
  return (
    <motion.g
      animate={{ rotate: [0, 1.5, -1.5, 0] }}
      transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      style={{ originX: "40px", originY: "52px" }}
    >
      {/* Head */}
      <circle cx="40" cy="20" r="14" fill="var(--color-shell-2)" stroke="var(--color-ink)" strokeWidth="1.5" />
      {/* Big smile */}
      <path d="M31 25 Q40 34 49 25" stroke="var(--color-ink)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* Sunglasses */}
      <motion.g
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 18, delay: 0.07 }}
        style={{ originX: "40px", originY: "19px" }}
      >
        {/* Left lens */}
        <rect x="27" y="14" width="11" height="8" rx="2" fill="var(--color-orange)" stroke="var(--color-ink)" strokeWidth="1.5" />
        {/* Right lens */}
        <rect x="42" y="14" width="11" height="8" rx="2" fill="var(--color-orange)" stroke="var(--color-ink)" strokeWidth="1.5" />
        {/* Bridge */}
        <rect x="38" y="17" width="4" height="2" rx="1" fill="var(--color-ink)" />
        {/* Left temple */}
        <rect x="19" y="16" width="8" height="2" rx="1" fill="var(--color-ink)" />
        {/* Right temple */}
        <rect x="53" y="16" width="8" height="2" rx="1" fill="var(--color-ink)" />
      </motion.g>
      {/* Body */}
      <rect x="25" y="37" width="30" height="27" rx="2" fill="var(--color-shell-2)" stroke="var(--color-ink)" strokeWidth="1.5" />
      {/* Left arm wide */}
      <rect x="1" y="40" width="24" height="8" rx="2" fill="var(--color-shell-2)" stroke="var(--color-ink)" strokeWidth="1.5" />
      {/* Right arm wide */}
      <rect x="55" y="40" width="24" height="8" rx="2" fill="var(--color-shell-2)" stroke="var(--color-ink)" strokeWidth="1.5" />
      {/* Left leg */}
      <rect x="28" y="64" width="11" height="19" rx="2" fill="var(--color-shell-2)" stroke="var(--color-ink)" strokeWidth="1.5" />
      {/* Right leg */}
      <rect x="41" y="64" width="11" height="19" rx="2" fill="var(--color-shell-2)" stroke="var(--color-ink)" strokeWidth="1.5" />
    </motion.g>
  );
}

export default function WeatherCharacter() {
  const active   = useConverter(selectActive);
  const fromVal  = useConverter((s) => s.perCategory[s.active].value);
  const fromUnit = useConverter((s) => s.perCategory[s.active].fromUnit);

  const tempC = useMemo(() => {
    if (active !== "temperature") return 22;
    const unitDef = CATEGORIES["temperature"].units.find((u) => u.id === fromUnit);
    return unitDef ? unitDef.toBase(fromVal) : fromVal;
  }, [active, fromVal, fromUnit]);

  const tempState = useMemo((): TempState => {
    if (tempC <= 10) return "cold";
    if (tempC >= 35) return "hot";
    return "neutral";
  }, [tempC]);

  return (
    <div
      className="lcd"
      style={{
        width: 100,
        height: 126,
        position: "relative",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-end",
        padding: "4px 4px 2px",
        background: "var(--color-shell-2)",
        overflow: "hidden",
      }}
    >
      {/* State label — top left */}
      <span
        className="ui-mono"
        style={{
          position: "absolute", top: 5, left: 6,
          fontSize: 7, letterSpacing: "0.18em",
          color: "var(--color-ink-soft)",
          textTransform: "uppercase",
          pointerEvents: "none",
        }}
      >
        {STATE_LABEL[tempState]}
      </span>

      {/* Weather icon — top right, cross-fades */}
      <AnimatePresence mode="wait">
        <motion.img
          key={"icon-" + tempState}
          src={WEATHER_ICON[tempState]}
          width={36}
          height={36}
          alt=""
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          style={{ position: "absolute", top: 3, right: 3 }}
        />
      </AnimatePresence>

      {/* Character SVG — cross-fades on state change */}
      <AnimatePresence mode="wait">
        <motion.svg
          key={"char-" + tempState}
          viewBox="0 0 80 90"
          width={88}
          height={99}
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          style={{ overflow: "visible" }}
        >
          {tempState === "cold"    && <ColdCharacter />}
          {tempState === "neutral" && <NeutralCharacter />}
          {tempState === "hot"     && <HotCharacter />}
        </motion.svg>
      </AnimatePresence>
    </div>
  );
}
