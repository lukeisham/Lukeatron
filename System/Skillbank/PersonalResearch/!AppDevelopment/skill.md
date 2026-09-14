---
name: "!AppDevelopment"
description: "Router for the four-phase app/widget development lifecycle — PRD, technical specs + mockups, multi-agent build prep, and post-build refactor against a permanent template. Resolves the current phase from the project's registry and dispatches to the matching phase skill. Apps are standalone web apps, opened directly — they ARE the front door. Widgets need a host — another app, a page, a chassis, or the local OS/shell — and are never opened as their own front door."
type: Skill
status: Active
core_function: System
intent: "Take an app or widget from a blank idea to a permanently housed template, one gated phase at a time, so an interrupted or context-refreshed agent can always resume from the registry."
version: 1.0.2
dependencies:
  - phase1-prd.md
  - phase2-specs.md
  - phase3-buildprep.md
  - phase4-refactor.md
  - wishlist.md
  - templates/registry.md
  - templates/prd.md
  - templates/doc-spec.md
  - templates/build.md
  - templates/refactor-registry.md
  - templates/wishlist.md
calibration:
  context: [PersonalResearch]
  level: Extended
  scope: Local
memory_footprint:
  read: [Memory/Long-Term/Coding, Memory/Long-Term/Style Guide, System/Templates]
  write: [System/Sandbox]
---

## ⚡ TRIGGER
Primary: `!AppDevelopment`
Fires when: Luke asks to "build an app", "build a widget", "make a new widget", "start a new app",
"write a PRD for", "spec out this app", "resume the app build", "where is the <name> build up to",
"refactor the <name> app/widget", "turn this into a template", "add to the wishlist for <name>",
"what's on the wishlist for <name>", "note this idea for <name>", or names any phase skill
directly (`!AppPRD`, `!AppSpecs`, `!AppBuildPrep`, `!AppRefactor`, `!AppWishlist`).
Scope: One app or widget per invocation. Never two projects in one run.

## 🛠️ LOGIC

// EXECUTION_START

**STEP 0 — Fix the vocabulary**
  One question decides `kind`: **can this be opened on its own, with nothing else already
  running, and it is the whole thing?**
    yes ➔ `kind` = `app`    — a standalone web app; it IS the front door, opened directly by URL.
    no  ➔ `kind` = `widget` — it has a HOST: something else that must already exist for it to run
                              at all. The host is not always a web page — it may be another app,
                              a widget suite/chassis, or the local OS/shell (a menu-bar item, a
                              cron/launchd job, a CLI invoked from a folder). Whatever it is, name
                              it — a widget with no named host is not yet specified (Phase 1).
  A thing that COULD be embedded but is also fully usable opened on its own is an app — optional
  embeddability does not make something a widget. The test is whether it NEEDS a host to run at
  all, not whether hosting is possible.
  The distinction is load-bearing across every phase, not just design:
    Phase 1 — a widget's PRD carries a Host contract section; an app's PRD does not.
    Phase 2 — the documentation spec's cross-boundary section always covers module boundaries;
              for a widget it additionally covers the named host boundary.
    Phase 3 — a widget is not "done" merely because it runs standalone; it must be exercised
              inside its named host before Luke is told the build is complete.
    Phase 4 — the permanent home: `System/Apps/<Name>/` vs `System/Widgets/<Name>/`.
  Ask Luke if the request does not make it obvious.

**STEP 1 — Resolve the project and its phase (resume-safe entry point)**
  ASSERT a project name is known ELSE ask Luke for one, then continue.
  SEARCH `System/Sandbox/<name>/registry.md`
  MATCH found CASE
    yes  ➔ READ it. SET `phase` = its `phase:` field. Report to Luke, in three lines:
           the project, the phase, and the single next unchecked step. Then continue.
    no   ➔ SEARCH for an existing built app/widget Luke has named (Phase 4 can be entered cold —
           see STEP 3). IF none ➔ SET `phase` = 1, new project.
  Never guess a phase from conversation memory. **The registry is the only source of truth for
  phase state** — this is the whole reason it exists.

**STEP 1a — Wishlist requests bypass phase dispatch**
  IF the request is a wishlist verb (add / query / rank an idea) rather than phase work ➔ HAND to
  `wishlist.md` directly and return; do not run STEP 2's phase dispatch. This works in any phase,
  including 4-pending and Phase 4 cold entry, since the wishlist is not part of the phase state
  machine — it is a running backlog that outlives every phase.

**STEP 2 — Dispatch**
  MATCH `phase` CASE
    1 ➔ READ `phase1-prd.md`     and follow it   // PRD + registry created in Sandbox
    2 ➔ READ `phase2-specs.md`   and follow it   // technical specs + mockups, iterating
    3 ➔ READ `phase3-buildprep.md` and follow it // refresh, delete mockups, write build.md
    4 ➔ READ `phase4-refactor.md` and follow it  // permanent home, template + test, refactor
  Load exactly ONE phase file. Never read ahead; a phase file is only relevant once its phase
  is current.

**STEP 3 — Cold entry into Phase 4**
  Phase 4 is independently invocable. An app or widget that already exists — built by hand, by
  another skill, or long ago — can be handed to `phase4-refactor.md` directly with no PRD,
  no specs and no Phase 1–3 history. In that case there is nothing to migrate and nothing to
  delete: STEP 1 of Phase 4 simply confirms the existing location, and the phase begins at the
  template/test split.

