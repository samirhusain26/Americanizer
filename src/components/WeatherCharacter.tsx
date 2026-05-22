"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useConverter, selectActive } from "@/store/converter";
import { CATEGORIES } from "@/lib/units";

type TempState = "frozen" | "cold" | "neutral" | "hot" | "scorching";

const WEATHER_ICON: Record<TempState, string> = {
  frozen:    "/meteocons/extreme-snow.svg",
  cold:      "/meteocons/overcast-day-snow.svg",
  neutral:   "/meteocons/partly-cloudy-day.svg",
  hot:       "/meteocons/sun-hot.svg",
  scorching: "/meteocons/sun-hot.svg",
};

const STATE_LABEL: Record<TempState, string> = {
  frozen:    "FROZEN",
  cold:      "COLD",
  neutral:   "MILD",
  hot:       "HOT",
  scorching: "ON FIRE",
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

function FrozenCharacter() {
  return (
    <motion.g
      initial={{ scale: 0.95 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      {/* Frozen Pale Character Body */}
      {/* Head */}
      <circle cx="40" cy="22" r="14" fill="#E0F2FE" stroke="var(--color-ink)" strokeWidth="1.5" />
      {/* Left eye: X */}
      <path d="M33.5 17.5 L36.5 20.5 M36.5 17.5 L33.5 20.5" stroke="var(--color-ink)" strokeWidth="1.5" strokeLinecap="round" />
      {/* Right eye: X */}
      <path d="M43.5 17.5 L46.5 20.5 M46.5 17.5 L43.5 20.5" stroke="var(--color-ink)" strokeWidth="1.5" strokeLinecap="round" />
      {/* Frozen mouth: shocked circle */}
      <circle cx="40" cy="28" r="2.5" fill="none" stroke="var(--color-ink)" strokeWidth="1.5" />
      
      {/* Body */}
      <rect x="25" y="39" width="30" height="27" rx="2" fill="#E0F2FE" stroke="var(--color-ink)" strokeWidth="1.5" />
      {/* Left arm (shivering tucked) */}
      <rect x="13" y="42" width="12" height="8" rx="2" fill="#E0F2FE" stroke="var(--color-ink)" strokeWidth="1.5" />
      {/* Right arm (shivering tucked) */}
      <rect x="55" y="42" width="12" height="8" rx="2" fill="#E0F2FE" stroke="var(--color-ink)" strokeWidth="1.5" />
      {/* Left leg */}
      <rect x="28" y="66" width="11" height="19" rx="2" fill="#E0F2FE" stroke="var(--color-ink)" strokeWidth="1.5" />
      {/* Right leg */}
      <rect x="41" y="66" width="11" height="19" rx="2" fill="#E0F2FE" stroke="var(--color-ink)" strokeWidth="1.5" />

      {/* Ice Cube / Block surrounding it (semi-transparent light blue overlay) */}
      <rect 
        x="6" 
        y="4" 
        width="68" 
        height="84" 
        rx="10" 
        fill="rgba(186, 230, 253, 0.4)" 
        stroke="var(--color-ink)" 
        strokeWidth="1.5" 
      />
      {/* White ice highlights and facets */}
      {/* Top light reflection */}
      <path d="M12 8 H60 L62 14 H14 Z" fill="rgba(255, 255, 255, 0.6)" />
      {/* Left light reflection */}
      <path d="M10 12 V76 L15 70 V18 Z" fill="rgba(255, 255, 255, 0.3)" />
      {/* Crack line 1 */}
      <path d="M12 28 L24 22 L20 32" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.8" />
      {/* Crack line 2 */}
      <path d="M68 62 L58 68 L60 74" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.8" />
    </motion.g>
  );
}

function ScorchingCharacter() {
  return (
    <motion.g
      animate={{ 
        y: [0, -2, 0, -1, 0],
        x: [0, 0.5, -0.5, 0.5, 0]
      }}
      transition={{ 
        duration: 0.2, 
        repeat: Infinity, 
        ease: "linear" 
      }}
      style={{ originX: "40px", originY: "50px" }}
    >
      {/* BACK FLAMES */}
      <motion.g
        animate={{ scaleY: [1, 1.25, 0.95, 1.15, 1], skewX: [0, 3, -3, 2, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }}
        style={{ originX: "40px", originY: "70px" }}
      >
        {/* Large red/orange back flame */}
        <path 
          d="M20 70 C15 50 10 30 25 15 C30 30 35 25 40 10 C45 25 50 30 55 15 C70 30 65 50 60 70 Z" 
          fill="var(--color-orange)" 
          stroke="var(--color-ink)" 
          strokeWidth="1.5" 
        />
        {/* Inner yellow flame */}
        <path 
          d="M28 70 C24 55 22 40 32 30 C35 40 38 38 40 25 C42 38 45 40 48 30 C58 40 56 55 52 70 Z" 
          fill="#FFCC00" 
          stroke="var(--color-ink)" 
          strokeWidth="1" 
        />
      </motion.g>

      {/* Scorched Red/Orange Character Body */}
      {/* Head */}
      <circle cx="40" cy="20" r="14" fill="#EF4444" stroke="var(--color-ink)" strokeWidth="1.5" />
      {/* Panicked wide eyes */}
      <circle cx="34" cy="17" r="2.5" fill="var(--color-ink)" />
      <circle cx="46" cy="17" r="2.5" fill="var(--color-ink)" />
      {/* Sweat/anxiety brow lines */}
      <path d="M30 12 L37 14" stroke="var(--color-ink)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M50 12 L43 14" stroke="var(--color-ink)" strokeWidth="1.5" strokeLinecap="round" />
      {/* Screaming mouth */}
      <path d="M33 26 C33 32 47 32 47 26 Z" fill="var(--color-ink)" stroke="var(--color-ink)" strokeWidth="1" />
      
      {/* Body */}
      <rect x="25" y="37" width="30" height="27" rx="2" fill="#EF4444" stroke="var(--color-ink)" strokeWidth="1.5" />
      
      {/* Flailing Arms */}
      <motion.path 
        animate={{ rotate: [0, -20, 20, 0] }}
        transition={{ duration: 0.15, repeat: Infinity }}
        style={{ originX: "25px", originY: "40px" }}
        d="M25 40 L8 30" 
        stroke="var(--color-ink)" 
        strokeWidth="3" 
        strokeLinecap="round" 
      />
      <motion.path 
        animate={{ rotate: [0, 20, -20, 0] }}
        transition={{ duration: 0.15, repeat: Infinity }}
        style={{ originX: "55px", originY: "40px" }}
        d="M55 40 L72 30" 
        stroke="var(--color-ink)" 
        strokeWidth="3" 
        strokeLinecap="round" 
      />

      {/* Legs */}
      <rect x="28" y="64" width="11" height="19" rx="2" fill="#EF4444" stroke="var(--color-ink)" strokeWidth="1.5" />
      <rect x="41" y="64" width="11" height="19" rx="2" fill="#EF4444" stroke="var(--color-ink)" strokeWidth="1.5" />

      {/* Sweat drops flying off */}
      <motion.path
        animate={{ y: [0, 5, 10], x: [0, -5, -8], opacity: [1, 0.5, 0] }}
        transition={{ duration: 0.4, repeat: Infinity, ease: "easeOut" }}
        d="M20 22 Q18 25 19 27"
        stroke="var(--color-accent)"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
      <motion.path
        animate={{ y: [0, 5, 10], x: [0, 5, 8], opacity: [1, 0.5, 0] }}
        transition={{ duration: 0.4, repeat: Infinity, ease: "easeOut", delay: 0.15 }}
        d="M60 22 Q62 25 61 27"
        stroke="var(--color-accent)"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />

      {/* FRONT FLAMES */}
      <motion.g
        animate={{ scaleY: [0.9, 1.15, 0.85, 1.05, 0.9], skewX: [0, -2, 2, -1, 0] }}
        transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut", delay: 0.1 }}
        style={{ originX: "40px", originY: "64px" }}
      >
        <path 
          d="M30 64 C28 55 33 48 35 44 C37 48 38 46 40 40 C42 46 43 48 45 44 C47 48 52 55 50 64 Z" 
          fill="#FF5500" 
          stroke="var(--color-ink)" 
          strokeWidth="1" 
        />
      </motion.g>
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
    if (tempC <= -40) return "frozen";
    if (tempC <= 10) return "cold";
    if (tempC >= 55) return "scorching";
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
        background: "transparent",
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
          {tempState === "frozen"    && <FrozenCharacter />}
          {tempState === "cold"      && <ColdCharacter />}
          {tempState === "neutral"   && <NeutralCharacter />}
          {tempState === "hot"       && <HotCharacter />}
          {tempState === "scorching" && <ScorchingCharacter />}
        </motion.svg>
      </AnimatePresence>
    </div>
  );
}
