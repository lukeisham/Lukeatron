# bench/corpus — dev-time-only benchmark data

**Never embedded in a shipped widget.** These files exist only to run
`bench/benchmark.mjs` during development.

## birkbeck_sample.json

A 600-pair `{correct, misspelling, source}` sample drawn from the **real**
Birkbeck Spelling Error Corpus (University of Birkbeck, London; hosted by
the Oxford Text Archive):
<https://ota.bodleian.ox.ac.uk/repository/xmlui/handle/20.500.12024/0643>

Downloaded directly (`0643.zip`, 621 KB) during this build. Licensed
**Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported**
(non-commercial, share-alike) — usable for internal, non-commercial
benchmarking; never redistributed inside the shipped widget HTML.

**This is NOT the specific "aspell.dat" 531-item sub-corpus** the spec
names (`SpellingModule.spec.md` §4/§9/§10) — that file does not exist as a
separately identifiable item inside the `0643.zip` release actually
downloaded. What the release *does* contain is ~30 raw data files across
"native speaker" and "non-native speaker" sub-corpora, in at least three
different line formats. `birkbeck_sample.json` was extracted (see the
one-off parsing step in this build's session) from these source files,
each contributing the given `source` count:

| Source file | Format | Pairs contributed |
|---|---|---|
| `GATESDAT.643` | `correct $marked freq *mis freq ...` | 207 |
| `EXAMSDAT.643` | `misspelling  correct  sentence-with-*` | 293 |
| `TELEMARKDAT.643` | same as EXAMS | 43 |
| `SHEFFIELDDAT.643` | two-column `CORRECT  MISSPELLING` | 22 |
| `UPWARDDAT.643` | two-column | 10 |
| `APPLING1DAT.643` / `APPLING2DAT.643` | sentence format | 17 |
| `ABODAT.643` | sentence format | 6 |
| `SUOMIDAT.643` | sentence format | 2 |

11,566 unique pairs were extracted in total; 600 were sampled (seed 7) for
a corpus of comparable scale to the spec's cited 531-item figure. Pairs
were filtered to alphabetic-only, 3+ character correct/misspelled forms.

## holdout_proper_nouns.json

231 hand-compiled proper nouns, brand names, and technical/theological
jargon terms — not sourced from any corpus, written for this build to
probe the false-positive rate (spec AC-6). See README.md (module root) for
the measured false-positive rate and what it found.
