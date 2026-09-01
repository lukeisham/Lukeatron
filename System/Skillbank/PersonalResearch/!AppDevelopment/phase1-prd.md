---
name: "!AppPRD"
description: "Phase 1 of !AppDevelopment — interview Luke about a new app or widget and write a short, complete Product Requirements Document in plain English, in a new Sandbox folder, alongside the development registry that makes the work resumable."
type: Skill
status: Active
core_function: Generate
intent: "Get the purpose and the key design decisions onto one page before a single line of spec is written."
version: 1.0.0
dependencies: [templates/prd.md, templates/registry.md]
calibration:
  context: [PersonalResearch]
  level: Extended
  scope: Local
memory_footprint:
  read: [Memory/Long-Term/Coding]
  write: [System/Sandbox]
---

## ⚡ TRIGGER
Phase 1 of `!AppDevelopment`, or `!AppPRD` directly.
Fires on: "I want to build a widget that…", "new app idea", "write a PRD for…", "start a new build".

## 🛠️ LOGIC

// EXECUTION_START

**STEP 1 — Settle name and kind**
  ASK Luke for the project name (used verbatim as the folder name) and confirm `kind` (app | widget).
  IF `kind` = widget ➔ ASK what hosts it (a page, another widget suite, the local computer, a
  shell/chassis it plugs into). A widget with no named host is not yet specified.

**STEP 2 — Create the working folder**
  ASSERT `System/Sandbox/<name>/` does not already exist
    ELSE ➔ it is an existing project; hand back to `!AppDevelopment` STEP 1 to resume, do not overwrite.
  CREATE `System/Sandbox/<name>/`
  WRITE `System/Sandbox/<name>/registry.md`   from `templates/registry.md`, phase = 1
  WRITE `System/Sandbox/<name>/<name>-prd.md` from `templates/prd.md`, skeleton only
  Both files exist from minute one, before the interview finishes — an interrupted interview
  must still leave a resumable folder behind (G-4).

**STEP 3 — Interview, one question at a time**
  Walk these in order. Offer a recommended answer with each question so Luke can accept or
  correct rather than compose from nothing. Write each answer into the PRD as it is given.
    1. Purpose — what is this for, in one or two sentences. Who uses it and when.
    2. The core job — the single thing it must do well. If there are two, ask which is the app.
    3. Inputs and outputs — what goes in, what comes out, where each lives.
    4. The shape on screen — draw an ASCII layout sketch and get it corrected. Cheaper than a mockup.
    5. Key behaviours — the handful of interactions that define it. Not an exhaustive list.
    6. Boundaries — what it deliberately does NOT do. This section earns its place every time.
    7. Data — what it stores, where, and what happens to it when the app closes.
    8. For a widget: the host contract — how it is embedded, what it receives, what it emits.
    9. Constraints — offline? stdlib only? a specific file it must read? a size it must fit?
   10. Done looks like — the checkable statements that mean it works.
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
  AWAIT Luke's approval THEN update the registry ELSE loop to STEP 3 on the sections he names.

**STEP 7 — Close the phase**
  SET registry `phase:` = 2, PRD status = approved, stamp the Phase Log.
  STATE that Phase 2 may still send the PRD back for rewriting, and that this is normal.
  HAND to `phase2-specs.md`.

// EXECUTION_END

## ✅ OUTPUT
`System/Sandbox/<name>/` containing exactly two files: `<name>-prd.md` and `registry.md`.

**Validation Check (Self-Test)**
```
VERIFY the PRD names purpose, core job, I/O, boundaries, data, done-looks-like
VERIFY a widget PRD names its host and the host contract
VERIFY registry phase == 2 AND the PRD is listed in the registry's Documents table
VERIFY the PRD contains no implementation detail that belongs in a spec
ELSE ➔ return to the failing step
```

**Error Path**
```
CATCH folder-exists   ➔ do not overwrite; resume via !AppDevelopment STEP 1.
CATCH luke-unavailable ➔ save the partial PRD, mark the open questions in the registry as
                          "awaiting Luke", hold. Never invent an answer to an interview question.
CATCH [*]             ➔ update the registry with the current step, report, hold.
```
