# !SvgImage Style Guide — Index

**Version:** matches `skill.md`.

Coordinating index for `!SvgImage`'s style library. Each style's full body (Visual DNA, standard
`<g id>` layers, distinctive SVG techniques, palette, typography) lives in its own file in this folder
— `style-guide/<slug>.md`. This index file carries only what STEP 2's picker grid needs: each style's
name, one-line teaser, tags, file path, and its Thumbnail SVG. That split is deliberate — building the
grid never requires reading every style's full body, and once Luke picks one, `!SvgImage` reads *only*
that one style's file, not the whole library.

Style is a visual idiom (linework, palette, composition technique, texture) — not a licence to
reproduce a specific copyrighted character or franchise artwork. Entries describe how to draw *in the
manner of* a style for original subjects, the same way "in the style of" is understood in any art
brief; they never instruct copying a named character's exact design.

**Row format (keep every new row to this shape):**
```
### <Style Name>
**File:** `style-guide/<slug>.md`
**Tags:** copied from the individual file's Tags line
**Visual DNA (one line):** a single-sentence teaser, distinct enough to pick out from the grid
**Thumbnail (SVG):** a small (`viewBox="0 0 100 100"`), self-contained, opaque-background SVG snippet
that previews the style at a glance — built from the individual file's palette/techniques. This is
what `!SvgImage` STEP 2 renders as the clickable tile in its style-picker grid, so it must stand alone
(no external refs) and stay compact.
```

**Individual file format** (`style-guide/<slug>.md` — keep every new file to this shape):
```
# <Style Name>
**Tags:** one or two categories (comic / data-viz / illustrative / UI / poster / technical / line-art / logo)
**Anti-patterns / Avoid:** 1 line — what this style must never do
**Visual DNA:** 1-2 sentences — what makes this style instantly recognisable
**Typical subject / composition:** (optional — only for conceptual styles) what subjects this style suits
**Standard layers (z-order, bottom → top):**
- `<g id="...">` — what lives in it
**Distinctive SVG techniques:**
- technique — how to build it with SVG primitives/filters
**Palette:** representative hex values or named colours
**Typography:** font-family stack / lettering notes
```
No Thumbnail field in the individual file — it lives only here, in the index, as the single source of
truth for the picker grid.

When Luke names a style not in this index, `!SvgImage` STEP 2 researches it, writes a new
`style-guide/<slug>.md` in the individual-file format above, and appends a matching row (including a
hand-built Thumbnail) to this index — the two files are always created together.

Stroke-width and coordinate figures in Thumbnails are given at thumbnail scale (a 100-unit viewBox);
scale proportionally for the working canvas (e.g. ×10.8 for a 1080px-wide export).

---

### Calvin & Hobbes style comic
**File:** `style-guide/calvin-hobbes-comic.md`
**Tags:** comic | illustrative
**Visual DNA (one line):** Loose, kinetic ink linework with real personality — tapering line weight over a soft painterly colour wash.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#eef3e0"/><rect width="100" height="45" fill="#bcd6e8"/><path d="M20 70 Q30 40 50 55 Q70 68 82 42" stroke="#5b3a29" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M22 68 Q28 50 20 40" stroke="#5b3a29" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M78 46 L90 38 M78 50 L92 48 M78 54 L90 58" stroke="#5b3a29" stroke-width="1.5" fill="none"/></svg>
```

---

### Far Side style comic
**File:** `style-guide/far-side-comic.md`
**Tags:** comic
**Visual DNA (one line):** Single dry-absurdist panel, uniform bold outline, tonal shading built entirely from hatching, no colour.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#ffffff"/><rect x="4" y="4" width="92" height="92" fill="none" stroke="#111" stroke-width="2"/><ellipse cx="50" cy="48" rx="22" ry="26" fill="#fff" stroke="#111" stroke-width="3"/><circle cx="43" cy="42" r="2.5" fill="#111"/><circle cx="58" cy="42" r="2.5" fill="#111"/><path d="M40 58 Q50 62 60 58" stroke="#111" stroke-width="2" fill="none"/><path d="M15 80 L25 88 M20 80 L30 88 M25 80 L35 88 M30 80 L40 88" stroke="#111" stroke-width="1"/></svg>
```

