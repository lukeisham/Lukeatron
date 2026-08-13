# Generator Shell — Technical Spec

| Field | Value |
|---|---|
| **Type** | Build |
| **Date** | 2026-08-09 (Parser origin); extended 2026-08-12 for Generator's `analyse`/`present` mode split |
| **Status** | Draft |
| **One-liner** | The shell↔cartridge contract for `System/Widgets/Generator/_shell/`: what a cartridge must export, what `ParseResult` must contain, what the shell provides for free in each of the two `generator.mode` values (`analyse`/`present`), and the assembler that welds cartridge + shell into one offline HTML file. This chassis is forked from the Parser project's shell (`System/Widgets/Parser/_shell/`, read-only reference) — inherited FR/AD/AC numbering below traces to that lineage; §3b/D-1–D-3 (Generator DECISIONS.md) are the additions specific to this fork. |

## 1. Motivation

All 13 `<Store>/build/template.html` files are byte-identical clones of Grammar's 1340-line
monolith (SR-4's standing example). `template.html` bakes generic UI harness together with
Grammar-specific parsing logic in the same file, so "building" a new parser today means
copy-pasting 1340 lines and hand-editing them apart from the working reference. This spec
pins the seam **before** any code moves, per `Parser_guide.md` §5b and plan
`parser-shell-and-spelling-module` step 4b: it is the contract the shell and every future
cartridge (starting with Grammar) build against, not a byproduct of the build.

The governing plan's decisions D-0–D-6 are binding here, principally: **D-1** (spelling is a
peer module the shell wires in, not shell code); **D-3** (Grammar is a cartridge, full stop —
nothing in `Grammar/` is importable by another parser); **D-4** (source stays multi-file;
the assembler concatenates to one HTML); **D-6** (focus-level CSS is generated from
`CONFIG.levels`, not hardcoded).

## 2. Scope

**In scope:**
- The complete cartridge export contract: `CONFIG`, `CONTENT`, `ENGINE`, `EXPLAINER`.
- The `ParseResult` JSON schema, resolving the drift the audit found between spec AD-2
  (`Grammar/Specs/Done/GrammarParser.spec.md`) and the shipped code.
- What the shell provides to every cartridge: lexicon portal, display harness, export bar,
  cap enforcement, spelling module wiring, focus-level renderer.
- The generic focus-level model (D-6): how a cartridge declares levels and gets CSS without
  the shell hardcoding Grammar's four.
- The assembler: CLI, cartridge manifest format, folder contract, injection order, and
  build-time validation (fails loudly, exits non-zero — PY-6).
- Migration acceptance criteria proving the rebuilt Grammar is functionally identical to the
  currently shipped `<cartridge>_generator.html`.

**Out of scope:**
- The spelling module's own interface (`SpellingModule.spec.md`, sibling spec) — this spec
  only covers how the shell wires an already-built spelling module in.
- Building the other twelve cartridges — this spec is the contract they will build against;
  their specs come later, gated on this one and on Grammar's successful migration.
- Any Tier-B (API/agent) wiring — the shell reserves the slot; it stays disabled.
- Rewriting `Grammar_contents.md` or any linguistic content — content migrates as-is.

## 3. Requirements

**Cartridge export contract**

- **FR-1** — A cartridge is a folder containing `build/config.yaml` (the manifest, §5b) plus
  the files it names: an ENGINE module, an EXPLAINER module, optionally a CONTENT source
  (`*_contents.md`), optionally a lexicon `.db`, optionally a cartridge CSS file. No other
  shape is recognised by the assembler.
