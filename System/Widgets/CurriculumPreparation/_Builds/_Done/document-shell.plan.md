# document-shell — Execution Plan

**Build:** document-shell | **Wave:** 1 (foundation) | **Date:** 2026-08-29

---

## 1. Files

| Path | Purpose |
|------|---------|
| `_template/app/js/document-shell.js` | Page model (N pages, A4 portrait/landscape), render loop, tier constants export, image primitive, print CSS injection (SR-1, FR-DS-1…11) |
| `_template/app/css/document-shell.css` | Page geometry (@page rules for A4 with margins, both orientations), print colour-adjust, base SVG/typography rules (FR-DS-3, FR-DS-11) |
| `_template/tests/test_document-shell.js` | Smoke tests: page model instantiation, render loop, tier constants present, offline functionality (TEST-2, TEST-4) |

---

## 2. Steps

- [ ] Create `document-shell.js`:
  - [ ] Export tier constants as the single definition in the codebase:
    ```javascript
    export const TIERS = {
      pass: { line: "#1F6B41", tint: "#E4F4E9", ink: "#14502F" },
      intermediate: { line: "#185FA5", tint: "#E6F1FB", ink: "#0C447C" },
      advanced: { line: "#9A4E12", tint: "#FCEEE2", ink: "#703508" }
    };
    ```
  - [ ] Define page geometry constants:
    ```javascript
    const PAGE_GEOMETRY = {
      portrait: { viewBox: "0 0 210 297", width: 210, height: 297 }, // mm
      landscape: { viewBox: "0 0 297 210", width: 297, height: 210 }  // mm
    };
    ```
  - [ ] Define `DocumentShell` class:
    - [ ] Constructor: `constructor(data, renderFn, orientation)` where:
      - `data` — plain object with `{ pages: [ { orientation, content: {...} } ] }`
      - `renderFn` — function `(dataObject, svgElement) → void`
      - `orientation` — `"portrait"` or `"landscape"` (immutable, FR-DS-1a, AD-DS-4)
    - [ ] Method `setData(newData)` — update `this.data`, call `render()` (debounced, ~500ms like local-store, or sync for now)
    - [ ] Method `render()` — for each page in `this.data.pages`:
      - [ ] Create new `<svg>` element with correct `viewBox` and dimensions
      - [ ] Call `renderFn(pageData, svgElement)`
      - [ ] Append to document body (or replace existing SVG siblings)
    - [ ] Method `exportSVG()` → serialized SVG source (hand-readable, named groups)
    - [ ] Method `renderImage(imageBlob, x, y, width, height, svgElement)` — draws image into SVG:
      - [ ] If blob is null/missing, render visible placeholder (light grey box with dashed border, "Image not loaded")
      - [ ] If blob exists, create `<image>` element, set href to object URL
      - [ ] Use `<g>` with `clip-path` for bounded rendering (FR-DS-9, FR-IMG-6)
  - [ ] Export constants and class (no default export; named exports only)
  - [ ] Ensure vanilla JS only: no imports outside ES modules, no framework
  - [ ] Ensure offline: no external fetch, no CDN reference anywhere (FR-DS-4)
- [ ] Create `document-shell.css`:
  - [ ] @page rules for both orientations:
    ```css
    @page {
      size: A4 portrait;  /* or landscape, depending on document.orientation */
      margin: 15mm;       /* exact value from style-guide tokens */
    }
    
    @page :first {
      margin-top: 15mm;   /* no special first-page handling */
    }
    ```
  - [ ] SVG page-break rules:
    ```css
    svg {
      page-break-after: always;
      break-after: page;
      display: block;
    }
    ```
  - [ ] Print colour-adjust (force exact colours):
    ```css
    body {
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }
    ```
  - [ ] Base SVG styling (no hardcoded colours; reference tokens via var()):
    ```css
    svg {
      font-family: var(--font-system);
      font-size: var(--font-size-base);
      color: var(--color-text-primary);
    }
    ```
  - [ ] Image placeholder styling:
    ```css
    .image-placeholder {
      fill: var(--color-bg-light);
      stroke: var(--color-border-dashed);
      stroke-dasharray: 5,5;
    }
    ```
  - [ ] Under 150 lines (SR-1); if grows, split by concern
- [ ] Create `tests/test_document-shell.js`:
  - [ ] Test DocumentShell class instantiation: can construct with data, renderFn, orientation
  - [ ] Test render() produces N `<svg>` elements with correct viewBox for orientation (portrait 210×297, landscape 297×210)
  - [ ] Test tier constants present and correct: TIERS.pass.line === "#1F6B41" etc.
  - [ ] Test `setData()` triggers re-render
  - [ ] Test offline: no `fetch()` calls, no network requests (JS-5 — centralize in a separate client module, not here)
  - [ ] Test image primitive: null blob → placeholder; blob → image element
  - [ ] Use `node:test` + `node:assert/strict`, mock DOM elements (hand-built, not jsdom — TEST-8)
- [ ] Verify no curriculum vocabulary anywhere (grep: lesson, student, curriculum, outcome, vcaa, victorian — should return nothing outside comments — INV-DM-10, AC-DS-6)
- [ ] Verify zero third-party dependencies — no `import` statements other than ES module siblings (AC-DS-9)
- [ ] Measure printed output in both orientations:
  - [ ] Create demo document (4 pages portrait), print to PDF, measure page box: should be 210 × 297 mm (AC-DS-1)
  - [ ] Create demo landscape document, print, measure: 297 × 210 mm (AC-DS-1a)
  - [ ] Verify no scale drift, correct margins (15mm on all sides)

