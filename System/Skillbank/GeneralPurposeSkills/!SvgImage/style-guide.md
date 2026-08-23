# !SvgImage Style Guide

Reference library for `!SvgImage`. Each entry names a visual idiom and translates it into buildable
SVG structure: which semantic `<g id>` layers a composition in that style is typically built from, and
which SVG-specific techniques (filters, patterns, stroke rules, palettes) produce that style's
distinctive look. The point is **modification, not just generation** — a consistent layer/id vocabulary
per style means "recolour the propaganda banner" or "soften the Ghibli background blur" is a targeted
edit, not a rebuild.

Style is a visual idiom (linework, palette, composition technique, texture) — not a licence to
reproduce a specific copyrighted character or franchise artwork. Entries describe how to draw *in the
manner of* a style for original subjects, the same way "in the style of" is understood in any art
brief; they never instruct copying a named character's exact design.

**Entry format (keep every new entry to this shape):**
```
### <Style Name>
**Visual DNA:** 1-2 sentences — what makes this style instantly recognisable.
**Standard layers (z-order, bottom → top):**
- `<g id="...">` — what lives in it
**Distinctive SVG techniques:**
- technique — how to build it with SVG primitives/filters
**Palette:** representative hex values or named colours
**Typography:** font-family stack / lettering notes
**Thumbnail (SVG):** a small (`viewBox="0 0 100 100"`), self-contained, opaque-background SVG snippet
that previews the style at a glance — built from the same palette/techniques above. This is what
`!SvgImage` STEP 2 renders as the clickable tile in its style-picker grid, so it must stand alone (no
external refs) and stay compact.
```

New styles get appended at the end of the list, in this exact format — including a hand-built
Thumbnail — by `!SvgImage` STEP 2 when Luke names a style not yet here.

---

### Calvin & Hobbes style comic
**Visual DNA:** Loose, kinetic ink linework with real personality — line weight surges and tapers
mid-stroke; big expressive figures in wide-open, half-imagined backgrounds; Sunday-strip colour is a
soft painterly wash, not flat fill.
**Standard layers (z-order, bottom → top):**
- `<g id="background-wash">` — soft gradient sky/ground, minimal detail
- `<g id="background-elements">` — sparse scenery (trees, snow, furniture)
- `<g id="motion-lines">` — action/speed lines, radiating curved paths
- `<g id="characters">` — sub-group per character (e.g. `character-a`, `character-a-limbs`)
- `<g id="ink-outline-overlay">` — the tapering ink line, drawn last, on top of colour
- `<g id="speech-balloons">` / `<g id="dialogue-text">`
- `<g id="sound-effects">` — hand-lettered onomatopoeia
**Distinctive SVG techniques:**
- Tapering line weight: build outlines as filled `<path>` shapes (varying width along the stroke)
  rather than a constant `stroke-width` line — width should visibly surge at direction changes.
- Painterly wash: large soft-edged colour blobs at low opacity, `feGaussianBlur`'d, layered under the
  linework rather than flat-filled inside it.
- Paper/watercolour grain: a `<pattern>` or `feTurbulence`-based noise overlay at very low opacity
  (~5-8%) over the wash layer only.
- Motion lines: thin curved paths radiating from a pivot point, tapering to nothing at the far end.
**Palette:** warm, slightly desaturated — ochre, dusty blue, forest green, brick red; wide tonal range
within the wash rather than flat blocks.
**Typography:** loose hand-lettered caps for dialogue/sound effects — an irregular, slightly bouncing
baseline if per-glyph control is available, otherwise a casual comic-hand font stack.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#eef3e0"/><rect width="100" height="45" fill="#bcd6e8"/><path d="M20 70 Q30 40 50 55 Q70 68 82 42" stroke="#5b3a29" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M22 68 Q28 50 20 40" stroke="#5b3a29" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M78 46 L90 38 M78 50 L92 48 M78 54 L90 58" stroke="#5b3a29" stroke-width="1.5" fill="none"/></svg>
```

---

### Far Side style comic
**Visual DNA:** Single dry-absurdist panel, uniform bold outline, deadpan simple character design,
tonal shading built entirely from hatching/stippling, no colour.
**Standard layers (z-order, bottom → top):**
- `<g id="panel-frame">` — thin single-rule border
- `<g id="background-simple">` — minimal, often just a horizon line or one prop
- `<g id="characters">` — flat, slightly dumpy proportions, inexpressive except one sight-gag detail
- `<g id="hatching-shadows">` — cross-hatch/stipple shading layer, separate from the outline layer
- `<g id="caption-text">` — set below the panel, outside the frame
**Distinctive SVG techniques:**
- Uniform outline: constant `stroke-width` (no taper) on every character/prop path — this is the
  opposite of Calvin & Hobbes' tapered line, and is what reads as "Far Side" at a glance.
- Cross-hatch shading: a repeating `<pattern>` of two crossed diagonal line sets; vary hatch density
  (line spacing) by region to fake tonal value — tighter spacing = darker.
- Stipple shading: a `<pattern>` of small dots at varying density for softer tonal areas.
- Strictly monochrome: black outline/hatching on white, no fills beyond black/white/grey.
**Palette:** black, white, one mid-grey for hatched midtones. No colour.
**Typography:** plain typewriter or light serif caption set in a single line beneath a thin rule —
Far Side's captions are typographically quiet, never decorative.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#ffffff"/><rect x="4" y="4" width="92" height="92" fill="none" stroke="#111" stroke-width="2"/><ellipse cx="50" cy="48" rx="22" ry="26" fill="#fff" stroke="#111" stroke-width="3"/><circle cx="43" cy="42" r="2.5" fill="#111"/><circle cx="58" cy="42" r="2.5" fill="#111"/><path d="M40 58 Q50 62 60 58" stroke="#111" stroke-width="2" fill="none"/><path d="M15 80 L25 88 M20 80 L30 88 M25 80 L35 88 M30 80 L40 88" stroke="#111" stroke-width="1"/></svg>
```

---