---

### Tufte style object designs
**File:** `style-guide/tufte-object-designs.md`
**Tags:** data-viz | technical
**Visual DNA (one line):** Data-ink-minimalist exploded/annotated object diagram — hairline leaders, restrained ink, generous white space.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#fbfaf7"/><rect x="20" y="30" width="24" height="16" fill="none" stroke="#1a1a1a" stroke-width="0.75"/><rect x="56" y="46" width="18" height="12" fill="none" stroke="#1a1a1a" stroke-width="0.75"/><line x1="44" y1="38" x2="60" y2="50" stroke="#1a1a1a" stroke-width="0.5"/><circle cx="60" cy="50" r="1.2" fill="#1a1a1a"/><text x="30" y="68" font-size="6" fill="#1a1a1a" font-family="Helvetica,sans-serif">part</text></svg>
```

---

### Tufte style location cutaway designs
**File:** `style-guide/tufte-location-cutaway.md`
**Tags:** data-viz | technical
**Visual DNA (one line):** The same minimal-ink ethos applied to a cross-section/cutaway of a place, strata labelled with hairline leaders.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#fbfaf7"/><rect x="15" y="20" width="50" height="14" fill="#e8e6de" stroke="#1a1a1a" stroke-width="0.5"/><rect x="15" y="34" width="50" height="14" fill="#d8d6cc" stroke="#1a1a1a" stroke-width="0.5"/><rect x="15" y="48" width="50" height="14" fill="#c8c6bb" stroke="#1a1a1a" stroke-width="0.5"/><line x1="65" y1="27" x2="80" y2="27" stroke="#1a1a1a" stroke-width="0.5"/><circle cx="65" cy="27" r="1" fill="#1a1a1a"/><line x1="12" y1="20" x2="12" y2="62" stroke="#1a1a1a" stroke-width="0.5"/></svg>
```

---

### Dorling Kindersley style landscapes
**File:** `style-guide/dorling-kindersley-landscapes.md`
**Tags:** illustrative | technical
**Visual DNA (one line):** DK Eyewitness-guide illustration — crisp flat-shaded vector art with a soft contact shadow and dot-and-leader captions.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#ffffff"/><ellipse cx="50" cy="78" rx="26" ry="5" fill="#000" opacity="0.12"/><path d="M25 70 Q30 40 50 45 Q70 40 75 70 Z" fill="#5c9e4a" stroke="#3d6b32" stroke-width="1"/><circle cx="50" cy="30" r="10" fill="#f4c542" stroke="#c99a1e" stroke-width="1"/><circle cx="70" cy="55" r="1.5" fill="#222"/><line x1="70" y1="55" x2="84" y2="50" stroke="#222" stroke-width="0.5"/></svg>
```

---

### Ligne claire style comic
**File:** `style-guide/ligne-claire-comic.md`
**Tags:** comic | illustrative
**Visual DNA (one line):** Hergé-lineage "clear line" — every outline the same uniform weight, flat evenly saturated colour, zero shading.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#bfe1f0"/><rect x="10" y="55" width="80" height="35" fill="#e3c98a"/><rect x="30" y="35" width="40" height="30" fill="#d9503c" stroke="#111" stroke-width="2.5"/><polygon points="25,35 50,15 75,35" fill="#8a3b2b" stroke="#111" stroke-width="2.5"/><rect x="45" y="50" width="10" height="15" fill="#3c2a1e" stroke="#111" stroke-width="2.5"/></svg>
```

---

