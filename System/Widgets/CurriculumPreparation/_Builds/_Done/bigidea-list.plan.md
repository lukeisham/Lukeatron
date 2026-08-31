# bigidea-list — Execution Plan

**Build:** bigidea-list (Wave 2) | **Date:** 2026-08-29 | **Status:** Draft for execution

---

## 1. Files

| Path | Purpose | Owner |
|------|---------|-------|
| `app/js/bigidea-list.js` | Big-idea CRUD API, shared functions (FR-BIB-8, FR-BIB-17), Big Idea Tree screen (outline + print renderer), topics list CRUD, two-level cap enforcement, delete-refusal checks | This build only |
| `app/css/bigidea-list.css` | Outline editor, topic list, per-item detail panel (click-to-expand), inline error flags; under 150 lines (CSS-1) | This build only |
| `app/css/bigidea-tree-print.css` | A4 portrait print stylesheet for ASCII connector tree (FR-BIB-12); document-shell sets page geometry; this file: tree layout, font sizing, tier constants usage | This build only |
| `tests/test_bigidea-list.js` | Smoke tests: CRUD operations, shared functions, two-level cap, delete-refusal, outline parsing (TEST-1…9) | This build only |

**Non-created files** (owned by other builds):
- `app/js/local-store.js` — only consumer of this build's CRUD API; no write from this build
- `app/js/curriculum-editor.js` — owns FR-CEB-5 (domain resolution); this build calls it only for glyph derivation
- `app/js/coverage-grid.js` — only consumer of `coverage[]` write API; no write from this build

---

## 2. Steps

### Phase 1: Data model & persistence layer

- [ ] Export CRUD API from bigidea-list.js
  - [ ] `addBigIdea(title, topicId, parentId) → bigIdeaId` (enforce topicId mandatory on top-level, zero on sub-big ideas)
  - [ ] `renameBigIdea(bigIdeaId, newTitle) → void`
  - [ ] `reorderBigIdeas(bigIdeaId, newOrder) → void` (update all affected `order` fields, persist via local-store)
  - [ ] `reparentBigIdea(bigIdeaId, newParentId) → void` (enforce two-level cap; refuse if would create third level)
  - [ ] `deleteBigIdea(bigIdeaId) → void | Error` (refuse if lesson/topic/crib-sheet references it; name blockers)
  - [ ] `addTopic(title) → topicId`
  - [ ] `renameTopic(topicId, newTitle) → void`
  - [ ] `reorderTopics(topicId, newOrder) → void`
  - [ ] `deleteTopic(topicId) → void | Error` (refuse if top-level big idea still carries its id; name blockers)
  - [ ] `setCoverageEntry(bigIdeaId, nodeId, coverage: "full" | "partial" | null, note?: string) → void` (FR-BIB-6; only write API on coverage[])

- [ ] Implement two-level cap validator (shared)
  - [ ] Reject `parentId` pointing to a sub-big idea (invariant INV-DM-14)
  - [ ] Reject outline line with three or more indentation levels (FR-BIB-10)

- [ ] Implement delete-refusal checks (shared)
  - [ ] Lesson.bigIdeaId → bigIdeaId (FR-BIB-2)
  - [ ] CribSheet.sections[].bigIdeaId → bigIdeaId
  - [ ] UnitAssessment.bigIdeaId → bigIdeaId (already specced)
  - [ ] MiniAssessment.bigIdeaId → bigIdeaId (already specced)
  - [ ] TopicId deletion: check BigIdea.topicId (FR-BIB-5)

- [ ] Persist all CRUD writes via local-store (FR-BIB-15)
  - [ ] Every write calls `local-store.save(unit)` after mutation
  - [ ] No direct filesystem access; bundle-server reached only through local-store

### Phase 2: Shared derived functions

