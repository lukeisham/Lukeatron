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
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#f4f1e4"/><path d="M18 74 Q34 34 52 52 Q66 66 84 34" stroke="#4a3524" stroke-width="6" fill="none" stroke-linecap="round" opacity="0.98"/><path d="M52 52 Q66 66 84 34" stroke="#4a3524" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M84 34 Q90 30 94 32" stroke="#4a3524" stroke-width="1.4" fill="none" stroke-linecap="round"/><path d="M28 66 Q36 60 40 50 M34 70 Q43 63 47 52 M40 73 Q49 66 53 55" stroke="#4a3524" stroke-width="1.3" fill="none"/><path d="M20 78 Q40 62 60 74 Q78 84 92 70 L92 96 L20 96 Z" fill="#c8623a" opacity="0.15"/><path d="M26 82 Q44 70 62 80 L62 96 L26 96 Z" fill="#c8623a" opacity="0.3"/><path d="M34 88 Q46 82 56 88 L56 96 L34 96 Z" fill="#c8623a" opacity="0.5"/></svg>
```

---

### Far Side style comic
**File:** `style-guide/far-side-comic.md`
**Tags:** comic
**Visual DNA (one line):** Single dry-absurdist panel, uniform bold outline, tonal shading built entirely from hatching, no colour.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#ffffff"/><ellipse cx="50" cy="30" rx="11" ry="10" fill="none" stroke="#111" stroke-width="1.8"/><circle cx="46" cy="29" r="1.6" fill="#111"/><circle cx="54" cy="29" r="1.6" fill="#111"/><path d="M45 36 Q50 39 55 36" stroke="#111" stroke-width="1.8" fill="none"/><path d="M50 40 Q38 44 34 62 Q31 78 34 88 L66 88 Q69 78 66 62 Q62 44 50 40 Z" fill="none" stroke="#111" stroke-width="1.8"/><path d="M36 56 Q28 66 30 78" stroke="#111" stroke-width="1.8" fill="none"/><path d="M64 56 Q72 66 70 78" stroke="#111" stroke-width="1.8" fill="none"/><circle cx="84" cy="18" r="4" fill="none" stroke="#111" stroke-width="1.8"/><line x1="84" y1="22" x2="84" y2="30" stroke="#111" stroke-width="1.8"/></svg>
```

---

