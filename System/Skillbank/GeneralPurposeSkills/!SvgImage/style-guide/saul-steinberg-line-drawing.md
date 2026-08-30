# Saul Steinberg conceptual line drawing
**Tags:** line-art | illustrative
**Anti-patterns / Avoid:** never fill space just to look finished, never use a typeset caption, never add a punchline label spelling out the joke — on a 1080-wide canvas, texture-induced wobble from the stamp's `feTurbulence` is the only permitted variation in the line; a true second stroke weight (a deliberately thicker or thinner drawn line) is still forbidden.

**Visual DNA:** A single, near-uniform pen contour (4px on a 1080-wide canvas) wanders across a mostly bare ground, occasionally interrupting its own logic — a line stops being a line and becomes the thing it depicts, a stamp appears where a signature is expected — while the drawing stays deliberately captionless, letting structure alone carry the idea.

**Signature tells (must be visibly present):** 1) one uniform 4px pen contour and almost nothing else on the page — at least 55% of the canvas stays bare ground 2) exactly one pattern-break element where the drawing's own established logic is broken (object-substitution, label-as-object, or diagram-interruption) 3) no caption anywhere — the idea is carried by structure alone, never spelled out in a typeset or hand-lettered explanation.

**Craft-rule carve-outs:** This style's single uniform contour weight overrides the generic edge-variation rule — a second true stroke weight is forbidden; the only permitted line variation is the `feTurbulence`-distorted stamp edge, which moves the existing 4px stroke sideways rather than introducing a second weight. The style also sits well below the detail-budget floor by design (a single figure caps at 40 discrete paths, and 55%+ of the canvas stays empty) — do not pad it toward the general 250–600 element floor.

**Typical subject / composition:** invented bureaucratic or geographic scenes — passports, maps, official corridors, diagrams of everyday objects, a hand drawing itself — built from exactly one of three nameable compositional patterns per drawing:
- **Object-substitution** — a drawn line meant to be one thing (a road, a wire, a signature) turns out to be another (a river, a hair, a stitched wound) without any visual seam between the two readings.
- **Label-as-object** — a word, seal, or diagram element is drawn as if it were a physical object in the scene (a rubber stamp casting a shadow, a "SIGNATURE" flourish holding up a table leg), collapsing the distinction between text and thing.
- **Diagram-interruption** — an ordinary technical diagram (map, graph, floor plan, family tree) is drawn straight until one node or line breaks its own established convention (a map's roads dead-end into a drawn ocean wave; a flowchart arrow becomes a snake).

**Standard layers (z-order, bottom → top):**
- `<g id="blank-ground">` — flat `#faf8f2` or `#fff` field; render nothing else here. At least 55% of the 1080×1080 canvas area must remain untouched by any stroke or fill (measured as bounding-box coverage of all drawn elements combined).
- `<g id="primary-contour-drawing">` — the single-weight contour line: the drawn scene itself, built from no more than 40 discrete `<path>` elements for one figure, keeping the drawing legibly sparse.
- `<g id="pattern-break-element">` — the one element that executes the chosen compositional pattern (object-substitution / label-as-object / diagram-interruption): the single path or group where the drawing's own established visual logic is broken. Exactly one such element per drawing.
- `<g id="faux-official-marks">` — the drawn rubber stamp, seal, or scrawled signature, when the piece calls for one (see Distinctive SVG techniques for construction).
- `<g id="sparse-annotation">` — an occasional hand-drawn word, integrated into the drawing as an object in its own right (per label-as-object), never as a caption explaining the joke.

**Distinctive SVG techniques:**
- Uniform contour line: every `<path>` in `primary-contour-drawing` uses `stroke="#111" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"` on the 1080-wide canvas, with no other stroke width appearing anywhere in the piece except the turbulence-distorted stamp edge below.
- Stamp/seal construction: a circle or oval 90–140px in diameter, `fill="none" stroke="#111" stroke-width="4"`, optionally with 1–2 concentric rings 8–12px inside it; internal text (if any) set on a `<textPath>` following the circle's circumference at 14–18px. Apply distortion only to this element via:
  ```
  <filter id="stampWorn">
    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="noise"/>
    <feDisplacementMap in="SourceGraphic" in2="noise" scale="6" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
  ```
  `scale="6"` on a 4px stroke produces a worn, ink-starved stamp edge without thickening the line into a visibly different weight — the displacement moves the existing 4px stroke sideways rather than widening it, which is why it does not count as a second pen weight.
- Pattern-break execution: draw the `pattern-break-element` with the identical 4px contour style as its surroundings — the humour must come from what the line does (switching referents, becoming an object, breaking a diagram's rule), never from a style change, weight change, or added label.
- Integrated hand-lettering: any text in `sparse-annotation` or on stamps is a drawn `<path>` or wobble-perturbed `<text>` (slight per-glyph rotation/offset, ±2°/±2px) in the same 4px-equivalent stroke, never a clean typeset caption sitting outside the drawing's line logic.

**Palette:** ink plane is `#111` line only, on `#fff` or `#faf8f2` ground — this pair is the default and covers most drawings entirely. A single flat colour wash (any one hex, e.g. `#c0392b`) may be added to at most one element in the whole piece, placed in its own `<g id="colour-wash">` layer directly above `blank-ground` and below `primary-contour-drawing`, so the ink line always sits on top of the wash and reads first.

**Typography:** no typeset font is used anywhere in the image; all lettering is drawn as described under Integrated hand-lettering above (loose, wobbled, pen-consistent), functioning as an object in the composition rather than a caption.

**Choosing this over its neighbours:** against the comic styles (`far-side-comic.md`, `calvin-hobbes-comic.md`, `ligne-claire-comic.md`) — all of those carry a punchline caption or word balloon and use solid black fills or a colour wash to build tone; this style never fills a shape solid and never captions the joke — the wit lives entirely in the line's own logic breaking (object-substitution, label-as-object, diagram-interruption), with the ground left almost entirely bare. Reach for Steinberg when the idea is conceptual/structural and should be discovered by looking, not read in a caption; reach for a comic style when the piece needs a stated gag, a filled figure, or narrative panel structure.
