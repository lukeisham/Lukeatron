---
name: "!AppDevelopment"
description: "Router for the four-phase app/widget development lifecycle — PRD (including its UI section, the app's design intent), technical specs + mockups, build prep, and post-build retirement of the build documents. Everything lives in the app's own folder from day one; the phase is read off which files exist, and the one state file is app-decisions.md (Luke's approvals, key decisions + granted rule exceptions). Apps are standalone web apps, opened directly — they ARE the front door. Widgets need a host — another app, a page, a chassis, or the local OS/shell — and are never opened as their own front door."
type: Skill
status: Active
core_function: System
intent: "Take an app or widget from a blank idea to a working app on real data in its permanent folder, one gated phase at a time, with only Luke's approvals, key decisions and granted exceptions recorded — everything else is read off the files themselves."
version: 2.1.0
dependencies:
  - phase1-prd.md
  - phase2-specs.md
  - phase3-buildprep.md
  - phase4-retire.md
  - templates/app-decisions.md
  - templates/prd.md
  - templates/doc-spec.md
  - templates/build.md
  - templates/readme.md
calibration:
  context: [PersonalResearch]
  level: Extended
  scope: Local
memory_footprint:
  read: [Memory/Long-Term/Coding, Memory/Long-Term/Style Guide, System/Templates]
  write: [System/Apps, System/Widgets, System/Sandbox]
---

## ⚡ TRIGGER
Primary: `!AppDevelopment`
Fires when: Luke asks to "build an app", "build a widget", "make a new widget", "start a new app",
"write a PRD for", "spec out this app", "resume the app build", "where is the <name> build up to",
"retire the build docs for <name>", or names any phase skill directly (`!AppPRD`, `!AppSpecs`,
`!AppBuildPrep`, `!AppRetire`).
Not this skill: wishlist ideas for an app — that is `!AppWishlist`, a separate dumping-ground skill.
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
  embeddability does not make something a widget.
  The distinction is load-bearing across every phase:
    Phase 1 — a widget's PRD carries a Host contract section; an app's PRD does not.
    Phase 2 — the documentation spec additionally covers the named host boundary for a widget.
    Phase 3 — a widget is not "done" until exercised inside its named host.
    Home    — `System/Apps/<Name>/` vs `System/Widgets/<Name>/`.
  Ask Luke if the request does not make it obvious.

**The folder — one home from day one**
```
System/Apps/<Name>/                (widgets: System/Widgets/<Name>/)
├── app-decisions.md     PERMANENT — Luke's approvals, key decisions + granted rule exceptions
├── wishlist.md          PERMANENT — owned by !AppWishlist, not by this skill
├── README.md · code · tests/      (from the build onward — no separate style file)
└── _build/              TEMPORARY — prd.md · specs/ · build.md; deleted in Phase 4
System/Sandbox/<Name>-mockups/     Phase 2 only; the ONLY thing this skill puts in Sandbox
```
  Everything is git-tracked except the mockups. Nothing is ever moved between locations.

**STEP 1 — Resolve the project and its phase (resume-safe entry point)**
  ASSERT a project name is known ELSE ask Luke for one, then continue.
  READ the folder, then `app-decisions.md`. The phase is read off the files — never guessed from
  conversation memory, never stored in a field:
```
  no folder, or no _build/prd.md          ➔ 1  (new project)
  prd.md, not approved in app-decisions   ➔ 1
  prd.md approved, specs being written    ➔ 2
  "design closed" approved                ➔ 3  (write build.md; the build runs from it)
  code at the folder root runs + _build/  ➔ 4  (retire the build docs)
  code, no _build/                        ➔ built — refinement is ordinary editing (see Phase 4)
```
  A spec is stale when its `prd_version:` is lower than the PRD's `version:` — read, not tracked.
  REPORT to Luke in three lines: the project, the phase, the next step. The next step also lives
  as a Next Action in the project's own registry (`Memory/Medium-Term/Projects/<id>/`), which is
  where `!ProjectSweep` and the Dashboard see it.
  IF the folder exists but the files contradict each other (e.g. code but no approved PRD) ➔
  report what you see and ask Luke; do not guess.

**STEP 2 — Dispatch**
  MATCH `phase` CASE
    1 ➔ READ `phase1-prd.md`       and follow it   // folder + PRD + app-decisions.md
    2 ➔ READ `phase2-specs.md`     and follow it   // specs + mockups, iterating
    3 ➔ READ `phase3-buildprep.md` and follow it   // close design, write build.md
    4 ➔ READ `phase4-retire.md`    and follow it   // README, delete _build/
  Load exactly ONE phase file. Never read ahead.

**STEP 3 — Cold entry into Phase 4**
  An app or widget that already exists with no `_build/` can be handed to `phase4-retire.md`
  directly: there is nothing to delete, so it writes the missing README / app-decisions.md only.

