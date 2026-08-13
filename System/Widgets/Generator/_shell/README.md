# Generator Shell — build folder

The shell is the shared chassis every Generator widget is built from: display
harness, focus-level renderer, lexicon portal, export bar, the spelling and
MiniWiki module injection seams, and the `analyse`/`present` mode switch
(`generator.mode` in the manifest — see `Specs/GeneratorShell.spec.md` §3).
**One copy, four cartridges** (AiCharacteristics runs `analyse` mode; Riddle,
FolkTale, and Psychometric run `present` mode). Full contract:
`Specs/GeneratorShell.spec.md`.

**The app's editable source is `src/`** — edit `shell.html` / `shell.css` /
`lexicon.js` / `ui.js` / `present-mode.js` / `api.js` / `spelling-seam.js` /
`miniwiki-seam.js` and rebuild every cartridge that uses it. Nothing in
`src/` may reference a cartridge by name (D-3) — if it does, that's a shell
bug, not a cartridge quirk.

## Shared lineage with Parser — read this before touching either shell

This shell was **forked** from `System/Widgets/Parser/_shell/` (read-only
reference for this project), not shared with it. The two chassis are
independent copies of what started as the same code: `shell.html`/`ui.js`
here still carry Parser's FR/AD/AC numbering (see
`Specs/GeneratorShell.spec.md`'s header note), and the assembler, the
spelling seam, and the MiniWiki seam are all close cousins of Parser's
originals with the same structure and the same failure-mode discipline
(PY-6, fail loudly on a missing manifest field or file).

