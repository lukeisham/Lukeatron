# image-paste — Implementation Plan

**Build:** image-paste (Wave 2) | **Date:** 2026-08-29 | **Status:** Ready for implementation

---

## 1. Files

```
_template/
├── app/js/
│   ├── image-paste.js               (Main: paste listener, file write via bundle-server, manifest mgmt, orphan cleanup)
│   ├── image-loader.js              (Image blob → width/height decode; placement default positioning)
│   └── orphan-cleanup.js            (Derive referenced imageIds, compute orphans, UI confirmation, batch delete)
└── app/css/
    └── image-paste.css              (Paste target hover states, placement UI, cleanup dialog)
```

**Purpose:**
- `image-paste.js` — listens for clipboard paste, sends to bundle-server, appends manifest entry, triggers placement in the receiving document.
- `image-loader.js` — decodes pasted image to read true width/height; positions image at sensible default (e.g., top-left of paste target).
- `orphan-cleanup.js` — walks every document's imageRefs[], computes orphan set, UI confirmation dialog, batch-delete orphans.
- `image-paste.css` — paste target styling, drag-handle appearance, cleanup dialog.

---

## 2. Steps

### Phase 1: Paste Listener & Bundle-Server Integration

- [ ] Write paste listener (in `image-paste.js`)
  - Global `document.addEventListener('paste', ...)`
  - Extract image from `event.clipboardData.items[]`
  - Validate: is an image (MIME type starts with `image/`)
  - Route to write path (Phase 2)

- [ ] Write file-upload flow (in `image-paste.js`)
  - Decode image blob → read true pixel width/height via `Image` or `createImageBitmap()`
  - Prepare multipart or raw body for `POST /api/images` (per bundle-server spec FR-BS-4)
  - Route upload through `local-store.fetch()` (centralised fetch module, never direct `fetch()`)
  - On success: receive `{ id, filename }`
  - On error: show user-facing message, do not crash

### Phase 2: Manifest & Persistence

- [ ] Append manifest entry (in `image-paste.js`)
  - On successful file write, create `Image` object: `{ id, filename, mimeType, width, height, byteSize, addedAt }`
  - All fields filled from bundle-server response or decoded image
  - `addedAt` is `new Date().toISOString()` (AD-BOSS-2 format)
  - Append to `unit.images[]`
  - Call `local-store.saveUnit(unit)` to persist

- [ ] Validate manifest on load (in `local-store`, not this build, but verify contract)
  - Every `ImageRef.imageId` resolves to a real `images[]` entry
  - Missing manifest entry → refuse load, naming the offending `imageId` (FR-IMP-8)

### Phase 3: Placement & Document Integration

- [ ] Write placement logic (in `image-paste.js`)
  - On successful paste + manifest append, create `ImageRef`: `{ imageId, x, y, width, height }`
  - Position at sensible default (e.g., 0, 0 within paste target, or center of available space)
  - Hand off to the receiving document (lesson-plan-document, crib-sheet, resources-page) via an event or callback
  - Document is responsible for adding the `ImageRef` to its own structure (tier-page imageRefs[], section imageRefs[], etc.)

- [ ] Write resize/reposition logic (in `image-paste.js`)
  - Placed image shows drag handles (SVG overlays in edit-view)
  - Resize: corner handles, aspect-ratio locked by default (OQ-IMP-1 resolved)
  - Reposition: center-point drag
  - Each change writes only `ImageRef.x/y/width/height`, never touches manifest entry or file

