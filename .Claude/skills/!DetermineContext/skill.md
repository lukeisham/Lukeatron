---
type: Skill
status: Active
domain: Orchestration
intent: "Select the single most appropriate context for a task, load that context's readme and any relevant Memory/ files so the agent is oriented, name any secondary contexts touched, and flag low-confidence calls."
dependencies:
  - "System/Context/personal-productivity.md"
  - "System/Context/church.md"
  - "System/Context/teaching.md"
  - "System/Context/personal-research.md"
  - "Memory/Long-Term/<store>/_index.yaml (per-store, on demand)"
version: 1.0.0
---

## ⚡ TRIGGER
Primary: !DetermineContext
Secondary: First hop of every task — fires right after a prompt arrives or Inbox/ material is picked up, before routing minor/major.
Shell: /context
Flag: --dry → report the chosen context + reasoning only; do NOT load the readme or Memory files.

## 🛠️ LOGIC
ASSERT the four System/Context/*.md readmes are reachable ELSE degrade: proceed on the
  Quick Decision Guide alone and flag the missing readme in the reply (never invent it).

STEP 1 — READ the request (prompt text, or the Inbox/ item under disposition).

STEP 2 — SCORE each context against the Quick Decision Guide (CLAUDE.md is the single source):
  CASE sermon prep / church admin / Balaclava PC       ➔ Church.
  CASE grammar / rhetoric / logic / teaching tools     ➔ Teaching.
  CASE general research on any topic                   ➔ Personal Research.
  CASE email / calendar / projects / coding            ➔ Personal Productivity.
  Match on the PRIMARY goal of the request, not incidental mentions.

STEP 3 — DECIDE:
  IF one context clearly dominates ➔ select it (confidence = high).
  IF two+ contexts plausibly fit ➔ select the one matching the primary goal as PRIMARY,
     and record the rest as SECONDARY (touched, not routed).
  IF no context clearly dominates ➔ select the most likely as a BEST-GUESS (confidence = low).

STEP 4 — LOAD (skip entirely if --dry):
  FAST PATH — a bare capability-portal READ that generates no content and routes no arriving
    material (e.g. "am I free Thursday?" → !Calendar list; "read my inbox" → !AgentMail read;
    a !WhatsApp read) may NAME the context and SKIP loading the readme — the portal skill carries
    what it needs. The readme loads only when the task GENERATES content, ROUTES an arrived item,
    or otherwise needs the context's behaviour/knowledge base. When unsure, load the readme.
  ELSE READ the selected context's readme to set behaviour + knowledge base. Resolve the filename via
    this EXACT map (readmes are lowercase-kebab — never construct "Personal Research.md"):
      Personal Productivity → System/Context/personal-productivity.md
      Church                → System/Context/church.md
      Teaching              → System/Context/teaching.md
      Personal Research     → System/Context/personal-research.md
  READ any Memory/ files the task obviously touches (per each store's own `_index.yaml`), on demand.
  Do NOT load secondary-context readmes — name them only.

STEP 5 — REPORT to Luke: chosen context, one-line reasoning, confidence, and any secondary contexts.
  ON confidence = low ➔ state plainly it is a best-guess and invite Luke to redirect; then PROCEED
     (do not halt). EXCEPTION — Inbox/ material that genuinely won't classify: per CLAUDE.md's
     failure ladder, leave it in Inbox/ and flag rather than force a guess.

## ✅ OUTPUT
State: One PRIMARY context selected; its readme + relevant Memory loaded (unless --dry);
  secondary contexts named; confidence recorded. Agent is oriented for the minor/major routing gate.
Log: "[AGENT: !DetermineContext] [SUCCESS] primary=<context> secondary=[<…>] confidence=<high|low> | tokens≈[N]" → Logs/skills.log
Error: Readme unreachable → degrade on the Quick Decision Guide + flag the gap. Inbox item won't classify → leave in Inbox/ and flag (do not guess).