- [ ] Implement FR-BIB-8: `computeGlyphSet(bigIdeaId, nodes) → Set<"skill" | "knowledge">`
  - **Signature:**
    ```javascript
    computeGlyphSet(bigIdeaId, nodes) 
      → Set<string>  // { "skill", "knowledge" } or any subset
      // Parameters:
      //   bigIdeaId: string (id of the big idea to derive glyphs for)
      //   nodes: Node[] (full curriculum nodes array; includes Node.domain field)
      // Returns: Set of domain values found across all nodes in this big idea's coverage[]
      // Algorithm:
      //   1. Look up bigIdea in bigIdeas[] by id
      //   2. For each entry in bigIdea.coverage[], resolve coverage[].nodeId in nodes[]
      //   3. For each resolved node, call curriculum-editor's resolveDomain(nodeId) 
      //      to walk to strand ancestor if needed (FR-CEB-5)
      //   4. Collect unique domain values into a Set
      //   5. Return Set (may be empty, size 1, or size 2)
      // Edge cases:
      //   - coverage[] empty → return empty Set
      //   - nodeId does not resolve → skip that entry
      //   - node.domain unset → skip that entry
      //   - Called before nodes exist → return empty Set, degrade gracefully
    ```
  - [ ] Call curriculum-editor's `resolveDomain(nodeId)` for each covered node
  - [ ] Collect into Set to eliminate duplicates
  - [ ] Return Set (may be empty)
  - [ ] Test: fixture big idea covering skill-only, knowledge-only, and mixed nodes

- [ ] Implement FR-BIB-17: `resolveTopic(lessonId, lessons, bigIdeas) → topicId | null`
  - **Signature:**
    ```javascript
    resolveTopic(lessonId, lessons, bigIdeas)
      → string | null  // topicId or null
      // Parameters:
      //   lessonId: string (id of the lesson to resolve topic for)
      //   lessons: Lesson[] (full lessons array)
      //   bigIdeas: BigIdea[] (full bigIdeas array)
      // Returns: the topicId of the top-level big idea bound to this lesson, or null if unreachable
      // Algorithm:
      //   1. Find Lesson in lessons[] by lessonId
      //   2. If not found, return null
      //   3. Get lesson.bigIdeaId
      //   4. Find BigIdea in bigIdeas[] by id = lesson.bigIdeaId
      //   5. If not found, return null
      //   6. If bigIdea.parentId is null (top-level), return bigIdea.topicId
      //   7. If bigIdea.parentId is set (sub-big idea), find parent in bigIdeas[]
      //      and recursively get its topicId
      //   8. If parentId chain breaks at any point, return null
      // Edge cases:
      //   - No lesson with lessonId → null
      //   - No big idea with lesson.bigIdeaId → null
      //   - bigIdea has no topicId (should be invariant-invalid, but) → null
      //   - Sub-big idea parent not found → null
    ```
  - [ ] Walk lesson → bigIdeaId → BigIdea (may be sub-big idea)
  - [ ] If sub-big idea, walk parentId to top-level big idea
  - [ ] Return topicId of top-level big idea, or null if chain breaks
  - [ ] Test: lesson → top-level big idea, lesson → sub-big idea → parent, missing links

### Phase 3: Big Idea Tree screen — setup mode

- [ ] Implement outline editor (markdown-style text area)
  - [ ] Parse one-line-per-big-idea outline format: `- Title` = top-level, `  - Subtitle` = one-level indented sub-big idea
  - [ ] Reject three-level indentation inline: flag offending line, do not flatten or drop (FR-BIB-10)
  - [ ] Write `title`, `order`, `parentId` only — never `text`, `coverage[]`, `topicId` (FR-BIB-14, AD-BI-3)
  - [ ] On save, update `order` and `parentId` for all affected big ideas, persist via local-store

- [ ] Implement per-item detail panel (click-to-expand row)
  - [ ] Click a big-idea line → expand inline row directly beneath it showing:
    - [ ] Optional `text` elaboration (editable)
    - [ ] `topicId` picker (mandatory for top-level, read-only for sub-big ideas)
    - [ ] `coverage[]` display (read-only; coverage-grid is the only editor)
  - [ ] Only one row expanded at a time; clicking another collapses the first (OQ-BI-1 resolved, AD-BI-6)
  - [ ] Persist text & topicId changes via local-store

- [ ] Render setup mode with:
  - [ ] Outline text area (read/write)
  - [ ] Big-idea list reflecting outline (read-only live preview, updated as user types)
  - [ ] Per-item detail panel (click-to-expand)
  - [ ] Copy-to-clipboard button for outline text (FR-BIB-13)