### Studio Ghibli style anime
**File:** `style-guide/studio-ghibli-anime.md`
**Tags:** illustrative | animation-film
**Visual DNA (one line):** Painterly, atmospheric backgrounds with soft natural light behind simple two-tone cel-shaded characters.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="sky1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fde8b6"/><stop offset="1" stop-color="#bcd9ec"/></linearGradient><filter id="blur1"><feGaussianBlur stdDeviation="2"/></filter></defs><rect width="100" height="100" fill="url(#sky1)"/><path d="M0 80 Q28 56 52 70 Q76 60 100 74 L100 100 L0 100 Z" fill="#a8c39a" filter="url(#blur1)"/><ellipse cx="28" cy="74" rx="30" ry="12" fill="#6fa85a" opacity="0.85"/><circle cx="72" cy="26" r="10" fill="#fff5da" opacity="0.9"/><circle cx="48" cy="52" r="12" fill="#f2dcc0" stroke="#6b4a2f" stroke-width="1"/></svg>
```

---

### Classic educational mnemonic aid style (e.g. "An Adventure with a Lion")
**File:** `style-guide/classic-mnemonic-aid.md`
**Tags:** illustrative | comic
**Visual DNA (one line):** Mid-century phonics illustration — a mnemonic letter/symbol visually fused into the subject's own form.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#f2e9d2"/><circle cx="50" cy="50" r="26" fill="#d99a2b" stroke="#7a4a1e" stroke-width="3"/><path d="M50 24 Q30 30 24 50 Q30 70 50 76 Q70 70 76 50 Q70 30 50 24" fill="none" stroke="#b3401e" stroke-width="4"/><circle cx="50" cy="50" r="14" fill="#e8c98a" stroke="#7a4a1e" stroke-width="2"/><circle cx="45" cy="47" r="1.5" fill="#3a2412"/><circle cx="55" cy="47" r="1.5" fill="#3a2412"/><path d="M46 55 Q50 58 54 55" stroke="#3a2412" stroke-width="1.5" fill="none"/></svg>
```

---

### Punch style cartoons
**File:** `style-guide/punch-cartoons.md`
**Tags:** comic | illustrative
**Visual DNA (one line):** Victorian satirical engraving — dense fine-line hatching builds all tonal value, caricature exaggeration, an ornate frame.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#f0e6d2"/><rect x="5" y="5" width="90" height="80" fill="none" stroke="#3b2b1a" stroke-width="1.5"/><rect x="9" y="9" width="82" height="72" fill="none" stroke="#3b2b1a" stroke-width="0.6"/><circle cx="50" cy="42" r="16" fill="none" stroke="#3b2b1a" stroke-width="1.2"/><circle cx="43" cy="38" r="1.3" fill="#3b2b1a"/><circle cx="54" cy="38" r="1.3" fill="#3b2b1a"/><g stroke="#3b2b1a" stroke-width="0.45"><line x1="36" y1="30" x2="43" y2="54"/><line x1="39" y1="28" x2="46" y2="56"/><line x1="42" y1="28" x2="49" y2="58"/></g><line x1="22" y1="91" x2="78" y2="91" stroke="#3b2b1a" stroke-width="0.5"/></svg>
```

---

### Soviet propaganda poster style
**File:** `style-guide/soviet-propaganda-poster.md`
**Tags:** poster | constructivist
**Visual DNA (one line):** Constructivist graphic design — bold flat colour blocks, strong diagonal dynamism, monumental heroic figures.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#c8102e"/><polygon points="60,100 100,100 100,40 78,100" fill="#111"/><g fill="#111"><circle cx="46" cy="40" r="9"/><path d="M38 49 Q36 68 36 100 L58 100 Q58 66 55 50 Q52 45 46 45 Q41 45 38 49 Z"/></g><rect x="8" y="84" width="52" height="11" fill="#f2e8d5" transform="rotate(-6 8 84)"/></svg>
```

---

