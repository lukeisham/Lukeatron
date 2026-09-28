---
plan: "grammarframe-diagnostics-after-rules"
context: Teaching
secondary_contexts: []
created: 2026-09-26
status: Completed
major_because: "multi-step | modifies Long-Term memory (Memory/Long-Term/Grammar/*.html)"
project: ""
skills_used: [!DetermineContext, !CreatePlan, !ReviewPlan, !GrammarFrame, !Checkpoint]
---

# Plan — Diagnostics appear after the rule's `*` key summary

## Objective
Advance the grammar tool by moving each section's Diagnostics block from before its rules to after
them, so a reader meets the rule and its `*` key-summary callout first and the test second. The
skill's spec, markup contract, validator and render script are amended so future renders keep it.

Luke's ruling (2026-09-26, chat): "I want diagnostic questions to appear after the key summary *".
Reading of it: "key summary *" is the `<p class="gf-callout">* …` line in each rule.
Default where a section holds two rules (Main verb, Verb phrase): the ONE diagnostics block goes
after the LAST rule in the section (D3 keeps one named block per section). After the rule means
after its `*` callout, its interaction table and its strip, which sit inside the rule's box.

## Success criteria (measurable)
- In both guides, in every section that has both, `.gf-diagnostics` follows the last `.gf-rule` (no diagnostics block precedes a rule in its own section).
- Nothing else moves: glossary, index, Contains lines, stubs, notes, examples and all question and rule text are byte-identical apart from position (A13 carry-forward passes; hashes unchanged).
- `criteria.md` D3, `markup.md`, `skill.md` and `render.py` state and produce the new order. Changelog 3.9.0.
- `validate.py check` gains a D3 order check; a new unit test proves it fails on the old order; all tests pass; `validate.py check` exits 0.
- Charter: guides stay offline and self-contained; no new source material (Teaching Definition of Done and Guardrails unaffected).

## Resources
- **Memory to read:** Memory/Long-Term/Grammar/ (both guides, `_run/render.py`)
- **Capability skills:** none
- **Domain skills (Skillbank):** !GrammarFrame (spec owner)
- **Sub-agents:** none
- **Scripts:** one throwaway in-place mover, `Memory/Long-Term/Grammar/_run/move_diagnostics.py` (working state, per the 🔐 permission; no Sandbox use)
- **Temp-skills:** none

## Steps
- [x] Step 1 — Back up both guides to `_run/rollback/2026-09-26-diag-order/` [script: cp]
- [x] Step 2 — Write `_run/move_diagnostics.py`: within each section container, move the `.gf-diagnostics` div to just after the last sibling `.gf-rule`; leave sections with no rule alone [script]
  - [x] Test — run on the backup copies first; confirm the diff is position-only (strip the moved blocks and compare) and that a second run changes nothing
- [x] Step 3 — Run it on both live guides [script]
- [x] Step 4 — Amend `render.py` `section_html` to emit rules first, then the diagnostics block [edit]
- [x] Step 5 — Amend spec: D3 in `reference/criteria.md`, the `.gf-diagnostics` row in `reference/markup.md`, a line in `skill.md`, changelog 3.9.0 and `version` [edit]
- [x] Step 6 — Add the D3 order check to `validate.py` and a unit test that fails on the old order [edit + test]
  - [x] !Checkpoint — Long-Term memory changes (Memory/Long-Term/Grammar/*.html)
- [x] Step 7 — Run `unittest` and `validate.py check`; grep both guides for section order [script]
- [x] Verify — every success criterion above passes [pass/fail]

## Final step — Logging (always present)
- [x] Append one line per skill in `skills_used` to `Memory/Long-Term/Logs/skills.log`, format:
  `[AGENT: !<SkillName>] [<SUCCESS|FAIL>] <one-line outcome> | tokens≈[N]`

## Final step — Close out (always present)
- [x] Update `status: Completed` in this plan's frontmatter.
- [x] Append one entry to `Memory/Long-Term/Logs/completed-plans.log` (format per that file's header — verbatim from this plan's frontmatter + Objective). Write this BEFORE moving the file.
- [x] Move the file from `System/Plans/New/` to `System/Plans/Completed/`.
