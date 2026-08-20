# resources-page — Build Spec

| Field | Value |
|---|---|
| **Type** | Build |
| **Date** | 2026-08-19 |
| **Status** | Draft — awaiting Luke's review |
| **Wave** | 4 |
| **One-liner** | A flat, unstructured dot-point list of links, images and text notes — the unit's one scratch surface, printed A4 portrait, flowing to as many pages as it needs. |

---

## 1. Motivation

Every other part of Curriculum Preparation binds its content to something —
big ideas, curriculum nodes, assessments, tiers. That structure is the
product, but it has a cost: a stray link or a half-formed thought has nowhere
to go without first being made to fit a schema it hasn't earned yet. Luke's
own framing: "a resources page, which is a simple dot point list of links
images or text. That I can add things to." This build is the sixth part of
the widget and the deliberate exception — the one place material can land
before (or instead of) being structured elsewhere.

## 2. Scope

**In scope**
- Exactly **one** resources page per unit (singular, like the crib sheet).
- A flat, ordered list of items. Each item is exactly one of three kinds:
  **link** (URL + label), **image**, or **text** block.
- An optional per-item note/caption, on any kind.
- Add, edit, delete, and reorder items.
- Fast, low-friction add — one control, minimal fields, no required binding.
- Printing: A4 portrait, flowing across as many pages as the list needs; long
  URLs wrap rather than overflow the page edge.
- Rendering on the `document-shell` chassis; persistence through the
  `local-store` client only.
- Escaping every piece of user-entered text and validating every URL's scheme
  before it is rendered as a link.

**Out of scope**
- Any tiering, curriculum binding, big-idea binding, or coverage link on an
  item. *(AD-RESB-1)*
- Fetching, previewing, or resolving a link in any way — a link is a recorded
  destination, never a live request. *(AD-RESB-2)*
- A second image path — images reuse `image-paste`'s bundle-folder model
  exactly; this build adds no new way to get an image into the bundle.
- Reordering across units, multiple resources pages, folders, or tags within
  the list — it is one flat list, not a filing system.
- Full-text search over the list (a future part may add it; not this one).
- Any page-count cap — unlike the crib sheet, this page has no hard limit.

## 3. Requirements

> **Requirement families.** `FR-RES-n` is the **PRD-level** family for the
> Resources part ([PRD](../_Spikes/CurriculumPreparation/CurriculumPreparation-prd.spec.md),
> FR-RES-1…8 — *what the part is*). `FR-RESB-n` below is the **build-level**
> family — *what this build implements* — and is a superset, adding the
> obligations the PRD leaves to implementation: the URL scheme allowlist, the
> no-outbound-request guarantee, escaping, wrapping, and the vanilla-JS
> constraint. The same PRD/build split governs the Unit Assessment
> (`FR-UA` / `FR-UAB`) and the marking matrix (`FR-MM` / `FR-MMB`).


