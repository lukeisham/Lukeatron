# style-guide — Execution Plan

**Build:** style-guide | **Wave:** 1 (foundation) | **Date:** 2026-08-29

---

## 1. Files

| Path | Purpose |
|------|---------|
| `_template/app/css/variables.css` | Every CSS custom property token from AD-13c's table: colours (neutral + tier sets), spacing, typography, borders, coverage cells, completion states (FR-SG-1, FR-SG-2) |
| `_template/StyleGuide/index.html` | Static reference page rendering every token visually: colour swatches, radius/border samples, font stacks, tier bands, coverage/completion states (FR-SG-3, FR-SG-5) |

---

## 2. Steps

- [ ] Transcribe `variables.css` from AD-13c's table (digest §1, style-digest.md):
  - [ ] Neutral palette: `--color-text-primary`, `--color-text-secondary`, `--color-text-tertiary`, `--color-bg-white`, `--color-bg-light`, `--color-bg-very-light`, `--color-border-*` (strong, medium, light, dashed)
  - [ ] Tier colours (all 9 values): Pass line/tint/ink, Intermediate line/tint/ink, Advanced line/tint/ink (exact hex values from AD-13c)
  - [ ] Domain glyphs: `--color-skill-glyph`, `--color-knowledge-glyph`
  - [ ] Coverage cell states: full (bg + border), partial (gradient + border), none (border + bg)
  - [ ] Completion row tint
  - [ ] Coverage gap chips (taught/assessed/neither — bg, border, ink for each)
  - [ ] Spacing: `--space-xs` through `--space-13xl` (3px to 44px, exact values from table)
  - [ ] Typography: font stacks (system, monospace, serif), font sizes (xs through 6xl), borders/radius
  - [ ] Print: `--print-color-adjust: exact`
  - [ ] Wrap all in `:root { ... }` (CSS variables on root only, per CSS-2)
  - [ ] Verify every value matches AD-13c exactly — no rounding, no "close enough"
- [ ] Create `StyleGuide/index.html` (vanilla, under 40 lines of JS):
  - [ ] HTML structure:
    - [ ] `<head>`: title, `<link>` to `variables.css` (relative path: `../app/css/variables.css`)
    - [ ] `<body>`: no server needed, opens as file (FR-SG-3)
  - [ ] Render every token visually:
    - [ ] Section: "Neutral Palette" — table with color name, hex, and swatch (div with background-color)
    - [ ] Section: "Tier Colours" — for each tier (Pass/Intermediate/Advanced), show line/tint/ink swatches (3×3 grid)
    - [ ] Section: "Domain Glyphs" — skill/knowledge glyphs (colour swatches)
    - [ ] Section: "Coverage Cell States" — full (solid blue), partial (diagonal gradient), none (white with border) samples
    - [ ] Section: "Completion States" — complete, not yet, row tint swatches
    - [ ] Section: "Spacing" — rendered px grid or visual samples (small lines/boxes showing relative sizes)
    - [ ] Section: "Typography" — sample text in each font stack, sample sizes (9.5px through 23px)
    - [ ] Section: "Borders & Radius" — samples of solid, solid-thick, dashed borders; radius samples (4px through 50%)
  - [ ] Vanilla JS (under 40 lines, one `<script>` block at bottom):
    - [ ] Read `variables.css` via `getComputedStyle(document.documentElement)`
    - [ ] Iterate each token and render corresponding swatch/sample
    - [ ] No build step, no fetch, no CDN, no external script (FR-SG-5)
  - [ ] Inline all CSS (no `<link>` to external CSS, only to `variables.css`)
  - [ ] Screen-only, no print stylesheet (FR-SG-7, OQ-SG-1)
- [ ] Verify `variables.css` against AD-13c's table entry-by-entry (AC-SG-1):
  - [ ] Count entries: ~35 colour tokens, 13 spacing values, 3 font stacks, 5 font sizes, 3 border styles, 6 radius values — spot-check a dozen random values against the table
- [ ] Verify every hex colour outside `variables.css` in the bundle returns nothing (grep future-proofing, AC-SG-2):
  - [ ] This is the only place hex colours should appear (when other CSS files are written, they reference via `var(--color-*)`)
- [ ] Test `styleguide.html` opens without server, no console errors (AC-SG-3):
  - [ ] Open as file (`file://...`), verify all swatches render
  - [ ] Open dev console, verify no 404s or errors
