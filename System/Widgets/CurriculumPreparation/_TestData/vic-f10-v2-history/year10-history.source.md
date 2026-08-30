# Q-1 Fixture — Year 10 History (raw curriculum paste)

Paste target for **Q-1**, the measurement that closes gate **G-9** (build
curriculum ingest, or retire it unbuilt).

This file is *input data*, not a spec. It lives in `_Spikes/` and never in
`_template/` — `AC-BT-4` requires that grepping the template for any
curriculum-specific string returns nothing, and `AD-8` keeps third-party
curriculum text out of the distributed tool.

---

## 1. Provenance

Fill this in when you paste. These fields map one-to-one onto the
`curriculum{}` object in `unit.json`, so what you write here is what a real
ingest would stamp onto the unit (`FR-CUR-1e`, `AD-8`).

| `curriculum{}` field | Value |
|---|---|
| `profileId` | `vic-f10-v2` |
| `name` |  |
| `jurisdiction` |  |
| `version` |  |
| `sourceRef` |  |
| `licence` |  |
| `attribution` |  |

**Retrieved from (URL):**

**Date retrieved:**

### Label map

This curriculum's own words for the three canonical node kinds. The schema
always stores `strand` / `outcome` / `task`; only the display names vary
(`AD-10`).

| Canonical `kind` | This curriculum calls it |
|---|---|
| `strand` |  |
| `outcome` |  |
| `task` |  |

---

## 2. Raw paste

Paste the curriculum text **inside the fence below, exactly as copied**.

Three things matter, because the parser keys on them (`AD-16`):

1. **Keep the indentation.** Leading whitespace is the parser's primary
   depth signal. The fence preserves it; pasting into open Markdown would
   let it be reflowed away.
2. **Don't tidy anything.** No fixing line breaks, renumbering, expanding
   abbreviations, or deleting "noise" like page headers. The whole point of
   Q-1 is measuring the parser against a real, messy copy-paste from a PDF.
3. **Keep codes verbatim.** `code` is preserved exactly (`INV-DM-2`) and is
   the field re-ingest matches on (`AD-CIB-4`).

```text
<<< PASTE BELOW THIS LINE >>>

By the end of Level 10, students evaluate the significant events, developments and ideas that shaped the modern world, including histories of Australia, the world wars and the Holocaust, and Aboriginal and Torres Strait Islander Peoples’ rights and freedoms over the period between 1750 and the early 21st century.
Students formulate and adapt historical questions to support the development of historical investigations and their use of historical sources and concepts to interpret the modern world. They organise historical narratives of events, ideas and developments in chronological order to explain varied patterns and forms of continuity and change and their causes and consequences. Students analyse the key features of primary and secondary sources, their content and context, and apply historical questions when drawing inferences from them. They evaluate historical sources by verifying and corroborating their accuracy and value as historical evidence. Students use historical sources to identify and analyse the perspectives of individuals and groups in the modern world and use these perspectives to understand the beliefs, values and attitudes of the individuals and societies studied. Students recognise the contested nature of history and apply this knowledge to identify and evaluate different historical interpretations and debates. Students analyse varied patterns and forms of continuity and change and analyse the significant events, individuals, ideas and development that contributed to and resulted from them. They analyse short- and long-term causes and intended and unintended consequences of significant events, individuals, ideas and developments and their relationships to continuity and change. They use criteria informed by historical questions to evaluate the historical significance events, ideas, individuals, groups, movements and developments of the modern world. When constructing sustained historical interpretations, students use historical concepts, terms, relevant knowledge, conventions and evaluated evidence from a range of historical sources.

causes and consequences of the Industrial Revolution, the movement of people and European imperialism VC2HH10K01

significant ideas and developments and their impacts on society and politics VC2HH10K02

significant developments and events since 1945 that have contributed to global change, such as World War II, the United Nations, the Cold War and technologies VC2HH10K03

the contribution of significant movements for social and political change since 1945, such as independence, nationalist and conservative political movements, indigenous rights, civil rights, women’s rights, LGBTQI+ rights and environmentalism VC2HH10K04

the significant events, individuals and groups in the women’s movement in Australia, and how they have changed the role and status of women VC2HH10K05

the continuing efforts to create change in the civil rights and freedoms in Australia, for Aboriginal and Torres Strait Islander Peoples, migrants and women VC2HH10K06

Investigations: Australians at War 1914-1945

the causes of World War I and World War II VC2HH10K13

the reasons that Australians, including Aboriginal and Torres Strait Islander Peoples, fought in the world wars VC2HH10K14

significant places where Australians fought VC2HH10K15

the experiences and perspectives of those who fought or were deployed overseas, including Aboriginal and Torres Strait Islander Peoples and women VC2HH10K16

significant events and turning points of the world wars VC2HH10K17

continuities and changes in the nature of warfare VC2HH10K18

the causes of the Holocaust VC2HH10K20

the diverse experiences and perspectives of Jewish and non-Jewish peoples during the period of the Holocaust VC2HH10K22

different interpretations and debates about the significance and legacies of the world wars VC2HH10K23

concepts and skills

formulate, refine and use historical questions to inform historical investigations VC2HH10S01

sequence significant events, individuals, ideas, movements and developments chronologically to analyse continuity and change, and causes and consequences VC2HH10S02

analyse the purpose, features, content and context of historical sources VC2HH10S03

analyse the perspectives, beliefs, values and attitudes of people and groups based on evidence from a range of sources VC2HH10S05

evaluate historical interpretations and debates VC2HH10S06

Contunity and change

analyse continuity and change VC2HH10S07

causes and consquences

analyse short- and long-term causes and the intended and unintended consequences of significant events, individuals, ideas and developments and their contributions to continuity and change VC2HH10S08

Historical significance

evaluate the significance of individuals, groups, movements, events, developments and ideas VC2HH10S09

community

construct sustained historical interpretations and arguments using appropriate historical concepts, terms, knowledge, conventions and evaluated evidence from a range of historical sources VC2HH10S10

<<< PASTE ABOVE THIS LINE >>>
```

