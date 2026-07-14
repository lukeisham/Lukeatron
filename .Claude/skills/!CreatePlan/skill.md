---
type: Skill
status: Active
domain: Orchestration
intent: "Break a Major task (multi-step or multi-domain) into clear, bite-sized, checkbox steps and save the plan in System/Plans/New/ — wiring in the right execution mode (sub-agent vs temp-skill), capability and domain skills, memory reads, project creation, checkpoints, and a mandatory final logging step."
dependencies:
  - "System/Templates/Template_Plan.md"
  - "System/Templates/Template_ProjectRegistry.md"
  - "System/Context/<selected-context>.md"   # the 📐 Project Charter — loaded by !DetermineContext
  - "System/Skillbank/_index.yaml"
  - "Memory/Long-Term/<store>/_index.yaml (per-store, on demand)"
  - "Memory/Medium-Term/Projects/_tracking.yaml"
version: 1.0.0
---

## ⚡ TRIGGER
Primary: !CreatePlan
Secondary: The Major branch of the routing gate — fires after `!DetermineContext` and the Skillbank lookup, once a task is judged Major (multi-step, multi-domain, touches Outbox/external parties, or modifies Long-Term/ memory).
Shell: /plan
Flag: --dry → draft the plan in-reply only; do NOT write the file or create a project.

## 🛠️ LOGIC
ASSERT System/Templates/Template_Plan.md is reachable ELSE degrade: build the plan from the
  three headings (Objective / Steps / Final logging step) and flag the missing template.

STEP 1 — CONFIRM Major. A task qualifies if ANY: multi-step, spans 2+ contexts, touches
  Outbox/ or external parties, or modifies Long-Term/ memory.
  IF not Major ➔ STOP and tell Luke this is a minor task — execute directly, no plan needed.

STEP 1.5 — ANCHOR TO THE CONTEXT CHARTER. READ the 📐 Project Charter in the selected
  context's System/Context/<context>.md (already loaded by !DetermineContext).
  The plan's Objective MUST specialise the charter's North Star; the Success criteria MUST
  satisfy its Definition of Done + Guardrails (project-specific criteria add on top, never
  drop below the charter baseline). Carry this into STEP 7. IF the charter is unreachable ➔
  build from purpose.md + the context description and flag the gap (never invent the standard).

STEP 2 — DECOMPOSE the task into the smallest ordered steps that still each do one thing.
  No fluff. Every step is a single action Luke and the agent can both read at a glance.

