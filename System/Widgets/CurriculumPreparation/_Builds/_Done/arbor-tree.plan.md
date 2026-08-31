# arbor-tree — Implementation Plan

**Build:** arbor-tree (Wave 2) | **Date:** 2026-08-29 | **Status:** Ready for implementation

---

## 1. Files

```
_template/
├── app/js/
│   ├── arbor-tree.js                (Main: page model, render loop, tree layout algorithm, chip rendering)
│   ├── tidy-tree.js                 (Pure tree layout function: nodes → positioned rectangles; zero deps)
│   └── coverage-derivers.js          (Pure functions: walk lesson.nodeIds[], unitAssessment/miniAssessment coverage, topic coverage)
└── app/css/
    ├── arbor-tree.css               (Tree node cards, chip styling, landscape layout, print rules)
    └── arbor-tree-print.css         (A4 landscape @page, colour-adjust: exact for tiers, page-break rules)
```

**Purpose:**
- `arbor-tree.js` — renders the horizontal family tree, big-idea list side panel, three chip types, domain glyphs; integrates layout, coverage derivation, and document-shell.
- `tidy-tree.js` — the layout algorithm: nodes + edge list → positioned rectangles with no overlap at realistic scale; frozen once passing AC-ATB-1; pure function, extensively unit-tested.
- `coverage-derivers.js` — derives lesson coverage, assessment coverage, topic coverage per node; no UI; pure functions used by arbor-tree.
- `arbor-tree.css` — node cards, chip badges, domain glyphs, landscape flex layout, hierarchy styling.
- `arbor-tree-print.css` — A4 landscape page rules, tier colour-adjust: exact, page break handling.

---

## 2. Steps

### Phase 1: Layout Algorithm & Tree Primitives

- [ ] Write `tidy-tree.js` — the horizontal tidy-tree layout function
  - Pure function: `layoutTree(nodes, edgeList, cardWidth, cardHeight) → [{ nodeId, x, y, width, height }, ...]`
  - Root at x=0 (left edge), children fan right
  - No node overlap at realistic scale (test: ~2 strands, ~15 outcomes, 3 tasks each = 300 nodes total)
  - Uses simplified Reingold-Tilford or tidy-tree algorithm
  - Frozen once AC-ATB-1 passes (no further tuning without a failing fixture)
  - Under 150 lines (CSS-1 discipline applied to JS)
  - Unit tests against fixture trees

- [ ] Write tree-traversal utilities (in `tidy-tree.js`)
  - Build edge list from nodes (one edge per non-root parentId)
  - Compute tree depth, width per depth level
  - Return positioned rectangles for rendering

### Phase 2: Coverage Derivation Functions

- [ ] Write `coverage-derivers.js`
  - `deriveLesson Coverage(nodes, lessons) → Map<nodeId, boolean>` — walk every lesson.nodeIds[], group by nodeId, return which nodes have at least one lesson
  - `deriveAssessmentCoverage(nodes, unitAssessment) → Map<nodeId, coverage[]>` — union final + mini assessment coverage arrays, indexed by nodeId
  - `deriveTopicCoverage(nodes, topics) → Map<nodeId, coverage[]>` — union topic.coverage[] arrays, indexed by nodeId
  - All pure functions, unit-testable

### Phase 3: Chip Rendering & Domain Glyphs

- [ ] Write chip-rendering logic (in `arbor-tree.js`)
  - Big-idea coverage chips: walk bigIdea.coverage[], render full/partial badges on each covered node
  - Assessment coverage chips: render final + mini coverage independently
  - Topic coverage chips: render topic coverage independently
  - Each chip type rendered by a separate check; independent rendering (not merged into one badge)
  - Domain glyph: call `curriculum-editor`'s `resolveDomain()` for every node, render pencil/notebook/none before node code
  - No chip rendering logic duplicated; one code path per chip type

