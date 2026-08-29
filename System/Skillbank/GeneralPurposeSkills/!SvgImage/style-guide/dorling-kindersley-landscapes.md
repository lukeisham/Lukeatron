# Dorling Kindersley style landscapes
**Tags:** illustrative | technical
**Anti-patterns / Avoid:** visual overcrowding (too many captions for the space), leader-line spaghetti where lines cross in dense areas, annotation dominating so the base image is lost, tonal discontinuity between photographic and drawn elements, and captions so bite-sized that causal explanation disappears.
**Visual DNA:** DK's founding "lexigraphic" page design (Peter Kindersley, 1974) treats every object as an isolated cut-out on stark white paired with annotative text, built for non-linear entry — the reader can start anywhere on the page; that navigational idea, not the render technique, is what defines the style. Objects are photo-referenced and modelled with soft gradients and airbrush-like shading at high fidelity, often shown as a cutaway or cross-section revealing internal structure while keeping the external silhouette recognisable.
**Typical subject / composition:** natural history, technical cutaways, and landscapes/ecosystems shown from an elevated three-quarter bird's-eye view (neither pure plan nor pure section); panoramas are frequently presented as cross-sections or cutaways revealing layered systems (geological strata, building interiors, ecosystem tiers).
**Standard layers (z-order, bottom → top):**
- `<g id="isolated-background">` — flat white backdrop (`#ffffff`), no texture
- `<g id="ground-shadow">` — soft blurred ellipse(s) beneath grounded elements
- `<g id="landscape-base">` — terrain/ground plane
- `<g id="landscape-elements">` — sub-group per element (trees, rocks, water, structures)
- `<g id="foreground-detail">` — closest, sharpest, most-detailed elements
- `<g id="labels-leaders">` — dot + hairline leader + caption, DK's signature ID device
**Distinctive SVG techniques:**
- Contact shadow: on a 1080-wide canvas, a duplicated dark silhouette blurred with `feGaussianBlur stdDeviation="3–5"` at 20–35% black opacity, placed only where the object meets the ground plane — not a full drop shadow behind the whole object.
- Crisp die-cut silhouette: clean, confident vector outline (no sketchy or broken line) around each isolated object, reading as a "reference illustration" cutout against the white ground.
- Form via gradient, not a shading layer: subtle `linearGradient`/`radialGradient` within each element's own fill suggests rounded volume, in place of a separate hatching or shadow layer.
- Fine outline: on a 1080-wide canvas, a 1px stroke in a darker shade of the fill itself (never pure black) around each object, keeping edges crisp without looking inked.
- Cutaway/cross-section reveal: a clipped or sliced region of an element rendered with visible internal structure (strata bands, building floors, root systems) while the surrounding silhouette stays externally accurate.
- DK label device: on a 1080-wide canvas, a filled dot 2–3pt in diameter at the point of interest, a 0.5–1pt hairline leader (may jog or curve around intervening objects) running to a caption in clear sans-serif; every label in the piece sized and weighted identically. Typical density: 8–12 labelled elements per full page, or 3–8 captions surrounding a single subject. Captions are short "nuggets," never paragraph prose.
**Palette:** DK publishes no official brand palette — the printed books draw on the full CMYK gamut driven by underlying photography. Treat the palette as a rule, not a swatch set: match colour to the object's real-world referent, keep high contrast against the white ground, and avoid decorative or non-representational primaries. Representative working set: true green `#5c9e4a`, earth brown `#8a5a2b`, sky blue `#8fc3e8`, stone grey `#a8a29a`, water teal `#4a8a94`, terracotta `#b56a3c`.
**Typography:** sans-serif throughout, no serifs in captions or headings — e.g. `Frutiger, "Helvetica Neue", Arial, sans-serif`. Captions set small and regular weight in black, roman upright by default; italic reserved for scientific names, foreign terms, and emphasis. Headings are larger and bold or semi-bold, same sans family.
