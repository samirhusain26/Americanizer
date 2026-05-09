// app-main.jsx — root: DesignCanvas of artboards + global Tweaks panel
const { useEffect: useEff } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "tone": "charcoal",
  "accent": "amber",
  "numberStyle": "display",
  "dialStyle": "knob",
  "dockVariant": "pill",
  "shaderIntensity": 0.5
}/*EDITMODE-END*/;

const TONE_OPTS = ['charcoal', 'taupe', 'paper'];
const ACCENT_OPTS = ['amber', 'yellowgreen', 'magenta', 'cyan'];
const NUM_STYLE_OPTS = ['display', 'serif', 'mono'];
const DIAL_OPTS = ['knob', 'ruler', 'segmented'];
const DOCK_OPTS = ['pill', 'bar', 'floating'];

function FramedAmericanizer({ tweaks, initialCategory = 'temperature', overrideTone }) {
  const localTweaks = overrideTone ? { ...tweaks, tone: overrideTone } : tweaks;
  const dark = window.TONES[localTweaks.tone || 'charcoal'].dark;
  return (
    <window.IOSDevice width={390} height={844} dark={dark}>
      <window.Americanizer tweaks={localTweaks} initialCategory={initialCategory} />
    </window.IOSDevice>
  );
}

function App() {
  const [t, setTweak] = window.useTweaks(TWEAK_DEFAULTS);

  return (
    <React.Fragment>
      <window.DesignCanvas>
        {/* MAIN — full-fidelity, responds live to Tweaks */}
        <window.DCSection id="main" title="Americanizer · main prototype" subtitle="Volume-knob converter — drag to scrub, tap a number to type, tap a unit pill to change. Tweak the design live →">
          <window.DCArtboard id="primary" label="Primary · responds to Tweaks" width={390} height={844}>
            <FramedAmericanizer tweaks={t} initialCategory="temperature" />
          </window.DCArtboard>
        </window.DCSection>

        {/* CATEGORY VARIATIONS — each pre-set to a different category */}
        <window.DCSection id="categories" title="Category states" subtitle="The four core conversion modes — each with its human-baseline default">
          <window.DCArtboard id="cat-temp"   label="Temperature · 22 °C → 71.6 °F" width={390} height={844}>
            <FramedAmericanizer tweaks={t} initialCategory="temperature" />
          </window.DCArtboard>
          <window.DCArtboard id="cat-weight" label="Weight · 70 kg → 154 lb" width={390} height={844}>
            <FramedAmericanizer tweaks={t} initialCategory="weight" />
          </window.DCArtboard>
          <window.DCArtboard id="cat-length" label="Length · 1 m → 39.37 in" width={390} height={844}>
            <FramedAmericanizer tweaks={t} initialCategory="length" />
          </window.DCArtboard>
          <window.DCArtboard id="cat-volume" label="Volume · 1 L → 33⅞ fl oz" width={390} height={844}>
            <FramedAmericanizer tweaks={t} initialCategory="volume" />
          </window.DCArtboard>
        </window.DCSection>

        {/* TONE EXPLORATIONS — three canvas tones side-by-side */}
        <window.DCSection id="tones" title="Canvas tone explorations" subtitle="Three takes on the surface — deep charcoal, warm taupe, paper-light. Tweaks override the global tone; these are fixed for comparison.">
          <window.DCArtboard id="tone-charcoal" label="A · Charcoal" width={390} height={844}>
            <FramedAmericanizer tweaks={t} overrideTone="charcoal" initialCategory="temperature" />
          </window.DCArtboard>
          <window.DCArtboard id="tone-taupe" label="B · Taupe" width={390} height={844}>
            <FramedAmericanizer tweaks={t} overrideTone="taupe" initialCategory="temperature" />
          </window.DCArtboard>
          <window.DCArtboard id="tone-paper" label="C · Paper" width={390} height={844}>
            <FramedAmericanizer tweaks={t} overrideTone="paper" initialCategory="temperature" />
          </window.DCArtboard>
        </window.DCSection>
      </window.DesignCanvas>

      <window.TweaksPanel>
        <window.TweakSection label="Surface" />
        <window.TweakRadio  label="Canvas tone"  value={t.tone}    options={TONE_OPTS}    onChange={(v) => setTweak('tone', v)} />
        <window.TweakColor  label="Accent"       value={window.ACCENTS[t.accent]}
                            options={ACCENT_OPTS.map(k => window.ACCENTS[k])}
                            onChange={(v) => {
                              const k = ACCENT_OPTS.find(k => window.ACCENTS[k] === v) || 'amber';
                              setTweak('accent', k);
                            }} />

        <window.TweakSection label="Type" />
        <window.TweakRadio  label="Number style" value={t.numberStyle} options={NUM_STYLE_OPTS} onChange={(v) => setTweak('numberStyle', v)} />

        <window.TweakSection label="Engine" />
        <window.TweakRadio  label="Dial style"   value={t.dialStyle}   options={DIAL_OPTS}    onChange={(v) => setTweak('dialStyle', v)} />
        <window.TweakSlider label="Backdrop intensity" value={t.shaderIntensity} min={0} max={1} step={0.05}
                            onChange={(v) => setTweak('shaderIntensity', v)} />

        <window.TweakSection label="Dock" />
        <window.TweakRadio  label="Dock variant" value={t.dockVariant} options={DOCK_OPTS}    onChange={(v) => setTweak('dockVariant', v)} />
      </window.TweaksPanel>
    </React.Fragment>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
