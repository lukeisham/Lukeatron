---
name: "!AppSpecs"
description: "Phase 2 of !AppDevelopment — derive a modular set of technical specs from the approved PRD under the Vibe Coding Rules, always including one documentation spec, build mockups for feedback, and propagate any PRD rewrite back through the specs via their prd_version stamps."
type: Skill
status: Active
core_function: Generate
intent: "Turn an approved PRD into the smallest set of modular specs a build team can work from, proved out against mockups Luke can actually look at."
version: 2.1.0
dependencies: [templates/doc-spec.md, templates/app-decisions.md]
calibration:
  context: [PersonalResearch]
  level: Extended
  scope: Local
memory_footprint:
  read: [Memory/Long-Term/Coding, Memory/Long-Term/Style-Guide, System/Templates/Template_TechSpec.md]
  write: [System/Apps, System/Widgets, System/Sandbox]
---

## ⚡ TRIGGER
Phase 2 of `!AppDevelopment`, or `!AppSpecs` directly on a project whose PRD is approved in `app-decisions.md`.

## 🛠️ LOGIC

// EXECUTION_START

**STEP 0 — Load the standard**
  READ `Memory/Long-Term/Coding/vibe-coding-rules.md` in full. It binds every spec written here (G-1).
  READ the approved PRD (`_build/prd.md`). READ `app-decisions.md`.
  A spec that cannot be written without breaking a rule is a spec that needs a permission request,
  not a spec that quietly breaks it.

**STEP 1 — Decide the spec set from the PRD**
  The PRD determines both the number and the kind of specs. There is no fixed list.
  SPLIT the PRD's behaviours into modules along these seams, in order of preference:
    - one job per module (SR-1) — the module is named by what it does
    - a seam where data changes hands
    - a seam where the host-app boundary sits (widgets)
    - a seam where one part could be swapped out without touching the others
  MATCH size CASE
    small widget, one job     ➔ 2 specs: the widget spec + the documentation spec
    typical widget or app     ➔ 3–5 specs
    suite or multi-surface    ➔ one per surface + shared-module specs + the documentation spec
  IF the split produces a module that cannot be described in one page ➔ split it again.
  IF two specs keep referring to each other on every point ➔ they are one module; merge them.
  Show the proposed spec list to Luke BEFORE writing any spec body.

**STEP 2 — Always write the documentation spec**
  Exactly one documentation spec exists in every project, no exceptions, whatever the size.
  WRITE it to `_build/specs/documentation.spec.md` from `templates/doc-spec.md`. Its scope is deliberately narrow (SR-7) — it carries
  ONLY:
    - cross-app behaviour: what talks to what across a module or host boundary, plus any
      architecture that is itself cross-app or multi-file (the reasoning behind a shared seam,
      not just its runtime contract) — no single file's own comments can carry either
    - an ASCII-style navigation map: structure only, no per-file "what it does / why" commentary
    - a pointer to `app-decisions.md` for granted rule exceptions (G-1) — not a copy
  It carries NONE of: function walk-throughs, restated logic, per-file prose, usage tutorials,
  a decisions log, or anything the code says for itself through its own names. The code is
  self-documenting — there is no "key decisions" section. IF a decision comes up that Luke
  explicitly wants logged (not every decision — only one he flags) ➔ APPEND it straight to
  `app-decisions.md` → Key decisions the moment he flags it. Never draft it here first.
  Write it knowing where it ends up: in Phase 4 no spec survives — both remaining sections fold
  down into README.md unchanged (they are already in their final, light shape), then the whole
  spec is deleted with the rest.

**STEP 3 — Write each remaining spec**
  Write each to `_build/specs/<module>.spec.md`, based on `System/Templates/Template_TechSpec.md`.
  Stamp each with `prd_version:` — the PRD version it was written against.
  Each spec is modular: it states its own job, its inputs, its outputs, its contract with its
  neighbours, and its verification checklist. It does not describe its neighbours' internals.
  Cite the PRD requirement each section serves, so a PRD change has a traceable landing point.

