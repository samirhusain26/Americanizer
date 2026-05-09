# Americanizer

A tactile mobile-first PWA for converting between Metric and US Customary units. Designed to feel like a premium piece of physical hardware — massive numbers, a knurled volume-knob dial, native-keypad direct entry, pseudo-haptic feedback.

> Bloomberg-meets-Apple aesthetic. Charcoal canvas, paper text, amber accent.

## Stack

| Concern        | Choice                                          |
| -------------- | ----------------------------------------------- |
| Framework      | **Next.js 15** (App Router, Turbopack)          |
| Language       | TypeScript (strict)                             |
| Styling        | **Tailwind CSS 4** via `@tailwindcss/postcss`   |
| State          | **Zustand 5** + `persist` (localStorage)        |
| Animation      | **Framer Motion 11** (spring transitions, layoutId) |
| Gestures       | **`@use-gesture/react`** (velocity scrubbing)   |
| Bottom sheet   | **Vaul**                                        |
| Reactive bg    | **React Three Fiber** + Three.js (planned)      |
| PWA            | Workbox 7 — cache-first (planned)               |

## Getting started

```bash
npm install
npm run dev          # http://localhost:3000
```

Other scripts:

```bash
npm run build        # production build (verifies types + Tailwind)
npm run start        # serve production build
npm run typecheck    # tsc --noEmit
npm run lint         # next lint
```

Requires Node 20+.

## Repository layout

```
src/
  app/
    layout.tsx          Root layout, manifest + theme-color metadata
    page.tsx            Renders <Americanizer />
    globals.css         Tailwind 4 + design tokens (@theme)
  components/
    Americanizer.tsx    Top-level composition (3 zones + dock + drawers)
    ScrubDial.tsx       Velocity-tiered scrub knob (the engine)
    NumberDisplay.tsx   Massive number + invisible decimal input overlay
    UnitPill.tsx        Tappable unit chip
    UnitDrawer.tsx      Vaul bottom-sheet with metric/us tags
    SwapButton.tsx      Reverses from/to with 180° tap rotate
    CategoryDock.tsx    Segmented Temp/Weight/Length/Volume control
  lib/
    units.ts            Category + unit definitions, convert()
    format.ts           Display formatting (incl. culinary fractions)
    haptics.ts          Web Audio click; abstracted for Capacitor swap
  store/
    converter.ts        Zustand store + persist middleware
_design_reference/      Original Claude Design HTML/JSX prototype
```

## Architecture

### Layout (vertical split inside the viewport)

1. **Zone 1 — From.** Massive editable number + unit pill.
2. **Zone 2 — Engine.** Scrub dial + swap button.
3. **Zone 3 — To.** Massive editable number (slightly dimmed) + unit pill.
4. **Dock.** Segmented control for Temperature / Weight / Length / Volume, animated via Framer `layoutId`.

### State model

Zustand keeps **independent per-category state**, so switching categories preserves prior selections:

```ts
{
  active: "temperature" | "weight" | "length" | "volume",
  perCategory: {
    [category]: { fromUnit, toUnit, value }   // value is in fromUnit
  }
}
```

The store is the single source of truth. The displayed "to" number is derived: `convert(category, value, fromUnit, toUnit)`. Identical from/to selections are allowed (e.g. C → C).

The store is persisted under the key `americanizer:v1` with `partialize` to keep storage minimal.

#### Selectors

`useConverter` is consumed via stable per-field selectors. Returning a fresh derived object from a selector triggers React's *getServerSnapshot should be cached* warning, so derivation is done in the consuming component with `useMemo`:

```ts
const active = useConverter(selectActive);
const cat = useConverter(selectCategoryState);   // {fromUnit, toUnit, value}
const current = useMemo(() => ({
  ...cat,
  toVal: convert(active, cat.value, cat.fromUnit, cat.toUnit),
}), [active, cat]);
```

### Conversion math

Each category declares a canonical base unit and per-unit `toBase`/`fromBase` lambdas. This handles non-linear conversions (Celsius ↔ Fahrenheit, Kelvin) cleanly alongside linear ones.

```ts
convert(category, value, fromId, toId): number
```

