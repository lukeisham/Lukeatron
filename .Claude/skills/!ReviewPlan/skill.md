---
type: Skill
status: Active
domain: Orchestration
intent: "Independently review a plan in System/Plans/New/ before execution — checking alignment (Lukeatron purpose, context description, the plan's own stated purpose), efficiency (deterministic work uses scripts/templates/skills; dynamic work uses agents), and measurable outputs (does each step produce a checkable result that maps back to the purpose)."
dependencies:
  - "Memory/Long-Term/Purpose/purpose.md"
  - "System/Context/personal-productivity.md"
  - "System/Context/church.md"
  - "System/Context/teaching.md"
  - "System/Context/personal-research.md"
  - "System/Skillbank/_index.yaml"
version: 1.0.0
---

## ⚡ TRIGGER
Primary: !ReviewPlan
Secondary: Auto-fires from !CreatePlan the moment a plan is written to System/Plans/New/ — every plan is reviewed before execution, no exceptions.
Shell: /reviewplan
Independence: Review with fresh eyes — do NOT assume the plan is correct because it was just authored. Where the plan is large or high-stakes, run the review as a separate SUB-AGENT so the critique is genuinely independent of the author.

## 🛠️ LOGIC
ASSERT the target plan in System/Plans/New/ is readable ELSE STOP and report which plan is missing.
READ Memory/Long-Term/Purpose/purpose.md and the plan's own `context` readme (System/Context/<context>.md),
  including its 📐 Project Charter (North Star · Definition of Done · Guardrails).

LENS 1 — ALIGNMENT. Score the plan against four references, in order:
  a. **Lukeatron purpose** — does it serve Luke's productivity across the four contexts (purpose.md)?
  b. **Context Charter** — does the Objective specialise the charter's North Star, and does the plan
     respect its Guardrails? FLAG drift from the North Star or any Guardrail breach.
  c. **Context description** — does it fit the behaviour + knowledge base of its stated context readme?
  d. **The plan's own Objective** — does every step actually move toward the stated purpose?
  FLAG any step that serves none of these (scope creep) or contradicts them (misalignment).

LENS 2 — EFFICIENCY. Check each step uses the right tool for the kind of result:
  MATCH the step CASE:
    CASE deterministic / rigid result  ➔ MUST use a script, template, or skill (temp-skill or Skillbank).
       FLAG if a step does fixed, repeatable work by hand or by sub-agent — that is wasteful and inconsistent.
    CASE dynamic processing / result   ➔ MUST use a sub-agent (judgement, varying material).
       FLAG if a step forces a rigid skill onto work that genuinely varies each run.
  FLAG any newly-written script or skill that has no paired step to TEST it in System/Sandbox/ before
     real use — UNLESS the plan marks the test N/A with a reason (can't be sandboxed: live external state).
  Also FLAG redundant steps, an existing Skillbank skill that should have been reused, and missing reuse of memory.

LENS 3 — MEASURABLE OUTPUTS. The plan must be verifiable, not vibes:
  ASSERT a **Success criteria** block exists and every line is checkable (a file, a sent email, a count) ELSE FLAG.
  ASSERT the Success criteria SATISFY the context Charter's Definition of Done (the charter baseline,
     plus any project-specific criteria) ELSE FLAG [alignment] — a plan that meets its own bar but
     falls below the charter's Definition of Done is not done.
  For each step, ASK "what observable output proves it ran?" — FLAG any step with no measurable result.
  CONFIRM the Success criteria, if all met, would satisfy the Objective — i.e. results will match purpose.
  CONFIRM a Verify step precedes the final logging step (results-match-purpose check) ELSE FLAG.

VERDICT:
  IF no flags ➔ APPROVE — mark the plan reviewed; it proceeds to execution.
  IF flags ➔ RETURN the plan with each flag tagged [alignment | efficiency | measurability] and a concrete
     fix per flag. Hand back to !CreatePlan / Luke for revision; re-review after changes. Do NOT approve a flagged plan.

## ✅ OUTPUT
State: A verdict — APPROVED (plan reviewed, cleared for execution) or RETURNED with a flag list, each flag
  tagged by lens (alignment / efficiency / measurability) and paired with a concrete fix. An approved plan
  has measurable Success criteria, the right tool per step (deterministic→skill/script/template, dynamic→agent),
  and a Verify-before-logging step confirming results will match the purpose.
Log: "[AGENT: !ReviewPlan] [SUCCESS] plan=<name> verdict=<approved|returned> flags=<N> | tokens≈[N]" → Logs/skills.log
Error: Plan unreadable → stop + name it. purpose.md or context readme unreachable → review on the references available, flag the gap, never invent the missing standard.
