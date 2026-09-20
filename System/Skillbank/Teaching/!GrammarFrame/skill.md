---
name: GrammarFrame
description: "Turn grammar content Luke pastes into Memory/Long-Term/Grammar/Original_Content.md into two offline-readable HTML guides — Technical_Outline.html and Theatre.html — sharing one heading skeleton, plus grammar-content.json, the sidecar the Grammar app consumes, carrying both guides' prose side by side so the app's Theatre/Technical toggle renders either view from one file. An audience of one. Governed by a single canonical CRITERIA set, each criterion asked forward while generating (how best can this fulfil it?) and backward while measuring (does this fulfil it?) — so the standard that shapes the work is the same standard that rules on it. Verifies quotes and grammar facts autonomously; asks Luke before adding a heading, correcting his grammar, restructuring, or making any significant addition. Diagnostic questions are the spine of all three outputs and serve two users — the app runs them mechanically, Luke applies them by eye. Every rule is explained through a meaning-first frame rather than as arbitrary convention. Theatre.html may go lighter on technical granularity and never on the metaphor. A STEP 7B TRANSMISSION REVIEW closes the run before the JSON is emitted: criteria C32/C33 call !Comprehension and !ConceptFidelity over each rendered heading in both guides, measuring not whether what I composed is true (that is C17/STEP 5C) but whether it ARRIVES — prose and layout alike — and whether the concept a BLIND cold reader builds is the concept the sources and the frame hold. Readers are clean-context subagents that never ran that heading's research or fill; !ConceptFidelity's metaphor lane runs on Theatre.html every time, because a metaphor is a bundle of entailments and one true of the theatre but false of the grammar is a leak that reads as insight."
type: Skill
status: Registered
core_function: [Categorise, Research, Synthesize, Generate]
intent: "Given English-grammar content pasted into Original_Content.md: format it with the shared style markers (zero new content), research and fact-check against four named sources without interrupting Luke, then bring every proposed heading, correction, restructure and significant addition to one gate for his ruling. Once approved, lock a shared heading skeleton, fill each heading out against the CRITERIA, and render Technical_Outline.html, Theatre.html and grammar-content.json. All three regenerate wholesale, never patched; Original_Content.md is permanent and ever-growing, so each run researches and gates only what is new or changed. Rejected_Proposals.table.md remembers every declined item so none is silently re-attempted."
version: 2.3.0
domain: Teaching
supersedes: "Framework_Instructions.md (v0.4.0, temp) — archived 2026-09-18 to Archive/Grammar-Framework_Instructions-2026-09-18/"
dependencies:
  - "reference/meaning-first.md (the governing frame — always loaded)"
  - "reference/sources.md (the closed research set — always loaded)"
  - "reference/schema.md (JSON sidecar shape + diagnostic structure — loaded at STEP 8)"
  - "System/Skillbank/GeneralPurposeSkills/!SimpleEnglish/skill.md (register, pragmatic mode)"
  - "System/Skillbank/GeneralPurposeSkills/!Comprehension/skill.md (C32, STEP 7B)"
  - "System/Skillbank/GeneralPurposeSkills/!ConceptFidelity/skill.md (C33, STEP 7B)"
  - "!HouseStyle (core, always on — rendered surfaces)"
calibration:
  context: Teaching
  level: Extended
  scope: Local
impact: Low
memory_footprint:
  read:
    - "Memory/Long-Term/Grammar/Original_Content.md"
    - "Memory/Long-Term/Grammar/grammar-content.json (prior run's state — NEW/CHANGED vs UNCHANGED)"
    - "Memory/Long-Term/Grammar/Rejected_Proposals.table.md (never re-propose a declined item)"
  write:
    - "Memory/Long-Term/Grammar/Original_Content.md"
    - "Memory/Long-Term/Grammar/Technical_Outline.html"
    - "Memory/Long-Term/Grammar/Theatre.html"
    - "Memory/Long-Term/Grammar/grammar-content.json"
    - "Memory/Long-Term/Grammar/Rejected_Proposals.table.md (append-only)"
---

## ⚡ TRIGGER

Luke pastes or replaces content in `Memory/Long-Term/Grammar/Original_Content.md` and asks for the
framework to run — "run the grammar framework", "process this grammar content", "regenerate the
theatre/technical guides", "build the grammar guide", "!GrammarFrame".

Also fires when Luke asks for a grammar topic to be worked up into the guides from scratch, with the
paste still to come.

## 👤 THE READER — an audience of one

Both guides, and the app they feed, are written for **Luke and nobody else**. That is not a stylistic
note; it settles questions that would otherwise be guessed at every run. Write for a reader who
already knows grammar and wants it laid out: no warm-up, no motivating preamble, no "as we have
seen", no exercises, no encouragement. State the thing.

Nothing here is a teaching document. The theatre dressing is not a lesson and the technical file is
not a textbook — they are one person's reference, in two idioms.

**Two deliverables, each finished on its own terms.** Neither is measured against the other:

| | `Theatre.html` | `Technical_Outline.html` |
| :--- | :--- | :--- |
| What it is | **Luke's own theatre metaphor, filled out** | **A detailed technical reference source** |
| Whose frame | HIS — extracted from the paste, extended in his terms, never replaced | conventional grammatical description |
| Finished when | the metaphor reaches every heading and holds together | every heading is technically complete |
| Authority | takes its FACTS from the technical file | authoritative on every fact |

`Technical_Outline.html` is authoritative **on facts, and that is its whole jurisdiction** — where
metaphor and technical description disagree, the metaphor is wrong. It carries no other seniority.

**Theatre.html may go lighter on technical granularity. It may never go lighter on the metaphor.**
The paired `technical`/`theatre` values in `grammar-content.json` already put the technical depth one
toggle away from the theatre view, so duplicating that depth inside Theatre.html only crowds out the
thing that file exists to carry. What is shared between the two guides is fixed and identical — the
skeleton, the section layer, the diagnostics word for word, the tags, the examples, the notes, the
box diagrams (GROUP A). Everything else in Theatre.html is the metaphor's to fill.

## 🚦 THE TWO LANES — the governing distinction

Every act in this skill falls into one of two lanes. Putting an act in the wrong lane is the most
damaging mistake available here, so the test comes before anything else.

```
  AUTONOMOUS — never ask, just do          │  GATED — always ask, never do alone
  ─────────────────────────────────────────┼──────────────────────────────────────────
  Verifying a quotation's exact wording    │  Adding a section, heading or sub-heading
  Verifying a quotation's attribution      │  Correcting Luke's grammar or his stated rule
  Discarding an unverifiable quote and     │  Restructuring — reordering, splitting,
    finding a replacement                  │    merging or re-nesting what he wrote
  Fact-checking every grammar claim        │  Any SIGNIFICANT addition (see below)
    against reference/sources.md           │
  Resolving a disagreement between two     │
    sources by their stated precedence     │
  Filling a format slot inside a heading   │
    Luke already gave (a diagnostic, an    │
    example, a table, a gloss, a rule's    │
    own A2 why)                            │
  Mechanical cleanup of the paste          │
  Rewording a heading/sub-heading for      │
    house style, topic/scope unchanged     │
  Running E1/E2/E3, the decision tests     │
  Correcting MY OWN definition, diagnostic,│
    or example against the sources (C17)   │
    — never Luke's stated content          │
```

**The two lanes meet at one point, and the rule there is absolute.** Fact-checking is autonomous;
*acting on what it finds about Luke's own content* is not. When verification shows a rule Luke wrote
is wrong, the finding is **carried to the gate, not applied**. I check without asking and I correct
only with permission.

**Significant vs routine.** A *routine fill* completes a slot the format requires, inside a heading
Luke already gave, without changing what that heading claims. A *significant addition* introduces a
rule, exception, distinction or category he did not state — something that changes what the heading
asserts. Routine is autonomous; significant is gated. **When the call is genuinely close, it is
gated** — the cheap error is one extra question, the expensive one is silently rewriting his work.

## 📐 THE FRAME — read first, every run

`reference/meaning-first.md` governs every word this skill writes. Load it before STEP 1 and keep it
in view to the end. Its one claim: **grammar is the shape meaning takes when it has to come out one
word at a time**, so no rule is arbitrary and no rule is ever rendered as a list to memorise.

The four research sources supply **what** English does. The frame supplies **why**. Where a source
gives a why that contradicts the frame, keep the rule and discard the reasoning. Where a source
gives no why at all — the common case — supplying it is this skill's main work. Where the frame
genuinely cannot explain a rule, **flag it for Luke** (C27); never invent a reason to fill the hole.

## 🌱 MEANING — two aspects, never confused

`reference/meaning-first.md`'s standing epigraph names meaning's two jobs. They answer different
questions at different scopes and must never collapse into each other:

| | THE PRINCIPLE | A RULE'S OWN WHY |
| :--- | :--- | :--- |
| Answers | "why grammar, at all" | "why THIS rule" |
| Scope | the whole guide — one claim, true of every heading | one rule — different rule to rule |
| Rendered | VERBATIM, ONCE, near the top of each guide | inline, as A2 of that rule's DEFINITION |
| Source | fixed text in `reference/meaning-first.md` — never redrafted | derived fresh from the frame's seven principles for THIS rule |