STEP 3 — ASSIGN an execution mode to each step:
  MATCH the step CASE:
    CASE dynamic — needs judgement, varies by material, open-ended  ➔ spin up a SUB-AGENT.
    CASE deterministic / rigid — same procedure every run            ➔ write a SCRIPT, either
       STANDALONE (a one-off automation in Memory/Medium-Term/temp-skills/, called directly by the
       step) OR bundled inside a TEMP-SKILL (script + its skill.md, when the rigid step also needs
       trigger/output wiring). Both are promotable later via !Suggest. Prefer a script over doing
       fixed work by hand or by sub-agent. PAIR every newly-written script or temp-skill with a
       step to TEST it in System/Sandbox/ before it runs for real — UNLESS it can't be meaningfully
       sandboxed (depends on live external state, e.g. a real send), in which case mark the test N/A
       and say why.
    CASE needs a capability                                          ➔ invoke !AgentMail (email),
       !HeadlessChromeBrowser (web), !Calendar (events), or !GenerateWiki (knowledge pages).
    CASE domain-specific                                             ➔ if a Skillbank skill matches
       (System/Skillbank/_index.yaml), invoke it; else handle inline.
    CASE needs stored knowledge                                      ➔ READ the matching
       Memory/Long-Term/<store> on demand (per that store's own `_index.yaml`). Reference, don't duplicate.

STEP 4 — PROJECT GATE. IF the task (or a series of its steps) requires human input to proceed
  ➔ CREATE a project: Memory/Medium-Term/Projects/<id>/ and register it in Projects/_tracking.yaml;
     record the project id in the plan frontmatter. Set the registry's `purpose:` to specialise the
     context Charter's North Star, and its 🎯 Definition of Done to inherit the charter baseline
     (STEP 1.5) plus any project-specific criteria. ELSE no project.

STEP 5 — CHECKPOINT GATE. Insert a `!Checkpoint` sub-step wherever content leaves the system
  (Outbox/) OR Long-Term/ memory changes. No outgoing/durable change ➔ no checkpoint line.

STEP 6 — ISSUE LOGGING. While working through STEPS 2–5 (decompose, assign, project gate,
  checkpoint gate), collect any issues noticed that are OUTSIDE the scope of this plan — e.g.
  broken file references, stale memory entries, missing templates, unregistered projects, orphaned
  temp-skills, configuration gaps, or anything that warrants attention elsewhere. For each:
  APPEND one row to Memory/Long-Term/Logs/issues.log using the table format:
    | <YYYY-MM-DD> | <plan-slug> | !CreatePlan | <one-line issue description> | <Low|Medium|High> | Open | <optional context> |
  Severity guide: High = blocks execution or corrupts data; Medium = degrades reliability; Low = cosmetic/minor gap.
  IF no issues found ➔ skip silently (do NOT append a "no issues" row).
  This step also runs during STEP 8 (ReviewPlan loop) — if !ReviewPlan surfaces out-of-scope issues
  while reviewing, log them here before continuing the approval loop.

STEP 6.5 — FINAL CLOSING STEPS (always, non-negotiable). Append two closing steps to every plan:
  1. LOGGING — log every skill used (one line each) to Memory/Long-Term/Logs/skills.log. Never omit.
  2. CLOSE OUT — update `status: Completed` in the plan's frontmatter, APPEND one entry to
     Memory/Long-Term/Logs/completed-plans.log (format per that file's header — verbatim from the plan's
     frontmatter + Objective, no AI summary; an operational log append, no !Checkpoint needed), THEN move
     the file from System/Plans/New/ to System/Plans/Completed/. The log append is written BEFORE the move,
     so the completion record survives regardless of what later happens to the file. Never omit.

STEP 7 — WRITE the plan from Template_Plan.md to System/Plans/New/<plan>.md (skip if --dry),
  with checkbox steps Luke can tick, an Objective that specialises the charter North Star (STEP 1.5),
  and a measurable Success criteria block that satisfies the charter's Definition of Done + Guardrails.

STEP 8 — AUTO-TRIGGER !ReviewPlan on the written plan — always, before any execution (skip only on --dry).
  The plan does NOT proceed to execution until !ReviewPlan returns APPROVED.
  IF !ReviewPlan RETURNS flags ➔ revise the plan against each flag and re-trigger !ReviewPlan UNTIL approved.

## ✅ OUTPUT
State: A plan file at System/Plans/New/<plan>.md (unless --dry) — Objective, Resources, ordered
  bite-sized checkbox steps each tagged with its execution mode/skill, checkpoints where required,
  a project created + registered if human input is needed, and a mandatory final logging step
  pointing at Memory/Long-Term/Logs/skills.log. The plan's Close-out step also appends a completion
  entry to Memory/Long-Term/Logs/completed-plans.log before the file is moved to Completed/.
  !ReviewPlan is then auto-triggered and must return APPROVED before execution begins.
Issues: Any out-of-scope issues spotted during planning or review are appended to
  Memory/Long-Term/Logs/issues.log (one row per issue, table format — see STEP 6). None found → no entry.
Log: "[AGENT: !CreatePlan] [SUCCESS] plan=<name> context=<…> steps=<N> project=<id|none> issues=<N|0> | tokens≈[N]" → Logs/skills.log
Error: Template unreachable → build from the three headings + flag. Not actually Major → stop and route as minor. Skillbank/_index unreadable → plan inline-only and flag the gap (never invent a skill).