### Tufte style object designs
**File:** `style-guide/tufte-object-designs.md`
**Tags:** data-viz | technical
**Visual DNA (one line):** Data-ink-minimalist exploded/annotated object diagram — hairline leaders, restrained ink, generous white space.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#fcfbf8"/><rect x="30" y="20" width="34" height="62" fill="#1a1a1a" opacity="0.10"/><line x1="47" y1="14" x2="47" y2="90" stroke="#1a1a1a" stroke-width="0.4" stroke-dasharray="3 2"/><rect x="33" y="18" width="28" height="12" fill="none" stroke="#1a1a1a" stroke-width="0.9"/><rect x="33" y="40" width="28" height="12" fill="none" stroke="#c8102e" stroke-width="1.1"/><rect x="33" y="62" width="28" height="12" fill="none" stroke="#1a1a1a" stroke-width="0.9"/><line x1="61" y1="24" x2="80" y2="24" stroke="#1a1a1a" stroke-width="0.5"/><circle cx="80" cy="24" r="1.1" fill="#1a1a1a"/><line x1="61" y1="46" x2="80" y2="46" stroke="#1a1a1a" stroke-width="0.5"/><circle cx="80" cy="46" r="1.1" fill="#1a1a1a"/><text x="83" y="26" font-size="5" fill="#1a1a1a" font-family="Helvetica,sans-serif">cap</text><text x="83" y="48" font-size="5" fill="#1a1a1a" font-family="Helvetica,sans-serif">seal</text></svg>
```

---

### Tufte style location cutaway designs
**File:** `style-guide/tufte-location-cutaway.md`
**Tags:** data-viz | technical
**Visual DNA (one line):** The same minimal-ink ethos applied to a cross-section/cutaway of a place, strata labelled with hairline leaders.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="tlh" width="4" height="4" patternUnits="userSpaceOnUse"><path d="M0 4 L4 0" stroke="#1a1a1a" stroke-width="0.5"/></pattern><pattern id="tls" width="4" height="4" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="0.5" fill="#1a1a1a"/></pattern></defs><rect width="100" height="100" fill="#fcfbf8"/><rect x="14" y="22" width="60" height="12" fill="none" stroke="#1a1a1a" stroke-width="0.4"/><rect x="14" y="34" width="60" height="14" fill="url(#tls)" stroke="#1a1a1a" stroke-width="0.4"/><rect x="14" y="48" width="60" height="16" fill="url(#tlh)" stroke="#1a1a1a" stroke-width="0.4"/><line x1="14" y1="22" x2="14" y2="64" stroke="#1a1a1a" stroke-width="2"/><line x1="14" y1="64" x2="74" y2="64" stroke="#1a1a1a" stroke-width="2"/><line x1="14" y1="80" x2="46" y2="80" stroke="#1a1a1a" stroke-width="0.8"/><line x1="14" y1="77" x2="14" y2="83" stroke="#1a1a1a" stroke-width="0.8"/><line x1="46" y1="77" x2="46" y2="83" stroke="#1a1a1a" stroke-width="0.8"/><text x="50" y="82" font-size="5" fill="#1a1a1a" font-family="Helvetica,sans-serif">10 m</text></svg>
```

---

### Dorling Kindersley style landscapes
**File:** `style-guide/dorling-kindersley-landscapes.md`
**Tags:** illustrative | technical
**Visual DNA (one line):** DK Eyewitness-guide illustration — crisp flat-shaded vector art with a soft contact shadow and dot-and-leader captions.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="dkg" cx="0.35" cy="0.3"><stop offset="0" stop-color="#9ed189"/><stop offset="1" stop-color="#3f7a34"/></radialGradient><radialGradient id="dkp" cx="0.35" cy="0.3"><stop offset="0" stop-color="#e5b06a"/><stop offset="1" stop-color="#9c6122"/></radialGradient></defs><rect width="100" height="100" fill="#ffffff"/><path d="M30 62 Q26 40 40 32 Q52 26 62 34 Q74 42 68 62 Q50 70 30 62 Z" fill="url(#dkg)" stroke="#3f7a34" stroke-width="0.6"/><rect x="45" y="60" width="8" height="20" fill="url(#dkp)" stroke="#9c6122" stroke-width="0.6"/><circle cx="62" cy="40" r="1.4" fill="#222"/><line x1="62" y1="40" x2="86" y2="30" stroke="#222" stroke-width="0.4"/><text x="70" y="27" font-size="5" fill="#222" font-family="Helvetica,sans-serif">crown</text><circle cx="49" cy="70" r="1.4" fill="#222"/><line x1="49" y1="70" x2="20" y2="84" stroke="#222" stroke-width="0.4"/><text x="10" y="90" font-size="5" fill="#222" font-family="Helvetica,sans-serif">trunk</text></svg>
```

---

### Ligne claire style comic
**File:** `style-guide/ligne-claire-comic.md`
**Tags:** comic | illustrative
**Visual DNA (one line):** Hergé-lineage "clear line" — every outline the same uniform weight, flat evenly saturated colour, zero shading.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#bfe1f0"/><rect x="0" y="58" width="100" height="42" fill="#dcc188"/><g stroke="#111" stroke-width="2.4" fill="none"><path d="M0 58 L100 58"/><path d="M8 100 L40 58 M40 100 L56 58 M78 100 L68 58"/></g><rect x="14" y="30" width="34" height="28" fill="#d9503c" stroke="#111" stroke-width="2.4"/><rect x="14" y="30" width="12" height="28" fill="#e8836f" stroke="none"/><polygon points="10,30 31,14 52,30" fill="#8a3b2b" stroke="#111" stroke-width="2.4"/><rect x="62" y="36" width="16" height="22" fill="#4a7fb5" stroke="#111" stroke-width="2.4"/><rect x="62" y="36" width="6" height="22" fill="#7ba7d1" stroke="none"/></svg>
```

