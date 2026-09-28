---
plan: "projectkanban-state-merge-bulk-suggest"
context: Lukeatron
secondary_contexts: []
created: 2026-09-25
status: New
major_because: "multi-step; changes the Next Actions file format in every project registry; modifies core skills (!ProjectSweep, !CreateProject, !Intake) and a Key Template (Template_ProjectRegistry.md)"
project: "LU-02-projectkanban"           # existing project; this plan closes Next Actions #3 and #4 and wishlist #15 + #16
skills_used: ["!CreatePlan", "!ReviewPlan"]
review: "RETURNED pass 1 (11 flags) → revised; RETURNED pass 2 (6 flags) → revised; RETURNED pass 3 (1 flag) → revised; APPROVED — see Notes → Review history"
---

# Plan — Dashboard: one State column, bulk State edits, and suggested States you confirm

> ⚠️ **Needs revision before execution (2026-09-28).** This plan was written against the old
> `!AppDevelopment` layout: `_template/` (now flattened into `System/Apps/ProjectKanban/`) and
> `refactor-registry.md` (retired — Luke's approvals and rule exceptions now live in
> `app-decisions.md`; the build history is in git). Its paths, docs step and staging approach must be
> revised against `!AppDevelopment` v2.0.0 before it runs. See
> `System/Plans/New/appdevelopment-registry-to-decisions.md`.

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

**Impact.** Local: the Dashboard (`stores`/`model`/`writes`/`server`, the project view, board lanes, tokens), all 45 registries and the app's test fixtures change. Global: `!ProjectSweep`, `!CreateProject` and `!Intake` (all three are core skills), `Template_ProjectRegistry.md` (a Key Template), and the `_links.yaml` header are affected. The scheduled `project-sweep`, `intake-sweep`, `review-monday` and `review-friday` tasks must be paused during the cut-over (all four write registries or create them from the template). Nothing leaves the system, and no `Long-Term/` store changes apart from log appends.

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
- One written rule set: `System/Skillbank/PersonalProductivity/!SuggestState/reference/state-rules.md`, registered in `_index.yaml`. It holds the per-action rules from `!ProjectSweep` STEP 2, plus a fixture table of 15 or more example rows with expected suggestions and reasons. It is the **single** "due within 3 days" definition: `suggest.py` and (if it lands) the urgency-shading helper both import one `model.py` function that implements it.
- `suggest.py` implements those rules as pure functions. `test_suggest.py` runs every fixture row, so the code and the written rules can't drift apart silently.
- The project view shows a quiet **suggestion chip** on each open row whose suggested State differs from the stored one: the State, a reason in words, ✓ Accept and ✕ Dismiss. Accept writes through `set_cell`. Dismiss is remembered for this browser only (`localStorage`, wrapped in try/catch) until the row's data changes. "Accept all suggestions (N)" goes through `set_cells`. Meaning is never shown by colour alone.
- The State select (single and bulk) marks the suggested value "suggested". **No code path or skill writes an existing row's State without a click from Luke.** A brand-new row's first State comes from `!SuggestState`, set by `!Intake`, `!CreateProject`, `!ProjectSweep` STEP 3, or `recur.py` when it reopens a recurring row (Decision 6).
- `!ProjectSweep` no longer writes existing rows' State (STEP 2 per-row writes and STEP 2.5b State sync removed). It lists suggested changes in its digest, and still writes the **project** row in `_tracking.yaml` by the Decision 3 rule.

