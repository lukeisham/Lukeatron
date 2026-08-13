---
plan: "generator-widget-build"
context: Personal Research
secondary_contexts: [Coding, Teaching]
created: 2026-08-11
status: Completed
major_because: "multi-step | multi-domain | modifies Long-Term memory (new Skillbank skill + content stores)"
project: ""
skills_used: [!CreatePlan, !ReviewPlan, !Suggest, !Checkpoint]
---

# Plan — Generator widget suite

## Objective
Stand up `System/Widgets/Generator/` — a Parser-style single-file-HTML widget suite with one shared
shell serving four cartridges (AI Characteristics, Riddle, Folk-tale, Psychometric), plus a harvesting
skill that progressively grows each cartridge's content store.

## Which bar applies (charter, Personal Research)
This is a **hybrid** project and the charter's two Definition-of-Done branches split cleanly by artefact:
- **The code** (`_shell/`, cartridges, build scripts, tests) is held to the **build bar** — it actually
  works and ships, verified against reality, matching house style. Not held to research-citation standards.
- **The seed content** (riddles, folk tales, psychometric formats, AI-characteristic taxonomy) is
  **research output** and is held to the research standards: every item sourced and attributed, no
  Wikipedia load-bearing, provenance and licence recorded per item.

## Success criteria (measurable)
- `System/Widgets/Generator/_shell/` exists and builds a cartridge via
  `python3 _shell/build/assemble.py <Cartridge>/cartridge` with **zero** Parser files modified
  (`git status` shows no `M` under `System/Widgets/Parser/`).
- Four shipped widgets exist and open offline from `file://` with no console errors:
  `AiCharacteristics/AiCharacteristics_generator.html`, `Riddle/Riddle_generator.html`,
  `FolkTale/FolkTale_generator.html`, `Psychometric/Psychometric_generator.html`.
- **AI Characteristics** (`mode: analyse`): accepts up to a page of pasted text, highlights ≥1
  characteristic per seeded category on a known AI-written sample, and the explainer returns a
  why-the-model-does-this account for every highlighted characteristic.
- **Riddle** (`mode: present`): ~~≥70~~ **61 riddles baked in — Luke accepted 61 on 2026-08-13**
  ("It's fine that there are only 61 riddle"); the Phase 1 seed claimed 78 but contained 61. Generate shows one; Clue reveals a nudge;
  a correct answer and ≥3 seeded near-miss variants each validate as correct; a wrong answer
  reports wrong; Copy places the riddle on the clipboard.
- **Folk-tale** (`mode: present`): ≥30 tales baked in, each ≤400 words; Generate shows one with
  setup / twist / result spans distinctly highlighted; Copy places the tale on the clipboard.
- **Psychometric** (`mode: present`): ≥50 items across all five categories; the category picker
  filters to one category; Clue, Check-answer, and the reasoning explainer all work; abstract-reasoning
  items render as SVG generated from their rule spec.
- Each cartridge's MiniWiki opens in a new tab as a **flat catalogue** with each item's source in
  brackets.
- Tier B degrades closed: with no API key and no network every Tier-A function still works and the
  refresh control is disabled with a visible note.
- Test suites pass: `python3 -m unittest discover -s _shell/tests/build -p "test_*.py"` and
  `node --test` from `_shell/`.
- A `!GenerateContent` Skillbank skill exists with an `_index.yaml` entry, and re-running it grows a
  content `.md` without duplicating an existing item.
- No secret is committed: `git log -p` and the working tree contain no API key (SR-5).
- A named AI-detection fixture exists at `AiCharacteristics/tests/fixtures/ai-sample.md` (LLM-written)
  and `human-sample.md` (Luke-written or public-domain human prose); the analyse run over the AI sample
  flags ≥1 characteristic in each seeded category, and the human sample is **not** reported as a verdict
  of AI authorship — only as characteristics observed.
- ~~Research keepers stored to Long-Term~~ — **superseded by Luke's decision 2026-08-13**: this
  material is subject to change, so it stays with the widgets rather than entering Long-Term memory.
  Replacement criterion: both reference documents live beside their cartridge with an audited,
  verified-only Works Cited.

## Resources
- **Memory to read:** `Memory/Long-Term/Coding/vibe-coding-rules.md` (binding),
  `Memory/Long-Term/Style/`, `Memory/Long-Term/Logic/` (psychometric + AI-characteristic overlap)
