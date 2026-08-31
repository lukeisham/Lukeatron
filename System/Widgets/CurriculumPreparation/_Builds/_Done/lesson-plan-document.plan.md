# lesson-plan-document — Execution Plan

**Spec Date:** 2026-08-20 | **Build Type:** Wave 3 | **Wave Status:** Gated

---

## 1. Files

All files live under `_template/app/`.

| Path | Purpose | Lines |
|------|---------|-------|
| `js/lesson-plan-document.js` | Page model + document render loop. Exports document class and render state machine. ~250 lines. | ~250 |
| `js/tier-page-emission.js` | Shared logic: `shouldRenderTierPage(tier)` predicate (INV-DM-33 emptiness test). Imported by this build AND unit-assessment-document. ~30 lines. | ~30 |
| `js/big-idea-picker.js` | Shared control: renders picker UI for "choose one big idea" binding, returns selected id. Imported by this build, unit-assessment-document, and lesson-plan-generator. ~80 lines. | ~80 |
| `js/transitive-topic.js` | Reads lesson → big idea → topic chain using bigidea-list's shared resolver function (FR-BIB-17). ~20 lines. | ~20 |
| `css/lesson-plan-document.css` | Page layout: front page geometry, tier page spacing, sidebar positioning, tier colour bands. ~120 lines. | ~120 |
| `css/tier-page.css` | Shared print CSS for tier pages (material/studentTask/workspace). Imported by this build AND unit-assessment-document. ~60 lines. | ~60 |
| `tests/test_lesson-plan-document.js` | Smoke tests: import, happy-path create-and-render, tier-emission guard (TEST-2, TEST-7). ~50 lines. | ~50 |

**Critical:** Do NOT create files another build owns. lesson-plan-generator owns the picker's data-binding logic; this build owns only the UI. unit-assessment-document will import tier-page-emission.js and big-idea-picker.js; do not duplicate them.

---

## 2. Steps

- [ ] **Extract tier-page emission logic** into shared `tier-page-emission.js` per AD-LPB-1.
  - [ ] Write `shouldRenderTierPage(tier)` predicate: tests if tier.material, tier.studentTask, tier.workspaceLines are all blank AND imageRefs[] is empty (INV-DM-33).
  - [ ] Confirm logic mirrors the same rule `unit-assessment-document` will need; do not optimize past readability.

- [ ] **Extract big-idea picker** into shared `big-idea-picker.js` per AD-LPB-2.
  - [ ] Render list of big ideas + sub-big ideas, single-select radio pattern.
  - [ ] Return selected id on confirm, null if cancelled.
  - [ ] Import bigidea-list's query for "all big ideas + their sub-ideas" (no server call; in-memory).
  - [ ] Confirm shape is identical to what unit-assessment-document and lesson-plan-generator will expect.

- [ ] **Implement transitive topic resolution** in `transitive-topic.js`.
  - [ ] Import bigidea-list's `resolveTopic(lessonId, lessons[], bigIdeas[])` function (FR-BIB-17).
  - [ ] Returns topicId or null; handles sub-big-ideas correctly.

- [ ] **Build DocumentShell consumer** in `lesson-plan-document.js`.
  - [ ] Constructor: accepts lesson data object, orientation, bind to document-shell instance.
  - [ ] Render function: called by shell for each page. Signature: `(pageData, svgElement) ⇒ void`.
  - [ ] Emits front page (always) + zero-to-three tier pages (via tier-page-emission logic).
  - [ ] Front page includes: lesson number, topic (resolved via transitive-topic.js), big idea box (name + lesson count), curriculum citations, key example, practice question, assessment links, tier key, optional sidebar.