- [ ] Write image-removal logic (in `image-paste.js`)
  - "Remove from document" button on placed image
  - Delete only the `ImageRef` from the document's own structure
  - Leave manifest entry and file untouched (FR-IMP-6)
  - No confirmation required for this step (it's reversible via undo or repaste)

### Phase 4: Missing-File Handling

- [ ] Write placeholder rendering (in `image-paste.js`)
  - When `document-shell.renderImage()` is called with an `ImageRef` whose manifest entry resolves but file is missing:
    - Trigger placeholder via `document-shell`'s built-in missing-source placeholder (FR-DS-9)
    - Placeholder is visible in both edit-view and print (FR-IMP-7)
  - Never silently blank; never try to hide the problem

- [ ] Validate manifest entry exists at load time
  - This is handled by `local-store`'s validation (FR-IMP-8)
  - If manifest entry missing when `local-store` loads unit: refuse to open, name the offending `imageId`

### Phase 5: Orphan Cleanup

- [ ] Write `orphan-cleanup.js` — derive referenced imageIds
  - Walk every lesson's tier-page `imageRefs[]`
  - Walk every crib-sheet section's `imageRefs[]`
  - Walk every resources-page item's `imageId` (for kind: "image" items)
  - Union all collected imageIds into `referencedIds` set

- [ ] Compute orphans
  - Compare `referencedIds` against `unit.images[]` manifest
  - Collect entries with no reference: orphan list

- [ ] UI confirmation dialog
  - Show list of orphan files to delete
  - Require explicit "Yes, delete these files" confirmation
  - Never automatic, never silent (AD-IMP-4)

- [ ] Batch delete orphans
  - For each orphan: `DELETE /api/images/<id>` via `local-store.fetch()`
  - Remove orphan entries from `unit.images[]` manifest
  - Call `local-store.saveUnit(unit)` once after all deletes complete
  - On error: name the file that failed; leave others for manual cleanup

- [ ] Recheck every document type on orphan computation
  - Walk all 5 document types (lesson, unit-assessment, crib-sheet, resources, marking-matrix, lessons-and-topics)
  - Verify each is covered by the orphan-walk (AD-IMP-3 risk mitigated)

### Phase 6: Integration & UI Surface

- [ ] Add orphan-cleanup control to `index.html` (FR-IMP-13)
  - One button/link on the unit's landing screen only
  - No duplication on individual document screens
  - Label: "Clean up unused images" or similar

- [ ] Wire orphan cleanup to button click
  - Show confirmation dialog via `orphan-cleanup.js`
  - On confirmation: run delete sequence
  - Show success/error message

### Phase 7: Testing & Validation

- [ ] Unit tests for `image-loader.js` (node:test)
  - Mock `Image` and `createImageBitmap()`
  - Verify width/height decoded correctly from various image sizes

- [ ] Unit tests for `orphan-cleanup.js` (node:test)
  - Fixture unit with 4 images: 2 referenced, 2 orphaned
  - Verify orphan computation correctly identifies the 2 orphans
  - Verify referenced set is complete (no false positives)

- [ ] Smoke tests for paste flow (node:test)
  - Mock bundle-server POST response
  - Verify manifest entry created with correct fields
  - Verify no base64 image data in saved unit.json (AC-IMP-9)

- [ ] Manual acceptance testing
  - AC-IMP-1 through AC-IMP-10, each with fixture

---

## 3. Interfaces

### Exports (other builds call these)

None. This build surfaces an event (paste) and a UI control (orphan cleanup). Other builds listen for placement (via callback or event) but do not call functions on image-paste directly.

### Consumes (from other builds)

- **bundle-server** (required, via local-store)
  - `POST /api/images` → upload image file, get `{ id, filename }`
  - `GET /api/images/<id>` → fetch image blob (used by document-shell for rendering)
  - `DELETE /api/images/<id>` → delete orphan file (orphan cleanup only)

- **local-store** (required)
  - `local-store.fetch(method, endpoint, body)` — centralised fetch module for all bundle-server requests (FR-IMP-11)
  - `local-store.getUnit()` → current unit object
  - `local-store.saveUnit(unit)` → persist manifest changes
  - `local-store.validateUnit(unit)` → confirm ImageRef.imageId entries resolve (handled by local-store, not this build)

- **document-shell** (required)
  - `document-shell.renderImage(blob | null, x, y, width, height, svgElement)` — render placed image or placeholder (FR-DS-9)
  - Tier constants for styling placed-image UI (if needed)

- **style-guide** (required, via CSS tokens)
  - `--color-*`, `--space-*`, `--font-*` for paste-target styling and dialog

- **Receiving documents** (lesson-plan-document, crib-sheet, resources-page, unit-assessment-document)
  - Listen for "paste complete" event or callback with `ImageRef` object
  - Add `ImageRef` to their own structure (tier imageRefs[], section imageRefs[], etc.)
  - Each document is responsible for rendering its own `ImageRef`s via document-shell's image primitive

---

## 4. Verification

| AC ID | Acceptance Criterion | Concrete Runnable Check |
|---|---|---|
| AC-IMP-1 | Paste into lesson tier page, crib-sheet section, resources item produces file in `images/` and renders immediately | Paste 3 images (one into each target) → verify 3 files appear in `images/` folder → verify each renders immediately on screen without reload |
| AC-IMP-2 | Pasted image re-renders identically after save → close → reopen | Paste image → save unit → close → reopen → verify image still renders at same position/size |
| AC-IMP-3 | Pasted image prints legibly in PDF at default placement size | Paste image into lesson tier page at default size → print to PDF at 96 dpi → verify image is legible (no compression artifacts visible; type/detail readable) |
| AC-IMP-4 | Deleting image file outside tool (Finder) produces visible placeholder on next render | Delete an image file from `images/` folder using Finder → render unit → verify placeholder appears instead of blank or error |
| AC-IMP-5 | Removing `ImageRef` from document does not delete backing file or manifest entry | Remove a pasted image from a lesson tier page → verify file still exists in `images/` → verify manifest entry still in unit.json → verify file available for orphan-cleanup or re-paste elsewhere |
| AC-IMP-6 | Unit with 2 files (1 referenced, 1 orphaned) shows only orphaned one in cleanup, confirms before deleting | Fixture: `images/` contains 2 files, `unit.json` has 2 manifest entries, only 1 `ImageRef` points to first file → run cleanup → verify cleanup UI lists only the 1 orphan file → require confirmation → verify file deleted, other stays |
| AC-IMP-7 | Unit with missing manifest entry (ImageRef.imageId has no corresponding images[] entry) refused at load | Fixture: `unit.json` has `ImageRef.imageId: "missing-id"` but no matching images[] entry → attempt to load → verify load fails, names "missing-id" (FR-IMP-8, handled by local-store validation) |
| AC-IMP-8 | Two pastes with same clipboard filename produce distinct files, no overwrite | Paste same-named image twice → verify 2 distinct files in `images/` (different filenames due to collision-free generation) → verify both manifest entries present |
| AC-IMP-9 | 20-image fixture pastes produce manifest-only growth; no base64 image data in unit.json | Paste 20 images across 3 documents → measure unit.json growth → verify proportional to manifest entries only → grep for `data:image/` → verify zero matches (AD-15, FR-IMG-3) |
| AC-IMP-10 | All image-endpoint requests routed through local-store.fetch(); no second fetch() call site | Grep `image-paste.js` for `fetch(` not preceded by `local-store.` → verify zero matches (FR-IMP-11) |

---

## 5. Risks & Open Points

| Risk | Impact | Mitigation | Proving Test | Default |
|---|---|---|---|---|
| Orphan cleanup runs automatically on save or without confirmation | Silently destroys a user's file (AD-15's named worst case) | AD-IMP-4: explicit control, confirmation required, never automatic | AC-IMP-6 | **Accepted:** AD-IMP-4 is non-negotiable. Code review verifies no automatic paths to delete. |
| Generated filename collides with existing file (two pastes land on same name) | Second image silently overwrites first, permanent data loss | AD-IMP-2: collision-free by construction; never trust external filename | AC-IMP-8 | **Accepted:** collision-free generation is mandatory; AD-IMP-2 is enforced. |
| Image bytes end up base64-encoded in unit.json for convenience | Bloats every save, kills diffability; reverses AD-15's entire decision | FR-IMP-3 explicit; grep check on saved file | AC-IMP-9 (gate test) | **Accepted:** files-not-base64 is binding. AC-IMP-9 is non-negotiable gate. |
| Missing manifest entry treated same as missing file; corrupt unit opens silently | INV-DM-17's distinction collapses; corrupt data undetected | FR-IMP-7/8 stated as two distinct cases; local-store validation refuses missing-entry case at load | AC-IMP-4 (file case) vs AC-IMP-7 (manifest case) | **Accepted:** two separate code paths, two separate tests. Local-store is the gatekeeper for manifest case. |
| Orphan cleanup misses an imageId in a document type added later (e.g., new assessment document) | Still-referenced image deleted as if orphaned; placeholder fires where image should render | AD-IMP-3: walk-every-document rule; every new document type with imageRefs[] must register in the walk | AC-IMP-6 rerun on each new doc type; code review mandatory for new imageRefs[] | **Accepted:** AD-IMP-3 is locked in code comments. Every new doc type review must verify walk coverage. |
| Resize/reposition write touches manifest entry or file instead of only `ImageRef` | Resize on one document silently changes size everywhere else; intent was local placement only | FR-IMP-5 explicit (`ImageRef` fields only); code review spot-checks | Manual check: resize touches only `x/y/width/height`, never manifest fields | **Accepted:** field boundary is strict; code review is the gate. |
| Spec IDs (FR-IMP-*, AC-IMP-*) leak into rendered strings (messages, dialog labels) | SR-9 violated; teacher-facing UI shows developer jargon | Code review greps all rendered strings for spec patterns | Manual check: no spec pattern in any message/label | **Accepted:** no spec IDs rendered; strict review. |

