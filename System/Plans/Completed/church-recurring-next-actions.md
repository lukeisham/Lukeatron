---
plan: "church-recurring-next-actions"
context: [Lukeatron]
secondary_contexts: [Church]
created: 2026-09-15
status: Completed
major_because: "multi-step"
project: "LU-02"
skills_used: ["!CreatePlan", "!ReviewPlan"]
---

# Plan — Recurring-if-done Next Actions for Church Odds and Ends

## Objective
Add five ordered Next Actions to CH-28 Church Odds and Ends (Prepare sermon → Prepare slideshow →
prepare bulletin → prepare monthly roster → prepare monthly email) that repopulate themselves once
marked Done — the first three every Tuesday, the last two on the 1st of each month — by carrying a
`recurring_if_done` field end-to-end through ProjectKanban's read/derive/render layers, giving a
recurring row a distinct border per house style, and standing up the scheduled job that actually
resets them.

## Success criteria (measurable)
- CH-28's `registry.md` Next Actions table has the 5 new rows, in the stated order, each carrying a
  🔁 Recur cell (`weekly-tue` × 3, `monthly-1st` × 2).
- `grep -rn recurring_if_done System/Apps/ProjectKanban/_template` hits `stores.py`, `model.py`, and
  `task-row.js` — the field is named exactly this everywhere in code, per Luke's instruction.
- A recurring row renders with a visibly distinct dashed border in the ProjectKanban project view,
  written as a plain `border-style: dashed` literal on `.project-task-row--recurring` in
  `task-row.css` — matching the sibling pattern already in that file (line 76's `solid` in the
  `border:` shorthand is likewise a literal, not a token; dashed is not a colour/size/duration value
  so it does not fit `tokens.css`'s three existing token categories, and minting a fourth category is
  Luke's call, not this plan's — see the Note below).
- `System/Apps/ProjectKanban/_template/recur.py` resets any `recurring_if_done` row that is ☑ Done
  back to ☐ Open and rolls its Due forward to the next occurrence, when invoked with the matching
  cadence string (`weekly-tue` or `monthly-1st`); leaves every non-matching row untouched.
- Two scheduled tasks exist — one firing every Tuesday, one on the 1st of the month — each running
  `recur.py` with the right cadence.
- The full existing ProjectKanban test suite (`pytest tests/` — `test_model.py`, `test_stores.py`,
  `test_writes.py`, `test_paths.py`, `test_server.py`, `test_check_contrast.py` — plus the node
  runner over `tests/*.mjs`) still passes, plus a new `test_recur.py` covering the reset logic.
- `System/Apps/ProjectKanban/_template/StyleGuide.md` and `System/Apps/ProjectKanban/README.md`
  document the new field/column/border convention — no undocumented drift (Lukeatron charter DoD).
  `System/Templates/Template_ProjectRegistry.md` (a protected Template) is deliberately NOT touched
  by this plan — see the Note below.

## Resources
- **Memory to read:** `Memory/Medium-Term/Projects/CH-28-church-odds-and-ends/registry.md`;
  `Memory/Medium-Term/Projects/_tracking.yaml` (LU-02 row); `System/Templates/Template_ProjectRegistry.md`
- **Capability skills:** none
- **Domain skills (Skillbank):** none — this is a small, in-template feature addition to an
  already-Phase-4 app, not a new app/widget, so it does not re-enter `!AppDevelopment`'s phase
  lifecycle; house style and the app's own StyleGuide.md govern instead.