---

### Studio Ghibli style anime
**File:** `style-guide/studio-ghibli-anime.md`
**Tags:** illustrative | animation-film
**Visual DNA (one line):** Painterly, atmospheric backgrounds with soft natural light behind simple two-tone cel-shaded characters.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="gsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7e3ac"/><stop offset="1" stop-color="#8fbfe0"/></linearGradient><filter id="gb"><feGaussianBlur stdDeviation="2.6"/></filter><filter id="grim"><feGaussianBlur stdDeviation="1.6"/></filter></defs><rect width="100" height="100" fill="url(#gsky)"/><path d="M0 62 Q26 48 50 58 Q74 50 100 60 L100 78 L0 78 Z" fill="#9fb9a4" filter="url(#gb)" opacity="0.75"/><path d="M0 76 Q30 66 58 74 Q80 80 100 72 L100 100 L0 100 Z" fill="#6a9c5c"/><ellipse cx="52" cy="56" rx="15" ry="16" fill="#f0c98a" filter="url(#grim)"/><path d="M52 40 Q66 44 66 58 Q66 72 52 74 Q38 72 38 58 Q38 44 52 40 Z" fill="#f2dcc0"/><path d="M52 40 Q38 44 38 58 Q38 72 52 74 Q46 60 52 40 Z" fill="#c3a4a0"/><path d="M52 40 Q66 44 66 58 Q66 72 52 74 Q38 72 38 58 Q38 44 52 40 Z" fill="none" stroke="#4a2e1e" stroke-width="1.4"/><circle cx="46" cy="56" r="1.6" fill="#4a2e1e"/><circle cx="58" cy="56" r="1.6" fill="#4a2e1e"/></svg>
```

---

### Classic educational mnemonic aid style (e.g. "An Adventure with a Lion")
**File:** `style-guide/classic-mnemonic-aid.md`
**Tags:** illustrative | comic
**Visual DNA (one line):** Mid-century phonics illustration — a mnemonic letter/symbol visually fused into the subject's own form.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#f2e9d2"/><g transform="translate(3,3)" opacity="0.45"><path d="M28 78 L50 24 L72 78" fill="none" stroke="#b3401e" stroke-width="8" stroke-linejoin="round"/><path d="M38 58 L62 58" stroke="#b3401e" stroke-width="8"/></g><path d="M28 78 L50 24 L72 78" fill="#d99a2b" stroke="#7a4a1e" stroke-width="7.5" stroke-linejoin="round"/><path d="M38 58 L62 58" stroke="#7a4a1e" stroke-width="7.5"/><circle cx="50" cy="34" r="6" fill="#e8c98a" stroke="#7a4a1e" stroke-width="3"/><circle cx="47.5" cy="33" r="1.2" fill="#3a2412"/><circle cx="52.5" cy="33" r="1.2" fill="#3a2412"/><path d="M72 78 Q80 82 84 76" stroke="#7a4a1e" stroke-width="4" fill="none" stroke-linecap="round"/></svg>
```

---