### Tufte style object designs
**Visual DNA:** Edward Tufte's data-ink-minimalist ethos applied to an exploded/annotated object
diagram — hairline leader lines, restrained ink, every mark earns its place, generous white space.
**Standard layers (z-order, bottom → top):**
- `<g id="object-silhouette">` — the whole object, faint, as context
- `<g id="exploded-components">` — sub-group per separated part, offset along an implied axis
- `<g id="leader-lines">` — hairline connectors, label to part
- `<g id="annotation-labels">` — small sans-serif text, set close to its leader's endpoint
- `<g id="scale-reference">` — a small ruler/scale bar, only if scale matters
- `<g id="caption">`
**Distinctive SVG techniques:**
- Hairline strokes: `stroke-width` around 0.5-0.75 throughout — never a bold outline.
- Zero chart-junk: no gradients, no drop shadows, no decorative borders, no redundant grid.
- Leader lines: straight or single-elbow paths with a small filled-circle marker at the part end, no
  arrowhead (arrowheads read as directional/chart-junk in Tufte's own examples).
- Restrained colour: near-monochrome (black/grey ink) plus at most one accent hue reserved for the
  single most important distinction being made.
**Palette:** `#1a1a1a` ink, `#888` secondary, one accent (e.g. `#b13`) used sparingly and consistently.
**Typography:** small, tight-set sans-serif (e.g. `Helvetica, Arial, sans-serif`) for labels — never
larger than needed to be legible; no label competes visually with the object itself.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#fbfaf7"/><rect x="20" y="30" width="24" height="16" fill="none" stroke="#1a1a1a" stroke-width="0.75"/><rect x="56" y="46" width="18" height="12" fill="none" stroke="#1a1a1a" stroke-width="0.75"/><line x1="44" y1="38" x2="60" y2="50" stroke="#1a1a1a" stroke-width="0.5"/><circle cx="60" cy="50" r="1.2" fill="#1a1a1a"/><text x="30" y="68" font-size="6" fill="#1a1a1a" font-family="Helvetica,sans-serif">part</text></svg>
```

---

### Tufte style location cutaway designs
**Visual DNA:** The same minimal-ink ethos as Tufte object designs, applied to a cross-section/cutaway
of a place (building, ship, terrain) — stacked strata, each labelled with a hairline leader.
**Standard layers (z-order, bottom → top):**
- `<g id="cutaway-outline">` — overall silhouette of the cut structure
- `<g id="strata-layers">` — sub-group per distinct layer/storey/stratum, ordered bottom-to-top or
  front-to-back as the cut requires
- `<g id="cross-section-fill">` — material/texture fill distinguishing each stratum
- `<g id="leader-lines">` / `<g id="annotation-labels">` — same conventions as object designs
- `<g id="scale-bar">` — vertical or horizontal, with tick marks
**Distinctive SVG techniques:**
- Material differentiation by texture, not saturated colour: use distinct low-contrast `<pattern>`
  fills (fine hatch for wood, stipple for soil, cross-hatch for stone/rock) rather than colour-coding.
- Hairline strata boundaries (`stroke-width` ~0.5) even where fills differ.
- Leader-line and label conventions identical to Tufte object designs — keep the two entries visually
  consistent since Luke may combine them in one document.
- Tick-marked scale bar: short perpendicular hairlines at regular intervals along a single baseline.
**Palette:** near-monochrome ink with strata distinguished by fill pattern/value, not hue; one accent
colour only if a single stratum needs to be called out.
**Typography:** identical to Tufte object designs — small, tight sans-serif labels.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#fbfaf7"/><rect x="15" y="20" width="50" height="14" fill="#e8e6de" stroke="#1a1a1a" stroke-width="0.5"/><rect x="15" y="34" width="50" height="14" fill="#d8d6cc" stroke="#1a1a1a" stroke-width="0.5"/><rect x="15" y="48" width="50" height="14" fill="#c8c6bb" stroke="#1a1a1a" stroke-width="0.5"/><line x1="65" y1="27" x2="80" y2="27" stroke="#1a1a1a" stroke-width="0.5"/><circle cx="65" cy="27" r="1" fill="#1a1a1a"/><line x1="12" y1="20" x2="12" y2="62" stroke="#1a1a1a" stroke-width="0.5"/></svg>
```

---

### Dorling Kindersley style landscapes
**Visual DNA:** DK Eyewitness-guide illustration — photo-referenced but rendered as crisp, flat-shaded
vector art, isolated on a plain ground with a soft contact shadow, naturalistic saturated colour, fine
outline, small dot-and-leader captions identifying parts.
**Standard layers (z-order, bottom → top):**
- `<g id="isolated-background">` — plain white/light backdrop
- `<g id="ground-shadow">` — soft blurred ellipse(s) beneath grounded elements
- `<g id="landscape-base">` — terrain/ground plane
- `<g id="landscape-elements">` — sub-group per element (trees, rocks, water, structures)
- `<g id="foreground-detail">` — closest, sharpest elements
- `<g id="labels-leaders">` — small dot + hairline + caption, DK's signature ID device
**Distinctive SVG techniques:**
- Contact shadow: a duplicated dark silhouette, `feGaussianBlur`'d, low opacity, placed only where the
  object meets the ground — not a full drop shadow behind the whole object.
- Crisp die-cut edges: clean, confident vector outlines (no sketchy/broken line) — precision reads as
  "reference illustration."
- Form via gradient, not shading layer: subtle `linearGradient`/`radialGradient` within each element's
  own fill to suggest rounded volume, rather than a separate hatching layer.
- Fine outline colour: a 1px stroke in a *darker shade of the fill itself*, not pure black — keeps
  edges crisp without looking inked.
- DK label device: small filled circle at the point of interest, thin hairline to a caption set in
  clear sans-serif, consistently sized across every label in the piece.
**Palette:** bright but naturalistic — true greens, browns, sky blues; no flourish beyond the object's
real-world colour.
**Typography:** clean, small sans-serif captions (e.g. `Frutiger, "Helvetica Neue", sans-serif`) —
functional, never decorative.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#ffffff"/><ellipse cx="50" cy="78" rx="26" ry="5" fill="#000" opacity="0.12"/><path d="M25 70 Q30 40 50 45 Q70 40 75 70 Z" fill="#5c9e4a" stroke="#3d6b32" stroke-width="1"/><circle cx="50" cy="30" r="10" fill="#f4c542" stroke="#c99a1e" stroke-width="1"/><circle cx="70" cy="55" r="1.5" fill="#222"/><line x1="70" y1="55" x2="84" y2="50" stroke="#222" stroke-width="0.5"/></svg>
```

---

### Ligne claire style comic
**Visual DNA:** Hergé-lineage "clear line" — every outline the same uniform weight, flat evenly
saturated colour with zero gradient/shading, crisp architectural precision, graphic clarity above all.
**Standard layers (z-order, bottom → top):**
- `<g id="panel-border">`
- `<g id="background-architecture">` — precise linear-perspective structure
- `<g id="background-flat-color">` — flat fills behind the linework
- `<g id="mid-ground">`
- `<g id="characters">`
- `<g id="foreground-detail">`
- `<g id="outline-overlay">` — the uniform-weight ink line, applied last, over every flat colour region
**Distinctive SVG techniques:**
- Absolute uniform stroke: one fixed `stroke-width` for every single outline in the piece, characters
  and backgrounds alike — no exceptions, this is the defining rule of the style.
- Flat fill only: solid colour fills, no gradients, no drop shadows, no cross-hatching anywhere.
- Shading via adjacent flat blocks: where form/shadow is needed, add a second flat-coloured shape
  (a darker flat tone) rather than a gradient or hatch texture.
- Technical-precision backgrounds: architecture and objects drawn with true perspective/ruled lines —
  precision is as load-bearing as the line weight.
**Palette:** clean, saturated, limited per scene (4-6 flat colours) — no dulling, no tints.
**Typography:** even, hand-lettered-but-tidy caps for dialogue; balloons are simple ovals with a plain
uniform-weight outline matching the panel's line rule.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#bfe1f0"/><rect x="10" y="55" width="80" height="35" fill="#e3c98a"/><rect x="30" y="35" width="40" height="30" fill="#d9503c" stroke="#111" stroke-width="2.5"/><polygon points="25,35 50,15 75,35" fill="#8a3b2b" stroke="#111" stroke-width="2.5"/><rect x="45" y="50" width="10" height="15" fill="#3c2a1e" stroke="#111" stroke-width="2.5"/></svg>
```

---

### Studio Ghibli style anime
**Visual DNA:** Painterly, atmospheric backgrounds with soft natural light; simple two-tone cel-shaded
characters over lush, textured nature; warmth and depth are built with light and colour, not lines.
**Standard layers (z-order, bottom → top):**
- `<g id="sky-gradient">` — soft multi-stop gradient, warm/golden-hour bias
- `<g id="distant-background">` — softly blurred far layer (depth-of-field)
- `<g id="mid-background">` — foliage/architecture, textured but slightly softened
- `<g id="atmosphere-light">` — light rays, dust motes, glow
- `<g id="characters">` — sub-groups: `character-base` (flat colour), `character-shadow-tone` (single
  darker shape), `character-linework` (fine outline, drawn last)
- `<g id="foreground-foliage">`
- `<g id="foreground-detail">`
**Distinctive SVG techniques:**
- Depth via blur, not size alone: `feGaussianBlur` increasing with distance across background layers.
- Two-tone cel shading: each character element is a flat base fill plus exactly one darker "shadow
  shape" overlaid where light is blocked — never a gradient on the character itself (gradients stay in
  the environment, not on characters).
