export type CategoryId = "temperature" | "weight" | "length" | "volume" | "speed" | "area" | "currency";

export type UnitSystem = "metric" | "us" | "currency";

export interface UnitDef {
  id: string;
  label: string;       // pill display, e.g. "°C"
  longLabel: string;   // drawer display, e.g. "Celsius"
  system: UnitSystem;
  /** Convert a value FROM this unit INTO the category's canonical base unit. */
  toBase: (v: number) => number;
  /** Convert a value FROM the category's canonical base unit INTO this unit. */
  fromBase: (v: number) => number;
}

export interface CategoryDef {
  id: CategoryId;
  label: string;
  /** The unit used internally as the canonical base (kept consistent for math). */
  baseUnit: string;
  units: UnitDef[];
  defaultFrom: string;
  defaultTo: string;
  /** The default value displayed in the FROM unit at first hydrate. */
  defaultValueFrom: number;
}

import { getRate } from "./fx";

const linear = (factor: number): Pick<UnitDef, "toBase" | "fromBase"> => ({
  toBase: (v) => v * factor,
  fromBase: (v) => v / factor,
});

export const TEMPERATURE: CategoryDef = {
  id: "temperature",
  label: "Temperature",
  baseUnit: "c",
  defaultFrom: "c",
  defaultTo: "f",
  defaultValueFrom: 22,
  units: [
    { id: "c", label: "°C", longLabel: "Celsius", system: "metric", toBase: (v) => v, fromBase: (v) => v },
    { id: "f", label: "°F", longLabel: "Fahrenheit", system: "us", toBase: (v) => (v - 32) * (5 / 9), fromBase: (v) => v * (9 / 5) + 32 },
    { id: "k", label: "K", longLabel: "Kelvin", system: "metric", toBase: (v) => v - 273.15, fromBase: (v) => v + 273.15 },
  ],
};

export const WEIGHT: CategoryDef = {
  id: "weight",
  label: "Weight",
  baseUnit: "kg",
  defaultFrom: "kg",
  defaultTo: "lb",
  defaultValueFrom: 70,
  units: [
    { id: "kg", label: "kg", longLabel: "Kilogram", system: "metric", ...linear(1) },
    { id: "g",  label: "g",  longLabel: "Gram",     system: "metric", ...linear(0.001) },
    { id: "lb", label: "lb", longLabel: "Pound",    system: "us",     ...linear(0.45359237) },
    { id: "oz", label: "oz", longLabel: "Ounce",    system: "us",     ...linear(0.45359237 / 16) },
    { id: "st", label: "st", longLabel: "Stone",    system: "us",     ...linear(6.35029318) },
  ],
};

export const LENGTH: CategoryDef = {
  id: "length",
  label: "Length",
  baseUnit: "m",
  defaultFrom: "m",
  defaultTo: "in",
  defaultValueFrom: 1,
  units: [
    { id: "mm", label: "mm", longLabel: "Millimeter", system: "metric", ...linear(0.001) },
    { id: "cm", label: "cm", longLabel: "Centimeter", system: "metric", ...linear(0.01) },
    { id: "m",  label: "m",  longLabel: "Meter",      system: "metric", ...linear(1) },
    { id: "km", label: "km", longLabel: "Kilometer",  system: "metric", ...linear(1000) },
    { id: "in", label: "in", longLabel: "Inch",       system: "us",     ...linear(0.0254) },
    { id: "ft", label: "ft", longLabel: "Foot",       system: "us",     ...linear(0.3048) },
    { id: "yd", label: "yd", longLabel: "Yard",       system: "us",     ...linear(0.9144) },
    { id: "mi", label: "mi", longLabel: "Mile",       system: "us",     ...linear(1609.344) },
  ],
};

