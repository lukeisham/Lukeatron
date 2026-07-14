---
type: Checkpoint
status: Active
domain: Orchestration
intent: "Run before anything leaves the system or changes durable state. Decide which safety gates fire — !OutgoingContentCheck for outgoing content, !ArchiveMemory for Long-Term memory archival/deletion — and hard-block promotion of any script/temp-skill out of System/Sandbox/ until its test has passed. Gates review the agent's output/selection, not Luke's intent: a Luke-requested action that matches his exact spec (verbatim content, reversible change, named target) skips approval, and writes/additions to Long-Term are never gated (only archive/delete). Fail closed."
dependencies:
  - "System/Sandbox/"
version: 1.1.0
---

## ⚡ TRIGGER
Primary: !Checkpoint
Secondary: Fires before anything leaves the system or changes durable state — i.e. before a minor task's output ships, and woven into Major-task steps wherever content goes out, memory changes, or a Sandbox artifact is promoted.
Shell: /checkpoint
Overriding rule: **Fail closed.** If a required gate cannot run, or Luke is unreachable for an approval it needs, HOLD the action — never bypass a checkpoint to keep moving.

## 🛠️ LOGIC
Inspect the pending action and fire each gate that applies. Gates are independent — zero, one, or several may fire.

SCOPE — what checkpoints review. Gates check the **agent's output or selection** before an irreversible or outward-facing action — NOT Luke's intent. When Luke directly requests an action and the executed action IS exactly what he specified — verbatim content he supplied, a fully-reversible change, or an explicitly-named target — the approval is redundant: proceed without it. A gate STILL fires when the agent generated the content (Gate A), is choosing which items to remove (Gate B), or the action is irreversible and Luke has not seen the exact form it will take. The check is on the artifact, never on the fact that Luke asked.

GATE A — OUTGOING CONTENT. IF the action sends content to Outbox/ or an external party
  ➔ TRIGGER !OutgoingContentCheck (resolves x-axis trust tier from People store: gold proceeds automatically,
    white/non-listed prompt Luke for approval, black is hard-blocked and requires an explicit named override).
    Unapproved ➔ content stays in Outbox/, unsent.

GATE B — DURABLE MEMORY. IF the action archives or deletes Long-Term/ memory
  ➔ TRIGGER !ArchiveMemory (double-check + user review). Not reviewed ➔ defer the change.
  NOTE — writes/additions to Long-Term are NOT gated. Only archival or deletion fires this gate;
     adding a new durable fact (especially one Luke requested) proceeds directly, no approval.

GATE C — SANDBOX PROMOTION (hard gate). IF the action moves a script or temp-skill OUT of System/Sandbox/
  — into Memory/Medium-Term/temp-skills/, .Claude/skills/, System/Skillbank/, or live use —
  ➔ ASSERT its paired Sandbox test is recorded PASS (or marked N/A with a reason: can't be sandboxed,
     live external state) ELSE BLOCK the promotion and report what is untested.
  No script or temp-skill leaves Sandbox/ until it passes its test or is justified N/A. No exceptions.

DECIDE: fire the gates that matched; if none matched, the action is safe — proceed.
ON any gate held/blocked ➔ report to Luke which gate fired and why; do NOT proceed on the held action.

## ✅ OUTPUT
State: Each applicable gate fired and resolved — outgoing content approved or held in Outbox/; memory
  change reviewed or deferred; Sandbox promotion allowed only on a passed/justified test, else blocked.
  Nothing unsafe left the system or changed durable state.
Log: "[AGENT: !Checkpoint] [SUCCESS] gates=[A?,B?,C?] held=<none|A|B|C> | tokens≈[N]" → Logs/skills.log
Error: A required gate can't run, or Luke is unreachable for approval ➔ FAIL CLOSED — hold the action, report the blocker. Never bypass a checkpoint.
