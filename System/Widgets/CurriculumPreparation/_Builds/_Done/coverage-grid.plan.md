# coverage-grid — Execution Plan

**Build:** coverage-grid (Wave 2) | **Date:** 2026-08-29 | **Status:** Draft for execution

---

## 1. Files

| Path | Purpose | Owner |
|------|---------|-------|
| `app/js/coverage-grid.js` | Main grid module: cell state machine, taught/assessed gap classification, reorder/reparent logic (two-level cap enforcement), keyboard navigation, optimistic writes via local-store | This build only |
| `app/css/coverage-grid.css` | Grid layout (sticky headers, strand grouping, collapsible column groups), cell styling (full/partial/empty), gap indicators (three kinds), 12–14 data columns legible without horizontal scroll; under 150 lines (CSS-1) | This build only |
| `tests/test_coverage-grid.js` | Smoke tests: cell cycle, clear, reorder, reparent, gap classification, keyboard navigation (TEST-1…9); TEST-7 gate tests for INV-DM-12 (reverse index never stored) and INV-DM-14 (two-level cap) | This build only |

**Non-created files** (owned by other builds):
- `app/js/local-store.js` — this build's only persistence path; no direct fetch from coverage-grid
- `app/js/bigidea-list.js` — owns CRUD API and shared functions; this build reads big-idea list, calls `setCoverageEntry()` only
- `app/js/curriculum-editor.js` — owns node tree; this build reads nodes verbatim (code/title/text), never edits

---

## 2. Steps

### Phase 1: Grid data model & cell state machine

- [ ] Create grid view model
  - [ ] Axis 1 (rows): curriculum nodes of kind `outcome`, grouped under kind `strand` headers
  - [ ] Axis 2a (columns): big ideas (top-level) with sub-big ideas indented; collapsible column group
  - [ ] Axis 2b (columns): assessments (finalAssessment first, then miniAssessments[] in order); collapsible column group
  - [ ] Cell value: one of empty / full / partial (read from big idea's `coverage[]` or assessment's `coverage[]`)

- [ ] Implement cell cycle (empty → full → partial → empty)
  - [ ] Activation cycles cell state; writes to big idea's `coverage[]` via bigidea-list's `setCoverageEntry()` (FR-CG-3)
  - [ ] For big-idea cells: write to `bigIdea.coverage[]`
  - [ ] For assessment cells: write to `finalAssessment.coverage[]` or `miniAssessment[i].coverage[]` (FR-CG-17, not to node or big idea)
  - [ ] Optimistic write: update DOM immediately; hand to local-store's debounced save (AD-CG-4)

- [ ] Implement clear action (distinct from cycle)
  - [ ] One-click removal from any state (FR-CG-4)
  - [ ] Calls `setCoverageEntry(id, nodeId, null)` to remove entry entirely

- [ ] Implement note editing (in-place)
  - [ ] Click cell → small inline textarea opens (FR-CG-6)
  - [ ] Persist note to coverage[].note via `setCoverageEntry(..., note)`

### Phase 2: Taught vs. Assessed Gap Classification (FR-CG-9, AD-CG-5)

- [ ] Implement gap classifier per content description (node)
  - [ ] Input: node id, all big-idea coverage[], all assessment coverage[] (full or partial = "taught" or "assessed" respectively)
  - [ ] Output: one of four states
    - [ ] **Covered**: taught AND assessed (no gap; no indicator)
    - [ ] **Taught-but-not-assessed**: taught by ≥1 big idea, zero assessment coverage (gap kind 1)
    - [ ] **Assessed-but-not-taught**: zero big-idea coverage, assessed by ≥1 assessment (gap kind 2)
    - [ ] **Neither**: zero coverage from both sides (gap kind 3)
  - [ ] Aggregate across all big ideas and all assessments independently (not per-cell; FR-CG-9, AD-CG-5)
  - [ ] Re-compute after every cell edit

- [ ] Render gap indicators on row headers
  - [ ] Three visually distinct indicators (FR-CG-9); use style-guide tokens (gap chip colours from style-digest)
  - [ ] Never merge gap kinds; all three must be independently visible (risk mitigation)

- [ ] Render summary line (FR-CG-18)
  - [ ] "X taught-but-not-assessed, Y assessed-but-not-taught, Z neither"
  - [ ] Live update after every edit

### Phase 3: Big-Idea Reorder & Reparent (with Two-Level Cap)

