---
plan: "projectkanban-urgency-shading"
context: Lukeatron
secondary_contexts: []
created: 2026-09-25
status: New
major_because: "multi-step"
project: "LU-02-projectdashboard"           # existing project; this plan closes its Next Action #2
skills_used: ["!CreatePlan", "!ReviewPlan"]
review: "RETURNED pass 1 (2 flags: [alignment] Step 1 Option A mislabeled 'recommended' and the catch-up section overstated aesthetic.md's rule against an auto-refresh-triggered pulse; [measurability] Docs criterion omitted StyleGuide.md's Layout scope table for a conditional new urgency.css) → revised — catch-up section, Option A and the Docs criterion/Step 11 reworded to name the tension explicitly and route it to Luke's existing Step 1 decision rather than pre-deciding it. Step 1 answered 2026-09-28: animation = B (on attention only), which the review's own tension doesn't apply to. Ready for execution from Step 2; Step 10 (sign-off) remains as its own human-input step."
---

# Plan — Dashboard: shade and animate cards by urgency, on top of their state colour

## Objective
Give every Dashboard card (`System/Apps/ProjectDashboard/`) a second, quieter signal — **how urgent it is** (overdue, or due / waking within a few days) — drawn as a stronger or lighter shade of the card's existing lane (state) colour, plus one small, rule-abiding animation, so Luke can see "act now" at a glance without the lane colour losing its meaning. This specialises the Lukeatron North Star ("extend it deliberately, never by accident"): urgency is computed once on the server (the board's "zero client-side derivation" rule, card.js FR-1), every value is a token in `tokens.css`, and the animation stays inside `!HouseStyle`'s counted budget. Closes LU-02 Next Action #2 ("Add state-vs-urgency colour shading + subtle animation").

## Why this needs a plan (catch-up)
The board already *places* cards by due date — the OVERDUE / THIS WEEK / NEXT WEEK / LATER / NO DATE columns (`model.py` `_classify_due`). What it doesn't do is make urgency visible *on the card itself*, and it ignores a project's **wake** date whenever the project has any dated action (`model.py` `_project_due`: wake only wins when every action is undated). So a Waiting project whose wake is tomorrow shows nothing. Two design rules also constrain the animation:
- `!HouseStyle` `reference/aesthetic.md`'s "never earns one" list: nothing that "moves while the user is reading, unless the user caused it," and "motion on page load that delays reading" — plus a separate cap of at most **2** things animating at once per view.
- `StyleGuide.md` *Flourishes*: CSS-only, one animation per interaction, no layout shift, and **meaning never carried by colour or motion alone** — a word must say it too.

A permanently pulsing overdue card would break all of these, so the animation's trigger was a real decision (Step 1). One candidate (an escalation pulse on urgency going up) would have played on the board's unattended auto-refresh reload — motion Luke didn't cause, which `aesthetic.md`'s "never earns one" list rules out. Luke resolved this by choosing **B — on attention only** (Step 1): the shade only deepens on hover/keyboard-focus, so nothing ever moves unprompted and the tension doesn't arise.

