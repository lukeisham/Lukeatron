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
| 2026-09-29 | Key decisions (D-1–D-3) and their reasoning moved here from README, per `!AppDevelopment` v2.1.0's "no decision of any kind lands in README" — README now points here instead | — |

## Key decisions

Not every decision — only one Luke explicitly wants logged, not left to the code or README. Each
gets its reason; the reason is the point. Append the moment Luke flags one, whenever that is.

| # | Decision | Reason | Rejected alternative |
|---|---|---|---|
| D-1 | The seal check lives inside `library`, not re-checked by each caller | One enforcement point that can't be forgotten | Each module checks `_sealed.yaml` itself — one omission leaks a sealed store |
| D-2 | `server` is a thin stdlib dispatcher with no business logic | Keeps stdlib-only compliance trivial to audit | A fatter server that renders inline — harder to test and audit independently |
| D-4 | Search uses the shared memory-search engine (ranked, every term must match, substrings count), reached through `library.search_index()`; every hit is re-checked against `library.list_store()` | One ranked index serves agents and Luke alike, and a second seal fence keeps D-1's single gate meaningful | Live, unranked substring walk of every file (the original design) |
| D-3 | `capture` and `enrich` are two separate modules | They sit on opposite sides of the trust boundary: capture is deterministic and ungated; enrich is agent-drafted and gated | One writer module — conflates a no-agent path with an approval-required one |

## Rule exceptions

Deliberate breaks from `Memory/Long-Term/Coding/vibe-coding-rules.md`, each granted by Luke after
being asked with the rule ID and a reason. Code that matches a row here is intentional — do not
"fix" it.

| Rule ID | Where it applies | Reason | Granted |
|---|---|---|---|
| PY-12 · API-5 | capture module: append one row to `_queue.yaml` + a verbatim note to the chosen store list file | D5 — deterministic capture, no agent step; the click is the approval | 2026-09-11 |
| PY-12 · API-5 | enrich module: write a ⊕ request file to `System/Sandbox/wiki-enrich/_requests/` | D6 — requests must persist until an agent comes online | 2026-09-11 |
| PY-12 · API-5 | enrich module: on Accept, write an accepted draft into its store slot | D13 — Luke's Accept click is the `!Checkpoint` approval | 2026-09-11 |
