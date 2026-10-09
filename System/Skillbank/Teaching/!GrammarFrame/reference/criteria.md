# criteria.md — the one canonical standard for `!GrammarFrame`

Always loaded with `SKILL.md`. This file is the ONLY place a criterion's wording lives. `SKILL.md`'s
VERB, STEP 9 and error paths reference criteria by id and never repeat them — one copy is why two
copies cannot drift.

## How the criteria are used

Each criterion is read in two directions, and it is the same criterion both times:

```
  WHILE GENERATING   ──▶   "How best can this content or design fulfil this?"
  WHILE MEASURING    ──▶   "Does this content or design correctly fulfil it?"
```

**The criterion fixes the END — what must be true, and why it matters. How to get there is mine to
work out.** A criterion that cannot be asked backward is not finished; a rule that can only be asked
backward has smuggled a means in where an end belongs.

Each criterion carries three properties:

| Property | Values | What it settles |
| :--- | :--- | :--- |
| **ruling** | `mechanical` · `judgement` | Is settling it a comparison, or a reading? Decides what a cheap model may rule on in FLEET MODE |
| **lane** | `autonomous` · `gated` | The TWO LANES, carried to the point of use so it is never inferred |
| **form** | `free` · `FIXED` | Whether the shape is mine to choose. FIXED means the form IS the end |

**Script-ruled criteria.** Where `validate.py` covers a criterion (the list is in
`reference/markup.md`, "Script coverage"), its verdict is the STEP 8 ruling: the comparison is run
by code, never re-derived by a model. The criterion's wording still lives only here; the script
implements it and must change when it does.

**Retired ids are never reused.** A5, A9, A10 and A11 were retired on 2026-09-24 along with
`grammar-content.json` (v3.0.0). Their job of carrying settled headings forward passed to A13.

**Breadth and reach** (v3.1.0, 2026-09-26) — A14, B8, C34–C36, D11–D15, E6, E7. The distinction,
the measures and the question bank live in `reference/breadth-and-reach.md`; the criteria here
hold only the ends.

**Sources and labels** (v3.4.0, 2026-09-26) — D16, and A8 and A13 clarified. The five grammar sources,
the quotation finders and the VCAA glossary live in `reference/sources.md`; D16 holds the end for the
VCAA label.

---

## GROUP A — CONTRACTS
*The form IS the end. These keep the two guides one artefact. All `mechanical · autonomous · form FIXED`.*

**A1 · SKELETON IDENTITY**
Heading text, order and nesting are identical across `Technical_Outline.html` and `Theatre.html`. The
two files are one document in two renderings; a skeleton that differs makes them two documents.
→ Compare the heading lists. Any difference fails the run.

**A2 · SLUG IDENTITY**
A heading's kebab-case slug is its anchor id in both guides. Sections suffix it (`-form` /
`-function`); sub-subsections extend it (`+ "-" + kebab-case name`). An UNCHANGED heading keeps its
existing slug so no anchor or link breaks as the guide grows. A redo that removes a section (an E1
axis ruling, say) retires that section's ids. Every link, stub, strip and dressing entry that pointed
at them is re-pointed in the same run.
→ Slug set matches across both; no slug reassigned between runs.

**A3 · TAG IDENTITY**
A heading's classification tags are identical in both guides. Tags classify CONTENT, not voice.
→ Compare tag lists per heading.

**A4 · QUESTION TEXT IDENTITY**
Every diagnostic's question text — and every instantiated Reach question (C34) — is
character-identical in both guides and in both collected indexes (D8). Luke must be applying one test, whichever guide he has open.
→ String comparison per question.

**A6 · PRINCIPLE PLACEMENT**
The standing MEANING PRINCIPLE renders VERBATIM, exactly ONCE per guide, near the top, before the
first heading. Never per heading, never reworded run to run. Theatre.html may dress it while
asserting the same claim.
→ Count occurrences per file; compare against `reference/meaning-first.md`'s epigraph.

**A7 · BOX DIAGRAM IDENTITY**
A box diagram's nesting and words are identical in both guides. Only corner labels may be
theatre-dressed — the grouping is a factual claim, not a presentation choice.
→ Compare the nested boxes; only labels may differ.

**A8 · OFFLINE**
Both HTML files are single self-contained files that open from disk with the network off — no CDN,
no external font, script, image or stylesheet. Research happens at generation time only. A link the
reader clicks (`<a href>`) loads nothing and does not breach this; the only such link either guide
carries is D16's.
→ Grep both files for external references. None loads anything; every `href` to another site is a
D16 link.

**A12 · WRITE SCOPE**
This skill writes only inside `Memory/Long-Term/Grammar/`. `Grammar_contents.md` at
`System/Widgets/Parser/Grammar/` is a legacy source slated for retirement; this skill never reads it
as a source and never writes it.
→ No write outside `Memory/Long-Term/Grammar/`.

**A13 · RUN STATE & CARRY-FORWARD**
Each heading's `<section>` in BOTH guides carries `data-source-hash` (the first 12 hex characters of
the SHA-256 of that heading's source block in `Original_Content.md`) and, when non-empty,
`data-flags` (a short plain-text list of open flags). It also carries `data-breadth` (the E7 count)
and, on each rule block, `data-reach` (the E6 count and the reached slugs) and, where B8 has been
ruled, `data-home-ruled` (date, ruling, and the reach set it was ruled on). This is how the next run
tells NEW, CHANGED and UNCHANGED apart, and where flags, measures and rulings persist between runs.
An UNCHANGED heading's block is copied byte-identical from the prior guide, with TWO allowances:
mechanical fixes that a file-wide criterion forces on it (a word becoming a D2 glossary link, or a
D10 link to a moved heading), and breadth/reach changes the file-wide re-score forces on it (its shading, labels,
Contains overview, Breadth/Reach blocks, interaction table rows, strip, stubs — A14, D11–D15).
→ Every heading carries a hash; every UNCHANGED block diffs clean against the prior file apart from
those two kinds of fix. Any other difference means it was not unchanged — treat it as CHANGED.
A unit Luke names for rework (REDO, 🔁 REVISION MODE) is regenerated even though its hash matches;
its hash stays as it is, since its source did not change. Its twin and reach set are refreshed with
it. Nothing outside unit + twin + reach set changes.