- **FR-RESB-1** — A unit has **exactly one** resources page, created empty by
  `bundle-template` and always present — never created, deleted, or
  duplicated by this build. *(mirrors the crib sheet's singularity, AD-17)*
- **FR-RESB-2** — Holds a flat, **ordered** list of items. Each item has a
  `kind` of exactly `link`, `image`, or `text`, and nothing else. No item
  carries a tier, a big-idea id, a curriculum node id, or a coverage link.
  *(AD-RESB-1)*
- **FR-RESB-3** — A `link` item stores a URL and a label; the label defaults to
  the URL itself if left blank.
- **FR-RESB-4** — An `image` item stores an `ImageRef` into the bundle's
  `images/` folder, drawn through `document-shell`'s image primitive and
  written by `image-paste`'s existing paste flow. *(FR-DS-9, FR-IMG-4)*
- **FR-RESB-5** — A `text` item stores a plain-text block — a note, a
  reminder, a scrap — with no formatting markup.
- **FR-RESB-6** — Every item may carry an optional short **note/caption**,
  regardless of kind.
- **FR-RESB-7** — Adding an item is a single low-friction action: choose a
  kind, fill the one or two fields that kind needs, done. No required field
  outside those (URL for a link, an image for an image, text for a text
  block) — never a form asking for a tier, a binding, or a category.
- **FR-RESB-8** — Items can be edited in place, deleted, and reordered
  (up/down or drag), with the list re-rendering and re-saving through
  `local-store` on every change.
- **FR-RESB-9** — Renders on `document-shell`'s A4 **portrait** page model,
  flowing content across as many pages as the list requires — no hard page
  cap, unlike the crib sheet's two-page ceiling. *(FR-DS-1, FR-DS-3)*
- **FR-RESB-10** — A long URL **wraps** inside its print view and edit view
  container rather than overflowing the page edge or forcing horizontal
  scroll/clip.
- **FR-RESB-11** — Persists solely through the `local-store` JS client over
  the bundle's Python server. The browser never reads or writes the
  filesystem directly. *(AD-13, FR-LS-1, FR-LS-2)*
- **FR-RESB-12** — Makes **zero outbound network requests** of any kind — no
  fetch, no `<link rel="preload">`, no favicon lookup, no oEmbed/thumbnail
  call, no `<img>` pointed at a remote origin. A link is data, never a
  destination the page visits on the author's behalf. *(FR-SYS-1)*
- **FR-RESB-13** — Every rendered link's URL is checked against an **allowed
  scheme list** — `http:` and `https:` only — before it becomes a clickable
  `href`. Any other scheme (`javascript:`, `data:`, `file:`, `vbscript:`, a
  bare scheme-less string that resolves to one of these, or an unrecognised
  scheme) is stored as inert text: shown, never wired as a clickable
  destination.
- **FR-RESB-14** — No user-entered string — link label, URL, item note, or
  text-block body — is ever inserted via `innerHTML`. Every interpolated
  value is escaped before insertion. *(JS-6, HTML-6)*
- **FR-RESB-15** — Uses **vanilla JS only** — no framework, no bundler, no
  package manager, no third-party library of any kind. *(FR-SYS-8, AD-13a)*

**Acceptance criteria**

- **AC-RESB-1** — A unit opens with its resources page already present and
  empty; there is no control to create a second one.
- **AC-RESB-2** — Adding a link, an image, and a text item each takes one
  visible action plus filling only that kind's own field(s) — no other field
  is required.
- **AC-RESB-3** — Reordering an item (move up/down or drag) persists across a
  reload.
- **AC-RESB-4** — Editing an item's text or a link's label/URL in place updates
  the rendered list and the saved file without leaving the page.
- **AC-RESB-5** — Deleting an item removes it from the rendered list and the
  saved file; the remaining items keep their relative order.
- **AC-RESB-6** — A 40-item fixture list prints to multiple A4 portrait pages,
  each page box 210 × 297 mm, with no item split unreadably across a page
  break's visible content.
- **AC-RESB-7** — A fixture link with a 200-character URL renders wrapped, with
  no horizontal overflow, in edit view and in print view.
- **AC-RESB-8** *(gate test — TEST-7)* — With the network disabled and every
  request logged, adding, editing, viewing, and printing the resources page
  produces **zero outbound requests**; only the same-origin `local-store`
  calls to the bundle server are observed. *(FR-RESB-12)*
- **AC-RESB-9** *(gate test — TEST-7)* — A fixture list containing a
  `javascript:alert(1)` link and a `data:text/html,...` link renders both as
  plain inert text, not as a clickable anchor; a fixture `https://` link in
  the same list renders as a working clickable anchor. Both the blocked path
  and the permitted path are demonstrated. *(FR-RESB-13)*
- **AC-RESB-10** — A fixture item whose text contains `<img src=x onerror=...>`
  renders as literal visible text, not as markup, in edit view and in the DOM
  (no `innerHTML` insertion of user content). *(FR-RESB-14)*
- **AC-RESB-11** — Grepping the build for `lesson`, `student`, `curriculum`,
  `outcome`, `vcaa`, `victoria`, `bigIdea`, `nodeId` returns nothing outside
  comments and fixtures — confirming FR-RESB-2's no-binding rule holds in the
  code, not just the schema.

## 4. Prerequisites & dependencies

- **Required first:** [`document-shell`](document-shell.build.spec.md) — the
  A4 portrait page model and image primitive this build renders into;
  [`local-store`](local-store.build.spec.md) — the only persistence path;
  `image-paste` — this build's image items are `ImageRef`s written by that
  build's existing paste flow, never a second image path. Unit-folder schema
  frozen.
- **Choose-one:** none.
- **Coordinate-with:** `traceability-links` (wave 5) — resources-page items
  are deliberately **outside** the traceability graph (AD-RESB-1); confirm at
  that build's start that it does not silently reach in and start indexing
  resource items, which would reintroduce the binding this build exists to
  avoid.

**Gate:** work may start when `document-shell`, `local-store`, and
`image-paste` are each specced and their interfaces (page model, store
client, `ImageRef` shape) are settled.

## 5. Decisions

- **AD-RESB-1** — *Decision:* the resources page carries **no structure** —
  no tier, no curriculum binding, no big-idea binding, no coverage link, on
  any item. *Rationale:* every other part of this widget is deliberately
  highly structured (tiers, mandatory big-idea bindings, coverage grids); that
  structure earns its keep by making the *graded, bindable* content
  trustworthy, but it also means there is nowhere in the widget a stray link
  or half-formed note can land without first being forced to fit a schema it
  hasn't earned. This page is that release valve, by design, not by omission.
  *Rejected:* binding resources to lessons or big ideas like everything else
  — the "just add one field" version of this build, which was rejected
  because it would turn "paste a link" back into a small form-filling chore,
  defeating the one property Luke actually asked for ("that I can add things
  to").
- **AD-RESB-2** — *Decision:* a link is a **recorded destination**, never a
  live fetch. Nothing in this build resolves, previews, or thumbnails a URL.
  *Rationale:* the bundle is offline-first and self-contained (FR-SYS-1); a
  favicon or preview fetch would be the one silent network call in an
  otherwise fully offline tool, and it would fail confusingly the moment the
  unit folder is opened without internet, which is the normal case for a
  bundle Luke reopens a term later. *Rejected:* fetching a page title or
  favicon on add for a nicer-looking list entry.
- **AD-RESB-3** — *Decision:* items are stored as a single flat array in
  document order; reordering rewrites array order, not a separate `sortIndex`
  field. *Rationale:* simplest possible model for a list with no grouping,
  filtering, or cross-referencing; matches AD-RESB-1's spirit of minimal
  structure. *Rejected:* a `sortIndex` field (solves a stable-sort problem
  this list, with no filtering, does not have).
- **AD-RESB-4** — *Decision:* printing flows to as many A4 portrait pages as
  the list needs, with no hard page cap. *Rationale:* unlike the crib sheet
  (a curated, big-idea-derived summary capped at 1–2pp by design, AD-17), this
  page's whole purpose is to accept anything Luke drops into it — capping it
  would just move the friction from "add" to "the eleventh item doesn't fit."
  *Rejected:* mirroring the crib sheet's hard two-page cap.
- **AD-RESB-5** — *Decision:* the allowed link scheme list is `http:` and
  `https:` only, checked with the URL parser's own `.protocol`, never a regex
  against the raw string. *Rationale:* a regex allowlist is exactly the class
  of check `javascript:` and encoded variants are built to slip past; the
  platform's own URL parser resolves the scheme the same way the browser
  will. *Rejected:* a denylist of known-bad schemes (unbounded — the next
  dangerous scheme is simply missing from it).

**Open questions**

- **OQ-RESB-1** — Should items support a lightweight `tag` or `category`
  string purely for the author's own scanning, without it becoming a binding?
  *Default:* no in v1 — even an optional tag field nudges toward structure;
  revisit only if Luke finds the flat list hard to scan once it's long.
- **OQ-RESB-2** — Can a text item hold more than a short paragraph (a longer
  scratch note)? *Default:* yes, unbounded length, but no rich formatting —
  it is one `<textarea>`-shaped field, not a mini editor.
- **OQ-RESB-3** — Should a link's label auto-populate from the page title on
  add? *Default:* no — that would require a fetch, which AD-RESB-2 forbids;
  the label defaults to the raw URL and Luke edits it by hand if he wants
  something nicer.
- **OQ-RESB-4** — Does deleting an item need an undo, given there is no
  confirmation dialog in the fast-add spirit? *Default:* no dialog on add,
  but delete asks a lightweight one-click confirm (distinct action from add)
  since deletion is destructive and add is not.

## 6. Risks

| Risk | Consequence | Mitigation | Proving test |
|---|---|---|---|
| Structure creeps in under later pressure ("just one field for the tier") | The one unstructured surface in the widget disappears; stray material has nowhere to go again | AD-RESB-1 recorded with rationale; grep check in verification | AC-RESB-11 |
| A pasted `javascript:`/`data:` URL becomes a clickable link | Stored XSS via the resources list — a link click executes arbitrary script | Scheme allowlist checked via `.protocol`, not regex (AD-RESB-5, FR-RESB-13) | AC-RESB-9 |
| User text or a link label reaches the DOM via `innerHTML` | Stored XSS via any item field | FR-RESB-14 — never `innerHTML` with item content; escape on insert | AC-RESB-10 |
| A favicon/preview fetch creeps in "just for polish" | The one silent network call in an offline-first tool; breaks with no internet | AD-RESB-2; network-request gate test | AC-RESB-8 |
| Long URL overflows the print view page | Illegible or clipped print view resource list | CSS word-break/wrap rule, tested against a 200-char fixture URL | AC-RESB-7 |
| Reorder or delete loses items on save race | Silent data loss in the one place with no schema to catch it | Route every mutation through `local-store`'s existing debounced save/validate path (FR-RESB-11) | AC-RESB-3, AC-RESB-5 |

## 7. Plan

See [`resources-page.plan.md`](resources-page.plan.md).

## 8. Verification — definition of done

- [ ] All acceptance criteria AC-RESB-1…11 demonstrated
- [ ] Network-request gate test passed: zero outbound requests during add,
      edit, view, and print *(AC-RESB-8)*
- [ ] URL-scheme gate test passed: blocked schemes stay inert, `https://`
      stays clickable *(AC-RESB-9)*
- [ ] No `innerHTML` with user-entered content anywhere in the build (JS-6)
- [ ] Multi-page print test recorded with numbers (page count, page box mm)
      for a list long enough to span multiple pages
- [ ] No curriculum/lesson/tiering vocabulary or binding field anywhere in
      the build (grep check)
- [ ] Zero third-party dependencies; vanilla ES modules only (JS-7)
- [ ] Persists only through `local-store`; no direct filesystem access from
      the browser

**On completion:** set Status to Done, `git mv` this spec and its plan to
[`_Done/`](_Done/), update [`_PLAN.md`](_PLAN.md), and re-check
[the project prerequisites gate](../_Spikes/CurriculumPreparation/CurriculumPreparation.prerequisites.spec.md).
