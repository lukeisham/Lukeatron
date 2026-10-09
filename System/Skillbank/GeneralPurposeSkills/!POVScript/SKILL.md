---
name: "!POVScript"
description: >
  Generate a second-person, present-tense POV "ladder" script for audio/video narration — a named
  sequence of 8-10 career/status LEVELS (e.g. an office hierarchy, a courtroom, a Lodge) told
  entirely through physical action and object, never through direct narration or meta-voice. Runs
  as a resumable SEVEN-PHASE pipeline across MULTIPLE separate invocations — Setup, Notes, Outline
  (the matrix), Scenes (one file per level, generated progressively), Internal Verification,
  Revision (via !Comprehension + !ConceptFidelity), Stitch (the final read-aloud markdown). Every
  script gets its own folder in Memory/Medium-Term/POVScripts/<slug>/, carrying an AGENT-ONLY
  tracking registry (so an interrupted session resumes exactly where it left off, never from
  scratch) and an AGENT-ONLY instructions file (the base spec copied in at Setup, plus any
  per-script variations Luke gives, each dated). notes.md, outline.md and the scene files are the
  human-readable surface; the registry and the instructions file are not meant for Luke to open.
  EVERY phase past Setup is a GATE — it stops and waits for Luke's explicit approval before the
  registry advances to the next phase. Only three phases loop on their own output before reaching
  that gate — Notes (a self-review for gaps), Outline (the structural self-check), and Revision
  (a bounded re-check after each repair) — Scenes and Verification never redraft on their own;
  they only ever route a defective scene back to Phase 4 by hand. Every drafted scene must carry
  THREE ingredients at once: THEME (the level's planted object/habit, direct or indirect, never
  the theme's name), PLOT (that level's own outline row — Trajectory/Opposing Force/Cost
  Mechanic — visibly enacted, not just described), and COLOUR (a proportionate minor tangent,
  beat of incidental tension, or notes.md detail beyond the level's local noun) — Plot is
  non-negotiable, Theme is load-bearing, Colour is deliberately not (never tested for recall).
type: Skill
status: Active
domain: GeneralPurpose (creative content generation — placed here rather than Personal Research
  because it is not tied to one context; if it ever becomes context-specific, move the folder and
  update its _index.yaml entry)
intent: "Turn a subject and a set of character/setting notes into a tightly-constrained, second-
  person present-tense audio script — through a deterministic matrix outline, one scene file per
  level, and two independent internal checks — stopping for Luke's explicit sign-off after every
  phase, without ever losing work to an interrupted session and without drifting from the rules
  Luke set for that particular script."
version: 1.2.1
changelog: >
  1.2.1 (2026-09-23, Luke's explicit instruction) — named the sourcing split explicitly as its
  own SOURCING RULE at the top of Phase 4, rather than leaving it implicit across the three
  ingredients' individual descriptions: outline.md is authoritative for Plot and Theme's
  assignment; notes.md is authoritative for Colour and the mandatory local noun, and remains the
  standing fact-check ground throughout. No behaviour change — a clarity pass only.
  1.2.0 (2026-09-23, Luke's explicit instruction) — Phase 4 drafting now targets THREE
  ingredients per scene, not just the base spec's format rules: THEME (the planted object/habit,
  direct or indirect, never the theme's name), PLOT (that level's own Trajectory/Opposing
  Force/Cost Mechanic visibly enacted, not just atmosphere), and COLOUR (a proportionate minor
  tangent, incidental tension, or notes.md detail beyond the level's local noun) — Plot
  non-negotiable, Theme load-bearing, Colour deliberately not (trimmed first if the three don't
  fit the word count; never tested for recall by Phase 6's !Comprehension). Phase 5's
  verification checklist and finding types (PLOT-NOT-ENACTED, COLOUR-IMBALANCE) extended to
  match.
  1.1.0 (2026-09-23, Luke's explicit instruction) — every phase past Setup now GATES: it stops
  and reports its completed work, and never advances current_phase until Luke gives explicit
  approval (previously only Notes hard-gated; Outline reported but auto-advanced; Scenes/
  Verification/Revision/Stitch ran straight through). Also scoped in-phase self-improvement
  loops to exactly three phases — Notes (added a self-review-for-gaps step before the gate),
  Outline (kept its existing structural self-check), Revision (added a bounded re-check after
  each repair, capped at 2 retries per scene per skill) — Scenes and Verification deliberately
  do NOT redraft on their own; a defect found there is only ever fixed by routing the one scene
  back through Phase 4.
dependencies:
  - "System/Skillbank/GeneralPurposeSkills/!Comprehension/SKILL.md (Phase 6 — read and executed inline, not via the Skill tool)"
  - "System/Skillbank/GeneralPurposeSkills/!ConceptFidelity/SKILL.md (Phase 6 — read and executed inline, not via the Skill tool)"
  - "!HeadlessChromeBrowser (Phase 2, only if Luke asks for research on top of his own notes)"
calibration:
  context: Any
  level: Extended
  scope: Global
impact: Low
memory_footprint:
  read:
    - "Memory/Medium-Term/POVScripts/<slug>/ (own store — read on resume)"
  write:
    - "Memory/Medium-Term/POVScripts/<slug>/ (own store — created at Phase 1, written every phase)"
---

## ⚡ TRIGGER

Primary: `!POVScript`
Secondary: "write a POV script about", "start a new POV script for", "build the ladder outline
for", "give me the notes for the <X> script", "generate the next scene", "write level <n>",
"continue the POV script for <X>", "verify the <X> script against the outline", "revise the <X>
script", "stitch the <X> script together", "run the next phase on <X>".

Does **not** fire for: a one-off creative-writing request with no ladder/level structure (plain
`!GenerateSupportiveContent` or freehand drafting instead), or a script that is not second-person
present-tense narration (a different format is simply a different task).

## 🧭 CORE PRINCIPLE

**One script = one folder = one resumable job.** This skill is expected to be invoked many times
over many separate sessions for the same script — once to set up, once (or several times) to
gather notes, once to build the outline, once per scene (or a small batch of scenes) to draft,
once to verify, once to revise, once to stitch. Nothing may depend on the whole pipeline running
in a single sitting. **State is written to disk after every phase AND after every individual
scene** — never only at the end of a phase — so a session that ends mid-scene loses at most that
one unfinished scene, never the ones already written.

**Humans read three things: the outline, the notes, and the scenes** (plus the final stitched
script once Phase 7 runs). The registry and the instructions file exist purely so a future
invocation — possibly a different session with no memory of this one — can pick the job back up
correctly. Never surface their raw contents to Luke as the deliverable; summarise instead.

**Do not write prose before the matrix is validated.** Phase 4 (scenes) never starts until Phase 3
(outline) is marked complete and has passed its own self-check.

**Every phase past Setup is a gate.** Once a phase's work is complete, its registry status becomes
`awaiting_approval` and the invocation STOPS — it reports what it finished and asks Luke to approve
before `current_phase` advances. `current_phase` is never advanced on the strength of a self-check
alone; a self-check decides whether the work is *ready to show Luke*, not whether it is *approved*.
Phase 1 (Setup) is the only exception — it has nothing yet for Luke to approve, so it proceeds
straight into Phase 2.

**In-phase self-improvement is scoped to exactly three phases** — Notes, Outline, and Revision.
Each of those may loop on its own output, bounded, before presenting it at the gate. Scenes and
Verification never redraft anything themselves: a defect found in either is fixed by hand-routing
the ONE affected scene back through Phase 4, then re-running the phase that found the defect once
the rewrite lands. That is a cycle ACROSS phases, not a loop within one, and it stays that way even
after this change — only Notes/Outline/Revision get an internal loop.

## 🛠️ LOGIC

```
// EXECUTION_START

STEP 0 — LOCATE OR CREATE THE JOB                         (every invocation starts here)
  DERIVE slug from the subject Luke names (kebab-case, e.g. "the-glass-ceiling",
    "circuit-court"). If Luke names an existing script instead of a new subject, use that
    script's existing slug.
  LOOK for Memory/Medium-Term/POVScripts/<slug>/_registry.yaml
  IF found:
    READ _registry.yaml → current_phase, phase statuses, scenes_done
    READ _instructions.md → the locked base spec + this script's variations
    REPORT the resume point to Luke in one line before doing anything else
    JUMP to that PHASE below
  IF not found AND Luke is asking to start something new:
    GO to PHASE 1
  IF not found AND Luke is asking to continue/verify/revise/stitch something that does not exist:
    STOP. Report no such script folder exists. Never silently start a new one under a guessed slug.

PHASE 1 — SETUP                                            (folder + registry + instructions)
  CREATE Memory/Medium-Term/POVScripts/<slug>/
    ├── _registry.yaml        (agent-only — STEP 1a)
    ├── _instructions.md      (agent-only — STEP 1b)
    ├── notes.md               (human + agent — starts as a bare heading)
    ├── outline.md              (human — starts empty)
    └── scenes/                  (empty — one file per level, filled in Phase 4)
  STEP 1a — WRITE _registry.yaml:
    slug, title, created (date), status: in-progress
    current_phase: 2
    // each phase's status is one of: pending | in-progress | awaiting_approval | done.
    // current_phase ONLY ever advances out of awaiting_approval, and ONLY on Luke's explicit OK
    // (see "Every phase past Setup is a gate" above) — never out of in-progress by itself.
    phases:
      1_setup: {status: done, date: <today>}
      2_notes: {status: pending}
      3_outline: {status: pending}
      4_scenes: {status: pending, scenes_done: [], scenes_total: null}
      5_verification: {status: pending, findings: []}
      6_revision: {status: pending, verdicts: [], recheck_count: {}}
      7_stitch: {status: pending}
    session_log: [{date: <today>, phase: 1, action: "folder created"}]
  STEP 1b — WRITE _instructions.md:
    Copy the BASE SPEC verbatim from the "📐 BASE SPEC" section below — this locks the rules for
    THIS script even if the SKILL.md is later revised, so a long-running project never drifts
    mid-pipeline. Under it, open a dated "## Variations for this script" section (empty at
    Setup) — see STEP V below for how it fills.
    IF Luke gave a subject/brief/starting notes in the same message that triggered Setup,
      DO NOT discard them — hand them straight to PHASE 2 rather than asking Luke to repeat
      himself.
  NO GATE here — there is nothing yet for Luke to approve. MARK 1_setup done, ADVANCE
    current_phase to 2, WRITE registry
  REPORT: folder created, ask for (or confirm receipt of) the source material Phase 2 needs —
    character notes, setting detail, any quotes, sample prose in the voice Luke wants.

PHASE 2 — NOTES                                             (the human+agent substrate)
  APPEND-ONLY into notes.md. Never delete an existing note without Luke asking. This is the raw
    material every later phase pulls from — quotes, historical/period detail, incidental facts,
    sample prose fragments, character traits, real objects and habits associated with the
    subject. Organise loosely (free-form headings are fine); this file is not the outline and
    is not asked to be structured like one.
  SOURCES: (a) whatever Luke supplies directly — always first and always kept verbatim where it
    is a direct quote; (b) light research via !HeadlessChromeBrowser ONLY if Luke asks for it —
    never go looking for material on your own initiative for a fictional/creative piece.
  STEP 2a — SELF-REVIEW (the in-phase loop — runs before EVERY gate check below, not just once):
    READ notes.md back against what Phase 3 will need: candidate material for ≤3 themes, at
      least one object/habit per theme, a possible Belief Handle if Conviction looks likely to
      be used, and roughly one local noun per anticipated level.
    NAME any specific gap out loud in the same message that asks the gate question below — never
      silently decide notes.md is thin and stay quiet about it, and never fill a named gap by
      inventing material yourself; only Luke or STEP 2's sources fill it.
    This loop has no fixed cap — it simply re-runs every time notes.md changes, for as long as
      Phase 2 stays open.
  GATE — SET phases.2_notes.status = awaiting_approval, WRITE registry, REPORT notes.md's current
    state plus any named gap from STEP 2a, and ASK Luke whether the notes are enough to move on.
  IF Luke says the notes are enough / says to move on:
    MARK 2_notes done, ADVANCE current_phase to 3, LOG the session, WRITE registry
  ELSE (Luke adds more, or says nothing yet):
    KEEP 2_notes at status: in-progress (or awaiting_approval, if actively waiting on a reply),
    WRITE registry anyway (partial notes persist even if the phase is not closed) and STOP — do
    not guess that notes are sufficient, and do not advance current_phase on a self-review alone.

PHASE 3 — OUTLINE                                           (the matrix — see 📐 BASE SPEC below)
  ONLY starts once 2_notes is done. Derive the outline ENTIRELY from notes.md + the base spec's
    Structural Manifest Requirements (Ladder Subversions, Themes & Handles, Belief Handle, Crisis
    Allocation) — never invent a level with no grounding in the notes unless Luke explicitly asks
    for pure invention.
  BUILD 8-10 named levels, each carrying: Name · Room · Object · Job · Trajectory (up/down/even,
    never a lecture) · Opposing Force category · Cost Mechanic · Subversion tag (if any).
  SELF-CHECK before marking the phase done (all four must hold):
    - no two CONSECUTIVE levels share an Opposing Force category
    - EXACTLY 2 levels carry a Ladder Subversion tag
    - 2-3 levels (no more, no fewer) are marked full CRISIS; the rest turn quietly
    - AT MOST 3 themes named, each mapped to a physical object/habit planted by Level 3 and
      a Belief Handle assigned by Level 2 if Conviction is used as any Opposing Force
    IF any check fails → FIX the outline before proceeding, RE-RUN the four checks, and repeat
    until every one holds — this is the in-phase loop for Outline. NEVER present or gate on a
    matrix with a known violation.
  WRITE outline.md as a human-readable table (the eight/ten levels) plus a short prose note
    naming the themes, their handles, the belief handle (if used), and which 2-3 levels carry
    the crisis.
  GATE — SET phases.3_outline.status = awaiting_approval, WRITE registry, REPORT the outline to
    Luke and ASK for his approval before scene drafting begins. This gate is pipeline policy, not
    spec content — a variation logged under STEP V may change what the matrix requires, but never
    removes this gate.
  IF Luke approves:
    MARK 3_outline done, ADVANCE current_phase to 4, SET phases.4_scenes.scenes_total = level
    count, LOG the session, WRITE registry
  ELSE (Luke asks for changes):
    REVISE the outline per his direction, RE-RUN the four self-checks, RETURN to the GATE step —
    current_phase does not advance until an approval is given.

PHASE 4 — SCENES                                            (progressive — one file per level)
  ONLY starts once 3_outline is done. SOURCING RULE, named explicitly so it is never re-derived
    per scene: outline.md is authoritative for PLOT (Trajectory/Opposing Force/Cost Mechanic) and
    for THEME's assignment (which theme, which planted object/habit, per level — its "lesson").
    notes.md is authoritative for COLOUR (the incidental tangents/details STEP 4a(3) draws on)
    and for the base spec's mandatory local noun — and remains, throughout, the standing
    fact-check ground no scene may ever contradict, in ANY of the three ingredients. THEME's
    object itself originates in notes.md (Phase 3 derives it from there), but once Phase 3 locks
    it into outline.md, Phase 4 reads it FROM outline.md rather than re-mining notes.md for it —
    notes.md stays open to enrich that object's sensory detail, never to redefine which object it
    is.
  For EACH level not yet in scenes_done (in outline order, or a level Luke names directly):
    STEP 4a — DRAFT, THREE INGREDIENTS AT ONCE (alongside the base spec's Phase 2 rules — anatomy,
      cadence, opening beat, sentence rhythm, visual marker density, second person present tense,
      zero meta-voice, ~350-400 words). Every scene must do all three; none at the expense of
      another:
      (1) THEME — the level's mapped theme(s) from outline.md show up through the planted
          object/habit, DIRECTLY (the object is handled, looked at, carried, used) or INDIRECTLY
          (an echo of it — a smell, a sound, a habit half-performed) — never the theme's abstract
          NAME (unchanged from the base spec's "never name the theme directly").
      (2) PLOT — the level's own Trajectory, Opposing Force, and Cost Mechanic from outline.md
          are visibly ENACTED, not merely described — the ladder actually moves, holds, or
          refuses (per any Subversion tag) by the scene's last beat. A scene that reads well but
          never lands its outline row's own business is a defect, not a style choice.
      (3) COLOUR — at least one MINOR beat outline.md does not require: a small tangent, a
          flicker of tension in a minor interaction (a colleague, a bystander, small talk that
          goes slightly wrong), or an incidental detail from notes.md beyond the level's
          designated local noun. Colour stays PROPORTIONATE — a beat or two inside the existing
          Internal Arc (Place → job → pressure → cost or lock → the next door), never a second
          arc, and never so much that Theme or Plot get crowded out of the ~350-400 words. An
          invented colour object or bit of business is fine (this is fiction); inventing a FACT
          and attributing it to notes.md is not — same distinction the Error Path already draws.
      // priority when word count is tight: PLOT is non-negotiable (Phase 5 checks a scene
      // against outline.md for it), THEME is load-bearing texture (Phase 6's !ConceptFidelity
      // checks it against outline.md's theme map), COLOUR is deliberately NOT load-bearing — see
      // the note in PHASE 6 about never testing it for recall. Trim colour first if the three
      // don't fit; never trim theme or plot to make room for a tangent.
    ONE local noun per level from notes.md (the base spec's Prose Notes rule) still applies —
      colour details in (3) are additional to it, never a replacement for it.
    SAVE to scenes/<NN>-<level-slug>.md (NN = two-digit position, e.g. 03-the-caucus.md)
    APPEND the level to phases.4_scenes.scenes_done, LOG the session, WRITE registry
      // this write happens PER SCENE, not once at the end of the phase — the whole point of
      // the registry is that a session ending after scene 4 of 9 never loses scenes 1-4.
  A single invocation MAY draft several scenes in one pass if there is room, but registry state
    is saved after each one regardless.
  IF Luke asks for a specific level out of order, draft that one and update scenes_done
    accordingly — the phase is not required to proceed strictly in level order, only to end with
    every level covered.
  NO in-phase loop here: a drafted scene is saved once and left for Phase 5/6 to catch, never
    redrafted against its own self-critique inside this phase.
  WHEN scenes_done covers every level in outline.md:
    GATE — SET phases.4_scenes.status = awaiting_approval, WRITE registry, REPORT the full set of
    scene files (with a one-line description of each) and ASK Luke to approve before Verification
    runs.
  IF Luke approves:
    MARK 4_scenes done, ADVANCE current_phase to 5, WRITE registry
  ELSE (Luke wants a specific scene redone):
    REDRAFT that scene per his direction, WRITE registry, RETURN to the GATE step.

PHASE 5 — INTERNAL VERIFICATION                              (against the outline and notes)
  ONLY starts once 4_scenes is done. Re-read the FULL scene set against outline.md and notes.md
    and check, per the base spec's Final Verification Pass:
    - every chosen theme appears through an object/habit and is NEVER named directly
    - every incidental detail from notes.md that a scene claims to use has actually become a
      physical object/habit in that scene, not a stated fact
    - no scene CONTRADICTS a fact Luke put in notes.md or a row of outline.md
    - each scene: second-person present tense throughout, zero meta-voice, ~350-400 words,
      visual-tag density roughly one per 25-30 words
    - the 2 Ladder Subversions and the crisis allocation (2-3 levels) actually land where the
      outline said they would; opposing-force categories still don't repeat consecutively across
      the finished scenes; at least one Neutral-Promotion side-thread is still open at the end
    - STEP 4a's three ingredients, per scene: PLOT actually enacted (not just atmosphere — the
      level's own Trajectory/Opposing Force/Cost Mechanic visibly landed); at least one
      proportionate COLOUR beat present; COLOUR has not swollen into a second arc or crowded
      THEME or PLOT out of the word count
  RECORD each finding — typed (THEME-NAMED-DIRECTLY / UNCONVERTED-DETAIL / CONTRADICTION /
    FORM-DEFECT / STRUCTURE-DEFECT / PLOT-NOT-ENACTED / COLOUR-IMBALANCE) and located (scene file
    + line/paragraph) — into phases.5_verification.findings in the registry. This is an
    agent-facing log, not a file for Luke to read.
  FIX trivial findings (a stray direct name-drop of a theme, a missing visual tag) in place,
    directly in the scene file, immediately.
  FOR any non-trivial finding (a contradiction, a missing subversion, a wrong crisis count): route
    that ONE scene back through PHASE 4 for a targeted rewrite — never patch structural problems
    at the sentence level, and never re-run this pass automatically after the routing; a fresh
    invocation of Phase 5 does that once the rewrite lands.
  NO in-phase loop here either: this phase runs ONE pass, fixes what's trivial, routes what isn't,
    and stops — it never re-checks itself before the gate.
  GATE — SET phases.5_verification.status = awaiting_approval, WRITE registry, REPORT the pass's
    findings (fixed-in-place and routed-to-Phase-4, separately), and ASK Luke to approve before
    Revision runs.
  IF Luke approves (and no scene is still routed back to Phase 4):
    MARK 5_verification done, ADVANCE current_phase to 6, WRITE registry
  ELSE (a routed scene is still pending its Phase-4 rewrite, or Luke wants another look once it's
    back):
    STAY at awaiting_approval / in-progress as appropriate, WRITE registry, and re-run this phase
    once the rewrite is in — current_phase never advances with an open Phase-4 route-back.

PHASE 6 — REVISION                                          (via !Comprehension + !ConceptFidelity)
  ONLY starts once 5_verification is done. These are Skillbank skills — READ their SKILL.md files
    and EXECUTE them INLINE per the Skillbank lookup protocol (they are not registered in
    .claude/skills/, so they are never called through the Skill tool).
  RUN !ConceptFidelity per scene (or per small batch): GROUND = notes.md + the matching row of
    outline.md; CANDIDATE = the scene text. This catches an invented fact (Direction B — the
    scene asserts something notes.md never gave it) and a dropped or weakened theme/handle
    (Direction A — the outline's planted object/habit for that level went missing or blunted).
    It needs a clean-context reader for its discriminative/application tests (STEP 4/5 of that
    skill) — use the Agent tool for one; if none is available, run the entailment steps only and
    say so in the verdict, per that skill's own fail-closed rule.
  RUN !Comprehension over the assembled scene set (or the Phase-7 draft once one exists): SPEC =
    what a cold listener is meant to end up holding about the arc — the Trajectory of each level
    plus whether the Belief Handle (if any) still fits in the mouth by the end — derived from
    outline.md, never from the scenes themselves. It needs the same clean-context reader; same
    fail-closed rule if none is available.
    // STEP 4a's COLOUR beats are NEVER part of this spec's propositions — they are deliberately
    // non-essential texture, not something a cold listener is required to recover. A reader who
    // doesn't mention a tangent is not a MISSING finding; only PLOT and THEME propositions are
    // tested for recall.
  APPLY REPAIR-level findings from either skill directly to the affected scene file.
  STEP 6a — BOUNDED RE-CHECK (the in-phase loop — hard cap, not advisory):
    AFTER applying a REPAIR fix to a scene, RE-RUN the SAME skill (same ground/spec) against the
      REVISED scene, to confirm the repair actually resolved the finding rather than assuming it
      did.
    CAP at 2 re-checks per scene PER SKILL. INCREMENT phases.6_revision.recheck_count[scene] on
      every re-run.
    IF a re-check comes back PASS → the scene is settled for that skill.
    IF the cap is exhausted and the scene STILL doesn't PASS → STOP looping. Treat it as this
      skill's REJECT: route the scene back to PHASE 4, same as below, and note in the verdict log
      that it exhausted its re-checks rather than being routed on the first read.
    Never raise the cap mid-run by trying "just one more" — hitting it ends that scene's Phase 6
      work for this pass.
  A REJECT verdict on any scene (first read, or after the re-check cap) → route that scene back to
    PHASE 4, same as a Phase 5 structural finding — never sentence-level-patched.
  RECORD each skill's VERDICT (never a score — neither skill emits one) against the scene(s) it
    covered, in phases.6_revision.verdicts. Agent-facing log, not a file for Luke.
  WHEN every scene carries a PASS (or an accepted REPAIR, confirmed by its re-check) from both
    skills, or has been routed to Phase 4:
    GATE — SET phases.6_revision.status = awaiting_approval, WRITE registry, REPORT the verdict
    summary (PASS / REPAIR-then-confirmed / routed-to-Phase-4, per scene) and ASK Luke to approve
    before Stitch runs.
  IF Luke approves (and no scene is still routed back to Phase 4):
    MARK 6_revision done, ADVANCE current_phase to 7, WRITE registry
  ELSE:
    STAY at awaiting_approval / in-progress as appropriate, WRITE registry, and re-run this phase
    once any pending Phase-4 rewrite is in — current_phase never advances with an open route-back.

PHASE 7 — STITCH                                             (the final read-aloud script)
  ONLY starts once 6_revision is done. CONCATENATE scenes/ in outline order into
    Memory/Medium-Term/POVScripts/<slug>/<slug>-full-script.md:
    - a short title block (working title, total word count, level count)
    - each level's scene text in full, in order, separated by a clear divider carrying the
      level's Name (a production heading, not a narrated line)
    - visual markers ([WIDE] / [OBJECT] / [REAR FIGURE] / [WINDOW] / [TITLE]) are PRESERVED
      inline exactly as drafted — they are production cues for the person recording/cutting
      this, not narrated text, and are never stripped or paraphrased
  CONFIRM total word count lands in the 3,500-3,800 band; if it does not, say so plainly in the
    report rather than padding or trimming a scene just to hit the number.
  GATE — SET phases.7_stitch.status = awaiting_approval, WRITE registry, REPORT the stitched
    file's path, final word/level counts, and a one-line pointer to outline.md / notes.md /
    scenes/ for anything Luke wants to look at directly — and ASK Luke to confirm the script is
    done. There is no Phase 8 to advance into, but the job's overall `status` still does not flip
    to `complete` on the agent's say-so alone.
  IF Luke confirms:
    MARK 7_stitch done, status: complete, WRITE registry
  ELSE (Luke wants a change):
    ROUTE the specific fix to whichever phase actually owns it (a scene → Phase 4; the shape of
    the whole thing → Phase 3) rather than patching the stitched file directly, so the source
    scene files and the stitched file never diverge; RE-STITCH once that phase's own gate clears.

STEP V — VARIATIONS TO THE INSTRUCTIONS                      (fires whenever Luke changes a rule
                                                                mid-project, at ANY phase)
  IF Luke gives an instruction that changes or overrides the base spec for THIS script (a
    different word-count band, a different visual-tag set, "no crisis levels this time", a genre
    swap, anything) — NEVER edit the copied base spec in _instructions.md. APPEND a dated entry
    under its "## Variations for this script" section instead, in Luke's own words plus a one-line
    restatement of what it changes.
  APPLY the variation from that point forward. If it affects work already done (e.g. a scene
    already drafted under the old rule), flag that scene as needing a Phase-4 rewrite rather than
    silently leaving it inconsistent.
  This is how the base spec stays reusable for the NEXT script while THIS script keeps whatever
    Luke asked for it specifically.

// EXECUTION_END
```

### 📐 BASE SPEC — copied verbatim into every script's `_instructions.md` at Phase 1

> **This is Luke's v4 POV Script Generator instruction set, unedited.** Phases 3-5 of the pipeline
> above draw on it directly; do not paraphrase it when copying it into a new script's
> `_instructions.md`.

**Master Goal & Technical Format**

- Target Output: 3,500–3,800 total words across 8–10 named levels (~350–400 words per level).
- Format: Script to be read aloud for audio recording.
- Grammatical Form: Strictly second person, present tense ("You sit," "You sign," "You do not
  sleep"). The only "you" is the person in the office.
- Zero Meta-Voice: No host voice or video framing (never use "in this video," "as you'll see,"
  or "let's begin").
- Visual Marker Density: Insert a visual tag — `[WIDE]`, `[OBJECT]`, `[REAR FIGURE]`, `[WINDOW]`,
  or `[TITLE]` — roughly every 25–30 words (approx. 12–15 tags per level) to match a 10–12
  second visual rhythm.

**Phase 1: Matrix Outline** — do not write prose until this matrix is complete and validated.
Generate an outline for 8–10 named levels derived from the character notes. Each level must
define: (1) Name, Room, Object, and Job. (2) Trajectory — up, down, or even (never a lecture).
(3) Opposing Force Selection from the menu below (no two consecutive levels share a category).
(4) Cost Mechanic selection. (5) Subversion Tag if it carries one of the 2 allowed subversions.

*Structural Manifest Requirements:*
- **Ladder Subversions** (select EXACTLY 2 per video): a demotion or sideways move · the highest
  office arrives early, the rest is living with it · a level ends in refusal (you do not take the
  chair) · the last level is smaller than the one before it · a petty level (leaky roof, missed
  train, bad translation).
- **Themes & Handles**: identify at most 3 themes from the notes. Map how each is planted as a
  physical object or habit by Level 3 and returned to changed. Never name the theme directly.
  **Belief Handle**: if "conviction/worldview" is used as an opposing force, assign it a physical
  or phrase-based handle by Level 2 (a phrase, a vote you will not cast, a word you will not use,
  a page you will not cut).
- **Crisis Allocation**: designate only 2–3 levels for full dramatic crisis; all other levels
  must turn quietly.

**Phase 2: Narrative Drafting Rules**

*Level Anatomy & Cadence:*
- Internal Arc: every level follows Place → job → pressure → cost or lock → the next door.
- Opening Beat: always open each level on a body part and a physical object. Context and
  explanation come only after the first physical beat.
- Sentence Rhythm: short and clipped at the start of a level, longer and more fluid in the
  middle, short again at the cut. The ear needs a landing.
- Grounding (limited emotion naming): show interiority mostly through physical friction, bodily
  tension, posture, hands, and actions. Be sparing with direct emotional labels (avoid guilt,
  triumph, regret, burden).

*Opposing Force Menu* (cycle across the script; never the same category twice in a row):
1. An institution
2. Time
3. Language
4. A person who is not a villain
5. Your own previous sentence or vote
6. Good fortune that arrives too soon
7. An absence
8. The protagonist's own conviction, ideology, or worldview — if used, later levels must tax
   the Belief Handle. Do not title a level as a conversion. Show whether the sentence still fits
   in the mouth. The person or institution is the lever; the belief is what hurts.

*Cost Mechanics Menu* (vary across levels):
- **Immediate Cost**: the rank takes something right now.
- **Deferred Invoice**: the promotion is free now; a later level bills the same gift (prize →
  silence, majority → the whip, pulpit → empty nave). If a level ends without payment, the next
  level collects automatically — do not announce that it will.
- **Neutral Promotion**: the new chair weighs the same as the old one. It must hatch side-work —
  favours, names, papers, rooms that assume you. Those threads may fail or recur; they haunt this
  ladder without becoming a second ladder. At least one side-thread must remain open at the end.
- **No Cost**: allowed only as ease that looks naive in hindsight.

*Prose notes*: the first object in Level 1 cannot belong in a cartel or CIA video. One local noun
per level from the notes (caucus, Lodge, division bell, red folder). Do not explain the system.

**Phase 3: Final Verification Pass** — before finishing, review the full draft against the
provided character notes: (1) confirm every chosen theme appears through objects/habits and is
never directly named; (2) ensure incidental details from the notes have been converted into
physical objects; (3) confirm no script details contradict the original notes.

---

## ✅ OUTPUT

**Per invocation**: which phase(s) ran, what was written or updated (folder created / notes
appended / outline table / N scenes drafted or rewritten / verification findings fixed / revision
verdicts applied / stitched file produced), the registry's `current_phase` and phase `status`
afterward, and what the NEXT invocation needs. Past Setup, that is almost always the same thing —
**Luke's approval** — since every phase 2-7 ends at `awaiting_approval` and stops there rather than
advancing on its own. The one exception worth naming explicitly: Phase 1 needs nothing back, it
runs straight into asking for Phase 2's source material.

**On completion (Phase 7 done)**: the path to `<slug>-full-script.md`, final word count and level
count, and a pointer to `outline.md` / `notes.md` / `scenes/` for direct review. The registry and
`_instructions.md` are never the deliverable — summarise their state, never dump them.

**Log**: `[AGENT: !POVScript] [PHASE n] slug=<slug> phase_status=<status> scenes_done=<n>/<total>`
→ `Memory/Long-Term/Logs/skills.log` after every phase transition.

**Error Path**
```
CATCH [session ends mid-scene]                      ➔ registry already reflects every scene
                                                       completed before the interruption (STEP 4
                                                       writes per-scene, not per-phase). Next
                                                       invocation resumes at the next undrafted
                                                       level — never restarts the phase
CATCH [Luke gives a rule variation mid-project]      ➔ STEP V — append to _instructions.md's
                                                       Variations section, dated, in his words.
                                                       Never edit the copied base spec in place
CATCH [asked to continue/verify/revise/stitch a       ➔ STOP. Report no such folder exists. Never
       slug with no existing folder]                   guess a slug and start fresh under it
CATCH [Phase 3 self-check fails — a repeated          ➔ fix the outline before marking 3_outline
       opposing-force category, wrong subversion       done. Never carry a known matrix violation
       count, wrong crisis count, >3 themes]            into Phase 4
CATCH [Phase 5 or 6 finds a structural/contradiction  ➔ route that ONE scene back through PHASE 4
       defect, not a trivial one]                       for a targeted rewrite. Never patch a
                                                       structural or factual problem at the
                                                       sentence level
CATCH [!Comprehension / !ConceptFidelity have no      ➔ run their entailment/mechanical steps only
       clean-context reader available]                  and say so in the recorded verdict, per
                                                       those skills' own fail-closed rule — never
                                                       let the authoring pass grade its own scenes
CATCH [notes.md lacks grounding for a detail a         ➔ flag it in the phase report rather than
       scene wants to assert as a NOTES-derived fact]    inventing an unsupported historical/
                                                       biographical claim; an invented physical
                                                       object or business detail is fine (this is
                                                       fiction) — an invented FACT attributed to
                                                       the notes is not
CATCH [final word count falls outside 3,500-3,800]    ➔ say so plainly in the Phase 7 report;
                                                       never pad or trim a scene purely to hit the
                                                       number
CATCH [Luke asks to see the registry or                ➔ summarise its state in plain English
       _instructions.md directly]                        instead of pasting the raw file — they
                                                       are agent bookkeeping, not the deliverable
CATCH [a phase's work is finished]                     ➔ SET its status to awaiting_approval,
                                                       report it, and STOP. Never advance
                                                       current_phase on the strength of a passed
                                                       self-check alone — a self-check earns the
                                                       right to be shown to Luke, not the right to
                                                       proceed without him (Setup is the one phase
                                                       exempt from this)
CATCH [tempted to run several gated phases in one       ➔ REFUSE. Each phase's gate is independent;
       invocation without stopping at each gate]          running Outline through to Scenes without
                                                       Luke's outline approval in between is the
                                                       exact failure this design closes off
CATCH [Phase 6's bounded re-check (STEP 6a) is           ➔ STOP re-checking that scene against that
       tempted past its 2-per-skill cap]                   skill. Treat it as a REJECT and route the
                                                       scene to Phase 4 — the cap is a hard ceiling,
                                                       the same discipline !HarvestWidgetContent's
                                                       BLOCKER PROTOCOL uses elsewhere in Lukeatron
CATCH [tempted to add a self-critique loop inside       ➔ REFUSE. Luke scoped in-phase looping to
       Phase 4 or Phase 5]                                Notes/Outline/Revision only. A defect
                                                       found drafting or verifying a scene is fixed
                                                       by routing that ONE scene back through
                                                       Phase 4 by hand, not by looping in place
```
