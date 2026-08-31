# lesson-plan-generator — Execution Plan

**Spec Date:** 2026-08-22 | **Build Type:** Wave 3 | **Wave Status:** Gated on Q-5 (ergonomics measurement)

---

## 1. Files

All files live under `_template/app/`.

| Path | Purpose | Lines |
|------|---------|-------|
| `js/lesson-plan-generator.js` | Main UI: picker (nodes + big idea), generate button, regenerate control (appears only on "generated" lessons). ~200 lines. | ~200 |
| `js/lesson-generator-core.js` | Pure logic: generate lesson record from selected nodes + big idea. No DOM, no side effects. ~100 lines. | ~100 |
| `js/node-picker.js` | Shared helper: render node multi-select (checkboxes or list) over curriculum tree. ~80 lines. | ~80 |
| `css/lesson-plan-generator.css` | Picker layout, picker button styles, disabled/enabled states. ~90 lines. | ~90 |
| `tests/test_lesson-plan-generator.js` | Smoke tests: import, happy-path generate (one node + big idea), multi-node generate, regenerate guard (provenance). ~60 lines. | ~60 |

**Critical:** Do NOT build a new big-idea picker. IMPORT `big-idea-picker.js` (shared, built by lesson-plan-document or unit-assessment-document). Do NOT build a new node picker. Build node-picker.js as a thin wrapper over curriculum-editor's tree data; do not duplicate tree-walk logic.

---

## 2. Steps

