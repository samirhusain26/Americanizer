# Interactions

## Tap targets

| Element                     | Tap behavior                                              |
| --------------------------- | --------------------------------------------------------- |
| Zone 1 / Zone 3 row         | Activates that zone (caret + LCD ring, dial routes here)  |
| Zone 1 / Zone 3 number      | Native decimal keypad, edits that side directly           |
| Zone 1 / Zone 3 unit pill   | Opens the bottom sheet of units for that side             |
| Scrub dial                  | Drag (spin or slide) to scrub the active zone; tap filtered (`filterTaps`) |
| Scrub dial (desktop)        | Mouse wheel scrolls the active zone                       |
| Swap button                 | Reverses from/to (180° rotate animation, accent-colored arrow) |
| Dock segment                | Switches active category (no layout animation; flat hard-shadow chip) |
| Drawer "CLOSE ✕"            | Dismisses the bottom sheet                                |

The dial does **not** know about from/to — it just emits `onDelta`. `Americanizer.onScrub` checks the active zone and routes to `setValue("from", …)` or `setValue("to", …)`.

## Direct entry rules

- The keypad is summoned by an absolutely-positioned, transparent `<input inputMode="decimal" pattern="[0-9.\-]*">` overlaying the styled glyphs.
- While focused the input shows its own buffer; the underlying display freezes until commit.
- Commit triggers on `blur` and on `Enter`.
- The buffer sanitizer accepts digits, a single decimal point, and a leading minus.
- Editing the *to* number rewrites the underlying *from* value via `convert(toUnit → fromUnit)`. The store invariant holds.

## Dial gesture modes

Within the first ~6 px of pointer travel after press, the dial picks one of two modes and locks for the remainder of the gesture:

- **Spin** — pointer is on the outer rim *and* the initial motion is more tangential than radial. Detents fire every `2π/30` rad (~12°) of accumulated angle. The rim rotates 1:1 with the finger.
- **Slide** — pointer is inside the inner cap, or the initial motion is more radial than tangential. Detents fire every 12 px of cumulative `(mx − my)`. Up and right both increase; down and left both decrease. The rim rotates proportionally to the slide distance so it doesn't feel dead.

Mouse `wheel` is treated like slide: every 12 px of accumulated `-deltaY` fires one detent at the current wheel velocity.

## Scrub velocity tiers

| Pointer / wheel velocity (px/ms) | Step  | Felt as            |
| -------------------------------- | ----- | ------------------ |
| `< 0.4`                          | `0.1` | Precision dial-in  |
| `< 1.4`                          | `1`   | Casual scrub       |
| `< 3.0`                          | `10`  | Quick flick        |
| `≥ 3.0`                          | `100` | Hard flick         |

## Pseudo-haptics

Each detent calls `clickHaptic(intensity)`:

- 25 ms square-wave click, 2.2 kHz → 900 Hz exponential ramp
- Gain peak scaled by `intensity` (clamped at ~0.06)
- Plus a 1-pixel y-translate via Framer Motion for a perceived "click"

The audio context is created lazily on first call to comply with browser autoplay policies. To replace with native haptics later, swap the body of `clickHaptic` in `src/lib/haptics.ts`.

## Display formatting

| Category    | Unit              | Render                                                     |
| ----------- | ----------------- | ---------------------------------------------------------- |
| Volume      | `cup`/`tbsp`/`tsp`/`floz` | Whole + nearest culinary fraction (`1¾ cup`)        |
| Volume      | other             | Decimal                                                    |
| Length      | any               | Decimal, one-to-one (no compound feet+inches output)       |
| Weight      | any               | Decimal                                                    |
| Temperature | any               | Decimal                                                    |

Underlying state is always exact decimals. Fractions are display-time only.

### Culinary fractions

Mapped from the fractional remainder to the nearest of:

```
0  ⅛  ⅙  ¼  ⅓  ⅜  ½  ⅝  ⅔  ¾  ⅚  ⅞  1
```

If the nearest match is `0` or `1`, the whole part is adjusted accordingly (no `0¼` or `1⅞` next to a stale whole).

## Active-zone caret

When a value row is the active zone and not being edited, `NumberDisplay` appends a 3 px wide block caret in the active accent color. It blinks at ~0.9 Hz via the `lcd-blink` keyframe (50%/50% steps, no fade — the LCD vibe). The caret is purely cosmetic; it disappears the moment the input is focused.

## Keyboard

- `Enter` while editing a number commits the value.
- `Esc` blurs the input → commits whatever's in the buffer (browser default).
- The dock and pills are real `<button>`s, so `Tab` + `Space`/`Enter` work natively.
