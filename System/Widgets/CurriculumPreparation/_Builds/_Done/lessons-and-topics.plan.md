# lessons-and-topics — Execution Plan

**Spec Date:** 2026-08-22 | **Build Type:** Wave 3 | **Wave Status:** Gated (not a seventh part; FR-TOP-8b, AD-42)

---

## 1. Files

All files live under `_template/app/`.

| Path | Purpose | Lines |
|------|---------|-------|
| `js/lessons-and-topics.js` | Main page model: grouping mode state, reorder/complete/schedule logic, render loop. ~250 lines. | ~250 |
| `js/lessons-and-topics-renderer.js` | Render view in both Topic and Date grouping modes. ~200 lines. | ~200 |
| `js/lesson-reorder-topic-mode.js` | Topic-mode drag-to-reorder: writes Lesson.number (INV-DM-32). ~80 lines. | ~80 |
| `js/lesson-reorder-date-mode.js` | Date-mode drag-to-reorder: writes only dragged lesson's date (FR-LTB-18…21, AD-LTB-5). ~100 lines. | ~100 |
| `js/topic-status-computer.js` | Pure function: computes topic status (not started/in progress/complete) from all items under it (AD-LTB-4). ~40 lines. | ~40 |
| `js/assessment-lesson-grouper.js` | Helper: places assessments under their topics via bigidea-list's shared resolver (FR-BIB-17). ~30 lines. | ~30 |
| `js/domain-glyph-renderer.js` | Calls bigidea-list's shared FR-BIB-8 function to render domain glyphs (skill/knowledge). ~30 lines. | ~30 |
| `css/lessons-and-topics.css` | Layout: topic card containers, lesson/assessment rows, completion dot + tint, grouping mode styles. ~150 lines. | ~150 |
| `css/lessons-and-topics-print.css` | @page rules, page breaks between topics only, print-only styles. ~80 lines. | ~80 |
| `tests/test_lessons-and-topics.js` | Smoke tests: import, render both modes, reorder (Topic mode), reorder (Date mode), completion flag, topic status compute. ~80 lines. | ~80 |

**Critical:** Do NOT implement big-idea/topic edit logic. Call bigidea-list's shared API (AD-LTB-1). Do NOT compute domain glyphs; call bigidea-list's FR-BIB-8 function (AD-BI-2). Do NOT resolve topics locally; call FR-BIB-17 (AD-LTB-2 posture).

---

## 2. Steps

- [ ] **Build main page model** in `lessons-and-topics.js`.
  - [ ] Constructor: accepts allLessons, allMiniAssessments, finalAssessment, allBigIdeas, allTopics, allNodes.
  - [ ] State: groupingMode ("topic" or "date"), all data references (no copy; work with original).
  - [ ] Methods:
    - [ ] `toggleGroupingMode()`: switch between "topic" and "date", trigger re-render.
    - [ ] `markLessonComplete(lessonId, completed)`: set lesson.completed, save via local-store.
    - [ ] `markMiniAssessmentComplete(miniId, completed)`: set miniAssessment.completed, save.
    - [ ] `markFinalAssessmentComplete(completed)`: set unitAssessment.finalAssessmentCompleted, save.
    - [ ] `setLessonDate(lessonId, date)`: set lesson.date (ISO or null), save.
    - [ ] `setLessonPeriod(lessonId, period)`: set lesson.lessonPeriod (freeform or null), save.
    - [ ] `setMiniAssessmentDate(miniId, date)`: set mini.date, save.
    - [ ] `setMiniAssessmentPeriod(miniId, period)`: set mini.lessonPeriod, save.
    - [ ] `setFinalAssessmentDate(date)`: set unitAssessment.finalAssessmentDate, save.
    - [ ] `setFinalAssessmentPeriod(period)`: set unitAssessment.finalAssessmentPeriod, save.
    - [ ] `reorderLessonsTopicMode(lessonId, newPosition)`: renumber all affected lessons (INV-DM-32), save.
    - [ ] `reorderLessonDateMode(lessonId, targetDateHeading)`: set lesson.date to match heading, save (FR-LTB-18).

- [ ] **Implement topic-mode drag reorder** in `lesson-reorder-topic-mode.js`.
  - [ ] On drag start: identify source lesson, its current position.
  - [ ] On drag over: show insertion point marker.
  - [ ] On drop: compute new position, renumber affected lessons (source + all after in current sequence).
  - [ ] Renumbering algorithm:
    - [ ] Collect all lesson numbers, sort by current position.
    - [ ] Reassign 1..N contiguously to new positions.
    - [ ] Save all affected lessons via local-store (single PUT with entire unit.json, not per-lesson).
  - [ ] Verify: all numbers unique, contiguous from 1, zero skips/collisions (INV-DM-32).

