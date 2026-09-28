# Storytelling — smoke results (distribution.spec FR-X8)

**Date:** 2026-09-21. **Version:** 1.0.0. **Bundle:** `dist/Storytelling-1.0.0.html` = `dist/Storytelling.html`, 459,782 bytes
(449 KB, 22% of the 2 MB limit), sha256 `d6df77dc54e96d81…` (build was regenerated after the last source change I saw;
another agent was editing print files during the run, so re-run the build and this check after they finish).

**How it was run.** Headless Chrome (`/Applications/Google Chrome.app`) driven over the DevTools websocket by a stdlib-only Python
script, `reference/work/smoke_run.py` (uses `reference/work/cdp.py`). Real mouse events (pointer-event drags, double-click), real
`localStorage` in a throw-away profile, real `Page.printToPDF` in print media. Three targets, all pass every automated item:
**A** `file:///…/dist/Storytelling.html`, **A2** `file:///…/dist/Storytelling-1.0.0.html`, **B** `http://127.0.0.1:8793/` (Luke's own
copy, `python3 server.py`, already running; I did not start or stop it).

**Not run (needs a human):** Safari and Firefox; a real machine with no Python (AC-X2); a real airplane-mode toggle; the
browser's print dialog itself; pasting the clipboard into another app; the `Start Storytelling.command` double-click; and Luke
opening the file himself offline (the final DoD tick). Headless Chrome proves the page logic, not the human-visible chrome.

Legend: **PASS** run and held; **HUMAN** part or all needs a person (stated).

| # | Item (see `SMOKE.md`) | A: single file | B: served | Evidence |
|---|---|---|---|---|
| 1 | Open the app | PASS (file://) / HUMAN (double-click) | PASS (http) / HUMAN (launcher) | Loads with no error; title "Storytelling"; A made exactly 1 request (itself). |
| 2 | Fresh load draws the poster | PASS | PASS | 218 `g.tile`, `#toolbar` has 7 controls, SVG present. |
| 3 | Double-click a tile opens detail | PASS | PASS | Detail panel visible, starts "Pt / Plot Twist / Structure". |
| 4 | Popularity toggle | PASS | PASS | `data-pop` on, off, on; `.pop` computed `display:none` when off. |
| 5 | Drag a tile into the tray | PASS | PASS | 1 bead after the drag. |
| 6 | Chain three beads | PASS | PASS | Beads 1, 2, 3; `storytellingAgent.story()` reports 3 beads, 2 ribbons; step numbers 1,2,3. |
| 7 | Save | PASS | PASS | Message `Saved “Smoke story”.`; listed under Saved stories; `localStorage` key written. |
| 8 | Reload; saved story present; reopen | PASS | PASS | After reload the name is listed and (draft) 3 beads restored; Open brings back 3 beads. |
| 9 | Library story, tiles marked | PASS | PASS | Opened `quest-heros-journey`: 9 beads, 10 tiles carry `is-in-story`. |
| 10 | Print table, colour | PASS (logic) / HUMAN (dialog) | PASS (logic) / HUMAN (dialog) | `window.print` stubbed and called once; body `data-print="table" data-tone="colour"`; print-to-PDF gave 1 landscape page, 666 KB, story tiles highlighted (viewed the render). |
| 11 | Lists: examples, Copy | PASS (copy status) / HUMAN (paste) | same | Preview 5,938 chars starting "Structure • Conflict — …"; checkbox ticked; status "Copied". |
| 12 | About | PASS | PASS | Panel text has "Version 1.0.0", ComputerSherpa, *The Periodic Table of Storytelling*, CC BY-NC-SA 3.0, dashed outline, "nothing is sent anywhere"; `Esc` closes. |
| 13 | Agent levers | PASS | PASS | `<meta name="storytelling-agent">` present; `storytellingAgent.help()` returns `ok:true` and a manifest (name, global, summary, conventions, workflow, bounds; 8 keys). |
| 14 | Offline | PASS (emulated) / HUMAN (real airplane mode) | PASS (emulated) / HUMAN | A: network dropped, fresh load: 218 tiles, 1 request, 0 failed, 0 errors. B: page loaded, then network dropped: About opens, agent answers, 218 tiles; 33 requests all to `127.0.0.1:8793`, 0 outside origin, 0 failed, 0 errors. |
| 0 | Console clean | PASS | PASS | 0 error or warning events (console, exceptions, Log domain) on a clean load. |

## Bundle checks (AC-X3, AC-X6, FR-X2, FR-X5)

| Check | Result |
|---|---|
| Two dist files identical | Yes (same sha256, same size). |
| Deterministic | Two consecutive builds, byte-identical (`cmp`); confirmed again at the final build (both files share one hash). |
| `type="module"` | 0 occurrences. One classic `<script>`; no `<link>`; no external `src`/`href` attribute. |
| `fetch(` | 0 occurrences. The bundler's own refusal list also covers `XMLHttpRequest`, `WebSocket`, `EventSource`, `sendBeacon`, `importScripts`. |
| Size | 459,782 bytes; limit 2,097,152 (AC-X6 met). |
| `http(s)://` text | 3 × `http://www.w3.org/2000/svg` (SVG namespace string, not a request) and 217 × `https://tvtropes.org/pmwiki/…` in `data/elements.js` (each tile's source-page credit, plain data). Nothing else. |
| Network audit | Every request during all runs stayed inside the page's own origin. |

## Findings

1. **The detail panel turns each tile's `sourceUrl` into an `<a href>` credit link at runtime** (`app/detail/detail-panel.js`,
   `fillCredit`). It is created only when a tile is opened, and it leads off-device only if the person clicks it. Nothing is
   fetched. AC-X3 says no "href to fetch"; a credit link the user follows is defensible as a credit line, and the source text
   is also required attribution. Flagged for Luke's decision; no change made (I do not own that file).
2. **`Start Storytelling.command` and the real-Safari/Firefox, no-Python and real-offline checks are untested** (see Not run).
3. No defect found in the print or other JS. The print-table render is a single landscape page; I did not inspect grayscale or
   the other print targets (out of scope for this smoke list).
4. **Process note:** early in the run my `pkill -f "python3 server.py"` also stopped a server that was already serving `:8793`
   (started by someone else before me). A `server.py` on 8793 from this folder is running again now (not mine). Nothing else
   was affected (the Wiki on 8787 and Dashboard on 8789 use absolute paths and were untouched).
5. **My mistake, needs restoring:** my clean-up command `rm -f reference/work/*.json` (meant only for my three smoke result files) also
   deleted every other `.json` that was in `reference/work/`. The Sandbox is git-ignored, so git cannot restore them. Known casualties
   (named in `assemble_elements.py`): `added-elements.json`, `desc-report.json`, `desc-out-*.json`. The generated `app/data/elements.js`
   is intact, so the running app and the build are unaffected; only re-running `assemble_elements.py` needs them. Restore from
   Dropbox "Deleted files" (dropbox.com, folder `_Lukeatron/System/Sandbox/Storytelling/reference/work/`, deleted 2026-09-21 ~20:00).