## Success criteria (measurable)
- **Server computes urgency.** `ProjectView` gains an `urgency` object (e.g. `{"level": "overdue"|"soon"|"none", "source": "due"|"wake"|null, "days": int|null}`) in `GET /api/board.json`; `card.js` reads it and derives nothing. Rules as signed off in Step 1 (proposed default below). New `test_model.py` cases cover: overdue due date, ASAP, due within the window, due outside it, wake in the past, wake within the window, named-trigger (non-date) wake → `none`, and a project with both (the more urgent wins).
- **Shading on top of lane colour.** Cards carry `data-urgency`; `card.css` shades the card background with `color-mix()` of the card's own `--lane-color` at two new token strengths (overdue stronger than soon). The lane rail/colour is unchanged; in `data-lane-hues="mono"` mode the shading still shows (it mixes with `--ink-muted`).
- **Not colour alone.** The due line carries a word for every non-`none` level (e.g. "Overdue", "Due in 2 d", "Wakes tomorrow") and the card's `aria-label` includes it; readable with animation off, in print, and in mono mode.
- **Animation within budget.** The chosen animation (Step 1: **B — on attention only**) uses only existing motion tokens (one of the three durations — no new duration), is zeroed by the existing `prefers-reduced-motion` block, and only ever moves the one card currently hovered or keyboard-focused — never more than one card at once, never on page load, never unprompted — and causes no layout shift (card bounding boxes measured identical before/after, on hover/focus and off).
- **Tokens only.** New values (two shade strengths, any animation keyframe values) live in `tokens.css` for default, dark (both twin blocks), paper and print; no literal colour/duration/percentage in `card.css`. `card.css` stays ≤ ~150 lines (CSS-1) — if it would exceed, the urgency rules go in a new `app/board/urgency.css` linked from `index.html`.
- **Contrast.** `python3 check_contrast.py` extended with card text (`--ink`, `--ink-muted`) on the strongest urgency shade of each of the five lanes in every palette — all ≥ 4.5:1.
- **Print.** Printing the board shows the urgency word; shading prints only if it passes contrast in the print palette, otherwise it is dropped in print; no animation.
- **Tests.** Full suite (`node --test tests/*.mjs`, `python3 -m unittest discover` from the app folder) shows 0 new failures against the baseline recorded in **Notes → Baseline** (Step 2), plus the new cases above and new `test_board.mjs` cases for `data-urgency`, the word, and the ≤2 animation cap.
- **Live data untouched.** The feature is read-only; a checksum of `Memory/Medium-Term/Projects/` is identical before and after verification (Step 9), apart from the Step 11 LU-02 tick.
- **Luke's sign-off.** Luke has seen it live in default, dark and paper and approved the feel; final token values recorded in **Notes → Sign-off**.
- **Docs.** `StyleGuide.md` Flourishes table gains an Urgency row + its tokens, and a line declaring the local budget use; if a new `app/board/urgency.css` is created (Tokens-only criterion above), `StyleGuide.md`'s *Layout scope, by file* table gains its row too, so that table can't silently drift; `README.md` documents the `urgency` field; `app-decisions.md` gets an Approvals row only if Luke's sign-off reverses an earlier decision.

