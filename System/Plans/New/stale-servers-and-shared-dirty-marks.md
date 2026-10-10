---
plan: "stale-servers-and-shared-dirty-marks"
context: Lukeatron
secondary_contexts: [Teaching]
created: 2026-10-10
status: New
major_because: "multi-step; changes Claude Code hooks (.claude/settings.json, System/Tools/teaching-app-family/hook.py) — High impact"
project: ""
skills_used: ["!AppPropagate"]
---

# Plan — Stale app servers and the shared dirty-mark file

## Purpose
Close the last two open issues Luke asked to fix or plan on 2026-10-10. (1) A `server`-kind app (seen on Rhetoric, port 8794) keeps serving old code after its files change, because nothing restarts it. (2) The teaching-app-family Stop hook holds a turn in a session that edited no app code, because `dirty.json` is one file shared by every session on both Macs. Both fixes change harness hooks, which is High impact, so Luke approves before execution.

| # | Change | Where |
|---|---|---|
| 1 | Server records the code fingerprint it started with; a stale server is restarted | `System/Apps/Rhetoric/server.py` and its family; Home launcher |
| 2 | Dirty marks are keyed by `session_id` | `System/Tools/teaching-app-family/hook.py` + tests |

## Objective
No family app serves code older than its files on disk when it is opened, and the family Stop hook fires only in the session that edited a family app.

## Success criteria (measurable)
- Editing `System/Apps/Rhetoric/app/*.js` and then opening Rhetoric from Home serves the new code without a manual restart (checked with a curl of a changed asset).
- `hook.py mark` from session A and `hook.py stop` from session B: B's stop exits silently; A's stop still holds once. New cases in `tests/test_hook.py` pass, and the existing suite still passes.
- Issues `[Rhetoric] server.py on :8794 ran 7 days` and `[teaching-app-family/hook.py] Stop hook fired` are resolved in `issues.log`.

## Resources
- **Memory to read:** `Memory/Long-Term/Coding/vibe-coding-rules.md`; `System/Apps/Home/README.md` (launcher rows)
- **Capability skills:** none
- **Domain skills (Skillbank):** `!AppPropagate` (step 1 touches every family `server.py`)
- **Sub-agents:** none
- **Scripts:** none
- **Temp-skills:** none

## Steps
- [ ] Step 1 — Luke picks the restart trigger: **A** Home's launcher compares the newest mtime under the app folder with the server's start time (served at `/api/started`) and restarts a stale server on `/open/<app>` (recommended: one place, no new hook); **B** each `server.py` re-execs itself when its files change; **C** a SessionStart hook restarts family servers. [decision — Luke]
- [ ] Step 2 — Implement the chosen trigger in Rhetoric first; smoke test; then carry it to the other family servers with `!AppPropagate`. [edit + tests]
  - [ ] !Checkpoint — Home launcher and family server code are outside a single app; confirm with Luke before propagating
- [ ] Step 3 — `hook.py`: store marks as `{session_id: [apps]}` in `dirty.json`; `mark` writes under the event's `session_id`; `stop` reads and clears only its own key. Add the two-session test. [edit + tests]
  - [ ] !Checkpoint — hook change is High impact; Luke approves the diff
- [ ] Verify — every Success criterion above passes. [pass/fail]

## Final step — Close out (always present)
- [ ] Resolve the two issues with `logs.py resolve`.
- [ ] Update `status: Completed` in this plan's frontmatter.
- [ ] Move the file from `System/Plans/New/` to `System/Plans/Completed/`.
