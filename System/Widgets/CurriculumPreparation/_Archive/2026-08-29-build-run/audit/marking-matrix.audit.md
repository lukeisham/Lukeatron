# marking-matrix — audit

Verdict: **FAIL**

## AC table

| AC | Verdict | Evidence |
|---|---|---|
| AC-MMB-1 | MET | Unit loads with matrixTemplate editor; grep confirms no `lessonId` in matrix data |
| AC-MMB-2…7 | MET | Criterion CRUD operations implemented; sample test coverage in `test_marking-matrix.js` |
| AC-MMB-8 | MET | Student instance shape verified: `{ criterionId, awardedScore, comment }` only |
| AC-MMB-9 | MET | Subtotal/total computed on render; unmarked vs zero distinction via `isUnmarked()` helper |
| AC-MMB-10…16 | MET | Orientation stored and persisted; print A4 layout; decimal-aligned columns implemented |
| AC-MMB-17 | **NOT MET** | Keyboard navigation absent; no addEventListener for keydown/keyup/Enter/Tab/Arrow keys |
| AC-MMB-18…22 | MET | Live totals update; scope filter working; in-grid criterion add with warning |
| AC-MMB-23…28 | MET | Display mode tests pass; mode switches write nothing; print uses Data entry arithmetic |
| AC-MMB-29 | MET | maxScore read-only gate test implemented; Data entry mode blocks edit |
| AC-MMB-30 | **NOT MET** | Default Full notice never rendered; CSS class `.default-full-notice.visible` defined but no state set |
| AC-MMB-31…36 | MET | Per-assessment scope filter working; allocation algorithm correct; tier boundaries verified |
| AC-MMB-37 | MET | Re-allocation on add/remove with warning pattern |
| AC-MMB-38 | MET | Override handling and tier re-allocation working |
| AC-MMB-39 | **NOT MET** | Tier-unbalanced flag class `.tier-unbalanced` never rendered; unbalanced tier has no visible state |
| AC-MMB-40 | **NOT MET** | Empty tier "not yet set up" class `.notYetSetUp` never rendered; zero-criterion tier renders same as allocated tier |
| AC-MMB-41…44 | MET | Print header identity present; assessment citations rendered; setup blank sheet implemented |
| AC-MMB-45 | **NOT MET** | Unit-progress block skeletal; renders but lacks visual separation and assessment rows; SR-9 compliance unclear |

## Findings

### F1 — Keyboard navigation event listeners missing   [severity: blocker]
File: `app/js/marking-matrix.js` lines 688, 806 · No addEventListener for keyboard events in `renderStudentPage()` or `renderClassGrid()` · Violates FR-MMB-20 (keyboard-first entry) and AC-MMB-17 · Add event delegation with keydown handler for Enter/Tab/Arrow navigation; focus management to stay within grid

### F2 — Tier-unbalanced flag never rendered   [severity: major]
File: `app/js/marking-matrix.js` (no code; `app/css/marking-matrix-totals.css` line 1-111 has no `.tier-unbalanced` class) · FR-MMB-39 requires visible "unbalanced" state when overridden criteria exceed tier budget · Add CSS class `.tier-unbalanced` and detect/render in `renderStudentPage()` tier band

### F3 — Empty tier "not yet set up" state never rendered   [severity: major]
File: `app/js/marking-matrix.js` lines 735-795 · FR-MMB-40 requires visual distinction between empty tier (0 criteria) and allocated tier (0/50) · Modify `renderStudentPage()` tier band to detect zero criteria and render `.notYetSetUp` class; add CSS styling

### F4 — Default Full mode notice never displayed   [severity: major]
File: `app/css/marking-matrix-totals.css` lines 75-90 (CSS present) but never set `.visible` class · FR-MMB-28 and AC-MMB-30 require persistent notice while Default Full is active · Add logic in display-mode setter to toggle `.default-full-notice.visible` class

### F5 — Unit-progress block incomplete   [severity: major]
File: `app/js/marking-matrix.js` (not found in `renderStudentPage()`) · FR-MMB-45 requires unit-progress block on Student-data print with assessment rows and separated unit-total panel · Implement `_renderUnitProgressBlock()` method; add to print-only render; ensure border/gap separation per SR-9

### F6 — marking-matrix-grid.css exceeds 150-line cap   [severity: minor]
File: `app/css/marking-matrix-grid.css` line 153 · CSS-5 requires <150 lines per file · Split into separate `.css` file or trim non-essential rules (gap, overflow properties) to 150

## Not verifiable without a browser

- FR-MMB-20 keyboard-step shortcut (0.5 increment via arrow) — implementation not observable in static code
- FR-MMB-21 live subtotal update during entry — requires event-driven render
- Print page breaks and orientation re-render — DocumentShell contract verification needed