- [ ] Test chip logic against fixture with all combinations
  - Node with all three chip types + domain glyph
  - Node with zero chips
  - Node with only topic chip (isolates AD-ATB-3's independence)

### Phase 4: HTML View & SVG Print Page

- [ ] Write `arbor-tree.js` render loop
  - HTML edit-view: flex container, tree grid/canvas area, side panel for big-idea list
  - SVG print-view: one `<svg viewBox="0 0 1123 794">` per page (A4 landscape), rooted in document-shell
  - Curriculum description rendered at head of tree, unset renders nothing
  - Tree nodes as draggable rectangles (edit-view only); read-only in print

- [ ] Implement big-idea side panel (FR-ATB-5, FR-ATB-13)
  - Compact list beside the tree on landscape; runs full height
  - Each big idea with domain glyphs (union of covered nodes via `resolveDomain()`)
  - One-line per top-level idea; sub-ideas indented or nested

- [ ] Implement A4 landscape print (FR-ATB-2)
  - Fixed SVG viewBox: 1123 × 794 px (297 × 210 mm at 96 dpi)
  - Integrate with `document-shell`'s landscape page model
  - Tier colours use `--color-pass-*`, `--color-intermediate-*`, `--color-advanced-*` from style-guide

### Phase 5: Integration & Print CSS

- [ ] Create `arbor-tree-print.css`
  - `@page { size: A4 landscape; margin: 40px 44px; }`
  - Force tier colours in print: `print-color-adjust: exact; -webkit-print-color-adjust: exact;`
  - No screen-only controls visible in print
  - Avoid orphans/widows on multi-page output

- [ ] Integrate with `index.html`
  - Add "Curriculum Map" tab/button to navigation
  - Load and render on page load via `local-store.getUnit()`
  - Show HTML view for editing/viewing; expose print button

- [ ] Integrate with document-shell
  - Pass data object + render function to DocumentShell constructor
  - Re-render on data change (debounced)
  - Export SVG source for editing (FR-DS-7, if needed)

### Phase 6: Testing & Validation

- [ ] Unit tests for `tidy-tree.js` (node:test)
  - Fixture tree with ~2 strands, ~15 outcomes, several tasks each
  - Verify zero overlap at output coordinates
  - Verify all node rectangles lie within page bounds (297 × 210 mm)

- [ ] Unit tests for coverage derivers (node:test)
  - Fixture with lessons, assessments, topics
  - Verify each deriver correctly walks its source array
  - Verify Map indices match actual nodeIds

- [ ] Smoke tests for chip rendering
  - Fixture node with all three chip types + domain glyph
  - Verify all rendered; verify they wrap onto second line if needed (OQ-ATB-2 resolved)

- [ ] Manual acceptance testing
  - AC-ATB-1 through AC-ATB-10, each with fixture

- [ ] Physical print test (AC-ATB-10)
  - Print fixture to PDF at 96 dpi
  - Measure output: verify 297 × 210 mm, zero overlap, type >= 12pt (16px)

---

## 3. Interfaces

### Exports (other builds call these)

None. This build is read-only; it exports no functions for other builds to call.

### Consumes (from other builds)

- **curriculum-editor** (required)
  - `curriculum-editor.resolveDomain(nodeId, nodes) → "skill"|"knowledge"|null`
  - Read the node tree: `unit.nodes[]`

- **bigidea-list** (required)
  - Read big-idea list: `unit.bigIdeas[]` (including `coverage[]`)
  - Read topics: `unit.topics[]` (including `coverage[]`)

- **local-store** (required)
  - `local-store.getUnit()` → current unit object
  - No writes; read-only

- **document-shell** (required)
  - `new DocumentShell(data, renderFn, orientation: "landscape")`
  - `shell.render()` — sync render
  - Tier constants from document-shell (for chip colours)

- **style-guide** (required, via CSS tokens)
  - `--color-pass-*`, `--color-intermediate-*`, `--color-advanced-*` (tier colours)
  - `--color-skill-glyph`, `--color-knowledge-glyph` (domain glyphs)
  - `--font-*`, `--space-*` for layout and typography

- **unit.json structure**
  - `curriculum.description` (optional free text)
  - `curriculum.profileId` (for profile-specific label reading)
  - All node, lesson, big idea, topic, assessment data

---

## 4. Verification

| AC ID | Acceptance Criterion | Concrete Runnable Check |
|---|---|---|
| AC-ATB-1 | ~2 strands, ~15 outcomes, multiple tasks each lay out with zero overlap at print size | Pass fixture tree through `tidy-tree()` → compute bounding boxes → verify no rectangles overlap at coordinates; PDF-measure output at 96 dpi → verify 297 × 210 mm, zero overlap |
| AC-ATB-2 | Nodes show verbatim source code, no silent reformatting | Spot-check 3 fixture nodes (one with punctuation, one with special chars, one with whitespace) → verify rendered text matches `node.code` exactly |
| AC-ATB-3 | Covered and uncovered nodes render visibly distinct | Fixture with one covered lesson and one uncovered node → render HTML and PDF → verify visual distinction (color, badge, or marker) |
| AC-ATB-4 | Description at head of map when set; zero trace in lessons/matrix/crib | Set `curriculum.description` → render arbor-tree → verify it appears at head → open lesson plan, matrix, crib sheet in same unit → verify description absent |
| AC-ATB-5 | Node covered `full` by one big idea and `partial` by another renders both chips distinctly | Fixture: node with coverage[{full}, {partial}] → render → verify two badges, visually distinct (full solid, partial gradient or pattern) |
| AC-ATB-6 | Node taught but unassessed shows taught chip; assessed but untaught shows assessed chip; both shows both independently | Fixture: node covered by lesson but not assessment, another by assessment but not lesson, third by both → render → verify each shows correct chip set independently |
| AC-ATB-7 | Node covered only by topic (no big-idea or assessment coverage) renders only topic chip | Fixture: node with topic.coverage[] entry but no bigIdea/assessment coverage → render → verify only topic chip appears, not merged badge |
| AC-ATB-8 | Skill-domain node shows pencil glyph, knowledge shows notebook; matches fixture AC-CUR-13/AC-BI-10 | Fixture: strand with domain "skill" and strand with domain "knowledge" → render → verify glyphs appear correctly before node codes |
| AC-ATB-9 | No domain-resolution walk anywhere outside curriculum-editor's FR-CEB-5 | Grep `arbor-tree.js` for `parentId` loop or domain logic independent of the imported function → verify zero matches (all domain resolution flows through the shared function call) |
| AC-ATB-10 | Print body type >= 12pt (16px@96dpi); A4 landscape (297×210mm) measured; zero overlap | Print fixture to PDF at 96 dpi → measure page: verify 297×210mm → measure type size: verify >= 16px → verify nodes do not overlap |

---

## 5. Risks & Open Points

| Risk | Impact | Mitigation | Proving Test | Default |
|---|---|---|---|---|
| Tidy-tree layout overlaps nodes at realistic scale | Illegible, unprintable curriculum map; build's entire purpose fails | AD-ATB-1: freeze once passing AC-ATB-1; vendor as documented last resort only | AC-ATB-1, AC-ATB-10 | **Accepted:** fixture-first, freeze-on-pass discipline. Vendor only after proof that hand-written version fails. |
| Domain glyph or lesson-coverage walk reimplemented locally | Drift from curriculum-editor/coverage-grid; inconsistent UI | AD-ATB-2, AD-ATB-4: export functions from curriculum-editor, call them, no alternatives | AC-ATB-9 (grep check) | **Accepted:** lock in code review; grep AC-ATB-9 is non-negotiable gate. |
| Three coverage chips collapse into one merged indicator under implementation pressure | Silently violates AC-ATB-6/7 and AD-35's independence | AD-ATB-3: state independence explicitly in code comments; code review checks for separate rendering paths | AC-ATB-6, AC-ATB-7 | **Accepted:** three separate checks, three separate rendering code paths. No merging. |
| Print body type ships below 12pt (16px@96dpi) floor | Illegible printed map | Use `--font-size-print-*` tokens from style-guide only; style-guide enforces floor | AC-ATB-10 (measure printed output) | **Accepted:** style-guide is the single source; no local font-size overrides. |
| Spec IDs (FR-ATB-*, AC-ATB-*) leak into rendered map (tooltips, labels) | SR-9 violated; teacher-facing UI shows developer jargon | Code review greps all rendered strings for spec patterns | Manual check: no spec pattern in any label/tooltip | **Accepted:** no spec IDs rendered; strict review. |

---

## Acceptance Gates Before Handoff

- ✅ All AC-ATB-1…10 passing with fixtures
- ✅ AC-ATB-1/10: physical print test at realistic scale, zero overlap, A4 landscape measured, type >= 12pt
- ✅ AC-ATB-6/7: all three coverage chip combinations and topic-only chip demonstrated independently
- ✅ AC-ATB-9: grep check for independent domain/lesson-coverage walks (must be zero)
- ✅ Zero third-party dependencies; vanilla ES modules only (including tidy-tree)
- ✅ Read-only over `local-store`; no write calls
- ✅ No spec ID or invariant name in any rendered text
