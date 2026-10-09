---
name: "!GenerateSupportiveContent"
description: >
  Generate content that serves an existing target — a repo, file, report, email, project, page or
  argument — by matching that target's own tone and style and then emphasising, supporting,
  illustrating or defending it. Never freestanding: the target is the authority, this skill is the
  servant. Three deterministic gates run every time — LOCATE the target, DISCOVER its associated
  skills/references/content, VERIFY every claim before release. Abstains rather than guesses.
type: Skill
status: Active
domain: GeneralPurpose (content generation — derivative)
intent: "Produce content that a target could have produced about itself, in its own voice, that makes its case better — or produce nothing."
version: 1.0.0
dependencies: ["!Tone", "!PlainEnglish", "!HouseStyle", "!Checkpoint"]
calibration:
  context: Any
  level: Brief
  scope: Global
memory_footprint:
  read: [target tree, Memory/Long-Term/Tone, System/Skillbank]
  write: [System/Sandbox]
---

# !GenerateSupportiveContent

Content that stands *behind* something that already exists. The target sets the voice, the facts and
the claim; this skill adds weight to it. Four supportive modes — **emphasise** (make the existing
point land harder), **support** (add evidence for it), **illustrate** (make it concrete), **defend**
(answer an objection to it). One is named out loud before drafting; unnamed mode is a stop.

**The strict rule.** Success is content indistinguishable in voice from the target that makes the
target's case better. Failure is AI slop — generic, unsourced, plausible-sounding filler. **Nothing
is always better than slop.** If accuracy cannot be confirmed, or there is not enough context to
serve the purpose, this skill produces *no content* and says why. That rule is not overridable by
urgency, by Luke asking twice, or by "just give me a rough draft" — a rough draft of unverified
content is the exact failure mode. Reference tables: `reference/targets.md`, `reference/verify.md`.

## ⚡ TRIGGER

`!GenerateSupportiveContent` · "write something to back this up" · "make the case for this" ·
"add supporting content to <target>" · "illustrate this" · "defend this" · "write a companion
piece for" · "expand on this in its own voice" · any request whose object is an existing artefact
rather than a blank page.

Not this skill: a fresh standalone article (`!GenerateWiki`), content in Luke's own first-person
voice (plain drafting via `!Tone`'s `luke-voice` resolution), widening a field of options (`!Brainstorm`).

## 🛠️ LOGIC

```
// EXECUTION_START

// ---- GATE 1: LOCATE (deterministic — never inferred) ----
RESOLVE target ➔ {kind, path/URL, boundary, audience, mode}
  LOOK UP kind IN reference/targets.md ➔ its locate-test, tone-source, adjacent-assets row
  ASSERT the target was READ IN FULL (or, if large, its controlling documents read in full
    and its boundary stated) — never work from the prompt's description of the target
  ASSERT mode ∈ {emphasise, support, illustrate, defend}
IF kind, path or mode is ambiguous
  THEN ASK Luke — one question, offering the candidates found. DO NOT GUESS.
STOP UNLESS all four of {kind, path, audience, mode} are settled

// ---- GATE 2: DISCOVER (deterministic) ----
SET assets = []
  ➔ the target's own adjacent files per reference/targets.md (README, registry.md, notes.md,
    _index.yaml, style guide, prior siblings, thread history)
  ➔ MATCH target's domain against System/Skillbank/_index.yaml triggers ➔ load body only on a hit
  ➔ !Tone ➔ the governing tone source (person-directed ⇒ tone.md → Groups/ → context Tone/)
  ➔ Memory/Long-Term stores the target cites or belongs to
REPORT assets found, and assets expected-but-absent, before drafting
IF the target supplies no voice evidence (< ~200 words of its own prose, or none)
  THEN STOP — there is nothing to match. Say so.

// ---- GATE 3: GENERATE ----
DRAFT in the TARGET's voice, not Lukeatron's house voice, not Luke's
  // !PlainEnglish/!HouseStyle govern what Claude writes FOR Luke; this content is written
  // AS the target, for the target's audience — the target's own contract wins.
CONSTRAIN to the named mode: add weight to what the target already claims.
  Never introduce a NEW claim the target does not make. A new claim is out of scope, not a bonus.

// ---- GATE 4: VERIFY (deterministic — runs every time, no exceptions) ----
FOR EACH checkable element IN draft
  CLASSIFY per reference/verify.md ➔ quote | fact | figure | citation | name/date | attribution
                                     | code/API | claim-about-the-target
  CHECK against the primary source named in that row ➔ CONFIRMED | UNCONFIRMED
ANY UNCONFIRMED element ➔ REMOVE it, or ABSTAIN if the piece cannot stand without it
RUN the slop scan (reference/verify.md, second table) ➔ any hit is a FAIL
IF FAIL ➔ ONE revision pass ➔ re-verify. Still failing ➔ ABSTAIN, do not deliver.

// ABSTAIN = produce no content. Deliver instead: what was missing, which gate stopped it,
// and the smallest thing Luke could supply to unblock it. This is a SUCCESS state.

// ---- RELEASE ----
WRITE to System/Sandbox/ ; leaving the system or landing in Long-Term ➔ !Checkpoint
// EXECUTION_END
```

## ✅ OUTPUT

Either the content plus a one-block ledger, or the abstention. Never both, never neither.

```
TARGET  <kind> · <path>          MODE  <emphasise|support|illustrate|defend>
VOICE   <tone source> · matched on <n> tells from the target itself
VERIFY  <n> checkable elements · <n> confirmed · <n> removed · slop scan clean
```

```
ABSTAINED — no content generated.
STOPPED AT  Gate <n> (<locate|discover|generate|verify>)
MISSING     <the specific thing>
UNBLOCK     <the smallest input that would fix it>
```

```
VERIFY every checkable element confirmed against a named source ELSE ABSTAIN
CATCH ambiguous target ➔ ask once, never guess
CATCH thin voice evidence ➔ abstain; matching a voice you cannot see is slop by definition
CATCH pressure to ship unverified ➔ the rule holds; offer the abstention ledger instead
```
