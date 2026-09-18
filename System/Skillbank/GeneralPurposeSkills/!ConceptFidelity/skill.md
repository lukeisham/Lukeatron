---
name: ConceptFidelity
description: "Measure whether an artefact relays a CONCEPT accurately — the concept, not the wording. Paraphrase-invariant by construction: it never compares strings, it decomposes both the ground and the candidate into atomic claims and matches them by meaning, then runs bidirectional entailment (ground-to-candidate catches omission, candidate-to-ground catches fabrication — both directions are mandatory and most reviews run only one). Four failure modes give the rubric instead of one blurry number: EXTENSION (does it cover the right set of cases), INTENSION (are the defining features right, and are the necessary ones separated from the incidental), RELATION (is it placed correctly against its nearest confusable neighbour), INFERENTIAL ROLE (does it license the right downstream inferences and block the wrong ones). The sharpest single instrument is the DISCRIMINATIVE TEST — a cold reader sees only the description and must pick it out of four near-misses (the true concept, the nearest neighbour, the common misconception, an over-general version); the APPLICATION TEST then has them classify novel cases, scoring positives, negatives and boundary cases separately. Covers formatting as well as prose: nesting and parallel form make taxonomy claims a prose review never sees, and a metaphor lane tests which of a metaphor's own entailments the reader wrongly imports. Requires a GROUND — a source text, a canonical definition, or an author's spec; with none it runs COHERENCE-ONLY and never emits an accuracy verdict, failing closed the way !FactCheck does. Emits typed located defects, never a score. Callable standalone, and called by !GrammarFrame at its STEP 7B transmission review."
type: Skill
status: Registered
core_function: [Categorise, Track]
intent: "Given an artefact and an independent ground for the concept it describes, measure whether the concept a cold reader builds from the artefact is the concept the ground holds — invariant under rewording — and return the exact mode and site of any drift, so the repair is a location and a failure type rather than an opinion."
version: 1.0.0
domain: GeneralPurpose
dependencies:
  - "reference/concept-tests.md (the four modes, the near-miss construction rules, the probe shapes — always loaded)"
  - "!PlainEnglish (core, always on — governs the FORM of this skill's own report)"
  - "System/Skillbank/GeneralPurposeSkills/!Comprehension/skill.md (sibling; the cross-tab at OUTPUT needs both)"
calibration:
  context: Any
  level: Extended
  scope: Global
impact: Low
memory_footprint:
  read:
    - "the artefact under test (any path, or pasted inline)"
    - "the GROUND — source text, canonical definition in Memory/Long-Term/, or author's spec"
  write:
    - "System/Sandbox/fidelity-<artefact>-<date>.md (the report; promoted or cleared like any Sandbox file)"
---

## ⚡ TRIGGER

"is this concept right", "does this describe X accurately", "concept check", "fidelity check",
"is the idea intact", "did the meaning survive the rewrite", "does the metaphor distort this",
"check this against the source", "!ConceptFidelity".

Also fires **from inside another skill's review stage** — `!GrammarFrame` STEP 7B calls it over each
rendered guide, with its metaphor lane doing real work on `Theatre.html`. When called that way it
takes its ground from the caller and returns structured findings rather than a chat report.

Does **not** fire on: whether a claim is TRUE IN THE WORLD (`!FactCheck` — sources and provenance),
whether a reader can follow the writing at all (`!Comprehension`, the sibling), or drafting
(`!SimpleEnglish` / `!ProseDetox`).

## 🎯 THE DISTINCTION THIS SKILL TURNS ON

Three different questions get confused constantly, and only the third is this skill's:

| Question | Relation tested | Whose job |
| :--- | :--- | :--- |
| Is this claim TRUE? | claim ↔ world | `!FactCheck`; inside `!GrammarFrame`, STEP 5C |
| Can a reader follow this? | artefact ↔ reader | `!Comprehension` |
| **Is the concept the reader RECEIVES the concept the ground HOLDS?** | **concept ↔ transmitted concept** | **this skill** |

A definition can be **word-for-word true and still hand the reader the wrong concept**, because the
reader builds an extension from it that the ground does not have. Every example given is accurate;
the boundary implied by those examples is not. That gap is invisible to a truth-check and invisible
to a comprehension check, and it is the only thing this skill looks for.

**Paraphrase-invariance is the design constraint.** Luke's requirement is that a concept count as
relayed even when none of the words match. So this skill never compares strings. It decomposes both
sides into atomic claims and matches by meaning, and its sharpest test — the discriminative test —
works entirely on what a reader can *pick out*, which no amount of rewording changes.

## ⚓ THE GROUND — the precondition

Accuracy needs a referent. One of these must exist, independent of the artefact:

1. **A source text** the artefact was written from — then this is faithfulness, fully measurable.
2. **A canonical definition** held in `Memory/Long-Term/` — a store entry, a reference file, a prior
   approved artefact.
3. **The author's own spec** for the concept, written before or apart from the artefact.

With none of the three, the skill **runs COHERENCE-ONLY**: it can report internal contradiction,
unstable extension and inferential conflict, and it may never emit an accuracy verdict. It says so
plainly and stops. This is the same fail-closed discipline `!FactCheck` uses when no source resolves —
an unverified finding is reported as unverified, never dressed up as a verdict.

## 🛠️ VERB

```
// EXECUTION_START

STEP 0 — ESTABLISH THE GROUND
  IDENTIFY the ground: source text | canonical definition | author's spec
  IF none exists THEN ENTER COHERENCE-ONLY MODE:
    SAY SO EXPLICITLY at the top of the report
    RUN STEP 3 (modes) and STEP 7 (metaphor) as INTERNAL checks only
    EMIT contradiction / instability findings ONLY
    EMIT NO accuracy verdict, NO entailment labels, NO PASS
  NAME the concept under test in one line — the thing the artefact is trying to hand over
  IDENTIFY the artefact's MEDIUM (prose-only | rendered) — rendered enables STEP 6

STEP 1 — ATOMISE BOTH SIDES
  DECOMPOSE the GROUND into atomic claims: (subject · relation · object · qualifier)
    // atomic = one relation, independently true-or-false. Split every conjunction, every
    // relative clause carrying its own assertion, every qualifier that could be dropped.
  DECOMPOSE the CANDIDATE (the artefact's account of the concept) the same way
  MATCH claims ACROSS the two sets BY MEANING, never by wording
    // "the head governs agreement" and "whatever the phrase is about is what the verb
    // agrees with" are ONE claim in two idioms. String comparison would call them unrelated;
    // that failure is precisely what this skill exists to avoid.
  RECORD unmatched claims on each side — they are STEP 2's raw material

STEP 2 — BIDIRECTIONAL ENTAILMENT       (both directions are mandatory)
  DIRECTION A — GROUND ➔ CANDIDATE     (catches OMISSION)
    FOR EACH ground claim: is it ENTAILED by the candidate?
      ENTAILED     — the candidate commits to it, in any words
      WEAKENED     — present but with the qualifier, scope or condition stripped
      OMITTED      — absent
      CONTRADICTED — the candidate commits to its negation
  DIRECTION B — CANDIDATE ➔ GROUND     (catches FABRICATION)
    FOR EACH candidate claim: is it SUPPORTED by the ground?
      SUPPORTED    — the ground commits to it
      UNSUPPORTED  — the candidate asserts what the ground does not — an ADDITION
      CONTRADICTED — the candidate asserts what the ground denies
  // Running only Direction A is the standard mistake: it proves nothing was dropped and
  // says nothing about what was invented. Both directions or the run is incomplete.
  RANK severity: CONTRADICTED > UNSUPPORTED > WEAKENED > OMITTED
    // an omission the reader may notice; an invented claim they carry away as taught

STEP 3 — THE FOUR MODES                 (the rubric; see reference/concept-tests.md)
  EXTENSION — does it cover the right SET OF CASES?
    PROBE with boundary cases from the ground
    FIND over-extension (the description admits what the concept excludes)
    FIND under-extension (the description excludes what the concept admits)
  INTENSION — are the DEFINING FEATURES right, and are NECESSARY ones separated from INCIDENTAL?
    FOR EACH feature the description names: is it necessary, typical, or accidental?
    CATCH the classic failure — a description TRUE OF EVERY EXAMPLE GIVEN that names an
      accidental feature as essential. It survives every example and breaks on the first
      case outside the sample.
  RELATION — is it placed correctly against its NEAREST CONFUSABLE NEIGHBOUR?
    NAME the neighbour explicitly
    ASK: does the description distinguish the concept FROM that neighbour?
    // most "close but wrong" accounts die here, and only here. A description can be
    // internally perfect and still fail to rule out the thing next door.
  INFERENTIAL ROLE — does it license the right downstream inferences and BLOCK the wrong ones?
    BUILD entailment probes: "given this description, does Z follow?"
    INCLUDE probes whose correct answer is NO — a description that licenses everything
      has no content

STEP 4 — THE DISCRIMINATIVE TEST        (the sharpest single instrument)
  BUILD FOUR candidate concepts:
    (1) THE TRUE CONCEPT           — as the ground holds it
    (2) THE NEAREST NEIGHBOUR      — the genuinely confusable adjacent concept
    (3) THE COMMON MISCONCEPTION   — what people actually get wrong about this
    (4) THE OVER-GENERAL VERSION   — the concept with a necessary condition removed
    // (2) must be a NEAREST miss, differing in the defining feature and as little else as
    // possible — the same discipline !GrammarFrame's STEP 5B applies to diagnostics.
    // A distant distractor tests nothing.
  GIVE a COLD READER — no ground, no conversation context — ONLY the artefact's description
  ASK: which of these four is being described?
  IF the reader picks wrong ➔ the description is INACCURATE AT CONCEPT LEVEL, whatever the
    prose quality. RECORD which one they picked — that names the drift.
  IF the reader CANNOT TELL ➔ the description is UNDERDETERMINED. Same finding, different fix.
  IF the reader picks (1) ➔ this test passes. It is necessary, not sufficient.
  RUN with N = 3 readers where stakes warrant; disagreement is itself a finding

STEP 5 — THE APPLICATION TEST           (transfer; paraphrase-invariant by construction)
  BUILD novel cases the artefact never mentions:
    POSITIVES  — instances of the concept
    NEGATIVES  — non-instances, including at least one NEAREST-NEIGHBOUR instance
    BOUNDARY   — cases at the edge, where the ground's own answer is known and defensible
  GIVE a COLD READER the description ONLY, and have them CLASSIFY each case
  SCORE the three sets SEPARATELY — never pooled
    // boundary accuracy is where transfer actually shows. A description can score perfectly
    // on clear positives and negatives and still have handed over the wrong boundary, which
    // is the whole concept.
  ANY boundary case the reader calls differently from the ground is an EXTENSION defect,
    located at whatever clause set that boundary

STEP 6 — THE FORMAT LANE                (rendered artefacts only)
  // Formatting makes concept claims that no sentence in the artefact makes. A prose-only
  // review cannot see them, because nobody wrote them down.
  LOAD ../!Comprehension/reference/format-propositions.md
  CHECK NESTING as a TAXONOMY CLAIM:
    a heading inside another asserts IS-PART-OF or IS-A-KIND-OF
    IF the ground's taxonomy differs ➔ FALSE TAXONOMY defect
    // two things rendered as siblings when one is a species of the other is a false
    // classification made entirely by formatting, asserted nowhere in the prose
  CHECK PARALLEL FORM as a CO-ORDINATION CLAIM:
    items in identical visual form assert THESE ARE THE SAME KIND OF THING
    IF the ground does not treat them as co-ordinate ➔ FALSE CO-ORDINATION defect
  CHECK TABLE COLUMNS as DIMENSION CLAIMS:
    columns assert THESE ARE THE AXES ALONG WHICH INSTANCES VARY
    IF a column is a note rather than a dimension ➔ FALSE DIMENSION defect
  CHECK SEQUENCE as a LOGICAL OR CAUSAL CLAIM:
    order asserts PREREQUISITE, CHRONOLOGY or RANK
    IF the ground's dependency order differs ➔ FALSE ORDER defect
  CHECK CONTAINMENT (nested boxes, diagrams):
    an inner box asserts WHOLLY CONTAINED IN
    VERIFY word for word against the ground ➔ a false containment claim is worse than none
  RUN the TAXONOMY READ-BACK: a cold reader states the classification FROM LAYOUT ALONE,
    prose covered. COMPARE to the ground's taxonomy.

STEP 7 — THE METAPHOR LANE              (fires only when the artefact wraps the concept in one)
  // A metaphor is a bundle of entailments, and the reader imports the WHOLE bundle, not the
  // part that was meant. This lane finds the leaks.
  NAME the metaphor and the concept it is wrapped around
  LIST the metaphor's OWN entailments — what is true of the metaphor's domain
  FOR EACH entailment: does the CONCEPT license it?
    LICENSED   — the mapping holds; this is why the metaphor was chosen
    LEAKED     — true of the metaphor, FALSE of the concept, and nothing in the artefact
                 blocks the import ➔ DEFECT, located at the metaphor
    BLOCKED    — false of the concept and the artefact explicitly rules it out ➔ fine
  CONFIRM WITH A COLD READER: give the metaphor-dressed passage only, and ask what ELSE must
    be true of the thing being described. Every wrong answer they volunteer is a live leak.
  // the highest-risk site in any metaphor-dressed artefact, because a leak reads as insight

STEP 8 — VERDICT
  COUNT defects by MODE and TYPE, never as a total, never as a percentage
  ASSIGN exactly one verdict:
    PASS   — zero CONTRADICTED, zero UNSUPPORTED, zero FALSE-structure defects, the
             discriminative test picked (1), boundary cases all classified with the ground
    REPAIR — defects exist, each located, each fixable in place
    REJECT — the discriminative test picked (2), (3) or (4); OR the boundary set went
             systematically against the ground. The reader is receiving a DIFFERENT CONCEPT,
             and no sentence-level edit fixes that — it needs rebuilding from the ground.
  IF COHERENCE-ONLY MODE: verdict may only be REPAIR or INCONCLUSIVE — never PASS
  // note plainly when the artefact is CLEAR AND WRONG. That quadrant is the dangerous one:
  // a lucid, confident, well-formatted account of the wrong concept transmits perfectly.

STEP 9 — REPORT
  EMIT in !PlainEnglish's four-part shape when reporting to Luke in chat
  EMIT the structured finding list ONLY when called by another skill
  EVERY defect carries: MODE (extension | intension | relation | inferential | structural |
    metaphor) · TYPE · LOCATION · THE GROUND'S OWN ACCOUNT, quoted
  NEVER emit a score, a percentage or a similarity figure
  NEVER rewrite the artefact here — this skill measures. Repair is the caller's move.
// EXECUTION_END
```