---

## 3. Ground truth (fill in after pasting)

`SC-7` requires ingest accuracy to be **a measured number, not an
impression**: nodes correctly placed ÷ nodes in the source. That needs a
known denominator and a known correct answer, recorded *before* any parser
runs, so the measurement can't be talked into passing.

**Total nodes in the source:** 31

Count by kind:

| Kind | Count |
|---|---|
| `strand` | 7 |
| `outcome` | 24 |
| `task` | 0 |

**Expected tree** — one line per node, indented to its true depth, in the
form `kind | code | title`. This is the answer key Q-1 scores against. A
node counts as correct only if depth, `code` and `title` all match.

```text
strand | — | (untitled — no heading line precedes K01 in the source; see Known-awkward cases)
  outcome | VC2HH10K01 | causes and consequences of the Industrial Revolution, the movement of people and European imperialism
  outcome | VC2HH10K02 | significant ideas and developments and their impacts on society and politics
  outcome | VC2HH10K03 | significant developments and events since 1945 that have contributed to global change, such as World War II, the United Nations, the Cold War and technologies
  outcome | VC2HH10K04 | the contribution of significant movements for social and political change since 1945, such as independence, nationalist and conservative political movements, indigenous rights, civil rights, women’s rights, LGBTQI+ rights and environmentalism
  outcome | VC2HH10K05 | the significant events, individuals and groups in the women’s movement in Australia, and how they have changed the role and status of women
  outcome | VC2HH10K06 | the continuing efforts to create change in the civil rights and freedoms in Australia, for Aboriginal and Torres Strait Islander Peoples, migrants and women
  strand | — | Investigations: Australians at War 1914-1945
    outcome | VC2HH10K13 | the causes of World War I and World War II
    outcome | VC2HH10K14 | the reasons that Australians, including Aboriginal and Torres Strait Islander Peoples, fought in the world wars
    outcome | VC2HH10K15 | significant places where Australians fought
    outcome | VC2HH10K16 | the experiences and perspectives of those who fought or were deployed overseas, including Aboriginal and Torres Strait Islander Peoples and women
    outcome | VC2HH10K17 | significant events and turning points of the world wars
    outcome | VC2HH10K18 | continuities and changes in the nature of warfare
    outcome | VC2HH10K20 | the causes of the Holocaust
    outcome | VC2HH10K22 | the diverse experiences and perspectives of Jewish and non-Jewish peoples during the period of the Holocaust
    outcome | VC2HH10K23 | different interpretations and debates about the significance and legacies of the world wars
strand | — | concepts and skills
  outcome | VC2HH10S01 | formulate, refine and use historical questions to inform historical investigations
  outcome | VC2HH10S02 | sequence significant events, individuals, ideas, movements and developments chronologically to analyse continuity and change, and causes and consequences
  outcome | VC2HH10S03 | analyse the purpose, features, content and context of historical sources
  outcome | VC2HH10S05 | analyse the perspectives, beliefs, values and attitudes of people and groups based on evidence from a range of sources
  outcome | VC2HH10S06 | evaluate historical interpretations and debates
  strand | — | Contunity and change
    outcome | VC2HH10S07 | analyse continuity and change
  strand | — | causes and consquences
    outcome | VC2HH10S08 | analyse short- and long-term causes and the intended and unintended consequences of significant events, individuals, ideas and developments and their contributions to continuity and change
  strand | — | Historical significance
    outcome | VC2HH10S09 | evaluate the significance of individuals, groups, movements, events, developments and ideas
  strand | — | community
    outcome | VC2HH10S10 | construct sustained historical interpretations and arguments using appropriate historical concepts, terms, knowledge, conventions and evaluated evidence from a range of historical sources
```

