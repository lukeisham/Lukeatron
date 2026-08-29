# Calvin & Hobbes style comic
**Tags:** comic | illustrative
**Anti-patterns / Avoid:** uniform line weight with no taper; hard flat fills instead of the painterly wash; dense hatching or stippling in place of curved-hatch texture; photo-realism; stiff posed anatomy; soft/blurred anti-aliased edges; digitally typeset lettering; pastel/muted Sunday colour; dropping motion lines and onomatopoeia.
**Visual DNA:** Confident, tapering brush-ink linework in the spirit of Tex Avery/Chuck Jones animation — distortion and fluidity over realism — bounding big expressive figures against grounds that swing between blank white and dense detail depending on what the moment needs.
**Typical subject / composition:** Original child-and-companion-creature or child-and-imagination duos in domestic or outdoor-adventure settings; wordless action beats, exaggerated reaction shots, and fantasy-sequence set pieces suit this style well — never redraw a specific named character's exact design, only the idiom (line, wash, contrast-of-detail).
**Standard layers (z-order, bottom → top):**
- `<g id="background-wash">` — soft gradient sky/ground, minimal detail; left blank white for dialogue-heavy/domestic scenes
- `<g id="background-elements">` — scenery (trees, snow, furniture); rendered in full only for outdoor-adventure/fantasy scenes — this foreground-bold/background-sparse split is the "half-imagined background" effect
- `<g id="motion-lines">` — action/speed lines, radiating curved paths
- `<g id="characters">` — sub-group per character (e.g. `character-a`, `character-a-limbs`); bold single strokes bound the form, interior detail kept economical
- `<g id="ink-outline-overlay">` — the tapering ink line, drawn last, on top of colour
- `<g id="speech-balloons">` / `<g id="dialogue-text">` — organic rounded balloon shapes, not geometric
- `<g id="sound-effects">` — hand-lettered onomatopoeia, integrated into the composition rather than overlaid
**Distinctive SVG techniques:**
- Tapering ink line: build outlines as filled `<path>` shapes rather than constant `stroke-width`; on a 1080-wide canvas taper from 1 to 6 units, surging heavier on leading/gestural edges and thinning on receding detail, with no hesitation marks (single confident strokes, not rebuilt from short segments).
- Curved hatching for shading: short curved strokes following the form (not a straight cross-hatch grid) for texture and volume — e.g. a tree trunk gets 2-3 thick wiggly lines plus curved hatch strokes for bark texture and a few light single lines suggesting limbs. No stipple, no intermediate flat grey — contrast is black ink vs white paper, used strategically for emphasis.
- Painterly wash: large soft-edged colour blobs, `feGaussianBlur`'d, layered under the linework; opacity cascade of three stacked layers at 15%/30%/50% opacity (darkest/smallest on top) to fake wet-in-wet watercolour variation instead of a single flat tint.
- Paper/watercolour grain: `feTurbulence` (`type="fractalNoise"`, `baseFrequency` 0.9, `numOctaves` 2) piped through `feColorMatrix` to alpha-only, composited over the wash layer only at 5-8% opacity.
- Motion lines: thin curved paths radiating from a pivot point, tapering to nothing at the far end.
- Lettering baseline bounce: per-glyph `<tspan dy>` jitter of ±3 units (on a 1080-wide canvas) plus small horizontal advance-width jitter (±2 units) per glyph, to fake an organic hand-lettered line instead of a rigid text baseline.
**Palette:** warm, slightly desaturated — ochre `#d9a441`, dusty blue `#7d9bb5`, forest green `#4c6b3c`, brick red `#9e4a38`. Sunday-strip colour only; dailies are pure black ink on white paper, no colour and no greys.
**Typography:** mixed-case (never all-caps) hand-lettered dialogue, thinner/lighter stroke weight than the art linework, baseline leaning slightly left; font stack `"Segoe Print", "Bradley Hand", "Comic Sans MS", cursive` as the casual comic-hand fallback when per-glyph `dy`/advance jitter isn't available. Sound effects share the same kinetic energy as the linework (bold, irregular sizing) rather than a neutral display font.
