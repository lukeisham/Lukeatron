# crib-sheet — Build Spec

| Field | Value |
|---|---|
| **Type** | Build |
| **Date** | 2026-08-22 (full pass; supersedes the 2026-08-20 partial spec) |
| **Status** | Draft — awaiting Luke's review |
| **Wave** | 4 |
| **One-liner** | A 1-or-2 page A4 distillation of the unit's big ideas, generated from the big-idea list and freely edited, laid out in a required two-half structure — an upper half and a lower half, each an ordered, individually-resizable run of sections (FR-CS-1, FR-CS-8, FR-CS-9). |

---

## 1. Motivation

Every other part of the widget either already has a full build spec
(`lesson-plan-document`, `unit-assessment-document`, `marking-matrix`,
`resources-page`) or is explicitly a research gap yet to close. The crib
sheet sat in between: a provisional file captured one UX requirement — the
empty-state placeholder text Luke asked to record ahead of the full pass —
but carried none of the Motivation/Scope/Decisions/Risks/Plan sections its
siblings have. This build closes that gap.

The crib sheet is the widget's forced-distillation artefact: Luke's own
framing across the mockup revisions and the arch spec's AD-17 is that an
unbounded crib sheet "is just the unit notes" — the page cap is the feature,
not a limitation to work around. That intent has been amended twice in the
arch spec (Change AC tightened it to exactly 1 page, Change AF reversed the
tightening) and is now **settled** at 1-or-2 pages, enforced, with no drawn
fold between the two halves (AD-48). This build spec is written against that
settled state, not the intermediate one.

## 2. Scope

**In scope**
- Exactly **one** crib sheet per unit (singular, like the resources page and
  Unit Assessment — INV-DM-18).
- Generating a template from the unit's big-idea list (FR-CS-2, FR-CS-3),
  then freely editing it — the same generate-then-modify pattern as the
  lesson plan (AD-9, AD-17) — with edits surviving a re-generate (AC-CS-3).
  Unlike the lesson plan, this build owns generation itself; there is no
  separate `crib-sheet-generator` build in `_PLAN.md`'s dependency graph
  (see AD-CSB-1).
- The required two-half structure: every section belongs to exactly one of
  `upper` / `lower`, hand-assigned, with the curriculum profile supplying
  each half's printed label (FR-CS-8, FR-CS-9, AD-29).
- The whole-sheet 1-or-2-page cap, with content past a third page flagged,
  never truncated or silently spilled (FR-CS-5, FR-CS-10, AD-17, AD-30,
  AD-48). No drawn fold between the halves — ordering only (AD-30, AD-46,
  unaffected by AD-48's reversal).
- Per-section resizing (`small` / `medium` / `large`, default `medium`) that
  never auto-shrinks content to fit the cap — a resize past the cap is
  flagged (FR-CS-11, AD-43).
- Bounded Markdown formatting in section text — `**bold**`, `*italic*`,
  `- bullets` — with unsupported syntax rendered as literal text (FR-CS-6a,
  AD-43).
- Pasted images inside a section, via `image-paste`'s existing `ImageRef`
  model and `document-shell`'s image primitive (FR-CS-6, FR-IMG family).
- Rendering the domain glyph(s) FR-BI-15 already computes for each section's
  bound big idea (skill pencil / knowledge notebook / both) — a read of an
  existing cross-cutting computation, not a new one (FR-CUR-13, FR-BI-15,
  AC-CUR-13).
- Print-view citations to the curriculum nodes and lessons behind each
  section's big idea, as human-readable text, never a raw id (FR-CS-7,
  FR-TR-6).
- Rendering as SVG, viewing as HTML, printing to A4 PDF in either orientation
  (FR-CS-4, `orientation` field).
- Greyed-out, per-half empty-state placeholder (suggestion) text for an
  empty section slot — the requirement captured in the superseded partial
  spec, folded into this document's numbering (originally FR-CSB-P1…P3).
- Persistence through `local-store` only; vanilla JS only, no dependency.

