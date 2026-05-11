# Units & conversion

All unit definitions live in [`src/lib/units.ts`](../src/lib/units.ts). Each category has a canonical base unit; per-unit `toBase`/`fromBase` lambdas convert in and out of it. An optional `minInBase` field on the category sets a physical lower bound (e.g. 0 for weight, −273.15 °C for temperature); the store clamps all values to this floor before committing.

## Categories

### Temperature (base: `°C`)

| id  | label | system | conversion to °C       |
| --- | ----- | ------ | ---------------------- |
| `c` | °C    | metric | `v`                    |
| `f` | °F    | us     | `(v − 32) × 5/9`       |
| `k` | K     | metric | `v − 273.15`           |

> Temperature is a **fixed-axis** category: units are locked to °C (from) and °F (to). The unit pill is display-only and the swap button is hidden. Kelvin is defined but not surfaced in the UI.

### Weight (base: `kg`)

| id   | label | system |
| ---- | ----- | ------ |
| `kg` | kg    | metric |
| `g`  | g     | metric |
| `lb` | lb    | us     |
| `oz` | oz    | us     |
| `st` | st    | us     |

### Length (base: `m`)

| id   | label | system |
| ---- | ----- | ------ |
| `mm` | mm    | metric |
| `cm` | cm    | metric |
| `m`  | m     | metric |
| `km` | km    | metric |
| `in` | in    | us     |
| `ft` | ft    | us     |
| `yd` | yd    | us     |
| `mi` | mi    | us     |

### Volume (base: `L`)

| id     | label  | system |
| ------ | ------ | ------ |
| `ml`   | mL     | metric |
| `l`    | L      | metric |
| `tsp`  | tsp    | us     |
| `tbsp` | tbsp   | us     |
| `floz` | fl oz  | us     |
| `cup`  | cup    | us     |
| `pt`   | pt     | us     |
| `qt`   | qt     | us     |
| `gal`  | gal    | us     |

`tsp`, `tbsp`, `cup`, `floz` render as **culinary fractions** at display time. The store still holds exact decimals.

### Speed (base: `m/s`)

| id      | label | system |
| ------- | ----- | ------ |
| `ms`    | m/s   | metric |
| `kmh`   | km/h  | metric |
| `mph`   | mph   | us     |
| `knots` | kn    | us     |

Default: 100 km/h → mph.

### Area (base: `m²`)

| id    | label | system |
| ----- | ----- | ------ |
| `cm2` | cm²   | metric |
| `m2`  | m²    | metric |
| `ha`  | ha    | metric |
| `km2` | km²   | metric |
| `in2` | in²   | us     |
| `ft2` | ft²   | us     |
| `ac`  | ac    | us     |

Default: 100 m² → ft².

### Currency (base: `USD`)

Live exchange rates fetched via `lib/fx.ts`. Rates are cached with a cooldown to limit API calls.

| id    | label | system   |
| ----- | ----- | -------- |
| `usd` | USD   | currency |
| `inr` | INR   | currency |
| `eur` | EUR   | currency |
| `gbp` | GBP   | currency |
| `cad` | CAD   | currency |
| `aud` | AUD   | currency |
| `jpy` | JPY   | currency |
| `mxn` | MXN   | currency |

Default: 1 USD → INR. Rates refresh automatically; `minInBase: 0` prevents negative currency values.

## API

```ts
import { convert, getUnit, CATEGORIES, type CategoryId } from "@/lib/units";

convert("temperature", 22, "c", "f");   // 71.6
convert("weight", 70, "kg", "lb");       // 154.323…
convert("length", 1, "m", "in");         // 39.3700…
convert("speed", 100, "kmh", "mph");     // 62.137…
convert("area", 100, "m2", "ft2");       // 1076.39…
getUnit("volume", "cup");                // UnitDef
```

`convert` is total: same-id pairs short-circuit to the input value, and unknown unit ids throw immediately (programmer error).

## Adding a unit

```ts
{ id: "nmi", label: "nmi", longLabel: "Nautical Mile", system: "us",
  toBase: (v) => v * 1852, fromBase: (v) => v / 1852 },
```

For linear units there's a helper:

```ts
{ id: "nmi", label: "nmi", longLabel: "Nautical Mile", system: "us", ...linear(1852) },
```

The `UnitDrawer` and store automatically pick up new units. If you remove a unit, anyone with that unit persisted in `localStorage` will hit `getUnit` throwing — bump the persist key (`name: "americanizer:v2"`) when you do that.

## Adding a category

1. Define a `CategoryDef` (base unit, units, `defaultFrom`, `defaultTo`, `defaultValueFrom`). Set `minInBase` to the physical lower bound (0 for most physical quantities; omit if unbounded).
2. Register it in `CATEGORIES` and `CATEGORY_ORDER`.
3. Seed `HUMAN_BASELINE` in [`src/store/converter.ts`](../src/store/converter.ts).
4. Add a label entry to `LABELS` in `CategoryDock.tsx`.
5. If the category needs a fixed unit axis (like temperature), add the lock in `Americanizer.tsx`'s `useEffect` and set `interactive={false}` on the pill + hide the swap button.

## Human-baseline defaults

On first hydrate (no `localStorage`), the store seeds:

| Category    | From         | To     | Default value |
| ----------- | ------------ | ------ | ------------- |
| Temperature | °C           | °F     | 22            |
| Weight      | kg           | lb     | 70            |
| Length      | m            | in     | 1             |
| Volume      | L            | fl oz  | 1             |
| Speed       | km/h         | mph    | 100           |
| Area        | m²           | ft²    | 100           |
| Currency    | USD          | INR    | 1             |

## Persistence

Storage key: `americanizer:v1`.

Stored shape (after `partialize`):

```ts
{
  active: CategoryId,
  perCategory: { [c: CategoryId]: { fromUnit, toUnit, value } }
}
```

When making a breaking change to this shape (renaming a unit, removing a category, changing what `value` means), bump the key to `:v2` rather than writing a migration — the user-facing data here is trivially re-creatable.

## Unrelated localStorage keys

The `InstallPrompt` component uses its own key, `americanizer:install-seen`, which is orthogonal to the converter store and not touched by `partialize`. Clearing it re-shows the first-visit install modal.
