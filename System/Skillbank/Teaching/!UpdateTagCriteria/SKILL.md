---
name: "!UpdateTagCriteria"
description: "Turn Luke's correction of a wrong Fact-checking tag into a more precise change to the app's single master tag criteria (the classifier's decision tree). Takes one tag problem — a hand-tag/harness conflict or a Tier-2 contradiction — traces the tree to find where it went wrong, proposes the smallest fix, regression-checks it against every worked example, and writes it only after Luke approves."
type: Skill
status: Active
core_function: System
intent: "Let Luke sharpen the classifier's tag criteria by correcting real mistakes, without ever hand-editing the decision tree, and without a fix for one case quietly breaking another."
version: 1.0.0
dependencies: ["System/Apps/Fact-checking/tag-criteria.md", "System/Apps/Fact-checking/_build/specs/tag-criteria.spec.md"]
calibration:
  context: [Teaching]
  level: Extended
  scope: Local
memory_footprint:
  read: ["System/Apps/Fact-checking/tag-criteria.md", "System/Apps/Fact-checking/_build/specs/tag-criteria.spec.md", "System/Apps/Fact-checking/_build/prd.md"]
  write: ["System/Apps/Fact-checking/tag-criteria.md", "System/Apps/Fact-checking/_build/specs/tag-criteria.spec.md", "Memory/Long-Term/Logs/skills.log"]
---

## ⚡ TRIGGER
Primary: `!UpdateTagCriteria`
Fires when Luke brings a tag problem from the Fact-checking app: "this phrase got the wrong tag",
"fix the tag criteria", "the classifier got this wrong", "update the criteria", or a hand-tag /
Tier-2 contradiction the app has highlighted.

A **tag problem** is one of:
- **Conflict** — Luke's hand tag disagrees with the harness's tag for the same phrase.
- **Contradiction** — `!FactCheck`'s finding (its confirmed category) disagrees with the tag the phrase carried.

One skill run handles **one tag problem**. Several problems ➔ run the loop once per problem.

## 🛠️ LOGIC

