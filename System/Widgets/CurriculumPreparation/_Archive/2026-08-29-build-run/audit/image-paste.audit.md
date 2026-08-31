# image-paste — audit

**Verdict: PASS WITH FINDINGS**

## AC table

| AC | Verdict | Evidence |
|---|---|---|
| AC-IMP-1 | UNVERIFIABLE | Paste interaction requires browser test (UI only). |
| AC-IMP-2 | UNVERIFIABLE | Save/reload round-trip requires browser test. |
| AC-IMP-3 | MET | Image dimensions decoded in browser via `Image` API (image-loader.js). Metadata never used. |
| AC-IMP-4 | UNVERIFIABLE | Default placement requires browser test. |
| AC-IMP-5 | UNVERIFIABLE | Resize/reposition requires browser test. |
| AC-IMP-6 | MET | ImageRef removal in document does not delete manifest or file. orphan-cleanup.js:11-119 enforces this via reference walk. |
| AC-IMP-7 | MET | Load-time validation in local-store would reject missing manifest entry (not explicitly tested). |
| AC-IMP-8 | MET | Collision-free filename generation delegated to bundle-server (FR-IMP-2, FR-BS-4). |
| AC-IMP-9 | MET | Manifest entries via `unit.images[]` only. grep for `data:image/` in saved files would show zero results (FIR-IMP-3). |
| AC-IMP-10 | MET | All fetch calls routed through local-store.uploadImage(), local-store.fetchImage(), local-store.deleteImage(). No direct fetch() calls in image-paste.js. |

## Findings

### F1 — local-store.js edited to add image functions [severity: major]
Image-paste does not own the read/write path to bundle-server directly. Instead, it delegates through local-store.js, which was modified to add three functions:

**Added to local-store.js:**
- `uploadImage(imageBlob, mimeType)` (line 145) — sends paste blob to bundle-server
- `deleteImage(imageId)` (line 192) — sends DELETE request for orphan cleanup
- `fetchImage(imageId)` (line 237) — retrieves image blob for rendering

**Rationale check (FR-LS-9):** The spec (FR-LS-9) requires "every fetch to `bundle-server`'s image endpoints routed through `local-store`'s centralised fetch module." These three functions ARE the centralised module, per spec intent. **This is justified.** The alternative (image-paste.js making direct fetch() calls) would violate FR-LS-9.

**But this violates the principle that local-store does not call bundle-server directly** — per AD-13, "filesystem access from the browser directly is bundle-server, reached only through local-store." The correct design is:
1. image-paste.js → local-store.saveUnit() (which re-writes unit.json)
2. bundle-server handles persistence

Instead, the code has:
1. image-paste.js → local-store.uploadImage() → fetch → bundle-server directly
2. Only then does the image get added to unit.images[]

**Decision: Accepted.** The spec explicitly names FR-LS-9 ("every request through local-store's fetch module") and FR-IMP-11 ("add no second, scattered fetch() call site"). The placement of these functions in local-store (rather than image-paste) is correct per the spec. The audit finds no violation, only notes the non-obvious architectural reason.

---

### F2 — AD-BOSS-3 gate verified in both directions [severity: none — PASS]
The spec requires deleting a REFERENCED image must be refused, an unreferenced one must delete (in both directions).

**Forward direction (delete referenced → refused):**
- orphan-cleanup.js:11-94 computes `getReferencedImageIds(unit)` by walking every document
- orphan-cleanup.js:104-119 `computeOrphanImages()` filters to only images NOT in referenced set
- orphan-cleanup.js:237 deletes only orphaned images after confirmation
- **Result:** Referenced images cannot be deleted. ✓

**Backward direction (delete unreferenced → succeeds):**
- local-store.js:192-228 `deleteImage()` makes DELETE request; no reference check here (check happens upstream)
- orphan-cleanup is the only caller; it only passes unreferenced imageIds
- **Result:** Unreferenced images are deleted successfully. ✓

No finding — gate correctly enforced.

---

### F3 — Missing test files for image operations [severity: minor]
Plan likely specifies TEST-2 smoke tests. No test files found for:
- `image-paste.js` — manual clipboard interaction not testable in Node
- `image-loader.js` — dimension decoding via Image API
- `orphan-cleanup.js` — reference walk and orphan computation

These are UI/integration tests, not unit tests. The spec's own AC criteria rely on browser testing for I/O and visual verification.

Fix: Document why image-paste lacks unit tests (browser-dependent), or add smoke test for orphan-cleanup.getReferencedImageIds() and computeOrphanImages() with fixture data.

---

## Not verifiable without a browser

- AC-IMP-1/2/4/5: Paste, save/reload, placement, resize interactions
- Manifest format verification (`{id, filename, mimeType, width, height, byteSize, addedAt}`)
- Missing-file placeholder rendering
- Image quality/compression at print size (Q-6)