**A14 · BREADTH & REACH IDENTITY**
Breadth and reach are measured ONCE, on `Technical_Outline.html` in all its detail, and carried
across unchanged. Both guides show the same breadth and reach tier per unit, the same shading, reach
labels, Contains overviews, interaction-table rows (units and phrases), strips, stub positions and
Foundations list. Only the "what it does there" wording and stub wording may be theatre-dressed, same
claim (C8). Theatre.html's lighter technical depth (C31) never lowers a count.
→ Compare `data-breadth`, `data-reach` and the rendered elements per unit across both files.

## GROUP B — GOVERNANCE
*Who may decide what. All `mechanical · form FIXED`; the lane is the subject matter.*

**B1 · GATE PRECEDENCE**
STEP 3's gate passes before STEP 4 onward begins. **Fails closed** — no answer, no applied content.
**Live render (Luke's standing exception, 2026-09-26):** both guides are written to
`Memory/Long-Term/Grammar/` as content is generated, so he can watch them as formatted HTML. Until
STEP 8 passes, each guide carries a visible DRAFT banner, marks every unruled or unchecked item
(`data-flags` and a visible draft note), and never presents an unruled item as settled. Gate
precedence still governs what is APPLIED: an item not yet accepted renders only as marked-pending.
→ Gate ruling recorded before any item is applied; every unruled item on the page is marked pending.

**B2 · EXPLICIT ACCEPT**
Nothing from a gated class — a new heading, a correction to Luke's grammar, a restructure, a
significant addition, a new theatre mapping — is applied without his explicit accept on that
numbered item.
→ Every applied item traces to an accept. A gated class surfacing mid-run returns to the gate;
rendering having started is not a reason to wave it through.

**B3 · REJECTION LOGGED BEFORE DROPPED**
Every declined item is written to `Rejected_Proposals.table.md` — date, heading, class, item, reason,
ruled by — before it is dropped, so a "no" only has to be given once.
→ Rejection count this run equals new row count.

**B4 · SUPPRESSED REPEATS**
No item matching an existing rejection row for the same heading reaches the gate. It is skipped
silently unless Luke explicitly asks in this run to reconsider it.
→ Check every candidate against the table before proposing.

**B5 · VERIFICATION NEVER ASKS**
Quotes are verified — wording and attribution — autonomously, per `reference/sources.md`. Luke is
never asked to verify one. An unverifiable quote is discarded, logged, and replaced.
→ No verification question appears at the gate.

**B6 · CLOSE CALLS GATE**
Where routine-vs-significant, or any GROUP E test's answer, is genuinely unclear, it is treated as
SIGNIFICANT and gated. The cheap error is one extra question; the expensive one is silently
rewriting his work.
→ Any judgement recorded as "unclear" has a gate entry.

**B7 · BOSS-ONLY WRITES**
In FLEET MODE, every file write is made by the boss after subagent results return.
→ No subagent holds a write handle.

**B8 · HOME MOVES RULED ONCE**
Tiering, shading, labels, tables, stubs and the Foundations list are autonomous. MOVING a rule to a
new home is a restructure — gated. A rule stays where it naturally belongs, however wide its reach;
a move up to a shared parent is proposed only when the rule is truly about that parent (every
sibling governed). Once Luke rules on a move — accept or reject — it is not proposed again unless
the rule's reach set has changed since that ruling.
→ Every moved rule traces to an accept; no move is re-proposed on an unchanged reach set
(`data-home-ruled`, Rejected_Proposals.table.md).

**B9 · REVISIONS BINDING**
Every redo's reason is appended to `Revisions.table.md` (date, slug, element, what Luke asked, why,
ruled by) before the unit is regenerated. Every later run, whether a redo, a CHANGE or a
regeneration, honours every row for that slug. A new output that would undo a recorded revision goes
to the gate with the prior row shown, and needs Luke's explicit accept.
→ Redo count this run equals new row count; no rendered unit contradicts a row for its slug.

## GROUP C — CONTENT
*The ends are fixed; how they are met is mine. `form free` unless stated.*

**C1 · DEFINITION COMPLETENESS** · judgement · autonomous
A definition gives the rule itself (A1), why it exists (A2), where it sits among neighbouring
structures (B), and how far it holds (C). Missing any one leaves the rule in turn unusable,
arbitrary, unplaceable, or over-trusted.
→ Point at the span doing each of the four jobs. The labels are a drafting checklist, never printed —
one flowing paragraph is the default rendering.

**C2 · DEFINITION ECONOMY** · judgement · autonomous
The definition runs to the fewest words that still do all four jobs.
→ Could any two jobs have merged into one sentence without losing anything? If yes, it is padded.

**C3 · DEFINITION ORDER** · judgement · autonomous · form FIXED
The four jobs run A1 → A2 → B → C: a why cannot be weighed before the claim it explains, a rule
cannot be placed before it is known, and reliability qualifies everything before it. Within B,
larger context comes before immediate context.
→ Read the four spans in document order.

**C4 · A RULE'S OWN WHY** · judgement · autonomous
A2 says something true of THIS rule that the standing PRINCIPLE does not already say.
→ Delete A2 and read the PRINCIPLE in its place. If nothing was lost, rewrite it.

