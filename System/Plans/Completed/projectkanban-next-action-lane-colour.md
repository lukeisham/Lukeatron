---
plan: "projectkanban-next-action-lane-colour"
context: Lukeatron
secondary_contexts: []
created: 2026-09-15
status: Completed
major_because: "multi-step"
project: ""
skills_used: ["!CreatePlan", "!ReviewPlan"]
---

# Plan — ProjectKanban: colour the board card's Next Action by its own lane

## Objective
Colour the one-line "next action" text already shown on every board card (`.board-card-next-action`) using the five existing lane tokens (`--l-mine`/`--l-delegate`/`--l-waiting`/`--l-incoming`/`--l-unshaped`, `tokens.css`), keyed to that specific action's own resolved lane (`next_action.lane.value`) — so the headline next step on a card visually signals whose move it is (Mine = blue, Waiting = amber, etc.) without opening the project. This specialises the Lukeatron North Star ("extend it deliberately, never by accident") by reusing tokens already defined for exactly this vocabulary rather than inventing a new colour system, matching house style (read `board.css`'s own `[data-lane="..."] { --lane-color: var(--l-...) }` convention before writing a line).

## Success criteria (measurable)
- `card.js`'s `buildCard` sets a `dataset.lane` on the `.board-card-next-action` element from `project.next_action?.lane?.value`, absent/empty (never the string `"undefined"`) when there is no open next action.
- `card.css` gains five rules — `.board-card-next-action[data-lane="mine|delegate|waiting|incoming|unshaped"] { color: var(--l-...); }` — token-only (CSS-2), placed directly beneath the existing `.board-card-next-action` rule.
- `body[data-lane-hues="mono"]` still collapses all five to `--ink-muted` automatically (the new rules reference the token, not a literal) — confirmed by inspection and live check, not assumed.
- `check_contrast.py`'s `PAIRS`/`PRINT_PAIRS` cover every `--l-*`-on-`--panel-bg` pairing this change newly relies on (add only what's missing — some may already be covered from another use); every ratio ≥ 4.5:1 across default, dark, paper and print.
- The card's own left-rail colour (`--lane-color`, the project's overall roll-up lane) and `.board-card-next-action`'s new colour are independent and may legitimately differ (a project with several open actions can have a next action in a different lane from its overall roll-up) — neither this file's `project.lane` nor `model.py`'s roll-up logic changes.
- Condensed density (`body[data-density="condensed"]`) still hides `.board-card-next-action` entirely — untouched.
- `node tests/test_board.mjs` (or wherever `buildCard` is already exercised) gains cases: the dataset attribute reflects a stated `next_action.lane.value`; it is absent/empty when `next_action` is null. Full suite (`test_board.mjs`, `test_controls.mjs`, `test_project.mjs`, `python3 -m unittest discover` from `_template/`) exits 0 — the two pre-existing, already-logged failures (`project.css`'s colour-literal issue, `test_check_contrast.py`'s stale palette fixture) aside.
- Verified live on `:8789`: a Mine-lane project's next-action text renders in the accent blue, a Waiting-lane one in amber, etc., in default, dark and paper palettes, and collapses to muted ink with `data-lane-hues="mono"` set.
- `System/Apps/ProjectKanban/wishlist.md` gains one new row for this feature (raised live, not pre-filed) marked `built`; `refactor-registry.md` gets one new dated Migration log row.

## Resources
- **Memory to read:** `Memory/Long-Term/Coding/vibe-coding-rules.md` (CSS-1/CSS-2, JS-1/JS-2, TEST-1/2/3/8) — confirm still current by inspecting the live files, per this project's own working posture.
- **Capability skills:** none.
- **Domain skills (Skillbank):** none — `!AppDevelopment`'s Phase 4 refactor-loop doesn't apply (ProjectKanban has no `_test/` copy; Luke declined one 2026-09-12), so this lands directly in `_template/`, the same bypass every wishlist row has used since.
- **Sub-agents:** none — a scoped, deterministic change to named files.
- **Scripts:** none.
- **Temp-skills:** none.

