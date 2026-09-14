---
name: "!Intake"
description: >
  The intake front door. Routes each arrived item (AgentMail · Inbox/ · WhatsApp) — after
  !DetermineContext sets the context — to one or more of FOUR outcomes, or discards it:
  ① Project (create/update), ② Long-Term memory (store a durable fact), ③ LukeatronWiki
  (read/watch/write fodder, ideas, questions, links, videos), ④ Action (a !CreatePlan plan
  or a one-off; if it sends/publishes, !Checkpoint decides direct-send vs Outbox). Outcomes
  are COMPOUNDABLE (0..4 may fire). Fires per-item from the scheduled intake-sweep, or on
  demand. Triggers: "process the inbox", "triage this", "route this", "what should happen
  with this email", "intake", or new material arriving.
type: Skill
status: Active
domain: Orchestration
core_function: Categorise
intent: "Make intake deterministic: context first (the coordinate system), then assess each of the four outcome-axes independently and dispatch — so nothing arriving is dropped, mis-filed, or left to ad-hoc judgement."
dependencies:
  - ".claude/skills/!DetermineContext"
  - ".claude/skills/!CreatePlan"
  - ".claude/skills/!CreateProject"
  - ".claude/skills/!Checkpoint · !OutgoingContentCheck (whitelist.yaml)"
  - "System/Skillbank/GeneralPurposeSkills/!IdeaWiki/skill.md"
  - ".claude/skills/!AgentMail/scripts/agentmail.py"
  - "Memory/Medium-Term/Projects/_tracking.yaml + System/Templates/Template_ProjectRegistry.md"
  - "Memory/Medium-Term/Contacts/_index.yaml + System/Templates/Template_Contact.md"
  - "Memory/Long-Term/<store>/_index.yaml (per-store, on demand)"
version: 1.3.2
calibration:
  context: Any
  level: Extended
  scope: Global
memory_footprint:
  read: [Memory/Medium-Term/Projects, Memory/Medium-Term/Contacts, Memory/Long-Term, System/Context, System/Templates]
  write: [Memory/Medium-Term/Projects, Memory/Medium-Term/Contacts, Memory/Long-Term, Memory/Long-Term/LukeatronWiki, System/Sandbox, Outbox]
---