**C5 · SPLIT SECTIONS POINT AT EACH OTHER** · judgement · autonomous
When a section is half of a SPLIT (only possible in a form-function branch, E1), its B sentence names the other section: Form's says what its
shape is FOR, Function's says what carries it out.
→ Both B sentences name their counterpart.

**C6 · HONEST CONSISTENCY** · judgement · autonomous
C states plainly whether the rule holds without exception or has variations, naming the shape of the
variation. Where the research cannot establish this, it is FLAGGED, never guessed.
→ Trace the consistency claim to a source, or to a flag.

**C7 · CALL-OUT APPLICABILITY** · judgement · autonomous
The key call-out can be applied to a real phrase on its own, with the definition out of view. It
carries the rule's own content — the pattern, order, sequence or test — never a classification of
what kind of rule it is.
→ Hold the line alone against a real phrase. Does it decide anything?
   *"Opinion → Size → Age → Shape → Colour → Origin → Material → Purpose"* decides.
   *"One fixed word, never inflected"* does not.

**C8 · CALL-OUT CLAIM IDENTITY** · judgement · autonomous
The call-out asserts the same claim as A1 — factually, not merely structurally. Theatre.html's
dressed call-out is held to the same test against the same A1.
→ State both as propositions. Are they the same proposition?

**C9 · CALL-OUT ECONOMY** · judgement · autonomous
Nothing in the call-out that is not needed to apply it.
→ Remove any word and check the line still applies.

**C10 · DIAGNOSTIC IS OPERATIONAL** · judgement · autonomous
Luke can answer every diagnostic by eye in a few seconds, AND it has a CLEAR ANSWER, AND it is operational: it names a
procedure a rule-based parser with a word list could carry out on a named span. Operational is what
keeps a question honest — one test, no hidden judgement — and keeps the guides ready to feed a
parser once `Grammar_contents.md` retires.
→ Answer it both ways. Either fails ⇒ rewrite, or move it into the prose as description. A question
containing "and" is two diagnostics.
A **clear answer** is one determinable outcome that two careful readers would agree on. It is usually
yes or no, but it need not be: a question may ask *which word*, *which form* or *which class*, provided
the answer is a single named item taken from the clause or from a closed set (Luke, 2026-09-26). What
is not clear is a question that invites opinion, explanation or a list of possibilities ("What does
this word do?", "How would you describe it?").

**C11 · DIAGNOSTIC DISCRIMINATION** · judgement · autonomous
The question gives different answers for a span that has the feature and the nearest span that
lacks it. For a yes/no question that means opposite answers. For a named-answer question it means the
positive span yields the right item and the nearest miss yields a different item, none, or a wrong one
that the question itself exposes.
→ STEP 5B. Build positive and nearest miss, answer using only what the question literally asks, and
compare. Same answer ⇒ rewrite. Failed twice ⇒ flag and log.

**C12 · NON-CIRCULARITY** · judgement · autonomous
The question names an operation and reads off its result.
→ *"Is this the head noun?"* is circular. *"Remove it — does the phrase still stand?"* is not.

**C13 · GENUINELY CONFUSABLE NEAR-MISS** · judgement · autonomous
The negative comes from the class most easily MISTAKEN for the target, not a form that fails for an
unrelated reason any non-member would also fail for.
→ Would something clearly NOT in the target class fail the same way? Then rewrite against a real
confusable neighbour.

**C14 · DIAGNOSTIC ECONOMY** · judgement · autonomous
As short as the single test allows.
→ Cut anything not needed to perform the test.

**C15 · DIAGNOSTIC STANDS ALONE** · judgement · autonomous
The question renders by itself — a tool, not a quiz with an answer key beneath it.
→ A one-line outcome note only where omitting it would leave the answers genuinely ambiguous.

**C16 · DIAGNOSTIC COVERAGE** · mechanical · autonomous
Every section carries at least one diagnostic — its own, or through every one of its sub-subsections,
or both. Every tag on a heading is reachable through some diagnostic across its sections.
→ Walk sections and tags. A NOTE never counts. An unreachable tag is flagged.

**C17 · COMPOSED ACCURACY** · judgement · autonomous
Everything THIS SKILL composes is TRUE against `reference/sources.md` and the frame: every
definition, diagnostic claim, NOTE, `[bracket]` tag and box diagram.
→ STEP 5C. Route each finding:
   my own drafting error                    ➔ correct it directly
   a genuine source/frame disagreement      ➔ FLAG it, never pick a side
   traces to Luke's own stated content      ➔ class-B correction, to the STEP 3 gate
   *(C32 and C33 findings route the same way.)*

**C18 · EXAMPLE PAIRING** · judgement · autonomous
Two worked examples per heading: a plain one that shows the pattern with nothing competing, and a
memorable verified quotation that makes it stick.
→ Name the job each is doing. Plain first, memorable second (D4).

**C19 · EXAMPLE TAGGING** · judgement · autonomous
Every `[bracket]` tag correctly names the element it is attached to.
→ Checked at C17.

**C20 · CONTAINMENT IS TRUE** · judgement · autonomous
A box drawn inside another asserts the inner span is wholly contained in the outer one, word for word.
→ Check every inner span is a substring of its parent's. Fix the nesting or drop the box.

**C21 · METAPHOR OWNERSHIP** · judgement · gated
The theatre metaphor is LUKE'S. Its mappings live in `Memory/Long-Term/Grammar/Theatre_Mappings.table.md`.
**Extend the saved table; new mappings are gated.** Every run dresses headings from the table as it
stands; a mapping Luke states in a new paste, or an extension of an existing row that a new heading
needs, enters the table only through his accept at STEP 3. Never a rival metaphor, never a mapping
renamed, never a neater scheme swapped in.
→ Every mapping used in Theatre.html is a row in the table. A heading the table cannot honestly
reach is a proposal for the gate — never improvised, never left undressed.

**C22 · FACTUAL AUTHORITY** · judgement · autonomous
Where `Theatre.html` and `Technical_Outline.html` disagree on a FACT, the metaphor is wrong and gets
fixed. Authority over facts and nothing else.
→ No factual contradiction between the two guides.

**C23 · AUDIENCE** · judgement · autonomous
Luke's own reference, never a teaching document. No warm-up, no motivating preamble, no "as we have
seen", no exercises, no encouragement.
→ Read for any sentence addressed to a learner rather than a reader.

**C24 · REGISTER** · judgement · autonomous · form FIXED
`!SimpleEnglish` (pragmatic mode) for everything composed. Exceptions: content imported verbatim from
`Original_Content.md`, and a memorable example's own quoted text.
→ Per `!SimpleEnglish`'s own checks.

**C25 · NO PROCESS LANGUAGE** · mechanical · autonomous
This skill's working vocabulary never reaches the visible page — heading, sub-heading, skeleton,
chunk, granular, frame, lane, proposal set, weight, criterion, mapping table, tier, spanning, niche
(as a label), unit, branch, home, re-score.
**Permitted** — Luke's own names, which ARE page vocabulary: *Breadth*, *Reach*, *Contains*,
*Governs*, *Foundations*, *Exception*, *Narrow case*.
→ Grep both rendered files' visible text (A13's attributes are exempt).

