# traceability-links — Execution Plan

**Build:** traceability-links (Wave 5, prerequisite: all other parts except resources-page)  
**Status:** Ready for implementation  
**Date:** 2026-08-29

---

## 1. Files

Exact paths under `_template/`:

| Path | Purpose | Owned by this build |
|------|---------|---|
| `app/js/traceability.js` | Module: reverse-link index (rebuilt on load), shared code-rendering component, click-to-navigate in edit view, back affordance | Yes |
| `app/css/traceability.css` | Code styling (link highlight, hover, selected state), scroll-to-view animation | Yes |
| `tests/test_traceability.js` | Smoke: reverse index rebuilt fresh, code clicks navigate and highlight, back affordance works, no writes to unit.json | Yes |

**Coordinate retrofit in** (not newly written, one-line changes per AD-TRB-2):
- `app/js/lesson-plan-document.js` — swap ad hoc code rendering for `renderCode()` import
- `app/js/unit-assessment-document.js` — same retrofit
- `app/js/crib-sheet.js` — same retrofit
- `app/js/marking-matrix.js` — same retrofit
- `app/js/arbor-tree.js` — same retrofit
- `app/js/coverage-grid.js` — same retrofit

**Consumed (not owned, but requires output from):**
- All building-block modules: curriculum-editor, arbor-tree, bigidea-list, coverage-grid, lesson-plan-document, lesson-plan-generator, unit-assessment-document, lessons-and-topics, marking-matrix, crib-sheet
- `app/js/local-store.js` — read unit data for reverse-index computation
- Stored forward-reference fields (datamodel §1b table): lesson.nodeIds[], lesson.bigIdeaId, lesson.assessmentLink, criterion.assessmentIds[], bigIdea.coverage[], unitAssessment.coverage[], miniAssessment.coverage[], etc.

**Deliberately excluded (not touched):**
- resources-page: explicitly outside traceability graph (FR-RES-6, AD-26)

---

## 2. Steps

### Phase 1: Reverse-Link Index Module

- [ ] Implement `traceability.js` module exporting one **reverse-link index builder** function:
  - `function buildReverseIndex(unit) → { nodeToLessons, unitAssessmentToLessons, bigIdeaToLessons, topicToBigIdeas, lessonToTopic }`
  - **Never persisted** (INV-DM-12); rebuilt fresh from loaded unit on every load
  - Indexes computed from **stored forward references only** (datamodel §1b table):
    - `node → lessons`: inverse of lesson.nodeIds[]
    - `unitAssessment (final/mini) → lessons`: inverse of lesson.assessmentLink.finalAssessment and lesson.assessmentLink.miniAssessmentIds[]
    - `bigIdea → lessons`: inverse of lesson.bigIdeaId
    - `topic → bigIdeas`: inverse of bigIdea.topicId
    - `lesson → topic`: transitive through lesson.bigIdeaId → BigIdea.topicId

### Phase 2: Shared Code-Rendering Component

- [ ] Implement `renderCode(content, isClickable)` function (replaces six independent ad hoc renderings):
  - Input: `content` = curriculum code (node code, lesson number, assessment id, etc.)
  - Input: `isClickable` = true in edit view, false in print view
  - **Edit view** (clickable): render as `<a class="code-link">content</a>` with click handler
    - Click → scroll coverage view to that row, highlight it (FR-TRB-3)
    - Carry back affordance to return to exact click position (FR-TRB-4)
  - **Print view** (not clickable): render as plain `<span>content</span>` or text
  - Return: HTMLElement or string
  - **No duplicate implementations** (SR-4): every earlier build imports this one function

### Phase 3: Code-Click Navigation

- [ ] Implement click handler for code links:
  - On click, navigate to coverage view (arbor-tree or coverage-grid, likely arbor-tree based on AD-12)
  - Scroll to target row showing that node/assessment/big idea
  - Highlight that row visually (e.g., background colour, border)
  - Store return path (document id, scroll position) for back affordance
- [ ] Use browser's `scrollIntoView()` with behavior for smooth scroll
- [ ] Highlight with CSS class, not inline styles (CSS-5)

### Phase 4: Back Affordance

- [ ] Implement back navigation (FR-TRB-4):
  - When code is clicked, before navigation, save: current document, exact scroll position
  - Render back button/link on coverage view
  - On back click, return to saved document and scroll position
  - No navigation history stack (stateless); back goes to one previous position only

