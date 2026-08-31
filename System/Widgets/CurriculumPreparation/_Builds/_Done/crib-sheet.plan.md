# crib-sheet — Execution Plan

**Build:** crib-sheet (Wave 4, prerequisite: bigidea-list, image-paste, document-shell, local-store, style-guide)  
**Status:** Ready for implementation  
**Date:** 2026-08-29

---

## 1. Files

Exact paths under `_template/`:

| Path | Purpose | Owned by this build |
|------|---------|---|
| `app/js/crib-sheet.js` | Module: generate sections from big-idea list, render sheet (1–2pp A4), edit in-place (text, images, size, half), orientation toggle, page-cap flag | Yes |
| `app/css/crib-sheet.css` | Two-half card grid layout, section resizing (small/medium/large), markdown formatting (bold, italic, bullets), page-break rules, print | Yes |
| `tests/test_crib-sheet.js` | Smoke: generate, verify one section per big idea, edit section, re-generate (no-clobber), render 2pp, flag overflow, test markdown parsing | Yes |

**Consumed (not owned):**
- `app/js/bigidea-list.js` (wave 3, not yet specced) — read big-idea list, topology (parent/child), domain glyphs
- `app/js/document-shell.js` — page model (A4 portrait/landscape), render loop, image primitive, Tier constants
- `app/js/image-paste.js` (wave 2, not yet specced) — ImageRef model, images/ manifest
- `app/js/local-store.js` — read/write unit.json via `store.loadUnit()` / `store.saveUnit()`
- `app/css/variables.css` — colour, spacing, typography tokens (including `--ink3` for placeholder muted text)
- `app/js/traceability.js` (wave 5) — render curriculum codes in citations (plain text in print)

---

## 2. Steps

### Phase 1: Schema & Data Model

- [ ] Verify cribSheet schema per datamodel: `{ id, title, orientation, sections[], pageCount }`
- [ ] Each section: `{ bigIdeaId, half, text, imageRefs[], size }`
- [ ] Enum half: `"upper"` or `"lower"` (required, never null)
- [ ] Enum size: `"small"` | `"medium"` | `"large"` (default unset = "medium")
- [ ] Orientation: `"portrait"` | `"landscape"` (stored on sheet, defaulting to portrait)
- [ ] Initialize empty cribSheet if not present in loaded unit

### Phase 2: Generation from Big-Idea List

- [ ] Implement `generateCribSheet(bigIdeas, existing)` function:
  - Iterate bigIdeas (top-level + sub-big ideas, two levels max per INV-DM-14)
  - For each, create one section with that big idea's id, seeded `half: "upper"` (AD-CSB-2)
  - Seed empty `text`, no images, `size: unset` (defaults to "medium")
- [ ] **No-clobber rule** (AD-CSB-3/FR-CSB-2): re-generate never overwrites section's `text`, `size`, `half`, or `imageRefs[]`
  - Use `provenance` field (generated | edited | manual) to track: on re-generate, only update if provenance is "generated"
- [ ] Set `provenance: "generated"` on all seeded sections

### Phase 3: Sheet Rendering (SVG, A4, Portrait/Landscape)

- [ ] Implement `renderCribSheet(cribSheet, bigIdeas)` → DocumentShell instance:
  - Create SVG pages (A4 portrait: 210×297mm viewBox; landscape: 297×210mm)
  - Head with subject, title, page number (e.g. "page 1 of 2")
  - Upper-half sections: sorted by their order, headed by curriculum label (from `curriculum.labels.cribSheetHalves.upper` or fallback "Skills")
  - Lower-half sections: sorted by their order, headed by curriculum label (or fallback "Knowledge")
  - **No drawn divider** between halves (AD-30, AD-46) — ordering only
  - Each section: big-idea title, domain glyph(s), markdown-formatted text, images (via document-shell primitive), optional citation
  - Page-break rules: content flows, no explicit `page-break-after` between halves
  - Detect and flag overflow past 2pp: render visible "⚠ Content exceeds 2 pages" message (FR-CSB-1, AC-CSB-2)

### Phase 4: Edit Interface (HTML, In-Place)

