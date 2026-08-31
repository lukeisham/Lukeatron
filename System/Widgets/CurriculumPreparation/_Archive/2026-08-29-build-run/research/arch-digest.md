# CurriculumPreparation — Architecture Digest

**Source specs:** CurriculumPreparation.arch.spec.md (rev 17, 51 decisions), bundle-server.build.spec.md, document-shell.build.spec.md, _Builds/_PLAN.md (rev 14, 21 subtasks).

---

## 1. AD-18 Bundle Folder Tree (ASCII, with build ownership)

```
<Unit Name>/                                    ← Lives anywhere; fully self-contained
├── Start Unit.command                          ← Double-click launcher (SR-6)
├── serve.py                                    ← bundle-server
├── ingest.py                                   ← curriculum-ingest (Python)
├── unit.json                                   ← local-store reads/writes
├── images/                                     ← image-paste writes; all builds read
├── _ingest/                                    ← Plain text drops here; curriculum-ingest digests
├── app/
│   ├── index.html                              ← All builds' entry; served by bundle-server
│   ├── js/                                     ← Vanilla ES modules (one file, one job)
│   │   ├── local-store.js                      ← Thin browser client; owns data schema
│   │   ├── document-shell.js                   ← Page model, render loop, print CSS
│   │   ├── curriculum-editor.js                ← Node CRUD
│   │   ├── arbor-tree.js                       ← Curriculum map renderer (landscape)
│   │   ├── bigidea-list.js                     ← Big-idea list, topics, tree outline
│   │   ├── coverage-grid.js                    ← Taught + assessed coverage matrix
│   │   ├── image-paste.js                      ← Clipboard paste, manifest, filenames
│   │   ├── lesson-plan-document.js             ← Page model + controls for lessons
│   │   ├── lesson-plan-generator.js            ← Template-driven draft
│   │   ├── unit-assessment-document.js         ← Page model + controls for assessments
│   │   ├── lessons-and-topics.js               ← Combined view, completion, scheduling, reorder
│   │   ├── marking-matrix.js                   ← Per-unit grid, scored against assessments
│   │   ├── csv-export.js                       ← Export marking-matrix to CSV
│   │   ├── crib-sheet.js                       ← Two-half template, sections
│   │   ├── resources-page.js                   ← Flat link/image/text list
│   │   └── traceability-links.js               ← Reverse index, clickable codes → coverage
│   └── css/
│       ├── variables.css                       ← style-guide; all tokens, one source
│       ├── document-shell.css                  ← Page geometry (A4 portrait/landscape), print rules
│       ├── global.css                          ← Base typography, colour-adjust: exact
│       ├── components.css                      ← Shared UI patterns (cards, buttons, etc.)
│       ├── [one CSS per major component]       ← SR-1: 150-line max, split when grown
│       └── print.css                           ← @page rules for both orientations
├── StyleGuide/                                 ← style-guide build output; tokens + demo
│   ├── index.html
│   ├── variables.css                           ← Copy of the source; reference
│   └── demo.svg                                ← Token swatches, readable type scale
├── tests/                                      ← Unittest beside source (TEST-1…9)
│   ├── test_serve.py                           ← bundle-server tests (scope guard, etc.)
│   ├── test_ingest.py                          ← curriculum-ingest tests
│   └── test_[component].js                     ← JS smoke tests (node:test, TEST-2)
└── README.md                                   ← Architecture only; no body walkthrough (SR-7)
```

**Ownership summary:**
- **Python** (`serve.py`, `ingest.py`): All filesystem I/O, networking, persistence. Standard library only (SR-2, PY-1).
- **Browser** (`app/`): Rendering, layout, editing, print. Vanilla ES modules, no framework (JS-7), no build chain.

---

## 2. Python/JS Tier Boundary (AD-13, AD-13b)

### Python owns
- Serving the app over `127.0.0.1` (never `0.0.0.0`) on first free port from 8800–8899
- Reading and writing `unit.json` (atomically, temp file + `os.replace`)
- Filesystem I/O for images: POST, GET, DELETE under `images/`, collision-free filenames
- Plain-text curriculum digest (best-effort, confidence-flagged)
- Scope guard: every path resolved, checked against bundle root, path-traversal attacks refused with 4xx error

