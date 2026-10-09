---
name: "!POVStyleGuide"
description: >
  Turn a finished (or partly finished) `!POVScript` script into a visual style guide that an AI
  image generator can follow, image by image, to produce the pictures that accompany the
  narration. Runs as a resumable SIX-PHASE pipeline across MULTIPLE separate invocations — Setup,
  Visual Brief, Style Bible, Shot Lists (one file per level, generated progressively),
  Verification, Compile (the final portable document) — living INSIDE the parent script's own
  folder as a `styleguide/` sub-folder, so script and images stay together. Sourcing is split
  three ways: the script (scenes/*.md, or the stitched full script) decides WHAT is drawn — every
  visual tag becomes exactly one shot; outline.md + notes.md decide HOW it looks — registers,
  eras, recurring characters and objects, title-card wording; POV genre conventions (this skill's
  own BASE SPEC) fill every gap and set the floor. This skill is READ-ONLY over the parent
  script's files — it never writes to notes.md, outline.md, scenes/, or the parent's own
  `_registry.yaml`/`_instructions.md`, all of which belong to `!POVScript`. Re-hashes the parent's
  source files on every resume so a script that changed mid-project never silently drifts out of
  sync with an already-built style guide. This skill produces PROMPTS AND GUIDANCE ONLY — it never
  calls an image generator itself and generates no images. `!HouseStyle` is silent here: this
  governs illustration direction for an external image model, not a Lukeatron UI surface (that
  distinction belongs to `!SvgImage` for Lukeatron's own illustration work). The compiled deliverable
  carries its own fixed format contract, so `!PlainEnglish`'s four-part shape does not govern the
  style guide document itself — only this skill's own chat reports to Luke follow it.
type: Skill
status: Active
domain: GeneralPurpose (creative content generation — sibling of !POVScript, placed here rather
  than Personal Research for the same reason)
intent: "Read a POV script's outline, notes, and scenes and derive a portable, tool-agnostic
  visual style guide — a fixed style block, per-register sub-blocks, an era lookup, reference
  sheets for recurring characters/objects, and a mechanically-assembled shot-by-shot prompt list —
  so an AI image generator (or Luke, by hand) can produce consistent images for every visual tag
  in the script, without this skill ever touching the script's own files or drifting from what the
  script actually says."
version: 1.0.0
changelog: >
  1.0.0 (2026-09-24, Luke's explicit instruction) — created as the image-side sibling of
  !POVScript: a separate, read-only, multi-session pipeline that turns a script's scenes into a
  style guide an image generator can follow, without ever writing to the script's own folder
  contents that !POVScript owns.
dependencies:
  - "!POVScript (reads its job folder — outline.md, notes.md, scenes/, _registry.yaml,
    _instructions.md — strictly read-only; never invoked through the Skill tool, just read on
    disk)"
  - "!HeadlessChromeBrowser (only if Luke asks for visual period research on top of notes.md —
    never on this skill's own initiative)"
calibration:
  context: Any
  level: Extended
  scope: Global
impact: Low
memory_footprint:
  read:
    - "Memory/Medium-Term/POVScripts/<slug>/ (parent script folder — outline.md, notes.md,
      scenes/, _registry.yaml, _instructions.md — read-only)"
  write:
    - "Memory/Medium-Term/POVScripts/<slug>/styleguide/ (this skill's own store — created at
      Phase 1, written every phase)"
---

## ⚡ TRIGGER

Primary: `!POVStyleGuide`
Secondary: "make a style guide for the <X> POV script", "visual style guide for <X>", "image
prompts for the <X> script", "style bible for <X>", "shot list for level <n> of <X>", "continue
the style guide for <X>", "compile the style guide for <X>".

Does **not** fire for: writing the script itself (`!POVScript`'s job — this skill only starts once
a script exists), a one-off image prompt with no POV script behind it (freehand prompting
instead), or UI/visual design of Lukeatron's own surfaces (`!HouseStyle`) or SVG illustration
(`!SvgImage`) — neither of those concerns an external image generator drawing a script's shots.

## 🧭 CORE PRINCIPLE

**One style guide = one sub-folder inside the script's own job = one resumable job.** Like its
sibling, this skill expects many invocations across many sessions for the same guide — Setup once,
Brief once, Bible once, Shot Lists progressively (one level at a time or in small batches),
Verification once, Compile once. State is written to disk after every phase AND after every
individual level's shot list — a session ending mid-level loses at most that one unfinished level.

**The three-way sourcing split governs everything this skill drafts, and is never re-derived per
shot:**
- The **script** (`scenes/*.md`, or `<slug>-full-script.md` once stitched) decides **WHAT** is
  drawn — every visual tag in the text becomes exactly one shot, and the prose around the tag
  supplies that shot's subject.
- **`outline.md` + `notes.md`** decide **HOW it looks** — the registers a script uses (if any are
  declared, e.g. an outline's own Visual Tags table), each level's era/place/Room/Object, recurring
  characters and motif objects, and title-card wording.
- **POV genre conventions** — this skill's own BASE SPEC below — fill every gap the script and its
  notes leave open, and set the floor no style guide may drop beneath (faceless "you", no living
  artist named, no in-copyright story illustrated).

**Precedence when these disagree:** Luke's own logged variation (STEP V) beats explicit visual
direction already sitting in outline.md/notes.md, which beats the genre defaults in the BASE SPEC.
`notes.md` is additionally the standing fact-check ground throughout — no image, prompt, or
reference sheet in this guide may contradict a fact recorded there (a period detail, a place, a
character's dress, who was present in a scene).

**Read-only over the parent job, always.** This skill may read the parent's `outline.md`,
`notes.md`, `scenes/`, `_registry.yaml` (to learn the script's own phase and confirm the outline is
done), and `_instructions.md` (to pick up any per-script variation `!POVScript` logged, such as an
extra register Luke added). It never writes to any of them. If a problem surfaces in the script
itself — a malformed or unrecognised visual tag, a scene that contradicts notes.md, a level whose
scene is missing — that is reported to Luke as a `!POVScript` matter, never silently patched here.

**Every phase past Setup is a gate**, exactly as `!POVScript`: a phase's work goes to
`awaiting_approval`, the invocation stops, and `current_phase` only ever advances on Luke's
explicit OK. In-phase self-improvement loops are scoped to exactly Phase 2 (a gap review before the
gate), Phase 3 (the style bible's own self-check), and nowhere else — Phase 4 runs a single
mechanical coverage count (never a redraft loop) and Phase 5 runs one verification pass, fixing
what's trivial and routing the rest back to Phase 4 by hand, same doctrine as `!POVScript`'s own
Phase 5.

## 🛠️ LOGIC

```
// EXECUTION_START

STEP 0 — LOCATE THE JOB AND CHECK FOR DRIFT                (every invocation starts here)
  DERIVE slug from the script Luke names. If ambiguous, ask; never guess.
  LOOK for Memory/Medium-Term/POVScripts/<slug>/
  IF the parent folder does not exist:
    STOP. Report no such script exists. Never guess a slug and start fresh under it.
  READ the parent's _registry.yaml. IF phases.3_outline.status is not "done":
    STOP. Report the script's outline is not yet approved; this skill needs it. Never proceed on
    an unapproved outline.
  LOOK for Memory/Medium-Term/POVScripts/<slug>/styleguide/_registry.yaml
  IF found:
    READ styleguide/_registry.yaml → current_phase, phase statuses, source_hashes, stale, anchors
    READ styleguide/_instructions.md → the locked base spec + this guide's variations
    RUN THE DRIFT CHECK (below) before reporting the resume point
    REPORT the resume point (plus any drift findings) to Luke, JUMP to that PHASE
  IF not found AND Luke is asking to start a guide for this script:
    GO to PHASE 1
  IF not found AND Luke is asking to continue/verify/compile a guide that does not exist:
    STOP. Report no such style guide exists yet for this script.

  DRIFT CHECK (runs on every resume once styleguide/_registry.yaml exists):
    RE-HASH outline.md, notes.md, and each file in scenes/ (shasum -a 256).
    COMPARE each hash to source_hashes recorded when that artefact was last used to build
      something in this guide.
    A CHANGED scene → ADD that level to `stale`, and its shots file (if built) must be re-run
      through Phase 4 — never silently rewritten; report it, wait for Luke's go (or his instruction
      to continue) before redoing it.
    A CHANGED outline.md or notes.md → FLAG brief.md and/or style-bible.md for review at the next
      gate — never auto-rewritten.
    A scene that now EXISTS but has no shots/<NN>-*.md yet → note it as new work for Phase 4.
    A level whose scene file was REMOVED, or a new level added to outline.md since this guide was
      built → flag it explicitly; never silently drop or silently add a level's shots.
    IF anything is newly stale or new AND the guide had already passed Phase 4 (current_phase 5
      or 6, or status complete): REOPEN — SET current_phase = 4, status: in-progress,
      phases.4_shots.status = in-progress, and phases 5 and 6 back to pending. Shots files that
      are still current are kept; only the affected levels are rebuilt, then Verification and
      Compile re-run through their own gates.
    WRITE any findings into the DRIFT CHECK report; do not rewrite any shots file automatically.

PHASE 1 — SETUP                                     (folder + registry + instructions, no gate)
  CREATE Memory/Medium-Term/POVScripts/<slug>/styleguide/
    ├── _registry.yaml        (agent-only — STEP 1a)
    ├── _instructions.md      (agent-only — STEP 1b)
    ├── brief.md               (human — Phase 2)
    ├── style-bible.md          (human — Phase 3)
    ├── shots/                   (empty — one file per level, filled progressively in Phase 4)
    └── <slug>-visual-style-guide.md   (human — Phase 6, does not exist yet)
  ASK Luke only for what cannot be derived: target image tool(s) (default: [generic] — plain
    English, tool-agnostic) and aspect ratio (default: 16:9). Proceed on the defaults if he does
    not answer.
  STEP 1a — WRITE styleguide/_registry.yaml:
    slug, title (matches parent), created (date), status: in-progress
    current_phase: 2
    aspect_ratio: 16:9              // or Luke's answer
    target_tools: [generic]         // or Luke's answer, e.g. [midjourney, flux]
    phases:
      1_setup: {status: done, date: <today>}
      2_brief: {status: pending}
      3_bible: {status: pending}
      4_shots: {status: pending, levels_done: [], levels_total: null, shots_total: 0}
      5_verification: {status: pending, findings: []}
      6_compile: {status: pending}
    source_hashes: {outline: null, notes: null, scenes: {}}   // filled as each is first used
    stale: []
    anchors: {}    // per register / per recurring character or object → [{path_or_url, date}]
    session_log: [{date: <today>, phase: 1, action: "styleguide folder created"}]
  STEP 1b — WRITE styleguide/_instructions.md:
    COPY the BASE SPEC verbatim from "📐 BASE SPEC" below. Under it, open a dated "## Variations
      for this style guide" section (empty at Setup) — see STEP V.
  NO GATE — nothing yet for Luke to approve. MARK 1_setup done, ADVANCE current_phase to 2, WRITE
    registry.
  REPORT: folder created, aspect ratio / target tools confirmed, and that Phase 2 is about to read
    the parent's outline.md and notes.md.

PHASE 2 — VISUAL BRIEF                                    (brief.md, derived from the parent job)
  READ outline.md, notes.md, and (for era/light cues) each scene in scenes/. HASH outline.md and
    notes.md and RECORD them under source_hashes.outline / .notes (the basis the brief and bible
    are built on). Scene hashes are NOT recorded here — each is recorded only when Phase 4 builds
    that level's shots from it, so the drift check always compares against the scene a shot list
    was actually built from.
  BUILD brief.md as a human-readable document:
    - A per-level TABLE: level · era/date · place · Room · key Object(s) · who is present ·
      register(s) used in that level's scenes · mood/trajectory (from outline.md) · light/time-of-
      day cues (drawn from the scene text itself, not invented).
    - REGISTERS LIST: every register the script actually uses (read from outline.md's own Visual
      Tags table if it declares one, else scan the scene tags directly) and, for each, whatever
      style direction outline.md/notes.md already gives it. IF the script only uses the five base
      tags (`[WIDE]` `[OBJECT]` `[REAR FIGURE]` `[WINDOW]` `[TITLE]`), the only register is Life —
      say so plainly rather than inventing others.
    - RECURRING CHARACTERS: pulled from notes.md's own Recurring Characters section where one
      exists, verbatim in substance — never re-invented here.
    - RECURRING MOTIF OBJECTS: named, with a note on how each changes appearance across levels
      (aging, wear, a different setting) where the scenes show that.
    - TITLE-CARD TEXTS: copied from outline.md's Title Cards table if one exists.
    - RESTRICTED WORKS: any in-copyright story the script references — flagged for book-as-object
      treatment only (never illustrated as its own story) per the BASE SPEC's copyright rule.
    - NAMED GAPS: anything Phase 3 will need that is missing from outline.md/notes.md — e.g. no
      physical description anywhere of a recurring character. NAME the gap; never invent a fact to
      fill it. A gap in incidental, non-factual detail (what colour a coat is, if nothing in notes
      says) may be left to Phase 3/4's own invented-but-not-attributed-as-fact latitude — see the
      BASE SPEC's Colour/Fact distinction, inherited from !POVScript's own rule.
  GATE — SET phases.2_brief.status = awaiting_approval, WRITE registry, REPORT brief.md and any
    named gaps, ASK Luke to approve before the style bible is built.
  IF Luke approves:
    MARK 2_brief done, ADVANCE current_phase to 3, WRITE registry
  ELSE:
    REVISE per his direction, RETURN to the GATE step.

PHASE 3 — STYLE BIBLE                                          (style-bible.md — see BASE SPEC)
  ONLY starts once 2_brief is done. BUILD style-bible.md containing all of:
    (a) the "you" rule, stated plainly (never face-on; structural, not a style preference)
    (b) the FIXED STYLE BLOCK — medium, rendering process, palette (hex values), lighting
        language, lens/film-stock language, aspect ratio, texture — pasted into every Life prompt
    (c) one REGISTER SUB-BLOCK per register named in brief.md, each with ONE fixed medium and its
        own palette, so registers read apart at a glance
    (d) the SHOT-FRAGMENT TABLE mapping each tag the script actually uses (life tags, plus any
        register-prefixed shot forms) to concrete camera/framing language
    (e) the ERA LOOKUP — one row per level/decade in brief.md's table: costume, interiors,
        technology, light sources, and a named period art movement or photographic/print process
        as reference — plus a one-line per-level grading-drift note (how the palette warms/cools
        along the script's trajectory), staying inside the fixed block's palette family
    (f) REFERENCE SHEETS — one per recurring character and motif object from brief.md: a canonical
        description reused verbatim in every prompt where they appear, plus how it ages/changes by
        level
    (g) TITLE-CARD SPEC — a textless background plate per card (text is overlaid later in editing,
        never generated in-image), plus a period-appropriate typography suggestion for that overlay
    (h) the NEGATIVE TAIL (BASE SPEC default, adjusted only if Luke varies it)
    (i) CONSISTENCY MECHANISM — tool-agnostic: generate one anchor image per register and per
        recurring character/object first, get Luke's approval, LOG it in styleguide/_registry.yaml
        `anchors`, then feed it forward as a style/character reference for every later prompt in
        that register or for that character — worked example: Midjourney `--sref`/`--cref`;
        generalise as "style-reference image" / "character-reference image" elsewhere
    (j) the PROMPT TEMPLATE (BASE SPEC — filled mechanically in Phase 4, never free-composed)
  SELF-CHECK before the gate (the in-phase loop for this phase — re-run after any fix, no fixed
    cap, for as long as Phase 3 stays open):
    - every register in brief.md has a sub-block
    - every recurring character/object in brief.md has a reference sheet
    - every level's era has an ERA LOOKUP row
    - no living artist or illustrator named anywhere in the document
    - the fixed style block's palette carries hex values
    - every register's medium is distinct from every other register's medium
    IF any check fails → FIX, RE-RUN the checks, repeat until all hold. NEVER gate a bible with a
    known violation.
  GATE — SET phases.3_bible.status = awaiting_approval, WRITE registry, REPORT style-bible.md, ASK
    Luke to approve before shot lists begin.
  IF Luke approves:
    MARK 3_bible done, ADVANCE current_phase to 4, SET phases.4_shots.levels_total = level count
    from outline.md, WRITE registry
  ELSE:
    REVISE per his direction, RE-RUN the self-check, RETURN to the GATE step.

PHASE 4 — SHOT LISTS                                (progressive — one file per level, per shot)
  ONLY starts once 3_bible is done. Stale levels (from the drift check) are drafted FIRST, then any
    level Luke names, then remaining levels in outline order.
  For EACH level in `stale`, or not yet in phases.4_shots.levels_done (a stale level stays in
    levels_done; it is simply rebuilt):
    READ that level's scene file (or, for a re-run after drift, the CURRENT scene file — never a
      cached copy).
    FOR EACH visual tag in that scene, in order, assign shot ID `L<NN>-S<NN>`:
      - tag as written (including its register prefix, if any)
      - register (Life, or the named register the tag prefix carries)
      - shot type (from the SHOT-FRAGMENT TABLE)
      - source anchor — the ≤1 sentence of script the shot illustrates, QUOTED verbatim (this is
        Luke's own text, never paraphrased for the anchor field)
      - subject & action, drawn from the prose around the tag
      - composition — framing, and where "you" is (hands / back / silhouette / over-shoulder /
        first-person hands) — NEVER a front face
      - era/setting cues, from the ERA LOOKUP row for that level
      - continuity refs — which reference sheet(s)/anchor(s) this shot draws on
      - motion hint for editing (hold / slow push-in / slow pull-out / pan L or R / tilt /
        parallax)
      - the ASSEMBLED PROMPT — plain English, ~60-120 words, filled MECHANICALLY from the PROMPT
        TEMPLATE's slots (never free-composed) — plus its negative tail
    ADD a one-line PACING NOTE for the level: seconds per image, roughly tag-spacing at read-aloud
      speed (~25-30 words per tag ≈ 8-12 seconds).
    COVERAGE CHECK: count of visual tags in the scene MUST equal count of shots in the shots file.
      A mismatch is fixed before saving — never saved unreconciled.
    SAVE to styleguide/shots/<NN>-<level-slug>.md (same NN and slug as the parent scene file).
    RECORD the scene's hash used under source_hashes.scenes[<NN>]. If this level was in `stale`,
      REMOVE it from `stale` now that it is rebuilt.
    APPEND the level to phases.4_shots.levels_done, ADD its shot count to shots_total, LOG the
      session, WRITE registry — PER LEVEL, not once at the end of the phase.
  A single invocation MAY draft several levels' shot lists in one pass; registry state is still
    saved after each one.
  NO in-phase loop beyond the mechanical coverage count — a drafted shots file is saved once and
    left for Phase 5 to catch; it is never redrafted against its own self-critique here.
  WHEN levels_done covers every level in outline.md AND `stale` is empty:
    GATE — SET phases.4_shots.status = awaiting_approval, WRITE registry, REPORT the shot files
    (one-line description each) and total shot count, ASK Luke to approve before Verification.
  IF Luke approves:
    MARK 4_shots done, ADVANCE current_phase to 5, WRITE registry
  ELSE (Luke wants a specific level's shots redone):
    REDRAFT that level's shots file, WRITE registry, RETURN to the GATE step.

PHASE 5 — VERIFICATION                                            (one pass, typed findings)
  ONLY starts once 4_shots is done and `stale` is empty. Re-read the full shot set against
    style-bible.md, brief.md, outline.md and notes.md and check:
    - every shot's register matches its tag's prefix
    - no shot's composition puts "you" face-on
    - no shot requests legible in-image text outside a TITLE shot
    - every shot's era/setting cues match its level's ERA LOOKUP row
    - no shot contradicts a fact in notes.md (period, place, dress, who is present)
    - every recurring character/object shot uses its reference sheet's description, not an
      off-sheet description
    - no restricted work is illustrated as its own story; no living artist named; no real
      historical person's likeness targeted as a face reference
    - source_hashes for every scene used are current (no undetected staleness)
    - every prompt fills every slot the PROMPT TEMPLATE defines (no missing slot)
  RECORD each finding — typed (COVERAGE-GAP / REGISTER-MISMATCH / FACE-SHOWN / TEXT-IN-IMAGE /
    ANACHRONISM / CONTRADICTION / CONTINUITY-BREAK / RESTRICTED-WORK / STALE-SOURCE /
    TEMPLATE-DRIFT) and located (shot ID) — into phases.5_verification.findings. Agent-facing log,
    never a file for Luke to open directly.
  FIX trivial findings in place, directly in the shots file, immediately (a missing negative-tail
    clause, a template slot left blank).
  FOR any non-trivial finding (a contradiction, a continuity break, a restricted-work leak): ROUTE
    that ONE level back through PHASE 4 for a targeted rewrite of its shots file — never patch a
    structural or factual problem at the prompt-fragment level.
  NO in-phase loop: one pass, fix what's trivial, route what isn't, stop.
  GATE — SET phases.5_verification.status = awaiting_approval, WRITE registry, REPORT the findings
    (fixed-in-place and routed-to-Phase-4, separately), ASK Luke to approve before Compile.
  IF Luke approves (and no level is still routed back to Phase 4):
    MARK 5_verification done, ADVANCE current_phase to 6, WRITE registry
  ELSE:
    STAY at awaiting_approval / in-progress as appropriate, WRITE registry, re-run this phase once
    any routed level's rewrite lands — current_phase never advances with an open route-back.

PHASE 6 — COMPILE                                    (<slug>-visual-style-guide.md — the deliverable)
  ONLY starts once 5_verification is done. IDEALLY runs after the parent script's own Phase 7
    (Stitch); IF the parent is not yet stitched, compile anyway but SAY SO plainly in the header
    and mark the document "provisional".
  ASSEMBLE <slug>-visual-style-guide.md, a single portable document another AI can be handed cold:
    (1) HOW TO USE — generation order (anchors first, then shots in level order), paste blocks
        verbatim, one image per shot
    (2) the style bible IN FULL (style-bible.md's content, not a summary)
    (3) ALL SHOTS in level order (the assembled prompts, with their shot IDs and continuity refs)
    (4) TOOL APPENDIX — plain English is the master; a Midjourney syntax translation (`--ar`,
        `--sref`, `--cref`, `--sw`, `--no`); short notes for Flux (long literal prompts, no
        weighting), GPT-image/DALL·E (rewrites prompts — restate constraints plainly), Imagen
    (5) PER-IMAGE ACCEPTANCE CHECKLIST — register readable at a glance; no face shown where "you"
        or a real person is drawn; no in-image text except an overlay plate; era matches the
        lookup; continuous with the previous accepted image in the same register; no
        restricted-work/likeness leakage
    (6) PACING SUMMARY and total image count
  HEADER states: source hashes/date, target tools, aspect ratio, and "provisional" if the parent
    script is not yet stitched.
  GATE — SET phases.6_compile.status = awaiting_approval, WRITE registry, REPORT the compiled
    file's path, total image count, and ASK Luke to confirm the guide is done.
  IF Luke confirms:
    MARK 6_compile done, status: complete, WRITE registry
  ELSE:
    ROUTE the specific fix to whichever phase owns it (a shot → Phase 4; the bible → Phase 3; the
    brief → Phase 2) rather than patching the compiled file directly, so source files and the
    compiled guide never diverge; RE-COMPILE once that phase's own gate clears.
  LATER SCRIPT CHANGES: the next invocation's STEP 0 drift check reopens the affected level(s) and
    this phase re-runs once they are rebuilt — the compiled guide is never hand-patched for drift.

STEP V — VARIATIONS TO THE INSTRUCTIONS              (fires whenever Luke changes a rule mid-guide,
                                                        at ANY phase)
  IF Luke gives an instruction that changes or overrides the base spec for THIS style guide (a
    different aspect ratio default, an added register, a different negative tail, a genre swap) —
    NEVER edit the copied base spec in styleguide/_instructions.md. APPEND a dated entry under its
    "## Variations for this style guide" section, in Luke's own words plus a one-line restatement.
  APPLY the variation from that point forward. If it affects work already built (a shots file drafted
    under the old rule, a bible section that assumed the old default), FLAG that artefact as needing
    a re-run of its owning phase rather than silently leaving it inconsistent.

STEP A — ANCHORS                                     (fires any time Luke accepts or rejects an
                                                        image, at ANY phase from 3 onward)
  IF Luke says an image was accepted or rejected ("use this as the Life anchor", "that Wren looks
    right", "no, redo the WWI register anchor") — LOG it in styleguide/_registry.yaml `anchors`
    under the matching register or recurring character/object, with the date and (path or URL if
    given). Later shot prompts in that register/for that character reference the logged anchor.

// EXECUTION_END
```

### 📐 BASE SPEC — copied verbatim into every guide's `styleguide/_instructions.md` at Phase 1

> **This is the genre floor for a POV script's visual style guide.** Phases 2-6 above draw on it
> directly; do not paraphrase it when copying it into a new guide's `_instructions.md`.

**Format & default aspect ratio**
- Default aspect ratio: **16:9** (the long-form "life ladder" narrated-documentary format). A
  9:16 Shorts cut is a variation, logged via STEP V — it never changes the rest of the bible.
- Medium: painterly-cinematic still — not photoreal, not cartoon — with desaturated, period-toned
  grading. Every register keeps this discipline in its own fixed medium; only the medium itself
  changes register to register.

**The "you" rule — structural, not stylistic**
- The protagonist "you" is **NEVER shown face-on**. This is what makes second-person narration
  work visually, not a style preference an image prompt may casually override. Use one of:
  Rückenfigur/rear figure (seen from behind, contemplating a view), hands in frame, silhouette,
  over-the-shoulder, or the object the hands hold.
- Other characters may appear, but a **real historical person is never rendered from a real
  photographed likeness** — describe them by period dress and bearing, preferably partly turned or
  obscured, consistent with the "you" default.
- One image per visual tag. No tag goes unillustrated; no image is generated for prose that carries
  no tag.

**Shot grammar — what each tag means to an image model**
- `[WIDE]` = establishing shot: figures small in frame, weather/time-of-day sets the mood; reads
  well as a still because it needs no motion to convey scale.
- `[OBJECT]` = insert/macro shot: one object sharp, hands allowed, closeness carries the emphasis.
- `[REAR FIGURE]` = Rückenfigur: seen from behind, contemplating a view; face never visible.
- `[WINDOW]` = threshold/aperture framing: the figure at a window or doorway, a view beyond,
  liminal — one state or place seen from inside another.
- `[TITLE]` = a textless background plate; the card's text is overlaid in editing, never generated
  in-image (image models garble legible text).
- A script MAY declare additional registers (e.g. a story-within-the-story, or an illustration of a
  real published work) with their own tag prefixes; each such register keeps **exactly ONE fixed
  medium**, distinct from every other register's medium, so registers stay tellable apart at a
  glance. A script that carries only the five base tags above has exactly one register: Life. Never
  invent a register the script does not use.
- Register change is reserved for content the primary (Life) visual language structurally cannot
  show: a story inside the story, another mind's own fiction, an illustration of a real published
  work — never used as decoration.

**Copyright and likeness — hard rules, not preferences**
- **Never name a living artist or illustrator** in any prompt or reference sheet. Reference period
  art movements, photographic/print processes, and eras instead (e.g. "Edwardian steel-engraving,"
  "interwar British illustration," "mid-century book illustration").
- **No illustration of an in-copyright work's own story.** An in-copyright book referenced in the
  script is shown only as a book-as-object (an `[OBJECT]` shot of the book itself), never as a
  scene from its story. A public-domain or out-of-copyright work may be illustrated as its own
  story in a Tale-style register.
- **No legible text generated in-image**, anywhere, for any tag except a `[TITLE]` plate's
  background — and even there, the card's WORDING is overlaid afterward, never asked of the
  generator.
- **No real historical person's actual photographed likeness** is used as a face/image reference,
  even for a public figure appearing in an illustrated register — describe typical period
  dress/bearing instead.

**Era authenticity**
- Every level/decade the script spans gets an ERA LOOKUP row: costume, interiors, technology, light
  sources, and a named period art movement or photographic/print process as visual reference (not
  just the decade named in isolation) — this is what prevents anachronistic drift across a
  multi-decade ladder.
- Pair the named process with the decade in every era-cued prompt (a period-appropriate
  photographic-plate or print-process description alongside the costume/technology cues), so
  technology and dress do not drift out of step with each other across levels.

**Consistency mechanism**
- A fixed style block (medium, rendering process, palette with hex values, lighting language,
  lens/film-stock language, aspect ratio, texture) is pasted or referenced in **every single
  prompt** across the whole guide — this is what prevents drift over many levels and many images.
- Recurring characters and motif objects each get a **one-time reference sheet**, written once and
  reused verbatim as the character/object block in every prompt where they appear, with a note on
  how their described appearance ages or changes across levels.
- Generate one **anchor image** per register and per recurring character/object first; once Luke
  accepts it (STEP A), feed it forward as a style/character reference for every later prompt in
  that register or for that character. Worked example: Midjourney `--sref [code/url]` carries
  style, not subject; `--cref [url]` carries character identity, not style; combine both for a
  consistent character in a consistent style. Generalise elsewhere as "style-reference image" and
  "character-reference image." Where no explicit reference-image feature exists, fall back to
  feeding the previous accepted image back in as an image-to-image reference.

**Prompt template — filled mechanically, never free-composed**
```
[FIXED STYLE BLOCK or REGISTER SUB-BLOCK] + [SHOT-TYPE FRAGMENT] + [ERA/SETTING CUES] +
[SUBJECT & ACTION from the scene] + [CONTINUITY: reference-sheet text] + [ASPECT] —
NEGATIVE: [negative tail]
```
Every slot is filled from the style bible and the shot's own fields; a prompt with an empty or
free-composed slot is a TEMPLATE-DRIFT finding at Phase 5.

**Default negative tail** (baked into the fixed style block; adjustable only via a logged
variation): blurry, low-quality, watermark, legible text or lettering (except a `[TITLE]` plate's
textless background), modern objects or anachronisms, oversaturation, symmetrical AI-default faces,
extra or distorted limbs/fingers, the protagonist's face.

**Known failure surfaces to design around, not fight**
- Hands: fail most in overlapping-hands scenes (multiple figures), complex grips, and small hands
  in wide shots — prefer compositions that keep hands simple or partially occluded where the shot
  does not need them prominent.
- Faces: recurring-character face drift across a series and "AI-default" over-symmetric faces are
  both mitigated by the reference-sheet + anchor-image consistency mechanism above, not by prompt
  wording alone.
- Legible text: still garbles reliably; the TITLE rule (textless plate + editing overlay) exists
  because of this, not as a style choice.

**Pacing guidance for downstream assembly**
- Roughly one image per visual tag at the script's own tag density (~25-30 words per tag ≈ 8-12
  seconds of read-aloud narration per image). A contemplative wide/establishing shot may hold
  longer (up to 15s); a brisk level may run closer to 8s per image. State this per level in the
  shot list, never assume a flat rate across the whole script.

---

## ✅ OUTPUT

**Per invocation**: which phase(s) ran, what was written or updated (styleguide folder created /
brief.md built / style-bible.md built / N levels' shot lists drafted or rewritten / verification
findings fixed or routed / compiled guide produced), any drift findings from STEP 0, the registry's
`current_phase` and phase `status` afterward, and what the next invocation needs — almost always
**Luke's approval**, since every phase 2-6 ends at `awaiting_approval` and stops there.

**On completion (Phase 6 done)**: the path to `<slug>-visual-style-guide.md`, total image count,
target tool(s) and aspect ratio, and whether it is marked provisional (parent script not yet
stitched). The registry and `_instructions.md` are never the deliverable — summarise their state,
never dump them.

**Log**: `[AGENT: !POVStyleGuide] [PHASE n] slug=<slug> phase_status=<status> levels_done=<n>/<total> stale=<n>`
→ `Memory/Long-Term/Logs/skills.log` after every phase transition.

**Error Path**
```
CATCH [no parent script folder exists]                ➔ STOP. Report no such script exists. Never
                                                       guess a slug and start fresh under it
CATCH [parent script's outline is not yet done]        ➔ STOP. Report the outline must be approved
                                                       (3_outline: done in the parent registry)
                                                       before a style guide can start
CATCH [a level's scene file is missing]                ➔ skip that level's shots for now, note it
                                                       as pending on the parent script, never
                                                       fabricate a shot list from the outline alone
CATCH [a source hash has changed since last used]       ➔ STEP 0 drift check adds the level to
                                                       `stale`, reports it, and its shots file is
                                                       re-run through Phase 4 — never silently
                                                       rewritten without telling Luke
CATCH [a shot list's tag count ≠ its scene's tag count] ➔ fix before saving; never save an
                                                       unreconciled shots file
CATCH [a visual tag in the script is malformed or        ➔ report it to Luke as a !POVScript
       carries an unrecognised register prefix]           matter (never fix it here); map it to
                                                       the nearest known register provisionally so
                                                       Phase 4 can still proceed, and flag the
                                                       provisional mapping in the phase report
CATCH [notes.md/outline.md lack a recurring character's ➔ NAME the gap and ASK Luke; never invent a
       physical description Phase 3 needs]                 FACT and attribute it to notes.md — an
                                                       invented, clearly-incidental prop or detail
                                                       (not attributed as a notes.md fact) is fine
CATCH [tempted to write to any parent script file        ➔ REFUSE. This skill is read-only over
       (notes.md, outline.md, scenes/, parent registry)]   outline.md/notes.md/scenes/ and the
                                                       parent's own registry/instructions — those
                                                       are !POVScript's exclusively
CATCH [tempted to run several gated phases in one        ➔ REFUSE. Each phase's gate is
       invocation without stopping at each gate]           independent, same discipline as
                                                       !POVScript's own pipeline
CATCH [Luke asks to see styleguide/_registry.yaml or      ➔ summarise its state in plain English;
       _instructions.md directly]                          they are agent bookkeeping, not the
                                                       deliverable
CATCH [asked to name a living artist/illustrator, or to   ➔ decline; offer a period art movement,
       render a real person's actual photographed          photographic/print process, or era-
       likeness]                                            appropriate dress/bearing description
                                                       instead — this is a hard rule, not a
                                                       preference
CATCH [Phase 6 compile is requested before the parent     ➔ compile anyway, but mark the header
       script's own Phase 7 Stitch is done]                 "provisional" and say so plainly in the
                                                       report — never silently treat it as final
CATCH [session ends mid-level's shot list]                ➔ registry already reflects every shot
                                                       and level completed before the interruption
                                                       (Phase 4 writes per-level). Next invocation
                                                       resumes at the next undrafted or stale level
CATCH [Luke gives a rule variation mid-guide]              ➔ STEP V — append to _instructions.md's
                                                       Variations section, dated, in his words.
                                                       Never edit the copied base spec in place
CATCH [Luke accepts or rejects a generated image]          ➔ STEP A — log it under `anchors` in
                                                       styleguide/_registry.yaml with the date;
                                                       later prompts in that register/for that
                                                       character reference it
```