### Velocity-tiered scrubbing (the dial)

`@use-gesture/react`'s `useDrag` reads pointer travel and velocity. Detents fire every **12 px** of cumulative `(mx − my)` (up/right increases). Each detent emits an `onDelta` of `±step` where step is selected from the velocity tier:

| Pointer velocity (px/ms) | Step  |
| ------------------------ | ----- |
| `< 0.4`                  | `0.1` |
| `< 1.4`                  | `1`   |
| `< 3.0`                  | `10`  |
| `≥ 3.0`                  | `100` |

Each detent additionally:

- plays a 25 ms square-wave click via Web Audio (`lib/haptics.ts`)
- runs a 1-px Framer Motion jolt on the dial body
- nudges the indicator angle for visual feedback

Tap-vs-drag is disambiguated with `filterTaps: true`.

### Direct numeric entry

`NumberDisplay` renders the visible glyphs as styled text and overlays a transparent `<input inputMode="decimal" pattern="[0-9.\-]*">` to summon the native mobile numeric keypad. Whichever side (From or To) the user edits becomes the source of truth — the store updates `value` (in the From unit), recomputed if the user typed into the To side.

### Display formatting

- **Volume + culinary US units** (`cup`, `tbsp`, `tsp`, `floz`) render the fractional remainder as the nearest of `⅛ ⅙ ¼ ⅓ ⅜ ½ ⅝ ⅔ ¾ ⅚ ⅞`. Underlying state is always exact decimals — the fraction is display only.
- **Length** stays one-to-one (no compound `5'10"` output). Pick `cm`, `in`, `ft`, etc. directly.
- **General numbers** scale precision to magnitude (3 decimals under 1, 2 between 1 and 1000, 0 above 10000).

### Haptics

`clickHaptic(intensity?: number)` — single function, single source. The Web Audio implementation is intentionally a thin shim so it can be swapped one-for-one with a Capacitor haptic plugin when shipping to native shells.

### Human-baseline defaults

On first hydrate (no `localStorage`), the store seeds:

| Category    | Default                    |
| ----------- | -------------------------- |
| Temperature | 22 °C → 71.6 °F            |
| Weight      | 70 kg → 154.32 lb          |
| Length      | 1 m → 39.37 in             |
| Volume      | 1 L → 33.81 fl oz          |

## Design tokens

Defined in `src/app/globals.css` under `@theme` so they're reachable as Tailwind utilities (e.g. `bg-canvas`, `text-paper`):

| Token                          | Value                       |
| ------------------------------ | --------------------------- |
| `--color-canvas`               | `#14130F`                   |
| `--color-paper`                | `#F4F1EB`                   |
| `--color-taupe`                | `#2A2823`                   |
| `--color-accent`               | `oklch(74% 0.16 60)` amber  |
| `--color-accent-yellow-green`  | `oklch(82% 0.18 130)`       |
| `--color-accent-magenta`       | `oklch(68% 0.24 350)`       |
| `--color-accent-cyan`          | `oklch(78% 0.14 200)`       |
| `--font-display`               | Funnel Display              |
| `--font-mono`                  | IBM Plex Mono               |
| `--font-serif`                 | Newsreader                  |

Utility classes:

- `.num-display` — display sans for numerals (tnum + lnum, tight tracking)
- `.ui-mono` — IBM Plex Mono for UI labels (wider tracking)

## Roadmap

- [ ] **R3F shader background** with category-specific behavior:
  - Temperature → freeze ⇄ pleasant ⇄ scorching
  - Weight → density / shadow weight increases toward 150 kg
  - Length → human-scale ⇄ vehicular/infinite at >10 m
  - Volume → fluid sloshing fill, 0 → 5 L
- [ ] **PWA** — manifest, icons, Workbox cache-first SW
- [ ] **Tweaks panel** — runtime swatches / tone / dial style (stretch)
- [ ] Capacitor wrapper for App Store / Play Store, real haptics

## Notes

- The original Claude Design prototype is preserved in `_design_reference/` — useful for visual reference but not part of the build.
- `_design_reference/` is excluded from `tsconfig.json` to keep typecheck fast.