## ⚡ TRIGGER
Primary: `!Intake`
Secondary: fires PER-ITEM from the scheduled `intake-sweep` task on new AgentMail(received) / `Inbox/` / WhatsApp material; also when the agent picks up such material in-session.
Position: runs AFTER `!DetermineContext` (it invokes it as Step 1). `!DetermineContext` picks the context; `!Intake` picks the outcome(s).
Shell: `/intake`
Flag: `--dry` → decide + report the routing only; mutate NOTHING, send NOTHING. (Used by the sweep's preview mode.)

## 🧭 WHAT THIS IS
The deterministic router. `!DetermineContext` sets the **coordinate system** (which of PP/CH/TE/PR);
`!Intake` then reads the four **outcome-axes** within that context. Knowing the context narrows
*where* each outcome lands — this context's projects, this context's stores, this context's typical
actions — which is what makes the output deterministic. It holds no send/store logic of its own:
memory writes and outgoing actions defer to `!Checkpoint`.

## 🛠️ LOGIC
```
// EXECUTION_START
FOR EACH arrived item:

1. CONTEXT  → DELEGATE to !DetermineContext → {primary context (+secondary), readme + memory loaded}

2. ASSESS the FOUR axes INDEPENDENTLY (compoundable — 0..4 may fire; assess each on its merits):

   ① PROJECT — does this create or update a tracked project?
        READ Memory/Medium-Term/Projects/_tracking.yaml
        DETERMINE whether the item BELONGS to an existing Active project:
          "Belongs to" = same ongoing work-strand: same endeavour + same primary people/subject/purpose.
          NOT a coincidence of topic or keyword overlap. When in doubt, it does NOT belong.
        MATCH
          CASE confident match to an existing Active project THEN
               UPDATE its registry.md (Next Actions / Events / Decision Log / People)
               + bump _tracking row (updated; state/waiting_on/wake if changed)
          CASE new multi-step endeavour (needs tracking; not self-contained) THEN
               DELEGATE to !CreateProject WITH {title, context, purpose (drafted from the item),
                 initial next action (if the item implies one)} INTO {id, path}
               // !CreateProject owns the templates, notes.md, the Purpose/Definition of Done fill,
               // and the _tracking.yaml row — Intake only decides THAT a new project is warranted.
          CASE minor/one-off self-contained (single action, no ongoing stake) THEN
               ADD it as ONE Next Action to the best-fit Active project IN THIS CONTEXT — a looser
               "fits under" test than "belongs to": the project whose Purpose would naturally hold
               the task (e.g. a household chore → PP-18 Chores and Errands; a church-inbox problem →
               CH-25 Work Email Triage). Owner/Type as the item implies; Status ☐ Open; State
               ⚪ Undefined unless the item carries urgency (🔴) or needs Luke's call (🟠).
               Log the addition in that registry's 🧾 Decision Log ("<date> — Added via !Intake: …").
               // The MinorTasks queue was retired 2026-09-14 — small tasks live in projects now.
               IF no specific project fits THEN add it to THIS CONTEXT'S CATCH-ALL project:
                 Personal Productivity → PP-18 Chores and Errands · Church → CH-28 Church Odds and Ends
                 Teaching → TE-13 Teaching Odds and Ends · Lukeatron → LU-03 Lukeatron Odds and Ends
                 Personal Research → PR-08 Research Odds and Ends
               Never invent a new project for a one-off.
          CASE ambiguous (genuinely unclear whether project / one-off / something else) THEN
               leave the original in Inbox/ and FLAG Luke in the per-item report:
                 "Ask Luke what to do with: <item title or one-line summary>"
               DO NOT mark processed — it re-surfaces until Luke decides.
          CASE neither THEN skip ①
        (Medium-Term Projects are apply-safe — write directly, per !ProjectSweep precedent.)
        🔗 LINK CHECK — when adding a Next Action, fuzzy-match it (STRICT: same task + same object,
          tolerating only spelling/grammar/punctuation/word-order) against open actions in OTHER
          projects. On a genuine match, share/mint a `link key` in the 🔗 Link cell of every copy and
          record it in Memory/Medium-Term/Projects/_links.yaml so their Status/State sync (see
          Template_ProjectRegistry.md → 🔗 Linked Actions). When in doubt, leave it unlinked —
          !ProjectSweep reconciles links every run regardless.
        📇 CONTACTS CHECK — if the arrival carries contact details (email/phone) for a person linked
          to this project or task but that person doesn't warrant a full People/ record:
          READ People/ first — if found there, skip. Else READ Contacts/_index.yaml and search by
          name (case-insensitive):
            found     → add the project ID to that contact's `linked_to` (file frontmatter + index row)
            not found → CREATE Contacts/<TC-NN Name>/<TC-NN Name>.md from Template_Contact.md
                        (TC-NN = last number + 1, zero-padded; interaction_tier non-listed;
                        linked_to = the project ID) + APPEND a matching row to Contacts/_index.yaml.
          A Contacts/-only recipient is ALWAYS non-listed — this check NEVER relaxes the gate.

   ② MEMORY — is there a durable FACT to keep?
        IF yes THEN WRITE it to the matching Memory/Long-Term/<subject> store (+ its _index.yaml)
        [GATE: Long-Term write → !Checkpoint]

   ③ WIKI — is this thinking-FODDER? (a book/article/link/video to read·watch·write, an idea, a question)
        IF yes THEN DELEGATE to !IdeaWiki ABSORB (queues it + files it onto the right page, linked both ways)

   ④ ACTION — is there something to DO?
        scope it: one-off → execute directly ; multi-step → DELEGATE to !CreatePlan
        IF the action EMITS outgoing content / an external op THEN DELEGATE to !Checkpoint:
            whitelisted target in-scope ➔ perform DIRECT (e.g. email a whitelisted person — NO Outbox)
            else ➔ !OutgoingContentCheck (Send / Send+whitelist / Hold in Outbox / Abandon). FAIL CLOSED.
        // Action ≠ always Outbox. The whitelist decides.

   ∅ NONE fired → DISCARD (delete, or move the original to Archive/)

3. COMPOUND: apply EVERY axis that fired (e.g. ① update project + ② store decision + ④ draft reply).

4. CHECKPOINT: any Long-Term write OR outgoing action passes through !Checkpoint
   (it routes !OutgoingContentCheck and/or !ArchiveMemory). Fail closed.

5. MARK PROCESSED so the sweep never re-handles the item:
     AgentMail ➔ label/move processed   |   Inbox/ ➔ move original to Archive/ (or done-marker)
     WhatsApp  ➔ advance the last-seen marker
   ONLY mark processed once ≥1 outcome fired OR an explicit Discard was taken.

6. REPORT per item: context · which axes fired · what was done/queued/held.
   UNCLASSIFIABLE (context or outcome genuinely unclear) ➔ leave the item in Inbox/ and FLAG Luke — never force a guess.
// EXECUTION_END
```

## ✅ OUTPUT
Each arrival routed to one-or-more of {Project, Memory, Wiki, Action} or Discarded; every Long-Term
write and outgoing action passed through `!Checkpoint`; the processed-marker advanced so nothing
re-runs; a per-item summary (context + axes fired + disposition) reported and logged.

**Validation Check (Self-Test)**
```
VERIFY (every processed item fired ≥1 outcome OR was explicitly Discarded/left-in-Inbox) ELSE do not mark processed
VERIFY (no outgoing content/action left the system without passing !Checkpoint) == true
VERIFY (no item is reprocessed — processed-marker advanced for each handled item) == true
```

**Error Path**
```
CATCH cannot-classify (context or outcome unclear) ➔ leave in Inbox/, flag Luke, do NOT mark processed.
CATCH checkpoint-unavailable / Luke-unreachable    ➔ FAIL CLOSED: hold outgoing in Outbox/ unsent,
                                                     defer the Long-Term write; non-outgoing outcomes may still apply.
CATCH [*]                                          ➔ report what failed on which item; leave that item unprocessed.
Log one line per handled batch to Memory/Long-Term/Logs/skills.log.
```
