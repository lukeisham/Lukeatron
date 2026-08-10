# Parser Shell — build folder

The shell is the shared chassis every parser widget is built from: display
harness, focus-level renderer, lexicon portal, export bar, and the spelling
module injection seam. **One copy, thirteen cartridges.** Full contract:
`Specs/ParserShell.spec.md`.

**The app's editable source is `src/`** — edit `shell.html` / `shell.css` /
`lexicon.js` / `ui.js` / `spelling-seam.js` and rebuild every cartridge that
uses it. Nothing in `src/` may reference Grammar or any other cartridge by
name (D-3) — if it does, that's a shell bug, not a cartridge quirk.

## Layout

```
_shell/
├── src/                    # shell source — never Grammar-specific
│   ├── shell.html           the chassis skeleton (placeholders only)
│   ├── shell.css             generic layout/theme CSS
│   ├── lexicon.js            LEX portal (sql.js-backed, FR-7)
│   ├── ui.js                  display harness (FR-9/FR-10/FR-12)
│   └── spelling-seam.js      spelling-module injection point (FR-11, D-1)
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
    └── js/                    node:test coverage for src/ui.js (TEST-8)
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
python3 _shell/build/assemble.py Grammar/cartridge Grammar/Grammar_parser.html
```

Default output (no second argument): `<cartridge_dir>/<cartridge.id>_parser.html`.

The assembler validates the cartridge before writing anything — a missing
required manifest field, a missing ENGINE/EXPLAINER export, a lexicon
schema mismatch, or a surviving `__PLACEHOLDER__` in the output all exit
non-zero with the specific field/key named, and no output file is written
(PY-6). Run the test suite first if you're touching `assemble.py` itself:

```bash
python3 -m unittest discover -s _shell/tests/build -p "test_*.py"
```

Plain `python3 -m unittest discover` run from `_shell/tests/` also works —
`tests/__init__.py` and `tests/build/__init__.py` were added so
`unittest discover`'s default recursive scan (`-s .`) can import the
`build/` subpackage; on Python 3.14 (this repo's interpreter) discover did
not recurse into a subdirectory lacking `__init__.py` even though the
directory itself needed no package marker to be `-s`-targeted directly.
Both invocations now pass 13/13.

**JS tests** (`tests/js/`, TEST-8 — `src/ui.js` has no build step of its
own, so it is not an ES module; `test-ui.mjs` `vm`-executes the real
source against a small hand-built global scope, never a copy of the
logic): from `_shell/`, run

```bash
node --test
```

Node's default recursive discovery picks up `tests/js/test-ui.mjs`
alongside nothing else JS-shaped in this folder (`tests/build/` is Python
only). **`node --test tests/js` (bare directory path) does NOT work** —
same Node quirk as the Spelling module's suite: a bare non-glob path
argument is treated as a `require()` target, not a directory to scan, and
throws `MODULE_NOT_FOUND`. Passes 5/5, Node v26.0.0, `node:test` +
`node:assert/strict` only (TEST-1).

## What a cartridge must provide

A cartridge is a folder with this shape (`ParserShell.spec.md` §8):

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
`h50/h100/h600/h800/hf/name`), `files.engine`, `files.explainer`.
Optional: `parser.focusLabels` (per-level key text), `tierB.note`,
`lexicon.enabled` + `lexicon.dbFile` + `lexicon.schema` +
`lexicon.attribution`, `files.styles`, `files.content`. See
`Grammar/cartridge/build/config.yaml` for a filled-in example.

**`<engine>.js` must define:**
```javascript
var ENGINE = (function(){
  function parse(text){ /* → ParseResult, see Specs/ParserShell.spec.md §6 */ }
  function tokenize(text){ /* → Token[] */ }
  var CLOSED = { /* closed-class word lists, cartridge-owned */ };
  return { parse: parse, tokenize: tokenize, CLOSED: CLOSED };
})();
```

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
`#stage.v-<level>` rules for exactly those levels, reproducing Grammar's
visual model (clause/phrase/word intensity by level). A cartridge only
needs its own `files.styles` CSS for a genuine visual override, not for
basic focus-level support.

**Spelling module:** a cartridge opts in with `spelling.enabled: true` in
`config.yaml` (see `Grammar/cartridge/build/config.yaml`). When set, the
assembler:
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

Any manifest field missing or file not found fails the build loudly and
non-zero (PY-6) — it never ships a cartridge with `spelling.enabled: true`
and a silently-missing dictionary. Omitting `spelling.enabled` (or setting
it `false`) ships the cartridge exactly as before: the spell-check checkbox
stays hidden, no crash (the seam degrades gracefully — see
`src/spelling-seam.js`).

Rebuild recipe with spelling wired in (Grammar, this is what ships):
```bash
python3 _modules/Spelling/build/bundle_spelling.py   # once, or after any src/ edit
python3 _shell/build/assemble.py Grammar/cartridge Grammar/Grammar_parser.html
```
Measured output: **4.18 MB (4,380,237 bytes)** total. Breakdown (each
piece measured independently, base64 sizes are what's actually embedded,
not the raw file size):

| Piece | Size |
|---|---:|
| Grammar_lexicon.db, base64 | 1.09 MB |
| spelling.db.gz, base64 (SCOWL dictionary, gzip-compressed) | 2.06 MB |
| sql-wasm.wasm, base64 | 0.84 MB |
| sql-wasm.js (shared, one copy for both lexicon + spelling) | 0.047 MB |
| spelling.bundle.js | 0.047 MB |
| shell chassis + Grammar engine/explainer/content/CSS | ~0.13 MB |
| **Total** | **4.18 MB** |

Close to the ~4.1 MB ballpark; the small excess is the sql.js vendor
JS/WASM payload (0.88 MB combined), which that estimate under-counted.

## Cloning a new parser (cartridge, not chassis — see Parser_guide.md §5b)

1. Copy `Grammar/cartridge/` as a starting skeleton.
2. Replace `build/config.yaml`, the engine, the explainer, and the content
   file with the new subject's own. Nothing in `_shell/` changes.
3. Run `python3 _shell/build/assemble.py <NewCartridge>/cartridge`.
4. Fix whatever the assembler names — it will not build a broken widget
   silently (§8's validation checklist, PY-6).
