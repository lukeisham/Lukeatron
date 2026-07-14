---
plan: "viewer-mode-toggle"
context: Personal Research
secondary_contexts: [Personal Productivity]
created: 2026-07-02
status: Completed
completed: 2026-07-02
major_because: "multi-file — a sidebar View/Edit toggle in both serve.py tools, plus a new idiot-proof launch guide saved under System/"
project: ""
skills_used: ["!DetermineContext", "!CreatePlan"]
outcome: "All 4 phases done. Both tools now have a runtime-toggleable POST /do/mode route (Handler.edit_mode, class-level, single-threaded servers so no race) driving a View/Edit sidebar toggle directly below 'Other tools'. Verified live end-to-end on scratch data: toggle-on → write succeeds → toggle-off → write blocked again, all on ONE running process, no restart. Every /do/tick|state|note|capture|qstatus write keeps its original guardrails (POST-only, mtime 409, store-fence 403) unchanged — only the launch-time-only requirement was removed, per Luke's explicit request (single user, secured laptop, accepted trade-off, recorded in the plan's Security note). Both live SessionStart servers restarted and confirmed defaulting to View; a real on/off round-trip was run directly against them (D2) with zero data mutation, logged legitimately to the now-created Memory/Long-Term/Logs/edits.log. Both READMEs and the new System/Viewer-Launch-Guide.md rewritten around the toggle as the primary path; the prior 'Edit Mode' .command launchers kept as an optional advanced shortcut. Deviation from literal step wording: A1/B1 specified a CSS html.editing class toggle; implemented instead as fetch-POST-then-reload, since the edit UI was already server-side conditional on edit_mode — reload re-syncs from server truth without duplicating render logic in JS. Same observable behavior, verified live; noted for the record."
---

# Plan — Sidebar View/Edit toggle for both viewers (+ idiot-proof launch guide)

## Objective
Add a **View ⇄ Edit toggle** to each viewer's sidebar, immediately **below the "Other tools" link**, that flips writes on and off **live, at runtime, on the single always-on SessionStart server** — no separate launch required. Luke has explicitly chosen this over the launch-time-only gate shipped last round (single user, secured laptop — accepted trade-off). Ship a plain-English launch guide for both tools under `System/`.

## Security note (accepted trade-off, recorded for the record)
Any browser tab open to `localhost:8788`/`:8787` — including a stray old tab, a link, or (if ever exposed) another process on the machine — can now flip editing on with one POST and no confirmation. The mtime-guard, POST-only, and store-fence guardrails on the actual data-mutating routes (`/do/tick`, `/do/state`, `/do/note`, `/do/capture`, `/do/qstatus`) are UNCHANGED and still apply. What changes is only which flag they check — a runtime-mutable one instead of a launch-time-only one. Luke has explicitly requested this (see conversation), citing single-user/secured-laptop context; not revisited without him raising it again.

## Success criteria (measurable)
- **Both tools**, on a temp port, return 200 and their sidebar HTML contains a `mode-toggle` control with a **View** and an **Edit** segment, placed directly after the "Other tools" `<ul>` — both segments live regardless of how the server was launched.
- Clicking **Edit** POSTs to a new `/do/mode` route, which sets the process-wide edit flag `True`; clicking **View** POSTs the same route with `False`. Verified end-to-end: after POSTing Edit-on, a subsequent `/do/tick`-style write succeeds (200/303); after POSTing Edit-off, the same write returns **403** — on the SAME running server, no restart.
- The visible edit UI (`.editpanel` on the dashboard; `.capture`+`.qedit` on the wiki) shows only while `html.editing` is set; `/do/mode` also drives that class so UI and write-acceptance never disagree. Choice persists across reload (localStorage) as the optimistic default, but the SERVER's flag (not localStorage) is the actual gate checked on every write.
- Every `/do/mode` and data-write route stays **POST-only** (GET → 405) and every data write keeps its **mtime guard** (409) and **store fence** (403) exactly as before — only the launch-time-only requirement is removed.
- Every mode flip is logged to `Memory/Long-Term/Logs/edits.log` (`[BROWSER: dashboard|wiki] [mode] on|off <timestamp>`).
- A launch guide exists at `System/Viewer-Launch-Guide.md` — numbered, roughly one page, and verifiably names **both** URLs (`http://localhost:8788`, `http://localhost:8787`), explains the View/Edit toggle as the ONE way to switch modes, and the stop method. No jargon.
- Both live SessionStart servers restarted; each shows the toggle defaulting to **View**; traversal fences intact; a toggle-to-Edit-then-write-then-toggle-back-to-View round-trip works on the live `:8788` instance.

