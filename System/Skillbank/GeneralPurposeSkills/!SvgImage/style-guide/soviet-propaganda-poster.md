# Soviet propaganda poster style
**Tags:** poster | constructivist
**Anti-patterns / Avoid:** ornamental borders, floral detail, more than 3 flat colours, static centred symmetry, blended/photorealistic shading, serif type, or more than one focal point.
**Visual DNA:** 1920s Constructivist agitation graphics — a diagonal wedge of geometric force driving the eye toward one focal point, monumental heroic figures built from 2-4 flat colour planes, and bold sans type rotated so it reads as part of the image rather than a caption laid over it. Distinguishing note: where the WWII/EMB poster keeps its slogan in a separate band below a calm image, this style fuses text into the diagonal composition itself.
**Typical subject / composition:** worker/soldier/peasant figures in low-angle heroic pose, industrial or revolutionary iconography (gears, sheaves, tools, banners), and call-to-action slogans — built for agitation and mobilisation, not gentle persuasion.
**Standard layers (z-order, bottom → top):**
- `<g id="background-flat-block">` — one or two flat colour fields covering the full 1080-wide canvas
- `<g id="dynamic-diagonal-shapes">` — bold geometric bands/wedges angled 30-60° off horizontal, the primary compositional thrust
- `<g id="sunburst-rays">` — radiating geometric rays from a single focal point, optional
- `<g id="heroic-figure">` — the hero figure at 40-60% of canvas width, low horizon, worm's-eye angle, cropped by the frame
- `<g id="symbols">` — generic geometric iconography (star/gear/wheat-sheaf motifs; never a literal reproduction of a specific national emblem)
- `<g id="banner-typography">` — the slogan, rotated 30-45° and integrated into the diagonal, occupying roughly 20-30% of the composition
- `<g id="border-frame">` — thin flat-colour edge, if used
**Distinctive SVG techniques:**
- Strictly flat colour: hard-edged `<path>`/`<polygon>` shapes only, zero gradients anywhere — a hard rule, stated once, with no exceptions.
- Diagonal composition: align the long axis of every major shape group to one consistent diagonal between 30° and 60° off horizontal (`transform="rotate(...)"` on each group) — this is the single most identifying trait; horizontals and verticals are rare and never symmetrical.
- Monumental scale: render the hero figure at 40-60% of the 1080-wide canvas, cropped by the frame edges, with a low horizon line placed in the lower third.
- Two-tone figure shading: exactly two flat values per form (one lit flat colour plane + one hard-edged shadow plane as a separate `<path>`) — no gradient, no soft blend, no third tone.
- Sunburst: choose ONE build method and use it consistently — either a `<pattern>` tile of alternating wide/narrow triangles, or a manually authored `<g>` of triangular `<path>` wedges radiating from a single cx/cy; do not mix both methods in one piece.
- Integrated rotated type: bold geometric sans set along a rotated baseline (`transform="rotate(...)"` on the text group, matching the diagonal above), letter-spacing 0.05-0.1em, headline size 100-200pt against 12-20pt body/supporting text on the 1080-wide canvas.
**Palette:** hard 2-3 colour limit — Soviet red `#C8102E`, black `#000000`, aged cream `#F5EFE0`. Red covers roughly 5-15% of canvas area, marking importance rather than filling background. Gold (`#D4AF37`) may replace cream as a rare fourth accent, still counted inside the 3-colour cap when used.
**Typography:** geometric grotesque, weight 600-900, all-caps, boxy monolinear stroke, rotated into the diagonal. Stack: `Impact, "Arial Black", Helvetica, sans-serif`; named revivals: Kooperativ, SK Shriftovik.