**Charter baseline, house style and safety**
- Full suite (`python3 -m unittest discover`, `node --test tests/*.mjs`, `check_contrast.py`) shows 0 new failures against the Step 3 baseline, plus the new cases.
- Verified live: first on a second instance over a Sandbox copy of the migrated data (Step 10), then on `:8789` after the cut-over (Step 11). Covers bulk set → one-step undo, accepting and dismissing a suggestion, and lane order, in default, dark and paper palettes, condensed density, reduced motion and print. No console errors. Screenshots are in **Notes → Verification**.
- The scheduled `project-sweep`, `intake-sweep`, `review-monday` and `review-friday` tasks are paused for the cut-over and **confirmed running again** afterwards (`list_scheduled_tasks` output recorded). The cut-over is not scheduled across Fri 17:00 or Mon 07:30–08:00.
- Until Step 11.2, the live `:8789` serves `main` unchanged: all build work happens in a separate `git worktree`.
- The new controls use existing tokens only, and add at most one flourish, declared in the StyleGuide Flourishes table.
- Every core-skill and template change carries Luke's explicit sign-off (**Notes → Sign-offs**).
- Docs: `README.md`, `StyleGuide.md` and `refactor-registry.md` (a Migration-log row) are updated. Wishlist #15/#16 rows are deleted. LU-02 #3/#4 are ticked with Decision Log lines. `System/System_guide.md` and `CLAUDE.md` are re-grepped: still no Kind/Type reference.

## Resources
- **Memory to read:** `Memory/Long-Term/Coding/vibe-coding-rules.md`; `_template/README.md`, `StyleGuide.md`; `.Claude/skills/!ProjectSweep/skill.md` (lines 92, 104–150, 164–173, 202, 215, 238–241, 310–320); `!CreateProject/skill.md:70`; `!Intake/skill.md:78`; `Template_ProjectRegistry.md:88–100`; `_links.yaml` header (esp. :37); `LU-02-projectkanban/notes.md`; `System/Plans/New/projectkanban-urgency-shading.md`.
- **Capability skills:** none. The scheduled-tasks tools are used to pause and resume `project-sweep` / `intake-sweep`.
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
| Step 11 (cut-over) | Restore `Projects/` from the Archive copy. Revert the merge of `state-merge` into `main` and the skill/template edits. Un-pause the scheduled tasks. **Only valid if restored before Luke makes new Dashboard edits.** After that, re-run `--apply` forwards rather than restoring. |
| After Step 11 | Fix forwards. The Archive copy is kept until close-out. |

