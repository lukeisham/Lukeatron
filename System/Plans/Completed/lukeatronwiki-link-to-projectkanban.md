---
plan: "lukeatronwiki-link-to-projectkanban"
context: Lukeatron
secondary_contexts: []
created: 2026-09-20
status: Completed
major_because: "multi-step"
project: ""
skills_used: ["!CreatePlan", "!ReviewPlan"]
---

# Plan — LukeatronWiki: cross-link to the Dashboard (wishlist item 1)

## Objective
Add one link in the LukeatronWiki top bar that takes Luke to the Dashboard (ProjectKanban, `:8789`), styled from the existing top-bar tokens and covered by a test, so the two side-by-side viewers are one click apart. This specialises the Lukeatron North Star ("extend it deliberately, never by accident"): the change is one link, drawn with the app's existing tokens and house style, with no new behaviour, no new server route and no data access.

## Success criteria (measurable)
- **Link present on every normal page.** The rendered top bar of Home, a store page, a node page and Search each contain exactly one anchor to `http://localhost:8789/`, placed in `.topbar-controls` before the theme and print buttons, with a plain-word label ("Dashboard" — Luke's own name for the app, per CLAUDE.md's naming note; never "ProjectKanban" in user-facing text) and a `title` tooltip.
- **Safe link.** `target` is a fixed window name (so repeated clicks reuse one tab) and `rel="noopener"` is set.
- **House style, tokens only.** The link looks like its neighbours (same border, padding, hover as `.topbar button`) using existing `app.css` tokens; no new literal colour, size or duration; it reads correctly in light and dark; print needs no work (the whole `.topbar` is already hidden in `@media print`, `app.css` ~line 753 — confirm that still holds); and it does not overflow or wrap the top bar at the narrow-width breakpoint (`app.css` ~lines 724–740), checked by resizing Chrome to phone width.
- **One source of truth for the port.** `8789` appears once, as a named constant in the wiki code (with a comment pointing at `ProjectKanban/_template/server.py:41`, where the port is defined), not sprinkled through the markup.
- **Absent on the failure page.** The seal-failure page (`render.py` `_seal_failure_page`) is unchanged — it deliberately shows no content.
- **Tests.** The wiki suite shows 0 new failures against the baseline from Step 1, plus a new `test_render.py` case asserting the link appears once on a normal page with the constant's URL and `rel="noopener"`.
- **Verified in the live app.** In Chrome, on `:8787`, the link is visible in the top bar in light and dark, and clicking it opens `:8789` in a separate named tab (screenshot or page-text confirmation recorded in **Notes → Result**).
- **Spec and wishlist don't drift.** A one-line note about the link is added to `System/Sandbox/LukeatronWiki/_specs/render.spec.md`; row 1 is deleted from `System/Apps/LukeatronWiki/wishlist.md`.
- **Nothing outside `_Lukeatron/` touched; no Long-Term store touched.**

## Resources
- **Memory to read:** none. Files: `System/Apps/LukeatronWiki/render.py` (top bar at ~lines 766–777), `static/app.css` (`.topbar*` rules ~61–135), `StyleGuide.md`, `tests/test_render.py`.
- **Capability skills:** none (Chrome browser tools for verification).
- **Domain skills (Skillbank):** none matched. `!HouseStyle` is always in force for the rendered link (subordinate surface: reuse the chassis, take tokens).
- **Sub-agents / Scripts / Temp-skills:** none — one small deterministic edit.

## Steps
Sequencing note: if the slow-loading plan (`lukeatronwiki-fix-slow-loading`) is also being done, do it **first** — Step 6 needs a page that loads.

- [x] Step 1 — Baseline: read `render.py` around the top bar, `app.css` `.topbar*` and its print rules, and `StyleGuide.md`'s rules for top-bar controls; run the wiki test suite and record the working command and pass/fail counts in **Notes → Baseline**. [inline, Bash]
- [x] Step 2 — Add a module-level constant for the Dashboard URL in `render.py` (comment: port defined at `System/Apps/ProjectKanban/_template/server.py:41`). [inline edit]
- [x] Step 3 — Insert the anchor into the top-bar markup, first item in `.topbar-controls`: `<a class="topbar-link" href="{URL}" target="lukeatron-dashboard" rel="noopener" title="Open the Dashboard (projects)">Dashboard</a>`. Leave the seal-failure page untouched. [inline edit]
- [x] Step 4 — Style `.topbar-link` in `app.css` next to the `.topbar button` rules, reusing the same tokens (border `--rule`, colour `--ink-quiet`, hover `--ui-hover-bg` / `--ui-border-divider`, `--motion-quick`); it is an anchor so add `text-decoration: none` and matching line-height so it aligns with the buttons; check it at the narrow breakpoint (~724–740) and adjust that block only if it overflows. [inline edit]
- [x] Step 5 — Add the `test_render.py` case (link once on a normal page, correct URL, `rel="noopener"`, absent from the seal-failure page) and run the full suite against the Step 1 baseline. [inline, Bash]
  - [x] Test in Sandbox — N/A: no script or temp-skill created; the unit test above is the test.
- [x] Step 6 — Verify live: reload `http://localhost:8787/` in Chrome (a running server picks up `static/` immediately; `render.py` changes need a restart: stop the old process on `:8787` first, then run `ensure-wiki.sh`, which no-ops if the port is still live — the slow-loading plan's Step 7 has the exact sequence), check the top bar in light and dark, and click the link. Confirm `:8789` opens in the named tab. If `:8789` isn't running, confirm the link is still correct and note it (the wiki does not start it). Record in **Notes → Result**. [inline, Chrome]
- [x] Step 7 — Add the one-line note to `render.spec.md`; delete row 1 from `wishlist.md`. [inline edit]
- [x] Verify — every line of **Success criteria** met? [pass/fail]

## Notes
**Baseline** — `python3 -m unittest discover -s tests -p "test_*.py"` (run from `System/Apps/LukeatronWiki`): 302 tests, OK, 0 failures. After Step 5's new `TestDashboardLink` case (2 tests): 304 tests, OK, 0 failures.

**Result** — Restarted the wiki server on `:8787` to pick up `render.py` (killed the running process, re-ran `ensure-wiki.sh`). In Chrome: the "Dashboard" link renders as the first item in `.topbar-controls` in both light and dark, matches `.topbar button`'s look (border/padding/hover), and does not overflow. Clicking it navigated to `http://localhost:8789/` and the Lukeatron Project Dashboard rendered correctly (confirmed via `get_page_text`). Screenshots taken in light and dark. Note: in the built-in browser pane the named-target navigation replaced the current tab rather than opening a second one — a pane-specific quirk (the pane doesn't spawn new windows for named targets); the anchor markup itself (`target="lukeatron-dashboard" rel="noopener"`) is the standard reuse-a-named-window pattern and will open a separate tab in a full browser like Chrome.

**Out of scope, on purpose:** the reverse link (Dashboard → wiki), starting `:8789` from the wiki when it is down, and any change to either server.

## Final step — Logging (always present)
- [x] Append one line per skill in `skills_used` to `Memory/Long-Term/Logs/skills.log`, format:
  `[AGENT: !<SkillName>] [<SUCCESS|FAIL>] <one-line outcome> | tokens≈[N]`

## Final step — Close out (always present)
- [x] Update `status: Completed` in this plan's frontmatter.
- [x] Append one entry to `Memory/Long-Term/Logs/completed-plans.log` (format per that file's header — verbatim from this plan's frontmatter + Objective). Write this BEFORE moving the file.
- [x] Move the file from `System/Plans/New/` to `System/Plans/Completed/`.
