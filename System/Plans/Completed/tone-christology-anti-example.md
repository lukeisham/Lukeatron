---
plan: "tone-christology-anti-example"
context: Church
secondary_contexts: []
created: 2026-09-08
status: Completed
major_because: "modifies Long-Term memory"
project: ""
skills_used: [!CreatePlan, !ReviewPlan]
---

# Plan — Add a Christology-clarity anti-example to the !Tone reference files

## Objective
Encode, in the Church Tone store, that historical reality and full divinity must be held
together plainly (not hedged) whenever pastoral content speaks of Jesus — using the flagged
sentence from today's Paul Smith draft as the anti-example — so future generation doesn't
repeat the hedge. Specialises the Church charter's North Star ("faithful to the text... in
Luke's pastoral voice") and its Definition of Done ("faithful to... Reformed/Presbyterian
doctrine").

## Success criteria (measurable)
- `Memory/Long-Term/Tone/Church/Themes_Application.md`'s "Incarnation of Jesus" priority theme
  states the clarity rule (historicity + full divinity held together, plainly, not hedged) and
  quotes the flagged sentence as a labelled wrong-style example, with a one-line note on why.
- `Memory/Long-Term/Tone/Voiceprints/pastoral-email.md`'s `anti_markers` carries the flagged
  sentence (or its defining hedge) as a literal do-not-write example.
- No other files touched; no outgoing content produced (nothing to route through
  `!OutgoingContentCheck`).

## Resources
- **Memory to read:** `Memory/Long-Term/Tone/Church/Foundation.md`, `Themes_Application.md`,
  `Memory/Long-Term/Tone/Voiceprints/pastoral-email.md` (all already read during planning)
- **Capability skills:** none
- **Domain skills (Skillbank):** none
- **Sub-agents:** none — single-judgement edit, small enough to do directly
- **Scripts:** none
- **Temp-skills:** none

## Steps
- [x] Step 1 — Add the clarity rule + labelled anti-example to `Themes_Application.md` under
      Priority Theme 1 "Incarnation of Jesus": state that historicity and full divinity must be
      named together, plainly, not hedged as mere "presence"; quote the flagged sentence and say
      why it fails (hedges divinity as presence rather than naming it) [runs: direct edit] — DONE
- [x] Step 2 — Add the flagged sentence to `pastoral-email.md`'s `anti_markers` list as a literal
      do-not-write example [runs: direct edit] — DONE, after recovery: `Voiceprints/` had vanished
      mid-session (logged at `Logs/issues.log`, 2026-09-08, High); recreated `pastoral-email.md`
      verbatim from the in-session read (frontmatter carries a `recreated_note` flagging this for
      Luke to reconcile if the disappearance was deliberate elsewhere). Folded in a SECOND
      correction Luke gave in the same live-coaching turn (not separately re-planned, given it's
      the identical file/mechanism/risk profile already reviewed — see plan note below): the
      self-referential emotive clause "I confess that moved me more than I expected reading it"
      added to `anti_markers` as wrong-tone; "What a day you had of it" added to `diction` + a new
      SOFT tell #9 as Luke's correct idiom.
  - [x] Test in Sandbox — N/A: these are reference-memory prose edits, not a script or skill;
        nothing executable to sandbox
  - [x] !Checkpoint — Long-Term memory changes only, nothing outgoing, nothing archived/deleted →
        no `!OutgoingContentCheck` / `!ArchiveMemory` action needed
- [x] Step 3 — Re-read both edited files to confirm they read cleanly and don't contradict
      Foundation.md's existing "Failure mode to avoid" line [reads: Foundation.md] — consistent:
      Foundation's "kindly and plainly, not gently and vaguely" failure mode is the same principle
      behind both the Christology hedge and the emotive-clause corrections.
- [x] Verify — outputs meet every line in **Success criteria**, and the result matches the
      **Objective**? [pass/fail] — PASS

**Scope note:** the second correction (emotive clause / idiom) was folded into this plan rather
than opened as a new one — same file, same edit mechanism (direct prose addition), same
Success-criteria shape and !Checkpoint outcome already reviewed and approved by `!ReviewPlan` for
this exact plan. Flagged here for Luke's visibility rather than silently re-scoping unreviewed.

## Final step — Logging (always present)
- [ ] Append one line per skill in `skills_used` to `Memory/Long-Term/Logs/skills.log`, format:
  `[AGENT: !<SkillName>] [<SUCCESS|FAIL>] <one-line outcome> | tokens≈[N]`

## Final step — Close out (always present)
- [ ] Update `status: Completed` in this plan's frontmatter.
- [ ] Append one entry to `Memory/Long-Term/Logs/completed-plans.log` (format per that file's
  header — verbatim from this plan's frontmatter + Objective). Write this BEFORE moving the file.
- [ ] Move the file from `System/Plans/New/` to `System/Plans/Completed/`.
