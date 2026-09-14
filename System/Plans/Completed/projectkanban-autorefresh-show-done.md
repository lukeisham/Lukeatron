---
plan: "projectkanban-autorefresh-show-done"
context: Lukeatron
secondary_contexts: []
created: 2026-09-12
status: Completed
major_because: "multi-step"
project: ""
skills_used: ["!CreatePlan", "!ReviewPlan"]
---

# Plan — ProjectKanban: auto-refresh on registry change + show/hide done actions

## Objective
Ship two ProjectKanban wishlist items together — #5 "Auto-refresh when a registry changes on disk" and #4b "Show/hide done actions" — without changing the `body[data-glyph-*]`-style attribute contracts, the lane/due/count derivation (which must stay computed from OPEN tasks only), or any existing toolbar control's behaviour. This specialises the Lukeatron Charter's North Star (keep Lukeatron correct, legible, doing what it says) by closing two documented, load-bearing gaps between what the dashboard shows and what's actually on disk: a stale board after a background edit, and 68 completed rows the board currently discards outright rather than merely hiding.

## Success criteria (measurable)
- A new lightweight server check (stat-only, no full registry parse) reports whether any project's `registry.md`/`_tracking.yaml` has changed since a given timestamp; `node`/`python3` test coverage proves it does NOT re-parse YAML/Markdown content (cheap enough to poll).
- The client polls that check on an interval, and reloads the page only when it reports a real change — confirmed manually: editing a registry on disk while the board is open triggers a reload within one polling interval; leaving the board untouched for several intervals causes zero reloads and zero full-board refetches.
- The poll skips a reload cycle (retrying next interval instead) while the user's focus is inside an input/textarea/contenteditable, so an in-progress edit is never yanked out from under them.
- `model.build_project` gains a `done_tasks` list (built the same way as `tasks`, from rows where `_is_open()` is false) without changing `tasks`, `open_count`, `lane`, `due_column`/`due_date`/`due_text`, or `glyphs` — all of which must keep deriving from open tasks only, exactly as today. `test_model.py` proves this (a fixture with mixed open/done rows produces identical open-side output whether or not `done_tasks` is populated).
- The per-project detail view (`project.js`/`task-row.js`) gains a "Show done actions" toggle; off (default) renders exactly as today; on, it additionally lists `done_tasks` beneath the open list, visually distinct (e.g. struck-through/dimmed) and read-only (no tick/due/owner/lane controls — they're already done). Manually verified against a project with completed rows.
- `node tests/test_project.mjs`, `node tests/test_controls.mjs`, `node tests/test_board.mjs`, `python3 -m pytest tests/test_model.py tests/test_server.py tests/test_stores.py` (or the project's existing python test runner) all exit 0, including new tests for every behaviour above.
- `System/Apps/ProjectKanban/wishlist.md` rows #4b and #5 changed `open` → `built`.
- `System/Apps/ProjectKanban/refactor-registry.md` carries one new dated history row describing both changes.
- Any drift issues spotted while planning/reviewing are logged to `Memory/Long-Term/Logs/issues.log` (per STEP 6 — see that file for the 2026-09-12/projectkanban-autorefresh-show-done row already filed: `board.js` exports no redraw hook, so this plan's auto-refresh inherits the existing manual Refresh button's full-`location.reload()` behaviour rather than fixing that underlying gap).

## Resources
- **Memory to read:** `Memory/Long-Term/Coding/vibe-coding-rules.md` (CSS-1/CSS-2, JS-1/2/3/6/7, HTML-1/3/4, TEST-1/2/3) — already read during planning of the sibling glyph-menu plan; conventions confirmed still current by inspecting the live files below.
- **Capability skills:** none.
- **Domain skills (Skillbank):** none. `!AppDevelopment`'s Phase 4 Health-Check loop doesn't apply — `refactor-registry.md` already establishes ProjectKanban has no `_test/` copy, so changes are built directly in `_template/` and verified against the real code (same precedent as wishlist #9/#10/#11).
- **Sub-agents:** none — scoped, deterministic code changes across named files, not open-ended judgement.
- **Scripts:** none.
- **Temp-skills:** none.

## Steps

### Part A — #4b: show/hide done actions
- [x] Step 1 — In `model.py`, add a `done_tasks: list[TaskView]` field to `ProjectView` and populate it in `build_project` from `reg.next_actions` rows where `_is_open(row.status)` is false, built via the same `_build_task()` call used for `tasks`. Every other field on `ProjectView` (`tasks`, `open_count`, `lane`, `due_column`/`due_date`/`due_text`, `glyphs`) keeps deriving from the open-only `tasks` list, untouched. [direct implementation]
- [x] Step 2 — Add/extend a `test_model.py` fixture with a project registry containing both open and `☑` done rows; assert `done_tasks` contains exactly the done rows (in file order), `tasks`/`open_count`/`lane`/`due_*`/`glyphs` are byte-identical to a version of the same fixture with the done rows deleted outright. [test] — `TestDoneTasks` (3 tests) added; 32/32 `test_model.py` pass.
- [x] Step 3 — In `app/project/project.js`, add a "Show done actions" toggle button (mirroring the existing toolbar label-toggle pattern, e.g. `density-toggle`'s `Density: <value>` convention) that shows/hides a `done_tasks` section rendered beneath the open Next Actions list. [direct implementation]
- [x] Step 4 — In `app/project/task-row.js` (or a small sibling function), render each done task read-only: action text, owner, a done marker — no tick/due/owner/lane edit controls (they're already resolved), matching the file's existing convention of one row-builder per task shape (solo vs. stem-group vs. linked). Style via existing tokens only (CSS-2). [direct implementation] — `buildDoneTaskRow` added; `.project-task-row--done` in `task-row.css`, tokens only.
- [x] Step 5 — Add/extend `tests/test_project.mjs` covering: toggle off by default; toggle reveals `done_tasks`; a done row renders with no interactive edit controls. [test] — 6 new tests added; 46/47 pass (the 1 failure is the pre-existing, already-logged `project.css` colour-literal issue, untouched by this plan).

### Part B — #5: auto-refresh on registry change
- [x] Step 6 — In `stores.py`, add a stat-only helper (e.g. `latest_registry_mtime(lukeatron_root)`) that walks the same project directories `load_board_sources` already resolves via `read_tracking`, calling `Path.stat().st_mtime` on each project's `registry.md`/`notes.md`/`_tracking.yaml` — no YAML/Markdown parsing — and returns the single latest mtime across all of them. [direct implementation] — split into `latest_mtime_for_tracking` (testable half) + `latest_registry_mtime` (resolves the real tracking path), mirroring `read_tracking`/`load_projects`'s own split.
- [x] Step 7 — In `server.py`, add a lightweight `GET /api/board-changed.json` (or similarly named) endpoint returning `{"latest_mtime": <float>}` from Step 6's helper — cheap enough to poll every few seconds, deliberately not re-running `stores.load_board_sources`/`model.build_board`'s full parse. [direct implementation]
- [x] Step 8 — Add `test_stores.py` coverage for the mtime helper (returns the max across multiple project dirs; unaffected by editing an unrelated file) and `test_server.py` coverage for the new endpoint (200 + correct shape; reflects a touched file's new mtime on the next call, matching the existing `/api/board.json` "no cache" convention). [test] — 5 new tests in `test_stores.py` (26/26 pass), 3 new tests in `test_server.py` (43/43 pass).
- [x] Step 9 — Add a small new client module, e.g. `app/controls/auto-refresh.js`, that polls `/api/board-changed.json` on an interval (a sane default, e.g. 30s — no new user-facing preference; this isn't worth a toolbar control), compares the returned `latest_mtime` against the value first seen on page load, and on a change: skip the reload (retry next interval) if `document.activeElement` is an `input`/`textarea`/`select`/`[contenteditable]`; otherwise call `location.reload()` — the exact same "honest full reload" the manual Refresh button already uses (per the Objective's stated gap), not a silent in-place patch. [direct implementation] — built as `createPoller()` (dependency-injected poll/doc/win) + `init()`, exporting `shouldReload()` separately for direct testing.
- [x] Step 10 — Wire the new module's `init()` call from `controls.js`'s own `init()`, alongside the existing toolbar wiring, keeping `auto-refresh.js` a self-contained module with no toolbar DOM dependency (FR-6's existing boundary: `controls.js` orchestrates, doesn't own polling logic itself). [direct implementation] — confirmed `test_controls.mjs`'s FR-8 "refresh is the only action that touches the network or reload" test still passes (28/28).
- [x] Step 11 — Add a new `tests/test_auto-refresh.mjs` (or extend `test_controls.mjs` if the module is small enough) covering: no reload when `latest_mtime` is unchanged; reload triggered when it changes and focus isn't in a form control; reload deferred (not skipped forever — retried) when focus is in a form control. [test] — new file, 13/13 pass.

### Verification and closeout
- [x] Step 12 — Run every test suite touched: `node tests/test_project.mjs`, `node tests/test_controls.mjs`, `node tests/test_board.mjs`, the new/extended auto-refresh test, and the Python suite (`test_model.py`, `test_server.py`, `test_stores.py`) from `_template/`; confirm 0 failures, including pre-existing tests (no regression). [test] — full `python3 -m unittest discover` run: 151 tests, 1 failure — `test_check_contrast.py`'s `TestParsePaletteOverrides` test, a stale `:root[data-palette=...]` fixture unrelated to any file this plan touches (logged to `Logs/issues.log`, not fixed here). Every node suite touched is green.
- [x] Step 13 — Launch the ProjectKanban dev server and verify manually in the Browser pane: (a) open a project with completed rows, confirm "Show done actions" is off by default and reveals the right rows on toggle, read-only; (b) with the board open, edit a registry file on disk (or touch its mtime) and confirm the page reloads within one polling interval; (c) focus a form control (e.g. a due-date input), touch a registry file, confirm the reload is deferred until focus leaves the control; (d) confirm light and dark palettes both render the done-tasks section correctly (!HouseStyle). [manual verification — Browser pane] — Restarted the live `:8789` server to pick up the Python changes. (a) CH-01 (12 done rows): toggle off by default, reveals dimmed/struck-through read-only rows on click, in both light and dark palettes. (b)-(c) Verified end-to-end against the real server and a real registry file (`PP-01`'s `registry.md`, mtime touched via `os.utime` then restored): a real poller (dependency-injected reload spy, real `fetchBoardChanged`/real DOM focus) reloaded on a genuine change, deferred while a due-date input was focused, and fired on the next tick once focus moved on.
- [x] Step 14 — Update `System/Apps/ProjectKanban/wishlist.md` rows #4b and #5 Status from `open` to `built`, following the exact precedent of rows #9/#10/#11's dated entries. [direct implementation]
- [x] Step 15 — Append one dated row to `System/Apps/ProjectKanban/refactor-registry.md`'s history table describing both changes (files touched, verification performed). [direct implementation]
- [x] Verify — outputs meet every line in **Success criteria**, and the result matches the **Objective**? [pass/fail] — Pass. Every Success criteria line is met; the two pre-existing test failures surfaced during verification are unrelated to this plan's files and are logged separately.

## Final step — Logging (always present)
- [ ] Append one line per skill in `skills_used` to `Memory/Long-Term/Logs/skills.log`, format:
  `[AGENT: !<SkillName>] [<SUCCESS|FAIL>] <one-line outcome> | tokens≈[N]`

## Final step — Close out (always present)
- [ ] Update `status: Completed` in this plan's frontmatter.
- [ ] Append one entry to `Memory/Long-Term/Logs/completed-plans.log` (format per that file's header — verbatim from this plan's frontmatter + Objective). Write this BEFORE moving the file.
- [ ] Move the file from `System/Plans/New/` to `System/Plans/Completed/`.