- [ ] **Render front page**.
  - [ ] Lesson number: plain text, top-left.
  - [ ] Topic (above big idea): resolved from lesson.bigIdeaId → bigIdea → topic, printed in secondary heading.
  - [ ] Big idea box: name (from bound idea), lesson count (from bigidea-list query "how many lessons bind to this idea"), read-only display + picker button (big-idea-picker.js).
  - [ ] Curriculum citations: for each lesson.nodeIds[], print node.code + node.title as inline text, no raw ids.
  - [ ] Key example + practice question: plain text fields, block layout.
  - [ ] Assessment links: "Linked assessments" section listing each mini (by name) and/or final assessment. Plain text citations, no raw ids.
  - [ ] Tier key: colour swatch + tier name for Pass/Intermediate/Advanced (from document-shell's TIERS constant, AD-13c).
  - [ ] Sidebar (front page only): if lesson.sidebar is non-empty, render as freeform text block (no images, no bindings), right edge of page; if empty, render nothing (no placeholder box).

- [ ] **Render tier pages** using tier-page-emission logic.
  - [ ] For each tier (pass → intermediate → advanced, fixed order per INV-DM-5):
    - [ ] Call `shouldRenderTierPage(lesson.tiers[tier])`.
    - [ ] If true: emit one page with tier colour band (left 5px accent), tier name (bold), material (plain text), studentTask (plain text), workspaceLines (ruled lines), imageRefs (placed via document-shell.renderImage()).
    - [ ] If false: skip this tier entirely (no blank page).
  - [ ] Page count text: "page 1 of *N*" where N = 1 (front) + count of emitted tier pages. Compute dynamically, never hard-code.

- [ ] **Image handling**.
  - [ ] For each imageRef in lesson.tiers[tier].imageRefs[]:
    - [ ] Call document-shell.renderImage(blob, x, y, width, height, svgElement).
    - [ ] Blob is null → placeholder; blob loaded via `/api/images/{imageId}` (handled by document-shell internally).
    - [ ] Never embed base64 in unit.json (FR-LPB-7).

- [ ] **Edit-view controls**.
  - [ ] One form per field on front page (lesson number is display-only, do not edit).
  - [ ] Big idea box: read-only name display + "Change" button → open big-idea-picker.js, on confirm write lesson.bigIdeaId + re-render + save via local-store.
  - [ ] Sidebar: `<textarea>` for freeform text, save on blur.
  - [ ] Key example + practice question: `<textarea>` fields, save on blur.
  - [ ] Assessment links: list current + "Link another assessment" button → picker over mini + final, on confirm update lesson.assessmentLink + save.
  - [ ] Tier pages (edit mode): for each tier, show material/studentTask as textarea, workspaceLines as number, imageRefs as draggable list (open image-paste on drop).

- [ ] **Write provenance transition** (FR-LPB-13).
  - [ ] On first manual edit to any field where lesson.provenance is "generated":
    - [ ] Set provenance: "edited".
    - [ ] Write to local-store.
  - [ ] Never write "generated" or "manual" from this build (lesson-plan-generator writes "generated"; external creation writes "manual").

- [ ] **Print CSS** in `lesson-plan-document.css` + `tier-page.css`.
  - [ ] Use style-guide tokens only (`--color-pass-*`, `--color-intermediate-*`, `--color-advanced-*`, `--font-size-*`, `--space-*`).
  - [ ] Page geometry: A4 portrait (210 × 297mm) via document-shell (AD-11).
  - [ ] Margins + spacing: reference style-guide tokens, never hardcoded pixels.
  - [ ] Tier colour bands: `background: var(--color-[tier]-tint)`, `border-left: 5px solid var(--color-[tier]-line)`.
  - [ ] Print colour-adjust: `print-color-adjust: exact` on tier sections (FR-DS-11).
  - [ ] No `!important` (CSS-5).
  - [ ] File under 150 lines; split if needed (CSS-1).

- [ ] **Tests** in `test_lesson-plan-document.js`.
  - [ ] Import cleanly: `import * as doc from '../js/lesson-plan-document.js'` (TEST-1).
  - [ ] Happy path: create fixture lesson, call document render, assert front page + one tier page + page count "page 1 of 2" (TEST-2).
  - [ ] Guard path: fixture lesson with all tiers empty, assert only front page emitted, page count "page 1 of 1" (TEST-7, tier-emission guard).
  - [ ] No assertions about "didn't crash"; assert actual output (TEST-6).

- [ ] **Code review gates**.
  - [ ] AD-44 compliance: grep this build for writes to BigIdea.title, .hierarchy, .coverage[]. Must return empty (AC-LPB-6).
  - [ ] No spec ids in rendered strings: grep for `FR-`, `AD-`, `AC-`, `INV-DM-` in any label, placeholder, or tooltip (SR-9, AC-LPB-*).
  - [ ] No raw ids in print view: grep rendered SVG for bare UUIDs outside `id=` / `data-*` attributes (FR-LPB-6).
  - [ ] No base64 in unit.json: fixture save + inspect (FR-LPB-7).
  - [ ] Tier-page-emission extraction flagged for unit-assessment-document (or vice versa) per AD-LPB-1.

---

## 3. Interfaces

### Exports (used by other builds / the app)

```javascript
// lesson-plan-document.js
export class LessonPlanDocument {
  constructor(lesson, allLessons, allBigIdeas, allTopics, allNodes, orientation = "portrait") {
    // orientation is always "portrait" (FR-LPB-11, immutable per AD-11)
  }

  render(svgElement) {
    // Called by document-shell render loop for each page (first page, then tier pages)
    // Draws front page or a tier page into the provided <svg>
  }

  setData(updatedLesson) {
    // Updates internal data, triggers re-render (called by local-store on save)
  }

  exportSVG() {
    // Returns serialized SVG source (for editing, FR-DS-7)
  }
}

// tier-page-emission.js (SHARED - imported by unit-assessment-document too)
export function shouldRenderTierPage(tier) {
  // @param tier: {material, studentTask, workspaceLines, imageRefs[]}
  // @return boolean: true if tier has content per INV-DM-33, false if empty
}

// big-idea-picker.js (SHARED - imported by lesson-plan-generator, unit-assessment-document too)
export function openBigIdeaPicker(allBigIdeas, currentBigIdeaId = null) {
  // @return Promise resolving to selected big idea id or null on cancel
  // Returns both big ideas (parentId: null) and sub-big ideas (parentId: parent-id)
}

// transitive-topic.js
export function getTopicForLesson(lesson, allBigIdeas, allTopics) {
  // @return topicId string or null if unresolvable (should not happen per INV-DM-34)
}
```

### Consumes (reads from other builds)

- **document-shell**: `TIERS` constant (pass/intermediate/advanced colour definitions, AD-13c). `renderImage(blob, x, y, width, height, svgElement)` method. Page-render contract.
- **local-store**: read/write lesson records via `PUT /api/unit` (entire unit.json, not just lesson).
- **bigidea-list**: query "all big ideas + subs" (data only, no writes from this build). Query "how many lessons bind to big idea X" (FR-BI-6).
- **image-paste**: `ImageRef` shape `{imageId, x, y, width, height}` and images manifest in unit.json (this build only reads and places, never writes images).
- **style-guide**: CSS tokens in `variables.css` (imported by this build's CSS).

### Contention (shared with unit-assessment-document)

**Extraction point for AD-LPB-1 / AD-LPB-2:**
- `tier-page-emission.js` — both builds must import this, never duplicate.
- `big-idea-picker.js` — both builds must import this, never duplicate.
- Whichever build lands first, extract these into shared modules immediately. The other build imports them.

---

## 4. Verification

| AC # | Acceptance Criterion | Runnable Check |
|------|---------------------|---|
| AC-LPB-1 | Fixture lesson with zero tiers → 1 page, "page 1 of 1" | `test_lesson-plan-document.js`: load fixture (0 tiers), render, assert page count and text. |
| AC-LPB-2 | Fixture lesson with 1 tier → 2 pages, "page 1 of 2" | `test_lesson-plan-document.js`: load fixture (1 tier filled), render, assert page count. |
| AC-LPB-3 | Fixture lesson with all 3 tiers → 4 pages, "page 1 of 4" | `test_lesson-plan-document.js`: load fixture (3 tiers filled), render, assert page count. |
| AC-LPB-4 | Page 1 carries all fields FR-LPB-1…3 with nothing clipped | Manual print test: open fixture (3 tiers + sidebar), print, measure. |
| AC-LPB-5 | Big Idea box shows name + lesson count immediately; 2-lesson fixture shows "· 2 lessons" on both | `test_lesson-plan-document.js`: load fixture with 2 lessons on same big idea, render, inspect SVG for lesson count text. |
| AC-LPB-6 | Big Idea picker changes only lesson.bigIdeaId; grep for writes to BigIdea fields = empty | Manual code review: grep "bigIdea\[" and ".title =" and ".coverage" in this build. Must return nothing. |
| AC-LPB-7 | Sidebar text prints on front page only; empty sidebar renders nothing; 3 tiers + sidebar = 4 pages | `test_lesson-plan-document.js`: fixture with sidebar, render, assert 4 pages (not 5). Empty sidebar fixture, render, assert no sidebar section in SVG. |
| AC-LPB-8 | Lesson front page shows topic above big idea; topic matches big idea's bound topic | `test_lesson-plan-document.js`: load fixture with known big idea → topic chain, render, inspect SVG for topic text position and value. |
| AC-LPB-9 | ImageRef in tier page renders in edit + print; missing file shows placeholder; no base64 in unit.json | Manual test: paste image, save, reopen, inspect. Delete backing file, render, confirm placeholder. Grep unit.json for base64 = empty. |
| AC-LPB-10 | Physical/PDF print of 3-tier fixture: 4 pages, 210×297mm, margins match shell, tier colours match swatches | Manual print test: export PDF, measure with ruler or PDF tool. |
| AC-LPB-11 | Print body type ≥ 12pt (≈16px@96dpi) | Manual: render fixture, measure rendered type size in print view. Must be ≥ 12pt. |
| AC-LPB-12 | `node:test` suite: import cleanly, happy path (create + save), tier-emission guard | `npm test test_lesson-plan-document.js`. All 3 cases pass. |

---

## 5. Risks & Defaults

| Risk | Probability | Impact | Mitigation | Default |
|------|------------|--------|-----------|---------|
| Tier-page emission duplicated in unit-assessment-document | High | High: SR-4 / AD-33 violated | AD-LPB-1: extract shared module immediately on first landing; second build imports. Code review against duplication. | Whichever build lands first: extract tier-page-emission.js before submitting. |
| Big-idea picker reimplemented here + unit-assessment-document + lesson-plan-generator | High | High: SR-4 / AD-LPB-2 / AD-UAB-3 / AD-LPG-1 all violated | Extract big-idea-picker.js on first landing; three builds import. | Whichever build lands first: extract big-idea-picker.js before submitting. |
| Big Idea box drifts into editing idea name/hierarchy/coverage (AD-44 boundary) | Medium | High: editing authority split violated | AD-LPB-3 + AC-LPB-6: picker only writes lesson.bigIdeaId, never BigIdea fields. Code review grep. | Rename big-idea-picker's confirm button to explicitly name it "Change binding only". AC-LPB-6's grep proof. |
| Print body type ships below 12pt floor, repeating logged mockup defect | Medium | Medium: parent-facing print defect | AC-LPB-11: this build does not set hardcoded font-size. Pull from style-guide tokens only. | style-guide must bump --font-size-* to floor before this build renders. Defer if style-guide tokens are sub-floor. |
| Spec ids / invariant names leak into UI (SR-9) | Low | Medium: developer text reaches teacher | SR-9 + AC-LPB-*: grep every rendered string. No `FR-`, `AD-`, `AC-`, `INV-DM-` patterns. | Pre-submission: automated grep check in test. |
| Lesson.number appears to be editable on front page (AD-LPB-4 boundary) | Low | Medium: teacher reorders on wrong screen | AD-LPB-4: lesson number display-only. No input, no up/down controls on this screen. | Render number as plain text, never in an `<input>` or near drag handles. |
| Raw UUIDs leak into print view (FR-LPB-6) | Low | Low: parent-facing document has raw id | FR-LPB-6 + AC-LPB-*: print citations are human-readable text only. Grep SVG for bare UUID patterns. | grep "^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}" in rendered SVG (outside id= and data-*). |

---

## 6. Notes & Handoff

- **Timeline:** Sequenced BEFORE lesson-plan-generator (this build's output feeds that build). `unit-assessment-document` is coordinate-with (same wave, same shapes, but order does not matter).
- **Shared module extraction:** AD-LPB-1 / AD-LPB-2 apply; tier-page-emission.js and big-idea-picker.js must be extracted on landing and held ready for the sibling builds to import.
- **Print test:** A4 portrait print measured on a real printer or PDF tool (page size, margins, tier colours) must be recorded before sign-off.
- **Data dependencies:** Fixture lesson with 0/1/3 populated tiers, sidebar text, assessment links, and images already in unit.json (local-store must be ready to load/save).
