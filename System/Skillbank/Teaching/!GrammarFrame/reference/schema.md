# schema.md — `grammar-content.json`

The machine-readable sidecar the Grammar app consumes. Written to
`Memory/Long-Term/Grammar/grammar-content.json`, beside the two HTML guides.

**It is generated from the same locked skeleton as the two HTML files, in the same pass.** It is
never hand-edited and never generated separately, so it cannot drift from what the guides say.
`Technical_Outline.html` stays authoritative for a human reader; this file is the same content in
a shape a parser can digest without guessing at HTML classes.

**It carries both guides' prose, paired, for the app's Theatre/Technical toggle.** The app can
switch a reader between the technical wording and Luke's theatre metaphor without a second fetch
or a second file — see "Technical vs Theatre" below for exactly which fields are paired and which
are shared as a single copy.

**Form and Function are an organising layer, not fixed fields.** Each heading runs skill.md's
FORM/FUNCTION TEST once and gets ONE of three shapes — `omitted`, `combined`, `split` — recorded as
`layer`, with the actual rule content living in `sections[]` (one section for omitted/combined, two
for split). There is no flat `form`/`function`/`meaning_basis` field on a heading any more (schema
1.2's shape) — see "The sections model" below.

**Meaning has two jobs, kept apart.** The standing PRINCIPLE (`reference/meaning-first.md`'s
epigraph) lives ONCE at the file's root as `meaning_principle`, not per heading. Each rule's own
specific why is sentence A2 of its `definition` — never the same text as the root principle.

**Diagnostics are the load-bearing part of this file.** The app's fuzzy engine identifies and tags
content by running them, so they carry more structure than anything else here. The `diagnostics`
section below is the part to get right.

**A section can subdivide, and a point can be lighter than a rule.** skill.md's SUBDIVISION TEST
lets an over-broad section split into `subsections[]` — the same section shape one level deeper —
only when genuinely warranted. skill.md's WEIGHT TEST lets a point too small for a diagnostic
render as a `notes[]` entry instead of a `rules[]` entry — a sentence or a small table, no
`definition`, no `text`, no diagnostic, and never counted toward the section's own diagnostic
requirement. See "Subsections and notes" below.

**A Syntax/Clause/Sentence/Phrase heading's worked example can carry one or more box diagrams.** A
`[bracket]` tag labels a span flat; a `groups` tree on an `examples[]` entry shows how spans NEST
inside one another. skill.md's DIAGRAM MULTIPLICITY TEST (E4) decides how many — one is the default,
more only when a single diagram cannot show every grouping claim the heading makes — see "Box
diagrams (`groups`)" below.

**A heading can point at another heading it genuinely depends on.** skill.md's CROSS-REFERENCE TEST
(E5) decides whether a heading's own account needs a link to another heading already in the
skeleton — most headings have none — see "Cross-references (`cross_references`)" below.

## Shape

```json
{
  "schema_version": "1.6",
  "generated": "YYYY-MM-DD",
  "source_file": "Original_Content.md",
  "frame": "meaning-first",

  "meaning_principle": {
    "technical": "Grammar allows the communication of meaning.",
    "theatre": "The same claim, dressed in Luke's own metaphor if that helps — never a different one."
  },

  "headings": [
    {
      "id": "adjectives",
      "text": "Adjectives",
      "level": 1,
      "parent": null,
      "tags": ["Syntax", "Phrase", "Adjective"],
      "layer": "combined",

      "sections": [
        {
          "id": "adjectives",
          "kind": "combined",
          "label": { "technical": "Form & Function", "theatre": "..." },
          "subdivided": false,
          "subsections": [],

          "rules": [
            {
              "id": "adjectives-r1",
              "definition": {
                "technical": "Adjectives stack before a noun in one order — opinion, size, age, shape, colour, origin, material, purpose. This is because a thing's purpose or context is a larger category than its materiality. Adjectives modify the noun and are most often part of the noun phrase. Adjective order is consistent, although a determiner's location may vary.",
                "theatre": "The same four claims, dressed in Luke's metaphor — same rule, same why, same context, same consistency, never a different one."
              },
              "text": {
                "technical": "Opinion, size, age, shape, colour, origin, material, purpose.",
                "theatre": "The same claim, phrased through the metaphor (a cue, a role, a stage direction)."
              }
            }
          ],

          "diagnostics": [
            {
              "id": "adjectives-d1",
              "question": "Swap two adjacent adjectives. Does the phrase now sound wrong, or claim something different about the noun?",
              "applies_to": "phrase",
              "order": 1,
              "discriminates": ["meaningful-order", "free-variation"],
              "outcomes": [
                { "answer": "yes", "indicates": "meaningful-order", "applies_tags": ["Adjective", "Phrase"], "weight": 0.85 },
                { "answer": "no",  "indicates": "free-variation",   "applies_tags": [], "weight": 0.4 }
              ],
              "rule_ref": "adjectives-r1",
              "tested_on": {
                "positive": { "span": "a lovely little old round grey table", "answer": "yes" },
                "negative": { "span": "a lovely old little round grey table", "answer": "no" }
              },
              "usable_by_eye": true
            }
          ],

          "notes": [
            {
              "id": "adjectives-n1",
              "shape": "table",
              "claim": {
                "technical": "A few adjectives change shape outright instead of taking -er/-est, and a few others already name an extreme or complete state, so modifying them further (\"very unique\") is usually treated as a misuse.",
                "theatre": "..."
              },
              "table": {
                "headers": ["Base", "Comparative", "Superlative"],
                "rows": [["good", "better", "best"], ["bad", "worse", "worst"]]
              }
            }
          ]
        }
      ],

      "table": null,

      "examples": [
        {
          "kind": "plain",
          "text": "It was a lovely little old round grey Italian marble garden table.",
          "tagged": "It was a lovely [opinion] little [size] old [age] round [shape] grey [colour] Italian [origin] marble [material] garden [purpose] table.",
          "attribution": null,
          "groups": null
        },
        {
          "kind": "memorable",
          "text": "It is a truth universally acknowledged...",
          "tagged": "It [pronoun] is [verb] a truth [noun] ...",
          "attribution": "Austen, Pride and Prejudice",
          "verified": true,
          "groups": null
        }
      ],

      "glossary": [
        { "term": "head noun", "anchor": "t-head-noun", "gloss": "The noun the rest of the phrase is about." }
      ],

      "cross_references": [],

      "flags": []
    },

    {
      "id": "relative-clauses",
      "text": "Relative Clauses",
      "level": 1,
      "parent": null,
      "tags": ["Syntax", "Clause"],
      "layer": "omitted",

      "sections": [
        {
          "id": "relative-clauses",
          "kind": "omitted",
          "label": null,
          "subdivided": false,
          "subsections": [],
          "rules": [ { "id": "relative-clauses-r1", "definition": { "technical": "...", "theatre": "..." }, "text": { "technical": "Removable without losing which noun is meant ⇒ no comma. Not removable without losing it ⇒ comma.", "theatre": "..." } } ],
          "diagnostics": [ { "id": "relative-clauses-d1", "question": "Remove the clause — does the sentence still name the same one noun?", "applies_to": "clause", "order": 1, "discriminates": ["restrictive", "non-restrictive"], "outcomes": [], "rule_ref": "relative-clauses-r1", "tested_on": { "positive": {}, "negative": {} }, "usable_by_eye": true } ],
          "notes": []
        }
      ],

      "table": null,
      "examples": [
        {
          "kind": "plain",
          "text": "The book that is on the table belongs to Maria.",
          "tagged": "The book [noun] that is on the table [restrictive relative clause] belongs to Maria.",
          "attribution": null,
          "groups": [
            {
              "span": "The book that is on the table belongs to Maria.",
              "label": { "technical": "Sentence", "theatre": "..." },
              "children": [
                {
                  "span": "The book that is on the table",
                  "label": { "technical": "Subject phrase", "theatre": "..." },
                  "children": [
                    { "span": "The book", "label": { "technical": "Head noun", "theatre": "..." }, "children": [] },
                    { "span": "that is on the table", "label": { "technical": "Relative clause", "theatre": "..." }, "children": [] }
                  ]
                },
                { "span": "belongs to Maria", "label": { "technical": "Predicate", "theatre": "..." }, "children": [] }
              ]
            }
          ]
        }
      ],
      "glossary": [],
      "cross_references": [],
      "flags": []
    },

    {
      "id": "prepositions",
      "text": "Prepositions",
      "level": 1,
      "parent": null,
      "tags": ["Syntax", "Word Class", "Preposition"],
      "layer": "split",

      "sections": [
        {
          "id": "prepositions-form",
          "kind": "form",
          "label": { "technical": "Form", "theatre": "..." },
          "subdivided": false,
          "subsections": [],
          "rules": [
            {
              "id": "prepositions-form-r1",
              "definition": {
                "technical": "A preposition's form is a single fixed word (in, on, at, by) or a fixed multi-word phrase (in front of, according to); it never inflects for tense, number, or person. This is because its job is to mark a fixed relationship, not report an event, so it needs none of the inflections verbs and nouns carry. It always heads a prepositional phrase, introducing the noun phrase whose relationship to the sentence Function describes. The single-word set is closed and rarely grows; multi-word prepositions are looser.",
                "theatre": "..."
              },
              "text": { "technical": "One fixed word, or one fixed phrase — never inflected.", "theatre": "..." }
            }
          ],
          "diagnostics": [ { "id": "prepositions-form-d1", "question": "...", "applies_to": "word", "order": 1, "discriminates": ["..."], "outcomes": [], "rule_ref": "prepositions-form-r1", "tested_on": { "positive": {}, "negative": {} }, "usable_by_eye": true } ],
          "notes": []
        },
        {
          "id": "prepositions-function",
          "kind": "function",
          "label": { "technical": "Function", "theatre": "..." },
          "subdivided": true,
          "rules": [],
          "diagnostics": [],
          "notes": [],
          "subsections": [
            {
              "id": "prepositions-function-place",
              "label": { "technical": "Place", "theatre": "..." },
              "subdivided": false,
              "subsections": [],
              "rules": [ { "id": "prepositions-function-place-r1", "definition": { "technical": "...", "theatre": "..." }, "text": { "technical": "In (inside a bounded space), on (touching a surface), at (a point).", "theatre": "..." } } ],
              "diagnostics": [ { "id": "prepositions-function-place-d1", "question": "...", "applies_to": "phrase", "order": 1, "discriminates": ["..."], "outcomes": [], "rule_ref": "prepositions-function-place-r1", "tested_on": { "positive": {}, "negative": {} }, "usable_by_eye": true } ],
              "notes": []
            },
            {
              "id": "prepositions-function-time",
              "label": { "technical": "Time", "theatre": "..." },
              "subdivided": false,
              "subsections": [],
              "rules": [ { "id": "prepositions-function-time-r1", "definition": { "technical": "...", "theatre": "..." }, "text": { "technical": "In (a period), on (a day/date), at (a point in time).", "theatre": "..." } } ],
              "diagnostics": [ { "id": "prepositions-function-time-d1", "question": "...", "applies_to": "phrase", "order": 1, "discriminates": ["..."], "outcomes": [], "rule_ref": "prepositions-function-time-r1", "tested_on": { "positive": {}, "negative": {} }, "usable_by_eye": true } ],
              "notes": []
            }
          ]
        }
      ],

      "table": null,
      "examples": [ { "kind": "plain", "text": "...", "tagged": "...", "attribution": null, "groups": null }, { "kind": "memorable", "text": "...", "tagged": "...", "attribution": "...", "verified": true, "groups": null } ],
      "glossary": [],
      "cross_references": [
        { "target": "relative-clauses", "note": { "technical": "A prepositional phrase attaches to the noun before it the same way a relative clause does — the Function diagnostics here assume that attachment test is already understood.", "theatre": "..." } }
      ],
      "flags": []
    }
  ],

  "diagnostic_index": [
    { "id": "adjectives-d1", "heading": "adjectives", "section": "adjectives", "applies_to": "phrase", "order": 1 },
    { "id": "relative-clauses-d1", "heading": "relative-clauses", "section": "relative-clauses", "applies_to": "clause", "order": 1 },
    { "id": "prepositions-form-d1", "heading": "prepositions", "section": "prepositions-form", "applies_to": "word", "order": 1 },
    { "id": "prepositions-function-place-d1", "heading": "prepositions", "section": "prepositions-function-place", "applies_to": "phrase", "order": 1 },
    { "id": "prepositions-function-time-d1", "heading": "prepositions", "section": "prepositions-function-time", "applies_to": "phrase", "order": 1 }
  ]
}
```

## Field rules

| Field | Rule |
| :--- | :--- |
| `meaning_principle` (root, NOT per heading) | PAIRED — `{ "technical": ..., "theatre": ... }`. The standing claim from `reference/meaning-first.md`'s epigraph, character-identical to what each guide itself renders, ONCE, near its top. Never repeated inside a `headings[]` entry. |
| `id` (heading) | kebab-case slug of `text`, unique across the file. Used as the HTML anchor id in both guides, so the app can link a JSON node straight to either rendered page. |
| `text` (heading) · `level` · `parent` · `tags` | Copied verbatim from the locked skeleton. Identical to both HTML files by construction — the skeleton is the single source. |
| `layer` | `"omitted"` \| `"combined"` \| `"split"` — skill.md's FORM/FUNCTION TEST result for this heading. Fixes how many entries `sections` has (one for omitted/combined, two for split) and their `kind`. |
| `sections` | Always 1 or 2 entries, per `layer`. `id` = the heading's slug (omitted/combined) or heading-slug + `-form`/`-function` (split). `kind` = `"omitted"` \| `"combined"` \| `"form"` \| `"function"`. `label` is `null` when `kind` is `"omitted"`, else a paired `{technical, theatre}` string ("Form & Function", or "Form"/"Function") rendered as a real sub-heading, above the section's rules. A `split` section's `rules[].definition` names the OTHER section by its label in its own context (B) sentence — checked at STEP 9. |
| `sections[].rules` | Each rule's `definition` and `text` are BOTH paired `{technical, theatre}`. `definition.technical` is one flowing !SimpleEnglish paragraph (no `(A1)`/`(A2)`/`(B)`/`(C)` labels) that, in order: states the rule itself in full (A1), gives this rule's OWN why — distinct from the root `meaning_principle`, never a restatement of it (A2), situates it in one sentence, larger context first then immediate (B, naming the other section when this section is half of a `split`), and states whether it is consistent or has exceptions (C). The test is FUNCTIONAL (does it do all four) not FORMAL (does it have four sentences) — parts merge into fewer sentences whenever the content allows, expanding only where a part's own complexity earns it; the shortest paragraph that still does all four is the target, never a padded one; `definition.theatre` asserts the SAME four parts, dressed. `text` is the KEY CALL-OUT that renders after the definition — a terse, bold statement in as few words as possible asserting the same claim as the definition's A1, without the leading `*` marker. It must be CONCRETE and APPLICABLE (the rule's own content — a pattern, order, sequence, or test, usable directly against a real phrase) and never an ABSTRACT classification of what kind of rule it is; `text.theatre` re-phrases it through the metaphor (a cue, a role, a stage direction), `text.technical` stays plain. No field, and no side of a pair, is ever empty — a rule that skipped skill.md STEP 5's "FOR EACH RULE" pass did not go through this skill. |
| `sections[].diagnostics` | See the dedicated section below. A section satisfies the "never empty" requirement through its OWN `diagnostics`, through EVERY entry of `subsections[]` carrying at least one, or both — never through neither. |
| `sections[].subdivided` · `subsections` | `subdivided` is skill.md's SUBDIVISION TEST result — `true` iff `subsections` is non-empty. `subsections` is ADDITIVE: a section's own `rules`/`diagnostics`/`notes` are NOT emptied by having subsections — a general-level rule that belongs to no single narrow case stays at the section level, above them. Each `subsections[]` entry is the SAME section shape one level deeper (its own `id` = section id + `-` + kebab-case name, its own `label`, its own `rules`/`diagnostics`/`notes`, and its own `subdivided`/`subsections` — a sub-subsection could in principle carry its own subsections, though skill.md's "used sparingly" guidance makes a second level rare). |
| `sections[].notes` (and `subsections[].notes`) | skill.md's WEIGHT TEST result for a point too small for a diagnostic. Each entry: `id`, `shape` (`"sentence"` \| `"table"`), `claim` (paired `{technical, theatre}`, the point itself), and — only when `shape` is `"table"` — a `table` object (`headers`, `rows`). No `definition`, no `text`, no `diagnostic` field on a note; it never appears in `diagnostic_index` and never counts toward the section's diagnostic requirement above. |
| `table` (heading-level, shared across sections) | `null` when the heading has no table. Distinct from a NOTE's own optional `table` — this one is the heading-level closed-set table (skill.md STEP 6), a note's is scoped to that one minor point. |
| `examples` (heading-level, shared across sections) | Always exactly two: one `plain`, one `memorable`, in that order. `tagged` carries the bracket-tagged repeat. `groups` is `null` unless the heading's `tags` include `Syntax` plus one of `Clause`/`Sentence`/`Phrase`, in which case it is an ARRAY of one or more diagram trees — skill.md's DIAGRAM MULTIPLICITY TEST (E4) decides the count, one by default — see "Box diagrams" below. |
| `attribution` | `null` for the plain example and for an invented sentence; `"Author, Work"` for a verified quotation. |
| `verified` | Present on `memorable` only. Always `true` — an unverified quote is discarded, never written with `false`. |
| `glossary` (heading-level) | Only terms first defined under **this** heading. A term defined elsewhere is not repeated. |
| `cross_references` (heading-level) | skill.md's CROSS-REFERENCE TEST (E5) result. Normally empty — most headings stand alone. Each entry: `target` (another heading's `id`, already present in the skeleton) and `note` (paired `{technical, theatre}`, one sentence naming the dependency — rendered as the link's context at its point of use, never a bare "see X"). Distinct from a SPLIT section's C5 pointer, which is a fixed convention and never appears here. |
| `flags` (heading-level) | Anything the run could not confidently supply, as `{ "kind": "...", "note": "..." }`. Normally empty. A non-empty `flags` array is surfaced to Luke, not buried. |
| `diagnostic_index` | A flat list of every diagnostic across every section in the file, sorted by `applies_to` then `order`, each naming its `heading` and `section`. Lets the engine load a run-order without walking the heading/section tree. Generated, never authored. |

---

## Diagnostics — the detail

A diagnostic is a **test the engine can run against a span of text to decide what that span is**.
It is not a study prompt. Every diagnostic must be answerable **yes or no** about a specific span
**by two different users**: a rule-based engine with a lexicon and no understanding, and Luke,
by eye, in a few seconds. Serving only one of the two is not enough — the app tags content with
these questions, and Luke identifies features with the same ones.

| Field | Rule |
| :--- | :--- |
| `id` | `<heading-slug>-d<n>`. Stable across regenerations where the question is unchanged, so the engine's own tuning survives a rebuild. |
| `question` | The exact text rendered in both guides. Binary. As SHORT as the single test allows — no padded context. One test per diagnostic — a question with an "and" in it is two diagnostics. Never circular: it names an operation and reads off the result ("Remove it — does the phrase still stand?"), rather than asking for the answer it is meant to produce ("Is this the head noun?"). |
| `applies_to` | The unit the test runs on: `word` · `phrase` · `clause` · `sentence`. Tells the engine which pass to run it in. |
| `order` | Run order within that unit, cheapest and most discriminating first. The engine may stop early once confidence is settled. |
| `discriminates` | The two-or-more categories this test tells apart. The reason the test exists. |
| `outcomes` | One entry per possible `answer`. Each gives what that answer `indicates`, which tags it `applies_tags`, and a `weight` from 0 to 1. |
| `weight` | How much confidence this answer contributes. `1.0` is decisive; `0.3` is a hint. A "no" is usually worth less than a "yes" — failing one test rarely proves as much as passing it. |
| `rule_ref` | The `sections[].rules[].id` this test enforces, within the SAME section, so a classification can name the rule behind it. |
| `tested_on` | The evidence the question discriminates, from the skill's STEP 5B second pass. `positive` is a span that HAS the feature; `negative` is the **nearest miss** — a genuinely confusable case (the class most easily mistaken for the target), not merely a variant that fails for an unrelated, incidental reason any non-member would also fail for. Their `answer` values **must differ**; identical answers mean the question diagnoses nothing and must not be written. The positive span is also shown beside the question in both rendered guides. |
| `usable_by_eye` | Always `true`. Every diagnostic does double duty — the engine runs it mechanically, and Luke applies it by eye to a sentence in a few seconds. A question only one of them can use is unfinished and is rewritten, never shipped with this set `false`. |

**Every diagnostic has been written twice.** The skill drafts the set, then runs a separate
discrimination pass over it (STEP 5B) — because a question drafted while explaining a rule tends to
restate the rule rather than test for it. `tested_on` is that pass's result, carried into this file
so the app's tuning and Luke's own use both rest on a question proven to draw the feature out.

**Every tag the engine can apply must be conferred by at least one diagnostic's `applies_tags`.**
A tag that appears in a heading's `tags` but is unreachable through any outcome is a gap — flag it.

**The engine's trace.** Because each outcome names its `indicates`, `applies_tags`, `weight` and
`rule_ref`, a classification decision can be reported as: *this span was tagged X because diagnostic
`adjective-order-d1` answered yes (weight 0.85), enforcing rule `adjective-order-r1`.* That is
exactly what `Grammar-prd.md`'s last acceptance criterion asks for — a decision traceable to a Guide
definition, its place in the hierarchy, and the diagnostic question that resolved it.

## Subsections and notes

Two independent flexes below the section level, per skill.md's 🗒️ SUB-SUBSECTIONS AND NOTES:

* **A section too broad** gains `subsections[]` (`subdivided: true`) for its narrow cases — each
  one the SAME shape as a section, recursively, so the app can walk it with the same code path it
  already uses for `sections[]`. This is ADDITIVE: a section's own `rules`/`diagnostics`/`notes`
  stay exactly where they were — a general rule that belongs to no single narrow case is not
  forced into a subsection just because the section has some. Used sparingly; most sections never
  need any.
* **A point too small for a rule** becomes a `notes[]` entry instead — no diagnostic, so it never
  reaches `diagnostic_index` and never drives the fuzzy engine's tagging. It exists for Luke's
  reading only, carried by `claim` (paired) and, when `shape` is `"table"`, a small `table` object
  with the SAME `headers`/`rows` shape a heading-level `table` would use.

Both are decided AUTONOMOUSLY at generation time (STEP 4/5) — a subagent covering one heading in
🐝 FLEET MODE decides both tests for its own heading without consulting the boss; neither needs
Luke's ruling unless the point itself is content he never stated (the TWO LANES gate, orthogonal
to shape).

## Box diagrams (`groups`)

A `[bracket]` tag is flat. `groups` shows NESTING — which spans sit wholly inside which others —
for a heading whose `tags` include `Syntax` plus one of `Clause`/`Sentence`/`Phrase`. It sits on
the relevant `examples[]` entry (usually `plain`), never as a heading-level field of its own,
because it illustrates that ONE worked example, the same way `tagged` does.

**`groups` is an ARRAY, not a single tree.** skill.md's DIAGRAM MULTIPLICITY TEST (E4) decides how
many entries it has: one is the default — a diagram illustrates the HEADING, not every rule inside
it — more only when a single diagram cannot show every grouping claim the heading makes (e.g. two
attachment readings, or Form's grouping differing from Function's under a SPLIT heading). Each entry
is a complete, independent tree in its own right:

| Field | Rule |
| :--- | :--- |
| `span` | The exact substring of `examples[].text` this box covers. The outermost node's `span` equals the full example text. |
| `label` | Paired `{technical, theatre}` — !SimpleEnglish, matching the vocabulary this heading's `[bracket]` tags already use ("subject phrase", not "NP"), unless Luke's own paste uses linguistic abbreviations. |
| `children` | Zero or more child nodes, each `span` a substring WHOLLY CONTAINED in the parent's `span`, word for word — checked at STEP 5C. `[]` for a leaf (a box with nothing nested inside it). |

Only the `label` pairs are theatre-dressable — `span` and the tree shape (which spans nest inside
which) are identical across both guides and this file, the same non-contradiction rule STEP 7
applies everywhere else. This holds per entry: a second diagram in the array is held to the same
rule independently of the first.

## Cross-references (`cross_references`)

Heading-level, normally empty — skill.md's CROSS-REFERENCE TEST (E5) result. A cross-reference is a
hyperlink from one heading to another it genuinely depends on, decided per heading against the
locked skeleton, and is separate from `sections[].rules[].definition`'s SPLIT-section pointer (C5,
always present, fixed) and from `glossary`'s term-level linking (D2, mechanical, per file).

```json
{
  "cross_references": [
    {
      "target": "relative-clauses",
      "note": {
        "technical": "A prepositional phrase attaches to the noun before it the same way a relative clause does — the Function diagnostics here assume that attachment test is already understood.",
        "theatre": "..."
      }
    }
  ]
}
```

| Field | Rule |
| :--- | :--- |
| `target` | Another heading's `id`, present in the CURRENT skeleton. A target that no longer exists is a D10 failure — drop the entry and re-run E5 for this heading. |
| `note` | Paired `{technical, theatre}`, one sentence naming the dependency — rendered at the exact point in the prose the dependency occurs, never as a bare "see X" link with no reason given. |

Shared, not paired: `target` is a structural fact — the SAME heading is pointed at from both guides.
Only `note`'s wording is theatre-dressable, same claim either side (the same rule `groups[].label`
and every other paired field in this file follows).