- [ ] **Implement date-mode drag reorder** in `lesson-reorder-date-mode.js` (AD-LTB-5).
  - [ ] On drag start: identify source lesson (dragged item).
  - [ ] On drag over: show insertion point marker (within a date-group heading).
  - [ ] On drop:
    - [ ] If dropped before first date heading: set dragged lesson's date to first heading's date (FR-LTB-20).
    - [ ] If dropped between two date headings: set to the next date heading's date (FR-LTB-18).
    - [ ] If dropped after last date heading, before "Unscheduled": set to last heading's date (FR-LTB-20).
    - [ ] If dropped into "Unscheduled": clear lesson's date to null (FR-LTB-20).
    - [ ] Never touch any other lesson's date or number (FR-LTB-19).
    - [ ] Save dragged lesson only via local-store.
  - [ ] Result: dragged lesson joins the target date-group, sorted by unit order within the group (FR-LTB-12).

- [ ] **Build topic-status computer** in `topic-status-computer.js`.
  - [ ] Pure function: `function computeTopicStatus(topicId, allLessons, allMiniAssessments, finalAssessment, bigIdeas) → "not started" | "in progress" | "complete"`
  - [ ] Algorithm (AD-LTB-4, grouping-independent):
    1. Collect every lesson + mini + final assessment bound to this topic (via FR-BIB-17 resolution).
    2. If none: return "not started" (optional topics are OK).
    3. If all completed: return "complete".
    4. If some completed: return "in progress".
    5. If none completed: return "not started".
  - [ ] Runs on every render; never stored on topic (FR-TOP-11).

- [ ] **Build assessment-lesson grouper** in `assessment-lesson-grouper.js`.
  - [ ] Helper: scan allMiniAssessments + finalAssessment, resolve each to a topic via FR-BIB-17.
  - [ ] Return map: topicId → [lessons + assessments under that topic].
  - [ ] Assessments are placed independently per their own bigIdeaId (AD-37), not grouped with lessons that reference them.

- [ ] **Build renderer** in `lessons-and-topics-renderer.js`.
  - [ ] Accepts allData, groupingMode ("topic" or "date").
  - [ ] **Topic mode** (default, FR-LTB-1):
    - [ ] For each topic in unit order:
      - [ ] Render topic heading + status badge (color-coded: complete/in-progress/not-started).
      - [ ] Collect all lessons bound to this topic (via FR-BIB-17).
      - [ ] Collect all assessments bound to this topic (via their own bigIdeaId).
      - [ ] Sort all items by lesson/assessment number (or date if that field exists, but primary sort is unit sequence).
      - [ ] For each item (lesson or assessment):
        - [ ] Render row: completion dot (filled/hollow based on .completed), lesson/assessment number or name, big-idea reference (with domain glyphs from FR-BIB-8), date (if set), period (if set).
        - [ ] Make row clickable to edit or expand.
    - [ ] Topic status computed via topic-status-computer, displayed under heading (FR-TOP-10, FR-LTB-8).
  - [ ] **Date mode** (FR-TOP-14a, toggled by user):
    - [ ] Group by date (ISO): one heading per unique lesson.date / mini.date / final.date value.
    - [ ] Sort groups by date (earliest first).
    - [ ] Trailing "Unscheduled" heading for items with no date (FR-LTB-12).
    - [ ] Within each group: sort by unit order (lesson number for lessons, .order for minis).
    - [ ] For each item: include topic as in-row label (not heading) (FR-LTB-12).
    - [ ] Topic status NOT displayed in Date mode (FR-TOP-14b, AD-LTB-4); only shown in Topic mode.

- [ ] **Render rows** (common to both modes).
  - [ ] Completion dot: circle (9px), filled when completed (colour: completion tint from style-guide), hollow + border when not.
  - [ ] Tag: "L1"–"LN" for lessons (lesson.number), "MINI" for mini assessments, "FINAL" for final assessment.
  - [ ] Label: name (for mini/final) or big-idea reference (for lessons, with domain glyphs).
  - [ ] Date pill (if set): ISO date (YYYY-MM-DD), styled with date-accent colour from style-guide.
  - [ ] Period pill (if set): freeform lessonPeriod text, styled with period-accent colour.
  - [ ] Row background: tinted when completed (same colour as completion tint), white when not (FR-LTB-7).

