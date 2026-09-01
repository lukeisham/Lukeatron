---
name: "!AppSpecs"
description: "Phase 2 of !AppDevelopment — derive a modular set of technical specs from the approved PRD under the Vibe Coding Rules, always including one documentation spec, build mockups for feedback, and propagate any PRD rewrite back through the specs via the registry."
type: Skill
status: Active
core_function: Generate
intent: "Turn an approved PRD into the smallest set of modular specs a build team can work from, proved out against mockups Luke can actually look at."
version: 1.0.0
dependencies: [templates/doc-spec.md, templates/registry.md]
calibration:
  context: [PersonalResearch]
  level: Extended
  scope: Local
memory_footprint:
  read: [Memory/Long-Term/Coding, Memory/Long-Term/Style Guide, System/Templates/Template_TechSpec.md]
  write: [System/Sandbox]
---

## ⚡ TRIGGER
Phase 2 of `!AppDevelopment`, or `!AppSpecs` directly on a project whose registry says phase 2.

## 🛠️ LOGIC

// EXECUTION_START

**STEP 0 — Load the standard**
  READ `Memory/Long-Term/Coding/vibe-coding-rules.md` in full. It binds every spec written here (G-1).
  READ the approved PRD. READ the registry.
  A spec that cannot be written without breaking a rule is a spec that needs a permission request,
  not a spec that quietly breaks it.

**STEP 1 — Decide the spec set from the PRD**
  The PRD determines both the number and the kind of specs. There is no fixed list.
  SPLIT the PRD's behaviours into modules along these seams, in order of preference:
    - one job per module (SR-1) — the module is named by what it does
    - a seam where data changes hands
    - a seam where the host boundary sits (widgets)
    - a seam where one part could be swapped out without touching the others
  MATCH size CASE
    small widget, one job     ➔ 2 specs: the widget spec + the documentation spec
    typical widget or app     ➔ 3–5 specs
    suite or multi-surface    ➔ one per surface + shared-module specs + the documentation spec
  IF the split produces a module that cannot be described in one page ➔ split it again.
  IF two specs keep referring to each other on every point ➔ they are one module; merge them.
  Write the proposed spec list to the registry and show it to Luke BEFORE writing any spec body.

**STEP 2 — Always write the documentation spec**
  Exactly one documentation spec exists in every project, no exceptions, whatever the size.
  WRITE it from `templates/doc-spec.md`. Its scope is deliberately narrow (SR-7) — it carries
  ONLY:
    - cross-widget / cross-app behaviour: what talks to what, across a module or host boundary
    - key architectural decisions and key functional decisions, each with its reason
    - a lightweight ASCII navigation map: what lives where, and why
    - any granted Vibe-Coding rule exception (G-1)
  It carries NONE of: function walk-throughs, restated logic, per-file prose, usage tutorials,
  or anything the code says for itself through its own names.
  Write it knowing where it ends up: in Phase 4 no spec survives, and this one is folded down into
  the template's `README.md` and then deleted. Every line should still earn its place there.

**STEP 3 — Write each remaining spec**
  Base each on `System/Templates/Template_TechSpec.md`.
  Each spec is modular: it states its own job, its inputs, its outputs, its contract with its
  neighbours, and its verification checklist. It does not describe its neighbours' internals.
  Cite the PRD requirement each section serves, so a PRD change has a traceable landing point.

**STEP 4 — Rule-exception gate**
  IF a spec cannot meet the PRD without breaking a Vibe Coding Rule ➔
    STOP writing that section.
    ASK Luke: name the rule by ID, state exactly what breaking it buys and what it costs,
    and offer the compliant alternative alongside it.
    AWAIT explicit permission
      granted ➔ record it in the registry's Rule Exceptions table AND in the documentation spec,
                with the reason, then continue.
      refused ➔ redesign to comply. The rule wins.
  Never proceed on assumed permission. Never let an exception spread beyond the spec it was
  granted for.

**STEP 5 — Mockups**
  BUILD mockups of the surfaces the PRD describes — enough for Luke to react to, not a prototype.
  Mockups live in `System/Sandbox/<name>/_mockups/` and are listed in the registry.
  They are throwaway by design; they are deleted in Phase 3 (G-2) and no build code comes from them.
  SHOW them to Luke. COLLECT feedback.

**STEP 6 — Propagate change**
  A change can enter from three directions. All three land in the registry first.
    MATCH source CASE
      mockup feedback changes a behaviour ➔ update the PRD, THEN the affected specs
      Luke rewrites the PRD himself       ➔ diff it against the registry's recorded PRD version,
                                            list every spec the diff touches, then rewrite those specs
      a spec reveals the PRD was wrong    ➔ propose the PRD edit to Luke first; the PRD leads
  ON any PRD change:
    INCREMENT the registry's PRD version
    MARK every affected spec `stale` in the registry's Documents table
    The registry now carries a visible reminder; no spec is marked current again until it has
    been rewritten against the new PRD.
  ASSERT no spec is left `stale` at the end of the phase ELSE the phase cannot close.

**STEP 7 — Loop**
  REPEAT STEP 3 → STEP 6 UNTIL Luke says the PRD is right and every spec is current.

**STEP 8 — Close the phase**
  SET registry `phase:` = 3, stamp the Phase Log.
  WARN Luke plainly: Phase 3 is a one-way door. After it begins, this skill does not return to
  the PRD or the mockups.
  AWAIT confirmation THEN hand to `phase3-buildprep.md`.

// EXECUTION_END

## ✅ OUTPUT
`System/Sandbox/<name>/` containing the PRD, the registry, `_specs/` with one documentation spec
plus the PRD-determined module specs, and `_mockups/` awaiting deletion in Phase 3.

**Validation Check (Self-Test)**
```
VERIFY exactly one documentation spec exists and stays within its four permitted sections
VERIFY every spec traces its sections back to PRD requirements
VERIFY the Documents table lists zero stale specs
VERIFY every rule exception appears in BOTH the registry and the documentation spec, with a reason
VERIFY no spec assumes a dependency, framework, or tool that was never granted (SR-2)
ELSE ➔ return to the failing step
```

**Error Path**
```
CATCH prd-missing        ➔ STOP. Phase 2 has no input. Return to Phase 1.
CATCH rules-missing      ➔ STOP. No spec is written without the Vibe Coding Rules loaded.
CATCH permission-unclear ➔ treat as refused. Redesign to comply and tell Luke what you did.
CATCH [*]                ➔ mark the in-flight spec stale in the registry, report, hold.
```