---

## 3. Interfaces

**Exports (consumed by all parts: lesson-plan-document, unit-assessment-document, crib-sheet, etc.):**

| Export | Type | Signature |
|--------|------|-----------|
| **TIERS** | Object | `{ pass: { line, tint, ink }, intermediate: {...}, advanced: {...} }` — **single definition in codebase** (FR-DS-6, INV-DM-1) |
| **DocumentShell** | Class | Constructor `(data, renderFn, orientation)` → renders N-page A4 document, both orientations |
| **DocumentShell.setData()** | Method | `(newData) → void` — update and re-render |
| **DocumentShell.render()** | Method | `() → void` — sync render (debounced autosave via local-store, not here) |
| **DocumentShell.exportSVG()** | Method | `() → string` — serialized SVG source, hand-editable |
| **DocumentShell.renderImage()** | Method | `(blob, x, y, width, height, svgElement) → void` — draw image or visible placeholder |

**Data object shape (passed to DocumentShell):**
```javascript
{
  pages: [
    {
      orientation: "portrait" | "landscape",
      content: { /* arbitrary part-specific data */ }
    },
    // ... more pages
  ]
}
```

**Consumes:**
- `variables.css` (imported in `document-shell.css` for colour tokens)
- `bundle-template`'s folder structure (CSS and JS folders exist)
- No server, no images/ manifest, no image blob sources (handled by caller)

---

## 4. Verification

| AC | Check | Proof |
|----|-------|-------|
| **AC-DS-1** | 4-page **portrait** demo prints to A4 PDF with page boxes measuring 210 × 297 mm | Create fixture (4 pages, `orientation: "portrait"`), print to PDF, use PDF viewer's page-property tool or `pdfinfo` to measure: should show 210mm × 297mm per page |
| **AC-DS-1a** | **Landscape** demo prints to A4 page boxes measuring 297 × 210 mm | Same test with `orientation: "landscape"` |
| **AC-DS-2** | Typing in a control updates SVG without reload | Create data object with text field, bind control to `setData()`, type in input, verify SVG re-renders immediately |
| **AC-DS-3** | With network disabled and cache cleared, file opens and renders | Close browser completely, clear cache, disable network, open `file:///` URL to a HTML using document-shell, verify it renders (no CORS, no fetch, pure SVG) |
| **AC-DS-4** | Tier colours in print match edit view swatches | Print a document with all three tier backgrounds, compare printed colours to edit-view RGB values in browser dev tools (should match, not lightened) |
| **AC-DS-5** | SVG in text editor is readable, structured markup | Export SVG via `exportSVG()`, open in text editor, verify `<g>` groups, named paths, no generated-looking id soup |
| **AC-DS-6** | Grepping shell for curriculum vocabulary returns nothing outside comments | `grep -ri "lesson\|student\|curriculum\|outcome\|vcaa\|victoria" app/js/document-shell.js | grep -v "^[[:space:]]*//"` returns nothing (comments excluded) |
| **AC-DS-7** | Document packaging (G-2) works: either one doc both orientations or separate single-orientation docs | Attempt to render both orientations in one document (one SVG per page, mixed orientations), print, verify it doesn't scale weirdly. If Q-2b says mixed fails, render as two separate documents and verify each prints correctly. |
| **AC-DS-8** | Image draws in edit view; missing source shows placeholder | Pass blob → image renders; pass `null` → grey dashed box with label appears |
| **AC-DS-9** | Zero third-party dependencies | Grep `import` in `document-shell.js`: should only see local ES module imports (e.g., `from './other-module.js'`), never `from 'npm-package'` or URLs |

---

## 5. Risks & Open Points

| Risk | Recommendation |
|------|---|
| **Browser print scales SVG by default, breaking mm geometry** — page prints smaller/larger than intended | **Mitigation:** Use fixed `viewBox` in mm and avoid responsive scaling. Test with actual print: measure PDF page box. AC-DS-1 is the gate. |
| **Landscape treated as rotated portrait** — margins and baselines subtly wrong | **Recommendation:** Define landscape as a separate geometry (297 × 210), not a 90° rotate. AD-DS-1 closes this. Measurement in AC-DS-1a proves it. |
| **Mixed-orientation documents re-scale or drop pages in print** — Q-2b likely says this fails | **Mitigation:** AD-DS-4 makes orientation immutable per document. If one document needs both, render as two separate documents. AC-DS-7 verifies whichever model is used. |
| **Tier colours drop out in print due to browser ink-saving** — the semantic meaning is lost | **Mitigation:** Force `print-color-adjust: exact` on body. OQ-DS-2 closes this. AC-DS-4 verifies. |
| **Who provides the image blobs?** Document-shell's `renderImage()` is generic; caller must hand it blobs or URLs | **Recommendation:** This build provides the primitive; `image-paste` (wave 2) provides the manifest and blob management. Document-shell knows nothing about files. This is correct per AD-3 (HTML edits, SVG renders, no direct SVG manipulation). |
| **Should tier constants be a re-export from TIERS, or exist independently?** Every build needs them. | **Recommendation:** Export from document-shell only; every other build imports from here. One source of truth (CSS-2 principle applied to JS). |

---

**On completion:** Verify all AC-DS-1…9 pass, ensure no curriculum vocabulary, measure printed output in both orientations, move spec and plan to `_Builds/_Done/`, update `_PLAN.md`.
