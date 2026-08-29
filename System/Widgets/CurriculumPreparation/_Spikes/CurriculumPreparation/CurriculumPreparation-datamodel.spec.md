# CurriculumPreparation — Data Model

| Field | Value |
|---|---|
| **Type** | Supporting spec (data model) |
| **Date** | 2026-08-22 (rev 16 — Change AJ) |
| **Status** | Draft — to be validated against real curriculum data in spike session 1 |
| **Parent** | [CurriculumPreparation.project.spec.md](CurriculumPreparation.project.spec.md) |

---

## 0. On disk

A unit is a **self-contained bundle folder** (AD-18), stamped out by `!NewUnit`
and independent of this repo and of every other bundle:

```
<Unit Name>/
├── Start Unit.command      double-click launcher (SR-6)
├── serve.py                the bundle's own scoped server (AD-5, AD-13b)
├── ingest.py               plain-text curriculum digest (AD-16)
├── unit.json               ← ALL the data described below
├── images/                 pasted image files, referenced by id
├── _ingest/                drop plain text here; ingest.py digests it
├── app/
│   ├── index.html
│   ├── js/                 vanilla ES modules — one file, one job
│   └── css/                variables.css + one file per component
├── StyleGuide/             this bundle's own tokens and patterns
├── tests/                  stdlib unittest, beside the source
└── README.md               architecture only (SR-7)
```

`_ingest/` sits **inside** the bundle, not at workspace level — a bundle that
needed an outside folder would not be self-contained (FR-BND-2).

`unit.json` remains **hand-inspectable and diffable** (AD-LS-1). Images are
files precisely so it stays that way — a few base64 screenshots would make it
neither.

## 1. Entities

```
Unit
├── meta             subject, level, unit name, teacher, dates
├── generatedFrom    template version this bundle was stamped from (FR-BND-7)
├── curriculum       which curriculum, and under which profile it was ingested
├── nodes[]          AXIS 1 — the curriculum tree (the authority's structure)   ── ONE tree
├── topics[]         AXIS 2, top tier — groups big ideas; bridges curriculum    ── ONE list
│                    requirements and big ideas for the unit-overview (Change P)
├── bigIdeas[]       AXIS 2 — Luke's teaching structure, exactly 2 levels       ── ONE list
├── unitAssessment   PART 3 — one final + many mini assessments (Change E)      ── ONE object
├── lessons[]        4-page lesson plans — each bound to BOTH axes              ── MANY, each different
├── cribSheet        1 page distillation, required upper/lower halves (K, AC) ── ONE
├── resourcesPage    PART 6 — flat ordered list of link/image/text items (Change H) ── ONE object
├── matrixTemplate   the shared shape of the marking matrix                     ── ONE
├── matrices[]       thin per-student pages — just that student's numbers       ── MANY, one per student (Change F)
├── students[]       the roster
└── images[]         manifest of files in images/
```

**Read the cardinality column.** It is enforced by invariants, not convention
(AD-19, INV-DM-18…20). Note especially that `cribSheet`, `unitAssessment` and
`resourcesPage` are *singular objects*, not arrays, and that the marking
matrix is split into **one template plus many per-student instances** —
because "one matrix per unit, each student's page the same shape, different
numbers" is a statement about structure, and the structure should say so.
*(Revised by Change F: `matrices[]` was previously many-per-(student,
lesson); `assessments[]` is retired — Change E absorbs it into
`unitAssessment.miniAssessments[]`, see §1's UnitAssessment / MiniAssessment
entities below. Revised again by Change H, which adds `resourcesPage` as the
widget's sixth, deliberately unstructured part — see AD-25/AD-26. Revised
again by Change P, which adds `topics[]` as a new top tier of axis 2, above
`bigIdeas[]` — see the Topic entity below and AD-35.)*

The model is **curriculum-agnostic**. Nothing below is Victorian-specific;
what varies between curricula is captured in the profile, not the schema.

### Curriculum — which curriculum, and how it was read

| Field | Type | Notes |
|---|---|---|
| `profileId` | string | the adapter used — e.g. `vic-f10-v2`, or `generic` |
| `name` | string | display name |
| `jurisdiction` | string | e.g. Victoria, NSW, England |
| `version` | string | the curriculum's own version/edition |
| `sourceRef` | string | the ingested file's name |
| `licence` | string | licence terms as published |
| `attribution` | string | the line printed on outputs (AD-8) |
| `labels` | object | this curriculum's vocabulary — node kinds (e.g. `{ strand: "Strand", outcome: "Content description", task: "Elaboration" }`), plus *optional* `cribSheetHalves: { upper, lower }` display labels for the crib sheet's two halves (e.g., for Victorian History v2.0, `{ upper: "Historical Concepts and Skills", lower: "Historical Knowledge and Understanding" }`) — Change K, AD-29. A profile that omits `cribSheetHalves` falls back to a generic label ("Upper" / "Lower"); the `half` values themselves (`"upper"` \| `"lower"`) never vary by curriculum |
| `description` | string \| null | *optional* — the curriculum's own orientation prose for the teacher (e.g. the Victorian Curriculum's "Description" field). Renders at the head of the curriculum map only (FR-CUR-9); never appears on a lesson plan, matrix, or crib sheet. A generic field, not Victorian-specific (INV-DM-10) |
| `ingestedAt` | date | |

`labels` is what lets one tree render in a second curriculum's language
without a schema change. Canonical `kind` values stay fixed; only their
display names vary.

### Node — one curriculum item *(axis 1)*

| Field | Type | Notes |
|---|---|---|
| `id` | string | internal, stable, ours |
| `code` | string | **verbatim from the source** (FR-CUR-5) — never rewritten |
| `title` | string | verbatim from the source |
| `text` | string | the full description |
| `kind` | `outcome` \| `task` \| `strand` | |
| `parentId` | string \| null | null = unit root; drives the arbor tree |
| `confidence` | `high` \| `low` | set by the ingest parser (FR-CUR-1b) |
| `edited` | bool | true once the user changes `title`/`text` |
| `original` | object \| null | snapshot of the ingested values, kept when `edited` |
| `domain` | `skill` \| `knowledge` \| null | *(New — Change AH)* **set only on `kind: strand` nodes** — `outcome`/`task` nodes leave this unset and inherit it by walking `parentId` to their ancestor strand (INV-DM-43). Ingest guesses it from the strand's own title/text against a small keyword heuristic (e.g. "skills" → `skill`, "knowledge"/"understanding" → `knowledge`), flagged `confidence: low` the same way any other guess is (FR-CUR-1b) — Luke corrects it like any other ingested field. A strand with neither keyword, or a curriculum with no strand split at all, leaves it unset — the field is additive, never a forced binary |

`confidence` is the ingest being honest about its own guesswork. It is
**cleared on first edit** — once Luke has looked at a node, the parser's
opinion of it is stale.

A curriculum's own **categories** (e.g. Victorian History's two content-
description strands) are not a new entity — they map onto this same `Node`
model: a `kind: strand` node per category, `kind: outcome` nodes underneath
for each content description, with the profile's `labels` supplying the
human names. See AD-20 for why, and for the note on year-level **bands**
(some History content descriptions span two year levels, e.g. "9-10" — a
band, not a single level).