**Out of scope**
- Creating, editing, reordering or deleting big ideas themselves — that is
  `bigidea-list`'s job. This build only reads the list to generate from and
  to bind a `sections[].bigIdeaId`.
- Writing image files or the image manifest — `image-paste` owns `images/`;
  this build only places an existing `ImageRef` (mirrors
  `lesson-plan-document`'s and `resources-page`'s own out-of-scope note).
- Computing a big idea's domain glyph set — `FR-BI-15` owns that derivation;
  this build only renders what it returns.
- The general cross-part traceability UI, reverse-link index, and the
  clickable-in-edit/plain-in-print curriculum-code component — that is
  `traceability-links` (wave 5, AD-32). This build's citations render as
  plain text; only the edit-view clickable-code behaviour depends on that
  future build.
- Filesystem access from the browser — every read/write goes through
  `local-store` to the bundle's Python server (AD-13).
- A markdown library, rich-text editor, or any formatting beyond the three
  bounded patterns (AD-43 already rejects this).

## 3. Requirements

> **Requirement families.** `FR-CS-n` is the **PRD-level** family for the
> Crib Sheet part
> ([PRD](../_Spikes/CurriculumPreparation/CurriculumPreparation-prd.spec.md),
> FR-CS-1…12, FR-CS-12 itself marked superseded in place by Change AF). `FR-CSB-n`
> below is the **build-level** family — the same PRD/build split
> `lesson-plan-document.build.spec.md` (`FR-LP`/`FR-LPB`),
> `unit-assessment-document.build.spec.md` (`FR-UA`/`FR-UAB`) and
> `resources-page.build.spec.md` (`FR-RES`/`FR-RESB`) each use. `FR-CSB-12…14`
> renumber the provisional spec's `FR-CSB-P1…P3` — no requirement is
> duplicated, only relabelled into this document's sequence.

- **FR-CSB-1** — A unit has **exactly one** crib sheet, created empty by
  `bundle-template` and always present. It prints to **1 or 2 A4 pages**;
  content that would spill onto a third page is **flagged**, never silently
  truncated or overflowed (FR-CS-1, FR-CS-5, AD-17, AD-48, INV-DM-16).
- **FR-CSB-2** — Generating populates one section per big idea and sub-big
  idea in the unit's big-idea list (FR-CS-2, FR-CS-3), each seeded with that
  idea's `bigIdeaId`, empty `text`, no images, and `size: "medium"`. A
  re-generate never overwrites a section's edited `text`, `size`, `half` or
  `imageRefs[]` — same no-clobber discipline the lesson plan's `provenance`
  field already applies (AD-CSB-2 covers the seeded `half` value).
- **FR-CSB-3** — Renders as **SVG**, views as **HTML**, and prints to A4 PDF
  in **either orientation**, remembered per sheet (`orientation` field —
  FR-CS-4, FR-SYS-2, FR-SYS-3).
- **FR-CSB-4** — Enforces the **required two-half structure**: every
  section carries a `half` of exactly `"upper"` or `"lower"` — never
  unassigned, never both. The curriculum profile supplies the printed label
  for each half via `curriculum.labels.cribSheetHalves`; a profile that
  supplies none falls back to a generic label (FR-CS-8, AD-29, INV-DM-31).
- **FR-CSB-5** — `half` is assigned **by hand**, on generation (FR-CSB-2/
  AD-CSB-2) and on later edit — **never inferred** from the section's big
  idea's own curriculum coverage, even when that coverage spans only one
  domain (FR-CS-9, AD-29).
- **FR-CSB-6** — Renders the upper half's sections above the lower half's,
  each half headed by its resolved label, with **no drawn divider** between
  them — an ordered boundary only, no `page-break-after`, no dashed line
  (FR-CS-10, AC-CS-5, AC-CS-10, AD-30, AD-46 — unaffected by AD-48). The
  1-or-2-page cap governs the **whole sheet**, never a per-half budget —
  regardless of which half's sections are pushing the sheet toward the cap
  (FR-CS-10, AD-30).
