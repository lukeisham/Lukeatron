# marking-matrix — Execution Plan

**Build:** marking-matrix (Wave 4, 1372-line spec)  
**Status:** Ready for implementation  
**Date:** 2026-08-29

---

## 1. Files

Exact paths under `_template/`:

| Path | Purpose | Owned by this build |
|------|---------|---|
| `app/js/marking-matrix.js` | Module: per-student page, class grid, criteria editor, four-mode display toggle, scope filter, tiered-ceiling allocation model | Yes |
| `app/css/marking-matrix.css` | Spreadsheet-like criteria table layout, tier-coloured bands, alignment, print rules, keyboard focus states | Yes |
| `app/css/marking-matrix-grid.css` | Class entry grid table: students × criteria, 2D navigation, cell focus styling | Yes |
| `tests/test_marking-matrix.js` | Smoke: create matrix/students, add/remove criteria, enter/edit/toggle modes, allocation re-run, scope filter, print output | Yes |

**Consumed (not owned):**
- `app/js/local-store.js` — read/write via `store.loadUnit()` / `store.saveUnit()`
- `app/js/document-shell.js` — Tier constants (PASS, INTERMEDIATE, ADVANCED), `DocumentShell` class for render
- `app/css/variables.css` — All colour, spacing, typography tokens
- `app/js/traceability.js` (wave 5) — plain-text code citations, clickable in edit view

---

## 2. Steps

### Phase 1: Data Model & Tier Constants

- [ ] Import Tier constants from `document-shell`: `{ pass, intermediate, advanced }` each with `{ line, tint, ink }`
- [ ] Define allocation algorithm function `allocateMaxScores(criteria[])` — deterministic, 0.5-boundary rounding, per-tier budgets (Pass 50, Intermediate 25, Advanced 25)
- [ ] Define display-mode cell formulas:
  - Default Empty: `0` (always)
  - Default Full: `criterion.maxScore`
  - Data entry: `criterion.awardedScore ?? 0`
  - Part of: `<awardedScore>/<maxScore>` format
- [ ] Implement unmarked-vs-zero visual distinction constant (e.g., `UNMARKED_VISUAL = '—'` vs `ZERO = '0'`)

### Phase 2: Per-Student Page & Criteria Rendering