export const VOLUME: CategoryDef = {
  id: "volume",
  label: "Volume",
  baseUnit: "l",
  defaultFrom: "l",
  defaultTo: "floz",
  defaultValueFrom: 1,
  units: [
    { id: "ml",   label: "mL",    longLabel: "Milliliter",   system: "metric", ...linear(0.001) },
    { id: "l",    label: "L",     longLabel: "Liter",        system: "metric", ...linear(1) },
    { id: "tsp",  label: "tsp",   longLabel: "Teaspoon",     system: "us",     ...linear(0.00492892) },
    { id: "tbsp", label: "tbsp",  longLabel: "Tablespoon",   system: "us",     ...linear(0.01478676) },
    { id: "floz", label: "fl oz", longLabel: "Fluid Ounce",  system: "us",     ...linear(0.0295735) },
    { id: "cup",  label: "cup",   longLabel: "Cup",          system: "us",     ...linear(0.236588) },
    { id: "pt",   label: "pt",    longLabel: "Pint",         system: "us",     ...linear(0.473176) },
    { id: "qt",   label: "qt",    longLabel: "Quart",        system: "us",     ...linear(0.946353) },
    { id: "gal",  label: "gal",   longLabel: "Gallon",       system: "us",     ...linear(3.78541) },
  ],
};

export const SPEED: CategoryDef = {
  id: "speed",
  label: "Speed",
  baseUnit: "ms",
  defaultFrom: "kmh",
  defaultTo: "mph",
  defaultValueFrom: 100,
  units: [
    { id: "ms",    label: "m/s",  longLabel: "Meters/second",    system: "metric", ...linear(1) },
    { id: "kmh",   label: "km/h", longLabel: "Kilometers/hour",  system: "metric", ...linear(1 / 3.6) },
    { id: "mph",   label: "mph",  longLabel: "Miles/hour",       system: "us",     ...linear(0.44704) },
    { id: "knots", label: "kn",   longLabel: "Knots",            system: "us",     ...linear(0.514444) },
  ],
};

export const AREA: CategoryDef = {
  id: "area",
  label: "Area",
  baseUnit: "m2",
  defaultFrom: "m2",
  defaultTo: "ft2",
  defaultValueFrom: 100,
  units: [
    { id: "cm2", label: "cm²", longLabel: "Sq. Centimeter", system: "metric", ...linear(0.0001) },
    { id: "m2",  label: "m²",  longLabel: "Sq. Meter",      system: "metric", ...linear(1) },
    { id: "ha",  label: "ha",  longLabel: "Hectare",         system: "metric", ...linear(10000) },
    { id: "km2", label: "km²", longLabel: "Sq. Kilometer",   system: "metric", ...linear(1e6) },
    { id: "in2", label: "in²", longLabel: "Sq. Inch",        system: "us",     ...linear(0.00064516) },
    { id: "ft2", label: "ft²", longLabel: "Sq. Foot",        system: "us",     ...linear(0.092903) },
    { id: "ac",  label: "ac",  longLabel: "Acre",             system: "us",     ...linear(4046.86) },
  ],
};

const fxUnit = (code: string): Pick<UnitDef, "toBase" | "fromBase"> => ({
  toBase: (v) => v / getRate(code),
  fromBase: (v) => v * getRate(code),
});

export const CURRENCY: CategoryDef = {
  id: "currency",
  label: "Currency",
  baseUnit: "usd",
  defaultFrom: "usd",
  defaultTo: "inr",
  defaultValueFrom: 100,
  units: [
    { id: "usd", label: "USD", longLabel: "US Dollar",         system: "currency", toBase: (v) => v, fromBase: (v) => v },
    { id: "inr", label: "INR", longLabel: "Indian Rupee",      system: "currency", ...fxUnit("INR") },
    { id: "eur", label: "EUR", longLabel: "Euro",              system: "currency", ...fxUnit("EUR") },
    { id: "gbp", label: "GBP", longLabel: "British Pound",     system: "currency", ...fxUnit("GBP") },
    { id: "jpy", label: "JPY", longLabel: "Japanese Yen",      system: "currency", ...fxUnit("JPY") },
    { id: "cad", label: "CAD", longLabel: "Canadian Dollar",   system: "currency", ...fxUnit("CAD") },
    { id: "aud", label: "AUD", longLabel: "Australian Dollar", system: "currency", ...fxUnit("AUD") },
    { id: "chf", label: "CHF", longLabel: "Swiss Franc",       system: "currency", ...fxUnit("CHF") },
    { id: "cny", label: "CNY", longLabel: "Chinese Yuan",      system: "currency", ...fxUnit("CNY") },
  ],
};

