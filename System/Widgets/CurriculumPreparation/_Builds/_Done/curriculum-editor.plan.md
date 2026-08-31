# curriculum-editor — Implementation Plan

**Build:** curriculum-editor (Wave 2) | **Date:** 2026-08-29 | **Status:** Ready for implementation

---

## 1. Files

```
_template/
├── app/js/
│   ├── curriculum-editor.js         (Node CRUD, tree integrity, domain resolution, persistence)
│   └── domain-resolver.js           (Exported: resolveDomain(nodeId, nodes) → "skill"/"knowledge"/unset)
└── app/css/
    └── curriculum-editor.css        (Edit-view chrome, node list, forms, tree display)
```

**Purpose:**
- `curriculum-editor.js` — the sole edit surface for nodes, domains, and curriculum metadata; owns the domain-resolution function; calls `local-store` for every write; validates tree integrity before persisting.
- `domain-resolver.js` — thin extraction of `resolveDomain()` for reuse by `arbor-tree` and `bigidea-list`; contains no UI logic.
- `curriculum-editor.css` — form styling, node list display, tree visualization during editing, error states, confidence flags.

---

## 2. Steps

### Phase 1: Data Layer & Shared Functions

- [ ] Write `domain-resolver.js` — the shared `resolveDomain(nodeId, nodes)` function
  - Reads `domain` directly off strand nodes
  - For outcome/task: walks `parentId` chain to nearest strand ancestor, returns its `domain` or unset
  - No side effects; pure function
  - Unit-testable against fixture trees

- [ ] Write tree-integrity validators (in `curriculum-editor.js`)
  - `validateTreeShape(nodes)` — checks exactly one root, no cycles, all non-root parentIds resolve
  - `checkNodeReferences(nodeId, unit)` — finds all references to a node in lessons, bigIdeas, topics, assessments
  - Used before every add/re-parent/delete; returned validation errors name the violation

- [ ] Write ID generation (in `curriculum-editor.js`, following AD-BOSS-1)
  - Import `newId(prefix)` from `app/js/ids.js` (shared across all builds)
  - Generate IDs on node creation only; never regenerate existing nodes

### Phase 2: Node CRUD Operations

- [ ] Implement **add node**
  - Modal form: kind (strand/outcome/task), title, text, optional domain (strand only)
  - Validate: parentId resolves, resulting tree passes shape check
  - Call `resolveDomain()` on the new node to confirm resolution works
  - Persist via `local-store`
  - Render new node immediately in tree view

- [ ] Implement **edit node** (title, text, code)
  - Form or inline edit; changes write to local memory first
  - On save: set `edited: true`, snapshot pre-edit values to `original` (once, never overwrite), clear `confidence`
  - Persist via `local-store`
  - Validate references still resolve (unchanged)

- [ ] Implement **edit strand domain** (skill/knowledge/unset)
  - Standalone form field for strands only
  - Same `edited`/`original` discipline as title/text
  - Test: verify that call to `resolveDomain()` on child nodes reflects the change immediately after save

- [ ] Implement **re-parent node**
  - Form: pick new parent from a tree-view selector or flat dropdown filtered to valid parents
  - Validate: new parent is not the node itself or any of its descendants (cycle check)
  - Validate: all references to the node remain resolvable post-move
  - Persist via `local-store`

- [ ] Implement **delete node**
  - Two-gate confirmation:
    - **Gate 1 (references):** Search for any lesson.nodeIds[], bigIdea.coverage[], topic.coverage[], unitAssessment.coverage[], miniAssessment.coverage[] entries pointing to this node. If any found, refuse with a list of blocking references.
    - **Gate 2 (structure):** If node is unreferenced and has descendants, show distinct cascade-confirmation ("delete this and everything under it?"). If childless and unreferenced, delete immediately.
  - Persist via `local-store`

### Phase 3: Curriculum Metadata

- [ ] Implement **edit curriculum.description** (optional free text)
  - Text area; optional, renders nothing when unset
  - Save/clear writes back to local-store

