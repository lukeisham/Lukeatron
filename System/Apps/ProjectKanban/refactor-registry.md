# ProjectKanban — Refactor Registry

kind: app
aliases: Dashboard app, Dash Board app, Project Dashboard (colloquial — the actual retired app of that name is archived separately, see `Archive/ProjectDashboard-app-2026-09-12/`)
template: `_template/`
test: none — Luke declined a `_test/` copy, 2026-09-12
last_updated: 2026-09-14 (MinorTasks queue reader removed)

## In two lines
A Kanban board over every tracked Lukeatron project, opened in a browser from Dropbox. Replaced
ProjectDashboard as the project dashboard kept live on `:8789`.

## Next step
None open. Luke confirmed all three pending items on 2026-09-12: skip `_test/`, collapse lane
colours to the house standard, and delete the Sandbox design documents — see Migration log.
Wishlist items 9, 10, 11, 4b and 5 are now built (see Migration log, 2026-09-12) — no other change
pending.

## Where things are
```
ProjectKanban/
├── _template/              the canonical copy — raw working code + README.md, no data, no specs
├── refactor-registry.md    this file
└── wishlist.md             the project's idea backlog, carried forward from Sandbox, still live
```
No `_test/` — Luke declined one; the refactor loop below (STEP 7 of `!AppRefactor`) does not apply
until a test copy exists. Changes, if any arise, would need `_test/` built first.

## Granted rule exceptions
Carried forward from the build. Must match `_template/README.md` exactly.

| Rule ID | Where | Reason | Granted on |
|---|---|---|---|
| SR-4 — share, don't copy-paste | The whole app: its own copies of the parsing, write and palette modules rather than sharing ProjectDashboard's | A new app expected to replace the old one; divergence was the intended outcome | 2026-09-10 |

## Resume block
A cold agent picks this up by reading, in order:
1. This registry — nothing is currently open.
2. `_template/README.md` — key decisions and their reasons, cross-boundary behaviour, navigation map.
3. `wishlist.md` — the project's live idea backlog.
Do not reconstruct state from conversation history. This file is the state.

