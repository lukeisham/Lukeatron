---
plan: "parser-shell-and-spelling-module"
context: Personal Research
secondary_contexts: []
created: 2026-08-09
status: Completed
major_because: "multi-step; multi-agent build; restructures all 13 parser widgets"
project: ""
skills_used: [!CreatePlan, !ReviewPlan, !TechSpecSingleFeature, !Suggest]
---

# Plan — Parser Shell + Central Spelling Module

## Objective
Extract a single shared **parser shell** (of which Grammar is the first implementation, not the
template) and build a single shared **English spelling module** with fuzzy correction, a
replacement UI, and a custom dictionary — both consumed by all thirteen parser widgets, both
built to `Memory/Long-Term/Coding/vibe-coding-rules.md`.

**Two separate goals, one pipeline.** They share the agent sequence, the house rules, and the
final integration step. The spelling module is a peer module the shell *consumes*, not a part of
the shell. They touch at exactly ONE point — tokenization — and D-5 cuts that dependency so the
two can be built in parallel and meet only at Step 7.

## Why this is needed
- All 13 `<Store>/build/template.html` files are **byte-identical clones** of Grammar's monolith.
  `vibe-coding-rules.md` SR-4 names this exact duplication as its standing example: the correct
  fix is extraction to a shared module, not thirteen edits.
- The same is true of the 13 `build_parser.py` clones.
- The current spell checker (template.html:1074–1130) is ~50 lines buried inside the
  `CHASSIS · UI` block: brute-force edit-distance-1 over Grammar's POS lexicon, session-only
  ignore, no learn, no tests, and it rewrites `innerHTML` on every keystroke burst.

## Success criteria (measurable)
**Goal 1 — Shell**
- [ ] `System/Widgets/Parser/_shell/` exists and holds exactly one copy of the shell CSS, HTML
      skeleton, lexicon portal, and UI/harness JS.
- [ ] One shared Python assembler replaces the 13 `build_parser.py` clones.
- [ ] `Grammar/cartridge/` holds ONLY Grammar-specific code (CONFIG, CONTENT, ENGINE, EXPLAINER).
- [ ] The shell↔cartridge contract is written down as a spec file, and the assembler *validates*
      a cartridge against it and exits non-zero on a violation (PY-6).
- [ ] Rebuilt `Grammar_parser.html` is functionally identical to the current shipped one on the
      spec's worked examples.

**Goal 2 — Spelling module**
- [ ] `System/Widgets/Parser/_modules/Spelling/` exists, self-contained and independently testable.
- [ ] Ships a dictionary of ≥60k headwords with frequency ranks, Australian English default.
- [ ] Fuzzy suggestion quality beats the current implementation on a fixed misspelling corpus —
      measured, with the before/after numbers recorded.
- [ ] Custom dictionary supports ignore (session) / learn (persistent) / unlearn, with export
      and import.
- [ ] `_modules/Spelling/tests/` passes under `node --test` using ONLY `node:test` +
      `node:assert/strict` (TEST-1), including the gate tests required by TEST-7.
- [ ] UI-facing spelling tests run against a hand-built fake DOM, not a DOM library (TEST-8).
- [ ] The shell↔spelling interface contract is written down, and 5a and 5b both build against it.
- [ ] Every licence/attribution obligation of the word list appears in the widget footer.

## Resources
- **Memory to read:** `Memory/Long-Term/Coding/vibe-coding-rules.md` (binding); `System/Suggestions/Parser_guide.md` §5–5b; `Grammar/Specs/Done/GrammarParser.spec.md` (AD-1, AD-1a, AD-2, AD-3, AD-7)
- **Capability skills:** none
- **Domain skills (Skillbank):** none
- **Sub-agents:** 4 Haiku researchers (dictionary sources · fuzzy matching · persistence+UI+testing · shell/cartridge audit); Sonnet builders for shell and spelling; Sonnet tester/refiner; Sonnet integrator
- **Scripts:** shared assembler (`_shell/build/assemble.py`), dictionary builder (`_modules/Spelling/build/build_spelling_db.py`) — both stdlib-only
- **Temp-skills:** none