**C26 · NO FRAME VOCABULARY** · mechanical · autonomous
The frame's own terms — metaphysical, ontological, essence, accident, principle — never reach the page.
→ Grep both rendered files.

**C27 · EVERY RULE HAS A WHY** · judgement · autonomous
Each rule carries its own A2 from the frame, or a flag saying the frame could not reach it. A reason
is never invented to fill the hole.
→ Every rule has an A2 or a flag (A13).

**C28 · ORIGINAL_CONTENT INTEGRITY** · mechanical · autonomous · form FIXED
The file stays Markdown and keeps Luke's wording, phrasing, ordering and structure. Only mechanical
artifacts are removed and only the shared style markers applied. Sole exception: heading TEXT may be
lightly reworded for house style when topic and scope do not change.
→ Diff against the paste. Anything beyond that fails.

**C29 · METAPHOR COVERAGE** · judgement · autonomous
The metaphor reaches EVERY heading. A heading it cannot honestly reach is a gap taken to the gate
(C21) — never lightly dressed, never technical prose with a theatre noun bolted on.
→ Name the table row doing the work at each heading. None ⇒ fail.

**C30 · METAPHOR COHERENCE** · judgement · autonomous
One concept wears one costume throughout, and one costume sits on one concept.
→ Check every mapping in the rendered Theatre.html against `Theatre_Mappings.table.md`. A mapping
used differently from its row, or two rows claiming the same costume, fails.

**C31 · DEPTH ASYMMETRY** · judgement · autonomous
`Theatre.html` may carry less fine technical granularity than `Technical_Outline.html`, which holds
that depth under the same heading and anchor. It may never carry less metaphor. What is SHARED is not
lighter: skeleton, sections, diagnostics word for word, tags, examples, notes, box diagrams.
→ Thinner technically ⇒ fine. Thinner on the metaphor ⇒ C29/C30 failure. Thinner on GROUP A ⇒
contract failure.

**C32 · TRANSMISSION — COMPREHENSION** · judgement · autonomous · **FULL REVIEW ONLY**
A rendered heading lets a cold reader recover what it was written to carry, from its prose and its
layout alike. Runs only when Luke asks for the full review (STEP 7B).
→ `!Comprehension` over the rendered guide, blind readers, spec built from the sources, the frame
and the skeleton — never from the rendered heading itself.

**C33 · TRANSMISSION — CONCEPT FIDELITY** · judgement · autonomous
The concept a cold reader builds is the concept the sources and the frame hold.
- **Default, every run:** the METAPHOR LANE only, on `Theatre.html` only, one blind reader per
  NEW/CHANGED heading. Ground = that heading in `Technical_Outline.html` (authoritative on fact, C22)
  plus `reference/meaning-first.md`. A theatre entailment that is false of the grammar is a LEAK.
- **Full review, on request:** all four modes (extension, intension, relation, inferential role) plus
  the format lane, on both guides, `!ConceptFidelity`'s default reader count.
→ STEP 7B.

**C34 · REACH QUESTIONS** · judgement · autonomous
Each Reach question on the page is drawn from the bank in `reference/breadth-and-reach.md`,
instantiated with this concept and a real neighbour from the guide (never a bare template), and
names a procedure a reader can carry out against the outline or a real phrase. They are the same
questions the skill measured with (E6), so the reader can repeat the measurement. No Breadth
question renders (D3). Unlike a
diagnostic (C10), a question may be open ("what else must change?") — but its procedure is fixed.
→ Trace each to its bank id; carry out its procedure; the result agrees with the rendered
interaction table.

**C35 · INTERACTION TABLE TRUTH** · judgement · autonomous
Every interaction-table row names a unit outside the rule's home branch, a true one-line statement of
what the rule does there, and a real phrase from that unit with the rule at work; mutual dependence
says so. Every Contains entry is correctly labelled kind or part.
→ Checked at C17. A row without a phrase is dropped, not softened.

**C36 · BREADTH IS NOT REACH** · judgement · autonomous
The two measures never leak into each other. Form/Function sections never count as breadth; a rule's
application to its own kinds and parts (inherited) never counts as reach; position in the outline
never raises reach; reach never moves a rule up the outline (B8).
→ For every reached unit, R-outside answers "outside". For every Contains entry, B-kind or B-part
passes.