## ✅ OUTPUT

A report — to chat, or structured to a calling skill — carrying four things:

- **VERDICT** — PASS / REPAIR / REJECT / INCONCLUSIVE, and the mode it was reached in (full or
  COHERENCE-ONLY).
- **DEFECT LIST** — typed, moded and located. Types: `CONTRADICTED` · `UNSUPPORTED` (fabrication) ·
  `WEAKENED` · `OMITTED` · `OVER-EXTENSION` · `UNDER-EXTENSION` · `ACCIDENTAL-AS-ESSENTIAL` ·
  `NEIGHBOUR NOT RULED OUT` · `LICENSES TOO MUCH` · `FALSE TAXONOMY` · `FALSE CO-ORDINATION` ·
  `FALSE DIMENSION` · `FALSE ORDER` · `FALSE CONTAINMENT` · `METAPHOR LEAK`.
- **THE DISCRIMINATIVE RESULT** — which of the four the reader picked. If it was not (1), *which*
  wrong one names the drift precisely, and that is the most actionable line in the report.
- **THE GROUND'S OWN ACCOUNT** — quoted verbatim for every contradiction or fabrication. Evidence,
  not summary.

**The cross-tab.** This skill answers one axis; `!Comprehension` the other. The quadrants want
different repairs, and the top-right one is why both skills exist:

```
                   ACCURATE          INACCURATE
              ┌─────────────────┬─────────────────┐
     CLEAR    │      ship       │  ⚠ most danger  │  ← confidently transmits the wrong concept
              ├─────────────────┼─────────────────┤
   UNCLEAR    │  rewrite form   │   start over    │
              └─────────────────┴─────────────────┘
```

**Error Path**
```
CATCH [no ground exists]                           ➔ COHERENCE-ONLY MODE. Say so at the top.
                                                      Report internal contradiction and unstable
                                                      extension only. Never emit an accuracy
                                                      verdict. Fails closed, like !FactCheck
CATCH [only Direction A was run]                    ➔ the run is INCOMPLETE. Omission was tested,
                                                      fabrication was not. Run Direction B before
                                                      any verdict
CATCH [tempted to compare strings or measure        ➔ REFUSE. Paraphrase-invariance is the design
       overlap/similarity]                            constraint. Match atomic claims by meaning,
                                                      or the skill is not doing its job
CATCH [the nearest neighbour is not actually        ➔ the discriminative test proves nothing.
       confusable]                                    Rebuild it differing in the DEFINING
                                                      feature and as little else as possible
CATCH [no clean-context reader available for         ➔ STEP 4 and STEP 5 are VOID. Report the
       STEP 4 / STEP 5]                                entailment and mode results only, and say
                                                      which tests could not run. The authoring
                                                      agent cannot discriminate a concept it
                                                      already holds
CATCH [the reader picks (1) and everything else      ➔ PASS on this axis ONLY. The discriminative
       still fails]                                    test is necessary, not sufficient. Never
                                                      let it overrule a contradiction
CATCH [sources/ground disagree with each other]      ➔ FLAG the disagreement. Never pick a side
                                                      silently and never average them
CATCH [a defect traces to the GROUND being wrong    ➔ that is !FactCheck's axis, not this one.
       about the world]                                Say so and route it. This skill measures
                                                      transmission, never truth
CATCH [boundary cases score worse than positives    ➔ that IS the finding, not noise. The
       and negatives]                                  boundary is the concept. Report it as an
                                                      EXTENSION defect located at the clause
                                                      that sets the boundary
CATCH [a metaphor leak is defended as "it is only    ➔ reject the defence. Readers import the
       a metaphor"]                                    whole bundle. A leak nothing blocks is a
                                                      claim the artefact is making
CATCH [artefact is prose-only]                       ➔ skip STEP 6 entirely. Never invent
                                                      structural claims a plain paragraph was
                                                      never making
CATCH [asked for a score or a percentage]            ➔ decline and give typed defect counts by
                                                      mode instead
```
