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
  return Math.round(value).toString();
}

export function shouldUseCulinaryFraction(category: CategoryId, unitId: string): boolean {
  return category === "volume" && CULINARY_VOLUME_UNITS.has(unitId);
}

const CURRENCY_FMT: Record<string, { locale: string; code: string; decimals: number }> = {
  usd: { locale: "en-US", code: "USD", decimals: 2 },
  inr: { locale: "en-IN", code: "INR", decimals: 2 },
  eur: { locale: "de-DE", code: "EUR", decimals: 2 },
  gbp: { locale: "en-GB", code: "GBP", decimals: 2 },
  jpy: { locale: "ja-JP", code: "JPY", decimals: 0 },
  cad: { locale: "en-CA", code: "CAD", decimals: 2 },
  aud: { locale: "en-AU", code: "AUD", decimals: 2 },
  chf: { locale: "de-CH", code: "CHF", decimals: 2 },
  cny: { locale: "zh-CN", code: "CNY", decimals: 2 },
};

function formatCurrency(unitId: string, value: number): string {
  if (!isFinite(value)) return "—";
  const cfg = CURRENCY_FMT[unitId] ?? CURRENCY_FMT.usd;
  // Compact notation (K/M/B for en-US, K/L/Cr for en-IN) once the value hits 4 digits
  if (Math.abs(value) >= 1000) {
    return new Intl.NumberFormat(cfg.locale, {
      style: "currency",
      currency: cfg.code,
      notation: "compact",
      maximumSignificantDigits: 4,
    }).format(value);
  }
  return new Intl.NumberFormat(cfg.locale, {
    style: "currency",
    currency: cfg.code,
    minimumFractionDigits: cfg.decimals,
    maximumFractionDigits: cfg.decimals,
  }).format(value);
}

export function formatForUnit(category: CategoryId, unitId: string, value: number): string {
  if (category === "currency") return formatCurrency(unitId, value);
  if (shouldUseCulinaryFraction(category, unitId)) return formatCulinaryFraction(value);
  return formatNumber(value);
}
