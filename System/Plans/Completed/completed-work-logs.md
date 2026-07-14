---
plan: "completed-work-logs"
context: Personal Research
secondary_contexts: []
created: 2026-07-05
status: Completed
major_because: "modifies core skills (.claude/skills/!CreatePlan, !Initiative) + a protected template (Template_Plan.md) + adds Long-Term Logs files — all High-impact"
project: ""
skills_used: ["!CreatePlan", "!ReviewPlan", "!Suggest"]
---

# Plan — Completed-Work Logs (plans + minor tasks)

## Objective
Give Lukeatron a permanent, append-only Long-Term record of every **completed Major plan** and every **completed minor task**, mirroring how `completed-projects.log` already preserves closed projects — so completions survive `System/Plans/Completed/` file churn and `!PruneMemory` clearing done queue rows (specialises the Personal Research North Star: keep the system's own memory faithful and lossless).

## Success criteria (measurable)
- `Memory/Long-Term/Logs/completed-plans.log` exists, with a documented header (purpose + entry format + "append-only, never edit past entries"), and an empty entries section ready for the first append.
- `Memory/Long-Term/Logs/completed-minor-tasks.log` exists, same header discipline.
- `!CreatePlan` STEP 6.5 CLOSE OUT step (and its OUTPUT) instructs appending one entry to `completed-plans.log` on plan completion; the instruction is physically present in `Template_Plan.md`'s "Final step — Close out" block so every new plan carries it.
- `!Initiative` STEP 2 appends one line to `completed-minor-tasks.log` every time it marks a queue row `☑ Done`; OUTPUT + Validation updated to match.
- `Memory/Long-Term/Logs/_index.yaml` lists both new files with purposes.
- No `!Checkpoint` is added for these appends (operational log writes, not durable-knowledge writes — same convention as `skills.log`/`issues.log`); this is stated, not silently assumed.
- Charter baseline held: all changes stay inside `_Lukeatron/`; no outgoing content; the protected-template edit is called out explicitly for Luke's sign-off (plan approval = permission).

## Resources
- **Memory to read:** `Memory/Long-Term/Logs/` (existing logs + `_index.yaml` for house format), `Memory/Medium-Term/MinorTasks/queue.md` (schema)
- **Capability skills:** none
- **Domain skills (Skillbank):** none
- **Sub-agents:** none
- **Scripts:** none
- **Temp-skills:** none
- **Protected files touched (need Luke's sign-off — plan approval grants it):** `.claude/skills/!CreatePlan/SKILL.md`, `.claude/skills/!Initiative/SKILL.md`, `System/Templates/Template_Plan.md`

## Design decisions (settled before build)
- **Two logs, not one** — matches the house granularity (`completed-projects.log`, `completed_improvements.log` are each single-purpose).
- **completed-plans.log** — block-per-entry (a plan is a substantial artifact, like a project). Fields verbatim from plan frontmatter — no AI summary:
  ```
  ---
  ## <plan-slug> · <Task title>
  **Completed:** <YYYY-MM-DD>  ·  **Context:** <context>  ·  **Created:** <created>
  **Major because:** <major_because>
  **Project:** <project id or none>
  **Objective:** <Objective line, verbatim from the plan>
  **Skills used:** <skills_used list>
  ```
- **completed-minor-tasks.log** — one line per row (minor tasks are lightweight, like `skills.log`):
  ```
  [YYYY-MM-DD] #<N> · <task> | impact=<Low|High> | source=<source> | by=<!Initiative|Luke|…> | notes=<optional>
  ```
- **Writers:** `completed-plans.log` ← the CLOSE OUT step every plan runs (authored by `!CreatePlan` / `Template_Plan.md`). `completed-minor-tasks.log` ← `!Initiative` when it sets a row `☑ Done`.
- **Known gap (log, don't fix here):** minor tasks completed **manually** (Luke ticking a row, or the dashboard edit mode) bypass `!Initiative` and won't be captured. Record to `issues.log`; a later pass can route dashboard-completion through the log.
- **CLAUDE.md untouched** — `completed-projects.log` isn't named in the CLAUDE.md loop either; completion-logging is a skill-level operational detail. Keeps the change minimal.

## Steps
- [ ] Step 1 — Create `Memory/Long-Term/Logs/completed-plans.log` with header (purpose, "append-only — never edit past entries", the block entry format above) + `<!-- Entries begin below. Newest at the bottom. -->` marker. [writes: Long-Term/Logs]
- [ ] Step 2 — Create `Memory/Long-Term/Logs/completed-minor-tasks.log` with header (purpose, append-only note, the one-line format above) + entries marker. [writes: Long-Term/Logs]
- [ ] Step 3 — Edit `!CreatePlan/SKILL.md`: in STEP 6.5, CLOSE OUT sub-step 2 → add "append one entry to `Memory/Long-Term/Logs/completed-plans.log` (format per that file's header, verbatim from frontmatter) before moving the file". Update the OUTPUT `State:` line to mention it. [protected core skill]
- [ ] Step 4 — Edit `Template_Plan.md` "Final step — Close out (always present)" → add the `completed-plans.log` append checkbox so every new plan physically carries it. [protected template — Luke sign-off via plan approval]
- [ ] Step 5 — Edit `!Initiative/SKILL.md`: STEP 2 → after `MARK row: Status = ☑ Done`, add "APPEND one line to `Memory/Long-Term/Logs/completed-minor-tasks.log` (format per that file's header)". Update OUTPUT + the Validation self-test (every auto-actioned row also produces a log line). [protected core skill]
- [ ] Step 6 — Edit `Memory/Long-Term/Logs/_index.yaml`: add `completed-plans.log` and `completed-minor-tasks.log` file entries with purposes. [writes: Long-Term/Logs]
- [ ] Step 7 — Log the known manual/dashboard-completion gap to `Memory/Long-Term/Logs/issues.log` (one row, Low). [writes: Long-Term/Logs]
- [ ] Verify — both log files exist with headers; `!CreatePlan`, `Template_Plan.md`, `!Initiative` each reference their log; `_index.yaml` lists both; no `!Checkpoint` added; every change inside `_Lukeatron/`. [pass/fail]

## Final step — Logging (always present)
- [ ] Append one line per skill in `skills_used` to `Memory/Long-Term/Logs/skills.log`, format:
  `[AGENT: !<SkillName>] [<SUCCESS|FAIL>] <one-line outcome> | tokens≈[N]`

## Final step — Close out (always present)
- [ ] Update `status: Completed` in this plan's frontmatter, then move the file from `System/Plans/New/` to `System/Plans/Completed/`.
- [ ] Append one entry to `Memory/Long-Term/Logs/completed-plans.log` (format per that file's header, verbatim from this plan's frontmatter) — this plan is the log's own first entry, a live end-to-end test of the feature.