Criteria: **A6** (the PRINCIPLE's placement and identity) · **C4** (A2 doing its own work).

## 🎛️ FORM FOLLOWS CONCEPT — the principle behind GROUP E and D9

Every formatting decision below — sections vs. one, sub-subsections vs. not, a RULE vs. a NOTE, a
table vs. a paragraph, one diagram vs. several, a cross-reference vs. none — answers the SAME
question: **what does THIS concept need to be shown correctly?** None of it is a template stamped on
uniformly. Each is a decision test, run at the point named, that reads the answer off the content in
front of it rather than off a house default.

| Formatting question | Decided by | Cadence |
| :--- | :--- | :--- |
| Form/Function sub-headings, or not? | E1 | once per heading |
| Sub-subsections, or not? | E2 | once per section, after E1 |
| RULE or NOTE? | E3 | once per approved point |
| One box diagram or several? | E4 | once per triggered heading, after E1/E2 |
| Cross-reference link, or none? | E5 | once per heading |
| Table or paragraph? | D9 | once per heading, at STEP 6/7 |
| Which classification tags? | STEP 4 (open vocabulary) | once per heading |

A heading with a genuinely flat, simple concept that still gets Form/Function sub-headings, three
tables, or a cross-reference added for tidiness is not more thorough for it — it is decoration
mistaken for rigor, and it buries the one thing that should vary by concept (the content) under
formatting that does not. Equally, a heading whose concept genuinely needs two diagrams or a
sub-subsection does not get flattened for uniformity with its neighbours.

Every test here shares E1–E3's own discipline: mechanical, autonomous, and — where the answer is
genuinely unclear even after asking it — gated rather than guessed (B6). None of them decide WHETHER
content is added; that is still the TWO LANES' call (🚦 above). They decide HOW content already
approved is shaped, and the concept decides that, not the run before it.

## 🏛️ FORM & FUNCTION — an organising layer, not always present

Form and Function are not two fixed prose fields under every heading. They are an **organising
layer**, sitting ABOVE the level of a definition — sometimes it applies rigorously, splitting a
heading's content in two; sometimes form and function coincide so completely that splitting them
would be pure duplication; sometimes the heading's topic has no separable "form" at all.

The purpose of deciding this by a fixed test rather than by feel is that the layer is structural: it
determines section count, slugs and JSON shape across all three outputs, so two runs over the same
content must reach the same answer.

```
  E1 — THE FORM/FUNCTION TEST — run once per heading, at STEP 4/5
  ─────────────────────────────────────────────────────────────────────
  Q1  Does this heading's topic have a FORM at all — a shape, a set of
      members, a structure describable WITHOUT reference to what it does?

        NO  ──▶  OMITTED. No Form/Function sub-heading. The heading's
                 rule(s)/definition(s) sit directly under the heading.

        YES ──▶  ask Q2

  Q2  Does describing that FORM fully DETERMINE what it does — would a
      reader who knows the shape already know the job, with nothing left
      for a separate account to add?

        YES ──▶  COMBINED. ONE sub-heading, "Form & Function".
        NO  ──▶  SPLIT. TWO sub-headings, "Form" and "Function", each
                 carrying its OWN rule(s), definition(s), key call-out(s)
                 and diagnostic(s).
```

Adjectives: Q1 yes (a fixed pre-noun stacking order), Q2 yes (knowing the order IS knowing the job)
⇒ COMBINED. Prepositions: Q1 yes (a closed word/phrase set), Q2 no (the set's shape does not by
itself say what any member relates to) ⇒ SPLIT.

The test is mechanical and **AUTONOMOUS**. If its answer is genuinely unclear even after both
questions, treat it as a SIGNIFICANT ADDITION and gate it (B6) rather than guessing.

## 🗒️ SUB-SUBSECTIONS AND NOTES — flexibility below a section

Not every heading fits neatly into one or two sections, and not every true, worth-keeping point
needs the full weight of a RULE. Two independent escape valves, for two different problems. Both
decide HOW to render a point **already approved** — never WHETHER to add one. Whether the point is
new content is still the TWO LANES' call.

**A section itself can be too broad.** A section sometimes contains two or more genuinely distinct
narrow cases, each substantial enough to want its own rule(s) and diagnostic(s) — "Prepositions >
Function" might separately need Place, Time and Direction.

```
  E2 — THE SUBDIVISION TEST — run once per section, AFTER E1
  ─────────────────────────────────────────────────────────────────────
  Q  Does this section's content contain 1+ narrow case, distinct enough from the
     section's own general rule(s) (if it has any), substantial enough to want its
     OWN rule(s) AND diagnostic(s)?

       NO  ──▶  NO SUB-SUBSECTIONS. Any narrow or minor point becomes a NOTE.

       YES ──▶  ONE SUB-SUBSECTION PER NARROW CASE — a section in miniature: the
                same STEP 5 procedure in full, its own slug (section slug + "-" +
                kebab-case name), its own C16 diagnostic requirement. The section's
                OWN general-level rules/notes STAY at the section level, above its
                sub-subsections — subdividing is additive, never a forced choice.
```

Sub-subsections are NOT a default depth. Hierarchy added because it is *available*, rather than
because the content needs it, is the failure this test exists to prevent. Unclear ⇒ gate it (B6).

**A point itself can be too small for a RULE.** An exception, a minor pattern, an aside best shown
as a table — sometimes there is nothing for a diagnostic to test and nothing for a four-part
DEFINITION to unpack. Forcing RULE shape onto it either invents a diagnostic that discriminates
nothing or pads a definition around a point with no why of its own.

```
  E3 — THE WEIGHT TEST — run once per approved point, RULE vs NOTE
  ─────────────────────────────────────────────────────────────────────
  Q1  Could Luke, or the app, use a DIAGNOSTIC to test for this against a real span?

        YES ──▶  RULE. Full STEP 5 treatment — DEFINITION, KEY CALL-OUT, diagnostic.
        NO  ──▶  ask Q2

  Q2  Can the point be stated directly — a sentence, an exception clause, or a short
      closed-set table — without the four-part DEFINITION scaffold to make sense of it?

        YES ──▶  NOTE.
        NO  ──▶  [rare] neither testable nor simple — FLAG it rather than forcing either.
```

A NOTE renders as whatever its content calls for — a short sentence or clause, or a small table —
lighter than a RULE's callout: no leading `*`, no definition, no key call-out, no diagnostic. It is
ADDITIVE and never satisfies C16 on a section's behalf. It is exempt from C11–C15 (it carries no
diagnostic to test) and **not** exempt from C17 — a NOTE's claim is checked for truth like any other.

## 📦 BOX DIAGRAMS — showing how words GROUP

A `[bracket]` tag labels a span FLAT — one tag, one word or phrase, no nesting. That is enough for a
word-class heading, where nothing sits inside anything else. It is not enough for a heading about
how words GROUP into larger units — a clause inside a sentence, a phrase inside a clause — because
there the nesting IS the content, and a flat tag cannot show one span wholly containing another.

**WHEN a heading's tags include `Syntax` AND ONE OF `Clause` / `Sentence` / `Phrase`**, its worked
example gains at least one BOX DIAGRAM: nested rectangles over the same sentence, ALONGSIDE the usual
two side-by-side boxes, never replacing them — the plain full-text box is still how Luke reads the
sentence itself.

* Outermost box = the whole span this heading is about. Each inner box = ONE constituent wholly
  contained within it, labelled in a small corner tag using the SAME !SimpleEnglish vocabulary as
  this heading's `[bracket]` tags ("subject phrase", "relative clause") — never bare abbreviations
  ("NP", "VP", "S") unless Luke's own paste uses them.
* Plain nested HTML/CSS only — no SVG, no canvas, no library (A8).

**How many.** Not one per rule — a diagram illustrates the HEADING, not every rule inside it — and
not a fixed one either, when the heading itself is making more than one grouping claim.

```
  E4 — THE DIAGRAM MULTIPLICITY TEST — run once per triggered heading, after E1/E2
  ─────────────────────────────────────────────────────────────────────
  Q1  Does ONE diagram, over ONE worked example, show every grouping claim this
      heading is making?

        YES ──▶ ONE DIAGRAM, over whichever worked example shows it most clearly
                 (plain, unless the memorable example is the clearer specimen).
        NO  ──▶ ask Q2

  Q2  Is that because the heading is contrasting TWO genuinely different grouping
      patterns — e.g. two attachment readings of similar spans, or Form's grouping
      differing from Function's under a SPLIT heading (E1)?

        YES ──▶ ONE DIAGRAM PER PATTERN, each over its own span, each independently
                 satisfying C20, placed so the contrast reads at a glance.
        NO  ──▶ [rare] the gap is in what is being shown, not in how many diagrams
                 show it — FLAG it rather than adding a second diagram that repeats
                 the first.
```

A second diagram is never added for symmetry or thoroughness. It earns its place only by showing a
grouping pattern the first diagram cannot.

