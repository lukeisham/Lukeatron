# Pixel-art style (limited palette)
**Tags:** illustrative | retro
**Anti-patterns / Avoid:** never anti-alias, dither to dodge a palette decision, use gradients, partial opacity, fractional/non-integer coordinates, a cell size that doesn't divide the canvas, more colours than the declared cap, sub-cell detail, smooth vector curves, or drop shadows/blur filters.
**Visual DNA:** Crisp retro raster look — the image is a grid of hard-edged square "pixels", each a
single flat colour from a tiny palette (2–16 colours), with no anti-aliasing, no gradients, and no
partial transparency.
**Signature tells (must be visibly present):** 1) every visible edge is a hard-edged step aligned to a single integer cell grid — no diagonal or curved edge is ever smooth 2) the whole image uses 2–16 flat colours from one declared, unextended palette, with no gradient and no partial opacity anywhere 3) shading, where present, is a visible dithered checkerboard/pattern between two palette steps, never a smooth blend.
**Craft-rule carve-outs:** This style is the library's deliberate exception to several generic craft rules, because grid discipline IS the tell:
- Bézier-over-primitives does not apply — every shape is a `<rect>` on the integer cell grid, never a `<path>`/Bézier curve or a `<circle>`/`<ellipse>` (a "circle" is drawn as a stepped cluster of square cells). Grid alignment is the signature, not organic silhouette.
- No gradients and no partial opacity — every fill is 100% opaque flat colour; a two-colour dithered `<pattern>` (see Distinctive SVG techniques) stands in for any blend or partial-opacity effect.
- No one-global-light comment or contact shadows — tonal value comes from the palette's own hue-shifted ramp steps and dithering, not from a light direction or a drawn contact-shadow shape.
- No detail-budget floor — this style may sit at or below skill.md's detail-budget minimum by design; state that it is deliberately minimal within the cell grid rather than padding it with extra elements.
- The 1080-wide reference canvas does not apply either — see the grid-to-canvas mapping note below; pick a power-of-two-friendly size instead.
**Typical subject / composition:** sprites (characters, items), tilesets, small portraits, small
scenes/dioramas, and icons. The subject must be *designed* for the cell budget — a 16×16 grid reads
as an icon, a 32×32 grid as a character sprite, a 64×64+ grid as a small scene — never take a
detailed illustration and shrink it into the grid after the fact; silhouette and readability must be
solved at native resolution.
**Standard layers (z-order, bottom → top):**
- `<g id="background-flat">` — one flat colour field
- `<g id="sprite-subject">` — the main figure/object, built from aligned square cells
- `<g id="sprite-details">` — smaller features (eyes, highlights, outline)
- `<g id="dither-shading">` — checkerboard/pattern dithering between two palette colours, if tone is needed
- `<g id="pixel-text">` — bitmap-style lettering built on the same cell grid (if any)
**Distinctive SVG techniques:**
- Grid-to-canvas mapping — canvas size = logical grid × integer cell size, always. A 32×32 grid at
  32px/cell gives a 1024px canvas; a 64×64 grid at 16px/cell also gives 1024px. The cell size must be
  a whole-pixel integer that divides the canvas exactly — a non-integer cell size is what produces
  seams and half-pixel blur. This style is the deliberate exception to the library's usual 1080-wide
  reference canvas: pick a power-of-two-friendly size (512 / 1024 / 2048) instead, so the grid divides
  the canvas cleanly.
- Hard edges: set `shape-rendering="crispEdges"` on the root SVG and snap every rect to the integer
  grid — this is the one and only place anti-aliasing is addressed.
- Rect-merging optimisation: adjacent same-colour cells in a row merge into one wider `<rect>`. Scan
  row-first, greedily extending a run until the colour changes, then emit one rect per run — keeps
  file size down without changing the rendered result.
- Cell-grid discipline: every element — base colour, shadow, highlight, outline, dither — lives on
  the same cell grid. There is no such thing as a sub-cell detail in this style.
- Hue-shifted ramps: build each material as a 3–4 step ramp that shifts hue as it darkens (toward a
  cooler or adjacent hue), never a straight lightness ramp toward black — a pure lightness ramp is the
  single most common thing that makes pixel art look flat and dead.
- Dithering: standard densities are a 50% checkerboard (alternating cells) and 25%/75% variants (1-in-4
  or 3-in-4 cells of the second colour on the same grid). Build it as an SVG `<pattern>` tiled on cell
  boundaries — it must align to the same integer grid or it will shimmer when scaled. Use dithering only
  to bridge two adjacent palette steps in a gradient or to suggest texture — never as a substitute for
  adding a palette colour.
- Outlining: two conventions. A *full outline* rings the whole sprite silhouette in one darker colour.
  *Selective outlining* (more sophisticated) drops the outline where the form catches light and keeps
  it in shadow, so the silhouette breathes instead of reading as a sticker. Either way, "darker" means
  the darkest step of that material's own ramp, or a shared near-black from the palette — never pure
  black.
**Palette:** choose one named palette and never extend it mid-image.
- Game Boy DMG (4-tone green): `#0F380F`, `#306230`, `#8BAC0F`, `#9BBC0F`
- 1-bit: `#000000`, `#FFFFFF`
- CGA-style (4-colour): `#000000`, `#55FFFF`, `#FF55FF`, `#FFFFFF`
- General-purpose 16-colour ramp: `#1a1c2c`, `#5d275d`, `#b13e53`, `#ef7d57`, `#ffcd75`, `#a7f070`,
  `#38b764`, `#257179`, `#29366f`, `#3b5dc9`, `#41a6f6`, `#73eff7`, `#f4f4f4`, `#94b0c2`, `#566c86`,
  `#333c57` (PICO-8-style)
**Typography:** draw glyphs as `<rect>`s on the same cell grid — this is the recommended, fully
portable approach and the right choice for a small fixed character set (see `<g id="pixel-text">`
above). Embedding a genuine bitmap-style pixel font is possible at an integer size that is a multiple
of its design size, but external pixel fonts are not portable in a self-contained SVG (font
availability at render time cannot be guaranteed) and should not be relied on. A plain system
monospace `<text>` face is the fallback of last resort only: SVG renderers will still anti-alias its
glyphs regardless of `shape-rendering`, so it will not truly read as pixel type.