- **FR-2** — `CONFIG` is a plain object with these fields. All are **required** unless
  marked optional; the assembler rejects a manifest missing a required field, naming it.

  | Field | Type | Required | Notes |
  |---|---|---|---|
  | `name` | `string` | yes | Display name, e.g. `"Grammar parser"` |
  | `version` | `string` (semver) | yes | e.g. `"1.0.0"` |
  | `builtFrom` | `string` | yes | Content source filename, shown in footer |
  | `inputUnit` | `string` | yes | Display label, e.g. `"one sentence"` |
  | `cap` | `number` (int > 0) | yes | Word cap (FR-8-shell below) |
  | `levels` | `string[]` (1+, ordered coarse→fine) | yes | Focus-level names (D-6, §3-focus below) |
  | `clausePalette` | `array` of `{h50,h100,h600,h800,hf,name}` (1+) | yes | Hue families for the structural-kinship colour model (AD-7, inherited) |
  | `tentativeThreshold` | `number` (0–1) | yes | Confidence below this renders "tentative" (dashed underline) |
  | `tierB` | `{enabled: boolean, note: string}` | yes | Disabled slot; `enabled` must be `false` in this build |
  | `focusLabels` | `Record<levelName, string>` | **optional** | Human-readable key text per level (e.g. `"Sentence focus"`); shell falls back to `Title-case(levelName) + " focus"` if omitted (resolves audit §2a.4) |
  | `icon` | `string` (inline SVG `data:` URI) | **optional** | Cartridge favicon, substituted into shell.html's `<link rel="icon">` via `__ICON_HREF__`; the assembler falls back to the shell's generic "P" badge SVG if omitted. Added to close a regression where the shared shell had no per-cartridge icon field and rebuilt widgets lost their cartridge-specific favicon (e.g. Grammar's "G" badge, restored via `Grammar/cartridge/build/config.yaml`'s `cartridge.icon`, sourced verbatim from the shipped `Grammar/<cartridge>_generator.html`'s `<link rel="icon">`). |

- **FR-3** — `CONTENT` is an object keyed by outline-number ID (AD-3 convention, inherited
  from the Grammar spec and unchanged by this migration): `{"<id>": {n: string, l: string,
  d: string, e: string|string[], ...}}` where `n` = name, `l` = level, `d` = definition,
  `e` = example(s). IDs are the cartridge's content-file outline numbers verbatim
  (`"1.3"`, `"4.1n"`, `"5.3.1"`) and are the only cross-reference key used anywhere in
  `ParseResult`, colour keys, or the Explainer.
- **FR-4** — `ENGINE` exports exactly:
  ```javascript
  var ENGINE = { parse: fn, tokenize: fn, CLOSED: obj };
  ```
  - `parse(text: string) → ParseResult` — the sole engine entry point (§4).
  - `tokenize(text: string) → Token[]` — used by the shell's word-count and (per D-5) *not*
    by the spelling module, which owns its own tokenizer. `Token` = `{i, text, start, end,
    isWord}` at minimum.
  - `CLOSED: Record<className, Record<word, 1>>` — closed-class word lists, cartridge-owned;
    the shell reads `CLOSED` only via `Object.keys(...)` for its own display bookkeeping
    (e.g. `wordCount`), never for parsing.
- **FR-5** — `EXPLAINER` exports exactly:
  ```javascript
  var EXPLAINER = {
    tables: fn, rules: fn, toMarkdown: fn, toText: fn,
    funcOf: fn, phraseOf: fn, clauseOf: fn, posShort: fn, needSpace: fn
  };
  ```
  Verified against `template.html:1054` (the code's own `return {...}` for the current
  `EXPLAINER` closure) — the audit's list of "roughly eight helpers" is confirmed exact at
  eight for the *current* build (`tables, rules, toMarkdown, toText, funcOf, phraseOf,
  clauseOf, posShort`); this spec adds **`needSpace`** as a ninth required export (§3-AD-1
  below) to close a real coupling gap the audit found but the code has not yet fixed.
  - `tables(R: ParseResult) → html` — the tabled-sentence Explainer section.
  - `rules(R: ParseResult) → html` — the deduplicated rules-extract section.
  - `toMarkdown(R: ParseResult) → string`, `toText(R: ParseResult) → string` — export formats.
  - `funcOf(R, tokenIndex) → string` — clause-element role of a token.
  - `phraseOf(R, tokenIndex) → Span | null`, `clauseOf(R, tokenIndex) → Span | null`.
  - `posShort(token) → string` — short POS/word-class label for Layer-3 display.
  - `needSpace(a: Token, b: Token) → boolean` — inter-token spacing rule for rendering
    (§5-AD-1: promoted from shell-hardcoded to cartridge-supplied).

**`ParseResult` schema (the shell's read contract)**

- **FR-6** — `ENGINE.parse()` returns exactly the schema in §4. The shell, the Explainer
  helpers, and every export path read **only** from this object — never the DOM, never each
  other (inherited from `GrammarParser.spec.md` FR-3, unchanged).

**Shell-provided services**

- **FR-7** — The shell provides the **lexicon portal** (`LEX`): `LEX.init(dbBytes) →
  Promise`, `LEX.query(word) → {pos, alt, feat, rank} | null`, `LEX.has(word) → boolean`,
  `LEX.ready: boolean`, `LEX.morphOnly: boolean`, `LEX.count: number`. A cartridge that
  declares `lexicon.enabled: true` in its manifest gets this for free; a cartridge with no
  lexicon never calls it and `LEX.ready` stays `false`.
- **FR-8** — The shell enforces **input cap** from `CONFIG.cap`: over-cap input shows the
  warning, blocks parsing, never truncates (inherited FR-8 from the Grammar spec, now
  generic over any cartridge's cap).
- **FR-9** — The shell owns the **display harness**: input area, Parse/Explain/Display-all
  buttons, focus-level selector (rendered from `CONFIG.levels`), colour key, icon bar, stage
  renderer, hover pop-ups, right-click token menu, footer. None of this is cartridge code.
- **FR-10** — The shell owns the **export bar** (PDF/PDF-bare/Markdown/plain-text), calling
  only `EXPLAINER.tables`/`.rules`/`.toMarkdown`/`.toText` — never re-deriving Explainer
  content itself (inherited FR-7 from the Grammar spec).
- **FR-11** — The shell wires in the **spelling module** (`_modules/Spelling/`, D-1) as an
  injected dependency, not shell code: the shell supplies the DOM mount points (input
  element, suggestion popover) and calls the module's public API
  (`SpellingModule.spec.md` §3) with its own tokenizer (D-5) — the shell never calls
  `ENGINE.tokenize()` for spell-checking, closing the coupling the audit flagged at
  `template.html:1078`.
- **FR-12** — The shell renders **focus levels generically** from `CONFIG.levels` (§3-focus).

**Focus-level generalisation (D-6)**

- **FR-13** — A cartridge declares an **ordered, coarse-to-fine** list of level names in
  `CONFIG.levels` (Grammar: `["sentential","clausal","phrasal","lexical"]`). The assembler
  generates, per level `L` at ordinal position `p`, CSS rules following one fixed generic
  template (§5-AD-2) — no cartridge needs to hand-write `.v-<level>` selectors for the
  default look; a cartridge *may* supply `files.styles` CSS that loads after the generated
  block and may override any of it.
- **FR-14** — Clause/phrase/word spans participating in the generic renderer carry an
  optional `abbr` field (short chip label, e.g. `"IND 1"`, `"REL"`) and an optional `role`
  field (e.g. `"independent"`, `"dependent"`) on `kind: "clause"` spans — see §4 — so the
  shell's rendering loop stops deriving IND/DEP/REL labelling itself (audit's contested
  §1157–1207 finding; that logic is Grammar-specific and belongs in the cartridge).

**Assembler**

- **FR-15** — One shared `_shell/build/assemble.py` (Python stdlib only — PY-1, SR-2)
  replaces the 13 `build_parser.py` clones. Signature:
  `python3 _shell/build/assemble.py <cartridge_dir> [output.html]`.
- **FR-16** — The assembler validates a cartridge before writing output and **exits
  non-zero with a named failure on any violation** (PY-6); see §4-assembler for the full
  check list. No output file is written on a failed validation.
- **FR-17** — The assembler is idempotent and import-safe (PY-3): running it twice on an
  unchanged cartridge produces byte-identical output; importing `assemble.py` as a module
  performs no I/O.

**MiniWiki module wiring (added post-approval — see note below FR-18)**

- **FR-18** — The shell wires in the **MiniWiki module** (`_modules/MiniWiki/`) as a second
  injected peer module, mirroring FR-11's spelling relationship but with a different delivery
  mechanism: rather than mounting into the parser page's own DOM, `src/miniwiki-seam.js`
  builds a complete, self-contained HTML document at click time and opens it in a **new
  browser tab** (`Blob`+`URL.createObjectURL`+`window.open`, falling back to
  `window.open("")+document.write()`), with its own independent hash routing and history. A
  cartridge opts in with `miniwiki.enabled: true` + `miniwiki.articlesFile` in `config.yaml`
  (default off — an omitting cartridge assembles byte-identically to one that never mentions
  the key); the assembler embeds the module's bundled JS as a string constant
  (`MINIWIKI_BUNDLE_SRC`, never executed in the parser page's own window) plus the
  pre-extracted article JSON (`MINIWIKI_ARTICLES`, from
  `_modules/MiniWiki/build/extract_articles.py`'s output). If `window.open` is blocked, the
  shell shows an inline warning (`#miniwikiwarn`) rather than failing silently (JS-2).

  *Note on this addition:* this spec (dated 2026-08-09) predates the MiniWiki module's build
  and, as originally approved, names only the spelling module throughout §§1–8 — FR-18 and
  the manifest/assembler-order updates below were added afterward to bring the written
  contract in line with what `assemble.py`, `shell.html`, and `miniwiki-seam.js` actually
  ship, per the documentation-must-match-the-code rule. The out-of-scope line in §2 excluding
  "the spelling module's own interface" is unaffected — `MiniWikiModule.spec.md` is the
  sibling spec for MiniWiki's own interface on the same basis.

**Sweep-selector UI + `severity: 'na'` (added post-approval — Style origin, see note below FR-22)**

- **FR-19** — A cartridge opts in to a **sweep selector** with `sweeps.enabled: true` +
  `sweeps.items` (a list of `{id, label, category: "genre"|"register", hue, section,
  oppositeId?, oppositeLabel?, oppositeSection?}` — `oppositeId`/`oppositeLabel`/
  `oppositeSection` only meaningful, and only present, on `category: "genre"` items) in
  `config.yaml` (default off — an omitting cartridge assembles byte-identically to one that
  never mentions the key, same pattern as `miniwiki.enabled`/FR-18).
- **FR-20** — When `sweeps.enabled`, the shell renders one checkbox per `sweeps.items` entry
  above the input area (all unchecked by default — no sweep runs implicitly), plus a small
  "Opposite" toggle beside any `category: "genre"` item's checkbox (enabled only once that
  item's own checkbox is checked, defaulting off). At Parse time the shell builds a
  `selection` object — `{ sweeps: { [id]: { on: boolean, opposite: boolean } } }` — from the
  current checkbox/toggle state and calls `ENGINE.parse(text, selection)`, an **additive**
  second argument to the existing one-argument `parse(text)` contract (FR-4): a cartridge
  whose `ENGINE.parse` declares only one parameter is unaffected by the extra call-site
  argument (ordinary JS call semantics), so `sweeps.enabled: false`/absent cartridges — every
  cartridge as of this writing — need zero `ENGINE` changes. The shell reads only
  `sweeps.items`' own declared fields to render; it never inspects `CONTENT` ids or infers
  sweep semantics itself (FR-9's "none of this is cartridge code" holds for this addition too).
- **FR-21** — `ParseResult.findings[].severity` gains a fourth legal value, `'na'` (§6's
  schema updated above), for cartridges whose findings model includes a "not applicable"
  state (e.g. a per-rule scorecard where a rule doesn't apply to the given input). The shell's
  icon-bar renderer already resolves glyph/colour per finding from cartridge-supplied
  `EXPLAINER` data rather than a hardcoded severity→colour switch, so no shell-side rendering
  logic changes — this FR only widens the schema's legal value set.
- **FR-22** — Three new CSS custom-property pairs are available to any cartridge's
  `files.styles` override: `--tl-red`/`--tl-red-bg`, `--tl-amber`/`--tl-amber-bg`,
  `--tl-grey`/`--tl-grey-bg` — deliberately **not** a reuse of the shell's existing `--red`,
  which `01-foundations.md`/`03-components.md` reserve for spelling-error underlines only.
  These three ship in `shell.css`'s `:root` unconditionally (harmless, unused custom
  properties for a cartridge that never references them) rather than being generated
  conditionally on `sweeps.enabled`, keeping the assembler's placeholder-substitution logic
  unchanged for this addition.

  *Note on this addition:* like FR-18 before it, this section was added after this spec's
  original approval, to bring the written contract in line with the Style reference-slice
  build (`Style/Specs/Done/StyleParser.spec.md`, which originates FR-19–22) — per the same
  documentation-must-match-the-code rule FR-18's note already states. Confirmed
  regression-safe against Grammar the same way FR-18 was: Grammar's manifest declares neither
  `sweeps` nor any `'na'` finding, so both additions are no-ops for it (proven by diff, not
  assumed — see `Style/Specs/Done/StyleParser.spec.md` AC-S5).

**Acceptance criteria** (observable, testable):

- **AC-1** — Feeding the assembler a `config.yaml` missing `parser.cap` exits non-zero and
  names `parser.cap` in the error message.
- **AC-2** — Feeding the assembler an `ENGINE` file with no `var ENGINE =` assignment (or an
  `EXPLAINER` file missing any of the nine §3-FR-5 methods) exits non-zero and names the
  missing export.
- **AC-3** — After assembly, the output HTML contains **zero** occurrences of `__[A-Z_]+__`
  (no surviving placeholders) — checked by regex scan as the assembler's own final step, not
  just by eyeballing.
- **AC-4** — Building Grammar's cartridge through the new assembler and opening the result
  offline (Wi-Fi off, double-click from Dropbox) reproduces every worked example in
  `GrammarParser.spec.md` AC-1–AC-12 (§6-migration below enumerates the check list).
- **AC-5** — Building a synthetic two-level test cartridge (`["macro","micro"]`, not
  Grammar's four) produces working focus-level buttons and CSS for exactly those two levels,
  with no orphaned Grammar-specific CSS rules present in the output.
- **AC-6** — `EXPLAINER.needSpace` and `EXPLAINER.posShort` are the only spacing/POS-label
  logic reachable from the shell's render loop — grep the shipped output for the local
  `shortPos`/`needSpace` re-implementations that exist in the current monolith
  (`template.html:1208–1220`) and confirm they are gone from the rebuilt shell code.
- **AC-7** — Rebuilding Grammar's cartridge through the sweep-selector/`'na'`-extended
  assembler (FR-19–22) produces byte-identical output to the currently-shipped
  `<cartridge>_generator.html` — Grammar declares no `sweeps` key and emits no `'na'` finding, so
  both additions must be no-ops for it, proven by diff. Full worked-example ACs for a
  cartridge that *does* use FR-19–22 (checkbox rendering, opposite toggle, `'na'` glyph
  rendering) live in `Style/Specs/Done/StyleParser.spec.md` §7 (AC-S1–AC-S6), the spec that
  originates this section, per the same delegation AC-4 already uses for Grammar's own ACs.

## 3b. The mode switch and the `present`-mode contract (Generator fork additions — task B/D)

Everything in §3 above (FR-1–FR-22) is inherited from the Parser project's shell verbatim and
governs `generator.mode: analyse` unchanged. This section is new to the Generator fork
(DECISIONS.md D-1): one shell, two mutually exclusive modes, declared per-cartridge.

- **FR-B1** — `config.yaml` requires `generator.mode`, one of the literal strings `"analyse"`
  or `"present"`. Missing or any other value is a named, non-zero build failure (PY-6) — there
  is no default mode.
- **FR-B2** — `CONFIG.generator.mode` is set from this field. An inline script at the top of
  `shell.html`'s body sets `document.body.classList.add("mode-analyse"|"mode-present")` before
  any harness script runs, so the very first paint already shows only the active mode's markup
  (`shell.css`'s `.analyse-only`/`.present-only` rules key off this class) — no flash of the
  wrong UI.
- **FR-D1** — In `present` mode, the shell hides the input area, word counter, cap gate, and
  spell-check control entirely (they have no meaning without user-typed text) and shows instead:
  a Generate button, a Copy button, and — each gated on its own `CONFIG.generator` feature flag
  — a Clue button, an answer input + Check button, a category picker, and an Explain button.
  None of this is cartridge code (mirrors FR-9's framing for analyse mode); the cartridge
  supplies only the item pool and the four present-mode `ENGINE` functions below.
- **FR-D2** — A present-mode cartridge's item pool is its `files.content` JSON file (same
  mechanism analyse-mode's `CONTENT` uses), an object keyed by item id. `generator.mode:
  present` makes a non-empty `files.content` a hard requirement — an empty or absent pool is a
  named, non-zero build failure.
- **FR-D3** — Present-mode `ENGINE` exports:

  ```javascript
  var ENGINE = (function () {
    function getPool() { /* -> PoolItem[], REQUIRED */ }
    function render(item) { /* -> {html, clueHtml?, canonicalText}, REQUIRED */ }
    function checkAnswer(item, userAnswer) { /* -> {correct, message}, REQUIRED iff generator.answer */ }
    function explainItem(item) { /* -> html string, REQUIRED iff generator.explainer */ }
    return { getPool: getPool, render: render, checkAnswer: checkAnswer, explainItem: explainItem };
  })();
  ```

  `parse`/`tokenize`/`CLOSED` (FR-4) are **not** required in `present` mode — the assembler's
  `validate_module_exports()` check branches on `generator.mode`, requiring `getPool`+`render`
  always, `checkAnswer` iff `generator.answer: true`, `explainItem` iff `generator.explainer:
  true`. `EXPLAINER`'s nine-key export set (FR-5) is likewise not checked in `present` mode —
  `files.explainer` stays a required manifest field for both modes (a cartridge may ship an
  empty `var EXPLAINER = {};` placeholder), but present-mode explanation is `ENGINE.explainItem`'s
  job, not `EXPLAINER`'s.
- **FR-D4** — `PoolItem` shape: `{ id: string (required, unique in the pool), category: string
  (required iff CONFIG.generator.categories is declared; must match one categories[].id),
  ...cartridge-defined fields ENGINE.render/checkAnswer/explainItem read }`. The shell reads
  only `id` and `category`; everything else is opaque to it, mirroring FR-9/FR-19's "the shell
  never interprets cartridge semantics" pattern.
- **FR-D5** — Item selection is a shuffled, no-immediate-repeat queue (Fisher–Yates) over the
  pool, scoped to the active category filter when `CONFIG.generator.categories` is declared;
  the queue reshuffles once exhausted. Never a naive independent-random pick (task D: "feels
  broken" if it repeats immediately).
- **FR-E1 (Tier B)** — `src/api.js` is the one place any `fetch()` lives (JS-5), shared by
  every present-mode cartridge. It calls the Claude API (`claude-sonnet-5`) directly from the
  page using a key read from `localStorage` only (never written to any file, SR-5) IF the
  cartridge additionally exports `ENGINE.buildRefreshRequest() -> {prompt}` and
  `ENGINE.parseRefreshResponse(text) -> PoolItem[]` — both optional; a cartridge that omits
  either simply never gets a working Refresh-pool button (degrades closed, same as no key or a
  failed request). A Tier-B failure at any point never disturbs the already-loaded Tier-A pool
  or any other control (JS-2).

**AC-B1** — A `config.yaml` missing `generator.mode` (or with an invalid value) is rejected,
naming `generator.mode`, before any other validation error masks it.
**AC-D1** — A present-mode cartridge whose `ENGINE` omits `render` is rejected, naming `render`.
**AC-D2** — A present-mode cartridge with an empty `files.content` pool is rejected.
**AC-D3** — Building a synthetic 2-item present cartridge and a 1-rule analyse cartridge (task
F's Sandbox proof) assembles both without error and each opens with zero console errors —
verified by running the assembler and the built HTML, not merely by reading the source.

## 4. Prerequisites & dependencies

- **Required first (build order):** This spec approved; `SpellingModule.spec.md` (sibling)
  approved — the shell needs its public API surface (not its internals) to write FR-11.
  Plan step 4b (this spec) precedes plan step 5a (shell build).
- **Choose-one (decision gates — decide before coding):** None — §5 resolves every
  contested seam the audit raised.
- **Coordinate-with:** `System/Suggestions/Parser_guide.md` §5b (updated after the build,
  plan step 9, not concurrently); `GrammarParser.spec.md` (AD-2 and AD-5 are annotated
  superseded on completion, per plan D-0 and §5-AD-3 below).

**Gate:** work (plan step 5a, shell build) may start when Luke approves this spec.

## 5. Decisions

- **AD-1 — `needSpace` and `posShort` move fully into `EXPLAINER`; the shell never
  re-implements them.** *Decision:* `EXPLAINER.needSpace(a,b)` and `EXPLAINER.posShort(t)`
  are required exports (FR-5); the shell's render loop calls only these, deleting the local
  `needSpace()`/`shortPos()` functions the audit found duplicating cartridge logic inside
  `UI.render()` (`template.html:1208–1220`, audit §2a.2–2a.3). *Rationale:* the audit found
  the shell **already defines and calls a local `shortPos()`** while `EXPLAINER.posShort()`
  sits unused (`template.html:213–220` vs `951–968`) — "the UI is calling the wrong
  function." English typographic spacing rules and POS-tag shortening are both
  parser-specific (a Logic or Style cartridge won't share Grammar's punctuation-spacing
  assumptions or POS taxonomy), so both belong behind the cartridge boundary, not hardcoded
  in chassis code that every future parser inherits unmodified. *Rejected alternatives:*
  (a) leave both in the shell parameterised by `CONFIG` flags — rejected because spacing and
  POS-shortening are open-ended per-cartridge logic, not a fixed enum a config flag can
  cover; (b) leave the status quo (shell re-implements, EXPLAINER's copy sits dead) —
  rejected because it is the exact defect the audit exists to catch, and it means a second
  parser inherits Grammar's hardcoded spacing/POS rules by accident.

- **AD-2 — Focus-level CSS is generated from `CONFIG.levels` by one fixed generic template,
  cartridge CSS layers on top.** *Decision:* the assembler emits, for each level `L` at
  ordinal `p` in `CONFIG.levels` (0-indexed, coarsest first), a block equivalent to:
  ```css
  #stage.v-{L} .cl { /* full intensity if this IS the coarsest structural unit, else var(--hf) */ }
  #stage.v-{L} .ph { /* full intensity only at levels finer than or equal to phrase-granularity */ }
  #stage.v-{L} .w  { /* full intensity only at the finest (last) level */ }
  ```
  concretely: at the generated default, the *last* level in the array gets full-intensity
  `.w` styling (word tints, per AD-7's structural-kinship model), the *first* level gets the
  bold clause-boundary treatment, and everything in between gets full-intensity `.ph`
  styling with clause hues faded via `var(--hf)`. A cartridge's `files.styles` CSS (optional,
  from the manifest, §6) is injected **after** this generated block, so it can override any
  selector without the assembler needing to know the cartridge's semantics. *Rationale:*
  this reproduces Grammar's exact current four-level behaviour (`template.html:40–51`)
  losslessly (Grammar becomes the p=0/1/2/3 instance of the generic template) while giving
  any cartridge with a different level count or names working default styling with zero
  custom CSS, satisfying D-6 and AC-5. *Rejected alternatives:* (a) require every cartridge
  to hand-write its own `.v-<level>` CSS from scratch — defeats the purpose of a shared
  shell, reintroduces per-parser CSS maintenance; (b) a declarative per-level JSON spec
  (e.g. `CONFIG.levelStyles`) richer than the coarse→fine ordinal template — rejected as
  premature: no second cartridge exists yet to prove the generic template is insufficient,
  and the escape hatch (`files.styles` override) already covers a cartridge that needs
  something the template can't express.
  **OQ-1** — Is "coarse→fine, nested containment" (clause ⊃ phrase ⊃ word) a safe
  structural assumption for *every* future cartridge, or only for tree-structured grammars?
  *Default if unconfirmed:* assume it for Grammar and any cartridge whose levels nest
  identically; a cartridge with genuinely non-nesting levels (e.g. two independent
  classification axes) is out of scope for this generic template and needs a
  design conversation before it is built, flagged here rather than guessed at.

- **AD-3 — `ParseResult` schema v2 supersedes `GrammarParser.spec.md` AD-2; the shipped
  code wins over the old spec text.** *Decision:* the schema in §4 below is now the single
  source of truth for every cartridge, including Grammar. Where the audit found the running
  code (`template.html`) diverges from AD-2's JSON example, the running code's shape is
  adopted as canonical (it is what the shipped, Luke-accepted Grammar parser actually does),
  and AD-2's text is annotated superseded — the same supersession pattern D-0 already applies
  to AD-5. *Rationale:* AD-2 was written before the code; the code has since been built,
  tested, and accepted by Luke (`GrammarParser.spec.md` §8, all boxes checked) — the working
  artifact is the higher-fidelity source of truth, and re-deriving a "clean" schema that
  doesn't match what ships would just recreate the drift on the next rebuild. *Rejected
  alternatives:* (a) keep AD-2's minimal schema and strip the extra fields from the code —
  rejected because several of the "extra" fields (`isWord`, `lexiconMode`) are load-bearing
  for features the accepted build actually has (offline-fallback messaging, spacing logic);
  (b) leave both documents standing with unresolved drift — explicitly rejected by this
  plan's spec-first requirement, which exists to prevent exactly this ambiguity reaching a
  second cartridge.

## 6. `ParseResult` schema (canonical, field-by-field)

```json
{
  "meta": {
    "asset": "string — CONFIG.name",
    "version": "string — CONFIG.version",
    "cap": "number — CONFIG.cap",
    "wordCount": "number",
    "overCap": "boolean",
    "lexiconMode": "string — e.g. 'embedded SQLite' | 'morphology-only (embedded db failed to load)'"
  },
  "tokens": [
    {
      "i": "number — token index",
      "text": "string",
      "start": "number — char offset",
      "end": "number — char offset",
      "isWord": "boolean",
      "tags": [
        {
          "id": "string — CONTENT id",
          "label": "string — readable label",
          "confidence": "number 0–1",
          "sub": "string, optional — subtype",
          "feat": "string[], optional — features"
        }
      ]
    }
  ],
  "spans": [
    {
      "start": "number — token index",
      "end": "number — token index",
      "id": "string — CONTENT id",
      "label": "string",
      "kind": "'clause' | 'phrase' | 'phrase-inner' | cartridge-defined",
      "confidence": "number 0–1",
      "tent": "boolean — render as tentative (dashed) below CONFIG.tentativeThreshold",
      "children": "Span[], optional — nested spans",
      "abbr": "string, optional — short chip label for generic clause/phrase chrome (FR-14)",
      "role": "string, optional — e.g. 'independent'|'dependent' on kind:'clause' spans (FR-14)",
      "x": "object, optional — cartridge-extension namespace; shell never reads into this, cartridge EXPLAINER methods may"
    }
  ],
  "findings": [
    {
      "id": "string — CONTENT id",
      "label": "string",
      "severity": "'check' | 'info' | 'flag' | 'na'",
      "spanRef": "number, optional — index into spans[]",
      "start": "number, optional — token index (present when not span-backed)",
      "end": "number, optional — token index",
      "explain": "string",
      "confidence": "number 0–1"
    }
  ],
  "summary": {
    "classifications": [ { "id": "string", "label": "string" } ],
    "counts": "object — cartridge-defined key/value counts (e.g. words, clauses, phrases)"
  },
  "_toks": "Token[], required internal — raw working tokens with .final tag state; the shell's render loop reads this directly for clause-boundary walking (see OQ-2)",
  "_clauses": "Span[], required internal — ordered clause list the shell's render loop walks for hue assignment (see OQ-2)"
}
```

A `findings` entry MUST carry `spanRef` or (`start` AND `end`) — never neither. `meta`,
`tokens`, `spans`, `findings`, `summary` are always present (an over-cap result short-circuits
to `{meta: {..., overCap: true}}` only, per FR-8/`template.html:882`).

**OQ-2** — `_toks`/`_clauses` are prefixed as private-by-convention but the shell's
`UI.render()` reads them directly (`template.html:1170`, confirmed against source) — this is
a real shell→cartridge-internals coupling the audit did not fully resolve. This spec keeps
them as **required** schema fields (not optional cartridge extras) because the shell cannot
render without them today, but flags this as unfinished business: a cleaner rebuild would
expose an `EXPLAINER`-mediated accessor (e.g. `EXPLAINER.clauseSpans(R)`) instead of the
shell reaching into underscore-prefixed fields. *Default if not revisited during the build:*
ship with `_toks`/`_clauses` as documented required fields; do not silently rename or drop
them, since the accepted Grammar build depends on their exact shape.

## 7. What the shell provides (summary — detail in §3)

1. Lexicon portal (`LEX`) — FR-7.
2. Display harness — input, buttons, focus selector, key, icon bar, stage, hover/context menu — FR-9.
3. Export bar reading only `EXPLAINER` outputs — FR-10.
4. Cap enforcement from `CONFIG.cap` — FR-8.
5. Spelling module wiring (injected dependency, own tokenizer per D-5) — FR-11.
6. Generic focus-level renderer + generated CSS from `CONFIG.levels` — FR-12/FR-13.

## 8. The assembler

**CLI:** `python3 _shell/build/assemble.py <cartridge_dir> [output.html]`
(default output: `<cartridge_dir>/<config.cartridge.id>_generator.html`).

**Cartridge folder contract** (validated, FR-16):
```
<Cartridge>/
├── build/
│   ├── config.yaml          # required — manifest, schema below
│   ├── <engine>.js          # required — path from config.files.engine
│   ├── <explainer>.js       # required — path from config.files.explainer
│   ├── <styles>.css         # optional — path from config.files.styles
│   └── <Lexicon>.db         # optional — path from config.lexicon.dbFile
└── <Cartridge>_contents.md  # optional — compiles to CONTENT
```

**Manifest (`config.yaml`) required fields:** `cartridge.name`, `cartridge.id`,
`cartridge.version`, `cartridge.builtFrom`, `parser.inputUnit`, `parser.cap`,
`parser.levels` (1+), `parser.tentativeThreshold`, `colours.palette` (1+ hue),
`files.engine`, `files.explainer`. Optional: `parser.focusLabels`, `files.styles`,
`files.content`, `lexicon.enabled` + `lexicon.dbFile` + `lexicon.schema`,
`spelling.enabled`, `miniwiki.enabled` + `miniwiki.articlesFile` +
`miniwiki.cartridgeName` (FR-18 — required together if `miniwiki.enabled: true`,
absent/false by default), `sweeps.enabled` + `sweeps.items` (FR-19/FR-20 — required
together if `sweeps.enabled: true`, absent/false by default).

**Injection order** (deterministic, single pass):
1. Load `_shell/build/shell.html` (the never-rewritten chassis skeleton).
2. Validate `config.yaml` against the required-field list above → fail closed, named field.
3. Build `CONFIG` JS object from the manifest.
4. Compile `CONTENT` from `*_contents.md` if present, else `{}`.
5. Load and validate `ENGINE` and `EXPLAINER` source files — confirm the exact export sets
   in FR-4/FR-5 are present (string-match the `var ENGINE =` / `var EXPLAINER =` assignment
   and every named key in its `return {...}`) → fail closed, naming missing exports.
6. Generate focus-level CSS from `CONFIG.levels` (AD-2's template) → append cartridge
   `files.styles` CSS after it, if present.
7. Embed lexicon (base64 `.db` + sql.js WASM) if `lexicon.enabled` → validate the `.db`
   opens as SQLite and matches `lexicon.schema` → fail closed on mismatch.
8. Wire in the spelling module (D-1, `_modules/Spelling/` — its own build output, treated as
   an opaque injectable block by this assembler).
8b. Wire in the MiniWiki module (FR-18, `_modules/MiniWiki/` — likewise an opaque build
    output) if `miniwiki.enabled`: embed `dist/miniwiki.bundle.js` as a JS string constant and
    the pre-extracted `articlesFile` JSON → fail closed, named field/file, if either is
    missing while `miniwiki.enabled: true`.
9. Substitute `__BUILD_DATE__` and any remaining shell placeholders.
10. **Final validation pass:** regex-scan the assembled output for `__[A-Z_]+__` — any match
    is a hard failure (AC-3), non-zero exit, no file written.
11. Write output; print path and size in MB.

**Validation checklist (all fail loudly, exit non-zero — PY-6):**
- `config.yaml` present, valid YAML, every required field present and correctly typed.
- `ENGINE`/`EXPLAINER` files exist, parse as valid JS (basic syntax check), export exactly
  the required key sets from FR-4/FR-5 — extra keys are allowed and passed through; missing
  keys are named individually in the error.
- If `lexicon.enabled`: `.db` file exists, opens as SQLite, and its table matches
  `lexicon.schema`.
- `CONTENT` compilation (if a `*_contents.md` is present) succeeds without a parse error;
  a compile failure names the offending line.
- No `__[A-Z_]+__` placeholder pattern survives into the output (the check that closes the
  audit's top migration risk — "placeholder injection fails silently").
- Output file size is logged; no hard ceiling enforced by the assembler itself (SR-3
  judgement call stays with the reviewer per plan risk table), but a build that produces an
  output smaller than the shell skeleton alone is treated as a build failure (sanity floor).

## 9. Risks

| Risk | Consequence | Mitigation | Proving test |
|---|---|---|---|
| Rebuilt Grammar behaves differently from the shipped monolith | Luke's accepted, in-use tool regresses silently | Migration is gated on §10's full AC-1–AC-12 replay before the old `template.html` is retired (plan step 7 precedes step 8) | §10 checklist, all items pass |
| `_toks`/`_clauses` coupling (OQ-2) hides more shell→cartridge leakage than currently documented | A second cartridge's render breaks in ways this spec didn't anticipate | Flagged explicitly as OQ-2 rather than papered over; revisit before cartridge #2 begins | Manual code review confirms no further underscore-prefixed reads exist beyond `_toks`/`_clauses` |
| Generic focus-level CSS template (AD-2) doesn't fit a genuinely non-nesting cartridge | Orphaned CSS / broken toggles on a future parser | `files.styles` override escape hatch; OQ-1 flags the assumption explicitly for review before such a cartridge is built | AC-5 (synthetic two-level cartridge) proves the *nesting* case; a non-nesting case is explicitly out of scope, not silently assumed to work |
| `EXPLAINER.needSpace`/`posShort` move (AD-1) is missed by the shell build, reintroducing the current duplication | The exact defect this spec exists to fix ships anyway | AC-6 greps the shipped output for the old local functions | AC-6 |

## 10. Migration acceptance criteria (proves rebuilt Grammar ≡ shipped Grammar)

Rebuilding `Grammar/cartridge/` through the new assembler and opening the output offline
must reproduce, unchanged:

- **AC-1–AC-12** from `GrammarParser.spec.md` §3, replayed verbatim against the rebuilt file
  (sentence classification, comma-splice/parallelism/imperative detection, over-cap warning,
  offline lexicon lookups, four-row Explainer table with dedup, focus-level fade behaviour,
  exports containing Explainer-only content, hover text per focus level).
- The audit's own minimal acceptance test (§7c of `shell-cartridge-audit.md`): the Hemingway
  sentence produces the same 10-point checklist (classification, clauses, phrases, tense,
  zero flagged errors, 26-column/4-row table, deduplicated rules extract, 4 working focus
  buttons defaulting to Clausal, zero spell-check false positives, lexicon footer showing
  20,000+ words not the fallback message).
- File size does not exceed the currently shipped `<cartridge>_generator.html` by more than the
  spelling module's own footprint (tracked separately in `SpellingModule.spec.md`; the shell
  refactor alone must not inflate size).
- Zero network requests at runtime (confirmed via browser dev-tools network tab with Wi-Fi
  off), matching AC-6 of the original spec.
- A reviewer, given only the module banner comments in the rebuilt cartridge source, can
  identify exactly and only the blocks a Style-parser build would replace — AC-8 of the
  original spec, now proven structurally by folder layout (`Grammar/cartridge/` vs
  `_shell/`) rather than by in-file banner comments alone.

## 11. Plan

1. Freeze this contract (this spec) — reviewed and approved. *(governs FR-1–FR-17)*
2. Build `_shell/build/shell.html` skeleton + `_shell/build/assemble.py` against §8. *(FR-15–FR-17)*
3. Extract Grammar's `ENGINE`/`EXPLAINER`/`CONFIG`/`CONTENT` into `Grammar/cartridge/build/`,
   adding the two new `EXPLAINER` exports (`needSpace`, `posShort` already exists — wire it
   in) per AD-1. *(FR-4, FR-5, AD-1)*
4. Delete the shell's local `needSpace()`/`shortPos()`; call `EXPLAINER.needSpace`/`.posShort`
   instead. *(AD-1, AC-6)*
5. Implement the generated focus-level CSS template (AD-2) in the assembler; verify against
   Grammar's four levels reproduces the current visual behaviour exactly. *(FR-13, AD-2)*
6. Wire the spelling module in as an injected dependency (FR-11) once
   `SpellingModule.spec.md`'s public API is available (Step 5b, parallel track).
7. Run §10's full migration acceptance pass before retiring `Grammar/build/template.html`.

## 12. Verification — definition of done

- [ ] All acceptance criteria (AC-1–AC-6, §3) demonstrated
- [ ] §10 migration acceptance criteria demonstrated in full
- [ ] `GrammarParser.spec.md` AD-2 annotated superseded, pointing here
- [ ] AD-1's `needSpace`/`posShort` relocation confirmed by code inspection (no local
      re-implementation left in shell code)
- [ ] OQ-1 and OQ-2 recorded as open, not silently resolved, in the spec's final state

**On completion:** set Status to Done, move this spec to `Specs/Done/`, and re-check
`SpellingModule.spec.md` (they meet at plan Step 7) and any future cartridge spec that gates
on this one.

## 13. Post-build addendum — two UI defects found at review, not by the test suites

After all four cartridges built and their test suites passed, a manual inspection of the
*built* widgets (opening the shipped HTML files, not reading source) found two chassis-level
UI defects. Both are now fixed in `_shell/src/shell.html`; recorded here because neither was
caught by `_shell/tests/js/` or any per-cartridge suite, which is itself the finding worth
keeping.

**(a) `btnMiniWiki` was nested inside the `.analyse-only` toolbar bar.** The MiniWiki button
lived inside a `div.bar.analyse-only` block, so `shell.css`'s mode-switch rules
(`.analyse-only`/`.present-only`, FR-B2) hid it entirely for any `present`-mode cartridge —
Riddle, FolkTale, and Psychometric all shipped a fully embedded MiniWiki catalogue
(bundle + articles baked in, `miniwiki.enabled: true`) with **no visible control to open it**.
The button now lives in its own `#wikibar` (a plain `.bar`, no mode class), rendered
identically in both modes. `shell.html`'s own comment at the fix site records the reasoning
verbatim: "…may ship a catalogue, so it must not live inside a `.analyse-only` bar."

**(b) The "Export explainer" footer controls showed on cartridges with
`generator.explainer:false`.** Riddle and FolkTale both declare `generator.explainer: false`
(neither has an `ENGINE.explainItem`) — before the fix, the footer's "Export explainer: PDF /
PDF (bare) / Copy Markdown / Copy plain text" row rendered anyway, offering to export a panel
that could never contain anything. `shell.html` now runs a small inline check at load —
`if (CONFIG.generator && CONFIG.generator.mode === "present" && !CONFIG.generator.explainer)`
— and hides the row for that combination, with the reasoning recorded inline: "…has no
explainer to export, so offering […] there is a dead control."

**Why the test suites didn't catch either one.** `_shell/tests/js/test-ui.mjs` and
`test-miniwiki-seam.mjs` both exercise the shell's logic functions (`MiniWikiSeam.isAvailable()`,
`open()`, `parseNow()`, `setView()`, …) against a hand-built fake DOM — they prove the
*behaviour* is correct given a DOM node exists and has the right listener attached, but neither
suite asserts anything about a real element's *placement* inside `.analyse-only`/`.present-only`
wrapper markup, because the fake DOM doesn't model CSS class-based visibility at all. Both
defects were purely structural (an element in the wrong container, a row missing a
conditional), invisible to logic-level unit tests and visible only by opening the actual
built HTML and looking. The gap this implies: **a chassis change that only moves markup
around — not logic — needs a rendered/visual check, not just another `test-ui.mjs` case**,
since the current JS suite structurally cannot see DOM placement bugs. No such check exists
yet in this project (TEST-1's stdlib-only constraint means no headless-browser-based DOM
assertion is available without pulling in a dependency this repo's vibe rules don't allow);
flagging this here rather than silently leaving it as a known blind spot.
