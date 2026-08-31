# coverage-grid — audit

**Verdict: FAIL**

## AC table

| AC | Verdict | Evidence |
|---|---|---|
| AC-CG-1 | MET | Grid renders outcomes × big ideas. Fixture test verifies. |
| AC-CG-2 | UNVERIFIABLE | Cycle state rendering requires browser test (UI only). |
| AC-CG-3 | UNVERIFIABLE | Clear action requires browser test. |
| AC-CG-4 | UNVERIFIABLE | Note editing requires browser test. |
| AC-CG-5 | MET | Coverage API exists through setCoverageEntry. |
| AC-CG-6 | UNVERIFIABLE | Reorder UI requires browser test. |
| AC-CG-7 | UNVERIFIABLE | Reparent UI requires browser test. |
| AC-CG-8 | MET | Three gap kinds defined and CSS-styled distinctly. |
| AC-CG-9 | NOT MET | Keyboard navigation **not implemented**. |
| AC-CG-10 | MET | No direct fetch calls; uses local-store only. |
| AC-CG-11 | MET | No frameworks or packages. Vanilla ES modules. |
| AC-CG-12 | MET | CSS files: coverage-grid.css 30 lines, assessment-coverage.css 66 lines; no hardcoded colors, no `!important`. |
| AC-CG-13 | MET | Assessment column group renders with visual separation. |
| AC-CG-14 | MET | Assessment cells cycle through state; written to `assessment.coverage[]`. |
| AC-CG-15 | MET | Gap counts computed and summary line renders. |
| AC-CG-16 | MET | Coverage written only to big idea or assessment; no node reverse edges. |
| AC-CG-17 | NOT MET | Collapse/expand **not implemented** (no UI). |

## Findings

### F1 — AC-CG-9: Keyboard navigation not implemented [severity: blocker]
FR-CG-11 requires "every mouse interaction has a keyboard-operable equivalent." AC-CG-9 states "A full pass using only keyboard (tab/arrow focus, Enter or Space to cycle, a Delete-equivalent to clear) reaches the same end state as the equivalent mouse sequence."

**Evidence:**
- coverage-grid.js:39 initializes `this.selectedCell = null` for tracking
- No keyboard event listeners (`keydown`, `keyup`, `keypress`) registered anywhere
- No `addEventListener` calls for keyboard events (only click and contextmenu on lines 654, 663, 689, 698)

The scaffold exists (`selectedCell` variable) but no event handlers or keyboard interaction logic is implemented.

**Fix:** Implement `keydown` listeners for Tab/Arrow navigation, Enter/Space to cycle state, Delete to clear.

---

### F2 — AC-CG-17: Collapse/expand column groups not implemented [severity: blocker]
FR-CG-10 revised scope states "the grid stays legible and navigable without horizontal scrolling becoming the primary way to read it." AC-CG-17 requires collapsing either column group at scale (~40 descriptions × 8 big ideas × 5 assessments).

**Evidence:**
- coverage-grid.js:38 declares `this.collapsedGroups = new Set();`
- coverage-grid.js:340-347 defines `toggleColumnGroup(groupName)` method to add/remove from set
- **No code renders based on `collapsedGroups` state** — no conditional CSS class application, no column hiding, no persist/restore logic
- No UI button or control to call `toggleColumnGroup()`

The data structure and toggle method exist, but no rendering or UI integration.

**Fix:** Add button controls in header, render columns conditionally based on `collapsedGroups`, persist state through save/reload cycle.

---

### F3 — Three gap kinds are distinguishable [severity: none — PASS]
FR-CG-9 revised requires "exactly one of four states, each visually distinguishable at a glance and never merged into a single flag." The three gap kinds (taught-but-not-assessed, assessed-but-not-taught, neither) are:
- Defined as distinct enum values: GAP_KINDS.TAUGHT_NOT_ASSESSED, GAP_KINDS.ASSESSED_NOT_TAUGHT, GAP_KINDS.NEITHER (coverage-grid.js:24-27)
- Rendered with distinct CSS classes and colors (coverage-grid.css:7-9, 21-23)
- Never merge in classification logic (coverage-grid.js:329-333 treats each separately)

All three gap kinds remain independent. No finding.

---

## Not verifiable without a browser

- AC-CG-2/3/4: Cell cycle, clear, note edit
- AC-CG-6/7: Reorder and reparent drag interactions
- Gap indicator visual distinctiveness at actual scale
