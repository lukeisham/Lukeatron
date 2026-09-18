---
name: Comprehension
description: "Measure whether a finished artefact — prose AND the way it is laid out — actually lets a reader recover the meaning it was written to carry. Meaning is not a property of text; it is a relation between text and reader, so this skill never inspects the writing directly. It pre-registers what the reader is supposed to end up holding and able to do, hands the artefact and nothing else to N cold readers with no conversation context and no spec, and diffs what comes back. Two surfaces are measured together and separately: PROSE (what the sentences assert) and FORMAT (what the layout silently asserts — nesting claims part-of, order claims prerequisite, visual weight claims importance, adjacency claims belongs-with, repeated form claims same-kind-of-thing, nesting boxes claim containment). Emits typed, located defects and a PASS / REPAIR / REJECT verdict, never a score — a number invites optimising the number. Readability formulas (Flesch and kin) are banned outright: they measure word and sentence length, which a paragraph of undefined jargon passes easily. Fails closed — with no independent statement of intent it runs in REDUCED mode and reports ambiguity and reader-variance only, never a recovery rate, because grading an artefact against itself always passes. Callable standalone on any artefact, and called by !GrammarFrame at its STEP 7B transmission review."
type: Skill
status: Registered
core_function: [Categorise, Track]
intent: "Given an artefact and an independent statement of what it was meant to transmit, measure how much of that meaning a cold reader actually recovers from the prose and from the layout, and return the exact sites where recovery failed — so the repair is a location, not an opinion."
version: 1.0.0
domain: GeneralPurpose
dependencies:
  - "reference/format-propositions.md (the device-to-claim table — always loaded when the FORMAT surface is in scope)"
  - "!PlainEnglish (core, always on — governs the FORM of this skill's own report)"
  - "System/Skillbank/GeneralPurposeSkills/!ConceptFidelity/skill.md (sibling; the cross-tab at OUTPUT needs both)"
calibration:
  context: Any
  level: Extended
  scope: Global
impact: Low
memory_footprint:
  read:
    - "the artefact under test (any path, or pasted inline)"
    - "the intent source — the brief, source text, spec, or prior artefact the meaning comes FROM"
  write:
    - "System/Sandbox/comprehension-<artefact>-<date>.md (the report; promoted or cleared like any Sandbox file)"
---

## ⚡ TRIGGER

"can a reader follow this", "is this comprehensible", "comprehension check", "run a cold read",
"does this actually communicate", "will they get it", "test this on a fresh reader",
"check the layout reads right", "!Comprehension".

Also fires **from inside another skill's review stage** — `!GrammarFrame` STEP 7B calls it over each
rendered guide. When called that way it takes its spec from the caller and returns structured
findings rather than a chat report.

Does **not** fire on: drafting or rewriting (that is `!SimpleEnglish` / `!ProseDetox`), truth-checking
(`!FactCheck`), or whether the right *concept* arrived (`!ConceptFidelity`, the sibling). This skill
asks one question only — **did any determinate meaning get across, and was it the intended one?**

## 🎯 WHAT THIS MEASURES — and what it refuses to

**Meaning is not in the text.** It is a relation between a text and a reader. A sentence that is
lucid to its author can be a fog to everyone else, and no amount of staring at the sentence reveals
which it is. So this skill never grades the writing. It grades **what comes back out of a reader**.

Three consequences, all load-bearing:

1. **The reader must be blind.** A reader who already knows what you meant cannot fail to understand
   you. The cold reader gets the artefact and nothing else — no conversation, no brief, no spec, no
   sight of the other readers' answers. Blindness is the whole instrument; without it this skill
   measures nothing at all.
2. **The intent must be pre-registered, and must come from somewhere other than the artefact.**
   Deriving "what this was meant to say" by reading the thing under test grades it against itself,
   which passes every time. See STEP 1's REDUCED mode.
3. **The output is locations, not a number.** A score invites optimising the score, and both halves
   of this measurement are trivially gamed once they are a target.

**Banned instruments.** Readability formulas — Flesch–Kincaid, Gunning fog, SMOG, ARI and kin —
measure sentence length and syllable count. A short sentence packed with undefined jargon scores
beautifully and communicates nothing. They are worse than useless here because they *look*
quantitative. Never compute one, never cite one, never accept one as evidence.

## 📐 TWO SURFACES — prose and format

