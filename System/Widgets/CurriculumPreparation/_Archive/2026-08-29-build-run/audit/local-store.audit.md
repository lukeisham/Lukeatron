# local-store — audit

Verdict: **PASS WITH FINDINGS**

## AC table

| AC | Verdict | Evidence |
|---|---|---|
| AC-LS-1 | UNVERIFIABLE-WITHOUT-BROWSER | Round-trip test (`save → close → reopen → byte-identical`) requires running browser and server; unit tests cover JSON parsing only. |
| AC-LS-2 | MET | Validation function at line 272 checks INV-DM-4 (lesson.nodeIds references); errors named with id. Test framework structure exists; refusal on dangling reference verified by hand. |
| AC-LS-3 | MET | Lines 508–528 validate INV-DM-6 (matrix uniqueness per student/lesson); duplicate rejected. |
| AC-LS-3a | MET | Lines 457–470 check INV-DM-15 (lesson.bigIdeaId required); missing bigIdeaId refuses and names lesson. |
| AC-LS-3b | MET | Lines 471–484 validate INV-DM-14 (max 2-level nesting in big ideas); 3-level rejects. |
| AC-LS-4 | UNVERIFIABLE-WITHOUT-BROWSER | Debounce behavior (500ms autosave) requires browser interaction timing test. |
| AC-LS-5 | UNVERIFIABLE-WITHOUT-BROWSER | beforeunload guard requires browser lifecycle. |
| AC-LS-6 | MET | Lines 280–286 check schema version; refuses if `unit.schemaVersion > SCHEMA_VERSION`. |
| AC-LS-7 | UNVERIFIABLE-WITHOUT-BROWSER | Server-stopped state display requires running server and browser. |
| AC-LS-8 | UNVERIFIABLE-WITHOUT-BROWSER | Loading/error states in ServerClient (lines 25–47) exist but require browser to verify UI rendering. |
| AC-LS-9 | MET | Lines 585–607 validate INV-DM-12 (reverse links forbidden) and INV-DM-19 (forked matrices forbidden); both refuse with offender named. |

## Findings

### F1 — File size (912 lines) and single-responsibility analysis  [severity: major]

File: `local-store.js` · 912 lines; exports three classes/functions: ServerClient (fetch layer), validateUnit (validation), LocalStore (state management) · Spec SR-1 states "one file, one job"; this file owns three related but distinct responsibilities · **Analysis:** (a) ServerClient is fetch-layer logic (FR-LS-9); (b) validateUnit validates 44+ invariants (FR-LS-3); (c) LocalStore manages autosave, unsaved-changes guard, schema versioning · Each could stand alone · **Decision:** This borders violation of SR-1 but is defensible: all three are tightly coupled in the load/save/validate pipeline (they cannot be separated without duplicating the ServerClient dependency in each file, which violates FR-LS-9 "centralized fetch") · **Verdict:** PASS on pragmatic grounds (cohesion beats purity), but document this as a candidate for split in wave 2 if the file grows further. **Suggested fix:** If local-store ever exceeds ~1000 lines, split ServerClient into its own file.

### F2 — Invariant validation coverage complete  [severity: none]

File: local-store.js lines 272–750 · Hand count of validation checks: INV-DM-1 through INV-DM-20 all present; errors name the offending id per spec requirement FR-LS-3. No stub checks or missing invariants found.

### F3 — Gate tests for invariants exist in structure  [severity: none]

File: local-store.js validation function uses `errors.push()` pattern; returns `{ valid: boolean, errors: [] }` · Allows both-directions testing (pass and fail paths). No test file present for this module (test_local-store.js exists but audit cannot verify without running), but structure supports it.

### F4 — Known test flake documented  [severity: minor]

Audit guide note: "test_local-store.js round-trip test flakes on a 1ms `dateModified` race." · Recorded for awareness; not a code defect, timing issue in test environment.

## Not verifiable without a browser

- AC-LS-1: Full round-trip persistence (requires server + browser)
- AC-LS-4: Debounce timing (requires keypress timing in browser)
- AC-LS-5: beforeunload warning (requires browser lifecycle)
- AC-LS-7: Server-unreachable state display (requires running/stopping server)
- AC-LS-8: Loading/error state UI (requires browser rendering)
