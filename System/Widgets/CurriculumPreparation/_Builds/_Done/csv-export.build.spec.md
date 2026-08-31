# csv-export — Build Spec

| Field | Value |
|---|---|
| **Type** | Build |
| **Date** | 2026-08-23 |
| **Status** | Draft — awaiting Luke's review |
| **Wave** | 4 |
| **One-liner** | Flattens the marking matrix's persisted, already-computed scores into one UTF-8-with-BOM CSV file inside the bundle — full-unit scope only, re-deriving nothing `marking-matrix` has already worked out. |

---

## 1. Motivation

FR-MM-6 requires the matrix be "saved as a basic spreadsheet" — AD-6 settles
this as plain CSV, no library, opens in Excel/Numbers/Sheets with no add-in.
`marking-matrix`'s own build explicitly scopes CSV writing **out**
(FR-MMB-16) and names this build as the one downstream of it, on the
condition that the persisted score shape (`criterionId`, `awardedScore`,
`comment`) stays stable enough for this build "to flatten without
re-deriving anything this build already computed" (`marking-matrix.build.spec.md`
§5). This build is that flattening, and nothing more.

## 2. Scope

**In scope**
- A CSV writer: stdlib `csv` (or an equivalent hand-rolled writer if this
  build runs client-side — see AD-CSV-3), UTF-8 with a BOM, one file per
  export, correct quoting for any field containing a comma, quote, or
  newline.
- **Full-unit scope only** — every criterion, every student, at the
  full-unit tiered-ceiling totals (FR-MM-11). The per-assessment scope
  (FR-MM-9) is not separately exportable in v1.
- Reading exported values through `local-store`'s normal read path only.
- Writing the export file **inside the bundle**, via a small, scoped
  addition to `bundle-server`'s endpoint surface (FR-CSV-8).
- An explicit, user-triggered export action on the marking matrix's HTML
  page.

**Out of scope**
- Per-assessment export (OQ-21/OQ-MMB-11 leave this open; this build's
  default is full-unit only — see §5).
- Any recomputation of a criterion's allocated `maxScore`, a student's tier
  subtotal, or the unit total — those are read, verbatim, from what
  `marking-matrix` already persisted or computed. *(FR-MM-11/12)*
- XLSX or any other spreadsheet format — AD-6 already rejected these; CSV
  only.
- A browser-native downloaded file — the export must land in the bundle, not
  the user's Downloads folder (FR-CSV-5).
- Per-criterion comment export — see OQ-CSV-2.
- Any change to `marking-matrix`'s own scoring, allocation, or print logic.

## 3. Requirements

- **FR-CSV-1** — Exports the marking matrix's **full-unit scope** as one CSV
  file — one row per student, one column per criterion plus tier subtotals
  and the tiered-ceiling unit total (FR-MM-11). *(OQ-21's default)*
- **FR-CSV-2** — Writes **UTF-8 with a BOM**, comma-delimited, correctly
  quoting any field containing a comma, quote, or newline — no third-party
  CSV library. *(AD-6, SR-2)*
- **FR-CSV-3** — Reads every exported value through **`local-store`'s
  normal read path** — the persisted `matrixTemplate.criteria[]`,
  `matrices[].scores[]`, and `students[]` — and re-derives **nothing**
  `marking-matrix` has already computed. *(marking-matrix.build.spec.md §5;
  FR-MM-11/12)*
- **FR-CSV-4** — A criterion with no `awardedScore` for a given student
  exports as a **blank cell**, never a zero — a zero is a real, entered
  score; a blank is "not yet marked," and the two stay visibly distinct in
  the exported file exactly as they must on screen.
- **FR-CSV-5** — The exported file lands **inside the bundle**, via
  `bundle-server`'s write path — never a browser-native downloaded file in
  the user's Downloads folder. *(mirrors AD-5's rejected "download-blob per
  image" for the same reason: it would break AD-18's self-contained,
  portable-as-one-folder guarantee)*
- **FR-CSV-6** — Each export **overwrites** the same canonical filename,
  rather than accumulating timestamped files. *(AD-CSV-2)*
- **FR-CSV-7** — Triggered by an explicit action on the marking matrix's
  HTML page — never automatic, never on every save. *(FR-SYS-7)*
