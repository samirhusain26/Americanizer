# Interactions

## Tap targets

| Element              | Tap behavior                                          |
| -------------------- | ----------------------------------------------------- |
| Zone 1 number        | Native decimal keypad, edits the *from* value         |
| Zone 1 unit pill     | Bottom sheet of units for the from side               |
| Scrub dial           | Drag to scrub; tap is filtered out (`filterTaps`)     |
| Swap button          | Reverses from/to (180° rotate animation)              |
| Zone 3 number        | Native decimal keypad, edits the *to* value           |
| Zone 3 unit pill     | Bottom sheet of units for the to side                 |
| Dock segment         | Switches active category, animates pill via `layoutId` |

## Direct entry rules

- The keypad is summoned by an absolutely-positioned, transparent `<input inputMode="decimal" pattern="[0-9.\-]*">` overlaying the styled glyphs.
- While focused the input shows its own buffer; the underlying display freezes until commit.
- Commit triggers on `blur` and on `Enter`.
- The buffer sanitizer accepts digits, a single decimal point, and a leading minus.
- Editing the *to* number rewrites the underlying *from* value via `convert(toUnit → fromUnit)`. The store invariant holds.

## Scrub velocity tiers

| Pointer velocity (px/ms) | Step  | Felt as            |
| ------------------------ | ----- | ------------------ |
| `< 0.4`                  | `0.1` | Precision dial-in  |
| `< 1.4`                  | `1`   | Casual scrub       |
| `< 3.0`                  | `10`  | Quick flick        |
| `≥ 3.0`                  | `100` | Hard flick         |

A detent fires every 12 px of cumulative pointer travel `(mx − my)`. Up and right both increase; down and left both decrease.

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

## Keyboard

- `Enter` while editing a number commits the value.
- `Esc` blurs the input → commits whatever's in the buffer (browser default).
- The dock and pills are real `<button>`s, so `Tab` + `Space`/`Enter` work natively.
