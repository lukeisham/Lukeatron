---
plan: "grammarframe-notes-verbatim"
context: Teaching
secondary_contexts: []
created: 2026-09-26
status: Completed
major_because: "multi-step | modifies Long-Term memory (Memory/Long-Term/Grammar/*.html)"
project: ""
skills_used: [!DetermineContext, !CreatePlan, !ReviewPlan, !GrammarFrame, !Checkpoint]
---

# Plan — NOTEs are Luke's verbatim words, nothing added

## Objective
Advance the grammar tool by making every NOTE in the guides a verbatim quote of Luke's own words from
`Original_Content.md`, with no label, caveat or joiner of the skill's own added, and by making the
validator able to check that against the source.

Luke's ruling (2026-09-26, chat): a NOTE "labeled and formatted in that way should be my verbatim
quotes without additions. They can be verified against the original source material."
Reading of it: the `NOTE —` label and note formatting stay; the words after the label are only Luke's.
Verbatim = each line occurs in one source line after removing only Markdown `**` bold marks, layout
whitespace and one wrapping pair of square brackets. Multi-line notes render one source line per line.

## Success criteria (measurable)
- Both guides: the two existing notes lose "This is a working judgement, not a sourced rule." and "Luke's analysis, kept intact:"; note 2's `·` joiners become line breaks. No other text changes.
- `validate.py check` gains criterion C37: every `.gf-note` line is found in `Original_Content.md` under the rule above; a unit test proves an added sentence fails it; all tests pass; `check` exits 0.
- `criteria.md` (E3 Q2, new C37), `markup.md`, `fleet.md` (AUTHOR `notes` field), `skill.md` and `render.py` say and do the same. Changelog 3.10.0.
- Charter: no new content, offline, open-source only, unaffected.

## Resources
- **Memory to read:** Memory/Long-Term/Grammar/ (both guides, Original_Content.md, `_run/drafts/*.json`, `_run/render.py`)
- **Capability skills:** none
- **Domain skills (Skillbank):** !GrammarFrame (spec owner)
- **Sub-agents:** none
- **Scripts:** in-place edit by a short one-off script in `_run/` (working area, per the 🔐 permission)
- **Temp-skills:** none

## Steps
- [x] Step 1 — Back up both guides and the two drafts JSON to `_run/rollback/2026-09-26-notes-verbatim/` [script: cp]
- [x] Step 2 — Edit the two notes in both guides in place, and the matching `notes` in `_run/drafts/verbs.json` and `auxiliary-verbs.json` [script]
  - [x] Test — before writing, dry-run the edit on copies; confirm only the note paragraphs differ
- [x] Step 3 — `render.py`: a `\n` inside a note renders as `<br>` [edit]
- [x] Step 4 — Add C37 to `validate.py` and a failing-case unit test [edit + test]
- [x] Step 5 — Amend spec: `criteria.md` E3 Q2 + C37, `markup.md`, `fleet.md`, `skill.md`, changelog 3.10.0 [edit]
  - [x] !Checkpoint — Long-Term memory changes (Memory/Long-Term/Grammar/*.html)
- [x] Step 6 — Run `unittest` and `validate.py check`; run `check` on the backup to see C37 fail [script]
- [x] Verify — every success criterion above passes [pass/fail]

## Final step — Logging (always present)
- [x] Append one line per skill in `skills_used` to `Memory/Long-Term/Logs/skills.log`, format:
  `[AGENT: !<SkillName>] [<SUCCESS|FAIL>] <one-line outcome> | tokens≈[N]`

## Final step — Close out (always present)
- [x] Update `status: Completed` in this plan's frontmatter.
- [x] Append one entry to `Memory/Long-Term/Logs/completed-plans.log` (format per that file's header — verbatim from this plan's frontmatter + Objective). Write this BEFORE moving the file.
- [x] Move the file from `System/Plans/New/` to `System/Plans/Completed/`.
