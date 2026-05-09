# Architecture

A short tour through how the pieces fit. For setup and stack, see the [README](../README.md).

## Render tree

```
<RootLayout>
  <Americanizer>                         (src/components/Americanizer.tsx)
    <header>                             "AMERICANIZER" + active category name
    <NumberDisplay />  <UnitPill />      Zone 1 — From
    <ScrubDial />  <SwapButton />        Zone 2 — Engine
    <NumberDisplay />  <UnitPill />      Zone 3 — To
    <CategoryDock />                     Animated segmented control
    <UnitDrawer />  <UnitDrawer />       Vaul bottom sheets (one per side)
```

`Americanizer` owns the local UI state (`drawer: "from" | "to" | null`) and reads everything else from the Zustand store.

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

## The dial loop

```
pointer move
   │
   ▼
useDrag callback
   │
   ├─ accumPx = mx - my             // up / right both increase
   │
   ├─ bucket = ⌊accumPx / 12px⌋     // detent every 12 px
   │
   └─ if bucket changed:
         step  = stepFromVelocity(max|vx|,|vy|)
         delta = sign(Δbucket) * |Δbucket| * step
         onDelta(delta) ─────────► setValue("from", current.fromVal + delta)
         tickJolt()                 // 1px y-translate via MotionValue
         clickHaptic()              // Web Audio click
```

Why `(mx − my)` instead of just `mx`: a knob feels equally responsive to vertical pulls and horizontal swirls. Subtracting `my` gives "up = increase" without a separate axis.

Why a fixed pixel pitch instead of velocity-scaled distance: detents are about *tactile cadence*, not coverage. The velocity ladder controls *how much each click is worth* — it's the multiplier, not the trigger. This keeps the click rate predictable while letting the value cover real ground on a flick.

## Selectors and the infinite-loop trap

Zustand notifies subscribers when a selector's return value changes by reference. A selector that builds a fresh object every call (e.g. `(s) => ({...})`) appears to change every render and trips React's `getServerSnapshot should be cached` warning, ending in an infinite loop.

The fix in this repo: selectors return store-owned references only.

```ts
// src/store/converter.ts
export const selectActive = (s: ConverterState) => s.active;
export const selectCategoryState = (s: ConverterState) => s.perCategory[s.active];
```

Any composite view (e.g. *the current category's def + computed to-value*) is built in the consuming component with `useMemo`. If you ever need a many-key derivation, reach for `useShallow` from `zustand/react/shallow` rather than reconstructing objects.

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
4. The dock auto-renders a fourth (or fifth, or…) tab. If you exceed four tabs, widen `grid-cols-4` in `CategoryDock.tsx`.
