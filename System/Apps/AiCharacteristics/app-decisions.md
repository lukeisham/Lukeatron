# AiCharacteristics — Decisions

## Approvals

What Luke has signed off. A draft and an approved document look identical on disk — this table is
the only difference. A decision that deliberately reverses an earlier one also goes here, so a
later agent does not "restore" the old behaviour.

| Date | Approved | Version / scope |
|---|---|---|
| 2026-09-29 | Promoted from `System/Widgets/Generator/AiCharacteristics/` to a standalone app, per Luke's direction in chat | — |
| 2026-10-02 | Refactor approved per `System/Plans/New/aicharacteristics-criteria-judge.md`: old 8 detectors retired; Wikipedia article → criteria → Simple English explainer → JEV check. **JEV** = a very cheap LLM-based judge (Haiku) that outputs only yes/no plus a confidence per criterion. The Scrape button re-scrapes on click; otherwise the data is static | — |
| 2026-10-02 | Three plan defaults approved: API key server-side only, outside the repo; verdict-only results with no span highlighting; leave the Generator shell and build a plain standalone page (this reverses the 2026-09-29 shell-cartridge design — do not restore it) | plan steps 3, 8, 10 |

## Rule exceptions

Deliberate breaks from `Memory/Long-Term/Coding/vibe-coding-rules.md`, each granted by Luke after
being asked with the rule ID and a reason. Code that matches a row here is intentional — do not
"fix" it.

| Rule ID | Where it applies | Reason | Granted |
|---|---|---|---|
| — | — | — | — |
