# Interactions

## Tap targets

| Element                          | Tap behavior                                                                       |
| -------------------------------- | ---------------------------------------------------------------------------------- |
| Zone 1 / Zone 3 row              | Activates that zone (fade-in, accent underline rule, dial routes here)             |
| Zone 1 / Zone 3 number           | Native decimal keypad; edits that side directly                                    |
| Zone 3 (TO) number — on focus    | Also copies the rounded value to the clipboard; unit pill briefly shows "✓"        |
| Zone 1 / Zone 3 unit pill        | Opens the bottom-sheet unit picker for that side (non-temperature only)            |
| Zone 2 trackpad — drag           | Slide gesture to scrub the active zone's value (any direction)                     |
| Zone 2 trackpad — mouse wheel    | Scroll to scrub the active zone's value                                            |
| Swap button                      | Reverses from/to (hidden in Temperature mode)                                      |
| Dock segment                     | Switches active category; animated 2-px underline slides to the new segment        |
| Drawer list item                 | Selects that unit and closes the bottom sheet                                      |
| Mute button (bottom-right, Zone 2) | Toggles click audio on/off (`toggleMute`)                                        |
| Footer link                      | Opens samirhusain.info in a new tab                                                |
| Install modal backdrop           | Dismisses the first-visit install modal                                            |
| Install modal "Got it"           | Dismisses and marks `americanizer:install-seen`                                    |

The trackpad does **not** know about from/to — it just emits `onDelta`. `Americanizer.onScrub` checks the active zone and routes to `setValue("from", …)` or `setValue("to", …)`.

## Temperature — fixed-axis mode

Temperature is a special case: units are locked to °C (from) and °F (to). When the Temperature category is active:

- The unit pills are display-only (no picker on tap).
- The swap button is hidden.
- The ambient gradient effect (icy-blue ↔ warm-orange) is active.

## Active-zone model

`Americanizer` holds local `zone: "from" | "to"` state. The active zone gets:

- Full opacity (inactive zone at 30% opacity).
- A thin accent-colored rule at the bottom of the row.
- All scrub-dial deltas routed to it.

Tapping the row body activates the zone. Tapping the number or unit pill stops propagation so it targets the keypad / drawer without toggling the zone.

## Direct entry rules

- The keypad is summoned by an absolutely-positioned, transparent `<input inputMode="decimal" pattern="[0-9.\-]*">` overlaying the styled glyphs.
- Commit triggers on `blur` and on `Enter`.
- The buffer sanitizer accepts digits, a single decimal point, and a leading minus.
- Editing the *to* number rewrites the underlying *from* value via `convert(toUnit → fromUnit)`. The store invariant holds.

## Copy-to-clipboard (TO row)

When the TO row's number is focused (tapped), the current numeric value is copied to the clipboard (rounded to 3 decimal places). The unit pill briefly shows "✓" for 900 ms as confirmation. This is a passive affordance — it does not affect the input buffer or store.

## Scrub gesture

The Zone 2 trackpad is a full-area invisible drag surface. Only slide mode exists (no spin):

- Gesture is computed as `mx − my` (up/right both increase).
- Detents fire every **12 px** of cumulative `(mx − my)`.
- The mouse `wheel` handler accumulates `-deltaY` against the same 12-px pitch.

## Scrub velocity tiers

| Pointer / wheel velocity (px/ms) | Step  | Felt as            |
| -------------------------------- | ----- | ------------------ |
| `< 0.4`                          | `0.1` | Precision dial-in  |
| `< 1.4`                          | `1`   | Casual scrub       |
| `< 3.0`                          | `10`  | Quick flick        |
| `≥ 3.0`                          | `100` | Hard flick         |

## Pseudo-haptics

Each detent calls `clickHaptic(intensity)`:

- 25 ms square-wave click, 2.2 kHz → 900 Hz exponential ramp.
- Gain peak scaled by `intensity` (clamped at ~0.06).

The audio context is created lazily on first call to comply with browser autoplay policies. To replace with native haptics later, swap the body of `clickHaptic` in `src/lib/haptics.ts`.

The **mute button** (bottom-right corner of Zone 2, z-index 20) calls `toggleMute()` on click. `onPointerDown` is `stopPropagation`'d so the trackpad drag layer cannot steal the tap.

## Context-aware motion effects

Framer Motion value → CSS custom property pipelines drive ambient visual effects without React re-renders:

| Category    | Effect                                                                        |
| ----------- | ----------------------------------------------------------------------------- |
| Temperature | Radial ambient gradient at top: icy-blue at −10°C, fades to transparent at 20°C, shifts to warm-orange at 45°C |
| Weight      | `--num-font-weight` drives Inter's variable weight axis (100 at 0 kg → 900 at 150 kg) |
| Volume      | Accent-colored fill rises from the bottom of the viewport (0% at 0 L → 45% at 5 L, 6% opacity) |

These use a `useMotionValue` → `useSpring` → `useTransform` chain. The spring has stiffness 180, damping 26, mass 0.6.

## Display formatting

| Category    | Unit              | Render                                                     |
| ----------- | ----------------- | ---------------------------------------------------------- |
| Volume      | `cup`/`tbsp`/`tsp`/`floz` | Whole + nearest culinary fraction (`1¾ cup`)        |
| Volume      | other             | Decimal                                                    |
| Length      | any               | Decimal, one-to-one (no compound feet+inches output)       |
| Weight      | any               | Decimal                                                    |
| Temperature | any               | Decimal                                                    |
| Speed       | any               | Decimal                                                    |
| Area        | any               | Decimal                                                    |

Underlying state is always exact decimals. Fractions are display-time only.

### Culinary fractions

Mapped from the fractional remainder to the nearest of:

```
0  ⅛  ⅙  ¼  ⅓  ⅜  ½  ⅝  ⅔  ¾  ⅚  ⅞  1
```

If the nearest match is `0` or `1`, the whole part is adjusted accordingly (no `0¼` or `1⅞` next to a stale whole).

## Active-zone caret

When a value row is the active zone and not being edited, `NumberDisplay` appends a 3 px wide block caret in the active accent color. It blinks at ~0.9 Hz via the `lcd-blink` keyframe (50%/50% steps, no fade). The caret disappears the moment the input is focused.

## Category dock

The dock renders one button per category in `CATEGORY_ORDER` (currently 6: Temp, Mass, Dist, Vol, Speed, Area). The active category's button is full-opacity and bold; inactive buttons are muted. A 2-px accent-colored underline (`layoutId="category-indicator"`) slides between tabs via Framer Motion's shared layout animation.

## First-visit install prompt

On first load, `InstallPrompt` mounts a modal with platform-aware Add-to-Home-Screen instructions.

- Skipped if `window.matchMedia("(display-mode: standalone)")` matches, or (iOS) `navigator.standalone === true`.
- Skipped if `localStorage["americanizer:install-seen"]` is set.
- Platform detected from `navigator.userAgent`; the matching block is highlighted.
- Tapping the backdrop or "Got it" sets `americanizer:install-seen` and closes the modal.

## Keyboard

- `Enter` while editing a number commits the value.
- `Esc` blurs the input → commits whatever's in the buffer (browser default).
- The dock and unit pills are real `<button>`s, so `Tab` + `Space`/`Enter` work natively.
