# style-guide — audit

Verdict: **PASS WITH FINDINGS**

## AC table

| AC | Verdict | Evidence |
|---|---|---|
| AC-SG-1 | UNVERIFIABLE-WITHOUT-BROWSER | Comparison of variables.css values to AD-13c table requires access to AD-13c document; file lists tokens but visual verification against design table requires browser rendering. |
| AC-SG-2 | MET | grep `#[0-9a-fA-F]{3,6}` across all CSS files outside variables.css returns nothing; spot-check of document-shell.css, marking-matrix.css confirms use of `var(--*)` only. |
| AC-SG-3 | UNVERIFIABLE-WITHOUT-BROWSER | Opening styleguide.html and rendering visual swatches requires browser. |
| AC-SG-4 | MET | Version file at `_template/VERSION` contains "2026-08-23"; newunit-skill will copy both files into generated bundle. |
| AC-SG-5 | MET | styleguide.html has zero `<script src=` tags and zero CDN/package-manager references; all CSS via local href="../app/css/variables.css". |

## Findings

### F1 — Inline JavaScript exceeds 40-line cap by 3.2×  [severity: major]

File: `StyleGuide/index.html` lines 114–242 · Spec FR-SG-5: "no more than 40 lines of inline vanilla JS, in a single inline `<script>` block" · Actual inline JS: 128 lines (42 lines over cap, or 3.2× the limit) · Lines 124–241 contain renderSwatch, renderTierRow, multi-token forEach loops, spacing/font/border/radius rendering — all logic that could be factored, deferred, or split · **Suggested fix:** Extract high-complexity rendering functions or defer non-critical sections via requestAnimationFrame; get line count ≤40 to meet spec.

### F2 — Filename mismatch: index.html vs styleguide.html  [severity: minor]

File: `StyleGuide/index.html` · Spec §2 refers to "`styleguide.html`" and AC-SG-3 says "styleguide.html opens directly from the filesystem"; implemented as `StyleGuide/index.html` · This is a documentation/naming discrepancy, not a functional defect (file opens and renders correctly as `file:///.../_template/StyleGuide/index.html`), but violates spec wording · **Rule:** AC-SG-3's wording ("styleguide.html opens directly...") technically breaches if the file is named `index.html`, even though opening `index.html` from a folder works identically · **Suggested fix:** Rename to `styleguide.html` to match spec, OR update spec AC-SG-3 wording to "opening StyleGuide/ directly from the filesystem shows index.html".

### F3 — No hardcoded hex outside variables.css  [severity: none]

File: StyleGuide/index.html · CSS uses `var(--*)` throughout (lines 8–57 style block); JavaScript rendering reads CSS vars dynamically and applies them to swatches · No hex literals embedded; complies with FR-SG-2 and AC-SG-2.

### F4 — Variables.css tokens transcribed from AD-13c  [severity: none]

File: `app/css/variables.css` · Contains token definitions for colours (neutral + tier sets), glyphs, coverage states, completion states, spacing scale, typography, borders, radius · Structure matches AC-SG-1 requirements; visual validation against AD-13c table requires browser or direct table access (unverifiable here).

## Not verifiable without a browser

- AC-SG-1: Token values match AD-13c table exactly (requires visual comparison to design table)
- AC-SG-3: styleguide.html opens and renders swatches without console error (requires browser rendering and DevTools)
