# FORMAT PROPOSITIONS — what a layout silently claims

Loaded by `!Comprehension` whenever the FORMAT surface is in scope, and by `!ConceptFidelity` at its
STEP 6 taxonomy lane.

**The governing claim of this file:** *every formatting decision is a proposition.* Choosing a
heading level asserts a part-of relation. Bolding asserts relative importance. Putting two things in
the same visual form asserts they are the same kind of thing. None of these claims is written down
anywhere, which is exactly why review passes miss them — and why a reader can come away with a false
structural belief nobody ever typed.

A format proposition is testable like any other. It can be **recovered**, **missed**, **distorted**,
or — worst — **invented**, where the layout asserts something the author never meant and the reader
duly believes it.

---

## The device-to-claim table

Walk this table device by device. For each device the artefact actually uses, write down the claim it
is being used to make. That set is spec part (c).

| Device | The proposition it asserts | Fails when |
| :--- | :--- | :--- |
| **Heading level / nesting** | X is PART OF Y | siblings that are not co-ordinate; a species rendered as a sibling of its genus |
| **Order / sequence** | X comes before Y — as prerequisite, as chronology, or as rank | order is alphabetical or accidental but reads as logical |
| **Numbering** | this is an ORDERED set with a fixed count | numbered where order does not matter; renumbered mid-document |
| **Bullets** | this is an UNORDERED set of co-ordinate items | items at different levels of generality in one list |
| **Visual weight** (bold, size, box, rule, colour) | X MATTERS MORE than its neighbours | everything is weighted, so nothing is; or weight tracks length rather than importance |
| **Adjacency / grouping** | X and Y BELONG TOGETHER | proximity forced by page-flow rather than meaning |
| **Repetition of form** | these are the SAME KIND of thing | one item in a series shaped differently for a merely cosmetic reason |
| **Nested boxes / containment** | X is WHOLLY INSIDE Y | an inner span not actually contained — a false containment claim, worse than no diagram |
| **Italics** | this is an EXAMPLE or a MENTION, not an assertion | italics doubling as emphasis; annotation on an example italicised along with it |
| **Monospace / code** | this is LITERAL — reproduce it exactly | used for emphasis, or for a paraphrase |
| **Colour / ink** | this belongs to CATEGORY C | colour carrying meaning with no key, or the only carrier of a distinction |
| **Whitespace / horizontal rule** | X ENDS HERE; Y is a NEW thing | breaks driven by page length rather than by a boundary in the content |
| **Table columns** | these are the DIMENSIONS along which the rows vary | a column that is a note, not a dimension |
| **Table rows** | these are COMPARABLE instances of one kind | rows of different kinds sharing a table because they fit the width |
| **Callout / aside** | this is TRUE BUT OFF THE MAIN LINE | a load-bearing claim demoted to an aside, or an aside given main-line weight |
| **Link / cross-reference** | the thing you need is THERE, not here | a link standing in for a definition the reader needs at this point |
| **Icon / glyph** | this instance is of the TYPE this glyph marks | decorative glyphs mixed with semantic ones, so neither reads |
| **Indentation** | this is SUBORDINATE to the line above | indentation used for visual rhythm |
| **Position on page** | read this FIRST / this is the entry point | the true entry point buried below a preamble |

---

## The four structural defect types

These are what STEP 2's mechanical pass looks for, and they need no reader at all.

**ORPHAN DEVICE** — a device used exactly once. It asserts a distinction that nothing else in the
artefact honours, so the reader cannot tell whether it is meaningful or a slip. Either use it twice
or drop it.

**DEVICE COLLISION** — one device carrying two different claims. Bold meaning *key term* in one
place and *important* in another destroys both. The reader cannot decode a device with two meanings,
and usually does not notice they have failed to.

**REDUNDANT DEVICE** — two devices carrying the same claim with nothing distinguishing them. Harmless
to comprehension, corrosive to the system: the reader starts hunting for a difference that is not
there.

**UNMARKED CLAIM** — a structural claim the author intended, with no device actually carrying it. The
commonest of the four, and invisible to a prose review, because the sentence-level text is fine.

---

## The read-back, and why it is done blind to the prose

The structural read-back asks a cold reader five questions **from the layout alone**, treating the
prose as unreadable text:

```
   what is part of what?
   what does this want me to read first?
   which of these matters most?
   which of these are the same KIND of thing?
   which things belong together?
```

If a reader cannot answer these with the sentences covered, the layout is **decoration, not
structure** — it looks organised without organising anything. That is a finding on its own, whatever
the prose surface scores.

The converse failure is quieter and worse: the reader answers all five **confidently and wrongly**.
The layout organised something, just not the thing that is true. That is an `INVENTED` structural
proposition, and it is the single defect this reference file exists to catch.

---

## Print and electronic

`!HouseStyle` is electronic-primary, print-aware. Format propositions do not survive a medium change
automatically:

- Colour-carried categories vanish in greyscale print. A distinction whose only carrier is colour is
  an **UNMARKED CLAIM** in print, however clear it is on screen.
- Adjacency claims break at a page boundary — two things that "belong together" may land on different
  sheets.
- Hover, fold and interaction states do not exist in print; any claim carried by one is absent there.

When the artefact is print-aware, run the structural read-back **twice** — once on screen, once on the
print rendering — and report any proposition that survives one and not the other.