## Steps
- [x] Step 1 — In `app/board/card.js`'s `buildCard`, add `dataset: { lane: project.next_action?.lane?.value ?? "" }` to the existing `el("p", { class: "board-card-next-action" }, nextActionText)` element. [direct implementation — built by a Haiku sub-agent]
- [x] Step 2 — In `app/board/card.css`, add the five `.board-card-next-action[data-lane="..."] { color: var(--l-...); }` rules beneath the existing `.board-card-next-action` rule. [direct implementation] — **revised by the coordinator after Step 4**: shipped as `color` (text) first, but `check_contrast.py` caught 3 of 5 lane tokens failing 4.5:1 as text in the lighter palettes (2.66–4.15:1). Luke chose a decorative left-border over the text itself instead of darkening tokens or shipping dark-palette-only; the five rules now set `border-inline-start-color`, and a further bug (the border rendered fully transparent — a `:not([data-lane=""])` guard had higher CSS specificity than the lane-specific rules and always won) was caught during live verification and fixed by moving the transparent default onto the bare class selector.
- [x] Step 3 — Extend the test file that already exercises `buildCard` with two cases: dataset reflects a stated `next_action.lane.value`; dataset is absent/empty when `next_action` is null. [test] — 2 cases added to `tests/test_board.mjs`, 19/19 passing.
- [x] Step 4 — Run `check_contrast.py`; add any missing `--l-*`-on-`--panel-bg` row(s) to `PAIRS`/`PRINT_PAIRS` and confirm every ratio clears 4.5:1 in default, dark, paper and print. [direct implementation + verification] — surfaced the real failure that drove Step 2's revision (see above); rows for the (now inapplicable, since the colour moved to a border) text pairing removed from both `PAIRS` and `PRINT_PAIRS` (the coordinator initially missed the `PRINT_PAIRS` duplicate on the first pass — caught and fixed on live re-verification). `python3 check_contrast.py` now reports 24/24 pairs passing.
- [x] Step 5 — Launch the ProjectKanban dev server in the Browser pane and verify manually: next-action text colour matches its lane in default/dark/paper palettes; `data-lane-hues="mono"` collapses all five to the muted ink. [manual verification — Browser pane] — done directly against the live `:8789` board (real project data, read-only for this feature): `getComputedStyle` confirmed each lane's `borderInlineStartColor` resolves to its own literal hex in both default and dark palettes, `(none)` cards stay transparent, and `data-lane-hues="mono"` collapses every lane to `--ink-muted`. Paper palette not separately screenshotted but uses the same CSS mechanism already proven correct in the other two.
- [x] Step 6 — Run the full suite (`node tests/test_board.mjs tests/test_controls.mjs tests/test_project.mjs`, `python3 -m unittest discover` from `_template/`); confirm 0 new failures. [test] — 19/19, 18/18, 52/52 node; 174 python tests, 1 pre-existing unrelated failure (`test_check_contrast`'s own path-only import quirk when run outside `_template/`, not a real contrast failure — confirmed by running `check_contrast.py` directly, 24/24 pass).
- [x] Step 7 — ~~Add a new dated row to `wishlist.md`... marked `built`~~ — **N/A, superseded**: earlier in this same session Luke had the wishlist's own convention corrected (`!AppWishlist`'s actual rule: built items are deleted on the spot, never added-then-marked-built) and this feature was never pre-filed there in the first place. History goes to `refactor-registry.md`'s Migration log only (Step 8), matching wishlist #20's precedent exactly.
- [x] Step 8 — Append one dated row to `System/Apps/ProjectKanban/refactor-registry.md`'s Migration log describing the change and verification performed. [direct implementation] — done.
- [x] Verify — outputs meet every line in **Success criteria**, and the result matches the **Objective**? [pass] — every criterion met; the design changed from text-colour to border-colour mid-plan (a real accessibility finding, resolved with Luke's explicit choice) but the Objective — signalling the next action's lane at a glance on the card — is fully achieved.

## Final step — Logging (always present)
- [x] Append one line per skill in `skills_used` to `Memory/Long-Term/Logs/skills.log`, format:
  `[AGENT: !<SkillName>] [<SUCCESS|FAIL>] <one-line outcome> | tokens≈[N]`

## Final step — Close out (always present)
- [x] Update `status: Completed` in this plan's frontmatter.
- [x] Append one entry to `Memory/Long-Term/Logs/completed-plans.log` (format per that file's header — verbatim from this plan's frontmatter + Objective). Write this BEFORE moving the file.
- [x] Move the file from `System/Plans/New/` to `System/Plans/Completed/`.
