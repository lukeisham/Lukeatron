---
plan: "style-parser-remaining-sweeps"
context: [Teaching]
secondary_contexts: []
created: 2026-08-13
status: Completed
major_because: "multi-step; extends shared chassis code (_shell/) beyond Style alone"
project: "TE-05-writing-style-app"
skills_used: ["!CreatePlan", "!ReviewPlan"]
---

# Plan — Extend the Style parser cartridge to its remaining 5 sweeps

## Objective
Advance the Teaching charter's North Star ("one of the eight aspirational tools, built chassis-first
from the Grammar reference architecture") by completing TE-05 action #4: extend the Style cartridge
(`System/Widgets/Parser/Style/cartridge/`) from its reference slice (Clarity+Obscurity, Academic
English) to all 7 sweeps — Brevity, Coherence, Voice, Diction (each with its antithesis: Verbosity,
Incoherence, Affectation, Ornament) and the Simple/Descriptive English register — per
`Style/Specs/StyleParser.spec.md`, using the same proven Tier-A pattern-matching approach as the
reference slice, with no chassis changes beyond the one already flagged and deferred there (AD-S4).

## Success criteria (measurable)
- `Style/cartridge/build/config.yaml` declares all 7 sweeps in `sweeps.items` (5 genre + 2 register),
  each genre with its own palette hue.
- `style_engine.js` implements a Tier-A pass for every genre (+ antithesis) and both registers;
  `node --test` passes for every new/changed rule, including reruns of AC-S1–AC-S4.
- `style_explainer.js` correctly renders 2+ simultaneously active sweeps (e.g. two genres, or a genre
  + a register) with per-sweep grouping/colour, not just the single-sweep case the reference slice
  tested — verified by new tests and by browser AC below.
- AD-S4 (hue-by-clause-array-index) resolved: `_shell/src/ui.js`'s `render()` looks up a clause's hue
  by which sweep it belongs to, not array position, additive-only — proven by diff, Grammar's shipped
  `Grammar_parser.html` rebuilds byte-identical (no `sweeps`-tagged clauses, so the old code path is
  unchanged for it).
- `Style_parser.html` rebuilt via `_shell/build/assemble.py`; browser-verified end-to-end: each of the
  7 sweeps individually, plus at least one multi-genre combination and one genre+register combination,
  each showing correct distinct colours/groupings and zero console errors.