Criteria: **C20** (each diagram's nesting is a factual containment claim and must be true) · **A7**
(nesting and words identical across all three outputs, per diagram; only corner labels may be
theatre-dressed).

## 🔗 CROSS-REFERENCES — a link earned, not decoration

`D2`'s glossary chain links a TERM back to its own first-use gloss — mechanical, fixed, the same
every time. This is a different question: does understanding THIS heading genuinely depend on
another heading already in the skeleton?

```
  E5 — THE CROSS-REFERENCE TEST — run once per heading, at STEP 5
  ─────────────────────────────────────────────────────────────────────
  Q  Does this heading's own account depend on, or risk being confused with, another
     heading already in the skeleton — such that a reader who has not seen it is left
     with an unresolved "the same test applies here" or an unexplained boundary?

       NO  ──▶ NO CROSS-REFERENCE. A heading that stands alone gets no link added
                for tidiness or completeness.

       YES ──▶ ONE HYPERLINK to that heading's own anchor (A2), placed at the exact
                point of the dependency in the prose — never a bare "see X" with the
                reason left for the reader to guess.
```

This is separate from **C5**'s SPLIT-section pointer, which is a FIXED convention (every SPLIT
Form/Function pair names its counterpart, always) — E5 decides whether an ORDINARY cross-heading
link is warranted, and most headings will have none. A cross-reference is never added to pad a thin
heading or to look thorough; it exists only where the dependency is real.

Criteria: **D10** (every cross-reference resolves to a real, present heading).

## 🔍 DIAGNOSTICS — the spine

Diagnostic questions are not one ingredient among several. They are **the backbone of all three
outputs**, because they are what the Grammar app's fuzzy engine runs to identify and tag content.
Everything else in a heading describes; a diagnostic *decides*.

```
        ONE QUESTION, TWO USERS
        ───────────────────────────────────────────────────────────
        the APP        runs it mechanically over a span, takes the
                       answer, applies the tag, adds the weight
        LUKE           reads it and applies it BY EYE to a sentence
                       in front of him, in a few seconds, to find
                       the feature himself
        ───────────────────────────────────────────────────────────
        A question that only the engine can use is too mechanical.
        A question that only Luke can use is not implementable.
        Both, or rewrite.
```

One test per question. A question containing "and" is two diagnostics.

**Every diagnostic is written twice.** A question drafted while explaining a rule tends to restate
the rule instead of testing for it — which reads fine and diagnoses nothing. So the whole set goes
through a deliberate second pass (STEP 5B) before anything renders. No question ships on its first
draft. Each records what it discriminates, what each answer indicates, which tags that answer
confers and its confidence weight; `reference/schema.md` has the full structure.

Criteria: **C10** (double duty) · **C11** (discrimination) · **C12** (non-circularity) · **C13**
(near-miss) · **C14** (economy) · **C15** (stands alone) · **C16** (coverage) · **A4** (question
text identical across all three outputs) · **A9** (`tested_on` recorded).

---

# 📏 HOW THIS SKILL IS GOVERNED

Everything this skill produces is governed by ONE canonical set of criteria, below. Each criterion
is read in two directions, and it is the same criterion both times:

```
  WHILE GENERATING   ──▶   "How best can this content or design fulfil this?"
  WHILE MEASURING    ──▶   "Does this content or design correctly fulfil it?"
```

That symmetry is the whole design. **The criterion fixes the END — what must be true, and why it
matters. How to get there is mine to work out, and working it out well is the job.** A criterion
that cannot be asked backward is not finished; a rule that can only be asked backward has smuggled
a means in where an end belongs.

Each criterion carries three properties:

| Property | Values | What it settles |
| :--- | :--- | :--- |
| **ruling** | `mechanical` · `judgement` | Is settling it a comparison, or a reading? Decides what a cheap model may rule on in FLEET MODE |
| **lane** | `autonomous` · `gated` | The TWO LANES, carried to the point of use so it is never inferred |
| **form** | `free` · `FIXED` | Whether the shape is mine to choose. FIXED means the form IS the end — a machine contract, or a convention whose value is that it never flexes |

**Nothing restates a criterion.** The VERB, STEP 9, the error paths and the OUTPUT section all
reference criteria by id and never repeat their wording. One copy is why two copies cannot drift.

---

# 📋 THE CRITERIA

## GROUP A — CONTRACTS
*The form IS the end. These are what the Grammar app parses and what keeps three files one artefact.
All `mechanical · autonomous · form FIXED`.*

**A1 · SKELETON IDENTITY**
Heading text, order and nesting are identical across `Technical_Outline.html`, `Theatre.html` and
`grammar-content.json`. The three files are one document in three renderings; a skeleton that
differs makes them three documents.
→ Compare the heading lists. Any difference fails the run.

**A2 · SLUG IDENTITY**
A heading's kebab-case slug is its anchor id in both HTML files and its `id` in the JSON. Sections
suffix it (`-form` / `-function`); sub-subsections extend it (`+ "-" + kebab-case name`). An
UNCHANGED heading keeps its existing slug so no anchor or external link breaks as the guide grows.
→ Slug set matches across all three; no slug reassigned between runs.

**A3 · TAG IDENTITY**
A heading's classification tags are identical across all three outputs. Tags classify CONTENT, not
voice — a theatre-dressed tag would make the app's filter disagree with the page.
→ Compare tag arrays per heading.

**A4 · QUESTION TEXT IDENTITY**
Every diagnostic's question text is character-identical across all three outputs. The app must run
exactly the question the guides display, or Luke reads one test while the engine runs another.
→ String comparison per question.

**A5 · PAIRED VALUE IDENTITY**
Each rule's definition and key call-out are carried in the JSON as `{technical, theatre}`, each side
character-identical to what its own guide renders. The app's toggle renders from this file; drift
means the toggle shows something neither guide says.
→ String comparison, both sides, per rule.

**A6 · PRINCIPLE PLACEMENT**
The standing MEANING PRINCIPLE renders VERBATIM, exactly ONCE per guide, near the top, before the
first heading — and once at the JSON root, paired. Never per heading, never reworded run to run.
Theatre.html may dress it while asserting the same claim.
→ Count occurrences per file; compare against `reference/meaning-first.md`'s epigraph.

**A7 · BOX DIAGRAM IDENTITY**
A box diagram's nesting and words are identical across all three outputs. Only corner labels may be
theatre-dressed — the grouping is a factual claim, not a presentation choice.
→ Compare `groups` trees; only `label.theatre` may differ from `label.technical`.

**A8 · OFFLINE**
Both HTML files are single self-contained files that open from disk with the network off — no CDN,
no external font, script, image or stylesheet. Research happens at generation time only.
→ Grep both files for external references; open with the network off.

**A9 · SCHEMA CONFORMANCE**
`grammar-content.json` conforms to `reference/schema.md`. Every diagnostic carries full structure —
`question`, `applies_to`, `order`, `discriminates`, `outcomes` (answer / indicates / applies_tags /
weight), `rule_ref`, and `tested_on` holding STEP 5B's positive span and negative near-miss with
their answers. `tested_on` is the evidence the question discriminates; a diagnostic without it did
not go through the second pass and must not be written.
→ Validate against the schema. Any diagnostic lacking `tested_on` fails.

**A10 · DIAGNOSTIC INDEX**
`diagnostic_index` holds every diagnostic in the file, flattened, sorted by `applies_to` then
`order`; both guides carry the same collected index at the end (D8).
→ Index count equals total diagnostic count.

**A11 · UNCHANGED-NODE STABILITY**
An UNCHANGED heading's layer, sections, rules, diagnostics, examples, glossary, tags and id —
technical and theatre values alike — are byte-identical to the prior `grammar-content.json`. This is
what makes an ever-growing guide affordable: settled headings are not re-researched or re-gated.
→ Byte comparison. Any difference means it was not unchanged — treat it as CHANGED and re-run
STEP 2–3 for it.

**A12 · ONE SOURCE OF TRUTH**
`Grammar_contents.md` at `System/Widgets/Parser/Grammar/` is never written by this skill. If it is
regenerated, that is the app's build step reading `grammar-content.json` — one direction only.
→ No write outside `Memory/Long-Term/Grammar/`.

## GROUP B — GOVERNANCE
*Who may decide what. All `mechanical · form FIXED`; the lane is the subject matter.*

**B1 · GATE PRECEDENCE**
STEP 3's gate passes before STEP 4–8 begins. Neither guide nor the JSON is started, let alone
completed, until it does. **Fails closed** — no answer, no render.
→ Gate ruling recorded before any STEP 4 output exists.

**B2 · EXPLICIT ACCEPT**
Nothing from a gated class — a new heading, a correction to Luke's grammar, a restructure, a
significant addition — is applied without his explicit accept on that numbered item.
→ Every applied item traces to an accept. A gated class surfacing mid-run returns to the gate;
rendering having started is not a reason to wave it through.

**B3 · REJECTION LOGGED BEFORE DROPPED**
Every declined item is written to `Rejected_Proposals.table.md` — date, heading, class, item,
reason, ruled by — before it is dropped, so a "no" only has to be given once.
→ Rejection count this run equals new row count.

**B4 · SUPPRESSED REPEATS**
No item matching an existing rejection row for the same heading reaches the gate. It is skipped
silently, never re-shown, unless Luke explicitly asks in this run to reconsider it.
→ Check every candidate against the table before proposing.

**B5 · VERIFICATION NEVER ASKS**
Quotes are verified — wording and attribution — autonomously. Luke is never asked to verify one. An
unverifiable quote is discarded silently, logged, and replaced.
→ No verification question appears at the gate.

