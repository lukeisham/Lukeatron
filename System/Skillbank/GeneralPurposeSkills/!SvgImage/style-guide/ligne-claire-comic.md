# Ligne claire style comic
**Tags:** comic | illustrative
**Anti-patterns / Avoid:** gradients, drop shadows, blur, feathering, hatching/cross-hatching/stippling, photographic texture fills, varying line weight by importance, curved or organic panel borders, serif or script lettering, atmospheric perspective, pure black `#000000` for large fills, specular highlights, and full chiaroscuro value ranges.
**Visual DNA:** Hergé's "clear line" idiom (named by Joost Swarte, 1977) — a technical constraint turned aesthetic: newspaper ink bleed forced thin, clean, uniform lines that survive print shrinkage. Every element carries the same-weight black outline over flat unmodulated colour; contrast is deliberately minimised, and where cast shadows appear they render as a LIGHT tint, never a dark value. Foreground and background carry equal visual emphasis — the "democracy of lines."
**Typical subject / composition:** adventure and travel narratives — simplified, near-schematic figures set against realistically detailed architecture, vehicles, machinery, and landscape; the style is deliberately flat but not simple, and that figure/background contrast is a cornerstone of the look.
**Standard layers (z-order, bottom → top):**
- `<g id="panel-border">` — same stroke weight as every other outline in the piece
- `<g id="background-architecture">` — structure drawn in ruled linear perspective with real vanishing points
- `<g id="background-flat-color">` — flat fills behind the linework
- `<g id="mid-ground">`
- `<g id="characters">`
- `<g id="foreground-detail">`
- `<g id="outline-overlay">` — the uniform-weight ink line, applied last, over every flat colour region
**Distinctive SVG techniques:**
- Absolute uniform stroke: on a 1080-wide canvas, one fixed `stroke-width="4"` for every outline in the piece — panel borders, characters, and backgrounds alike, no exceptions. Set `stroke-linejoin="round"` and `stroke-linecap="round"` throughout for clean joins with no spikes.
- Flat fill only: solid colour fills with no gradients, no drop shadows, no cross-hatching anywhere.
- Shading via adjacent flat blocks: where form or shadow is needed, add a second flat-coloured shape in a LIGHTER tint of the base colour — never a darker value, never a gradient or hatch texture.
- Ruled linear-perspective backgrounds: architecture, vehicles, and machinery drawn with true vanishing points and ruled construction lines, so the schematic figures read against a rigorously constructed setting.
- Depth without shading: build spatial separation through contour overlap, distinct held colour registers per plane (foreground/midground/background), and subtle hue or saturation shifts between planes — never blur, atmospheric gradient, or chiaroscuro.
- Panel grid discipline: regular rectangular panels on a strict grid (classic configurations: 2×2, 2×3, 3×2, 3×3, 4×2, 4×3) with uniform gutters; the frame stays visually neutral, a plain window rather than a design element. Reading path is plain left-to-right, top-to-bottom.
**Palette:** 3–4 active colours per panel, drawn from a warm, saturated set against a cream or warm off-white ground — never pure white, never pure black for large fills. Working set: Tintin blue `#3B7DD8`, signal red `#D42B2B`, sunshine yellow `#F5C842`, Hergé green `#4AA84E`, warm orange `#E87D2F`, deep brown `#6B3A2A`, cream ground `#FAF5E8`, ink `#1A1A1A`, sky cerulean `#7AB8E0`, soft sand `#E8D5A3`, muted mauve `#9C7BAD`, slate grey `#7A8B96`. Shadows are lighter tints of the base colour, never darker values; use the deep ink `#1A1A1A` in place of pure black for large dark fills.
**Typography:** hand-lettered-style uppercase sans throughout dialogue, consistent letterforms with generous kerning — e.g. `"Comic Neue", "Trebuchet MS", sans-serif` at medium weight as the digital equivalent. Black lettering on plain white balloons only; no coloured text, no drop shadows. Balloon outlines carry the same stroke weight as figures and panel borders.

**Related idioms (for contrast, not substitution):** the Marcinelle school (Spirou/Dupuis lineage) uses the same clear-line economy but looser, more elastic, rounder forms driven by movement rather than architectural precision. "Atom Style" is a 1950s design sensibility layered onto the same clear-line technique, not a distinct rendering method.