- [ ] Implement big-idea reordering (FR-CG-7)
  - [ ] Primary interaction: click-to-select-then-click-to-attach; drag as enhancement (AD-CG-2, never drag-only)
  - [ ] Top-level big idea move carries sub-ideas as a block (OQ-CG-1 resolved)
  - [ ] Update `order` field on affected big ideas; persist via `bigidea-list.reorderBigIdeas()`

- [ ] Implement sub-big-idea reparenting (FR-CG-8)
  - [ ] Move sub-big idea to different top-level parent
  - [ ] Refuse if target is a sub-big idea (would violate INV-DM-14); throw Error (AC-CG-7)
  - [ ] Persist via `bigidea-list.reparentBigIdea()`

- [ ] Two-level cap validation (shared with bigidea-list)
  - [ ] Reparent logic calls a shared validator (not reimplemented here)
  - [ ] Gate test: verify refusal at UI edge for invalid reparent

### Phase 4: Assessment Column Group (FR-CG-15…17)

- [ ] Render assessment column group
  - [ ] Visually distinct from big-idea group (header band, divider, or grouping treatment; FR-CG-15)
  - [ ] One column per assessment: finalAssessment first, then miniAssessments[] in order (fixed order)
  - [ ] Same three cell states (empty / full / partial) as big-idea cells (FR-CG-16)

- [ ] Assessment cell interactions
  - [ ] Cycle: empty → full → partial → empty (FR-CG-17)
  - [ ] Write to assessment's own `coverage[]`: `finalAssessment.coverage[]` or `miniAssessments[i].coverage[]`
  - [ ] Never write to node or big idea (forward-only; INV-DM-12)
  - [ ] Clear, note-edit, keyboard-operable equivalents (FR-CG-11, FR-CG-17)

- [ ] Persist assessment edits
  - [ ] Call local-store; no direct write to bundle server (FR-CG-12, AD-13)

### Phase 5: Layout & Navigation at Scale (AD-CG-3, AD-CG-6)

- [ ] Sticky headers (big-idea row, content-description axis pinned)
  - [ ] Content area scrolls; headers stay visible
  - [ ] Strand grouping: collapse/expand strand sections to manage height (not virtualisation; FR-CG-10, AC-CG-12)

- [ ] Column group collapse/expand (FR-CG-19, AD-CG-6)
  - [ ] Big-idea column group collapses to narrow labelled strip; assessment group same
  - [ ] Gap-kind indicators remain visible at row level regardless of collapse state
  - [ ] Collapse/expand state persisted per session (or via local-store if cross-session recall desired)

- [ ] Legibility at ~40 rows × 3–8 big ideas × ~4–6 assessments (~12–14 data columns total)
  - [ ] Test AC-CG-12: manual review confirms grid readable without horizontal scrollbar primary means of reading
  - [ ] Test AC-CG-17: at widened fixture scale, both column groups collapsible, gap indicators visible either way

### Phase 6: Keyboard Navigation (FR-CG-11)

- [ ] Keyboard-operable equivalent for every mouse interaction
  - [ ] Tab/Arrow keys: focus cell (within-row arrows, tab to next row)
  - [ ] Enter/Space: cycle cell state (same as click)
  - [ ] Delete or dedicated key: clear cell (same as clear button)
  - [ ] Shift+Arrow: reorder big idea (select-then-move equivalent; AC-CG-6/7/9)
  - [ ] Shift+Enter: reparent (move sub-idea to focused top-level big idea; AC-CG-7/9)
  - [ ] Test AC-CG-9: full keyboard pass reaches same end state as mouse pass

### Phase 7: Styling & Responsiveness

- [ ] Create `coverage-grid.css` (under 150 lines, CSS-1)
  - [ ] Grid layout: display:grid (main container) + subgrid or nested grids for column groups
  - [ ] Sticky headers: `position: sticky; top: 0; left: 0;` for both axes (double-sticky corner cell)
  - [ ] Cell styling: 21px × 21px (from style-digest mockups); full/partial/empty fill + border (style-guide tokens)
  - [ ] Gap indicators: three distinct visual treatments (chip colours from style-guide)
  - [ ] Collapse controls: toggle buttons or similar affordance
  - [ ] All values from `variables.css`; no hardcoded hex/px (CSS-2); no `!important` (CSS-5)