**B6 · CLOSE CALLS GATE**
Where routine-vs-significant, or E1/E2's answer, is genuinely unclear, it is treated as SIGNIFICANT
and gated. The cheap error is one extra question; the expensive one is silently rewriting his work.
→ Any judgement recorded as "unclear" has a gate entry.

**B7 · BOSS-ONLY WRITES**
In FLEET MODE, every file write is made by the boss after subagent results return. A subagent's only
output is a structured result handed back.
→ No subagent holds a write handle.

## GROUP C — CONTENT
*The ends are fixed; how they are met is mine. `form free` unless stated.*

**C1 · DEFINITION COMPLETENESS** · judgement · autonomous
A definition gives the rule itself (A1), why it exists (A2), where it sits among neighbouring
structures (B), and how far it holds (C). Missing any one leaves the rule in turn unusable,
arbitrary, unplaceable, or over-trusted.
→ Point at the span doing each of the four jobs. A job with no span fails. The labels are a drafting
checklist, never printed — one flowing paragraph is the default rendering, not the test.

**C2 · DEFINITION ECONOMY** · judgement · autonomous
The definition runs to the fewest words that still do all four jobs. Length beyond that is not
thoroughness; it is the reader doing work the writer declined to do.
→ Could any two jobs have merged into one sentence without losing anything? If yes, it is padded.
A simple rule often does all four in one or two sentences. Expand a part only where its own
complexity, or C's multiple exceptions, genuinely need the room.

**C3 · DEFINITION ORDER** · judgement · autonomous · form FIXED
The four jobs run A1 → A2 → B → C. The order is not arbitrary: a why cannot be weighed before the
claim it explains, a rule cannot be placed before it is known, and reliability is a qualification on
everything before it. Within B, larger context comes before immediate context — deliberately
reversed from the naive order, because the point of situating a rule is what it contributes before
how it operates.
→ Read the four spans in document order.

**C4 · A RULE'S OWN WHY** · judgement · autonomous
A2 says something true of THIS rule that the standing PRINCIPLE does not already say. A sentence
that only restates the PRINCIPLE in other words is not wrong — it is unfinished, and has left the
rule looking arbitrary, which is the one thing the frame exists to prevent.
→ Delete A2 and read the PRINCIPLE in its place. If nothing was lost, rewrite it.

**C5 · SPLIT SECTIONS POINT AT EACH OTHER** · judgement · autonomous
When a section is half of a SPLIT, its B sentence names the other section: Form's says what its
shape is FOR, Function's says what carries it out. Neither half is complete alone, and a reader
landing on one must be told the other exists.
→ Both B sentences name their counterpart.

**C6 · HONEST CONSISTENCY** · judgement · autonomous
C states plainly whether the rule holds without exception or has variations, naming the shape of the
variation if so. Where the research cannot establish this, it is FLAGGED, never guessed — marking a
rule "consistent" that the sources note exceptions for is wrong, not a style choice.
→ Trace the consistency claim to a source, or to a flag.

**C7 · CALL-OUT APPLICABILITY** · judgement · autonomous
The key call-out can be applied to a real phrase on its own, with the definition out of view. It
carries the rule's own content — the pattern, order, sequence or test itself — never a
classification of what kind of rule it is.
→ Hold the line alone against a real phrase. Does it decide anything?
   *"Opinion → Size → Age → Shape → Colour → Origin → Material → Purpose"* decides.
   *"One fixed word, never inflected"* does not — it names the rule's category and leaves you no
   further along. If it only classifies, rewrite it as the actual closed set, test or pattern.

**C8 · CALL-OUT CLAIM IDENTITY** · judgement · autonomous
The call-out asserts the same claim as A1 — factually, not merely structurally. Compression is where
a rule quietly turns into a subtly different rule.
→ State both as propositions. Are they the same proposition? Theatre.html's dressed call-out is
held to the same test against the same A1.

**C9 · CALL-OUT ECONOMY** · judgement · autonomous
Nothing in the call-out that is not needed to apply it. It is the irreducible version of what the
definition unpacked, not a shorter paragraph.
→ Remove any word and check the line still applies. It carries no definition prose.

**C10 · DIAGNOSTIC DOUBLE DUTY** · judgement · autonomous
Every diagnostic serves both users: a rule-based engine with a word list and no understanding can
answer it against a named span, AND Luke can answer it by eye in a few seconds. One that serves only
one user is unfinished — too mechanical to use, or not implementable.
→ Answer it both ways. Either fails ⇒ rewrite, or move it into the prose as description.

**C11 · DIAGNOSTIC DISCRIMINATION** · judgement · autonomous
The question gives different answers for a span that has the feature and the nearest span that
lacks it. A question answering the same way for both diagnoses nothing, however well it reads.
→ STEP 5B. Build positive and nearest miss, answer using only what the question literally asks —
not what you know the answer to be — and compare. Same answer ⇒ rewrite. Failed twice ⇒ flag and
log; a named gap beats a question that quietly always answers yes.

**C12 · NON-CIRCULARITY** · judgement · autonomous
The question names an operation and reads off its result. One answerable only by already knowing the
answer tests nothing.
→ *"Is this the head noun?"* is circular. *"Remove it — does the phrase still stand?"* is not.

**C13 · GENUINELY CONFUSABLE NEAR-MISS** · judgement · autonomous
The negative comes from the class most easily MISTAKEN for the target, not merely a form that
obviously fails for an unrelated reason. Testing "is this a preposition" against *"on-ed"* proves
nothing — an adverb, a conjunction and an article all fail that too, so passing it singles out
nothing.
→ Would something clearly NOT in the target class fail the same way, for the same reason? Then it
is not discriminating — rewrite against a real confusable neighbour.

**C14 · DIAGNOSTIC ECONOMY** · judgement · autonomous
As short as the single test allows. A shorter question that still discriminates beats a longer one
padded with context the heading already gives.
→ Cut anything not needed to perform the test.

**C15 · DIAGNOSTIC STANDS ALONE** · judgement · autonomous
The question renders by itself. It is a tool Luke picks up and applies to a sentence in front of
him, not a quiz with an answer key beneath it — a well-written diagnostic needs none of its own
wording explained.
→ A one-line outcome note only where omitting it would leave which answer means what genuinely
ambiguous out of context. The exception, not the practice.

**C16 · DIAGNOSTIC COVERAGE** · mechanical · autonomous
Every section carries at least one diagnostic — through its own, or through every one of its
sub-subsections carrying one, or both. A heading with no diagnostic is a failed heading, not an
acceptable one. Every tag on a heading is reachable through some diagnostic outcome across that
heading's sections combined.
→ Walk sections and tags. A NOTE never counts toward this. An unreachable tag is flagged.

**C17 · COMPOSED ACCURACY** · judgement · autonomous
Everything THIS SKILL composes is TRUE against `reference/sources.md` and the frame — not merely
internally consistent. Covers every definition's four parts, every diagnostic's own claim, every
NOTE, every example's `[bracket]` tagging, every box diagram's containment. A diagnostic can pass
C11 (it tells two spans apart) while being wrong about what it is testing; this checks the test is
true, not just that it works.
→ STEP 5C. A drafting error of mine is corrected directly — autonomous, it is my own draft. A
genuine source disagreement, or a case the frame does not resolve, is FLAGGED. An inaccuracy tracing
back to Luke's own stated content is not mine to fix — it routes to the gate as a class-B correction.

**C18 · EXAMPLE PAIRING** · judgement · autonomous
Two worked examples per heading: a plain one that shows the pattern with nothing else competing for
attention, and a memorable one — a verified quotation — that makes it stick. They do different jobs;
two plain examples leave the heading forgettable, two memorable ones leave it unclear.
→ Name the job each is doing. Plain first, memorable second (D4).

**C19 · EXAMPLE TAGGING** · judgement · autonomous
Every `[bracket]` tag correctly names the element it is attached to. A mis-tagged example teaches
the wrong thing more convincingly than no example at all.
→ Checked at C17.

**C20 · CONTAINMENT IS TRUE** · judgement · autonomous
A box drawn inside another asserts the inner span is wholly contained in the outer one, word for
word. It is a factual claim, and a false one is worse than no diagram.
→ Check every inner span is a substring of its parent's. Fix the nesting or drop the box.

**C21 · METAPHOR OWNERSHIP** · judgement · gated
The theatre metaphor is LUKE'S, extracted from his paste and extended by the logic of his own
mappings. Never a rival metaphor, never one of his mappings renamed, never a neater scheme swapped
in. Re-read his paste each run; never carry a mapping table over from a prior topic.
→ Every mapping traces to the paste, or to an honest extension of one. A heading his mappings
cannot honestly reach is a **proposal for the gate** — never improvised, never left undressed.

**C22 · FACTUAL AUTHORITY** · judgement · autonomous
Where `Theatre.html` and `Technical_Outline.html` disagree on a FACT, the metaphor is wrong and gets
fixed. This is authority over facts and nothing else — it confers no seniority, no primacy, and no
licence to treat the theatre file as derivative.
→ No factual contradiction between the two guides.

