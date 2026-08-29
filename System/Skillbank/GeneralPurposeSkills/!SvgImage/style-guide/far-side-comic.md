# Far Side style comic
**Tags:** comic
**Anti-patterns / Avoid:** colour, tapered strokes, or detailed backgrounds; heavy cross-hatching or full tonal modelling from hatching; correct/realistic anatomy; frequent word balloons or multi-line dialogue; a caption placed inside the panel frame.
**Visual DNA:** Single dry-absurdist panel built from a bold, fairly uniform contour outline with minimal internal detail; tone is carried primarily by solid black fill, silhouette, and negative space, with sparse hatching only as a secondary reinforcement — never colour.
**Typical subject / composition:** One deadpan sight gag per panel — anthropomorphised animals, oblivious suburbanites, or absurd juxtapositions — isolated against a mostly empty background so the one placed detail reads as the joke; many gags are wordless or carry only a short third-person caption.
**Standard layers (z-order, bottom → top):**
- `<g id="panel-frame">` — single rectangle for ~90% of gags; occasionally split into 4/6/8/9 cells for multi-part gags; thin consistent black border, 3 units wide on a 1080-wide canvas
- `<g id="background-simple">` — minimal, often just a horizon line or one prop, left empty elsewhere so negative space isolates the subject
- `<g id="characters">` — pear-shaped, heavy-set bodies on a roughly 1:3 head-to-torso height ratio; hunched sharply-sloping shoulders and curved spine; pencil-thin arms with no visible musculature; small beady eyes (or a brow ridge with eyes omitted entirely) and large prominent glasses; inexpressive except for one sight-gag detail
- `<g id="hatching-shadows">` — sparse functional hatching/stipple for shadow or texture reinforcement only, separate from the outline layer; not used for full tonal modelling
- `<g id="caption-text">` — set below the panel, outside the frame; third-person narration rather than character dialogue
**Distinctive SVG techniques:**
- Uniform outline: constant `stroke-width` (no taper) on every character/prop path, 5-6 units wide on a 1080-wide canvas — the opposite of Calvin & Hobbes' tapered line; a deliberately slightly loose/hand-drawn path (not perfectly smoothed bezier) keeps the sketchy quality without reading as sloppy.
- Solid fill and silhouette as primary tonal device: block in shadow shapes and dark props as flat black fills bounded by the same outline weight, rather than building value from line density.
- Sparse hatch shading (secondary only): a repeating `<pattern>` of straight parallel diagonal lines at 45°, 0.75-unit weight, 6-unit spacing on a 1080-wide canvas, applied only to small shadow/texture areas — never across a whole figure.
- Stipple shading (secondary only): a `<pattern>` of dots 1.5-unit radius on an 8-unit grid for soft texture in small areas, used interchangeably with sparse hatch, never as the main tonal mechanism.
**Palette:** black `#111111` on white `#ffffff`, with one mid-grey `#777777` reserved for hatched/stippled midtones. Strictly monochrome — Larson's Sunday run used watercolour/coloured pencil for a limited period and colourised reprints exist, but neither is canonical, so this style stays black-and-white.
**Typography:** captions set in a single line beneath the thin panel border; font stack `Courier, "Courier New", monospace` for a plain-typewriter dailies look, or `Georgia, "Times New Roman", serif` for a light-serif alternative — typographically quiet, never decorative, never hand-lettered for this baseline spec.