### British government official announcement style
**File:** `style-guide/british-official-announcement.md`
**Tags:** poster | typographic notice
**Visual DNA (one line):** Formal mid-century Ministry-style notice — typography-led, restrained heraldic palette, thin double-rule dividers.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#f2ead9"/><path d="M50 20 L62 26 L62 42 Q50 54 50 54 Q50 54 38 42 L38 26 Z" fill="none" stroke="#012169" stroke-width="2"/><line x1="20" y1="66" x2="80" y2="66" stroke="#012169" stroke-width="1"/><line x1="20" y1="69" x2="80" y2="69" stroke="#012169" stroke-width="1"/><rect x="20" y="76" width="60" height="4" fill="#c8102e"/><rect x="20" y="84" width="40" height="3" fill="#012169"/></svg>
```

---

### Nigel Holmes explanation graphics (classic Time magazine informational illustration)
**File:** `style-guide/nigel-holmes-explanation-graphics.md`
**Tags:** data-viz | technical
**Visual DNA (one line):** Friendly mechanism-revealing "how it works" diagrams — pseudo-3D objects, bold sequence arrows, numbered steps.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#faf6ee"/><rect x="20" y="35" width="30" height="30" fill="#e8973f" stroke="#a85f1a" stroke-width="1.5"/><polygon points="50,35 60,28 60,58 50,65" fill="#c97a2b" stroke="#a85f1a" stroke-width="1.5"/><defs><marker id="ah1" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#1f8a70"/></marker></defs><path d="M55 25 Q75 15 78 40" stroke="#1f8a70" stroke-width="3" fill="none" marker-end="url(#ah1)"/><circle cx="78" cy="45" r="6" fill="#1f8a70"/><text x="75" y="48" font-size="7" fill="#fff" font-family="Helvetica,sans-serif">1</text></svg>
```

---

### Richard Scarry Busytown-style illustration
**File:** `style-guide/richard-scarry-busytown.md`
**Tags:** illustrative | comic
**Visual DNA (one line):** Dense but scannable labeled scenes of everyday activity, tiled into small self-contained, independently legible vignettes.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#bfe3f2"/><rect x="0" y="60" width="100" height="40" fill="#e8d9a8"/><g stroke="#222" stroke-width="2.5" stroke-linejoin="round"><rect x="14" y="45" width="24" height="20" fill="#e8483c"/><polygon points="14,45 26,32 38,45" fill="#c9382d"/><rect x="55" y="55" width="26" height="14" rx="3" fill="#f4c542"/><circle cx="60" cy="71" r="4" fill="#333"/><circle cx="76" cy="71" r="4" fill="#333"/></g><text x="10" y="80" font-size="5" fill="#222" font-family="Helvetica,sans-serif">bakery</text></svg>
```

---

### Hokusai-style instructional drawing / clear ukiyo-e composition
**File:** `style-guide/hokusai-ukiyo-e.md`
**Tags:** illustrative | line-art
**Visual DNA (one line):** Confident controlled contour bounding flat colour fields, stylised flattened forms, strong asymmetric composition.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#f3ead9"/><polygon points="10,60 40,25 55,60" fill="#4a6b8a"/><polygon points="45,65 70,20 90,65" fill="#2c4a68"/><path d="M5 78 Q20 68 35 78 Q50 68 65 78 Q80 68 95 78 L95 95 L5 95 Z" fill="#1f3a54" stroke="#0d2135" stroke-width="1"/><path d="M10 76 Q15 70 20 76 M30 76 Q35 70 40 76 M50 76 Q55 70 60 76 M70 76 Q75 70 80 76" stroke="#f3ead9" stroke-width="1.5" fill="none"/></svg>
```

---

