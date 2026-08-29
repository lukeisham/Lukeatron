# image-paste — Build Spec

| Field | Value |
|---|---|
| **Type** | Build |
| **Date** | 2026-08-22 |
| **Status** | Draft — awaiting Luke's review |
| **Wave** | 2 |
| **One-liner** | Clipboard paste → a real file in `images/` → a manifest entry → placement in a document, with a visible placeholder when the file goes missing — the one image path every document-carrying part reuses. |

---

## 1. Motivation

Three specced builds (`lesson-plan-document`, `crib-sheet`, `resources-page`)
and one unspecced one (`unit-assessment-document` names it too) all cite the
same dependency by name — "`image-paste`'s existing `ImageRef` model," "the
`images/` manifest" — for a build that, until now, did not itself have a
spec. `DEPENDENTS.md` filed this as row 11: "clipboard image capture → file
on disk, with manifest, placement, and missing-file placeholders." This
build closes that gap, matching the pattern `lesson-plan-document.build.spec.md`
already used to close the equivalent gap for the lesson plan.

The design itself is already settled, not invented here: `AD-15` decided
files-not-base64 back in the arch spec's early revisions, and every sibling
build's citation of `ImageRef = {imageId, x, y, width, height}` and the
`images[]` manifest entry `{id, filename, mimeType, width, height, byteSize,
addedAt}` already assumes this build implements exactly that shape. This
spec formalises the paste interaction, the write path, and the placement/
removal rules those citations depend on.

## 2. Scope

**In scope**
- Capturing a **clipboard paste** event on the HTML page, inside a lesson
  plan's tier page, a crib-sheet section, or a resources item (FR-IMG-1).
- Writing the pasted image as a **real file** under the bundle's `images/`
  folder, via `bundle-server`'s `FR-BS-4` endpoint, with a generated
  collision-free filename (FR-IMG-2).
- Recording a **manifest entry** in `unit.json` — `{id, filename, mimeType,
  width, height, byteSize, addedAt}` — one per file, referenced by id, never
  by embedded data (FR-IMG-3).
- **Placing** an image via an `ImageRef` (`{imageId, x, y, width, height}`)
  on a document, **resizing** it, and **removing** it from a document (never
  deleting the file as a side effect) (FR-IMG-5, FR-IMG-7).
- Drawing the placed image through `document-shell`'s generic image
  primitive (`FR-DS-9`), including print rendering at usable quality
  (FR-IMG-4).
- A **visible placeholder** when an `ImageRef`'s manifest entry resolves but
  the backing file is missing — the unit folder can be moved or a file
  deleted outside the tool (FR-IMG-6, INV-DM-17).
- A separate, explicit **orphan-cleanup** action that removes manifest
  entries (and, only then, files) no `ImageRef` anywhere in the unit still
  points to — never triggered automatically by an edit (FR-IMG-7).
- Every fetch to `bundle-server`'s image endpoints routed through
  `local-store`'s centralised fetch module (`FR-LS-9`, JS-5), not a second,
  scattered `fetch()` call.

**Out of scope**
- **Any pixel editing** — crop, rotate, filter, annotate. FR-IMG-5 caps this
  build at place/size/remove; Luke has real image editors already (AD-15).
- **The manifest's own storage/versioning mechanics beyond this build's own
  writes** — `local-store` owns `unit.json`'s save/load/validate cycle
  (`FR-LS-1…6`); this build only decides *what* the manifest and `images/`
  contain, the same division `local-store.build.spec.md` §2 already states
  from its own side.
- **Deciding where on a page an image may be placed** — that is each
  document build's own layout (`lesson-plan-document`'s tier pages,
  `crib-sheet`'s sections, `resources-page`'s items). This build supplies
  the primitive interaction (place, drag/resize a rectangle, remove); it
  does not own tier-page or section layout rules.
- **Any image compression, resampling, or format conversion** beyond what
  is needed for `AC-IMG-3`'s legibility bar — see OQ-IMP-2.
- Filesystem access from the browser directly — every read/write goes
  through `bundle-server`, reached only via `local-store` (AD-13).