**C39 · EXCEPTIONS ARE EXHAUSTIVE** · 🔒 locked (Luke, 2026-09-26) · judgement · autonomous
An *Exception* explains the whole case, so that a reader needs nothing else to apply it: what the rule
says, exactly where it does not hold or holds differently, every condition that triggers it, every form
or construction it covers, and the ordinary case beside it for contrast. It never leaves a known case
to a "pending" or "unsourced" tag: a case the skill cannot yet state is a flag to Luke (B6), and until
it is ruled the Exception says only what is settled and names the gap as an open gate item, never as
a completed explanation (Luke, 2026-09-26). An Exception that turns out to be complex or long — more
than one short paragraph, more than one condition or sub-case, or needing its own example, table or
diagnostic — is not kept under the rule: it becomes a sub-subsection of its own (E2), with a slug (A2)
and its own C16 obligation. The rule keeps a one-line pointer to it.
→ STEP 5C. List the cases the Exception could cover (constructions, forms, contexts); each is either
stated or flagged, none left silent. Then apply the length test: over the line ⇒ E2 sub-subsection.

## GROUP D — CONVENTIONS
*Held without exception, these carry information at a glance. All `mechanical · autonomous · form FIXED`.*

**C37 · NOTE IS VERBATIM** · mechanical · autonomous · form FIXED
A NOTE renders as the `NOTE —` label followed by Luke's own words from `Original_Content.md`, and
nothing else (the label is the one visible to both Luke and the agent, D17): no caveat, no "unsourced" tag, no lead-in, no joiner, no closing full stop he did not
write. Each line of the note is a verbatim quote of one source line, changed only by removing
Markdown `**` bold marks, layout whitespace and one wrapping pair of square brackets. A multi-line
note renders one source line per line. Whether a claim is sourced is not the NOTE's business — the
quote stands as Luke's, and the source stays checkable (Luke, 2026-09-26).
→ Every NOTE line is found in one Original_Content.md line under that rule.

**C38 · EXAMPLE MATCHES ITS CLAIM** · judgement · autonomous
Every example the skill composes for a sentence of prose — in a rule's definition, a call-out (the `*`
key summary), a niche point, a table cell or a gloss — must be an exact match for what that sentence
says. If the sentence says a verb sets what must follow, each example shows something following. If it
says a form marks a job, each example shows that form doing it. If it names a category, each example is
a member of it, and every named item has its own example or is left without one. An example that only
looks close, or that shows a different thing (a contrast, an absence, a neighbouring rule), belongs in
a sentence that says so, never under one that claims something else. The fault is easy to miss because
the example is true and the claim is true; they just are not about each other (Luke, 2026-09-26: the
call-out said *what must follow* and its first example, *she slept*, had nothing following).
→ STEP 5C. For each example, restate in one line what the sentence claims, then say what the example
shows. They must be the same line. Any gap is a finding: replace the example (own-error), or reword
the sentence if the example is the better one. Diagnostic question text is exempt; its positive and
near-miss spans are ruled by C11 and C13.

**D1 · EXAMPLE / ANNOTATION TYPOGRAPHY** — Text that IS an example renders *italic*, wherever it
stands: the example boxes, the worked example, rule prose, `*` call-outs, niche points, diagnostics,
the index and table cells (an Example column, and every example tucked into another cell, such as
*progressive (is running)*). A word named as a member of a category is a specimen too, and
italic: BE's forms (*am, is, are … been*, *’m*, *to be*), the auxiliaries (*be*, *have*, *do* and
their forms) the modals (*can … would*) and the pronouns named as subjects (*I, he, she, it, you, we, they*), in prose, call-outs, questions, glosses and table columns
alike. BE in capitals names the category itself and stays upright. Anything said ABOUT an example renders upright: a `[bracket]` or
`{brace}` note, attribution, table header. In a worked example the specimen words are italic and each
`[bracket]` note upright; a bracket that opens on the specimen's own words (`[I — subject]`) keeps
those words italic and only the explanation upright (Luke, 2026-09-26). NOTEs are Luke's verbatim
lines and keep his own marking (C37).
→ Every example is italic, in every place it appears; every italic span is a specimen; every
annotation is upright.

