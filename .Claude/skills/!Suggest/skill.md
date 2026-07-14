---
type: Skill
status: Active
domain: Orchestration
intent: "Review a recent conversation or user input, decide whether the work warrants a skill at all, and if so outline its trigger, logic, and output and recommend where it lives — Skillbank for domain-specific, .Claude/skills for universal."
dependencies:
  - "System/Templates/template_skill.md"
  - "System/Skillbank/_index.yaml"
version: 1.0.0
---

## ⚡ TRIGGER
Primary: !Suggest
Secondary: Fires when Luke says a task "could be a skill", asks "should this be a skill?", or after a repeated/manual sequence the agent notices is worth capturing.
Shell: /suggest
Scope of review: the most recent conversation turn(s) or the named user input — NOT the whole session unless asked.
Flag: --build → after the outline is approved, write the skill.md to the recommended location and (if Skillbank) add its `_index.yaml` entry. Default is propose-only.

## 🛠️ LOGIC
ASSERT System/Templates/template_skill.md is reachable ELSE degrade: outline from the
  three-part structure (TRIGGER / LOGIC / OUTPUT) and flag the missing template.

STEP 1 — READ the target. Take the recent conversation or the input Luke names.
  EXTRACT: the task being done, its inputs, the steps taken, and the result produced.

STEP 2 — THE PRIME GATE — does this even warrant a skill?
  This is the one rule that decides everything:
    Repetitive OR deterministic results       ➔ SKILL. Capturing it saves work and guarantees consistency.
    Dynamic results OR a dynamic process       ➔ NO SKILL. Leave it to the agent's judgement.
  MATCH the task CASE:
    CASE same inputs ➔ same output every time (a fixed procedure, format, or transform)  ➔ deterministic ➔ SKILL.
    CASE done the same way repeatedly across sessions                                     ➔ repetitive   ➔ SKILL.
    CASE output depends on judgement, context, or changing material each run              ➔ dynamic       ➔ NO SKILL.
    CASE the "process" is really one-off reasoning dressed as a procedure                 ➔ dynamic       ➔ NO SKILL.
  IF NO SKILL ➔ tell Luke plainly why this is better left to the agent, name what is dynamic about it, and STOP.
  Do NOT manufacture a skill for something that varies every time.

STEP 3 — PLACEMENT (only if STEP 2 = SKILL) — universal or domain-specific?
    Usable across any context (general utility, no domain knowledge)  ➔ .Claude/skills/   (a true slash command).
    Tied to one domain (Church / Teaching / a single subject store)   ➔ System/Skillbank/ (on-demand, read inline).
  When unsure, default to Skillbank — it keeps the active command set lean and is promotable later.

STEP 4 — OUTLINE the proposed skill in the house three-part shape:
  ⚡ TRIGGER — the exact !Command + any secondary triggers that should fire it.
  🛠️ LOGIC  — the deterministic steps, as flow/pipeline (the repeatable core, not prose).
  ✅ OUTPUT — the terminal state and a one-line validation check.
  Name the proposed skill `!PascalCase`; keep every line behaviour-changing (the Prime Directive).

STEP 5 — REPORT to Luke: the verdict (skill / no skill + why), the placement + reason, and the outline.
  ON --build AND Luke approves ➔ write skill.md to the recommended path; IF Skillbank, append the
     one-line catalog entry to System/Skillbank/_index.yaml (a skill missing from it is invisible).
  Building anything is a change — AWAIT Luke's approval before writing (do not write on propose-only).

## ✅ OUTPUT
State: A clear verdict — either "leave it to the agent" with the dynamic reason named, OR a skill
  outline (TRIGGER / LOGIC / OUTPUT) plus a placement recommendation (Skillbank vs .Claude/skills) and why.
  On --build + approval: the skill.md exists at the recommended path, registered if Skillbank.
Log: "[AGENT: !Suggest] [SUCCESS] verdict=<skill|no-skill> placement=<skillbank|.claude/skills|n-a> built=<yes|no> | tokens≈[N]" → Logs/skills.log
Error: Template unreachable → outline from the three-part structure + flag. Ambiguous repetitive-vs-dynamic call → state it is a judgement call, give the leaning, and let Luke decide (do not force a skill).