### Punch style cartoons
**File:** `style-guide/punch-cartoons.md`
**Tags:** comic | illustrative
**Visual DNA (one line):** Victorian satirical engraving — dense fine-line hatching builds all tonal value, caricature exaggeration, an ornate frame.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#f2e8d2"/><rect x="8" y="6" width="84" height="66" fill="none" stroke="#3b2b1a" stroke-width="0.8"/><ellipse cx="46" cy="34" rx="15" ry="17" fill="none" stroke="#3b2b1a" stroke-width="1"/><g stroke="#3b2b1a" fill="none" stroke-width="0.4"><path d="M35 26 Q46 31 57 26"/><path d="M34 31 Q46 36 58 31"/><path d="M34 36 Q46 41 58 36"/><path d="M35 41 Q46 46 57 41"/></g><g stroke="#3b2b1a" fill="none" stroke-width="0.4"><path d="M36 45 Q46 50 56 45"/><path d="M38 48 Q46 52 54 48"/></g><circle cx="41" cy="30" r="1.1" fill="#3b2b1a"/><circle cx="51" cy="30" r="1.1" fill="#3b2b1a"/><path d="M46 24 Q52 16 60 20" stroke="#3b2b1a" stroke-width="1" fill="none"/><text x="14" y="82" font-size="5.4" fill="#3b2b1a" font-family="Georgia,serif">THE VICAR.</text><text x="14" y="90" font-size="5.4" fill="#3b2b1a" font-family="Georgia,serif">"Quite so, quite so."</text></svg>
```

---

### Soviet propaganda poster style
**File:** `style-guide/soviet-propaganda-poster.md`
**Tags:** poster | constructivist
**Visual DNA (one line):** Constructivist graphic design — bold flat colour blocks, strong diagonal dynamism, monumental heroic figures.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#e8dcc0"/><polygon points="0,74 62,18 100,40 100,100 0,100" fill="#c8102e"/><polygon points="0,88 46,50 74,66 42,100 0,100" fill="#111111"/><g transform="rotate(-38 30 46)"><rect x="6" y="38" width="46" height="9" fill="#111111"/><rect x="6" y="49" width="30" height="5" fill="#111111"/></g><polygon points="70,20 88,10 96,26 78,36" fill="#111111"/></svg>
```

---

### British government official announcement style
**File:** `style-guide/british-official-announcement.md`
**Tags:** poster | typographic notice
**Visual DNA (one line):** Formal mid-century Ministry-style notice — typography-led, restrained heraldic palette, thin double-rule dividers.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#f4ecdb"/><path d="M50 12 L59 17 L59 29 Q50 38 50 38 Q50 38 41 29 L41 17 Z" fill="none" stroke="#012169" stroke-width="1.4"/><line x1="18" y1="44" x2="82" y2="44" stroke="#012169" stroke-width="0.9"/><line x1="18" y1="46.5" x2="82" y2="46.5" stroke="#012169" stroke-width="0.9"/><rect x="24" y="52" width="52" height="5" fill="#012169"/><rect x="32" y="61" width="36" height="3" fill="#4a5f86"/><rect x="28" y="67" width="44" height="3" fill="#4a5f86"/><line x1="18" y1="76" x2="82" y2="76" stroke="#012169" stroke-width="0.9"/><line x1="18" y1="78.5" x2="82" y2="78.5" stroke="#012169" stroke-width="0.9"/><rect x="38" y="84" width="24" height="2.5" fill="#4a5f86"/></svg>
```

---

### Nigel Holmes explanation graphics (classic Time magazine informational illustration)
**File:** `style-guide/nigel-holmes-explanation-graphics.md`
**Tags:** data-viz | technical
**Visual DNA (one line):** Friendly mechanism-revealing "how it works" diagrams — pseudo-3D objects, bold sequence arrows, numbered steps.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs><marker id="nhA" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" fill="#1f8a70"/></marker></defs><rect width="100" height="100" fill="#faf6ee"/><rect x="16" y="44" width="34" height="34" fill="#e8973f"/><polygon points="50,44 64,34 64,68 50,78" fill="#b8701f"/><polygon points="16,44 30,34 64,34 50,44" fill="#f2b96e"/><path d="M28 30 Q54 8 82 30" stroke="#1f8a70" stroke-width="7" fill="none" marker-end="url(#nhA)" stroke-linecap="round"/><circle cx="26" cy="60" r="6.5" fill="#1f8a70"/><text x="23.4" y="62.6" font-size="8" fill="#ffffff" font-family="Helvetica,sans-serif">1</text><text x="56" y="90" font-size="6" fill="#333" font-family="Helvetica,sans-serif">intake</text></svg>
```