**D2 · GLOSSARY APPENDIX** — Each file ends with one **Glossary** appendix, after the last heading
and before the index of questions. It holds every technical term the file uses, one entry each,
sorted alphabetically: the term in **bold**, on an anchor id, with a short `!SimpleEnglish` gloss.
Definitions live there only, never in a heading's body. In the prose — rule definitions,
notes, niche points, see-also lines — the first use of a glossed term in each paragraph is a plain
link to its entry; later uses in that paragraph stay plain. No link in a
heading, tag chip, diagnostic, example or `[bracket]` tag, or the index (A1, A4, D1). Each file
keeps its own glossary. (Luke, 2026-09-26: term strips inside a heading "look like a glossary and
belong to an Appendix".)
→ One bold+glossed entry per term per file, all inside the appendix, in alphabetical order; every
link resolves to one.

**D3 · DIAGNOSTIC PROMINENCE** — Diagnostics are grouped as a block per section (its name is a hidden label, D17), in run order,
placed AFTER the section's rules — after the last rule's `*` callout, interaction table and strip —
never before them (Luke, 2026-09-26: "diagnostic questions to appear after the key summary *").
A section with no rule keeps its block where it stands. The block has GREATER visual weight than rules. Rule and diagnostic callouts are visually distinct — by glyph
(`*` / `>`) and weight, never by a hue of their own (D12 reserves the accent). Reach
questions render in their own block (hidden label *Reach questions*, D17), in the diagnostics'
family but distinct from them. Breadth renders only as the Contains overview (D14) and shading
(D11) — never as questions (Luke, 2026-09-26: the Contains line "is most effective"; the Breadth
questions "aren't helpful"). Tier emphasis applies to a rule's
whole block; inside it, diagnostics still outweigh the rule.
→ Compare weight and grouping in the rendered page.

**D4 · WORKED EXAMPLE SHAPE** — One box per example: the full text on top (author and work beneath
it for a memorable one), then a hairline, then the worked example — the same text with `[bracket]`
tags — in the same box (Luke, 2026-09-26: the example and its worked example belong "inside the same
box"). Plain example first, memorable second, one box above the other.
**A heading with sub-subsections** keeps its examples inside them (Luke, 2026-09-26, To be verb): each sub-subsection ends, after its diagnostics, with its own plain example, and the heading's memorable example comes first, in its first sub-subsection, ahead of that one's plain example. Such a heading has no examples of its own below its sub-subsections. A sub-subsection holding several rules (To be verb's subjunctive has three) may give each rule its own plain example.
→ Two boxes per heading, in order, each holding both the example and its worked version; or, with sub-subsections, one plain box in each and the memorable box first.

**D5 · ATTRIBUTION, NOT CITATION** — Quotations attributed inline, author and work. No MLA apparatus,
footnote, bibliography or URL. A deliberate exception to the house convention.
→ Grep for citation apparatus. D16's VCAA link is a label, not a citation, and is not counted.

**D6 · GLYPH ASYMMETRY** — `Theatre.html` carries theatre glyphs on headings and as small markers on
rule, diagnostic and example boxes. `Technical_Outline.html` stays plain.
→ Compare glyph counts.

**D7 · TAG CHIPS** — Tags render as small chips beside the heading text, in both files.
→ Present beside every heading.

**D8 · INDEX PLACEMENT** — A collected INDEX OF DIAGNOSTIC QUESTIONS at the end of both files, every
question in run order, each linking back to its heading. Reach questions are collected in one further group
beneath, same order and linking.
→ Present in both, questions identical (A4).

**D9 · TABLE WARRANT** — A table appears only where the heading's categories are a closed or clearly
delineated set. The page names only the set ("A closed set."), never the reasoning.
→ Every table's categories are closed or clearly delineated.

**D10 · CROSS-REFERENCE VALIDITY** — Every cross-reference (E5) resolves to a heading present in the
current skeleton, by its slug, and exists only where E5 found the dependency genuine. Never doubles
as C5's pointer.
→ Every cross-reference href resolves; none present without an E5 finding.

### Breadth and reach — shading and marks (D11–D15)

*The small style guide for breadth and reach. Subordinate to `!HouseStyle`: every value is a house
token, inlined (A8), never a literal. Two rules bind all five:*
- **Breadth is neutral, reach is the accent.** Breadth shades in the NEUTRAL ground ladder
  (`--bg`, `--bg-sunk`, `--line`, `--line-strong`) — depth, not colour. Reach highlights in the ONE
  accent (`--acc`, `--acc-wash`). So the eye reads *grey = how much it contains*, *blue = how far it
  reaches*, and a heading can carry both without the signals mixing. `--danger` is reserved for
  flags. That spends the house cap exactly: one accent, one semantic red — no third hue for breadth or reach. The one addition is D18's section hue, which colours heading titles only.
- **Colour never carries it alone.** Every shade and highlight is paired with a label and a weight
  change, so it reads in greyscale, on paper, and to a colour-blind reader. Print: washes become
  `--print-shade`, accent rules become `--print-rule`; the labels carry the meaning.

**D11 · BREADTH SHADING** — A heading's title band is shaded by its E7 breadth: *leaf* — none;
*narrow* — a 2px `--line` left band; *wide* — a `--bg-sunk` band behind the title plus a 3px
`--line-strong` left band. The count line *"Contains N — k kinds, p parts"* is a hidden agent label
(`data-breadth-label` on every narrow or wide heading, D17), never shown: the nesting already shows the
count to Luke (Luke, 2026-09-26). Shading sits on the title band only, never the whole section, so
nesting never compounds it.
→ Band matches `data-breadth`; hidden label present and carrying the count; no visible breadth label; no hue used to show breadth (the band's colour follows D18, its width and shade stay neutral).

**D18 · SECTION HUE** — Each MAIN heading (one with no parent) takes one hue, in order of appearance,
from a five-hue set (green, ochre, violet, teal, plum; lighter twins in dark mode). The hue carries down its
whole branch as a filter: the main heading's title, rule and left band show it in full, and each level
below shows it weaker (heading → sub-sub → third level), so the eye reads *this colour = this main
section*. It colours heading titles, their rules, the left bands, the sub-subsection list and the Contains
line, and nothing else: never a breadth band's shade (D11), never a reach highlight (D12), never a flag.
The hues avoid blue (the reach accent) and red (`--danger`). The set is fixed and each main heading
keeps its hue as the guide grows; a sixth main heading reuses the first. Text stays legible against
the ground in both themes; print sets every hue to black; the heading text still names its section, so
colour never carries it alone. Luke, 2026-09-26.
→ Each main heading carries `gf-hue-N`; nested headings carry none and inherit; the two guides agree; no hue on a breadth band or a reach mark.

**D12 · REACH HIGHLIGHT** — A rule block is highlighted by its E6 reach: *local* — none; *spanning*
— `--acc-wash` behind the block and the label *"Governs N sections across H headings"*; *broad* — the
same plus a 3px `--acc` left rule and the label in bold. Beneath a spanning or broad rule: the
**interaction table** (Where · What it does there · Seen in — each Where links to its unit; mutual
rows say so) and the **reach strip** — one thin row of small marks, one per heading in guide order,
`--acc` filled where reached, `--line` hollow where not, each mark linking to its heading. The strip
prints (filled black / hollow outline).
→ Highlight and label match `data-reach`; table rows equal the reached set; strip marks equal the
heading count.

**D13 · NICHE TYPOGRAPHY** — A niche point renders indented one step directly beneath the rule it
qualifies, in `--ink-2` at the small type size, labelled *Exception* or *Narrow case*, no shading
and no highlight. The label is visible and is the one both Luke and the agent read (D17); a niche point
carries no separate hidden label. An Exception is also held to C39. It never renders as a free-standing rule, whatever E3 decided about its shape.
→ Every niche point sits under a rule; none carries a wash, band or accent.

**🔒 LOCKED DEFINITION — Narrow case** (Luke, 2026-09-26; not reworded, loosened or replaced without
his explicit accept, B2):
> **Narrow case:** the rule still holds, but in a restricted use or sense that the general statement
> doesn't spell out. *BE meaning "exist"* is the only one so far.

This is the one meaning of the term wherever it appears: as the visible label here, as E2's trigger for a
sub-subsection, and as E7's "narrow case" for a nested unit that is neither a kind nor a part.

**🔒 LOCKED DEFINITION — Exception** (Luke, 2026-09-26; same lock):
> **Exception:** the rule as stated does not hold here.
> Cases so far: subjunctive *were*, which breaks the ordinary agreement, and BE taking *not* without *do*.

Set against Narrow case: in an Exception the rule fails or holds differently; in a Narrow case it
still holds. A case that fits neither definition is not labelled either way: it goes to the gate (B6).
An Exception is held to C39, which is locked with it.

**D14 · FOUNDATIONS & CONTAINS** — A **Foundations** list sits near the top of both guides, after the
meaning principle (A6) and before the first heading: every *broad* rule, highest reach first, each
with its reach label and a link to its home. Every *wide* heading opens with a **Contains** overview:
its kinds and parts, each labelled kind or part and linked. Both are generated indexes, like D8 —
autonomous, never new content.
→ Foundations entries equal the broad set; each Contains overview equals the heading's E7 list.

**D15 · STUB** — Each unit reached by a spanning or broad rule carries a one-line stub, set like the
Contains line: *"Governed by: [heading]"* — the governing heading's name as a link, and nothing more
(Luke, 2026-09-26). One stub per governing heading; when several of its rules reach the unit, they are
all listed in the stub's `data-rule` and the words for what each does stay in the interaction table
only. The thread is visible from both ends by the link and the strip.
→ Every reached unit has a stub for each governing heading; it links to that heading; it carries no
"here it…" wording; every reaching rule is in its `data-rule`.

**D16 · VCAA TERM** — In `Technical_Outline.html`, a term's D2 Glossary entry, where the term's concept the VCAA English glossary defines is followed, in round brackets, by `VCAA:` and the
glossary's own term as its entry writes it (a heading's initial capital lowered), set as a hyperlink
to the glossary's landing page
(`reference/sources.md`). The bracket is shown even where the two terms are identical, so its absence
means the glossary has no entry. Upright type, not italic (D1) — it is said ABOUT the term. Not on
later uses; not in a heading, tag chip, diagnostic or index entry (A1, A4); not in `Theatre.html`.
Absent — never guessed — where the glossary has no entry, the concept is uncertain, or the glossary
holds only a near match Luke has not ruled equal (`reference/sources.md`). It is a label,
so it never replaces or corrects the guide's own term. It is the only link to another site the guides
carry (A8), and it is a hyperlink, not a resource.
→ Every VCAA link sits directly after a D2 bold term, inside the Glossary appendix of
`Technical_Outline.html`, and points to the
landing page; none appears anywhere else. That the term is the glossary's own, and names the same
concept, is ruled at C17.

**D17 · HIDDEN AGENT LABELS** — Every kind of element carries its name as a hidden label the agent
can read and Luke cannot see: `data-label` on the element, never as visible text. Luke already tells the
kinds apart by their marks (Luke, 2026-09-26), and a visible name would only repeat the mark. The one
exception is NOTE, which has no mark of its own, so its visible `NOTE —` label serves both readers; so do *Exception* and *Narrow case* on a niche point (D13):

| Element | Hook | Hidden label | What Luke sees |
| :--- | :--- | :--- | :--- |
| Prose definition | `.gf-def` | `Definition` | the paragraph |
| `*` key summary | `.gf-callout` | `Key summary` | the `*` |
| Diagnostic block / each question | `.gf-diagnostics` / `.gf-q` | `Diagnostic questions` / `Diagnostic question` | the rule line and `>` |
| Reach block / each question | `.gf-reach-qs` / `.gf-q` | `Reach questions` / `Reach question` | the rule line and `>` |
| Example | `.gf-examples` | `Examples` | the box |
| Breadth count | `data-breadth-label` on a narrow or wide `.gf-heading` | `Contains N — k kinds, p parts` | nothing (the `Contains:` link line of a wide heading and the shading stay) |
| NOTE | `.gf-note` | none: its visible `NOTE —` label is the label | `NOTE —`, then Luke's words, smaller and grey |

The labels are identical in both guides, and a Theatre glyph is a mark, not a label,
so it stays. A visible block label is a failure; so is a NOTE without its visible label. The index of questions keeps its
own two group headings; it is a different surface.
→ `validate.py` rules on it: every hook carries its label, no block label shows a name, and every NOTE carries `NOTE —`.

## GROUP E — DECISION TESTS
*Each decides HOW to shape content already approved, never WHETHER to add any. All `mechanical ·
autonomous`, except E1 Q0c, an axis proposal, which is gated. Unclear after running the test ⇒ B6
(gate it). Never guess.*

**E1 · AXIS, THEN FORM/FUNCTION** — the axis at STEP 2, once per branch; the layout at STEP 5, once
per heading.

A branch's **axis** is the one way it is organised: `form-function`, or another (`purpose`, `order`,
`type`, …). **One axis per branch.** A child that adds a second axis gives the branch two competing
layouts. That is how Form/Function crept back into the Verbs branch through its children (Luke,
2026-09-26).
```
  Q0  AXIS — which axis organises this heading?                      (the boss, guide-wide)
      a  An ancestor CHOSE one  ──▶  INHERIT it. It is never re-tested here.        autonomous
      b  Else, this heading's own content in Original_Content.md sets one (it splits Form and
         Function, or says it is organised by purpose, order, …)  ──▶  CHOSEN here,
         data-axis-by="notes".                                                      autonomous
      c  Else  ──▶  the GRID TEST drafts a class C proposal; Luke rules at the gate,
         data-axis-by="Luke".                                                       GATED
         Grid: forms down the side, jobs across the top. A row or column with 2+ entries (one
         form doing several jobs, or one job done by several forms) ⇒ propose form-function.
         Otherwise ⇒ propose `none`.
      `none` is not a choice: a heading below a `none` makes its own choice (b, then c).
      Axis ≠ form-function ⇒ OMITTED. Stop here; Q1 and Q2 are not asked.
  Q1  Does this topic have a FORM — a shape, set of members, or structure describable WITHOUT
      reference to what it does?
        NO  ──▶  OMITTED. No Form/Function sub-heading; rules sit directly under the heading.
        YES ──▶  Q2
  Q2  Does describing that FORM fully DETERMINE what it does?
        YES ──▶  COMBINED. One sub-heading, "Form & Function".
        NO  ──▶  SPLIT. "Form" and "Function", each with its OWN rules, call-outs, diagnostics.
```
Adjectives ⇒ COMBINED (knowing the order IS knowing the job). Prepositions ⇒ SPLIT (the set's shape
does not say what any member relates to). Verbs ⇒ axis `purpose` (Luke's ruling; his notes organise
the branch "by purpose"), so every heading under Verbs is OMITTED, Auxiliary verbs included, even
though the grid test alone would favour form-function there. Actors chooses nothing, so Nouns,
Determiners and Prepositions each choose `form-function` from their own notes.
→ Every heading carries `data-axis`, `data-axis-from` and `data-axis-by` (`reference/markup.md`).
`data-axis-from` names the nearest ancestor that chose an axis, or the heading itself if none did. A
heading whose axis is not form-function holds no Form/Function section or sub-heading.

**E2 · SUBDIVISION TEST** — once per section, after E1.
```
  Q  Does this section contain 1+ narrow case, distinct from its general rules and substantial
     enough to want its OWN rule(s) AND diagnostic(s)?
       NO  ──▶  no sub-subsections; minor points become NOTEs.
       YES ──▶  one sub-subsection per narrow case, or per Exception that grows long or complex (C39) — a section in miniature, own slug (A2), own
                C16 obligation. The section's general rules stay above them (additive).
```

**E3 · WEIGHT TEST** — once per approved point.
```
  Q1  Could Luke use a DIAGNOSTIC to test for this against a real span?
        YES ──▶  RULE — definition, call-out, diagnostic.
        NO  ──▶  Q2
  Q2  Can it be stated directly — a sentence, an exception clause, a short closed-set table?
        YES ──▶  NOTE — lighter callout, no definition, no diagnostic. Only Luke's OWN words qualify (C37);
                  a point the skill would have to word itself is not a NOTE. Exempt C10–C16, not C17.
        NO  ──▶  [rare] FLAG it rather than force either shape.
```

**E4 · DIAGRAM MULTIPLICITY TEST** — once per heading whose tags include `Syntax` AND one of
`Clause` / `Sentence` / `Phrase` (these headings always get at least one box diagram, beside the two
example boxes, in plain nested HTML/CSS, corner labels in the heading's own tag vocabulary).
```
  Q1  Does ONE diagram over ONE worked example show every grouping claim this heading makes?
        YES ──▶  ONE DIAGRAM.
        NO  ──▶  Q2
  Q2  Is that because the heading contrasts TWO genuinely different grouping patterns?
        YES ──▶  ONE DIAGRAM PER PATTERN, each satisfying C20.
        NO  ──▶  [rare] FLAG it rather than add a diagram that repeats the first.
```

**E5 · CROSS-REFERENCE TEST** — once per heading, against the locked skeleton. *(Reach stubs and
interaction-table links (D12, D15) are outside this test and its one-link limit.)*
```
  Q  Does this heading's account depend on, or risk confusion with, another heading in the skeleton,
     such that a reader who has not seen it is left with an unresolved dependency?
       NO  ──▶  no link. Most headings have none.
       YES ──▶  ONE link to that heading's anchor, at the exact point of the dependency, with the
                reason stated — never a bare "see X".
```

**E6 · REACH TEST** — once per rule, then re-scored across the WHOLE guide every run.
Procedure and bank: `reference/breadth-and-reach.md`.
```
  Q1  Does it apply to only PART of one unit — an exception to, or narrowing of, another rule?
        YES ──▶  NICHE (D13).
        NO  ──▶  Q2
  Q2  List the units OUTSIDE its home's branch where it is at work (R-outside, R-depend, R-change),
      each with a concrete phrase. Any?
        NO  ──▶  LOCAL.
        YES ──▶  Q3
  Q3  Do those units sit under 3 or more distinct other headings?
        NO  ──▶  SPANNING (D12, D15).
        YES ──▶  BROAD (D12, D14, D15).
  THEN  Is the rule truly ABOUT a shared parent — every sibling there governed?
        YES ──▶  propose a move (B8).   NO ──▶  it stays home.
```

**E7 · BREADTH TEST** — once per heading, then re-scored across the WHOLE guide every run.
Procedure and bank: `reference/breadth-and-reach.md`.
```
  Q   For each unit nested under this heading (never a Form/Function section): does B-kind or
      B-part pass?
        Count the passes, at every depth:
          0    ──▶  LEAF.
          1–2  ──▶  NARROW (D11).
          3+   ──▶  WIDE (D11, D14).
      A nested unit passing neither is a narrow case or aspect — uncounted. Cannot tell ⇒ B6.
```
