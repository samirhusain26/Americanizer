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

## Design tokens (globals.css)

```
--color-canvas:     #FAFAFA   page background
--color-ink-active: #000000   primary text/strokes
--color-ink-muted:  #A3A3A3   labels, hints, inactive
--color-accent:     #0055FF   active underline, accent rules, copy "✓"
```

Per-category accent colors (orange/lime/cyan/yellow) are documented in `_design_reference/` and the README roadmap but not yet wired into the live CSS.

## Categories (7 total)

Defined in `src/lib/units.ts` — `CATEGORY_ORDER` drives the dock order:

| id          | Dock label | Default                | Notes                            |
| ----------- | ---------- | ---------------------- | -------------------------------- |
| temperature | Temp       | 22 °C → 71.6 °F        | Fixed axis; no picker/swap; minInBase −273.15 |
| weight      | Mass       | 70 kg → 154.3 lb       | Font-weight motion effect; minInBase 0 |
| length      | Dist       | 1 m → 39.37 in         | minInBase 0                      |
| volume      | Vol        | 1 L → 33.81 fl oz      | Culinary fractions; fill effect; minInBase 0 |
| speed       | Speed      | 100 km/h → 62.1 mph    | minInBase 0                      |
| area        | Area       | 100 m² → 1076.4 ft²    | minInBase 0                      |
| currency    | Currency   | 1 USD → INR            | Live rates via `lib/fx.ts`; minInBase 0 |

## UI layout

Five vertical sections in `Americanizer.tsx`:

1. **Header** — brand label (left) + active category label in accent (right).
2. **Zone 1 (FROM)** — unit long-name above massive number; unit pill right. Active = full opacity + thin accent underline. Inactive = 30% opacity.
3. **Zone 2 (Trackpad)** — full-area invisible drag surface. Contains gesture hint ("Swipe or scroll to adjust"), thin horizontal rule, and mute button (bottom-right corner, z-index 20).
4. **Zone 3 (TO)** — same as Zone 1. Tapping the number copies the value to clipboard; unit pill briefly shows "✓".
5. **Dock** — `CategoryDock.tsx`; 7 tabs, active tab has a sliding 2-px accent underline (`layoutId="category-indicator"`).
6. **Footer** — `about the developer` → samirhusain.info.

`InstallPrompt` is mounted from `page.tsx` as a sibling of `Americanizer`.

## Architectural rules

1. **Single source of truth** is the Zustand store, expressed in the active category's *from* unit. The "to" number is always derived via `convert()`.
2. **Selectors return primitives or stable references.** Never return a freshly-constructed object from a `useConverter` selector — it triggers `getServerSnapshot should be cached`. Derive composite views with `useMemo` in the component.
3. **Per-category state is independent.** Switching the dock category preserves the prior category's units and value.
4. **Identical from/to units are allowed** (e.g. C → C). Don't add validation against this.
5. **Display-layer formatting is separate from state.** Culinary fractions and number rounding live in `lib/format.ts`. The store stays in exact decimals.

## Temperature fixed-axis rule

When `active === "temperature"`, a `useEffect` forces `fromUnit = "c"` and `toUnit = "f"`. The unit pills are rendered with `interactive={false}`. The swap button is hidden. Do not break this invariant — it also drives the ambient gradient effect correctly.

## Conversion model

`lib/units.ts` defines each category with a canonical base unit and per-unit `toBase`/`fromBase` lambdas. Non-linear (°C/°F/K) and linear conversions share the same shape. Add a unit by appending to the category's `units` array.

`CategoryDef.minInBase` (optional) sets a physical lower bound in the base unit. The store's `clampToMin()` helper enforces this floor in `setValue`, `setUnit`, and `swap` — preventing e.g. negative weights or sub-absolute-zero temperatures. Set `minInBase: 0` for physical quantities, `minInBase: -273.15` for temperature (°C base), and omit it for unbounded categories.

## Scrub trackpad (`ScrubDial.tsx`)

`ScrubDial` is an **invisible full-area drag surface** — not a visible knob. The original knurled-dial design was replaced with a minimalist trackpad:

- `useDrag` from `@use-gesture/react`, pointer-captured, `filterTaps: true`. Wrapped in a plain `<div {...bind()} />`.
- **Slide mode only.** Gesture computed as `mx − my`; detents every **12 px**. Up/right increase, down/left decrease.
- `wheel` handler accumulates `-deltaY` against the same 12-px detent pitch.
- Step is picked from velocity (px/ms): `<0.4 → 0.1`, `<1.4 → 1`, `<3.0 → 10`, else `100`.
- Each detent: emits `onDelta`, plays a Web Audio click via `clickHaptic()`.
- The trackpad doesn't know about from/to. `Americanizer.onScrub` routes `onDelta` to `setValue("from"|"to", …)` based on local `zone` state.

The **mute button** is `position: absolute; right: 20; bottom: 20; z-index: 20` inside Zone 2 — above the drag capture layer (z-index 10). `onPointerDown` is `stopPropagation`'d.

## Active-zone model (`Americanizer.tsx`)

Both value rows render the same `ValueRow` component. `Americanizer` holds local `zone: "from" | "to"` state; the active row gets full opacity + accent underline, and receives all trackpad deltas. Inactive row is at 30% opacity. Zone is **not** persisted. Tapping the row body activates it; tapping the number itself or the unit pill is `stopPropagation`'d so it triggers the keypad / drawer instead.

The TO row has `copyOnFocus` — on number focus, the raw value (rounded to 3dp) is written to the clipboard and the unit pill shows "✓" for 900 ms.

## Context-aware motion pipeline (`Americanizer.tsx`)

The `fromVal` feeds a Framer Motion spring (`useSpring`, stiffness 180, damping 26, mass 0.6) → per-category `useTransform` chains → ambient visual effects. No React state updates; the whole pipeline is a motion value graph.

| Category    | Effect                                                                           |
| ----------- | -------------------------------------------------------------------------------- |
| Temperature | Radial ambient gradient on absolute overlay div (z-0): icy-blue at −10°C → transparent at 20°C → warm-orange at 45°C |
| Weight      | `--num-font-weight` on `<main>` drives Inter variable weight: 100 (0 kg) → 900 (150 kg) |
| Volume      | Accent-tinted overlay div (z-0) rises from bottom: 0% at 0 L → 45% at 5 L (0.06 opacity) |

## Haptics

`lib/haptics.ts` exports `clickHaptic(intensity?)` and `toggleMute()`. Implementation is a Web Audio square-wave click; designed to be swapped 1:1 with a Capacitor haptic plugin in native shells. Don't inline `AudioContext` calls in components — go through this shim.

## Files to know

- `src/components/Americanizer.tsx` — top-level composition + `ValueRow` + active-zone routing + motion pipeline.
- `src/components/ScrubDial.tsx` — invisible trackpad; velocity tiers + mute button live here.
- `src/components/CategoryDock.tsx` — 6-tab dock with animated underline; `LABELS` map drives display names.
- `src/store/converter.ts` — store, persist config, `selectActive`, `selectCategoryState`.
- `src/lib/units.ts` — categories & `convert()`.
- `src/lib/format.ts` — culinary fractions, number formatting.
- `src/lib/math.ts` — `clamp`, `lerp`, `lerpColor`.
- `src/components/InstallPrompt.tsx` — first-visit A2HS modal (iOS + Android steps, platform-detected highlight); dismissal persisted under `americanizer:install-seen`.
- `public/manifest.webmanifest` + `public/icon.svg` + `src/app/icon.svg` — PWA manifest and app/favicon mark.
- `_design_reference/` — original Claude Design HTML/JSX prototype. Read for visual intent; not built.

## Conventions

- No new abstractions for one-off use; match the existing component shape.
- Don't add validation, error handling, or fallbacks for cases that can't happen at this layer (untrusted input lives only at the keypad input, which already sanitizes).
- Keep the `_design_reference/` folder out of typecheck (`tsconfig.json` `exclude`).
- Do not commit; the user runs commits manually.

## Open work

- R3F shader background — `@react-three/fiber` installed but not wired (per-category behavior in README).
- Per-category accent colors (orange/lime/cyan/yellow) not yet wired into live CSS.
- PWA Workbox cache-first service worker.
- Capacitor wrapper for native haptics + App Store / Play Store.
