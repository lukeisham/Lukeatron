# document-shell — Build Spec

| Field | Value |
|---|---|
| **Type** | Build |
| **Date** | 2026-08-17 |
| **Status** | Draft — awaiting Luke's review |
| **Wave** | 1 (foundation) |
| **One-liner** | An offline single-file chassis that renders a paginated A4 document — portrait or landscape — as inline SVG, edits it through HTML controls, and prints true-size. |

---

## 1. Motivation

All four parts of Curriculum Preparation are the same shape of thing: a
paginated A4 document, drawn in SVG, edited through HTML, printed to PDF.
Building that four times would produce four subtly different page layouts and
four sets of print bugs. This build makes it once.

Filed from [DEPENDENTS.md](../_Spikes/CurriculumPreparation/DEPENDENTS.md)
row 1: the capability is more general than the project. Any future Lukeatron
widget needing a printable multi-page document should be able to sit on it.

## 2. Scope

**In scope**
- A page model: N pages of A4, each an SVG canvas at true size, in **either
  orientation** — portrait (210 × 297 mm) or landscape (297 × 210 mm).
- A render loop: data object → SVG, re-run on every change.
- An HTML control layer bound to the same data object.
- Print rules producing correct A4 output with one document page per sheet, in
  the document's declared orientation.
- The fixed tier constants (names + colours), exported for every consumer.
- A save/view split: the same document viewable as HTML or printed to PDF.
- A generic image-drawing primitive with a missing-source placeholder.

**Out of scope**
- Any knowledge of curricula, lessons or students — the shell is content-blind.
- Persistence (that is [`local-store`](local-store.build.spec.md)).
- Tree layout, CSV writing, lesson generation.
- Direct manipulation of the SVG canvas (AD-3).
- Responsive/mobile layout — this is a print-first document tool.
- Paper sizes other than A4.
- Cross-part navigation and citations — that is `traceability-links` (wave 5).
  The shell renders whatever text it is handed; it does not resolve links.
- Reading or writing image files, and the image manifest — that is
  `image-paste` (wave 2). The shell draws a blob it is handed; it never touches
  the unit folder.

## 3. Requirements

- **FR-DS-1** — Renders a document of N A4 pages from a plain data object,
  where each page is an inline `<svg>` sized to true A4. *(FR-SYS-2)*
- **FR-DS-1a** — A document declares its **orientation** — `portrait` or
  `landscape` — and every page in it renders and prints at that orientation's
  true dimensions. Orientation is a property of the document, set by whichever
  part owns it, never a global setting. *(FR-SYS-4a, AD-11)*
- **FR-DS-2** — Exposes an HTML control layer whose edits update the data
  object and re-render the SVG. No editing happens inside the SVG. *(FR-SYS-3, AD-3)*
- **FR-DS-3** — Prints to A4 with exactly one document page per sheet, correct
  margins, no clipping, no scale drift, and colours preserved — **in both
  orientations**. *(FR-SYS-4, FR-SYS-4a, AD-4)*
- **FR-DS-4** — Runs fully offline: one HTML file, no network request, no CDN,
  no external font. *(FR-SYS-1)*
- **FR-DS-5** — Provides an edit view/print view split: an edit view for entry,
  and a print view that yields the PDF. *(FR-SYS-3)*
- **FR-DS-6** — Exports the three tier constants — `pass`/`intermediate`/
  `advanced` mapped to Green/Blue/Orange — as the single definition in the
  codebase. *(FR-SYS-6, INV-DM-1, AD-7)*
- **FR-DS-7** — Emits clean, hand-readable SVG source: named groups, no
  generated-looking id soup, so a page can be opened and edited in a text
  editor or vector tool.
- **FR-DS-8** — Is content-blind: no consumer-specific field name appears in
  the shell. This includes curriculum vocabulary — no jurisdiction, code
  format or curriculum name appears anywhere in it. *(INV-DM-10, AD-10)*
- **FR-DS-9** — Provides a generic **image primitive**: draw an image into the
  SVG at a given position and size, from a blob or object URL handed to it, and
  render a **visible placeholder** when the source is missing. The shell knows
  nothing about the manifest, the unit folder, or where the blob came from —
  that is `image-paste`'s business. *(FR-IMG-4, FR-IMG-6)*
- **FR-DS-10** — Uses **vanilla JS only** — no framework, no bundler, no
  package manager, no third-party library of any kind. *(FR-SYS-8, AD-13)*
- **FR-DS-11** — Forces print colour-adjust (`print-color-adjust: exact` /
  `-webkit-print-color-adjust: exact`) on every printed page, so the tier
  colours (`FR-DS-6`) print as authored rather than being lightened or
  dropped by the browser's default ink-saving behaviour — the colours are
  semantic (which tier), not decoration. *(OQ-DS-2)*

**Acceptance criteria**

- **AC-DS-1** — A 4-page **portrait** demo document prints to a 4-page A4 PDF
  whose page boxes measure 210 × 297 mm.
- **AC-DS-1a** — A **landscape** demo document prints to A4 page boxes
  measuring 297 × 210 mm, with the same margin behaviour.
- **AC-DS-2** — Typing in a control updates the rendered SVG without a reload.
- **AC-DS-3** — With the network disabled and the browser cache cleared, the
  file opens and renders identically.
- **AC-DS-4** — The three tier colours in the print view match the edit view
  swatches, in both orientations.
- **AC-DS-5** — Opening a rendered page's SVG in a text editor shows readable,
  structured markup.
