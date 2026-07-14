---
plan: "sermon-prep-sources"
context: Church
secondary_contexts: []
created: 2026-07-05
status: Completed
major_because: "modifies Long-Term memory (new Preaching/Sources.md) + edits a protected template"
project: ""
skills_used: ["!CreatePlan", "!ReviewPlan", "!Checkpoint"]
---

# Plan — Sermon Prep Sources File

## Objective
Give sermon prep a living, curated source list — `Memory/Long-Term/Preaching/Sources.md`, seeded and mandatory in the prep flow — so every exegetical document is built from trusted lexical, commentary, journal, and historical sources (specialises the Church North Star: faithful to the text, ready in time).

## Success criteria (measurable)
- `Memory/Long-Term/Preaching/Sources.md` exists with sections: Lexical/Original Languages · Commentaries · Journals · History/Background · Blacklist; every entry has URL, access note (free/paywalled), and a priority note.
- The file header instructs the agent: consulting this file is a **requirement** of sermon prep, and newly-found good sources are appended during searches (additions are Long-Term writes → `!Checkpoint`).
- `Template_SermonPrep.md` requires consulting Sources.md (one instruction line added — Luke's sign-off given in Improvements.md row + 2026-07-05 instruction).
- `Preaching/_index.yaml` lists Sources.md.
- Charter baseline held: exegesis-only scope untouched; MLA citation rules unchanged; nothing congregation-facing leaves the system (no `!OutgoingContentCheck` needed).

## Resources
- **Memory to read:** `Memory/Long-Term/Preaching/` (store + `_The_Preaching_process.notes.md`), `System/Templates/Template_SermonPrep.md`, `Memory/Long-Term/Preferences/` (approved domains)
- **Capability skills:** none for seeding (starter list from agent knowledge, marked for Luke's trim); `!HeadlessChromeBrowser` in future use, not this plan
- **Domain skills (Skillbank):** none
- **Sub-agents:** none
- **Scripts:** none
- **Temp-skills:** none

## Steps
- [x] Step 1 — Read `Preaching/` store + `Template_SermonPrep.md` + `Preferences/` approved domains [reads: memory]
- [x] Step 2 — Draft seeded `Sources.md` in `System/Sandbox/` — sections, entry schema, agent instructions (mandatory consult + append-during-search + blacklist) [inline]
- [x] Step 3 — Write the draft to `Memory/Long-Term/Preaching/Sources.md`
  - [x] !Checkpoint — Long-Term write (Luke pre-authorised seeding on 2026-07-05; he trims after first searches)
- [x] Step 4 — Add the "consult Sources.md (required)" instruction line to `Template_SermonPrep.md` [inline — protected template, explicit sign-off recorded in Improvements.md]
- [x] Step 5 — Add Sources.md entry to `Preaching/_index.yaml` [inline]
- [x] Verify — outputs meet every line in **Success criteria**, and the result matches the **Objective**? [pass]

## Final step — Logging (always present)
- [x] Append one line per skill in `skills_used` to `Memory/Long-Term/Logs/skills.log`, format:
  `[AGENT: !<SkillName>] [<SUCCESS|FAIL>] <one-line outcome> | tokens≈[N]`

## Final step — Close out (always present)
- [x] Update `status: Completed` in this plan's frontmatter, then move the file from `System/Plans/New/` to `System/Plans/Completed/`.
