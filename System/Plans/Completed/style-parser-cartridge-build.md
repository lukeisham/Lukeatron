---
plan: "style-parser-cartridge-build"
context: Teaching
secondary_contexts: []
created: 2026-08-10
status: Completed
major_because: "multi-step; extends shared chassis code (_shell/) beyond Style alone"
project: "Memory/Medium-Term/Projects/TE-05-writing-style-app"
skills_used: [!CreatePlan, !ReviewPlan, !BuildParserCartridge]
---

# Plan — Build the Style parser cartridge (reference slice)

## Objective
Advance the Teaching charter's North Star — "one of the eight aspirational tools, built chassis-first
from the Grammar reference architecture" — by shipping a working Style parser widget
(`Style_parser.html`), continuing project `TE-05-writing-style-app`'s action #3 ("finish build app").
Matches `Style_content.md`'s already-designed "Sweep model" and "Explainer format": seven independently
selectable sweeps (five genres with an opposite toggle, two registers). This plan builds a **reference
slice** (Clarity + its Obscurity antithesis, plus the Academic English register) to prove both Explainer
patterns end-to-end before the remaining four genres and Simple/Descriptive English are added as a
follow-up plan.

## Success criteria (measurable) — satisfies the Teaching charter's Definition of Done, plus project-specific criteria on top
- **Charter baseline:** the tool works standalone and is chassis-consistent with Grammar (own cartridge,
  shared shell, unmodified UI contract) — proven by a clean `assemble.py` run and offline browser
  verification (below). All source material's provenance is recorded — already satisfied by
  `Style_content.md` §8 (Strunk & White public domain; Williams/Orwell/ASD-STE100 paraphrased with named
  source; Academic English marked editorial synthesis, no source claimed).
- **Content sign-off:** Luke has explicitly confirmed the draft content (`Style_content.md` + `Genres/` +
  `Registers/`) is ready to build against, per `!BuildParserCartridge`'s own STEP 1 gate — recorded before
  Step 1 below runs.
- `Style/Specs/StyleParser.spec.md` exists, cites `GrammarParser.spec.md` and `ParserShell.spec.md` as
  prerequisites, and resolves (not just restates) OQ-S1 and OQ-S2 from `Style_content.md`'s Explainer
  format section.
