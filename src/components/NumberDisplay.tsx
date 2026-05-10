"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";

interface NumberDisplayProps {
  formatted: string;        // pre-formatted display string
  rawValue: number;         // numeric value (used to seed editing buffer)
  onCommit: (n: number) => void;
  className?: string;
}

/**
 * Tappable massive number. The visible glyphs are pure styled text;
 * an absolutely-positioned, transparent <input inputMode="decimal"> sits over
 * it to summon the native numeric keypad on tap.
 */
export default function NumberDisplay({ formatted, rawValue, onCommit, className }: NumberDisplayProps) {
  const [editing, setEditing] = useState(false);
  const [buf, setBuf] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setBuf(Number.isFinite(rawValue) ? String(roundForEdit(rawValue)) : "");
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [editing, rawValue]);

  const commit = () => {
    const n = parseFloat(buf);
    if (Number.isFinite(n)) onCommit(n);
    setEditing(false);
  };

  return (
    <div className={clsx("relative", className)}>
      <div className="num-display leading-none tabular-nums">
        {editing ? (buf || "0") : formatted}
      </div>
      <input
        ref={inputRef}
        aria-label="Edit value"
        type="text"
        inputMode="decimal"
        pattern="[0-9.\-]*"
        name="converter-amount"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        data-1p-ignore
        data-lpignore="true"
        data-form-type="other"
        value={editing ? buf : ""}
        onFocus={() => setEditing(true)}
        onChange={(e) => setBuf(sanitize(e.target.value))}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
        }}
        className="absolute inset-0 w-full h-full bg-transparent text-transparent caret-transparent outline-none"
        style={{ caretColor: "transparent" }}
      />
    </div>
  );
}

function sanitize(s: string): string {
  // Allow digits, single dot, optional leading minus
  let out = "";
  let dot = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch >= "0" && ch <= "9") out += ch;
    else if (ch === "." && !dot) { out += ch; dot = true; }
    else if (ch === "-" && i === 0) out += ch;
  }
  return out;
}

function roundForEdit(v: number): number {
  // Avoid 22.000000004 in the editing buffer
  return Math.round(v * 1000) / 1000;
}