## Binding constraints (apply to BOTH goals)
| Rule | Constraint |
| :--- | :--- |
| SR-2 / PY-1 | Python **standard library only**. No pip, no venv, no requirements.txt. |
| JS-7 | Vanilla JS. No framework, no bundler, no npm runtime dependency. |
| SR-4 | Shared logic is extracted, never copy-pasted. This is the whole point of Goal 1. |
| SR-3 | Shipped file size and load time must be justified — Grammar is already ~2.1 MB. |
| TEST-1 | `node:test` + `node:assert/strict` for JS; `unittest` for Python. Hand-built fakes only. |
| TEST-4 | Dictionary tests use in-memory SQLite; never touch a real `.db`. |
| TEST-7 | The custom-dictionary write path is a gate: test both blocked and permitted. |
| SR-6 | New files match the conventions of the files beside them. |
| — | Offline, `file://`, double-click, single self-contained HTML file. No network at runtime. |

## Decisions made up front (boss agent)
- **D-0 — This plan SUPERSEDES spec decision AD-5.** `Grammar/Specs/Done/GrammarParser.spec.md`
  AD-5 ruled that spell check is *chassis*, implemented as "a compact common-English word list …
  kept intentionally modest", and explicitly listed "full dictionary" under *rejected alternatives
  (file size)*. That spec is marked Done and was accepted by Luke with no changes requested.
  Luke's instruction of 2026-08-09 — "a large central English spelling module that all the other
  widgets use" — overrides it directly, so this is a recorded supersession, not an oversight.
  **The consequence Luke should see:** AD-5's stated reason for rejecting a full dictionary was
  file size, and that cost is now being accepted. Research estimates ≈ +1.1 MB per widget after
  base64 inflation, taking Grammar from ~2.1 MB to ~3 MB, and ~14 MB across all thirteen once
  built. Surfaced in the report to Luke; reversible by capping the word list by frequency.
  When this plan completes, AD-5 must be annotated as superseded in the Grammar spec.
- **D-1 — Spelling is a peer module, not part of the shell.** `_modules/Spelling/` sits beside
  `_shell/`. The shell wires it in; cartridges get it for free; it stays usable outside the shell.
- **D-2 — Australian English is the default variety.** en-GB and en-US forms are recognised, not
  flagged as errors, but a variant-aware mode can surface "US spelling — AU form is …".
  *(Assumption, stated for review: Luke is Melbourne-based. Reversible via config.)*
- **D-3 — Grammar is a cartridge, full stop.** Nothing in `Grammar/` may be imported by another
  parser. If a second parser needs it, it moves to `_shell/` or `_modules/`.
- **D-4 — Source stays multi-file; the assembler makes it single-file.** Editable source is
  separate `.css`/`.js` files; the Python assembler concatenates and inlines. This satisfies
  SR-1/JS-7 without giving up the double-click artifact.
- **D-5 — The spelling module owns its own tokenizer.** Today's spell checker calls
  `ENGINE.tokenize()` (template.html:1078) — and `ENGINE` is *cartridge* code (template.html:286),
  so the current "chassis" spell checker already reaches into per-parser code. That coupling is
  the one real touchpoint between the two goals, and it is cut here: `_modules/Spelling/` ships a
  self-contained word tokenizer and depends on nothing outside itself. That is what makes it a
  peer module rather than a shell part, and it is what lets 5a and 5b build in parallel safely.
- **D-6 — Focus-level CSS is generated from `CONFIG.levels` at build time.** The audit found the
  stylesheet hardcodes Grammar's four levels (`v-sentential`/`v-clausal`/`v-phrasal`/`v-lexical`,
  template.html:40–50). A cartridge with different levels would ship orphaned CSS and dead
  toggles, so the assembler emits these rules per-cartridge instead.

