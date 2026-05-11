# Architecture

A short tour through how the pieces fit. For setup and stack, see the [README](../README.md).

## Render tree

```
<RootLayout>
  <Americanizer>                         (src/components/Americanizer.tsx)
    <motion.main>
      [ambient gradient overlay]         z-0, pointer-events-none (temperature only)
      [volume fill overlay]              z-0, pointer-events-none (volume only)
      <header>                           brand label + accent category badge
      <ValueRow zone="from" />           Zone 1 — massive number + unit pill
      <section>                          Zone 2 — full-area trackpad + mute button
        <ScrubDial />                    invisible drag surface, emits onDelta
        [SwapButton]                     top-right corner (hidden in temperature mode)
      <ValueRow zone="to" />             Zone 3 — same component, copy-on-focus
      <CategoryDock />                   animated underline segmented control
      <footer>                           "about the developer" link
      <UnitDrawer side="from" />         Vaul bottom sheet
      <UnitDrawer side="to" />
  <InstallPrompt />                      (app/page.tsx sibling) first-visit A2HS modal
```

`Americanizer` owns two pieces of local UI state:

- `drawer: "from" | "to" | null` — which Vaul sheet is open.
- `zone: "from" | "to"` — which value row the scrub trackpad is currently editing.

Everything else comes from the Zustand store. The active zone deliberately does **not** live in the store — it's a UI affordance, not user-facing state worth persisting.

`InstallPrompt` is a sibling of `Americanizer` mounted from `app/page.tsx`. It owns its own open/dismissed state and reads/writes `localStorage["americanizer:install-seen"]` directly — it has no dependency on the converter store.

## State flow

```
                  ┌─────────────────────┐
                  │   Zustand store     │
                  │ (persisted v1)      │
                  │                     │
                  │ active              │
                  │ perCategory[active] │
                  └────────┬────────────┘
                           │  selectActive / selectCategoryState
                           ▼
              ┌──────────────────────────┐
              │ Americanizer (useMemo)   │
              │ derives toVal via        │
              │ convert(fromUnit→toUnit) │
              └────┬──────────┬──────────┘
                   │          │
            from   │          │   to
                   ▼          ▼
            NumberDisplay  NumberDisplay
                  ▲              ▲
                  │ commit       │ commit
            setValue("from")  setValue("to")
                   │              │
                   ▼              ▼
                  Zustand action — value is normalized
                  back to the FROM unit before commit.
```

`setValue("to", n)` converts `n` from the to-unit back into the from-unit before writing, so the store invariant — *value is always in `fromUnit`* — holds.

## Scrub trackpad loop

`ScrubDial` is a full-area invisible drag surface (no visible knob or dial). It uses `@use-gesture/react`'s `useDrag` in slide-only mode:

```
pointer down
   │
   ▼
linear = mx - my            // up/right increase; down/left decrease
bucket = ⌊linear / 12px⌋   // detent every 12 px
if bucket changed:
  detents = bucket - lastBucket
  emitDetents(detents, velocity) → onDelta + clickHaptic()

every detent → clickHaptic(intensity)
       ↓
onDelta ──► Americanizer.onScrub
              if zone === "from": setValue("from", fromVal + delta)
              else              : setValue("to",   toVal   + delta)
```

Mouse `wheel` accumulates `-deltaY` against the same 12-px pitch and emits the same `onDelta` ladder.

**Why `(mx − my)` instead of just `mx`:** gives equal responsiveness to vertical pulls and horizontal swirls. Subtracting `my` gives "up = increase" without a separate axis.

**Why a fixed pixel pitch instead of velocity-scaled distance:** detents are about *tactile cadence*, not coverage. The velocity ladder controls *how much each click is worth* — it's the multiplier, not the trigger. This keeps the click rate predictable while letting the value cover real ground on a flick.

## Context-aware motion pipeline

