---
plan: "grammarframe-drop-breadth-questions"
context: Teaching
secondary_contexts: []
created: 2026-09-26
status: Completed
major_because: "multi-step | modifies Long-Term memory (Memory/Long-Term/Grammar/*.html)"
project: ""
skills_used: [!DetermineContext, !CreatePlan, !ReviewPlan, !GrammarFrame, !Checkpoint]
---

# Plan — Drop the Breadth question blocks from !GrammarFrame

## Objective
Advance the grammar tool by removing the rendered Breadth questions ("Breadth — what does it
contain?") from the skill and both guides. The Contains overview under a heading stays as the one
way the guides show what a concept contains.

Luke's ruling (2026-09-26, chat): the Contains line "is most effective"; the Breadth questions
"aren't helpful. Remove them from the skill."

## Success criteria (measurable)
- `grep -c gf-breadth-qs` returns 0 in both guides. Neither index has a Breadth group (no `data-kind="breadth"`).
- Contains overviews, breadth shading and breadth labels are unchanged (D11, D14 pass).
- Skill: no rule asks for a rendered Breadth block. `breadth-and-reach.md` keeps the kind/part tests as the unrendered E7 measuring procedure. D3, D8, C34, `markup.md` and `skill.md` STEP 5/6 are updated to match. Changelog 3.7.0.
- `validate.py` fails a guide that carries a `.gf-breadth-qs` block (new test). D8 compares the index against the questions grouped by kind (diagnostic, then reach), which fixes the pre-existing D8 false failure.
- `validate.py check` on the live guides passes every script-covered criterion. Tests pass.

## Resources
- **Memory to read:** `Memory/Long-Term/Grammar/Technical_Outline.html`, `Theatre.html`
- **Domain skills (Skillbank):** `!GrammarFrame`
- **Scripts:** none new. Removing the blocks is two regex deletions per file, done inline.
- **Sub-agents / Temp-skills / Capability skills:** none

## Steps
- [x] Step 1 — Amend `breadth-and-reach.md`, `criteria.md` (D3, D8, C34), `markup.md`, `skill.md`, changelog. [inline]
- [x] Step 2 — `validate.py`: fail on any `.gf-breadth-qs`; D8 groups by kind before comparing. Add the test; run the suite. [inline]
- [x] Step 3 — Edit both guides in place (Luke's preference: no Sandbox drafts). Remove the `.gf-breadth-qs` blocks and the index's Breadth group. Keep a rollback copy out of view. [inline]
  - [x] !Checkpoint — Long-Term write (two Grammar files).
- [x] Verify — `validate.py check` on the live files; tick every Success criterion. [pass/fail]

## Final step — Logging (always present)
- [x] Append one line per skill in `skills_used` to `Memory/Long-Term/Logs/skills.log`.

## Final step — Close out (always present)
- [x] Update `status: Completed` in this plan's frontmatter.
- [x] Append one entry to `Memory/Long-Term/Logs/completed-plans.log`. Write this BEFORE moving the file.
- [x] Move the file from `System/Plans/New/` to `System/Plans/Completed/`.

## Outcome (2026-09-26)
- Both guides: 2 Breadth blocks and the index's Breadth group removed; CSS selector tidied. Edited in place; rollback copy at System/Sandbox/grammar-rollback/2026-09-26-breadth/ (moved 2026-09-26 to Memory/Long-Term/Grammar/_run/rollback/2026-09-26-breadth/).
- validate.py: every script-covered criterion passes on the live files, including A13 against the rollback copy. Tests: 23/23.
- D8 was a validator bug (it compared the kind-grouped index with un-grouped run order); fixed. The issues.log row is resolved.
- Reach questions ("Reach — what else does it shape?") kept; not part of Luke's ruling.
