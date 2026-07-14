---
plan: "viewer-tools-enhancements"
context: Personal Research
secondary_contexts: [Personal Productivity]
created: 2026-07-02
status: Completed
completed: 2026-07-02
major_because: "multi-step — eight viewer feature changes PLUS opt-in editing capabilities across two tools (project-dashboard/serve.py + lukeatronwiki-viewer/serve.py); editing writes to Medium-Term registries/notes and the Long-Term wiki queue"
project: ""
skills_used: ["!DetermineContext", "!CreatePlan", "!ReviewPlan"]
outcome: "All 5 phases, 17 steps done. Dashboard: wake/due, drift marker, registry read-only route, small fixes (all verified on live data, Test A). Wiki: red links, integrity footer (25 files·24 indexed·1 unindexed·2 dead·34 one-way — matches audit exactly), queue robustness, filter+crosslinks (verified live, Test B). Dashboard edit mode: tick/cycle-state/note-scrap/pending-sweep-stamp, all cell/append-level, POST-only, mtime-guarded (409), store-fenced (403), logged to edits.log (verified on scratch copy, Test C). Wiki edit mode: quick-capture (needs_absorb flag for !IdeaWiki) + qstatus done/dropped, same guardrails, zero routes touch node pages/_index.yaml/subject stores (verified on scratch copy, Test D). Both live SessionStart servers restarted flag-less (pure viewers); two 'Edit Mode' .command launchers added; edits.log registered in Logs/_index.yaml; both READMEs updated. Two pre-existing bugs found+fixed during scratch-copy testing (not introduced by this plan, but blocking its own D2 test methodology): dashboard's notes_rel and wiki's rel_path both crashed under a *_DIR override outside ROOT — fixed with a relative-or-absolute fallback in both tools."
---

# Plan — Enhance the Project Dashboard and LukeatronWiki viewer (+ opt-in editing)

## Objective
Ship the four ranked Dashboard improvements and the four ranked Wiki-viewer improvements, then add **opt-in, guard-railed editing**: direct micro-edits on the Dashboard (tick an action done, cycle its State, append a scrap to `notes.md`) and **capture-not-edit** on the Wiki (quick-capture to the queue with `needs-absorb`, tick a queue item done/dropped) — both tools staying zero-dependency, 127.0.0.1-bound, and **read-only by default** (writes exist only behind an explicit edit-mode flag), so the browser gains hands without the skill layer losing ownership of the stores.