export const CATEGORIES: Record<CategoryId, CategoryDef> = {
  temperature: TEMPERATURE,
  weight: WEIGHT,
  length: LENGTH,
  volume: VOLUME,
  speed: SPEED,
  area: AREA,
  currency: CURRENCY,
};

export const CATEGORY_ORDER: CategoryId[] = ["temperature", "currency", "weight", "length", "volume", "speed", "area"];

export function getUnit(category: CategoryId, unitId: string): UnitDef {
  const u = CATEGORIES[category].units.find((x) => x.id === unitId);
  if (!u) throw new Error(`Unknown unit ${unitId} for ${category}`);
  return u;
}

export function convert(category: CategoryId, value: number, fromId: string, toId: string): number {
  if (fromId === toId) return value;
  const from = getUnit(category, fromId);
  const to = getUnit(category, toId);
  return to.fromBase(from.toBase(value));
}

/** Returns the visual ceiling in the category's base unit for motion pipeline normalization. */
export function getVisualMax(category: CategoryId, unitId: string): number {
  switch (category) {
    case "weight":
      return (unitId === "g" || unitId === "oz") ? 1 : 150;
    case "volume":
      return (["ml", "floz", "cup", "tsp", "tbsp"] as string[]).includes(unitId) ? 1 : 100;
    case "length":
      if (unitId === "km" || unitId === "mi") return 200_000;
      if (unitId === "cm" || unitId === "in" || unitId === "mm") return 1;
      return 3;
    case "speed":
      if (unitId === "ms") return 50;
      if (unitId === "knots") return 51.444;
      return 44.444; // 160 km/h in m/s
    case "area":
      if (unitId === "cm2" || unitId === "in2") return 0.1;
      if (unitId === "km2" || unitId === "ha" || unitId === "ac") return 10_000_000;
      return 100;
    case "temperature":
      return 40; // ~40°C covers the interesting gradient window for step calibration
    case "currency":
      return 2000; // $2000 USD ceiling — step calibration + gradient range
    default:
      return 1;
  }
}

// ---------------------------------------------------------------------------
// Unit-adaptive scrub step configuration
// ---------------------------------------------------------------------------

export interface StepConfig {
  slow: number;
  medium: number;
  fast: number;
  turbo: number;
}

function snapToNice(v: number): number {
  if (v <= 0) return 0.01;
  const exp = Math.floor(Math.log10(v));
  const pow = Math.pow(10, exp);
  const frac = v / pow; // always in [1, 10)
  let nice: number;
  if (frac < 1.75) nice = 1;
  else if (frac < 3.75) nice = 2.5;
  else if (frac < 7.5) nice = 5;
  else nice = 10;
  return nice * pow;
}

/**
 * Returns velocity-tier step sizes calibrated so that ~32 slow detents traverse
 * the full visual range of the given unit. Each tier is 5× the previous.
 */
export function getStepConfig(category: CategoryId, unitId: string): StepConfig {
  const maxBase = getVisualMax(category, unitId);
  const unitDef = CATEGORIES[category].units.find((u) => u.id === unitId);
  // Use delta-from-zero to handle affine units (°F, K) correctly
  const maxInUnit = unitDef
    ? Math.abs(unitDef.fromBase(maxBase) - unitDef.fromBase(0))
    : maxBase;

  const base = snapToNice(maxInUnit / 32);
  return {
    slow:   base,
    medium: snapToNice(base * 5),
    fast:   snapToNice(base * 20),
    turbo:  snapToNice(base * 100),
  };
}
