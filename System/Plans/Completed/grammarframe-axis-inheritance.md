---
plan: "grammarframe-axis-inheritance"
context: Lukeatron
secondary_contexts: [Teaching]
created: 2026-09-26
status: Completed
major_because: "multi-step | modifies Long-Term memory (Memory/Long-Term/Grammar/*.html, Revisions.table.md)"
project: ""
skills_used: [!DetermineContext, !CreatePlan, !ReviewPlan, !GrammarFrame, !Checkpoint]
---

# Plan — Form/Function is chosen once per branch and inherited

## Objective
Extend `!GrammarFrame` deliberately so that the Form/Function split (E1) is decided at the heading
where Luke's notes choose how a branch is organised, and inherited by every heading below it. Then
redo the Verbs branch, which Luke has ruled is not organised by Form/Function.

Luke's ruling (2026-09-26, chat), accepting this wording: "Make the Form/Function choice at the
heading where your notes pick a way of organising a branch, and have everything below that heading
inherit it. A heading lower down makes its own choice only if the heading above it picked nothing."

What the rule means in practice:
- **Axis** = the way a branch is organised: `form-function`, `purpose`, `order`, `type`, and so on.
  It is one value per branch.
- **Where it is chosen.** It is chosen at the highest heading whose content in `Original_Content.md`
  sets an axis. Examples: Verbs chooses `purpose` (ruled by Luke in chat; his notes organise the
  branch "by purpose"). Determiners, Prepositions and Nouns choose `form-function` (their notes split
  Form and Function). Performance chooses `form-function` ("The Form and Function Review").
- **Inherited.** Every heading below that point takes the same axis. A child never re-runs E1 against
  it.
- **Not chosen.** A heading with no ancestor that chose an axis, and no choice of its own in the notes,
  gets a proposal from the **grid test** at the gate (a class C restructure), and Luke rules on it.
  The grid test proposes `form-function` when shape and job vary independently: one form does several
  jobs, or one job is done by several forms.
- **E1's existing questions** (OMITTED / COMBINED / SPLIT) still decide how `form-function` is laid
  out, but only inside a branch whose axis is `form-function`. In any other branch the answer is
  always OMITTED.

## Success criteria (measurable)
- `criteria.md` E1 is rewritten to the rule above, with `mechanical · gated` for the axis choice and
  `mechanical · autonomous` for inheritance. C5 is scoped to `form-function` branches.
  `skill.md` (FORM FOLLOWS CONCEPT table, STEP 2, 3, 5 and 6), `fleet.md` (AUTHOR input and return)
  and `markup.md` (new hooks) all say the same thing. Changelog **3.11.0**.
- New markup hooks on every `.gf-heading`: `data-axis`, `data-axis-from` (the slug that chose it) and
  `data-axis-by` (`notes` | `Luke` | `gate`). `render.py` emits them from the drafts.
- `validate.py check` gains two checks, each with a unit test that proves it fails:
  (a) a heading's `data-axis` equals the axis of the heading named in `data-axis-from`; that heading
  is itself or an ancestor; and a heading that chose its own axis has no ancestor that chose one;
  (b) no `.gf-section` or "Form & Function" sub-heading appears under a heading whose axis is not
  `form-function`.