- **FR-CSB-7** — Each section is individually resizable via a `size` field:
  `"small"` (~75% height), `"medium"` (default, unset is valid), `"large"`
  (~150% height) — exactly three values (FR-CS-11, INV-DM-41, AD-43).
  Resizing never auto-shrinks or truncates content to fit the cap; a
  resized section that would push the sheet past 2 pages is **flagged**,
  the same "never silently cut" rule the sheet-level cap already applies
  (FR-CSB-1, AD-43).
- **FR-CSB-8** — Section `text` supports bounded Markdown-style formatting —
  `**bold**`, `*italic*`, `- bullet` items — rendered correctly in edit view
  and print view; unsupported syntax (headers, code blocks, links) renders
  as literal text (FR-CS-6a, AC-CS-8, AC-CS-9, AD-43).
- **FR-CSB-9** — A section may carry pasted images via `image-paste`'s
  `ImageRef` model, drawn through `document-shell`'s image primitive,
  including its missing-source placeholder. Never embeds image data as
  base64 (FR-CS-6, FR-IMG-2…6, FR-DS-9).
- **FR-CSB-10** — Renders the domain glyph(s) already computed for the
  section's bound big idea (FR-BI-15's own union-of-domains rule) — pencil
  for a skill-only idea, notebook for knowledge-only, both for an idea
  spanning both domains, nothing for an idea with no domain-carrying
  coverage. This build computes no glyph logic of its own (AC-CUR-13,
  AD-CSB-5).
- **FR-CSB-11** — Renders, in print view, a human-readable citation for each
  section — the curriculum node code(s)/title(s) and lesson number(s) behind
  its big idea — never a raw id (FR-CS-7, FR-TR-6).