- Dappled foliage texture: many small repeated leaf-cluster shapes (not a flat pattern fill) so light
  can pick out individual clumps; vary opacity slightly per cluster for organic irregularity.
- Light rays/particles: slim, low-opacity triangular or elliptical gradient shapes radiating from a
  light source, blended additively where the renderer supports it.
- Warm fine linework: character outline strokes in a dark warm brown (not pure black) at a light
  weight — keeps faces soft rather than graphic.
**Palette:** warm naturalistic — golden light, deep greens, soft blues; high value range in the
background, restrained flat hues on characters.
**Typography:** rarely load-bearing in the image itself; if captioning, keep it small and out of the
way — the illustration carries the piece.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="sky1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fde8b6"/><stop offset="1" stop-color="#bcd9ec"/></linearGradient></defs><rect width="100" height="100" fill="url(#sky1)"/><ellipse cx="30" cy="70" rx="40" ry="18" fill="#6fa85a" opacity="0.85"/><ellipse cx="75" cy="78" rx="30" ry="14" fill="#4f8a45" opacity="0.7"/><circle cx="72" cy="28" r="12" fill="#fff5da" opacity="0.9"/><path d="M20 30 L40 55" stroke="#fff5da" stroke-width="4" opacity="0.4"/></svg>
```

---

### Classic educational mnemonic aid style (e.g. "An Adventure with a Lion")
**Visual DNA:** Mid-century phonics/reading-scheme illustration — bold friendly outlines, a muted
retro print palette, a simple flat scene, and a mnemonic device (a letter or symbol) visually fused
into the subject so the picture *is* the memory aid.
**Standard layers (z-order, bottom → top):**
- `<g id="paper-texture-background">` — warm off-white/cream ground with subtle print-grain
- `<g id="scene-background">` — simple flat setting (a few props, no clutter)
- `<g id="mnemonic-subject">` — the character/object embodying the concept (e.g. the lion)
- `<g id="mnemonic-device">` — the letter/shape/symbol integrated into the subject's form (e.g. a
  letter shape traced by the mane, tail, or pose)
- `<g id="supporting-characters">` — secondary figures, if any
- `<g id="title-banner">`
- `<g id="caption-text">`
**Distinctive SVG techniques:**
- Integrated mnemonic: the target letter/shape should be traceable directly in the subject's silhouette
  or a prop it holds — build it as a real path so it reads as *both* letter and creature, not a letter
  stamped separately beside the picture.
- Print-era imperfection: slightly irregular outline (two near-duplicate offset paths at low opacity
  can fake a soft registration-mismatch look) rather than a razor-clean vector line.
- Paper grain: low-opacity `feTurbulence` noise over the background only, mimicking uncoated print
  stock.
- Friendly proportions: oversized head, simple rounded limbs, minimal facial detail (dot eyes, simple
  curved mouth) — approachability over anatomical accuracy.
**Palette:** vintage-print restrained — mustard yellow, teal, brick red, olive, cream ground; no
neon/modern saturation.
**Typography:** bold rounded vintage-poster lettering for the title banner (e.g. a slab or rounded
sans stack); simple, large, legible caption type for early readers.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#f2e9d2"/><circle cx="50" cy="50" r="26" fill="#d99a2b" stroke="#7a4a1e" stroke-width="3"/><path d="M50 24 Q30 30 24 50 Q30 70 50 76 Q70 70 76 50 Q70 30 50 24" fill="none" stroke="#b3401e" stroke-width="4"/><circle cx="50" cy="50" r="14" fill="#e8c98a" stroke="#7a4a1e" stroke-width="2"/><circle cx="45" cy="47" r="1.5" fill="#3a2412"/><circle cx="55" cy="47" r="1.5" fill="#3a2412"/><path d="M46 55 Q50 58 54 55" stroke="#3a2412" stroke-width="1.5" fill="none"/></svg>
```