---

### Richard Scarry Busytown-style illustration
**File:** `style-guide/richard-scarry-busytown.md`
**Tags:** illustrative | comic
**Visual DNA (one line):** Dense but scannable labeled scenes of everyday activity, tiled into small self-contained, independently legible vignettes.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#bfe3f2"/><rect x="0" y="46" width="100" height="54" fill="#e8d9a8"/><g stroke="#222" stroke-width="3" stroke-linejoin="round"><rect x="6" y="26" width="22" height="20" fill="#e8483c"/><rect x="12" y="34" width="7" height="12" fill="#f4c542"/><rect x="62" y="24" width="24" height="22" fill="#7fb06a"/><rect x="68" y="30" width="6" height="6" fill="#fff"/><rect x="12" y="60" width="24" height="12" rx="2" fill="#f4c542"/><circle cx="18" cy="74" r="4" fill="#333"/><circle cx="31" cy="74" r="4" fill="#333"/><circle cx="62" cy="66" r="7" fill="#e8a0b4"/><rect x="58" y="73" width="9" height="12" fill="#4a7fb5"/></g><text x="7" y="52" font-size="4.6" fill="#222" font-family="Helvetica,sans-serif">bakery</text><text x="64" y="52" font-size="4.6" fill="#222" font-family="Helvetica,sans-serif">post office</text><text x="14" y="82" font-size="4.6" fill="#222" font-family="Helvetica,sans-serif">van</text><text x="55" y="92" font-size="4.6" fill="#222" font-family="Helvetica,sans-serif">baker</text></svg>
```

---

### Hokusai-style instructional drawing / clear ukiyo-e composition
**File:** `style-guide/hokusai-ukiyo-e.md`
**Tags:** illustrative | line-art
**Visual DNA (one line):** Confident controlled contour bounding flat colour fields, stylised flattened forms, strong asymmetric composition.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#efe3c8"/><polygon points="30,42 52,16 74,42" fill="#dfe8ee"/><polygon points="30,42 52,16 60,26 44,42" fill="#f7f3e8"/><path d="M30 42 L52 16 L74 42" fill="none" stroke="#1b3a5c" stroke-width="1.2"/><path d="M0 54 Q18 44 34 54 Q52 64 70 52 Q86 42 100 52 L100 66 Q84 58 70 66 Q52 76 34 66 Q18 58 0 68 Z" fill="#1d4e79"/><path d="M0 70 Q22 60 44 72 Q66 84 100 70 L100 100 L0 100 Z" fill="#14375c"/><path d="M-4 88 Q10 60 22 44 Q28 36 34 34" fill="none" stroke="#7a2e26" stroke-width="4" stroke-linecap="round"/><path d="M34 34 Q40 33 46 36" fill="none" stroke="#7a2e26" stroke-width="1.6" stroke-linecap="round"/><circle cx="80" cy="24" r="6" fill="#c9483a"/></svg>
```

---