- **Capability skills:** `!HeadlessChromeBrowser` (content harvesting for the new skill)
- **Domain skills (Skillbank):** none existing; this plan **creates** `!GenerateContent`
- **Sub-agents:** Phase 2 build fleet (Sonnet, one per shell/cartridge); Phase 3 test fleet (Sonnet)
- **Scripts:** `_shell/build/assemble.py`, `_shell/build/miniyaml.py`,
  `_modules/MiniWiki/build/` (adapted for flat catalogues), per-cartridge content compilers
- **Temp-skills:** none

## Reference (Phase 1 output — read before building)
- `System/Widgets/Generator/_research/DECISIONS.md` — **binding**, do not re-litigate
- `_research/parser-shell-architecture.md` — 23 placeholders, manifest schema, ENGINE/EXPLAINER
  contracts, ParseResult, 23 DOM ids, focus-level CSS generation
- `_research/cartridge-anatomy.md` — cartridge folder shape, content-md compilation, palette model
- `_research/miniwiki-module.md` — ARTICLES JSON shape, bundler ORDER list, flat-list conversion
- `_research/vibe-rules-build-checklist.md` — binding rules per file type, design tokens, and the
  five Parser violations **not** to copy
- `_research/seed/{ai-characteristics,riddles,folk-tales,psychometrics}.md` — seed content

## Steps

### Phase 2 — Build (Sonnet fleet)
- [x] Step 1a — Copy the Parser chassis into `Generator/` verbatim [deterministic: `cp -r`, no agent]
- [x] Step 1b — Strip every Parser/Grammar-specific reference from the copy and rename to Generator
      idiom (D-3 equivalent: nothing in `_shell/src/` names a cartridge) [sub-agent: shell]
- [x] Step 2 — Extend the manifest with `generator.mode: analyse | present` and write the
      `present`-mode chassis: item pool, Generate, Clue, Check-answer, Copy, category filter
      [sub-agent: shell]
  - [x] Test in Sandbox — assemble a throwaway two-item cartridge and confirm both modes build
- [x] Step 3 — Adapt the MiniWiki module for **flat catalogue** output with per-item source
      attribution; fix (do not copy) the duplicated-tree-walk defect flagged in Phase 1
      [sub-agent: miniwiki]
  - [x] Test in Sandbox — bundle and open a 3-item flat catalogue before wiring any cartridge to it
- [x] Step 4 — Build the **AiCharacteristics** cartridge (`analyse`): engine with local + statistical
      detectors, explainer keyed to each characteristic [sub-agent: cartridge-ai]
- [x] Step 5 — Build the **Riddle** cartridge (`present`): pool, fuzzy answer checking with the seeded
      normalisation rules, clue reveal, copy [sub-agent: cartridge-riddle]
- [x] Step 6 — Build the **FolkTale** cartridge (`present`): pool, three-beat detection engine, beat
      highlighting, copy [sub-agent: cartridge-folktale]
- [x] Step 7 — Build the **Psychometric** cartridge (`present`): five-category pool, category picker,
      clue, per-category answer checking, reasoning explainer, SVG-from-rule-spec renderer
      [sub-agent: cartridge-psych]
  - [x] Test in Sandbox — render 3 abstract items from their rule spec and confirm the derived correct
        option matches the seeded answer (the spec drives both, per D-3)
- [x] Step 8 — Write the Tier B `api.js` refresh path: key in `localStorage` only, loading and error
      states, disabled-with-note when absent (JS-5, SR-5, degrade-closed) [sub-agent: shell]
  - [x] Test in Sandbox — exercise all three states (no key / bad key / network down) before shipping;
        gate test per TEST-7: blocked path genuinely blocked, permitted path passes through
- [x] Step 9a — Compile the Phase 1 seed research into per-cartridge content `.md` files, preserving
      each item's source attribution and licence note [sub-agent: content]
- [x] Step 9b — Assemble all four widgets [deterministic: `assemble.py`, no agent]

### Phase 3 — Test and review (Sonnet fleet, then Luke)
- [x] Step 10 — Write and run the test suites: `unittest` for the build scripts, `node:test` +
      hand-built fake DOM for the JS (TEST-1/2/8) [sub-agent: tests]
- [x] Step 11 — Drive each widget in the browser; verify every Success criterion behaviourally, not by
      absence-of-crash (TEST-6) [sub-agent: qa]
- [x] Step 12 — **PAUSE — show Luke the layout and functionality of all four widgets and get his
      verdict before anything is locked in.** Do not proceed past this line unattended.
