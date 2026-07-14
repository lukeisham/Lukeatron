---
plan: "family-gifts-project"
context: Personal Productivity
secondary_contexts: [Family]
created: 2026-06-22
status: Completed
major_because: "multi-step + creates a Medium-Term project + modifies Long-Term People records (new group membership)"
project: "PP-03-family-gifts (created on execution)"
skills_used: [!CreatePlan, !ReviewPlan, !Checkpoint]
---

# Plan — Family Gifts Project (Birthdays & Christmas)

## Objective
Create a single "Family Gifts" project that tracks birthday and Christmas presents for the family, unified by a new four-person People group — **"The Hearth"** (Luke, Amy, Evie, Sol) — with Luke added to it.

## Success criteria (measurable)
Satisfies the Personal Productivity charter Definition of Done + Guardrails, plus:
- **One merged project exists** — `Memory/Medium-Term/Projects/PP-03-family-gifts/registry.md`, with its own `documents/` subdir.
- **Covers both occasions** — registry tracks birthday presents (Evie 8 Jun, Sol 24 May, Amy 18 Feb) AND Christmas presents, as dated Next Actions / Events.
- **The group unifies all four** — `The Hearth` is added to the `groups:`/`group:` of EI10, SI12, AI79 **and LI78 (Luke)**, in both `People/_index.yaml` and each person's `.md`. (Verifiable: `grep -rl "The Hearth" Memory/Long-Term/People/` returns the index + 4 person files.)
- Registry frontmatter: `people: [EI10, SI12, AI79]`, `group: "The Hearth"`, owner Luke.
- `_tracking.yaml` has the PP-03 row, status `Active`.

## Resources
- **Memory to read:** `People/_index.yaml`, the four person files (EI10, SI12, AI79, LI78); `Projects/_tracking.yaml`
- **Template:** `System/Templates/ProjectRegistryTemplate.md`
- **Capability skills:** `!Checkpoint` (Step 2 — Long-Term People change)
- **Sub-agents / Scripts / Temp-skills:** none (deterministic edits from a template)

## Grouping convention (the "same group" mechanism)
Uses the **native** People-store group field — no schema extension. "The Hearth" joins the existing `Family`/`Beloved` tags on each member. The single project ties to the group via its `group:` frontmatter field.

## Steps
- [ ] Step 1 — Group name chosen: **The Hearth** (the four of you). Alternates on request: The Nest, The Ishams.
- [ ] Step 2 — Add `The Hearth` to the four members' group lists — `People/_index.yaml` (`groups:`) and each person's `.md` (`group:`): EI10, SI12, AI79, **LI78 (Luke)** [edits: Long-Term People]
  - [ ] !Checkpoint — Long-Term memory change (additive, Luke-requested group tag — no Outbox, no deletion)
- [ ] Step 3 — Create `Projects/PP-03-family-gifts/` with an empty `documents/` subdir
- [ ] Step 4 — Write `registry.md` from `ProjectRegistryTemplate.md`: frontmatter (`id: PP-03`, title "Family Gifts — Birthdays & Christmas", `purpose` specialising the PP North Star, `people: [EI10, SI12, AI79]`, `group: "The Hearth"`, `target` = next occasion, tags `[gifts, birthday, christmas, family]`); Definition of Done inherits PP baseline + "the right gift chosen, sourced/ordered and ready before each date; any purchase clears !Checkpoint"; populate **Next Actions** + **Events** with the four occasions (Amy 18 Feb, Sol 24 May, Evie 8 Jun, Christmas 25 Dec) [template]
- [ ] Step 5 — Add the PP-03 row to `Projects/_tracking.yaml` (status Active) [edits: _tracking.yaml]
- [ ] Step 6 — Verify — single registry exists; `grep -rl "The Hearth" People/` returns index + 4 files; tracking row present; registry covers birthdays + Christmas [pass/fail]

## Final step — Logging (always present)
- [ ] Append one line per skill in `skills_used` to `Memory/Long-Term/Logs/skills.log`, format:
  `[AGENT: !<SkillName>] [<SUCCESS|FAIL>] <one-line outcome> | tokens≈[N]`
