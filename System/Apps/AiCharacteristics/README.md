# AiCharacteristics

Promoted from `System/Widgets/Generator/AiCharacteristics/` to a standalone Lukeatron app on
2026-09-29. It is still assembled from the shared `System/Widgets/Generator/_shell/` chassis in
**`analyse` mode**: paste up to a page of text, the engine tokenizes and flags AI-associated
stylistic and content characteristics, and an explainer panel expands on request. Shipped widget:
`AiCharacteristics_generator.html`, **174,717 bytes**.

## Navigation

```
AiCharacteristics/
├── AiCharacteristics_generator.html      the shipped, built widget — open this directly
├── AI-writing-characteristics-reference.md
├── AiCharacteristics_miniwiki_source.md  MiniWiki glossary source
├── cartridge/
│   └── build/
│       ├── config.yaml
│       ├── content.json
│       ├── engine.js
│       ├── explainer.js
│       └── aicharacteristics.miniwiki.json
├── tests/
│   ├── fixtures/
│   │   ├── SOURCES.md
│   │   ├── ai-sample.md
│   │   └── human-sample.md
│   └── js/
│       ├── test-engine.mjs
│       └── test-explainer.mjs
├── app-decisions.md
├── wishlist.md
└── README.md
```

## Cross-app behaviour

| From | To | What crosses | What breaks if it changes |
|---|---|---|---|
| `System/Widgets/Generator/_shell/` | this app's `cartridge/build/` | `assemble.py` reads `config.yaml` + `content.json` + `engine.js` + `explainer.js` and bakes them into `AiCharacteristics_generator.html` | A shell contract change breaks the build until this cartridge is updated to match — the shell stayed behind in `Widgets/Generator/` when this app was promoted out |
| `System/Widgets/Generator/_modules/MiniWiki/` | this app's build | `miniwiki.bundle.js` must exist before assembly (`miniwiki.enabled: true` in `config.yaml`) | Build fails with a missing-bundle error until `bundle_miniwiki.py` is run first |

## What it does

The user pastes text into the shell's standard analyse-mode input area (cap
700 words, `parser.cap` in `cartridge/build/config.yaml`). `ENGINE.parse()`
runs eight detectors over the text — six span-level ("LOCAL": a regex/pattern
match at a specific location, rendered as a highlight) and two
document-level ("STATISTICAL": a whole-document measure with no single
highlighted span) — and the shell's standard focus-level/icon-bar/explainer
UI renders the result exactly as any analyse-mode cartridge would. Two
focus levels: `overview` and `detail` (`parser.levels`).

**The honesty stance.** This is deliberately **not** an authorship
detector. `CONTENT["0.1"]` — the first entry the explainer shows, sourced
from Adhikari et al.'s *"Counter Turing Test CT²: AI-Generated Text
Detection Is Not as Easy as You May Think"* (arXiv:2310.05030, 2023) — is a
caveat that every finding's `explain` text also carries: the widget reports
**"AI characteristics observed"**, never a verdict on who or what wrote the
text, and never a probability framed as "chance this is AI." Formal human
prose (academic writing especially) regularly shows the same surface
patterns, and current models are trained, deliberately or incidentally, to
defeat most of them. Every finding is a weak, contestable signal, not a
finding of fact — `ENGINE.parse()`'s summary classification is literally
labelled `"AI characteristics observed — not an authorship verdict"`
(`engine.js`).

## The eight detectors

| id | Detector | Category | Confidence tier |
|---|---|---|---|
| 1.1 | Focal word excess | Lexical Markers | HIGH |
| 2.1 | Low burstiness (uniform sentence length) | Syntactic Rhythm & Structure | HIGH |
| 3.2 | High token-level repetition | Statistical Distributions | MEDIUM |
| 4.2 | Discourse marker clustering | Discourse Scaffolding | HIGH |
| 5.3 | False balance / artificial neutrality | Content-Level Signals | MEDIUM |
| 6.1 | Absence of varied punctuation | Punctuation & Formatting | MEDIUM |
| 7.1 | Excessive entity-name repetition | Coherence & Reference | MEDIUM |
| 8.1 | Specific numeric precision with unverifiable source | Numerical & Naming Patterns | LOW |