### Isotype / Otto Neurath pictorial statistics
**File:** `style-guide/isotype-otto-neurath.md`
**Tags:** data-viz
**Visual DNA (one line):** Standardised pictograms conveying quantity by repetition of an identical icon, never by resizing one.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#ffffff"/><g fill="#1d6f8c"><circle cx="16" cy="30" r="5"/><rect x="12" y="35" width="8" height="14"/><circle cx="32" cy="30" r="5"/><rect x="28" y="35" width="8" height="14"/><circle cx="48" cy="30" r="5"/><rect x="44" y="35" width="8" height="14"/></g><g fill="#b3401e"><circle cx="16" cy="60" r="5"/><rect x="12" y="65" width="8" height="14"/><circle cx="32" cy="60" r="5"/><rect x="28" y="65" width="8" height="14"/></g><line x1="8" y1="82" x2="92" y2="82" stroke="#111" stroke-width="0.75"/></svg>
```

---

### Classic National Geographic / scientific cutaway-exploded diagram
**File:** `style-guide/national-geographic-cutaway.md`
**Tags:** data-viz | technical
**Visual DNA (one line):** A richer, rendered cousin of the Tufte cutaway — ghosted-transparency reveals, colour-coded systems, dense numbered annotation.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#eef2f1"/><ellipse cx="50" cy="52" rx="38" ry="34" fill="#cfd8d6" opacity="0.4" stroke="#556" stroke-width="1"/><path d="M30 60 Q50 30 70 60 Q60 75 50 75 Q40 75 30 60" fill="#c94e3a"/><circle cx="50" cy="50" r="10" fill="#2f7a5a"/><circle cx="35" cy="40" r="4" fill="#c8102e"/><text x="40" y="41" font-size="6" fill="#222" font-family="Helvetica,sans-serif">1</text><line x1="35" y1="40" x2="20" y2="30" stroke="#222" stroke-width="0.5"/></svg>
```

---

### Saul Steinberg conceptual line drawing
**File:** `style-guide/saul-steinberg-line-drawing.md`
**Tags:** line-art | illustrative
**Visual DNA (one line):** Radically economical single-weight pen line, witty conceptual juxtaposition, mostly blank page.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#ffffff"/><path d="M15 70 Q30 20 55 55 Q65 70 85 30" stroke="#111" stroke-width="1.2" fill="none"/><circle cx="78" cy="75" r="9" fill="none" stroke="#111" stroke-width="1" stroke-dasharray="2 1.5"/><text x="72" y="78" font-size="6" fill="#111" font-family="Georgia,serif">ok</text></svg>
```

---

### WWII Allied / Empire Marketing Board poster style
**File:** `style-guide/wwii-emb-poster.md`
**Tags:** poster | illustrated
**Visual DNA (one line):** A calmer, more illustrative extension of the British official mode — large flat colour fields, a structural slogan band.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#00247d"/><rect x="0" y="0" width="100" height="55" fill="#f2ead9"/><path d="M25 50 Q50 15 75 50 Z" fill="#c8102e"/><rect x="0" y="80" width="100" height="20" fill="#c8102e"/><rect x="10" y="86" width="80" height="8" fill="#f2ead9"/></svg>
```

---

### Miyazaki-style concept sketch (observational clarity register)
**File:** `style-guide/miyazaki-concept-sketch.md`
**Tags:** illustrative | line-art
**Visual DNA (one line):** The preparatory/concept-art register — visible construction scaffolding, selective partial colour, mechanism-revealing annotation.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#f2efe6"/><g stroke="#999" stroke-width="0.4" fill="none"><line x1="20" y1="20" x2="80" y2="20"/><line x1="20" y1="20" x2="20" y2="80"/><line x1="20" y1="50" x2="80" y2="50"/><line x1="50" y1="20" x2="50" y2="80"/></g><path d="M25 60 Q35 25 55 30 Q75 33 72 65 Q60 78 40 74 Q28 70 25 60" stroke="#2b2b2b" stroke-width="1.3" fill="none"/><path d="M45 40 Q55 35 62 45" stroke="#c9782b" stroke-width="6" opacity="0.35" fill="none"/><path d="M15 85 Q20 88 25 85" stroke="#555" stroke-width="0.5" fill="none"/></svg>
```

---

### Clean modern flat / UI style
**File:** `style-guide/clean-modern-flat-ui.md`
**Tags:** UI | icon
**Visual DNA (one line):** Contemporary product/UI idiom — crisp geometric shapes, 4/8px grid, one accent colour, generous whitespace.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#f7f7f8"/><rect x="15" y="20" width="70" height="60" rx="6" fill="#fff" stroke="#e5e7eb" stroke-width="1.5"/><circle cx="30" cy="40" r="8" fill="#2563eb"/><path d="M26 40 L30 44 L35 36" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><rect x="20" y="58" width="40" height="5" rx="2.5" fill="#d1d5db"/><rect x="20" y="68" width="28" height="5" rx="2.5" fill="#e5e7eb"/></svg>
```

