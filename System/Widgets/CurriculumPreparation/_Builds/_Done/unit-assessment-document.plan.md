# unit-assessment-document — Execution Plan

**Spec Date:** 2026-08-19 | **Build Type:** Wave 3 | **Wave Status:** Gated

---

## 1. Files

All files live under `_template/app/`.

| Path | Purpose | Lines |
|------|---------|-------|
| `js/unit-assessment-document.js` | Page model + render loop for final + mini assessments. ~300 lines. | ~300 |
| `js/assessment-tier-page.js` | Shared with lesson-plan-document: renders one tier page (material/studentTask/workspace/imageRefs). ~80 lines. | ~80 |
| `js/mini-assessment-manager.js` | UI: create, edit, reorder, delete mini assessments. ~120 lines. | ~120 |
| `js/coverage-editor.js` | UI: add/edit/remove coverage links {nodeId, coverage, note}. ~100 lines. | ~100 |
| `js/assessment-lesson-links.js` | Derived: scan lessons for references, display "Lessons using this assessment". Read-only (INV-DM-12). ~40 lines. | ~40 |
| `js/tier-page-emission.js` | SHARED (imported from lesson-plan-document): shouldRenderTierPage(tier). ~30 lines. | ~30 |
| `js/big-idea-picker.js` | SHARED (imported from lesson-plan-document): openBigIdeaPicker(). ~80 lines. | ~80 |
| `css/unit-assessment-document.css` | Assessment page layout, tier bands, spacing. ~100 lines. | ~100 |
| `css/assessment-tier-page.css` | SHARED with lesson-plan-document: tier page styling. ~60 lines. | ~60 |
| `tests/test_unit-assessment-document.js` | Smoke tests: import, happy-path create final/mini, delete refusal, coverage add/remove, big-idea binding guard. ~70 lines. | ~70 |

**Critical:** Do NOT create tier-page-emission.js, big-idea-picker.js, or assessment-tier-page.css. IMPORT from lesson-plan-document (or unit-assessment-document if it lands first, then lesson-plan-document imports from here). Do NOT duplicate unit.json schema logic; local-store owns validation.

---

## 2. Steps

- [ ] **Consume shared tier-page emission** (AD-LPB-1).
  - [ ] Import `tier-page-emission.js` (built by lesson-plan-document or already shared).
  - [ ] Confirm shouldRenderTierPage() function is available.
  - [ ] If lesson-plan-document hasn't landed yet, create a stub that this build can use now; mark for replacement when shared module exists.

- [ ] **Consume shared big-idea picker** (AD-UAB-3).
  - [ ] Import `big-idea-picker.js` (built by lesson-plan-document or already shared).
  - [ ] Confirm openBigIdeaPicker() function is available for both final and mini bindings.

- [ ] **Build assessment renderer** in `unit-assessment-document.js`.
  - [ ] Constructor: accepts unitAssessment (final + minis), allLessons, allBigIdeas, allNodes, orientation="portrait".
  - [ ] Exports render(svgElement) called by document-shell for each page.
  - [ ] Two modes: "final" (renders finalAssessment) or "mini" (renders one mini from miniAssessments[]).
  - [ ] Page 1 (header): name, bound big idea (read-only + binding picker), curriculum links (coverage[]), referencing lessons (derived), matrix pointer.
  - [ ] Pages 2–4: tier pages (Pass/Intermediate/Advanced, fixed order) via tier-page-emission logic.

- [ ] **Render final assessment header page**.
  - [ ] Title: "Final Assessment" (fixed, never edits).
  - [ ] Name: editable field (unitAssessment.finalAssessment does not have a name field per schema; assess whether title on page 1 is user-supplied or auto-generated; likely auto from context).
  - [ ] Big idea box: bound idea name + lessoncount (same as lesson-plan-document, read-only + picker button via big-idea-picker.js).
  - [ ] Coverage links: "Curriculum coverage" section, list each {nodeId, coverage: "full"|"partial", note}. Editable via coverage-editor.js. Optional (FR-UAB-15).
  - [ ] Referencing lessons: derived list "Lessons using this assessment", scanned from lesson.assessmentLink.assessmentIds[] and .finalAssessment flag. Read-only (INV-DM-12, AD-UAB-4).
  - [ ] Matrix pointer: "Marked against: [Marking matrix reference]" (plain text citation, no scores/criteria/student data).

- [ ] **Render mini assessment header page**.
  - [ ] Same structure as final but for one mini from miniAssessments[].
  - [ ] Name: unitAssessment.miniAssessments[i].name (editable).
  - [ ] Big idea box: mini's own bigIdeaId binding (independent per mini, AD-37).
  - [ ] Coverage links: mini's own coverage[] array (independent per mini).
  - [ ] Referencing lessons: scan for lessons.assessmentLink.miniAssessmentIds[] (not .finalAssessment).
  - [ ] Weighting: optional, display if set (unitAssessment.miniAssessments[i].weighting).

