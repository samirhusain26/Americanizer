# Units & conversion

All unit definitions live in [`src/lib/units.ts`](../src/lib/units.ts). Each category has a canonical base unit; per-unit `toBase`/`fromBase` lambdas convert in and out of it.

## Categories

### Temperature (base: `°C`)

| id  | label | system | conversion to °C       |
| --- | ----- | ------ | ---------------------- |
| `c` | °C    | metric | `v`                    |
| `f` | °F    | us     | `(v − 32) × 5/9`       |
| `k` | K     | metric | `v − 273.15`           |

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

## API

```ts
import { convert, getUnit, CATEGORIES, type CategoryId } from "@/lib/units";

convert("temperature", 22, "c", "f");   // 71.6
convert("weight", 70, "kg", "lb");       // 154.323…
convert("length", 1, "m", "in");         // 39.3700…
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

1. Define a `CategoryDef` (base unit, units, `defaultFrom`, `defaultTo`, `defaultValueFrom`).
2. Register it in `CATEGORIES` and `CATEGORY_ORDER`.
3. Seed `HUMAN_BASELINE` in [`src/store/converter.ts`](../src/store/converter.ts).
4. If `CATEGORY_ORDER.length > 4`, widen the `grid-cols-4` in `CategoryDock.tsx`.

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