### Browser owns
- Rendering pages as inline SVG from data object
- HTML controls and editing
- Document layout logic and page geometry
- Print CSS and `@page` rules
- Image paste capture, manifest creation
- Save/load via server endpoints only

### bundle-server Endpoint Surface

**Motivation:** `bundle-server` owns all filesystem I/O (AD-13b's tier boundary). `local-store` is its only client. All endpoints return JSON unless specified.

**Base:** `http://127.0.0.1:<port>/`

#### GET / — Serve index.html
- Returns the app (text/html)
- Used by `.command` launcher

#### PUT `/api/unit` — Write unit.json
- **Request body:** raw JSON (the entire `unit.json` object)
- **Response:** `{ "status": "ok" }` (200) or error
- **Atomic:** write to temp file, then `os.replace()`
- **Scope:** bundled in bundle-root only
- **Error codes:** path-traversal (403), not found (404), write error (500)

#### GET `/api/unit` — Read unit.json
- **Response:** the current `unit.json` object as JSON (200)
- **Error:** file not found (404), read error (500)
- **Scope:** same bundle-root check

#### POST `/api/images` — Paste image file
- **Request:** `Content-Type: application/octet-stream` (raw image bytes)
- **Response:** `{ "id": "abc123def456", "filename": "image-abc123def456.png" }` (201)
- **Collision-free:** UUID-based or timestamp-based; never client-supplied name
- **Scope:** writes to `images/` only, refuses any path outside
- **Error:** scope guard (403), write error (500)

#### GET `/api/images/<id>` — Read image file
- **Response:** the image file (image/* MIME type), 200
- **Fallback:** if file missing, still returns 200 with placeholder PNG (1×1 transparent)
  - Browser renders missing-source placeholder visible, never blank (FR-IMG-6)
- **Scope:** images/ only

#### DELETE `/api/images/<id>` — Delete image file
- **Response:** `{ "status": "ok" }` (200)
- **Scope:** images/ only
- **Error:** not found (404), delete error (500)

**Error handling (FR-BS-9):**
- All errors return JSON: `{ "error": "message", "code": "ERROR_CODE" }`
- No raw traceback ever reaches client
- Non-zero exit on startup failure (missing `unit.json`, no `app/`, not a unit bundle)

**Verification (TEST-7 gate):**
- Path traversal refused: `../../../etc/passwd`, URL-encoded/double-encoded variants, absolute paths all return 403
- Legitimate paths inside root succeed
- Non-localhost interface refused with 403 (AC-BS-6)
- Scope guard: `path.resolve().is_relative_to(root)` (AD-BS-2)

---

## 3. Document-Shell Contract (AD-3, AD-4, AD-11)

### Tier Constants (FR-DS-6, defined once in document-shell, exported to all builds)

```javascript
// Exact values from AD-13c mockups, canonical from revision 13 forward
const TIERS = {
  pass: {
    line: "#1F6B41",        // Green tier color, borders
    tint: "#E4F4E9",        // Green tier tint background
    ink: "#14502F"          // Green tier text color
  },
  intermediate: {
    line: "#185FA5",        // Blue tier (Intermediate)
    tint: "#E6F1FB",        // Blue tier tint
    ink: "#0C447C"          // Blue tier text
  },
  advanced: {
    line: "#9A4E12",        // Orange tier (Advanced)
    tint: "#FCEEE2",        // Orange tier tint
    ink: "#703508"          // Orange tier text
  }
};
```

**These three constants are load-bearing.** Every use of green/blue/orange for tier meaning draws from these. No other source of truth exists (CSS-2, INV-DM-1).

### Page Geometry — Both Orientations Fixed

**Portrait (A4, default for lesson plan & unit assessment):**
- SVG `viewBox`: `0 0 210 297` (mm; 1 unit = 1 mm for true-size print)
- Page width: 210 mm, height: 297 mm
- Margins: TBD by style-guide (typically 15–20 mm all sides)
- Rendered as one `<svg>` element per page, siblings in DOM

**Landscape (A4, used for curriculum map only):**
- SVG `viewBox`: `0 0 297 210` (mm; width × height swapped)
- Page width: 297 mm, height: 210 mm
- Margins: same tokens as portrait (CSS variables handle both)
- Orientation immutable per document (AD-DS-4); re-orient = re-render into new document

### Print CSS Rules (AD-4, FR-DS-3, FR-DS-11)

```css
@page {
  size: A4 portrait;  /* or landscape */
  margin: 15mm;       /* Exact values TBD by style-guide */
}

@page :first {
  margin-top: 15mm;   /* No special first-page handling; same all */
}

svg {
  page-break-after: always;  /* Each <svg> = one page in print */
  break-after: page;
}

body {
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;  /* Force tier colours in print, not lightened */
}

/* No @page :left/:right — A4 is symmetric */
```

**One print job can fail on mixed orientations** (Q-2b); if so, separate documents is forced (AD-11). This is measured before shell is built.

### Document Request & Render Contract

**How a part requests a page:**
1. Part builds a plain data object: `{ pages: [ { orientation: "portrait|landscape", content: {...} } ] }`
2. Part hands data object + render function to document-shell
3. Shell calls render function for each page: `render(data.pages[i], canvas)` where canvas is the one `<svg>` element
4. Shell re-renders on every data change (debounced)
5. On print: shell injects `@page` rule for the document's orientation, browser handles rest

**Shared chassis API surface (FR-DS-*):**
```javascript
// Pseudo-code; actual signatures in document-shell.js

class DocumentShell {
  constructor(data, renderFn, orientation) {
    // data: the document's data object
    // renderFn: (dataObject, svgElement) → void; draws into SVG
    // orientation: "portrait" | "landscape"; immutable
  }

  setData(newData) {
    // Update data, re-render all pages
  }

  render() {
    // Sync render; called on init and data change
  }

  exportSVG() {
    // Return serialized SVG source for editing in Illustrator/text editor (FR-DS-7)
  }

  renderImage(imageBlob, x, y, width, height, svgElement) {
    // Generic image primitive (FR-DS-9)
    // If blob is null, render visible placeholder instead (FR-IMG-6)
  }
}
```

**Print:** User hits Cmd-P → browser print dialog → `@page { size: A4 [orientation] }` applies → one page per sheet.

---

## 4. Architecture Decisions: Complete Table

| ID | Decision | One-line summary | Binds which builds |
|---|---|---|---|
| **AD-1** | Repo root at `System/Widgets/CurriculumPreparation/` | Peer of Parser/, Generator/, Dashboard/; offline artefacts; existing viewer conventions apply | bundle-template (root definition) |
| **AD-2** | Import-once, not live-fetch; plain text into `_ingest/`, Python digest | Offline operation mandatory; unit reproducible; no scraper dependency | curriculum-ingest, curriculum-editor |
| **AD-3** | SVG renders, HTML edits; no direct SVG manipulation | Clean, hand-readable source; entry via forms | document-shell, all rendering builds |
| **AD-4** | PDF from browser Print → Save as PDF; no embedded library | Zero dependency; vector fidelity; offline; one file per sheet | document-shell (@page rules) |
| **AD-5** | Persistence: tiny per-bundle `serve.py`; no File System Access API | Removes permission lifecycle; atomic writes; bundles portable; matches house pattern | bundle-server, local-store |
| **AD-6** | Spreadsheet export is CSV (UTF-8 + BOM) | No library, diffable, Excel-compatible, no macros | csv-export |
| **AD-7** | Three tiers hard-coded (Pass/Intermediate/Advanced); no settings screen | Tiers are spine; identity with lesson pages + matrix bands must not drift | document-shell (constants), every build |
| **AD-8** | Imported curriculum stays local, attributed, never bundled | Copyright-aware; attribution per profile; personal tool on one machine | curriculum-ingest, curriculum-editor |
| **AD-9** | Lesson generation template-driven, no model call | Offline (FR-SYS-1); draft for modification | lesson-plan-generator |
| **AD-10** | Core is curriculum-agnostic; curricula are profiles (declarative adapters) | One model fits many; generic profile fallback; no hard-coded Victorian assumptions | curriculum-ingest, curriculum-editor, arbor-tree |
| **AD-11** | Orientation per part: map landscape, lesson/assessment portrait; matrix user-selectable; crib 1–2pp hardcap | Driven by content geometry; mixed-orientation print unreliable (Q-2b likely forces separate docs) | document-shell, marking-matrix, crib-sheet |
| **AD-12** | Cross-links derived on screen, printed as citations | No stored bidirectional edges; reverse index rebuilt on load; gaps shown | traceability-links (index), all renderers |
| **AD-13** | Python (serve, ingest) / Browser (render, edit); no framework, no packages | Personal tool that outlives dependencies; testable tiers; each half independent | bundle-server (Python), all builds (JS) |
| **AD-13a** | Vibe Coding Rules binding (SR-1…SR-9, PY-1…PY-6, JS-1…JS-7, CSS-1/2, TEST-1…9) | No history comments; one file one job; stdlib only; vanilla JS; SR-6 house idioms | Every file in every build |
| **AD-13b** | bundle-server may write; hard-scoped to bundle root | Preserves PY-12 intent without being merely conventional; scope enforced in code | bundle-server (scope guard) |
| **AD-13c** | Style tokens from AD-13c table (mockups' settled values) | Future `style-guide` transcribes; no re-derivation or silent drift | style-guide (transcription), all builds |
| **AD-14** | Big-idea list is second axis, parallel to curriculum tree; not a branch | Independent editability; ideas span nodes across branches; two-level cap (INV-DM-14) | bigidea-list, coverage-grid, lessons-and-topics |
| **AD-15** | Images as files in `images/`, manifest in `unit.json`, referenced by id | Readable JSON, diffable, Finder-visible, Finder-editable | image-paste, all renderers |
| **AD-16** | Ingest is best-effort heuristics, confidence-flagged; never silent wrong | User sees what parser guessed; editorial authority stays with Luke | curriculum-ingest (gate G-9) |
| **AD-17** | Crib sheet: 1–2pp hard cap, two halves (skills/knowledge or curriculum-specific discriminator) | Content-driven page count; two-half generic discriminator reusable across profiles | crib-sheet (page cap, halves) |
| **AD-18** | Each unit is self-contained bundle stamped by `!NewUnit` skill | Independence; no shared runtime drift; versioned (`generatedFrom`); teach with any copy | bundle-template, newunit-skill |
| **AD-19** | Cardinality fixed in schema: one nodes tree, one bigIdeas list, one cribSheet, one unitAssessment, many lessons, one matrixTemplate+many matrices | Singular things are singular; matrix pages keyed by student, not lesson | local-store (schema), every build |
| **AD-20** | Curriculum categories map to generic tree (`kind:strand`/`outcome`/`task`) | Reuses existing machinery; no curriculum-specific entity needed | curriculum-ingest, arbor-tree |
| **AD-21** | Big-idea coverage is two-value enum (`"full"` or `"partial"`), not scale | Glance-readable; distinguishes finish vs. touch | bigidea-list, coverage-grid |
| **AD-22** | Coverage grid edits; arbor tree prints chips (shared rendering, not stored bidirectionality) | Edit once, render twice (screen & print); no sync drift | coverage-grid, arbor-tree |
| **AD-23** | Unit Assessment: first-class fifth part, between lesson plan and marking matrix | Final + mini assessments; same tier structure as lessons; own tier pages | unit-assessment-document |
| **AD-24** | Marking matrix: singular per unit, paginated by student, scored against Unit Assessment (not lessons) | One matrix template; each student one page; scores against assessment, not lesson | marking-matrix |
| **AD-25** | Resources page: sixth part | Flat link/image/text list, deliberately unstructured | resources-page |
| **AD-26** | Resources unstructured; no nesting, no scoring, no relation to curriculum | Intentional simplicity; lowest barrier to ad-hoc content | resources-page (no structure) |
| **AD-27** | Mini assessments carry qualified coverage (`full`/`partial`), like big ideas | Assessment-scoped coverage visible; assessed-but-not-taught gap separated | unit-assessment-document, coverage-grid |
| **AD-28** | Coverage grid splits one gap into three: taught-not-assessed / assessed-not-taught / neither | Fine-grained visibility of holes | coverage-grid |
| **AD-29** | Crib-sheet two halves labelled by curriculum profile discriminator (not hard-coded tier) | Generic across profiles; Victorian: skills/knowledge | crib-sheet |
| **AD-30** | Crib-sheet page cap governs whole sheet; fold between halves nominal | Content fills available space; fold is visual marker only, not structural | crib-sheet |
| **AD-31** | Lesson numbers contiguous, renumber on reorder, own index view | Referentiable; lessons-and-topics sorts by number | lessons-and-topics |
| **AD-32** | Curriculum codes are on-screen navigation controls; print as plain text | Clickable convenience; paper is still plain text | traceability-links, arbor-tree |
| **AD-33** | Lesson-plan tier pages print only when populated; schema stays three-tier mandatory | 1–4 pages per lesson; avoids blank tier pages; schema unchanged (INV-DM-1 holds) | lesson-plan-document |
| **AD-34** | Developer-facing explanation in code comments; screen text serves only the user | No "this feature is smart" text bloating UI; comments explain the why, not the how | Every build |
| **AD-35** | Topics sit above big-idea list; independently covered organising layer | Third scope axis: curriculum codes (nodes), big ideas, topics | bigidea-list, lessons-and-topics |
| **AD-36** | Lesson-plan sidebar: freeform, unstructured, front-page-only | Content-blind region for user notes | lesson-plan-document |
| **AD-37** | Each mini assessment carries own big-idea binding, not shared | One assessment, one idea; unlike lessons (which may touch many) | unit-assessment-document |
| **AD-38** | Lessons & Topics: combined view; completion is explicit manual per-item flag | One place to manage both; completion state stored on lesson/assessment | lessons-and-topics |
| **AD-39** | Marking matrix: per-assessment and full-unit display modes, orthogonal to display-mode toggle | Scope axis independent of mark-entry modes; four combinations shown | marking-matrix |
| **AD-40** | Tiered ceiling mark allocation: budgets divided at setup, not rescaled at grading | Scores never auto-scaled; marks stay what was entered | marking-matrix |
| **AD-41** | Manual `maxScore` override opts criterion out of auto tier allocation | Per-criterion override for non-standard criteria | marking-matrix |
| **AD-42** | Lessons & Topics view print-capable, cross-cutting, not a seventh part | Prints lesson outline + topic list + completion state; not a separate artefact | lessons-and-topics |
| **AD-43** | Crib-sheet sections individually resizable; support bounded formatted text | User controls space per half; text can be rich within bounds | crib-sheet |
| **AD-44** | Every shared entity has exactly one editing surface; every other appearance is reflection | Edit lesson once; it appears in lesson plan, big-idea grid, coverage, matrix. No duplication. | Every build (amendment: AD-51 codifies big-idea outline as canonical editor) |
| **AD-45** | Final widget guide is standalone reference document, not a build or seventh part | Read-only guide separate from app | Deliverable, not a build |
| **AD-46** | Crib-sheet page cap tightens to 1 page, drawn fold removed | Stricter constraint; fold visual only | crib-sheet |
| **AD-48** | Crib-sheet cap reverts to 1–2 enforced | Balance after Q-8 data | crib-sheet |
| **AD-49** | Every curriculum node carries derived Skill/Knowledge glyph; big ideas inherit from covered nodes | Visual domain hint on all three axes (coverage, lessons, topics) | arbor-tree, curriculum-editor, bigidea-list |
| **AD-50** | Lessons & Topics gain optional scheduling; grouping by date is view, not store | Date column; sorts by number or date; no second store | lessons-and-topics |
| **AD-51** | Big Idea Tree: markdown outline edits list, ASCII connector tree prints | Click-to-copy both formats; canonical editor for big-idea structure | bigidea-list |

---

## 5. Open Questions & Current State

| ID | Question | State | Default / Resolution | Gate |
|---|---|---|---|---|
| **OQ-1** | One artefact for all six parts, or separate files on shared shell? | Open | **Separate documents** (arch) — likely **forced** by Q-2b (AD-11) | **G-2** (pre-shell) |
| **OQ-2** | Which subject/level first real unit? | Open | Whichever Luke closest to teaching | None; informational |
| **OQ-3** | Tool open two units side by side? | Open | No | None |
| ~~**OQ-4**~~ | ~~Target browser?~~ | ✅ Closed | Chrome on macOS only (FR-SYS-9) | — |
| **OQ-5** | Which curricula get bespoke profiles, not generic fallback? | ✅ Closed | Victorian + generic only (wave 1) | **G-6** (closed) |
| ~~**OQ-6**~~ | ~~Matrix default orientation?~~ | ✅ Closed | Portrait (AD-11, AD-24) | — |
| **OQ-7** | Print citations: short reference (L3 → VC2M8N01) or full title text? | Open | Both (precision + readability) | Informational |
| **OQ-8** | Crib sheet default: 1 or 2 pages, portrait or landscape? | ✅ Closed | 1 page portrait, expandable to 2 (AD-46, AD-48) | — |
| **OQ-9** | Auto-watch `_Ingest/`, or explicit run? | ✅ Closed | Explicit run (no background process) | Implemented |
| **OQ-10** | Re-ingest merge in place or staging for review? | ✅ Closed | Staging area; diff view | Implemented |
| **OQ-11** | Crib sheet need own images, or lesson plans only? | ✅ Closed | Both | Implemented |
| **OQ-12** | Big idea carry tier hints for generator? | Open | No in v1; revisit after real use | Informational |
| ~~**OQ-13**~~ | ~~Navigate 300+ matrix instances?~~ | ✅ Closed (superseded by AD-24) | Single matrix, 30 student pages (not 300 lesson×student) | — |
| **OQ-14** | Port selection strategy? | ✅ Closed | First free port from 8800–8899; print it | **OQ-BS-1** (resolved) |
| **OQ-15** | `!NewUnit` seed by ingest run, or empty bundle? | ✅ Closed | Empty bundle; ingest separate re-runnable step | Implemented |
| **OQ-16** | Record template version in bundle? | ✅ Closed | Yes; `generatedFrom` in `unit.json` | Implemented |
| **OQ-17** | Template location: `_template/` or separate top-level folder? | ✅ Closed | `_template/` at repo root | Implemented |
| **OQ-18** | Grid reorder keyboard equivalent needed? | ✅ Closed | Yes; Enter/Space toggles cell, explicit move-up/down controls | Implemented |
| **OQ-19** | Unit Assessment follow lesson-plan 1-to-N page rule? | ✅ Closed | Yes (2026-08-19); same 1–4 pages per tier (AD-33) | **G-9** (resolved) |
| **OQ-20** | Promote AD-34 to house rule (SR-9)? | ✅ Closed | Yes (2026-08-19); now SR-9 in vibe-coding-rules.md | Long-Term write approved |
| **OQ-21** | CSV export per-assessment or full-unit only? | ✅ Closed | Full-unit only; per-assessment deferred | Informational |

---

## 6. Cross-Build Shared Functions

| Function | Owner build | Scope | Signature (pseudo-code) | Used by |
|---|---|---|---|---|
| **Tier constants** (PASS, INTERMEDIATE, ADVANCED) | document-shell | Define once; export to all | `{ pass: { line, tint, ink }, intermediate: {...}, advanced: {...} }` (AD-13c table) | Every build rendering tier colours |
| **FR-CEB-5: Domain resolution** | curriculum-editor | Walk node tree to strand; read `domain` field | `resolveDomain(nodeId, nodes) → "skill" | "knowledge" | unset` | arbor-tree (glyph rendering), bigidea-list (FR-BIB-8 glyph union) |
| **FR-BIB-8: Domain glyph-set union** | bigidea-list | Union of `domain` values from all covered nodes | `computeGlyphSet(bigIdeaId, coverage[], nodes) → Set["skill", "knowledge"]` | bigidea-list (chip rendering), lessons-and-topics (topic glyphs) |
| **FR-BIB-17: Lesson → Topic resolution** | bigidea-list | Transitive: lesson → big idea → topic | `resolveTopic(lessonId, lessons, bigIdeas) → topicId \| null` | lesson-plan-document (topic label), lessons-and-topics (grouping) |
| **Image placeholder** | document-shell | Render missing-image visual marker | `renderImage(blob \| null, x, y, w, h, svgElement) → void; null → visible placeholder` | lesson-plan-document, unit-assessment-document, crib-sheet, resources-page |
| **Tier page filter** (AD-33) | lesson-plan-document | Emit page only if tier has content | `shouldRenderTierPage(tiers[tier]) → boolean` | lesson-plan-document, unit-assessment-document |
| **Print colour-adjust** | document-shell | Force exact tier colours in print | `@media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }` | All builds' print CSS |

---

## Wave 1 Builds (Foundation)

1. **bundle-template** — Skeleton every bundle copies; folders, empty `unit.json`, launcher
2. **bundle-server** — Python; serve app, persist `unit.json`, manage images, scope guard
3. **style-guide** — Tokens & variables.css transcribed from AD-13c; StyleGuide demo page
4. **document-shell** — Page model (portrait/landscape), render loop, print CSS, tier constants
5. **local-store** — Thin browser client over bundle-server endpoints; owns data schema
6. **newunit-skill** — `!NewUnit` Skillbank skill; generates bundle from template

**Gate:** Q-2 (A4 print measured), Q-2b (mixed orientation print), Q-3b (bundle portability), G-2 (packaging decided).

---

## Cross-build Soft Couplings (Sequence, don't interleave)

- **Unit-folder schema** — settled once in wave 1; document-shell and local-store both consume
- **Forward reference fields** — waves 2–4 must store `lesson.nodeIds`, `lesson.bigIdeaId`, `lesson.assessmentLink`, `bigIdea.coverage[]`, `unitAssessment.bigIdeaId`, `unitAssessment.coverage[]`, `miniAssessment.nodeIds[]`, `matrix.studentId`, `cribSheet.sections[].bigIdeaId`, all `ImageRef`s from start (AD-12, INV-DM-12)
- **Python/JS tier boundary** — absolute; Python owns all filesystem I/O; browser never touches files directly (AD-13)
- **Tier vocabulary** — global constant across all parts (AD-7, document-shell exports)
- **Curriculum vocabulary** — no build names jurisdiction, code format, curriculum name in field/enum/UI text (INV-DM-10, AD-10)
- **CSS tokens** — style-guide owns `variables.css`; no hardcoded value that belongs in token (CSS-2)
- **Reverse-link index** — traceability-links alone (INV-DM-12; others store forward edges only)
- **Images** — image-paste alone writes files & manifest; all other builds hold `ImageRef`s only

---

## Gates (Pre-build decisions; must resolve before work starts)

| Gate | Blocks | Options | Resolution | Decided by |
|---|---|---|---|---|
| **G-2** | document-shell | One artefact for all parts · separate documents on shared shell | Separate (Q-2b likely forces it) | Q-2b (mixed-orientation print test) |
| **G-5** | lesson-plan-generator, lesson-plan-generator | Build generators · blank templates only | Build them | Q-5 (ergonomics test) |
| **G-9** | curriculum-ingest | Build ingest · hand-enter through editor | Build if Q-1 ≥ ~60% accuracy | Q-1 (accuracy on real messy text) |

---

**Document Date:** 2026-08-29 | **CurriculumPreparation Spec Rev:** 17 | **_Builds/_PLAN.md Rev:** 14