**C23 · AUDIENCE** · judgement · autonomous
Luke's own reference, never a teaching document. No warm-up, no motivating preamble, no "as we have
seen", no exercises, no encouragement, no audience-participation framing. Definitions and
diagnostics are there because they are load-bearing, not because they are pedagogy. The theatre
dressing is a way of showing the same content, not a licence to turn it into a lesson.
→ Read for any sentence addressed to a learner rather than a reader.

**C24 · REGISTER** · judgement · autonomous · form FIXED
`!SimpleEnglish` (pragmatic mode) for everything composed — definitions, rules, diagnostics,
glosses, and any approved correction. Exceptions: content imported verbatim from
`Original_Content.md`, and a memorable example's own quoted text, which are never rewritten.
→ Per `!SimpleEnglish`'s own checks.

**C25 · NO PROCESS LANGUAGE** · mechanical · autonomous
This skill's working vocabulary never reaches the page — heading, sub-heading, skeleton, chunk,
granular, frame, lane, proposal set, weight, criterion, or any instruction-language from this
document.
→ Grep both rendered files for the vocabulary.

**C26 · NO FRAME VOCABULARY** · mechanical · autonomous
The frame's own terms — metaphysical, ontological, essence, accident, principle — never reach the
page. The frame supplies reasoning, not diction.
→ Grep both rendered files.

**C27 · EVERY RULE HAS A WHY** · judgement · autonomous
No rule is rendered as bare convention. Each carries its own A2 from the frame, or a named flag
saying the frame could not reach it. A reason is never invented to fill the hole.
→ Every rule has an A2 or an entry in `flags`.

**C28 · ORIGINAL_CONTENT INTEGRITY** · mechanical · autonomous · form FIXED
The file stays **Markdown, never HTML** — it is Luke's paste-and-edit surface, and it is re-read on
every regeneration pass, so it stays the lightest thing in the set.
It keeps Luke's wording, phrasing, ordering and structure. Only mechanical
artifacts are removed (stray line-breaks, inconsistent quotes/dashes, doubled whitespace, broken
encoding) and only the shared style markers are applied to what is already there. Zero new content,
zero corrections, zero reordering. Sole exception: heading/sub-heading TEXT may be lightly reworded
for house style when topic and scope do not change — order and nesting still follow the paste.
→ Diff against the paste. Anything beyond mechanical cleanup and the heading exception fails.

**C29 · METAPHOR COVERAGE** · judgement · autonomous
The metaphor reaches EVERY heading. A heading it cannot honestly reach is a flagged gap taken to the
gate (C21) — never a heading left lightly dressed, and never technical prose with a theatre noun
bolted on. This is the criterion that keeps the metaphor from quitting partway down the file.
→ Walk the skeleton and name the mapping doing the work at each heading. A heading with none fails;
"lighter" is not a pass.

**C30 · METAPHOR COHERENCE** · judgement · autonomous
One thing is dressed the same way throughout. What plays the actor at heading 3 still plays the
actor at heading 11. A metaphor that re-assigns its own roles as it goes has stopped being a frame
and become decoration.
→ Build the mapping table from the rendered file. Look for one concept wearing two costumes, or one
costume on two concepts.

**C31 · DEPTH ASYMMETRY** · judgement · autonomous
`Theatre.html` may carry less fine technical granularity than `Technical_Outline.html` under the
same heading. It may never carry less metaphor. The JSON's paired values put the technical depth one
toggle away, so duplicating it inside Theatre.html crowds out the only thing that file uniquely
holds. What is SHARED is not lighter and not optional: skeleton, section layer, diagnostics word for
word, tags, examples, notes, box diagrams (GROUP A).
→ Thinner technically ⇒ fine. Thinner on the metaphor ⇒ C29/C30 failure. Thinner on anything in
GROUP A ⇒ contract failure.

**C32 · TRANSMISSION — COMPREHENSION** · judgement · autonomous
A rendered heading lets a cold reader recover what it was written to carry — from its PROSE and from
its FORMAT alike. Layout is not decoration: nesting claims part-of, order claims prerequisite, weight
claims importance, repeated form claims same-kind-of-thing, a box claims containment. C17 asks whether
what I composed is TRUE; this asks whether it ARRIVES. A definition can be true, source-backed and
perfectly clear to me while handing a reader nothing, and nothing else in these criteria would catch
it, because every other check is run by someone who already knows the answer.
→ STEP 7B, via `!Comprehension` over the rendered guide. The reader must be BLIND — a clean-context
subagent with no sight of `Original_Content.md`, the frame, the sources or this run. Findings are my
own drafting defects and are repaired autonomously; a defect tracing to Luke's own stated content
routes to the gate as a class-B correction, exactly as C17's do.

**C33 · TRANSMISSION — CONCEPT FIDELITY** · judgement · autonomous
The grammatical CONCEPT a cold reader builds from a heading is the concept the sources and the frame
hold — the concept, not the wording. Four modes: EXTENSION (the right set of cases), INTENSION (the
defining features, with the necessary ones told apart from the incidental), RELATION (ruling out the
nearest confusable neighbour), INFERENTIAL ROLE (licensing what follows and blocking what does not).
Distinct from C17 in the same way C17 is distinct from STEP 2: C17 compares a claim to the sources,
this compares the RECEIVED concept to the held one. A definition every source would endorse can still
leave a reader with the wrong extension, and the extension is the concept.
→ STEP 7B, via `!ConceptFidelity`, ground = `reference/sources.md` + `reference/meaning-first.md`.
Its metaphor lane is load-bearing on `Theatre.html`: a metaphor is a bundle of entailments and the
reader imports the whole bundle, so an entailment true of the theatre and false of the grammar is a
LEAK and a defect — C30 keeps the metaphor internally coherent, this keeps it honest about grammar.
Its format lane rules on nesting and parallel form as TAXONOMY claims, which no prose check sees.

## GROUP D — CONVENTIONS
*Held without exception, these carry information at a glance; flexed once, they carry none. The form
is the end. All `mechanical · autonomous · form FIXED`.*

**D1 · EXAMPLE / ANNOTATION TYPOGRAPHY**
Text that IS an example renders *italic* — inline, in a worked-example box, in a table cell.
Anything said ABOUT an example — a `[bracket]` tag, an attribution line, a table's header or
category label — renders upright.
→ Every italic span is a specimen; every annotation is upright. Both directions.

**D2 · GLOSSARY CHAIN**
On first use in a file, a technical term is **bold**, followed by a short `!SimpleEnglish` gloss, on
an anchor id. On every later use in that file it is a plain hyperlink back to its own first-use
anchor — never re-bolded, never re-glossed. Each file keeps its own chain.
→ One bold+glossed instance per term per file; all others linked.

**D3 · DIAGNOSTIC PROMINENCE**
Diagnostics are grouped as a named block per section, in run order, never scattered — and given
GREATER visual weight than rules. They are the spine; the page should read that way. Rule callouts
and diagnostic callouts are visually distinct.
→ Compare weight and grouping in the rendered page.

**D4 · WORKED EXAMPLE SHAPE**
Two quote boxes side by side: LEFT the full text unedited, RIGHT the same text with `[bracket]` tags
after each relevant word or phrase. Plain example first, memorable second. The memorable one shows
author and work inline beneath it.
→ Both boxes present, both examples present, in order.

**D5 · ATTRIBUTION, NOT CITATION**
Quotations are attributed inline — author and work. No MLA apparatus, no footnote, no bibliography,
no URL anywhere in either file. A deliberate exception to the house convention: this is Luke's own
synthesis. Attribution is not a citation.
→ Grep for citation apparatus.

**D6 · GLYPH ASYMMETRY**
`Theatre.html` carries more theatre emoji/glyphs than `Technical_Outline.html` — on headings,
sub-headings, and as small markers on rule, diagnostic and example boxes.
`Technical_Outline.html` stays plain.
→ Compare glyph counts.

**D7 · TAG CHIPS**
Classification tags render as small chip/pill badges beside the heading text, in both files.
→ Present beside every heading.

**D8 · INDEX PLACEMENT**
A collected INDEX OF DIAGNOSTIC QUESTIONS sits at the end of both HTML files — every question in
run order, each linking back to its own heading. One page Luke can work from directly.
→ Present in both, questions identical (A4).

**D9 · TABLE WARRANT**
A table appears only where the heading's categories are a closed/discrete set, or clearly delineated
though broad. The page names only the set ("A closed set."), never the reasoning for choosing a
table. Example cells *italic*, category/header labels upright (D1).
→ Every table's categories are closed or clearly delineated.

**D10 · CROSS-REFERENCE VALIDITY**
Every cross-reference hyperlink (E5) resolves to a heading actually present in the current skeleton,
by its own slug (A2), and appears only where E5 found the dependency genuine — never an orphan link,
and never doubling as C5's fixed Form/Function pointer.
→ Every cross-reference href resolves to an existing anchor; none present without an E5 finding.

## GROUP E — DECISION TESTS
*Mechanical classifications, run in order. Each decides HOW to shape content already approved, never
WHETHER to add any. All `mechanical · autonomous`.*

**E1 · FORM/FUNCTION TEST** → omitted | combined | split. Once per heading. See 🏛️ above.
**E2 · SUBDIVISION TEST** → sub-subsections or not. Once per section, after E1. See 🗒️ above.
**E3 · WEIGHT TEST** → rule or note. Once per approved point. See 🗒️ above.
**E4 · DIAGRAM MULTIPLICITY TEST** → one diagram or one per grouping pattern. Once per triggered
heading, after E1/E2. See 📦 above.
**E5 · CROSS-REFERENCE TEST** → link or none. Once per heading. See 🔗 above.