- [ ] **Render tier pages** using tier-page-emission logic.
  - [ ] For each tier (pass → intermediate → advanced, fixed order):
    - [ ] Call shouldRenderTierPage(tier).
    - [ ] If true: emit one page with tier colour band, tier name, material, studentTask, workspaceLines, imageRefs (via document-shell.renderImage).
    - [ ] If false: skip.
  - [ ] Page count: "page 1 of N" (1 header + count of emitted tier pages).

- [ ] **Build mini assessment manager** in `mini-assessment-manager.js`.
  - [ ] UI section: list all miniAssessments[] by name.
  - [ ] Create button: opens form (name, big idea picker, optional weighting), on confirm saves new mini via local-store (FR-UAB-3).
  - [ ] Each mini row: name (editable in-place), edit button (open full editor), reorder controls (up/down to set explicit order field), delete button (with guard).
  - [ ] Edit: full form for name, big idea, weighting, coverage links.
  - [ ] Delete: refuse if any lesson's assessmentLink.miniAssessmentIds[] contains this mini's id (FR-UAB-16, name blocking lessons).
  - [ ] Reorder: update miniAssessments[i].order field, save via local-store (mirroring BigIdea.order pattern).

- [ ] **Build coverage editor** in `coverage-editor.js`.
  - [ ] Renders a list of {nodeId, coverage: "full"|"partial", note} entries.
  - [ ] Add button: opens picker over curriculum nodes (kind: outcome or task), sets coverage to "full" by default, optional note field. On confirm, append to coverage[].
  - [ ] Each entry: node code/title (read-only), coverage toggle (full ↔ partial), note (editable), delete button.
  - [ ] Refuse duplicate nodeId (FR-UAB-7, INV-DM-23): if user tries to add a node already in coverage[], show error "Already linked".
  - [ ] Edit in place: coverage state and note can be edited without remove-and-re-add (INV-DM-23 allows this).

- [ ] **Build assessment-lesson-links** in `assessment-lesson-links.js`.
  - [ ] Pure function: `function findReferencingLessons(assessmentId, assessmentKind, allLessons) → Lesson[]`
  - [ ] For each lesson in allLessons:
    - [ ] If assessmentKind === "final": check if lesson.assessmentLink.finalAssessment === true.
    - [ ] If assessmentKind === "mini": check if assessmentId is in lesson.assessmentLink.miniAssessmentIds[].
    - [ ] Collect matching lessons.
  - [ ] Return array (or empty if none).
  - [ ] Display in render: list by lesson number + lesson name (linked citations, no raw id).

- [ ] **Implement big-idea binding validation** (FR-UAB-5, AC-UAB-3).
  - [ ] Before save: check assessment.bigIdeaId is set and resolvable to a BigIdea or sub-BigIdea.
  - [ ] If missing or unresolvable: refuse save, show error "This assessment must be linked to a big idea" (no spec id).
  - [ ] Apply to both final and every mini (each has independent bigIdeaId).

- [ ] **Prevent final-assessment deletion** (FR-UAB-4, AC-UAB-2).
  - [ ] Final assessment: NO delete button, NO duplicate button, no affordance (not hidden confirm).
  - [ ] Mini assessments: full CRUD (create, read, update, reorder, delete with guard).

- [ ] **Image handling**.
  - [ ] For each imageRef in assessment.tiers[tier].imageRefs[]:
    - [ ] Call document-shell.renderImage(blob, x, y, width, height, svgElement).
    - [ ] Blob is null → placeholder.
    - [ ] Never embed base64 in unit.json (FR-UAB-11).

- [ ] **Edit-view forms**.
  - [ ] Final assessment header: name (if editable per schema), big idea picker button, coverage editor section, referencing lessons list (read-only).
  - [ ] Mini assessment list: create button, each mini has name (editable), edit (full form), reorder (up/down), delete (with guard).
  - [ ] Each mini edit form: name, big idea picker, weighting (optional), coverage editor.
  - [ ] Tier pages (edit mode): for each tier, material/studentTask as textarea, workspaceLines as number, imageRefs as draggable list.

- [ ] **Print CSS** in `unit-assessment-document.css` + import shared `assessment-tier-page.css`.
  - [ ] A4 portrait geometry via document-shell (AD-11).
  - [ ] Use style-guide tokens only (CSS-2).
  - [ ] Tier colour bands: same as lesson-plan-document (pass/intermediate/advanced).
  - [ ] Print colour-adjust: exact on tier backgrounds (FR-DS-11).
  - [ ] No `!important` (CSS-5).
  - [ ] Files under 150 lines (CSS-1).