- [ ] Verify colour usage
  - [ ] Full cell: `--color-coverage-full-bg`, `--color-coverage-full-border`
  - [ ] Partial cell: `--color-coverage-partial-bg` (gradient), `--color-coverage-partial-border`
  - [ ] Empty cell: `--color-coverage-none-bg`, `--color-coverage-none-border`
  - [ ] Gap chips: `--color-gap-taught-*`, `--color-gap-assessed-*`, `--color-gap-neither-*` (from style-digest)

### Phase 8: Persistence & Network

- [ ] All reads/writes via local-store only
  - [ ] No direct `fetch()` from coverage-grid (FR-CG-12)
  - [ ] Cell writes: optimistic DOM update, then `local-store.save()` via debounce (AD-CG-4)
  - [ ] Test AC-CG-10: inspect network activity; only local-store calls visible

- [ ] Error handling
  - [ ] Rely on local-store's existing error/loading state (FR-LS-10, FR-LS-11)
  - [ ] No second ad hoc save path in this build (AD-CG-4)

### Phase 9: Tests

- [ ] TEST-1/TEST-2: smoke tests for each module
  - [ ] `test_cell_cycle.js`: cycle empty → full → partial → empty; verify writes to correct coverage[]
  - [ ] `test_gap_classification.js`: fixture with taught-only, assessed-only, both, neither; verify classification matches
  - [ ] `test_reorder_reparent.js`: reorder big ideas, reparent sub-idea, refuse invalid reparent
  - [ ] `test_keyboard.js`: Tab/Arrow/Enter/Space/Delete equivalents produce same state as mouse

- [ ] TEST-7: gate tests for invariants (critical for this grid)
  - [ ] **INV-DM-12 (reverse index never stored):**
    - [ ] Fixture: edit coverage[], inspect saved unit; verify no reverse edge on node, no node-list on big idea
    - [ ] Both directions: big-idea → node write, assessment → node write
  - [ ] **INV-DM-14 (two-level cap):**
    - [ ] Fixture: attempt reparent sub-idea under sub-idea; verify refused with error message
    - [ ] Verify sub-idea can reparent to different top-level big idea

- [ ] TEST-4: isolated, in-memory; mock local-store
- [ ] TEST-5: deterministic, no sleeps
- [ ] TEST-6: assert on actual output (gap classification, coverage[] shape) not just "didn't crash"
- [ ] TEST-9: import real modules; if mocking, mirror logic from curriculum-editor/bigidea-list

---

## 3. Interfaces

### Exports (Public API)

This build exports only its screen component; it does not export a reusable API. All interaction is through the grid UI and local-store persistence.

### Consumes

```javascript
// ============ From bigidea-list ============
import { computeGlyphSet, resolveTopic } from './bigidea-list.js';
  // Shared functions for deriving domain glyphs and lesson→topic resolution
  // Not used by this grid directly, but exported for coordination

import { setCoverageEntry } from './bigidea-list.js';
  // FR-BIB-6: only write API on coverage[] — both big-idea cells and assessment cells call this
  // setCoverageEntry(bigIdeaId, nodeId, coverage: "full"|"partial"|null, note?)
  // setCoverageEntry(assessmentId, nodeId, coverage: "full"|"partial"|null, note?) — same signature

// ============ From local-store ============
import { load, save } from './local-store.js';
  // FR-CG-12, AD-13: only persistence path; no direct fetch from this build
  // Optimistic writes call save() via debounced path (local-store's FR-LS-4)

// ============ From curriculum-editor ============
// Reads node tree, never edits: node.code, node.title, node.text, node.kind (outcome/strand)

// ============ From style-guide ============
import './css/coverage-grid.css';
// Tokens: --color-coverage-full-bg/border, --color-coverage-partial-*, --color-coverage-none-*
//         --color-gap-taught-*, --color-gap-assessed-*, --color-gap-neither-*
//         --space-*, --font-*, --radius-*
```

### Consumed By

- **Local only** — this is a standalone screen, not consumed by other builds
- **User interaction** — mouse clicks, keyboard, touch (for select-then-click reorder/reparent)

### Data Flow

1. **Load:** local-store hands unit to this build; grid derives gap classification per node, renders three column groups
2. **Edit:** user cycles cell, clear, reorder, reparent → optimistic DOM update → local-store.save() via debounce
3. **Persistence:** no reverse index stored; grid re-derives on next load
4. **Assessment writes:** curriculum-grid writes to assessment's own `coverage[]`, not to node or big idea (forward-only, INV-DM-12)

