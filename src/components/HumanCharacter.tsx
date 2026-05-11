"use client";

import { useRive, useStateMachineInput } from "@rive-app/react-canvas";
import { useMotionValueEvent, type MotionValue } from "framer-motion";

interface HumanCharacterProps {
  tempC: MotionValue<number>;
}

export function HumanCharacter({ tempC }: HumanCharacterProps) {
  const { rive, RiveComponent } = useRive({
    src: "/character.riv",
    stateMachines: "Temperature",
    autoplay: true,
  });

  const input = useStateMachineInput(rive, "Temperature", "temp");

  useMotionValueEvent(tempC, "change", (v) => {
    if (input) input.value = v;
  });

  const isLoaded = rive !== null;

  if (!isLoaded) {
    return (
      <div
        style={{
          width: 140,
          height: 200,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          opacity: 0.5,
        }}
      >
        <span style={{ fontSize: 48, lineHeight: 1 }}>🧍</span>
        <span
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 9,
            letterSpacing: "0.08em",
            color: "var(--color-ink-soft, #888)",
            textAlign: "center",
            textTransform: "uppercase",
          }}
        >
          character.riv needed
        </span>
      </div>
    );
  }

  return (
    <div style={{ width: 140, height: 200 }}>
      <RiveComponent style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
