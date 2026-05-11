# Americanizer

A tactile mobile-first PWA for converting between Metric and US Customary units. Designed to feel like a premium piece of physical hardware — massive numbers, a full-area scrub trackpad, native-keypad direct entry, pseudo-haptic audio feedback.

> Clean typographic aesthetic. Minimal palette (near-white canvas, pure-black ink, single blue accent). Inter variable font drives per-category weight effects.

## Stack

| Concern        | Choice                                          |
| -------------- | ----------------------------------------------- |
| Framework      | **Next.js 15** (App Router, Turbopack)          |
| Language       | TypeScript (strict)                             |
| Styling        | **Tailwind CSS 4** via `@tailwindcss/postcss`   |
| State          | **Zustand 5** + `persist` (localStorage)        |
| Animation      | **Framer Motion 11** (motion values, springs)   |
| Gestures       | **`@use-gesture/react`** (slide scrub, wheel)   |
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
    page.tsx            Renders <Americanizer /> + <InstallPrompt />
    globals.css         Tailwind 4 + design tokens (@theme)
  components/
    Americanizer.tsx    Top-level composition (3 zones + dock + drawers)
    ScrubDial.tsx       Full-area invisible trackpad — emits velocity-tiered onDelta
    NumberDisplay.tsx   Massive number + transparent decimal input overlay + caret
    UnitPill.tsx        Tappable unit chip (display-only in Temperature mode)
    UnitDrawer.tsx      Vaul bottom-sheet with metric/us grouped unit list
    SwapButton.tsx      Reverses from/to (hidden in Temperature mode)
    CategoryDock.tsx    Animated-underline segmented control (6 categories)
    InstallPrompt.tsx   First-visit A2HS modal (iOS + Android, platform-detected)
  lib/
    units.ts            Category + unit definitions, convert()
    format.ts           Display formatting (incl. culinary fractions)
    haptics.ts          Web Audio click; abstracted for Capacitor swap
    math.ts             clamp, lerp, lerpColor helpers
  store/
    converter.ts        Zustand store + persist middleware
_design_reference/      Original Claude Design HTML/JSX prototype
```

## Layout

Five vertical zones inside the viewport:

1. **Header.** Brand label (left) + active category label in accent color (right).
2. **Zone 1 — From `ValueRow`.** Muted unit name above a massive editable number; unit pill to the right. Active zone is full opacity, inactive at 30%. Thin accent rule at the bottom when active.
3. **Zone 2 — Trackpad.** Full-area invisible drag surface with a gesture hint ("Swipe or scroll to adjust") and a thin horizontal rule. Also hosts the mute button (bottom-right corner).
4. **Zone 3 — To `ValueRow`.** Same component as Zone 1. Tapping the number copies the value to the clipboard (unit pill briefly shows "✓").
5. **Dock.** Segmented control for Temp / Mass / Dist / Vol / Speed / Area / Currency. Active category shown with a sliding 2-px accent underline.
6. **Footer.** Small "about the developer" link → [samirhusain.info](https://samirhusain.info).

An `InstallPrompt` modal surfaces on the first visit. It platform-detects iOS vs Android and highlights the matching A2HS instructions; dismissal is remembered in `localStorage` under `americanizer:install-seen` and the modal skips itself when the app is already running as an installed PWA.

## Categories

Six categories, each with independent per-category state (units + value persist across category switches):

| Category    | Dock label | Default             | Notes                                    |
| ----------- | ---------- | ------------------- | ---------------------------------------- |
| Temperature | Temp       | 22 °C → 71.6 °F    | Fixed axis; no picker/swap; floor −273.15 °C |
| Weight      | Mass       | 70 kg → 154.3 lb   | Font-weight effect; floor 0              |
| Length      | Dist       | 1 m → 39.37 in     | Floor 0                                  |
| Volume      | Vol        | 1 L → 33.81 fl oz  | Culinary fractions; fill effect; floor 0 |
| Speed       | Speed      | 100 km/h → 62.1 mph| Floor 0                                  |
| Area        | Area       | 100 m² → 1076.4 ft²| Floor 0                                  |
| Currency    | Currency   | 1 USD → INR        | Live exchange rates; floor 0             |

See [`docs/units.md`](docs/units.md) for the full unit list per category.

## State model

Zustand keeps **independent per-category state**, so switching categories preserves prior selections:

```ts
{
  active: "temperature" | "weight" | "length" | "volume" | "speed" | "area",
  perCategory: {
    [category]: { fromUnit, toUnit, value }   // value is in fromUnit
  }
}
```

The store is the single source of truth. The displayed "to" number is derived: `convert(category, value, fromUnit, toUnit)`. Identical from/to selections are allowed. All `setValue`, `setUnit`, and `swap` actions clamp the resulting from-value to the category's `minInBase` physical floor (e.g. 0 for weight/length/volume, −273.15 °C for temperature).

The store is persisted under the key `americanizer:v1` with `partialize` to keep storage minimal.

### Selectors

`useConverter` is consumed via stable per-field selectors. Returning a fresh derived object from a selector triggers React's *getServerSnapshot should be cached* warning, so derivation is done in the consuming component with `useMemo`:

```ts
const active = useConverter(selectActive);
const cat = useConverter(selectCategoryState);   // {fromUnit, toUnit, value}
const current = useMemo(() => ({
  ...cat,
  toVal: convert(active, cat.value, cat.fromUnit, cat.toUnit),
}), [active, cat]);
```

## Scrub trackpad

`ScrubDial` is an invisible full-area drag capture surface — no visible knob. `@use-gesture/react`'s `useDrag` in slide-only mode:

- Gesture is `mx − my`: up/right both increase, down/left both decrease.
- Detents fire every **12 px** of accumulated `(mx − my)`.
- Mouse `wheel` accumulates `-deltaY` against the same 12-px pitch.
- Each detent plays a 25 ms square-wave click via Web Audio (`lib/haptics.ts`) and emits `onDelta`.

`onDelta` flows up through `Americanizer.onScrub`, which routes to `setValue("from", …)` or `setValue("to", …)` depending on the active zone.

### Velocity tiers

| Pointer velocity (px/ms) | Step  |
| ------------------------ | ----- |
| `< 0.4`                  | `0.1` |
| `< 1.4`                  | `1`   |
| `< 3.0`                  | `10`  |
| `≥ 3.0`                  | `100` |

## Context-aware motion pipeline

`fromVal` feeds a Framer Motion spring → per-category `useTransform` chains → ambient visual effects. No React state updates; the whole pipeline is a motion value graph.

| Category    | Effect                                                                           |
| ----------- | -------------------------------------------------------------------------------- |
| Temperature | Radial ambient gradient at top of viewport: icy-blue (−10°C) → warm-orange (45°C) |
| Weight      | `--num-font-weight` drives Inter's variable weight axis: 100 at 0 kg → 900 at 150 kg |
| Volume      | Accent-tinted fill rises from the bottom: 0% at 0 L → 45% height at 5 L (6% opacity) |

## Direct numeric entry

`NumberDisplay` renders styled glyphs with a transparent `<input inputMode="decimal" pattern="[0-9.\-]*">` overlay to summon the native mobile numeric keypad. Commit triggers on `blur` and `Enter`. Editing the TO side recomputes the FROM value via inverse `convert()` so the store invariant holds.

When a zone is active (and not editing), `NumberDisplay` renders a 3-px block caret at the end of the number, blinking via the `lcd-blink` keyframe in `globals.css`.

## Display formatting

- **Volume + culinary US units** (`cup`, `tbsp`, `tsp`, `floz`) render the fractional remainder as the nearest of `⅛ ⅙ ¼ ⅓ ⅜ ½ ⅝ ⅔ ¾ ⅚ ⅞`. Underlying state is always exact decimals.
- **All other categories** render as decimals. No compound `5'10"` output for length — pick `cm`, `in`, `ft` directly.