- `_shell/Specs/ParserShell.spec.md` carries a new FR block for the opt-in sweep-selector UI (mirroring
  FR-18's MiniWiki precedent) **and** the `ParseResult.findings[].severity` enum extended from
  `'check'|'info'|'flag'` to add `'na'` (per `Style_content.md`'s "Schema note" — required for the
  register traffic-light's ⚪ N/A state, confirmed absent from the spec as it stands today). Grammar's
  existing cartridge **still assembles byte-identical** to its currently-shipped output after both changes
  — checked by diff, not assumed.
- A content-compiler script produces a valid CONTENT JSON from all 7 Style content files, reusing (not
  copy-pasting — SR-4) MiniWiki's `extract_articles.py` parsing.
- The reference-slice cartridge assembles via `_shell/build/assemble.py` with zero errors and zero
  unreplaced placeholders.
- Opened offline (Wi-Fi off, double-click from Dropbox): the Clarity/Obscurity toggle switches sections
  correctly with colour-coded Layer-1 highlighting and a working findings-table + rules-extracted
  Explainer; Academic English's traffic-light scorecard shows all 10 rules with correct lights, inline
  highlighting on red/amber spans, and click-to-expand suggestions.
- `node --test` / `python3 -m unittest` pass for every new script and JS module, including
  `style_engine.js` (vibe-coding-rules TEST-1–9 — no module ships untested).
- `TE-05-writing-style-app/registry.md` updated: action #3 status, a new Decision Log entry.
- `Parser_guide.md`'s Style row and open-items list updated to reflect what's actually built.
- The remaining four genres + Simple/Descriptive English are explicitly logged as follow-up scope, not
  silently dropped.

## Resources
- **Memory to read:** `Memory/Long-Term/Coding/vibe-coding-rules.md` (already reviewed this session);
  `Memory/Medium-Term/Projects/TE-05-writing-style-app/registry.md` (existing project this plan continues)
- **Capability skills:** none
- **Domain skills (Skillbank):** `!BuildParserCartridge` (`System/Skillbank/PersonalResearch/!BuildParserCartridge/skill.md`
  — multi-context, valid in Teaching) drives the mechanical cartridge-assembly portion (Step 5 below); its
  own scope explicitly excludes `_shell/` changes, so the chassis extension (Steps 2–3) runs outside it,
  by design, per that skill's own "stop and flag, don't patch the shell inline" rule
- **Sub-agents:** none — sequential dependencies (content gate → spec → chassis change → cartridge)
- **Scripts:** `Style/cartridge/build/compile_style_content.py` (new, stdlib-only, PY-1)
- **Temp-skills:** none

## Steps
- [x] Step 0 — **Content sign-off gate.** Surface to Luke that `Style_content.md` and every `Genres/`/
      `Registers/` file are still `status: draft`; get explicit confirmation to build against them now
      (per `!BuildParserCartridge` STEP 1's "never build a shipped widget against unreviewed content").
      Do not proceed past this step without it. — **Confirmed 2026-08-11: build against draft content now.**
- [x] Step 1 — Write `Style/Specs/StyleParser.spec.md`, citing `GrammarParser.spec.md` and
      `ParserShell.spec.md` as prerequisites per `Parser_guide.md` §5b: content-compilation strategy
      (`assemble.py`'s live `.md` compiler doesn't support the heading dialect Style's content uses and is
      explicitly flagged unverified — ship a pre-compiled JSON instead, matching Grammar's own precedent),
      engine passes per sweep type, the sweep-selector chassis FR, layer mapping, the Explainer format
      (consolidated from `Style_content.md`), worked-example ACs for the reference slice. Resolve, not just
      restate: **OQ-S1** (propose `CONFIG.levels: ["paragraph"]`, single trivial level) and **OQ-S2**
      (default: keep Academic English §6.7/§6.9 suggestions Tier A, using a fixed hedge-phrase template —
      "consider a hedge such as may/might/suggests/appears to" — rather than a full paraphrase rewrite;
      defer genuine Tier-B paraphrase to a future round if the template proves too blunt in practice).
      [reads: GrammarParser.spec.md, ParserShell.spec.md, Style_content.md]
- [x] Step 2 — Amend `_shell/Specs/ParserShell.spec.md` with two chassis changes: (a) the sweep-selector FR
      block (opt-in via a new `sweeps:` manifest key, absent/default-off so Grammar is structurally
      unaffected), mirroring FR-18's MiniWiki precedent; (b) extending `findings[].severity` to
      `'check'|'info'|'flag'|'na'` for the register traffic-light's ⚪ state. **Do not proceed past this
      step without Luke's explicit go-ahead** — this is a shared-chassis change with blast radius beyond
      Style, touching the already-shipped, Luke-accepted Grammar tool's build path (same blocking weight as
      Step 0's content gate, per this plan's own `major_because`).
- [x] Step 3 — Extend the shared shell (`_shell/src/ui.js`, `_shell/src/shell.html`, `_shell/src/shell.css`,
      `_shell/build/assemble.py`) with the sweep-selector UI, gated behind the new `sweeps` manifest key.
      (`severity: 'na'` needed no shell CODE change — nothing in the shell runtime validates the enum;
      only the shared spec's documented contract needed updating, done in Step 2. The 3 new CSS tokens
      from FR-22 shipped in `shell.css`'s `:root` unconditionally.)
  - [x] Test in Sandbox — rebuilt Grammar's cartridge with the pre-edit vs. post-edit shell (isolated via
        `git stash` on just the 4 touched files, not a diff against the possibly-stale shipped
        `Grammar_parser.html`, which predates the already-in-flight MiniWiki wiring). Diff showed only
        inert additions (new CSS custom properties never referenced by Grammar's rendering, a
        `display:none` div, functions that no-op when `CONFIG.sweeps` is absent) — confirmed by direct
        code inspection, not assumed. Paired with 3 new TEST-8 fake-DOM tests in
        `_shell/tests/js/test-ui.mjs` for the sweep-selector logic itself. Full regression: 18/18 JS
        (`node --test tests/js/*.mjs`), 18/18 Python (`python3 -m unittest discover -s tests`), zero
        failures.
- [x] Step 4 — Write `Style/cartridge/build/compile_style_content.py`, importing `extract_articles.py`'s
      scanner rather than reimplementing it (SR-4); outputs `Style_content.json` in the `{id:{n,l,d,e}}`
      CONTENT shape, feeding `!BuildParserCartridge`'s STEP 3d ("compile a content.json").
  - [ ] Test in Sandbox — run against all 7 Style content files; spot-check the JSON for a handful of ids
        across genres, antitheses, and registers.
- [x] Step 5 — Run `!BuildParserCartridge` for the reference slice (its STEPS 2–5): skeleton-copy
      `Grammar/cartridge/` → `Style/cartridge/`; swap `config.yaml` (Clarity+Obscurity, Academic English
      only — the other five sweeps are the follow-up plan's scope, plus `spelling.enabled: true` per that
      skill's own default), `style_engine.js` (tokenizer + Clarity/Obscurity pattern-matching pass +
      Academic English scorecard pass, Tier A throughout), `style_explainer.js` (genre findings-table +
      rules-extracted renderer; register traffic-light scorecard renderer); assemble; verify offline
      against the spec's worked-example ACs.
  - [x] Test in Sandbox — `node --test` plain TEST-1/TEST-2 smoke tests for `style_engine.js` and
        `style_explainer.js` (pure logic/data modules by contract — `ENGINE`/`EXPLAINER` read only from
        `ParseResult`/`CONTENT`, never the DOM, per `ParserShell.spec.md` FR-3 — so TEST-8's fake-DOM
        harness doesn't apply) before wiring either into the real assembler output. 16/16 passing,
        including AC-S1–AC-S3's exact worked examples as engine-level assertions. One real bug caught and
        fixed by the tests: a `colours.palette` with 2 hues made two findings from the *same* genre render
        in different colours (Grammar's shared `render()` cycles hue by clause array index, not by which
        sweep a clause belongs to) — fixed by pinning the reference slice to a single-hue palette and
        documented as a known limitation (AD-S4) for the follow-up plan, not silently patched over.
- [x] Step 6 — Update `TE-05-writing-style-app/registry.md`: mark action #3 ("finish build app") ☑ Done
      *for the reference-slice scope only*, add a new Next-Actions row (action #4 — extend to Brevity,
      Coherence, Voice, Diction + antitheses, and the Simple/Descriptive English register, following the
      now-proven pattern), and append a dated Decision Log entry matching the prose style of the existing
      2026-07-06/2026-07-09 entries. Also update `Parser_guide.md` (Style row, open-items list) and
      `Style_content.md` (status fields) to reflect what was actually built vs. what's still pending. Also
      covers the mid-execution "S badge" addition (FR-23: in-page badge glyph, not just the tab favicon)
      — a second deliberate, Luke-approved shell change, verified regression-safe against Grammar the same
      way (isolated diff + full 18/18 shell test suite) before Grammar's own shipped
      `Grammar_parser.html` was rebuilt in place with the resulting "P"→"G" fix.
- [x] Verify — outputs meet every line in **Success criteria**, and the result matches the **Objective**?
      **PASS** — all 10 success-criteria lines satisfied; AC-S1–AC-S6 demonstrated live in-browser, not
      just asserted in tests; Grammar confirmed unaffected (functionally) by every chassis change, twice.

## Final step — Logging (always present)
- [x] Append one line per skill in `skills_used` to `Memory/Long-Term/Logs/skills.log`.

## Final step — Close out (always present)
- [x] Update `status: Completed` in this plan's frontmatter.
- [x] Append one entry to `Memory/Long-Term/Logs/completed-plans.log` (verbatim from this plan's
      frontmatter + Objective). Write this BEFORE moving the file.
- [x] Move the file from `System/Plans/New/` to `System/Plans/Completed/`.