Unclear after running the test ⇒ B6 (gate it). Never guess.

---

## 🛠️ VERB

```
// EXECUTION_START

STEP 0 — LOAD
  READ reference/meaning-first.md          // the frame — governs all authored prose
  READ reference/sources.md                // the closed research set
  READ grammar-content.json IF it exists   // prior state — NEW/CHANGED vs UNCHANGED (STEP 1)
  READ Rejected_Proposals.table.md IF it exists          // B4
  LOAD !SimpleEnglish (pragmatic mode)     // C24
  LOAD !HouseStyle                         // both HTML files are rendered surfaces
  HOLD the TWO LANES test in view for every act from here on

STEP 1 — INGEST & FORMAT Original_Content.md            // C28 governs this whole step
  SET raw = the FULL current content of Original_Content.md
    // PERMANENT and EVER-GROWING, not a one-topic scratch pad. A new paste is APPENDED as new
    // heading(s) alongside everything already approved. Nothing already approved is replaced by
    // a later run unless Luke edits that heading's text himself.
  IF raw is empty THEN stop and ask Luke to paste — render nothing
  CLEAN mechanical artifacts only, APPLY the shared style markers to what is already there:
      `**bold**` key terms already present, on first use
      leading `*` on a line that already reads as a rule
      leading `>` on a line that already reads as a diagnostic question
      a quote-block around a full example Luke already included
    USE cautious, limited judgement on whether a line qualifies — genuinely unsure ⇒ ASK
  ASSERT C28
  DIFF cleaned's headings AGAINST grammar-content.json's (by slug and by raw text):
      NEW        — no matching `id` in grammar-content.json
      CHANGED    — slug matches, text differs from what its node was built from
      UNCHANGED  — text matches exactly
    SET new_or_changed = NEW ∪ CHANGED          // this run's actual work
    SET unchanged = UNCHANGED                   // carried forward — STEP 4-5, 8
    // No prior JSON (first-ever run) ⇒ every heading is NEW.

STEP 2 — RESEARCH, VERIFY, AND BUILD THE PROPOSAL SET
  // Runs AUTONOMOUSLY and completely over new_or_changed ONLY. Luke is not interrupted.
  // What research FINDS about his own content becomes a proposal, never an edit.
  DERIVE draft_skeleton FROM Original_Content.md, WITH ITS EXACT HEADING TEXT
    // one new_or_changed heading = ONE grammatical topic. A paste bundling several related
    // structures ⇒ PROPOSE the split at the gate; do not split alone.
  FOR EACH heading IN new_or_changed:
    RESEARCH against the FOUR sources in reference/sources.md, in their precedence
    FACT-CHECK every grammar claim in Luke's paste against them          // autonomous
    NOTE what the sources state as bare convention                       // C27's work, at STEP 5
  VERIFY every candidate quotation — wording AND attribution             // B5
  CHECK Rejected_Proposals.table.md before adding anything                // B4
  BUILD proposal_set, in FOUR classes, each item numbered and separately rulable:
      (A) NEW HEADINGS      — what it adds and why, one line each
      (B) CORRECTIONS       — his text, the correction, the source. PROPOSED ONLY
      (C) RESTRUCTURES      — any reordering, splitting, merging, re-nesting
      (D) SIGNIFICANT ADDS  — a rule/exception/distinction/category he did not state. B6 lands here
  ASSERT nothing in proposal_set has been applied to anything
  ASSERT proposal_set contains only new_or_changed material
  ASSERT routine fills are NOT in proposal_set — they are autonomous, handled at STEP 5

STEP 3 — GATE: Luke rules on formatting and on every proposal      ⛔ HARD STOP
  SHOW Luke, in one pass:
    (a) the formatted Original_Content.md, with the new_or_changed portion identified
    (b) proposal_set, grouped A/B/C/D, numbered, each accept/rejectable on its own
  STATE plainly what was verified autonomously and what it found
  AWAIT Luke confirming (a) AND ruling on each item in (b)
  IF Luke requests a change THEN revise and RE-SHOW — repeat until confirmed
  ASSERT B1
  ON accept, the item is applied at STEP 4/5
  ON reject, ASSERT B3 — then drop it
  ON a rejected CORRECTION, his wording stands and the guides say nothing about the dispute

STEP 4 — LOCK THE SKELETON
  SET skeleton = [unchanged, carried forward] + [new_or_changed, approved this run], merged into
    Original_Content.md's current top-to-bottom order
  ASSERT A1, A2
  FOR EACH heading IN new_or_changed, DERIVE 1+ classification tags
    // open vocabulary anchored by common axes: Syntax vs Morphology, Clause vs Phrase, word class.
    // Add an axis when the content calls for it — a starting point, not a fixed enum.
  FOR EACH heading IN unchanged, CARRY tags FORWARD unchanged
  ASSERT A3

STEP 5 — FILL, THROUGH THE FRAME        (routine fills only — everything else was gated)
  FOR EACH heading IN unchanged:
    CARRY layer, sections, rules, diagnostics, examples, glossary, flags FORWARD VERBATIM   // A11

  FOR EACH heading IN new_or_changed:
    RUN E1 → SET layer = omitted | combined | split, and its one or two sections
    FOR EACH section:
      RUN E2 → sub-subsections or not. Each is a section in miniature: same procedure, own
        slug (A2), own C16 obligation
      WRITE THE DIAGNOSTICS FIRST — before rules, before examples
        // they are the spine; everything else is built to support them
        AGAINST C10, C12, C13, C14, C16
        RECORD what it discriminates, what each answer indicates, which tags it confers, its
          confidence weight, the rule it enforces, and a span where it visibly gives its answer
      THEN CHECK this section has at least one rule, and — at HEADING level — a plain worked
        example, a memorable worked example, and a table if D9 warrants one
      IF any is missing THEN FILL from STEP 2 research                    // routine, autonomous
      IF filling would introduce a rule/exception/distinction Luke did not state THEN
        STOP — that is a SIGNIFICANT ADDITION. Return to STEP 3's gate. Do not write it.
        // the same for any correction or restructure that only becomes visible now — B2
      FOR EACH approved point, RUN E3 → RULE or NOTE
      FOR EACH RULE:
        WRITE its DEFINITION against C1, C2, C3, C4, C5, C6, C27
        THEN COMPRESS to its KEY CALL-OUT against C7, C8, C9
        IN Theatre.html (STEP 7) the call-out is re-phrased through theatre_metaphor — same
          claim (C8); the JSON carries both, paired (A5)
    FOR the memorable worked example: USE only a quotation already verified at STEP 2   // B5
    IF tags include `Syntax` AND ONE OF `Clause`/`Sentence`/`Phrase` THEN RUN E4 → SET
      diagram_count and DERIVE the nested `groups` structure for EACH diagram   // 📦 above, C20
    RUN E5, against the locked skeleton (STEP 4) → cross-reference target, or none   // 🔗 above

STEP 5B — THE DISCRIMINATION TEST        (every NEW diagnostic, no exceptions)
  // Run ONCE OVER THE FINISHED SET, after all of STEP 5, never inline while drafting. The point
  // of the separation is that drafting-mind restates the rule; testing-mind checks whether the
  // question draws the feature out. A question surviving this pass was written twice on purpose.
  // A diagnostic carried forward from an unchanged heading already passed — not re-tested.
  FOR EACH diagnostic IN a new_or_changed heading:
    NAME the feature it draws out, in one line                     // the claim under test
    BUILD positive = a real span that HAS it
    BUILD negative = the NEAREST MISS                              // C13
    ANSWER against each using ONLY what the question literally asks
    RULE ON C11, C12, C10 (machine-usable), C10 (eye-usable)
    IF a question fails the same check twice after rewriting THEN FLAG it AND log it   // B3
    RECORD positive and negative with their answers                 // A9 `tested_on`
  ASSERT every diagnostic has been through this pass ELSE do not render

STEP 5C — ACCURACY REVIEW                (every NEW/CHANGED heading)
  // Separate from STEP 2, which verifies LUKE'S claims. This checks what THIS SKILL composed.
  // A diagnostic can pass 5B (it tells two spans apart) while being WRONG about what it tests.
  RULE ON C17 across: every definition's four parts, every diagnostic's own claim, every key
    call-out's factual identity with its A1 (C8), every example's [bracket] tagging (C19),
    every NOTE's claim, every box diagram's containment (C20)
  ROUTE each finding per C17 — correct mine, flag the unresolved, gate Luke's
  RECORD a one-line pass/fail per heading
  ASSERT every NEW/CHANGED heading has cleared this ELSE do not proceed to STEP 6/7

STEP 6 — RENDER Technical_Outline.html          (authoritative on FACT — C22)
  SET audience per C23, register per C24
  RENDER the standing MEANING PRINCIPLE                                   // A6
  FOR EACH heading (text/order/nesting from skeleton, anchor id = slug):
    RENDER tags as chips                                                  // D7
    FOR EACH section IN order:
      IF layer is NOT omitted THEN RENDER the section's label as a real sub-heading above its
        rule(s) — an organising level, not prose
      RENDER the section's OWN general-level rules/notes/diagnostics FIRST, then each
        sub-subsection as a smaller sub-heading with its own block
      FOR EACH rule: its DEFINITION as ONE ordinary paragraph, no labels, no box — THEN its
        KEY CALL-OUT marked `*`, its own visually distinct callout directly beneath, carrying
        only the terse bold statement                                     // C1-C9
      FOR EACH NOTE: a short sentence/clause or small table, after the rules and before the
        diagnostics block, its own lighter callout, no `*` or `>` marker
      RENDER diagnostics marked `>`                                       // D3, C15
        SHOW the STEP 5B positive span with the question visibly applied to it, so Luke can see
        the test working before he uses it on his own sentence
        // the negative near-miss stays behind the scenes unless it teaches something the
        // positive does not — this is a reference, not a workbook
    INDENT subordinate concepts under their parent point, never by adding heading levels
    RENDER the worked examples                                            // D4, D1, C18
    RENDER diagram_count box diagram(s) per E4                            // 📦 above, A7
    RENDER a table if D9 warrants one
    RENDER the E5 cross-reference, at its dependency point, if one exists // 🔗 above, D10
    APPLY D2 on every technical term
  RENDER the collected diagnostic index                                   // D8
  ASSERT A8, C25, C26, D5, D6
  SET format = ONE self-contained HTML file, !HouseStyle (mild-baroque-Tufte, print-aware)

STEP 7 — RENDER Theatre.html
  EXTRACT theatre_metaphor FROM Original_Content.md itself                 // C21
  IF a heading cannot be dressed honestly by extending his mappings THEN take it to the gate
  SET audience per C23 — the dressing is a way of showing the same content, not a lesson
  SET register per C24
  RENDER the SAME standing MEANING PRINCIPLE, dressed if that helps, same claim   // A6
  FOR EACH heading (IDENTICAL text/order/nesting/anchor-id — A1, A2):
    RENDER the SAME tags                                                  // A3
    DRESS the content in theatre_metaphor — it WRAPS the technical description; it never
      replaces, omits or renames a technical term
    SAME layer, same section count, same order, same sub-subsections      // A1
    CARRY EVERY DIAGNOSTIC ACROSS WORD FOR WORD                           // A4
      // the metaphor may dress the prose around them; it NEVER rewrites a question, because
      // the app runs the same questions this file displays
    CARRY EVERY NOTE across, dressed, asserting the same claim
    SAME rule order (definition, then `*`-marked call-out); the call-out re-phrased through the
      metaphor and the definition dressable, both asserting the SAME claims           // C8
    SAME worked examples, same box diagram(s) nesting — only corner labels dressed    // A7
    SAME cross-reference target where E5 found one — only its surrounding prose dressed // 🔗, D10
    USE theatre glyphs freely                                             // D6
    APPLY D2 — this file keeps its own chain
  RENDER the same collected index, questions identical                    // D8, A4
  ASSERT C22, C29, C30, C31, A8, C25, C26

STEP 7B — TRANSMISSION REVIEW            // C32, C33 — the LAST check before the JSON
  // Runs on the RENDERED guides, not on STEP 5's content, because half of what these files
  // assert is asserted by their LAYOUT, which does not exist until STEP 6/7 have run. Late by
  // necessity, not by oversight.
  // STEP 5B asks: does the question discriminate?   (does the test WORK)
  // STEP 5C asks: is what I composed true?          (is the test TRUE)
  // STEP 7B asks: does any of it ARRIVE, and is what arrives the same concept?
  FOR EACH NEW/CHANGED heading, in BOTH rendered guides:
    BUILD the spec BEFORE the cold read, from reference/sources.md, reference/meaning-first.md
      and the approved skeleton — NEVER by reading the rendered heading back to itself
      (a) the propositions this heading must leave the reader holding
      (b) the ACTION — Luke applies this heading's diagnostic(s) correctly to a fresh span
      (c) the structural claims its layout is meant to make — diagnostics weightier than rules
          (D3), examples italic and annotations upright (D1), box nesting = containment (A7),
          section layer = the E1 result, glossary chain = first-use order (D2)
    CALL !Comprehension with that spec, surfaces = {PROSE, FORMAT}      // C32
    CALL !ConceptFidelity with ground = the two reference files         // C33
      RUN its metaphor lane on Theatre.html — ALWAYS, no heading exempt
  READER DISCIPLINE — the whole step is worthless without it:
    a clean-context subagent, one artefact, no frame, no sources, no skeleton, no sight of
    another reader's answers. A subagent that did this heading's STEP 2 or STEP 5 may NEVER
    read it here — it cannot un-know the answer, and its cold read is the intent read back.
  ROUTE each finding exactly as C17 does:
    MY OWN drafting or rendering defect      ➔ fix it and re-render, autonomous
    a genuine source/frame disagreement      ➔ FLAG for Luke, never pick a side
    traces to Luke's own stated content      ➔ class-B correction, to the STEP 3 gate
  A REJECT verdict on either skill STOPS the run for that heading — do not emit JSON for a
    heading whose concept a blind reader did not receive
  CEILING — a heading REJECTED TWICE on the same finding, after a fix and a re-render, is FLAGGED
    for Luke and logged (B3); it does not enter a third cycle. Each re-render costs a fresh render
    and a fresh blind read, so an unbounded fix-and-re-read loop is the one way this step can eat
    a run. A named transmission gap beats a heading rewritten five times toward a reader who keeps
    missing it — the same discipline as STEP 5B's twice-failed diagnostic.
    // a SECOND, DIFFERENT finding on the re-read is not the same finding: fix it and re-read once
  RECORD per heading: both verdicts, the discriminative pick, every confirmed ambiguity site,
    every metaphor leak
  ASSERT every NEW/CHANGED heading cleared BOTH ELSE do not proceed to STEP 8

STEP 8 — EMIT grammar-content.json
  READ reference/schema.md
  GENERATE from the same locked skeleton and the same STEP 5-7 content, in this pass, from BOTH
    rendered guides, so it CANNOT drift from either
  WRITE the MEANING PRINCIPLE once at the root, paired                    // A6
  CARRY unchanged nodes forward with ids, tested_on and all fields intact // A11
  SET each heading's `layer` and `sections`; each section's `subdivided`/`subsections`/`notes`
    // `form`/`function`/`meaning_basis` as flat fields are RETIRED — replaced by this
    // sections structure, the root-level PRINCIPLE, and each rule's own A2
  SET `groups` where the tags call for one                                // A7
  WRITE each rule's definition and call-out as paired technical/theatre   // A5
  WRITE each section's diagnostics in FULL structured form                // A9
  BUILD `diagnostic_index`                                                // A10
  SET ids per A2; CARRY every STEP 5 flag into `flags`
  WRITE to Memory/Long-Term/Grammar/grammar-content.json                  // A12

STEP 9 — VALIDATE
  RULE ON EVERY CRITERION IN GROUPS A, B, C AND D, in order, against the rendered outputs.
    // This step does not restate them. THE CRITERIA above is the single canonical copy; a
    // criterion appearing in two places is exactly the drift this structure exists to prevent.
  SCOPE — the same NEW/CHANGED discipline that governs STEP 2-3 and 5-7B governs this step, or
    the ever-growing guide stops being affordable exactly when it gets large:
      WHOLESALE, every run, over the WHOLE file:
        GROUP A and GROUP B entire — mechanical comparisons and run-level governance, cheap
          at any size, and A-group drift is a whole-file property no per-heading pass can see
        C25, C26, C28, C29, C30 and D2, D6, D8, D10 — these are FILE-WIDE by nature: a NEW
          heading can break them RETROACTIVELY. It can gloss a term heading 3 already glossed
          (D2), reach for a mapping that collides with an existing one (C30), leave the
          skeleton it joined no longer fully covered (C29), or point a cross-reference at a
          heading that moved (D10). An unchanged heading is not unchanged in these respects.
      NEW/CHANGED HEADINGS ONLY:
        every other GROUP C and GROUP D criterion — the per-heading judgement calls. An
          UNCHANGED heading's content is byte-identical (A11) to a prior run's output that
          already passed them; re-ruling it is pure cost. A11 IS the check that its pass still
          holds, and A11 runs wholesale above.
  FOR EACH criterion in scope: record PASS, or record the failure and what it blocks.
  A GROUP A or GROUP B failure STOPS the run — contracts and governance do not degrade.
  A GROUP C or GROUP D failure is FIXED and re-ruled before anything is considered rendered.
  REPORT any non-empty flags to Luke explicitly — never bury them.

STEP 10 — REGENERATION
  IF Luke pastes new or edited content THEN REPEAT STEP 1-9 IN FULL (7B included)
    // all three outputs regenerate wholesale, never patched — but STEP 1's diff means only new
    // or edited headings are re-researched and re-gated. STEP 3's gate applies again, every
    // time, to whatever is new or changed.
// EXECUTION_END
```