---

### Isometric technical diagram style
**File:** `style-guide/isometric-technical-diagram.md`
**Tags:** technical | data-viz
**Visual DNA (one line):** Clean 30° isometric projection, flat-shaded faces in three tones, no perspective convergence.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#fbfbfa"/><polygon points="50,18 78,34 50,50 22,34" fill="#bcd6ee" stroke="#2f4a66" stroke-width="1"/><polygon points="22,34 50,50 50,78 22,62" fill="#7ba3d1" stroke="#2f4a66" stroke-width="1"/><polygon points="50,50 78,34 78,62 50,78" fill="#4f79a8" stroke="#2f4a66" stroke-width="1"/></svg>
```

---

### Blueprint / schematic style
**File:** `style-guide/blueprint-schematic.md`
**Tags:** technical
**Visual DNA (one line):** Engineering blueprint — deep-blue ground, crisp white/cyan linework, dimension lines, section hatching.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#0b3d91"/><rect x="20" y="20" width="50" height="40" fill="none" stroke="#e8f4ff" stroke-width="1.5"/><rect x="30" y="30" width="50" height="40" fill="none" stroke="#e8f4ff" stroke-width="1"/><line x1="16" y1="20" x2="16" y2="60" stroke="#e8f4ff" stroke-width="0.75" stroke-dasharray="2 2"/><line x1="20" y1="72" x2="80" y2="72" stroke="#e8f4ff" stroke-width="0.75"/><text x="30" y="70" font-size="6" fill="#e8f4ff" font-family="Courier New,monospace">40mm</text></svg>
```

---

### Pixel-art style (limited palette)
**File:** `style-guide/pixel-art-limited-palette.md`
**Tags:** illustrative | retro
**Visual DNA (one line):** Crisp retro raster look — a grid of hard-edged square pixels, no anti-aliasing, no gradients.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><rect width="100" height="100" fill="#0f380f"/><rect x="10" y="20" width="10" height="10" fill="#d64550"/><rect x="30" y="20" width="10" height="10" fill="#f2a0a0"/><rect x="50" y="20" width="10" height="10" fill="#d64550"/><rect x="0" y="30" width="70" height="10" fill="#d64550"/><rect x="0" y="40" width="70" height="10" fill="#d64550"/><rect x="10" y="50" width="50" height="10" fill="#a31f2b"/><rect x="20" y="60" width="30" height="10" fill="#a31f2b"/><rect x="30" y="70" width="10" height="10" fill="#a31f2b"/></svg>
```

---

### Minimal geometric / logo style
**File:** `style-guide/minimal-geometric-logo.md`
**Tags:** logo | minimal
**Visual DNA (one line):** A single reductionist mark built from a few clean geometric primitives, flat colour, lots of negative space.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#ffffff"/><circle cx="50" cy="50" r="34" fill="#111111"/><circle cx="50" cy="50" r="16" fill="#ffffff"/><circle cx="70" cy="30" r="5" fill="#e53935"/></svg>
```
