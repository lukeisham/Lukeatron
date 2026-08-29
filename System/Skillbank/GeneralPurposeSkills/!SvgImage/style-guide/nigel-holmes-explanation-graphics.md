# Nigel Holmes explanation graphics (classic Time magazine informational illustration)
**Tags:** data-viz | technical
**Anti-patterns / Avoid:** never render an object with a photographic gradient (2-3 flat tones only), let pseudo-3D distort the data's real proportions, add ornament that competes with the quantitative message, crack a joke on a grave subject, or build a metaphor object so literal it hides the number.
**Visual DNA:** Friendly, mechanism-revealing "how it works" diagrams built by Nigel Holmes (Time graphics director, 1978–1994): simplified pseudo-3D objects and anthropomorphic metaphor figures carry the data, walked through a numbered sequence by bold arrows, with labels planted directly on the parts they explain.
**Typical subject / composition:** step-by-step processes and mechanisms for a general, not statistically-trained, reader — how a car engine works, how a bill becomes a law, comparative quantities as gas pumps/tanks/climbing figures. Best for a hook-then-inform read: one dominant metaphor object or scene, left-to-right or top-to-bottom step order, captions or a touch of character dialogue commenting on the data.
**Standard layers (z-order, bottom → top):**
- `<g id="background-plain">` — flat, uncluttered ground
- `<g id="mechanism-object">` — the thing (or metaphor object) being explained, in simplified pseudo-3D form
- `<g id="process-arrows">` — bold curved arrows carrying the eye through the sequence
- `<g id="numbered-steps">` — small circular step-number badges
- `<g id="annotation-labels">` — labels set directly on/beside the part they describe
- `<g id="legend-key">` — only if the diagram needs one; kept minimal
**Distinctive SVG techniques:**
- Simplified pseudo-3D: extrude the object's silhouette into an offset parallelogram "side" face plus the original front face; light source fixed top-left at roughly 45°, so top and left faces get a lighter flat tone and bottom/right faces a darker flat tone — 2-3 flat tones per object, no gradient, no vanishing point.
- Bold sequence arrows: `<path>` stroke-width ~6-8 on a 1080-wide canvas, drawn as a quadratic Bézier or arc (never a straight line with a sharp corner), routed around the mechanism rather than across it, ending in a filled arrowhead `marker-end` — the arrow *is* the narrative, not decoration.
- Numbered badges: small filled circles (diameter ~40-48 on a 1080-wide canvas) with a bold numeral, placed at each step's start.
- Direct labelling: every label sits on or immediately beside its referent (no separate legend unless truly necessary) — this is what makes the diagram read at a glance.
**Palette:** start from black and white, and add colour only where it carries meaning (Holmes's own rule — this is the discipline people skip). Working set: black, white, and 2-4 warm 1980s-editorial hues — tan-gold `#BA9C5D`, peach `#DDB495`, brown `#8B6F47`, plus a strong red and a bright accent — 3-6 colours total per graphic, never applied decoratively.
**Typography:** headline `"Franklin Gothic", "Trebuchet MS", Arial, sans-serif` bold; body/labels `"Helvetica Neue", Helvetica, Arial, sans-serif`; serif fallback `Georgia, "Times New Roman", serif`. Hierarchy: bold deck headline → descriptive subhead → clear chart labels; numerals bold, descriptive labels regular weight.

**Choosing this over its neighbours:** Holmes and Tufte are both "explain a mechanism clearly" stylists, but they disagree about the reader, not about honesty. Tufte (`tufte-object-designs.md`, `tufte-location-cutaway.md`) builds an instrument for a statistically literate reader and optimizes data-ink ratio to near-monochrome austerity. Holmes designs a hook for a distracted general reader who would otherwise not read the graphic at all — colour, humour, and a metaphor object are the price of getting looked at, provided "the data must come first." Pick Holmes when the audience needs to be seduced into reading; pick Tufte when the audience is already reading and wants precision. Against `national-geographic-cutaway.md` and `dorling-kindersley-landscapes.md`: Holmes stays flat pseudo-3D and diagrammatic, never a rendered, ghosted, or catalogued object.
