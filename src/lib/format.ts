import type { CategoryId } from "./units";

const FRACTIONS: Array<[number, string]> = [
  [0,    ""],
  [1/8,  "⅛"],
  [1/6,  "⅙"],
  [1/4,  "¼"],
  [1/3,  "⅓"],
  [3/8,  "⅜"],
  [1/2,  "½"],
  [5/8,  "⅝"],
  [2/3,  "⅔"],
  [3/4,  "¾"],
  [5/6,  "⅚"],
  [7/8,  "⅞"],
];

const CULINARY_VOLUME_UNITS = new Set(["cup", "tbsp", "tsp", "floz"]);

/** Return the closest culinary fraction string for the fractional remainder of v. */
function nearestFraction(remainder: number): { glyph: string; rounded: number } {
  let best = FRACTIONS[0];
  let bestDelta = Math.abs(remainder - best[0]);
  for (const f of FRACTIONS) {
    const d = Math.abs(remainder - f[0]);
    if (d < bestDelta) { best = f; bestDelta = d; }
  }
  // Allow rounding up to whole
  if (Math.abs(remainder - 1) < bestDelta) return { glyph: "", rounded: 1 };
  return { glyph: best[1], rounded: best[0] };
}

export function formatCulinaryFraction(value: number): string {
  if (!isFinite(value)) return "—";
  const sign = value < 0 ? "-" : "";
  const v = Math.abs(value);
  const whole = Math.floor(v);
  const rem = v - whole;
  const { glyph, rounded } = nearestFraction(rem);
  const totalWhole = whole + (rounded === 1 ? 1 : 0);
  if (!glyph || rounded === 1) return `${sign}${totalWhole}`;
  if (totalWhole === 0) return `${sign}${glyph}`;
  return `${sign}${totalWhole}${glyph}`;
}

/** General number formatting for display (non-culinary). */
export function formatNumber(value: number): string {
  if (!isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs === 0) return "0";
  if (abs >= 10000) return value.toFixed(0);
  if (abs >= 1000) return value.toFixed(1);
  if (abs >= 100) return value.toFixed(2);
  if (abs >= 10) return value.toFixed(2);
  if (abs >= 1) return value.toFixed(2);
  return value.toFixed(3);
}

export function shouldUseCulinaryFraction(category: CategoryId, unitId: string): boolean {
  return category === "volume" && CULINARY_VOLUME_UNITS.has(unitId);
}

export function formatForUnit(category: CategoryId, unitId: string, value: number): string {
  if (shouldUseCulinaryFraction(category, unitId)) return formatCulinaryFraction(value);
  return formatNumber(value);
}
