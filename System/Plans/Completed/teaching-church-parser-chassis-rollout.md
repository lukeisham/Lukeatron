---
plan: "teaching-church-parser-chassis-rollout"
context: Teaching
secondary_contexts: [Church]
created: 2026-07-06
status: Completed
major_because: "multi-step, multi-domain, modifies Long-Term memory, creates/repurposes Medium-Term projects"
project: ""
skills_used: ["!ReviewPlan"]
---

# Plan — Chassis Rollout: 12 Parser Apps (Teaching + Church)

## Objective
Give each of 12 subject stores (7 Teaching, 5 Church) a cloned Grammar-chassis draft app folder plus an associated app-building project with the standard 3-task structure, so every aide is ready for its own content build and cartridge work.

## Success criteria (measurable)
- Each of the 12 stores (`Style`, `Rhetoric`, `Logic`, `Interpretation`, `Story-tension`, `Tropes & symbols`, `Fact-checking`, `Systematic Theology`, `Biblical Theology`, `Greek and Hebrew`, `Biblical symbols and cross-references`, `Biblical Commentary`) has a `build/` folder containing a renamed clone of `Grammar/build/template.html`, `build_parser.py`, `build_lexicon.py`, and `README.md`.
- Each `build/` folder also holds a starter `<Aide>_content.md` stub (draft content file, sitting alongside the chassis clone), seeded from any existing raw material already in that store.
- 4 existing Teaching projects (`TE-02` Rhetoric, `TE-03` Interpretation, `TE-04` Logic, `TE-05` Style) have their registries repurposed: title/purpose aligned to the chassis pattern, old placeholder Next Actions replaced with exactly 3 tasks (confirm chassis in place · build content data · finish build app).
- 3 new Teaching projects created (`TE-06` Story-tension, `TE-07` Tropes & symbols, `TE-08` Fact-checking) with the same 3-task structure.
- 5 new Church projects created (`CH-11` Systematic Theology, `CH-12` Biblical Theology, `CH-13` Greek and Hebrew, `CH-14` Biblical symbols and cross-references, `CH-15` Biblical Commentary) with the same 3-task structure.
- `Memory/Medium-Term/Projects/_tracking.yaml` has one row per new/repurposed project, correctly coloured.
- `Memory/Long-Term/Lukeatron/memory-structure.md` unaffected (no change needed — stores already listed from the prior turn).

## Resources
- **Memory to read:** `Memory/Long-Term/Grammar/build/` (chassis source), `Memory/Long-Term/Grammar/Specs/GrammarParser.spec.md`, `System/Suggestions/Parser_guide.md`, `Memory/Long-Term/Rhetoric/rhetoric_schema.map.md`, `Memory/Long-Term/Logic/Fallacies|Syllogisms and Fallacies Database|Ways of Thinking`, `Memory/Long-Term/Bible/CalvinCommentaries|Clarke|DTN|KingComments|RWP|Scofield` (raw material for Biblical Commentary)
- **Capability skills:** none (no outgoing content, no email/calendar)
- **Domain skills (Skillbank):** none
- **Sub-agents:** none — mechanical file cloning + registry templating, no judgement calls needed for this pass
- **Scripts:** none (plain file copy/rename operations)
- **Temp-skills:** none

## Steps

### A — Chassis clone (mechanical, all 12 stores)
- [x] Step A1 — For each of the 12 stores, created `Memory/Long-Term/<Store>/build/`, cloned `Grammar/build/template.html`, `build_parser.py`, `build_lexicon.py`, `README.md` (kept unprefixed filenames matching Grammar's own convention, not `<Aide>_template.html` — the folder namespace already disambiguates); prepended an adaptation banner to each README noting it still describes Grammar's build recipe verbatim and needs adapting as the "confirm chassis" task [runs: file copy]
- [x] Step A2 — Seeded a starter `<Aide>_content.md` in each store's `build/` folder alongside the chassis clone: Rhetoric/Logic point to their existing raw material (`rhetoric_schema.map.md`; `Fallacies/`, `Syllogisms and Fallacies Database/`, `Ways of Thinking/`), Biblical Commentary points to `Bible/`'s existing commentary databases, all other 9 stores got a TODO stub per Parser_guide.md §5a [reads: Parser_guide.md §5a]
- [x] Verify — confirmed via `ls` that all 12 `build/` folders contain exactly 5 files (4 chassis + 1 content stub) [pass]

### B — Teaching-context projects
- [x] Step B1 — Repurposed `TE-02`, `TE-03`, `TE-04`, `TE-05` registries: purpose/title updated to the chassis pattern, placeholder Next Actions replaced with the 3-task structure, Decision Log entries appended
- [x] Step B2 — Created `TE-06-story-tension-app`, `TE-07-tropes-symbols-app`, `TE-08-fact-checking-app` (registry.md + notes.md + documents/), same 3-task structure
- [x] Step B3 — Added TE-06/07/08 rows to `_tracking.yaml` (TE-02/03/04/05 rows needed no changes — already dated 2026-07-06)
- [x] Test in Sandbox — N/A, registry/tracking edits are direct Markdown/YAML, no script to test

### C — Church-context projects
- [x] Step C1 — Created `CH-11-systematic-theology-app` (scoped to Systematics, Ordo Salutis, doctrine-frequency, doctrines of grace per Luke's brief), `CH-12-biblical-theology-app`, `CH-13-greek-and-hebrew-app`, `CH-14-biblical-symbols-cross-references-app`, `CH-15-biblical-commentary-app` (registry.md + notes.md + documents/ each), same 3-task structure
- [x] Step C2 — Added CH-11..15 rows to `_tracking.yaml` (validated: `python3 -c "import yaml..."` parses clean, 37 total project rows)
- [x] !Checkpoint — confirmed pure Long-Term/Medium-Term internal addition; nothing left the system, nothing archived/deleted, no Outbox/email/calendar touched. `!OutgoingContentCheck` and `!ArchiveMemory` correctly not triggered.

### D — Close
- [x] Verify — all Success criteria lines confirmed met (12 build/ folders, 4 repurposed + 8 new projects with the 3-task structure, tracking.yaml updated and valid); note one deviation from the original Success criteria wording: chassis filenames were kept unprefixed (`template.html` not `<Aide>_template.html`) to match Grammar's own convention — functionally equivalent, flagged here for transparency [pass]

## Final step — Logging (always present)
- [x] Logged to `Memory/Long-Term/Logs/skills.log`:
  `[AGENT: !ReviewPlan] [SUCCESS] plan=teaching-church-parser-chassis-rollout verdict=approved flags=1-resolved-inline | tokens≈[12000]`

## Final step — Close out (always present)
- [x] Updated `status: Completed` in this plan's frontmatter.
- [x] Appended an entry to `Memory/Long-Term/Logs/completed-plans.log`.
- [x] Moved the file from `System/Plans/New/` to `System/Plans/Completed/`.
