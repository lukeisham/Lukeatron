# bundle-template — Build Spec

| Field | Value |
|---|---|
| **Type** | Build |
| **Date** | 2026-08-23 |
| **Status** | Draft — awaiting Luke's review |
| **Wave** | 1 (foundation — first) |
| **One-liner** | The literal folder skeleton every unit bundle is stamped from — AD-18's tree, made real on disk once, at `_template/` — with a schema-valid `unit.json`, a working launcher, and empty slots every other wave-1 build fills. |

---

## 1. Motivation

Nothing else in this project can be built until there is a skeleton to build
*into*. `bundle-server` needs an `app/` folder and a `unit.json` slot to
serve; `style-guide` needs somewhere inside the tree to place its two files;
`document-shell` and `local-store` need `app/js/` and `app/css/` to exist.
AD-18 already settled the tree's shape — this build is the literal creation
of it, once, not a new design decision. It is named first in every ordering
this project keeps: `_PLAN.md`'s order-of-work table, and the prerequisites
spec's row 4 ("every other wave-1 build fills a slot in it").

## 2. Scope

**In scope**
- The `_template/` folder itself, living at
  `System/Widgets/CurriculumPreparation/_template/` (OQ-17's default) —
  sorted alongside `_Builds/`, `_Mockups/` and `_Spikes/`, not a fifth
  Lukeatron-root folder.
- Every top-level entry AD-18's tree names: `Start Unit.command`,
  `unit.json`, `images/`, `_ingest/`, `app/` (with `js/` and `css/`
  subfolders), `StyleGuide/`, `tests/`, `README.md`, `VERSION` (nine entries
  per the 2026-08-29 amendment, AD-BT-4). No entry outside this list.
- A schema-valid **skeleton** `unit.json` — every field a fresh, un-ingested
  unit must carry, correctly typed and correctly empty.
- A real, working `Start Unit.command` launcher, matching the existing
  Lukeatron viewers' convention (SR-6).
- A `README.md` skeleton carrying the section headings SR-7 requires, each
  naming which later build populates it.
- An empty `tests/` folder, mirroring the source tree `unittest` will one day
  fill (FR-BND-10, TEST-3).

**Out of scope**
- `serve.py` and `ingest.py`'s actual content — `bundle-server`'s and
  `curriculum-ingest`'s jobs respectively. This build reserves their
  filenames' place in the tree only insofar as the tree itself has a slot for
  them; it writes neither file.
- `variables.css`, `styleguide.html`, and anything under `StyleGuide/` —
  `style-guide`'s job. This build creates the empty `StyleGuide/` folder and
  the `app/css/` folder; it writes no file inside either.
- `index.html` and anything under `app/js/` — `document-shell` and
  `local-store`'s job.
- Any stub, placeholder, or "coming soon" file for anything listed above —
  see AD-BT-1.
- Ingest, rendering, layout, or any document logic of any kind.
- Migrating an already-generated bundle to a newer template version —
  explicitly not v1 (AD-18).

## 3. Requirements

- **FR-BT-1** — Creates `_template/` containing exactly the top-level
  structure AD-18 specifies: `Start Unit.command`, `unit.json`, `images/`,
  `_ingest/`, `app/{js/,css/}`, `StyleGuide/`, `tests/`, `README.md`,
  `VERSION`. No extra top-level folder or file. *(FR-BND-2; nine entries per
  the 2026-08-29 amendment below — see FR-BT-8.)*
- **FR-BT-2** — `unit.json` ships as a schema-valid skeleton: `schemaVersion`
  set (INV-DM-9); `generatedFrom` present, empty until stamped by
  `newunit-skill` (FR-BND-7); `curriculum` present but unset pending ingest;
  every singular object (`cribSheet`, `unitAssessment`, `resourcesPage`,
  `matrixTemplate`) present in its minimal valid empty form (INV-DM-18);
  every array field (`nodes[]`, `topics[]`, `bigIdeas[]`, `lessons[]`,
  `matrices[]`, `students[]`, `images[]`) present as `[]`.
- **FR-BT-3** — `Start Unit.command` is a real, working double-click
  launcher — resolves its own folder, then runs `python3 serve.py` — matching
  the existing Lukeatron viewers' launcher convention (SR-6) in structure. It
  does not implement `serve.py`; it only calls it.
- **FR-BT-4** — `README.md` ships with the section headings SR-7 requires
  (architecture, navigation, life-cycle) and a one-line note under each
  naming which build populates it, so later builds extend the file rather
  than restructure it. *(FR-BND-8)*
- **FR-BT-5** — `tests/` ships as an empty folder mirroring the intended
  source tree (`app/js/`, `serve.py`, `ingest.py`) — ready for `unittest`
  files per FR-BND-10/TEST-3. This build adds no test file of its own; each
  owning build adds its own beside its own source.
- **FR-BT-6** — Every file another build owns (`serve.py`, `ingest.py`,
  `index.html`, everything under `app/js/`, `app/css/variables.css`,
  everything under `StyleGuide/`) is left for that build to create directly
  inside the already-existing folder. This build creates no placeholder,
  stub, or partial version of any of them.
- **FR-BT-7** — Nothing in the template names a curriculum, a jurisdiction,
  or any curriculum-specific vocabulary — in a field, a filename, or a
  default value. *(INV-DM-10)*
- **FR-BT-8** — No later build adds a new top-level folder to the tree
  without amending this spec first — the prerequisites spec's own rule
  ("`bundle-template` owns the folder layout... none invents a top-level
  folder without amending it"), restated here as this build's own
  requirement rather than left only as a project-level convention.

**Acceptance criteria**

- **AC-BT-1** — `_template/` matches AD-18's tree exactly, folder for
  folder, with no extra or missing top-level entry — nine entries per the
  2026-08-29 amendment (`Start Unit.command`, `unit.json`, `images/`,
  `_ingest/`, `app/{js/,css/}`, `StyleGuide/`, `tests/`, `README.md`,
  `VERSION`).
- **AC-BT-2** — `unit.json` in the template validates field-by-field against
  INV-DM-9 and INV-DM-18 — checked by `local-store`'s own validator once it
  exists, or by hand against those invariants before then.
- **AC-BT-3** — `Start Unit.command` is executable (`chmod +x` already set)
  and its one working line resolves correctly from any directory the bundle
  is later copied to, anchored to its own location rather than the working
  directory it's launched from — the same discipline PY-5 states for Python,
  applied here in shell.
- **AC-BT-4** — Grepping the template for any curriculum-specific string (a
  jurisdiction name, a `vcaaCode`-shaped field) returns nothing.
- **AC-BT-5** — `README.md` carries every section heading SR-7 requires, each
  with a one-line note naming the build that populates it.
- **AC-BT-6** — No file exists anywhere in the template for anything FR-BT-6
  names as another build's — confirmed by listing the tree and checking each
  entry against that list.

## 4. Prerequisites & dependencies

- **Required first:** none — this is the very first build in the project
  (order-of-work row 1). Only the already-closed decision gates (AD-18's
  tree, the schema freeze) and the fixture unit's existence need to be true,
  both already the case.
- **Choose-one:** OQ-17 (template location) — resolved by its own default,
  `_template/` at the widget's root.
- **Coordinate-with:** every other wave-1 build (`bundle-server`,
  `style-guide`, `document-shell`, `local-store`) — each fills a slot in this
  tree and must not invent a new top-level folder without amending this spec
  first (prerequisites spec §4). `newunit-skill` — the last wave-1 build and
  this template's only consumer; its copy-and-substitute logic depends on
  this tree's exact shape being frozen before it is written.

**Gate:** work may start immediately.

## 5. Decisions

- **AD-BT-1** — *Decision:* this build creates only the files no other build
  claims (`Start Unit.command`, `README.md` skeleton, `unit.json` skeleton,
  the folder tree itself); every file another build owns is left for that
  build to create directly, never stubbed here first. *Rationale:* SR-1's
  "one file, one job" applies to authorship, not only content — a stub this
  build writes and another later overwrites is two authors for one file, and
  the seam between "stub" and "real" is exactly where a half-finished
  handoff hides. *Rejected:* pre-creating placeholder files for `serve.py`,
  `ingest.py`, `index.html`, `variables.css` — reads as more finished than it
  is, and risks a later build "fixing" a stub instead of replacing it
  wholesale.
- **AD-BT-2** — *Decision:* `unit.json`'s skeleton ships with `nodes: []` —
  a valid, un-ingested state — rather than a fabricated placeholder root
  node. *Rationale:* OQ-15 already decided `!NewUnit` creates an empty
  bundle, with ingest a separate later step; a fabricated root would be
  exactly the kind of thing a teacher has to notice and delete before doing
  real work. See OQ-BT-1 for how this reads against INV-DM-3.
- **AD-BT-3** — *Decision:* the template lives at
  `System/Widgets/CurriculumPreparation/_template/`, not a fifth
  Lukeatron-root folder (OQ-17's default). *Rationale:* matches this
  project's own existing `_Builds/`, `_Mockups/`, `_Spikes/` convention — it
  sorts alongside them and stays scoped to this one project's directory.
  *Rejected:* a `System/Widgets/_template/` shared across future widget
  projects — no other widget suite shares this bundle-generator pattern yet,
  and inventing a shared location for one consumer is premature.

- **AD-BT-4** — *Amendment (2026-08-29).* `_template/VERSION` is added as a
  ninth top-level entry to AD-18's tree and to FR-BT-1/AC-BT-1 above. A
  single-line, date-stamped file (e.g. `2026-08-29`) sourcing the
  `generatedFrom` stamp `newunit-skill` writes into a bundle's `unit.json` at
  creation time (`newunit-skill.build.spec.md` FR-NU-7 and its "single-line
  `_template/VERSION` file" language). *Rationale:* `newunit-skill` needed a
  single source of truth for "which template version was this bundle stamped
  from" that lives in the template itself rather than being hand-maintained
  in two places; a file is simpler and less error-prone than embedding the
  version as a literal string inside `newunit-skill`'s own logic, and keeps
  the version bump a one-line edit at the template's root. Luke's decision:
  keep `VERSION` and amend this spec, rather than remove the file to hold the
  tree at eight entries — recorded per FR-BT-8's own rule that no later build
  may add a top-level entry without amending this spec first. *Consumer:*
  `newunit-skill` reads `_template/VERSION` at bundle-creation time and
  copies its contents verbatim into the new bundle's `unit.json.generatedFrom`
  field; the template's own copy is never mutated by that read.

**Open questions**

- **OQ-BT-1** — Does INV-DM-3's "exactly one root, no cycles" apply to an
  un-ingested, empty `nodes[]`? ✅ **RESOLVED (2026-08-29).** No — zero
  nodes is a valid pre-ingest state; the invariant binds once the first
  node is added, by ingest or by hand. `local-store`'s validator (wave 1)
  is where this reading gets enforced; recorded here so that build doesn't
  have to rediscover it.
- **OQ-BT-2** — Does `README.md`'s skeleton need placeholder prose per
  section, or just the headings? ✅ **RESOLVED (2026-08-29).** Headings
  plus a one-line pointer to the build that owns each ("## Server — see
  `bundle-server.build.spec.md`"). No placeholder prose — cheap, and stops
  a later build from inventing its own heading wording.

## 6. Risks

| Risk | Consequence | Mitigation | Proving test |
|---|---|---|---|
| A later wave-1 build invents a new top-level folder instead of amending this spec | The tree drifts from AD-18 silently, and `!NewUnit` stamps an inconsistent bundle | FR-BT-8, plus the prerequisites spec's own explicit rule; every later build's §4 names `bundle-template` as required-first | AC-BT-1 |
| The `unit.json` skeleton omits a required singular object or array field | Every consumer has to null-check a field that should always exist, scattering defensive code across the project | FR-BT-2, checked field-by-field against INV-DM-9/18 | AC-BT-2 |
| `Start Unit.command` hardcodes an absolute path or relies on the working directory | The bundle fails to launch after being moved or copied — the exact failure AD-18/FR-BND-5 exist to prevent | Anchored to the script's own location (FR-BT-3) | AC-BT-3, and AC-BND-2 one layer up |
| A stub file this build writes gets "fixed" instead of replaced by its owning build | Two authors, one file — the stub's assumptions quietly survive into the real implementation | AD-BT-1 — no stub is written for anything another build owns | AC-BT-6 |

## 7. Plan

Not yet written — `bundle-template.plan.md` is the next step once this spec
is reviewed, following the same spec-then-plan discipline as every other
build in this project (matching `style-guide`'s own convention).

## 8. Verification — definition of done

- [ ] All acceptance criteria AC-BT-1…6 demonstrated
- [ ] Tree matches AD-18 exactly, no top-level drift
- [ ] `unit.json` skeleton passes a hand-check against INV-DM-9/18 (or
      `local-store`'s validator, once built)
- [ ] No curriculum-specific string anywhere in the template (INV-DM-10)
- [ ] No stub or placeholder file exists for anything another build owns
      (AD-BT-1)

**On completion:** set Status to Done, `git mv` this spec and its plan to
[`_Done/`](_Done/), update [`_PLAN.md`](_PLAN.md), and re-check
[the project prerequisites gate](../_Spikes/CurriculumPreparation/CurriculumPreparation.prerequisites.spec.md).