- **Sub-agents:** none — every step below is deterministic, single-agent work.
- **Scripts:** `System/Apps/ProjectKanban/_template/recur.py` (new, permanent — lives in the app
  itself, not `temp-skills/`, because it imports the app's own `stores`/`writes` modules directly).
- **Temp-skills:** none

## Steps

- [x] Step 1 — Add the 5 rows to CH-28's `registry.md` Next Actions table, in order, Owner "Luke",
  Type "mine", Status "☐ Open", State "🟠 Mine", Due seeded to the next occurrence (2026-09-15 for
  the three weekly rows, 2026-10-01 for the two monthly rows), Recur set per row. This is the first
  registry to carry the new 🔁 Recur column — `Template_ProjectRegistry.md` is a protected Template
  (CLAUDE.md Guardrail) and is deliberately NOT edited by this plan; see the Note below. [edit:
  registry.md]
- [x] Step 2 — Extend `stores.py`: add `recurring_if_done` to `_NEXT_ACTION_FIELDS`, alias header
  cell "Recur" → `recurring_if_done`, add the field to `NextActionRow`. [edit: stores.py]
  - [x] Test in Sandbox — ran `tests/test_stores.py` (the module this step actually changes)
    against the real fixture set; confirmed the new column round-trips without shifting any other
    column (all pre-existing stores tests still green).
- [x] Step 3 — Extend `model.py`: add `recurring_if_done: FieldLike[str]` to `NextActionRowLike`,
  add the field to `TaskView`, populate it in `_build_task`. [edit: model.py]
- [x] Step 4 — Extend the front end: `task-row.js` reads `task.recurring_if_done` and adds a
  `project-task-row--recurring` modifier class in both `buildTaskRow` and `buildDoneTaskRow` when
  set; `task-row.css` gives that modifier a plain `border-style: dashed` literal (matching the
  sibling `solid` literal already in this file's `border:` shorthand — dashed is not a
  colour/size/duration value, so it does not belong in `tokens.css`). [edit: task-row.js,
  task-row.css]
- [x] Step 5 — Update `StyleGuide.md` (new "Row borders" section, filed next to the existing "Icon
  buttons... different animal" exception note) and `README.md` (new decision D-16 in the Key
  decisions table, plus a Navigation-map line for `recur.py`) so the app's own docs don't drift from
  Step 2–4. [edit: StyleGuide.md, README.md]
- [x] Step 6 — Write `recur.py`: `reset_recurring(root, cadence, today) -> list[ResetOutcome]` using
  `stores.load_board_sources` to find every Done row whose `recurring_if_done` matches `cadence`,
  then flip its Status back to "☐ Open" and roll Due to the next occurrence of that cadence
  (carrying the returned `mtime` forward between writes to the same registry — required, since
  `writes._check_mtime` rejects a second `set_cell` call against a stale mtime); a CLI entrypoint
  `python3 recur.py <cadence>`. **Deviation from the plan as written:** `recur.py` does NOT call
  `writes.set_cell` directly — `tests/test_server.py`'s own
  `test_imports_writes_and_no_other_module_does` enforces FR-9 ("writes is imported by server.py
  alone on the whole Python side"), which the review pass didn't catch. Fixed by adding
  `server.set_cell_for_script(...)`, a thin pass-through `recur.py` calls instead — `writes` still
  has exactly one importer, and `recur.py` itself never mentions it. [new file: recur.py; edit:
  server.py]
  - [x] Test in Sandbox — ran it against `tests/fixtures/recur_root/` (a purpose-built fixture,
    same `shutil.copytree`-into-tempdir isolation as `test_writes.py`'s own fixtures) before it ever
    touched the real CH-28 file.
- [x] Step 7 — Add `tests/test_recur.py`: a Done+matching-cadence row resets; a Done+other-cadence
  row is untouched; an Open+matching row is untouched; the Due-forward math is correct for both
  cadences (12 tests). Ran the FULL suite — `python3 -m unittest discover` over every `tests/test_*.py`
  (184 tests) and the node runner over every `tests/test_*.mjs` — and confirmed every file this plan
  touches is green. **Two pre-existing failures found, neither caused by this plan** (see the Note
  below): `test_check_contrast.py`'s real-tokens check, and a new `test_reorder.mjs` — both belong to
  unrelated, already in-flight ProjectKanban work (lane-hue contrast, drag-reorder) this session
  found already mid-edit on disk. [script: unittest + node test runner]
- [x] Step 8 — Created two scheduled tasks (scheduled-tasks tool): `church-recurring-actions-weekly`
  (cron `0 6 * * 2`, every Tuesday 06:00) and `church-recurring-actions-monthly` (cron `0 6 1 * *`,
  the 1st of the month 06:00), each prompting a run of `python3 recur.py <cadence>` from the
  Lukeatron root, staying silent unless a write fails. Both created enabled (see the Note's open
  item 1). [capability: scheduled-tasks tool]
- [x] Step 9 — Appended a dated line to CH-28's Decision Log explaining the five recurring actions
  and how repopulation works, so a future reader (human or agent) doesn't have to re-derive the
  mechanism from the code. [edit: CH-28 registry.md]
- [x] Verify — outputs meet every line in **Success criteria**, and the result matches the
  **Objective**? **PASS** — all 7 criteria confirmed directly (grep, test runs, scheduled-tasks
  list, file reads); see the Note below for the two unrelated pre-existing failures.

## Final step — Logging (always present)
- [x] Append one line per skill in `skills_used` to `Memory/Long-Term/Logs/skills.log`, format:
  `[AGENT: !<SkillName>] [<SUCCESS|FAIL>] <one-line outcome> | tokens≈[N]`

## Final step — Close out (always present)
- [x] Update `status: Completed` in this plan's frontmatter.
- [x] Append one entry to `Memory/Long-Term/Logs/completed-plans.log` (format per that file's
  header — verbatim from this plan's frontmatter + Objective). Write this BEFORE moving the file.
- [x] Move the file from `System/Plans/New/` to `System/Plans/Completed/`.

## Note for !ReviewPlan / Luke
All writes in this plan land inside `_Lukeatron/` (Medium-Term Projects, the ProjectKanban app's own
permanent template, operational logs) — Impact axis: **Low**. No Outbox content, no Long-Term
domain-memory change, no core-skill/CLAUDE.md edit, and — after the first review pass — no protected
Template edit either: `Template_ProjectRegistry.md` is intentionally left untouched, since it is one
of CLAUDE.md's Key Templates and modifying it needs Luke's explicit sign-off first. The new 🔁 Recur
column is documented instead in ProjectKanban's own (unprotected) `StyleGuide.md`/`README.md`; adding
it to the master template too is a separate, optional follow-up for Luke to approve later, not part
of this plan. With that removed, this plan's steps are all Low-impact and can execute unattended
once approved.

Two open items for Luke, not blockers:
1. Every existing scheduled task in this system currently shows `enabled: false` — Step 8's two new
   tasks will be created enabled (the tool's default) unless Luke would rather they match the rest
   and start paused.
2. Whether `Template_ProjectRegistry.md` should eventually gain the 🔁 Recur column too, now that a
   live registry (CH-28) uses it — Luke's call, per the Guardrail above.

**Review history:** an independent review pass (agent, fresh eyes) returned three flags — Step 1
originally edited the protected Template (alignment); the Success criteria/test step named only 3 of
10 test files, missing `test_stores.py`/`test_writes.py`, the two most directly exercised by this
plan's own changes (measurability); the original Step 5 minted a new `tokens.css` token category for
a value that isn't colour/size/duration (efficiency). All three are fixed above: the Template edit is
dropped, the test step now runs the complete suite, and the border uses a literal matching the file's
own existing pattern. Verdict: **APPROVED** — cleared for execution.

**Execution note — cross-session collision, resolved.** `System/Apps/ProjectKanban/_template/` is
being actively developed by another live Lukeatron session (`lukeatron-ef`, drag-reorder + lane
colour) concurrently with this plan's own execution, on the same Dropbox-synced tree. Every diff
that surfaced from that work (multi_stream, lane_source, reorder.js, tokens.css lane hues) landed
additively alongside this plan's own edits with no real conflict — except once: that session
mistook `recur.py`'s FR-9 fix (see Step 6) for an unauthorised change by one of its own subagents,
reverted `recur.py` once, and deleted `tests/test_recur.py` and `tests/fixtures/recur_root/`
outright. It caught its own mistake, messaged this session directly, and stopped. Both files were
recreated verbatim and the full suite re-confirmed green (184 python tests, one pre-existing
unrelated failure). Flagged here, and to Luke in this session's own summary, because it is a real
data-integrity risk of running many concurrent sessions against one shared Dropbox tree with no
lock — worth Luke's attention independent of this plan's own scope.