## Resources
- **Memory to read:** `Memory/Long-Term/Coding/vibe-coding-rules.md` (CSS-1/CSS-2, JS-1/JS-2, TEST rules); `StyleGuide.md`; `.claude/skills/!HouseStyle/SKILL.md` + `reference/aesthetic.md` (flourish budget); `Memory/Medium-Term/Projects/_tracking.yaml` header (the `wake` field and `!ProjectSweep`'s "due within 3 days" Incoming rule); `LU-02-projectdashboard/notes.md` (the original "state vs urgency shading" note).
- **Capability skills:** none.
- **Domain skills (Skillbank):** none — Project Dashboard has no `_test/` copy (Luke declined one 2026-09-12; `_template/` was flattened into the app folder 2026-09-28), so changes land directly in the live app, as in every recent Project Dashboard plan.
- **Sub-agents:** one implementation sub-agent for Step 3 (model/server) and one for Steps 4–6 (front end), each briefed with this plan's Success criteria and Step 1's decisions; the coordinator reads every diff and does Steps 8–9 itself.
- **Scripts:** none new — `check_contrast.py` and the test suites are the deterministic checks.
- **Temp-skills:** none.

## Steps
- [x] **Step 1 — Luke decides the three open questions** (answers recorded in **Notes → Decisions**, 2026-09-28). [human input — LU-02]
  1. **Urgency rules** — proposed default accepted.
  2. **Animation trigger** — **B, on attention only** (shade deepens on hover/keyboard-focus; never moves unprompted).
  3. **Shade strength** — proposed default accepted (overdue 22% / soon 11%, tuned live in Step 10).
- [ ] **Step 2 — Baseline.** Run the full test suite and `check_contrast.py`; write pass/fail counts into **Notes → Baseline**. Checksum `Memory/Medium-Term/Projects/` into the same note. [inline, deterministic]
- [ ] **Step 3 — Model + server.** In `model.py`, add an `urgency` roll-up in `build_project` (reuse `parse_due_text` for the wake; do not change `_project_due`, `lane` or column placement). Serialise it in `server.py`'s board payload and update the module docstring's documented JSON shape. Add the `test_model.py` / `test_server.py` cases from Success criteria. [sub-agent: implementation]
- [ ] **Step 4 — Tokens.** Add `--urgency-overdue-strength`, `--urgency-soon-strength` (and any animation token Step 1 needs) to `tokens.css` in every palette block; extend `check_contrast.py` with the new card-on-shade pairs and run it. [sub-agent: implementation]
- [ ] **Step 5 — Card markup.** `card.js`: set `data-urgency` (+ `data-urgency-source`) from `project.urgency`, add the urgency word to the due line and the `aria-label`. `test_board.mjs` cases for each level and for a missing `urgency` field (treated as `none`, with a JS-2 console warning). [sub-agent: implementation]
- [ ] **Step 6 — Shading + animation CSS.** Shading rules keyed on `[data-urgency]` using `color-mix(in srgb, var(--lane-color) var(--urgency-…-strength), var(--panel-bg))`; condensed density keeps the shade and word; print rule per Success criteria. Then the Step 1 animation (B): a `[data-urgency]:hover, [data-urgency]:focus-within` rule that transitions the shade to a deeper strength over one of the existing motion durations — CSS-only, no new JS file, no `localStorage`. Zeroed under `prefers-reduced-motion` like the rest of the board's transitions. Test (`test_board.mjs` or a CSS-behaviour check) that only the hovered/focused card's shade changes, not its siblings. [sub-agent: implementation]
- [ ] **Step 7 — Review diffs.** Coordinator reads every diff against the Success criteria and `StyleGuide.md`'s "Before shipping a visual change" checklist (7 questions); each finding and its fix is written into **Notes → Review**, and the step is done only when every finding is resolved or explicitly deferred by Luke. [inline]
- [ ] **Step 8 — Tests.** Full suite + `check_contrast.py`; 0 new failures vs baseline. [inline, deterministic]
- [ ] **Step 9 — Live verification.** `preview_start` the Dashboard; confirm in default, dark, paper, mono lane hues, condensed density, reduced motion and print preview: shade visible and lane colour still readable, word present, ≤2 cards animating, no layout shift (bounding boxes compared via `javascript_tool`), no console errors. Re-checksum `Projects/` — identical. Screenshot each palette for Luke. [inline, browser tools]
- [ ] **Step 10 — Luke's sign-off on the feel.** Show the screenshots/live board; tune token values only; record final values + approval in **Notes → Sign-off**. [human input — LU-02]
- [ ] **Step 11 — Docs + project.** Update `StyleGuide.md` (Flourishes table row, new tokens, budget line; and its *Layout scope, by file* table if Step 6 created `urgency.css`), `README.md` (`urgency` field), an `app-decisions.md` Approvals row only if Luke's sign-off reverses an earlier decision; tick LU-02 Next Action #2 as done in its `registry.md` and log it in the Decision log. [inline]
- [ ] **Verify** — every line in **Success criteria** holds and the result matches the **Objective**. [pass/fail]

## Final step — Logging (always present)
- [ ] Append one line per skill in `skills_used` to `Memory/Long-Term/Logs/skills.log`, format:
  `[AGENT: !<SkillName>] [<SUCCESS|FAIL>] <one-line outcome> | tokens≈[N]`

## Final step — Close out (always present)
- [ ] Update `status: Completed` in this plan's frontmatter.
- [ ] Log completion: `python3 System/Tools/skilllog/skilllog.py complete 'plan:projectkanban-urgency-shading' "<title> (<project>)"` → `Memory/Long-Term/Logs/history.log`. Write this BEFORE moving the file.
- [ ] Move the file from `System/Plans/New/` to `System/Plans/Completed/`.

## Notes
### Decisions
**Step 1 — Luke's answers (2026-09-28):**
1. **Urgency rules** — accepted the proposed default: `overdue` = project due column is OVERDUE (incl. ASAP) or a dated wake is in the past; `soon` = a due date or dated wake within 3 days; a named-trigger wake never counts. Wake is read for every project, not just all-undated ones.
2. **Animation trigger — B (on attention only).** The shade deepens with a short transition only when an urgent card is hovered or keyboard-focused; nothing moves unprompted. Chosen specifically because it's the one option with no open `!HouseStyle` rule question attached (A's auto-refresh tension and C's declared-exception requirement don't apply).
3. **Shade strength** — accepted the proposed default: overdue 22% / soon 11% of the lane colour, to be tuned in Step 10 once seen live.

### Review
_(Step 7.)_

### Baseline
_(Step 2.)_

### Sign-off
_(Step 10.)_