---

### Punch style cartoons
**Visual DNA:** Victorian/Edwardian satirical engraving — dense fine-line hatching builds all tonal
value (no flat colour), caricature exaggeration, an ornate frame, and a formal witty caption set below
in serif type.
**Standard layers (z-order, bottom → top):**
- `<g id="frame-border">` — ornate/etched decorative border
- `<g id="background-hatched">` — sparse setting, toned by hatching not fill
- `<g id="characters-caricature">` — exaggerated proportions (oversized heads/features)
- `<g id="hatching-tonal-layer">` — the engraving cross-hatch, separate from the outline layer so
  density can be tuned independently
- `<g id="caption-banner">` — formal caption/dialogue set beneath the frame
**Distinctive SVG techniques:**
- Engraving cross-hatch: build tonal value entirely from line density — a `<pattern>` (or several, at
  increasing line-density) swapped in per region; denser crossed lines = darker value, never a flat
  grey fill standing in for shading.
- Caricature exaggeration: heads/features scaled up relative to the body far beyond naturalistic
  proportion — this is the style's core device, not an optional flourish.
- Ornate border: a repeating decorative motif (simple scrollwork built from repeated small paths)
  framing the whole panel.
- Ink/sepia monochrome only: no colour fills, tonal range built purely from hatching density plus a
  sepia or true-black ink colour.
