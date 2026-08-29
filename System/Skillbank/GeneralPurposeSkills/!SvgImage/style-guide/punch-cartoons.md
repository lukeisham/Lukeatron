# Punch style cartoons
**Tags:** comic | illustrative
**Anti-patterns / Avoid:** never use a flat grey fill for shading, an italic-free rigid mechanical line, or a caption that skips the speaker-name/dialogue structure — all tone comes from hatch density and the caption is a two-speaker or single-line exchange in period serif.
**Visual DNA:** Victorian/Edwardian satirical wood engraving — the image is cut into an end-grain boxwood block, so every tonal value is built from fine controlled line density (hatching), never flat colour, and rendered alongside caricature exaggeration, a single ruled border, and a formal serif caption below.
**Typical subject / composition:** an ORIGINAL editorial or satirical scene — a caricatured figure or small group, often paired with an allegorical personification, staged against a sparse hatched setting, framed by a single border with a dialogue caption beneath.
**Standard layers (z-order, bottom → top):**
- `<g id="frame-border">` — single fine ruled border with ~0.25–0.5in-equivalent white margin inside it (on a 1080-wide canvas, roughly 27–54px), plus a small serif title in caps centred above it
- `<g id="background-hatched">` — sparse setting, toned entirely by hatching, never fill
- `<g id="characters-caricature">` — exaggerated proportions built as flat outlined silhouettes
- `<g id="hatching-tonal-layer">` — the engraving hatch/cross-hatch, kept as a separate layer from the outline so density can be tuned independently
- `<g id="caption-banner">` — formal caption set beneath the frame
**Distinctive SVG techniques:**
- Boxwood constraint: the source medium is an end-grain boxwood block (~0.918in thick) cut with burins — lines left standing print black, removed wood prints white. This is why line must read as fine, controlled, and engraved rather than sketched, and it governs every hatching choice below.
- Hatching system, as four named discrete tonal steps (not a gradient), each an SVG `<pattern>` sized for a 1080-wide canvas:
  - white — uncut block, no pattern, base fill only
  - light grey — parallel hatch, single direction, stroke-width 1.2px, line spacing 6px
  - mid-tone — cross-hatch, two line sets crossing at 30–45°, stroke-width 1.2px, spacing 4px per set
  - dark grey — dense cross-hatch, two sets at 30–45° plus a third pass at a different angle, stroke-width 1.4px, spacing 2px per set
  - black — solid fill, no pattern
  Contour-following ("bracelet") hatching is the fourth named device: lines curve to wrap the form like wire bent around it (after Dürer) and is the primary way volume is modelled on faces and figures, rather than a flat directional hatch.
- Line weight hierarchy: the outline stroke is 1.5–2× the stroke-width of the interior hatching (e.g. 2px outline against a 1.2px hatch), so contour reads as silhouette and hatching reads as tone.
- Caricature: exaggerate one or two distinctive features (nose, jaw, brow) to roughly 1.5–2× their naturalistic proportion relative to the rest of the head; add asymmetry to emphasise character; keep background minimal so the exaggerated silhouette stays legible.
- Ornate border: a single fine ruled line, optionally with a repeating small scrollwork motif built from repeated short paths at the corners only — the field between border and image stays plain.
- Allegorical personification, as a convention to build ORIGINAL figures in rather than reproduce: a draped classical female figure (helmeted, with shield) standing for an abstract idea like justice or the state; a portly male figure in everyday dress for public opinion; a heraldic lion for strength. Never copy a specific national or political emblem — build new figures inside the convention.
- Caption structure: below the border, in period serif, each line is a speaker name in small caps followed by a period, then dialogue in a smaller size than the name — this two-speaker (or single dry line) template is the spec, independent of how witty the line itself is.
- Historical caution: Victorian Punch routinely ran dehumanising racial and ethnic caricature, notably simianised depictions of Irish people and degrading depictions of colonised peoples. This style guide adopts the wood-engraving and hatching TECHNIQUE only — that caricature practice is never to be reproduced.
- Other anti-patterns: hatching dense enough to bury the form's silhouette; a mechanically rigid line with no natural variation; tonal range flattened as though pulled from a worn-out block.
**Palette:** warm carbon-black letterpress ink `#0A0A0A`–`#1A1A1A` on fresh cream paper `#FFFAF0`–`#FFFBF5` for maximum contrast; or the same ink on aged Victorian stock `#F5F1E8`–`#E8DCC8` when the brief wants period patina — choose fresh cream by default, aged stock only when patina is requested. No colour fills.
**Typography:** formal serif stack, e.g. `"Times New Roman", Georgia, serif`, for title and caption; speaker names in small caps.
