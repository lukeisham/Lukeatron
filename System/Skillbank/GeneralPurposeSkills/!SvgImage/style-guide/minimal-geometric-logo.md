# Minimal geometric / logo style
**Tags:** logo | minimal
**Anti-patterns / Avoid:** No gradients, drop shadows, skeuomorphic detail, decorative flourishes that don't carry meaning, or a wordmark that overwhelms the mark.
**Visual DNA:** A single reductionist mark — 2 to 5 clean geometric primitives (circle, square, triangle, arc) composed into one memorable symbol, flat colour, no outlines unless structural, generous negative space; reads at tiny sizes and scales losslessly.
**Typical subject / composition:** A standalone identity mark — a brand symbol, app icon, or monogram meant to be recognised at a glance and reproduced at any size. Not for multi-element product screens or icon sets (see `clean-modern-flat-ui.md` for UI/icon-system work).
**Standard layers (z-order, bottom → top):**
- `<g id="background-flat">` — flat ground (often a single field, or omitted entirely)
- `<g id="mark-geometry">` — sub-group per primitive (circle/square/arc/polygon) forming the mark
- `<g id="counter-space">` — negative-space cuts/knockouts that define the mark's interior
- `<g id="wordmark-text">` — optional set type, tightly paired with the mark

**Distinctive SVG techniques:**
- Primitive cap: build the mark from 2 to 5 geometric primitives total, typically 3 — every primitive must be load-bearing (removing it changes the mark's meaning, not just its density).
- Construction scaffold: lay out primitives on a circle-and-square grid with a stated module — on a 1080-wide canvas, a 12-column module (90px per column) is standard. Derive proportions from the classic ratios: golden ratio (1:1.618) or root-2 (1:1.414) relationships between the mark's major elements; strike circles from the grid's intersection points rather than freehand placement.
- Optical centre: place the mark's visual weight slightly above true geometric centre — offset the mark's centroid upward by 3-5% of the mark's total height, since true geometric centre reads as sinking within its bounding box.
- Clear space: reserve empty margin around the mark equal to a proportion of one of the mark's own elements (not a fixed px value), so clear space scales automatically with the mark — the standard is 1x the mark's dominant stroke width, or 0.5x its cap-height, on all sides. State which reference element applies for a given mark.
- Minimum-size test: the mark must remain legible at 32px on a 1080-wide canvas (roughly 3% of canvas width) — at that size, verify every counter-form (interior negative-space cut) stays visibly open and does not fill in or merge with the surrounding fill.
- Colour cap: 2 flat colours total, including the ground — classically black on white (or reversed). No third accent colour.
- Monochrome-reduction check: the mark must survive as a solid single-colour silhouette (no interior detail lost to illegibility) and as a knockout/reversal on a dark ground. If either reduction breaks the mark's recognisability, the construction is wrong and must be reworked — this is not optional polish.
- Negative-space mechanics — three routes, pick by context: (1) an overlaid ground-coloured shape sitting on top of the mark to "cut" a knockout — simplest, but breaks if the mark is later placed on a non-matching background; (2) `fill-rule="evenodd"` on a single compound path — the most robust choice, since the cut is structural to the path itself and survives being placed on any background; (3) `<mask>` with a white/black gradient-free mask shape — use when the cut shape must be reused independently or animated separately from the fill.
- Perfect geometry: circles/polygons drawn with exact coordinates and consistent radii so the mark stays crisp at any scale; rely on `viewBox` for clean scaling, never fixed pixel dimensions.

**Palette:** Exactly 2 flat colours — classically `#000000` on `#ffffff` (or reversed). No gradients, no third hue.

**Typography:** A wordmark, when used, set in a clean geometric sans (`Futura, "Century Gothic", Avenir, sans-serif`) or built from the same primitives as the mark; the type sits quietly beside or below the mark and never competes with it for weight.