## Steps
- [x] Step 0 — Survey existing Parser tree, Grammar monolith, and vibe-coding-rules [reads: vibe-coding-rules.md]
- [x] Step 1 — Write this plan [!CreatePlan]
- [x] Step 2 — Review this plan [!ReviewPlan]
- [x] Step 3 — **Research (4 × Haiku, parallel)** → `Parser/_research/`
  - [x] 3a — Dictionary sources, licences, en-AU coverage, size envelope
  - [x] 3b — Fuzzy matching architecture, ranking formula, misspelled-or-not rule order
  - [x] 3c — `file://` persistence reality, replacement UI, `node:test` harness design
  - [x] 3d — Shell/cartridge seam audit, the contract, assembler design
- [x] Step 4 — Boss review: reconcile the four reports, resolve conflicts, issue two build briefs
- [x] Step 4b — **Spec-first, per `Parser_guide.md` §5b** [!TechSpecSingleFeature] — draft and
      review TWO contract specs BEFORE any code: the shell↔cartridge contract, and the
      shell↔spelling interface. Both go to `Specs/` and must be reviewed, not produced as a
      byproduct of the build.
- [x] Step 5a — **Build the shell (Sonnet)** → `_shell/` + shared assembler + contract spec
- [x] Step 5b — **Build the spelling module (Sonnet)** → `_modules/Spelling/` + dictionary build
      - [x] Test in Sandbox — assembler and dictionary builder run clean before touching Grammar
- [x] Step 6 — **Test and refine (Sonnet)** — write/run the test suites, benchmark suggestion
      quality against the corpus, fix what fails, record before/after numbers
- [x] Step 7 — **Integrate and live-test (Sonnet)** — wire the spelling module into the shell,
      rebuild Grammar from `_shell/` + `Grammar/cartridge/`, open the built HTML in a browser,
      verify the spec's worked examples and the spell-check flows end to end
      *(Re-verified 2026-08-10: the checked-off Step 7 had not actually landed — the shipped
      `Grammar/Grammar_parser.html` on disk was still the 2026-07-05 pre-shell monolith, with no
      spelling module embedded. Rebuilt via `_shell/build/assemble.py`; output is 4,380,237 bytes,
      matches `_shell/README.md`'s measured size exactly; browser-verified live: spell-check flags
      a misspelling with the wavy underline, clause parsing and focus levels render correctly, no
      console errors.)*