---

## Acceptance Gates Before Handoff

- ✅ All AC-IMP-1…10 passing with fixtures
- ✅ AC-IMP-1/2: paste-then-render and save→reopen fidelity across all 3 document types (lesson, crib-sheet, resources)
- ✅ AC-IMP-4 vs AC-IMP-7: missing-file placeholder and missing-manifest-entry refusal demonstrated as distinct behaviours
- ✅ AC-IMP-5/6: removing ImageRef never deletes file; orphan cleanup deletes only unreferenced, only on explicit confirmation
- ✅ AC-IMP-9: no base64 image data in saved unit.json (gate test)
- ✅ AC-IMP-10: all image requests route through local-store.fetch()
- ✅ Zero third-party dependencies; vanilla ES modules only
- ✅ No spec ID or invariant name in any rendered text
- ✅ Filesystem access only via bundle-server through local-store

---

## Dependencies & Prerequisites

**Must be specced and interface-settled before starting:**
- bundle-server (POST /api/images, GET /api/images/<id>, DELETE /api/images/<id>)
- local-store (fetch module FR-LS-9, saveUnit, getUnit, validation)
- document-shell (renderImage primitive FR-DS-9)

**Coordinate with (no build-order dependency, but ensure consistency):**
- lesson-plan-document, crib-sheet, resources-page, unit-assessment-document — each will receive paste callbacks and add ImageRefs to their own structures; this build does not know their internals

---

## Notes

- **AD-IMP-2 (collision-free filenames):** Bundle-server's spec (FR-BS-4) names "collision-free" but does not specify the mechanism. This build trusts the endpoint; the mechanism (hash, timestamp, UUID) is bundle-server's decision.
- **OQ-IMP-1 (aspect-ratio on resize):** Resolved to locked by default, matching mainstream document tools.
- **OQ-IMP-2 (print quality):** No resampling in v1; native resolution at placed size. Q-6 tests will reveal if this needs future enhancement.
- **OQ-IMP-3 (orphan-cleanup surface):** Resolved to one central place (index.html), not duplicated on per-document screens.