### Phase 4: Big Idea Tree screen — print mode

- [ ] Implement ASCII connector tree renderer
  - [ ] Use `├──`, `└──`, `│` connectors
  - [ ] Render on A4 portrait via document-shell's render contract
  - [ ] Only show connectors for big ideas with sub-ideas (FR-BIB-11); bare lines for childless big ideas
  - [ ] Order and nesting reflect exact setup-mode save state
  - [ ] Monospace font (FR-BIB-12); use style-guide tokens for typography

- [ ] Render print mode with:
  - [ ] Outline in print-friendly monospace (no edit controls)
  - [ ] Copy-to-clipboard button for rendered tree text (FR-BIB-13)
  - [ ] Optional: summary line (idea count, sub-count) per spec-silent details

- [ ] Integrate with document-shell (AD-3)
  - [ ] Build data object with `pages: [{ orientation: "portrait", content: {...} }]`
  - [ ] Hand to document-shell with render function
  - [ ] Shell handles @page rules, print CSS, page breaks

### Phase 5: Topics list

- [ ] Implement topics CRUD
  - [ ] Add, rename, reorder, delete (FR-BIB-3, FR-TOP-1/2)
  - [ ] Enforce mandatory `topicId` on every top-level big idea (FR-BIB-4, INV-DM-34)
  - [ ] Refuse deletion if big ideas still reference it (FR-BIB-5, FR-TOP-7)

- [ ] Expose query surfaces (FR-BIB-7, FR-TOP-5)
  - [ ] "Every big idea bound to this topic" — including zero-result state (not a silent empty list)
  - [ ] Test: topic with multiple big ideas, topic with none

### Phase 6: Styling

- [ ] Create `bigidea-list.css` (under 150 lines, CSS-1)
  - [ ] Outline textarea styling (monospace, 14px min, readable)
  - [ ] Per-item detail panel (inline expand/collapse, padding, border)
  - [ ] Error flags for two-level cap violations (inline at offending line, red text)
  - [ ] Copy button (small, subtle, hover highlight)
  - [ ] Use style-guide tokens only (CSS-2); no hardcoded colours or sizes

- [ ] Create `bigidea-tree-print.css` (for A4 portrait tree)
  - [ ] Tree layout, indentation, connector characters (monospace 13.5px)
  - [ ] Page geometry via document-shell constants
  - [ ] No hardcoded values; use style-guide tokens

### Phase 7: Tests

- [ ] TEST-1/TEST-2: smoke tests for each module
  - [ ] `test_bigidea_crud.js`: CRUD operations import, happy path, guard path
  - [ ] `test_outline_parser.js`: outline parsing, two-level cap refusal, persistence
  - [ ] `test_topic_crud.js`: topics add/rename/reorder/delete
  - [ ] `test_shared_functions.js`: computeGlyphSet and resolveTopic

- [ ] TEST-7: gate tests for invariants
  - [ ] Two-level cap strictly enforced (reject third level)
  - [ ] Delete-refusal names blockers (both big ideas and topics)
  - [ ] Coverage[] write-only via setCoverageEntry (no other write path)

- [ ] TEST-4: isolated, in-memory; no real store writes
- [ ] TEST-9: mirror logic, import real modules

---

## 3. Interfaces

### Exports (Shared Functions & CRUD API)