**Palette:** sepia ink (`#3b2b1a`-ish) or true black on cream/aged-paper ground.
**Typography:** formal serif (e.g. `"Times New Roman", Georgia, serif`) for the caption banner, set as
a witty dialogue exchange or single dry line — the caption is as much the joke as the drawing.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#f0e6d2"/><rect x="6" y="6" width="88" height="88" fill="none" stroke="#3b2b1a" stroke-width="2"/><ellipse cx="50" cy="45" rx="22" ry="26" fill="none" stroke="#3b2b1a" stroke-width="1.5"/><g stroke="#3b2b1a" stroke-width="0.5"><line x1="34" y1="30" x2="44" y2="60"/><line x1="40" y1="28" x2="50" y2="62"/><line x1="46" y1="28" x2="56" y2="62"/><line x1="52" y1="28" x2="62" y2="60"/><line x1="44" y1="60" x2="34" y2="30"/><line x1="50" y1="62" x2="40" y2="28"/><line x1="56" y1="62" x2="46" y2="28"/><line x1="62" y1="60" x2="52" y2="28"/></g><line x1="15" y1="82" x2="85" y2="82" stroke="#3b2b1a" stroke-width="0.5"/></svg>
```

---

### Soviet propaganda poster style
**Visual DNA:** Constructivist graphic design — bold flat colour blocks, strong diagonal dynamism,
monumental heroic figures with hard 2-tone shading, geometric sunburst motifs, angled stencil-cut
typography, a strictly limited high-contrast palette.
**Standard layers (z-order, bottom → top):**
- `<g id="background-flat-block">` — one or two flat colour fields
- `<g id="dynamic-diagonal-shapes">` — bold geometric bands/wedges on a diagonal axis
- `<g id="sunburst-rays">` — radiating geometric rays from a focal point
- `<g id="heroic-figure">` — monumental scale, low horizon, fills most of the frame
- `<g id="symbols">` — generic geometric iconography (star/gear/wheat-sheaf motifs, not literal
  reproductions of specific national emblems)
- `<g id="banner-typography">` — bold slogan text, set at a dynamic angle
- `<g id="border-frame">`
**Distinctive SVG techniques:**
- Strictly flat colour: hard-edged shapes only, zero gradients anywhere in the piece.
- Diagonal composition: key elements' long axes aligned to a consistent diagonal (commonly ~30-45°)
  rather than horizontal/vertical — this diagonal energy is the single most identifying trait.
- Monumental scale: the hero figure/subject cropped by the frame edges, filling most of the canvas,
  with a deliberately low horizon line behind it.
- Two-tone figure shading: exactly two flat values per form (lit flat colour + one hard-edged shadow
  shape) — no gradient, no soft blend, ever.
- Sunburst: a `<pattern>` or manually-built radial set of alternating wide/narrow triangular rays from
  a single focal point, usually behind the hero figure.
- Angled stencil type: bold geometric sans-serif set along a rotated baseline (`transform="rotate(...)"`
  on the text group), with generous letter-spacing.
**Palette:** strictly limited — red (`#C8102E`-ish), black, cream/off-white (`#F2E8D5`-ish), occasional
gold accent. No other hues.
**Typography:** bold condensed geometric sans-serif, heavy weight, set at an angle — legibility at a
distance over refinement.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#c8102e"/><polygon points="0,100 60,100 20,0 0,0" fill="#111"/><g fill="#f2e8d5" opacity="0.85"><polygon points="50,50 55,10 60,50"/><polygon points="50,50 65,15 68,52"/><polygon points="50,50 72,25 73,55"/><polygon points="50,50 76,38 75,58"/></g><rect x="10" y="80" width="55" height="12" fill="#f2e8d5" transform="rotate(-6 10 80)"/></svg>
```

---

### British government official announcement style
**Visual DNA:** Formal mid-century Ministry-style public notice — typography-led (not
illustration-led), a restrained heraldic palette, thin rule lines organising a clear information
hierarchy, and a generic crest/seal motif signalling official authority.
**Standard layers (z-order, bottom → top):**
- `<g id="background-plain">` — flat cream/parchment or solid ground, no texture beyond a faint paper
  grain at most
- `<g id="border-frame">` — a restrained rule-line border, if used
- `<g id="crest-emblem">` — a generic shield/crown-silhouette device signalling officialdom (never a
  specific real coat of arms or crest — a generic heraldic shape only)
- `<g id="rule-lines">` — thin horizontal double-rules separating sections
- `<g id="headline-text">`
- `<g id="body-text">`
- `<g id="official-stamp-seal">` — a circular stamp/seal motif, if the notice calls for one
**Distinctive SVG techniques:**
- Typography *is* the design: information hierarchy (headline / sub-head / body) does the work that
  illustration would in other styles — resist adding decorative imagery beyond the emblem.
- Thin double-rule dividers: two closely-spaced hairlines (not one bold rule) between sections — a
  recognisable formal-document convention.
- Generic heraldic emblem: build the crest as an original abstract shield/crown silhouette — never
  reproduce an actual national or royal coat of arms.
- Flat, restrained colour only: no gradients, no shadows; colour is used to mark hierarchy (e.g. a
  banner colour block behind the headline), not decoration.
- Centered/justified formal composition: generous margins, symmetrical layout, nothing crowds the
  frame edge.
**Palette:** deep official blue (`#012169`-ish), red (`#C8102E`-ish), gold accent, cream/parchment
ground — used sparingly, almost entirely as flat fields and rule lines.
**Typography:** bold condensed serif or grotesque headline face, generous letter-spacing, set in a
clear size hierarchy; body copy in a plain, highly legible serif or sans-serif.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#f2ead9"/><path d="M50 20 L62 26 L62 42 Q50 54 50 54 Q50 54 38 42 L38 26 Z" fill="none" stroke="#012169" stroke-width="2"/><line x1="20" y1="66" x2="80" y2="66" stroke="#012169" stroke-width="1"/><line x1="20" y1="69" x2="80" y2="69" stroke="#012169" stroke-width="1"/><rect x="20" y="76" width="60" height="4" fill="#c8102e"/><rect x="20" y="84" width="40" height="3" fill="#012169"/></svg>
```

---

### Nigel Holmes explanation graphics (classic Time magazine informational illustration)
**Visual DNA:** Friendly, mechanism-revealing "how it works" diagrams — a Tufte/DK relative, but
warmer and more illustrative: simplified pseudo-3D objects, bold arrows walking the eye through a
process, numbered steps, labels planted directly on the parts they explain.
**Standard layers (z-order, bottom → top):**
- `<g id="background-plain">` — flat, uncluttered ground
- `<g id="mechanism-object">` — the thing being explained, in simplified pseudo-3D/isometric form
- `<g id="process-arrows">` — bold curved arrows carrying the eye through the sequence
- `<g id="numbered-steps">` — small circular step-number badges
- `<g id="annotation-labels">` — labels set directly on/beside the part they describe
- `<g id="legend-key">` — only if the diagram needs one; kept minimal
**Distinctive SVG techniques:**
- Simplified pseudo-3D: build objects as flat shapes under one consistent light source, shaded in 2-3
  flat tones (not a photographic gradient) — enough to read as dimensional, no more.
- Bold sequence arrows: thick curved `<path>` strokes with a filled arrowhead `marker-end`, routed to
  visibly connect one step to the next — the arrow *is* the narrative, not decoration.
- Numbered badges: small filled circles with a bold numeral, placed at each step's start.
- Direct labelling: every label sits on or immediately beside its referent (no separate legend unless
  truly necessary) — this is what makes the diagram read at a glance.
- Warmth over austerity: unlike Tufte's near-monochrome restraint, this style uses real colour and
  allows a touch of personality (rounded corners, a slightly playful object silhouette) while staying
  strictly clear and uncluttered.
**Palette:** warm and varied — orange, teal, mustard, brick-red — against a light neutral ground; more
colourful than Tufte, still far more restrained than a full illustration.
**Typography:** rounded, friendly, highly legible sans-serif for labels and step numbers; bold weight
for numerals, regular weight for descriptive labels.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#faf6ee"/><rect x="20" y="35" width="30" height="30" fill="#e8973f" stroke="#a85f1a" stroke-width="1.5"/><polygon points="50,35 60,28 60,58 50,65" fill="#c97a2b" stroke="#a85f1a" stroke-width="1.5"/><defs><marker id="ah1" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#1f8a70"/></marker></defs><path d="M55 25 Q75 15 78 40" stroke="#1f8a70" stroke-width="3" fill="none" marker-end="url(#ah1)"/><circle cx="78" cy="45" r="6" fill="#1f8a70"/><text x="75" y="48" font-size="7" fill="#fff" font-family="Helvetica,sans-serif">1</text></svg>
```

---

### Richard Scarry Busytown-style illustration
**Visual DNA:** Dense but scannable labeled scenes of everyday activity — anthropomorphic characters
at work and play, individually labeled objects, bright primary colour, thick friendly outlines, whole
towns rendered as a mosaic of small self-contained, independently legible vignettes.
**Standard layers (z-order, bottom → top):**
- `<g id="scene-backdrop">` — sky/ground/buildings, simple and flat
- `<g id="town-layout">` — streets/paths organising the vignettes spatially
- `<g id="vignette-clusters">` — one sub-group per self-contained mini-scene (e.g.
  `vignette-bakery`, `vignette-fire-truck`), each independently readable
