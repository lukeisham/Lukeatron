---
name: "!AppBuildPrep"
description: "Phase 3 of !AppDevelopment — the one-way door. Refresh the registry into a build-state registry, delete the mockups once the specs are verified to carry everything, and write build.md: the copy-paste prompt that stands up an Opus boss agent with Haiku and Sonnet subagents to build from the specs."
type: Skill
status: Active
core_function: System
intent: "Close design and hand a build team everything it needs, with a registry that survives an interrupted build."
version: 1.0.0
dependencies: [templates/build.md, templates/registry.md]
calibration:
  context: [PersonalResearch]
  level: Extended
  scope: Local
memory_footprint:
  read: [Memory/Long-Term/Coding]
  write: [System/Sandbox]
---

## ⚡ TRIGGER
Phase 3 of `!AppDevelopment`, or `!AppBuildPrep` directly on a project whose registry says phase 3.

## 🛠️ LOGIC

// EXECUTION_START

**STEP 0 — Confirm the door is closing**
  STATE to Luke: from here the skill does not return to the PRD or to mockups. Design is closed.
  AWAIT explicit confirmation ELSE return to phase 2 and reset the registry phase to 2.

**STEP 1 — Completeness check before anything is deleted (G-2)**
  ASSERT the PRD is approved and its version matches the registry
  ASSERT zero specs are marked stale
  ASSERT the documentation spec exists
  READ each mockup and ASK of each: is every behaviour it shows written down in a spec?
    IF no ➔ write it into the owning spec now. This is the last chance; the mockup is about to go.
  ELSE ➔ STOP and report which check failed. Nothing is deleted while a check is failing.

**STEP 2 — Refresh the registry**
  REWRITE `registry.md` from `templates/registry.md` in its **build** shape:
    - phase 3, design closed, PRD version frozen
    - the final spec list, each with a one-line statement of what it covers
    - a build task board: one row per spec/module, status `not started`
    - the Rule Exceptions table, carried across unchanged
    - a Resume block: what a cold agent should read first, in order
  The old design-phase content moves to the Phase Log as a summary, not as detail.

**STEP 3 — Delete the mockups**
  Only now, and only with Luke's confirmation, DELETE `System/Sandbox/<name>/_mockups/`.
  ROUTE through `!Checkpoint`.
  RECORD the deletion in the Phase Log with the date and the check that authorised it.
  IF Luke does not confirm ➔ keep them, mark them `retired, not deleted` in the registry, and
  proceed. Failing closed is always allowed.

**STEP 4 — Write the build prompt**
  WRITE `System/Sandbox/<name>/build.md` from `templates/build.md`, filled in for this project.
  It is a document Luke copies and pastes into a fresh session. It sets up the agent tiering:
    - **Opus is the boss.** It decides, coordinates, resolves conflicts between specs, and owns
      every judgement call. It does not do bulk work itself.
    - **Haiku subagents do the boring bulk grunt work** — repetitive file creation, mechanical
      transforms, find-and-replace across many files, scaffolding, fixture generation, inventory
      and search sweeps.
    - **Sonnet subagents do the specialised building and reviewing** — the modules that need real
      craft, and the review passes over what Haiku and Sonnet produced.
  It names the refreshed registry as the resume point if the context is refreshed or the build is
  interrupted, and it restates G-1: the Vibe Coding Rules bind the build, exceptions only by
  explicit permission, and the granted exceptions are listed in the file.

**STEP 5 — Hand over**
  SHOW Luke the build prompt and tell him plainly that this skill's part is done until Phase 4.
  SET registry `phase:` = 4-pending. The phase advances to 4 when a built app or widget exists.

// EXECUTION_END

## ✅ OUTPUT
A Sandbox folder holding the frozen PRD, the current specs, a build-shaped registry, and
`build.md` ready to paste. No mockups.

**Validation Check (Self-Test)**
```
VERIFY no stale specs, PRD version frozen and recorded
VERIFY every behaviour previously shown only in a mockup now appears in a spec
VERIFY _mockups/ is deleted AND the deletion is logged with its authorising check
VERIFY build.md names the registry as the resume point and states the three agent tiers
VERIFY build.md carries the Vibe Coding Rules clause and the granted exceptions list
ELSE ➔ do not advance the phase
```

**Error Path**
```
CATCH stale-spec          ➔ STOP. Return to Phase 2 for that spec only. Delete nothing.
CATCH mockup-behaviour-unspecced ➔ write it into the spec before deleting; if it cannot be
                            written, keep the mockups and hold.
CATCH checkpoint-unavailable ➔ fail closed. Keep the mockups, mark them retired, continue.
CATCH [*]                 ➔ report, hold, leave the registry accurate.
```
