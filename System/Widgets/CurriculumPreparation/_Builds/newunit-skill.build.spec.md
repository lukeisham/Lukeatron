# newunit-skill — Build Spec

| Field | Value |
|---|---|
| **Type** | Build |
| **Date** | 2026-08-23 |
| **Status** | Draft — awaiting Luke's review |
| **Wave** | 1 (foundation — last) |
| **One-liner** | `!NewUnit` — the Skillbank skill (`System/Skillbank/Teaching/`) that asks for a unit's identity, copies `_template/` verbatim, stamps in that identity and the generating template's version, and reports the path. Nothing else. |

---

## 1. Motivation

FR-BND-1 requires a `!NewUnit` skill that stamps a complete, independent
bundle from the template, at a path Luke chooses. AD-18 already names the
skill and its shape ("asks for the unit's identity, copies the template,
substitutes the identity, and reports the path") and files it as the first
Teaching-domain Skillbank entry. This build is that skill's `skill.md`, not a
new design — the generation logic is already settled; this build writes it
down in the form the rest of Lukeatron already uses for a generator skill
(`!BuildParserCartridge`, its closest sibling — SR-6).

It is deliberately **last** in wave 1: "a generator with nothing complete to
copy produces broken bundles" (`_PLAN.md`'s dependency analysis). Every other
wave-1 build must exist and work before this one has anything real to stamp
out.

## 2. Scope

**In scope**
- `System/Skillbank/Teaching/!NewUnit/skill.md`, authored per
  `Template_skill.md`'s frontmatter + ⚡TRIGGER / 🛠️LOGIC / ✅OUTPUT structure —
  the same shape `!BuildParserCartridge` already uses for its own
  clone-and-build recipe.
- A one-line catalog entry in `System/Skillbank/_index.yaml` (name, intent,
  triggers, path) — CLAUDE.md's own rule: "a skill missing from it is
  invisible."
- The skill's logic: ask for the unit's identity, copy `_template/` verbatim
  to the chosen destination, substitute the identity into the copy's
  `unit.json`, stamp `generatedFrom`, restore the launcher's executable bit,
  and report the resulting path.

**Out of scope**
- The template's own folder shape or file content — `bundle-template`'s job;
  this build only copies it.
- Running ingest, or seeding the curriculum in any way — a separate,
  re-runnable step Luke triggers afterward, if `curriculum-ingest` is built
  at all (OQ-15, G-9).
- Any GUI, terminal command, or button — this is a Skillbank agent-recipe
  skill, invoked in chat (`!NewUnit`), like every other Lukeatron skill.
- Editing an already-generated bundle, or migrating one to a newer template
  version — explicitly not v1 (AD-18).
- Validating the entered identity beyond the two fields the schema actually
  needs (OQ-NU-2).

## 3. Requirements

- **FR-NU-1** — A `!NewUnit` skill exists at
  `System/Skillbank/Teaching/!NewUnit/skill.md`, the first Teaching-domain
  Skillbank entry, cataloged in `System/Skillbank/_index.yaml` with its
  triggers and path. *(FR-BND-1, AD-18)*
- **FR-NU-2** — Asks Luke for the unit's identity — at minimum subject,
  level, unit name, teacher, and the destination path — before copying
  anything. *(datamodel §1's `Unit.meta`)*
- **FR-NU-3** — Copies `_template/` verbatim to the chosen destination,
  preserving every file and folder `bundle-template` ships, including empty
  ones (`images/`, `_ingest/`, `tests/`). *(FR-BND-1, FR-BND-2)*
- **FR-NU-4** — Substitutes the identity fields into the copied `unit.json`'s
  `meta` object and **nowhere else** — no other file in the copy is
  rewritten.
- **FR-NU-5** — Stamps `generatedFrom` with the template's own version
  identifier at the moment of copying — never left blank, never guessed.
  *(FR-BND-7, OQ-16)*
- **FR-NU-6** — Restores the executable bit on `Start Unit.command` in the
  copy, since a plain file copy can lose it — closing a gap that has nothing
  to do with the template's own correctness.
- **FR-NU-7** — Creates an **empty** unit; runs no ingest step of any kind.
  Ingest, if built at all, is invoked separately and later, by Luke's own
  action. *(OQ-15, SR-1)*
- **FR-NU-8** — Reports the generated bundle's absolute path back to Luke on
  completion, and nothing else — no auto-launch, no auto-open. *(FR-SYS-7)*
- **FR-NU-9** — Refuses to write into a destination that already exists and
  is non-empty, naming the conflict rather than silently overwriting or
  merging into it.
- **FR-NU-10** — Works for a destination path **outside** `_Lukeatron/`
  entirely — AD-18 states a bundle "lives anywhere"; this skill must not
  assume it is writing inside the repo. *(FR-BND-5)*
- **FR-NU-11** — The template's version identifier lives in a single-line,
  date-stamped `_template/VERSION` file (e.g. `2026-08-23`), bumped by hand
  whenever `bundle-template`'s tree changes; FR-NU-5 copies this string
  forward verbatim into `generatedFrom` (resolves `OQ-NU-1`).
- **FR-NU-12** — Refuses to proceed if the entered unit name or the
  destination path is blank, naming the missing field; accepts everything
  else Luke enters as free text with no further validation (resolves
  `OQ-NU-2`).

**Acceptance criteria**

- **AC-NU-1** — Running `!NewUnit` with a subject, level, unit name, teacher
  and destination produces a bundle matching `_template/`'s tree exactly,
  `unit.json`'s `meta` fields filled with what was entered, and every other
  file byte-identical to the template.
- **AC-NU-2** — `generatedFrom` in the new bundle's `unit.json` matches the
  template's current version identifier exactly.
- **AC-NU-3** — `Start Unit.command` in the generated bundle is executable
  with no manual `chmod` needed.
- **AC-NU-4** — Running `!NewUnit` a second time against the same destination
  is refused, naming the existing path, with nothing written or overwritten.
- **AC-NU-5** — The generated unit is empty and un-ingested — `nodes[]` is
  `[]`, no `_ingest/` content is consumed, no ingest log appears.
- **AC-NU-6** — Running `!NewUnit` with a destination outside `_Lukeatron/`
  (e.g. `/tmp/a b c/Some Unit/`) succeeds identically to one inside it.
- **AC-NU-7** — The skill's `_index.yaml` entry matches CLAUDE.md's Skillbank
  format, and its triggers fire on `!NewUnit`-style and "new unit"-style
  phrasing.

## 4. Prerequisites & dependencies

- **Required first:** all of wave 1 — `bundle-template` (the tree to copy),
  `bundle-server` (so a generated bundle actually starts), `style-guide` (so
  it carries real tokens, not an empty slot), `document-shell` and
  `local-store` (so it actually renders and saves). Per `_PLAN.md`'s
  order-of-work: `newunit-skill`'s only prerequisite row is "all of wave 1."
- **Choose-one:** OQ-15 (empty vs. seeded bundle) — already closed, empty.
  OQ-16 (record template version) — already closed, yes.
- **Coordinate-with:** `curriculum-ingest` (wave 2, possibly dropped by
  G-9) — `!NewUnit` never calls it (FR-NU-7), so this build has nothing to
  lose if ingest is dropped. `Template_skill.md` and `!BuildParserCartridge`
  — the closest sibling generator skill (SR-6); read it before authoring this
  skill's LOGIC section.

**Gate:** work may start once every other wave-1 build is complete and
verified — not before.

## 5. Decisions

- **AD-NU-1** — *Decision:* `!NewUnit` is a Skillbank `skill.md`
  (agent-executed recipe), not a standalone script. *Rationale:* matches the
  house pattern — every other Lukeatron generator (`!BuildParserCartridge`)
  is a Skillbank entry the agent reads and follows, not a CLI tool Luke runs
  by hand; keeps the copy-and-substitute logic auditable in prose rather than
  buried in an undocumented script (SR-7). *Rejected:* a Python
  `new_unit.py` Luke runs from a terminal — adds a second invocation surface
  for the same action, when Lukeatron's whole model is chat-first.
- **AD-NU-2** — *Decision:* only `unit.json`'s `meta` object (plus
  `generatedFrom`) is substituted; every other file in the copy is untouched.
  *Rationale:* mirrors `style-guide`'s own "fixed project-wide" discipline —
  a template rewritten file-by-file during generation is a template no one
  can diff against its source. *Rejected:* templating every file with
  placeholder tokens — no other file needs the identity, and it would leave
  `_template/`'s own files non-functional as-is, a real risk if someone opens
  the template directly to check it.
- **AD-NU-3** — *Decision:* a destination-exists conflict is a **hard
  refusal**, never a merge or overwrite. *Rationale:* CLAUDE.md's Failure
  Handling table — "fail closed" — applied to the one genuinely destructive
  path this skill could take. *Rejected:* merging into an existing folder —
  undefined the moment that folder isn't itself a stale `!NewUnit` output.

**Open questions**

- **OQ-NU-1** — ✅ **RESOLVED (2026-08-29).** How is the template's own
  version identifier represented, for FR-NU-5 to copy forward? *Resolved:*
  a single-line `_template/VERSION` file (a date-stamped string, e.g.
  `2026-08-23`), bumped by hand whenever `bundle-template`'s tree changes —
  cheap, diffable, and matches this project's own date-stamped revision
  convention rather than inventing a semver scheme nobody else here uses.
  Spec'd as new **FR-NU-11**.
- **OQ-NU-2** — ✅ **RESOLVED (2026-08-29).** Does the skill validate the
  entered identity, or accept whatever Luke types? *Resolved:* refuse a
  blank unit name and a blank destination — the two fields the rest of the
  schema and the filesystem actually depend on — and accept everything
  else as free text, matching this project's general best-effort ethos
  (FR-CUR-1a) rather than building a validation layer this one-shot skill
  doesn't need. Spec'd as new **FR-NU-12**.

## 6. Risks

| Risk | Consequence | Mitigation | Proving test |
|---|---|---|---|
| Copying the template before wave 1 is fully verified | `!NewUnit` ships bundles that don't actually start or save, and the first thing Luke does with the finished tool is watch it fail | Gate: work starts only once every wave-1 build is verified (§4) | AC-NU-1, combined with AC-BND-1 one layer up |
| A file copy silently drops the executable bit on `Start Unit.command` | The generated bundle looks complete but the launcher does nothing, with no error to explain why | FR-NU-6 — explicit restore step after copy | AC-NU-3 |
| The skill rewrites more than `unit.json`'s `meta` | The template stops being verbatim-diffable against a generated bundle, and a future template fix can't be told apart from generation-time drift | AD-NU-2 — substitution scoped to one file, one object | AC-NU-1 |
| A second run against the same destination silently overwrites work already done there | Luke loses edits with no warning — the single worst failure class this project names (mirrors `bundle-server`'s AD-BS-3 rationale one layer up) | FR-NU-9, AD-NU-3 — hard refusal, named conflict | AC-NU-4 |
| The skill is invisible because its catalog entry was never added | Luke asks for a new unit and the agent doesn't know the skill exists | FR-NU-1's explicit `_index.yaml` requirement | AC-NU-7 |

## 7. Plan

Not yet written — `newunit-skill.plan.md` is the next step once this spec is
reviewed, following the same spec-then-plan discipline as every other build
in this project (matching `style-guide`'s own convention).

## 8. Verification — definition of done

- [ ] All acceptance criteria AC-NU-1…7 demonstrated
- [ ] `!NewUnit`'s catalog entry present and correctly triggered
- [ ] Gate honoured — every other wave-1 build verified before this one
      starts
- [ ] No file outside `unit.json`'s `meta`/`generatedFrom` differs from the
      template in a generated bundle
- [ ] A destination-exists conflict is refused, never merged or overwritten

**On completion:** set Status to Done, `git mv` this spec and its plan to
[`_Done/`](_Done/), update [`_PLAN.md`](_PLAN.md), and re-check
[the project prerequisites gate](../_Spikes/CurriculumPreparation/CurriculumPreparation.prerequisites.spec.md).
