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
| 2026-09-30 | Classification criteria approved (seed-pipeline FR-5) — Category, Form, Function, escalation rules; Popularity to be scored by web frequency (count of sources, log-scaled to 0–100); 15-source list and merge approach approved | `seed/classification-criteria.md` (was `_build/`) |
| 2026-09-30 | Reversal: a device may have several Category tags (`device_categories`); Form and Function stay one each; `popularity` required | database.spec AD-8, PRD Data Model |
| 2026-10-02 | Popularity write approved: 192 of 272 scores updated from `seed/popularity.json` (8 of 15 sources read; LogicalFallacies.org and U. Kentucky glossary substituted); new `ai_confidence_rating` column (high/medium/low) on every device | seed-pipeline; database schema |
| 2026-10-02 | Final counts confirmed (272 devices, 295 examples, 58 Flipside links, nodes 13/42/23); Flipside devices inherit their fallacy's popularity; seed pipeline closed | seed-pipeline Done |
| 2026-10-02 | Each device row shows a monochrome AI-confidence badge (high filled, medium outlined, low dashed) after its name, on screen only — hidden in Print, absent from Copy | frontend.spec |
| 2026-10-02 | `ai_confidence_rating` added to the PRD Data Model and UI (badge); `database.spec.md` AD-9 | PRD v0.20 |
| 2026-10-02 | Frontend closed without the Copy / Print check in Chrome (Luke skipped it); AC-5 stays unverified | frontend.spec Done |
| 2026-10-02 | Build accepted; build docs retired (`_build/` deleted, README written). `classification-criteria.md` kept, moved to `seed/` | !AppDevelopment Phase 4 |
| 2026-10-02 | Front-end additions (Luke): AI-confidence badge is a toolbar toggle (on by default); devices indent under their types (the indent rule was being overridden, so nothing indented); **Reveal** toggle, on by default — tree views show groups and types only, each heading has a reveal button (▸ n / ▾ n) for its devices, search and an isolated heading show everything, off lists every device; a remembered **Open on** setting picks the group the app loads with (default: search only). Show definitions, Show examples, Show AI confidence and Reveal are remembered between visits, like Open on (Luke, 2026-10-02); Fuzzy match is not | front end |
| 2026-10-03 | Front-end refactor (Luke): a Flipside shows as `Fallacy/Flipside` everywhere (list, Copy, search, sort); Show definitions / Show examples / Show AI confidence / Reveal move into a checkable **Display** pull-down; the **Reveal** option is renamed **Indent** (its per-heading ▸ n buttons keep their wording); Print, Copy and Display use one house-style button; the four options stay remembered between visits, now via `app/settings.js` | front end |

## Rule exceptions

Deliberate breaks from `Memory/Long-Term/Coding/vibe-coding-rules.md`, each granted by Luke after
being asked with the rule ID and a reason. Code that matches a row here is intentional — do not
"fix" it.

| Rule ID | Where it applies | Reason | Granted |
|---|---|---|---|
| — | — | — | — |