The artefact asserts things twice: once in its sentences, once in its shape. Both are measured, and
they fail independently.

> **Naming note.** `!GrammarFrame` uses "TWO LANES" for a different distinction entirely (autonomous
> vs gated work). These are **SURFACES**, not lanes. Do not conflate them when this skill runs inside
> that one.

| | **PROSE surface** | **FORMAT surface** |
| :--- | :--- | :--- |
| What it asserts | what the sentences say | what the layout silently claims |
| Example claim | "the head noun governs agreement" | *this* sits inside *that*; *this* matters more than *that*; these three are the same kind of thing |
| How it fails | missing, vague, distorted, unresolvable reference | orphan device, colliding devices, a false structural claim nobody wrote down |
| Recovered by | restatement + action attempt | structural read-back from layout alone, with the prose covered |

The FORMAT surface is the half that review passes normally miss, because nobody wrote those claims
down — they were made by choosing a heading level. **Every formatting decision is a silent
proposition.** The full device-to-claim table is `reference/format-propositions.md`, loaded whenever
this surface is in scope. A rendered artefact (HTML, a guide, a dashboard, a printed page) always has
both surfaces. A plain paragraph in chat has only the prose surface, and the FORMAT steps are skipped
rather than faked.

## 🛠️ VERB

```
// EXECUTION_START

STEP 0 — SCOPE
  IDENTIFY the artefact under test and its MEDIUM:
    prose-only   (chat text, a paragraph, a plain .md with no structural intent)
    rendered     (HTML, a styled guide, a dashboard, a print layout)
    both         (a document whose headings, tables and emphasis are doing real work)
  SET surfaces = {PROSE} for prose-only, {PROSE, FORMAT} otherwise
  IF FORMAT in surfaces THEN LOAD reference/format-propositions.md
  IDENTIFY the INTENT SOURCE — the brief, source text, spec, notes, or caller-supplied
    proposition set that the meaning comes FROM
    // this must be a DIFFERENT document from the artefact. The artefact is the thing on trial;
    // it does not get to testify about its own intent.

STEP 1 — PRE-REGISTER THE SPEC        ⛔ the check is invalid without this
  IF the caller supplied a spec THEN USE IT VERBATIM — never re-derive, never "improve" it
  ELSE IF an independent INTENT SOURCE exists THEN DERIVE the spec FROM THAT SOURCE ONLY,
    with the artefact closed
  ELSE ENTER REDUCED MODE:
    SAY SO EXPLICITLY at the top of the report
    RUN STEP 2, STEP 3 and STEP 5 only
    REPORT ambiguity sites and reader-variance ONLY
    EMIT NO recovery rate, NO distortion count, NO PASS verdict — only REPAIR or INCONCLUSIVE
    // an artefact graded against itself always passes. Reduced mode is honest; a full-looking
    // report with a self-derived spec is a lie with numbers on it.

  A SPEC HAS THREE PARTS:
    (a) PROPOSITIONS — 3 to 7 things the reader must END UP HOLDING, each one sentence,
        each independently true-or-false. Not topics. "Adjective order runs from the
        contingent to the essential" is a proposition; "adjective order" is not.
    (b) THE ACTION — the one thing the reader must be ABLE TO DO having read it. If no
        action can be named, the artefact has no testable purpose — FLAG that as the
        first finding, because it is a defect in the brief, not in the writing.
    (c) STRUCTURAL CLAIMS — for the FORMAT surface: what the layout is MEANT to assert.
        Walk reference/format-propositions.md device by device and write down, for each
        device the artefact uses, the claim it is being used to make.
        // e.g. "diagnostics are rendered heavier than rules" asserts DIAGNOSTICS MATTER
        // MORE. That is a proposition. It can be recovered, or missed, or contradicted.
  FREEZE the spec. It is not edited after a cold read returns — editing it to match what
    came back is the one move that destroys the whole instrument.

STEP 2 — MECHANICAL CHECKS      (free; no reader needed; run BEFORE spending a cold read)
  // highest yield per token in the skill. Most real comprehension failures are here.
  REFERENT RESOLUTION:
    FOR EACH pronoun, "this", "that", "the above", "such", "the former/latter", bare "it":
      NAME the unique antecedent
      IF two candidates are equally available, OR the antecedent is more than one
        paragraph back, OR it points at a whole preceding clause rather than a noun
        THEN RECORD an UNRESOLVED REFERENT defect with its location
  DEPENDENCY ORDER:
    BUILD first-use index and definition index for every term of art
    IF first_use < definition FOR ANY term THEN RECORD a FORWARD DEPENDENCY defect
    // in a rendered artefact this includes glossary discipline: is the bolded "first use"
    // actually the first use on the page as read, not as authored?
  IF FORMAT in surfaces:
    ORPHAN DEVICE:
      FOR EACH formatting device used exactly ONCE in the artefact:
        RECORD an ORPHAN defect — a device used once asserts a distinction nothing else
        honours, so the reader cannot tell whether it means something or slipped in
    DEVICE COLLISION:
      IF one device carries two different claims (bold = key term AND bold = important)
        THEN RECORD a COLLISION defect
      IF two devices carry the same claim with nothing distinguishing them
        THEN RECORD a REDUNDANT-DEVICE defect
    CLAIM WITHOUT DEVICE:
      FOR EACH structural claim in spec (c) with no device actually carrying it in the
        artefact: RECORD an UNMARKED CLAIM defect — it was meant to be asserted and is not
  // these findings are reported whatever the cold reads say. They are defects on their own.

STEP 3 — THE BLIND COLD READ            (the instrument)
  SET N = 3 by default (1 only for a trivial artefact; 5 when the stakes are high)
  DISPATCH N independent readers. EACH reader MUST have:
    NO conversation context, NO brief, NO spec, NO sight of another reader's answers,
    NO knowledge that this is a test of anything in particular
    // a subagent with a clean context is the mechanism. IF no such reader can be obtained
    // THEN SAY SO AND STOP — do not let the authoring agent grade its own writing. It cannot
    // un-know the intent, and its "cold read" is the intent read back. This fails closed.
  EACH reader RECEIVES the artefact and RETURNS, in this order:
    (a) RESTATEMENT — "In your own words, what does this say?" — UNPROMPTED. Never list the
        propositions and ask which are present; that leaks every answer being tested.
    (b) ACTION ATTEMPT — the spec's (b) action, performed. Not "could you do this?" but
        "do it." A reader who believes they understood and cannot perform did not understand.
    (c) STRUCTURAL READ-BACK  [FORMAT surface only] — answered FROM LAYOUT ALONE, with the
        prose treated as unreadable text:
          what is part of what?
          what does this want me to read first?
          which of these matters most?
          which of these are the same KIND of thing?
          which things belong together?
        // the test is whether the shape transmits without the sentences. If a reader
        // cannot answer these from layout, the layout is decoration, not structure.
    (d) GUESS LOG — every place they had to assume something to keep going, with the span
    (e) REFERENT LIST — what each pronoun and deictic pointed to, in their reading

STEP 4 — DIFF against the frozen spec
  FOR EACH proposition IN spec (a) and spec (c):
    FOR EACH reader:
      LABEL exactly one:
        RECOVERED — stated unprompted, correctly
        PARTIAL   — the shape of it, missing a qualifier or a condition
        MISSING   — absent from the restatement
        DISTORTED — stated, but wrong, weakened, or inverted
        INVENTED  — reader holds a proposition NOBODY put in the spec
      // DISTORTED and INVENTED are strictly worse than MISSING. A gap the reader notices
      // and can ask about. A distortion they carry away believing they were told it.
  SCORE the ACTION attempt: PERFORMED / PERFORMED-WRONG / NOT PERFORMED
  // PERFORMED-WRONG is the loudest signal in the skill: confident and incorrect means the
  // artefact successfully transmitted something, and that something was not the intent.

STEP 5 — VARIANCE            (the reason N > 1)
  FOR EACH proposition:
    IF readers DISAGREE on its label THEN MARK it AMBIGUOUS
    // ambiguity outranks individual passes. If three readers reconstruct three different
    // things, the artefact is underdetermined even if each single read looked acceptable.
  COLLATE every GUESS LOG span across readers:
    A span flagged by 2+ readers is a CONFIRMED AMBIGUITY SITE — these are the repair
    coordinates, and in practice they are the most useful thing this skill produces
  COMPARE REFERENT LISTS across readers:
    ANY pronoun resolved differently by two readers is an UNRESOLVED REFERENT, whatever
    STEP 2's mechanical pass concluded

STEP 6 — VERDICT
  COUNT defects by TYPE, never as a total, never as a percentage
  ASSIGN exactly one verdict:
    PASS   — every proposition RECOVERED or PARTIAL by every reader, ACTION PERFORMED,
             zero DISTORTED, zero INVENTED, zero AMBIGUOUS, no mechanical defect outstanding
    REPAIR — defects exist, all of them located and fixable in place
    REJECT — the ACTION was PERFORMED-WRONG, or a majority of readers DISTORTED the same
             proposition, or readers disagree about what the artefact is FOR. The artefact
             is not repairable at the sentence level; it needs rebuilding from the spec.
  IF REDUCED MODE: verdict may only be REPAIR or INCONCLUSIVE — never PASS

STEP 7 — REPORT
  EMIT in !PlainEnglish's four-part shape when reporting to Luke in chat
  EMIT the structured finding list ONLY when called by another skill
  EVERY defect carries: TYPE · LOCATION (span, heading, or device) · WHAT CAME BACK INSTEAD
  NEVER emit a score, a percentage, a grade, or a readability index
  NEVER rewrite the artefact here — this skill measures. Repair is the caller's move.
// EXECUTION_END
```

