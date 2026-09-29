---
name: "!AppPRD"
description: "Phase 1 of !AppDevelopment — interview Luke about a new app or widget and write a short, complete Product Requirements Document in plain English into the app's permanent folder (_build/prd.md), alongside app-decisions.md."
type: Skill
status: Active
core_function: Generate
intent: "Get the purpose and the key design decisions onto one page before a single line of spec is written."
version: 2.1.0
dependencies: [templates/prd.md, templates/app-decisions.md]
calibration:
  context: [PersonalResearch]
  level: Extended
  scope: Local
memory_footprint:
  read: [Memory/Long-Term/Coding]
  write: [System/Apps, System/Widgets]
---

## ⚡ TRIGGER
Phase 1 of `!AppDevelopment`, or `!AppPRD` directly.
Fires on: "I want to build a widget that…", "new app idea", "write a PRD for…", "start a new build".

## 🛠️ LOGIC

// EXECUTION_START

**STEP 1 — Settle name and kind**
  ASK Luke for the project name (used verbatim as the folder name) and confirm `kind` (app | widget)
  using the test from `!AppDevelopment` STEP 0: can it be opened on its own, nothing else already
  running, and it is the whole thing? Yes ➔ app. No ➔ widget — optional embeddability alone does
  not make it a widget; needing a host to run at all does.
  IF `kind` = widget ➔ ASK what hosts it (a page, another app, a widget suite/chassis, or the
  local OS/shell — e.g. a menu-bar item, a cron/launchd job, a CLI invoked from a folder).
  A widget with no named host is not yet specified.

**STEP 2 — Create the permanent folder**
  SET `home` = `System/Apps/<Name>/` (app) or `System/Widgets/<Name>/` (widget).
  ASSERT `home/_build/prd.md` does not already exist
    ELSE ➔ it is an existing project; hand back to `!AppDevelopment` STEP 1 to resume, do not overwrite.
  CREATE `home/` and `home/_build/`
  WRITE `home/app-decisions.md` from `templates/app-decisions.md` (tables empty)
  WRITE `home/_build/prd.md`   from `templates/prd.md`, skeleton only
  Both files exist from minute one — an interrupted interview leaves a PRD on disk that shows
  exactly how far it got, and nothing needs moving later.
  IF a tracked project exists for this build ➔ set its Next Action to "finish the PRD interview".

**STEP 3 — Interview, one question at a time**
  Walk these in order. Offer a recommended answer with each question so Luke can accept or
  correct rather than compose from nothing. Write each answer into the PRD as it is given.
    1. Purpose — what is this for, in one or two sentences. Who uses it and when.
    2. The core job — the single thing it must do well. If there are two, ask which is the app.
    3. Inputs and outputs — what goes in, what comes out, where each lives.
    4. The shape on screen — draw an ASCII layout sketch and get it corrected. Cheaper than a mockup.
    5. UI (apps only) — `!HouseStyle`'s verdict for this surface, the one rule for where visual
       values must live, and a first-pass palette/type/spacing intent. Rough is fine — Phase 2's
       mockups test it, and the code carries the real values once built. Skip for a widget; its
       visual contract lives with its host chassis.
    6. Key behaviours — the handful of interactions that define it. Not an exhaustive list.
    7. Boundaries — what it deliberately does NOT do. This section earns its place every time.
    8. Data — what it stores, where, and what happens to it when the app closes.
    9. For a widget: the host contract — how it is embedded, what it receives, what it emits.
   10. Constraints — offline? stdlib only? a specific file it must read? a size it must fit?
   11. Done looks like — the checkable statements that mean it works.
  Use an ASCII diagram wherever a shape, a flow, or a state change is easier seen than read.
  Never draw one for decoration.

**STEP 4 — Optional notes**
  IF Luke volunteers a stray characteristic, a nice-to-have, a worry, or a reference to something
  he likes ➔ APPEND it to the PRD's `## Notes` section verbatim, unpolished.
  This section is optional. An empty Notes section is deleted, not left as a stub.

**STEP 5 — Trim to length**
  REPEAT: read the PRD back and cut every sentence that (a) restates another sentence,
  (b) describes implementation rather than requirement, or (c) would be obvious to a reader who
  understands the purpose.
  UNTIL nothing further can be cut without losing a requirement.
  Brevity and comprehensiveness are the two tests, and they are applied together — the PRD is
  finished when it is short AND nothing a builder needs is missing.

**STEP 6 — Read it back and check the constraints**
  SHOW the PRD to Luke in full.
  FLAG any requirement that will collide with the Vibe Coding Rules (a dependency, a framework,
  a performance cost). Raise it now, as a design question, not later as an exception request (G-1).
  AWAIT Luke's approval ELSE loop to STEP 3 on the sections he names.

**STEP 7 — Close the phase**
  SET the PRD's `status:` = approved. APPEND to `app-decisions.md` → Approvals:
  today · "PRD approved" · the PRD version.
  STATE that Phase 2 may still send the PRD back for rewriting, and that this is normal.
  HAND to `phase2-specs.md`.

// EXECUTION_END

## ✅ OUTPUT
`System/Apps/<Name>/` (or `System/Widgets/<Name>/`) containing `app-decisions.md` and
`_build/prd.md`.

**Validation Check (Self-Test)**
```
VERIFY the PRD names purpose, core job, I/O, boundaries, data, done-looks-like
VERIFY an app PRD's UI section names a HouseStyle verdict, the one rule, and a first-pass intent
VERIFY a widget PRD names its host and the host contract, and carries no UI section
VERIFY the PRD's status is approved AND app-decisions.md records that approval with its version
VERIFY the PRD contains no implementation detail that belongs in a spec
ELSE ➔ return to the failing step
```

**Error Path**
```
CATCH folder-exists   ➔ do not overwrite; resume via !AppDevelopment STEP 1.
CATCH luke-unavailable ➔ save the partial PRD with its open questions marked "awaiting Luke"
                          in the PRD itself, hold. Never invent an answer to an interview question.
CATCH [*]             ➔ save what is written, report, hold.
```