- [x] Step 13 — Apply Luke's layout/functionality changes, rebuild, re-test [sub-agent: qa]

### Phase 4 — Skill and close-out
- [x] Step 14a — Write the `!GenerateContent` Skillbank skill (harvest + de-duplicate + append to a
      content `.md`; check freshness of the AI-characteristics taxonomy) [runs: !Suggest]
      → `System/Skillbank/PersonalResearch/!GenerateContent/skill.md`
- [x] Step 14b — Registered in `System/Skillbank/_index.yaml` (26 skills; entry parses, path resolves).
      **Luke overrode !Checkpoint's Gate C hold on 2026-08-13** ("!GenerateContent should live in the
      skillbank"), accepting that the skill is registered before its first proving run.
  - [x] !Checkpoint — Gate C fired and held; Luke's explicit instruction released it
- [x] Step 15 — Write `Generator/_shell/README.md`, a `Specs/GeneratorShell.spec.md` addendum, and a
      per-cartridge README ×4
- [x] Step 16 — **CLOSED BY LUKE'S DECISION, 2026-08-13: not stored to Long-Term.** "The
      AI-writing-characteristics taxonomy and the psychometric test-format reference is subject to
      change therefore it should remain with the widgets. It is not a long term memory." The charter
      guardrail is satisfied differently: this material is mutable reference, not durable fact, so it
      lives beside the widget it serves.
      → `AiCharacteristics/AI-writing-characteristics-reference.md`
      → `Psychometric/Psychometric-test-formats-reference.md`
  - [x] Citation audit (Luke: "deleted and rejected if it cannot be verified") — **5 of 5 arXiv author
        attributions checked were fabricated; 1 arXiv ID did not exist.** Corrected the 5 verifiable
        entries, deleted 6 unverifiable ones plus the claims resting on them alone. See each file's
        Works Cited "Verification note".

## Known consequence (disclosed, not fixed)
Forking the Parser chassis into `Generator/` creates **two** chassis that will drift. SR-4 ("share,
don't copy-paste") would argue for one shared chassis serving both suites. Luke asked explicitly for
Parser to be *copied* to create Generator, so the fork stands — but a bug fixed in one shell must be
grepped for in the other, and that obligation belongs in both READMEs (Step 15).
- [x] Verify — outputs meet every line in **Success criteria**, and the result matches the
      **Objective**? **PASS** (two criteria amended by Luke, one closed by his decision — see below).

## Verify — outcome (2026-08-13)

**Met:** shell builds cartridges with zero Parser files modified · four widgets ship and open offline
with no console errors · AiCharacteristics flags ≥1 characteristic in all 8 seeded categories and the
human fixture returns no authorship verdict · FolkTale ≥30 tales all ≤400 words with beats highlighted
· Psychometric ≥50 items across five categories, picker filters, SVG derived from rule spec · MiniWiki
opens as a flat catalogue with sources in brackets (after the Step-13 `#wikibar` fix) · Tier B degrades
closed · all test suites pass (138 tests) · no secret in the tree · named AI/human fixtures exist.

**Resolved by Luke, 2026-08-13:**
1. **61 riddles accepted** — criterion amended rather than padded.
2. **`!GenerateContent` registered** — Gate C hold released on his instruction.
3. **Long-Term storage dropped** — the two references are mutable, so they stay with the widgets.

**Citation audit outcome:** 5 of 5 arXiv author attributions checked proved fabricated and 1 ID did
not exist. Corrected what was verifiable, deleted the rest and the claims resting on them. This is
the single most important lesson from the project: *Phase 1 research agents produced confident,
correctly-formatted, and partly fictitious citations, and nothing in the build pipeline would have
caught it.* Treat every unaudited citation in `_research/seed/` as unverified.

## Final step — Logging (always present)
- [x] Append one line per skill in `skills_used` to `Memory/Long-Term/Logs/skills.log`, format:
  `[AGENT: !<SkillName>] [<SUCCESS|FAIL>] <one-line outcome> | tokens≈[N]`
  → four rows appended 2026-08-13 (!CreatePlan, !ReviewPlan, !Suggest, !Checkpoint[HELD])

## Final step — Close out (always present)
- [x] Update `status: Completed` in this plan's frontmatter.
- [x] Append one entry to `Memory/Long-Term/Logs/completed-plans.log` (format per that file's header).
      Write this BEFORE moving the file.
- [x] Move the file from `System/Plans/New/` to `System/Plans/Completed/`.