---

## 4. Verification

| AC ID | Acceptance Criterion | Runnable Check |
|-------|---------------------|----------------|
| AC-CG-1 | Fixture ~40 outcomes × 6 big ideas (2 with sub-ideas) renders both axes fully labelled | Render grid; assert grid headers label all 40 nodes and 6 big ideas |
| AC-CG-1a | Fixture strand headers group content descriptions correctly, in curriculum order | Inspect rendered strand groups; assert each outcome appears under correct strand; assert strand order matches curriculum order |
| AC-CG-2 | Cell cycle empty → full → partial → empty; each transition confirmed against coverage[] | Click cell → full; inspect unit.bigIdeas[i].coverage[]; assert nodeId/coverage present. Repeat for partial and clear. |
| AC-CG-3 | Clear action removes entry from full or partial in one step | Cell in full state → click Clear; assert state empty and coverage[] entry removed in one action (not two cycles) |
| AC-CG-4 | Attach writes coverage[] entry; detach removes it; both round-trip through save/reload | Click empty cell → full; save/reload via local-store fixture; assert entry persists. Repeat for detach. |
| AC-CG-5 | Text in cell note persists after reload | Click cell → open note editor → type text → save/reload → click cell → assert note text intact |
| AC-CG-6 | Reordering big idea updates order field; survives reload | Reorder 3 big ideas; save/reload; assert order field updated on all 3; assert new order persists |
| AC-CG-7 | Reparenting sub-idea to different top-level succeeds; reparenting to sub-idea refused with message | Move sub-idea to different top-level; assert parentId updated. Attempt move to sub-idea; assert error message, parentId unchanged |
| AC-CG-8 | Fixture with 3 gap kinds (taught-but-not-assessed, assessed-but-not-taught, neither): each carries distinct indicator; no overlap | Create fixture: row 1 covered by big idea only, row 2 by assessment only, row 3 by neither; assert three distinct visual gap indicators; fourth row (both) has none |
| AC-CG-9 | Full keyboard pass (Tab/Arrow/Enter/Space/Delete) reaches same end state as mouse pass | Run mouse sequence: cycle cell, clear, reorder. Run keyboard sequence with same operations; assert grid state identical |
| AC-CG-10 | Network inspection during full interaction shows only local-store calls | Open DevTools Network; run AC-CG-2 and AC-CG-6 sequences; assert no direct fetch to bundle-server; only local-store activity |
| AC-CG-11 | Grep: no framework, bundler, or drag-and-drop package import | `grep -r "import.*react\|vue\|angular\|require.*drag" app/js/coverage-grid.js` returns nothing |
| AC-CG-12 | At fixture scale, grid readable without horizontal scrollbar primary means of reading; CSS under 150 lines, no hardcoded values or !important | Manual review at fixture scale; test AC-CG-12 legibility claim. Inspect CSS file; assert each < 150 lines, only token references |
| AC-CG-13 | Fixture with 1 finalAssessment + 3 miniAssessments renders second column group, visually distinct, 4 columns total (final first) | Render grid; assert second column group visible; inspect column order: finalAssessment, miniAssessments[0], [1], [2]; assert visual separation from big-idea group |
| AC-CG-14 | Assessment cell cycle empty → full → partial → empty; each transition confirmed against that assessment's coverage[] (not big idea or node) | Click assessment cell → full; inspect finalAssessment.coverage[] or miniAssessments[i].coverage[]; assert entry present. Never inspect node or big idea. |
| AC-CG-15 | After AC-CG-8 fixture, summary line reports counts matching fixture exactly; updates immediately on edit changing gap kind | Render summary line; assert counts match (1 taught-not-assessed, 1 assessed-not-taught, 1 neither, 0 covered). Add assessment coverage to taught-not-assessed row; assert count decrements immediately and row moves to zero-gap |
| AC-CG-16 | After save/reload round-trip, inspecting saved unit shows edited assessment's coverage[] entry; no reverse edge on node, no cross-write on big idea, no assessment-side list on node | Save/reload fixture; inspect unit.miniAssessments[i].coverage[]; assert entry present. Inspect unit.nodes[] and unit.bigIdeas[]; assert no new fields; no reverse edges |
| AC-CG-17 | At widened fixture (~40 descriptions × 8 big ideas × 5 assessments), collapsing either column group leaves other's cells and row gap-kind indicators fully legible; expanding restores prior state | Collapse big-idea group; assert assessment cells and gap indicators visible, readable. Expand; assert prior state restored without reload |

