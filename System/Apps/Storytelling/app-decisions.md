# Storytelling — Decisions

## Approvals

What Luke has signed off. A draft and an approved document look identical on disk — this table is
the only difference. A decision that deliberately reverses an earlier one also goes here, so a
later agent does not "restore" the old behaviour.

| Date | Approved | Version / scope |
|---|---|---|
| 2026-09-20 | PRD approved (renamed Storytelling; Style guide section added); five-spec set, launcher + stdlib server, system fonts | v0.5 |
| 2026-09-21 | PRD frozen; design closed; mockups deleted | v1.3 |
| 2026-09-28 | Moved from Sandbox to `System/Apps/Storytelling/`; build docs retired, Sandbox copy archived to `Archive/appdevelopment-restructure-2026-09-28/` | — |

## Rule exceptions

Deliberate breaks from `Memory/Long-Term/Coding/vibe-coding-rules.md`, each granted by Luke after
being asked with the rule ID and a reason. Code that matches a row here is intentional — do not
"fix" it.

| Rule ID | Where it applies | Reason | Granted |
|---|---|---|---|
| JS-7 (no build step, no bundler) | `share/build_share.py` and its generated `dist/Storytelling*.html` only — not the app source, not Luke's own copy | The shareable copy must open by double-click without Python; ES modules are blocked on `file://`. Alternatives (hosted page, zip + launcher) offered and declined | 2026-09-21 |