## Haptics

`lib/haptics.ts` exports `clickHaptic(intensity?: number)` and `toggleMute()`. The Web Audio implementation is intentionally a thin shim so it can be swapped one-for-one with a Capacitor haptic plugin when shipping to native shells.

The **mute button** (bottom-right of Zone 2, z-index 20) toggles mute state. `onPointerDown` is `stopPropagation`'d to prevent the drag gesture from capturing the tap.

## Design tokens

Defined in `src/app/globals.css` under `@theme`:

| Token                  | Value     | Use                                   |
| ---------------------- | --------- | ------------------------------------- |
| `--color-canvas`       | `#FAFAFA` | Page background                       |
| `--color-ink-active`   | `#000000` | Primary text and strokes              |
| `--color-ink-muted`    | `#A3A3A3` | Labels, inactive elements, hints      |
| `--color-accent`       | `#0055FF` | Active underline, accent rule, copy "✓" |

Utility classes:

- `.num-display` — Inter with `tnum`, `lnum`, tight tracking, and `font-variation-settings: "wght" var(--num-font-weight, 400)`.
- `lcd-blink` keyframe — 50%/50% opacity steps for the active-zone caret.

## Roadmap

- [ ] **R3F shader background** — `@react-three/fiber` installed but not wired. Per-category behavior: Temperature freeze→scorching, Weight density/shadow, Length human-scale→vehicular, Volume fluid sloshing fill.
- [x] **Context-aware motion pipeline** — ambient gradient (temperature), variable font weight (weight), accent fill (volume)
- [x] **Speed and Area categories**
- [x] **Mute toggle** — bottom-right button in Zone 2
- [x] **Copy-to-clipboard** — TO row copies value on focus
- [x] **PWA basics** — manifest + SVG app icon + first-visit install prompt (iOS/Android)
- [ ] **PWA caching** — Workbox cache-first service worker
- [ ] **Per-category accent colors** — orange (temp) / lime (weight) / cyan (length) / yellow (volume) wired into CSS
- [ ] Capacitor wrapper for App Store / Play Store, real haptics

## Notes

- The original Claude Design prototype is preserved in `_design_reference/` — useful for visual reference but not part of the build.
- `_design_reference/` is excluded from `tsconfig.json` to keep typecheck fast.