**STEP 4 — Phase advance is an approval, recorded at once**
  A phase ends only when Luke says he is happy with it. On advance:
    APPEND a row to `app-decisions.md` → Approvals (date · what · version)
    UPDATE the project's Next Action to the next phase's first step
    STATE to Luke what is now closed and what the next phase will not revisit
  Phases 1→2 loop freely. **2→3 is a one-way door**: once "design closed" is approved, the skill
  does not return to the PRD or to mockups. Say this out loud before recording it.

### 🎨 DESIGN & UX REFERENCE SET

**`!HouseStyle` comes FIRST and is not advisory.** It is an always-on core skill and the DEFAULT
for every rendered surface this skill produces — mockups in Phase 2, the build in Phase 3, the
app as it lives on. Classify the surface against its `reference/sources.md` register (EXEMPT /
SUBORDINATE / UNCLASSIFIED), then use its tokens, motion durations and glyph rules rather than
deciding taste per build. Its flourish budget is counted, so a breach is a failure, not an opinion.

**The code is the style guide — no separate style file is written.** Design intent is captured
once, as the PRD's own `## UI` section (Phase 1: HouseStyle verdict, the one rule, a first-pass
palette/type/spacing intent), tested against the mockups in Phase 2, then built. The token/CSS
files that result ARE the record from then on; nothing restates their values. The one exception:
if styling is split across more than one file, or a HouseStyle classification governs how every
file relates to a shared chassis, that single cross-file fact lands in README (Phase 4) — the
code's own comments cannot carry it, and README carries no other style detail. A widget's visual
contract lives with its host chassis instead; its PRD carries no `## UI` section.

Downstream checks against that default — advisory, consulted at judgment, scaled to personal
builds: `!RefactoringUI` (visual, Phases 2-4) · `!UXHeuristics` (usability, Phases 2-4) ·
`!DesignEverydayThings` (affordance, Phases 1-2, 4) · `!Microinteractions` (single-control polish,
Phases 3-4). Each scores out of 10 against a fixed table.

### 🛑 STANDING GUARDRAILS (all four phases)

**G-1 — The Vibe Coding Rules bind every file.**
  `Memory/Long-Term/Coding/vibe-coding-rules.md` is binding on every spec written and every file
  built. A rule may be broken ONLY when ALL THREE hold:
    (a) the agent asks Luke for permission, naming the rule by its ID (SR-2, PY-4, …);
    (b) a specific reason is given — what the rule costs here and what is gained;
    (c) Luke grants it explicitly.
  A granted exception is recorded in `app-decisions.md` → Rule exceptions, and nowhere else —
  README and the documentation spec point to it rather than copying it. Never grant silently,
  never carry an exception from one project into another.

**G-2 — Real data from the first run, protected.**
  Apps are built straight into their home and run on Luke's real data. There is no template or
  test copy. The protection instead:
    - tests use fixture / obviously fake data inside `tests/`, never real data;
    - before the app's FIRST write to any real data file, take a dated copy of that file
      (`Memory/` is not in git — Dropbox history is the only other net);
    - commit the code before each change, so any change can be reverted.
  Deleting `_build/` (Phase 4) happens only after the build is verified and Luke confirms, routed
  through `!Checkpoint`. Git history keeps the deleted documents.

**G-3 — Brevity and comprehensiveness are the pair.**
  Plain simple English throughout. ASCII diagrams where a shape is easier seen than read.
  If two documents say the same thing, one of them is wrong.

**G-4 — Record an approval or exception the moment Luke gives it.**
  `app-decisions.md` is written as decisions happen, not at the end of a session. Everything else
  an interrupted agent needs is on disk in the PRD, specs, `build.md` and the code.

// EXECUTION_END

## ✅ OUTPUT
An app folder whose files answer "what is this and how far along is it" by themselves, plus an
`app-decisions.md` that answers "what has Luke approved, why the build is shaped as it is, and
which rule breaks are deliberate".

**Validation Check (Self-Test)**
```
VERIFY the project lives in System/Apps/<Name>/ (or System/Widgets/<Name>/) with app-decisions.md
VERIFY no registry.md, refactor-registry.md, _template/ or _test/ was created
VERIFY every granted Vibe-Coding exception appears in app-decisions.md
VERIFY nothing but mockups was written to System/Sandbox/
ELSE ➔ report the gap to Luke and repair before doing any further work
```

**Error Path**
```
CATCH missing-app-decisions ➔ rebuild it from the PRD's status line and any README exceptions
                              section, mark every row UNVERIFIED, ask Luke to confirm.
CATCH phase-file-missing    ➔ STOP. Name the missing file. Do not improvise the phase.
CATCH rules-file-missing    ➔ STOP. The Vibe Coding Rules are not optional input; report to Luke.
CATCH [*]                   ➔ report plainly, hold.
```