### Isotype / Otto Neurath pictorial statistics
**File:** `style-guide/isotype-otto-neurath.md`
**Tags:** data-viz
**Visual DNA (one line):** Standardised pictograms conveying quantity by repetition of an identical icon, never by resizing one.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#ffffff"/><g fill="#1d6f8c"><g><circle cx="14" cy="26" r="4"/><rect x="10.5" y="31" width="7" height="12"/></g><g transform="translate(16,0)"><circle cx="14" cy="26" r="4"/><rect x="10.5" y="31" width="7" height="12"/></g><g transform="translate(32,0)"><circle cx="14" cy="26" r="4"/><rect x="10.5" y="31" width="7" height="12"/></g><g transform="translate(48,0)"><circle cx="14" cy="26" r="4"/><rect x="10.5" y="31" width="7" height="12"/></g></g><g fill="#b3401e"><g><circle cx="14" cy="56" r="4"/><rect x="10.5" y="61" width="7" height="12"/></g><g transform="translate(16,0)"><circle cx="14" cy="56" r="4"/><rect x="10.5" y="61" width="7" height="12"/></g></g><line x1="8" y1="76" x2="92" y2="76" stroke="#111" stroke-width="0.8"/><g fill="#555"><circle cx="12" cy="86" r="2.6"/><rect x="9.8" y="89" width="4.4" height="7"/></g><text x="20" y="94" font-size="5.6" fill="#111" font-family="Helvetica,sans-serif">= 10 000</text></svg>
```

---

### Classic National Geographic / scientific cutaway-exploded diagram
**File:** `style-guide/national-geographic-cutaway.md`
**Tags:** data-viz | technical
**Visual DNA (one line):** A richer, rendered cousin of the Tufte cutaway — ghosted-transparency reveals, colour-coded systems, dense numbered annotation.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#eef2f1"/><ellipse cx="50" cy="52" rx="40" ry="30" fill="#b9c6c4" opacity="0.30" stroke="#5a6a68" stroke-width="0.9"/><path d="M22 56 Q36 34 50 44 Q64 34 78 56 Q64 72 50 72 Q36 72 22 56 Z" fill="#c94e3a"/><rect x="40" y="46" width="22" height="9" rx="2" fill="#3498db"/><circle cx="50" cy="62" r="6" fill="#16a085"/><circle cx="30" cy="40" r="4" fill="#fff" stroke="#333" stroke-width="0.6"/><text x="28.2" y="42" font-size="5" fill="#222" font-family="Helvetica,sans-serif">1</text><line x1="30" y1="44" x2="22" y2="60" stroke="#333" stroke-width="0.5"/><circle cx="72" cy="34" r="4" fill="#fff" stroke="#333" stroke-width="0.6"/><text x="70.2" y="36" font-size="5" fill="#222" font-family="Helvetica,sans-serif">2</text><line x1="72" y1="38" x2="64" y2="50" stroke="#333" stroke-width="0.5"/><g fill="#333"><circle cx="88" cy="76" r="2"/><rect x="86.6" y="79" width="2.8" height="7"/></g></svg>
```

---

### Saul Steinberg conceptual line drawing
**File:** `style-guide/saul-steinberg-line-drawing.md`
**Tags:** line-art | illustrative
**Visual DNA (one line):** Radically economical single-weight pen line, witty conceptual juxtaposition, mostly blank page.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#ffffff"/><path d="M12 76 Q30 74 34 56 Q38 34 56 34 Q72 34 74 52" fill="none" stroke="#111" stroke-width="1.6" stroke-linecap="round"/><path d="M74 52 L74 60 L82 60 L82 52 Z" fill="none" stroke="#111" stroke-width="1.6"/><path d="M82 56 Q90 56 90 44 Q90 34 82 34" fill="none" stroke="#111" stroke-width="1.6" stroke-linecap="round"/><path d="M12 76 L12 84" stroke="#111" stroke-width="1.6" stroke-linecap="round"/><path d="M56 34 Q56 24 64 22" fill="none" stroke="#111" stroke-width="1.6" stroke-linecap="round"/></svg>
```

---

### WWII Allied / Empire Marketing Board poster style
**File:** `style-guide/wwii-emb-poster.md`
**Tags:** poster | illustrated
**Visual DNA (one line):** A calmer, more illustrative extension of the British official mode — large flat colour fields, a structural slogan band.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#e8dcc4"/><rect x="0" y="0" width="100" height="16" fill="#c8102e"/><rect x="8" y="5" width="84" height="6" fill="#f2ead9"/><rect x="0" y="62" width="100" height="38" fill="#3f6b3a"/><path d="M0 62 Q26 52 52 60 Q76 66 100 58 L100 62 Z" fill="#4e8046"/><polygon points="20,62 34,28 48,62" fill="#8a6a3a"/><polygon points="42,62 58,20 74,62" fill="#a88a52"/><g fill="#00247d"><circle cx="66" cy="44" r="6"/><path d="M60 51 Q58 62 58 62 L74 62 Q74 52 72 51 Q69 47 66 47 Q63 47 60 51 Z"/></g><path d="M60 51 Q58 62 58 62 L66 62 Q64 54 60 51 Z" fill="#001a5c"/></svg>
```