## Success criteria (measurable)
- **Dashboard** (`project-dashboard/serve.py`), served on a temp port against live data, returns HTTP 200 with no traceback and its HTML now contains: (a) a `wake:` value on waiting projects and a `due` value in square tooltips + the bottleneck panel; (b) a drift marker whenever a project's live worst-open-action state differs from its board `state`; (c) each project's registry path shown, and a `/project?p=` route rendering that registry read-only (200 for a real registry, 403 outside `Projects/`); (d) `.proj.complete` applied to non-Active rows, filter-chip selections persisted across reload, and `parse_due` accepting `d/m/Y`.
- **Wiki viewer** (`lukeatronwiki-viewer/serve.py`), served on a temp port, returns 200 with no traceback and now: (a) renders a dead `[[wikilink]]` in a distinct "red-link" style (verified on the known-dead `[[theology-aphorisms]]`); (b) shows an integrity footer on `/pages` reporting files / indexed / unindexed / dead-links / one-way-edges counts that **match the current data** (at authoring time: 25 files · 24 indexed · 1 unindexed · 2 dead · 34 one-way — recompute at test time rather than asserting these literals, since the logged data faults may be repaired independently); (c) surfaces any queue item whose `intent` isn't read/watch/write in a ⚠ strip, and collapses `done`/`dropped`/`promoted` rows into a "recently finished" strip; (d) a client-side title filter on `/pages` and a cross-link to the sibling tool in each sidebar.
- **Editing — Dashboard** (only when `LUKEATRON_DASHBOARD_EDIT=1`): (a) POST `/do/tick` flips exactly one Next-Action row's Status cell to `☑ Done` — verified by diffing the registry before/after (only that cell changed, table formatting intact); (b) POST `/do/state` cycles one row's State cell 🔴→🟠→🔵→🟢→⚪ with the same single-cell guarantee; (c) POST `/do/note` appends a timestamped scrap under a `## 📥 Browser scraps` heading in that project's `notes.md`, touching nothing else; (d) any write to a registry stamps that project's `_tracking.yaml` row `pending_sweep: true` (never rewrites `state`/`wake`); (e) an ✏️ edit-mode badge shows; without the flag, all `/do/*` routes return 403 and no edit UI renders.
- **Editing — Wiki viewer** (only when `LUKEATRONWIKI_EDIT=1`): (a) POST `/do/capture` appends a minimal well-formed item to `_queue.yaml` (`id` = next free `q-NNN`, title, kind, intent ∈ read|watch|write, `status: queued`, `needs_absorb: true`, source, added = today) and bumps `count:` + `last_updated:` — the board shows it flagged "needs absorb" for `!IdeaWiki` to complete; (b) POST `/do/qstatus` flips one queue item's `status` to done or dropped (no other transitions; `promoted` and node retirement stay with the agent/`!ArchiveMemory`); (c) no route writes node pages, `_index.yaml`, or any subject store; without the flag, `/do/*` → 403, no edit UI.
- **Guardrails, both tools, verified by test:** writes happen only on **POST** (a GET to any `/do/*` returns 405); every write re-validates its target path inside the tool's own store fence (`Projects/` / `LukeatronWiki/`); each edit form carries the target file's **mtime** and the server refuses with 409 if the file changed since render (fail closed — re-render, never overwrite); every browser write **appends one line to `Memory/Long-Term/Logs/edits.log`** (`[BROWSER: dashboard|wiki] [verb] <target> <summary> <timestamp>`) so agents can see state moved outside the skill layer; writes are **cell/append-level only** — no whole-file rewrite path exists in the code.
- The always-on SessionStart servers stay **read-only** (their `ensure-*.sh` launch without the edit flags); each tool's `.command` launcher gains an "Edit mode" variant so edit mode is a deliberate, per-launch choice.
- Both tools remain **dependency-free** (stdlib only) and **127.0.0.1-bound**; the path-traversal fences still refuse `../` escapes on read AND write routes (re-tested).
- Both live background servers are restarted (read-only mode) so the running instances reflect the edits.

## Resources
- **Memory to read:** none (build work; reads the tools + their live data only)
- **Capability skills:** none
- **Domain skills (Skillbank):** none
- **Sub-agents:** none — deterministic code edits; one agent pass with a per-feature curl test
- **Scripts:** the tools' own `serve.py` run headless on a temp port (`*_NO_BROWSER=1 *_PORT=<temp>`) as the test harness; write-tests point `LUKEATRON_PROJECTS_DIR` / `LUKEATRONWIKI_DIR` at scratch copies under the session scratchpad — no new script written
- **Temp-skills:** none
- **New artefacts:** `Memory/Long-Term/Logs/edits.log` (+ its `_index.yaml` row); one "Edit mode" `.command` launcher per tool

## Design decisions (for !ReviewPlan and Luke to confirm)

**D1 — Scope is viewer CODE only; the four DATA faults are logged separately.** This plan fixes the eight tool improvements. The underlying data faults (2 dead wikilinks, 34 one-way `related:` edges, `lukeatronwiki` absent from `_index.yaml`) are `!IdeaWiki`/`!ArchiveMemory` work, not viewer code — logged to `issues.log`. The viewer changes (W1 red-links, W2 integrity footer) make those faults *visible*; they don't repair the data.