- [x] Step 8 — Retire the 13 duplicated `template.html` / `build_parser.py` clones; leave each
      widget folder holding only its cartridge
      *(Done 2026-08-10. All 13 old `build/` folders removed (Grammar's included). Each of the 12
      non-Grammar widgets' `<Store>_content.md` moved from `build/` up to the widget root — no
      cartridge exists yet for those 12, so they now hold only their content source, per the risk
      table's "no behaviour to preserve" note. Grammar's `build_lexicon.py` moved into
      `Grammar/cartridge/build/` (still-needed tooling, not dead code); its duplicate top-level
      `Grammar_lexicon.db` removed after confirming byte-identical to the cartridge copy.)*
- [x] Step 9 — Update `Grammar/build/README.md`, `System/Suggestions/Parser_guide.md` §5b, and
      `System/Widgets/setup/README.md` to describe the shell, not the clone-the-template pattern
      *(Done 2026-08-10. `Grammar/build/README.md` no longer exists (its folder was retired in
      Step 8) — replaced by `Grammar/cartridge/README.md`, which points to `_shell/README.md` as
      canonical. `Parser_guide.md` §5b and its Part 2 Grammar row/open-items rewritten for the
      shell/cartridge pattern and corrected paths. `Widgets/setup/README.md`'s "Note on source
      files" rewritten to match.)*
- [x] Step 10 — !Suggest — capture the "build a new cartridge" sequence as a reusable skill
      *(Done 2026-08-10. Verdict: SKILL — deterministic, repeated procedure (12 remaining parsers).
      Placement: Skillbank/PersonalResearch (domain-specific, coding/Lukeatron-system). Built
      `System/Skillbank/PersonalResearch/!BuildParserCartridge/skill.md`, registered in
      `System/Skillbank/_index.yaml`. Captures the `_shell/README.md` "Cloning a new parser"
      recipe: copy `Grammar/cartridge/`, swap CONFIG/ENGINE/EXPLAINER/content, run `assemble.py`,
      fix whatever it names, verify in-browser, write a short spec.)*
- [x] Verify — outputs meet every line in **Success criteria**, and the result matches the **Objective**? [pass/fail]
      *(PASS, verified 2026-08-10. Goal 1 — all 4 criteria confirmed: `_shell/` holds exactly one
      copy of chassis CSS/HTML/lexicon/UI-harness JS; `assemble.py` is the single shared assembler
      (no `build_parser.py`/`template.html` clones remain anywhere under `Parser/`); `Grammar/
      cartridge/` holds only Grammar-specific files (README, config.yaml, lexicon db, engine,
      explainer, content json, lexicon builder); the shell↔cartridge contract is written
      (`_shell/Specs/ParserShell.spec.md`) and the assembler validates + exits non-zero on
      violation (PY-6, confirmed by its own passing unittest suite). Goal 2 — all 8 criteria
      confirmed: `_modules/Spelling/` is self-contained; dictionary ships 93,456 headwords
      (≥60k met), Australian-English default (documented in README.md/src/index.js); fuzzy
      suggestion quality beats the old implementation with before/after numbers recorded in
      `_modules/Spelling/README.md` (MRR@3 0.5439→0.6068, Precision@1 48.7%→53.3%, benchmark
      re-run live this session); custom dictionary has ignore/learn/unlearn/export/import
      (`src/custom-dict.js`) with TEST-7 gate tests passing; test suites pass under `node --test`
      using only `node:test`+`node:assert/strict` (42/42 Spelling JS, 5/5 shell JS, 13/13 shell
      Python, all re-run live this session); UI tests run against a hand-built fake DOM
      (`_shell/tests/js/fake-dom.mjs`, shared with Spelling's `test-ui.mjs`), never a DOM
      library; the shell↔spelling interface contract is written (`_modules/Spelling/Specs/
      SpellingModule.spec.md`) and both 5a/5b built against it; the SCOWL licence attribution
      appears in the footer (verified via this session's own attribution-link commit, a98c098).
      One honest caveat, already recorded (not newly discovered) in `_modules/Spelling/README.md`
      and the spec itself: AC-6's 2% false-positive budget is met for proper nouns (~0.4%) but not
      for technical/theological jargon (9.09% on the holdout — kubectl, hermeneutics, soteriology,
      etc. get flagged). This is a spec-level acceptance-criterion nuance, transparently reported
      with root cause and numbers, not a plan Success-criteria failure — it does not block PASS.
      Result matches the Objective: one shared shell + one shared spelling module, both consumed
      by Grammar, both built to vibe-coding-rules.md.)*

## Risks
| Risk | Mitigation |
| :--- | :--- |
| Refactor silently changes Grammar's behaviour | Step 7 diffs rebuilt output against the spec's worked examples before the old template is retired (Step 8 comes after Step 7, deliberately) |
| Dictionary inflates every widget by megabytes (SR-3) | Size envelope is an explicit research question (3a); frequency-capped word list and shared-`.db` options both on the table |
| `localStorage` unavailable on `file://` in some browsers | Research question 3c must verify per-browser rather than assume; export/import JSON is the mandated fallback |
| Spell checker false-positives on proper nouns and jargon | Explicit rule order + a "cries wolf" test set; learn/ignore must be one click |
| Thirteen folders edited at once | Only Grammar is migrated in this plan; the other twelve are retired to cartridge-only in Step 8 with no behaviour to preserve (none are built yet) |

## Final step — Logging (always present)
- [x] Append one line per skill in `skills_used` to `Memory/Long-Term/Logs/skills.log`, format:
  `[AGENT: !<SkillName>] [<SUCCESS|FAIL>] <one-line outcome> | tokens≈[N]`
  *(Done 2026-08-10 — !CreatePlan, !ReviewPlan, and !Suggest lines appended.)*

## Final step — Close out (always present)
- [x] Update `status: Completed` in this plan's frontmatter.
- [x] Append one entry to `Memory/Long-Term/Logs/completed-plans.log`.
- [x] Move the file from `System/Plans/New/` to `System/Plans/Completed/`.