---

### Miyazaki-style concept sketch (observational clarity register)
**File:** `style-guide/miyazaki-concept-sketch.md`
**Tags:** illustrative | line-art
**Visual DNA (one line):** The preparatory/concept-art register — visible construction scaffolding, selective partial colour, mechanism-revealing annotation.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#f4f1e7"/><g stroke="#a9a49a" stroke-width="0.35" fill="none"><line x1="18" y1="18" x2="82" y2="18"/><line x1="18" y1="18" x2="18" y2="84"/><line x1="18" y1="52" x2="82" y2="52"/><line x1="50" y1="18" x2="50" y2="84"/><ellipse cx="50" cy="50" rx="26" ry="22"/></g><g stroke="#2b2b2b" fill="none" stroke-linecap="round"><path d="M26 60 Q34 26 54 30 Q74 34 71 64 Q60 78 40 74 Q28 70 26 60" stroke-width="1.2"/><path d="M28 58 Q36 28 55 32 Q73 37 70 62" stroke-width="0.6" opacity="0.65"/><path d="M25 62 Q33 25 53 29" stroke-width="0.5" opacity="0.45"/></g><path d="M44 42 Q54 37 62 46" stroke="#c9782b" stroke-width="5" opacity="0.3" fill="none" stroke-linecap="round"/><text x="66" y="88" font-size="5" fill="#6b6b6b" font-family="Georgia,serif">3/4 view</text></svg>
```

---

### Clean modern flat / UI style
**File:** `style-guide/clean-modern-flat-ui.md`
**Tags:** UI | icon
**Visual DNA (one line):** Contemporary product/UI idiom — crisp geometric shapes, 4/8px grid, one accent colour, generous whitespace.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#f5f6f7"/><rect x="12" y="16" width="76" height="68" rx="7" fill="#ffffff" stroke="#e3e5e8" stroke-width="1.2"/><rect x="12" y="16" width="76" height="16" rx="7" fill="#ffffff" stroke="none"/><line x1="12" y1="32" x2="88" y2="32" stroke="#e3e5e8" stroke-width="1.2"/><circle cx="26" cy="48" r="8" fill="#2563eb"/><path d="M22 48 L25.5 51.5 L31 44" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><rect x="40" y="43" width="34" height="4.5" rx="2.2" fill="#c9cdd3"/><rect x="40" y="51" width="22" height="4.5" rx="2.2" fill="#e3e5e8"/><rect x="20" y="64" width="30" height="11" rx="5.5" fill="#2563eb"/><rect x="55" y="64" width="26" height="11" rx="5.5" fill="#ffffff" stroke="#c9cdd3" stroke-width="1.2"/></svg>
```

---

