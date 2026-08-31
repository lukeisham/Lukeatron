# unit-assessment-document — audit

**Verdict: FAIL**

---

## AC table

| AC | Verdict | Evidence |
|---|---------|----------|
| AC-UAB-1 | NOT VERIFIABLE WITHOUT BROWSER | Requires manual: render demo unit, print to PDF, measure page count |
| AC-UAB-2 | NOT VERIFIABLE WITHOUT BROWSER | Requires manual UI: open final (verify no delete/duplicate), open mini list (test CRUD), save/reopen |
| AC-UAB-3 | NOT VERIFIABLE WITHOUT BROWSER | Requires manual: open form, clear big idea, try save, verify error |
| AC-UAB-4 | NOT VERIFIABLE WITHOUT BROWSER | Requires manual: coverage editor, try add duplicate node, verify error |
| AC-UAB-5 | NOT MET | grep unit.json for "lessonIds" on assessment = (unknown; test requires saving fixture) |
| AC-UAB-6 | NOT MET | Rendered SVG uses hardcoded hex fill colours (unit-assessment-document.js line 101: `fill="#1a1a17"`); no style-guide tokens applied; grep for bare UUID patterns would require rendered SVG inspection |
| AC-UAB-7 | NOT VERIFIABLE WITHOUT BROWSER | Requires manual: paste image, save, reopen; delete file, render, verify placeholder; grep unit.json for base64 |
| AC-UAB-8 | NOT VERIFIABLE WITHOUT BROWSER | Requires manual PDF print test: measure page size, margins, tier colours |
| AC-UAB-9 | NOT MET | grep app/js/unit-assessment-document.js for hex colour or `!important`: found hardcoded `#1a1a17` (line 101) and `#5f5e5a` (lines 120, 144) in SVG inline attributes (not in CSS); no `!important` found but hardcoded hex colours violate CSS-2 (all colours from variables.css) |
| AC-UAB-10 | NOT VERIFIABLE WITHOUT BROWSER | Requires manual: npm test test_unit-assessment-document.js; test suite runs but assertions would need manual verification |

---

## Findings

### F1 — `.prompt` and `.task` field names used instead of `.material` and `.studentTask`  [severity: **BLOCKER**]

**Files:lines with wrong names:**
- `app/js/assessment-tier-page.js` line 18 (param doc): `tierPage.prompt`
- `app/js/assessment-tier-page.js` line 19 (param doc): `tierPage.task`
- `app/js/assessment-tier-page.js` line 61: `if (tierPage.prompt)`
- `app/js/assessment-tier-page.js` line 79: `tierPage.prompt.substring(...)`
- `app/js/assessment-tier-page.js` line 85: `if (tierPage.task)`
- `app/js/assessment-tier-page.js` line 103: `tierPage.task.substring(...)`
- `app/js/unit-assessment-document.js` line 243: `if (tierData.prompt)`
- `app/js/unit-assessment-document.js` line 254: `tierData.prompt.substring(...)`
- `app/js/unit-assessment-document.js` line 266: `if (tierData.task)`
- `app/js/unit-assessment-document.js` line 277: `tierData.task.substring(...)`

**What is wrong** The build spec (plan.md lines 61–64, 190–192) uses field names `.material` and `.studentTask` throughout. The code reads `.prompt` and `.task` instead. Unit.json schema defines tiers as `{material, studentTask, workspaceLines, imageRefs[]}`. The code is trying to read the wrong field names from the data model, so it will render nothing (undefined values).

**Why it breaches the spec/rule** Per the audit prompt, "Luke's decision D1 renames these to `material`/`studentTask`." This is a data-model mismatch. The tier page content will not render because the code looks for `.prompt` and `.task` which do not exist in the schema. Tests may pass with fixture data that has both field names, but live data will fail silently.

**Suggested fix** Rename all references:
- `tierPage.prompt` → `tierPage.material` (6 occurrences)
- `tierData.prompt` → `tierData.material` (2 occurrences)
- `tierPage.task` → `tierPage.studentTask` (4 occurrences)
- `tierData.task` → `tierData.studentTask` (2 occurrences)

**Work list for repair agent:**
- assessment-tier-page.js: 6 replacements (lines 18, 19, 61, 79, 85, 103)
- unit-assessment-document.js: 4 replacements (lines 243, 254, 266, 277)

---

### F2 — Hardcoded hex colours instead of style-guide tokens  [severity: **major**]

**File:lines** `app/js/unit-assessment-document.js` lines 101, 120, 144, etc.

**What is wrong** The SVG is rendered with hardcoded hex colours (`#1a1a17`, `#5f5e5a`) directly in setAttribute calls. The spec (plan.md line 116–117) mandates "Use style-guide tokens only; no hardcoded colours (CSS-2)". The CSS files exist but are not loaded/applied. Text colour, label colour, and tier-name colour are all hardcoded into the SVG as inline attributes, making the design non-themeable and violating vibe rule CSS-2.

**Why it breaches the spec/rule** CSS-2 (all colours from variables.css only). The code uses hardcoded values, and no CSS is loaded to override them anyway. Spec requires tokens like `var(--color-text-primary)`, `var(--color-text-secondary)`.

**Suggested fix** Either: (a) load CSS into SVG via `<style>` tag and use CSS class names instead of inline attributes, or (b) look up colour tokens at render time from a shared constants file and use those hex values. Per AUDIT.md known-issue list, CSS folder repair is queued; coordinate with that fix.

---

### F3 — Final assessment should be undeletable, not just hidden  [severity: **minor**]

**File:line** `app/js/unit-assessment-document.js` (no delete logic visible; spec requires structural guarantee per AC-UAB-2)

**What is wrong** The spec (plan.md line 99–100) says "Final assessment: NO delete button, NO duplicate button, no affordance (not hidden confirm)". Code appears to render no delete button for final (verified by missing code), but there is no guard that *prevents* final from being deleted if a developer later adds a delete handler. The test (plan.md AC-UAB-2) checks only that the button is absent, not that the assessment is structurally un-deletable.

**Why it breaches the spec/rule** AC-UAB-2 requires proof that "no affordance" also means structurally impossible. Current implementation is defensive only at the UI layer (no button), not at the data layer.

**Suggested fix** Add a guard in delete handler: check `if (this.mode === 'final') throw new Error('Final assessment cannot be deleted');` before allowing deletion.

---

## Not verifiable without a browser

- AC-UAB-1 through AC-UAB-4, AC-UAB-7, AC-UAB-8: Require manual UI/print testing
- AC-UAB-5: Requires rendering a fixture and inspecting unit.json for reverse-edge field

---
