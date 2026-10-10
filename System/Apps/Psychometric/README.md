# Psychometric

A standalone Lukeatron app. It is assembled from the shared `System/Widgets/Generator/_shell/` chassis in **`present`
mode**: Generate pulls a practice item from the baked pool, a per-category Clue/Check/Explain set
engages, and Copy puts the plain question text on the clipboard. Shipped widget:
`Psychometric_generator.html`, **293,083 bytes** — the largest of the four Generator apps, mostly
SVG-rendering rule specs for the abstract-reasoning category (below).

## What it does

`ENGINE.getPool()` returns the 60-item pool; `ENGINE.render(item)` draws
the item (including, for abstract-reasoning items, an SVG matrix/sequence/
odd-one-out figure generated at render time — see below);
`ENGINE.checkAnswer()` and `ENGINE.explainItem()` are both wired
(`generator.clue: true`, `generator.answer: true`, `generator.explainer:
true` — the only Generator cartridge with all three present-mode features
on). One focus level, `item` (`parser.levels`), cap 1 item at a time
(`parser.cap`).

## Navigation

```
Psychometric/
├── Psychometric_generator.html           the shipped, built widget — open this directly
├── Psychometric-test-formats-reference.md
├── cartridge/
│   └── build/
│       ├── abstract_specs.py             structured rule data for the 12 abstract-reasoning items
│       ├── build_psychometric.py         compiles the seed + rule specs into pool.json
│       ├── config.yaml
│       ├── engine.js
│       ├── explainer.js
│       ├── styles.css
│       ├── psychometric.miniwiki.json
│       ├── psychometric_content.md
│       └── pool.json
├── samples/                              23 real-world test-sample files — reference material
│   ├── Abstract_reasoning_samples/       for authoring style, not compiled into the build
│   └── *.md
├── tests/
│   ├── js/
│   │   ├── test-abstract-rules.mjs
│   │   └── test-engine.mjs
│   └── python/
│       └── test_build_psychometric.py
├── app-decisions.md
├── wishlist.md
└── README.md
```

## Cross-app behaviour

| From | To | What crosses | What breaks if it changes |
|---|---|---|---|
| `System/Widgets/Generator/_shell/` | this app's `cartridge/build/` | `assemble.py` bakes `config.yaml` + the compiled cartridge files (including SVG-rendering rule specs) into `Psychometric_generator.html` | A shell contract change breaks the build until this cartridge is updated to match — the shell stayed behind in `Widgets/Generator/` when this app was promoted out |
| `System/Widgets/Generator/_research/seed/psychometrics.md` | this app's `build_psychometric.py` | The 60-item seed text, combined with `abstract_specs.py`'s rule data, compiles into `pool.json` | The seed research also stayed behind in `Widgets/Generator/`; rebuilding this app's pool requires that file to still exist there |
| `samples/` | nothing | Reference material for future content authoring only | Not wired into the build — will not appear in the widget until explicitly compiled in |

## Pool size and provenance

**60 items** — exactly 12 per category, five categories
(`_research/seed/psychometrics.md (60 original items)`, `builtFrom`). All
items are **original**, hand-authored to match the *format* of established
psychometric test types, citing published guides for format only (no test
content reused): TestGorilla's and the U.S. Office of Personnel
Management's SJT guides, GraduatesFirst's Critical Reasoning guide and the
Watson-Glaser Critical Thinking Appraisal format, Psychometric Success's
Abstract/Diagrammatic Reasoning guide and Raven's Progressive Matrices
structure, MConsultingPrep's Deductive Reasoning guide, and JobTestPrep's
Numerical/Data-Interpretation guide (all cited in the seed doc's header).

| Category | Count |
|---|---:|
| Situational Judgement | 12 |
| Verbal Critical Reasoning | 12 |
| Abstract / Diagrammatic Reasoning | 12 |
| Deductive & Analytical Reasoning | 12 |
| Data Interpretation & Quantitative Reasoning | 12 |

A separate `samples/` folder (23 files) holds real-world test-sample
excerpts (GMAT, GRE, LSAT, MCAT, UCAT, GAMSAT, STAT, TSA, LNAT, Watson-Glaser,
SHL, ACER, CASPER) gathered as *reference material for authoring style*, not
as pool content — they are not compiled into `pool.json`.

## Abstract reasoning: derived, never hand-recorded

The 12 abstract-reasoning items are the one category where "don't
hand-record an answer that can silently drift from the item" was a
binding design decision, not just good practice. `abstract_specs.py`
stores each item as **structured data**: a grid/matrix declaration (cell
shape, count, fill, rotation, size, position) plus the rule(s) that
generate the sequence or the odd-one-out — never literal SVG markup and
never a stored answer letter. `engine.js`'s `_deriveAnswerId()` walks each
item's `rules`/`priority` at both render time (to draw the SVG) and
check-answer time (to mark right/wrong) — the same derivation function
both places, so the drawn figure and the graded answer cannot diverge from
each other by construction.

`tests/js/test-abstract-rules.mjs` proves this holds for the full set: it
compares `_deriveAnswerId()`'s output against a hand-verified seed answer
key for **all 12 abstract-reasoning items** and asserts every one matches
(`"rule spec derived a different answer than the seed key"` on any
mismatch) — a build where the rule spec and the "correct" answer disagree
fails this test, not just a spot check on one item.

## Interaction controls

Category picker (5 categories), Generate, Clue, answer input + Check,
Explain, Copy. Every present-mode feature flag this shell supports is on
for this cartridge. MiniWiki catalogue (`psychometric.miniwiki.json`) lists
every item by category.

## Build recipe

Run from the `_Lukeatron` root — the shell and the seed research stayed behind in
`System/Widgets/Generator/` when this app was promoted out of it:

```bash
python3 System/Apps/Psychometric/cartridge/build/build_psychometric.py
python3 System/Widgets/Generator/_shell/build/assemble.py System/Apps/Psychometric/cartridge System/Apps/Psychometric/Psychometric_generator.html
```

`build_psychometric.py` compiles `System/Widgets/Generator/_research/seed/psychometrics.md` plus
`abstract_specs.py`'s structured rule data into `pool.json`.

## Tests

```bash
node --test Psychometric/tests/js/*.mjs
python3 -m unittest discover -s Psychometric/tests/python -p "test_*.py"
```

**12/12 JS passing** (`test-engine.mjs`: present-mode contract, checkAnswer
across categories, non-empty `explainItem()` html for every category,
pool id-uniqueness + category-membership validation; `test-abstract-rules.mjs`:
the derived-equals-seeded proof above, across all 12 abstract items) + **7/7
Python passing** (`test_build_psychometric.py`: pool compilation from seed +
rule specs).

## Known limitations

- Only the abstract-reasoning category has the derived-answer guarantee;
  the other four categories' answers are seed-authored text fields, correct
  by authoring care rather than by a structural proof the way
  abstract-reasoning's is.
- `samples/` is reference material for future content authoring, not wired
  into the build — it will not appear in the widget until explicitly
  compiled in.
- Largest of the four Generator widgets (293 KB) — almost entirely the
  60-item pool plus the abstract-reasoning rule specs and MiniWiki catalogue,
  not any shared shell overhead.

## Decisions and exceptions

See [app-decisions.md](app-decisions.md) for approvals and any granted rule exceptions. Not
copied here.
