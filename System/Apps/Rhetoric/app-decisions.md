# Rhetoric — Decisions

## Approvals

What Luke has signed off. A draft and an approved document look identical on disk — this table is
the only difference. A decision that deliberately reverses an earlier one also goes here, so a
later agent does not "restore" the old behaviour.

| Date | Approved | Version / scope |
|---|---|---|
| 2026-09-27 | PRD approved in full | v0.14 |
| 2026-09-28 | Final visual design locked: `dense-body-manuscript-top.html` | PRD v0.18 |
| 2026-09-28 | Design closed; PRD and all five specs approved | PRD v0.18 |
| 2026-09-30 | PRD approved in full, incl. several Category tags per device, required popularity, Data Model, no-group search with a hint on open | v0.19 |
| 2026-09-30 | Classification criteria approved (seed-pipeline FR-5) — Category, Form, Function, escalation rules; Popularity to be scored by web frequency (count of sources, log-scaled to 0–100); 15-source list and merge approach approved | `_build/classification-criteria.md` |
| 2026-09-30 | Reversal: a device may have several Category tags (`device_categories`); Form and Function stay one each; `popularity` required | database.spec AD-8, PRD Data Model |
| 2026-10-02 | Popularity write approved: 192 of 272 scores updated from `seed/popularity.json` (8 of 15 sources read; LogicalFallacies.org and U. Kentucky glossary substituted); new `ai_confidence_rating` column (high/medium/low) on every device | seed-pipeline; database schema |
| 2026-10-02 | Final counts confirmed (272 devices, 295 examples, 58 Flipside links, nodes 13/42/23); Flipside devices inherit their fallacy's popularity; seed pipeline closed | seed-pipeline Done |
| 2026-10-02 | Each device row shows a monochrome AI-confidence badge (high filled, medium outlined, low dashed) after its name; Copy text unchanged | frontend.spec |
| 2026-10-02 | `ai_confidence_rating` added to the PRD Data Model and UI (badge); `database.spec.md` AD-9 | PRD v0.20 |

## Rule exceptions

Deliberate breaks from `Memory/Long-Term/Coding/vibe-coding-rules.md`, each granted by Luke after
being asked with the rule ID and a reason. Code that matches a row here is intentional — do not
"fix" it.

| Rule ID | Where it applies | Reason | Granted |
|---|---|---|---|
| — | — | — | — |
