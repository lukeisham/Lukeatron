# Project Dashboard — Refactor Registry

kind: app
template: `_template/`
test: `_test/`
last_updated: 2026-09-09

## In two lines
A browser dashboard over Lukeatron's projects and minor tasks — what needs Luke, what he is waiting
on, what is due this week — drawn as one packed isometric mass, quartered by context.
It exists to monitor and unblock work of uneven effort and uneven importance without burning him out.

## Where things are
```
System/Apps/ProjectDashboard/
├── _template/              the canonical copy — raw working code + README.md, no data, no specs
├── _test/                  labelled TEST, obviously fake data, where every change is tried first
└── refactor-registry.md    this file
```
These three are always siblings. The test copy and its fake data are never tidied away when a
refactor finishes.

**Running it.** Double-click `_template/Start Project Dashboard.command` in Finder for the real
board, or `_test/Start Dashboard (TEST DATA).command` for the fake one. Each asks the OS for a free
port (so they never collide with each other, the wiki viewer, or the old dashboard), waits for the
server to actually accept connections, opens Chrome, and stops the server when its window closes.
The test launcher regenerates `fixtures/` first if it is missing.

From a shell: `python3 server.py` in `_template/`, and `./run_server.sh` in `_test/`. A bare
`python3 server.py` inside `_test/` **fails on purpose** — see the `TEST-COPY` allowlist note.
`python3 build_faces.py` writes the offline snapshot and the agent brief to `Outbox/`.

⚠️ **The executable bit is what makes a `.command` double-clickable, and Dropbox does not always
preserve it** across machines or a re-download. If double-clicking opens the file in a text editor
instead of running it, restore it with:
`chmod +x "System/Apps/ProjectDashboard/_template/Start Project Dashboard.command"`

## The rule
Changes are made in `_test/` only. The template is never edited directly. An accepted change is
ported into `_template/`, the fake data stripped, and the template verified to still run clean.
After every port, `_test/` and `_template/` are diffed file by file — any difference not on the
divergence allowlist below means the port was incomplete.

## Divergence allowlist

The only differences `_test/` is permitted to carry. Anything else a diff finds is drift, not a
label — resolve it before closing the board row.

| What | Where |
|---|---|
| The fake-data fixture tree and everything it generates | `_test/fixtures/` |
| The script that regenerates that fixture | `_test/seed_fixture.py` |
| Launchers that point `LUKEATRON_ROOT` at the fixture | `_test/run_server.sh`, `_test/run_build.sh` |
| **The double-click launcher, which differs by name and wiring on each side** — `_template`'s runs the real board, `_test`'s seeds the fixture first and runs on that | `_template/Start Project Dashboard.command` · `_test/Start Dashboard (TEST DATA).command` |
| **The guard marker** — an empty file whose presence makes `paths.py` refuse any root outside this copy | `_test/TEST-COPY` |
| TEST banner styling, tokens only | `_test/app/shared/test-banner.css` |
| TEST title + banner element + its stylesheet link | `_test/app/index.html` |
| One `TEST DATA` line in the composed brief | `_test/brief.py` |
| TEST in the snapshot's title and stamp | `_test/snapshot.py` |

**`paths.py` is deliberately identical in both copies.** The guard reads the `TEST-COPY` marker at
runtime rather than being a code difference, so there is no divergent logic to keep in sync. Adding
behaviour to `_test/paths.py` would be drift, not labelling.

**Why the guard exists.** `_test/` sits *inside* the real Lukeatron tree, so walking up to find the
root finds the **real** store. Without the marker, `python3 server.py` in `_test/` serves Luke's
actual projects under a banner reading *"TEST DATA — fabricated projects, not Luke's real board"*.
A label that lies about real data is worse than no label, so this is a hard failure, not a warning.
Covered by `tests/test_paths.py`.

## Refactor board

| # | Requested change | Status | Health | Notes |
|---|---|---|---|---|
| R-1 | — | — | — | No refactor requested yet. Luke saw the built app 2026-09-09 and confirmed it working; no change requested. |

Status values: `requested` · `in test` · `accepted` · `in template` · `rejected`.
A rejected change is reverted in `_test/` and left on the board — not silently dropped.

Health is the score out of 10 from the Refactor Health Check, run once per row immediately before
the port. 8/8 (10) closes the row; 6–7 ports but stays open with the unmet item(s) named here;
≤5 does not port — fix and re-run. A row not yet ported carries no Health score.

## Granted rule exceptions

Must match `_template/README.md` exactly.

| Rule ID | Where | Reason | Granted on |
|---|---|---|---|
| SR-6 | Render architecture, whole app — Python serves JSON; one set of vanilla ES modules renders every view. Diverges from the three sibling `System/Tools/*/serve.py` viewers, which build HTML as Python strings. | The app has two faces — a live server and a self-contained offline snapshot — that must show the identical Monitor view. One JS renderer fed different data makes them identical **by construction**; the neighbours' pattern would need the renderer written twice, trading an SR-6 break for an SR-4 one. Scope: this project only. | 2026-09-04 |

## Open questions — carried forward, not resolved

These outlived the design documents. They were recorded in the PRD and the development registry,
both retired at Phase 4, so they live here now or nowhere.

| # | Question | Why it matters |
|---|---|---|
| Q-1 | **The occlusion residue is 11 of 40, not 4.** The design measured 4 hidden from all four rotations; the built board reports 11. Half the original gap was a spec contradiction, now fixed (see the migration log). The rest is unexplained — the likely cause is that the design measured a static 2026-09-04 fixture of 136 task cubes while the live store carries 148 open rows, and stack height drives the hit-test directly. **Untested reasoning, not a finding** — but there is now one piece of evidence for it: the TEST
fixture, whose 40 projects carry far fewer open tasks each, reports **2 hidden at this angle and 0
from all four**. Same code, same geometry, shorter stacks, residue gone. That is consistent with
stack height driving the result, and it makes `_test/` the place to settle this — vary the fixture's
task counts and watch the residue move, without touching the real store. | If the true figure is near 11 rather than 4, the board's rotation premise is weaker than the design claimed — rotation exists precisely to rescue stacks that one angle hides. Luke was told before Phase 4 and chose to proceed. |