```
// EXECUTION_START

STEP 0 — Locate the criteria
  CRITERIA = System/Apps/Fact-checking/tag-criteria.md
  IF CRITERIA missing ➔ CRITERIA = System/Apps/Fact-checking/_build/specs/tag-criteria.spec.md
                         (pre-build: the spec is the master; say so to Luke)
  IF neither exists ➔ STOP, report the missing file. Never invent criteria.
  READ CRITERIA in full. READ its "Decisions needed" and "Worked examples" sections.

STEP 1 — Take the case
  Need all of: P (the phrase), S (its sentence), GIVEN (the tag(s) it carried),
               CORRECT (the tag(s) Luke says it should be), KIND (conflict | contradiction).
  For a contradiction also need FOUND (the category !FactCheck confirmed).
  ASK Luke in chat for anything missing. Do not guess S or CORRECT.
  IF CORRECT is not one of the nine outcomes ➔ ask which outcome he means.

STEP 2 — Triage: is this a criteria problem?
  MATCH the case:
    P's boundaries are wrong (phrase split badly)            ➔ NOT a tag-criteria problem.
                                                              STOP; tell Luke it belongs to the
                                                              phrase-finding harness.
    CORRECT contradicts a tag's meaning in prd.md's taxonomy ➔ ASK Luke: change the taxonomy
                                                              (his call, PRD edit) or the case?
                                                              Never edit prd.md from here.
    contradiction where FOUND differs but GIVEN was a fair
      reading of the sentence                                ➔ ASK Luke which is right before
                                                              proceeding; the search may be wrong.
    else                                                     ➔ criteria problem, continue.

STEP 3 — Trace the tree by hand
  Walk N1..N6 and the Resolution rules on P in S, exactly as the spec defines them.
  Record for each node: answer (yes / no / unsure / choice) + one-line reason.
  Derive the node answers that WOULD produce CORRECT.
  FIND the first node whose recorded answer differs from the required one. That node (or the
  resolution rule that combined the answers) is the fault site.
  Name the failure kind — exactly one:
    WORDING     the question is ambiguous, too broad, or too narrow for this case
    RULE        a combining/resolution rule gives the wrong result from correct node answers
    ORDER       a short-circuit node (N1/N2) fires before it should, or too late
    THRESHOLD   node was right in direction but T_hi / T_lo put it on the wrong side
    GAP         no node asks the question this case turns on
  You cannot see Jev's real probabilities. State every trace as a judgement and say so.
  IF the trace already gives CORRECT ➔ the tree is right and the harness misapplied it.
      Report that; propose no edit (suggest a sharper question wording only if the wording is
      the plausible cause, and label it optional).

STEP 4 — Draft the smallest fix
  Change ONE thing: one question's wording, one rule, one ordering, one threshold, or one
  new node (GAP only — a new node needs a stated reason no existing node can carry it).
  Constraints on every change:
    - Questions stay self-contained, answerable from P in S alone, with a CLOSED answer set
      (yes/no, or a fixed list). No open-ended or "use judgement" wording.
    - State the property the question tests, never the case's own words. If the fix only works
      by naming words from this one phrase, it is OVERFIT: do not encode it as a rule.
      Add the case as a worked example only and tell Luke it is a one-off; ask for a second
      similar case before generalising.
    - Do not change what a tag MEANS (its scope in prd.md) — only how the tree detects it.
    - Prefer tightening an existing question over adding a node; prefer a node over a new
      combining rule.

STEP 5 — Regression check (do not skip)
  Re-trace EVERY row in the Worked examples table under the drafted change, plus the new case.
  The new case must now give CORRECT. Every existing row must give its listed outcome.
  IF any existing row flips ➔ revise the fix and re-check; IF no fix satisfies both, show
  Luke the conflict (the two cases, the one change, which one loses) and let him choose.
  Report the result as a table: row | outcome before | outcome after | unchanged?

STEP 6 — Show Luke and get a decision
  Present, in this order:
    1. The case (P, S, GIVEN, CORRECT, FOUND if any).
    2. The trace and the fault site, with the failure kind.
    3. The exact before/after text of the change.
    4. The regression table.
  AWAIT Luke: approve | revise (his wording) | reject.
    revise ➔ apply his wording, redo STEP 5, show again.
    reject ➔ change nothing in CRITERIA; log the rejected case (STEP 8), end.
  Never write to CRITERIA before an explicit approve.

STEP 7 — Apply (only after approve)
  EDIT CRITERIA surgically — only the changed text. Then:
    - Add the new case as the next numbered row in "Worked examples" (with its path and outcome).
    - Bump the file's `version:` patch number.
    - Append one line to a "## Change log" section at the end (create it if absent):
      `<date> — v<new> — <node/rule changed> — <one-line why> — case: "<P>"`.
  IF CRITERIA is the spec (pre-build) ➔ that is the only file edited.
  IF CRITERIA is the app's tag-criteria.md ➔ also apply the same change to the spec so the two
    do not drift, unless Luke says the spec is retired.
  Do not edit prd.md, the app code, or any threshold Luke did not approve.

STEP 8 — Log
  APPEND to Memory/Long-Term/Logs/skills.log:
  `<date time> [AGENT: !UpdateTagCriteria] [SUCCESS|REJECTED|NO-EDIT] <failure kind> <node> | case: "<P>" ➔ <CORRECT>`

STEP 9 — Report
  Short brief: what changed (or why nothing did), the new version, and whether the classifier
  will pick it up on its next run (it reads the file every run; no restart needed).

// EXECUTION_END
```

**Flow Control**
- Every criteria edit is gated on Luke's explicit approve (STEP 6). No approve ➔ no write.
- A regression that cannot be resolved is Luke's call, never the skill's.

## ✅ OUTPUT
**Expected State:**
- Either the criteria file has exactly one approved, minimal change plus the new worked example, a
  bumped version and a change-log line — or it is untouched and the reason is stated.
- Every previously listed worked example still comes out as listed.
- No change altered a tag's meaning, the PRD, the app code, or an unapproved threshold.

**Validation Check (Self-Test):**
```
VERIFY criteria file was read in full before any trace                      ELSE STOP
VERIFY the trace names a fault site and exactly one failure kind            ELSE ask Luke
VERIFY every worked example was re-traced under the change (STEP 5)         ELSE re-run STEP 5
VERIFY Luke's explicit approve exists before any write to the criteria file ELSE undo the write
VERIFY the change tests a property, not the case's own words               ELSE mark OVERFIT
```

**Error Path**
```
CATCH [criteria file missing]  ➔ STOP, name the file, propose nothing
CATCH [case incomplete]        ➔ ask Luke for the missing field, do not guess
CATCH [not a criteria problem] ➔ say which component owns it (phrase-finding harness / PRD / search)
CATCH [*]                      ➔ log to Memory/Long-Term/Logs/skills.log, leave the criteria file unchanged, report to Luke
```