## 3. Requirements

> **Requirement families.** `FR-IMG-n` is the **PRD-level**, cross-cutting
> family ([PRD](../_Spikes/CurriculumPreparation/CurriculumPreparation-prd.spec.md),
> FR-IMG-1…7). `FR-IMP-n` below is the **build-level** family, the same
> PRD/build split every other build in this folder uses.

- **FR-IMP-1** — Listens for a clipboard **paste** event on the page,
  extracts an image from the clipboard data (when present), and hands it to
  the write path (FR-IMP-2) without requiring a file-picker dialog as the
  only route in (FR-IMG-1).
- **FR-IMP-2** — Sends the pasted image's bytes to `bundle-server`'s image
  endpoint (`FR-BS-4`, via `local-store`'s fetch module), which writes it as
  a real file under `images/` with a **generated, collision-free filename**
  — never the clipboard's own filename or MIME sniffing alone, since a
  second same-named paste must never overwrite the first (FR-IMG-2).
- **FR-IMP-3** — On a successful write, appends one entry to `unit.json`'s
  `images[]` manifest — `{id, filename, mimeType, width, height, byteSize,
  addedAt}` — reading `width`/`height` from the decoded image, never from
  the clipboard's own (frequently absent or wrong) metadata (FR-IMG-3).
- **FR-IMP-4** — Places the new manifest entry onto the document that
  received the paste as an `ImageRef` (`{imageId, x, y, width, height}`),
  positioned at a sensible default (e.g. the paste target's current
  insertion point) and immediately visible — no save-then-reload step
  required to see it (FR-IMG-1, AC-IMG-1).
- **FR-IMP-5** — An placed image can be **resized** (drag handle or
  equivalent) and **repositioned**, writing only `ImageRef.x/y/width/height`
  — never touching the manifest entry or the underlying file (FR-IMG-5).
- **FR-IMP-6** — **Removing** an image from a document deletes only its
  `ImageRef` from that document. The manifest entry and the file are left
  untouched — deleting a user's file as a side effect of an edit is never
  acceptable (FR-IMG-7, AD-15).
- **FR-IMP-7** — A **missing file** — an `ImageRef` whose manifest entry
  resolves but whose file no longer exists at `images/<filename>` — renders
  a **visible placeholder**, in edit view and print view, never a silent
  blank (FR-IMG-6, INV-DM-17).
- **FR-IMP-8** — A **missing manifest entry** — an `ImageRef.imageId` with
  no corresponding `images[]` entry at all — is treated as **invalid data**,
  not a placeholder case: `local-store`'s load-time validation (`FR-LS-3`)
  refuses the unit, naming the offending `imageId`, per INV-DM-17's
  file-vs-manifest distinction.
- **FR-IMP-9** — Draws every placed image through `document-shell`'s
  generic image primitive (`FR-DS-9`) — this build hands it a blob or
  object URL and a position/size; it never manipulates the SVG or the print
  layout directly (FR-IMG-4).
- **FR-IMP-10** — Provides a separate, explicit **"clean up unused images"**
  action that computes every `ImageRef.imageId` referenced anywhere in the
  unit (every lesson tier page, every crib-sheet section, every resources
  item), lists manifest entries no `ImageRef` points to, and — only on
  explicit confirmation — deletes those files and their manifest entries.
  Never runs automatically, never runs as a side effect of any other edit
  (FR-IMG-7).
- **FR-IMP-11** — Every request to `bundle-server`'s image endpoints goes
  through `local-store`'s one centralised fetch module — this build adds no
  second, scattered `fetch()` call site (FR-LS-9, JS-5).
- **FR-IMP-12** — Uses **vanilla JS only** — no framework, no bundler, no
  package manager, no third-party image library, including for reading
  pasted image dimensions (the browser's own `Image`/`createImageBitmap`
  APIs suffice) (FR-SYS-8, AD-13a).
- **FR-IMP-13** — The "clean up unused images" control (`FR-IMP-10`) is
  surfaced in **exactly one place**: the unit's landing screen
  (`index.html`, the shared entry point every document-specific screen is
  reached from — `bundle-template.build.spec.md`). It is **not** duplicated
  onto any individual document screen (lesson tier page, crib sheet,
  resources page, etc.) — a whole-unit operation gets one control, not
  five (`OQ-IMP-3`).

**Acceptance criteria**

- **AC-IMP-1** — Pasting an image into a lesson plan's tier page, a
  crib-sheet section, and a resources item each produces a file in
  `images/` and renders it immediately, with no reload required (AC-IMG-1).
- **AC-IMP-2** — A pasted image re-renders identically after save → close →
  reopen (AC-IMG-2).
- **AC-IMP-3** — A pasted image prints legibly in the PDF at the fixture's
  default placement size (AC-IMG-3) — see OQ-IMP-2 for the accuracy bar.
- **AC-IMP-4** — Renaming or deleting an image's file outside the tool (in
  Finder) produces a visible placeholder on next render, not a blank
  (AC-IMG-4).