Q-2 and Q-3 are resolved — see the migration log.

## Resume block

A cold agent picks this up by reading, in order:

1. **This registry** — the board, and which row is in flight.
2. `_template/README.md` — key decisions and their reasons, cross-boundary behaviour, the
   navigation map, the glossary, and the granted SR-6 exception.
3. `_test/` — the current state of whatever is being tried.

Do not reconstruct state from conversation history. This file is the state.

⚠️ **Nothing here is under version control.** `.gitignore` excludes `/System/Sandbox/**` and
`Memory/Medium-Term/Projects/` is untracked; `System/Apps/` is new and untested against it. There is
no `git checkout` to fall back on — back up before any bulk edit.

⚠️ **The FR-, AC- and AD- numbers in the code cite specs that no longer exist.** They are kept as
stable names for decisions; the reasons are in `_template/README.md` and `app/STYLE.md`. The
retired originals are in `Archive/ProjectDashboard-design-2026-09/` — for answering *why was it
designed this way*, never for building from.

## Migration log

| Date | Event |
|---|---|
| 2026-09-09 | **Luke saw the built app** (live against real data, confirmed working, 126 tests + 8 contrast pairs pass) and made the two calls this registry had held open. **Q-2 resolved:** the shared env var was renamed to `PROJECT_DASHBOARD_PORT` (this app only) across `server.py` — identical in both `_template` and `_test`, re-diffed clean — both `.command` launchers, and `.Claude/launch.json`'s TEST config. `System/Tools/project-dashboard/serve.py` keeps its own `LUKEATRON_DASHBOARD_PORT`; the two apps can no longer steer each other. **Q-3 resolved:** the old dashboard retired. Both of its running instances (one on :8788, one bumped to :8789 — a live instance of the exact collision Q-2 described) were stopped; its files moved to `Archive/ProjectDashboard-tool-2026-09/`; the `SessionStart` hook in `.Claude/settings.json` repointed at this app's new `ensure-dashboard.sh` (`:8789`, mirroring the old script's idempotent probe-and-launch); `CLAUDE.md`'s Folder Reference and Memory Structure sections and `!HouseStyle/reference/sources.md`'s surface register updated to match. |
| 2026-09-07 | **Moved to permanent home.** 69 files copied from `System/Sandbox/ProjectDashboard/` and verified file-by-file — zero content differences, counts matched, permissions identical. 126 Python tests and 8 JS suites pass in both copies; `build_faces.py` produces both faces against the real store. |
| 2026-09-07 | **The move itself broke the app, and the launch check caught it.** `brief.py`, `server.py` and `snapshot.py` found the Lukeatron root with `Path(__file__).resolve().parents[3]` — correct at the Sandbox depth, one level short here, resolving to `System/` and writing the brief to a directory that does not exist. Replaced with `paths.py`, which walks up looking for the markers that actually identify the root (`.Claude/CLAUDE.md` + `Memory/Medium-Term`) and raises naming every path tried rather than returning a plausible wrong answer — a wrong root reads an empty store and renders an empty board, which looks like *no projects* rather than like a failure. Depth-counting was the wrong mechanism here specifically: a template exists to be cloned, and `_test/` is already a clone at a different depth. |
| 2026-09-07 | **The TEST copy could have served real data.** A bare `python3 server.py` in `_test/` resolved to the real root — real projects under a *"fabricated projects"* banner. The launcher scripts guarded it only for whoever used them. Closed structurally with the `TEST-COPY` marker and `paths.py`'s guard, identical in both copies. Fixing it surfaced a second defect: `brief.py`, `server.py` and `snapshot.py` all resolved the root **at import time**, a PY-3 violation ("import is free") that had been verified for `stores.py` and never checked in the other three. All three are now lazy. |
| 2026-09-07 | **`monitor` FR-22b's occlusion lane corrected** before the move. Its prose said *1.6× the cube's scaled **half**-width*; its literal said `cube_width * a.scale * 1.6`. The build followed the literal, doubling every lane, and reported **22 of 40** hidden from all four rotations against a measured **4** — a figure that would have condemned the rotation the whole board rests on. The batch-six mockup used the cell half-width, so prose and mockup agreed and only the literal was wrong. Residue fell 22 → 11; the remainder is Q-1. Regression test in `app/monitor/tests/occlusion.test.mjs`. Found by running the board, not by any of the five spec reviews, which had all rated the contradiction a `note`. |
| 2026-09-07 | **Documentation spec folded down** into `_template/README.md` (six sections: decisions with reasons, cross-boundary behaviour, navigation map, the granted SR-6 exception, the glossary with its retired-terms table, and the note for a cold agent). All 21 `_specs/…` path references across 19 files rewritten so nothing points at a deleted document. `server.py`'s docstring — which still claimed `model.py` and `writes.py` "do not exist yet" — corrected against the real signatures. |
| 2026-09-07 | **Design documents retired**, confirmed by Luke, routed through `!Checkpoint` (Gate C fired on the Sandbox promotion and passed on the recorded test results). PRD 2.6, the ten specs, `build.md` and the development registry were **archived to `Archive/ProjectDashboard-design-2026-09/` rather than binned** — Phase 4's "no spec survives" rule stands, but this tree has no version control, so deletion would have been final. `System/Sandbox/ProjectDashboard/` then removed. |