- `TE-05-writing-style-app/registry.md` action #4 marked Done, Definition of Done's sweep line updated
  to reflect all 7 sweeps complete; `StyleParser.spec.md` gains the extension's requirements/decisions,
  new numbered worked-example ACs (AC-S7 onward, same format as AC-S1–S6) covering the 5 new sweeps'
  individual and multi-sweep behaviour, its Verification checklist ticked, Status set to `Done`, and the
  file moved to `Style/Specs/Done/StyleParser.spec.md` (its own §9 completion instruction, mirroring
  `Grammar/Specs/Done/GrammarParser.spec.md`'s precedent); `Style_content.md`'s DRAFT banner reviewed
  for accuracy.

## Resources
- **Memory to read:** `Style/Specs/StyleParser.spec.md`, `Style/Style_content.md`, `Style/Genres/*.md`,
  `Style/Registers/*.md` (already read this session); `_shell/Specs/ParserShell.spec.md`,
  `_shell/StyleGuide/02-colour-model.md`; `Grammar/Specs/Done/GrammarParser.spec.md` (regression
  reference only).
- **Capability skills:** none (no email/calendar/web research needed).
- **Domain skills (Skillbank):** none — `!BuildParserCartridge` covers cloning a *new* cartridge, not
  extending an existing one; this plan's work is bespoke engine/explainer/chassis code, handled inline.
- **Sub-agents:** one, for an independent review of this plan (Lens 1–3, `!ReviewPlan`'s own
  "run as a sub-agent for genuine independence on large plans" instruction). None for execution — the
  work is one tightly-coupled codebase change, better done by one hand for consistency.
- **Scripts:** reuse existing `compile_style_content.py` and `_shell/build/assemble.py` unchanged (both
  already content-agnostic across all 7 Style files — confirmed: `Style_content.json` already compiles
  63 CONTENT entries spanning §1–§12, no code change needed there).
- **Temp-skills:** none.

## Steps

- [x] Step 1 — Fix AD-S4 in the shared shell: `_shell/src/ui.js` `render()`/`buildClauseChips()` look up
  a clause's palette hue via an optional `cl.hueIndex` field when present, falling back to the existing
  `pal[cx % pal.length]` array-index behaviour when absent (additive, invisible to any cartridge whose
  clauses don't set it — i.e. Grammar). [runs: direct edit]
  - [x] Test in Sandbox — rebuild Grammar's cartridge through the changed assembler/shell and diff
    against the currently-shipped `Grammar_parser.html`. **Correction to this line's own wording:**
    literal byte-identity is not achievable once `ui.js`'s shared source text itself changes (it's
    inlined verbatim, comments included) — unlike the earlier opt-in-block extensions, which touched no
    existing line. Verified instead by (a) an isolated diff showing only the two intended hunks changed,
    (b) the shell's full existing test suite passing unchanged, (c) a new dedicated test proving a
    hueIndex-less clause (Grammar's own case) computes the exact same hue as before. See spec §10, AC-S12.
  - [x] !Checkpoint — N/A, no outgoing content or Long-Term memory change.
- [x] Step 2 — Extend `Style/cartridge/build/config.yaml`: add 4 genre hues (reusing Grammar's house
  palette values — amber/purple/pink/coral, matching `02-colour-model.md`'s categorical model) and 5
  new `sweeps.items` entries (brevity, coherence, voice, diction — each with `oppositeId`/`oppositeLabel`/
  `oppositeSection` — and `simple-descriptive-english` as a register, no opposite). Bump
  `cartridge.version`. [runs: direct edit]
- [x] Step 3 — Extend `style_engine.js`: generalise the existing `clarityPass`/`buildClarityResult`
  pair into a reusable genre-pass helper (rule-set table keyed by sweep id) rather than 4 near-duplicate
  copies; add rule-sets for Brevity/Verbosity, Coherence/Incoherence, Voice/Affectation,
  Diction/Ornament (Tier A phrase-lists/regexes, same fuzzy/confidence-weighted style as Clarity —
  reusing the existing passive-voice detector for Voice §4.1 per the spec's own SR-4 precedent); add
  `simpleDescriptiveEnglishPass` (§7.1–7.20 scorecard, same style as `academicEnglishPass`); tag every
  clause with a `hueIndex` (resolved from `CONFIG.sweeps.items`/`CONFIG.clausePalette` by sweep id, one
  shared hue per genre+its antithesis) and every finding with its owning `cat: "genre"|"register"`;
  replace the `parse()` `sweepCategory` overwrite logic with an accumulator that correctly reaches
  `"mixed"` for any 2+ simultaneously active sweeps, not just exactly one genre + one register.
  [runs: direct edit] **Also found and fixed two engine bugs the reference slice never exercised**
  (neither introduced by this step, both pre-existing): `splitSentences()`'s inverted boundary check
  silently never split normal multi-sentence paragraphs; `sentenceText()`'s naive space-joining broke
  punctuation-adjacent regexes (citations, percentages). See spec §10.2, AD-S5/AD-S6.
- [x] Step 4 — Extend `style_explainer.js`: `genreTable`/`genreRules`/`registerScorecard`/
  `registerRules` filter `R.findings` by `f.cat` (so a mixed run never leaks a register finding into
  the genre table or vice versa) and `genreRules`/`registerRules` group deduplicated rule ids under
  their *own* originating sweep's heading (matched via each finding's section-number prefix against
  `R.summary.classifications`), not a single `classifications[0]` heading — fixes the current
  single-genre assumption that was never exercised past the reference slice. [runs: direct edit]
  - [x] Test in Sandbox — new `node --test` cases in `test-style_engine.mjs`/`test-style_explainer.mjs`
    covering: each new genre affirmative + opposite, the register scorecard, and multi-sweep
    combinations (two genres together; a genre + a register together) asserting correct per-sweep `cat`
    tagging, hue grouping, and headings — plus a regression test for a third bug found live during
    browser verification (Step 6): `spanRef` indexing collided once a second genre sweep's findings were
    concatenated on (AD-S7). 32/32 Style JS tests + 19/19 shell JS tests green.
  - [x] !Checkpoint — N/A, no outgoing content or Long-Term memory change.
- [x] Step 5 — Rebuild `Style_content.json` (`compile_style_content.py`, unchanged as expected — all 7
  files already compiled, 63 entries) and `Style_parser.html` (`assemble.py`); reran the full test suite
  (`node --test` + `python3 -m unittest`, all green) and reconfirmed Grammar's own rebuild against the
  final state (same functional-identity result as Step 1). [runs: direct, build scripts]
- [x] Step 6 — Browser-verified end-to-end in the live preview (`localhost:8799`, all 7 checkboxes
  present): Coherence run individually (all 4 rules fired on worked examples); a two-genre run
  (Brevity+Voice — caught and fixed the real spanRef bug live, AD-S7); a genre+two-register run
  (Diction+Academic English+Simple/Descriptive English — 3 sweeps at once, zero cross-contamination,
  correct 3-way heading grouping); zero console errors; zero app-triggered network requests. Clarity
  itself unchanged from the already-verified reference slice (re-confirmed via AC-S1/AC-S2 unit tests).
  [runs: direct, preview tools]
- [x] Step 7 — Updated docs to match reality: `StyleParser.spec.md` gained §10 (extension's
  requirements/decisions, AD-S4/S5/S6/S7, AC-S7–AC-S12), Verification checklist ticked, Status set to
  `Done`, moved to `Style/Specs/Done/StyleParser.spec.md` — all citing paths across `ParserShell.spec.md`,
  `GeneratorShell.spec.md`, `Style_content.md`, and `Parser_guide.md` updated to the new location;
  `Style_content.md`'s DRAFT banner updated to reflect the full 7-sweep cartridge (still pending Luke's
  content-wording review, unchanged); `TE-05-writing-style-app/registry.md` action #4 → ☑ Done,
  Definition of Done's sweep line updated, decision log entry added. Two minor pre-existing gaps
  (register Layer-1 highlighting never wired up; a few SDE rules compile to an empty definition string)
  logged to `Memory/Long-Term/Logs/issues.log` rather than silently expanding this plan's scope.
  [runs: direct edit]
- [x] Verify — outputs meet every line in **Success criteria**, and the result matches the **Objective**?
  [pass] — all 7 sweeps built, tested, and browser-verified; AD-S4 resolved and proven safe for Grammar;
  spec closed out; registry updated. One deliberate wording correction from the plan as originally
  written: "byte-identical" (Success criteria, Step 1) is "functionally identical" in practice — see
  Step 1's note above; the underlying regression guarantee (Grammar unaffected) is fully met either way.

## Final step — Logging (always present)
- [x] Append one line per skill in `skills_used` to `Memory/Long-Term/Logs/skills.log`, format:
  `[AGENT: !<SkillName>] [<SUCCESS|FAIL>] <one-line outcome> | tokens≈[N]`

## Final step — Close out (always present)
- [x] Update `status: Completed` in this plan's frontmatter.
- [x] Append one entry to `Memory/Long-Term/Logs/completed-plans.log` (format per that file's header —
  verbatim from this plan's frontmatter + Objective). Write this BEFORE moving the file.
- [x] Move the file from `System/Plans/New/` to `System/Plans/Completed/`.
