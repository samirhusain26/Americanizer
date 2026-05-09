export type CategoryId = "temperature" | "weight" | "length" | "volume";

export type UnitSystem = "metric" | "us";

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

export const CATEGORIES: Record<CategoryId, CategoryDef> = {
  temperature: TEMPERATURE,
  weight: WEIGHT,
  length: LENGTH,
  volume: VOLUME,
};

export const CATEGORY_ORDER: CategoryId[] = ["temperature", "weight", "length", "volume"];

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