**STEP 4 — Rule-exception gate**
  IF a spec cannot meet the PRD without breaking a Vibe Coding Rule ➔
    STOP writing that section.
    ASK Luke: name the rule by ID, state exactly what breaking it buys and what it costs,
    and offer the compliant alternative alongside it.
    AWAIT explicit permission
      granted ➔ APPEND it at once to `app-decisions.md` → Rule exceptions, with the reason, then
                continue.
      refused ➔ redesign to comply. The rule wins.
  Never proceed on assumed permission. Never let an exception spread beyond the spec it was
  granted for.

**STEP 5 — Mockups**
  BUILD mockups of the surfaces the PRD describes — enough for Luke to react to, not a prototype.
  Mockups live in `System/Sandbox/<Name>-mockups/` — the only thing this skill puts in Sandbox.
  They are throwaway by design; they are deleted in Phase 3 and no build code comes from them.
  IF `kind` = widget ➔ show the widget in place inside its host app (a screenshot or copy of the
  host app's surface with the widget drawn in), using the host app's tokens — never standalone.

  Draw on two design-system references for componentry, layout, and visual language — never copy
  verbatim, use them as a vocabulary to remix:
    - Material Design 3 — https://m3.material.io/
    - Ant Design — https://ant.design/

  Mockups always come in a batch of SIX, covering one seam of the PRD's surfaces per pass:
    2 favouring FORM     — visual polish, personality, motion/interaction flourish leads
    2 favouring FUNCTION — density, clarity, speed-of-use leads; decoration stripped to what earns
                            its place
    2 BALANCED           — a deliberate middle between form and function, AND the two balanced
                            options must visibly contrast each other (different layout grammar,
                            palette, or component language) — they are not two shades of the same
                            idea
  Every one of the six is a genuine attempt at the same surface, not a form-vs-function strawman.
  Name each file with its category (`form-…`, `function-…`, `balance-…`) so the six-way split is
  visible at a glance.
  SHOW them to Luke. COLLECT feedback.

**STEP 6 — Propagate change**
  A change can enter from three directions. All three land in the PRD first.
    MATCH source CASE
      mockup feedback changes a behaviour ➔ update the PRD, THEN the affected specs
      Luke rewrites the PRD himself       ➔ diff it against the last version (git), list every
                                            spec the diff touches, then rewrite those specs
      a spec reveals the PRD was wrong    ➔ propose the PRD edit to Luke first; the PRD leads
  ON any PRD change:
    INCREMENT the PRD's `version:`
    Every spec whose `prd_version:` is now lower is stale by definition — no list to maintain.
    A spec stops being stale when it is rewritten and its `prd_version:` bumped to match.
  ASSERT no spec's `prd_version:` is behind the PRD at the end of the phase ELSE it cannot close.

**STEP 7 — Loop**
  REPEAT STEP 3 → STEP 6 UNTIL Luke says the PRD is right and every spec is current.

**STEP 8 — Close the phase**
  WARN Luke plainly: Phase 3 is a one-way door. After it begins, this skill does not return to
  the PRD or the mockups.
  AWAIT confirmation THEN APPEND to `app-decisions.md` → Approvals: today · "design closed; specs
  approved" · PRD version. Hand to `phase3-buildprep.md`.

// EXECUTION_END

## ✅ OUTPUT
`_build/` holding the PRD and `specs/` (one documentation spec plus the PRD-determined module
specs), `app-decisions.md` recording the design-closed approval, and
`System/Sandbox/<Name>-mockups/` awaiting deletion in Phase 3.

**Validation Check (Self-Test)**
```
VERIFY exactly one documentation spec exists and stays within its three permitted sections
VERIFY the documentation spec carries no key-decisions section — the code documents itself
VERIFY every spec traces its sections back to PRD requirements
VERIFY every spec's prd_version equals the PRD's version
VERIFY every rule exception appears in app-decisions.md, with a reason
VERIFY no spec assumes a dependency, framework, or tool that was never granted (SR-2)
ELSE ➔ return to the failing step
```

**Error Path**
```
CATCH prd-missing        ➔ STOP. Phase 2 has no input. Return to Phase 1.
CATCH rules-missing      ➔ STOP. No spec is written without the Vibe Coding Rules loaded.
CATCH permission-unclear ➔ treat as refused. Redesign to comply and tell Luke what you did.
CATCH [*]                ➔ leave the in-flight spec's prd_version unbumped (so it reads stale), report, hold.
```
