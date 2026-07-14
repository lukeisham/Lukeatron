---
plan: "<short-kebab-name>"               # becomes the filename in System/Plans/New/
context: [Personal Productivity | Church | Teaching | Personal Research]
secondary_contexts: []                   # other domains the plan touches; omit if none
created: <YYYY-MM-DD>
status: New                              # New → Completed (move file to System/Plans/Completed/ when done)
major_because: "<multi-step | multi-domain | touches Outbox/external | modifies Long-Term memory>"
project: ""                              # Memory/Medium-Term/Projects/<id> if this plan needs human input; else empty
skills_used: []                          # filled as steps run; the final logging step reads this list
---

# Plan — <Task title>

## Objective
<One sentence. What "done" looks like. No fluff. This is the plan's stated purpose — it SPECIALISES the North Star in the `context` readme's 📐 Project Charter. !ReviewPlan checks alignment against both.>

## Success criteria (measurable)
<One or more checkable outputs that prove the Objective was met — a file exists, an email sent, N items processed. Each must be verifiable, not vibes. These must SATISFY the context Charter's Definition of Done + Guardrails (System/Context/<context>.md) — add project-specific criteria on top, never drop below the charter baseline.>
- <measurable output 1>
- <measurable output 2>

## Resources
- **Memory to read:** <Memory/Long-Term/<store> paths, or "none">
- **Capability skills:** <!AgentMail | !HeadlessChromeBrowser | !Calendar | !GenerateWiki, or "none">
- **Domain skills (Skillbank):** <!SkillName from System/Skillbank/_index.yaml, or "none">
- **Sub-agents:** <one line per dynamic step that needs judgement, or "none">
- **Scripts:** <standalone automations for deterministic/rigid steps, in Memory/Medium-Term/temp-skills/, or "none">
- **Temp-skills:** <deterministic/rigid steps captured as a script + skill.md in Memory/Medium-Term/temp-skills/, or "none">

## Steps
Bite-sized and ordered. Each box is one action. Tag the skill/tool/mode in brackets. Mark `[x]` when complete.

- [ ] Step 1 — <action> [reads: <memory> / runs: <skill|sub-agent|temp-skill>]
- [ ] Step 2 — <action> [<tag>]
- [ ] Step 3 — <action> [<tag>]
  - [ ] Test in Sandbox — <pair with any new script/temp-skill; run it in System/Sandbox/ before real use, or mark N/A + reason; delete this line if the step makes nothing to test>
  - [ ] !Checkpoint — <only where content leaves the system OR Long-Term memory changes; else delete this line>
- [ ] Step 4 — <action> [<tag>]
- [ ] …
- [ ] Verify — outputs meet every line in **Success criteria**, and the result matches the **Objective**? [pass/fail]

## Final step — Logging (always present)
- [ ] Append one line per skill in `skills_used` to `Memory/Long-Term/Logs/skills.log`, format:
  `[AGENT: !<SkillName>] [<SUCCESS|FAIL>] <one-line outcome> | tokens≈[N]`

## Final step — Close out (always present)
- [ ] Update `status: Completed` in this plan's frontmatter.
- [ ] Append one entry to `Memory/Long-Term/Logs/completed-plans.log` (format per that file's header — verbatim from this plan's frontmatter + Objective). Write this BEFORE moving the file.
- [ ] Move the file from `System/Plans/New/` to `System/Plans/Completed/`.