`Americanizer` runs a `useMotionValue` → `useSpring` → `useTransform` graph driven by `fromVal`. The graph produces values that feed ambient visual effects — no React state updates, no re-renders.

```
fromVal
  │
  ▼ useMotionValue → useSpring (stiffness 180, damping 26, mass 0.6)
  │
  ├─── tempC (temperature category only)
  │      → tempGradient → backgroundImage on overlay div
  │        icy-blue radial at –10°C, transparent at 20°C, warm-orange at 45°C
  │
  ├─── weightKg (weight category only)
  │      → weightFontWeight → --num-font-weight on <main>
  │        Inter variable weight 100 (0 kg) → 900 (150 kg)
  │
  └─── volumeLiters (volume category only)
         → volFillHeight → height on accent fill overlay div
           0% at 0 L → 45% at 5 L (6% opacity accent tint)
```

CSS consumers reference `--num-font-weight` directly through the `.num-display` class's `font-variation-settings`. The temperature gradient and volume fill are Framer Motion `style` props on overlay `<div>`s.

## Temperature fixed-axis mode

When `active === "temperature"`, a `useEffect` forces `fromUnit = "c"` and `toUnit = "f"`. The unit pills are rendered with `interactive={false}` and the swap button is hidden. This is the only category with a locked axis.

## Selectors and the infinite-loop trap

Zustand notifies subscribers when a selector's return value changes by reference. A selector that builds a fresh object every call (e.g. `(s) => ({...})`) appears to change every render and trips React's `getServerSnapshot should be cached` warning, ending in an infinite loop.

The fix in this repo: selectors return store-owned references only.

```ts
// src/store/converter.ts
export const selectActive = (s: ConverterState) => s.active;
export const selectCategoryState = (s: ConverterState) => s.perCategory[s.active];
```

Any composite view (e.g. *the current category's def + computed to-value*) is built in the consuming component with `useMemo`. If you ever need a many-key derivation, reach for `useShallow` from `zustand/react/shallow` rather than reconstructing objects.

## Design tokens

Defined in `src/app/globals.css` under `@theme`:

| Token                  | Value     | Use                                   |
| ---------------------- | --------- | ------------------------------------- |
| `--color-canvas`       | `#FAFAFA` | Page background                       |
| `--color-ink-active`   | `#000000` | Primary text and strokes              |
| `--color-ink-muted`    | `#A3A3A3` | Labels, inactive elements             |
| `--color-accent`       | `#0055FF` | Underline indicator, active borders   |
| `--font-display`       | Inter     | All UI text                           |

The active category's accent is currently a single `--color-accent` token. Per-category accent colors (orange / lime / cyan / yellow) are referenced in design references but not yet wired into the live CSS — they will become per-category overrides on `<main>` once the R3F background is built.

The `.num-display` class uses `font-variation-settings: "wght" var(--num-font-weight, 400)` so the weight category's font-mass effect works without prop drilling.

## Adding a unit

```ts
// src/lib/units.ts
export const LENGTH: CategoryDef = {
  // ...
  units: [
    // ...existing
    { id: "nm", label: "nmi", longLabel: "Nautical Mile", system: "us", ...linear(1852) },
  ],
};
```

That's it — drawer, conversions, and persistence pick it up automatically. If the new unit needs special display formatting (e.g. another culinary fraction), extend `lib/format.ts`.

## Adding a category

1. Define a `CategoryDef` in `lib/units.ts` (canonical base unit, units array, defaults).
2. Add it to `CATEGORIES` and `CATEGORY_ORDER`.
3. Seed `HUMAN_BASELINE` in `store/converter.ts`.
4. Add a `LABELS` entry in `CategoryDock.tsx`.
5. If the category count exceeds what `justify-around` handles comfortably, audit the dock layout.
6. If the category needs a fixed unit axis, add the lock `useEffect` in `Americanizer.tsx` and set `interactive={false}` on the pills + conditionally hide the swap button.
