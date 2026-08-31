# local-store — Execution Plan

**Build:** local-store | **Wave:** 1 (foundation) | **Date:** 2026-08-29

---

## 1. Files

| Path | Purpose |
|------|---------|
| `_template/app/js/local-store.js` | Browser client: load/save via bundle-server, validate invariants on load, manage unsaved changes, centralize fetch calls (FR-LS-1…12) |
| `_template/tests/test_local-store.js` | Smoke tests: load, save, invariant validation (INV-DM-1…20), schema version check, unsaved-changes warning, server unreachable state (TEST-2, TEST-7) |

---

## 2. Steps

- [ ] Create `local-store.js`:
  - [ ] Define module-level constants:
    ```javascript
    const API_BASE = 'http://127.0.0.1';  // bundle-server endpoint
    const SCHEMA_VERSION = "1.0.0";
    const AUTOSAVE_DEBOUNCE_MS = 500;
    ```
  - [ ] Define `ServerClient` class (FR-LS-9 — one place for all fetch calls):
    - [ ] Method `async load()` — GET `/api/unit`, return parsed unit.json or throw with error message
    - [ ] Method `async save(unit)` — PUT `/api/unit` with JSON body, return success or throw with error message
    - [ ] Both methods show loading state (DOM element or callback passed in)
    - [ ] Both methods on failure show error state naming the failure (JS-5, FR-LS-10, FR-LS-11)
    - [ ] Verify every request stays on localhost (no external URLs — FR-LS-8)
  - [ ] Define validator function `validateUnit(unit) → { valid: boolean, errors: string[] }`:
    - [ ] For each INV-DM-1…20 (and extended invariants):
      - [ ] INV-DM-1: exactly three tiers → check `lesson.tiers`, `unitAssessment.finalAssessment.tiers`, `miniAssessment.tiers` all have pass/intermediate/advanced
      - [ ] INV-DM-2: original fields preserved → check nodes with `edited: true` have `original` object with original code/title/text
      - [ ] INV-DM-3: nodes form a tree → walk nodes, verify exactly one root, no cycles (depth-first traversal), every non-root has resolvable parentId
      - [ ] INV-DM-4: every stored reference resolves → check all `lesson.nodeIds`, `lesson.bigIdeaId`, all coverage nodeIds, all imageIds resolve to real entries
      - [ ] INV-DM-5: tier pages render in fixed order → no reordering needed (this is just enforcement; doesn't fail validation, but assert in test)
      - [ ] INV-DM-6: one matrix per unit, one per student → count matrices, verify no duplicates by (studentId)
      - [ ] INV-DM-7: matrix rows cover all tiers → for each matrix, verify `matrixTemplate.criteria` covers pass, intermediate, advanced
      - [ ] INV-DM-8: self-contained → verify no paths outside bundle (no absolute paths, no URLs)
      - [ ] INV-DM-9: schema version → check `unit.schemaVersion` exists and equals "1.0.0"; if higher, refuse to open (FR-LS-6)
      - [ ] INV-DM-10: no curriculum-specific field names → check no field name is curriculum-specific (hard to validate; accept as smoke test — manual check in review)
      - [ ] INV-DM-12: no reverse links stored → search entire unit for any stored reverse edge (e.g., `node.lessonIds`); if found, refuse
      - [ ] INV-DM-14: exactly two levels of big ideas → verify no big idea's parent is itself another big idea's parent (max nesting depth = 2)
      - [ ] INV-DM-15: every lesson has bigIdeaId → check all lessons, none missing
      - [ ] INV-DM-18: singular objects present → verify `cribSheet`, `unitAssessment`, `resourcesPage`, `matrixTemplate` exist (not null)
    - [ ] On validation failure, return `{ valid: false, errors: ["id-not-found: lesson-abc123 references nodeId node-notfound"] }`
    - [ ] Throw, do not silently accept corrupt units (AD-LS-2, FR-LS-3)
  - [ ] Define `LocalStore` class (main API):
    - [ ] Constructor takes optional `serverClient` and `UI` callbacks (loading state, error display)
    - [ ] Method `async loadUnit()`:
      - [ ] Show loading state
      - [ ] Fetch unit via `serverClient.load()`
      - [ ] Validate via `validateUnit()` (FR-LS-3)
      - [ ] Check schema version; refuse if higher (FR-LS-6, INV-DM-9)
      - [ ] On validation failure, throw with message naming offending id (e.g., "Invalid reference: bigIdea-abc not found")
      - [ ] On success, store as `this.unit` and `this.lastSaved = JSON.stringify(unit)` (for unsaved-changes tracking)
      - [ ] Hide loading state
    - [ ] Method `setData(partialUnit)` — update `this.unit` with new data, mark dirty (unsaved)
    - [ ] Method `async saveUnit()` (debounced):
      - [ ] If no changes since last save, return early
      - [ ] Show loading state
      - [ ] Call `serverClient.save(this.unit)`
      - [ ] On success, update `this.lastSaved`, clear dirty flag, hide loading state
      - [ ] On error, show error state and do NOT mark as saved (JS-5, FR-LS-10)
    - [ ] Method `hasUnsavedChanges()` → boolean — compare current unit to `lastSaved`
    - [ ] Method `onBeforeUnload()` — warn if unsaved changes (FR-LS-5)
  - [ ] Debounce `saveUnit()` calls: ~500ms after last edit (OQ-LS-1, FR-LS-4)
  - [ ] Ensure vanilla ES modules only, no dependencies (FR-LS-12, JS-7)
  - [ ] Never use `innerHTML` with unit content; always escape or use `textContent` (JS-6, INV-DM-16 safety)
  - [ ] Centralize all `fetch()` calls in `ServerClient` only (JS-5)
- [ ] Create `tests/test_local-store.js`:
  - [ ] Test `validateUnit()`:
    - [ ] Fixture: valid unit → passes
    - [ ] Fixture: dangling nodeId reference in `lesson.nodeIds` → rejected, error message names the id
    - [ ] Fixture: two matrices for one student (INV-DM-6) → rejected
    - [ ] Fixture: lesson missing `bigIdeaId` (INV-DM-15) → rejected, names the lesson id
    - [ ] Fixture: three-level big-idea nesting (INV-DM-14) → rejected
    - [ ] Fixture: reverse link stored (e.g., `node.lessonIds`) → rejected (TEST-7)
    - [ ] Fixture: stored node with no `original` field but `edited: true` (INV-DM-2 violation) → rejected
  - [ ] Test schema versioning:
    - [ ] Unit with `schemaVersion: "2.0.0"` → refused (AC-LS-6)
  - [ ] Test unsaved-changes tracking:
    - [ ] Load valid unit, `hasUnsavedChanges()` → false
    - [ ] Call `setData()`, `hasUnsavedChanges()` → true
    - [ ] Mock save, `hasUnsavedChanges()` → false
  - [ ] Test server-unreachable state:
    - [ ] Mock server unavailable, call `saveUnit()`, expect visible error state (not silent failure — AC-LS-7)
  - [ ] Test round-trip (integration):
    - [ ] Create known unit, serialize, mock save, mock load, deserialize, compare byte-for-byte (AC-LS-1)
    - [ ] Create fixture with complex coverage arrays, round-trip, verify no data loss
  - [ ] Use `node:test` + `node:assert/strict`, mock fetch/DOM (TEST-2, TEST-4, TEST-8)
- [ ] Verify no request leaves localhost (check all URLs in `ServerClient` — should be `http://127.0.0.1:*` only, FR-LS-8)
- [ ] Verify zero dependencies — no external `import` statements (AC-LS-9)
- [ ] Verify every `fetch()` goes through `ServerClient` (JS-5, AC-LS-8)
- [ ] Verify no `innerHTML` with unit content (code review for JS-6)

---

## 3. Interfaces

**Exports (consumed by all parts: document-shell, every rendering module):**

| Export | Type | Signature |
|--------|------|-----------|
| **LocalStore** | Class | Constructor `(serverClient?, uiCallbacks?)` → manages unit load/save/validation |
| **LocalStore.loadUnit()** | Method | `async () → void` — fetch from server, validate, store in memory |
| **LocalStore.setData()** | Method | `(partialUnit) → void` — update data, mark unsaved, debounce auto-save |
| **LocalStore.saveUnit()** | Method | `async () → void` — write to server atomically (debounced) |
| **LocalStore.hasUnsavedChanges()** | Method | `() → boolean` — current unit differs from last saved |
| **LocalStore.onBeforeUnload()** | Method | `(event) → void` — warn user if unsaved changes on tab close |
| **LocalStore.unit** | Property | Full `unit.json` object in memory, current state |

**Validation error format:**
```
{
  valid: false,
  errors: [
    "INV-DM-4: dangling reference lesson-abc123 → nodeId node-notfound",
    "INV-DM-15: lesson-xyz is missing bigIdeaId"
  ]
}
```

**Consumes (from bundle-server):**
- `GET /api/unit` → full unit.json
- `PUT /api/unit` with JSON body → atomic save
- Error responses: `{ "error": "message", "code": "ERROR_CODE" }`

---

## 4. Verification

| AC | Check | Proof |
|----|-------|-------|
| **AC-LS-1** | Save → close browser → reopen → load restores byte-identically | Serialize unit before save, serialize after reload, compare strings (or `JSON.stringify` with sorted keys) |
| **AC-LS-2** | File with dangling `lesson.nodeIds` reference refused with message naming bad reference | Load fixture with `lesson.nodeIds: ["node-xyz"]` where node-xyz doesn't exist, verify validator returns error and message includes "node-xyz" |
| **AC-LS-3** | File with two matrices for one (student, lesson) pair refused | Load fixture with `matrices: [{ studentId: "stu-1", ... }, { studentId: "stu-1", ... }]`, verify INV-DM-6 check fires and rejects |
| **AC-LS-3a** | File with lesson missing `bigIdeaId` refused, naming the lesson | Load fixture with `lessons: [{ id: "les-abc", bigIdeaId: null }]`, verify INV-DM-15 check fires, error message includes "les-abc" |
| **AC-LS-3b** | File with three-level big-idea nesting refused | Load fixture with big-idea tree: root → parent → child → grandchild, verify INV-DM-14 check rejects it |
| **AC-LS-4** | Refreshing mid-edit loses nothing — debounced save already reached server | Type in control (triggers `setData()`), immediately refresh, verify last value persisted (save debounce must have fired before refresh) |
| **AC-LS-5** | Closing tab with unsaved change warns before unload | Load unit, make change, attempt to close tab, verify browser `beforeunload` event fires and prompts user |
| **AC-LS-6** | File with higher `schemaVersion` refused, not partially read | Mock server return `schemaVersion: "2.0.0"`, load, verify refusal with version-too-new message (not silently reading older fields) |
| **AC-LS-7** | Stopping server mid-session produces visible "server stopped" state | Mock server response delay, then return connection refused, verify UI shows "Cannot reach server" (not silent failure) |
| **AC-LS-8** | Every request shows loading state, on failure shows error naming what failed | Call `saveUnit()`, observe loading indicator; mock server error, observe error message on screen |
| **AC-LS-9** | Unit with stored reverse link or forked matrix instance refused | Load fixture with `node: { id: "node-1", lessonIds: [...] }` (reverse link), verify INV-DM-12 rejects it; load with matrix template criteria duplicated across instance, verify INV-DM-19 rejects |

---

## 5. Risks & Open Points

| Risk | Recommendation |
|------|---|
| **What happens if validation is too strict and refuses a recoverable file?** Luke locked out of his work | **Mitigation:** AD-LS-2 states errors must name the exact bad id so it can be hand-fixed in the JSON. Verify error messages in AC-LS-2, AC-LS-3. Add a comment in validation code: "errors name the specific id so the user can edit it by hand." |
| **Debounce timing — is 500ms enough?** Too short = thrashing disk; too long = crash loses work | **Recommendation per OQ-LS-1 (resolved):** 500ms is the balance. Not critical for v1 — can adjust once real usage shows thrashing or loss patterns. |
| **Should we keep N previous versions of unit.json as rollback?** | **Recommendation per OQ-LS-2 (resolved):** No in v1. Bundle folder is the backup (Luke's responsibility). Worth revisiting once a real term's work exists. |
| **How to detect if browser-storage copy diverges from server copy?** (AD-LS-5 rejects any browser-storage copy) | **Recommendation:** Don't keep one. Server writes immediately and atomically; a second copy is a second source of truth and the bug this project keeps designing out. Verify AD-LS-5's decision is honoured in code review. |
| **Who detects `Image.id` mismatches between the manifest and what's actually in `images/`?** (INV-DM-17 requires both to exist) | **Recommendation:** `image-paste` (wave 2) owns the manifest and the files. This build treats imageIds as opaque references; both caller and image-paste maintain the invariant. Accept as an integration point. |

---

**On completion:** Verify all AC-LS-1…9 pass, ensure TEST-7 gate tests both blocked and permitted validation cases, round-trip test with real schema, move spec and plan to `_Builds/_Done/`, update `_PLAN.md`.
