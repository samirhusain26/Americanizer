// americanizer.jsx — the converter app component
// Renders inside an IOSDevice frame. Reads visual options from `tweaks` prop.
//
// Exports to window: Americanizer

const { useState, useRef, useEffect, useCallback, useMemo } = React;

// ─────────────────────────────────────────────────────────────
// Conversions
// ─────────────────────────────────────────────────────────────
const CATS = {
  temperature: {
    label: 'Temperature',
    short: 'TEMP',
    glyph: '°',
    units: [
      { id: 'C', pill: '°C', name: 'Celsius', metric: true },
      { id: 'F', pill: '°F', name: 'Fahrenheit', metric: false },
      { id: 'K', pill: 'K',  name: 'Kelvin',     metric: true },
    ],
    // C is base
    toBase:   { C: v => v, F: v => (v - 32) * 5 / 9, K: v => v - 273.15 },
    fromBase: { C: v => v, F: v => v * 9 / 5 + 32, K: v => v + 273.15 },
    defaults: { from: 'C', to: 'F', value: 22 },
    range: { min: -50, max: 200 },
    step: 0.1,
  },
  weight: {
    label: 'Weight',
    short: 'MASS',
    glyph: '⚖',
    units: [
      { id: 'kg', pill: 'kg', name: 'Kilograms', metric: true },
      { id: 'lb', pill: 'lb', name: 'Pounds',    metric: false },
      { id: 'g',  pill: 'g',  name: 'Grams',     metric: true },
      { id: 'oz', pill: 'oz', name: 'Ounces',    metric: false },
      { id: 'st', pill: 'st', name: 'Stone',     metric: false },
    ],
    // kg is base
    toBase:   { kg: v => v, lb: v => v * 0.45359237, g: v => v / 1000, oz: v => v * 0.028349523, st: v => v * 6.35029318 },
    fromBase: { kg: v => v, lb: v => v / 0.45359237, g: v => v * 1000, oz: v => v / 0.028349523, st: v => v / 6.35029318 },
    defaults: { from: 'kg', to: 'lb', value: 70 },
    range: { min: 0, max: 300 },
    step: 0.1,
  },
  length: {
    label: 'Length',
    short: 'DIST',
    glyph: '↔',
    units: [
      { id: 'm',  pill: 'm',  name: 'Meters',      metric: true },
      { id: 'ft', pill: 'ft', name: 'Feet',        metric: false },
      { id: 'in', pill: 'in', name: 'Inches',      metric: false },
      { id: 'cm', pill: 'cm', name: 'Centimeters', metric: true },
      { id: 'mm', pill: 'mm', name: 'Millimeters', metric: true },
      { id: 'km', pill: 'km', name: 'Kilometers',  metric: true },
      { id: 'mi', pill: 'mi', name: 'Miles',       metric: false },
      { id: 'yd', pill: 'yd', name: 'Yards',       metric: false },
    ],
    toBase:   { m: v => v, ft: v => v * 0.3048, in: v => v * 0.0254, cm: v => v / 100, mm: v => v / 1000, km: v => v * 1000, mi: v => v * 1609.344, yd: v => v * 0.9144 },
    fromBase: { m: v => v, ft: v => v / 0.3048, in: v => v / 0.0254, cm: v => v * 100, mm: v => v * 1000, km: v => v / 1000, mi: v => v / 1609.344, yd: v => v / 0.9144 },
    defaults: { from: 'm', to: 'in', value: 1 },
    range: { min: 0, max: 1000 },
    step: 0.01,
  },
  volume: {
    label: 'Volume',
    short: 'VOL',
    glyph: '◌',
    units: [
      { id: 'L',     pill: 'L',     name: 'Liters',       metric: true },
      { id: 'mL',    pill: 'mL',    name: 'Milliliters',  metric: true },
      { id: 'fl_oz', pill: 'fl oz', name: 'Fluid Ounces', metric: false },
      { id: 'cup',   pill: 'cup',   name: 'Cups',         metric: false },
      { id: 'tbsp',  pill: 'tbsp',  name: 'Tablespoons',  metric: false },
      { id: 'tsp',   pill: 'tsp',   name: 'Teaspoons',    metric: false },
      { id: 'gal',   pill: 'gal',   name: 'Gallons',      metric: false },
      { id: 'pt',    pill: 'pt',    name: 'Pints',        metric: false },
    ],
    // mL is base
    toBase:   { L: v => v * 1000, mL: v => v, fl_oz: v => v * 29.5735, cup: v => v * 240, tbsp: v => v * 14.7867, tsp: v => v * 4.92892, gal: v => v * 3785.41, pt: v => v * 473.176 },
    fromBase: { L: v => v / 1000, mL: v => v, fl_oz: v => v / 29.5735, cup: v => v / 240, tbsp: v => v / 14.7867, tsp: v => v / 4.92892, gal: v => v / 3785.41, pt: v => v / 473.176 },
    defaults: { from: 'L', to: 'fl_oz', value: 1 },
    range: { min: 0, max: 100 },
    step: 0.01,
  },
};

