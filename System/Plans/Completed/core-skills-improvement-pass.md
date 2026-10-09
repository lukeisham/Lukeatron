---
plan: "core-skills-improvement-pass"
context: Lukeatron
secondary_contexts: []
created: 2026-10-09
status: Completed
major_because: "multi-step; modifies core skills (.claude/skills/) and one CLAUDE.md line — High impact, explicitly authorised by Luke in chat 2026-10-09"
project: ""
skills_used: [!CreatePlan, !ReviewPlan, !Checkpoint]
---

# Plan — Core skills improvement pass

## Objective
Fix the three audit defects in the core skills, add evals for the safety-critical skills, make logging land in one place with less noise, and move rarely-needed detail out of the longest skills into reference files, without changing any skill's behaviour except where a defect fix requires it.

## Success criteria (measurable)
- `!DetermineContext` routes to five contexts, sends coding to Personal Research (matching CLAUDE.md's Quick Decision Guide), and maps Lukeatron → `System/Context/lukeatron.md`; its manifest + EVAL agree.
- `!Review`, `!ReviewPlan`, `!ProjectSweep`, `Template_Plan.md` name all five contexts (LU prefix included).
- All 19 core skills carry `name:` + `description:` frontmatter — checked by the lint script, 0 failures.
- `evals/evals.json` (skill-creator schema) exists for !Checkpoint, !OutgoingContentCheck, !Tone, !ArchiveMemory, !DetermineContext, !PastoralNote.
- A runnable lint (`System/Tools/skill-evals/lint_skills.py`) passes on the whole core set.
- One skills log: every core-skill reference points at `Memory/Long-Term/Logs/skills.log`; the stray root `Logs/skills.log` is merged and retired; script/hook chatter goes to `workers.log`; a `skilllog.py` helper writes canonical lines and answers "recent failures".
- !ProjectSweep, !GenerateWiki, !PastoralNote, !Review each have a shorter SKILL file plus `reference/` files; no instruction text lost (diff checked).

## Resources
- **Memory to read:** Memory/Long-Term/Logs/, System/Context/*.md
- **Capability skills:** none
- **Domain skills (Skillbank):** none
- **Sub-agents:** none
- **Scripts:** System/Tools/skilllog/skilllog.py, System/Tools/skill-evals/lint_skills.py (new)

## Steps
- [x] Step 1 — Defect 1: update !DetermineContext (+ manifest, EVAL), !Review, !ReviewPlan, !ProjectSweep, Template_Plan for the Lukeatron context. [edit]
- [x] Step 2 — Defect 2: add name/description frontmatter to the 10 skills lacking it. [edit]
- [x] Step 3 — Defect 3: !Review drains the Lukeatron To-Dos (LU prefix). [edit]
- [x] Step 4 — Logging: build skilllog.py; split WORKER lines to workers.log; merge stray root log; repoint browser.py + teaching-app-family hook; repoint every `Logs/skills.log` reference; update Logs/_index.yaml. [script + edit]
  - [x] Test in Sandbox — run skilllog.py write/recent against a scratch copy first.
- [x] Step 5 — Evals: write evals/evals.json for six skills; write lint_skills.py and run it. [edit + script]
- [x] Step 6 — Progressive disclosure for !ProjectSweep, !GenerateWiki, !PastoralNote, !Review; verify by word-diff that no instruction text was dropped. [edit]
- [x] Verify — lint passes; every success criterion above checked. [pass/fail]

## Final step — Logging (always present)
- [x] Append one line per skill in `skills_used` via `skilllog.py write`.

## Final step — Close out (always present)
- [x] Update `status: Completed` in this plan's frontmatter.
- [x] Append one entry to `Memory/Long-Term/Logs/completed-plans.log`.
- [x] Move the file from `System/Plans/New/` to `System/Plans/Completed/`.
