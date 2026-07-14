---
plan: "intake-routing-system"
context: Personal Productivity
secondary_contexts: [Coding]
created: 2026-06-23
status: Completed
major_because: "multi-step + modifies core workflow doctrine (CLAUDE.md) + creates a new skill + sets up an auto-trigger scheduled task"
project: "Memory/Medium-Term/Projects/PR-01-lukeatron-future-improvements"
skills_used: [!Intake, !DetermineContext, update-config]
---

# Plan — Intake Routing System (the four-outcome front door)

## Objective
When material arrives (AgentMail · Inbox/ · WhatsApp), reliably and deterministically route it — after `!DetermineContext` sets the context — to one or more of four outcomes: ① a Project (created/updated), ② Long-Term memory, ③ LukeatronWiki, ④ an Action (a `!CreatePlan` plan or a one-off), or ∅ Discard.

## Success criteria (measurable)
- A new skill `!Intake` (working name) exists, registered, with TRIGGER / LOGIC / OUTPUT, that takes an arrived item and produces a routing decision across the four outcomes (compoundable) + Discard.
- `!Intake` runs `!DetermineContext` first, then evaluates each outcome-axis within that context, and dispatches: ①→project create/update (`_tracking.yaml` + registry), ②→Long-Term store write, ③→`!IdeaWiki` ABSORB, ④→one-off action or `!CreatePlan`.
- The Action outcome routes outgoing content through `!Checkpoint`; whitelisted targets send direct (no Outbox), others stage in Outbox/await approval. **No Outbox assumption baked in.**
- A scheduled task (e.g. `intake-sweep`) polls AgentMail(received) + Inbox/ + WhatsApp on an interval, runs `!Intake` on new-since-last-run items, and never reprocesses (state/label marker). Fails closed on outgoing.
- CLAUDE.md's Inbox Disposition + workflow are reframed around the four outcomes (+ Discard), note compoundability, reference `!Intake`, and clarify Action↔Outbox is conditional via `!Checkpoint`.
- Satisfies the Personal Productivity charter; every Long-Term write / outgoing action passes `!Checkpoint`.

## Resources
- **Memory to read:** `Memory/Medium-Term/Projects/_tracking.yaml`, `Memory/Long-Term/_index.yaml`, `Memory/Long-Term/Preferences/`
- **Capability skills:** `!AgentMail` (poll received), `!IdeaWiki` (outcome ③)
- **Domain skills (Skillbank):** `!DetermineContext`, `!CreatePlan`, `!Checkpoint` / `!OutgoingContentCheck`, `!IdeaWiki`
- **Sub-agents:** none (routing is judgment but lightweight; per-item)
- **Scripts:** reuse `.claude/skills/!AgentMail/scripts/agentmail.py`; WhatsApp via `~/Developer/whatsapp-mcp` SQLite; new processed-marker state file under the skill
- **Temp-skills:** none

## Steps
- [x] Step 1 — Decisions confirmed: name = **`!Intake`**; cadence = **a few times daily**
- [x] Step 2 — Drafted the `!Intake` skill: TRIGGER (primary + fires from the scheduled task + after in-session fetch), LOGIC (per-item: `!DetermineContext` → assess the 4 outcome-axes independently → dispatch; ∅→Discard; compound where >1 fits), OUTPUT (per-item routing summary) [wrote: `.claude/skills/!Intake/skill.md`]
  - [x] Baked in the Action↔`!Checkpoint` rule (whitelist decides Outbox vs direct) — Action ≠ always Outbox
  - [x] Test in Sandbox — dry-run walkthrough of 3 sample items (per-outcome + compound) validated correct routing, no real sends/writes (see Verify notes)
- [x] Step 3 — Reframed CLAUDE.md: Inbox Disposition table → the four outcomes (Project / Memory / Wiki / Action) + Discard; noted compoundability; inserted `!Intake` as the post-`!DetermineContext` routing step in the workflow; clarified Action↔Outbox [edited: `.claude/CLAUDE.md`]
  - [x] Added `!Intake` to the key-skills table (`.claude/skills/` home → auto-registered, no Skillbank entry needed)
- [x] Step 4 — Built the auto-trigger: scheduled `intake-sweep` (cron `0 8,13,18 * * *`, Melbourne) polls AgentMail(received) + Inbox/, runs `!Intake` per new item, advances a processed-marker (`Memory/Medium-Term/intake-state.yaml`), fails closed on outgoing. WhatsApp deferred. [ran: mcp scheduled-tasks create]
  - [x] !Checkpoint — going-live confirmed by Luke; task built fail-closed (unattended → holds outgoing in Outbox, defers Long-Term writes, lists them "awaiting approval"). Cron verified `0 8,13,18 * * *`.
- [x] Step 5 — Added a PostToolUse/Bash hook via `update-config` (`.claude/settings.json`): on an AgentMail fetch it injects a reminder to route new items through `!Intake`. Verified firing in-session; pipe-tested match + non-match.
- [~] Verify — COMPONENT-verified: `!Intake` routing dry-run (3 samples) ✓, cron ✓, hook fires ✓, marker scheme ✓. LIVE end-to-end (real arrival) pending the first 08:00 sweep, or a manual "Run now" / "process my inbox".
- Also done (off-plan, per Luke): recorded Melbourne timezone (`Australia/Melbourne`) in native memory `.claude/memory.md`.

## Final step — Logging (always present)
- [ ] Append one line per skill in `skills_used` to `Memory/Long-Term/Logs/skills.log`, format:
  `[AGENT: !<SkillName>] [<SUCCESS|FAIL>] <one-line outcome> | tokens≈[N]`