---

## 5. Risks & Open Points

| Risk | Likelihood | Severity | Mitigation | Default |
|------|-----------|----------|-----------|---------|
| 40×8×6 grid unreadable without constant horizontal scrolling | Low | High | Sticky headers + strand grouping (AD-CG-3); independently collapsible groups (AD-CG-6) | AC-CG-12/17 legibility gate |
| Hand-rolled drag misfires or is mouse-only, breaks FR-CG-11 | Low | Medium | Click-to-select-then-click primary; drag enhancement only (AD-CG-2) | AC-CG-6/7/9 keyboard equivalents gate |
| Cycling and clearing conflated; user needs two clicks to clear | Very low | Low | Dedicated clear action distinct from cycle (FR-CG-4) | AC-CG-3 direct test |
| Grid derives AND caches node-side reverse index that drifts from forward data (INV-DM-12 violated) | Very low | Critical | Never store reverse index; compute fresh on load (FR-CG-12) | TEST-7 gate: verify no reverse edge in saved unit |
| Sub-idea reparented under sub-idea, corrupting INV-DM-14 | Very low | Critical | Reparent target restricted to top-level big ideas at UI edge (FR-CG-8) | TEST-7 gate: verify refusal; AC-CG-7 |
| Optimistic cell write races debounced autosave; earlier click overwrites before saving | Low | Medium | Rely on local-store's debounce + error state (AD-CG-4, FR-LS-4) | Cross-test AC-CG-5 against local-store's AC-LS-4 |
| arbor-tree derives gap/reverse index differently | Low | Medium | Named coordinate-with; shared vocabulary reviewed at both builds' completion | Manual cross-review of derivation code |
| Three gap kinds collapse back into one flag under time pressure | Very low | Critical | FR-CG-9 explicitly names all three; AC-CG-8/15 fixture requires simultaneous presence | AC-CG-8/15 fixture gate |
| Assessment cell edit writes to node or big idea instead of assessment | Very low | Critical | FR-CG-17 explicitly names assessment-only write target; forward-only pattern matches AD-CG-1 | TEST-7 gate: verify no reverse edge or cross-write; AC-CG-16 |
| 12–14 data columns push grid past AC-CG-12 legibility bar | Low | High | AD-CG-6 collapsible groups; FR-CG-10 revised scale target | AC-CG-12/17 manual review gate |
| Reorder/reparent UI unclear, users struggle with select-then-click | Low | Medium | Keyboard equivalents (Shift+Arrow, Shift+Enter) + clear UI affordance | AC-CG-9 keyboard pass gate; manual UX review |

---

## 6. Recommended Defaults for Open Points

- **OQ-CG-1** (closed 2026-08-29): Top-level reorder carries sub-ideas as block; sub-ideas reorder within current parent only
- **OQ-CG-2** (closed 2026-08-29): No hard cap on note length
- **OQ-CG-3** (closed 2026-08-29): Only `outcome`-kind nodes as grid rows (not `task`)
- **OQ-CG-4** (resolved): Proceeds now against BigIdea.coverage[] shape (data-model settled by bigidea-list)
- **OQ-CG-5** (resolved): Assessment coverage links use qualified shape `{nodeId, coverage, note}` (settled by unit-assessment-document)

---

## 7. Critical Coordination Points

| Coordination | With Build | Settle Before Implementation |
|-------------|-----------|-----|
| coverage[] write API shape | bigidea-list | FR-BIB-6: `{nodeId, coverage: "full"|"partial", note}` on BigIdea AND identical shape on Assessment |
| Assessment coverage[] shape | unit-assessment-document | OQ-CG-5: `finalAssessment.coverage[]` and `miniAssessments[].coverage[]` both use qualified shape |
| Reverse-index derivation | arbor-tree | Both builds derive independently from forward data; coordinate code review to verify identical logic |
| Two-level cap validation | bigidea-list | Reparent calls shared validator; never reimplements INV-DM-14 check locally |
| No drag-only interaction | keyboard/a11y | FR-CG-11 gate: every mouse interaction must have keyboard equivalent; click-to-select-then-click enables this |

---

**Next Steps:** Implementation starts once bigidea-list's CRUD API and `coverage[]` write API are finalized; local-store persistence path confirmed.