### Phase 5: Unreferenced Assessment Detection

- [ ] Implement `findUnreferencedAssessments(unit)` function (FR-TRB-7):
  - Iterate unitAssessment.finalAssessment and each miniAssessment
  - For each, check reverse index: does any lesson.assessmentLink reference it?
  - Return list of unreferenced assessments
  - Render flag on Unit Assessment document and Lessons & Topics view showing these (not a separate screen, per AD-TRB-3)
- [ ] Flag renders as visible, persistent notice (not a modal, not buried)

### Phase 6: Assessment-Lesson Deletion Coordination

- [ ] Implement `canDeleteAssessment(assessmentId, unit)` check (FR-TRB-8):
  - Query reverse index: which lessons reference this assessment?
  - If any lessons found, refuse delete, name the blocking lessons
  - Coordinate with unit-assessment-document's own delete logic (SR-4: don't duplicate)
- [ ] Return: `{ canDelete: boolean, blockingLessonIds?: [...], message?: string }`
- [ ] Unit-assessment-document calls this before deleting; if canDelete = false, shows message

### Phase 7: No Persistence (INV-DM-12 Enforcement)

- [ ] Audit every function: **no function writes to unit.json**
  - Reverse index rebuilt on load, never cached
  - No derived field stored
  - No reverse edge added
  - Test AC-TRB-9: reload unit, verify byte-identical (no hidden writes)

### Phase 8: Retrofit Earlier Builds

- [ ] For each of six consuming builds (lesson-plan-document, unit-assessment-document, crib-sheet, marking-matrix, arbor-tree, coverage-grid):
  - Locate ad hoc code-rendering block (wherever curriculum codes/node codes are rendered as text)
  - Replace with: `import { renderCode } from './traceability.js'`
  - Replace render call: `renderCode(nodeCode, isEditView)` instead of inline rendering
  - Verify grep finds zero hand-rolled code rendering left (AC-TRB-8)

### Phase 9: Tests & Verification

- [ ] Test: build reverse index, walk every edge both directions (AC-TRB-1)
- [ ] Test: print view shows codes as plain text, no colour/underline (AC-TRB-2)
- [ ] Test: click code in edit view, coverage view scrolls and highlights (AC-TRB-3)
- [ ] Test: from coverage view, back affordance returns to exact click position (AC-TRB-4)
- [ ] Test: printed document shows plain-text codes (AC-TRB-5)
- [ ] Test: fixture with unreferenced mini assessment shows flag (AC-TRB-6)
- [ ] Test: delete assessment referenced by lessons → refused, names lessons; unreferenced assessment → succeeds (AC-TRB-7)
- [ ] Test: grep source for hand-rolled code rendering → zero outside imports (AC-TRB-8)
- [ ] Test: reload unit, diff against baseline → byte-identical (no reverse edges written) (AC-TRB-9)

---

## 3. Interfaces

### Exports (for all six consuming builds to import)

```javascript
// traceability.js
export function buildReverseIndex(unit) → {
  nodeToLessons: Map<nodeId, [lessonId, ...]>,
  unitAssessmentToLessons: Map<assessmentId, [lessonId, ...]>,
  bigIdeaToLessons: Map<bigIdeaId, [lessonId, ...]>,
  topicToBigIdeas: Map<topicId, [bigIdeaId, ...]>,
  lessonToTopic: Map<lessonId, topicId>,
}

export function renderCode(code, isClickable = true) → HTMLElement | string
  // code: curriculum code string (node code, lesson number, assessment id, etc.)
  // isClickable: true in edit view, false in print
  // Returns: clickable <a> link in edit, plain <span> in print

export function canDeleteAssessment(assessmentId, unit) → {
  canDelete: boolean,
  blockingLessonIds: [lessonId, ...],
  message: string
}

export function findUnreferencedAssessments(unit) → [assessmentId, ...]

export class NavigationTracker {
  // Manages back affordance
  constructor() { }
  savePosition(documentId, scrollX, scrollY) → void
  getBackPosition() → { documentId, scrollX, scrollY } | null
}
```

### Consumes (reads only, no writes)