## 🐝 FLEET MODE — a boss agent and a fleet of subagents

This skill's steps are written as one continuous procedure, but its natural unit of work — one
NEW/CHANGED heading — is independent enough of its siblings to fan out. This changes WHO does each
step, never WHAT each step requires. A single-agent run ignores this section.

**Boss-only — never delegate:**
```
STEP 0   LOAD           — loads frame/sources/prior-state ONCE, for every subagent to share
STEP 1   INGEST & DIFF  — one read, one diff; produces the fan-out list, is not fan-out work
STEP 3   THE GATE       — Luke-facing. A subagent never presents to Luke and never receives his
                          ruling at second hand; the boss is the only voice at this gate
STEP 4   LOCK SKELETON  — a single-writer operation by definition
STEP 9   VALIDATE       — exists BECAUSE parallel work drifts, so it cannot itself run parallel
STEP 10  REGENERATION   — re-enters STEP 1, boss-owned like every other entry point
```
Every file WRITE is made by the boss, after subagent results return — B7.

**Parallel-dispatchable — one subagent per NEW/CHANGED heading:**
```
STEP 2   RESEARCH         — research, fact-check and quote-verify ONE heading; read
  (proposal-set draft)      Rejected_Proposals.table.md; return that heading's proposal_set slice
STEP 5   FILL              — E1/E2/E3, diagnostics first, then each rule's definition and call-out,
  STEP 5B DISCRIMINATION    then the examples — for ONE heading — then rule on 5B's and 5C's
  STEP 5C ACCURACY REVIEW   criteria against its own output before returning it. A subagent hands
                            back FINISHED, self-checked content, never a draft for someone else
```