- **AC-IMP-5** — Removing an `ImageRef` from a document does not delete its
  backing file or its manifest entry; the file remains available for the
  "clean up unused images" action or a fresh placement elsewhere (AC-IMG-5).
- **AC-IMP-6** — A unit with two files in `images/` — one referenced by an
  `ImageRef` somewhere, one not — surfaces only the unreferenced one when
  "clean up unused images" is run, and confirms before deleting anything.
- **AC-IMP-7** — A fixture `unit.json` whose `images[]` manifest is
  missing an entry that some `ImageRef.imageId` points to is **refused** at
  load, naming that `imageId` (FR-IMP-8).
- **AC-IMP-8** — Pasting two images with clipboard data reporting the same
  filename produces two distinct files in `images/` and two distinct
  manifest entries — no overwrite (FR-IMP-2).
- **AC-IMP-9** — Two 20-image fixture pastes across a lesson plan, a crib
  sheet, and a resources page produce `unit.json` growth proportional to
  the manifest entries only — grepping the saved file for base64 image data
  (`data:image/`) returns nothing (FR-IMG-3, AD-15).
- **AC-IMP-10** — Grepping this build's network calls for any `fetch()` not
  routed through `local-store`'s module returns nothing (FR-IMP-11).

## 4. Prerequisites & dependencies

- **Required first:** [`bundle-server`](bundle-server.build.spec.md) — this
  build's only write path to `images/` via `FR-BS-4`'s `POST`/`GET`/
  `DELETE` endpoints, including the scope guard (`FR-BS-5`) and
  collision-free filename generation; [`local-store`](local-store.build.spec.md)
  — the centralised fetch module every request routes through (`FR-LS-9`)
  and the manifest's home inside `unit.json`; [`document-shell`](document-shell.build.spec.md)
  — the image primitive (`FR-DS-9`) this build's placements draw through,
  including its own missing-source placeholder behaviour, which this build
  triggers rather than reimplements.
- **Choose-one:** none. `DEPENDENTS.md` row 11 named this build "spec
  pending Q-6" (the clipboard round-trip's quality/size question); per
  `_Builds/_PLAN.md`'s own later note, Q-6 "runs against a synthetic
  fixture unit and [is] agent-runnable now" — it is not a Luke-dependent
  gate blocking this spec, and `AC-IMP-3`/`AC-IMP-9` are exactly how this
  build's acceptance tests answer it once implemented.
- **Coordinate-with:** `lesson-plan-document`, `crib-sheet`,
  `resources-page` — each places this build's `ImageRef`s inside its own
  layout (tier pages, sections, items respectively) but never writes the
  manifest or the file directly; every one of the three already cites this
  build's shape by name and expects it unchanged. `unit-assessment-document`
  — not yet specced, but the data model's tier-page shape (`imageRefs[]`)
  implies it will need this build the same way `lesson-plan-document` does.

**Gate:** work may start once `bundle-server`, `local-store` and
`document-shell` are each specced and their interfaces — the image endpoint
shape, the fetch module, and the image primitive's blob/object-URL contract
— are settled.

## 5. Decisions

