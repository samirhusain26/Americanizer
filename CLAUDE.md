# Americanizer — Project Notes for Claude

Mobile-first PWA: Metric ↔ US Customary unit converter with a tactile, hardware-feeling UI.

## Run

```
npm install
npm run dev          # http://localhost:3000
npm run build        # verifies types + Tailwind
npm run typecheck
```

## Stack signals

- Next.js 15 App Router + TS strict
- Tailwind 4 (`@tailwindcss/postcss`); design tokens in `src/app/globals.css` under `@theme`
- Zustand 5 + `persist` (key: `americanizer:v1`)
- Framer Motion + `@use-gesture/react`
- Vaul for the unit drawer
- `@react-three/fiber` is installed but the shader background is not yet wired

## Architectural rules

1. **Single source of truth** is the Zustand store, expressed in the active category's *from* unit. The "to" number is always derived via `convert()`.
2. **Selectors return primitives or stable references.** Never return a freshly-constructed object from a `useConverter` selector — it triggers `getServerSnapshot should be cached`. Derive composite views with `useMemo` in the component.
3. **Per-category state is independent.** Switching the dock category preserves the prior category's units and value.
4. **Identical from/to units are allowed** (e.g. C → C). Don't add validation against this.
5. **Display-layer formatting is separate from state.** Culinary fractions and number rounding live in `lib/format.ts`. The store stays in exact decimals.

## Conversion model

`lib/units.ts` defines each category with a canonical base unit and per-unit `toBase`/`fromBase` lambdas. Non-linear (°C/°F/K) and linear conversions share the same shape. Add a unit by appending to the category's `units` array.

## Dial mechanics (`ScrubDial.tsx`)

- `useDrag` from `@use-gesture/react`, pointer-captured, `filterTaps: true`.
- Detents fire every **12 px** of cumulative `(mx − my)` so up/right both increase the value.
- Step is picked from velocity (px/ms): `<0.4 → 0.1`, `<1.4 → 1`, `<3.0 → 10`, else `100`.
- Each detent: emits `onDelta`, plays a Web Audio click, runs a 1px Framer Motion jolt.
- Wrap with a plain `<div {...bind()} />` — `motion.div`'s native `onDrag` typing collides with use-gesture's.

## Haptics

`lib/haptics.ts` exports a single `clickHaptic(intensity?)`. Implementation is a Web Audio square-wave click; designed to be swapped 1:1 with a Capacitor haptic plugin in native shells. Don't inline `AudioContext` calls in components — go through this shim.

## Files to know

- `src/components/Americanizer.tsx` — top-level composition (Zone 1 / dial / Zone 3 / dock + drawers).
- `src/components/ScrubDial.tsx` — the engine; velocity tiers live here.
- `src/store/converter.ts` — store, persist config, `selectActive`, `selectCategoryState`.
- `src/lib/units.ts` — categories & convert().
- `src/lib/format.ts` — culinary fractions, number formatting.
- `_design_reference/` — original Claude Design HTML/JSX prototype. Read for visual intent; not built.

## Conventions

- No new abstractions for one-off use; match the existing component shape.
- Don't add validation, error handling, or fallbacks for cases that can't happen at this layer (untrusted input lives only at the keypad input, which already sanitizes).
- Keep the `_design_reference/` folder out of typecheck (`tsconfig.json` `exclude`).
- Do not commit; the user runs commits manually.

## Open work

See the README's roadmap. The next obvious slice is the R3F shader background (per-category behavior is spelled out in the master prompt).