- [ ] **Build edit-view controls** (in-place on the page).
  - [ ] Completion dot: click to toggle completed flag (immediate save).
  - [ ] Date field: click to open date picker (or text input), save on blur.
  - [ ] Period field: click to edit text, save on blur.
  - [ ] Drag handle: visible on every row, enabled for reorder (drag to reorder within current mode).
  - [ ] Delete/edit buttons (if building a full edit panel).

- [ ] **Build big-idea/topic edit controls** (calling bigidea-list's shared API per AD-LTB-1).
  - [ ] Any button to add/rename/reorder/reparent/delete a big idea or topic:
    - [ ] Call `bigidea-list.sharedWriteAPI()` (the exact function signature depends on AD-BI-1, not specced here; TBD by bigidea-list).
    - [ ] Never implement edit logic locally (AD-LTB-1, proving test AC-LTB-12).

- [ ] **Build print output** (A4 portrait, unbounded pages).
  - [ ] Page breaks between topic sections only (FR-LTB-3).
  - [ ] Use document-shell for pagination (inherits from resources-page pattern: unbounded, no page-count cap).
  - [ ] Topic mode: each topic heading on a fresh page (or with flow-layout break-after), items below it.
  - [ ] Date mode: each date heading on a fresh page, items below it, trailing "Unscheduled" on its own page.
  - [ ] Rendered same structure as edit mode (same row content, same completion colours, same glyphs).
  - [ ] Grouping toggle: NOT printed (print either Topic or Date mode, user chooses before print).

- [ ] **CSS** in `lessons-and-topics.css` + `lessons-and-topics-print.css`.
  - [ ] Topic card: 1px border, 8px radius, padding 12px.
  - [ ] Row: flex layout, gap 8px, padding 9px, dotted border-bottom between rows.
  - [ ] Dot: 9px circle, filled (`var(--color-completion-dot)`) when complete, hollow when not.
  - [ ] Row tint background: `var(--color-row-tint-completion)` when completed, white when not.
  - [ ] Date/period pills: 10px font, bordered, background colour from style-guide (accent tokens TBD by style-guide).
  - [ ] Topic heading: 15px bold, status badge colour-coded (style-guide tokens).
  - [ ] All colours from style-guide tokens (CSS-2); no hardcoded hex (CSS-5, no `!important`).
  - [ ] Print rules: `@page { size: A4 portrait; margin: 40px 44px; }`, page breaks between topic sections.
  - [ ] Files under 150 lines each (CSS-1).

- [ ] **Tests** in `test_lessons-and-topics.js`.
  - [ ] Import cleanly (TEST-1).
  - [ ] Render Topic mode: fixture with 3 topics, 8 lessons, 3 assessments. Assert topics in order, items under correct topics (TEST-2).
  - [ ] Render Date mode: same fixture. Assert items grouped by date, "Unscheduled" trailing, in-row topic label.
  - [ ] Reorder Topic mode: drag lesson from position 3 to 1, assert numbers renumbered 1..5 (TEST-7, guard).
  - [ ] Reorder Date mode: drag lesson to different date-group, assert only dragged lesson's date changed, no other item touched (TEST-7, guard).
  - [ ] Topic status: fixture with 1 complete lesson + 1 incomplete lesson under one topic, assert status "in progress" (AD-LTB-4).
  - [ ] Completion flag: mark lesson complete, assert .completed flipped, tint background rendered (TEST-2).
  - [ ] Date/period edit: set both on a lesson, save, reopen, assert both intact (no derivation) (TEST-2).
  - [ ] No assertions about "didn't crash" (TEST-6).

- [ ] **Code review gates**.
  - [ ] AD-LTB-1: grep for big-idea/topic write implementations. Must only call bigidea-list's shared API. Grep for independent add/rename/reorder/delete logic = empty (AC-LTB-12).
  - [ ] AD-LTB-2: domain glyphs sourced from bigidea-list's FR-BIB-8 function, never computed locally (AC-LTB-13).
  - [ ] FR-BIB-17: lesson → topic resolution via shared function, never local walk (AD-LTB-2 posture).
  - [ ] No spec ids in UI: grep rendered strings for `FR-`, `AD-`, `AC-`, `INV-DM-` = empty (SR-9).
  - [ ] Lesson.number written only in Topic-mode reorder, never in Date-mode (FR-LTB-5, FR-LTB-18).
  - [ ] Date/period independent: grep for derivation logic (lessonPeriod ← date, or vice versa) = empty (FR-LTB-9).
  - [ ] Topic status computed, never stored: grep unit.json for a "topicStatus" field = empty (FR-TOP-11).

---

## 3. Interfaces

### Exports (used by other builds / the app)

```javascript
// lessons-and-topics.js
export class LessonsAndTopicsView {
  constructor(allLessons, allMiniAssessments, finalAssessment, allBigIdeas, allTopics, allNodes, initGroupingMode = "topic") {
  }

  render(containerElement) {
    // Renders the view into containerElement
  }

  toggleGroupingMode() {
    // Switch topic ↔ date, trigger re-render
  }

  setData(updatedAllData) {
    // Updates all references, triggers re-render
  }

  exportTopicModeSVG() {
    // Returns serialized SVG for Topic-mode print
  }

  exportDateModeSVG() {
    // Returns serialized SVG for Date-mode print
  }
}

// topic-status-computer.js
export function computeTopicStatus(topicId, allLessons, allMiniAssessments, finalAssessment, allBigIdeas) {
  // @return "not started" | "in progress" | "complete"
}

// domain-glyph-renderer.js
export function renderDomainGlyphs(bigIdeaId, allBigIdeas, allNodes) {
  // Calls bigidea-list's shared FR-BIB-8 function
  // @return SVG element(s) for skill/knowledge glyphs
}
```

### Consumes (reads from other builds)

- **bigidea-list**: shared functions:
  - `resolveTopic(lessonId, lessons[], bigIdeas[])` a.k.a. FR-BIB-17 (topic resolution).
  - `computeGlyphSet(bigIdeaId, coverage[], nodes)` a.k.a. FR-BIB-8 (domain glyph union).
  - Shared write API for any big-idea/topic edits (exact signature TBD by bigidea-list, AD-BI-1).
- **document-shell**: A4 portrait geometry (fixed), unbounded-pages print model (matches resources-page).
- **local-store**: read/write entire unit.json on every completion/date/period/reorder change.
- **style-guide**: CSS tokens (completion tint, status colours, date/period pill colours, typography).
- **curriculum-editor**: allNodes tree (read only, for reference only).

### Contention

**None.** This build is a consumer of bigidea-list's shared modules; it does not export shared modules that other builds import.

---

## 4. Verification

| AC # | Acceptance Criterion | Runnable Check |
|------|---------------------|---|
| AC-LTB-1 | Fixture (3 topics, 8 lessons, 3 assessments) lists every topic in order, lessons/assessments under correct topics, sorted by lesson number | `test_lessons-and-topics.js`: render fixture, inspect Topic-mode output for topic order and item placement. |
| AC-LTB-2 | 2 mini assessments bound to different big ideas appear under different topics, not both under one | `test_lessons-and-topics.js`: fixture with 2 minis on different big ideas, render, assert separate topics. |
| AC-LTB-3 | Mark lesson complete → only that row's colour changes, every other field untouched | Manual UI test: mark complete, inspect saved lesson (only .completed flipped). |
| AC-LTB-4 | Topic with all items complete → complete; mix → in progress; none → not started, all visibly distinct | `test_lessons-and-topics.js`: render fixture with mixed completion, verify status labels. Manual: inspect colour differences. |
| AC-LTB-5 | Multi-page fixture prints A4 portrait pages, no page inside a topic's rows, no blank pages | Manual print test: export PDF for fixture large enough to exceed 1 page, measure page count, verify breaks between topics only. |
| AC-LTB-6 | Fixture with mixed completion prints same completion colouring and topic status as edit view | Manual print test: compare edit-view screenshot to printed PDF (completion dots, row tint, status labels). |
| AC-LTB-7 | Lesson with date, one with period, one with both, one with neither save/reopen with exact fields | Manual test: set all 4 variants, save, reopen, verify no field overwrites or derives the other. |
| AC-LTB-8 | Topic-mode print: date and period (when set) render beside item; unset fields render nothing | Manual print test: open PDF, verify date/period pills present when set, absent when not. |
| AC-LTB-9 | Date-mode: fixture with 2 topics / 2 dates interleaves correctly by date, topic labels in-row, Unscheduled trailing | `test_lessons-and-topics.js`: render fixture in Date mode, inspect grouping and topic labels. |
| AC-LTB-10 | Toggle Topic ↔ Date mode in edit and print: completion, tier content, scores, citations identical for same fixture | Manual test: render both modes, compare (only layout differs, content same). |
| AC-LTB-11 | Reorder lesson 3→1 in 5-lesson fixture: renumber 1..5, citations elsewhere updated on next render | `test_lessons-and-topics.js`: drag lesson to reorder, assert numbers contiguous. Manual: check lesson-plan-document cites updated numbers. |
| AC-LTB-12 | Grep for big-idea/topic add/rename/reorder/delete code independent of bigidea-list's shared API = empty | `grep -r "\.add\|\.rename\|\.reorder\|\.delete" _template/app/js/lessons-and-topics.js`. Must show only calls to bigidea-list.sharedAPI(), not local implementations. |
| AC-LTB-13 | Domain glyphs rendered on this view match bigidea-list's existing fixture exactly, sourced from FR-BIB-8 alone | `test_lessons-and-topics.js`: render fixture, compare glyphs to bigidea-list's own test output (via shared function call). |

---

## 5. Risks & Defaults

| Risk | Probability | Impact | Mitigation | Default |
|------|------------|--------|-----------|---------|
| Lesson.number written from Date-mode drag (two write paths for INV-DM-32) | Medium | High: reorder logic drifts, INV-DM-32 violated | FR-LTB-5 + FR-LTB-18…21: Topic-mode writes .number, Date-mode writes only .date. Code review checks no .number write in Date-mode code. | Separate lesson-reorder-topic-mode.js from lesson-reorder-date-mode.js; grep Date-mode file for "\.number =" = empty. |
| Big-idea/topic write logic reimplemented locally (AD-LTB-1 violated) | Medium | High: AD-44 editing-authority split fails, two write paths onto bigIdeas | AD-LTB-1, AC-LTB-12: only call bigidea-list.sharedAPI(). Never add/rename/reorder/delete locally. | Grep this build for any independent implementation of those operations. Must return nothing. |
| Derived topic status stored as field on topic (FR-TOP-11 violated) | Low | Medium: "topic status" field creeps in, duplicates the compute | FR-TOP-11: always computed, never stored. Grep unit.json for "topicStatus" = empty. | Compute on every render; never write to schema. |
| Date and period fields derive from each other (FR-LTB-9 violated) | Low | Medium: calendar data corrupted by derivation | FR-LTB-9: two independent fields, never derive. Code comment on both writes. | grep for derivation logic (lessonPeriod ← date parsing, or vice versa) = empty. Unit tests for both set, one set, neither set = same on reopen. |
| Lesson.number collision on reorder in Topic-mode | Low | Critical: contiguity broken (INV-DM-32) | FR-LPB-2 + AC-LTB-11: renumber all affected lessons contiguously 1..N. | Reorder algorithm: collect current numbers, sort by new position, reassign 1..N. Test with non-contiguous input (gaps, duplicates) → all fixed. |
| Domain glyph logic reimplemented instead of calling FR-BIB-8 | Low | Medium: glyphs drift from bigidea-list | AC-LTB-13: glyphs match shared function output exactly. Grep for local domain/glyph logic = empty. | Import and call bigidea-list's FR-BIB-8 function directly in domain-glyph-renderer.js. No local walk of coverage[]. |
| Spec ids leak into UI | Low | Low: developer text reaches teacher | SR-9: every label names visible field. Grep rendered strings. | grep `FR-LTB`, `AC-LTB`, `INV-DM`, `AD-LTB` in all render functions = empty. |

---

## 6. Notes & Handoff

- **Timeline:** Sequenced after bigidea-list (depends on shared write API per AD-LTB-1). No other strong sequencing requirement.
- **Not a seventh part:** AD-42, FR-TOP-8b, FR-SYS-2 — this build does NOT count toward the "six parts" cardinality. No singular object in schema, no new invariant. Explicitly ruled out.
- **Shared functions:** Calls bigidea-list's FR-BIB-17 (topic resolution), FR-BIB-8 (domain glyphs), and shared write API (AD-BI-1). Never walks tree locally.
- **Topic status:** Computed on every render, never stored. Grouping-independent computation (same result whether Topic or Date mode is active) per AD-LTB-4.
- **Date-mode reorder logic (AD-LTB-5):** Luke's direct instruction (2026-08-29 reversal of default) — drag-to-reorder works in BOTH Topic and Date modes. Topic writes .number (INV-DM-32), Date writes only dragged lesson's .date (FR-LTB-18). No collision, no side effects.
- **Print test:** A4 portrait, unbounded pages, page breaks between topic sections only. Measured before sign-off.