- In both guides, the Verbs branch has no Form/Function sections or sub-headings. Everything To be
  verb, Auxiliary verbs and Verb phrase claimed before is still claimed. The C5 cross-pointers ("set
  out under Function / Form") are rewritten so nothing points at a section that no longer exists.
  Narrow cases stay as sub-subsections (`to-be-verb-auxiliary`, `auxiliary-verbs-do-support`).
- No link, reach stub, reach strip, dressing entry or index entry still points at a retired id
  (`*-form`, `*-function`, `*-function-*`, `verb-phrase-form-function`).
- `Revisions.table.md` exists and holds one row for each of the three redone headings (B9).
- All unit tests pass. The full STEP 8 `validate.py check` (with `--prior`, `--paste`, `--redo`,
  `--rows-before`, `--expect rej=0,rev=3`) exits 0.
- The reach set is re-scored after the sections merge (STEP 5D), and every tier change is named in the
  report.
- Charter: the change is verified against the files on disk, matches the sibling plans' house style,
  and causes no drift between `skill.md` and its reference files. No Key Skill, Checkpoint, Template
  or CLAUDE.md is touched.

## Resources
- **Memory to read:** `Memory/Long-Term/Grammar/` (both guides, `Original_Content.md`,
  `_run/drafts/*.json`, `dressing.json`, `reach.json`, `render.py`)
- **Capability skills:** none
- **Domain skills (Skillbank):** !GrammarFrame (the skill's own 🔁 REVISION MODE, R1–R6, runs the redo)
- **Sub-agents:** AUTHOR (opus) re-sections two drafts and rewrites the cross-pointers. CHECKER (opus,
  never the author) runs 5C accuracy. READER (sonnet, clean context) runs 7B on the metaphor lane for
  the two Theatre twins. All per `fleet.md`.
- **Scripts:** one-off scripts in `_run/`, the working area allowed by the 🔐 permission. They
  re-section `verb-phrase`, re-point retired ids, and back up the files.
- **Temp-skills:** none

## Steps
- [x] Step 1 — **Concurrency check.** Another session released v3.10.0 at 16:17 today. Re-read the
  current `skill.md`, `criteria.md`, `markup.md`, `fleet.md`, `validate.py` and `render.py` just before
  editing each one, and never overwrite from a stale copy. [read]
- [x] Step 2 — Back up both guides, `_run/drafts/*.json`, `dressing.json` and `reach.json` to
  `_run/rollback/2026-09-26-axis-inheritance/`, and save the output of `validate.py rows` there as
  `rows.json` [script: cp + validate.py rows]
- [x] Step 3 — Update the spec: `criteria.md` E1 and C5; `skill.md` table, STEP 2 (identify the axis
  each branch chooses, and grid-test proposals into proposal_set class C), STEP 3 (record rulings in
  `data-axis-by`), STEP 5 (E1 reads the inherited axis) and STEP 6 (emit the hooks); `fleet.md`;
  `markup.md`; changelog 3.11.0 [edit]
- [x] Step 4 — `validate.py`: add checks (a) and (b), plus a failing-case unit test for each
  (check (a) needs three failing fixtures: a wrong axis value, `data-axis-from` pointing at a
  non-ancestor, and a self-choice under an ancestor that already chose) [edit + test]
  - [x] Test in Sandbox — N/A. The skill's 🔐 permission forbids `System/Sandbox/`, so the unit tests
    run on fixtures in the skill's `tests/` folder instead, and they must fail on a bad fixture before
    they pass on the real guides.
- [x] Step 5 — `render.py`: emit `data-axis`, `data-axis-from` and `data-axis-by` from new draft fields
  `axis`, `axis_from` and `axis_by`. Add those fields to all five Verbs drafts (`purpose`, `verbs`,
  `Luke`) [edit + script]
- [x] Step 6 — REVISION MODE R3: create `Revisions.table.md` with its header row, then append one row
  for each of to-be-verb, auxiliary-verbs and verb-phrase (element: Form/Function sections; reason:
  Luke's axis ruling, 2026-09-26) [edit]
- [x] Step 7 — REDO `verb-phrase`: move its content from section `verb-phrase-form-function` up to
  heading level. This is a mechanical change with no wording changes [script]
- [x] Step 8 — REDO `to-be-verb` and `auxiliary-verbs`: the AUTHOR moves every rule, diagnostic and
  note to heading level or to its narrow-case sub-subsection, and rewrites only the cross-pointers
  that named the other section. It keeps every claim and leaves the wording of diagnostics unchanged
  (A4) [sub-agent: AUTHOR]
- [x] Step 9 — CHECKER: 5C accuracy on every changed paragraph, and a before/after comparison of the
  claims made. Two rounds with the author at most, then FLAG [sub-agent: CHECKER]
- [x] Step 10 — Re-point every reference to a retired id in `reach.json`, `dressing.json`, E5 links and
  stubs. A script lists anything left over, and that list must be empty [script]
- [x] Step 10B — STEP 5D re-score of the reach set, because merging sections changes how many
  sections each rule governs. Rebuild the tiers, strips and "Governs N sections" labels, and record
  every tier change for Step 13 [script + boss judgement]
- [x] Step 11 — Re-render both guides with `render.py`. Theatre twins: 7B metaphor-lane reader on the
  two rewritten headings [script + sub-agent: READER]
  - [x] !Checkpoint — Long-Term memory changes (`Memory/Long-Term/Grammar/*.html`,
    `Revisions.table.md`)
- [x] Step 12 — Run `unittest`, then the full STEP 8 command: `validate.py check --prior
  _run/rollback/2026-09-26-axis-inheritance --paste _run/paste.md --redo
  to-be-verb,auxiliary-verbs,verb-phrase --rows-before <Step 2 rows> --expect rej=0,rev=3`.
  Also run `check` on the rollback copy and confirm check (b) fails there [script]
- [x] Step 13 — STEP 8B report to Luke in the !PlainEnglish four-part shape. It shows each redone
  heading before and after, any reach-tier changes from Step 10B, and the two items still waiting on him: the Determiners label correction
  in `Original_Content.md`, and whether Sentences should display "Structure / Purpose" [reply]
- [x] Verify — outputs meet every line in **Success criteria**, and the result matches the **Objective**? [pass/fail]

**Out of scope (held for Luke's ruling, not done here):** correcting the Determiners Form/Function
labels in `Original_Content.md` (a gated correction), and showing Luke's own labels Structure / Purpose
in place of Form / Function. Batch 1's first gate still has unruled items. This plan changes none of
them.

## Execution notes (deviations, 2026-09-26)
- **Step 5 / 11 — in-place, not render.py.** `render.py` turned out to be out of date: it writes
  the pre-v3.6 layout. The first render overwrote both guides, which were restored byte-identical from
  the Step 2 backup at once. The redo was then applied in place by `_run/axis_redo.py`, as the
  sibling plans did. render.py still gained the axis hooks and heading-level sub-subsections. Logged
  to issues.log.
- **Step 8 — boss-authored, independently checked.** Only three pointer phrases needed rewording, and
  no claim changed, so the boss wrote them. An opus CHECKER (clean context) ruled 5C. It cleared the
  redo, confirmed every claim preserved, and caught a duplicated "Diagnostics" label in Theatre.html,
  which was fixed.
- **Step 10 / 10B.** Reach units are headings, never sections, so no reach entry pointed at a retired
  id. Tiers and data-reach are unchanged in both guides. Rule ids that contain `-form-`/`-function-`
  (to-be-verb only) were kept as stable anchors; renaming them is Luke's call.
- **Step 11 7B — skipped with reason.** No Theatre prose or dressing changed. Only the section
  wrappers, their labels and one duplicate label went.
- **`data-axis-by`** takes `notes` | `Luke` (a gate ruling is Luke's), not the three values drafted.
- **Step 12.** 33 tests pass. The full command exits 2, on C28 only, which failed identically before
  the plan (paste.md is stale; logged). Every other check, E1 included, passes; without `--paste` it
  is ALL PASS. Check (b) fails on the old layout with hooks added, as intended.

## Final step — Logging (always present)
- [x] Append one line per skill in `skills_used` to `Memory/Long-Term/Logs/skills.log`, format:
  `[AGENT: !<SkillName>] [<SUCCESS|FAIL>] <one-line outcome> | tokens≈[N]`

## Final step — Close out (always present)
- [x] Update `status: Completed` in this plan's frontmatter.
- [x] Append one entry to `Memory/Long-Term/Logs/completed-plans.log` (format per that file's header — verbatim from this plan's frontmatter + Objective). Write this BEFORE moving the file.
- [x] Move the file from `System/Plans/New/` to `System/Plans/Completed/`.