- **FR-CSV-8** — Requires a **narrow addition to `bundle-server`'s endpoint
  surface** — a scoped, guarded write path for the export file, distinct
  from the existing `unit.json` and `images/` endpoints, refused exactly as
  every other write is if the resolved path escapes the bundle root.
  *(AD-13b; needs its own gate test, both directions, matching AC-BS-5)*

**Acceptance criteria**

- **AC-CSV-1** — Two students' full-unit scores export to one CSV that opens
  cleanly in Excel and Numbers, correct headers, no mangled non-ASCII text.
  *(AC-MM-1)*
- **AC-CSV-2** — A student with an unmarked criterion shows a blank cell for
  it, not a zero; a student with a genuinely entered zero shows `0`, visibly
  distinct from the blank.
- **AC-CSV-3** — A criterion whose wording contains a comma exports with
  correct quoting — the file re-parses with the same column count on every
  row.
- **AC-CSV-4** — Exporting twice in a row produces one file, not two — the
  second export overwrites the first at the same filename.
- **AC-CSV-5** — The exported file appears inside the bundle folder (checked
  by listing it), never in the browser's default download location.
- **AC-CSV-6** — A request to the export write endpoint with a path outside
  the bundle root is refused; a legitimate export write inside the root
  passes. *(TEST-7, mirrors AC-BS-5)*
- **AC-CSV-7** — The exported tier subtotals and unit total match FR-MM-11's
  tiered-ceiling figures exactly, for a fixture with at least one criterion
  left unmarked.

## 4. Prerequisites & dependencies

- **Required first:**
  - `marking-matrix` — the persisted score shape (`criterionId`,
    `awardedScore`, `comment`) and the tiered-ceiling total calculation
    (FR-MM-11/12) this build reads and must not re-derive.
  - `local-store` — this build's only read path (FR-CSV-3).
- **Choose-one:** OQ-21/OQ-MMB-11 (per-assessment export) — resolved here as
  **not in v1**, matching both upstream specs' own stated default; revisit
  only once this build exists and Luke asks for it.
- **Coordinate-with:** `bundle-server` — FR-CSV-8 needs a small, additive
  amendment to that build's endpoint surface before this build can write
  anything. Since `bundle-server` is specced but not yet started, folding
  this in now is free, matching this project's own stated lesson (AD-5's
  consequence note: "two of the three persistence designs were forced by
  requirements that arrived after the design, and both changes were free
  because no code existed"). This coordination must happen **before**
  `csv-export`'s own plan is written, not discovered mid-implementation.

**Gate:** work may start once `marking-matrix` and `local-store` are built
and verified, **and** `bundle-server`'s spec carries the export-write
endpoint this build needs.

## 5. Decisions

- **AD-CSV-1** — *Decision:* this build needs a new, narrowly-scoped
  `bundle-server` endpoint rather than reusing the `images/` endpoint or a
  browser-native download. *Rationale:* AD-13's tier boundary is absolute —
  all filesystem I/O goes through `bundle-server` — and the `images/`
  endpoint's shape (generated collision-free filenames, binary payloads)
  doesn't fit one named, overwritable text file; a small, honest addition is
  worth it rather than distorting an existing endpoint to fit. *Rejected:* a
  browser-native `<a download>` Blob save — lands in the user's Downloads
  folder, breaking the bundle's self-contained/portable guarantee (AD-18)
  exactly the way AD-5 already rejected for images; disguising the CSV as an
  "image" to reuse that endpoint — a type-safety violation to save one small
  addition.
- **AD-CSV-2** — *Decision:* one canonical, overwritten filename per unit,
  not a timestamped history. *Rationale:* matches this project's minimalism
  and the single-teacher, single-machine use case; Luke can copy a specific
  export by hand the rare time he'd want to keep an old one. *Rejected:*
  timestamped filenames — accumulate silently across a term with nothing
  cleaning them up, the same unbounded-growth smell SR-3 flags elsewhere.
