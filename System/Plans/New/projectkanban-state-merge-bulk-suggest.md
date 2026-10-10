---
plan: "projectkanban-state-merge-bulk-suggest"
context: Lukeatron
secondary_contexts: []
created: 2026-09-25
status: New
major_because: "multi-step; changes the Next Actions file format in every project registry; modifies core skills (!ProjectSweep, !CreateProject, !Intake) and a Key Template (Template_ProjectRegistry.md)"
project: "LU-02-projectdashboard"           # existing project; this plan closes Next Actions #3 and #4 and wishlist #15 + #16
skills_used: ["!CreatePlan", "!ReviewPlan"]
review: "RETURNED pass 1 (11 flags) → revised; RETURNED pass 2 (6 flags) → revised; RETURNED pass 3 (1 flag) → revised; APPROVED — see Notes → Review history"
---

# Plan — Dashboard: one State column, bulk State edits, and suggested States you confirm

## Objective
Replace today's two overlapping per-action fields with **one State column** that means the same thing in the files, the Dashboard and `!ProjectSweep`. A project's State becomes **the State of its Next Action** (the top open row). Luke can **set State on several selected actions in one go**. **Suggested States** are offered for him to confirm or change, so nothing sets a per-action State without him. This specialises the Lukeatron North Star (*keep it correct and legible, extend it deliberately*): it removes a duplicated field and a silent writer rather than adding a feature on top of them.

## Why this needs a plan (catch-up)
Each Next Action row carries two "whose move" fields today:

```
             Kind / Type  (set by Luke in the Dashboard)       State  (written by !ProjectSweep)
values       mine · delegate · waiting · incoming · unshaped    canonical: 🔴 Incoming · 🟠 Mine · 🔵 Waiting ·
             + legacy: hand-over (34), Human, Agent, task        🟢 Delegate · ⚪ Undefined — but in the files mostly
                                                                 OLD labels: 🟠 your move (68), ⚪ undefined (41),
                                                                 — (32), 🟢 on track (28), 🔵 waiting (20)
project      Dashboard: highest-DEMAND open row wins            Sweep: highest-PRECEDENCE open row wins,
roll-up      mine > delegate > waiting > incoming > unshaped    🔴 > 🟠 > 🔵 > 🟢 > ⚪, plus Event/overdue rules
"incoming"   a project woken by its wake date                   overdue, ≤3 days with no plan,
means                                                           date-blocked, or adrift
```

The two use the same words but mean different things and are ranked in different orders, so the board and the sweep can disagree about the same project. On 2026-09-15 this forced a hand-recast of three rows in CH-01. The data: 45 registry files holding 46 Next Actions tables (PP-02 has two), 214 filled rows, 108 of them with a Kind that disagrees with their State. The sweep also rewrites State **silently** every Monday at 07:30, which is what LU-02 #4 objects to.

**Impact.** Local: the Dashboard (`stores`/`model`/`writes`/`server`, the project view, board lanes, tokens), all 45 registries and the app's test fixtures change. Global: `!ProjectSweep`, `!CreateProject` and `!Intake` (all three are core skills), `Template_ProjectRegistry.md` (a Key Template), and the `_links.yaml` header are affected. The scheduled jobs `project-sweep.sh`, `intake-sweep.sh`, `review-monday.sh` and `review-friday.sh` write registries or create them from the template. They run on the Mac mini (`System/Tools/cron/schedule.json`), so the cut-over runs in a window when none of them is due. Nothing leaves the system, and no `Long-Term/` store changes apart from log appends.

