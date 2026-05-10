# Architecture

A short tour through how the pieces fit. For setup and stack, see the [README](../README.md).

## Render tree

```
<RootLayout>
  <Americanizer>                         (src/components/Americanizer.tsx)
    <header>                             screw + brand + accent dot + category badge
    <ValueRow zone="from" />             Zone 1 — LCD + NumberDisplay + UnitPill
      └── caret blinks when active
    <section>
      <ScrubDial />                      Zone 2 — single dial, drives active zone
      <SwapButton />                       (top-right corner of engine zone)
    <ValueRow zone="to"   />             Zone 3 — same component as Zone 1
    <CategoryDock />                     Flat hard-shadow segmented control
    <UnitDrawer side="from" />           Vaul bottom sheet, accent-tinted
    <UnitDrawer side="to"   />
    <footer>                             Small "about the developer" link → samirhusain.info
  <InstallPrompt />                      First-visit A2HS modal (iOS + Android)
```

`Americanizer` owns two pieces of local UI state:

- `drawer: "from" | "to" | null` — which Vaul sheet is open.
- `zone: "from" | "to"` — which value row the dial is currently editing.

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

## The dial loop

```
pointer down
   │
   ▼
mode = "pending"     ── first 6 px of motion picks the lock:
                        outer rim + tangential drag → "spin"
                        inner cap or radial drag    → "slide"
   │
   ├─── spin ─────────────────────────────────────────────────
   │      accumAngle += atan2 delta
   │      rotation.set(accumAngle)               // 1:1 finger tracking
   │      bucket = ⌊accumAngle / (2π/30)⌋        // detent every ~12°
   │      onDelta(Δbucket * stepFromVelocity)
   │
   └─── slide ────────────────────────────────────────────────
          linear  = mx - my                      // up/right increase
          rotation.set(linear / (size·π) * π)    // rim still feels alive
          bucket = ⌊linear / 12px⌋               // detent every 12 px
          onDelta(Δbucket * stepFromVelocity)

every detent → tickJolt() + clickHaptic()
       ↓
onDelta ──► Americanizer.onScrub
              if zone === "from": setValue("from", fromVal + delta)
              else              : setValue("to",   toVal   + delta)
```

There's also a `wheel` handler on the dial: it accumulates `-deltaY` against the same 12-px detent pitch and emits the same `onDelta` ladder, so a desktop scroll wheel feels identical to a slide-mode drag.

**Why `(mx − my)` instead of just `mx`:** a knob feels equally responsive to vertical pulls and horizontal swirls. Subtracting `my` gives "up = increase" without a separate axis.

**Why a fixed pixel pitch instead of velocity-scaled distance:** detents are about *tactile cadence*, not coverage. The velocity ladder controls *how much each click is worth* — it's the multiplier, not the trigger. This keeps the click rate predictable while letting the value cover real ground on a flick.

**Why no value-driven rest rotation:** an earlier version blended the `value` into the rim rotation so the indicator pointed at "where you are." It made the dial feel laggy and untracked on flicks. The current build maps the rim to the *finger*, full stop.

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
4. Add an entry to `ACCENT_BY_CATEGORY` in `Americanizer.tsx` and to `ACCENTS` / `SHORT` in `CategoryDock.tsx`.
5. The dock auto-renders a fourth (or fifth, or…) tab. If you exceed four tabs, widen `grid-cols-4` in `CategoryDock.tsx`.