- `<g id="labeled-characters">` — figures within each vignette
- `<g id="labeled-objects">` — notable props/vehicles/tools within each vignette
- `<g id="direct-labels">` — small text set right beside each labeled item
- `<g id="foreground-detail">`
**Distinctive SVG techniques:**
- Density via tiled vignettes, not one continuous scene: build the composition as many small
  self-contained groups placed across the canvas — each one must be legible in isolation, which is
  what keeps a crowded scene from becoming visual noise.
- Thick, slightly loose, rounded outline (bolder and friendlier than ligne claire's precise uniform
  line) — a consistent `stroke-width` a touch heavier than usual, rounded `stroke-linejoin`.
- Near-universal labelling: almost everything nameable in the scene gets a small text label with a
  short connecting line or direct adjacency — this ever-present labelling is the style's didactic core.
- Flat bright fills, minimal shading (at most one simple shadow tone) — clarity and cheerfulness over
  rendered form.
- Generic character design only: round-headed, simply-limbed figures in everyday occupational roles —
  describe roles/activities, never a specific named published character.
**Palette:** bright primary/secondary — red, yellow, blue, green — high saturation, black used sparingly
(mostly in outlines, not as a fill).
**Typography:** simple, large, friendly rounded print-style labels sized for early readers, each set
close to (or connected by a short line to) the item it names.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#bfe3f2"/><rect x="0" y="60" width="100" height="40" fill="#e8d9a8"/><g stroke="#222" stroke-width="2.5" stroke-linejoin="round"><rect x="14" y="45" width="24" height="20" fill="#e8483c"/><polygon points="14,45 26,32 38,45" fill="#c9382d"/><rect x="55" y="55" width="26" height="14" rx="3" fill="#f4c542"/><circle cx="60" cy="71" r="4" fill="#333"/><circle cx="76" cy="71" r="4" fill="#333"/></g><text x="10" y="80" font-size="5" fill="#222" font-family="Helvetica,sans-serif">bakery</text></svg>
```

---

### Hokusai-style instructional drawing / clear ukiyo-e composition
**Visual DNA:** Confident, controlled contour line bounding flat colour fields; stylised, flattened
forms (waves, mountains, clouds) organised in strong asymmetric compositions; a restrained traditional
palette — precise and decorative rather than naturalistic.
**Standard layers (z-order, bottom → top):**
- `<g id="sky-flat-tone">` — a flat or very subtly graded ground tone
- `<g id="background-forms">` — stylised, flattened distant elements (mountains, waves, clouds)
- `<g id="midground-elements">`
- `<g id="foreground-subject">`
- `<g id="contour-overlay">` — the confident bounding line, drawn last, over the flat colour fields
- `<g id="pattern-fill-details">` — repeating decorative texture within flat shapes (wave-crest,
  cloud-swirl, foliage motifs)
- `<g id="seal-cartouche">` — a small generic corner mark, optional — never a specific historical seal
**Distinctive SVG techniques:**
- Controlled variable contour: line weight thickens slightly at silhouette/grounding edges and stays
  fine in interior detail — closer to calligraphic brushwork than ligne claire's absolute uniformity,
  but still confident and unbroken (build as a filled tapering path, or two stroke passes at different
  widths layered).
- Flattened, stacked-depth perspective: forms read as flat shapes layered by simple depth cues (size,
  overlap, vertical position) rather than true vanishing-point perspective.
- Decorative pattern fills: a repeating `<pattern>` of small stylised motifs (wave crests, cloud
  swirls, foliage) filling a flat shape instead of a flat solid colour, wherever the subject calls for
  water, sky, or foliage texture.
- Strong asymmetric composition: an off-centre focal mass balanced against deliberate negative space —
  avoid centred, symmetrical layouts.
- Flat colour blocks under the contour line, no gradients — the palette does the work, not shading.
**Palette:** indigo/Prussian blue, ochre/mustard, cream/off-white ground, black contour line, occasional
vermilion/red accent.
**Typography:** minimal to none in the image itself; if used, confine to a small corner cartouche,
generic in form, never reproducing specific historical text or seals verbatim.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#f3ead9"/><polygon points="10,60 40,25 55,60" fill="#4a6b8a"/><polygon points="45,65 70,20 90,65" fill="#2c4a68"/><path d="M5 78 Q20 68 35 78 Q50 68 65 78 Q80 68 95 78 L95 95 L5 95 Z" fill="#1f3a54" stroke="#0d2135" stroke-width="1"/><path d="M10 76 Q15 70 20 76 M30 76 Q35 70 40 76 M50 76 Q55 70 60 76 M70 76 Q75 70 80 76" stroke="#f3ead9" stroke-width="1.5" fill="none"/></svg>
```

---

### Isotype / Otto Neurath pictorial statistics
**Visual DNA:** Standardised, simplified pictograms conveying quantity by *repetition* of an identical
icon, never by resizing one icon — flat single-colour silhouettes, strict grid alignment, built for
universal, language-independent legibility.
**Standard layers (z-order, bottom → top):**
- `<g id="grid-baseline">` — structural alignment grid (may be invisible; governs layout only)
- `<g id="pictogram-rows">` — one sub-group per data category/row
- `<g id="unit-icon-repeats">` — the repeated identical icon instances representing the quantity within
  each row (a partial/clipped icon renders a fractional final unit)
- `<g id="axis-labels">`
- `<g id="legend-key">`
- `<g id="title-caption">`
**Distinctive SVG techniques:**
- Quantity by repetition, never by scale: a value of 7 = seven identical icon silhouettes in a row (a
  clipped icon for a fractional remainder) — resizing a single icon to represent a larger number is
  the one thing this style must never do.
