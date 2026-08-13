# Riddle — cartridge README

A `Generator/_shell` cartridge in **`present` mode**: Generate pulls a
riddle from the baked pool, an optional Clue reveals a hint, the user types
an answer and Checks it, and Copy puts the plain riddle text on the
clipboard. Shipped widget: `Riddle_generator.html`, **218,280 bytes**.

## What it does

`ENGINE.getPool()` returns the compiled riddle pool; the shell's
present-mode display harness (Generate/Clue/Check/Copy, no user-typed
analyse-mode input area) drives selection via a shuffled,
no-immediate-repeat queue (Fisher–Yates), optionally scoped to the active
category filter. `ENGINE.render(item)` shows the riddle text;
`ENGINE.checkAnswer(item, userAnswer)` normalises the typed answer and
matches it against the item's canonical answer plus its accepted synonym
variants (`accepted variants` field). `generator.explainer: false` — this
cartridge offers no "why" panel, only the riddle/clue/check/copy loop.

## Pool size and provenance

**61 riddles** (`cartridge/build/pool.json`, confirmed by direct count) —
**not** 78. The seed document's own header claims "**Status:** 78 riddles
collected..." (`_research/seed/riddles.md`, line 4), but
`compile_riddle_pool.py`'s parse of that same file yields 61 distinct
entries; the seed header was never corrected after later edits removed or
merged riddles. Treat the compiled pool count, not the seed doc's header
text, as authoritative for anything downstream.

All 61 riddles are drawn from public-domain or freely-attested traditional
sources — the Exeter Book (Anglo-Saxon, via Wikisource/Internet Archive,
Paull Franklin Baum's 1963 translation), classical Greek mythology, the
Poetic Edda (Norse, 13th-c. Codex Regius), Mother Goose nursery rhymes
(Project Gutenberg), Samson's riddle and the Riddles of Solomon
(biblical/rabbinic, Wikisource), Chinese Lantern Festival riddles (The
Epoch Times), African proverbs/riddles (Internet Archive), and general folk
riddles (Wikibooks). Every entry in `cartridge/build/riddle_content.md`
carries its own `source` and `licence/public-domain note` fields — check
the individual entry before reusing a riddle outside this widget.

**Eight tradition categories** (`generator.categories` in `config.yaml`,
id prefix ↔ category, single source of truth in
`compile_riddle_pool.py`'s `CATEGORY_BY_PREFIX`):

| Category | Prefix | Count |
|---|---|---:|
| Universal Folk | FO- | 27 |
| Anglo-Saxon (Exeter Book) | EX- | 8 |
| English Nursery Rhymes | EN- | 7 |
| Chinese (Lantern Festival) | CH- | 7 |
| Biblical & Jewish | JW- | 5 |
| African (Zulu & Swahili) | AF- | 4 |
| Norse / Viking | NO- | 2 |
| Greek & Classical | GR- | 1 |

## Interaction controls

Category picker (filters the shuffled queue), Generate, Clue (reveals
`clue` field text), answer input + Check (accepts near-misses/synonyms via
`accepted variants`), Copy (plain riddle text to clipboard). No explainer
panel, no analyse-mode input/word-cap/spell-check (present mode hides all
three, D-4). MiniWiki catalogue (`riddle.miniwiki.json`) lists every riddle
by tradition.

## Build recipe

```bash
python3 Riddle/cartridge/build/compile_riddle_pool.py \
    _research/seed/riddles.md \
    Riddle/cartridge/build/pool.json \
    Riddle/cartridge/build/riddle_content.md
python3 _shell/build/assemble.py Riddle/cartridge Riddle/Riddle_generator.html
```

`riddle_content.md` also feeds
`_modules/MiniWiki/build/extract_articles.py` to produce
`riddle.miniwiki.json` (`miniwiki.enabled: true`).

## Tests

```bash
node --test Riddle/tests/*.mjs
```

**7/7 passing** (`test-engine.mjs`: present-mode contract, pool
id+category completeness, render shape, three worked near-miss/synonym
examples from the guidance doc — EX-001 Bookworm, EN-002 Egg, GR-001 Human
being — plus checkAnswer edge cases for empty input and a single-letter
canonical answer).

## Known limitations

- Pool count is 61, not the seed doc's claimed 78 (see above) — a
  correction to the seed header, not a build bug, is the right fix if this
  is ever revisited.
- Category balance is uneven (27 folk riddles vs. 1 Greek) because it
  mirrors what the harvesting pass actually found in each tradition, not a
  deliberately balanced design.
- `checkAnswer` matching is variant-list-based, not fuzzy/semantic — an
  answer synonym not present in a riddle's `accepted variants` list will be
  marked incorrect even if it is a reasonable paraphrase.
