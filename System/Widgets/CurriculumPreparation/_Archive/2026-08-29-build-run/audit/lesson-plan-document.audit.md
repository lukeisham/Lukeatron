# lesson-plan-document — audit

**Verdict: FAIL**

---

## AC table

| AC | Verdict | Evidence |
|---|---------|----------|
| AC-LPB-1 | MET | test_lesson-plan-document.js lines 152–161: fixture with 0 tiers renders 1 page |
| AC-LPB-2 | MET | test_lesson-plan-document.js lines 163–181: fixture with 1 tier renders 2 pages |
| AC-LPB-3 | MET | test_lesson-plan-document.js lines 183–198: fixture with 3 tiers renders 4 pages |
| AC-LPB-4 | NOT VERIFIABLE WITHOUT BROWSER | Requires manual A4 print measurement |
| AC-LPB-5 | MET | lesson-plan-document.js lines 66–68: big idea box displays name + lesson count |
| AC-LPB-6 | MET | grep lesson-plan-document.js for "bigIdea\[" or ".title =" or ".coverage" on BigIdea = empty (no writes to BigIdea fields) |
| AC-LPB-7 | MET | lesson-plan-document.js lines 149–162: sidebar renders only if non-empty; fixture test verifies |
| AC-LPB-8 | MET | lesson-plan-document.js lines 58–63: topic resolved and rendered above big idea |
| AC-LPB-9 | NOT VERIFIABLE WITHOUT BROWSER | Requires manual image paste + file deletion test |
| AC-LPB-10 | NOT VERIFIABLE WITHOUT BROWSER | Requires manual PDF print measurement |
| AC-LPB-11 | NOT VERIFIABLE WITHOUT BROWSER | Requires manual font-size measurement on printed output |
| AC-LPB-12 | MET | npm test passes all 3 cases (import, happy path, tier-emission guard) |

---

## Findings

### F1 — FR-LPB-13 (provenance: "edited" transition) not implemented  [severity: **BLOCKER**]

**File:line** `app/js/lesson-plan-document.js` (entire file, no provenance handler found)

**What is wrong** The build spec requires on-first-edit transition from `provenance: "generated"` to `provenance: "edited"` (FR-LPB-13, plan.md lines 78–83). The code has no mechanism to detect edits on any field (big idea binding, sidebar, key example, practice question, tier fields) and set the transition. Spec says "On first manual edit to any field where lesson.provenance is 'generated': Set provenance: 'edited'. Write to local-store." This entire feature is missing.

**Why it breaches the spec/rule** FR-LPB-13 is a hard requirement. lesson-plan-generator writes `provenance: "generated"`, and this build owns the only path that can transition it to `provenance: "edited"` (per plan.md, line 82: "lesson-plan-generator writes 'generated'; external creation writes 'manual'"). Without this transition, all generated lessons remain marked as "generated" even after manual edits, breaking the regenerate guard (FR-LPG-7, which forbids regenerate on "edited" lessons).

**Suggested fix** Add a `markEdited()` method to LessonPlanDocument class; call it whenever any field-edit handler saves via local-store. Check if `lesson.provenance === "generated"` before saving; if true, set `provenance: "edited"` before writing.

---

### F2 — transitive-topic.js is dead code  [severity: **major**]

**File:line** `app/js/transitive-topic.js` entire module

**What is wrong** The module is imported only by its own test (`test_lesson-plan-document.js` line 117–120). It is never imported by `lesson-plan-document.js`, which instead directly imports `resolveTopic` from `bigidea-list.js` (line 10). The transitive-topic.js implementation also has a bug: it calls `resolveTopic(lesson.id, [lesson], allBigIdeas)` on line 31, fabricating a dummy array containing only the current lesson, whereas `resolveTopic` expects `allLessons[]` to search for context. This is a wrapper function that adds no value.

**Why it breaches the spec/rule** Vibe rule (AUDIT.md "Dead code / stubs"): "a module nothing imports" is dead code and should not ship. The test only tests the module's own export, not its integration with lesson-plan-document. The module was likely intended to be used per plan.md line 37 but was superseded by direct `bigidea-list` integration before submission.

**Suggested fix** Delete `transitive-topic.js` and its test cases (lines 117–120 in test_lesson-plan-document.js).

---

### F3 — CSS files not referenced / no styling applied  [severity: **major**]

**File:line** `css/lesson-plan-document.css` (line 1–60), `css/tier-page.css` (line 1–53)

**What is wrong** Both CSS files exist in `_template/css/` (per AUDIT.md known-issue list, they sit in a stray top-level folder unreferenced). The build spec (plan.md lines 84–91) requires print CSS with style-guide tokens and tier colour bands. No `<link>` or `<style>` tag imports these files in lesson-plan-document.js. The rendered SVG will have no formatting applied—no font sizes, no colors (hardcoded in SVG inline attributes instead per lines 74, 156 which use `fill="#..."` and `style="..."` directly). Users will see unstyled plain text, violating FR-LPB-11 (body type ≥12pt) and FR-DS-11 (print-color-adjust).

**Why it breaches the spec/rule** The spec mandates CSS-2 (all colours from variables.css tokens) and CSS-1 (files <150 lines). The code is generating SVG with hardcoded hex and CSS is not loaded, so the CSS vibe rules are meaningless—the spec cannot be met.

**Suggested fix** Either: (a) inject CSS via a `<style>` tag within each SVG page before rendering, or (b) move rendering to a document-shell method that handles CSS loading. Per the known-issue list, this folder repair is already queued; do not re-report the folder, but the document has no styling as a result.

---

## Not verifiable without a browser

- AC-LPB-4: Page 1 geometry (clipping test) requires rendering to PDF and measuring
- AC-LPB-9: Image rendering + missing-file placeholder requires manual paste/delete/render test
- AC-LPB-10: A4 portrait page dimensions, margins, tier colours require PDF measurement
- AC-LPB-11: Font size ≥12pt requires measuring rendered text on printed output

---