- **AD-IMP-1** — *Decision:* the pasted image's `width`/`height` are read
  by **decoding the image itself** in the browser (`Image`/
  `createImageBitmap`), never trusted from clipboard-supplied metadata.
  *Rationale:* clipboard image data frequently carries no dimension
  metadata at all, or carries a screenshot tool's own display-scaled
  values rather than the pixel dimensions of the actual bitmap; decoding
  the bytes directly is the only source that is always correct. *Rejected:*
  reading `DataTransferItem` metadata when present, falling back to
  decoding otherwise — an inconsistency between two code paths for no
  real benefit, since decoding always works and is cheap.
- **AD-IMP-2** — *Decision:* a generated filename is **collision-free by
  construction** — a content hash or a monotonic id plus the original
  extension — never the clipboard's own suggested filename, even when one
  is present. *Rationale:* `FR-BS-4` already commits to "generated
  collision-free filenames"; trusting a clipboard-supplied name (often
  literally `image.png` from every screenshot tool) would reintroduce the
  exact collision this build must prevent. *Rejected:* de-duplicating by
  appending `-1`, `-2` suffixes on collision — works, but is a second
  collision-avoidance mechanism competing with the simpler guarantee of
  never trusting an external name to begin with.
- **AD-IMP-3** — *Decision:* "clean up unused images" (FR-IMP-10) computes
  its referenced-id set by walking **every** document's `imageRefs[]` at
  run time — never a stored, cached reference count on the manifest entry.
  *Rationale:* matches `INV-DM-12`'s "derive, don't duplicate" discipline,
  applied here to a reference count instead of a reverse edge; a cached
  count would drift the moment any document build placed or removed an
  `ImageRef` without also remembering to update it. *Rejected:* an
  `images[].refCount` field maintained incrementally by every placing/
  removing build — adds a second source of truth five different builds
  would each have to keep correct.
- **AD-IMP-4** — *Decision:* orphan cleanup (FR-IMP-10) is **never**
  automatic — not on save, not on a debounce timer, not as a side effect of
  any other action. It runs only from its own explicit control, with a
  confirmation step before any file is deleted. *Rationale:* `AD-15`
  already states the house rule this build must not violate — "destroying
  a user's file as a side effect of an edit is the kind of thing a personal
  tool only has to do once to lose trust" — orphan cleanup is the one place
  in this build that *does* delete files, so it is held to the strictest
  possible trigger discipline. *Rejected:* automatic cleanup on save (the
  exact failure `AD-15` warns against, at the least convenient possible
  moment — mid-edit, before the author has necessarily finished placing an
  image they just pasted).

**Open questions**

- **OQ-IMP-1** — ✅ **RESOLVED (2026-08-29).** Does resizing an `ImageRef`
  (FR-IMP-5) preserve aspect ratio by default, with an explicit modifier to
  distort, or is free resize the default? *Resolved:* aspect-ratio-locked
  by default (a dragged corner handle), matching how every mainstream
  document tool handles image resize — free distortion is not a use case
  any cited requirement asks for; revisit only if Luke wants deliberate
  distortion for some fixture.
- **OQ-IMP-2** — ✅ **RESOLVED (2026-08-29).** What print-quality bar does
  `AC-IMP-3`'s "usable quality" mean concretely — a minimum source
  resolution, a maximum print scale factor, or a visual pass/fail on the
  printed PDF? *Resolved:* no resampling or compression in v1 — the pasted
  bitmap prints at its native resolution scaled to its placed
  `width`/`height`; if a screenshot's native resolution proves too low at
  typical placement sizes, that is Q-6's actual finding and should drive a
  follow-up decision, not a guessed compression pipeline built ahead of
  evidence. Rationale for the default: this project's stated preference
  throughout (AD-16, AD-43) is to ship the simplest correct thing and let
  a real fixture's failure, not a hypothetical one, drive added
  complexity.
- **OQ-IMP-3** — ✅ **RESOLVED (2026-08-29) — Luke direct.** Should the
  "clean up unused images" action be reachable from every document screen,
  or only from one central place? *Resolved:* one central place — it is a
  whole-unit operation (walks every document), not a per-document one, and
  surfacing it identically on five different screens risks a teacher
  running it from the "wrong" screen expecting it to be scoped to just
  that document. See FR-IMP-13, which names the unit's landing screen
  (`index.html`) as that one place.

