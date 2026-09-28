---
plan: "grammarframe-v3-slimming"
context: Teaching
secondary_contexts: [Lukeatron]
created: 2026-09-24
status: Completed
major_because: "multi-step; modifies Long-Term memory (Memory/Long-Term/Grammar/)"
project: ""
skills_used: [!GrammarFrame]
---

# Plan — Slim !GrammarFrame to v3.0.0

## Objective
Apply Luke's five approved cuts (2026-09-24 review) so !GrammarFrame produces the two HTML guides
with less machinery, a saved theatre metaphor, and a two-line catalog entry.

## Success criteria (measurable)
- No live reference to `grammar-content.json` or `reference/schema.md` in the skill, its catalog entry or the Grammar store index.
- A5, A9, A10, A11 retired; carry-forward of unchanged headings works from the prior HTML guides.
- `Memory/Long-Term/Grammar/Theatre_Mappings.table.md` exists; C21 reads "extend the saved table; new mappings are gated".
- All criteria live in `reference/criteria.md`; skill.md references them only; error paths ≤ 7, all outside-world failures.
- `_index.yaml` intent for !GrammarFrame is two lines.
- STEP 7B default = one blind reader, metaphor lane on Theatre.html only; full review on request.

## Resources
- **Memory to read:** Memory/Long-Term/Grammar/
- **Capability skills:** none
- **Domain skills (Skillbank):** !GrammarFrame, !ConceptFidelity, !Comprehension (caller notes only)
- **Sub-agents:** none
- **Scripts:** none
- **Temp-skills:** none

## Steps
- [x] Step 1 — Archive `reference/schema.md` to `Archive/GrammarFrame-schema-2026-09-24/` [move, not delete]
- [x] Step 2 — Write `reference/criteria.md` (governance + all criteria + E1–E5 in full), with JSON criteria retired and C21/C30/C32/C33 amended
- [x] Step 3 — Rewrite `skill.md` to v3.0.0: no JSON, carry-forward from HTML, mapping table in STEP 1–3/7, lighter STEP 7B, ~7 error paths
- [x] Step 4 — Create `Theatre_Mappings.table.md`; add `Mapping` class to `Rejected_Proposals.table.md`; update Grammar `_index.yaml` [Long-Term — approved by Luke in chat]
- [x] Step 5 — Shorten catalog entry; update callee notes in !Comprehension / !ConceptFidelity; fix sources.md offline rationale
- [x] Verify — grep for stale references; every success criterion met [pass/fail]

## Final step — Logging (always present)
- [x] Append to `Memory/Long-Term/Logs/skills.log`.

## Final step — Close out (always present)
- [x] Update `status: Completed`; append to `completed-plans.log`; move to `System/Plans/Completed/`.