**STEP 4 — Phase advance is explicit, never inferred**
  A phase ends only when Luke says he is happy with it. On advance:
    SET registry `phase:` = next
    APPEND a dated line to the registry's Phase Log
    STATE to Luke what is now closed and what the next phase will not revisit
  Phases 1→2 loop freely. **2→3 is a one-way door**: after Phase 3 begins, the skill does not
  return to the PRD or to mockups. Say this out loud before advancing to 3.

### 🎨 DESIGN & UX REFERENCE SET

**`!HouseStyle` comes FIRST and is not advisory.** It is an always-on core skill (see CLAUDE.md's
standing-skill entry) and the DEFAULT for every rendered surface this skill produces — mockups in
Phase 2, the build in Phase 3, the permanent `_template/` in Phase 4. Classify the surface against
its `reference/sources.md` register (EXEMPT / SUBORDINATE / UNCLASSIFIED), then use its tokens,
motion durations and glyph rules rather than deciding taste per build. An app or widget built here
that invents its own palette, spacing or easing has skipped a standing skill, not exercised
judgment. Its flourish budget is counted, so a breach is a failure rather than an opinion.

The four skills below are **downstream checks against that default**, not alternatives to it. They
carry scored, checklist-driven frameworks and remain advisory — not binding like G-1's Vibe Coding
Rules — consulted at judgment, scaled to the personal/hobby scope of these builds, not as a
mandatory gate on every phase advance:
  `!RefactoringUI`         — visual hierarchy, spacing, color, depth, layout (Phases 2-4)
  `!UXHeuristics`          — usability audit, severity-rated (Phases 2-4)
  `!DesignEverydayThings`  — affordance/mental-model theory, for WHY something confuses (Phases 1-2, 4)
  `!Microinteractions`     — single-control polish: toggles, loading states, feedback timing (Phases 3-4)
Each scores out of 10 against a fixed diagnostic table rather than open-ended review prose — pull
one in when Luke or the agent wants a reproducible check on a mockup, a build, or a refactor-loop
change, not just an impression.

### 🛑 STANDING GUARDRAILS (all four phases)

**G-1 — The Vibe Coding Rules bind every file.**
  `Memory/Long-Term/Coding/vibe-coding-rules.md` is binding on every spec written and every file
  built. A rule may be broken ONLY when ALL THREE hold:
    (a) the agent asks Luke for permission, naming the rule by its ID (SR-2, PY-4, …);
    (b) a specific reason is given — what the rule costs here and what is gained;
    (c) Luke grants it explicitly.
  A granted exception is recorded in the registry's Rule Exceptions table AND in the
  documentation spec. Never assume, never grant silently, never carry an exception from one
  project into another. Absent permission, the rule wins and the design changes instead.

**G-2 — Nothing is deleted before its replacement is verified.**
  Every deletion in this lifecycle — mockups in Phase 3, the PRD/specs/registries in Phase 4 —
  happens only AFTER the thing that replaces it exists and has been checked file-by-file in its
  new location, and only after Luke confirms. Route the deletion through `!Checkpoint`. If the
  verification cannot be completed, **fail closed**: keep both copies and tell Luke.

**G-3 — Brevity and comprehensiveness are the pair.**
  Plain simple English throughout. ASCII diagrams where a shape is easier seen than read.
  No filler, no restating the obvious, no document that repeats another. If two documents say
  the same thing, one of them is wrong.

**G-4 — The registry is written as you go, not at the end.**
  Update it at the close of every working step, not at the close of the session. An agent that
  is interrupted mid-step must leave behind a registry that says what it was doing.

**G-5 — The wishlist's conflict scan is bound to the PRD's lifetime.**
  `wishlist.md` STEP 3 runs only while this project has a live PRD: Phases 1-3, and the start of
  Phase 4 before STEP 3 of `phase4-refactor.md` retires it. Once the PRD is gone the scan stops —
  not a gap, the expected end state. The wishlist itself keeps running; only the check against a
  document that no longer exists stops.

// EXECUTION_END

## ✅ OUTPUT
A project folder whose registry always answers three questions without reading anything else:
what is this, what phase is it in, what is the next step.

**Validation Check (Self-Test)**
```
VERIFY registry.md exists AND its phase: field is 1..4 AND exactly one next-step line is unchecked
VERIFY every granted Vibe-Coding exception appears in BOTH the registry and the documentation spec
VERIFY no deletion has occurred without a verified replacement recorded in the Phase Log
ELSE ➔ report the gap to Luke and repair the registry before doing any further work
```

**Error Path**
```
CATCH missing-registry     ➔ rebuild it from the folder contents, mark every field UNVERIFIED,
                             and ask Luke to confirm the phase before proceeding.
CATCH phase-file-missing   ➔ STOP. Name the missing file. Do not improvise the phase.
CATCH rules-file-missing   ➔ STOP. The Vibe Coding Rules are not optional input; without them
                             no spec is written. Report to Luke.
CATCH [*]                  ➔ write what is known to the registry, report plainly, hold.
```