**D2 — Read features test against live data; write features test against scratch copies.** The Phase A/B viewer features are read-only, so a headless temp-port server pointed at the real store is a safe, faithful test. The Phase C/D **write** features are tested against scratch copies of the stores (under the session scratchpad, via the existing `LUKEATRON_PROJECTS_DIR` / `LUKEATRONWIKI_DIR` overrides) so no live file is mutated until the code has proven single-cell/append-only behaviour by diff. This is the Gate-C-equivalent "Sandbox test passes before promotion". The live SessionStart servers restart (read-only) only at the very end.

**D3 — Cross-link uses each tool's default port.** The sidebar cross-link (W4) targets `:8788` / `:8787` — the defaults. Ports auto-bump if busy, so in the rare double-bind case a link could miss; acceptable for a local convenience link, and noted in a code comment.

**D4 — `/project` route mirrors the existing wiki `/lt` route.** The read-only registry view (D-dashboard #3) reuses the proven `/lt` pattern (resolve-safe, fence to `Projects/`, render markdown) rather than inventing a new mechanism — house-style consistency.

**D5 — Two different editing philosophies, on purpose.** The Dashboard gets **direct micro-edits** because its store is Medium-Term (apply-safe) and a form edit is governance-equivalent to Luke editing the registry in a text editor — which he already may. The Wiki gets **capture-not-edit** because its real invariants (verbatim content in subject stores, pointer nodes with no substantive content, bidirectional edges, `_index.yaml` as the agent's map) are judgement work a dumb server cannot uphold: the browser may *queue* and *tick*, but only `!IdeaWiki` absorbs and only `!ArchiveMemory` retires. No route edits node pages — deliberately omitted, not deferred.

**D6 — Edit mode is opt-in per launch, never ambient.** Writes exist only when the server is started with `LUKEATRON_DASHBOARD_EDIT=1` / `LUKEATRONWIKI_EDIT=1`. The SessionStart always-on instances launch WITHOUT the flags and stay pure viewers; a separate "Edit mode" `.command` launcher makes editing a deliberate choice with a visible ✏️ badge. This keeps the existing safety story intact by default.

**D7 — Board state stays !ProjectSweep's.** A browser tick/state-cycle changes the *action row*, never the project's `_tracking.yaml` `state`/`wake` — instead the write stamps `pending_sweep: true` on that project's row so the next sweep reconciles the colour board. The dashboard's existing drift marker (A2) makes the interim divergence visible rather than hidden.

**D8 — Fail-closed writes + audit trail.** Every write: POST-only (GET → 405), fenced to the tool's own store, mtime-guarded (409 on conflict — the file changed under the form; re-render, never clobber), cell/append-level only, and logged to a new `Memory/Long-Term/Logs/edits.log` so agents discover browser-side changes instead of being surprised by them. `edits.log` is registered in `Logs/_index.yaml`.

## Steps
Bite-sized and ordered — Dashboard first (simpler model), then the viewer. Each feature is edited then curl-tested on a temp port before moving on.

### Phase A — Project Dashboard (`System/Tools/project-dashboard/serve.py`)
- [x] A1 — **Wake + due.** Add `wake` to the left-rail meta on waiting/any project that has one; add `due` to each task square's `data-meta` tooltip and to the bottleneck "next move" panel. (`build_project` already carries `wake`; `due` is already parsed per action.) [edit]
- [x] A2 — **Drift marker.** In `build_project`, compute the live worst OPEN-action state; if it maps to a different `STATES` order than the board `overall`, expose it. In `render_proj`, show a small "· actions suggest {state}" hint chip when they differ. [edit]
- [x] A3 — **Registry path + read-only route.** Show each project's `path` as a footer on its row (mirror the wiki's file-path footer). Add a `/project?p=<path>` GET route that resolves-safe, fences to `Memory/Medium-Term/Projects/`, and renders the registry markdown read-only (reuse the `/lt` shape). Link the row footer to it. [edit]
- [x] A4 — **Small fixes.** Apply `.proj.complete` to non-Active rows; persist the filter-chip `off` set in `localStorage` (save on click, restore on load, re-`apply()`); extend `parse_due` with `%d/%m/%Y` (and `%d-%m-%Y`). [edit]
  - [x] Test A — run `LUKEATRON_DASHBOARD_NO_BROWSER=1 LUKEATRON_DASHBOARD_PORT=8798 python3 serve.py` headless; curl `/`, a `/project?p=<real registry>`, and `/project?p=` with a traversal attempt; assert 200 + wake/due/drift/path present, 200 for the real registry, 403 for the escape, no traceback. Kill the temp server.

### Phase B — LukeatronWiki viewer (`System/Tools/lukeatronwiki-viewer/serve.py`)
- [x] B1 — **Red links.** Make the known-slug set available at render time (set a module global from `load_pages()` in `do_GET`); in `md_inline`, style a `[[wikilink]]` whose target isn't a known slug with a `wl-dead` class. Add a `--red` CSS var + `.wl-dead` rule. [edit]
- [x] B2 — **Integrity footer.** Add a loader for `_index.yaml` page slugs; compute files / indexed / unindexed / dead-wikilink / one-way-edge counts; render a one-line strip on `render_all_pages` (`/pages`). [edit]
- [x] B3 — **Queue robustness.** In `render_board`, collect any item whose `intent` ∉ {read,watch,write} into a "⚠ unclassified" strip (shown only if non-empty); move `done`/`dropped`/`promoted` items out of the lanes into a collapsed "recently finished" strip. [edit]
- [x] B4 — **Small.** Add a client-side title-filter input on `/pages` (JS filter over the page links); add a sidebar cross-link to the Project Dashboard (`:8788`), and the reciprocal LukeatronWiki link in the Dashboard sidebar (folds into A-phase edit). [edit]
  - [x] Test B — run `LUKEATRONWIKI_NO_BROWSER=1 LUKEATRONWIKI_PORT=8797 python3 serve.py` headless; curl `/`, `/pages`, `/page/meta-about` (has the dead link), and a `/lt` traversal attempt; assert 200 + red-link class on `theology-aphorisms`, integrity counts present, traversal still 403, no traceback. Kill the temp server.

### Phase C — Dashboard editing (`LUKEATRON_DASHBOARD_EDIT=1` only)
- [x] C1 — **Edit-mode plumbing.** Read the `LUKEATRON_DASHBOARD_EDIT` env flag; when off, `/do/*` → 403 and no edit UI renders; when on, show an ✏️ edit-mode badge in the sidebar. Add a shared write helper: POST-only (GET → 405), fence target inside `PROJ_DIR`, mtime guard (form carries mtime; mismatch → 409 + re-render), and an `edits.log` appender (`[BROWSER: dashboard] [verb] <target> <summary> <ISO timestamp>`). [edit]
- [x] C2 — **Tick done** (`POST /do/tick`). Locate the exact Next-Actions table row by project path + row number; rewrite ONLY that row's Status cell to `☑ Done`. Add a ✓ affordance to each open square's tooltip / square click. [edit]
- [x] C3 — **Cycle State** (`POST /do/state`). Same row-targeting; rewrite ONLY the State cell to the next state in 🔴→🟠→🔵→🟢→⚪ (wrapping). UI: a small cycle control beside the tick. [edit]
- [x] C4 — **Append scrap** (`POST /do/note`). A per-project text box; server appends `- <YYYY-MM-DD HH:MM> <text>` under a `## 📥 Browser scraps` heading in that project's `notes.md` (creating the heading at end-of-file if absent). Append-only — never touches existing content. [edit]
- [x] C5 — **Pending-sweep stamp.** Any successful C2/C3 write sets `pending_sweep: true` on that project's `_tracking.yaml` row (line-level edit; never touches `state`/`wake`). Dashboard renders the existing "pending sweep" badge off it. [edit]
  - [x] Test C — relaunch on temp port 8798 WITH the edit flag against a **scratch copy** of one real project folder + a scratch `_tracking.yaml` (copied under the scratchpad; `LUKEATRON_PROJECTS_DIR` pointed at it, so no live data is mutated during testing): tick a row, cycle a state, append a scrap → diff proves single-cell/append-only changes + `pending_sweep` stamp + `edits.log` lines; GET on `/do/tick` → 405; stale-mtime POST → 409; traversal POST → 403; then relaunch WITHOUT the flag → `/do/tick` POST → 403, no edit UI. Kill the temp server.

### Phase D — Wiki capture (`LUKEATRONWIKI_EDIT=1` only)
- [x] D1 — **Edit-mode plumbing.** Mirror C1 for the wiki: flag check, ✏️ badge, POST-only, fence inside `WIKI_DIR`, mtime guard on `_queue.yaml`, `edits.log` appender (`[BROWSER: wiki] …`). [edit]
- [x] D2 — **Quick-capture** (`POST /do/capture`). A small form on the board (title · kind: article|book|link|video · intent: read|watch|write · source). Server appends a well-formed item to `_queue.yaml` — `id` = next free `q-NNN`, `status: queued`, `needs_absorb: true`, `added` = today — and bumps `count:` + `last_updated:`. Board renders `needs_absorb` items with a "🌱 needs absorb" pill so `!IdeaWiki` completes the absorb (store write, node, edges, index) on its next pass. [edit]
- [x] D3 — **Tick queue item** (`POST /do/qstatus`). Flip one item's `status` to `done` or `dropped` only (the two Luke-decidable transitions); `promoted` and node retirement remain agent/`!ArchiveMemory` work. Note per `_queue.yaml`'s own STATUS RULES: the browser flip is the *decision record* only — the row stays in the file, and the eventual *retirement* of dropped rows/nodes still runs through `!ArchiveMemory` (gated). UI: done/drop controls on each queued card in edit mode. [edit]
- [x] D4 — **Hard boundary check.** Assert no code path writes node pages, `_index.yaml`, or any file outside `LukeatronWiki/` — deliberate omission per D5. [review]
  - [x] Test D — relaunch on temp port 8797 WITH the flag against a **scratch copy** of `LukeatronWiki/` (`LUKEATRONWIKI_DIR` pointed at it): capture an item → `_queue.yaml` diff shows one well-formed appended item + count/last_updated bump; tick it done → single-field flip; `edits.log` has both lines; GET `/do/capture` → 405; stale mtime → 409; without the flag → 403 + no UI. Kill the temp server.

### Phase E — Go live & verify
- [x] E1 — Register `edits.log` in `Memory/Long-Term/Logs/_index.yaml` (purpose: browser-side writes from the two tools' edit modes, so agents see state moved outside the skill layer). [edit]
- [x] E2 — Add an "Edit mode" `.command` launcher beside each existing launcher (same script + the edit env flag). `ensure-*.sh` (SessionStart) stays flag-less — the always-on servers remain pure viewers. [create]
- [x] E3 — Restart both background servers (read-only mode): `pkill -f project-dashboard/serve.py; pkill -f lukeatronwiki-viewer/serve.py`, re-run each `ensure-*.sh`, confirm `:8787`/`:8788` → 200 with NO edit UI. [run]
- [x] E4 — Update each tool's `README.md`: the Phase A/B viewer features, the edit mode (flag, verbs, guardrails, what it deliberately won't do), and the new launcher. Keep docs truthful to code. [edit]
- [x] Verify — every line in **Success criteria** met; SessionStart instances read-only; edit mode opt-in with all guardrails proven by the Phase C/D tests; traversal fences intact on read and write routes. [pass/fail]

## Final step — Logging (always present)
- [x] Append one line per skill in `skills_used` to `Memory/Long-Term/Logs/skills.log`, format:
  `[AGENT: !<SkillName>] [<SUCCESS|FAIL>] <one-line outcome> | tokens≈[N]`

## Final step — Close out (always present)
- [x] Update `status: Completed` in this plan's frontmatter, then move the file from `System/Plans/New/` to `System/Plans/Completed/`.