### BigIdea — one of Luke's organising ideas *(axis 2)*

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `title` | string | the idea itself |
| `text` | string | optional elaboration |
| `parentId` | string \| null | **null = big idea; set = sub-big idea.** Exactly two levels (INV-DM-14) |
| `order` | number | explicit ordering — the list is curated, not alphabetical |
| `coverage[]` | `{ nodeId, coverage, note }[]` | *optional* — curriculum nodes this idea serves (FR-BI-7, FR-BI-9). `nodeId` resolves to a `Node` (INV-DM-21); `coverage` is `"full"` \| `"partial"`, exactly two values (INV-DM-22, AD-21); `note` is optional free text; no duplicate `nodeId` within one big idea's array (INV-DM-23) |
| `topicId` | string | *(New — Change P)* **mandatory on every top-level big idea** (`parentId: null`) — the `Topic` it belongs to (FR-TOP-3, INV-DM-34). A sub-big idea (`parentId` set) carries **no `topicId` of its own**; it inherits its parent's topic transitively |

Deliberately **not** a general tree. Two levels is the whole design: a big
idea, optionally broken down once. Depth is a constraint, not an oversight.

**The Big Idea Tree** *(New — Change AJ)* is the editing and print surface
for this list — a markdown-style outline in setup view (one line per big
idea/sub-big idea; indentation sets `parentId`, line order sets `order`) and
an ASCII-connector tree in print view (FR-BI-16…20). It adds **no new field**
to this entity: `title`, `order` and `parentId` already carry everything the
outline needs, and INV-DM-14's two-level cap is the same rule that already
limits how deep the outline's indentation may go — the view enforces nothing
the schema didn't already require. See AD-51 for the full design and the
markdown-as-structural-editing decision.

`coverage[]` replaces rev 4's flat `nodeIds[]`. A bare id array could not say
whether a big idea *finishes* a node or merely *touches* it — which is
exactly the distinction Luke needs on the print view map (Change C). The edge
stays forward-stored here, on the big idea, matching every other edge in
this document (§1b); the reverse — which big ideas, if any, cover a given
node — is derived, never stored (INV-DM-12).

### Topic — the top tier of axis 2, bridging curriculum requirements to big ideas *(New — Change P)*

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `title` | string | the topic itself |
| `text` | string \| null | optional elaboration |
| `order` | number | explicit ordering — curated, not alphabetical, same convention as `BigIdea.order` |
| `coverage[]` | `{ nodeId, coverage, note }[]` | *optional* — curriculum nodes this topic serves, **stored independently of whatever its big ideas individually link** (AD-35). Same shape and enum as `BigIdea.coverage[]` (AD-21): `nodeId` resolves to a `Node` (INV-DM-35); `coverage` is `"full"` \| `"partial"` (INV-DM-22); `note` optional; no duplicate `nodeId` per topic (INV-DM-36) |

A **flat list** — `topics[]` carries no `parentId` and no nesting, unlike
`bigIdeas[]`'s two-level structure. It groups big ideas by reference
(`bigIdea.topicId`, many-to-one), not by containment, so attaching, renaming
or reordering a topic never touches the big-idea list's own two-level cap
(INV-DM-14).

