---
name: "!AppBuildPrep"
description: "Phase 3 of !AppDevelopment — the one-way door. Delete the mockups once the specs are verified to carry everything, and write build.md: the copy-paste prompt that stands up an Opus boss agent with Haiku and Sonnet subagents to build from the specs straight into the app's permanent folder, on real data."
type: Skill
status: Active
core_function: System
intent: "Close design and hand a build team everything it needs; the files on disk are the resume point."
version: 2.1.0
dependencies: [templates/build.md, templates/app-decisions.md]
calibration:
  context: [PersonalResearch]
  level: Extended
  scope: Local
memory_footprint:
  read: [Memory/Long-Term/Coding]
  write: [System/Apps, System/Widgets, System/Sandbox]
---

## ⚡ TRIGGER
Phase 3 of `!AppDevelopment`, or `!AppBuildPrep` directly on a project whose `app-decisions.md`
records "design closed".

## 🛠️ LOGIC

// EXECUTION_START

**STEP 0 — Confirm the door is closing**
  ASSERT `app-decisions.md` records "design closed" (Phase 2 STEP 8) ELSE return to Phase 2.
  STATE to Luke: from here the skill does not return to the PRD or to mockups.

**STEP 1 — Completeness check before anything is deleted**
  ASSERT the PRD is approved and every spec's `prd_version:` matches it
  ASSERT `_build/specs/documentation.spec.md` exists
  READ each mockup and ASK of each: is every behaviour it shows written down in a spec?
    IF no ➔ write it into the owning spec now. This is the last chance; the mockup is about to go.
  ELSE ➔ STOP and report which check failed. Nothing is deleted while a check is failing.

**STEP 2 — Delete the mockups**
  Only now, and only with Luke's confirmation, DELETE `System/Sandbox/<Name>-mockups/`.
  ROUTE through `!Checkpoint`.
  IF Luke does not confirm ➔ keep them and proceed. Failing closed is always allowed.

**STEP 3 — Write the build prompt**
  WRITE `_build/build.md` from `templates/build.md`, filled in for this project.
  It is a document Luke copies and pastes into a fresh session. It sets up the agent tiering:
    - **Opus is the boss.** It decides, coordinates, resolves conflicts between specs, and owns
      every judgement call. It does not do bulk work itself.
    - **Haiku subagents do the boring bulk grunt work** — repetitive file creation, mechanical
      transforms, find-and-replace across many files, scaffolding, fixture generation, inventory
      and search sweeps.
    - **Sonnet subagents do the specialised building and reviewing** — the modules that need real
      craft, and the review passes over what Haiku and Sonnet produced.
  It states where the code goes: the app's folder root (`System/Apps/<Name>/`), live on real
  data, with no template or test copy. It carries the G-2 protection: fixture data for tests, a
  dated copy of each real data file before the app's first write to it, a commit per module.
  It restates G-1 (Vibe Coding Rules; exceptions only by explicit permission, recorded in
  `app-decisions.md`). An interrupted build resumes from the code, the specs and the git log.
  IF `kind` = widget ➔ the build target is `System/Widgets/<Name>/`, and fill in the template's
  widget-only "Done when" clause with the host app named in the PRD. The build may touch the host
  app only at the seam the Host contract names (the mount point), committed separately.
  IF `kind` = app ➔ delete that clause.

**STEP 4 — Hand over**
  SHOW Luke the build prompt and tell him plainly that this skill's part is done until the build
  runs, at which point Phase 4 retires `_build/`.
  UPDATE the project's Next Action to "run the build from `_build/build.md`".

// EXECUTION_END

## ✅ OUTPUT
`_build/` holding the frozen PRD, the current specs and `build.md` ready to paste. No mockups.

**Validation Check (Self-Test)**
```
VERIFY every spec's prd_version equals the PRD version
VERIFY every behaviour previously shown only in a mockup now appears in a spec
VERIFY build.md names the folder root as the build target and states the three agent tiers
VERIFY build.md carries the G-2 data-protection rules and the Vibe Coding Rules clause
VERIFY build.md's widget-only "Done when" clause names the host for a widget, and is deleted for an app
ELSE ➔ do not hand over
```

**Error Path**
```
CATCH stale-spec                 ➔ STOP. Return to Phase 2 for that spec only. Delete nothing.
CATCH mockup-behaviour-unspecced ➔ write it into the spec before deleting; if it cannot be
                                   written, keep the mockups and hold.
CATCH checkpoint-unavailable     ➔ fail closed. Keep the mockups, continue.
CATCH [*]                        ➔ report, hold.
```