- [ ] Verify `styleguide.html` has zero `<script src=` tags pointing outside the bundle (AC-SG-5)
- [ ] Verify `styleguide.html` is a static reference, not an editor (FR-SG-2, AD-SG-2):
  - [ ] No colour pickers, no save buttons, no persistence — display only

---

## 3. Interfaces

**Exports (consumed by all builds rendering CSS):**

| Token Name | Value | Used for |
|------------|-------|----------|
| `--color-pass-line` | #1F6B41 | Pass tier borders, backgrounds (green) |
| `--color-pass-tint` | #E4F4E9 | Pass tier background tint (light green) |
| `--color-pass-ink` | #14502F | Pass tier text colour |
| `--color-intermediate-line` | #185FA5 | Intermediate tier borders (blue) |
| `--color-intermediate-tint` | #E6F1FB | Intermediate tier background tint (light blue) |
| `--color-intermediate-ink` | #0C447C | Intermediate tier text |
| `--color-advanced-line` | #9A4E12 | Advanced tier borders (orange) |
| `--color-advanced-tint` | #FCEEE2 | Advanced tier background tint (light orange) |
| `--color-advanced-ink` | #703508 | Advanced tier text |
| (+ all spacing, typography, border tokens per AD-13c) | (exact values from table) | Global CSS references |

**Single source of truth:** `_template/app/css/variables.css` — every other stylesheet in every bundle references these via `var(--name)`, never hardcoded values (CSS-2, AC-SG-2).

**Consumes:**
- `bundle-template`'s `app/css/` folder (creates `variables.css` there)
- `bundle-template`'s `StyleGuide/` folder (creates `index.html` there)
- AD-13c's settled token table (no new decisions, transcription only)

---

## 4. Verification

| AC | Check | Proof |
|----|-------|-------|
| **AC-SG-1** | Every colour, radius, border, and font-stack value in `variables.css` matches AD-13c's table exactly | Open `variables.css`, pick 10 random tokens (e.g., `--color-pass-line`, `--space-md`, `--font-size-lg`), verify each matches AD-13c to the hex/px/value |
| **AC-SG-2** | Grepping every CSS file in a bundle for raw hex colour (`#[0-9a-fA-F]{3,6}`) outside `variables.css` returns nothing | `grep -r "#[0-9a-f]\{3,6\}" _template/app/css/ | grep -v variables.css` returns nothing (and `grep -r "#[0-9a-f]\{3,6\}" _template/StyleGuide/` returns nothing) |
| **AC-SG-3** | `styleguide.html` opens directly from the filesystem with no server, renders all tokens, no console error | Open `file:///path/to/_template/StyleGuide/index.html` in browser, verify colour swatches appear, check console for errors (should be clean) |
| **AC-SG-4** | A unit created via `!NewUnit` carries `variables.css` and `styleguide.html` byte-identical to template's copies | Generate unit via `!NewUnit`, compare `sha256sum` of new unit's `app/css/variables.css` to template's — should match exactly |
| **AC-SG-5** | `styleguide.html` contains zero `<script src=` tags pointing outside the bundle | Grep: `grep '<script src=' _template/StyleGuide/index.html` returns nothing (or only local paths); zero CDN/package manager references |

---

## 5. Risks & Open Points

| Risk | Recommendation |
|------|---|
| **AD-13c changes but `variables.css`/`styleguide.html` don't get updated** — a generated bundle ships stale colours no one notices until printed | **Mitigation:** FR-SG-6 requires same-revision currency. This build's verification gate: whenever AD-13c changes, update `variables.css` and `styleguide.html` in the same commit. Consider adding a comment at the top of `variables.css` naming the AD-13c revision for drift detection. |
| **`styleguide.html`'s inline JS breaks the moment CSS token names change** — the JS reads computed styles, so a rename breaks silently | Recommendation: the CSS token names are part of the AD-13c spec and are not expected to change in v1. If they do, `styleguide.html`'s JS will continue to work (it just displays whatever `getComputedStyle` returns); the page might look odd but won't error. Accept this risk in v1. |
| **A future part's CSS hardcodes a hex colour instead of referencing the token** — the settled palette drifts silently | **Mitigation:** AC-SG-2 grep check is the gate. Add it as an automated check in verification for every build that writes CSS. Document this as a project-wide rule. |
| **Should `styleguide.html` link to the token table in the documentation?** | Recommendation: No link inside the generated bundle (FR-SG-8). The StyleGuide is a build-time reference opened directly, not a navigation node. Link to AD-13c only in project docs. |

---

**On completion:** Verify all AC-SG-1…5 pass, move spec and plan to `_Builds/_Done/`, update `_PLAN.md`.