**Also parallel-dispatchable, after rendering — one subagent per NEW/CHANGED heading:**
```
STEP 7B  TRANSMISSION    — !Comprehension + !ConceptFidelity over ONE rendered heading in both
                           guides; return both verdicts and the located findings
```
**Reader isolation is a hard constraint here, not an optimisation.** A cold reader is a SEPARATE
subagent from the one that ran STEP 2 or STEP 5 for that heading, with no shared context — blindness
is the entire instrument, and a reviewer who already holds the answer measures nothing. Budget for it:
a heading costs one fill subagent plus N readers (default 3), and the readers are cheap and must stay
ignorant. The boss never reads for a heading either; it has loaded the frame and the sources.

**The boss reconciles what no single subagent can see, before STEP 6/7:**
- **First-use glossary (D2).** File-wide. A subagent drafting heading 7 cannot know heading 3 already
  glossed the term. The boss resolves first-use order across all returned headings.
- **Tag vocabulary (A3).** Open vocabulary, so two subagents may reach for near-synonyms on the same
  axis ("Word Class" vs "Part of Speech"). The boss normalises before STEP 4 locks.
- **`Rejected_Proposals.table.md` races (B3/B4).** Subagents only read it; only the boss appends,
  and only after the gate rules — so no rejection can be missed within a pass.

**Rendering (STEP 6/7/8) may itself run as three subagents** once STEP 4 has locked and every heading
has cleared 5/5B/5C — the three outputs are deterministic transforms of the same locked content with
no judgment calls left to diverge on. STEP 9 catches any drift; in fleet mode it is not optional, it
IS the reconciliation step.

**Model tier.** Every criterion marked `judgement` needs a capable model (Sonnet or better) — that
is almost all of GROUP C, and it is the whole of this skill's real work. A criterion marked
`mechanical` may be ruled on by a lighter model: GROUP A's string comparisons, GROUP D's greps,
GROUP E's classifications, STEP 1's artifact cleanup. Never use a light model to draft a definition,
a diagnostic's own claim, or to judge a call-out's phrasing.

## ✅ OUTPUT

Four files in `Memory/Long-Term/Grammar/` — `Original_Content.md` (Luke's content, formatted and
nothing more), `Technical_Outline.html`, `Theatre.html`, and `grammar-content.json`. Each is
finished when every criterion in GROUPS A–D has been ruled on and passes; STEP 9 is where that
happens, and THE CRITERIA is the only place their wording lives.

Also maintained, but not one of the four per-run outputs, because it is append-only and never
wholesale-regenerated: **`Rejected_Proposals.table.md`**, the standing record of every declined
item, checked before anything is proposed a second time (B3/B4).

## ⚠️ ERROR PATHS

*Genuine paths only — what to do when the world does not cooperate. A criterion's own failure is
handled by its own `→` test and by STEP 9, not restated here.*

```
CATCH [Original_Content.md empty]                  ➔ ask Luke to paste; render nothing
CATCH [content too sparse to derive a heading]     ➔ flag it, ask Luke, never invent filler
CATCH [no web access for the research pass]        ➔ fill from existing knowledge, mark every
                                                      unresearched heading in `flags`, and tell
                                                      Luke the run was unresearched
CATCH [no clean-context subagent is available  ➔ STEP 7B CANNOT RUN. Say so plainly, mark
       for STEP 7B's cold reads]                       every heading unreviewed for C32/C33 in
                                                      `flags`, and never let the authoring agent
                                                      read its own heading in their place — that
                                                      is not a degraded check, it is no check
CATCH [a cold reader was shown the frame, the      ➔ that read is VOID. Discard it, do not average
       sources, the skeleton or another reader]       it in, dispatch a fresh reader
CATCH [!Comprehension or !ConceptFidelity          ➔ REJECT that heading. Fix and re-render
       returns REJECT on a heading]                   before STEP 8 — never emit JSON for a
                                                      heading whose concept did not arrive
CATCH [a heading is CLEAR and WRONG — the cold     ➔ the dangerous quadrant, and the loudest
       read recovers confidently, fidelity fails]     result this skill can produce. Fix the
                                                      CONCEPT first; the prose is working
                                                      perfectly and that is the problem
CATCH [a metaphor entailment is true of the         ➔ a LEAK, not a flourish. Block it explicitly
       theatre and false of the grammar]              in Theatre.html or drop that mapping. C30
                                                      keeps the metaphor coherent; C33 keeps it
                                                      honest about grammar
CATCH [a STEP 7B finding traces to Luke's own      ➔ not mine to fix — route it as a class-B
       stated content]                                correction to the STEP 3 gate, as C17 does
CATCH [tempted to build STEP 7B's spec by          ➔ REFUSE. That grades the file against itself
       reading the rendered heading]                  and passes every time. The spec comes from
                                                      the sources, the frame and the skeleton
CATCH [two sources disagree on a fact]             ➔ follow reference/sources.md precedence
                                                      autonomously; say nothing on the page
CATCH [a source's reasoning contradicts the frame] ➔ keep the rule, discard the reasoning, write
                                                      the frame's own; never argue on the page
CATCH [the frame cannot explain a rule]            ➔ FLAG it to Luke and in JSON `flags` (C27).
                                                      Never fabricate a meaning-based reason
CATCH [a rule's consistency cannot honestly be
       established from the research]              ➔ FLAG it rather than asserting (C6)
CATCH [a memorable quote cannot be verified]       ➔ discard it silently, LOG it (B3), find
                                                      another. Never ask Luke to verify (B5)
CATCH [fact-check finds Luke's rule is wrong]      ➔ do NOT fix it. Carry it to the gate as a
                                                      class-B CORRECTION with its source.
                                                      Rejected ⇒ his wording stands, unremarked
CATCH [an accuracy finding traces back to Luke's
       own stated content]                         ➔ not C17's to fix — route it to the gate as
                                                      a class-B correction instead
CATCH [a gated class surfaces mid-run]             ➔ return to STEP 3's gate with it. Never wave
                                                      it through because rendering started (B2)
CATCH [unsure whether something is routine or
       significant, or E1/E2/E4/E5 is unclear]     ➔ treat it as SIGNIFICANT and gate it (B6)
CATCH [E4's Q2 fires but no second distinguishable ➔ E4's rare NO/NO branch. FLAG it rather than
       grouping pattern actually exists]              adding a second diagram that repeats the first
CATCH [a cross-reference's target heading is later ➔ drop the stale link (D10) and re-run E5 for
       removed, renamed or re-slugged]                 the heading that pointed at it
CATCH [a candidate matches a Rejected_Proposals
       row for the same heading]                   ➔ skip it silently, do not show it at the
                                                      gate. Only Luke, explicitly and in this
                                                      run, can ask to reconsider it (B4)
CATCH [an unchanged heading's text no longer
       matches grammar-content.json]               ➔ it is not unchanged — treat it as CHANGED
                                                      and re-run STEP 2-3 for it (A11)
CATCH [a heading yields no usable diagnostic]      ➔ the run FAILS on that section (C16). Say so
                                                      and ask Luke for the test he uses — do not
                                                      ship a section the app cannot run
CATCH [a diagnostic cannot be made binary]         ➔ split it into two, or move it into the prose
                                                      as description. Never ship one an engine
                                                      cannot answer (C10)
CATCH [a diagnostic fails the same check twice]    ➔ FLAG it and LOG it (B3). A named gap beats a
                                                      question that always answers the same way
CATCH [a heading the metaphor cannot honestly
       reach]                                      ➔ take it to the gate as a proposal (C21/C29).
                                                      Never improvise a mapping of my own, never
                                                      leave the heading undressed
CATCH [a point is neither diagnosable nor simply
       statable]                                   ➔ E3's rare NO/NO — FLAG it rather than
                                                      forcing it into RULE or NOTE shape
CATCH [a fleet subagent tries to write a shared
       file]                                       ➔ refuse the write — subagents return
                                                      structured results only (B7)
```
