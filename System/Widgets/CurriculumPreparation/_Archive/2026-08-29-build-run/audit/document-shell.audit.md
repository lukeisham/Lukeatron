# document-shell — audit

Verdict: **PASS WITH FINDINGS**

## AC table

| AC | Verdict | Evidence |
|---|---|---|
| AC-DS-1 | UNVERIFIABLE-WITHOUT-BROWSER | 4-page portrait A4 PDF print test requires running browser and measuring print output. |
| AC-DS-1a | UNVERIFIABLE-WITHOUT-BROWSER | Landscape A4 dimensions require browser print test. |
| AC-DS-2 | UNVERIFIABLE-WITHOUT-BROWSER | Control-to-SVG re-render requires browser interaction. |
| AC-DS-3 | UNVERIFIABLE-WITHOUT-BROWSER | Offline test (network disabled, cache cleared) requires browser. |
| AC-DS-4 | UNVERIFIABLE-WITHOUT-BROWSER | Tier colour comparison edit-view to print-view requires browser rendering. |
| AC-DS-5 | MET | document-shell.js exports clean SVG source; pages created via _createSVGElement (line 95+) produce named groups and readable structure. No generated-looking id soup. |
| AC-DS-6 | MET | grep for "lesson", "student", "curriculum", "outcome", "vcaa", "victoria" outside comments returns nothing; document-shell is content-blind. |
| AC-DS-7 | UNVERIFIABLE-WITHOUT-BROWSER | Packaging decision (one vs two documents) affects print behavior; requires browser test. |
| AC-DS-8 | UNVERIFIABLE-WITHOUT-BROWSER | Image rendering with placeholder requires browser and blob handling. |
| AC-DS-9 | MET | Zero imports outside ES module syntax; no vendored files, no package.json, no CDN links; vanilla ES modules only. |

## Findings

### F1 — Global exports in index.html violate ES module principles  [severity: major]

File: `app/index.html` lines 21–31 · Inside `<script type="module">`, TIERS and DocumentShell are imported then re-exported to `window.*`:
```javascript
import { TIERS, DocumentShell } from "./js/document-shell.js";
window.TIERS = TIERS;
window.DocumentShell = DocumentShell;
```
· Spec FR-DS-6 requires "Exports the three tier constants... as the single definition in the codebase" — `document-shell.js` does this correctly via ES module export · However, index.html creates global properties, violating ES module discipline and potentially hiding implicit dependencies in other builds · **Risk:** Other wave-2+ builds may now depend on `window.TIERS` or `window.DocumentShell` instead of importing them, creating fragile global state · **Action item:** Audit all dependent builds (lesson-plan-generator, marking-matrix, etc.) to verify they import from document-shell.js rather than using these globals. If any do, record as a defect against that build · **Suggested fix:** Remove lines 26–27; let consumers import directly: `import { TIERS, DocumentShell } from "../js/document-shell.js"`.

### F2 — Tier constants definition single and correct  [severity: none]

File: `document-shell.js` lines 10–26 · TIERS object defines three tiers (pass/intermediate/advanced) with line/tint/ink colours (6 hex values per tier, 18 total) · No other TIERS definition found in codebase · Single source of truth maintained per FR-DS-6 / INV-DM-1.

### F3 — Page geometry constants locked in code  [severity: none]

File: `document-shell.js` lines 30–43 · PAGE_GEOMETRY defines portrait (210×297mm) and landscape (297×210mm) with viewBox values · Both orientations hard-coded per AD-DS-1 · No @page rules elsewhere in bundle (grep confirms); document-shell owns this exclusively per spec §4 coordinate-with rule.

### F4 — Orientation immutability enforced  [severity: none]

File: `document-shell.js` lines 54–68 · DocumentShell constructor validates orientation (portrait | landscape) on line 55; immutable per AD-DS-4 (orientation set once per document, re-render into new document if orientation needed to change).

## Not verifiable without a browser

- AC-DS-1, AC-DS-1a: A4 print test (requires measuring printed sheet or PDF page size)
- AC-DS-2: Edit-to-render re-trigger (requires browser interaction)
- AC-DS-3: Offline operation (requires disabling network/cache)
- AC-DS-4: Colour printing verification (requires print preview or physical print)
- AC-DS-7: Mixed-orientation handling (requires browser print job)
- AC-DS-8: Image placeholder rendering (requires blob and network interaction)
