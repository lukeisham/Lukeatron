---
plan: "projectkanban-undo-and-keyboard-nav"
context: Lukeatron
secondary_contexts: []
created: 2026-09-20
status: New
major_because: "multi-step"
project: ""
skills_used: ["!CreatePlan", "!ReviewPlan"]
---

# Plan — ProjectKanban: undo the last write (wishlist #1) and keyboard navigation on the board (wishlist #2)

## Objective
Give the Dashboard (`System/Apps/ProjectKanban/_template/`) two daily-use conveniences, both built without loosening any write guard: (#1) one button that restores the cell changed by the most recent write to its previous value, through the same fence / mtime / re-parse guards every other write already passes; (#2) arrow-key movement between board cards, plus `c` to copy the focused card — Enter to open already works. Specialises the Lukeatron North Star — *"extend it deliberately, never by accident"* — by recording, before any code, that the wishlist's premise for #1 was wrong (see below) and by keeping the app's read-only board (FR-12) read-only.

**Correction to the wishlist's premise for #1 (part of what "done" means, not a footnote).** The wishlist row says *"the previous value is on disk"* in `Logs/edits.log`. It is not. `writes._append_edit_log` records only the **new** value (`detail=value='☑ Done'`), never the old one, and every existing line lacks it. So #1 has to start by making `set_cell` record the previous value; edits made before that change cannot be undone, and the UI must say so plainly rather than offer an undo it cannot honour. `edits.log` sits in `Memory/Long-Term/Logs/` and the app already appends to it under a fixed path (`writes.py` FR-5) — this plan adds a field to that same line, not a new writer.

**Scope boundary:**
- **Undo covers `set_cell` only** (Status / Due / Owner / Kind — the four single-cell edits). Notes (`append_note`) and reorders (`reorder_next_actions`) are not undone: a note is an append with no prior value, and a reorder's undo is a different, larger operation. If the latest write is one of those, undo reports "nothing to undo" and names why.
- **One level, no redo.** "Last write" means the latest `outcome=ok` write line in `edits.log`. An undo is itself logged as `undo_set_cell`, which is not undoable — so a second press cannot ping-pong the cell back. Refusals (`outcome=refused:*`) are ignored when finding the last write.
- **Undo applies to any `set_cell`, including ones made by scripts** (`server.set_cell_for_script`) — the button's label names the row, column and value it will restore, so Luke sees what it will touch.
- **Keyboard nav is board-only.** The project view already has real controls with native keyboard behaviour; no new shortcuts there. `Cmd/Ctrl+Z` is deliberately *not* bound to undo — inside the project view's text inputs it belongs to the browser.
- **Not in scope:** restoring focus to a card after returning from a project (a related gap, logged as an issue, not fixed here); redo; multi-level undo.

## Success criteria (measurable)
- **Log carries the old value.** `writes.set_cell` logs `detail=value=<new!r> prev=<old!r>` (raw cell text before the write; an empty cell logs `prev=''`). Old-format lines still parse and are classed "not undoable". `test_writes.py` proves both, plus that no existing `test_writes.py` case had to change.
- **`writes.undo_last(root, *, project_id, mtime)`** finds the latest `outcome=ok` write line; if it is a `set_cell` with a `prev`, restores that value by calling `set_cell` (no second write path — the fence, mtime, re-parse-verify, pending-sweep stamp and log all come along). It raises, and writes nothing, in each of these cases, each with its own new error class and test: nothing to undo / latest write is not a `set_cell` / it has no `prev` (`UndoUnavailableError`); the named `project_id` is not the logged project (`UndoUnavailableError`); the cell no longer holds the value the log says it was set to — someone or `!ProjectSweep` changed it since (`UndoConflictError`); stale mtime (existing `StaleMtimeError`); row now linked (existing `LinkedRowError`). TEST-7 blocked/permitted pair for the conflict guard. Every refusal leaves the file's bytes and mtime unchanged (asserted, as in the reorder tests).
- **Server:** `GET /api/undo-state.json` → `{available, project_id, row, column, value, prev, at, reason}` (read-only, added to the GET-side route list); `POST /api/undo` with `{project_id, mtime}` only — the server re-derives what to undo from the log, never trusting a client-supplied row or value. `ERROR_STATUS` gains `undo_unavailable` and `undo_conflict` (409); `edits.js` gains a sentence for each, worded for Luke. `test_server.py` covers validation, happy path, both refusals, and that `GET /api/undo` and `POST /api/undo-state.json` are refused with `method_not_allowed`.
- **UI:** an "Undo" button in the project view, shown only when `undo-state` names the open project, labelled with what it will restore **and when that write was made** (e.g. *Undo: Status on row 9 → "☐ Open" — changed 14 Sep, 21:02*), so a write from a previous day is never mistaken for "the thing I just did"; the state payload therefore also carries `at` (the logged timestamp); disabled with a reason when unavailable. Pressing it posts once, re-takes the mtime from the response, and re-renders through the existing refetch path. Failure shows the existing error banner. `test_project.mjs` (or a new `test_undo.mjs`) covers present / absent / disabled / success / refusal with an injected edit client.
- **Keyboard nav:** on a focused board card, `←`/`→` move to the previous/next *visible* card in the same lane row (crossing empty cells and column boundaries); `↑`/`↓` move to the nearest visible card in the adjacent lane row with any visible card, preferring the same column, else the nearest column; `c` (no Ctrl/Cmd/Alt) copies the card's title through the same injected `copy` the copy button uses — `Cmd+C` is never intercepted. Enter and Space open as today. Arrow keys at an edge do nothing (no wrap, no error). Cards hidden by the view filter or by density are skipped — visibility is an injectable predicate, because the filter hides cards with CSS `display:none` (`controls.css`), which a fake DOM cannot see.
- **No regression in tab behaviour:** every card keeps `tabindex="0"`; no roving-tabindex change (that would alter Tab order for anyone who relies on it — a separate decision if wanted). `:focus-visible` ring unchanged.
- **Contract tests still hold:** `test_board.mjs`'s AC-3 (board.js registers no change listeners) and FR-12 (nothing under `app/board/` imports an edit client) pass unmodified. The new keyboard module lives under `app/board/` and touches no edit client.
- **Full suite green:** `python3 -m unittest discover` and every `node tests/test_*.mjs` from `_template/` exit 0, bar the pre-existing, already-logged failures (`project.css` colour literal; `test_check_contrast` import quirk) — confirmed unchanged by running the unmodified suite first (Step 1).
- **Verified live on `:8789`** (after restarting the server so the Python changes load): keyboard nav crosses lanes/columns correctly with the All view and with one context view active; `c` puts the card title on the clipboard; on a real project a Status edit followed by Undo restores the original cell on disk with every other byte of `registry.md` unchanged, `edits.log` shows an `ok` `set_cell` (with `prev`) then an `ok` `undo_set_cell`, a second Undo press is refused, and an edit made in another window between the write and the Undo yields the conflict sentence with nothing written.
- **Housekeeping:** `refactor-registry.md` gets one dated Migration log row per idea (noting the wishlist-premise correction for #1 and the direct-edit bypass as with every row since 2026-09-12); rows #1 and #2 are deleted from `wishlist.md` on completion (`!AppWishlist` rule: `built` rows do not persist); `writes.py`'s header comment ("Five edits…") and `README.md` are updated where they now under-describe the app.

## Resources
- **Memory to read:** `Memory/Long-Term/Coding/vibe-coding-rules.md` — PY rules, JS rules (esp. JS-2 no silent failure, JS-5 centralised fetches, JS-7 no library), HTML-5, CSS-1/2, TEST-1/2/3/7/8/9, API-1/2/3/4/6 (two new routes). Re-read the live files before each part rather than trusting this plan's line references.
- **Capability skills:** none.
- **Domain skills (Skillbank):** none — no `_test/` copy exists for ProjectKanban, so the Phase-4 refactor loop does not apply (same bypass as every wishlist row since 2026-09-12).
- **Sub-agents:** none required. Both parts are scoped, deterministic edits to named files, matching every precedent row in `refactor-registry.md`. The one safety-critical file (`writes.py`) should get an independent read-through after Part A (Step 6), as the reorder work did.
- **Scripts:** none. **Temp-skills:** none.

## Steps

### Part 0 — baseline
- [ ] Step 1 — From `_template/`, run `python3 -m unittest discover` and every `node tests/test_*.mjs`; record the exact pre-existing failures so later runs can be compared against them, not against "green". [direct]
- [ ] Step 2 — Re-read `writes.py` (`set_cell`, `_append_edit_log`), `server.py` (`_validate_edit_body`, `Handler`), `app/project/project.js` (`state`, `submitEdit`), `app/board/card.js` and `render.js`; note any drift from the line references above. [direct]

### Part A — #1 Undo: the log carries the old value
- [ ] Step 3 — In `writes.py`, capture the cell's raw previous text inside `_mutate_next_action_cell` (extend its return; update its one caller) and log it in `set_cell`'s success line as `prev=<repr>`. Change nothing else about `set_cell`'s guard order. [direct — safety-critical file]
- [ ] Step 4 — Add a log-line parser (`_parse_edit_log_line`) and `_latest_write_entry(root)` that scans `edits.log` from the end for the newest line whose action is one of `set_cell` / `append_note` / `reorder_next_actions` / `undo_set_cell` with `outcome=ok`, ignoring refusals and the legacy `[BROWSER: …]` lines. Returns a small dataclass; a line without `prev` is returned with `undoable=False` and a reason. Parse `value`/`prev` with `ast.literal_eval` on the `repr`, never `eval`. [direct]
- [ ] Step 5 — Add `UndoUnavailableError` and `UndoConflictError` to the error hierarchy, and `undo_last(...)` per the success criteria: fence/mtime → conflict check (current cell text must equal the logged `value`) → `set_cell(..., value=prev)` with the log action recorded as `undo_set_cell`. Achieve the action name by giving `set_cell` a private keyword-only `_log_action` parameter defaulting to `"set_cell"` — no copy of its body. Add a read-only `undo_state(root)` for the GET route. [direct]
  - [ ] Test in Sandbox — `test_writes.py` cases against a copy of a fixture registry in a temp root: prev is logged; undo restores byte-for-byte (compare the whole file before/after the pair); each refusal case leaves bytes and mtime unchanged; legacy-format line ⇒ unavailable; latest write is a note or reorder ⇒ unavailable; a second undo ⇒ unavailable; a cell changed out-of-band ⇒ conflict; a cell that was blank (`''`) or the nothing-here glyph (`—`) before the edit round-trips through undo (`_expected_field_value` maps those to `None` on read, so this is the likeliest place for a false `TableCorruptionError`). Confirm every pre-existing `test_writes.py` case passes **unmodified**. [test]
- [ ] Step 6 — Independent read-through of the `writes.py` diff for the write-path safety properties (every guard fires before any file write; only the one cell's text differs; refusals leave the file untouched). [sub-agent — one review agent, as the reorder work did]

### Part B — #1 Undo: the API surface
- [ ] Step 7 — In `server.py`: add `GET /api/undo-state.json` (read-only) and `POST /api/undo` (`{project_id, mtime}` validated; no row/value accepted); add `undo_unavailable` / `undo_conflict` to `ERROR_STATUS` (409) and route them in the `writes.*Error` handling; keep `_WRITE_ONLY_PATHS` and the wrong-method refusals correct for both new paths. [direct]
  - [ ] Test in Sandbox — `test_server.py`: validation of a missing/bad `project_id` or `mtime`; happy path; both refusals; wrong-method refusals. [test]
- [ ] Step 8 — In `app/project/edits.js` add a `postUndo` alongside `postEdit` (JS-5 — the one place these calls live), `fetchUndoState`, and sentences for `undo_unavailable` / `undo_conflict`, e.g. *"There is nothing to undo — the last change was made before undo existed, or wasn't a single-cell edit."* / *"That cell has changed since — refresh; nothing was undone."* [direct]

### Part C — #1 Undo: the button
- [ ] Step 9 — In `app/project/`, add the Undo button (a small `undo.js` builder, mirroring how `sections.js` builds its toggles and reusing `project-copy-btn`'s class): fetch undo-state on project load and after every successful write; show only when `project_id` matches the open project; label from the state; `aria-label` includes the same text; disabled-with-reason otherwise. `project.js` owns the round-trip and mtime, as it does for `submitEdit`. No new colour literals — tokens only (`check_contrast.py` must still pass; add a pair only if a new text/ground combination appears). [direct]
  - [ ] Test in Sandbox — `test_project.mjs` / `test_undo.mjs` with an injected client: present, absent (other project), disabled, success re-takes mtime and refetches, refusal shows the banner and leaves the list as it was. [test]

### Part D — #2 Keyboard navigation
- [ ] Step 10 — Add `app/board/keynav.js`: a pure function `nextCard(cards, current, key, { isVisible })` over an array of `{el, lane, column}` descriptors, implementing the arrow rules in the success criteria, plus `attachKeynav(root, { isVisible, copy })` that installs **one** delegated `keydown` on the board grid (not one per card) and calls `.focus()` on the target. Default `isVisible` = `el => el.offsetParent !== null`. `c` is handled here via the same `copy` the card's button uses, ignoring events with `ctrlKey`/`metaKey`/`altKey` and events whose target is not a `.board-card`. `card.js`'s own Enter/Space handler is left as is. [direct]
- [ ] Step 11 — Call `attachKeynav` from `render.js` after the grid is built, not from `board.js`: `test_board.mjs`'s AC-3 greps **`board.js` only** and fails on any `addEventListener` there other than the `hashchange` route switch, and it also requires `renderBoard(` to appear exactly once in `board.js`. The listener therefore lives in `keynav.js`. Confirm AC-3 passes unmodified. [direct]
  - [ ] Test in Sandbox — `test_board.mjs` / new `test_keynav.mjs` against the existing fake DOM: each direction; edges do nothing; empty cells and empty lanes skipped; hidden cards skipped via injected `isVisible`; `c` copies title, `Cmd+C` and `Ctrl+C` do not; a keypress on the copy button or a non-card target is ignored; AC-3 and FR-12 contract tests pass unmodified. [test]

### Part E — verify, document, close
*No `!Checkpoint` line: nothing leaves the system and no Long-Term store changes — the `edits.log` append is the app's existing, fixed-path write.*

- [ ] Step 12 — Full suite from `_template/` (Python + every `.mjs`); compare against Step 1's baseline. [direct]
- [ ] Step 13 — Verify live per the last-but-one success criterion. Restart the `:8789` server first; earlier sessions could not always reach the process bound to that port (registry, 2026-09-15). **Fallback if it cannot be restarted:** start a second instance on another port (`server.run(port=8790)` — `run` already takes a port) and verify there, or ask Luke to restart it; never mark the live criterion met on the strength of unit tests alone — report it as unverified instead. For the undo round-trip use a low-stakes row in a catch-all project (e.g. LU-03 Lukeatron Odds and Ends): make the edit, undo it, and confirm the file is byte-identical to before. The test edits append a few real lines to `edits.log` — acceptable, it is append-only and labelled. Take one screenshot of the Undo button and one of a focused card. [direct — preview tools]
- [ ] Step 14 — Update `writes.py`'s header comment and the app `README.md`; add the two Migration log rows to `refactor-registry.md`; delete rows #1 and #2 from `wishlist.md`. [direct]
- [ ] Step 15 — Log out-of-scope findings to `Memory/Long-Term/Logs/issues.log`: the lost-focus-after-returning-from-a-project gap, (the wishlist row #1's wrong premise was already corrected on 2026-09-20 when this plan was written). [direct]
- [ ] Verify — outputs meet every line in **Success criteria**, and the result matches the **Objective**? [pass/fail]

## Final step — Logging (always present)
- [ ] Append one line per skill in `skills_used` to `Memory/Long-Term/Logs/skills.log`, format:
  `[AGENT: !<SkillName>] [<SUCCESS|FAIL>] <one-line outcome> | tokens≈[N]`

## Final step — Close out (always present)
- [ ] Update `status: Completed` in this plan's frontmatter.
- [ ] Append one entry to `Memory/Long-Term/Logs/completed-plans.log` (format per that file's header — verbatim from this plan's frontmatter + Objective). Write this BEFORE moving the file.
- [ ] Move the file from `System/Plans/New/` to `System/Plans/Completed/`.
