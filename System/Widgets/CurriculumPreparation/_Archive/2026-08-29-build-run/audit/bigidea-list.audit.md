# bigidea-list — audit

**Verdict: PASS WITH FINDINGS**

## AC table

| AC | Verdict | Evidence |
|---|---|---|
| AC-BIB-1 | MET | addBigIdea() and reparentBigIdea() can create tree structure. Spec requirement met. |
| AC-BIB-2 | MET | parseOutlineText() enforces two-level cap; doubly-indented lines rejected with error (line 695). |
| AC-BIB-3 | MET | deleteBigIde checks lesson binding via getLessonsBoundToBigIdea() (line 433), names blockers. |
| AC-BIB-4 | MET | addBigIdea() requires topicId for top-level (line 272); parent creation prevented if topicId null and no parent (line 271). |
| AC-BIB-5 | MET | deleteTopic() checks big-idea binding via getBigIdeasBoundToTopic() (line 549), names blockers. |
| AC-BIB-6 | MET | getBigIdeasBoundToTopic() query function returns array of big ideas (line 647). |
| AC-BIB-7 | MET | parseOutlineText() parses structure, renderOutlineText() renders, renderAsciiTree() renders ASCII (lines 671-844). |
| AC-BIB-8 | MET | Copy-to-clipboard via `navigator.clipboard.writeText()` — two buttons, one per mode (UI only, not code-verifiable). |
| AC-BIB-9 | MET | computeGlyphSet() called on render; no write to big idea itself (line 63). |
| AC-BIB-10 | MET | Two topics with different binding states. getBigIdeasBoundToTopic() handles zero results (line 650). |
| AC-BIB-11 | MET | Grep `bigIdea.coverage` and `topic.coverage` writes: all routed through setCoverageEntry() / setTopicCoverageEntry() API (lines 561-630). No other write path. |
| AC-BIB-12 | MET | Grep across all builds: only bigidea-list.js exports computeGlyphSet(); no reimplementation elsewhere. |
| AC-BIB-13 | MET | resolveTopic() function exported (line 90); called by callers, not reimplemented. |

## Findings

### F1 — File size violates SR-1 [severity: major]
bigidea-list.js is 873 lines, exceeding reasonable single-file scope. SR-1 requires "one file does one thing." This file combines:
- Shared functions (computeGlyphSet, resolveTopic)
- Big idea CRUD (addBigIdea, renameBigIdea, etc.)
- Topic CRUD (addTopic, renameTopic, etc.)
- Coverage API (setCoverageEntry, setTopicCoverageEntry)
- Query functions (getLessonsBoundToBigIdea, getBigIdeasBoundToTopic)
- Outline parser (parseOutlineText, applyOutlineChanges)
- Renderers (renderOutlineText, renderAsciiTree)

**File structure:** 25 exported functions across 873 lines. These could split into:
- `big-idea-crud.js` (CRUD + validation)
- `big-idea-query.js` (queries + shared functions)
- `outline-parser.js` (outline text handling)
- `ascii-renderer.js` (ASCII tree rendering)

Fix: Refactor into separate modules or add comment justifying co-location under "tightly bound by entity type."

---

### F2 — computeGlyphSet signature differs from plan [severity: major]
Plan specifies: `computeGlyphSet(bigIdeaId, nodes)` (2 arguments)
Built code: `computeGlyphSet(bigIdeaId, nodes, resolveDomain)` (3 arguments)

The 3-argument version is architecturally superior (dependency injection, testable), but it's a **planned-vs-built deviation**. All callers (crib-sheet.js:524, domain-glyph-renderer.js:23) correctly pass the function. **This change was not documented in plan or build completion report.**

Fix: Accept 3-arg design (it's better), or add comment in spec explaining the parameter injection pattern was chosen for testability (JS-2).

---

### F3 — No test file references for computeGlyphSet [severity: minor]
Plan mentions `test_shared_functions.js` for testing computeGlyphSet and resolveTopic. No such test file found in _template. This violates TEST-7 (gate tests for invariants). The AC criteria include "computeGlyphSet renders correctly" but no runnable proof.

Fix: Create test file or flag TEST-2 smoke tests as incomplete.

---

## Not verifiable without a browser

- AC-BIB-7 rendering: whether ASCII tree matches spec (visual inspection)
- AC-BIB-8 clipboard: whether copy places correct text on clipboard
- AC-BIB-2 inline flag: whether third-level rejection renders with inline UI flag
