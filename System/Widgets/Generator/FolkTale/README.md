# FolkTale — cartridge README

A `Generator/_shell` cartridge in **`present` mode**: Generate pulls a
public-domain folk tale from the baked pool, the shell highlights its three
narrative beats (setup / twist / result) with a legend, and Copy puts the
plain tale text on the clipboard. Shipped widget: `FolkTale_generator.html`,
**282,026 bytes**.

## What it does

`ENGINE.getPool()` returns the 40-tale pool; `ENGINE.render(item)` returns
HTML with the three beats highlighted plus a plain `canonicalText` for
Copy. No clue, no answer-checking, no explainer (`generator.clue: false`,
`generator.answer: false`, `generator.explainer: false`) — this cartridge
is read-and-highlight only. One focus level, `beat` (`parser.levels`), cap
400 words per tale (`parser.cap`).

## Revision (2026-08-13, Luke's instruction)

The **Turkey/Middle East** category (4 Nasreddin Hodja tales) was removed
entirely — seed entries, pool items, MiniWiki catalogue rows, and every
`CATEGORY_OF_CULTURE`/`CATEGORY_LABELS`/`config.yaml` reference. It was
replaced with **Persia (Pre-Islamic)** (3 tales from the legendary/mythical
era of Ferdowsi's Shahnameh, via Helen Zimmern's 1883 prose translation,
*The Epic of Kings*, hosted at MIT's Internet Classics Archive). Two new
**genre** categories were added alongside the existing culture/region ones:
**American Gothic** (3 tales — Irving's "The Legend of Sleepy Hollow" 1820,
Hawthorne's "Young Goodman Brown" 1835, Poe's "The Tell-Tale Heart" 1843)
and **Australian Gothic** (2 tales — Lawson's "The Drover's Wife" 1892,
Clarke's "The Haunted Author", undated). All 8 new tales are condensed
retellings from real, individually web-verified public-domain sources —
every source was fetched and checked directly (not trusted from a search
snippet) before being written into the seed, after an earlier citation
fabrication was found elsewhere in this project. Australian Gothic was
deliberately scoped to the settler/colonial literary tradition rather than
Aboriginal Dreaming stories, which carry cultural-protocol and permission
considerations this seed file is not equipped to navigate responsibly.

Net change: 36 → 40 tales, 8 → 10 categories.

## Read this before trusting the beat highlighting

**The 36 shipped tales all carry stored ground-truth beat spans**
(`setupSpan`/`twistSpan`/`resultSpan` in `pool.json`, hand-identified during
content compilation). `render()` uses those stored spans when they're
present, so **every tale shipped in this widget looks perfectly
highlighted** — that is ground truth being displayed, not the detector
being evaluated.

The actual **cue-based beat detector** (`ENGINE.detectBeats()`) is what
runs when a tale has **no** stored spans — the situation any Tier-B-fetched
tale would be in, since a live-fetched tale from outside this pool cannot
carry hand-authored ground truth. `tests/js/test-beat-accuracy.mjs` measures
`detectBeats()`'s sentence-level labelling accuracy against all 36 seeded
tales' own ground-truth spans (never letting the detector see the spans it's
being scored against):

**62.4% sentence-level accuracy** (290 sentences across 40 tales, measured
2026-08-13 after the category revision above; was 64.0%/275 sentences/36
tales on 2026-08-12). Per-tale accuracy ranges from **100%** on several
tales down to **11%** on the new worst case, `persian-001` ("Zal and the
Simurgh") — the cue-based detector's discourse-marker cues are tuned to
modern narrative prose and struggle badly with the Zimmern translation's
archaic, paratactic King-James-style idiom ("and... and... and"). Other
weak tales include `native-005` (22%), `persian-002` (29%), `grimm-002`
(33%), and `russian-002` (38%). The test's own regression floor is a
permissive 50% (`assert.ok(accuracy >= 0.5, ...)`) — it exists to catch a
detector break, not to certify either number as acceptable; treat 62.4% as
the honest current baseline, not a target already met.

**Bottom line:** this widget looks flawless in normal use because every
shipped tale is ground-truth-backed. The 64% number only bites once Tier B
(or any future non-seeded content source) supplies a tale the detector has
to score cold.

## Pool size and provenance

**40 tales** (`cartridge/build/pool.json`), `builtFrom`:
`folk-tales.md (40 public-domain tales)`. Sourced from Aesop's Fables
(Vernon Jones's 1912 translation, Project Gutenberg), Grimm, Russian,
Japanese, Indian, Native American, and Irish folk traditions; the
Pre-Islamic legendary era of Ferdowsi's Shahnameh (Helen Zimmern's 1883
translation); and the American and Australian Gothic literary traditions
(Irving, Hawthorne, Poe, Lawson, Clarke). `source`/`translator`/`year` are
preserved per-tale in `folktale_content.md` and the MiniWiki catalogue;
`build_folktale.py` leaves `year` blank rather than guessing one when the
seed's free-text source line doesn't state it (used for "The Haunted
Author", whose exact periodical date is unconfirmed).

Ten categories (`generator.categories`):

| Category | Count |
|---|---:|
| Ancient Greece (Aesop) | 6 |
| Germany (Grimm) | 5 |
| Native America | 5 |
| Japan | 5 |
| Russia | 4 |
| Ireland | 4 |
| Persia (Pre-Islamic) | 3 |
| American Gothic | 3 |
| India | 3 |
| Australian Gothic | 2 |

## Interaction controls

Category picker, Generate, Copy. No Clue button, no answer input/Check, no
Explain button (all three feature flags are off in `config.yaml`). MiniWiki
catalogue (`folktale.miniwiki.json`) lists every tale by culture.

## Build recipe

```bash
python3 FolkTale/cartridge/build/build_folktale.py
python3 _shell/build/assemble.py FolkTale/cartridge FolkTale/FolkTale_generator.html
```

`build_folktale.py` reads `_research/seed/folk-tales.md` and writes both
`pool.json` (present-mode `files.content`) and `folktale_content.md`
(MiniWiki source) from the same parse, so they cannot drift apart.

## Tests

```bash
node --test FolkTale/tests/js/*.mjs
python3 -m unittest discover -s FolkTale/tests -p "test_*.py"
```

**5/5 JS passing** (`test-engine.mjs`: present-mode contract, 40-tale
pool/id-uniqueness, three-beat highlight rendering; `test-beat-accuracy.mjs`:
the 62.4% measurement above with a 50%-floor regression guard) + **4/4
Python passing** (`test_build_folktale.py`: translator/year parsing from
free-text source lines, blank-not-guessed year handling, 40-tale/10-category
seed parse, over-cap tale rejected loudly).

## Known limitations

- The cue-based `detectBeats()` detector — the only code path that runs on
  genuinely new content — measures 64.0% sentence-level accuracy on unseen
  tales, with results ranging from perfect (100%) to poor (22%) depending
  on the tale's structure. This is the single most important fact about
  this cartridge for anyone extending it with live content.
- All 36 shipped tales bypass the detector entirely via stored ground-truth
  spans, so normal use of the shipped widget never exercises the weak path
  — a reviewer testing only the shipped widget will not observe the 64%
  figure without deliberately stripping a tale's spans.
- No answer-checking or explainer — this cartridge's interaction surface is
  intentionally minimal (read + copy only).