## Steps
**Order with the urgency-shading plan** (`projectkanban-urgency-shading.md`, LU-02 #2): decided in Step 1. Recommended: urgency shading runs **first**, since it is smaller and read-only. Its Step 9 checks that `Projects/` is unchanged, which would fail if this plan's migration landed in between. This plan then reuses its "within 3 days" helper and re-checks the shading on the renamed lane tokens in Steps 10–11.

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
     - an overdue Event → 🔴 (skill.md:104–110);
     - any overdue row → 🔴 (VERIFY :314–315);
     - "pending Luke's input" → 🟠 (Hard rule 2);
     - no 🔵 without a wake (Hard rule 1).
     
     Recommended: keep the overdue Event and overdue row overrides (they are about the project slipping, not whose move), and keep the wake rule. Drop precedence-across-rows.
  4. **Bulk scope.** Recommended: within one project view only.
  5. **Suggestion source.** Recommended: deterministic rules in the app. `!SuggestState` can also be run in chat for a judgement pass (notes.md, Decision Log) on cases rules can't see.
  6. **Recurring rows.** Recommended: a row reopened by `recur.py` gets a fresh suggested State (usually 🟠 Mine or 🟢 Delegate by Owner), not its stale old one.
  7. **Order vs urgency-shading plan** (see above).
- [ ] **Step 2 — Luke's sign-off in principle** for editing `!ProjectSweep`, `!CreateProject`, `!Intake` and `Template_ProjectRegistry.md` as described. Recorded in **Notes → Sign-offs**. Step 11 does not start without it. [human input — Key Skills/Template guardrail]
- [ ] **Step 3 — Baseline.**
  - Commit **only** the uncommitted `System/Apps/ProjectKanban/` files as-is (Luke's go-ahead is part of Step 2). The other uncommitted work (LukeatronWiki, Skillbank, plans) is left alone for Luke.
  - Create branch `state-merge` in a **separate git worktree** outside Dropbox (e.g. `~/lukeatron-state-merge/`). The live tree stays on `main`, so `:8789` and its SessionStart restart keep serving unchanged code.
  - Run the full suite and `check_contrast.py`, and record the counts.
  - Checksum `Projects/`.
  - Run `parity_check.py --before` to snapshot every active project's board lane and `_tracking.yaml` state.
  
  [inline + script]
- [ ] **Step 4 — Build `!SuggestState`**: `skill.md` (trigger; output a suggestion + reason per row, **never a write**), `reference/state-rules.md` (the per-action rules, the Decision 3 project rule, the Decision 2 map, the fixture table), and an `_index.yaml` entry. [inline; Skillbank, Low impact]
- [ ] **Step 5 — Write `migrate_state_column.py`.** It reuses `stores._split_row` / `_resolve_columns`, handles **every** Next Actions table in a file, preserves line endings, and leaves unparseable rows untouched while listing them. The report groups rows by `Kind → old State → new State` pattern with counts; individual rows appear only for rare patterns (<3) and "needs your eye". [script]
  - [ ] Test in Sandbox: copy `Projects/` to `System/Sandbox/state-merge/projects-copy/` and run `--root` on it. Pass = only header/State/Kind/Type cells differ; per-table row counts are equal (PP-02's two tables included); the report's own parse count equals the input row count. (The check that the app parses them with 0 skipped rows runs in Step 10, once the Step 6 code exists.)
- [ ] **Step 6 — Back end, dual-read phase** (the live app keeps working on both old and new files):
  - `model.py`:
    - `resolve_lane` reads **Kind first when the column is present** (today's behaviour, so unmigrated live data shows exactly as now), otherwise State, understanding old State labels too. Switching to State-only happens at Step 11.5;
    - the Decision 3 project rule, with `_lane_driver`/`lane_source` removed;
    - new lane names and order;
    - one shared "within N days" helper.
  - `stores.py`: add the old-label normalisation; keep the aliases for now.
  - `writes.py`: `state` added to `_EDIT_COLUMNS` (keep `kind` for now); `set_cells` plus batch undo, the once-per-batch `pending_sweep` stamp and the legacy-kind undo reason.
  - `server.py`: `/api/edit-batch`; `suggestion` on each task in the payload.
  - `suggest.py`.
  - `recur.py`: a reopened row gets a fresh suggested State (Decision 6), with a `test_recur.py` case.
  - Tests: `test_model.py` / `test_stores.py` / `test_writes.py` / `test_server.py` / `test_suggest.py`.
  - **Migrate `tests/fixtures/`** with the Step 5 script (ZZ-10, ZZ-11, ZZ-20, `registry_multi_stream.md` and the rest), keeping one legacy-Kind fixture.
  
  [sub-agent (a)]
- [ ] **Step 7 — Dry run on live data, show Luke the grouped report** (files, tables, patterns, "needs your eye"). Luke approves or amends the map. [script `--dry-run` + human input]
- [ ] **Step 8 — Front end.** Before editing, grep `unshaped|delegate|incoming|kind|lane` across `app/` and list every hit in **Notes → Review**. Known hits: `task-row.js` (the State select, the badge removed), `undo.js` (`COLUMN_NAMES`, batch label), `shared/flourish.js:77`, `shared/flourish.css:26-30`, `board/board.css:12,85,145` (its own `--l-unshaped`), `board/card.css:57`, `board/render.js:21,105` (empty-state copy), `board/keynav.js`, and `tokens.css` in every palette block.
  
  New work: `app/project/bulk.js` + `bulk.css` (Select mode, bulk bar, Accept all), the suggestion chip with dismiss memory, and the "suggested" marker in the selects.
  
  Tests: `test_project.mjs` / `test_undo.mjs` / `test_board.mjs` / `test_keynav.mjs` / `check_contrast.py`. [sub-agent (b)]
- [ ] **Step 9 — Review diffs.** Check every diff against the Success criteria and `StyleGuide.md`'s 7-question visual checklist. Findings and fixes go in **Notes → Review**. [inline]
- [ ] **Step 10 — Pre-cut-over check on a copy.** Full suite: 0 new failures. Run `migrate --root` on a fresh Sandbox copy. Confirm the app's `stores` parses every migrated file with 0 skipped rows. Start a **second instance** of the app from the worktree, on another port, with `LUKEATRON_ROOT` pointed at that copy (`paths.py:19`), (as the undo plan did), and walk through every live check in the Success criteria, with screenshots. Run `parity_check.py --after` on the copy. Also run the worktree code over an **unmigrated** copy and confirm every board lane matches the `parity_check.py --before` snapshot (proves dual-read shows no change). [inline + browser]
- [ ] **Step 11 — Cut-over, in one sitting, with Luke present.** [human sign-off per diff; script]
  1. Pause the scheduled tasks `project-sweep`, `intake-sweep`, `review-monday` and `review-friday`, and record their state. Don't start within an hour before Fri 17:00 or Mon 07:30.
  2. Merge the dual-read branch (Kind-first, `kind` and `state` both editable) into `main` in the live tree and restart `:8789`. Confirm the board is unchanged against the `--before` snapshot. From here the live app can read both formats.
  2a. Back up `Projects/` → `Archive/projects-pre-state-merge-<date>/`.
  3. `migrate --apply`. Re-run the diff and parse checks on live data. Either fails → restore (see Rollback).
  4. Core skill and template edits. Show Luke each diff before saving:
     - `!ProjectSweep`:
       - lines 92, 202 and 215: `Type` → State;
       - STEP 2: stop per-row State writes, and apply the Decision 3 project rule and overrides;
       - STEP 2.5b: stop syncing State, and sync Status only;
       - STEP 3: a new row's State comes from `!SuggestState`;
       - STEP 4 and the digest: add "N suggested State changes";
       - VERIFY lines 310–320: align them with Decision 3.
     - `!CreateProject:70`: "Owner + Kind" → "Owner + State (from `!SuggestState`)".
     - `!Intake:78`: "Owner/Type" → "Owner; State from `!SuggestState`".
     - `Template_ProjectRegistry.md`: new header and legend.
     - The `_links.yaml` header.
  5. On the branch: switch `resolve_lane` to State-only and remove the dual-read leftovers (the `kind`/`type` aliases, `kind` in `_EDIT_COLUMNS`). Tests stay green, including the legacy-fixture test. Merge again into `main`.
  6. Restart `:8789` a second time. Live walk-through on real data. Run `parity_check.py --after`.
  7. Sandboxed sweep dry run on a fresh copy. Pass = no existing row's State written; project states match parity; the digest lists suggestions.
  8. **Un-pause** all four tasks, and confirm with `list_scheduled_tasks`.
- [ ] **Step 12 — Docs + project.** `README.md` (State column, `edit-batch`, `suggestion`), `StyleGuide.md` (bulk bar, chip, flourish row), a `refactor-registry.md` Migration-log row + Next step, delete wishlist #15/#16, tick LU-02 #3/#4 with Decision Log lines, re-grep `System_guide.md` and `CLAUDE.md`. Remove the worktree. [inline]
- [ ] **Step 13 — Luke's sign-off on the feel** (live; tune tokens only). [human input — LU-02]
- [ ] **Verify** — every line in **Success criteria** holds and the result matches the **Objective**. [pass/fail]

## Final step — Logging (always present)
- [ ] Append one line per skill in `skills_used` to `Memory/Long-Term/Logs/skills.log`, format:
  `[AGENT: !<SkillName>] [<SUCCESS|FAIL>] <one-line outcome> | tokens≈[N]`

## Final step — Close out (always present)
- [ ] Update `status: Completed` in this plan's frontmatter.
- [ ] Append one entry to `Memory/Long-Term/Logs/completed-plans.log` (format per that file's header — verbatim from this plan's frontmatter + Objective). Write this BEFORE moving the file.
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
  2. The branch sat in the live tree, and the commit scope was unclear. → Separate worktree; commit only the ProjectKanban files.
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
7. **Order vs urgency-shading plan.** `projectkanban-urgency-shading.md` (LU-02 #2) runs **first**; this plan reuses its "within 3 days" helper and re-checks shading on the renamed lane tokens in Steps 10–11.

### Sign-offs
_(Steps 2, 11, 13.)_

### Baseline
_(Step 3.)_

### Review
_(Steps 8–9.)_

### Verification
_(Steps 10–11.)_