## 6. Risks

| Risk | Consequence | Mitigation | Proving test |
|---|---|---|---|
| Orphan cleanup runs automatically or without confirmation under implementation pressure ("just clean up on save, it's simpler") | Silently destroys a user's file — `AD-15`'s named worst-case, the one thing this build must never do | AD-IMP-4 states the trigger discipline explicitly; code review checks for any automatic call to the delete path | AC-IMP-6 |
| A generated filename collides with an existing file (two pastes land on the same name) | A second pasted image silently overwrites the first — permanent, unnoticed data loss | AD-IMP-2 — collision-free by construction, never a trusted external name | AC-IMP-8 |
| Image bytes end up base64-encoded inside `unit.json` "just for one build's convenience" | Reopens `AD-15`'s rejected alternative — bloats every save, kills diffability, the reason this build exists in the first place | FR-IMP-3's manifest-by-reference rule stated explicitly; grep check on save output | AC-IMP-9 |
| A missing manifest entry (`FR-IMP-8`'s invalid-data case) is treated the same as a missing file (`FR-IMP-7`'s placeholder case) | `INV-DM-17`'s file-vs-manifest distinction collapses — a genuinely corrupt unit opens silently instead of being refused | FR-IMP-7/8 stated as two distinct, separately-tested cases | AC-IMP-4 (file case) vs AC-IMP-7 (manifest case), demonstrated as different behaviours |
| "Clean up unused images" under-computes its referenced-id set (misses an `ImageRef` in a document type added after this build shipped) | A still-referenced image is deleted as if orphaned — the placeholder (FR-IMP-7) then fires where a real image should render | AD-IMP-3's walk-every-document rule; every new document build that introduces `imageRefs[]` is required to register with this build's walk, flagged at that build's own review | AC-IMP-6, re-run whenever a new document type ships |
| A resize or reposition write touches the manifest entry or the file instead of only the placing document's `ImageRef` | A resize on one document silently changes the image's size everywhere else it's placed, when the intent was local-only placement | FR-IMP-5 states the field boundary explicitly (`ImageRef` fields only) | Manual check: resize writes touch no `images[]` field |

## 7. Plan

Deferred, pending spec review — matching this project's standing
"spec-then-plan" discipline (see `style-guide.build.spec.md`'s,
`lesson-plan-document.build.spec.md`'s, and `crib-sheet.build.spec.md`'s
own §7). Not written yet.

## 8. Verification — definition of done

- [ ] All acceptance criteria AC-IMP-1…10 demonstrated
- [ ] AC-IMP-1/2: paste-then-immediate-render and save→reopen fidelity
      both demonstrated across all three current document types (lesson
      plan, crib sheet, resources page)
- [ ] AC-IMP-4 vs AC-IMP-7: missing-file placeholder and missing-manifest-
      entry refusal demonstrated as two distinct behaviours
- [ ] AC-IMP-5/6: removing an `ImageRef` never deletes a file; orphan
      cleanup only deletes what is genuinely unreferenced, only on
      explicit confirmation
- [ ] AC-IMP-9 (gate test): no base64 image data (`data:image/`) anywhere
      in a saved `unit.json`
- [ ] AC-IMP-10: every image-related network call routes through
      `local-store`'s fetch module — no second, scattered `fetch()`
- [ ] No spec id, invariant name, or requirement number ever rendered to
      the teacher using the widget (SR-9)
- [ ] Zero third-party dependencies; vanilla ES modules only (JS-7,
      FR-IMP-12)
- [ ] Filesystem access happens only via `bundle-server`, reached only
      through `local-store`

**On completion:** set Status to Done, `git mv` this spec and its plan to
[`_Done/`](_Done/), update [`_PLAN.md`](_PLAN.md), and re-check
[the project prerequisites gate](../_Spikes/CurriculumPreparation/CurriculumPreparation.prerequisites.spec.md).