**Known limitation — 7.1 is a heuristic, not true NER.** "Excessive
entity-name repetition" is approximated by tracking capitalised,
non-sentence-initial words repeated three or more times with few
intervening pronouns (`engine.js`, detector 7.1's own comment: "approximated
without true NER"). It has no actual named-entity model behind it, so it
can over-fire on ordinary prose that legitimately repeats a proper noun —
travel writing that names the same city or landmark in every paragraph is
the textbook false positive. Its confidence tier was deliberately set to
**MEDIUM, not HIGH** (`confidenceTier` in `content.json`'s `"7.1"` entry,
`confidence: 0.6` in `engine.js`) to reflect that lower reliability; treat
any 7.1 flag with more scepticism than the six HIGH/MEDIUM detectors backed
by a direct textual measurement.

## Content and provenance

`cartridge/build/content.json` — 9 entries (the 8 detectors above plus the
`"0.1"` honesty caveat). `builtFrom` in `config.yaml`:
`ai-characteristics.md (_research/seed) + content.json`. The same glossary
text also ships as the cartridge's MiniWiki catalogue
(`AiCharacteristics_miniwiki_source.md`, `miniwiki.enabled: true`), citing
the same arXiv source for the caveat entry.

Test fixtures (`tests/fixtures/`, see `SOURCES.md`):
- `ai-sample.md` — synthetic, hand-written for this cartridge to exercise
  all 8 categories at once; **not** a real model transcript.
- `human-sample.md` — Herman Melville, *Moby-Dick*, opening lines of
  Chapter 1 ("Loomings"), public domain (1851; Melville d. 1891), verbatim.

## Interaction controls

Standard analyse-mode shell controls only: input area, Parse/Explain,
overview/detail focus toggle, icon bar, hover pop-ups, export bar
(PDF/PDF-bare/Markdown/plain-text). No lexicon (`lexicon.enabled: false`),
no spell-check (`spelling.enabled: false`), no sweep selector. MiniWiki
button opens the glossary catalogue in a new tab.

## Build recipe

Run from the `_Lukeatron` root — the shell and its modules stayed behind in
`System/Widgets/Generator/` when this app was promoted out of it:

```bash
python3 System/Widgets/Generator/_shell/build/assemble.py System/Apps/AiCharacteristics/cartridge System/Apps/AiCharacteristics/AiCharacteristics_generator.html
```

Requires `System/Widgets/Generator/_modules/MiniWiki/dist/miniwiki.bundle.js` to exist first (build
via `python3 System/Widgets/Generator/_modules/MiniWiki/build/bundle_miniwiki.py`) —
`miniwiki.enabled: true` in `config.yaml`.

## Tests

`tests/js/` — node:test, run from `Generator/`:

```bash
node --test AiCharacteristics/tests/js/*.mjs
```

**7/7 passing** (`test-engine.mjs`: imports/contract, all-8-flagged happy
path on the AI fixture, over-cap + human-fixture guard path;
`test-explainer.mjs`: nine-export contract, rules/tables/toMarkdown honesty
text, off-range/needSpace guard path).

## Known limitations

- The 7.1 entity-repetition heuristic over-fires on legitimate repeated
  proper nouns (see above) — this is a design trade-off, not a bug to fix
  by removing the detector; MEDIUM confidence is the mitigation.
- All eight detectors are regex/statistical, not model-based — they measure
  surface features only and share every weakness the CT² caveat names.
- No Tier B (`tierB.enabled: false`) — the pool of detectors is fixed at
  build time; there is no "refresh" action for this cartridge (Tier B in
  this shell is a present-mode content-pool feature, not applicable to an
  analyse-mode detector set).

## Decisions and exceptions

See [app-decisions.md](app-decisions.md) for approvals and any granted rule exceptions. Not
copied here.