- [ ] **Tests** in `test_unit-assessment-document.js`.
  - [ ] Import cleanly (TEST-1).
  - [ ] Happy path: create fixture final assessment + 2 mini assessments, render, assert 4-page structure (1 header + 3 tiers) (TEST-2).
  - [ ] Guard path 1: try to delete final assessment, assert delete button absent (TEST-7).
  - [ ] Guard path 2: try to save assessment with no bigIdeaId, assert error (TEST-7).
  - [ ] Guard path 3: try to delete mini assessment referenced by a lesson, assert error naming blocking lessons (TEST-7).
  - [ ] Coverage: add/remove coverage links, assert coverage[] updated correctly.
  - [ ] No assertions about "didn't crash"; assert actual output (TEST-6).

- [ ] **Code review gates**.
  - [ ] No reverse-edge stored: grep unit.json for "lessonIds" on assessment = empty (INV-DM-12, AC-UAB-5).
  - [ ] No raw ids in print: grep rendered SVG for bare nodeId/bigIdeaId UUIDs outside id=/data-* = empty (FR-UAB-10, AC-UAB-6).
  - [ ] No base64 images: fixture save + grep unit.json for base64 = empty (FR-UAB-11, AC-UAB-7).
  - [ ] No spec ids in UI: grep rendered strings for `FR-`, `AC-`, `INV-DM-`, `AD-` = empty (SR-9).
  - [ ] Final delete/duplicate controls absent or disabled (not hidden confirm) (AC-UAB-2).
  - [ ] Big-idea picker import verified (not reimplementation) (AD-UAB-3).
  - [ ] Tier-page-emission import verified (not reimplementation) (AD-LPB-1/AD-UAB-1 equivalent).

---

## 3. Interfaces

### Exports (used by other builds / the app)

```javascript
// unit-assessment-document.js
export class UnitAssessmentDocument {
  constructor(unitAssessment, allLessons, allBigIdeas, allNodes, mode = "final", miniIndex = 0) {
    // mode: "final" or "mini"
    // miniIndex: which mini assessment if mode="mini"
  }

  render(svgElement) {
    // Called by document-shell for each page (1 header + N tier pages)
  }

  setData(updatedUnitAssessment) {
    // Updates internal data, triggers re-render
  }

  exportSVG() {
    // Returns serialized SVG source
  }
}

// assessment-lesson-links.js
export function findReferencingLessons(assessmentId, assessmentKind, allLessons) {
  // @param assessmentKind: "final" | "mini"
  // @return Lesson[] (empty if none)
}

// mini-assessment-manager.js (UI component)
export function renderMiniAssessmentList(unitAssessment, onUpdate) {
  // @param onUpdate: callback(updatedUnitAssessment) after create/edit/reorder/delete
  // Renders list of minis with full CRUD
}

// coverage-editor.js (UI component)
export function renderCoverageEditor(assessment, allNodes, onUpdate) {
  // @param assessment: finalAssessment or one mini
  // @param onUpdate: callback(updatedAssessment) after add/edit/remove
  // Renders coverage[] editor with add/edit/remove controls
}
```

### Consumes (reads from other builds)

- **document-shell**: TIERS constant (colour definitions). renderImage() method. Page-render contract.
- **local-store**: read/write unitAssessment via PUT /api/unit.
- **bigidea-list**: shared big-idea-picker.js (IMPORTS). Query "how many lessons bind to big idea X" (FR-BI-6).
- **tier-page-emission.js**: SHARED shouldRenderTierPage() (imported from lesson-plan-document or shared).
- **image-paste**: ImageRef shape and images manifest (this build places, never writes).
- **curriculum-editor**: allNodes tree for coverage-editor node picker (read only).
- **lesson-plan-document** (indirect): reads allLessons to compute referencing-lessons list.
- **style-guide**: CSS tokens in variables.css.

### Contention (shared with lesson-plan-document)

- **tier-page-emission.js**: both builds MUST import, never duplicate.
- **big-idea-picker.js**: both builds MUST import (+ lesson-plan-generator also imports).
- Whichever build lands first, confirm these are extracted. Second build imports them. No duplication.

---

## 4. Verification

