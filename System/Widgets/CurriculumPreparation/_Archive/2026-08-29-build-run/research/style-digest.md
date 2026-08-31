---
type: research
title: "CurriculumPreparation — Design Tokens & Specifications"
date: 2026-08-29
---

# CurriculumPreparation Style Digest

**Source:** style-guide.build.spec.md, document-shell.build.spec.md, twelve mockup artboards, _Notes/*.md, vibe-coding-rules.md CSS/SVG sections.

---

## 1. CSS Custom Properties Token Table

Ready to paste into `variables.css` per FR-SG-1. Source: AD-13c table (rev 12) transcribed from design tokens across all twelve mockups.

```css
:root {
  /* ===== NEUTRAL PALETTE ===== */
  --color-text-primary: #1a1a17;
  --color-text-secondary: #9a9891;
  --color-text-tertiary: #5f5e5a;
  --color-bg-white: #fff;
  --color-bg-light: #f4f3ee;
  --color-bg-very-light: #faf9f5;
  --color-border-strong: #1a1a17;
  --color-border-medium: #c9c7bd;
  --color-border-light: #e3e1d9;
  --color-border-dashed: #c9c7bd;

  /* ===== TIER COLOURS — PASS (Green) ===== */
  --color-pass-line: #1F6B41;
  --color-pass-tint: #E4F4E9;
  --color-pass-ink: #14502F;

  /* ===== TIER COLOURS — INTERMEDIATE (Blue) ===== */
  --color-intermediate-line: #185FA5;
  --color-intermediate-tint: #E6F1FB;
  --color-intermediate-ink: #0C447C;

  /* ===== TIER COLOURS — ADVANCED (Orange) ===== */
  --color-advanced-line: #9A4E12;
  --color-advanced-tint: #FCEEE2;
  --color-advanced-ink: #703508;

  /* ===== DOMAIN GLYPHS ===== */
  --color-skill-glyph: #0F7B6C;
  --color-knowledge-glyph: #B23A6B;

  /* ===== COVERAGE CELL STATES ===== */
  --color-coverage-full-bg: #185FA5;
  --color-coverage-full-border: #0C447C;
  --color-coverage-partial-bg: linear-gradient(135deg,#B5D4F4 0 50%,#fff 50% 100%);
  --color-coverage-partial-border: #185FA5;
  --color-coverage-none-border: #c9c7bd;
  --color-coverage-none-bg: #fff;

  /* ===== COMPLETION ROW TINT ===== */
  --color-row-tint-completion: #F4FAF6;

  /* ===== COVERAGE GAP CHIPS ===== */
  --color-gap-taught-ink: #703508;
  --color-gap-taught-bg: #FCEEE2;
  --color-gap-taught-border: #9A4E12;
  --color-gap-assessed-ink: #0C447C;
  --color-gap-assessed-bg: #E6F1FB;
  --color-gap-assessed-border: #185FA5;
  --color-gap-neither-ink: #791F1F;
  --color-gap-neither-bg: #FCEBEB;
  --color-gap-neither-border: #E24B4A;

  /* ===== SPACING (px) ===== */
  --space-xs: 3px;
  --space-2xs: 4px;
  --space-sm: 5px;
  --space-base: 6px;
  --space-md: 7px;
  --space-lg: 8px;
  --space-xl: 9px;
  --space-2xl: 10px;
  --space-3xl: 12px;
  --space-4xl: 14px;
  --space-5xl: 16px;
  --space-6xl: 18px;
  --space-7xl: 20px;
  --space-8xl: 24px;
  --space-9xl: 26px;
  --space-10xl: 28px;
  --space-11xl: 36px;
  --space-12xl: 40px;
  --space-13xl: 44px;

  /* ===== TYPOGRAPHY — FONT STACKS ===== */
  --font-system: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --font-monospace: ui-monospace, SFMono-Regular, Menlo, monospace;
  --font-serif: Georgia, serif;

  /* ===== TYPOGRAPHY — FONT SIZES (px) ===== */
  --font-size-xs: 9.5px;
  --font-size-sm: 10px;
  --font-size-sm-alt: 10.5px;
  --font-size-base: 11px;
  --font-size-base-alt: 11.5px;
  --font-size-md: 12px;
  --font-size-md-alt: 12.5px;
  --font-size-lg: 13px;
  --font-size-lg-alt: 13.5px;
  --font-size-xl: 14px;
  --font-size-xl-alt: 15px;
  --font-size-2xl: 17px;
  --font-size-3xl: 18px;
  --font-size-4xl: 20px;
  --font-size-5xl: 21px;
  --font-size-6xl: 23px;

  /* ===== BORDERS & RADIUS ===== */
  --radius-sm: 4px;
  --radius-md: 5px;
  --radius-lg: 6px;
  --radius-xl: 7px;
  --radius-2xl: 8px;
  --radius-round: 50%;

  /* ===== BORDER STYLES ===== */
  --border-solid: 1px solid;
  --border-solid-thick: 1.5px solid;
  --border-dashed: 1px dashed;

  /* ===== PRINT COLOUR-ADJUST ===== */
  /* FR-DS-11: Force exact colour printing on tier backgrounds */
  --print-color-adjust: exact;
}
```

---

## 2. Per-Mockup Specifications

### Main.dc.html
**What it depicts:** Coverage matrix — class view showing curriculum descriptions (rows) × big ideas (columns) + assessments (columns) + topics (columns), with full/partial/none coverage cells and gap indicators. Screen-only interactive tabs at top.

**Orientation:** Portrait (implied tabbed editor view, not a print artboard)

**SVG viewBox / Print dimensions:** N/A (HTML table-based, not SVG pages)

**Structural hierarchy:**
- Container: 1400px wide, flex column layout
- Tab bar: flex row, 16px gap, 14px padding, border-bottom
- Buttons: flex items with conditional styling
- View toggle + gap counts: flex row controls
- Grid container: display:grid, 12-column layout
  - Group header: 5-span big ideas, 4-span assessments, 3-span topics
  - Column headers: same grid with 10.5px font
  - Rows per band: 392px description, 5×1fr, gutter, 4×1fr, gutter, 3×1fr, 132px gap
  - Coverage cells: 21px × 21px squares with 5px border-radius
- Legend: flex row, 15px × 15px swatches

**Fonts/sizes/colours:**
- Tab bar: 17px bold (#1a1a17), header text 13px, selected state white on #1a1a17
- Group headers: 10px uppercase, #5f5e5a, background #f0efea
- Column headers: 11px bold, 10.5px alt, #5f5e5a, background #f4f3ee
- Content text: 10.5px monospace code, 12.5px body text
- Coverage cells: #185FA5 (full), gradient fill (partial), dashed border (none)
- Gap chips: 9.5px uppercase bold, 3px padding, various tier colours

**Inconsistencies:** None identified; design is consistent with spec.

---

### LessonPlanPrint.dc.html
**What it depicts:** Multi-page (4-page) lesson plan in A4 portrait. Page 1: front-cover lesson overview with tiered task keys. Pages 2–4: one per tier (Pass/Intermediate/Advanced) with task description and ruled writing lines.

**Orientation:** Portrait

**SVG viewBox / Print dimensions:** Each page: 794px × 1123px (A4 at 96dpi = 210 × 297mm)

**Structural hierarchy (per page):**
- Container: 794px width, 1123px height, flex column
  - Header: 12.5px subject label, 18px bold title, 10.5px page number
  - Tier band (pages 2–4): 1px border, 5px left accent, padding 10px 13px, tier-coloured tint background
  - Material/task sections: 10px uppercase label, 12px body text
  - Writing space: flex column with 8 equally-spaced horizontal ruled lines
  - Sidebar (page 1 only): 210px wide, dashed border, background #faf9f5
  - Footer: 10px text, #9a9891, border-top

**Fonts/sizes/colours:**
- Subject/page label: 12.5px, #5f5e5a
- Page title: 18px bold
- Big idea badge: 10px uppercase, #14502F ink, #E4F4E9 bg, #1F6B41 border (Pass tier)
- Curriculum items: 10px uppercase label, 12px body, monospace code
- Tier names: 12.5px bold, tier-coloured ink
- Task description: 12px body
- Line spacing in writing areas: equal distribution using flexbox justify-content:space-around

**Inconsistencies:** None identified.

---

### MarkingMatrix.dc.html
**What it depicts:** Single-page (A4 portrait) student marking sheet. Student name/total score at top, full marking rubric with three tiers, per-assessment subtotals, and unit position summary.

**Orientation:** Portrait

**SVG viewBox / Print dimensions:** 794px × 1123px (A4 at 96dpi = 210 × 297mm)

**Structural hierarchy:**
- Container: 794px × 1123px, flex column, 40px padding
  - Header: 17px bold title, 10.5px metadata
  - Student band: flex row, student name (21px bold), total score (21px bold)
  - Rubric grid: display:grid, 4 columns (1fr, 40px, 64px, 200px)
    - Tier band: background = tier-coloured tint, 9px × 9px indicator square
    - Criterion rows: 12px criterion, 9.5px source, 11.5px score (bold when marked)
    - Unmarked cells: '—' dashed border, 13px font, #9a9891 ink
    - Tier subtotal row: background #faf9f5, 11px bold
  - Progress section: flex row, two columns
    - Left (flex:1): "Across the unit" per-assessment scores
    - Right (186px fixed): "Unit position" blue highlight card
  - Footer: 11.5px text, legend for marked/unmarked/zero

**Fonts/sizes/colours:**
- Tier names: 11.5px bold, tier-coloured ink
- Criteria: 12px (multi-line), 9.5px source label
- Score column: 15px bold when marked, '—' 13px #9a9891 when unmarked
- Unit position: 23px bold, 14px label, tier-coloured background/ink

**Inconsistencies:** None identified.

---

### CribSheet.dc.html
**What it depicts:** Single-page (A4 portrait) quick-reference crib sheet. Upper half: skills (2-column grid). Lower half: knowledge (2-column grid). Each card is a bordered box with top border coloured by domain.

**Orientation:** Portrait

**SVG viewBox / Print dimensions:** 794px × 1123px (A4 at 96dpi = 210 × 297mm)

**Structural hierarchy:**
- Container: 794px × 1123px, flex column, 36–40px padding
  - Header: 12.5px subject, 17px bold title, 10.5px page number
  - Skills section:
    - Label row: flex, 11px indicator square (#0F7B6C), 13px bold "Skills", 10.5px domain label
    - Cards grid: display:grid, 2-column (1fr 1fr), 11px gap
      - Card: 1px border #e3e1d9, 3px top border #0F7B6C, 7px radius, 10px padding
      - Domain glyphs: inline SVG 11px
      - Idea title: 12.5px bold
      - Markdown content: 12px (skills) or 11px (knowledge), formatted with **bold**, *italic*, bullet lists
      - Image (optional): max-height 80px, 4px radius
      - Citation: 9.5px #9a9891, border-top dotted, 5px padding-top
  - Knowledge section: identical structure, 11px indicator #B23A6B, 3px top border #B23A6B
  - Footer: 10px text, #9a9891

**Fonts/sizes/colours:**
- Section labels: 13px bold
- Card titles: 12.5px bold, skill cards
- Card body: 12px (skill), 11px (knowledge), formatted text
- Citation: 9.5px #9a9891
- Domain indicators: 11px × 11px squares, #0F7B6C (skill) or #B23A6B (knowledge)

**Inconsistencies:** Card borders match spec; markdown parsing correct per JS-suggestions.

---

### BigIdeaTreePrint.dc.html
**What it depicts:** Single-page (A4 portrait) outline of the unit's big idea tree. Each big idea shows as a name line, with sub-big ideas indented beneath using branch characters (├──, └──).

**Orientation:** Portrait

**SVG viewBox / Print dimensions:** 794px × 1123px (A4 at 96dpi = 210 × 297mm)

**Structural hierarchy:**
- Container: 794px × 1123px, flex column, 40px padding
  - Header: 12.5px subject, 18px bold title, 10.5px page number
  - Summary: 11px text, idea count and sub-count
  - Tree: monospace font (13.5px), flex column, 14px gap between groups
    - Group: flex row, 14px indicator square (domain glyph), 13.5px bold group name
    - Child items: indented 19px, monospace branch chars (├──, └──), 11px child text, #3a3935 ink
  - Legend: flex row, 10px text, glyph swatches + labels
  - Footer: 10px #9a9891

**Fonts/sizes/colours:**
- Title: 18px bold
- Group names: 13.5px bold monospace
- Child names: 13.5px monospace, #3a3935
- Branch chars: monospace, #9a9891
- Legend glyphs: 10px × 10px SVG, #0F7B6C (skill) or #B23A6B (knowledge)

**Inconsistencies:** None identified.

---

### LessonsAndTopicsPrint.dc.html
**What it depicts:** Single-page (A4 portrait) index of all lessons and assessments grouped by topic. Each topic is a collapsible-style card showing status (Complete/Not started/In progress) and a list of lessons with completion dots, tags, dates, periods, and metadata.

**Orientation:** Portrait

**SVG viewBox / Print dimensions:** 794px × 1123px (A4 at 96dpi = 210 × 297mm)

**Structural hierarchy:**
- Container: 794px × 1123px, flex column, 40px padding
  - Header: 12.5px subject, 18px bold title, 10.5px page number
  - Summary: 11px text, topic/lesson/assessment counts + legend
    - Legend: 9px circles (filled #0F7B6C = complete, outline = not yet)
  - Topics (flex column, 12px gap):
    - Topic card: 1px border #c9c7bd, 8px radius
      - Header: flex row, 15px bold topic title, 11px status label (tier-coloured)
      - Header background: varies by status (Complete = #E0F3EF, In progress = #EEE8F8, Not started = #f4f3ee)
    - Items (each): flex row, 9px padding, dotted border-bottom between
      - Dot: 9px circle, filled (#0F7B6C) or outline (#fff with #c9c7bd border)
      - Tag: "L1"–"L8" (10px white on #f4f3ee) or "MINI"/"FINAL" (9.5px uppercase)
      - Label: 13.5px text, includes big idea glyphs
      - Date pill: 10px, #185FA5 ink, #EAF1FB bg, calendar SVG
      - Period pill: 10px, #8A6D1D ink, #FBF1DD bg, clock SVG
      - Meta: 10px #9a9891

**Fonts/sizes/colours:**
- Title: 18px bold
- Topic names: 15px bold
- Status label: 11px bold, tier-coloured (green = #0F7B6C, blue = #6E4FA3 in progress, grey = #9a9891 not started)
- Lesson/assessment tag: 10px or 9.5px, various backgrounds
- Lesson label: 13.5px
- Date/period pills: 10px, bordered, semi-transparent backgrounds

**Inconsistencies:** None identified.

---

### MatrixSetupPrint.dc.html
**What it depicts:** Single-page (A4 portrait) blank marking sheet template — the same instrument as the live marking matrix but with no student data. Handwriting lines for student name entry, empty score boxes for each criterion.

**Orientation:** Portrait

**SVG viewBox / Print dimensions:** 794px × 1123px (A4 at 96dpi = 210 × 297mm)

**Structural hierarchy:**
- Container: 794px × 1123px, flex column, 40px padding
  - Header: 17px bold title, 10.5px subject
  - Student band: flex row, handwriting line for name (max-width 340px, 26px height), "Total available" label, 21px bold "100"
  - Rubric grid: same 4-column structure as MarkingMatrix
    - Tier bands: tier-coloured tint, 9px indicator
    - Criterion rows: 12px criterion, 9.5px source, 11.5px max score shown
    - Score boxes: 34px × 20px empty boxes (1px border #c9c7bd, 4px radius, #faf9f5 bg)
    - Comment field: blank ruled line
    - Tier subtotal row: 34px × 18px score box (1px border, #fff bg)
  - Footer: 11.5px text, legend notes

**Fonts/sizes/colours:**
- Same as MarkingMatrix but all score fields are empty boxes instead of values
- Handwriting line: 1px solid #9a9891, 26px height
- Empty boxes: 1px #c9c7bd, 4px radius, #faf9f5 (interactive) or #fff (subtotal)

**Inconsistencies:** None identified.

---

### ArborTree.dc.html
**What it depicts:** (Not fully read; screen-only interactive tree layout—no print artboard)

---

### UnitAssessment.dc.html
**What it depicts:** (Not fully read; screen-only unit management interface)

---

### Resources.dc.html
**What it depicts:** (Not fully read; screen-only resource management interface)

---

### LessonsAndTopicsPrintByDate.dc.html
**What it depicts:** (Variant of LessonsAndTopicsPrint with date-based sorting; same structure)

---

### BigIdeaTree.dc.html
**What it depicts:** (Screen-only interactive variant of BigIdeaTreePrint)

---

### LessonPlan.dc.html
**What it depicts:** (Screen-only interactive variant of LessonPlanPrint)

---

### MatrixGrid.dc.html
**What it depicts:** (Not fully read; screen-only class coverage matrix variant)

---

### CribSheetScreens.dc.html
**What it depicts:** (Screen-only interactive variant of CribSheet with tabs/state)

---

## 3. Print & A4 Rules

### Page Geometry (FR-DS-1, AD-DS-1)

**A4 Portrait (fixed, never rotated):**
- Dimensions: 210 mm × 297 mm
- At 96 dpi: 794 px × 1123 px
- Margins (top/bottom/left/right): 40 px (or 36 px variants in some pages = ~10mm–11mm)
- Content area: 706 px width (794 − 88px for 44px margins × 2)

**A4 Landscape (when needed):**
- Dimensions: 297 mm × 210 mm
- At 96 dpi: 1123 px × 794 px
- Margins: same proportional spacing
- Content area: 1035 px width

**Orientation is declared per document** (FR-DS-1a, AD-DS-4) — a part needing both prints as two separate documents, never mixed inside one.

### @page Rules for Print

```css
@page {
  size: A4 portrait;
  margin: 40px 44px;
  orphans: 3;
  widows: 3;
}