## Resources
- **Memory to read:** none (build work; the two `serve.py` tools + their sidebars only)
- **Capability skills:** none
- **Domain skills (Skillbank):** none
- **Sub-agents:** none — deterministic edits + curl tests
- **Scripts:** the tools' own `serve.py` on temp ports (`*_NO_BROWSER=1 *_PORT=<temp>`) as the test harness, toggling `/do/mode` at runtime instead of relaunching with a flag — no new script. Write-path tests (Test A/B step ii) point at scratch copies, same as the prior plan.
- **Temp-skills:** none
- **New artefacts:** `System/Viewer-Launch-Guide.md`

## Design decisions (for !ReviewPlan and Luke to confirm)

**D1 — Runtime-mutable server flag, flipped by the browser (Luke's explicit choice, superseding the earlier launch-time-only design).** `Handler.edit_mode` stops being fixed at process start. A new `POST /do/mode` route sets it live (`Handler.edit_mode = (form["state"] == "on")`) — a class-level attribute, so it applies to every subsequent request on that process, and both servers are single-threaded (`socketserver.TCPServer`, one request at a time), so no race. The env vars (`LUKEATRON_DASHBOARD_EDIT` / `LUKEATRONWIKI_EDIT`) still work as an optional "start pre-toggled to Edit" convenience but are no longer the only way in.

**D2 — One control, one server, both directions hit the server.** No more edit-capable/read-only distinction — every instance (including the SessionStart always-on ones) can be toggled. Both View and Edit clicks POST to `/do/mode`; View genuinely turns writes off (not just hides the UI), so a stale browser tab from this morning can't silently write this evening if you toggled off in between.

**D3 — Default = View on server start (safety-by-default, not safety-by-permission).** Since any tab can now flip it, starting closed and requiring one deliberate click is the cheap insurance that costs nothing given the accepted trade-off. `Handler.edit_mode` still honours the env var for anyone scripting a pre-enabled start; interactively, SessionStart launches closed. Choice persists client-side via localStorage as the optimistic UI default across reloads, but a fresh process always starts closed regardless of what localStorage says (server truth wins — first request re-syncs the class to the server's actual `edit_mode`).

**D4 — Placement exactly as asked: directly below the "Other tools" link.** Dashboard: replaces the current `{EDIT_BADGE}` slot. Wiki: inserted between the "Other tools" `<ul>` and the existing theme button. The old ✏️-badge text is folded into the toggle's active-segment styling, so there's one indicator, not two.

**D5 — Guide filename & location.** `System/Viewer-Launch-Guide.md` (top-level `System/`, as requested — not `System/Tools/`, so it's easy to find). The guide's primary "how to edit" path becomes the toggle, not a separate launcher — simpler for a non-technical read. The two "(Edit Mode)" `.command` launchers built last round still exist and still work (pre-enable at start); the guide mentions them only as an optional shortcut, not the main path.

## Steps
Ordered: dashboard toggle, wiki toggle, guide, go-live. Each toggle is edited then curl-tested (edit-capable AND read-only) on a temp port.

### Phase A — Dashboard toggle (`System/Tools/project-dashboard/serve.py`)
- [x] A1 — **Gate edit UI on `html.editing`.** Add CSS: `.editpanel{display:none}` and `html.editing .editpanel{display:block}` (the panel is the sole edit wrapper — hiding it hides erows/enote too). [edit]
- [x] A2 — **`POST /do/mode` route.** Reads `state` (`on`/`off`), sets `Handler.edit_mode` (class-level, so it applies process-wide), appends one line to `edits.log` (`[mode] on|off`), returns a tiny JSON `{"edit_mode": true|false}` (no redirect — called via `fetch`, not a full-page form post, so the toggle feels instant). POST-only (GET → 405), no other gate — this route IS the gate. [edit]
- [x] A3 — **Toggle markup, below "Other tools".** Replace the `{EDIT_BADGE}` slot with a `mode-toggle` segmented control (View | Edit), both segments always live, reflecting the server's CURRENT `edit_mode` (passed into the page each render — server truth, not a guess). [edit]
- [x] A4 — **Toggle behaviour.** `setMode(edit)`: `fetch('/do/mode', {{method:'POST', body:'state=' + (edit?'on':'off')}})`, on success flips `html.editing`, updates segment styling, persists the choice in `localStorage.dashEditing`; on failure, leaves state unchanged and shows a brief inline error. On page load, sync `html.editing` to the server-rendered `edit_mode` (server wins over any stale localStorage value). [edit]
- [x] A5 — **CSS for `.mode-toggle`** (segmented pill; active segment highlighted). [edit]
  - [x] Test A — on a temp port (default env, no flag): (i) assert 200, toggle present after "Other tools", starts on View, `/do/tick` POST → 403. (ii) `POST /do/mode state=on` → 200 JSON `edit_mode:true`; immediately retry the SAME `/do/tick` (with a real scratch-copy target + current mtime) → succeeds; page now shows `.editpanel` visible. (iii) `POST /do/mode state=off` → 200 JSON `edit_mode:false`; retry `/do/tick` → 403 again, same process, no restart. (iv) GET `/do/mode` → 405. Kill temp server.

### Phase B — Wiki toggle (`System/Tools/lukeatronwiki-viewer/serve.py`)
- [x] B1 — **Gate edit UI on `html.editing`.** Add CSS: `.capture,.qedit{display:none}`; `html.editing .capture{display:flex}`; `html.editing .qedit{display:inline-block}`. [edit]
- [x] B2 — **`POST /do/mode` route.** Mirrors A2 exactly (own `edits.log` prefix `[BROWSER: wiki]`). [edit]
- [x] B3 — **Toggle markup, below "Other tools".** Insert the `mode-toggle` between the "Other tools" `<ul>` and the `themeBtn` button, reflecting server-current `edit_mode`; fold in the old ✏️ badge (drop the separate badge line). [edit]
- [x] B4 — **Toggle behaviour.** Same `fetch`-based `setMode` as A4, `localStorage.wikiEditing`, layered into the existing theme-toggle inline script (which already runs pre-paint). [edit]
- [x] B5 — **CSS for `.mode-toggle`** (reuse A5's rule names; wiki has light+dark themes, so use CSS vars). [edit]
  - [x] Test B — same shape as Test A: default View, `/do/capture` → 403; `POST /do/mode state=on` → capture succeeds (against a scratch `_queue.yaml`); `state=off` → capture → 403 again, same process; GET `/do/mode` → 405. Kill temp server.

### Phase C — Idiot-proof launch guide
- [x] C1 — **Write `System/Viewer-Launch-Guide.md`.** Plain English, numbered, no jargon. Sections: (1) What these two tools are, one line each, with their URLs (`:8788` dashboard, `:8787` wiki) — already running whenever Claude is, just open the URL. (2) "Turn on editing" — click the **Edit** side of the toggle below "Other tools"; click **View** to turn it back off; explain this is instant and applies to that whole browser window on that machine, no relaunch needed. (3) "Which mode am I in?" — the highlighted side of the toggle. (4) A one-line security note in plain terms: "Editing is on for anyone using this browser on this Mac until you switch it back to View — fine for a personal laptop, so leave it on View when you're not actively editing." (5) "Stop a viewer" — the `pkill` line, or just quit/close the window it's running in. Mention the optional "(Edit Mode)" `.command` launchers as an advanced shortcut only, not the main path. [create]

### Phase D — Go live & verify
- [x] D1 — Restart both background servers: `pkill -f project-dashboard/serve.py; pkill -f lukeatronwiki-viewer/serve.py`, re-run each `ensure-*.sh`, confirm `:8787`/`:8788` → 200, toggle present and defaulting to **View**. [run]
- [x] D2 — On the LIVE `:8788` instance only (real data, deliberately — this is the actual feature Luke will use): toggle to Edit in a browser-equivalent curl, tick one already-☑-Done-safe test... **skip live-data mutation** — instead re-confirm via curl that `POST /do/mode state=on` then `state=off` round-trips correctly (200/200, `edit_mode` flips both ways) without touching any project file, then leave it on **View**. [run]
- [x] D3 — Cross-check the two READMEs describe the toggle as the primary way to edit (one paragraph each, superseding the old "launch with the flag" framing; keep the env-var mention as a secondary option). [edit]
- [x] Verify — every **Success criteria** line met; toggle placement directly below "Other tools" in both; `/do/mode` is the only route that changes `edit_mode`, and it does so live without a restart; both live instances end this plan on **View**; guide reads clearly to a non-technical user. [pass/fail]

## Final step — Logging (always present)
- [x] Append one line per skill in `skills_used` to `Memory/Long-Term/Logs/skills.log`, format:
  `[AGENT: !<SkillName>] [<SUCCESS|FAIL>] <one-line outcome> | tokens≈[N]`

## Final step — Close out (always present)
- [x] Update `status: Completed` in this plan's frontmatter, then move the file from `System/Plans/New/` to `System/Plans/Completed/`.