## ✅ OUTPUT

A report — to chat, or structured to a calling skill — carrying exactly four things:

- **VERDICT** — PASS / REPAIR / REJECT / INCONCLUSIVE, and the mode it was reached in (full or
  REDUCED).
- **DEFECT LIST** — typed and located. Types: `MISSING` · `DISTORTED` · `INVENTED` · `AMBIGUOUS` ·
  `UNRESOLVED REFERENT` · `FORWARD DEPENDENCY` · `ORPHAN DEVICE` · `DEVICE COLLISION` ·
  `REDUNDANT DEVICE` · `UNMARKED CLAIM` · `ACTION FAILED`.
- **CONFIRMED AMBIGUITY SITES** — spans two or more readers had to guess at. The repair list.
- **WHAT CAME BACK** — for any DISTORTED or INVENTED proposition, the reader's actual words. This is
  evidence, not summary, and is quoted verbatim.

**The cross-tab.** This skill answers one axis; `!ConceptFidelity` answers the other. Run together —
as `!GrammarFrame` STEP 7B does — they place the artefact in one of four quadrants, and the quadrants
want different repairs:

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
CATCH [no independent intent source exists]        ➔ REDUCED MODE. Say so at the top. Report
                                                      ambiguity and variance only. Never emit a
                                                      recovery rate and never emit PASS