- [ ] Implement edit control surface:
  - Tab to each section, or click to select
  - Edit section text: `<textarea>` with bounded markdown preview (bold, italic, bullets)
  - Resize section: dropdown (small / medium / large)
  - Move section between halves: radio button or dropdown (upper / lower)
  - Add/remove images: click to paste, click image to delete (via image-paste integration)
  - Flag overflow on edit: on resize or text edit, re-render preview, show "Content exceeds 2pp" if true
- [ ] Auto-save on every edit through `local-store` (debounced)
- [ ] Set `provenance: "edited"` when text/size/half changed from user edit

### Phase 5: Markdown Parsing (Bounded)

- [ ] Implement minimal markdown parser:
  - `**bold text**` → `<strong>bold text</strong>`
  - `*italic text*` → `<em>italic text</em>`
  - `- bullet item` → `<li>bullet item</li>` (lists only, no nesting)
  - Unsupported syntax (headers `#`, code `` ` ``, links `[text](url)`) renders as literal text
- [ ] **HTML-escape before parsing** (FR-CSB-18): `htmlEscape(text)` → parse → render
  - Example: user types `<img src=x onerror=alert(1)>` → escaped to `&lt;img...&gt;` → parser sees literal text → renders as visible `<img src=x onerror=alert(1)>`
  - Example: user types `**bold with <mark>tag</mark>**` → escaped → literal text printed

### Phase 6: Placeholder Text (Empty Slots)

- [ ] Implement placeholder suggestions per FR-CSB-12/13/14:
  - Upper half (empty section): greyed-out hint text: `"Big ideas · Diagnostic questions · Worked examples or illustrations · Checklist/s"`
  - Lower half (empty section): `"Essential facts · Key vocab · Worked examples or illustrations · Outline/s"`
  - Render in `--ink3` token (muted text, `#9a9891`)
  - Placeholder is **not stored** (FR-CSB-15), only display hint
  - Disappears the moment user types anything (AC-CSB-11)

### Phase 7: Orientation Toggle & Re-Render

- [ ] Implement orientation control: portrait / landscape radio or dropdown
- [ ] On change: store `orientation` on cribSheet, call DocumentShell with new `viewBox`, re-render
- [ ] Immutable per-document rule (AD-DS-4): orientation change forces new document, not in-place toggle

### Phase 8: Domain Glyphs (Read from Big-Idea List)

- [ ] Read glyph set from bigidea-list for each section's big idea (FR-BI-15, FR-CSB-10)
  - Pencil glyph for skill-only
  - Notebook glyph for knowledge-only
  - Both for domain-spanning
  - No glyph for unset domain
- [ ] Render glyphs inline in section title (next to big-idea name)

### Phase 9: Print Citations

- [ ] For each section, render citation: curriculum nodes and lessons covering this big idea (FR-CSB-11)
- [ ] Citation format: human-readable node codes/titles and lesson numbers (never raw ids)
- [ ] Citation renders as plain text in print (no hyperlinks, handled by traceability-links in edit view, wave 5)

### Phase 10: Images & Image-Paste Integration

- [ ] Accept ImageRef objects from image-paste (never base64)
- [ ] Store `imageRefs[]` on each section: `{ imageId, x, y, width, height }`
- [ ] Render via `document-shell.renderImage()` primitive (FR-CS-6, FR-IMG-4)
- [ ] If image file missing: render document-shell's placeholder (not blank, FR-IMG-6)

### Phase 11: Page-Count Computation

- [ ] Implement page-count detector: render to SVG, measure content height, calculate page count (1 or 2)
- [ ] If overflow: render flag, never truncate or silently spill (FR-CSB-1, AC-CSB-2)
- [ ] Page-count string: "page 1 of 1" or "page 1 of 2" (AC-CSB-10)

### Phase 12: Tests & Verification

- [ ] Test: generate from fixture big-idea list, verify one section per idea (AC-CSB-1)
- [ ] Test: fixture with 3pp-worth content flagged, not truncated (AC-CSB-2)
- [ ] Test: edit section text, size, half, images; re-generate; verify edits persist (AC-CSB-3)
- [ ] Test: print portrait and landscape, both A4 correct (AC-CSB-4)
- [ ] Test: fixture with upper/lower sections, no drawn divider, each half headed by label (AC-CSB-5)
- [ ] Test: both-half fixture overflow flag works regardless of which half overflows (AC-CSB-6)
- [ ] Test: resize to large past 2pp, flag surfaces (AC-CSB-7)
- [ ] Test: markdown bold/italic/bullets render; unsupported syntax renders literal (AC-CSB-8/9)
- [ ] Test: page-count string accurate, no dashed line (AC-CSB-10)
- [ ] Test: empty section shows placeholder text, typing replaces it, placeholder not in output (AC-CSB-11/13)
- [ ] Test: text with `<img src=x onerror=...>` renders literal, never as HTML (AC-CSB-14)
- [ ] Test: domain glyphs match big-idea coverage (AC-CSB-15, mirrors AC-CUR-13)
- [ ] Test: removed image shows placeholder (AC-CSB-16)

---

## 3. Interfaces

### Exports (for main app to import and call)

```javascript
// crib-sheet.js
export class CribSheet {
  constructor(unit) { }

  // Generate sections from big-idea list
  generate(bigIdeas) → void (updates unit.cribSheet.sections[], saves via local-store)

  // Render to SVG pages
  render() → DocumentShell instance (calls document-shell page model)

  // Edit methods
  editSectionText(sectionIndex, newText) → void (auto-save, sets provenance: "edited")
  editSectionSize(sectionIndex, size) → void (auto-save, raises flag if overflow)
  editSectionHalf(sectionIndex, half) → void (auto-save)
  addImage(sectionIndex, imageRef) → void (auto-save)
  removeImage(sectionIndex, imageRefId) → void (auto-save)

  // Orientation
  setOrientation(portrait | landscape) → void (triggers re-render via document-shell)

  // Queries
  getPageCount() → 1 | 2
  isOverflow() → boolean
}

export function renderMarkdown(escapedText) → HTMLString (with <strong>, <em>, <ul>/<li>)
```

### Consumes

```javascript
// from bigidea-list (not yet available)
bigIdeas[] // { id, title, parentId, coverage[], domain }
computeGlyphSet(bigIdeaId) → Set["skill" | "knowledge"]

// from document-shell
DocumentShell class
TIERS (tier constants)

// from image-paste
ImageRef shape: { imageId, x, y, width, height }
document-shell.renderImage(blob | null, x, y, w, h, svgElement)

// from local-store
store.loadUnit() → { cribSheet, ... }
store.saveUnit(unit) → Promise

// from traceability (wave 5)
import { renderCode } from './traceability.js'
  // Renders node codes/lesson numbers as plain text in print, clickable in edit (wave 5 retrofit)
```

---

## 4. Verification

One row per acceptance criterion, mapped to concrete runnable check:

| AC-* | Check | How to verify |
|------|-------|---|
| AC-CSB-1 | Generate from fixture, verify one section per big idea + sub-big idea | Fixture with 3 top + 2 sub → generate → verify 5 sections, each with correct bigIdeaId |
| AC-CSB-2 | Fixture with 3pp content is flagged, not truncated | Create fixture, add content to fill >2pp, render → flag visible, page still renders full content (not clipped) |
| AC-CSB-3 | Edit text/size/half after gen, re-gen, edits persist | Gen fixture, edit section text, resize, move half, re-gen → verify those edits intact |
| AC-CSB-4 | Fixture prints both portrait (210×297) and landscape (297×210) | Print both orientations, measure SVG viewBox dimensions |
| AC-CSB-5 | Upper/lower sections render in order, each half headed, no drawn divider | Fixture with sections in both halves, render, verify upper above lower, both headed with labels, no dashed line |
| AC-CSB-6 | Both-half fixture overflow flagged regardless of which half overflows | Fixture: upper 1pp, lower 2pp → flag; fixture: upper 2pp, lower 1pp → flag; neither half should borrow from other |
| AC-CSB-7 | Resize section to large past 2pp triggers overflow flag | Fixture with section at medium, resize to large, verify flag surfaces if overflow |
| AC-CSB-8 | Markdown bold/italic/bullets render correctly; format persists across re-gen | Fixture: section with `**bold**`, `*italic*`, `- bullet`, re-gen → formatting renders and persists |
| AC-CSB-9 | Unsupported markdown renders literal (header, code fence, link) | Fixture: section with `# header`, `` `code` ``, `[link](url)` → all render as visible literal text |
| AC-CSB-10 | Page-count string accurate, no visual break between halves | Render 1pp → "page 1 of 1"; render 2pp → "page 1 of 2"; verify no drawn divider |
| AC-CSB-11 | Empty section shows placeholder; typing replaces it | Empty fixture section, verify placeholder visible in edit, type text, placeholder vanishes |
| AC-CSB-12 | Lower-half placeholder shows FR-CSB-14 suggestions | Empty lower section → verify placeholder text contains "Essential facts", "Key vocab", etc. |
| AC-CSB-13 | Placeholder text never in printed output | Print fixture with empty sections → no placeholder text anywhere in PDF |
| AC-CSB-14 | XSS attempt text renders literal, never executed | Fixture: section text `<img src=x onerror=alert(1)>` → renders as visible literal `<img...>` text in DOM |
| AC-CSB-15 | Domain glyphs match big-idea coverage (skill/knowledge union) | Fixture: big idea covering only skill nodes → pencil; knowledge-only → notebook; both → both glyphs |
| AC-CSB-16 | Removed ImageRef shows placeholder, not blank | Fixture: section with image, delete file, render → placeholder visible |

---

## 5. Risks & Open Points

| Risk | Likelihood | Mitigation | Recommendation |
|------|---|---|---|
| Re-generate accidentally overwrites edited sections | **Medium** | FR-CSB-2, AD-CSB-3: use `provenance` field to track; test AC-CSB-3 exercises full cycle | Implement provenance tracking before generation logic |
| Page-count detector inaccurate (overflow not flagged) | **Medium** | FR-CSB-1, AC-CSB-2: explicitly test 3pp fixture and verify flag; measure rendered SVG height | Use measured SVG height / A4 page height (297mm) to compute page count with tolerance |
| Markdown parser vulnerable to XSS (unsupported tags slip through) | **High** | FR-CSB-18: HTML-escape before parsing; test AC-CSB-14 with `<img onerror>` payload | Pre-escape all user text before markdown parser sees it; test with XSS payloads |
| Placeholder text accidentally saved to unit.json | **Low** | FR-CSB-15: placeholder is view-only hint, never persisted; test AC-CSB-11 verifies not in output | Never write placeholder to section.text; only display on render when text is empty |
| Section height calculation wrong, misaligns pages | **Low** | SVG page model is document-shell's responsibility; this build uses measured dimensions | Rely on document-shell's page geometry; test rendered SVG against A4 spec |
| Domain glyphs not computed (read fails) | **Medium** | FR-CSB-10, AC-CSB-15: glyph set computed by bigidea-list's FR-BI-15; this build only reads | Test with fixture where big-idea-list is available; assert glyph set returns expected value |
| Orientation immutability broken (toggle in place) | **Low** | AD-DS-4: orientation change forces new document via document-shell; test re-render happens | Call DocumentShell with new viewBox on orientation change; verify new SVG instance created |
| Upper/lower half labels not localized (curriculum profile labels missing) | **Low** | AD-29: read from `unit.curriculum.labels.cribSheetHalves.upper/lower`; fallback to generic "Skills"/"Knowledge" | Implement fallback labels in code; test both custom and fallback paths |

**Recommended defaults for unresolved decisions:**
- Default section size: **"medium"** (unset in schema, defaults on render)
- Default half on generation: **"upper"** (AD-CSB-2)
- Fallback half labels: **"Skills" (upper), "Knowledge" (lower)**
- Page-count calculation method: **measure rendered SVG height / 297mm per A4 page, with rounding tolerance**
- Placeholder text reset on user input: **on first character typed** (no special handling needed; empty text = show placeholder)
- Image max height: **80px** (from style-digest mockup CribSheet.dc.html, card image max-height)