```javascript
// ============ FR-BIB-8: Domain Glyph-Set Union ============
function computeGlyphSet(bigIdeaId, nodes) {
  // @param {string} bigIdeaId - id of the big idea
  // @param {Node[]} nodes - full curriculum nodes array (includes Node.domain)
  // @returns {Set<string>} - union of domain values across covered nodes; may be empty
  // Algorithm: for each node in bigIdea.coverage[], resolve domain via curriculum-editor FR-CEB-5, collect into Set
  // Edge cases: empty coverage[] → empty Set; unresolved nodeId → skip; missing domain → skip
}

// ============ FR-BIB-17: Lesson → Topic Transitive Resolution ============
function resolveTopic(lessonId, lessons, bigIdeas) {
  // @param {string} lessonId - id of the lesson
  // @param {Lesson[]} lessons - full lessons array
  // @param {BigIdea[]} bigIdeas - full bigIdeas array
  // @returns {string | null} - topicId of the top-level big idea bound to the lesson, or null
  // Algorithm: lesson → lesson.bigIdeaId → BigIdea; if sub-big idea, walk parentId chain to top-level; return topicId
  // Edge cases: missing lesson, missing bigIdea, broken parent chain → null
}

// ============ FR-BIB-1/3: Big-Idea CRUD ============
function addBigIdea(title, topicId = null, parentId = null) {
  // Create a new big idea. Top-level big ideas (parentId = null) require topicId.
  // Persists via local-store. Returns generated bigIdeaId.
  // Throws if attempting to create sub-big idea without valid parent.
}

function renameBigIdea(bigIdeaId, newTitle) {
  // Persists via local-store.
}

function reorderBigIdeas(bigIdeaId, newOrder) {
  // Move bigIdeaId to position newOrder; renumber all affected order fields.
  // If big idea has sub-ideas, they move as a block. Persists via local-store.
}

function reparentBigIdea(bigIdeaId, newParentId) {
  // Move sub-big idea to a different top-level parent.
  // Throws if newParentId is not null and points to a sub-big idea (violates INV-DM-14).
  // Persists via local-store.
}

function deleteBigIdea(bigIdeaId) {
  // Refuse if any lesson.bigIdeaId, cribSheet.sections[].bigIdeaId, or assessment.bigIdeaId points to it.
  // Never cascade; throw Error with message naming every blocker.
  // Persists via local-store.
}

// ============ FR-BIB-3/TOP-1/2: Topics CRUD ============
function addTopic(title) {
  // Create a new topic. Persists via local-store. Returns generated topicId.
}

function renameTopic(topicId, newTitle) {
  // Persists via local-store.
}

function reorderTopics(topicId, newOrder) {
  // Move topicId to position newOrder; renumber all affected order fields.
  // Persists via local-store.
}

function deleteTopic(topicId) {
  // Refuse if any top-level big idea still carries bigIdea.topicId = topicId.
  // Throw Error naming every blocking big idea.
  // Persists via local-store.
}

// ============ FR-BIB-6: Coverage[] Write API ============
function setCoverageEntry(bigIdeaId, nodeId, coverage, note = null) {
  // Set coverage for (bigIdeaId, nodeId) pair.
  // @param {string} coverage - one of "full", "partial", or null (to remove entry)
  // @param {string | null} note - optional gloss
  // Only write API on coverage[]. coverage-grid is the sole caller.
  // Persists via local-store.
}
```

### Consumes

- **local-store**: `load()`, `save(unit)` (only persistence path; no direct filesystem access)
- **curriculum-editor**: `resolveDomain(nodeId)` (FR-CEB-5; used by FR-BIB-8 glyph derivation)
- **document-shell**: render contract (A4 portrait page geometry, print CSS injection)
- **style-guide**: CSS tokens from `variables.css`

### Consumed By

- **coverage-grid**: calls `setCoverageEntry()` to edit coverage[]
- **lesson-plan-document**: calls `resolveTopic()` to show lesson's topic label; reads big-idea list for picker
- **crib-sheet**: reads big-idea list for section picker; calls `computeGlyphSet()` for glyph rendering
- **arbor-tree**: reads big-idea list; calls `computeGlyphSet()` for chip rendering
- **future lessons-and-topics**: will call CRUD API for big-idea/topic edits (AD-BI-1)

---

## 4. Verification