- **FR-CSB-12** — Each half of the crib sheet shows **greyed-out placeholder
  (suggestion) text** when a section slot in that half has no author-entered
  content yet. The text is a **hint of the kinds of content a section could
  hold** — never a value that gets saved, printed, or mistaken for real
  content. It renders in the style guide's muted-text token (`--ink3`,
  `#9a9891` — matching the existing citation-line colour) and disappears the
  moment the author types anything into that slot. *(Renumbered from the
  superseded partial spec's FR-CSB-P1.)*
- **FR-CSB-13** — The **upper half** shows these suggestions: Big ideas ·
  Diagnostic questions · Worked examples or illustrations · Checklist/s,
  shown together as one combined hint block per empty slot. *(Renumbered
  from FR-CSB-P2; OQ-CSB-P1's default — combined block, not cycling —
  carries forward as this build's default, see Open questions.)*
- **FR-CSB-14** — The **lower half** shows these suggestions: Essential
  facts · Key vocab · Worked examples or illustrations · Outline/s, under
  the same combined-block rule. *(Renumbered from FR-CSB-P3.)*
- **FR-CSB-15** — Placeholder text is never written to `unit.json` and never
  appears in the printed A4 output — only genuinely authored sections print
  (FR-CS-5, FR-CS-12's no-silent-content philosophy — renumbered from
  FR-CSB-P1's acceptance rule, promoted to its own requirement).
- **FR-CSB-16** — Persists solely through the `local-store` JS client over
  the bundle's Python server. The browser never reads or writes the
  filesystem directly (AD-13).
- **FR-CSB-17** — Uses **vanilla JS only** — no framework, no bundler, no
  package manager, no third-party library, including for the Markdown
  parser (FR-SYS-8, AD-13a).
- **FR-CSB-18** — Every piece of user-entered section text is **HTML-escaped
  before** the bounded Markdown transform is applied — the transform emits
  only the three whitelisted patterns' own markup (`<strong>`, `<em>`,
  `<ul>`/`<li>`), never raw user text passed through unescaped (AD-CSB-4,
  JS-6, HTML-6).

**Acceptance criteria**

- **AC-CSB-1** — A crib sheet generated from a fixture unit's big-idea list
  seeds exactly one section per big idea and sub-big idea, and prints to
  **1 or 2 A4 pages** (AC-CS-1).
- **AC-CSB-2** — A fixture with enough section content to exceed 2 pages
  is **flagged**, not silently truncated or spilled to a third page
  (AC-CS-2).
- **AC-CSB-3** — Editing a section's text, size, half or images after
  generation, then re-generating, leaves those edits intact (AC-CS-3).
- **AC-CSB-4** — A fixture sheet prints correctly in both portrait and
  landscape orientation (AC-CS-4).
- **AC-CSB-5** — A fixture with sections in both halves renders the upper
  half's sections above the lower half's, in edit view and print view, each
  headed by its resolved label, with **no drawn divider** between them
  (AC-CS-5).
- **AC-CSB-6** — A fixture whose combined sections would push the sheet past
  2 pages is flagged regardless of which half the overflowing sections
  belong to; neither half borrows page space from the other (AC-CS-6).
- **AC-CSB-7** — Resizing a section to `"large"` such that the sheet would
  exceed 2 pages surfaces the overflow flag, not an auto-shrink or silent
  truncation (AC-CS-7).
- **AC-CSB-8** — A section with `**bold**`, `*italic*` and `- bullet` text
  renders the formatting correctly in edit view and print view, and the
  formatting persists across a re-generate (AC-CS-8).
- **AC-CSB-9** — A section containing unsupported Markdown (a header, a code
  fence, a `[link](url)`) renders that syntax as literal visible text, not
  parsed and not specially escaped beyond FR-CSB-18's baseline escaping
  (AC-CS-9).
- **AC-CSB-10** — A rendered crib sheet's page-count string accurately
  reflects its actual count — "page 1 of 1" or "page 1 of 2" as content
  requires; no dashed line, `page-break-after`, or other visual page-break
  indicator ever appears between the two halves (AC-CS-10).
- **AC-CSB-11** — An empty upper-half section slot shows FR-CSB-13's four
  suggestions in greyed-out `--ink3` text; typing any content replaces the
  placeholder and the placeholder text is never written to `unit.json`.
- **AC-CSB-12** — An empty lower-half section slot shows FR-CSB-14's four
  suggestions in greyed-out text, under the same rule.
- **AC-CSB-13** — The placeholder text never appears in the printed A4
  output — only genuinely authored sections print.
- **AC-CSB-14** — A fixture section whose text contains
  `<img src=x onerror=alert(1)>` renders as literal visible text, in both
  edit view and the DOM — never parsed as markup and never inserted via
  unescaped `innerHTML` (FR-CSB-18).
- **AC-CSB-15** — A fixture big idea covering only skill-domain nodes shows
  the pencil glyph on its section; one covering only knowledge-domain nodes
  shows the notebook glyph; one covering both shows both — matching
  AC-CUR-13's existing cross-cutting fixture.
- **AC-CSB-16** — Removing an `ImageRef`'s backing file shows
  `document-shell`'s placeholder, not a blank; `unit.json` contains no
  base64 image data (mirrors AC-LPB-9, AC-IMG-4).

## 4. Prerequisites & dependencies

- **Required first:** `bigidea-list` — the list this build generates
  sections from and reads each big idea's title/domain-glyph-set from
  (FR-CS-2, FR-BI-15) — **not yet specced**, per `_PLAN.md`'s tracking table
  (contra this file's earlier partial-spec draft, which incorrectly stated
  it was); `image-paste` — the `ImageRef` model and `images/` manifest this
  build places but never writes (FR-CS-6) — **also not yet specced**;
  [`document-shell`](document-shell.build.spec.md) — the A4 page model,
  both-orientation print chassis, and image primitive this renders on;
  [`local-store`](local-store.build.spec.md) — the only persistence path;
  [`style-guide`](style-guide.build.spec.md) — CSS tokens, including
  `--ink3` (muted text, FR-CSB-12) and the Category-accent Teal/Rose pair
  (AD-13c, Change AG) this build's two halves use in place of the tier
  palette.
- **Choose-one:** G-8 (crib sheet default shape) — **already closed**: 1
  page, portrait default (`_PLAN.md`). No open decision-gate blocks this
  build.
- **Coordinate-with:** none identified beyond the required-first list above.
  `_PLAN.md`'s named hard-edge list gives this build's only two hard
  dependencies as `bigidea-list` and `image-paste`; there is no dependency
  on `unit-assessment-document` or `marking-matrix` for this build's own
  requirements (the three sit in the same wave 4 because each is
  independently ready once wave 1–3 lands, not because they depend on each
  other — `_PLAN.md`'s "parallelizable within a wave" rule).
  `traceability-links` (wave 5) — this build's citations (FR-CSB-11) render
  as plain text in print view, the same direction
  `lesson-plan-document.build.spec.md` §4 and
  `marking-matrix.build.spec.md` §4 already draw; only the edit-view
  clickable-code behaviour depends on that future build.

**Gate:** work may start once `bigidea-list`, `image-paste`,
`document-shell`, `local-store` and `style-guide` are each specced and their
interfaces (big-idea list shape, `ImageRef` shape, page model, store client,
token names) are settled. None of the five has landed as of this writing;
`bigidea-list` and `image-paste` do not yet have build specs at all.

## 5. Decisions

- **AD-CSB-1** — *Decision:* this build owns crib-sheet **generation**
  itself (FR-CSB-2) rather than splitting it into a sibling
  `crib-sheet-generator` build, unlike the lesson plan's
  generator/renderer split (`lesson-plan-document` /
  `lesson-plan-generator`). *Rationale:* `_PLAN.md`'s dependency graph
  names no `crib-sheet-generator` node, and the generation step itself is a
  simple 1:1 seed — one section per big idea/sub-big idea, no tiering
  logic, no curriculum-node selection UI — unlike the lesson plan's
  generator, which is gated on G-5 precisely because it is substantial
  enough to be its own question ("do the generators earn their keep?").
  *Rejected:* mirroring the lesson-plan split — would invent a second
  build the project's own dependency graph never asked for, for a
  generation step too small to earn the split.
- **AD-CSB-2** — *Decision:* a section seeded by generation defaults to
  `half: "upper"`. *Rationale:* INV-DM-31 requires `half` to hold one of
  its two values at all times — an unset value is not a valid document
  state — so generation must pick something, and AD-29 already forecloses
  deriving it from the big idea's coverage. `"upper"` is the arbitrary but
  harmless choice: it is the first half in document order, matches the
  mockup's convention of listing skills/upper before knowledge/lower, and
  Luke reassigns it by hand regardless (FR-CSB-5) — the choice only has to
  be *valid*, not *right*. *Rejected:* leaving `half` unset until first
  edit (violates INV-DM-31 the moment a generated-but-unedited sheet is
  saved); deriving a default from the big idea's own domain glyph
  (skill → upper, knowledge → lower) — attractive, but AD-29 already
  rejected exactly this class of inference for the *assigned* value, and a
  silent default that happens to guess right most of the time is harder to
  notice as a guess than an openly arbitrary one.
- **AD-CSB-3** — *Decision:* a resize past the sheet's page cap is flagged
  using the **same overflow-flag mechanism** as any other cap breach
  (FR-CSB-1), not a second, size-specific warning. *Rationale:* AD-43
  already states resizing "does not auto-shrink or cut content to fit the
  page cap" and is "flagged exactly as any other overflow" — a distinct
  resize-only flag would fragment one overflow concept into two UI
  treatments for what is, to the author, the same problem ("this doesn't
  fit"). *Rejected:* a separate resize-triggered dialog or toast — adds a
  second overflow vocabulary the teacher has to learn, for no behavioural
  difference.
- **AD-CSB-4** — *Decision:* section text is **HTML-escaped before** the
  bounded Markdown transform runs; the transform then emits only the three
  whitelisted patterns' own markup. *Rationale:* unlike `resources-page`
  (which never inserts user content as HTML at all, FR-RESB-14), this
  build's Markdown feature necessarily generates *some* HTML from user
  text (`<strong>`, `<em>`, `<ul>`/`<li>`) — the safe discipline is
  therefore "escape everything, then re-introduce only the whitelisted
  tags via the parser's own controlled substitutions," exactly the order
  the existing mockup's `parseMarkdown()` already implements (escape `&`,
  `<`, `>` first, then apply bold/italic/list detection on the escaped
  string). *Rejected:* a Markdown library (FR-CSB-17 forbids any
  dependency, and a general-purpose library's syntax surface is far wider
  than the three bounded patterns this build needs); parsing before
  escaping (the order the mockup's code deliberately avoids — parsing raw
  user text first would let user-supplied `<` and `>` characters ride
  along inside the parser's own generated tags).
- **AD-CSB-5** — *Decision:* this build renders the domain glyph(s)
  FR-BI-15 already computes; it implements no glyph-derivation logic of its
  own. *Rationale:* the union-of-covered-node-domains rule is a
  cross-cutting computation shared with the curriculum map, the lesson
  plan, and the marking matrix (AC-CUR-13); reimplementing it here risks
  exactly the drift `AD-LPB-1` warns against for the lesson
  plan/Unit-Assessment tier-emission logic. *Rejected:* a crib-sheet-local
  copy of the domain-union computation — even a faithful copy risks
  silently diverging from FR-BI-15's rule the next time a curriculum
  profile's domain values change (AD-49).

**Open questions**

- **OQ-CSB-1** — ✅ **RESOLVED (2026-08-29).** Does an empty section's
  four-suggestion placeholder render as one combined hint block (all four
  lines together) or cycle/appear one at a time? *Resolved:* all four are
  shown together, in list form — carried forward unchanged from the
  superseded partial spec's OQ-CSB-P1, and consistent with `FR-CSB-P2`'s
  combined-block default recorded above. A cycling placeholder would hide
  three of the four prompts at any moment, which defeats the point of
  offering them.
- **OQ-CSB-2** — Should a section's Markdown-rendered text be measured for
  overflow using actual rendered height (accurate, requires a layout pass)
  or a length/size heuristic (cheap, approximate — the mockup's own
  `checkOverflow()` currently does this: `size === "large" && text.length >
  180`)? *Default:* the heuristic is acceptable for the mockup stage; the
  real build should measure actual rendered height against the page-cap
  geometry `document-shell` exposes, since a heuristic risks both false
  flags (long but small-font text) and missed ones (short but
  image-heavy sections) — revisit at implementation time against
  `document-shell`'s actual pagination API.
  ✅ **RESOLVED (2026-08-29).** *Resolved:* the heuristic stands for the
  mockup stage; the real build measures actual rendered height against the
  page-cap geometry `document-shell` exposes. Overflow is flagged, never
  cut — consistent with the crib sheet's standing "flag, don't hide" rule.
- **OQ-CSB-3** — ✅ **RESOLVED (2026-08-29).** Can a section be reassigned
  to the other half after generation without losing its `size`, `text`, or
  `imageRefs[]`? *Resolved:* yes — reassigning a section's `half` preserves
  all its other fields; `half` is just one field on the section object,
  matching FR-CSB-5's framing (`half` is assigned by hand and is edited the
  same way any other field is).

## 6. Risks

| Risk | Consequence | Mitigation | Proving test |
|---|---|---|---|
| A drawn fold or page-break indicator creeps back in between the two halves ("just a subtle line for clarity") | Reopens a decision reversed twice already (AD-30 → AD-46 → AD-48) and settled against a drawn fold both times | FR-CSB-6, AD-30/AD-46/AD-48 cited explicitly; code review checks for any CSS border/divider/`page-break-after` between half regions | AC-CSB-5, AC-CSB-10 |
| `half` gets silently inferred from coverage under implementation pressure ("just default to whichever domain the idea mostly covers") | Reopens AD-29's rejected alternative; the two halves stop being a layout choice Luke controls | FR-CSB-5, AD-29 cited explicitly; grep check for any code path deriving `half` from `coverage[]` | Manual check: no `half` write outside the generation seed (AD-CSB-2) and explicit user edit |
| Resize auto-shrinks or silently truncates content to dodge the page cap | Violates the "never silently cut" principle the whole crib-sheet feature exists to enforce (AD-17) | FR-CSB-7, AD-43, AD-CSB-3 | AC-CSB-7 |
| Markdown parser inserts raw user text via `innerHTML` before escaping | Stored XSS via any section's text field | AD-CSB-4, FR-CSB-18 — escape-then-parse order, mirroring the mockup's own implementation | AC-CSB-14 |
| Placeholder suggestion text is accidentally saved or printed as if it were real content | A parent- or student-facing printed page shows hint text as though the teacher wrote it | FR-CSB-12/15; placeholder is a render-time fallback, never written to the section's `text` field | AC-CSB-11…13 |
| Domain-glyph logic is reimplemented locally instead of reusing FR-BI-15's computation | Two glyph rules drift apart the way `AD-LPB-1` warns tier-emission logic could | AD-CSB-5 | AC-CSB-15 |
| Print body type ships below the 12pt (≈16px@96dpi) floor — the current `CribSheet.dc.html` mockup runs 9.5–17px, mostly below the floor, the same class of defect `lesson-plan-document.build.spec.md` flagged for its own print artboards (MinorTasks queue row 9) | A parent- or student-facing printed page with sub-floor type ships into production | This build's print CSS pulls `--font-size-print-*` only after `style-guide` has bumped it to the floor (AD-13c's resolution); no font-size literal set outside the token | Mirrors AC-LPB-11's check, applied to this build's print CSS |
| Spec IDs or invariant names leak onto the printed or on-screen sheet (a stray "FR-CS-11" in a tooltip) | SR-9 violated — developer-facing text reaches the teacher | Every requirement above written to name the visible field, never the spec id; code review greps rendered strings for spec-id-shaped tokens | Manual check: no `FR-`, `AD-`, `AC-`, `INV-DM-` pattern in any rendered label, placeholder, or tooltip |

## 7. Plan

Deferred, pending spec review — matching this project's standing
"spec-then-plan" discipline (see `style-guide.build.spec.md`'s and
`lesson-plan-document.build.spec.md`'s own §7). Not written yet.

## 8. Verification — definition of done

- [ ] All acceptance criteria AC-CSB-1…16 demonstrated
- [ ] AC-CSB-1/2: fixture prints demonstrate the 1-or-2-page cap and a
      flagged (not truncated) third-page breach
- [ ] AC-CSB-5/10: no drawn fold, divider, or page-break indicator ever
      renders between the two halves, in edit view or print view
- [ ] AC-CSB-14 (gate test): a fixture section with an `onerror`-style
      payload renders as literal text, never parsed, never inserted via
      unescaped `innerHTML`
- [ ] AC-CSB-11…13: placeholder text never reaches `unit.json` or the
      printed output
- [ ] AC-CSB-15: pencil/notebook/both glyphs match AC-CUR-13's existing
      fixture, computed by FR-BI-15 alone — no local glyph logic added
- [ ] Print body type measures at or above the 12pt (≈16px@96dpi) floor
- [ ] No `innerHTML` insertion of unescaped user-entered text anywhere in
      the build (JS-6)
- [ ] No spec id, invariant name, or requirement number ever rendered to
      the teacher using the widget (SR-9)
- [ ] No base64 image data in `unit.json` (FR-CSB-9)
- [ ] Zero third-party dependencies; vanilla ES modules only (JS-7,
      FR-CSB-17)
- [ ] Persists only through `local-store`; no direct filesystem access from
      the browser

**On completion:** set Status to Done, `git mv` this spec and its plan to
[`_Done/`](_Done/), update [`_PLAN.md`](_PLAN.md), and re-check
[the project prerequisites gate](../_Spikes/CurriculumPreparation/CurriculumPreparation.prerequisites.spec.md).