**Purpose (Luke's framing):** a topic gives the teacher and the student a
coarser sense of "what's in the unit" than either the curriculum tree or the
big-idea list offers on its own — a student "doesn't want to see the
curriculum plan, they just want to see the list of topics." It sits between
axis 1 (curriculum nodes) and the fine-grained end of axis 2 (big ideas),
which is why its own `coverage[]` links straight to curriculum nodes rather
than only through its big ideas.

A lesson's topic is **never stored** — it resolves transitively
(`lesson.bigIdeaId` → `BigIdea` [→ its parent, if a sub-big idea] →
`topicId` → `Topic`), the same "derive, don't duplicate" discipline INV-DM-12
already applies to every reverse edge in this document, here applied to a
forward chain instead. See AD-35 for the full rationale, including why a
`lesson.topicId` field was considered and rejected.

### UnitAssessment — the widget's fifth part, printed as Part 3 *(exactly one — Change E, AD-23)*

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `title` | string | |
| `bigIdeaId` | string | **mandatory** big-idea binding **for the final assessment specifically** — the same rule as `lesson.bigIdeaId` (FR-UA-5, mirrors INV-DM-15). *(Narrowed — Change S: previously read as binding the whole document, final and every mini alike; each mini assessment now carries its own — see `MiniAssessment.bigIdeaId` below and AD-37.)* |
| `coverage[]` | `{ nodeId, coverage, note }[]` | *optional* — curriculum links, the **same shape** as `BigIdea.coverage[]` (FR-UA-6; reuses AD-21's enum, not a second format) |
| `finalAssessment` | `AssessmentTiers` | **exactly one**, three-tiered (FR-UA-2, INV-DM-24) |
| `finalAssessmentCompleted` | boolean | *(New — Change S)* manual "administered" flag for the final assessment — never derived, never affects scoring or tiers (FR-TOP-10) |
| `finalAssessmentDate` | string \| null | *(New — Change AI)* optional calendar date for the final assessment, ISO `YYYY-MM-DD` — same field and derivation rule as `Lesson.date`, named per-assessment the same way `finalAssessmentCompleted` is (FR-TOP-12) |
| `finalAssessmentPeriod` | string \| null | *(New — Change AI)* optional freeform timetable slot for the final assessment — same field and rules as `Lesson.lessonPeriod` (FR-TOP-13) |
| `miniAssessments[]` | `MiniAssessment[]` | **many**, each three-tiered (FR-UA-3) |

A first-class document, not a variant of `Lesson` — see AD-23 for why (different
cardinality: one final + many minis, versus a lesson's flat one-of-each; and
different links: a document-level `bigIdeaId`/`coverage[]` pair, versus a
lesson's simple `nodeIds[]`/`bigIdeaId`).

### MiniAssessment — absorbs the former `Assessment` entity *(many, nested under `unitAssessment`)*

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `name` | string | |
| `weighting` | number \| null | optional — carried over unchanged from the former `Assessment` entity |
| `bigIdeaId` | string | *(New — Change S)* **mandatory**, own big-idea binding — the same rule as `lesson.bigIdeaId` (FR-UA-13, mirrors INV-DM-15), independent of the final assessment's `unitAssessment.bigIdeaId` and of every other mini assessment's. This is what lets each mini assessment place under its own topic on the combined Lessons & Topics view (FR-TOP-8) rather than every assessment in a unit collapsing onto one (AD-37) |
| `coverage[]` | `{ nodeId, coverage, note }[]` | *(REWRITTEN — Change I)* outcomes this mini assessment covers, **upgraded from the former bare `nodeIds[]`** to the same qualified shape `BigIdea.coverage[]` and `unitAssessment.coverage[]` already use (AD-21, AD-27); `nodeId` resolves to a `Node` (INV-DM-26), `coverage` is `"full"` \| `"partial"` (INV-DM-22) |
| `tiers` | `AssessmentTiers` | three-tiered, same shape as the final assessment (FR-UA-3) |
| `completed` | boolean | *(New — Change S)* manual "administered" flag — never derived, never affects scoring or tiers (FR-TOP-10) |
| `date` | string \| null | *(New — Change AI)* optional calendar date, ISO `YYYY-MM-DD` — same field, same derivation-at-render rule as `Lesson.date` (FR-TOP-12) |
| `lessonPeriod` | string \| null | *(New — Change AI)* optional freeform timetable slot — same field, same rules as `Lesson.lessonPeriod` (FR-TOP-13) |

There is **no separate top-level `assessments[]` array any more** — the former
thin `Assessment` entity (`id`, `name`, `weighting`, `nodeIds[]`) *is* this
entity, plus the three-tiered content Change E adds. Keeping one assessment
concept, not two, is the point of the absorption (FR-UA-4). *(Change I)* Its
node linkage was upgraded a second time, from bare `nodeIds[]` to qualified
`coverage[]` — one coverage-link shape across the whole schema, not two
(AD-27).

### AssessmentTiers — the shape shared by the final assessment and every mini assessment

`{ pass, intermediate, advanced }` — three **`TierPage`s**, reusing the exact
same entity `Lesson.tiers` already uses (never more, never fewer — INV-DM-25).
Sharing the shape, rather than inventing an assessment-specific tier page,
keeps the renderer and print CSS common to both parts (SR-4). *(OQ-DM-13
records this as a default, open to revision.)*

### Lesson

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `number` | number | position in the unit; used in print view citations |
| `nodeIds[]` | string[] | **axis 1** — the curriculum part(s) this lesson serves (FR-LP-1) |
| `bigIdeaId` | string | **axis 2** — exactly one big idea *or* sub-big idea. **Required** (FR-BI-4, INV-DM-15) |
| `bigIdeaNote` | string | optional lesson-specific gloss on that idea (FR-LP-2) |
| `keyExample` | string | FR-LP-3 |
| `practiceQuestion` | string | FR-LP-4 |
| `assessmentLink` | { `miniAssessmentIds[]`, `finalAssessment`, `note` } | FR-LP-5, FR-UA-8 — `miniAssessmentIds[]` is zero-or-more; `finalAssessment` is a bool for the unit's one final assessment; a lesson may set either, both, or neither *(REWRITTEN — Change E: was `{ assessmentIds[], note }` against the flat `Assessment` entity)* |
| `tiers` | { `pass`, `intermediate`, `advanced` } | three `TierPage`s — never more, never fewer |
| `imageRefs[]` | ImageRef[] | FR-LP-13 |
| `sidebar` | string \| null | *(New — Change Q)* optional freeform text — miscellaneous notes, catch-up work, tangents, or leftover work carried over from another lesson (FR-LP-18). Plain text only: no images, no curriculum/big-idea/topic binding, no row in the link graph (§1b) — the same deliberate absence of structure AD-26 gives the Resources page, applied here at field scale (AD-36). Prints on the front page when non-empty; renders nothing at all when blank |
| `completed` | boolean | *(New — Change S)* manual "taught" flag, default `false` — never derived from `number` or a date, never auto-set. Colours the lesson's row on the combined Lessons & Topics view (FR-TOP-10); touches nothing else — no tier, score or citation reads it |
| `date` | string \| null | *(New — Change AI)* optional calendar date the lesson is scheduled for, ISO `YYYY-MM-DD` (FR-TOP-12). Display strings (e.g. "Mon 3 Aug") are **derived** from this at render time, never stored — same "derive, don't duplicate" discipline INV-DM-12 applies everywhere else, here applied to a formatting derivation rather than a reverse edge |
| `lessonPeriod` | string \| null | *(New — Change AI)* optional freeform timetable slot, e.g. `"Mon 3rd P"` or `"Wed 1st–2nd P"` (FR-TOP-13). Plain text, curriculum-agnostic and school-timetable-agnostic — no day/period sub-structure is parsed or validated, the same freeform treatment `Lesson.sidebar` already gets (AD-36). Independent of `date`: a lesson may carry either, both, or neither |
| `provenance` | `generated` \| `edited` \| `manual` | drives FR-LP-9's no-clobber rule |

Note there is **no free-text `bigIdea` field**. Rev 2 had one; rev 3 replaced
it with a reference into the list, because an idea spread across several
lessons has to be one object, not a string retyped four times.

**`number` is not new in Change L** — the field has carried the lesson's
teaching-order position, used in print view citations, since this table's first
revision. Change L (FR-LP-14…16) is a **display and behaviour** requirement
over the existing field — a list view on the Lessons tab that shows it, and
a renumber-on-reorder rule (INV-DM-32) — not a schema addition. Nothing in
this row changes.

**`tiers` is not made optional by Change N.** The field's shape — `{ pass,
intermediate, advanced }`, all three keys always present — is unchanged
(INV-DM-1, INV-DM-25). What changed is a **rendering** rule layered on top:
a tier page prints only if that tier's content is non-empty (INV-DM-33,
FR-LP-7/7a). The schema cannot tell, from `tiers` alone, how many pages a
given lesson will print — that is computed at render time by walking the
three keys against INV-DM-33's emptiness test, not stored anywhere.

### TierPage — one of pages 2–4

`{ tier, material, studentTask, workspaceLines, imageRefs[] }` — `tier` is one
of the three fixed keys.

### CribSheet

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `title` | string | |
| `orientation` | `portrait` \| `landscape` | user's choice, remembered |
| `sections[]` | { `bigIdeaId`, `half`, `text`, `imageRefs[]`, `size` } | ordered; each keyed to a big idea or sub-big idea. `half` is `"upper"` \| `"lower"` — **required, exactly one per section** (FR-CS-9, INV-DM-31). `size` is `"small"` \| `"medium"` \| `"large"` — optional, defaults to `"medium"` when unset (FR-CS-11, INV-DM-41). `text` supports **Markdown-style formatting**: `**bold**`, `*italic*`, and `- bullet items`; unsupported Markdown syntax is treated as literal text (FR-CS-11) |
| `pageCount` | `1` \| `2` | reinstated — see note below (FR-CS-5, INV-DM-16) |
| `provenance` | `generated` \| `edited` \| `manual` | same no-clobber rule as lessons |

**`pageCount` was REMOVED — Change AC (INV-DM-42, AD-46) — then REINSTATED —
Change AF (INV-DM-16, AD-48).** The field holds `1` \| `2` (FR-CS-5,
INV-DM-16). Change AC had briefly tightened the crib sheet's cap to **exactly
1 page, always** (FR-CS-12, itself now superseded), dropping the field as
carrying no information at a single legal value; Change AF reverses that
tightening — the cap is **1 or 2, enforced** again (AD-17's original rule) —
so the field is **restored to the schema** to record which of the two legal
page counts a given sheet actually renders to.

**Migration consequence, corrected.** Under Change AC's brief window, a
bundle carrying `pageCount: 2` was, by definition, in an overflow state.
**That is no longer true.** Under Change AF's restored 1-or-2-page cap, a
`unit.json` carrying `cribSheet.pageCount: 2` denotes a **perfectly legitimate
two-page crib sheet** — not an overflow signal, and not something to
re-flag or re-edit down. A bundle written during the brief Change-AC-only
window with no `pageCount` field at all (because the field was absent for
that period) is read as before: the field is optional to have gone missing
and is simply computed/re-populated at next save. Overflow is still, exactly
as before, whatever pushes the sheet past **2** pages — never past 1.

**`half` is generic, not curriculum-specific** (Change K). It is a plain
two-value layout discriminator — which region of the page a section prints
in — never a Victorian strand name or any other curriculum's vocabulary
(INV-DM-10). The two Victorian History v2.0 strands, "Historical Concepts and
Skills" and "Historical Knowledge and Understanding," happen to map neatly
onto `upper`/`lower`, but that mapping lives entirely in
`curriculum.labels.cribSheetHalves` (§1 above) — the curriculum profile
supplying a display label for a generic slot, the same pattern AD-10 already
established for node-kind vocabulary. A section's `half` is set by Luke when
he authors or edits it; it is **never derived** from the section's big idea's
own `coverage[]` (see AD-29 for why an automatic derivation was considered and
rejected — a big idea can span both strands, and which half it prints under
is a page-layout choice Luke makes, not a fact the coverage data determines).

### ResourcesPage — the widget's sixth part *(exactly one — Change H, AD-25)*

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `items[]` | `ResourceItem[]` | ordered list — the whole page (FR-RES-1) |

Deliberately the **thinnest entity in the schema** — one field holding an
ordered list, no bindings out to anything else. That is not an oversight; it
is the point of the part (AD-26).

### ResourceItem — one entry on the resources page

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `kind` | `link` \| `image` \| `text` | **exactly one** — no fourth value (FR-RES-2, INV-DM-29) |
| `order` | number | explicit ordering — curated, not alphabetical, same convention as `BigIdea.order` (FR-RES-5) |
| `url` | string \| null | set when `kind: "link"` (FR-RES-2a) |
| `label` | string \| null | optional display text, only meaningful when `kind: "link"` |
| `imageId` | string \| null | set when `kind: "image"` — resolves to an `images[]` manifest entry (FR-RES-2b, INV-DM-28), reusing the existing pasted-image model (AD-15) unchanged; never a second image path, never base64 |
| `text` | string \| null | set when `kind: "text"` (FR-RES-2c) |
| `note` | string \| null | optional caption, available regardless of `kind` (FR-RES-3) |

An item stores only the fields its `kind` needs; the others stay `null`. There
is no per-kind entity split (a `LinkItem`, an `ImageItem`, a `TextItem`) —
one shape with a `kind` discriminator is enough for three fields' worth of
variation, and a split would just move the same `if (kind === …)` branching
from the renderer into the schema.

### Image manifest entry

`{ id, filename, mimeType, width, height, byteSize, addedAt }` — the file lives
at `images/<filename>`. **ImageRef** (used inside documents) is
`{ imageId, x, y, width, height }` — placement only; the tool does not edit
pixels (FR-IMG-5).

### MatrixTemplate — the shape the one marking matrix shares across every student *(exactly one)*

| Field | Type | Notes |
|---|---|---|
| `orientation` | `portrait` \| `landscape` | default for new student pages — G-7 closed this as portrait; still reads correctly under Change F, since it is still "the one template's default," just no longer one default among many per-lesson templates |
| `criteria[]` | `{ id, tier, criterion, draftScore, maxScore, assessmentIds[], allocationOverridden }` | the shared rows — tiers, wording and **draft scores** live here, once. *(REWRITTEN — Change T/U: `assessmentIds[]` and `allocationOverridden` were already load-bearing in the build spec (AD-MMB-3, FR-MM-12a) but missing from this canonical table — added here to close that gap, not to introduce new build behaviour.)* |

| Sub-field | Type | Notes |
|---|---|---|
| `assessmentIds[]` | string[] | *(Change T, was already build-spec-only via AD-MMB-3)* one or more `unitAssessment.miniAssessments[].id` values and/or the unit's one final assessment — the assessment(s) this criterion marks. Resolvable (INV-DM-4 lineage); refused empty at save (FR-MMB-5) |
| `allocationOverridden` | boolean | *(New — Change U)* `true` once a teacher has hand-edited this criterion's `maxScore` in Default Full mode (FR-MM-12a). An overridden criterion is excluded from automatic tier-budget allocation (INV-DM-39); default `false` |

Editing a draft score here changes it for **every** student page (FR-MM-3).
For a class of thirty, the alternative is editing thirty copies — which is
why the template exists. *(Revised by Change F: previously "for a class of
thirty across ten lessons... three hundred copies" — the marking matrix is no
longer keyed by lesson, so the multiplier drops out.)*

**Tiered-ceiling allocation of `maxScore` (Change U, reverses OQ-MMB-8).**
Every non-overridden criterion's `maxScore` is **computed**, not freely
chosen: the tool divides its tier's fixed budget (Pass 50, Intermediate 25,
Advanced 25 — FR-MM-11) evenly across every non-overridden criterion in that
tier, rounded to the nearest half mark, with any remainder redistributed in
0.5 increments to criteria in stable array order (FR-MMB-37, INV-DM-38). This
is **allocation at setup time**, not rescaling a raw mark at grading time — an
`awardedScore` already entered against a criterion is never touched by a
re-allocation; only that criterion's ceiling can move, and only when the
criterion is non-overridden. See AD-40 for the full algorithm and its worked
example, and AD-41 for what a manual override does to the tier's ceiling.
**Scope (full-unit vs per-assessment, Change T) is deliberately not a stored
field here** — it is a computed filter over `criteria[]` by `assessmentIds[]`
(AD-MMB-14), the same "view, not data" treatment already given the display
mode (AD-MMB-11) and totals (AD-MMB-4).

### Matrix — one thin instance per student *(many — REWRITTEN, Change F)*

> **Change F.** Previously one instance per **(student, lesson)** pair
> (INV-DM-6, pre-Change-F). Luke confirmed there is only **one marking matrix
> per unit**, and it scores against the Unit Assessment (FR-UA), not
> individual lessons — "each student gets their own page." `lessonId` is
> **removed**; there is no replacement stored id, because the matrix and the
> Unit Assessment are both unit-level singletons (INV-DM-18) and need no
> cross-reference to find one another (see AD-24).

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `studentId` | string | FR-MM-4 — **one page per student**, not per (student, lesson) |
| `orientation` | `portrait` \| `landscape` \| null | null = inherit the template's |
| `scores[]` | `{ criterionId, awardedScore, comment }` | **only what was entered** |

An instance stores no criteria, no tiers and no draft scores — it *references*
the template's `criterionId`. That is what makes "one matrix, every student's
page the same shape, different numbers" structurally true rather than a
convention someone has to maintain.

### Student

`{ id, name }`. The roster lives in the unit (INV-DM-8 self-containment).

---

## 1b. The link graph

Cross-part traceability (FR-TR) is **not new data** — it is the existing
reference fields read in both directions.

```
   AXIS 1                                              AXIS 2
   Node ←──── nodeIds[] ──── Lesson ──── bigIdeaId ────→ BigIdea
     ↑                         │                              │  ↑
     │                         ├── assessmentLink ─→ UnitAssessment ── bigIdeaId ──┘
     │                         │   {miniAssessmentIds[],   │
     │                         │    finalAssessment}       ├── coverage[] {nodeId, coverage} ──┐
     │                         │                            │   (forward-stored, AD-21/FR-UA-6) │
     │                         └──── bigIdeaId ── CribSheet  ↕ (structural — both unit-level     │
     │                                   (via sections[])      singletons, INV-DM-18)            │
     │                                                       Matrix                              │
     └──── lesson coverage ─────────────────────────────────────────────────────────────────────┘
          (derived, FR-CUR-7)

     BigIdea → Node coverage[]: forward-stored on BigIdea (AD-21); reverse —
     which big ideas cover a node — derived, never stored (INV-DM-12). The
     new UnitAssessment → Node coverage[] above follows the identical rule.
```

| Direction | Stored, or derived? | Requirement |
|---|---|---|
| Lesson → Node | stored (`lesson.nodeIds[]`) | FR-TR-1 |
| Node → Lessons (lesson coverage) | **derived** | FR-TR-3, FR-CUR-7 |
| Lesson → BigIdea | stored (`lesson.bigIdeaId`) | FR-BI-4 |
| BigIdea → Lessons | **derived** | FR-BI-6, FR-TR-5a |
| Lesson → UnitAssessment (mini and/or final) | stored (`lesson.assessmentLink`) | FR-TR-5, FR-UA-8 |
| UnitAssessment (mini/final) → Lessons | **derived** | FR-TR-2, FR-TR-8 |
| UnitAssessment → Matrix | **structural** — both are unit-level singletons (INV-DM-18); no stored id needed | FR-TR-2, FR-TR-4 |
| Matrix → UnitAssessment | **structural** — see above | FR-TR-4 |
| CribSheet → BigIdeas | stored (`sections[].bigIdeaId`) | FR-CS-2 |
| BigIdea → Node (`coverage[]`, full/partial) | stored (`bigIdea.coverage[]`) | FR-BI-7, FR-BI-9 |
| Node → BigIdeas (coverage gap) | **derived** | FR-CUR-10, FR-TR-8 |
| UnitAssessment → Node (`coverage[]`, full/partial) | stored (`unitAssessment.coverage[]`) | FR-UA-6 |
| Node → UnitAssessment (coverage gap) | **derived** | FR-TR-8 |
| UnitAssessment → BigIdea | stored (`unitAssessment.bigIdeaId`) | FR-UA-5 |
| MiniAssessment → Node (`coverage[]`, full/partial) | stored (`miniAssessment.coverage[]`) | FR-UA-3, FR-UA-4 *(upgraded from `nodeIds[]` — Change I, AD-27)* |
| MiniAssessment → BigIdea | stored (`miniAssessment.bigIdeaId`) | FR-UA-13 *(New — Change S)* |
| MiniAssessment → Topic | **derived** — same transitive chain as `Lesson → Topic`, via `miniAssessment.bigIdeaId` | FR-TOP-8 *(Change S)* |
| UnitAssessment (final) → Topic | **derived**, via `unitAssessment.bigIdeaId` | FR-TOP-8 *(Change S)* |
| Node → assessed coverage (taught-vs-assessed comparison) | **derived** — walks `bigIdea.coverage[]` together with `unitAssessment.coverage[]` and every `miniAssessment.coverage[]`; no new edge stored | FR-BI-11, FR-BI-12, FR-BI-13, FR-TR-9 *(Change I)* |
| BigIdea → Topic | stored (`bigIdea.topicId`, top-level big ideas only) | FR-TOP-3 *(New — Change P)* |
| Topic → BigIdeas | **derived** | FR-TOP-5 *(Change P)* |
| Lesson → Topic | **derived** — walks `lesson.bigIdeaId` → `BigIdea` (→ its parent, if a sub-big idea) → `topicId`; no field stored on `Lesson` | FR-TOP-9 *(Change P)* |
| Topic → Node (`coverage[]`, full/partial) | stored (`topic.coverage[]`), independent of `bigIdea.coverage[]` | FR-TOP-6 *(Change P)* |
| Node → Topics (coverage gap) | **derived** | FR-CUR-12 *(Change P)* |

*(REWRITTEN — Change E/F: `Lesson → Matrices` and `Matrix → Lesson`
(`matrix.lessonId`) are retired; `Lesson → Assessment → Nodes` is retargeted
to `Lesson → UnitAssessment` above, and five rows are added for the new
`UnitAssessment` entity and its structural relationship to the now-singular
`Matrix`. Extended — Change I: `MiniAssessment → Node` is upgraded to the
qualified shape, and a new derived row records the taught-vs-assessed
comparison — a computed view over two already-derived indices, not a third
stored edge.)*

**`ResourcesPage` carries no row in this table.** It is deliberately outside
the link graph: no stored edge in, no stored edge out, no derived reverse
either (FR-RES-6, AD-26). Every other part in this document earns its place
in the graph; the resources page is the one part that opts out.

**`Lesson.sidebar` carries no row in this table either** *(Change Q)* — the
same exemption as the Resources page, applied to one field instead of a
whole part. No stored edge in, no stored edge out (AD-36).

**Reverse edges are derived, never stored.** Storing them would create two
sources of truth that can disagree; INV-DM-4 already forbids a dangling
forward reference. The index is rebuilt on load. This holds unchanged for
the new `BigIdea → Node` edge (Change C): it is forward-stored on the big
idea exactly like every other edge above, and its reverse is derived by the
same rebuilt-on-load index as the rest of this table — Change C adds a new
edge to the graph, not a new rule to it. The same holds for `UnitAssessment →
Node` (Change E) — a second edge shaped exactly like the first, not a second
rule. The one edge that is genuinely retired, not merely rerouted, is `Matrix
→ Lesson`: Change F removes it outright, because the matrix and the Unit
Assessment are both unit-level singletons and their relationship needs no
stored id at all (see the `UnitAssessment ↔ Matrix` rows above).

**Change M (clickable codes, FR-TR-10…12) adds no row to this table.** A
code click's navigation target is resolved from whichever forward-stored
`nodeId` reference the clicked part already carries — the same reads this
table already lists (`Lesson → Node`, `UnitAssessment → Node`,
`MiniAssessment → Node`, `BigIdea → Node`). It is an edit view behaviour layered
on existing edges (AD-32), not a new edge; INV-DM-12 is unaffected.

## 1c. Orientation

| Document | Orientation | Stored? |
|---|---|---|
| Curriculum map | `landscape` | no — fixed by the part |
| Lesson plan | `portrait` | no — fixed by the part |
| Unit Assessment | `portrait` | no — fixed by the part, same rule as the lesson plan (AD-11, AD-23) |
| Marking matrix | either | **yes**, on the matrix |
| Crib sheet | either | **yes**, on the crib sheet |
| Resources page | `portrait` | no — fixed by the part, same rule as the lesson plan and Unit Assessment (AD-11, AD-25) |

Only the variable ones are stored. A fixed orientation in the data would
invite a document to contradict its own part.

---

## 2. Invariants

- **INV-DM-1** — Exactly **three tiers**, always, with fixed keys `pass`,
  `intermediate`, `advanced` and fixed colours Green / Blue / Orange.
- **INV-DM-2** — A node's `code` and `title` as ingested are **never
  destroyed**. An edit sets `edited` and preserves `original`.
- **INV-DM-3** — `nodes[]` forms a **tree**: exactly one root, no cycles, every
  non-root `parentId` resolves.
- **INV-DM-4** — Every stored reference resolves — `lesson.nodeIds[]`,
  `lesson.bigIdeaId`, `lesson.assessmentLink.miniAssessmentIds[]`,
  `miniAssessment.coverage[].nodeId`, `unitAssessment.bigIdeaId`,
  `cribSheet.sections[].bigIdeaId`, `resourceItem.imageId` (when
  `kind: "image"`), `bigIdea.topicId` (top-level big ideas only),
  `topic.coverage[].nodeId`, `miniAssessment.bigIdeaId`, every
  `ImageRef.imageId`. Deletion is refused or cascades explicitly; it never
  leaves a dangling reference. *(REWRITTEN —
  Change F drops `matrix.lessonId` from this list, since the field no longer
  exists; `assessment.nodeIds[]` is renamed `miniAssessment.nodeIds[]`, and
  `lesson.assessmentLink` is added — Change E. Change I upgrades
  `miniAssessment.nodeIds[]` to `miniAssessment.coverage[].nodeId`; Change H
  adds `resourceItem.imageId`; Change P adds `bigIdea.topicId` and
  `topic.coverage[].nodeId`; Change S adds `miniAssessment.bigIdeaId`.)*
- **INV-DM-5** — A lesson's tier pages render in fixed order: Pass (p2),
  Intermediate (p3), Advanced (p4).
- **INV-DM-6** — There is **exactly one marking matrix per unit**
  (INV-DM-18); within it, **exactly one instance (page) per student** — never
  per (student, lesson). *(REWRITTEN — Change F, AD-24; was "one matrix per
  (student, lesson) pair".)*
- **INV-DM-7** — A matrix's rows cover all three tiers.
- **INV-DM-8** — The **unit folder** is self-contained: `unit.json` plus
  `images/` is everything. No reference outside the folder, no URL. *(Revised
  in rev 3 — was "the file is self-contained" before images existed.)*
- **INV-DM-9** — `unit.json` carries a `schemaVersion`. A reader meeting a
  higher version refuses to open rather than silently dropping fields.
- **INV-DM-10** — Nothing in the schema is specific to one curriculum.
  Curriculum-specific concepts live in `unit.curriculum`, never in a field name
  or enum value. *A field called `vcaaCode` would be a bug.*
- **INV-DM-11** — Every unit records the profile it was ingested under, even
  the generic one.
- **INV-DM-12** — Reverse links are **derived, never stored**. A file
  containing a stored reverse edge is invalid.
- **INV-DM-13** — Orientation is stored **only** where it varies — on marking
  matrices and crib sheets.
- **INV-DM-14** — The big-idea list is **exactly two levels**. A `BigIdea`
  whose `parentId` points at another `BigIdea` that itself has a `parentId` is
  invalid. *(FR-BI-2)*
- **INV-DM-15** — **Every lesson has a resolvable `bigIdeaId`.** A lesson
  without one is invalid — not a warning, not a default, invalid. *(FR-BI-4)*
- **INV-DM-16** — *(RETIRED — Change AC; REINSTATED — Change AF/AD-48)* A
  crib sheet's `pageCount` is 1 or 2 (FR-CS-5). *(Retirement note, preserved:
  Change AC removed the `pageCount` field — data model §1 — on the grounds
  that a crib sheet was then capped at exactly 1 page, always, with no
  variable field to constrain, and superseded this invariant with
  **INV-DM-42**. Reinstatement note — 2026-08-20, Change AF: Change AC's
  page-cap tightening is reversed; the cap is 1-or-2 again, the `pageCount`
  field is restored to the schema, and this invariant is back in force.
  **INV-DM-42** is now the superseded one — see its own note below. See
  **AD-48** for the full decision.)*
- **INV-DM-17** — Every `images[]` manifest entry has a real file in `images/`,
  and every `ImageRef` resolves to a manifest entry. A missing **file** renders
  a visible placeholder (FR-IMG-6); a missing **manifest entry** is invalid.
  *The distinction matters: files can vanish outside the tool, manifest entries
  cannot.*
- **INV-DM-18** — **Singular parts are singular.** Exactly one curriculum root
  (INV-DM-3), exactly one `bigIdeas[]` list, exactly one `cribSheet` object,
  exactly one `matrixTemplate`, exactly one `unitAssessment` object, exactly
  one `resourcesPage` object. A unit carrying two of any of them is invalid,
  not merely unusual. *(AD-19, AD-23, AD-25, FR-SYS-11)* **The marking matrix
  itself is also now singular per unit** (Change F, AD-24): `matrices[]`
  holds many *pages*, one per student, but they belong to the one matrix —
  they are not independent matrices the way `lessons[]` are independent
  lesson plans. *(REVIEWED and extended — Change E adds `unitAssessment`;
  Change F adds the matrix-singularity clause; Change H adds `resourcesPage`
  — singular like `cribSheet`, not plural like `lessons[]`.)*
- **INV-DM-19** — **Matrix instances carry no shared structure.** Every
  `scores[].criterionId` resolves to a `matrixTemplate.criteria[]` entry, and no
  instance stores its own criteria, tiers or draft scores. An instance that does
  has forked from the template and is invalid. *(REVIEWED — Change F: an
  instance also carries no `lessonId` any more; the rule is unchanged in
  substance, only the field it used to also-not-carry has been removed
  outright rather than merely being forbidden to fork.)*
- **INV-DM-20** — The bundle is **self-contained**: nothing in `unit.json`, in
  `app/`, or in any script references a path outside the bundle root. *(FR-BND-2,
  AD-13b — this is the data-side half of the server's scope guard.)*
- **INV-DM-21** — Every `coverage[].nodeId` on a `BigIdea` **resolves** to a
  real entry in `nodes[]`. An unresolvable `nodeId` is a dangling reference
  under the same rule as INV-DM-4, applied to the new edge. *(FR-BI-7)*
- **INV-DM-22** — `coverage[].coverage` is **one of exactly two values**,
  `"full"` or `"partial"`. No third value, no numeric or percentage scale.
  *(AD-21)*
- **INV-DM-23** — A `BigIdea`'s `coverage[]` carries **no duplicate
  `nodeId`** — one link per (big idea, node) pair. Changing a node from full
  to partial coverage (or back) edits that one entry; it never adds a second.
  *(FR-BI-7)*
- **INV-DM-24** — *(New — Change E)* A unit's `unitAssessment` holds
  **exactly one** `finalAssessment`. It is not an array, and there is no
  second final assessment anywhere in the unit. *(FR-UA-2)*
- **INV-DM-25** — *(New — Change E)* Every tier set is **complete**: a
  lesson's `tiers`, the `unitAssessment.finalAssessment.tiers`, and every
  `miniAssessment.tiers` each carry all three fixed keys (`pass`,
  `intermediate`, `advanced`) — never more, never fewer. Extends INV-DM-1's
  "exactly three tiers, always" to the two new assessment shapes Change E
  introduces. *(FR-UA-2, FR-UA-3)*
- **INV-DM-26** — *(New — Change E; REWRITTEN — Change I)* Every
  `miniAssessment.coverage[].nodeId` entry **resolves** to a real entry in
  `nodes[]` — the same resolution rule INV-DM-21 already enforces for
  `BigIdea.coverage[]`, now applied to the qualified shape `MiniAssessment`
  is upgraded to (AD-27). The bare `nodeIds[]` list this replaces is retired;
  no unit file may carry it. *(FR-UA-3, FR-UA-4)*
- **INV-DM-27** — *(New — Change E)* Every `lesson.assessmentLink` **resolves**:
  each `miniAssessmentIds[]` entry names a real
  `unitAssessment.miniAssessments[].id`, and `finalAssessment: true` is always
  valid because INV-DM-24 guarantees exactly one final assessment exists to
  point at. Deletion of a mini assessment that lessons still link to is
  refused, naming the blocking lessons — the same refusal pattern as FR-BI-8.
  *(FR-UA-8, FR-TR-5)*
- **INV-DM-28** — *(New — Change H)* Every `resourceItem` of `kind: "image"`
  **resolves** its `imageId` to a real entry in `images[]` — the same
  file-vs-manifest distinction INV-DM-17 already draws for every other
  image reference: a missing **file** renders a visible placeholder
  (FR-IMG-6), a missing **manifest entry** is invalid. *(FR-RES-2b)*
- **INV-DM-29** — *(New — Change H)* A `resourceItem.kind` is **one of
  exactly three values** — `"link"`, `"image"`, `"text"`. No fourth value,
  no kind-specific entity split. *(FR-RES-2)*
- **INV-DM-30** — *(New — Change H)* A unit's `resourcesPage` is **exactly
  one** object — not an array, and there is no second resources page anywhere
  in the unit. Extends INV-DM-18's singular-parts clause with its own number,
  the same way INV-DM-24 gives the Unit Assessment its own cardinality
  invariant beyond the general clause (the crib sheet's own page-count
  invariant briefly lived at INV-DM-42 while INV-DM-16 was retired under
  Change AC; Change AF/AD-48 reversed that — the invariant is back at
  **INV-DM-16**, and INV-DM-42 is now the superseded one). *(FR-RES-1)*
- **INV-DM-31** — *(New — Change K)* Every `cribSheet.sections[].half` is
  **one of exactly two values**, `"upper"` or `"lower"` — no third value, and
  no section may be missing one. A section belongs to **exactly one** half;
  it cannot be unassigned and cannot appear in both. The same two-value
  discipline INV-DM-22 already enforces for `coverage[].coverage`, applied to
  a layout property instead of a coverage strength. *(FR-CS-8, FR-CS-9,
  AD-29)*
- **INV-DM-32** — *(New — Change L)* A unit's lesson `number`s are **unique**
  within the unit and **contiguous from 1** — a unit whose lessons are
  numbered 1, 2, 5 is invalid, not merely unusual (the same "invalid, not
  unusual" standard INV-DM-18 sets for cardinality, applied here to ordering).
  Reordering a lesson **renumbers every affected lesson** so both properties
  hold after the move; Luke never hand-edits a number to close a gap or break
  a tie. *(FR-LP-15, AD-31)*
- **INV-DM-33** — *(New — Change N)* A `TierPage` is **empty** — and its page
  is not emitted (FR-LP-7, FR-LP-7a) — exactly when `material`, `studentTask`
  and `workspaceLines` are all unset or blank **and** `imageRefs[]` is empty.
  Any one of those four being non-blank/non-empty makes the tier
  **non-empty**, and its page prints. This is a **rendering-time** test over
  a `TierPage`'s content; it never mutates or removes the tier's key from
  `Lesson.tiers`, which always carries all three (INV-DM-1, INV-DM-25) — an
  empty tier is a tier with nothing in it, not a missing tier.
  *(AD-33)*
- **INV-DM-34** — *(New — Change P)* Every **top-level** `BigIdea`
  (`parentId: null`) has a **resolvable `topicId`** — a top-level big idea
  without one is invalid, not incomplete, the same standard INV-DM-15 sets
  for a lesson's `bigIdeaId`. A **sub-big idea** (`parentId` set) carries **no
  `topicId` of its own** — it is not a violation of this invariant, because
  the field does not apply to it; its topic is read through its parent.
  *(FR-TOP-3)*
- **INV-DM-35** — *(New — Change P)* Every `coverage[].nodeId` on a `Topic`
  **resolves** to a real entry in `nodes[]` — the same resolution rule
  INV-DM-21 already enforces for `BigIdea.coverage[]`, applied to the new
  entity. *(FR-TOP-6)*
- **INV-DM-36** — *(New — Change P)* A `Topic`'s `coverage[]` carries **no
  duplicate `nodeId`** — one link per (topic, node) pair, the same rule
  INV-DM-23 already gives `BigIdea.coverage[]`. *(FR-TOP-6)*
- **INV-DM-37** — *(New — Change S)* Every `MiniAssessment` has a
  **resolvable `bigIdeaId`**, independent of `unitAssessment.bigIdeaId` (which
  now binds the final assessment specifically) and of every other mini
  assessment's — the same "invalid, not incomplete" standard INV-DM-15 sets
  for a lesson's binding, applied per mini assessment rather than once for
  the whole `UnitAssessment` document. *(FR-UA-13, AD-37)*
- **INV-DM-38** — *(New — Change U)* For every tier, the sum of every
  **non-overridden** criterion's auto-allocated `maxScore` in that tier
  equals exactly the tier's fixed budget (Pass 50, Intermediate 25, Advanced
  25 — FR-MM-11), with every individual allocation landing on a 0.5
  boundary and no remainder lost. This is achievable for **any** positive
  count of criteria in a tier, because each budget is an integer and the
  allocation algorithm (AD-40) redistributes the exact 0.5-multiple
  remainder rather than dropping it. A tier with **zero** criteria has
  nothing to allocate — its budget is **unallocated**, not silently zero or
  fabricated onto a placeholder criterion (OQ-DM-17).
- **INV-DM-39** — *(New — Change U)* A criterion with `allocationOverridden:
  true` is **excluded** from INV-DM-38's automatic allocation. Its `maxScore`
  is whatever value was typed and stays there until changed again by hand.
  When a tier contains both overridden and non-overridden criteria, only the
  **non-overridden** ones share the tier's *remaining* budget (the tier's
  fixed budget minus the sum of overridden `maxScore`s in that tier) — which
  may be negative if overrides alone exceed the budget, in which case the
  tier is **unbalanced** (visibly flagged, FR-MM-12a) rather than refused or
  silently clamped.
- **INV-DM-40** — *(New — Change T)* The marking matrix's **scope**
  (full-unit vs per-assessment) is **never stored as duplicate criteria or
  duplicate student data** — a per-assessment view is a computed filter of
  `matrixTemplate.criteria[]` by `assessmentIds[]`, over the same
  `matrices[]` instances the full-unit view already reads. A unit file
  carrying a second, assessment-scoped copy of any criterion or score is
  invalid under the same "singular source of truth" discipline INV-DM-19
  already gives the template/instance split.
- **INV-DM-41** — *(New — Change Z)* Every `cribSheet.sections[].size` field
  is **one of exactly three values** — `"small"`, `"medium"`, `"large"` —
  or **unset (null)**. An unset field defaults to `"medium"` at render time;
  there is no fourth value. The same three-value discipline INV-DM-22 already
  enforces for `coverage[].coverage`, applied to a visual sizing property
  instead of a coverage strength. *(FR-CS-11)*
- **INV-DM-42** — *(New — Change AC; supersedes retired INV-DM-16; ITSELF
  SUPERSEDED — Change AF/AD-48)* A crib sheet renders to **exactly 1 page —
  never 2, never more.** There is no `pageCount` field (it is removed, §1
  above): the constraint is enforced, not stored. Content that would spill
  onto a second page is flagged at generation and edit time, never silently
  truncated and never silently allowed to spill. This tightens the former "1
  or 2" cap (INV-DM-16) to a fixed single value — the two-half structure
  (INV-DM-31) and its ordering are unaffected; only the page-count ceiling
  and the drawn fold between halves (FR-CS-10) change. *(FR-CS-12, AD-46)*

  > **Superseded — 2026-08-20 (Change AF).** This invariant's "exactly 1
  > page — never 2" constraint is **reversed**. **INV-DM-16** — "a crib
  > sheet's `pageCount` is 1 or 2" — is reinstated and is once again the
  > governing invariant; the `pageCount` field is restored to the schema
  > (§1 above). This INV-DM-42's note on the drawn fold between halves is
  > **unaffected** — the fold stays removed. The text above is left
  > untouched as the historical record of what Change AC decided; see
  > **AD-48** for the full reversal.
- **INV-DM-43** — *(New — Change AH)* `Node.domain` is set **only on `kind:
  strand` nodes** and is **one of exactly two values, or unset** — `"skill"`
  \| `"knowledge"` \| unset. An `outcome` or `task` node never carries its own
  `domain`; its effective domain is **derived** by walking `parentId` to the
  nearest ancestor `strand` node and reading that node's `domain` (unset if
  no ancestor strand has one set, or none exists). `BigIdea`'s glyph set
  (FR-BI-15) is the union of covered nodes' effective domains, walked fresh
  from `coverage[]` — **never stored** on the big idea itself, the same
  "derive, don't duplicate" discipline INV-DM-12 already applies everywhere
  else in this document. *(FR-CUR-13, FR-BI-15, AD-49)*
- **INV-DM-44** — *(New — Change AI)* Every `date` field this change adds
  (`Lesson.date`, `MiniAssessment.date`, `UnitAssessment.finalAssessmentDate`)
  is, when set, a **valid ISO calendar date** (`YYYY-MM-DD`) — no fourth
  format, no free-text date string. Every paired `lessonPeriod` field
  (`Lesson.lessonPeriod`, `MiniAssessment.lessonPeriod`,
  `UnitAssessment.finalAssessmentPeriod`) is **plain free text** with no
  format constraint at all — the same freeform treatment `Lesson.sidebar`
  already gets (AD-36). Both fields on any one item are **independently
  optional**: a date with no period, a period with no date, both, or
  neither are all valid states; **neither is ever derived from the other**.
  The combined Lessons & Topics view's **grouping mode** (by topic, the
  existing default, or by date — FR-TOP-14) is **screen/print view state,
  not stored data** — no `unit.json` field records it, the same "view, not a
  second store" treatment AD-MMB-11 already gives the marking matrix's
  display mode and AD-39 gives its scope axis.

---

## 3. Open questions

- **OQ-DM-1** — Does the real curriculum structure need a `strand` level above
  `outcome`, or does `parentId` alone carry it? *Default:* `parentId` alone,
  with `kind: strand` available. Settled by Q-1 data.
- **OQ-DM-2** — Are `draftScore`s per-tier fixed or per-criterion? *Default:*
  per-criterion, pre-filled from a per-tier default.
- **OQ-DM-3** — May a lesson serve nodes from more than one outcome?
  *Default:* yes — `nodeIds` is an array for this reason. *(Note the deliberate
  asymmetry: many curriculum nodes, exactly one big idea. The curriculum is
  something a lesson is accountable to in several ways at once; the big idea is
  what the lesson is *about*, and a lesson about two things is two lessons.)*
- **OQ-DM-4** — Roster in the unit file, or a separate shared roster file?
  *Default:* in the unit (INV-DM-8 self-containment wins).
- **OQ-DM-5** — May one unit draw on more than one curriculum? *Default:* no
  in v1 — one profile per unit. Deferral, not a wall.
- **OQ-DM-6** — Do curriculum profiles live inside the unit file or in a
  shipped library? *Default:* the profile *used* is stamped into the file; the
  library ships with the tool.
- **OQ-DM-7** — Deleting a node a lesson names: refuse or cascade? *Default:*
  **refuse**, naming the blocking lessons.
- ~~**OQ-DM-8** — How many crib sheets per unit?~~ **Closed in rev 4: exactly
  one**, a singular object (AD-19, INV-DM-18). Luke's cardinality statement
  settled it; an array would invite a second crib sheet nobody wants.
- **OQ-DM-9** — Image filenames: preserve the clipboard's suggestion, or
  generate from the id? *Default:* **generate** (`img-0007.png`) — clipboard
  pastes rarely carry a useful name, and generated names cannot collide.
- **OQ-DM-10** — Should `confidence` also mark *structural* guesses (a node
  whose parent was inferred) separately from *content* guesses? *Default:* one
  flag in v1; split if Q-1 shows the two fail differently.
- **OQ-DM-11** — May an instance override the template's wording for one
  student (a modified task)? *Default:* **no in v1** — an override is a fork,
  and INV-DM-19 forbids it. If real teaching needs it, the right answer is a
  second template, not a per-instance escape hatch.
- ~~**OQ-DM-12** — Does deleting a lesson delete its matrix instances?~~
  **Superseded in rev 5 (Change F):** a matrix instance no longer references a
  lesson at all — `matrix.lessonId` is removed (AD-24) — so deleting a lesson
  has no bearing on any matrix instance. The question this asked no longer
  applies to this schema.
- **OQ-DM-13** — *(New — Change E)* Does an assessment tier page (final or
  mini) need its own shape, or does it reuse `Lesson`'s `TierPage`
  (`material`, `studentTask`, `workspaceLines`, `imageRefs[]`)? *Default:*
  **reuse `TierPage` exactly** — parity with `Lesson` keeps the renderer and
  print CSS shared rather than duplicated (SR-4), and nothing about assessment
  content obviously needs a different shape yet. Revisit if real assessment
  content turns out to need fields a lesson tier page doesn't (e.g. marking
  rubric text distinct from `studentTask`).
- **OQ-DM-14** — *(New — Change F)* Does deleting a mini assessment (or,
  vacuously, the final assessment — INV-DM-24 forbids removing the only one
  without replacing it) touch any `matrices[]` scores already entered against
  its criteria? *Default:* **no** — `scores[]` references `criterionId` on the
  shared `matrixTemplate`, not the assessment; criteria are not deleted
  automatically when an assessment is, so entered scores survive. Deleting a
  criterion, if that is ever exposed as a separate action, is a different
  question and is out of scope here.
- ~~**OQ-DM-15** — How is a topic's "progress through the unit" computed?~~
  **Superseded in rev 10 (Change S).** The derived-from-`number` default below
  was never applied and is retired before it was built: Luke asked instead for
  an explicit, **manually toggled** completion flag per lesson and per
  assessment (`Lesson.completed`, `MiniAssessment.completed`,
  `UnitAssessment.finalAssessmentCompleted`), with a topic's own status
  **derived** from those (FR-TOP-11) — not from lesson numbers at all. A
  teacher marking a lesson "taught" is a real, deliberate action; inferring it
  from where a number sits in a sequence guesses at something the teacher
  should just say. *(Original text, for the record: derived, not stored — a
  topic "complete" once every lesson under its big ideas carries a `number` at
  or before the highest-numbered lesson actually taught so far.)*
- **OQ-DM-16** — *(New — Change Q)* Does the lesson-plan sidebar (`Lesson.sidebar`)
  run down every page of the lesson plan, or live on the front page only?
  *Default:* **front page only** — see AD-36. Keeps FR-LP-17's page-count
  arithmetic untouched and matches Luke's own examples, which read as a
  once-per-lesson note rather than per-tier content.
- ~~**OQ-DM-17** — Should the widget **refuse** to leave the matrix's setup
  phase (or refuse to save) while any tier still has zero criteria, or
  should an incomplete tier simply be **allowed and flagged**?~~ **Closed
  in rev 13: allowed and flagged**, confirming the recorded default exactly
  as written (INV-DM-38 unchanged) — Luke, asked directly: "just get
  flagged." Whether a printed matrix with an unallocated tier carries a
  distinct printed warning of its own, beyond the on-screen flag, remains
  unspecified and is not blocking.