- **AD-CSV-3** — *Decision:* the CSV is assembled in **JS**, client-side,
  from data already loaded through `local-store`, then handed to the new
  `bundle-server` endpoint as bytes to write — not generated in Python from a
  fresh read of `unit.json`. *Rationale:* the browser already holds the
  loaded, validated unit (AD-13's browser tier owns "rendering, editing,
  layout" — assembling a view of already-loaded data is squarely that); a
  Python-side re-read would be a second implementation of the roll-up math
  `marking-matrix`'s JS already computes (FR-MM-11/12), risking the two
  disagreeing. *Rejected:* a Python export script reading `unit.json`
  directly — duplicates arithmetic FR-CSV-3 already forbids re-deriving, and
  reopens SR-4 the moment the allocation algorithm changes in one place and
  not the other.

**Open questions**

- **OQ-CSV-1** — ✅ **RESOLVED (2026-08-29).** Exact filename convention?
  *Resolved:* `<unit-name-slug>-matrix.csv` at the bundle root, the slug
  derived the same way any other filesystem-safe name is derived elsewhere
  in this project (lowercase, spaces to hyphens). See FR-CSV-1.
- **OQ-CSV-2** — ✅ **RESOLVED (2026-08-29).** Do per-criterion comments
  export at all? *Resolved:* **no, scores only** — AD-6's own framing
  ("basic spreadsheet... opens in Excel") is about a gradebook import, not
  a prose record; a comment column per criterion would double the sheet's
  width for a use case this build doesn't target. See FR-CSV-2. Revisit if
  Luke asks for a comments variant.
- **OQ-CSV-3** — **DEFERRED — named cross-build coordination item, kept
  open.** Exact shape of the new `bundle-server` endpoint (method, path,
  response codes)? *Not resolved here on purpose:* the wire shape is not
  this build's to invent. It is owned by `bundle-server`'s own next
  revision — this build only names the requirement (FR-CSV-8) and the
  need (FR-CSV-3, FR-CSV-5); `bundle-server.build.spec.md`'s owner settles
  method/path/response codes, the same "settle it once, in wave 1"
  discipline that file already applies to its existing endpoints. Keep
  this row visible in both specs until `bundle-server` closes it — do not
  mark it resolved by assumption on either side.

## 6. Risks

| Risk | Consequence | Mitigation | Proving test |
|---|---|---|---|
| The CSV re-derives a total instead of reading `marking-matrix`'s own computed figure | The exported total silently disagrees with what the matrix's own print/screen view shows, the exact allocation-drift failure AD-40's worked example exists to prevent | FR-CSV-3 — read-only, no re-derivation | AC-CSV-7 |
| A blank (unmarked) cell exports as a literal `0` | A reader of the spreadsheet can't tell "not yet marked" from "scored zero" | FR-CSV-4 | AC-CSV-2 |
| The export endpoint isn't scope-guarded like every other `bundle-server` write | A crafted filename could write outside the bundle root — the exact failure AD-13b/TEST-7 exist to prevent | FR-CSV-8, same guard pattern as AD-BS-2 | AC-CSV-6 |
| The export lands in the browser's Downloads folder instead of the bundle | The bundle stops being the one place a unit's data lives, breaking AD-18's portability promise the moment Luke moves the bundle without also moving the export | FR-CSV-5, AD-CSV-1 | AC-CSV-5 |
| A field containing a comma or quote breaks the CSV's column alignment | The spreadsheet opens with shifted columns, corrupting neighbouring cells silently | FR-CSV-2 — stdlib `csv` module's own quoting | AC-CSV-3 |

## 7. Plan

Not yet written — `csv-export.plan.md` is the next step once this spec is
reviewed and `bundle-server`'s coordinated amendment (§4) is settled,
following the same spec-then-plan discipline as every other build in this
project.

## 8. Verification — definition of done

- [ ] All acceptance criteria AC-CSV-1…7 demonstrated
- [ ] No total, subtotal, or `maxScore` is recomputed by this build — every
      figure traces to a read, not a calculation, of `marking-matrix`'s own
      output
- [ ] BOM present; file opens cleanly in Excel and Numbers
- [ ] The new `bundle-server` endpoint is gate-tested in both directions
      (TEST-7)
- [ ] Exporting twice leaves exactly one file on disk

**On completion:** set Status to Done, `git mv` this spec and its plan to
[`_Done/`](_Done/), update [`_PLAN.md`](_PLAN.md), and re-check
[the project prerequisites gate](../_Spikes/CurriculumPreparation/CurriculumPreparation.prerequisites.spec.md).