### Known-awkward cases

Anything you expect the parser to get wrong — inconsistent numbering, a
code that spans a line break, an elaboration wrapped mid-sentence, tables
flattened by the PDF copy. Noting these now makes the result diagnostic
rather than just a score.

- **No indentation at all.** Confirmed — every line in the paste is flush
  left; the parser's usual primary depth signal (leading whitespace) is
  completely absent. Depth must be inferred from code-letter grouping and
  heading/no-heading position instead.
- **No numbering patterns at all.** Confirmed — no "1.2.3"-style prefixes
  anywhere; the only structural markers are the trailing codes and the
  blank-line paragraph breaks.
- **Codes are trailing tokens, not leading.** Confirmed — every code
  (`VC2HH10K01` etc.) sits at the end of its line, after the title text, not
  before it.
- **Gaps in the code sequence.** Confirmed: `K07`–`K12` (six codes), `K19`,
  `K21`, and `S04` are all absent from the paste. (Also note `K24`+ and
  `S11`+ never appear either, but that's just the sequence ending, not a
  gap.)
- **Typos present in the source.** Confirmed verbatim: "Contunity and
  change" (line with `S07`'s heading, missing an "i") and "causes and
  consquences" (heading before `S08`, missing an "e"). Both are copied
  as-is into the tree above per the "keep codes/text verbatim" rule.
- **The heading "community" appears mangled.** Confirmed — the heading
  immediately before `S10` is the single lowercase word "community", which
  reads oddly next to the other four skills sub-headings and is very
  plausibly a garbled OCR/copy-paste of "Communicating" (this whole
  cluster — questions, sources, perspectives, continuity/change,
  causes/consequences, significance, *communicating* — mirrors a
  recognisable historical-skills taxonomy). Left verbatim as "community" in
  the tree since correction is out of scope for ground truth.
- **Headings and outcomes are visually indistinguishable except by the
  presence of a code.** Confirmed — both are single-sentence-or-fragment
  lines separated only by blank lines; the *only* reliable discriminator is
  whether the line ends in a `VC2HH10[KS]\d\d` token.
- **No `task`-kind nodes exist anywhere in this paste (new finding).** The
  three-kind model (strand/outcome/task) expects tasks, but this source
  only ever produces `strand` and `outcome` nodes — `task` count is
  genuinely 0. A parser that assumes every source populates all three kinds
  will over-fit; this fixture can't measure task-handling at all.
- **The K-strand has no heading line of its own (new finding, per the
  brief's own note).** `K01` is the very first coded line after the two
  achievement-standard paragraphs, with no preceding heading — unlike the
  S-strand, which is introduced by "concepts and skills". This means the
  top-level Knowledge strand node has no title text to extract from the
  source at all; I've stood in a placeholder title in the tree above and
  flagged it rather than inventing prose. A parser has no textual basis to
  produce a title here, only to infer the node's existence and domain from
  the first `K`-coded line it meets.
- **Domain placement is ambiguous below the top level (new finding.)** The
  spec says `domain` is set only on strand nodes, keyed off the K/S code
  letter, but doesn't say whether the five sub-strand headings nested
  inside K and S (e.g. "Investigations: Australians at War 1914-1945",
  "Contunity and change") also carry `domain: knowledge` / `domain: skill`
  by inheritance, or leave it unset since they have no code of their own.
  Ground truth above leaves this open; it isn't scoreable from the paste
  text alone.
- **Inconsistent heading capitalisation (new finding.)** Sub-headings mix
  Title Case ("Investigations: Australians at War 1914-1945", "Contunity
  and change", "Historical significance") with lowercase ("concepts and
  skills", "causes and consquences", "community"). A parser using
  capitalisation as a secondary heading heuristic will get inconsistent
  signal.
- **No code spans a line break, verified.** Every one of the 24 codes sits
  on the same physical line as its full title text with no wrap — this
  particular hazard, sometimes seen in PDF copy-pastes, does not actually
  occur in this fixture.

---

## 4. Result

| | |
|---|---|
| Date measured |  |
| Nodes correctly placed |  |
| Accuracy |  |
| **G-9 verdict** | ≥ ~60% → build ingest · < ~60% → retire spec unbuilt |
