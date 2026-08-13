# Style Parser — Technical Spec

| Field | Value |
|---|---|
| **Type** | Build |
| **Date** | 2026-08-11 (reference slice); extended 2026-08-13 (remaining 5 sweeps) |
| **Status** | Done — all 7 sweeps built and browser-verified (2026-08-13) |
| **One-liner** | The Style cartridge's deltas from the shared shell/Grammar contract: all 7 sweeps (5 genres + antitheses, 2 registers) — the coloured genre drill-down and register traffic-light Explainer patterns, the sweep-selector UI, `severity: 'na'`, and (§10) the remaining-sweeps extension's own deltas: per-sweep hue resolution (AD-S4, resolved), multi-sweep-aware Explainer filtering/grouping, and two engine bugs the single-sweep reference slice never exercised. |

Cites `System/Widgets/Parser/Grammar/Specs/Done/GrammarParser.spec.md` and
`System/Widgets/Parser/_shell/Specs/ParserShell.spec.md` as prerequisites, per `Parser_guide.md` §5b —
this records only Style's deltas, never restates the shared contract. Continues project
`Memory/Medium-Term/Projects/TE-05-writing-style-app` (actions #3 and #4). §§1-9 record the reference
slice (Clarity+Obscurity, Academic English) as built 2026-08-11/12; §10 records the remaining-sweeps
extension (style-parser-remaining-sweeps plan) that completed action #4.

## 1. Motivation

`Style_content.md` already designed the Explainer format Luke asked for (2026-08-10 session): five
genre sweeps with an opposite toggle, colour-coded, Grammar-style drill-down; two register sweeps,
traffic-light scorecard. Both designs assume UI affordances the shared shell doesn't have yet — genres
and registers must be independently selectable, and genres additionally need an opposite toggle. This
spec is the reference-slice build that proves the pattern before the other five sweeps (Brevity,
Coherence, Voice, Diction + antitheses, Simple/Descriptive English) are added as a follow-up.

## 2. Scope

**In scope:**
- Content-compilation strategy for a multi-file content source (Style's `Genres/`+`Registers/`, unlike
  every other aide's single `<Store>_content.md`).
- Two chassis extensions, both opt-in and default-off so Grammar is unaffected: the sweep-selector UI
  (`sweeps:` manifest key) and `ParseResult.findings[].severity` gaining `'na'`.
- The reference-slice cartridge: `config.yaml`, `style_engine.js` (Clarity/Obscurity pattern-matching +
  Academic English scorecard passes), `style_explainer.js` (both Explainer renderers).
- Worked-example ACs for the reference slice only.

**Out of scope (§1-9, reference slice — done, see §10):**
- Brevity, Coherence, Voice, Diction (+ their antitheses) and Simple/Descriptive English — same pattern,
  added by a follow-up plan once this slice is verified. **Done 2026-08-13** — see §10.
- Any Tier-B (API/agent) function — the reference slice is 100% Tier A, including Academic English's
  hedging suggestions (OQ-S2, resolved §5 below).
- A lexicon — Style's rules are pattern/phrase-level, not word-class lookups; no `.db` is embedded.

## 3. Requirements

**Content compilation**

- **FR-S1** — `Style/cartridge/build/compile_style_content.py` (stdlib-only, PY-1) produces
  `Style_content.json` in the standard CONTENT shape (`{"<id>": {n, l, d, e}}`, `ParserShell.spec.md`
  FR-3) from all 7 Style content files (`Style_content.md`'s Genre + Register file table). It imports
  `_modules/MiniWiki/build/extract_articles.py`'s `parse_frontmatter`/`scan_nodes`/
  `fold_category_descriptions` functions rather than reimplementing dual-dialect parsing (SR-4) — that
  scanner is already verified correct against every Style content file (2026-08-10 session: 48 articles
  extracted cleanly). `l` is set to the file's `sweep_id` frontmatter value (genre/register identity,
  not a structural level — Style has no clause/phrase/word nesting, §4-AD-1). `d` is the node's
  `lead + body_html` (tags stripped); `e` is `examples` joined, or `worked_example` if `examples` is
  empty, matching whichever the source markdown actually carried (`Style_content.md`'s antithesis rules
  use `Example:` lines; the genre rules' Before/After pairs both land in `e` as a two-item array).
- **FR-S2** — `assemble.py`'s own `compile_content_markdown()` is **not used** for Style: its regex
  (`^(\d+(?:\.\d+)*[a-z]?)\s+(.+)$`) cannot match the `### 1.1 Title` ATX-heading dialect Style's content
  uses (confirmed by direct inspection, 2026-08-10), and its own docstring flags it "unverified... until
  a second cartridge exercises it." `config.yaml`'s `files.content` points at the **pre-compiled**
  `Style_content.json`, exactly mirroring how Grammar's own `CONTENT` ships pre-compiled rather than
  trusting the live `.md` compiler (`GrammarParser.spec.md` §2 out-of-scope note).

**Chassis extension 1 — sweep selector**

- **FR-S3** — A cartridge opts in with a new manifest block:
  ```yaml
  sweeps:
    enabled: true
    items:
      - id: clarity
        label: "Clarity"
        category: genre          # genre | register
        hue: teal                 # references colours.palette[].name
        section: "1"               # CONTENT id prefix, affirmative rules
        oppositeId: obscurity       # category:genre only
        oppositeLabel: "Obscurity"
        oppositeSection: "8"
      - id: academic-english
        label: "Academic English"
        category: register
        hue: blue
        section: "6"
  ```
  Absent/`enabled: false` (the default) → the shell renders no sweep-selector region at all, byte-identical
  to today's output for any cartridge that doesn't declare it (Grammar included). This mirrors FR-18's
  MiniWiki opt-in pattern exactly (`ParserShell.spec.md` §"MiniWiki module wiring").
- **FR-S4** — When `sweeps.enabled`, the shell renders one checkbox per item (`Parser_guide.md` §3's
  existing input-area vocabulary — a labelled toggle row, not a new interaction pattern) **above** the
  input area, all unchecked by default (per Luke's "need to be selected... independently" — no sweep
  implicitly runs). A `category: genre` item additionally renders a small "Opposite" toggle beside its
  checkbox, enabled only once that sweep's own checkbox is checked, defaulting off (affirmative-mode
  first). Selection state is read by `HARNESS` at Parse time and passed to `ENGINE.parse(text, selection)`
  — a **new second parameter**, additive to the existing `parse(text)` signature (FR-4 in
  `ParserShell.spec.md`); a cartridge without `sweeps.enabled` never receives it and its existing
  single-argument `ENGINE.parse` is unaffected (JS silently ignores an extra call-site argument no
  function declares).
- **FR-S5** — `ENGINE.parse`'s `selection` argument shape:
  `{ sweeps: { [sweepId]: { on: boolean, opposite: boolean } } }`. A sweep cartridge author reads this to
  decide which `CONTENT` id-ranges and rule functions to run; the shell itself never inspects `CONTENT`
  ids or sweep semantics — it only renders checkboxes from `sweeps.items` and forwards the resulting
  object, keeping the shell generic (`ParserShell.spec.md` FR-9's "none of this is cartridge code").

**Chassis extension 2 — `severity: 'na'`**

- **FR-S6** — `ParseResult.findings[].severity` gains a fourth value, `'na'`
  (`ParserShell.spec.md` §6's canonical schema: `'check' | 'info' | 'flag'` → `'check' | 'info' | 'flag' |
  'na'`). The shell's existing icon-bar renderer (`#iconbar .ic`, `03-components.md`) already resolves an
  icon glyph + colour per finding from cartridge-supplied data (not a hardcoded severity→colour map in
  shell code today) — for Style, `EXPLAINER` supplies the traffic-light glyph/colour per severity
  (🟢/🟡/🔴/⚪), so no shell-side severity→colour switch needs to exist for this to work; FR-S6 only needs
  the schema's enum widened so `'na'` is a legal value, not rejected/coerced.
- **FR-S7** — Three new semantic CSS token pairs, `--tl-red`/`--tl-red-bg`, `--tl-amber`/`--tl-amber-bg`,
  and `--tl-grey`/`--tl-grey-bg` (traffic-light-specific — **not** a reuse of the shell's existing
  `--red`, which `01-foundations.md`/`03-components.md` explicitly reserve for spelling-error underlines
  only: "don't reuse for parse errors, warnings, etc."). All three non-green traffic-light colours get
  their own Style-scoped tokens, so there is zero collision risk with the spelling module's reserved
  colour. 🟢 reuses the shell's existing `--acc`/`--accbg` (an affirmative/positive state, consistent with
  how `--acc` already marks "selected"/"active" elsewhere in the shell) rather than minting a fourth pair.

**Reference-slice cartridge**

- **FR-S8** — `style_engine.js` exports `{ parse, tokenize, CLOSED }` (`ParserShell.spec.md` FR-4).
  `tokenize` is a plain sentence/word splitter (regex-based, no lexicon). `parse(text, selection)`:
  - If `selection.sweeps.clarity.on`: run the Clarity/Obscurity pass (§4 below) reading `CONTENT["1.*"]`
    (affirmative) or `CONTENT["8.*"]` (opposite), per `selection.sweeps.clarity.opposite`.
  - If `selection.sweeps["academic-english"].on`: run the Academic English scorecard pass (§4 below)
    reading `CONTENT["6.*"]`.
  - No sweep selected → `parse` returns a `ParseResult` with empty `spans`/`findings` and a
    `summary.classifications` entry `{id: "none", label: "Select a sweep above, then Parse."}` — never a
    thrown error or a silent no-op with no user-visible explanation (JS-2).
- **FR-S9** — `style_explainer.js` exports the required nine names (`ParserShell.spec.md` FR-5).
  `tables(R)` branches on which sweep produced `R` (`R.summary.counts.sweepCategory`, set by the engine):
  `category: "genre"` → the findings table + rules-extracted two-part Explainer (§6 below,
  `Style_content.md`'s already-approved design); `category: "register"` → the traffic-light scorecard.
  `rules(R)` / `toMarkdown(R)` / `toText(R)` follow the same branch. `needSpace`/`posShort` are simple
  (Style has no POS tagging) — `posShort` returns `""` (Style doesn't label word-class), `needSpace`
  uses standard English punctuation-spacing rules (no cartridge-specific exception needed, unlike
  Grammar's clause-punctuation logic).

## 4. Engine passes (Tier A, per `Parser_guide.md` §4)

**Clarity/Obscurity pass** — paragraph → sentences → per-sentence pattern checks:
- §1.1/§8.1 (active↔passive): a fuzzy passive-construction detector (`be`-auxiliary + past participle,
  common irregular forms included) — affirmative mode flags a match as a finding (confidence from how
  unambiguous the passive construction is); opposite mode reports the same match as a §8.1 recognition,
  not a finding to fix (no correction implied — `Style_content.md`'s "Schema note" governs: an antithesis
  hit is `severity: 'check'`-equivalent recognition, not `'flag'`).
- §1.2/— (positive form): double-negative / hedged-negative phrase list (`not un-`, `does not... not`,
  stacked `not`/`never`/`no`) — §1.2 only; §8 doesn't cover this sub-rule (Clarity's antithesis, Obscurity,
  only mirrors §1.1 and §1.3 per `Style_content.md` §8.1–8.2 — §1.2/§1.4/§1.5 have no antithesis rule and
  the pass simply doesn't run them in opposite mode).
- §1.3/§8.2 (concrete↔abstract): a small closed list of vague/abstract nominal patterns (*a period of*,
  *a number of*, *certain*, *considerable*) plus a check for missing concrete nouns/numbers in a sentence
  that makes a quantitative-sounding claim.
- §1.4/§1.5 (characters as subjects / actions as verbs): nominalisation detector — common
  `-tion`/`-ment`/`-ance` suffix nouns following an abstract subject (*our lack of X prevented Y*), no
  antithesis equivalent (per above).

Every rule is fuzzy and confidence-weighted (`GrammarParser.spec.md` AD-4's precedent) — a `'tentative'`
mark below `parser.tentativeThreshold` renders exactly as Grammar's does, no new mechanism needed.

**Academic English scorecard pass** — paragraph → sentences → per-rule (§6.1–6.10) evaluation, each
producing exactly one finding (unlike the genre pass, which only emits a finding when something's hit —
FR-17's "no 0-errors placeholder" convention is a **deliberate non-goal** here, per `Style_content.md`'s
Schema note: every rule always gets a light). Rule → check, this reference slice:
- §6.1 tense precision: methodology/results sentences (heuristic: contains a measurement/finding verb)
  checked for past tense; present-tense violations flagged 🔴; sentences with no detectable
  methodology/finding content → ⚪ N/A.
- §6.2 quantification over qualification: subjective-qualifier word list (*large*, *often*, *significant*
  unaccompanied by a number) → 🔴 if present with no adjacent number/statistic, 🟡 if a number is present
  but no dispersion measure, 🟢 if both present, ⚪ if the sentence makes no quantitative claim at all.
- §6.3 non-evaluative language: value-laden adjective list (*dramatic*, *surprising*, *disappointing*,
  *concerning*, *impressive* …) → 🔴 if present, else 🟢 (never ⚪ — every sentence can be checked for
  this).
- §6.4 precise relational verbs: generic motion-verb list (*went up/down*, *changed*, *shifted*) vs. the
  precise-verb list from `Style_content.md` §6.4 (*plateaued*, *diverged*, *fluctuated*, *monotonically
  increased*) → 🔴 generic verb describing a quantitative change, 🟢 precise verb used, ⚪ no
  quantitative-change verb present.
- §6.5 dual absolute/relative framing: a percentage token with no adjacent absolute-value token (regex
  for `\d+%` not near a second number) → 🔴; percentage with absolute value → 🟢; no percentage present →
  ⚪.
- §6.6 agentless, data-centric framing: first-person research-verb phrases (*we found*, *we observed*,
  *we discovered*) → 🔴 (suggestion: passive-voice rewrite, reusing the Clarity pass's own
  passive-construction generator — the two engine passes share this one helper function, SR-4); passive
  data-centric phrasing already present → 🟢; sentence has no findings-reporting verb → ⚪.
- §6.7 epistemic hedging: **OQ-S2, resolved** — a fixed hedge-word list (*may, might, could, suggests,
  indicates, appears to*) checked for presence in interpretive sentences (heuristic: sentence follows a
  results sentence and makes a claim beyond the raw data); missing → 🟡 (soft, not 🔴 — hedging is a
  judgement call a Tier-A pattern can flag but not confidently insist on) with a **template suggestion**
  ("consider a hedge such as *may*, *might*, or *suggests*"), not a full rewritten sentence — genuine
  paraphrase generation is explicitly deferred to a future Tier-B round if the template proves too blunt
  in practice (`Style_content.md`'s OQ-S2 note).
- §6.8 causal vs. associative: causal-verb list (*causes, drives, induces*) flagged 🟡 (not 🔴 — this
  needs study-design context a Tier-A pass can't verify) with a suggestion to confirm the design supports
  causal language; associative language present in an observational-sounding sentence → 🟢; no
  causal/associative claim → ⚪.
- §6.9 boundary/scope framing: same template-suggestion treatment as §6.7 — concessive-connector list
  (*while, though, however, that said*) present in an interpretive sentence → 🟢, absent → 🟡 with a
  template suggestion, not a generated concessive clause.
- §6.10 attribution/epistemic distance: a citation-shaped token (*Author et al.*, a parenthetical year)
  present in an interpretive sentence → 🟢; absent → ⚪ (this reference slice doesn't attempt to detect
  "should have cited something" — that needs world knowledge, correctly Tier-B territory, out of scope).

## 5. Decisions

- **AD-S1 (OQ-S1, resolved)** — `parser.levels: ["paragraph"]`, a single trivial level. Style has no
  clause/phrase/word nesting for a focus-level zoom to move through (`Style_content.md`'s Explainer format
  section already argued this); the generated focus CSS at `n=1` (`ParserShell.spec.md` AD-2) collapses
  clause-home and word-home to the same index, which is harmless — Style's spans never populate `.ph`
  anyway (§6 below uses `.cl`-equivalent genre-hue spans only, no phrase/word sub-structure). *Rejected
  alternative:* a two-level `["sentence","paragraph"]` split — rejected as speculative; nothing in the
  reference slice's rule set needs a sentence-vs-paragraph granularity distinction, and `files.styles` is
  the escape hatch if a real need appears later.
- **AD-S2 (OQ-S2, resolved)** — Academic English's judgement-heavy sub-rules (§6.7, §6.8, §6.9) stay
  Tier A with fixed template suggestions rather than promoting to Tier B, **and** render 🟡 rather than 🔴
  when unmet — the confidence a Tier-A pattern can have about "this needed a hedge" is genuinely lower
  than "this sentence is in the passive voice," and the traffic light's three-state design already has a
  slot for exactly that lower confidence. *Rejected alternative:* Tier-B (API) paraphrase suggestions for
  these three rules only — rejected for this slice because it would make Style's reference build partially
  online-dependent (`Parser_guide.md` §4's Tier-B "needs a key + internet; costs per use; slower"),
  contradicting the whole cartridge's stated Tier-A/offline design; revisit only if the template
  suggestions prove unhelpful in practice.
- **AD-S3** — The sweep-selector's `selection` object is passed as `ENGINE.parse`'s *second* argument
  rather than folded into `CONFIG` or read from the DOM by the engine directly. *Rationale:* keeps
  `ENGINE.parse(text)`'s existing one-argument contract valid for every cartridge that doesn't declare
  `sweeps.enabled` (FR-S4) — an additive parameter is invisible to a function that doesn't declare it, so
  Grammar's `ENGINE.parse` needs zero changes. *Rejected alternative:* have the shell filter `ParseResult`
  post-hoc by sweep selection — rejected because the engine, not the shell, knows which `CONTENT` ids
  belong to which sweep; making the shell filter would require it to understand cartridge-specific id
  semantics, breaking the shell/cartridge boundary (`ParserShell.spec.md` FR-9).

- **AD-S4 (discovered during browser verification, 2026-08-11; resolved 2026-08-13, §10)** — `colours.palette`
  shipped with **one hue only** for the reference slice, not one-per-eventual-genre. *Why:* the shared
  `render()` assigned a pseudo-clause's hue by its **array index** in `_clauses`, cyclically
  (`pal[cx % pal.length]`, `_shell/src/ui.js`) — Grammar's structural-kinship model, where every clause is
  its own semantic unit and deserves its own hue. Style wants the opposite: every finding from the *same*
  genre sweep should share *one* hue, however many findings that paragraph has (confirmed live: a
  two-passive-clause sentence rendered "was reviewed" teal and "was reached" blue against a 2-hue palette
  — wrong). With exactly one hue, `cx % 1 === 0` always, so every Clarity finding landed on `pal[0]`
  regardless of count — correct only for a single active genre sweep, and known not to survive a second
  one. **Resolved in §10**: `render()`/`buildClauseChips()` now look up a clause's hue via an optional
  `cl.hueIndex` field, set by `style_engine.js` from `CONFIG.sweeps.items[].hue` (matched against
  `CONFIG.clausePalette` by name), falling back to `cx % pal.length` when absent — additive and invisible
  to any cartridge whose clauses never set it (Grammar).

## 6. Explainer format (consolidated from `Style_content.md`, unchanged in substance — see that file for the full rationale)

Genre sweeps: findings table (*Excerpt · Genre chip · Rule id/name · Confidence · Suggested revision*)
reusing `.xt` (`03-components.md`), then a rules-extracted section reusing `#rules .cat`/`ul`/`.ex`,
deduplicated per unique `CONTENT` id, grouped under a genre sub-heading. Layer 1 = the flagged span in
the genre's hue (single intensity, no shade/tint — §"Colour model" below). Layer 2 = click-to-expand
rule id + confidence. Antithesis-mode hits render in the *same* hue (never both modes' hits shown at
once — a genre and its antithesis are mutually exclusive per run).

Register sweeps: the traffic-light scorecard — one `.ic`-family row per rule (`03-components.md`'s
icon-bar component, reused verbatim, not a new primitive), glyph 🟢/🟡/🔴/⚪ from `EXPLAINER`, hover/click
reveals the excerpt + suggestion. 🔴/🟡 rows additionally get a Layer-1 span highlight using the new
`--tl-red`/`--tl-amber` tokens (FR-S7); 🟢/⚪ rows highlight nothing. Every rule renders every run,
including 🟢 — deliberately unlike Grammar's FR-17 "no 0-errors placeholder" convention, because the
scorecard's entire purpose is the full checklist, not a decluttered flag list.

**Colour model note:** genre hues are single-intensity (no shade/tint triad), unlike Grammar's
structural-kinship model — see `Style_content.md`'s Explainer format section, §"Colour model —
categorical, not structural-kinship," for the full reasoning; not re-derived here.

## 7. Worked-example ACs (reference slice)

- **AC-S1** — Selecting Clarity (affirmative mode) and parsing "The report was reviewed by the committee,
  and a decision was reached by them to approve the project." flags both passive constructions under
  §1.1, Layer 1 highlights them in Clarity's hue, the Explainer table shows two rows (excerpt · Clarity ·
  1.1 · confidence · an active-voice rewrite), and the rules-extracted section shows §1.1's definition +
  example once (deduplicated).
- **AC-S2** — Toggling Clarity to Opposite (Obscurity) and parsing the same sentence: the same passive
  spans are still highlighted (same detector), but the Explainer now cites §8.1 ("Passive voice as a
  distancing register"), frames it as a recognised register rather than a fix-this finding, and shows no
  suggested rewrite.
- **AC-S3** — Selecting only Academic English and parsing "We found an inverse relationship between X and
  Y. This is a big change. Scores went up." produces a 10-row scorecard: §6.6 🔴 ("we found" — agentless
  suggestion), §6.2 🔴 ("big" — a subjective qualifier with no accompanying number/statistic), §6.4 🔴
  ("went up" — precise-verb suggestion), remaining rules 🟢/⚪ as their own checks resolve; Layer 1
  highlights the three violating sentences in `--tl-red`; clicking any 🔴 row reveals its excerpt +
  suggestion.
- **AC-S4** — No sweep selected, Parse clicked: no error, no blank screen — the summary line reads
  "Select a sweep above, then Parse." (FR-S8).
- **AC-S5** — Rebuilding Grammar's existing cartridge through the chassis-extended `assemble.py` produces
  byte-identical output to the currently-shipped `Grammar_parser.html` (Grammar declares no `sweeps:` key
  and emits no `'na'` findings, so both extensions are no-ops for it) — proven by diff, not assumed.
- **AC-S6** — Opened offline (Wi-Fi off, double-click from Dropbox), all of AC-S1–AC-S4 hold with zero
  network requests.

## 8. Prerequisites & dependencies

- **Required first:** This spec approved (✅ 2026-08-11, per the content-sign-off and chassis-go-ahead
  confirmations). `GrammarParser.spec.md` and `ParserShell.spec.md` read and cited (done, this file).
- **Coordinate-with:** `ParserShell.spec.md` gains FR-S3–S7 as a new section (Step 2 of
  `style-parser-cartridge-build.md`), annotated as Style-originated per the same pattern FR-18 used for
  MiniWiki.

**Gate:** code may start now — both blocking questions this spec depended on (content sign-off, chassis
go-ahead) are resolved (table above).

## 9. Verification — definition of done (reference slice, §§1-9)

- [x] AC-S1–AC-S6 demonstrated (browser-verified 2026-08-11/12)
- [x] `node --test` / `python3 -m unittest` pass for every new module (TEST-1/TEST-2 for
      `style_engine.js`/`style_explainer.js`/`compile_style_content.py`; TEST-8 for the `ui.js`
      sweep-selector/`'na'` addition) — 34/34 passing
- [x] `ParserShell.spec.md` carries FR-S3–S7, annotated as this spec's origin
- [x] Grammar's cartridge rebuilds byte-identical post-chassis-change (AC-S5)
- [x] `TE-05-writing-style-app/registry.md`, `Parser_guide.md`, `Style_content.md` updated to match reality

Reference-slice verification complete 2026-08-12. §10 below records the remaining-sweeps extension
(action #4) and its own verification, completed 2026-08-13.

## 10. Remaining-sweeps extension (style-parser-remaining-sweeps plan, 2026-08-13)

Extends the reference slice above to all 7 sweeps — Brevity, Coherence, Voice, Diction (+ antitheses
Verbosity, Incoherence, Affectation, Ornament) and the Simple/Descriptive English register — per
`TE-05-writing-style-app/registry.md` action #4. No new chassis primitive beyond AD-S4's resolution
(below); everything else is Style-cartridge-local (`config.yaml`, `style_engine.js`,
`style_explainer.js`).

### 10.1 Requirements

- **FR-S10** — `style_engine.js`'s single `clarityPass`/`buildClarityResult` pair generalises into a
  reusable genre-pass dispatch table (`GENRE_SWEEPS`), each entry a `{id, pass, section, label,
  oppSection, oppLabel}` tuple; `buildGenreResult(hits, sweepId, opposite)` replaces the old
  single-genre `buildClarityResult`, shared by all five genre passes. `REGISTER_SWEEPS` is the
  equivalent table for the two register scorecard passes.
- **FR-S11** — Four new genre passes (`brevityPass`, `coherencePass`, `voicePass`, `dictionPass`), each
  Tier A / fuzzy-confidence-weighted in the same style as `clarityPass` (§4 above), reusing shared
  detectors where the content genuinely overlaps (SR-4): `PASSIVE_RE` (Clarity §1.1, Voice §4.1),
  `ORNATE_WORDS` (Voice §4.3/§11.2, Diction §5.2/§12.2), `INFLATED_WORDS` (Brevity §2.3/§9.2,
  Simple/Descriptive English §7.2).
- **FR-S12** — One new register pass, `simpleDescriptiveEnglishPass` (§7.1–7.20), same scorecard style
  as `academicEnglishPass` (every rule always produces exactly one `check`/`info`/`flag`/`na` finding).
  `registerHelpers(toks)` factors the `na`/`verdict` builders both register passes share (previously
  duplicated inline in `academicEnglishPass` alone).
- **FR-S13 (AD-S4, resolved)** — `_shell/src/ui.js`'s `render()`/`buildClauseChips()` look up a clause's
  palette hue via an optional `cl.hueIndex`, when a cartridge sets it, before falling back to the
  existing `pal[cx % pal.length]` array-position rule. `style_engine.js`'s `hueIndexForSweep(sweepId)`
  resolves it from `CONFIG.sweeps.items[].hue` matched against `CONFIG.clausePalette` by name, caching
  per parse-module lifetime; an antithesis shares its genre's own resolved index (same detector, two
  mutually exclusive modes). Additive-only: a cartridge whose clauses never set `hueIndex` (Grammar) is
  unaffected — proven by a dedicated shell-level regression test (`_shell/tests/js/test-ui.mjs`), not
  just by inspection.
- **FR-S14** — Every finding gains a `cat: "genre" | "register"` tag (`ParseResult.findings[].cat`,
  Style-local extension to the shared schema — additive, no other cartridge reads it); every
  classification gains the matching `cat`. `parse()`'s `sweepCategory` accumulator generalises from a
  two-branch special case (exactly one genre + one register) to a `markCategory(cat)` helper that
  correctly reaches `"mixed"` for any 2+ simultaneously active sweeps of different categories, and stays
  `"genre"`/`"register"` when 2+ sweeps of the *same* category run together (never exercised by the
  reference slice, which only ever had one sweep of each category to select).
- **FR-S15** — `style_explainer.js`'s `genreTable`/`registerScorecard` filter `R.findings` by `f.cat`
  before rendering, so a `"mixed"` run's two tables never leak into each other. `genreRules`/
  `registerRules` group deduplicated rule ids under **each finding's own originating sweep**, resolved by
  matching the id's leading section number against `R.summary.classifications` (matched by `cat` too, so
  a genre id and a register id sharing a bare number never collide) — not a single heading borrowed from
  `classifications[0]`, which was only ever correct in the reference slice's one-sweep-at-a-time world.

### 10.2 Two engine bugs found and fixed (not in scope of the reference slice, which never exercised them)

- **AD-S5** — `splitSentences()`'s sentence-boundary check tested the wrong thing: whether the token
  *after* a `.`/`!`/`?` started with a letter, rather than whether there was a whitespace gap before it.
  Since ordinary English sentences are followed by a capital letter, this heuristic silently never split
  a normal multi-sentence paragraph at all — invisible in the reference slice because Clarity and
  Academic English's rules only ever scan `texts.findIndex`/`full` across whatever `sentences` came back,
  correctness or not, and neither rule's assertions depended on an accurate sentence *count*. Coherence's
  §3.1 ("a non-first sentence…") and §3.2 ("3+ sentences with no connector"), and Simple/Descriptive
  English's §7.7 (20-word cap) and §7.17 (5-sentence cap), all genuinely need correct splitting to
  function — the bug surfaced immediately once those rules were written and tested. Fixed: the boundary
  check now compares token character offsets (`next.start > t.end`) — a real whitespace gap — Style-local,
  no `_shell/` change.
- **AD-S6** — `sentenceText()` joined every token (words *and* punctuation) with a single space, so
  reconstructed text never matched normal English typesetting ("`etc .`", "`( 2023 )`", "`45 %`",
  "`meetings , decided`") — breaking any rule regex written against realistic punctuation adjacency. This
  was already latent in the reference slice's own Academic English pass (`CITATION_RE`'s `(\d{4})`,
  `ABSOLUTE_NEAR_PERCENT_RE`'s `(from…`) but never caught: the AC-S3 worked example contains no citation
  and no percentage-with-absolute-value case. Fixed: `sentenceText()`/`charRangeToTokenRange()` now
  reconstruct text with the same no-space-before-closing-punctuation / no-space-after-opening-bracket
  rule as `EXPLAINER.needSpace()` (reimplemented locally — `ENGINE` never imports `EXPLAINER`, FR-3/FR-4)
  — fixing citation and percent-pairing detection as a side effect, confirmed by test.
- **AD-S7** — `buildGenreResult()` numbers each finding's `spanRef` against its own call-local `spans`
  array (0-based); concatenating a second genre sweep's results in `parse()` without adjustment let the
  second sweep's findings carry `spanRef` values that collided with the first sweep's span indices in the
  final merged `spans[]` — e.g. a Voice finding's excerpt rendering as Brevity's matched text. Fixed:
  `parse()` offsets each sweep's `spanRef`s by the running `spans.length` before concatenating, so
  `spanRef` stays a correct absolute index per `ParserShell.spec.md` §6's own definition ("index into
  `spans[]`"), not just coincidentally right when only one genre sweep is ever active. Caught during
  browser verification (a real excerpt/rule mismatch, not a test artifact) and given a dedicated
  regression test.

### 10.3 Worked-example ACs (remaining-sweeps extension)

- **AC-S7** — Selecting Brevity (affirmative) and parsing "In light of the fact that the meeting has been
  postponed…" flags §2.1/§2.2/§2.3 as designed; toggling to Verbosity (opposite) on "We gather, in this
  place, at this hour, to remember…" recognises §9.1 as a chosen register, not a violation.
  Browser-verified live 2026-08-13 as part of AC-S9 below (Brevity run alongside Voice).
- **AC-S8** — Selecting Coherence (affirmative) and parsing a paragraph combining all four worked
  examples (§3.1 old-before-new, §3.2 no-connector, §3.3 a long parenthetical before a decision verb,
  §3.4 a broken parallel) flags all four in one run, each correctly excerpted; toggling to Incoherence
  (opposite) on the §10.1/§10.2 worked examples recognises both as deliberate technique. Browser-verified
  live 2026-08-13 (`http://localhost:8799/Style_parser.html`, Coherence-only run — all four rules fired,
  purple hue, single "COHERENCE" heading).
- **AC-S9** — Selecting Brevity **and** Voice together (two simultaneously active genres — the case the
  reference slice never had a second genre to test) on "Mistakes were made… In light of the fact
  that…" renders Brevity's hits in amber and Voice's hits in pink (AD-S4/FR-S13 proven live, not just by
  the shell's own vm-sandboxed test), the findings table shows all six rows with the *correct* rule
  attached to each excerpt (AD-S7/FR-S7 fixed — "were made"/"was postponed" under §4.1, not "the fact
  that"), and the rules-extracted section shows two separate headings, "BREVITY" and "VOICE", each
  listing only its own rule (FR-S15). Browser-verified live 2026-08-13.
- **AC-S10** — Selecting Diction, Academic English, **and** Simple/Descriptive English together (one
  genre + two simultaneously active registers) on a paragraph hitting all three flags a single Diction
  row (§5.1) in its own findings table; both register scorecards render together (10 + 20 = 30 rows,
  correct lights); the rules-extracted section shows three separate headings — "DICTION", "ACADEMIC
  ENGLISH — NEEDS ATTENTION", "SIMPLE/DESCRIPTIVE ENGLISH — NEEDS ATTENTION" — with zero
  cross-contamination between any of the three (FR-S15's `cat`-filtering and multi-heading grouping both
  proven for 3 sweeps at once, not just 2). Browser-verified live 2026-08-13, zero console errors, zero
  app-triggered network requests (offline, matching AC-S6's original bar).
- **AC-S11** — Selecting Voice or Diction toggled to their antithesis (Affectation, Ornament) confirms
  the "no antithesis run" rules stay silent in opposite mode: §4.1 (passive) never fires under
  Affectation (Clarity/Obscurity's §8.1 already owns that ground) and §5.1 (cliché) never fires under
  Ornament (freshness isn't lifted, only sparingness is) — enforced by dedicated `node --test` assertions
  (`test-style_engine.mjs`), not just narrative.
- **AC-S12** — Rebuilding Grammar's cartridge through the now-twice-extended `assemble.py`/`ui.js` is
  **functionally, not byte-, identical**: `diff` against the pre-AD-S4 shipped `Grammar_parser.html`
  shows exactly the two intended `render()`/`buildClauseChips()` source lines changed (comments included)
  and nothing else — literal byte-identity is no longer achievable once shared `ui.js` source text itself
  changes, unlike FR-19/FR-20's earlier opt-in-block extensions, which touched no existing line. Verified
  instead by: (a) the isolated diff showing only the intended hunks, (b) the shell's full existing test
  suite passing unchanged, (c) a new dedicated test proving a hueIndex-less clause (Grammar's own case)
  computes the exact same hue as before the change.

### 10.4 Verification — definition of done (remaining-sweeps extension)

- [x] AC-S7–AC-S12 demonstrated
- [x] `node --test` passes for every new/changed engine and explainer module — 32/32 Style JS tests
      (was 16), 19/19 shell JS tests (was 18, +1 for AD-S4/FR-S13's regression test); `python3 -m
      unittest` unchanged at 5/5 Style + 18/18 shell (content compilation untouched by this extension)
- [x] `Style/cartridge/build/config.yaml` declares all 7 sweeps, each genre with its own palette hue
- [x] Grammar's cartridge rebuilds functionally identical post-extension (AC-S12; see there for why
      "byte-identical" is no longer the literal bar)
- [x] `TE-05-writing-style-app/registry.md` action #4 marked Done; Definition of Done's sweep line
      updated; `Style_content.md`'s banner reviewed for accuracy
- [x] This spec's own Status set to Done and moved to `Specs/Done/StyleParser.spec.md`

**Known limitations carried forward (not blocking, logged to `Memory/Long-Term/Logs/issues.log`
2026-08-13, both pre-existing/discovered-not-introduced by this extension):** register findings' Layer-1
`--tl-red`/`--tl-amber` span highlighting was never wired into `render()` (the CSS tokens exist, FR-S7,
but no code path applies them); a few Simple/Descriptive English rules (§7.10, §7.13, likely others)
compile to an empty `CONTENT[id].d` because their source file gives them only a heading + one `Example:`
line — cosmetic, the scorecard's own `explain` text still carries the full detail.

**On completion:** Status set to Done (above); this spec moves to `Specs/Done/StyleParser.spec.md`.