## Technical vs Theatre — the toggle

The app's Theatre/Technical toggle needs both guides' wording in one file, without duplicating
content that never differs between them. Two groups:

| Duplicated as `{technical, theatre}` | Shared — one copy serves both views |
| :--- | :--- |
| `meaning_principle` (root, once) | `sections[].diagnostics` (STEP 5/6/7: word-for-word identical questions — the app runs the same test regardless of which view is showing) |
| `sections[].label` / `subsections[].label` | `examples[].text`/`tagged` (STEP 7: same worked examples, only the surrounding prose is dressed) |
| each rule's `definition` and `text` (key call-out) | `layer`, `sections[].kind`/`subdivided`, `tags`, `glossary`, `table`, `flags`, `id`/`level`/`parent`/heading `text` |
| `notes[].claim` | `examples[].groups[].span` and its tree shape (only each node's `label` is paired, above) |
| `cross_references[].note` | `cross_references[].target` (the SAME heading is pointed at from both guides) |

The rule of thumb: **prose that STEP 7 permits Theatre.html to dress gets paired; anything STEP 7
requires to be identical across the two guides, or that is structural rather than prose, stays a
single field.** A `theatre` value must assert the same claim as its `technical` sibling (STEP 6/7's
own assertion) — the toggle changes voice, never substance, and never the section STRUCTURE (a
heading's `layer` and section count are identical in both guides by construction).

## What the app does with it

The app's engine (per `Grammar-prd.md`) works through the Guide's own apparatus in a fixed order:
**definitions → hierarchy → diagnostic questions.** This file serves all three directly —
`meaning_principle`, `sections[].label`, `glossary`, and each rule's `definition` are the
definitions (read whichever side of a pair matches the reader's current toggle state),
`level`/`parent`/`tags`/`layer` are the hierarchy, and `sections[].diagnostics` are the tests that
do the actual identifying and tagging — unaffected by the toggle, since they are never duplicated.

`Grammar_contents.md` (at `System/Widgets/Parser/Grammar/`) is **not** written by this skill. If it
is ever to be regenerated from the Guide, that is the app's build step reading this file — one
direction only, so there is never a second source of truth.