Forking instead of sharing cuts directly against vibe rule SR-4 ("share,
don't copy-paste") — Luke accepted that trade-off deliberately for this
build rather than risk destabilising the already-approved, in-production
Parser shell by making it generic over a second, differently-shaped
product (`analyse`/`present` mode did not exist in Parser at all). The
trade is not free, and it does not stop being a cost just because the
build shipped:

> **A bug fixed in one shell must be grepped for in the other.** Before
> closing out any fix to `_shell/src/*.js`, `_shell/build/assemble.py`, or
> `_modules/*/src/` in *this* tree, search the equivalent file under
> `System/Widgets/Parser/_shell/` (and vice versa) for the same defect —
> nothing here keeps the two in sync automatically, and Parser is
> read-only from this project's side, so a match found there is a note to
> flag for Luke, not a file to edit directly.

## Layout

```
_shell/
├── src/                    # shell source — never cartridge-specific
│   ├── shell.html           the chassis skeleton (placeholders only)
│   ├── shell.css             generic layout/theme CSS
│   ├── lexicon.js            LEX portal (sql.js-backed, FR-7)
│   ├── ui.js                  display harness — analyse mode (FR-9/FR-10/FR-12)
│   ├── present-mode.js       display harness — present mode (Generate/Clue/
│   │                          Check/Copy, D-1's generator.mode: present)
│   ├── api.js                 Tier B: the one place any fetch() lives (JS-5)
│   ├── spelling-seam.js      spelling-module injection point (FR-11, D-1)
│   └── miniwiki-seam.js      MiniWiki-module injection point — opens the
│                              wiki as a NEW browser tab, not an in-page
│                              panel (see below)
├── build/
│   ├── assemble.py           the assembler (this is what you run)
│   ├── miniyaml.py           stdlib-only YAML-subset parser (PY-1)
│   └── vendor/
│       ├── sql-wasm.js       sql.js 1.13.0, MIT — shared by every cartridge
│       └── sql-wasm.wasm     SQLite compiled to WASM, public domain
├── StyleGuide/                the shell's design system, documented — start
│   │                          at StyleGuide/index.md. css/ holds a readable
│   │                          reference mirror of shell.css (tokens.css,
│   │                          patterns.css) plus a live preview.html that
│   │                          links the real shell.css. Docs only — never a
│   │                          build input; src/ above remains canonical.
│   └── css/
└── tests/
    ├── build/                 unittest tests for assemble.py / miniyaml.py
    └── js/                    node:test coverage for src/ui.js + present-mode.js (TEST-8)
        ├── fake-dom.mjs        SHARED hand-built fake DOM (SR-4) — also
        │                       imported by _modules/Spelling/tests/test-ui.mjs;
        │                       fix bugs here once, not in two copies.
        └── test-ui.mjs         vm-executes the real src/ui.js against globals
                                (CONFIG/ENGINE/EXPLAINER/LEX/SpellingSeam) it
                                expects a host page to provide
```

## Rebuild recipe

Build one cartridge into its shipped widget file:

```bash
python3 _shell/build/assemble.py <Cartridge>/cartridge [output.html]
# e.g.
python3 _shell/build/assemble.py AiCharacteristics/cartridge AiCharacteristics/aicharacteristics_generator.html
```

Default output (no second argument): `<cartridge_dir>/<cartridge.id>_generator.html`.

The assembler validates the cartridge before writing anything — a missing
required manifest field (including `generator.mode`), a missing
ENGINE/EXPLAINER export, a lexicon schema mismatch, or a surviving
`__PLACEHOLDER__` in the output all exit non-zero with the specific
field/key named, and no output file is written (PY-6). Run the test suite
first if you're touching `assemble.py` itself:

```bash
python3 -m unittest discover -s _shell/tests/build -p "test_*.py"
```

Plain `python3 -m unittest discover` run from `_shell/tests/` also works —
`tests/__init__.py` and `tests/build/__init__.py` were added so
`unittest discover`'s default recursive scan (`-s .`) can import the
`build/` subpackage; on Python 3.14 (this repo's interpreter) discover did
not recurse into a subdirectory lacking `__init__.py` even though the
directory itself needed no package marker to be `-s`-targeted directly.

**JS tests** (`tests/js/`, TEST-8 — `src/ui.js` and `src/present-mode.js`
have no build step of their own, so neither is an ES module; `test-ui.mjs`
`vm`-executes the real source against a small hand-built global scope,
never a copy of the logic): from `_shell/`, run

```bash
node --test
```

Node's default recursive discovery picks up `tests/js/*.mjs`. **`node
--test tests/js` (bare directory path) does NOT work** — a bare non-glob
path argument is treated as a `require()` target, not a directory to scan,
and throws `MODULE_NOT_FOUND`. Node v26.0.0, `node:test` +
`node:assert/strict` only (TEST-1).

## What a cartridge must provide

A cartridge is a folder with this shape (`GeneratorShell.spec.md` §8):

```
<Cartridge>/cartridge/
├── build/
│   ├── config.yaml           required — the manifest (schema below)
│   ├── <engine>.js           required — path from files.engine
│   ├── <explainer>.js        required — path from files.explainer
│   ├── <styles>.css          optional — path from files.styles
│   ├── <content>.json        optional — path from files.content
│   │                          (a *.md path here runs the best-effort
│   │                           markdown-outline compiler instead — see
│   │                           assemble.py's compile_content_markdown()
│   │                           docstring for its format and limits)
│   └── <Lexicon>.db          optional — path from lexicon.dbFile
```

**`config.yaml` required fields:** `cartridge.name`, `cartridge.id`,
`cartridge.version`, `cartridge.builtFrom`, `parser.inputUnit`,
`parser.cap` (int > 0), `parser.levels` (1+, ordered coarse→fine),
`parser.tentativeThreshold` (0–1), `colours.palette` (1+ hue, each with
`h50/h100/h600/h800/hf/name`), `files.engine`, `files.explainer`,
`generator.mode` (`"analyse"` or `"present"` — D-1). Optional:
`parser.focusLabels` (per-level key text), `tierB.note`, `lexicon.enabled`
+ `lexicon.dbFile` + `lexicon.schema` + `lexicon.attribution`,
`files.styles`, `files.content`, and (present mode only) `generator.pool`,
`generator.categories`, `generator.clue`, `generator.answer`,
`generator.explainer` — see `Specs/GeneratorShell.spec.md` §3 for the full
present-mode cartridge contract.

**`<engine>.js` must define:**
```javascript
var ENGINE = (function(){
  function parse(text){ /* → ParseResult, see Specs/GeneratorShell.spec.md §6 */ }
  function tokenize(text){ /* → Token[] */ }
  var CLOSED = { /* closed-class word lists, cartridge-owned */ };
  return { parse: parse, tokenize: tokenize, CLOSED: CLOSED };
})();
```
`present`-mode cartridges additionally export the present-mode functions
(`getPool`, `render`, `check`, `copyText`, …) documented in
`Specs/GeneratorShell.spec.md` §3b — the `parse`/`tokenize` triad above
stays required either way (the shell's word-count/export bar still expects
it), but `present-mode.js` never calls `ENGINE.parse` itself.

**`<explainer>.js` must define exactly these nine exports** (AD-1: the
shell no longer re-implements `needSpace`/`posShort` itself — a cartridge
that omits either is rejected at build time, not silently broken at
runtime):
```javascript
var EXPLAINER = (function(){
  // tables, rules, toMarkdown, toText, funcOf, phraseOf, clauseOf, posShort, needSpace
  return { tables: tables, rules: rules, toMarkdown: toMarkdown, toText: toText,
           funcOf: funcOf, phraseOf: phraseOf, clauseOf: clauseOf,
           posShort: posShort, needSpace: needSpace };
})();
```

**Focus-level CSS is generated for you** (D-6/AC-5) — declare
`parser.levels` in the manifest and the assembler emits working
`#stage.v-<level>` rules for exactly those levels, reproducing the
reference chassis's clause/phrase/word intensity-by-level visual model. A
cartridge only needs its own `files.styles` CSS for a genuine visual
override, not for basic focus-level support.

**Spelling module:** an `analyse`-mode cartridge opts in with
`spelling.enabled: true` in `config.yaml`. When set, the assembler:
1. requires `_modules/Spelling/dist/spelling.bundle.js` to exist (build
   it first — see `_modules/Spelling/README.md`'s "Rebuilding the bundle")
   and embeds it verbatim above `src/spelling-seam.js`;
2. embeds the central dictionary, gzip-compressed and base64-encoded, from
   `_modules/Spelling/data/spelling.db.gz` (shared by every widget that
   opts in — NOT a per-cartridge file);
3. embeds the shared sql.js vendor files if not already needed by a
   cartridge lexicon (the spelling dictionary is sql.js-backed too);
4. sets `CONFIG.spelling = {enabled, attribution}` from its own
   `SPELLING_ATTRIBUTION` constant (never a per-cartridge restatement) —
   the shell shows this in the footer next to the lexicon attribution.

`present` mode never shows the spell-check control (D-4 — there is no
user-typed input area to check) regardless of `spelling.enabled`.

Any manifest field missing or file not found fails the build loudly and
non-zero (PY-6) — it never ships a cartridge with `spelling.enabled: true`
and a silently-missing dictionary. Omitting `spelling.enabled` (or setting
it `false`) ships the cartridge exactly as before: the spell-check checkbox
stays hidden, no crash (the seam degrades gracefully — see
`src/spelling-seam.js`).

**MiniWiki module:** a cartridge opts in with `miniwiki.enabled: true` +
`miniwiki.articlesFile: "<name>.miniwiki.json"` in `config.yaml` (see
`_modules/MiniWiki/README.md`). Unlike the spelling seam, MiniWiki does
**not** render into the widget page's own DOM at all — it opens as a
**complete, separate HTML document in a new browser tab**
(`src/miniwiki-seam.js`'s `MiniWikiSeam.open()`), built at click time from
three build-time-embedded pieces: the module's bundled JS as a string
(`MINIWIKI_BUNDLE_SRC`), the pre-extracted article JSON
(`MINIWIKI_ARTICLES`), and the cartridge's display name
(`MINIWIKI_CARTRIDGE_NAME`). When set, the assembler:
1. requires `_modules/MiniWiki/dist/miniwiki.bundle.js` to exist (build it
   first with `python3 _modules/MiniWiki/build/bundle_miniwiki.py`) and
   embeds it verbatim as a JS string constant — not executed in the
   widget page's own window, only in the new tab's;
2. reads `miniwiki.articlesFile` (produced by
   `python3 _modules/MiniWiki/build/extract_articles.py <content.md> --out
   build/<name>.miniwiki.json` — run this first) and embeds it as
   `MINIWIKI_ARTICLES`;
3. leaves `shell.html`'s `#btnMiniWiki` toolbar button `display:none` until
   `MiniWikiSeam.isAvailable()` confirms a real bundle + non-empty article
   list were embedded.

Opening tries `Blob` + `URL.createObjectURL` + `window.open` first (works
from `file://`, keeps the new tab's `document.write` surface out of the
picture); if that throws, it falls back to `window.open("") +
document.write()`. If `window.open` returns `null` either way (pop-up
blocked), `open()` returns `false` and the widget page shows the inline
`#miniwikiwarn` banner rather than failing silently. The new tab keeps its
own hash routing (`#/1.1.1`) and history, fully independent of the widget
tab — and cannot inherit the widget tab's `<style>`, so
`miniwiki-seam.js` re-declares the same shell design tokens the wiki's own
CSS (`_modules/MiniWiki/src/styles.js`) is written against (see
`StyleGuide/02-colour-model.md`).

Omitting `miniwiki.enabled` (or setting it `false`) ships the cartridge
exactly as before — the button never appears, no MiniWiki bytes are
embedded, and the build is byte-identical to a cartridge that never
mentions the key. Any manifest field missing or the bundle/articles file
not found fails the build loudly and non-zero (PY-6), the same discipline
as the spelling seam above.

**Tier B (`src/api.js`):** any cartridge may expose a "Refresh pool" action
that calls the Claude API to top up its content pool at runtime. The key
lives in `localStorage` only, entered via a settings field in the widget —
never hardcoded, never written to any file in this repo (SR-5). No key, no
network, or a malformed response all degrade closed: the control disables
itself with a visible note and every Tier-A function keeps working — a
Tier-B failure never breaks the widget (see `src/api.js`'s header comment).

## Shipped widget sizes (measured, not estimated)

Each cartridge's shipped single-file HTML, `wc -c` on the actual output in
this tree:

| Cartridge | Mode | Size (bytes) |
|---|---|---:|
| AiCharacteristics | analyse | 174,717 |
| Riddle | present | 218,280 |
| FolkTale | present | 258,238 |
| Psychometric | present | 293,083 |

All four are well under the ~4.2 MB a Parser cartridge with the spelling
module wired in reaches — none of the four Generator cartridges opts into
`spelling.enabled` (present mode never shows the spell-check control at
all, D-4; AiCharacteristics could opt in but doesn't). The bulk of each
file is the MiniWiki module (bundle + article JSON, all four opt in) plus
the cartridge's own baked content pool — there is no lexicon `.db` or
spelling dictionary in any of the four.

## Cloning a new cartridge (see `_research/cartridge-anatomy.md`)

1. Copy an existing cartridge folder of the mode you need (`analyse` or
   `present`) as a starting skeleton.
2. Replace `build/config.yaml`, the engine, the explainer, and the content
   file with the new subject's own. Nothing in `_shell/` changes.
3. Run `python3 _shell/build/assemble.py <NewCartridge>/cartridge`.
4. Fix whatever the assembler names — it will not build a broken widget
   silently (§8's validation checklist, PY-6).