const FRACTION_UNITS = new Set(['cup', 'tbsp', 'tsp', 'fl_oz']);

// Culinary fractional formatter — rounds to nearest common cooking fraction
const FRAC_TARGETS = [
  [0,    ''  ],
  [1/8,  '⅛'],
  [1/4,  '¼'],
  [1/3,  '⅓'],
  [3/8,  '⅜'],
  [1/2,  '½'],
  [5/8,  '⅝'],
  [2/3,  '⅔'],
  [3/4,  '¾'],
  [7/8,  '⅞'],
  [1,    ''  ],
];
function formatFraction(value) {
  const sign = value < 0 ? '−' : '';
  const v = Math.abs(value);
  const whole = Math.floor(v);
  const frac = v - whole;
  let best = FRAC_TARGETS[0], bestErr = 99;
  for (const t of FRAC_TARGETS) {
    const e = Math.abs(frac - t[0]);
    if (e < bestErr) { best = t; bestErr = e; }
  }
  if (best[0] === 0)  return `${sign}${whole}`;
  if (best[0] === 1)  return `${sign}${whole + 1}`;
  if (whole === 0)    return `${sign}${best[1]}`;
  return `${sign}${whole}\u202F${best[1]}`;
}

function formatNumber(value, unit, isEditing) {
  if (!isFinite(value)) return '—';
  if (isEditing) return value.toString();
  if (FRACTION_UNITS.has(unit)) return formatFraction(value);
  // standard decimal
  const abs = Math.abs(value);
  let digits = 2;
  if (abs >= 100) digits = 1;
  if (abs >= 1000) digits = 0;
  if (abs < 1 && abs > 0) digits = 3;
  const out = value.toFixed(digits);
  // strip trailing zeros after decimal
  return out.replace(/\.?0+$/, '');
}

// ─────────────────────────────────────────────────────────────
// Theme tokens
// ─────────────────────────────────────────────────────────────
const TONES = {
  charcoal: { bg: '#14130F', fg: '#F4F1EB', muted: 'rgba(244,241,235,0.55)', faint: 'rgba(244,241,235,0.18)', divider: 'rgba(244,241,235,0.08)', dock: 'rgba(244,241,235,0.05)', sheet: '#1B1A15', sheetFg: '#F4F1EB', dark: true },
  taupe:    { bg: '#2A2520', fg: '#EDE6DA', muted: 'rgba(237,230,218,0.55)', faint: 'rgba(237,230,218,0.18)', divider: 'rgba(237,230,218,0.08)', dock: 'rgba(237,230,218,0.05)', sheet: '#332D26', sheetFg: '#EDE6DA', dark: true },
  paper:    { bg: '#F4EFE6', fg: '#1A1916', muted: 'rgba(26,25,22,0.55)',     faint: 'rgba(26,25,22,0.15)',     divider: 'rgba(26,25,22,0.08)',     dock: 'rgba(26,25,22,0.04)',  sheet: '#FFFFFF', sheetFg: '#1A1916', dark: false },
};

const ACCENTS = {
  amber:       '#F2A030',
  yellowgreen: '#C8D02E',
  magenta:     '#E83D8C',
  cyan:        '#3FB6E0',
};

const NUMBER_FONTS = {
  display: '"Funnel Display", ui-sans-serif, system-ui, sans-serif',
  serif:   '"Newsreader", ui-serif, Georgia, serif',
  mono:    '"IBM Plex Mono", ui-monospace, monospace',
};