```javascript
// from local-store
unit.nodes[]
unit.lessons[]
unit.bigIdeas[]
unit.topics[]
unit.unitAssessment
unit.matrixTemplate
// and all stored forward references (datamodel §1b)

// from consuming builds (for retrofit)
import { renderCode } from './traceability.js'
```

---

## 4. Verification

One row per acceptance criterion, mapped to concrete runnable check:

| AC-* | Check | How to verify |
|------|-------|---|
| AC-TRB-1 | Full web walkable in edit view: lesson→node→back→lesson, lesson→bigIdea→sibling lessons, lesson→assessment→matrix→assessment | Navigate fixture: click node code → coverage, back → lesson, click big-idea → topic, verify every link resolves and back works |
| AC-TRB-2 | Printed view shows codes as plain text, no colour/underline | Print fixture lesson plan, inspect PDF: codes appear as plain text, not styled as links |
| AC-TRB-3 | Code click in edit view → coverage scrolled and highlighted | Click node code on lesson edit view, verify coverage view opens with that row scrolled into view and highlighted |
| AC-TRB-4 | Back affordance returns to exact clicked document and scroll position | From coverage view, click back, verify returned to exact lesson and scroll position |
| AC-TRB-5 | Print view codes plain text, no underline, not clickable | Inspect printed PDF: verify no link styling on curriculum codes |
| AC-TRB-6 | Unreferenced mini assessment flagged on Unit Assessment and Lessons & Topics views | Fixture with unreferenced assessment: both views show visible flag naming the assessment |
| AC-TRB-7 | Delete assessment that lessons link to → refused, naming lessons; unreferenced → succeeds | Fixture: attempt delete referenced → error message lists blocking lessons; delete unreferenced → succeeds |
| AC-TRB-8 | Grep source: zero hand-rolled code rendering outside imports | After retrofit, grep all six builds for ad hoc code render logic → must return zero (only imports) |
| AC-TRB-9 | Reload unit: byte-identical, no reverse edges written | Baseline unit, load, query reverse index, reload, diff unit → byte-identical (INV-DM-12) |

---

## 5. Risks & Open Points

| Risk | Likelihood | Mitigation | Recommendation |
|------|---|---|---|
| Hand-rolled code rendering survives retrofit (six places miss update) | **Medium** | AD-TRB-1: explicit grep check (AC-TRB-8) catches missed implementations | After retrofit, run grep test in CI; fail build if found |
| Reverse index accidentally persisted (cache creeps in "for performance") | **Medium** | FR-TRB-9: explicit prohibition; test AC-TRB-9 (byte-identical reload) | Before any optimization, run byte-identical test |
| Navigation lands on coverage view unfocused (row not visible) | **Low** | FR-TRB-3: explicit scroll-and-highlight requirement | Test AC-TRB-3 with fixture large enough that row is off-screen; verify it scrolls into view |
| Back affordance returns to wrong position or wrong document | **Low** | FR-TRB-4: save before navigation; test AC-TRB-4 | Test with multiple click-back cycles; verify exact position restored each time |
| Dangling forward reference (old lessonId no longer exists) | **Medium** | Every lookup asserts resolvability; catch and surface, never swallow | Each reverse-index function: assert all nodeIds/assessmentIds/etc. exist in unit; raise on dangling reference |
| resources-page accidentally gets indexed (structure creeps in) | **Low** | FR-RES-6, AD-26: resources-page deliberately outside; grep check (AC-TRB-8) forbids it | Audit traceability.js: never touches resourcesPage; grep for "resources" in traceability code → zero |
| Scroll-to-view animation interferes with back navigation | **Low** | Use smooth scroll behavior, but don't await; back position saved *before* navigation | Test back navigation immediately after forward click (no race) |

**Recommended defaults for unresolved decisions:**
- Highlight visual style: **light background colour** (from token set, not hardcoded) + **bold border** (CSS class, not inline style)
- Highlight duration: **200ms** fade-out (CSS transition, not JavaScript animation)
- Back affordance UI: **"← Back" button/link**, positioned at top of coverage view
- Reverse-index structure: **Map objects**, not plain objects (for .has(), .get() clarity)
- Code style (link styling): **current document ink colour** (`--color-text-primary`), no underline, hover highlights
- Scroll behavior: **`smooth`** scroll, but don't wait for completion before returning control