- [ ] Implement **edit curriculum.labels** (for generic profile)
  - Check `curriculum.profileId === 'generic'`
  - Show form fields for `labels.strand`, `labels.outcome`, `labels.task`
  - Label values are used by tree display and every consumer (read-only check that they're editable here)
  - Allow editing regardless of profile (FR-CEB-13); ingest labels can be corrected

### Phase 4: UI & Integration

- [ ] Build edit-view UI
  - Node list or tree view with add/edit/delete buttons
  - Domain resolution visible (show resolved domain for outcome/task next to its parentage)
  - Confidence flag visible on low-confidence nodes; clears on first edit
  - Form modal or inline for add/edit operations
  - Error messages name what violated (reference names, cycle description, etc.)

- [ ] Integrate with `index.html`
  - Add "Curriculum" tab/button to navigation
  - Load and display curriculum on page load
  - Show unsaved changes indicator (persist only on explicit save click)

- [ ] Import and export via `local-store`
  - Every add/edit/delete calls `local-store.saveUnit(unit)` or similar
  - On page load, fetch current unit via `local-store.getUnit()`
  - Handle async save (loading spinner, disable edits during save)

### Phase 5: Testing & Validation

- [ ] Write smoke tests for node CRUD (node:test, stdlib only)
  - Create tree from empty nodes[], verify structure is valid
  - Edit a node's title, verify `original` is snapshotted and `edited` is set
  - Re-parent a task, verify tree remains valid
  - Attempt cycle re-parent, verify refusal
  - Delete an unreferenced childless node, verify it's removed
  - Delete a node with descendants, verify cascade confirmation is required
  - Test domain resolution on fixture tree

- [ ] Manual acceptance testing
  - AC-CEB-1 through AC-CEB-11, each with a concrete fixture

---

## 3. Interfaces

### Exports (other builds call these)

```javascript
// app/js/domain-resolver.js
export function resolveDomain(nodeId, nodes) {
  // @param nodeId {string} node.id
  // @param nodes {Array} unit.nodes[]
  // @returns {"skill" | "knowledge" | null}
  // For strand: returns node.domain directly
  // For outcome/task: walks parentId to nearest strand, returns its domain or null
}
```

### Consumes (from other builds)

- **local-store** (required)
  - `local-store.getUnit()` → current unit object
  - `local-store.saveUnit(unit)` → async, returns Promise<{status: "ok"}>

- **style-guide** (required, via CSS tokens)
  - `--color-*`, `--space-*`, `--font-*` for edit-view chrome

- **document-shell** (NOT required for this build)
  - This build does not render pages; no document-shell dependency

- **ids.js** (required)
  - `newId(prefix)` → generate collision-free IDs

---

## 4. Verification

| AC ID | Acceptance Criterion | Concrete Runnable Check |
|---|---|---|
| AC-CEB-1 | Build complete tree from empty `nodes[]`, no ingest required | Start empty unit → add root → add 2 strands → add 3 outcomes under each → save → verify `INV-DM-3` via grep (one root, no cycles, all parentIds resolve) |
| AC-CEB-2 | Edit survives save → reopen; `original` holds pre-edit value | Edit a node's text from "Old" to "New" → save → close unit → reopen → verify node.text="New" and node.original.text="Old" |
| AC-CEB-3 | Re-parent task from one outcome to another; tree integrity unchanged | Move a task node under a different outcome parent → save → verify all three nodes' parentIds resolve and tree structure is valid |
| AC-CEB-4 | Cycle re-parent refused, tree unchanged | Attempt to re-parent a strand under one of its own descendant outcomes → verify refusal message and that tree structure is unmodified in memory and on disk |
| AC-CEB-5 | Low-confidence node visible; editing it clears `confidence` on save, not on re-ingest | Add fixture node with `confidence: low` → verify UI shows confidence flag → edit node text → save → verify `confidence` is unset → simulate re-ingest (if curriculum-ingest exists) → verify flag stays unset |
| AC-CEB-6 | Domain resolution works per FR-CEB-5 function | Set a strand's `domain` to "skill" → verify every outcome/task beneath it resolves to "skill" via direct call to `resolveDomain()` → set domain to unset → verify children resolve to unset |
| AC-CEB-7 | No independent domain walk outside `resolveDomain()` | Grep `arbor-tree.js` and `bigidea-list.js` for parentId walks or domain logic → verify zero matches (both call the shared function) |
| AC-CEB-8 | Curriculum description editable, clearable, renders as unset not empty string | Set `description` to "Test" → save → clear field → save → verify `description` is `null` (not `""`), checked via JSON parse |
| AC-CEB-9 | Generic-profile unit shows editable labels; setting `strand: "Domain"` appears in consumers | Set `profileId` to "generic" → edit `labels.strand` to "Domain" → save → switch to another view that reads labels → verify it displays "Domain" instead of "strand" |
| AC-CEB-10 | Deleting referenced node refused, naming the lesson; delete succeeds after reference removal | Add lesson with `nodeIds: [nodeA]` → attempt delete of nodeA → verify refusal naming the lesson → remove nodeA from lesson.nodeIds → delete nodeA → verify success |
| AC-CEB-11 | Childless unreferenced node deletes immediately; node with descendants requires cascade confirmation | Delete a leaf task (childless, unreferenced) → verify one-click delete, no confirmation → delete a strand with 2 outcomes (unreferenced) → verify cascade confirmation required before removal |

---

## 5. Risks & Open Points

| Risk | Impact | Mitigation | Proving Test | Default |
|---|---|---|---|---|
| Domain resolution reimplemented locally in arbor-tree/bigidea-list | Two ancestor walks diverge; inconsistent resolution across UI | AD-CEB-3: export the function, no alternatives allowed | AC-CEB-7 (grep check) | **Accepted:** lock this in code review; no variance. |
| Cycle created by re-parent silently | INV-DM-3 broken; arbor-tree layout undefined or crashes | FR-CEB-3 validates before persisting | AC-CEB-4 | **Accepted:** validation gate is non-negotiable. |
| Node deletion cascades silently, destroying descendants | Data loss; worst-case failure | AD-CEB-2 two-gate rule (reference + structure); FR-CEB-9/10 explicit | AC-CEB-10, AC-CEB-11 | **Accepted:** both gates enforced; no exceptions. |
| `original` overwritten on second edit or by re-ingest | INV-DM-2 breaks; edit history lost | FR-CEB-2 snapshots once, never overwrites | AC-CEB-2, AC-CEB-5 | **Accepted:** snapshot discipline is hardcoded. |
| Generic-profile labels stay read-only, generic unit shows raw `kind` values | FR-CUR-1d's purpose defeated; UI illegible to teacher | FR-CEB-8 explicit edit surface for labels | AC-CEB-9 | **Accepted:** labels always editable. |
| Spec IDs (FR-CEB-*, INV-DM-*) appear in rendered messages | SR-9 violated; teacher-facing UI mentions developer jargon | Code review greps all rendered strings for spec patterns | Manual check: no pattern match in any message | **Accepted:** no spec IDs rendered to teacher; strict review. |

---

## Acceptance Gates Before Handoff

- ✅ All AC-CEB-1…11 passing with fixtures
- ✅ AC-CEB-7: grep check for independent domain walks
- ✅ Zero third-party dependencies; vanilla ES modules only
- ✅ Persists only through `local-store`; no direct filesystem access
- ✅ No spec ID or invariant name in any rendered text