- One master icon per category, reused via `<defs>`/`<symbol>` + repeated `<use>` — build the
  pictogram once, instance it as many times as the value requires; this also means recolouring or
  redesigning a category's icon is a single-point edit.
- Flat single-colour silhouette icons only — no outline detail, no internal shading, no gradient.
- Strict grid alignment: every repeated unit aligned to a consistent horizontal/vertical grid across
  all rows, so quantities are visually comparable at a glance.
- One consistent hue per category, chosen for maximum distinguishability — colour here is a coding
  system, not decoration.
- Pure figure-ground clarity: no illustrative background whatsoever.
**Palette:** a small set of flat, clearly distinct, moderate-saturation hues (one per category) plus
black/grey for structural text — chosen for legibility, not mood.
**Typography:** plain, functional sans-serif for axis labels, legend, and title — entirely subordinate
to the pictograms.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#ffffff"/><g fill="#1d6f8c"><circle cx="16" cy="30" r="5"/><rect x="12" y="35" width="8" height="14"/><circle cx="32" cy="30" r="5"/><rect x="28" y="35" width="8" height="14"/><circle cx="48" cy="30" r="5"/><rect x="44" y="35" width="8" height="14"/></g><g fill="#b3401e"><circle cx="16" cy="60" r="5"/><rect x="12" y="65" width="8" height="14"/><circle cx="32" cy="60" r="5"/><rect x="28" y="65" width="8" height="14"/></g><line x1="8" y1="82" x2="92" y2="82" stroke="#111" stroke-width="0.75"/></svg>
```

---

### Classic National Geographic / scientific cutaway-exploded diagram
**Visual DNA:** A more richly rendered cousin of the Tufte cutaway — dramatic ghosted-transparency or
peel-back reveals of interior structure, colour-coded systems, dense but organised numbered
annotation, usually shown from a dramatic angled 3/4 "hero" view rather than flat orthographic.
**Standard layers (z-order, bottom → top):**
- `<g id="dramatic-backdrop">` — soft environmental context (unlike Tufte's blank ground)
- `<g id="outer-shell-ghosted">` — the subject's outer surface, rendered semi-transparent or as a
  phantom outline so interior structure reads through it
- `<g id="cutaway-interior-layers">` — one sub-group per revealed system/organ/mechanism
- `<g id="peel-back-flap">` — an illustrated lifted surface section, if the reveal uses that device,
  with its own edge thickness and drop shadow
- `<g id="numbered-key-markers">` — small circled numerals/letters at each callout point
- `<g id="annotation-callouts">` — leader lines from marker to the dense key panel
- `<g id="legend-key-panel">`
- `<g id="title-caption">`
**Distinctive SVG techniques:**
- Ghosted transparency: render the outer shell at reduced opacity (or as outline-only) over the fully
  rendered interior, so the "X-ray" reveal is legible without deleting the outer form.
- Soft rendered shading per component: layered `linearGradient`/`radialGradient` fills giving each
  interior part real volume — a deliberate contrast with Tufte's flat hairline austerity.
- System colour-coding: every functional system (e.g. structural vs. mechanical vs. circulatory) keeps
  one consistent hue family throughout the whole diagram and its legend, so a viewer can trace a system
  by colour alone.
- Angled 3/4 hero viewpoint for the whole subject, rather than a flat orthographic elevation.
- Peel-back device: an illustrated flap along a cut edge, rendered with visible thickness and a small
  drop shadow, showing the surface being lifted away.
- Dense, organised numbered key: circled numerals tied to a structured legend panel rather than
  Tufte's sparse, close-set direct labels.
**Palette:** richer and more representational than Tufte — natural/material colours per component,
organised strictly by the system-colour-coding rule above.
**Typography:** clean technical sans-serif for callout numerals and the key panel; a bold serif or
magazine-masthead-style face for the title, evoking classic print science journalism.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#eef2f1"/><ellipse cx="50" cy="52" rx="38" ry="34" fill="#cfd8d6" opacity="0.4" stroke="#556" stroke-width="1"/><path d="M30 60 Q50 30 70 60 Q60 75 50 75 Q40 75 30 60" fill="#c94e3a"/><circle cx="50" cy="50" r="10" fill="#2f7a5a"/><circle cx="35" cy="40" r="4" fill="#c8102e"/><text x="40" y="41" font-size="6" fill="#222" font-family="Helvetica,sans-serif">1</text><line x1="35" y1="40" x2="20" y2="30" stroke="#222" stroke-width="0.5"/></svg>
```

---

### Saul Steinberg conceptual line drawing
**Visual DNA:** Radically economical single-weight pen line, witty conceptual juxtaposition, mostly
blank page, occasional faux-official marks (stamps, seals, signatures) — the drawing is as much idea
as image.
**Standard layers (z-order, bottom → top):**
- `<g id="blank-ground">` — mostly empty page; render little to nothing here
- `<g id="primary-contour-drawing">` — the single-weight witty contour line itself
- `<g id="conceptual-device">` — the visual pun/juxtaposition element (a drawn label standing in for a
  real object, an object standing in for an idea, and so on)
- `<g id="faux-official-marks">` — a drawn rubber-stamp circle, fake seal, or scrawled signature, if
  the piece calls for one
- `<g id="sparse-annotation">` — an occasional hand-drawn word or mark, integrated as part of the joke
**Distinctive SVG techniques:**
- Near-uniform single pen-weight line throughout, thin and confident, unbroken contour — related to
  ligne claire's uniformity but used with far greater economy: draw only what the idea needs.
- Radical economy: leave the overwhelming majority of the canvas empty. The absence of marks is as
  deliberate as the marks themselves — do not fill space "to make it look finished."
- Structural conceptual juxtaposition: combine unrelated drawn elements within one flat picture plane
  (a diagram, a stamp, a "real" object, a signature) so the joke lives in the composition's logic, not
  merely its subject matter.
- Faux-official marks: build a drawn rubber-stamp/seal as a roughly circular shape with a light
  `feTurbulence` distortion applied only to that element, so it reads as "stamped" rather than drawn
  cleanly like the rest of the piece.