| AC # | Acceptance Criterion | Runnable Check |
|------|---------------------|---|
| AC-UAB-1 | Demo unit (1 final + 2 mini) renders in edit view and prints to A4 portrait PDFs, each 4 pages, fixed order | Manual: open demo, render PDF, measure page count. |
| AC-UAB-2 | Final delete/duplicate controls absent or disabled; mini create/edit/reorder/delete succeeds and persists | Manual UI test: open final (no delete/duplicate button visible), open mini list (create/reorder/delete all work). Save, reopen, verify persistence. |
| AC-UAB-3 | Save without bigIdeaId → refused, error names missing field | Manual: open assessment form, clear big idea, try save, confirm error message appears. |
| AC-UAB-4 | Adding curriculum link with duplicate nodeId → refused | Manual: coverage editor, try to add same node twice, confirm error "Already linked". |
| AC-UAB-5 | Saved unit.json has no `assessment.lessonIds` field anywhere | `grep "lessonIds" unit.json`. Must return nothing. |
| AC-UAB-6 | Print view shows node codes/titles, big-idea titles, lesson numbers as text; grep rendered SVG for bare UUID = empty | Manual print test: open PDF, inspect text (no UUID strings visible). Grep SVG source for UUID pattern outside id=/data-* = empty. |
| AC-UAB-7 | ImageRef placed in tier page renders in edit + print; missing file shows placeholder; no base64 in unit.json | Manual: paste image, save, reopen, inspect. Delete file, render, confirm placeholder. Grep unit.json for base64 = empty. |
| AC-UAB-8 | Physical/PDF print of final assessment: 4 pages, 210×297mm, margins match shell, tier colours match swatches | Manual print test: export PDF, measure with ruler/tool. |
| AC-UAB-9 | Grep for hex/rgb colour literal or `!important` outside variables.css = empty | `grep -r "#[0-9a-f]\{6\}\|!important" _template/app/css/unit-assessment-document.css`. Must return nothing (variables.css is exception). |
| AC-UAB-10 | `node:test` suite: import cleanly, happy-path create final+mini, one guard path (delete refusal or missing-big-idea save refusal) | `npm test test_unit-assessment-document.js`. All tests pass. |

---

## 5. Risks & Defaults

| Risk | Probability | Impact | Mitigation | Default |
|------|------------|--------|-----------|---------|
| Tier-page emission duplicated instead of imported | High | High: SR-4 / AD-LPB-1 violated | Import tier-page-emission.js from shared. Grep for import statement. | Verify `import { shouldRenderTierPage }` in this build; never define locally. |
| Big-idea picker reimplemented instead of imported | High | High: SR-4 / AD-UAB-3 violated | Import big-idea-picker.js from shared (AD-LPB-2). | Verify `import { openBigIdeaPicker }` in this build; never define locally. |
| Final assessment delete creeps in under schedule pressure | Medium | High: data loss risk, FR-UAB-4 violated | FR-UAB-4, AC-UAB-2: no delete button/control, period. | Delete button element never rendered. Code review checks. |
| Reverse-edge "lessonIds" stored on assessment (INV-DM-12 violated) | Low | High: AD-UAB-4 boundary violated, two reverse-link indexes | AD-UAB-4: compute referencing-lessons on load only via scan. Never store field. | Grep unit.json for "lessonIds" on assessment = empty (AC-UAB-5). |
| Raw UUIDs leak into print view | Low | Low: parent-facing document has raw id | FR-UAB-10, AC-UAB-6: all citations are human-readable text. Grep SVG. | grep for `^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}` outside id= = empty. |
| Spec ids leak into UI | Low | Low: developer text reaches teacher | SR-9: every message names visible field. Grep rendered strings. | grep `FR-UAB`, `AC-UAB`, `INV-DM` in error messages / labels = empty. |
| Print body type below 12pt floor (repeating logged defect) | Low | Medium: parent-facing print defect | style-guide tokens must be at floor before this build renders. | Do not set hardcoded font-size. Pull from style-guide only. Defer if tokens sub-floor. |

---

## 6. Notes & Handoff

- **Timeline:** Coordinate-with lesson-plan-document (same wave, same shapes, order does not matter). Sequenced before marking-matrix (this build's output feeds that build).
- **Schema reconciliation:** OQ-UAB-1 is resolved; datamodel.spec.md agrees on unitAssessment (singular finalAssessment + miniAssessments[] array) per AD-UAB-1. No further reconciliation needed.
- **Shared module extraction:** Confirm tier-page-emission.js and big-idea-picker.js are extracted by lesson-plan-document (or this build, if it lands first). Second landing imports them.
- **Coverage editor:** Coverage links are optional (FR-UAB-15), unlike lesson binding. An assessment can be created with empty coverage[]; it is valid.
- **Referencing lessons:** Computed on load by scanning allLessons[].assessmentLink. Never stored. If a lesson's link changes or is deleted, this list updates automatically on next render (no cache).
- **Print test:** Measure final assessment PDF (4 pages, margins, tier colours) before sign-off.
