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
| 2026-09-29 | Build-board row 13 (whole-app review) closed by Luke: **OQ-X1** — poster/diagram sharing OK with attribution, non-commercial use only. **OQ-D5** — the 36 added element names stand as-is; no TV Tropes match-check required before they count as real content. **AC-D4** — the 181-element data-transcription checklist (`verify/results.md`) accepted as-is, unchecked; Luke will correct any mismatch he later spots rather than auditing it row by row now. **Library authoring judgements** — accepted as-is. **AC-C10** (pleasantness of the story-map interaction) — accepted as-is. **OQ-V1** — detail panel's default "above" position accepted for now. **The "discreet" popularity number** — accepted as looking fine. Human-only smoke items (`share/smoke-results.md`'s HUMAN rows: double-click launcher, real Safari/Firefox, real airplane-mode, the print dialog itself, pasting the clipboard, Luke opening the file offline) deliberately deferred — Luke will run these himself once the app is confirmed operational. | row 13 |
| 2026-09-29 | Build accepted; build docs retired. Full test suite verified first (534 JS + 77 Python, 611/611 passing) and the app launched and driven live in a browser (diagram, story map, About panel all correct) before anything was deleted. `_build/` (`prd.md`, `specs/`, `build.md`, `BUILD-NOTES.md`) removed via `git rm`; git history keeps every version. `README.md` and `StyleGuide.md` written per Phase 4 STEP 2/4. App is operational; refinement from here is ordinary editing (`!AppDevelopment` Phase 4's own rule) — human-only smoke tests (launcher double-click, real browsers, real offline, print dialog, clipboard) are still Luke's to run himself, not a re-open of this approval. | Phase 4 complete |

## Rule exceptions

Deliberate breaks from `Memory/Long-Term/Coding/vibe-coding-rules.md`, each granted by Luke after
being asked with the rule ID and a reason. Code that matches a row here is intentional — do not
"fix" it.

| Rule ID | Where it applies | Reason | Granted |
|---|---|---|---|
| JS-7 (no build step, no bundler) | `share/build_share.py` and its generated `dist/Storytelling*.html` only — not the app source, not Luke's own copy | The shareable copy must open by double-click without Python; ES modules are blocked on `file://`. Alternatives (hosted page, zip + launcher) offered and declined | 2026-09-21 |
