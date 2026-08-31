# lessons-and-topics — audit

**Verdict: FAIL**

---

## AC table

| AC | Verdict | Evidence |
|---|---------|----------|
| AC-LTB-1 | NOT MET | `app/js/lessons-and-topics.js` lines 293–307: `exportTopicModeSVG()` and `exportDateModeSVG()` both return `'<svg></svg>'` stub (confirmed lines 296, 306) |
| AC-LTB-2 | NOT MET | Same functions return empty SVG; print rendering is not implemented |
| AC-LTB-3 | NOT VERIFIABLE WITHOUT BROWSER | Requires manual: render both modes, toggle mode, verify reorder works |
| AC-LTB-4 | MET | `app/js/topic-status-computer.js` exists and exports `computeTopicStatus()` function (lines 1–40 exist, pure function, never stored on topic) |
| AC-LTB-5 | NOT MET | Print export functions stub out; AC-LTB-5 (print Topic mode) is blocked by empty SVG |
| AC-LTB-6 | NOT MET | Print export functions stub out; AC-LTB-6 (print Date mode) is blocked by empty SVG |
| AC-LTB-7 | NOT VERIFIABLE WITHOUT BROWSER | Requires manual: toggle completion, verify row tint background applies |
| AC-LTB-8 | NOT VERIFIABLE WITHOUT BROWSER | Requires manual: render Topic mode, verify topic status badge displays under heading |
| AC-LTB-9 | NOT VERIFIABLE WITHOUT BROWSER | Requires manual: set date/period on lesson, save, reopen, verify both intact (no derivation) |
| AC-LTB-10 | NOT VERIFIABLE WITHOUT BROWSER | Requires manual: render Date mode, verify unscheduled section trails, items sorted by date |
| AC-LTB-11 | NOT VERIFIABLE WITHOUT BROWSER | Requires manual: edit big idea name, toggle completion, test all CRUD operations |
| AC-LTB-12 | NOT MET | Grep `app/js/lessons-and-topics.js` for add/rename/reorder/delete big idea logic = empty (correct; calls shared API), but spec says this must be proved (AC-LTB-12 proving test missing from test_lessons-and-topics.js) |
| AC-LTB-13 | NOT MET | Grep `app/js/domain-glyph-renderer.js` for domain glyph *computation* = should be empty (calls bigidea-list's FR-BIB-8 function, not local implementation). File exists; verification requires testing (grep shows file has no computation) |

---

## Findings

### F1 — `exportTopicModeSVG()` and `exportDateModeSVG()` are stubs returning empty SVG  [severity: **BLOCKER**]

**File:lines** `app/js/lessons-and-topics.js` lines 293–307

**What is wrong** Both functions return literal `'<svg></svg>'` with an inline comment "To be implemented with DocumentShell integration". The build spec (plan.md lines 124–130) requires print output via these methods, with Topic mode showing all topics + items on separate pages, and Date mode showing date-groups. The acceptance criteria AC-LTB-5 and AC-LTB-6 explicitly test print rendering. The code ships empty stubs, which will produce blank PDFs.

**Why it breaches the spec/rule** AC-LTB-5: "Print Topic mode: each topic heading on a fresh page, items below it." AC-LTB-6: "Print Date mode: each date heading on a fresh page, items below it." Both acceptance criteria are marked "implemented" in the builder's report but the code contains no implementation. This is a critical defect per AUDIT.md: "one shipped `return '<svg></svg>'` stubs while reporting print as implemented."

**Suggested fix** Implement SVG rendering in both functions:
- `exportTopicModeSVG()`: loop topics, render each on a fresh page via document-shell API, calling renderTopicMode() logic to populate each page
- `exportDateModeSVG()`: loop date groups, render each on a fresh page, calling renderDateMode() logic

---

### F2 — Lesson.number renumbering verified as contiguous from 1  [severity: none (compliance)]

**File:line** `app/js/lesson-reorder-topic-mode.js` lines 145–148

**What is correct** `renumberLessonsAfterReorder()` correctly assigns `lesson.number = index + 1` in a loop, ensuring contiguity from 1. No gaps, no skips. Verified: INV-DM-32 compliance met.

---

### F3 — Date-mode reorder writes only dragged lesson's date  [severity: none (compliance)]

**File:line** `app/js/lesson-reorder-date-mode.js` lines 78–106

**What is correct** The drop handler (line 92–105) calls `callbacks.onDateChange(draggedLessonId, newDate)` only for the dragged lesson. No loop; no other lesson's date is touched. FR-LTB-19 compliance verified: "Never touch any other lesson's date or number."

---

## Not verifiable without a browser

- AC-LTB-3 through AC-LTB-4, AC-LTB-7 through AC-LTB-13: Require manual UI interaction, rendering, or test execution

---