- [ ] **Build node-picker helper** in `node-picker.js`.
  - [ ] Accept allNodes (curriculum tree) and currently-selected nodeIds.
  - [ ] Render multi-select interface (checkboxes over tree nodes, or flattened list with checkboxes).
  - [ ] Only permit selecting `kind: outcome` or `kind: task` (not strand) per FR-LPG-1.
  - [ ] Return array of selected nodeIds on confirm, empty array on cancel.
  - [ ] No tree-walk logic (use curriculum-editor's existing tree traversal).

- [ ] **Build pure generator logic** in `lesson-generator-core.js`.
  - [ ] `function generateLesson(selectedNodeIds, selectedBigIdeaId, allLessons, allNodes, allBigIdeas) → Lesson`
  - [ ] Create new lesson record with:
    - [ ] `id`: generated via `newId("les-")` (from app/js/ids.js, AD-BOSS-1).
    - [ ] `number`: next contiguous after max(allLessons.map(l => l.number)), never reorder existing.
    - [ ] `nodeIds`: copy selectedNodeIds (array).
    - [ ] `bigIdeaId`: copy selectedBigIdeaId (string, mandatory per INV-DM-15).
    - [ ] `keyExample`: text quoted/adapted from selected node(s)' own .text (FR-LPG-5, FR-LPG-11).
    - [ ] `practiceQuestion`: text quoted/adapted from selected node(s)' own .text (FR-LPG-5, FR-LPG-11).
    - [ ] `assessmentLink`: empty `{ miniAssessmentIds: [], finalAssessment: false, note: null }` (FR-LPG-6).
    - [ ] `tiers`: empty `{ pass: {...}, intermediate: {...}, advanced: {...} }` with material/studentTask/workspaceLines/imageRefs all empty (FR-LPG-6).
    - [ ] `sidebar`: null (FR-LPG-6).
    - [ ] `completed`: false.
    - [ ] `date`: null.
    - [ ] `lessonPeriod`: null.
    - [ ] `provenance`: "generated" (FR-LPG-4, never "edited" or "manual").
    - [ ] `bigIdeaNote`: null.
    - [ ] `imageRefs`: [] (FR-LPG-6).
  - [ ] Return the new lesson record (do not save; caller saves via local-store).

- [ ] **Implement text composition** (FR-LPG-5, FR-LPG-11).
  - [ ] Single node: `keyExample` and `practiceQuestion` are direct quotes or light adaptations of node.text.
  - [ ] Multiple nodes: concatenate each node's text, clearly separated by node code (e.g. "**VC2M8N01:** [text1]\n\n**VC2M8N02:** [text2]").
  - [ ] Never paraphrase, summarise, or generate beyond simple templating (no model call per AD-9).
  - [ ] If a node's .text is blank, use node.title instead as fallback.
  - [ ] Keep the text verbatim or lightly adapted (trim whitespace, fix obvious typos if any) — never reorganise.

- [ ] **Implement regenerate logic** in `lesson-generator-core.js`.
  - [ ] `function regenerateLesson(lessonId, selectedNodeIds, selectedBigIdeaId, allLessons, allNodes, allBigIdeas) → Lesson`
  - [ ] Load existing lesson by id.
  - [ ] Check lesson.provenance == "generated" (if not, caller must refuse the action).
  - [ ] Update only: nodeIds, bigIdeaId, keyExample, practiceQuestion.
  - [ ] Leave unchanged: number, tiers, sidebar, assessmentLink, imageRefs, date, lessonPeriod, completed, provenance (stays "generated"), bigIdeaNote.
  - [ ] Return updated lesson record (do not save; caller saves via local-store).

- [ ] **Build UI** in `lesson-plan-generator.js`.
  - [ ] Modal or panel with three sections:
    1. Node picker: call node-picker.js. Allow 0..N selection (guard: must select ≥1 before confirm, FR-LPG-1).
    2. Big idea picker: call big-idea-picker.js (shared, AD-LPB-2). Allow exactly 1 selection (guard: must select exactly 1 before confirm).
    3. Action buttons: "Generate" (enabled only if both selections valid), "Cancel".
  - [ ] On "Generate" confirm:
    - [ ] Call generateLesson() from lesson-generator-core.js.
    - [ ] Save new lesson via local-store (PUT /api/unit with updated unit.json).
    - [ ] On success: close picker, reload lesson plan document (or emit event).
    - [ ] On error: show error message, remain in picker.

- [ ] **Implement regenerate control**.
  - [ ] On any lesson whose provenance === "generated":
    - [ ] Show regenerate button/link (e.g. "Regenerate from template") in edit view.
    - [ ] On click: open same picker as generate, pre-fill with lesson's current nodeIds + bigIdeaId.
    - [ ] On confirm:
      - [ ] Call regenerateLesson() from lesson-generator-core.js.
      - [ ] Save updated lesson via local-store.
      - [ ] On success: close picker, reload lesson plan document.
      - [ ] On error: show error, remain in picker.
  - [ ] On any lesson whose provenance === "edited" or "manual":
    - [ ] NO regenerate button, no control, no affordance (FR-LPG-7, AC-LPG-5).
    - [ ] Grep rendered UI for regenerate control on edited fixture = empty (proving test).

- [ ] **Validation & guards** (FR-LPG-1, AC-LPG-3).
  - [ ] Before generate/regenerate confirm:
    - [ ] Require selectedNodeIds.length ≥ 1 (refuse action if empty).
    - [ ] Require selectedBigIdeaId is not null (refuse action if unset).
    - [ ] If either missing: keep "Generate" button disabled (not a hidden confirm-and-fail).
    - [ ] Show validation message: "Select at least one curriculum node" / "Select a big idea" (plain text, no spec ids).

- [ ] **Numbering contract** (FR-LPG-2, AC-LPG-1/2).
  - [ ] Next number = `Math.max(...allLessons.map(l => l.number), 0) + 1`.
  - [ ] Never reorder existing lessons, never fill gaps, never decrement.
  - [ ] Second generate call immediately after first appends with next+1, no collision.

- [ ] **Offline-only** (FR-LPG-8, AC-LPG-7).
  - [ ] No network call beyond local-store's own save (within same origin, no outbound HTTP).
  - [ ] No model call, no API call, no prompt, no LLM mention anywhere (AC-LPG-8 proving test).
  - [ ] Grep this build for: "fetch(", "api.openai", "claude", ".prompt", ".model", "LLM" = empty.

- [ ] **Tests** in `test_lesson-plan-generator.js`.
  - [ ] Import cleanly (TEST-1).
  - [ ] Happy path: call generateLesson(fixtures), assert returned lesson has correct number, nodeIds, bigIdeaId, keyExample non-blank, provenance="generated" (TEST-2).
  - [ ] Multi-node: call generateLesson with 2 nodes, assert keyExample concatenates both with node codes separating (FR-LPG-11).
  - [ ] Guard path: call regenerateLesson on lesson with provenance="edited", assert no changes / error (TEST-7).
  - [ ] No network calls logged.

- [ ] **CSS** in `lesson-plan-generator.css`.
  - [ ] Picker layout: label + control pairs, vertical stack.
  - [ ] Button states: enabled (normal), disabled (greyed out when guards not met).
  - [ ] Use style-guide tokens only; no hardcoded colours (CSS-2).
  - [ ] Under 150 lines (CSS-1).

- [ ] **Code review gates**.
  - [ ] No network/model/API calls: grep for `fetch`, `api`, `openai`, `claude`, `.prompt`, `.model`, `LLM` = empty (AC-LPG-7/8).
  - [ ] No spec ids in UI: grep rendered strings for `FR-`, `AD-`, `AC-`, `INV-DM-` = empty (SR-9).
  - [ ] Regenerate unavailable on edited lesson: fixture with provenance="edited", grep rendered UI for regenerate affordance = empty (AC-LPG-5).
  - [ ] Shared picker import: grep this build for `big-idea-picker.js` import (not a reimplementation).

---

## 3. Interfaces

### Exports (used by other builds / the app)

```javascript
// lesson-generator-core.js
export function generateLesson(
  selectedNodeIds,          // string[]
  selectedBigIdeaId,        // string
  allLessons,               // Lesson[]
  allNodes,                 // Node[]
  allBigIdeas               // BigIdea[]
) {
  // @return new Lesson record (does not save; caller calls local-store)
  // Throws if selectedNodeIds empty or selectedBigIdeaId is null
}

export function regenerateLesson(
  lessonId,                 // string
  selectedNodeIds,          // string[]
  selectedBigIdeaId,        // string
  allLessons,               // Lesson[]
  allNodes,                 // Node[]
  allBigIdeas               // BigIdea[]
) {
  // @return updated Lesson record (does not save; caller calls local-store)
  // Throws if lesson.provenance !== "generated"
  // Throws if selectedNodeIds empty or selectedBigIdeaId is null
}

// lesson-plan-generator.js (main UI)
export function openLessonGenerator(allLessons, allNodes, allBigIdeas, onConfirm) {
  // @param onConfirm: callback(newLesson) after save succeeds
  // Opens modal picker, returns Promise resolving when user confirms or cancels
}

export function showRegenerateControl(lesson, allLessons, allNodes, allBigIdeas, onConfirm) {
  // Conditionally renders "Regenerate" button only if lesson.provenance === "generated"
  // On click: opens picker pre-filled with lesson's current selections
  // @param onConfirm: callback(updatedLesson) after save succeeds
}

// node-picker.js
export function openNodePicker(allNodes, currentNodeIds = []) {
  // @return Promise resolving to array of selected nodeIds (empty array if cancel)
  // Renders only kind: outcome | task (not strand)
}
```

### Consumes (reads from other builds)

- **lesson-plan-document**: reads `provenance` field state to decide if regenerate is available. Does not write.
- **bigidea-list**: shared big-idea-picker.js (IMPORTS, does not reimplement).
- **curriculum-editor**: reads curriculum tree (allNodes), never writes.
- **local-store**: on generate/regenerate confirm, PUT /api/unit with entire unit.json (including new/updated lesson).

### Contention

**No extraction needed.** This build only consumes shared modules (big-idea-picker.js from lesson-plan-document or unit-assessment-document; node-picker.js is internal and local).

---

## 4. Verification

| AC # | Acceptance Criterion | Runnable Check |
|------|---------------------|---|
| AC-LPG-1 | Generate from 1 node + 1 big idea → valid Lesson with nodeIds, bigIdeaId, non-blank keyExample/practiceQuestion, provenance="generated", empty tiers/sidebar/assessmentLink/imageRefs, next number | `test_lesson-plan-generator.js`: call generateLesson(fixtures), assert all fields. |
| AC-LPG-2 | Two successive generates → numbers contiguous (1, 2, never duplicate or skip) | `test_lesson-plan-generator.js`: call generateLesson twice with different fixtures, assert numbers 1 and 2. |
| AC-LPG-3 | Generate with no node selected, or no big idea selected → action unavailable (disabled button, not confirm-and-fail) | Manual UI test: open picker, select only big idea (no nodes), confirm button disabled. Select only nodes (no big idea), confirm button disabled. |
| AC-LPG-4 | Regenerate fixture still at provenance="generated" → replaces nodeIds, bigIdeaId, keyExample, practiceQuestion; number unchanged | `test_lesson-plan-generator.js`: call regenerateLesson(fixtures), assert only those 4 fields changed, number same. |
| AC-LPG-5 | Fixture lesson with provenance="edited" shows no regenerate affordance; grep UI = empty | Fixture: manually edit one field, provenance flips to "edited". Render UI, grep for "regenerate" / "Regenerate" / "re-generate" = empty. |
| AC-LPG-6 | Fixture with distinctive fixture node text appears (verbatim or lightly adapted) in keyExample or practiceQuestion | Manual test: create fixture node with known text, generate, inspect saved lesson.keyExample / .practiceQuestion for that text. |
| AC-LPG-7 | Network disabled, all requests logged, generate + regenerate = zero outbound requests (except local-store save, same-origin) | Gate test: disable network, open dev tools, generate + regenerate, inspect Network tab. Zero cross-origin requests. |
| AC-LPG-8 | Grep build for model call / API call / prompt string / LLM mention = empty | `grep -r "fetch\|api\|openai\|claude\|\.prompt\|\.model\|LLM" _template/app/js/lesson-plan-generator.js _template/app/js/lesson-generator-core.js`. Must return nothing. |

---

## 5. Risks & Defaults

| Risk | Probability | Impact | Mitigation | Default |
|------|------------|--------|-----------|---------|
| Regenerate creeps into overwriting "edited" lessons under schedule pressure | Medium | High: FR-LP-9 no-clobber rule violated, teacher data loss | AD-LPG-1/2: regenerate button is absent (not confirm-guarded) on edited lessons. AC-LPG-5's grep proof. | Never add a "Regenerate anyway" override or warning dialog. Button simply does not exist on edited lessons. |
| Model call slips in "just to make the draft better" | Low | Critical: AD-9 / FR-SYS-1 violated | FR-LPG-8, AC-LPG-7/8: network-disabled gate test + grep proof. | No LLM prompts, no API clients, no "model" variable anywhere. Test with network disabled. |
| Number collision or skip on generate (INV-DM-32 broken) | Low | High: lesson citation breaks | FR-LPG-2: next = max(...) + 1. Tested (AC-LPG-1/2). | Compute contiguous number every time, never cache or assume prior state. |
| Big-idea picker reimplemented instead of imported | Low | High: SR-4, AD-LPB-2, AD-LPG-1 violation | Import `big-idea-picker.js` from shared build. Grep for `openBigIdeaPicker(` import. | Pre-submission: verify import statement exists, no local picker logic. |
| Text composition attempts paraphrase/summarise instead of quoting (AD-9 violated) | Low | Medium: generated lessons sound invented | AD-LPG-3: quote verbatim or lightly adapt node.text only. No model call. | AC-LPG-6: fixture node text must appear verbatim in generated lesson. Do not rewrite. |
| Spec ids leak into picker UI (SR-9) | Low | Low: developer text reaches teacher | SR-9: every message names visible field, not spec id. Grep rendered strings. | grep for `FR-LPG`, `AC-LPG`, `INV-DM`, `AD-LPG` in error messages / labels = empty. |

---

## 6. Notes & Handoff

- **Timeline:** Sequenced AFTER lesson-plan-document (reads provenance state that build writes). No other sequencing constraint.
- **Q-5 measurement:** This build's acceptance criteria (generate time, usability, drafted-then-edited workflow) are half of Q-5's ergonomics answer. Run Q-5 once both lesson-plan-generator and crib-sheet-generator (FR-CSB-2) are built.
- **Offline requirement:** No network call, no model call, no outbound request. Gate test: disable network, confirm generate + regenerate still work with zero cross-origin requests.
- **Shared big-idea picker:** IMPORT from shared module built by lesson-plan-document or unit-assessment-document (whichever lands first). Do not reimplement.
- **Provenance handling:** This build writes "generated" only. lesson-plan-document writes "edited" on first edit. Teacher can manually create lessons with provenance="manual". Respect all three states.
