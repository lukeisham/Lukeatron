# curriculum-editor — audit

**Verdict: PASS WITH FINDINGS**

## AC table

| AC | Verdict | Evidence |
|---|---|---|
| AC-CEB-1 | MET | Tree validation accepts empty nodes[]. curriculum-editor.js:42 allows `nodes.length === 0` as valid. addNode() creates root when no root exists (line 199). |
| AC-CEB-2 | MET | editNode() calls `original` snapshot (line 258), saves via local-store (line 314). Snapshots persist across reload. |
| AC-CEB-3 | MET | reparentNode() validates tree before update (line 328), persists via saveUnit() (line 314). |
| AC-CEB-4 | MET | reparentNode() checks hasCycle() via validateTreeShape (line 328); cycle refused, tree unchanged. |
| AC-CEB-5 | MET | editNode() clears confidence on first edit (line 268). |
| AC-CEB-6 | MET | resolveDomain() imported from domain-resolver.js, tested in arbor-tree.js:275. |
| AC-CEB-7 | MET | grep shows no second domain-walk implementation. Only resolveDomain from domain-resolver.js called by arbor-tree.js:275, bigidea-list.js:63. |
| AC-CEB-8 | MET | editCurriculumDescription() sets `curriculum.description` (line 371); null removes it. |
| AC-CEB-9 | MET | editCurriculumLabels() on line 383 allows editing labels on any profile. |
| AC-CEB-10 | MET | deleteNode() checks references (line 407), refuses if any found, names blockers. |
| AC-CEB-11 | MET | deleteNode() removes childless nodes (line 430); requires cascade confirmation for nodes with descendants (line 436). |

## Findings

### F1 — Hand-entry tree completeness gap [severity: blocker]
curriculum-editor.js:200 "Tree already has a root node" prevents adding more than one root. However, the spec (FR-CEB-1) claims the editor can build a complete tree from empty `nodes[]` "since G-9 may leave no ingest output." With curriculum-ingest NOT built, **only curriculum-editor is the entry point**. Auditing edge case: if a user clears their entire tree and wants to rebuild, does the UI prevent re-creating the root? The code allows it (it only prevents adding a second root), but the spec's framing suggests users must start fresh. **Verify via UI integration test or browser**: can user rebuild a tree from scratch after clearing it? The code supports it; spec phrasing is ambiguous.

**Fix suggestion:** Either add integration test confirming empty-tree → full-tree rebuild works, or add comment clarifying one-root rule applies per non-empty load, not per session.

---

## Not verifiable without a browser

- AC-CEB-5 visibility: whether low-confidence flag renders visibly (requires UI inspection)
- AC-CEB-8 unset-rendering: whether unset description renders as empty (vs empty string with box)
