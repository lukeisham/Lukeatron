# CONCEPT TESTS — the four modes, near-miss construction, and probe shapes

Loaded by `!ConceptFidelity` on every run.

---

## Why four modes rather than one judgement

"Is this concept described accurately?" is one question with four independent ways of failing. A
single verdict blurs them and gives the author nothing to fix. Each mode below names a distinct
defect with a distinct repair.

```
        ┌──────────────────────────────────────────────────────────┐
        │  EXTENSION    which cases does it cover?                  │
        │  INTENSION    which features define it?                   │
        │  RELATION     what is it NOT — what sits next door?       │
        │  INFERENTIAL  what follows from it, and what must not?    │
        └──────────────────────────────────────────────────────────┘
             a description can pass any three and fail the fourth
```

---

## 1 · EXTENSION — the set of cases

**Claim under test:** the description picks out exactly the instances the concept has.

**Two failures:**

- **OVER-EXTENSION** — the description admits cases the concept excludes. Usually caused by dropping
  a necessary condition, or by examples that are all of one easy type.
- **UNDER-EXTENSION** — the description excludes cases the concept admits. Usually caused by
  generalising from a narrow sample, so the incidental shape of the examples becomes a criterion.

**How to probe.** Boundary cases only. Clear positives and clear negatives are nearly free to pass
and tell you almost nothing. Build cases the ground itself has a known, defensible answer for, sitting
as close to the edge as the ground will bear.

**The reporting rule.** Score boundary cases separately from positives and negatives, always. Pooling
them hides the single most informative result in the skill: a description can be perfect on obvious
cases and still have handed the reader the wrong edge — and the edge *is* the concept.

---

## 2 · INTENSION — the defining features

**Claim under test:** the features the description names as defining are the ones that actually do
the defining.

**The classic failure** — and the one to hunt first: a description that is **true of every example
given** while naming an **accidental** feature as **essential**. It survives the whole sample and
breaks on the first case outside it. It is unusually hard to spot from inside, because every check
against the examples passes.

**How to probe.** For each feature the description names, sort it:

| | Test | If mis-sorted |
| :--- | :--- | :--- |
| **NECESSARY** | remove it — does the thing stop being an instance? | a necessary feature demoted to typical → OVER-EXTENSION downstream |
| **TYPICAL** | common, but instances exist without it | a typical feature promoted to necessary → UNDER-EXTENSION downstream |
| **ACCIDENTAL** | true of the examples, irrelevant to the concept | ACCIDENTAL-AS-ESSENTIAL — the classic failure above |

Note the second column: intension defects *cause* extension defects. When both modes report, fix the
intension one — the extension finding is usually its shadow.

---

## 3 · RELATION — the nearest neighbour

**Claim under test:** the description rules out the concept next door.

This is where most "close but wrong" accounts die, and where nothing else catches them. A description
can be internally flawless, every claim true, every feature correctly sorted, and still fail to
distinguish the concept from its neighbour — because it never mentions the neighbour, and the reader
has no way to know a neighbour exists.

**How to probe.**

```
   1. NAME the nearest confusable concept explicitly.
   2. ASK: does anything in the description rule it out?
   3. If nothing does, the defect is NEIGHBOUR NOT RULED OUT, located at
      the clause that should have carried the distinction.
```

A description that would be equally true of the neighbour has not described this concept — it has
described their shared genus.

---

## 4 · INFERENTIAL ROLE — what follows

**Claim under test:** the description licenses the right downstream inferences and blocks the wrong
ones.

**How to probe.** Entailment questions: "Given only this description, does Z follow?"

**The essential discipline:** include probes whose correct answer is **NO**. A description that
licenses everything has no content, and a probe set with only YES answers cannot detect that. Roughly
half the probes should be things that must *not* follow.

---

## Constructing the four near-misses (STEP 4)

The discriminative test is only as sharp as its distractors. Each of the three wrong options has a
job, and a lazy distractor makes the test pass on nothing.

| Option | What it must be | Fails when |
| :--- | :--- | :--- |
| **(1) The true concept** | as the ground holds it, stated in DIFFERENT WORDS from the artefact | worded so it echoes the artefact — then the test is string-matching in disguise |
| **(2) The nearest neighbour** | the genuinely confusable adjacent concept, differing in the **defining feature and as little else as possible** | a distant concept nobody would confuse — tests nothing |
| **(3) The common misconception** | what people actually get wrong about this, in the wild | an invented error nobody makes |
| **(4) The over-general version** | the concept with **one necessary condition removed**, and nothing else changed | a vague gesture rather than a precise weakening |

> **House rhyme.** This is the same nearest-miss discipline `!GrammarFrame` STEP 5B applies to
> diagnostic questions: *"The cat sat" vs "The dog sat" tests nothing.* The negative must differ in
> the feature under test and as little else as possible. Same rule, different object — there, a span;
> here, a concept.

**Reading the result.** Which wrong option a reader picks **names the drift**, and that is the most
actionable line the skill produces:

```
   picked (2)  ➔ the description does not distinguish the concept from its neighbour
                    ── RELATION defect
   picked (3)  ➔ the description reinforces the standard error
                    ── usually an INTENSION defect: the misconception's feature was
                       named as defining
   picked (4)  ➔ a necessary condition is missing or stated too weakly
                    ── EXTENSION defect, over-extension side
   cannot tell ➔ underdetermined; not wrong, but not yet a description of anything
```

---

## The metaphor lane (STEP 7)

A metaphor is not a decoration on a concept. It is a **bundle of entailments**, and the reader
imports the whole bundle, not the part that was intended.

```
   metaphor's own entailments
   ├── LICENSED  — true of the metaphor AND of the concept → this is why it was chosen
   ├── BLOCKED   — false of the concept, and the artefact explicitly rules it out → fine
   └── LEAKED    — false of the concept, nothing blocks the import → DEFECT
```

A leak reads as insight, which is what makes it dangerous: the reader feels they have understood
something extra, and what they have understood is false.

**The confirming probe.** Give a cold reader the metaphor-dressed passage alone and ask: *"What else
must be true of the thing being described?"* Every wrong answer they volunteer, unprompted, is a live
leak with its own location.

**Where this bites hardest.** Any artefact whose whole method is metaphor — `!GrammarFrame`'s
`Theatre.html` is the standing example. That file is the highest-risk site in the Lukeatron system for
concept drift, because it is *designed* to be vivid, and vividness is exactly what makes a leak
persuasive. Clear, confident, memorable and wrong is the worst quadrant of the cross-tab, and a
metaphor is the fastest route into it.

---

## What none of this measures

**Truth.** Every test here compares the artefact to the **ground**. If the ground is itself wrong
about the world, every test passes and the artefact faithfully transmits an error. That is
`!FactCheck`'s axis — route it there and say so. This skill measures transmission, never truth.