- [ ] Implement `renderStudentPage(studentId, matrixId, selectedMode, orientation, scope)` returning SVG `<svg>` with:
  - Header: student name, subject, unit, assessment identity (FR-MMB-44)
  - Tier-grouped criteria rows: criterion text, awarded, max, contribution to subtotal (FR-MMB-9a, FR-MMB-19)
  - Per-tier subtotals and unit total (rendered from selected mode's cell formula, FR-MMB-21)
  - Unit-progress block: per-assessment rows + unit total, separated visually (FR-MMB-45, only Student-data sheet)
- [ ] Implement cell rendering per mode (FR-MMB-27…30) — tie cell display to selected mode, not stored per-student
- [ ] Implement score input control: 0.5-step buttons, typed entry (one decimal place), validation to [0, maxScore] (FR-MMB-10)
- [ ] Implement row-level focus tracking for keyboard navigation (FR-MMB-20)

### Phase 3: Class-Grid Entry Surface

- [ ] Implement `renderClassGrid(matrixId, selectedMode, orientation, scope)` — students × criteria table, entry-only view (no print)
- [ ] Implement 2D cell navigation: **Enter** → next row same column, **Tab/Shift+Tab** → horizontal, **arrow keys** → any direction
- [ ] Focus never escapes grid during entry (FR-MMB-20)
- [ ] Auto-save on every score entry; updates same underlying instance data as per-student page (FR-MMB-22)
- [ ] Render every cell using same display-mode formula as per-student page — both views show identical cell values at all times

### Phase 4: Display-Mode Toggle & Scope Filter

- [ ] Implement display-mode state machine: toggle between Default Empty / Default Full / Data entry / Part of
- [ ] **No write** on mode switch itself; only FR-MMB-28's explicit in-grid `maxScore` edit writes (FR-MMB-31)
- [ ] Render visible notice in Default Full mode: "Edits here change every student's ceiling" (AC-MMB-30)
- [ ] Implement scope dropdown: full-unit (default) vs per-assessment
- [ ] Filter criteria array client-side (never stored as duplicate) based on selected assessment id (FR-MMB-33)
- [ ] Compute per-assessment subtotals per FR-MMB-35 (sum marked criteria whose `assessmentIds[]` includes selected assessment; shared criteria count full mark to each)

### Phase 5: Template Editor & Criteria Management

- [ ] Implement add criterion with tier picker, auto-allocated `maxScore`, assessment binding, and warning (FR-MMB-24/25): surface immediate warning about every student's totals dropping
- [ ] Implement edit criterion: reorder, change tier (triggers reallocation warning), change binding
- [ ] Implement remove criterion: cascade delete every score referencing it, confirm with count (FR-MMB-8)
- [ ] On add/remove within a tier: re-run allocation algorithm for that tier only (FR-MMB-38), surface warning before commit
- [ ] Implement manual override toggle: `allocationOverridden: true` sets criterion as exempt from auto-allocation
- [ ] If overridden criteria exceed tier budget, render "unbalanced" flag (FR-MMB-39)
- [ ] Render "not yet set up" state for a tier with zero criteria (FR-MMB-40)

### Phase 6: Roster & Student Pages

- [ ] Implement add student: creates new instance with `{ id, name }`, immediately adds empty scores
- [ ] Implement remove student: confirm dialog naming student, cascade delete all scores for that student (FR-MMB-7)
- [ ] Each student renders exactly one page (not per-lesson, per-assessment scoped or otherwise) (FR-MMB-1)

### Phase 7: Orientation & Print

- [ ] Implement orientation toggle: portrait (default) or landscape, stored on matrix document
- [ ] On orientation change: re-render document with new `viewBox` via `document-shell`'s immutable-per-doc rule (AD-DS-4, FR-MMB-13)
- [ ] Student-data print (FR-MMB-32): render Data entry mode's arithmetic (raw awardedScore, unmarked as visually-distinct)
- [ ] Setup blank sheet print (FR-MMB-43): render every criterion, tier max only, empty score cells, handwriting lines, no student data
- [ ] Both print outputs use stored orientation; each invoked as separate explicit action

### Phase 8: CSV Integration Point

- [ ] Coordinate with `bundle-server` amendment (FR-CSV-8): `marking-matrix.js` will export CSV by calling new endpoint
- [ ] Export endpoint receives CSV bytes assembled in JS, writes to `<unit-slug>-matrix.csv` at bundle root (FR-CSV-5, csv-export.plan.md §4)

### Phase 9: Tests & Verification

- [ ] Test: create matrix, add 3 criteria to each tier, verify allocation matches worked example (AC-MMB-34)
- [ ] Test: enter score on per-student page, verify reflected on class grid (AC-MMB-19)
- [ ] Test: switch modes Default Empty → Data entry → Part of, verify cells change, no writes (AC-MMB-23)
- [ ] Test: edit maxScore in Default Full, verify uneditable in Data entry (AC-MMB-29, TEST-7)
- [ ] Test: render full-unit and per-assessment scope, verify criteria filter only (AC-MMB-31)
- [ ] Test: keyboard: Enter/Tab/arrows navigate grid, focus never escapes (AC-MMB-17)
- [ ] Test: print Student-data and Setup sheets for same fixture, both A4, correct page breaks (FR-MMB-32, FR-MMB-43)

---

## 3. Interfaces

### Exports (for importing builds to use)

```javascript
// marking-matrix.js
export class MarkingMatrix {
  // Constructor receives loaded unit from local-store
  constructor(unit) { }

  // Render per-student page to SVG
  renderStudentPage(studentId, displayMode, scope) → SVGElement

  // Render whole-class grid to HTML
  renderClassGrid(displayMode, scope) → HTMLElement

  // Render print: Student-data sheet
  renderStudentDataPrint(studentId, orientation) → DocumentShell instance

  // Render print: Setup blank sheet
  renderSetupPrint(orientation) → DocumentShell instance

  // Data mutation methods
  addCriterion(tier, assessmentIds) → { warning, onConfirm() }
  removeCriterion(criterionId) → { count: N, onConfirm() }
  editCriterion(criterionId, updates) → { reallocationWarning?, onCommit() }
  setDisplayMode(mode) → void (no write)
  setScope(assessmentId | null) → void (no write)
  setOrientation(portrait | landscape) → void (triggers re-render)

  addStudent(name) → Student instance
  removeStudent(studentId) → { count: N affected scores, onConfirm() }

  enterScore(studentId, criterionId, awardedScore, comment) → { persists via local-store }
}

// Helper functions
export function allocateMaxScores(criteria) → updates each non-overridden criterion's maxScore
export function computeTierSubtotal(criteria, scores, tier, mode) → number
export function isUnmarkedCell(criterion, student, mode) → boolean (distinguishes 0 from '—')
```

### Consumes

```javascript
// from local-store
store.loadUnit() → { matrixTemplate, matrices, students, ... }
store.saveUnit(unit) → Promise<void>

// from document-shell
import { TIERS } from './document-shell.js'
  // TIERS.pass.line, TIERS.pass.tint, TIERS.pass.ink, etc.
DocumentShell class: renderStudentPage/Setup leverage its page model, print CSS, tier constants

// from traceability (wave 5)
import { renderCode } from './traceability.js'
  // Renders criterion.assessmentIds[] as clickable codes in edit view, plain text in print
```

---

## 4. Verification

One row per acceptance criterion, mapped to a concrete runnable check:

| AC-* | Check | How to verify |
|------|-------|---|
| AC-MMB-1 | No lessonId anywhere under matrix data | `grep -r "lessonId" _template/unit.json` after fixture save — must return nothing |
| AC-MMB-2 | Add/edit/remove/reorder criteria round-trip | Create criterion, save, reload, verify all fields identical |
| AC-MMB-3 | Edit criterion draftScore reflects on every student page | Edit draftScore, render two different students' pages, both show new draftScore in same row |
| AC-MMB-4 | Save refuses empty assessmentIds; refuses unresolvable id | Attempt add with `assessmentIds: []` → rejected; attempt with bogus id → rejected, names the id |
| AC-MMB-5 | Add student creates page with blank scores; remove cascades | Add: verify new page with N blank rows for N criteria; Remove: confirm dialog names student, no page after |
| AC-MMB-6 | Remove criterion cascades to affected students, confirm names count | Remove from 3-of-5, confirm dialog says "3 students", verify only those 3 lose the row |
| AC-MMB-7 | In-range score saves; out-of-range rejected; half-marks accepted | Enter 4.5 on max-5 criterion → saves; enter 5.5 → rejected; enter 4.3 → saves |
| AC-MMB-8 | Student instance carries only { criterionId, awardedScore, comment } | Query saved matrices[].scores[] — no tier, no criterion text, no maxScore anywhere |
| AC-MMB-9 | Subtotal/total always numeric; unmarked criterion = 0 numerator, full max denominator | Fixture with 1×5 marked, 2×5 unmarked: subtotal renders `5/15` (33%) not `5/5` (100%); unmarked row visually distinct |
| AC-MMB-10 | Portrait A4: 210×297mm, one page per student; landscape: 297×210mm | Print both orientations, measure rendered SVG viewBox, one page per student |
| AC-MMB-11 | Criterion bound to 2 assessments prints both names | Print assessment citation for shared criterion, verify both assessment names appear |
| AC-MMB-12 | Network traffic is local-store calls only, no direct server fetch | Open DevTools Network, add/edit/print, verify only bundle-server requests (via local-store), no other fetch |
| AC-MMB-13 | No framework/bundler/package; CSS <150 lines, only tokens, no !important | Grep source for import of framework/bundler; measure each .css file; grep for !important — all must be zero |
| AC-MMB-14 | Score control 0.5-step; typed 2.3 accepted; 2.33 rejected | Step control 2 → 2.5; type 2.3 → accepted; type 2.33 → rejected |
| AC-MMB-15 | Every criterion row shows awarded, max, and tier-contribution simultaneously | Render student page, measure pixels of each value, all three visible in same row |
| AC-MMB-16 | Rows have visible borders, decimal-aligned, uniform height | Measure rendered table: borders on every row, decimal points horizontally aligned, row heights equal ±tolerance |
| AC-MMB-17 | Focus: Enter→next row, Tab→comment cell, arrows→adjacent cells, never outside grid | Tab through populated grid, record focus sequence, verify never on chrome elements |
| AC-MMB-18 | Score entry updates row/tier/unit totals live in same render | Enter score, watch subtotal update without reload or explicit recalculate |
| AC-MMB-19 | Score entered in class grid appears on per-student page and vice versa | Enter on grid for student1, criterion3 → renders on student1's page; enter on page → renders on grid same cell |
| AC-MMB-20 | 27.5/45 renders `27.5 / 45` and `61%` (rounds per AD-MMB-5) | Compute and verify percentage calculation |
| AC-MMB-21 | Add criterion in-grid round-trips via save/reload like template editor | Add via grid, save, reload, verify in matrixTemplate.criteria[] and all student pages |
| AC-MMB-22 | Add criterion warning names impact on 3-of-5 students' totals; confirm/cancel works | Add to 3-scored students → warning visible; confirm → added; cancel → not added |
| AC-MMB-23 | **Gate test**: Mode switches write nothing to fixture state | Diff unit before/after switching all four modes, must be byte-identical |
| AC-MMB-24 | Default Empty: every cell `0`, subtotal `0 / X` | Fixture with 2 scored, 3 unmarked: every cell renders `0`, subtotal `0 / 25` |
| AC-MMB-25 | Default Full: every cell `maxScore`, subtotal `X / X` (100%), visible notice present | Fixture: every cell renders its own maxScore, subtotal `25 / 25`, notice present in UI |
| AC-MMB-26 | Data entry: raw scores, unmarked distinct, subtotal `7 / 25` | Fixture: renders `4`, `3`, `0`, `0`, `0` with unmarked visually different, subtotal `7 / 25` |
| AC-MMB-27 | Part of: per-cell fractions, subtotal identical to Data entry, identity recorded plainly | Fixture: renders `4/5`, `3/5`, `0/5`, `0/5`, `0/5`, subtotal `7 / 25` — add note: "identical to Data entry totals" |
| AC-MMB-28 | Print always uses Data entry arithmetic/display regardless of edit-view mode | Toggle to Default Full, print → output shows `4`, `3`, `0`, `0`, `0` and `7 / 25`, not Full mode's `25/25` |
| AC-MMB-29 | **Gate test**: maxScore read-only in Data entry, editable in Default Full | Blocked path: attempt edit in Data entry → no write, no control; Permitted: edit in Default Full → round-trips |
| AC-MMB-30 | Default Full mode shows persistent notice; other three modes do not | Toggle to each mode, verify notice only when in Default Full |
| AC-MMB-31 | Full-unit vs per-assessment scope filters criteria in grid, page, and print | Fixture 3 assessments: select one → only its criteria appear in grid/page/print preview; switch back → all 12 return |
| AC-MMB-32 | Per-assessment print produces one A4 per student for selected assessment | Invoke per-assessment print: 5 students × 1 assessment = 5 pages, each page differs from full-unit print |
| AC-MMB-33 | Shared criterion (bound to 2 assessments) contributes full mark to each assessment's per-assessment subtotal; full-unit total computed directly, not summed | Fixture: criterion bound to A & B, scored 5/5; per-A subtotal includes 5, per-B includes 5, unit total is 5 (not 10) |
| AC-MMB-34 | **Worked example allocation**: 3 Pass, 2 Intermediate, 4 Advanced → `[17, 16.5, 16.5]`, `[12.5, 12.5]`, `[6.5, 6.5, 6.0, 6.0]` | Create fixture, verify allocation output matches exactly |
| AC-MMB-35 | **Worked example tier boundaries**: Pass-only 50/100, +Intermediate 75/100, all three 100/100 | Score full marks on each tier cumulatively, verify totals |
| AC-MMB-36+ | Continued tests (max scores, overrides, unbalanced flags, etc.) | Per spec AC-MMB-36 onwards |

---

## 5. Risks & Open Points

| Risk | Likelihood | Mitigation | Recommendation |
|------|---|---|---|
| Display-mode cell formulas drift from spec (Default Full accidentally writes on switch) | Medium | FR-MMB-31: explicit gate test (AC-MMB-23) verifies zero writes on mode switch; only Default Full's explicit in-grid edit writes | Pre-implement test before mode-toggle logic |
| Allocation algorithm re-run on add/remove missed in implementation | Medium | FR-MMB-38: surface reallocation warning before commit, test AC-MMB-22 exercises it | Implement warning dialog before allocation refactor |
| Shared criterion double-counts in full-unit total when summing per-assessment subtotals | High | FR-MMB-35: compute full-unit total directly from all criteria, never as sum of per-assessment rows; test AC-MMB-33 | Implement full-unit total as separate, non-summed calculation; test with shared criteria fixture |
| Print default is Setup sheet instead of Student-data sheet | Low | FR-MMB-32, FR-MMB-43: explicitly distinct, Student-data is default print action; Setup requires separate invocation | Implement print button for Student-data only by default; separate "Print Setup sheet" action |
| Keyboard focus escapes grid to browser chrome | Medium | FR-MMB-20: focus management test (AC-MMB-17); prevent default on arrow keys within grid | Trap focus in grid during data entry; test escape/tab not leaving |
| Score input accepts invalid decimals (2.333) | Low | FR-MMB-10: one-decimal-place parse, reject multi-decimal input at control level | Validate input with `Math.round(value * 2) / 2` before accepting |
| Default orientation switches on unexpected condition | Low | AD-DS-4: immutable per-document; orientation change re-renders, not toggle; stored on matrix | Test orientation persists across reload; setting triggers re-render |

**Recommended defaults for unresolved decisions:**
- Default display mode on load: **Default Empty** (FR-MMB-27 — "default toggle position")
- Default scope on load: **full-unit** (FR-MMB-33 — "default")
- Tier budget rounding: **0.5-boundary**, floor rawShare, distribute remainder to first N criteria (FR-MMB-37 — worked example governs)
- Assessment binding: **required**, cannot save criterion with empty assessmentIds (FR-MMB-5, AC-MMB-4)