### Isometric technical diagram style
**File:** `style-guide/isometric-technical-diagram.md`
**Tags:** technical | data-viz
**Visual DNA (one line):** Clean 30° isometric projection, flat-shaded faces in three tones, no perspective convergence.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#fbfbfa"/><polygon points="50,64 76,49 76,73 50,88" fill="#4f79a8" stroke="#2f4a66" stroke-width="0.9"/><polygon points="24,49 50,64 50,88 24,73" fill="#7ba3d1" stroke="#2f4a66" stroke-width="0.9"/><polygon points="50,34 76,49 50,64 24,49" fill="#bcd6ee" stroke="#2f4a66" stroke-width="0.9"/><polygon points="50,12 68,22 50,32 32,22" fill="#dce9f6" stroke="#2f4a66" stroke-width="0.9"/><line x1="50" y1="32" x2="50" y2="34" stroke="#2f4a66" stroke-width="0.6" stroke-dasharray="2 1.5"/><line x1="80" y1="47" x2="88" y2="42" stroke="#2f4a66" stroke-width="0.5"/><text x="80" y="40" font-size="5" fill="#2f4a66" font-family="Helvetica,sans-serif">lid</text></svg>
```

---

### Blueprint / schematic style
**File:** `style-guide/blueprint-schematic.md`
**Tags:** technical
**Visual DNA (one line):** Engineering blueprint — deep-blue ground, crisp white/cyan linework, dimension lines, section hatching.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#0b3d91"/><g stroke="#4a72b8" stroke-width="0.3"><line x1="0" y1="20" x2="100" y2="20"/><line x1="0" y1="40" x2="100" y2="40"/><line x1="0" y1="60" x2="100" y2="60"/><line x1="0" y1="80" x2="100" y2="80"/><line x1="20" y1="0" x2="20" y2="100"/><line x1="40" y1="0" x2="40" y2="100"/><line x1="60" y1="0" x2="60" y2="100"/><line x1="80" y1="0" x2="80" y2="100"/></g><rect x="24" y="26" width="46" height="34" fill="none" stroke="#e8f4ff" stroke-width="1.6"/><circle cx="47" cy="43" r="9" fill="none" stroke="#e8f4ff" stroke-width="1"/><line x1="47" y1="20" x2="47" y2="66" stroke="#9fc4e8" stroke-width="0.4" stroke-dasharray="4 2 1 2"/><line x1="24" y1="72" x2="70" y2="72" stroke="#e8f4ff" stroke-width="0.5"/><line x1="24" y1="69" x2="24" y2="75" stroke="#e8f4ff" stroke-width="0.5"/><line x1="70" y1="69" x2="70" y2="75" stroke="#e8f4ff" stroke-width="0.5"/><text x="34" y="82" font-size="5.4" fill="#e8f4ff" font-family="Courier New,monospace">46 mm</text></svg>
```

---

### Pixel-art style (limited palette)
**File:** `style-guide/pixel-art-limited-palette.md`
**Tags:** illustrative | retro
**Visual DNA (one line):** Crisp retro raster look — a grid of hard-edged square pixels, no anti-aliasing, no gradients.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><rect width="100" height="100" fill="#1b2a3a"/><g fill="#e8b04b"><rect x="40" y="20" width="20" height="10"/><rect x="30" y="30" width="40" height="10"/></g><g fill="#c8102e"><rect x="30" y="40" width="40" height="10"/><rect x="20" y="50" width="60" height="10"/></g><g fill="#8a1220"><rect x="20" y="60" width="10" height="10"/><rect x="40" y="60" width="10" height="10"/><rect x="60" y="60" width="10" height="10"/><rect x="30" y="70" width="10" height="10"/><rect x="50" y="70" width="10" height="10"/></g><g fill="#e8b04b"><rect x="40" y="30" width="10" height="10"/></g><rect x="30" y="20" width="10" height="10" fill="#f2d79a"/></svg>
```

---

### Minimal geometric / logo style
**File:** `style-guide/minimal-geometric-logo.md`
**Tags:** logo | minimal
**Visual DNA (one line):** A single reductionist mark built from a few clean geometric primitives, flat colour, lots of negative space.
**Thumbnail (SVG):**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#ffffff"/><path d="M50 18 A32 32 0 0 1 50 82 Z" fill="#111111"/><path d="M50 18 A32 32 0 0 0 50 82 Z" fill="none" stroke="#111111" stroke-width="4"/></svg>
```