## Success criteria (measurable)
**File format (how files are written)**
- Every Next Actions table's header reads `| # | Action | Owner | Status | State | 🔗 Link | Due |` (plus `🔁 Recur` where present). No `Kind` or `Type` column remains in any of the 46 tables. Row count **per table** is the same before and after, per the migration report.
- Every row's State is one of the five canonical values `🔴 Incoming` · `🟠 Mine` · `🔵 Waiting` · `🟢 Delegate` · `⚪ Undefined`, per the Decision 2 map (which covers the Kind/Type values **and** the old State labels). The only exceptions are rows listed as "needs your eye" (unparseable), which are left unchanged and named in the report.
- The `_links.yaml` header documents the new vocabulary. Linked rows have identical State across copies, which is trivially true today because `links: []`.
- A full pre-migration copy of `Memory/Medium-Term/Projects/` exists in `Archive/projects-pre-state-merge-<date>/`. A diff after migration shows **only** Next Actions header and State/Kind/Type cells changed: no other line in any registry, and no `notes.md` or `_tracking.yaml` line.
- `Template_ProjectRegistry.md` shows the new header and a one-line State legend, with Luke's sign-off (Key Template).

**Dashboard: merge (wishlist #15 + #16)**
- `model.py` reads a row's lane from **State** and understands both canonical and old labels. It falls back to the Owner-based guess only when State is blank. After the cut-over, `stores.py` drops the `kind`/`type` aliases. A test using one kept **legacy fixture** proves a file still carrying `Kind` parses without crashing (the column is ignored and a warning is written).
- The project's board lane follows the **one project-State rule written in Decision 3** (the top open row, with its listed exceptions). `_lane_driver` / `lane_source` and the lane-source badge are removed. `test_model.py` has one case per clause of that rule, including no-open-rows with a wake and no-open-rows without.
- Board lanes use the sweep's names and order 🔴 → 🟠 → 🔵 → 🟢 → ⚪. Every front-end hit of the old lane names (grep list in Step 8) is renamed, `tokens.css` is updated in every palette block, and `check_contrast.py` passes.
- **Parity:** `parity_check.py` reports 0 unexplained mismatches between the Dashboard's board lane and the `_tracking.yaml` state the updated sweep would write, across every active project.

**Dashboard: bulk set (LU-02 #3)**
- In the project view, a **Select** control reveals a checkbox on each open, unlinked row. Linked rows say why they can't be selected. Shift-click selects a range, and Space toggles the focused row. A bar shows "N selected · Set State [▾] · Apply · Clear".
- `writes.set_cells(root, project_id, rows, column="state", value, mtime)` makes **one** atomic, verified write per registry. It is all-or-nothing: a stale mtime, a missing row or a linked row refuses the whole batch and writes nothing. It adds one `Logs/edits.log` line per row, sharing a batch id, and stamps `pending_sweep` **once** per batch. `POST /api/edit-batch` validates input the way `/api/edit` does.
- **One Undo reverts the whole batch.** A pre-cut-over `kind` entry in `edits.log` gives a plain "can't undo: that column no longer exists" reason. `test_writes.py` covers success, stale mtime, linked-row refusal, verify failure (no partial write), batch undo and the legacy-kind undo.
- `state` is added to `_EDIT_COLUMNS`, and `kind` is removed at the cut-over. The single-row lane `<select>` in `task-row.js` becomes the State select.

**Suggested States (LU-02 #4)**
- One written rule set: `System/Skillbank/PersonalProductivity/!SuggestState/reference/state-rules.md`, registered in `_index.yaml`. It holds the per-action rules from `!ProjectSweep` STEP 2, plus a fixture table of 15 or more example rows with expected suggestions and reasons. It is the **single** "due within 3 days" definition: `suggest.py` imports it from one `model.py` function.
- `suggest.py` implements those rules as pure functions. `test_suggest.py` runs every fixture row, so the code and the written rules can't drift apart silently.
- The project view shows a quiet **suggestion chip** on each open row whose suggested State differs from the stored one: the State, a reason in words, ✓ Accept and ✕ Dismiss. Accept writes through `set_cell`. Dismiss is remembered for this browser only (`localStorage`, wrapped in try/catch) until the row's data changes. "Accept all suggestions (N)" goes through `set_cells`. Meaning is never shown by colour alone.
- The State select (single and bulk) marks the suggested value "suggested". **No code path or skill writes an existing row's State without a click from Luke.** A brand-new row's first State comes from `!SuggestState`, set by `!Intake`, `!CreateProject` or `!ProjectSweep` STEP 3. A row reopened by `recur.py` keeps its last State (Decision 6).
- `!ProjectSweep` no longer writes existing rows' State (STEP 2 per-row writes and STEP 2.5b State sync removed). It lists suggested changes in its digest, and still writes the **project** row in `_tracking.yaml` by the Decision 3 rule. Its STEP 2.5 link sync (`reference/linked-actions.md`) syncs Status only.

**Charter baseline, house style and safety**
- Full suite (`python3 -m unittest discover`, `node --test tests/*.mjs`, `check_contrast.py`) shows 0 new failures against the Step 3 baseline, plus the new cases.
- Verified live: first on a second instance over a Sandbox copy of the migrated data (Step 10), then on `:8789` after the cut-over (Step 11). Covers bulk set → one-step undo, accepting and dismissing a suggestion, and lane order, in default, dark and paper palettes, condensed density, reduced motion and print. No console errors. Screenshots are in **Notes → Verification**.
- The cut-over (Step 11) starts after 13:15 and finishes before 17:45 on a Monday to Thursday, so no scheduled job is due during it (`intake-sweep.sh` 08/13/18 daily, `project-sweep.sh` Mon 07:30, `review-monday.sh` Mon 08:00, `review-friday.sh` Fri 17:00). `schedule.py check` is clean before and after, and is recorded in **Notes → Verification**.
- Until Step 11.2, the live `:8789` serves `main` unchanged: all build work happens in a separate `git worktree`.
- The new controls use existing tokens only, and add at most one flourish, declared in the StyleGuide Flourishes table.
- Every core-skill and template change carries Luke's explicit sign-off (**Notes → Sign-offs**).
- Docs: `README.md` (Cross-app behaviour: State column, `edit-batch`, `suggestion`) and `StyleGuide.md` are updated. `app-decisions.md` → Approvals gets one row for the merge, stating that it reverses the Kind field and the sweep's per-row State writes. Wishlist #15/#16 rows are deleted. LU-02 #3/#4 are ticked with Decision Log lines. `System/System_guide.md` and `CLAUDE.md` are re-grepped: still no Kind/Type reference.

## Resources
- **Memory to read:** `Memory/Long-Term/Coding/vibe-coding-rules.md`; `System/Apps/ProjectDashboard/README.md`, `app-decisions.md`, `StyleGuide.md`; `.claude/skills/!ProjectSweep/SKILL.md` (STEP 2, STEP 3, STEP 4, VERIFY) and `reference/linked-actions.md`, `reference/digest.md`; `!CreateProject/SKILL.md:70`; `!Intake/SKILL.md:78`; `Template_ProjectRegistry.md` (Next Actions section); `_links.yaml` header; `LU-02-projectdashboard/notes.md`; `!AppDevelopment/phase4-retire.md` (Refactor Health Check).
- **Capability skills:** none. `python3 System/Tools/cron/schedule.py check` confirms the job record before and after the cut-over.
- **Domain skills (Skillbank):** new `!SuggestState` (Step 4). `!AppWishlist`'s delete-built-rows rule.
- **Sub-agents:** (a) back end: Steps 6–7; (b) front end: Step 8. Each is briefed with this plan's Success criteria and Notes → Decisions. The coordinator reads every diff.
- **Scripts:**
  - `Memory/Medium-Term/temp-skills/migrate_state_column.py`: `--dry-run` / `--root <dir>` / `--apply`. It writes a report grouped by pattern to `System/Sandbox/state-merge/report.md`.
  - `System/Sandbox/state-merge/parity_check.py`: `--before` snapshot / `--after` compare.
- **Temp-skills:** none.

## Rollback — which one applies when
| Up to and including | If something goes wrong |
|---|---|
| Steps 1–10 (all work in a separate worktree; live `main`, data and skills untouched) | Delete the worktree and branch. Nothing live changed. |
| Step 11 (cut-over) | Restore `Projects/` from the Archive copy. Revert the merge of `state-merge` into `main` and the skill/template edits. **Only valid if restored before Luke makes new Dashboard edits.** After that, re-run `--apply` forwards rather than restoring. |
| After Step 11 | Fix forwards. The Archive copy is kept until close-out. |

## Steps
**Shared helper.** This plan builds the one "within N days" helper in `model.py` (Decision 7).

- [x] **Step 1 — Luke decides.** Answers go in **Notes → Decisions**. [human input — LU-02]
  1. **Column set.** Recommended: drop **both** `Kind` and `Type`, and keep `State`. Owner already says Luke / Agent / a person.
  2. **Migration map.** Recommended: Kind/Type wins where set, because it is Luke's hand-set value. Otherwise the old State label is normalised.
     - From Kind/Type: `mine`/`Human` → 🟠 Mine · `delegate`/`hand-over`/`Agent` → 🟢 Delegate · `waiting` → 🔵 Waiting · `incoming` → 🔴 Incoming · `unshaped` → ⚪ Undefined.
     - From the old State label: `your move` → 🟠 Mine · `on track` → 🟢 Delegate · `waiting` → 🔵 Waiting · `urgent`/`incoming` → 🔴 Incoming · `undefined`/`⚪`/`—`/blank → ⚪ Undefined.
     - Otherwise (`task`, unrecognised) → ⚪ Undefined, listed.
  3. **Project-State rule (wishlist #16), one written definition used by both the app and the sweep:**
     - (i) the State of the top open row;
     - (ii) except: **at least one** open row, all undated, and a dated wake set → today's wake behaviour;
     - (iii) no open rows → with a wake set, today's wake behaviour (unchanged); without one, 🔴 Incoming (adrift). (Replaces today's `unshaped` for the no-wake case.)
     
     For each sweep rule, Luke marks **keep as an override on top of (i)** or **drop**:
     - an overdue Event → 🔴 (SKILL.md:104–110);
     - any overdue row → 🔴 (VERIFY :314–315);
     - "pending Luke's input" → 🟠 (Hard rule 2);
     - no 🔵 without a wake (Hard rule 1).
     
     Recommended: keep the overdue Event and overdue row overrides (they are about the project slipping, not whose move), and keep the wake rule. Drop precedence-across-rows.
  4. **Bulk scope.** Recommended: within one project view only.
  5. **Suggestion source.** Recommended: deterministic rules in the app. `!SuggestState` can also be run in chat for a judgement pass (notes.md, Decision Log) on cases rules can't see.
  6. **Recurring rows.** Recommended: a row reopened by `recur.py` gets a fresh suggested State (usually 🟠 Mine or 🟢 Delegate by Owner), not its stale old one.
  7. **Order vs urgency-shading plan.**
- [x] **Step 2 — Luke's sign-off in principle** for editing `!ProjectSweep`, `!CreateProject`, `!Intake` and `Template_ProjectRegistry.md` as described. Recorded in **Notes → Sign-offs**. Step 11 does not start without it. [human input — Key Skills/Template guardrail]
- [x] **Step 3 — Baseline.**
  - `git fetch`; confirm local `main` is on top of `origin/main`. Commit **only** the uncommitted `System/Apps/ProjectDashboard/` files as-is (Luke's go-ahead is part of Step 2), and push. The other uncommitted work (LukeatronWiki, Skillbank, plans) is left alone for Luke.
  - Create branch `state-merge` in a **separate git worktree** outside Dropbox (e.g. `~/lukeatron-state-merge/`). The live tree stays on `main`, so `:8789` and its SessionStart restart keep serving unchanged code.
  - Run the full suite and `check_contrast.py`, and record the counts.
  - Checksum `Projects/`.
  - Run `parity_check.py --before` to snapshot every active project's board lane and `_tracking.yaml` state.
  
  [inline + script]
- [x] **Step 4 — Build `!SuggestState`**: `SKILL.md` (trigger; output a suggestion + reason per row, **never a write**), `reference/state-rules.md` (the per-action rules, the Decision 3 project rule, the Decision 2 map, the fixture table), and an `_index.yaml` entry. [inline; Skillbank, Low impact]
- [x] **Step 5 — Write `migrate_state_column.py`.** It reuses `stores._split_row` / `_resolve_columns`, handles **every** Next Actions table in a file, preserves line endings, and leaves unparseable rows untouched while listing them. The report groups rows by `Kind → old State → new State` pattern with counts; individual rows appear only for rare patterns (<3) and "needs your eye". [script]
  - [x] Test in Sandbox: copy `Projects/` to `System/Sandbox/state-merge/projects-copy/` and run `--root` on it. Pass = only header/State/Kind/Type cells differ; per-table row counts are equal (PP-02's two tables included); the report's own parse count equals the input row count. (The check that the app parses them with 0 skipped rows runs in Step 10, once the Step 6 code exists.)
- [x] **Step 6 — Back end, dual-read phase** (the live app keeps working on both old and new files):
  - `model.py`:
    - `resolve_lane` reads **Kind first when the column is present** (today's behaviour, so unmigrated live data shows exactly as now), otherwise State, understanding old State labels too. Switching to State-only happens at Step 11.5;
    - the Decision 3 project rule, with `_lane_driver`/`lane_source` removed;
    - new lane names and order;
    - one shared "within N days" helper.
  - `stores.py`: add the old-label normalisation; keep the aliases for now.
  - `writes.py`: `state` added to `_EDIT_COLUMNS` (keep `kind` for now); `set_cells` plus batch undo, the once-per-batch `pending_sweep` stamp and the legacy-kind undo reason.
  - `server.py`: `/api/edit-batch`; `suggestion` on each task in the payload.
  - `suggest.py`.
  - `recur.py`: a reopened row keeps its last State (Decision 6); a `test_recur.py` case proves it.
  - Tests: `test_model.py` / `test_stores.py` / `test_writes.py` / `test_server.py` / `test_suggest.py`.
  - **Migrate `tests/fixtures/`** with the Step 5 script (ZZ-10, ZZ-11, ZZ-20, `registry_multi_stream.md` and the rest), keeping one legacy-Kind fixture.
  
  [sub-agent (a)]
- [ ] **Step 7 — Dry run on live data, show Luke the grouped report** (files, tables, patterns, "needs your eye"). Luke approves or amends the map. [script `--dry-run` + human input]
- [x] **Step 8 — Front end.** Before editing, grep `unshaped|delegate|incoming|kind|lane` across `app/` and list every hit in **Notes → Review**. Known hits: `task-row.js` (the State select, the badge removed), `undo.js` (`COLUMN_NAMES`, batch label), `shared/flourish.js:77`, `shared/flourish.css:26-30`, `board/board.css:12,85,145` (its own `--l-unshaped`), `board/card.css:57`, `board/render.js:21,105` (empty-state copy), `board/keynav.js`, and `tokens.css` in every palette block.
  
  New work: `app/project/bulk.js` + `bulk.css` (Select mode, bulk bar, Accept all), the suggestion chip with dismiss memory, and the "suggested" marker in the selects.
  
  Tests: `test_project.mjs` / `test_undo.mjs` / `test_board.mjs` / `test_keynav.mjs` / `check_contrast.py`. [sub-agent (b)]
- [x] **Step 9 — Review diffs.** Check every diff against the Success criteria and `StyleGuide.md`'s 7-question visual checklist, then run the Refactor Health Check (`!AppDevelopment/phase4-retire.md`). Findings and fixes go in **Notes → Review**. [inline]
- [x] **Step 10 — Pre-cut-over check on a copy.** Full suite: 0 new failures. Run `migrate --root` on a fresh Sandbox copy. Confirm the app's `stores` parses every migrated file with 0 skipped rows. Start a **second instance** of the app from the worktree, on another port, with `LUKEATRON_ROOT` pointed at that copy (`paths.py:19`), (as the undo plan did), and walk through every live check in the Success criteria, with screenshots. Run `parity_check.py --after` on the copy. Also run the worktree code over an **unmigrated** copy and confirm every board lane matches the `parity_check.py --before` snapshot (proves dual-read shows no change). [inline + browser]
- [ ] **Step 11 — Cut-over, in one sitting, with Luke present.** [human sign-off per diff; script]
  1. Confirm the window (Mon–Thu, start after 13:15, finish before 17:45) and run `schedule.py check`; record both.
  2. Merge the dual-read branch (Kind-first, `kind` and `state` both editable) into `main` in the live tree and restart `:8789`. Confirm the board is unchanged against the `--before` snapshot. From here the live app can read both formats.
  2a. Back up `Projects/` → `Archive/projects-pre-state-merge-<date>/`.
  3. `migrate --apply`. Re-run the diff and parse checks on live data. Either fails → restore (see Rollback).
  4. Core skill and template edits. Show Luke each diff before saving:
     - `!ProjectSweep` (find each by content; line numbers drift):
       - every "Owner + Type" / "Type Human" / "Type Agent" mention → State;
       - STEP 2: stop per-row State writes, and apply the Decision 3 project rule and overrides;
       - STEP 2.5 (`reference/linked-actions.md`): stop syncing State, and sync Status only;
       - STEP 3: a new row's State comes from `!SuggestState`;
       - STEP 4 and `reference/digest.md`: add "N suggested State changes";
       - VERIFY: align with Decision 3, and remove the pending-Luke-input → 🟠 check (Hard rule 2, dropped).
     - `!CreateProject:70`: "Owner + Kind" → "Owner + State (from `!SuggestState`)".
     - `!Intake:78`: "Owner/Type" → "Owner; State from `!SuggestState`".
     - `Template_ProjectRegistry.md`: new header and legend.
     - The `_links.yaml` header.
  5. On the branch: switch `resolve_lane` to State-only and remove the dual-read leftovers (the `kind`/`type` aliases, `kind` in `_EDIT_COLUMNS`). Tests stay green, including the legacy-fixture test. Merge again into `main`.
  6. Restart `:8789` a second time. Live walk-through on real data. Run `parity_check.py --after`.
  7. Sandboxed sweep dry run on a fresh copy. Pass = no existing row's State written; project states match parity; the digest lists suggestions.
  8. Run `schedule.py check` again and confirm no scheduled job ran during the window; record both.
- [ ] **Step 12 — Docs + project.** `README.md` (State column, `edit-batch`, `suggestion`), `StyleGuide.md` (bulk bar, chip, flourish row), the `app-decisions.md` Approvals row, delete wishlist #15/#16, tick LU-02 #3/#4 with Decision Log lines, re-grep `System_guide.md` and `CLAUDE.md`. Remove the worktree. [inline]
- [ ] **Step 13 — Luke's sign-off on the feel** (live; tune tokens only). [human input — LU-02]
- [ ] **Verify** — every line in **Success criteria** holds and the result matches the **Objective**. [pass/fail]

## Final step — Close out (always present)
- [ ] Update `status: Completed` in this plan's frontmatter.
- [ ] Move the file from `System/Plans/New/` to `System/Plans/Completed/`.

## Notes
### Review history
- Pass 1 (independent sub-agent, 2026-09-25): RETURNED with 11 flags.
  1. Live data migrated before any reader could handle the new format. → Dual-read phase added (Step 6); cut-over is one sitting with the scheduled tasks paused (Step 11).
  2. The map didn't cover the old State labels. → Normalisation added to Decision 2.
  3. The top-row rule clashed with the sweep's overrides. → Decision 3 now lists each override as keep/drop.
  4. Sweep lines 92/202/215 and STEP 2.5b/3 were missing. → Now named in Step 11.4.
  5. Front-end lane-name hits were missing. → Listed in Step 8.
  6. Test fixtures weren't in scope. → Step 6.
  7. PP-02's two tables. → Per-table counts.
  8. Code rollback was missing. → Branch + Rollback table.
  9. The conflict report was too long. → Grouped by pattern.
  10. Clash with the urgency-shading plan. → Order is a Step 1 decision, with one shared helper.
  11. Small gaps: pending_sweep stamp, legacy-kind undo, recur rows, scripted baseline. → All added.
- Pass 2 (same reviewer): 9 of 11 resolved; RETURNED with 6 new flags.
  1. State-first dual-read would change the live board before the cut-over. → Kind-first until Step 11.5, plus a Step 10 no-change proof.
  2. The branch sat in the live tree, and the commit scope was unclear. → Separate worktree; commit only the Project Dashboard files.
  3. `review-monday`/`review-friday` also write. → Paused too, with a timing window.
  4. `recur.py` had no build step. → Added to Step 6.
  5. Decision 3's clauses overlapped. → (ii) needs ≥1 open row; (iii) keeps the wake behaviour; tests added.
  6. Step 5 relied on Step 6 code. → Parse check moved to Step 10.
- Pass 3: all 6 resolved; 1 new flag: the live app ran old code between the migration and the merge. → Step 11.2 now merges the dual-read code and restarts before migrating. Note applied: `LUKEATRON_ROOT` for the second instance.
- Pass 4: APPROVED (single remaining flag resolved as specified by the reviewer's fix).

### Decisions
_(Step 1 — answered 2026-09-28.)_

1. **Column set.** Drop both `Kind` and `Type`; keep only `State`. Owner already carries Luke / Agent / a person.
2. **Migration map.** Kind/Type wins where set (Luke's hand-set value); otherwise the old State label is normalised, per the map in Step 1.2. Unrecognised → ⚪ Undefined, listed in the report.
3. **Project-State rule (wishlist #16).** Base rule (i)–(iii) as written in Step 1.3. Overrides:
   - Overdue Event → 🔴 — **kept**.
   - Any overdue row → 🔴 — **kept**.
   - No 🔵 without a wake (Hard rule 1) — **kept**.
   - "Pending Luke's input" → 🟠 (Hard rule 2) — **dropped**. Not selected when the other three overrides were kept; the app and sweep will not force Mine on a row just because it's marked pending Luke's input — it falls through to the base top-open-row rule instead.
4. **Bulk scope.** Within one project view only, not across the whole board.
5. **Suggestion source.** Deterministic rules in the app (`suggest.py`) as the primary source, plus `!SuggestState` run in chat for a judgement pass on cases the rules can't see (logged in `notes.md`'s Decision Log).
6. **Recurring rows.** A row reopened by `recur.py` **keeps its last State** rather than getting a fresh suggestion. This is a deliberate departure from the plan's own recommendation (fresh suggestion) — flagged so Step 6/11 implementation doesn't silently "correct" it back.
7. **Order vs urgency-shading plan.** The urgency-shading plan is abandoned (2026-10-10, `Archive/Plans-2026-10-10/`; LU-02 #2 dropped). This plan builds the "within N days" helper itself.

### Sign-offs
_(Steps 2, 11, 13.)_
- 2026-10-10 — Step 2: Luke approves in principle the edits to `!ProjectSweep`, `!CreateProject`, `!Intake` and `Template_ProjectRegistry.md` (each diff still shown at Step 11.4), and the commit of the uncommitted `System/Apps/ProjectDashboard/` files.

### Baseline
_(Step 3.)_
- 2026-10-10 — Commit `fbcf888` (Dashboard files only, pushed). Worktree `~/lukeatron-state-merge/`, branch `state-merge`.
- Live tree: `unittest` 218 OK; `node --test tests/*.mjs` 158/158; `check_contrast.py` 108/108. In the worktree, 2 real-tree tests error without `LUKEATRON_ROOT` (no `Memory/` there) and `test_paths` fails 2 with it set — environment, not code; the worktree baseline is 216 + those 2.
- `Projects/` checksums: `System/Sandbox/state-merge/projects-before.sha`.
- `parity_check.py --before --today 2026-10-10`: 50 projects; 32 of 50 board lanes disagree with `_tracking.yaml` state.

### Review
_(Steps 8–9.)_
- Branch `state-merge` (worktree `~/lukeatron-state-merge/`): `cfb5699` back end, `5ee998f` front end, `916019e` fixes, `aadd301` README + StyleGuide.
- Step 8 grep hits, all handled: `board.css`, `card.css`, `flourish.css`, `flourish.js` (`kind` → `state` control), `render.js` (lane order, empty-state copy), `keynav.js` (takes lanes from `render.js`, no change), `tokens.css` (`--l-unshaped` → `--l-undefined`, 4 blocks), `task-row.js` (State select, lane-source badge removed), `undo.js` (State, batch label).
- `set_cells` takes `changes: [(row, value)]`, not `rows` + one `value`, so "Accept all suggestions" (each row its own State) is still one write and one undo. `POST /api/edit-batch` takes `changes: [{row, value}]`.
- Decision 3 (ii) needs a **dated** wake. A trigger or `<pending first sweep>` wake no longer fires P3 (it did in the first build pass, which put 18 projects in Incoming for that reason alone). A `<placeholder>` is not a wake for P6 either. Written into `state-rules.md`.
- P5's blank-State fallback is the Owner rules (R5–R8), matching the success criterion; `state-rules.md` says so.
- Found and fixed: the done tick sat beside the select box in select mode (two look-alike checkboxes) — the tick now steps aside; the Undo button vanished on any re-render that saved nothing (Select, Show done, Decision Log toggles) — every render now redraws it.
- Side effect: `task-row.css` is 142 lines, under the CSS-1 cap (closes the 2026-09-20 issue).
- Refactor Health Check: Q1 yes · Q2 yes · Q3 yes (every new function reached from a click) · Q4 yes · Q5 n/a · Q6 yes (no exception) · Q7 yes (README updated) → 10/10. `comment_lint.py` clean on every changed file.
- `!SuggestState` catalog entry is held in `System/Sandbox/state-merge/index-entry.yaml` (the live `_index.yaml` has other uncommitted edits); it is added at Step 11.4. The skill's folder arrives with the merge.
- Temporary: `.claude/launch.json` entry `project-dashboard-state-merge` (test band :9301) — remove at Step 12.

### Verification
_(Steps 10–11.)_
- Tests on the branch: `unittest` 253 (2 real-tree tests need the live tree, run at Step 11.2; the stores one passes against live data now); `node --test` 167/167; `check_contrast.py` 108/108.
- Step 5 / 10 on a fresh copy: 50 registries, 51 tables, 244/244 rows, 3 listed, 0 need your eye; `verify_migration.py` 0 problems (only header/separator/State/Kind/Type cells differ; no `notes.md` or `_tracking.yaml` byte changed); the app parses every migrated file with 0 skipped rows.
- Dual-read proof: `parity_check.py --same` (branch code over live, unmigrated data): 50 projects, **0 lane changes**.
- New rule over the migrated copy: Mine 20 · Delegate 12 · Incoming 10 · Waiting 4 · Undefined 4 (today's board: Mine 22 · Incoming 21 · Waiting 3 · Delegate 2 · Undefined 2). 33 of 50 differ from `_tracking.yaml`, which the sweep last wrote under the old precedence rules; they converge on the first sweep after cut-over.
- Second instance (:9301 over the Sandbox copy), checked live: Accept one suggestion → saved, Undo label right; Select → shift-range 1–3 → Delegate → Apply → one batch, "Undo: State on 3 rows (1, 2, 3)" → one Undo restored all three; Dismiss survives a reload; Accept all (5) → one batch, one undo; dark and paper palettes; phone width; lanes Incoming → Undefined with counts 10/20/4/12/4; no console errors. A write through a symlinked test root was refused 403 by the fence, as designed.
- Live `Projects/` untouched: checksums match `projects-before.sha`.