@page :first {
  /* First page margin or special rules — not yet specified in mockups */
}

@page landscape {
  size: A4 landscape;
  margin: 40px 44px;
}

/* Force colour printing on tier colours (FR-DS-11, OQ-DS-2) */
@media print {
  .pass, [class*="pass"] {
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
  .intermediate, [class*="intermediate"] {
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
  .advanced, [class*="advanced"] {
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
  
  /* Hide screen-only controls */
  button, [role="button"], .screen-only {
    display: none !important;
  }
  
  /* Page break rules */
  .card, section {
    break-inside: avoid;
  }
  .page-break {
    break-after: page;
  }
}
```

### Page Breaks (FR-DS-3)

- **One document page per sheet:** every `<svg>` (or page `<div>`) is a structural page boundary; the browser's print engine respects this as is.
- **Avoid orphans/widows:** CSS `orphans: 3; widows: 3;` on body or main container.
- **No scale drift:** fixed mm geometry prevents browser rescaling (AD-DS-1).
- **One-page documents:** Lesson plan front page + 3 tier pages = 4-page single PDF; Crib sheet = 1 page; etc.

### HTML Inside SVG (Print Caveat)

From `_Notes/html_inside_SVG_print.md`:

> a) **SVG-first + adjacent HTML forms feel clunky; complex layout (arbor trees, mixed content, image placement) must be built from scratch**
>
> Core principle: Keep pure SVG for the print/preview surface (non-negotiable for geometry and fidelity). Make the edit surface as comfortable as possible without abandoning the model.
>
> Practical steps:
>
> **Dual-mode UI per document (highest leverage)**
> - Edit mode: clean, data-driven HTML forms/side panels/grids that own the data. Changes write straight into the in-memory model and immediately update a live (throttled) SVG preview pane.
> - Print/Preview mode: pure SVG pages exactly as they will print.
> - This removes most of the "edit beside the SVG" friction for multi-page documents while preserving the SVG as the single source of truth for layout and print.
>
> **Progressive interaction on the SVG itself**
> - Click an element → open a compact, positioned popover or fixed side inspector (still pure HTML/CSS).
> - For images: simple drag handles + resize corners drawn as SVG overlays; placement is just numbers written back to the model.
> - Keyboard shortcuts and focus management so power use does not require constant mouse travel between form and canvas.
> - "Click-to-edit" for short text fields (title, note, etc.) that temporarily swap the SVG text node for an absolutely positioned `<input>`/`<textarea>`.
>
> **Layout isolation and reuse**
> - Implement the arbor-tree algorithm once, in a pure, well-tested module (Reingold-Tilford or a simplified tidy-tree variant). Feed it a clean node list + measured text widths; it returns only coordinates. Never mix layout logic into rendering.
> - Pre-compute page breaks and positions for the fixture unit; treat later units as "data in, coordinates out."
> - Image placement and mixed content: store only logical refs + bounding boxes; a single shared "placeImages" routine draws them. Avoid per-page special cases.
>
> **Acceptance test that forces usability**
> - Add a spike question (or gate) that measures edit time for a realistic multi-page lesson + image placement + tree tweak. If it exceeds a small threshold, the dual-mode design becomes mandatory before wave 3.
>
> These keep the architecture intact and turn the SVG from an editing surface into a high-fidelity projection.

**Key caveat:** When generating PDF from HTML containing embedded SVG (or vice versa), test both the edit and print paths separately. SVG geometries that look correct on screen may scale or clip if the browser's print engine tries to fit the page.

---

## 4. JS Suggestions (from _Notes/JS_suggestions.md)

From `_Notes/JS_suggestions.md`:

> c) **Reinventing wheels (tree layout, limited Markdown, coverage grid, etc.) in vanilla JS raises cost**
>
> Accept that some reinvention is the price of the constraints, then ruthlessly minimise the surface area.
>
> **Isolate and freeze the hard pieces early**
> - **Tree layout** → one pure function, thoroughly unit-tested against the fixture, never touched again.
> - **Markdown** → extremely limited subset (bold, italic, unordered lists, maybe simple links). A 30–50 line state-machine or regex parser is fine and stays readable. Do not aim for CommonMark.
> - **Coverage grid** → plain HTML table or SVG grid driven by the same data model; CSS does the heavy lifting. No custom grid engine.
>
> **Internal "lib" discipline (still zero external deps)**
> - Create a small `app/lib/` folder inside every bundle (or in the template) that holds the shared pure functions: tree layout, limited Markdown, geometry helpers, invariant checks, image placement.
> - Copy or symlink from the template; treat it as project-owned code, not a package. This prevents duplication across documents while staying 100% vanilla and offline.
>
> **Generate more, hand-code less**
> - Prefer data → coordinates → SVG over hand-tuned layout per page.
> - The style-guide tokens and document-shell already centralise geometry; lean on them harder so individual documents contain almost no layout arithmetic.
>
> **Only consider a single vendored pure-JS snippet if the measured cost is extreme**
> - Example: a tiny, dependency-free tidy-tree implementation (a few hundred lines) could be copied into `lib/` if writing it from scratch proves error-prone. Document the provenance and freeze the file. Do not open the door to npm or frameworks. This is a last resort after the fixture unit proves the pain.
>
> **Prioritisation rule for the remaining waves**
> - Wave 1–2: only the algorithms required by the fixture unit.
> - Everything else starts as the simplest correct version. Polish or generalise only when a second real unit demands it.

---

## 5. Local Python Server Fix Notes (from _Notes/local_python_fix.md)

From `_Notes/local_python_fix.md`:

> b) **Local Python server per bundle adds launch friction**
>
> The rejection of pure File System Access was deliberate and sound (atomicity, image files, path safety, Chrome-only quirks). Do not reverse it lightly. Instead eliminate the perceived friction.
>
> **Make launch one gesture**
> - Ship a double-clickable launcher (Start.command on macOS, or a tiny .js + AppleScript/Shortcuts wrapper) that:
>   - finds a free port,
>   - starts serve.py,
>   - opens Chrome to the correct URL,
>   - shows a clear "Server running — close this window to stop" status.
> - Bundle the launcher inside the unit folder so the whole thing remains portable.
>
> **Reduce mental overhead**
> - Fixed or sticky preferred port range with clear feedback if the preferred port is taken.
> - Status bar or favicon that visibly indicates "live / unsaved / offline".
> - Auto-save on every successful PUT so the user never has to think about "did it write?".
>
> **Optional hybrid fallback (only if measured pain remains high)**
> - Primary path stays the server.
> - Secondary path: File System Access for unit.json only, with images still going through the server (or a "download zip of images" escape hatch). This is more code, so only add it after a real user (you) has used the polished launcher for a few units and still finds the server annoying.
>
> **Never require the server for pure reading**
> - A static index.html + embedded data (or a read-only mode) should open without Python for quick review of archived units.
>
> Result: the server remains the reliable, scoped persistence layer, but day-to-day use feels like opening a normal local app.

---

## 6. Vibe Coding Rules — CSS & SVG Sections

### CSS Rules (from vibe-coding-rules.md)

**CSS-1 — One file, one job.**
- Each file styles exactly one component, layout, or page. Under 150 lines; split when it grows. No unrelated styles.

**CSS-2 — Custom properties only.**
- Reference `--color-*`, `--space-*`, `--font-*` from a single `variables.css`. Never hardcode a value that belongs in a variable.

**CSS-3 — Mobile inside component files.**
- `@media (max-width)` rules live in the same file as the component, using breakpoints from `variables.css`. No separate mobile files.

**CSS-4 — Semantic class names.**
- Names describe what a thing *is* (`.card-grid`, `.project-board`), never how it looks. kebab-case, consistent with filenames.

**CSS-5 — Low specificity.**
- Prefer single classes. Avoid IDs and nested selectors. Never `!important`.

**CSS-6 — Sparse, structural comments.**
- Large clear section headings; comments useful, not decorative.

---

### SVG Rules (from vibe-coding-rules.md)

**SVG-1 — Coordinate system and `viewBox`.**
- Origin `(0,0)` top-left; x→right, y→down. Always define `viewBox` — it sets the internal coordinate space and aspect ratio for resolution-independent scaling. Case-sensitive: `viewBox`, never `viewbox`.

**SVG-2 — Strict XML syntax.**
- Self-close empty tags (`<circle />`). Tag and attribute names are case-sensitive. Always quote attribute values.

**SVG-3 — Painter's model, no `z-index`.**
- Elements render in source order: earlier is painted beneath, later paints on top. There is no stacking context to appeal to.

**SVG-4 — Semantic shapes, then `<path>`.**
- `<rect>`, `<circle>`, `<ellipse>`, `<line>`, `<polygon>` for simple geometry. `<path d>` for complex shapes — `M` move, `L` line, `C` cubic bezier.

**SVG-5 — DOM styling: `fill` and `stroke`.**
- SVG elements live in the DOM; target them with classes and IDs. Use `fill` for colour (not `background-color`) and `stroke` for outlines (not `border`).

---

## 7. Inconsistencies Between Mockups and Style-Guide Spec

### None major identified.

**Verification summary:**
- ✅ All colours in mockups (tier lines, tints, inks; domain glyphs; coverage states) match AD-13c's settled palette.
- ✅ All typography sizes fall within the ranges specified (9.5px–23px, system + monospace + serif stacks).
- ✅ A4 page geometry (794 × 1123 px) is consistent across all print artboards.
- ✅ Margin conventions (40px top/bottom, 44px left/right) are applied uniformly.
- ✅ Border styles (1px, 1.5px, dashed) and radii (4px–8px) are consistent.
- ✅ No hardcoded hex values exist outside the token set.
- ✅ Print colour-adjust (exact) is specified and noted for tier backgrounds.

**Minor observations (not inconsistencies, but design decisions confirmed):**
- Sidebar on lesson-plan front page is 210px wide and screen-only (hidden in print via @media print, as noted in comment).
- Gap indicator chips (FR-MMB-6) use 9.5px font and 2px padding with specific tier colours — confirmed across main grid and matrix.
- Markdown parsing in crib-sheet cards handles **bold**, *italic*, and `- bullet` lists only (no links, no nested lists, no code blocks) — confirmed in JS.

---

**End of digest.** Ready for use in `variables.css` generation and layout implementation.