- Integrated hand-lettering: any text is drawn with the same single pen-weight as the rest of the
  image, as part of the drawing — never a separate typeset caption.
**Palette:** black line on white/cream ground; if colour appears at all, it is a single flat wash
reserved for the one element carrying the "punchline."
**Typography:** loose, hand-drawn lettering built into the drawing itself, not a typeset layer.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#ffffff"/><path d="M15 70 Q30 20 55 55 Q65 70 85 30" stroke="#111" stroke-width="1.2" fill="none"/><circle cx="78" cy="75" r="9" fill="none" stroke="#111" stroke-width="1" stroke-dasharray="2 1.5"/><text x="72" y="78" font-size="6" fill="#111" font-family="Georgia,serif">ok</text></svg>
```

---

### WWII Allied / Empire Marketing Board poster style
**Visual DNA:** A calmer, more illustrative extension of the British official mode — large flat colour
fields (fewer, bigger shapes than Soviet propaganda's diagonal fragmentation), a modestly rendered
central scene or figure, and a dedicated slogan band carrying bold, legible type.
**Standard layers (z-order, bottom → top):**
- `<g id="background-scene">` — a simplified illustrative scene (landscape, factory, farm produce, or
  a symbolic device, depending on the brief)
- `<g id="flat-colour-blocks">` — large flat fields structuring the composition
- `<g id="central-figure-or-motif">` — the poster's main illustrated subject, lightly shaded
- `<g id="slogan-text-band">` — a solid-colour panel, usually top or bottom, carrying the main slogan
- `<g id="supporting-text">` — smaller instructional/informational copy
- `<g id="national-emblem">` — a generic crest/roundel/flag-motif device (never a specific real
  insignia)
**Distinctive SVG techniques:**
- Large flat colour fields as the primary compositional device — calmer horizontal/vertical structure,
  in deliberate contrast to Soviet propaganda's dynamic diagonal energy.
- Modestly rendered central subject: a base flat colour plus one or two shadow tones for gentle volume
  — more form than Soviet's hard two-tone flatness, far short of full painterly rendering.
- A structural slogan band: a solid-colour panel spanning the composition's width, sized to carry bold
  type — treat this as load-bearing composition, not a caption bolted on afterward.
- Purposeful, restrained colour symbolism: choose the sub-palette to match the brief's lineage (see
  Palette below) rather than mixing the two registers.
- Generic heraldic/national motifs only: build an original roundel or crest-like shape, never copy a
  specific real insignia or flag design exactly.
**Palette:** WWII Allied register — red (`#C8102E`-ish), navy blue (`#00247D`-ish), white/cream.
Empire Marketing Board register — warm earth tones: harvest gold, leaf green, terracotta, cream.
**Typography:** bold condensed sans-serif or slab-serif for the slogan band, sized for poster-distance
legibility; smaller plain sans-serif for supporting copy.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#00247d"/><rect x="0" y="0" width="100" height="55" fill="#f2ead9"/><path d="M25 50 Q50 15 75 50 Z" fill="#c8102e"/><rect x="0" y="80" width="100" height="20" fill="#c8102e"/><rect x="10" y="86" width="80" height="8" fill="#f2ead9"/></svg>
```

---

### Miyazaki-style concept sketch (observational clarity register)
**Visual DNA:** The preparatory/concept-art register, distinct from finished Ghibli cel animation —
loose but confident graphite/ink line, visible construction scaffolding left un-erased, selective
partial colour, and a clear interest in *how things actually work* (architecture, machinery, costume)
over polished rendering.
**Standard layers (z-order, bottom → top):**
- `<g id="sketch-paper-ground">` — visible paper tone/texture as the literal background
- `<g id="construction-lines">` — light, loose underdrawing/perspective scaffolding, left visible at
  low opacity rather than erased
- `<g id="primary-linework">` — the confident observational contour, drawn over the construction lines
- `<g id="selective-colour-wash">` — a light, partial colour wash applied to only one object/material/
  light source, most of the drawing left as line
- `<g id="mechanism-annotation">` — small hand-drawn arrows/notes explaining how a part works
- `<g id="margin-notes">` — informal handwritten-style marginalia
**Distinctive SVG techniques:**
- Visible, un-erased construction lines: keep the underlying geometric/perspective scaffolding
  rendered at low opacity rather than removing it — this "this is a study" signal is central to the
  register.
- Loose, naturally-varying linework: line weight varies with a sketchy quality, including small
  deliberate overshoots at corners (a line continuing slightly past where two contours meet) — the
  opposite instinct from a clean, closed vector contour.
- Selective/partial colour: apply a colour wash to only part of the drawing (one object or material)
  while the rest stays monochrome line — colour directs attention rather than fully rendering the scene.
- Hand-drawn mechanism annotation: small arrows and notes pointing out how a hinge, roof truss, or
  engine part functions — Tufte/DK's mechanism-revealing spirit, delivered by hand rather than typeset.
- Paper as background: the visible paper tone/texture *is* the environment — do not render a full
  illustrated backdrop behind the sketch.
**Palette:** mostly graphite grey or sepia line over a visible cream/light-grey paper tone, with one
restrained selective colour accent per sketch rather than a full palette.
**Typography:** informal, handwritten-style annotation integrated directly into the drawing — never a
separate typeset caption block.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#f2efe6"/><g stroke="#999" stroke-width="0.4" fill="none"><line x1="20" y1="20" x2="80" y2="20"/><line x1="20" y1="20" x2="20" y2="80"/><line x1="20" y1="50" x2="80" y2="50"/><line x1="50" y1="20" x2="50" y2="80"/></g><path d="M25 60 Q35 25 55 30 Q75 33 72 65 Q60 78 40 74 Q28 70 25 60" stroke="#2b2b2b" stroke-width="1.3" fill="none"/><path d="M45 40 Q55 35 62 45" stroke="#c9782b" stroke-width="6" opacity="0.35" fill="none"/><path d="M15 85 Q20 88 25 85" stroke="#555" stroke-width="0.5" fill="none"/></svg>
```
