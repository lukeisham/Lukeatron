# Tufte style object designs
**Tags:** data-viz | technical
**Anti-patterns / Avoid:** no gradients, drop shadows, bold outlines, arrowheads, redundant grids, chart-junk, or a label competing visually with the object.
**Visual DNA:** Edward Tufte's data-ink-minimalist ethos applied to an exploded/annotated object diagram — hairline leaders, near-monochrome ink, every mark earns its place, generous white space.
**Typical subject / composition:** a single manufactured or mechanical object (device, tool, assembly, furniture piece, instrument) shown exploded along its own assembly axis to reveal how parts fit together — engineering-schematic in spirit. Not for slicing through terrain or a building interior; that is the cutaway sibling style.
**Standard layers (z-order, bottom → top):**
- `<g id="object-silhouette">` — the whole assembled object at low opacity (fill/stroke `#1a1a1a` at 8–12% opacity, no stroke) as orientation context
- `<g id="exploded-components">` — one sub-group per separated part, each offset outward along the single implied assembly axis (the object's long axis, or its stacking axis for layered objects) — never offset radially or on a per-part custom axis
- `<g id="leader-lines">` — hairline connectors, label to part
- `<g id="annotation-labels">` — small sans-serif text, set close to its leader's endpoint, integrated directly beside the feature it describes (no separate legend panel)
- `<g id="scale-reference">` — a small ruler/scale bar, included whenever the diagram is meant to convey real-world size or the parts are shown at inconsistent scales relative to each other; omitted when the composition is purely illustrative (assembly order only, no size claim)
- `<g id="caption">`
**Distinctive SVG techniques:**
- Hairline strokes: `stroke-width` 1.5–2 (on a 1080-wide canvas) for all structural and leader lines — never a bold outline.
- Leader lines: straight or single-elbow `<path>` segments terminating in a small filled circle (`r` 2–4 on a 1080-wide canvas) at the part end; no arrowhead marker.
- Exploded-view integration: labels and any small supporting chart (a dimension callout, a count, a material note) sit directly beside the component they describe, with the leader running from the annotation to the specific feature — never collected into a separate key or legend block. Where useful, place a small multiple (a tiny detail inset or context thumbnail, ~120–180px wide on a 1080-wide canvas) beside the main figure so the object is legible at both a macro (whole assembly) and micro (single joint/fastener) reading without a page jump.
- Restrained colour: near-monochrome (black/grey ink) plus at most one accent hue. The accent marks exactly ONE isolated component or feature being called out — it is never used to colour-code a family or set of layers/parts (that is the cutaway style's job, and is forbidden there). Once the accent has been used for that one component, it is spent for the diagram; do not reuse it elsewhere in the same figure.
**Palette:** ground `#fffff8`; ink `#1a1a1a`; secondary/silhouette grey `#888888`; rule grey `#cccccc`; one accent chosen from `#8B0000`–`#C00000` (e.g. `#A6192E`), used once per diagram on the single called-out component only.
**Typography:** small, tight-set sans-serif — `Helvetica, Arial, sans-serif` — 14–16px equivalent (on a 1080-wide canvas) for annotation labels, never larger than needed for legibility; captions may run slightly larger (18–20px equivalent) but stay the same family; no label competes visually with the object itself.