## Migration log
| Date | Event |
|---|---|
| 2026-09-12 | Moved from `System/Sandbox/ProjectKanban/build/` to permanent home `System/Apps/ProjectKanban/_template/`. Copy verified: 57 files, file-by-file diff clean, executable bits preserved. 140 Python unittest + 91 node test + 23 contrast checks all passed, both pre- and post-copy. |
| 2026-09-12 | Promoted to the live project dashboard on `:8789`, replacing ProjectDashboard: `server.py` PORT changed 8790→8789; new `ensure-kanban.sh` wired into `.Claude/settings.json`'s SessionStart hook; `.Claude/launch.json`'s `project-dashboard`/`project-dashboard-TEST` entries replaced with `project-kanban`; old ProjectDashboard app archived to `Archive/ProjectDashboard-app-2026-09-12/`; `CLAUDE.md` and `!HouseStyle/reference/sources.md` updated to point here. |
| 2026-09-12 | Luke resolved the three outstanding decisions: no `_test/` copy; lane colours collapsed to the house two-accent cap (`app/tokens.css`'s five `--l-*` tokens now all resolve to `--ink-muted`; `board.css`'s `data-lane-hues="mono"` toggle is a no-op, kept wired); Sandbox design documents deleted (`ProjectKanban-prd.md`, `_specs/`, `build.md`, `registry.md` — `System/Sandbox/ProjectKanban/build/` and `wishlist.md` were left in place, not part of the confirmed deletion scope). |
| 2026-09-12 | Wishlist #9 and #10 built directly in `_template/` — no `_test/` exists, so this bypassed the normal Phase 4 refactor-board/Health-Check loop (STEP 7 of `!AppRefactor`), same as the lane-colour collapse above. Verified against the code, not assumed: #9 — `card.js` `buildCopyIcon()` (~line 184) replaces the "Copy" text button with a two-overlapping-rectangles SVG, `aria-label` unchanged; #10 — `card.js` `buildGlyphIcon()` (~line 140) wraps each glyph in a `board-glyph-tip` span so `card.css`'s `::after` renders an instant styled tooltip from the existing `title` attribute, rather than the browser's native slow one. Both rows marked `built` in `wishlist.md`. |
| 2026-09-12 | Wishlist #11 (twelve glyph toggles → disclosure menu) closed out. The code was already built — `app/controls/glyph-menu.css` (new file), the "Glyphs" toolbar group in `index.html` restructured to one `glyph-menu-toggle` trigger plus a `popover` panel, `countActiveGlyphs`/`glyphMode` added to `glyph-switches.js`, `renderGlyphMenu` added to `controls.js` — but plan `glyph-toggle-menu-refactor.md`'s own closing steps (wishlist status, this registry row) had been left undone. Re-verified rather than assumed: `test_controls.mjs` 27/27 and `test_board.mjs` 21/21 pass; live check against the running `:8789` server confirmed one "Glyphs: all ▾" trigger at rest, opening to exactly "Display all" / "Display none" / "Display individual glyphs". Row marked `built` in `wishlist.md`; plan moved to `System/Plans/Completed/`. |
| 2026-09-12 | Wishlist #4b (show/hide done actions) and #5 (auto-refresh) built together per `projectkanban-autorefresh-show-done.md`. #4b: `model.py`'s `ProjectView` gained a `done_tasks` list built alongside (never replacing) `tasks` — `test_model.py` proves every open-side field (`tasks`/`open_count`/`lane`/`due_*`/`glyphs`) is byte-identical with or without done rows present; `app/project/actions.js`/`task-row.js`/`project.js` gained a "Show done actions (N)" toggle, off by default, revealing read-only dimmed/struck-through rows. #5: new stat-only `stores.latest_registry_mtime()` (walks `_tracking.yaml`'s resolved project paths, stats `registry.md`/`notes.md`, never re-parses content) backs a new `GET /api/board-changed.json`; new `app/controls/auto-refresh.js` polls it every 30s via `createPoller`, reloading (the same `location.reload()` the manual Refresh button already uses) on a real change unless focus is in a form control, in which case the change is retried next tick. Test coverage added: `test_model.py` (+3), `test_project.mjs` (+5), `test_stores.py` (+5), `test_server.py` (+3), and a new `tests/test_auto-refresh.mjs` (13 tests, dependency-injected poller — no real timer/fetch/reload needed). Verified live against `:8789`: `done_tasks` populates from real project data (CH-01, 12 done rows) in both light and dark palettes; a real registry file's mtime bump triggers a reload end-to-end, is deferred while a due-date input is focused, and fires on the next tick once focus moves on. Two pre-existing, unrelated test failures surfaced running the full suite (`project.css`'s box-shadow colour literal; a stale `:root[data-palette=...]` fixture in `test_check_contrast.py`) — both already logged in `Logs/issues.log`, neither touched by this change. Both rows marked `built` in `wishlist.md`. |
| 2026-09-14 | Dormant MinorTasks queue reader removed, following the queue's retirement the same day (`Trash/MinorTasks-queue-retired-2026-09-14/`). Direct edit in `_template/` — no `_test/` exists, same bypass as the 2026-09-12 rows. `stores.py`: module docstring, `QueueRow`/`_QUEUE_FIELDS`/`_QUEUE_ALIASES`/`read_queue`, and `BoardSources.queue`/`queue_skipped` (plus the `load_board_sources` call) removed; two comments no longer mention the queue. `model.py`: scope note and `_is_open` docstring drop the queue. `README.md`: `queue.md` removed from the `stores` sources row. `app/controls/controls.css`: comment only, no rendered change. `tests/test_stores.py`: `TestQueue` (2 tests) and `read_queue` in the public-API check removed; fixture `tests/fixtures/queue_sample.md` moved to `Trash/MinorTasks-queue-retired-2026-09-14/ProjectKanban-fixture/`. Nothing read `BoardSources.queue` (server, model, app), so behaviour is unchanged. Verified: Python 139 run (141 − 2 removed), node 92/93, `load_board_sources` against the real tree returns 45 projects / 0 skipped / 2 plans. The same two pre-existing failures as before the change (`test_check_contrast` palette fixture; `project.css` colour literal), both already in `Logs/issues.log`, untouched. |