CATCH [no clean-context reader can be obtained]    ➔ STOP and say so. The authoring agent must
                                                      NEVER grade its own writing — it cannot
                                                      un-know the intent, so its cold read is
                                                      the intent read back. Fails closed
CATCH [the spec cannot name an ACTION]             ➔ report it as FINDING ONE, against the brief
                                                      rather than the writing. An artefact with
                                                      no nameable purpose cannot be tested
CATCH [a reader was shown the spec, the brief,      ➔ that read is VOID. Discard it, do not
       or another reader's answer]                    average it in, run a fresh reader
CATCH [tempted to edit the spec after a cold read]  ➔ REFUSE. A spec edited to match what came
                                                      back measures nothing. Log the temptation
                                                      as a finding about the spec instead
CATCH [tempted to prompt a reader with the           ➔ REFUSE. Recovery must be UNPROMPTED.
       propositions and ask which are present]        A checklist leaks every answer
CATCH [asked for a score, a percentage or a grade]  ➔ decline and give the typed defect counts
                                                      instead. Explain once: a number becomes a
                                                      target and both halves are trivially gamed
CATCH [a readability formula is offered as          ➔ reject it. Flesch and kin measure word and
       evidence]                                      sentence LENGTH. Undefined jargon in short
                                                      sentences scores well and says nothing
CATCH [artefact is prose-only but format defects     ➔ skip the FORMAT surface entirely. Never
       were requested]                                invent structural claims a plain paragraph
                                                      was never making
CATCH [all three readers agree — and all three       ➔ that is a REJECT, not a PASS. Agreement
       are wrong in the same way]                     measures determinacy, not correctness;
                                                      correctness is !ConceptFidelity's axis.
                                                      Say both results, never just this one
CATCH [called by another skill with a spec that      ➔ use it as given and record the gap as a
       covers prose but not layout]                   LIMIT in the report — do not silently
                                                      derive structural claims from the artefact
```