- **AC-DS-6** — Grepping the shell for `lesson`, `student`, `curriculum`,
  `outcome`, `vcaa`, `victoria` returns nothing outside comments and demo
  fixtures.
- **AC-DS-7** — Whichever packaging G-2 selects, the outcome is demonstrated:
  either one document carrying both orientations prints correctly, or two
  separate single-orientation documents each do.
- **AC-DS-8** — An image drawn through the primitive renders in edit view and
  in print view; with the source removed, a visible placeholder appears
  instead of a blank.
- **AC-DS-9** — The shell has **zero** third-party dependencies: no import from
  any URL, no vendored library file, no package manifest.

## 4. Prerequisites & dependencies

- **Required first:** spike Q-2 (A4 print measured) **and Q-2b (mixed
  orientation)** — this build's whole premise is that AD-3 + AD-4 work, and
  its packaging depends on whether one print job can carry both orientations.
  Unit-folder schema settled.
- **Choose-one:** G-2 (one artefact vs separate documents on a shared shell) — decides
  whether the shell is a library or a wrapper. **Q-2b likely forces it**: if
  mixed-orientation printing is unreliable, separate documents is not a
  preference but a constraint (AD-11).
- **Coordinate-with:** `local-store` (shares the schema; build in parallel but
  do not let either evolve it). Page geometry in **both** orientations is this
  build's exclusive property — no later build writes `@page` rules.
  `System/Widgets/Parser/_shell/` is a **read-only reference** — do not import
  from it, do not edit it.

**Gate:** work may start when Q-2 and Q-2b have returned measured results and
G-2 is closed.

## 5. Decisions

- **AD-DS-1** — *Decision:* fixed A4 page geometry in millimetres, not
  viewport units, with portrait and landscape as two named geometries rather
  than a rotation transform. *Rationale:* print fidelity is the point; viewport
  units drift between screen and paper, and rotating a portrait canvas leaves
  text baselines and margins subtly wrong. *Rejected:* responsive scaling; a
  90° transform on a single geometry.
- **AD-DS-4** — *Decision:* orientation is declared **per document** and is
  immutable for that document's lifetime; a part that needs both produces two
  documents. *Rationale:* it keeps every page in one print job homogeneous,
  which is the case browsers actually handle well. The marking matrix's
  user-selectable orientation (FR-MM-7) is therefore a *re-render into a new
  document*, not a live toggle inside one. *Rejected:* mixed orientations
  inside a single document (the thing Q-2b exists to test, and which AD-11
  expects to fail).
- **AD-DS-2** — *Decision:* one `<svg>` element per page, siblings in the
  document, rather than one tall SVG broken by CSS. *Rationale:* page breaks
  become structural, not a rendering accident. *Rejected:* single-canvas +
  `break-inside`.
- **AD-DS-3** — *Decision:* system font stack only, no embedded webfont.
  *Rationale:* FR-DS-4 offline, and embedded fonts bloat every artefact.
  *Rejected:* bundling a font as base64. *Trade-off:* typography is plainer.

**Open questions**

- **OQ-DS-1** — ✅ **RESOLVED (2026-08-29).** Does the shell need a
  page-thumbnail navigator? *Resolved:* no — a minimal print shell.
- **OQ-DS-2** — ✅ **RESOLVED (2026-08-29).** Should print colour-adjust be
  forced (`print-color-adjust: exact`)? *Resolved:* yes — the tier colours
  are semantic, not decoration. See FR-DS-11.

## 6. Risks

| Risk | Consequence | Mitigation | Proving test |
|---|---|---|---|
| Browser print scales SVG to fit | Every document prints slightly wrong | Fixed mm geometry (AD-DS-1); measure a printed sheet | AC-DS-1 |
| Landscape treated as rotated portrait | Margins and baselines subtly wrong on the curriculum map — the one document that most needs the width | Two named geometries, not a transform (AD-DS-1) | AC-DS-1a |
| Mixed orientation in one print job | Silent re-scaling or dropped pages; discovered only after the parts are built on it | Q-2b measured *before* this build; orientation immutable per document (AD-DS-4) | AC-DS-7 |
| Tier colours drop out in print | The colour code — the product's spine — is lost on paper | Force colour-adjust (OQ-DS-2) | AC-DS-4 |
| Shell grows content knowledge under deadline pressure | The four parts diverge again; the build was pointless | FR-DS-8 + a grep check in verification | AC-DS-6 |
| A dependency creeps in ("just a tiny library") | Breaks AD-13; the tool stops being a file Luke can open in three years | FR-DS-10; zero-dependency check in verification | AC-DS-9 |

## 7. Plan

See [`document-shell.plan.md`](document-shell.plan.md).

## 8. Verification — definition of done

- [ ] All acceptance criteria AC-DS-1…9 demonstrated
- [ ] A physical or PDF-measured A4 print test recorded with numbers, **in both
      orientations**
- [ ] Offline test passed with network disabled and cache cleared
- [ ] Tier constants defined in exactly one place
- [ ] No curriculum vocabulary anywhere in the shell (INV-DM-10)
- [ ] Zero third-party dependencies (AD-13)
- [ ] Reviewed against `System/Widgets/Parser/_shell/` conventions (read-only)

**On completion:** set Status to Done, `git mv` this spec and its plan to
[`_Done/`](_Done/), update [`_PLAN.md`](_PLAN.md), and re-check
[the project prerequisites gate](../_Spikes/CurriculumPreparation/CurriculumPreparation.prerequisites.spec.md).