// ─────────────────────────────────────────────────────────────
// Knob — circular drag-rotation control with velocity-based scrubbing
// ─────────────────────────────────────────────────────────────
function Knob({ size = 220, value, accent, theme, onScrub, onTick, dialStyle = 'knob' }) {
  const ref = useRef(null);
  const stateRef = useRef({ angle: 0, lastAngle: 0, lastT: 0, dragging: false, accumDeg: 0 });
  const [angle, setAngle] = useState(0);
  const [active, setActive] = useState(false);

  // Track the visual rotation independently — knob spins as user scrubs.
  // Convert pointer angle relative to center.
  const angleAt = useCallback((ev) => {
    const rect = ref.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180 / Math.PI;
  }, []);

  const onPointerDown = (ev) => {
    ev.preventDefault();
    ev.target.setPointerCapture(ev.pointerId);
    stateRef.current.dragging = true;
    stateRef.current.lastAngle = angleAt(ev);
    stateRef.current.lastT = performance.now();
    setActive(true);
  };
  const onPointerMove = (ev) => {
    if (!stateRef.current.dragging) return;
    const a = angleAt(ev);
    let d = a - stateRef.current.lastAngle;
    // wrap shortest arc
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    const now = performance.now();
    const dt = Math.max(1, now - stateRef.current.lastT);
    const speed = Math.abs(d) / dt; // deg/ms
    // velocity multiplier (Bloomberg-style adaptive)
    let mult = 0.1;       // slow: 0.1 per degree
    if (speed > 1.2) mult = 1;
    if (speed > 3.5) mult = 10;
    if (speed > 8)   mult = 100;
    const delta = d * mult;
    stateRef.current.lastAngle = a;
    stateRef.current.lastT = now;
    stateRef.current.angle += d;
    setAngle(stateRef.current.angle);
    onScrub && onScrub(delta, speed);
    // accumulate degree count between haptic ticks
    stateRef.current.accumDeg += Math.abs(d);
    if (stateRef.current.accumDeg > 18) {
      stateRef.current.accumDeg = 0;
      onTick && onTick();
    }
  };
  const onPointerUp = (ev) => {
    stateRef.current.dragging = false;
    try { ev.target.releasePointerCapture(ev.pointerId); } catch(e) {}
    setActive(false);
  };

  // Reflect external value changes as a slow drift
  useEffect(() => {
    // no-op; the scrubber drives the value, which then re-renders us
  }, [value]);

  const ticks = 60;
  const tickArr = Array.from({ length: ticks }, (_, i) => i);
  const inner = size * 0.72;

  return (
    <div className="am-knob" style={{
      width: size, height: size, position: 'relative',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* outer ring with notches */}
      <div
        ref={ref}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: theme.dark
            ? 'radial-gradient(circle at 50% 30%, rgba(255,255,255,0.06), transparent 65%), radial-gradient(circle at 50% 80%, rgba(0,0,0,0.5), transparent 70%), #0E0D0A'
            : 'radial-gradient(circle at 50% 30%, rgba(255,255,255,0.9), transparent 60%), radial-gradient(circle at 50% 80%, rgba(0,0,0,0.08), transparent 70%), #E9E3D7',
          border: theme.dark ? '0.5px solid rgba(255,255,255,0.08)' : '0.5px solid rgba(0,0,0,0.1)',
          boxShadow: theme.dark
            ? 'inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -2px 8px rgba(0,0,0,0.6), 0 18px 36px rgba(0,0,0,0.45)'
            : 'inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -2px 8px rgba(0,0,0,0.08), 0 12px 24px rgba(60,50,30,0.18)',
          transform: `rotate(${angle}deg)`,
          transition: active ? 'none' : 'transform 0.4s cubic-bezier(0.2,0.7,0.3,1)',
          cursor: active ? 'grabbing' : 'grab',
        }}
      >
        {/* tick ring */}
        <svg viewBox={`-${size/2} -${size/2} ${size} ${size}`} width={size} height={size}
             style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {tickArr.map(i => {
            const a = (i / ticks) * Math.PI * 2;
            const r1 = size/2 - 6;
            const r2 = size/2 - (i % 5 === 0 ? 18 : 12);
            const x1 = Math.cos(a) * r1, y1 = Math.sin(a) * r1;
            const x2 = Math.cos(a) * r2, y2 = Math.sin(a) * r2;
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={theme.fg} strokeOpacity={i % 5 === 0 ? 0.55 : 0.18}
              strokeWidth={i % 5 === 0 ? 1.4 : 0.8} strokeLinecap="round" />;
          })}
          {/* indicator notch at top */}
          <g transform={`rotate(-90)`}>
            <circle cx={size/2 - 22} cy={0} r={4} fill={accent} />
          </g>
        </svg>

        {/* inner cap */}
        <div style={{
          position: 'absolute', inset: (size - inner) / 2,
          borderRadius: '50%',
          background: theme.dark
            ? 'radial-gradient(circle at 35% 25%, rgba(255,255,255,0.12), transparent 55%), linear-gradient(160deg, #1A1814 0%, #0A0907 100%)'
            : 'radial-gradient(circle at 35% 25%, rgba(255,255,255,1), transparent 55%), linear-gradient(160deg, #FAF6EC 0%, #D9D2C2 100%)',
          boxShadow: theme.dark
            ? 'inset 0 -1px 1px rgba(255,255,255,0.05), inset 0 1px 2px rgba(0,0,0,0.6), 0 4px 12px rgba(0,0,0,0.5)'
            : 'inset 0 -1px 1px rgba(0,0,0,0.05), inset 0 1px 2px rgba(255,255,255,1), 0 4px 12px rgba(60,50,30,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column',
        }}>
          {/* center indent — the "tactile" notch */}
          <div style={{
            width: 12, height: 12, borderRadius: '50%',
            background: theme.dark
              ? 'radial-gradient(circle at 50% 30%, #000, #1A1814)'
              : 'radial-gradient(circle at 50% 70%, #fff, #C5BCA8)',
            boxShadow: theme.dark
              ? 'inset 0 1px 2px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.04)'
              : 'inset 0 1px 2px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.04)',
          }} />
        </div>
      </div>

      {/* indicator pip — fixed, doesn't rotate, marks "12 o'clock" */}
      <div style={{
        position: 'absolute', top: -4, left: '50%', transform: 'translateX(-50%)',
        width: 2, height: 10, background: accent, borderRadius: 1,
        boxShadow: `0 0 8px ${accent}`,
      }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Big tappable number (zone 1 / zone 3)
// ─────────────────────────────────────────────────────────────
function ValueRow({
  value, unit, unitPill, unitName, theme, accent, numberFont,
  onValueChange, onOpenUnitPicker, isActive, onActivate, isTop,
  category,
}) {
  const inputRef = useRef(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const startEdit = () => {
    onActivate && onActivate();
    setDraft(value.toString());
    setEditing(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };
  const commit = () => {
    const n = parseFloat(draft);
    if (isFinite(n)) onValueChange(n);
    setEditing(false);
  };

  const display = formatNumber(value, unit, false);
  // Split into integer and fractional/symbol parts for typographic balance
  const isFrac = FRACTION_UNITS.has(unit);

  return (
    <div
      onClick={onActivate}
      style={{
        position: 'relative', padding: '14px 20px 10px',
        cursor: 'pointer',
      }}
    >
      {/* tiny meta line */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontFamily: '"IBM Plex Mono", monospace',
        fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase',
        color: theme.muted, marginBottom: 6, fontWeight: 500,
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            width: 5, height: 5, borderRadius: '50%',
            background: isActive ? accent : theme.faint,
            boxShadow: isActive ? `0 0 6px ${accent}` : 'none',
            transition: 'all 0.2s',
          }} />
          {isTop ? 'INPUT · A' : 'OUTPUT · B'}
        </span>
        <span>{unitName}</span>
      </div>

      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        gap: 12,
      }}>
        {/* Number */}
        <div
          onClick={(e) => { e.stopPropagation(); startEdit(); }}
          style={{
            flex: 1, minWidth: 0,
            fontFamily: numberFont,
            fontWeight: numberFont.includes('Newsreader') ? 400 : 500,
            fontSize: isFrac ? 96 : 104,
            lineHeight: 0.92,
            letterSpacing: '-0.04em',
            color: theme.fg,
            fontFeatureSettings: '"tnum", "lnum"',
            fontVariantNumeric: 'tabular-nums lining-nums',
            position: 'relative',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'clip',
          }}
        >
          {editing ? (
            <input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              pattern="[0-9]*"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
              style={{
                width: '100%', background: 'transparent', border: 'none',
                outline: 'none', color: theme.fg,
                font: 'inherit', letterSpacing: 'inherit',
                padding: 0,
                caretColor: accent,
              }}
            />
          ) : (
            <span style={{ display: 'inline-block', position: 'relative' }}>
              {display}
              {isActive && (
                <span style={{
                  display: 'inline-block', width: 2, height: '0.7em',
                  background: accent, marginLeft: 4,
                  verticalAlign: 'baseline',
                  animation: 'am-blink 1.1s steps(2) infinite',
                }} />
              )}
            </span>
          )}
        </div>

        {/* Unit pill */}
        <button
          onClick={(e) => { e.stopPropagation(); onOpenUnitPicker(); }}
          style={{
            flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 999,
            background: theme.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            border: `0.5px solid ${theme.divider}`,
            color: theme.fg,
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: 18,
            fontWeight: 500,
            letterSpacing: '0.02em',
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
          }}
        >
          {unitPill}
          <svg width="10" height="10" viewBox="0 0 10 10" style={{ opacity: 0.5 }}>
            <path d="M2 4 L5 7 L8 4" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Bottom dock (segmented)
// ─────────────────────────────────────────────────────────────
function Dock({ category, onChange, theme, accent, variant = 'pill' }) {
  const cats = Object.keys(CATS);
  const labels = { temperature: 'Temp', weight: 'Weight', length: 'Length', volume: 'Volume' };

  if (variant === 'bar') {
    return (
      <div style={{
        display: 'flex', borderTop: `0.5px solid ${theme.divider}`,
        background: theme.bg,
      }}>
        {cats.map(k => (
          <button key={k} onClick={() => onChange(k)} style={{
            flex: 1, padding: '14px 0', border: 'none', background: 'transparent',
            color: k === category ? theme.fg : theme.muted,
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase',
            fontWeight: k === category ? 600 : 400,
            position: 'relative', cursor: 'pointer',
          }}>
            {labels[k]}
            {k === category && (
              <span style={{
                position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                width: 24, height: 2, background: accent, borderRadius: 0,
              }} />
            )}
          </button>
        ))}
      </div>
    );
  }

  if (variant === 'floating') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 16px 10px' }}>
        <div style={{
          display: 'flex', gap: 4, padding: 5,
          background: theme.dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
          border: `0.5px solid ${theme.divider}`,
          borderRadius: 999, backdropFilter: 'blur(20px)',
        }}>
          {cats.map(k => (
            <button key={k} onClick={() => onChange(k)} style={{
              padding: '8px 14px', border: 'none', borderRadius: 999,
              background: k === category ? accent : 'transparent',
              color: k === category ? '#0E0D0A' : theme.muted,
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 11, letterSpacing: '0.06em', fontWeight: 600,
              textTransform: 'uppercase', cursor: 'pointer',
              transition: 'all 0.2s',
            }}>{labels[k]}</button>
          ))}
        </div>
      </div>
    );
  }

  // pill (default) — segmented w/ animated active indicator
  const idx = cats.indexOf(category);
  return (
    <div style={{ padding: '8px 16px 14px' }}>
      <div style={{
        position: 'relative', display: 'flex',
        background: theme.dock, borderRadius: 14, padding: 4,
        border: `0.5px solid ${theme.divider}`,
      }}>
        {/* sliding indicator */}
        <div style={{
          position: 'absolute', top: 4, bottom: 4,
          left: `calc(${(idx / cats.length) * 100}% + 4px)`,
          width: `calc(${100 / cats.length}% - 8px)`,
          background: theme.dark ? 'rgba(255,255,255,0.08)' : '#FFFFFF',
          borderRadius: 10,
          boxShadow: theme.dark
            ? 'inset 0 1px 0 rgba(255,255,255,0.06), 0 1px 3px rgba(0,0,0,0.3)'
            : '0 1px 3px rgba(0,0,0,0.08), 0 0 0 0.5px rgba(0,0,0,0.04)',
          transition: 'left 0.4s cubic-bezier(0.32, 0.72, 0, 1)',
        }} />
        {cats.map((k, i) => (
          <button key={k} onClick={() => onChange(k)} style={{
            flex: 1, padding: '10px 0', border: 'none', background: 'transparent',
            color: k === category ? theme.fg : theme.muted,
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase',
            fontWeight: k === category ? 600 : 500,
            position: 'relative', zIndex: 1, cursor: 'pointer',
            transition: 'color 0.2s',
          }}>
            <div>{CATS[k].short}</div>
            <div style={{
              fontSize: 8.5, opacity: 0.55, marginTop: 2, letterSpacing: '0.06em',
              fontWeight: 400,
            }}>{labels[k]}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Unit picker bottom sheet
// ─────────────────────────────────────────────────────────────
function UnitDrawer({ open, onClose, units, value, onSelect, theme, accent, title }) {
  if (!open) return null;
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 100,
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
    }}>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)',
        animation: 'am-fadein 0.2s',
      }} />
      <div style={{
        position: 'relative', background: theme.sheet, color: theme.sheetFg,
        borderRadius: '20px 20px 0 0',
        padding: '14px 0 32px',
        boxShadow: '0 -10px 30px rgba(0,0,0,0.4)',
        animation: 'am-slideup 0.3s cubic-bezier(0.2, 0.7, 0.3, 1)',
      }}>
        {/* grabber */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: theme.faint }} />
        </div>
        <div style={{
          padding: '0 22px 14px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          borderBottom: `0.5px solid ${theme.divider}`,
        }}>
          <div style={{
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase',
            color: theme.muted, fontWeight: 500,
          }}>{title}</div>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', color: theme.muted,
            fontFamily: '"IBM Plex Mono", monospace', fontSize: 12,
            cursor: 'pointer', padding: 0,
          }}>CLOSE</button>
        </div>
        <div style={{ padding: '8px 0', maxHeight: 360, overflowY: 'auto' }}>
          {units.map(u => {
            const sel = u.id === value;
            return (
              <button key={u.id} onClick={() => onSelect(u.id)} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', padding: '14px 22px', border: 'none', cursor: 'pointer',
                background: sel ? (theme.dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)') : 'transparent',
                color: theme.sheetFg,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: sel ? accent : (u.metric ? theme.faint : 'transparent'),
                    border: !sel && !u.metric ? `1px solid ${theme.faint}` : 'none',
                  }} />
                  <span style={{
                    fontFamily: '"Funnel Display", sans-serif',
                    fontSize: 22, fontWeight: 500,
                  }}>{u.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{
                    fontFamily: '"IBM Plex Mono", monospace',
                    fontSize: 11, color: theme.muted,
                    textTransform: 'uppercase', letterSpacing: '0.1em',
                  }}>{u.metric ? 'METRIC' : 'US'}</span>
                  <span style={{
                    fontFamily: '"IBM Plex Mono", monospace',
                    fontSize: 16, fontWeight: 500,
                    minWidth: 48, textAlign: 'right',
                  }}>{u.pill}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Swap button
// ─────────────────────────────────────────────────────────────
function SwapButton({ onClick, theme, accent }) {
  return (
    <button onClick={onClick} style={{
      width: 44, height: 44, borderRadius: '50%',
      background: theme.dark ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
      border: `0.5px solid ${theme.divider}`,
      color: theme.fg, cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: theme.dark
        ? 'inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 12px rgba(0,0,0,0.4)'
        : '0 4px 12px rgba(60,50,30,0.12), 0 0 0 0.5px rgba(0,0,0,0.04)',
      backdropFilter: 'blur(12px)',
    }}>
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M5 3v9m0 0l-3-3m3 3l3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M13 15V6m0 0l-3 3m3-3l3 3" stroke={accent} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Subtle ambient backdrop (shader-stand-in)
// ─────────────────────────────────────────────────────────────
function Ambient({ category, value, unitFrom, theme, accent, intensity = 0.5 }) {
  // Compute a "heat" coefficient for each category to colour the gradient
  let mid = 0;
  if (category === 'temperature') {
    const c = CATS.temperature.toBase[unitFrom](value);
    mid = Math.max(0, Math.min(1, (c + 10) / 60)); // 0 at -10C, 1 at 50C
  } else if (category === 'weight') {
    const kg = CATS.weight.toBase[unitFrom](value);
    mid = Math.max(0, Math.min(1, kg / 150));
  } else if (category === 'length') {
    const m = CATS.length.toBase[unitFrom](value);
    mid = Math.max(0, Math.min(1, Math.log10(Math.max(1, m)) / 4));
  } else {
    const ml = CATS.volume.toBase[unitFrom](value);
    mid = Math.max(0, Math.min(1, ml / 5000));
  }
  const blend = Math.max(0, Math.min(1, intensity));
  const alpha = 0.18 * blend + 0.04;
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
      background: `
        radial-gradient(ellipse 80% 50% at 50% 0%, ${accent}${Math.round(alpha*255).toString(16).padStart(2,'0')}, transparent 60%),
        radial-gradient(ellipse 60% 30% at 50% 100%, ${accent}${Math.round(alpha*0.6*255).toString(16).padStart(2,'0')}, transparent 60%)
      `,
      opacity: 0.5 + mid * 0.5,
      transition: 'opacity 0.5s, background 0.4s',
    }} />
  );
}

// ─────────────────────────────────────────────────────────────
// Pseudo-haptic click
// ─────────────────────────────────────────────────────────────
const audioCtxRef = { ctx: null };
function tick() {
  try {
    if (!audioCtxRef.ctx) audioCtxRef.ctx = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = audioCtxRef.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 1100;
    o.type = 'square';
    g.gain.setValueAtTime(0.03, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.03);
  } catch(e) {}
}

// ─────────────────────────────────────────────────────────────
// Americanizer — full screen
// ─────────────────────────────────────────────────────────────
function Americanizer({ tweaks = {}, initialCategory = 'temperature', miniature = false }) {
  const [category, setCategory] = useState(initialCategory);
  const [units, setUnits] = useState({}); // { categoryId: { from, to } }
  const [values, setValues] = useState({}); // { categoryId: number (in 'from' unit) }
  const [activeZone, setActiveZone] = useState('top'); // 'top' | 'bottom'
  const [drawer, setDrawer] = useState(null); // null | 'top' | 'bottom'

  // initial defaults
  useEffect(() => {
    const u = {}; const v = {};
    for (const [k, c] of Object.entries(CATS)) {
      u[k] = { from: c.defaults.from, to: c.defaults.to };
      v[k] = c.defaults.value;
    }
    setUnits(u); setValues(v);
  }, []);

  const cat = CATS[category];
  const cu = units[category] || { from: cat.defaults.from, to: cat.defaults.to };
  const fromVal = values[category] ?? cat.defaults.value;
  const baseVal = cat.toBase[cu.from](fromVal);
  const toVal = cat.fromBase[cu.to](baseVal);

  const tone = TONES[tweaks.tone || 'charcoal'];
  const accent = ACCENTS[tweaks.accent || 'amber'];
  const numberFont = NUMBER_FONTS[tweaks.numberStyle || 'display'];
  const dialStyle = tweaks.dialStyle || 'knob';
  const dockVariant = tweaks.dockVariant || 'pill';
  const intensity = tweaks.shaderIntensity ?? 0.5;

  const setFrom = (newVal) => setValues(s => ({ ...s, [category]: newVal }));
  const setTo = (newVal) => {
    // when bottom zone is edited, reverse-compute 'from' value
    const base = cat.toBase[cu.to](newVal);
    const newFrom = cat.fromBase[cu.from](base);
    setValues(s => ({ ...s, [category]: newFrom }));
  };

  const onScrub = useCallback((delta, speed) => {
    if (activeZone === 'top') {
      setValues(s => ({ ...s, [category]: clamp((s[category] ?? cat.defaults.value) + delta, cat.range.min, cat.range.max) }));
    } else {
      // scrub bottom
      const newToVal = clamp(toVal + delta, -1e6, 1e6);
      setTo(newToVal);
    }
  }, [activeZone, category, toVal]);

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  const swap = () => {
    setUnits(s => ({ ...s, [category]: { from: cu.to, to: cu.from } }));
    setValues(s => ({ ...s, [category]: toVal }));
    tick();
  };

  const fromUnit = cat.units.find(u => u.id === cu.from);
  const toUnit   = cat.units.find(u => u.id === cu.to);

  return (
    <div className="am-screen" style={{
      position: 'absolute', inset: 0, background: tone.bg, color: tone.fg,
      fontFamily: '"IBM Plex Mono", monospace',
      display: 'flex', flexDirection: 'column',
      paddingTop: 54, /* status bar */
    }}>
      <Ambient category={category} value={fromVal} unitFrom={cu.from} theme={tone} accent={accent} intensity={intensity} />

      {/* top header strip */}
      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '4px 20px 2px',
        fontSize: 9.5, letterSpacing: '0.18em', textTransform: 'uppercase',
        color: tone.muted, fontWeight: 500,
      }}>
        <span>AMERICANIZER</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 4, height: 4, borderRadius: '50%', background: accent }} />
          {cat.label}
        </span>
      </div>

      {/* Zone 1 */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <ValueRow
          value={fromVal}
          unit={cu.from}
          unitPill={fromUnit?.pill}
          unitName={fromUnit?.name}
          theme={tone}
          accent={accent}
          numberFont={numberFont}
          isActive={activeZone === 'top'}
          onActivate={() => setActiveZone('top')}
          onValueChange={setFrom}
          onOpenUnitPicker={() => setDrawer('top')}
          isTop
          category={category}
        />
      </div>

      {/* dividing rule */}
      <div style={{ position: 'relative', zIndex: 1, padding: '0 20px' }}>
        <div style={{ height: 1, background: tone.divider }} />
      </div>

      {/* Zone 2 — knob engine */}
      <div style={{
        position: 'relative', zIndex: 1, flex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '8px 0',
      }}>
        {dialStyle === 'knob' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <Knob size={210} value={fromVal} accent={accent} theme={tone}
                  onScrub={onScrub} onTick={tick} />
          </div>
        )}
        {dialStyle === 'ruler' && (
          <RulerScrub value={fromVal} accent={accent} theme={tone} onScrub={onScrub} onTick={tick} />
        )}
        {dialStyle === 'segmented' && (
          <SegmentedScrub value={fromVal} accent={accent} theme={tone} onScrub={onScrub} onTick={tick} />
        )}

        {/* Swap button — floating top-right of engine zone */}
        <button onClick={swap} style={{
          position: 'absolute', top: 14, right: 22,
          width: 40, height: 40, borderRadius: '50%',
          background: tone.dark ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
          border: `0.5px solid ${tone.divider}`,
          color: tone.fg, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: tone.dark
            ? '0 4px 12px rgba(0,0,0,0.4)'
            : '0 4px 12px rgba(60,50,30,0.12)',
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 5h10m0 0l-3-3m3 3l-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M13 11H3m0 0l3 3m-3-3l3-3" stroke={accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Tiny meter readout below knob */}
        <div style={{
          position: 'absolute', bottom: 4, left: 0, right: 0,
          display: 'flex', justifyContent: 'center',
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase',
          color: tone.muted,
        }}>
          <span style={{ opacity: 0.7 }}>{activeZone === 'top' ? 'A → SCRUB' : 'B → SCRUB'} · DRAG TO SET</span>
        </div>
      </div>

      {/* dividing rule */}
      <div style={{ position: 'relative', zIndex: 1, padding: '0 20px' }}>
        <div style={{ height: 1, background: tone.divider }} />
      </div>

      {/* Zone 3 */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <ValueRow
          value={toVal}
          unit={cu.to}
          unitPill={toUnit?.pill}
          unitName={toUnit?.name}
          theme={tone}
          accent={accent}
          numberFont={numberFont}
          isActive={activeZone === 'bottom'}
          onActivate={() => setActiveZone('bottom')}
          onValueChange={setTo}
          onOpenUnitPicker={() => setDrawer('bottom')}
          category={category}
        />
      </div>

      {/* Dock */}
      <div style={{ position: 'relative', zIndex: 1, paddingBottom: 28 }}>
        <Dock category={category} onChange={(k) => { setCategory(k); tick(); }}
              theme={tone} accent={accent} variant={dockVariant} />
      </div>

      {/* Unit drawer */}
      <UnitDrawer
        open={drawer !== null}
        onClose={() => setDrawer(null)}
        units={cat.units}
        value={drawer === 'top' ? cu.from : cu.to}
        title={drawer === 'top' ? `${cat.label} · INPUT A` : `${cat.label} · OUTPUT B`}
        theme={tone}
        accent={accent}
        onSelect={(uid) => {
          setUnits(s => ({ ...s, [category]: drawer === 'top' ? { ...cu, from: uid } : { ...cu, to: uid } }));
          setDrawer(null);
          tick();
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Alternative scrub controls (ruler / segmented) — invoked when dial style != knob
// ─────────────────────────────────────────────────────────────
function RulerScrub({ value, accent, theme, onScrub, onTick }) {
  const ref = useRef(null);
  const stateRef = useRef({ x: 0, t: 0, dragging: false, accum: 0 });
  const [active, setActive] = useState(false);
  const [offset, setOffset] = useState(0); // visual scroll offset

  const down = (e) => {
    e.preventDefault();
    e.target.setPointerCapture(e.pointerId);
    stateRef.current.dragging = true;
    stateRef.current.x = e.clientX;
    stateRef.current.t = performance.now();
    setActive(true);
  };
  const move = (e) => {
    if (!stateRef.current.dragging) return;
    const dx = e.clientX - stateRef.current.x;
    const now = performance.now();
    const dt = Math.max(1, now - stateRef.current.t);
    const speed = Math.abs(dx) / dt;
    let mult = 0.05;
    if (speed > 0.6) mult = 0.5;
    if (speed > 1.8) mult = 5;
    if (speed > 4)   mult = 50;
    stateRef.current.x = e.clientX;
    stateRef.current.t = now;
    setOffset(o => o + dx);
    onScrub && onScrub(-dx * mult, speed);
    stateRef.current.accum += Math.abs(dx);
    if (stateRef.current.accum > 24) { stateRef.current.accum = 0; onTick && onTick(); }
  };
  const up = (e) => {
    stateRef.current.dragging = false;
    try { e.target.releasePointerCapture(e.pointerId); } catch(_) {}
    setActive(false);
  };

  // Generate ticks
  const ticks = Array.from({ length: 51 }, (_, i) => i - 25);
  return (
    <div style={{ width: '100%', padding: '0 0' }}>
      <div
        ref={ref}
        className="am-knob"
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        style={{
          position: 'relative', width: '100%', height: 140,
          overflow: 'hidden', cursor: active ? 'grabbing' : 'grab',
        }}
      >
        {/* Ticks */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          transform: `translateX(${offset % 24}px)`,
        }}>
          {ticks.map(i => (
            <div key={i} style={{
              width: 24, height: '100%', display: 'flex',
              alignItems: 'flex-end', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <div style={{
                width: 1, height: i % 5 === 0 ? 60 : 32,
                background: theme.fg,
                opacity: i % 5 === 0 ? 0.5 : 0.18,
              }} />
            </div>
          ))}
        </div>
        {/* center indicator */}
        <div style={{
          position: 'absolute', top: 16, bottom: 16, left: '50%',
          width: 2, marginLeft: -1, background: accent,
          boxShadow: `0 0 10px ${accent}`, borderRadius: 1,
        }} />
        {/* fade edges */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(90deg, ${theme.bg} 0%, transparent 18%, transparent 82%, ${theme.bg} 100%)`,
          pointerEvents: 'none',
        }} />
      </div>
    </div>
  );
}

function SegmentedScrub({ value, accent, theme, onScrub, onTick }) {
  const ref = useRef(null);
  const stateRef = useRef({ x: 0, t: 0, dragging: false, accum: 0 });
  const [active, setActive] = useState(false);

  const down = (e) => {
    e.preventDefault();
    e.target.setPointerCapture(e.pointerId);
    stateRef.current.dragging = true;
    stateRef.current.x = e.clientX;
    stateRef.current.t = performance.now();
    setActive(true);
  };
  const move = (e) => {
    if (!stateRef.current.dragging) return;
    const dx = e.clientX - stateRef.current.x;
    const now = performance.now();
    const dt = Math.max(1, now - stateRef.current.t);
    const speed = Math.abs(dx) / dt;
    let mult = 0.05;
    if (speed > 0.6) mult = 0.5;
    if (speed > 1.8) mult = 5;
    if (speed > 4)   mult = 50;
    stateRef.current.x = e.clientX;
    stateRef.current.t = now;
    onScrub && onScrub(-dx * mult, speed);
    stateRef.current.accum += Math.abs(dx);
    if (stateRef.current.accum > 24) { stateRef.current.accum = 0; onTick && onTick(); }
  };
  const up = (e) => {
    stateRef.current.dragging = false;
    try { e.target.releasePointerCapture(e.pointerId); } catch(_) {}
    setActive(false);
  };

  const segs = Array.from({ length: 16 }, (_, i) => i);
  return (
    <div
      ref={ref}
      className="am-knob"
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
      style={{
        width: '90%', padding: '0',
        display: 'flex', flexDirection: 'column', gap: 14,
        cursor: active ? 'grabbing' : 'grab',
      }}
    >
      <div style={{ display: 'flex', gap: 4, justifyContent: 'space-between' }}>
        {segs.map(i => (
          <div key={i} style={{
            flex: 1, height: 56, borderRadius: 4,
            background: i === 8 ? accent : (theme.dark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.06)'),
            opacity: i === 8 ? 1 : (i > 5 && i < 10 ? 0.7 : 0.4),
            boxShadow: i === 8 ? `0 0 12px ${accent}` : 'none',
            transition: 'all 0.2s',
          }} />
        ))}
      </div>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontFamily: '"IBM Plex Mono", monospace', fontSize: 9,
        letterSpacing: '0.18em', color: theme.muted, textTransform: 'uppercase',
      }}>
        <span>−</span><span>SCRUB</span><span>+</span>
      </div>
    </div>
  );
}

// blink keyframes (injected once)
if (typeof document !== 'undefined' && !document.getElementById('am-keyframes')) {
  const s = document.createElement('style');
  s.id = 'am-keyframes';
  s.textContent = `
    @keyframes am-blink { 0%, 50% { opacity: 1; } 50.1%, 100% { opacity: 0; } }
    @keyframes am-fadein { from { opacity: 0; } to { opacity: 1; } }
    @keyframes am-slideup { from { transform: translateY(100%); } to { transform: translateY(0); } }
  `;
  document.head.appendChild(s);
}

Object.assign(window, { Americanizer, CATS, TONES, ACCENTS, NUMBER_FONTS });