| AC ID | Acceptance Criterion | Runnable Check |
|-------|---------------------|----------------|
| AC-BIB-1 | Big idea with three sub-big ideas renders and survives save → reopen | Create fixture with 1 top-level, 3 sub-big ideas; save; reload; assert structure intact |
| AC-BIB-2 | Third indentation level refused with inline flag (not silently flattened) | Attempt outline line with `    - (4 spaces)` prefix; assert error message rendered at that line; assert parentId unchanged |
| AC-BIB-3 | Deleting big idea bound to two lessons is refused, naming both | Create 2 lessons pointing to same bigIdeaId; attempt delete; assert error message contains both lesson identifiers |
| AC-BIB-4 | Top-level big idea cannot be created/saved without topicId | Attempt `addBigIdea(title, null, null)`; assert throws; attempt to set topicId=null on existing top-level; assert throws |
| AC-BIB-5 | Deleting topic referenced by big ideas is refused, naming blockers | Create topic, bind 2 top-level big ideas to it; attempt delete; assert error names both big idea ids |
| AC-BIB-6 | Topic with three big ideas shows all three via query surface | Create 3 big ideas, bind all to same topic; call query function; assert returns array of 3 |
| AC-BIB-7 | Fixture outline with 2 branched + 3 bare-line trees renders both modes identically | Parse outline, render setup mode, render print mode; assert tree structure visually identical in both; assert no connectors on bare lines |
| AC-BIB-8 | Copy button copies exact text: outline in setup, ASCII tree in print | Setup: copy outline, paste into textarea, assert matches on-screen text; Print: copy tree, paste, assert matches rendered ASCII |
| AC-BIB-9 | Fixture big idea: skill-only → pencil; knowledge-only → notebook; both → both glyphs | Create 3 big ideas with matching coverage; inspect rendered glyphs; assert correct per domain union |
| AC-BIB-10 | Editing coverage[] to drop only knowledge-domain node removes notebook glyph; nothing written to big idea itself | Fixture: call coverage-grid's setCoverageEntry to drop knowledge node; trigger glyph re-derivation; assert glyph set updated without touching bigIdea.title/text/order |
| AC-BIB-11 | Grep: no coverage[] write outside setCoverageEntry API | `grep -r "coverage\s*=" app/js/bigidea-list.js` returns only setCoverageEntry and test setup |
| AC-BIB-12 | Grep: no second glyph-derivation implementation in any wave-2/3/4 build | `grep -r "domain" app/js/` for any variant of `Object.keys(\|\.filter(\|\.map(` on coverage/domain logic returns nothing in other builds |
| AC-BIB-13 | Grep: no lesson→topic resolution independent of resolveTopic in lesson-plan-document / lessons-and-topics | Cross-check when those builds exist |

---

## 5. Risks & Open Points

| Risk | Likelihood | Severity | Mitigation | Default |
|------|-----------|----------|-----------|---------|
| Lessons & Topics view has no subtask row in _PLAN.md; gap flagged in spec §6 but may be forgotten | Medium | High | Explicitly flag in code review; add reminder to arch-spec next revision | Leave visible; do not silently absorb into this build |
| Future Lessons & Topics build reimplements CRUD instead of calling this build's API (AD-BI-1 violated) | Medium | High | AC-BIB-11 proves no second write path exists today; flag AD-BI-1 explicitly in that build's review | Documented shared API; code review gate |
| Outline parser silently grows beyond title/order/parentId (AD-BI-3 violated) | Low | Medium | Code comment: "outline parser writes ONLY title, order, parentId — never text/coverage/topicId" | Strict field whitelist in parser; assertion in save |
| Domain-glyph logic gets second implementation under time pressure | Low | Medium | AC-BIB-12 proves no duplication exists; this is the single allowed home | Code review; proof test |
| Three-level indentation silently flattened (FR-BIB-10 violated) | Low | High | AC-BIB-2 directly tests refusal + inline flag | Explicit validation; AC test gate |
| Spec IDs leak onto Big Idea Tree screen (SR-9 violated) | Very low | Medium | Grep: no `[FR AD AC INV-DM]-` pattern in rendered strings | Regular expression check in code review |

---

## 6. Recommended Defaults for Open Points

- **OQ-BI-1** (closed 2026-08-29): Detail panel inline click-to-expand, no modal
- **OQ-BI-2** (closed 2026-08-29): One flat big-idea sequence; topic reorder does not affect big-idea order
- **OQ-BI-3** (closed 2026-08-29): Delete parent with sub-ideas refused; never cascade

---

**Next Steps:** Implementation starts once document-shell, local-store, and style-guide interfaces are confirmed settled. Gate: document-shell renderData contract finalized.
