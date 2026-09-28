# LukeatronWiki — Decisions

## Approvals

What Luke has signed off. A draft and an approved document look identical on disk — this table is
the only difference. A decision that deliberately reverses an earlier one also goes here, so a
later agent does not "restore" the old behaviour.

| Date | Approved | Version / scope |
|---|---|---|
| 2026-09-11 | PRD approved | v0.3 (v0.4 carries the 2026-09-12 documentation repair) |
| 2026-09-11 | Quick-capture needs no `!Checkpoint`: fixed form → fixed-template writes; Luke's click is the approval (D5) | PRD v0.4 |
| 2026-09-11 | SessionStart hook may announce pending ⊕ requests — approved in principle (D8) | PRD v0.4 |
| 2026-09-12 | Build verified and accepted; live on :8787 | — |
| 2026-09-28 | Build docs retired (PRD, specs, CONTRACT.md); Sandbox copy archived to `Archive/appdevelopment-restructure-2026-09-28/` | — |

## Rule exceptions

Deliberate breaks from `Memory/Long-Term/Coding/vibe-coding-rules.md`, each granted by Luke after
being asked with the rule ID and a reason. Code that matches a row here is intentional — do not
"fix" it.

| Rule ID | Where it applies | Reason | Granted |
|---|---|---|---|
| PY-12 · API-5 | capture module: append one row to `_queue.yaml` + a verbatim note to the chosen store list file | D5 — deterministic capture, no agent step; the click is the approval | 2026-09-11 |
| PY-12 · API-5 | enrich module: write a ⊕ request file to `System/Sandbox/wiki-enrich/_requests/` | D6 — requests must persist until an agent comes online | 2026-09-11 |
| PY-12 · API-5 | enrich module: on Accept, write an accepted draft into its store slot | D13 — Luke's Accept click is the `!Checkpoint` approval | 2026-09-11 |
