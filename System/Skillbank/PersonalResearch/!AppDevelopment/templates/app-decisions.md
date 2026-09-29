<!-- Template — app-decisions.md for !AppDevelopment.
     Lives PERMANENTLY at System/Apps/<Name>/app-decisions.md (widgets: System/Widgets/<Name>/),
     created in Phase 1 and never deleted with the build documents.
     It holds only what the files themselves cannot show: Luke's approvals, the Vibe-Coding rule
     exceptions he granted, and any explicit decision Luke wants logged. Not a running decision
     log — the code is self-documenting, and an architectural point that is cross-app or
     multi-file belongs in README, not here. This file is only for a decision Luke explicitly
     flags as needing a permanent record. Not phase state, not a task board, not a next step
     (that lives in the project's Next Actions). Append a row the moment Luke gives an approval,
     flags a decision, or grants an exception — never batch at the end, never write one here in
     anticipation of Luke flagging it later. Delete these comment lines when instantiating. -->

# <Name> — Decisions

## Approvals

What Luke has signed off. A draft and an approved document look identical on disk — this table is
the only difference. A decision that deliberately reverses an earlier one also goes here, so a
later agent does not "restore" the old behaviour.

| Date | Approved | Version / scope |
|---|---|---|
| <YYYY-MM-DD> | <e.g. PRD approved · design closed · specs approved · change X accepted> | <e.g. PRD v0.4> |

## Key decisions

Not every decision — only one Luke explicitly wants logged, not left to the code or README. Each
gets its reason; the reason is the point. Append the moment Luke flags one, whenever that is.

| # | Decision | Reason | Rejected alternative |
|---|---|---|---|
| — | — | — | — |

## Rule exceptions

Deliberate breaks from `Memory/Long-Term/Coding/vibe-coding-rules.md`, each granted by Luke after
being asked with the rule ID and a reason. Code that matches a row here is intentional — do not
"fix" it.

| Rule ID | Where it applies | Reason | Granted |
|---|---|---|---|
| — | — | — | — |
