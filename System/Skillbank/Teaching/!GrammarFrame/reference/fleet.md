# fleet.md — roles, models and return formats for FLEET MODE

Loaded whenever the skill runs as a fleet (skill.md, 🐝 FLEET MODE). The fleet changes WHO does each
step, never WHAT it requires: every criterion binds a subagent exactly as it binds the boss.

## Roles

| Role | Model | Steps | Sees | Never |
| :--- | :--- | :--- | :--- | :--- |
| **BOSS** | the session model (Opus) | 0, 1, 3, 4, 5D, 6, 7, 8, 8B, 9; E1 Q0 (the axis, guide-wide); the batch plan; revision R1–R4; every file write (B7) | everything | hands the gate to anyone |
| **RESEARCHER**, one per heading | `sonnet` | 2 for its heading | the heading's source block, `sources.md`, `meaning-first.md`, both tables, the draft skeleton | proposes a move (B8 is the boss's, guide-wide); rules on anything |
| **AUTHOR**, one per heading | `opus` | 5 for its heading | the gate rulings, the researcher's return, all the references, the mapping table, the locked skeleton | writes a file; runs its own 5B/5C; re-tests an axis the boss handed it (E1 Q0) |
| **CHECKER**, one per heading | `opus` | 5B **and** 5C, merged | the author's return, the researcher's sources, the four references. Not the author's reasoning | shares a context with the author; checks its own work |
| **READER**, one per heading | `sonnet` | 7B | ONE rendered heading (the artefact) and nothing else, per `!Comprehension`/`!ConceptFidelity` | sees the spec, the sources, or the other guide |
| **SCRIPT** | none: `validate.py` | 1 (`hashes`), 8 (`check`), 3 and 8 (`rows`) | the files | makes a judgement |

**Why the split.**
- **Research is Sonnet** because it is bounded: the named sources in `sources.md`, in a fixed precedence.
- **Writing and checking are Opus** because that is where subtle errors live. A checker must be at
  least as strong as the author, or it passes what it cannot see.
- **The reader is Sonnet** because 7B stands in for an ordinary reader, not an expert. A stronger
  reader overstates what a real one recovers.
- **There is no Haiku tier.** Every job simple enough for it is deterministic, and the script does
  those exactly.

**Why one checker.** 5B (the discrimination test) and 5C (the accuracy review) are both "a
non-author re-derives and tests". One agent does both, in order: 5B first, over the diagnostics;
then 5C, over everything, including the 5B positive spans. The one bar that stays: the checker is
never the author and never the reader.

**Loop limit.** An AUTHOR ⇄ CHECKER round trip runs at most twice per heading. A finding still open
after the second round is FLAGGED (`data-flags`) and reported, not cycled again (as in STEP 7B).

## Dispatch

Subagents are called with the Agent tool, with `model` set per the table. Independent subagents run
in parallel: all researchers of a batch together; then, after the gate, all authors together; each
checker as soon as its author returns. Readers run once the boss has rendered. The boss waits for a
role's returns only where the next step needs them.

Each prompt carries: the role name and its row from the table above; the paths it may read; the
return format below, verbatim; and the rule "return only the format — no file writes, no other
prose". A subagent's return that does not parse is re-requested once, then its heading is flagged.

Every AUTHOR prompt also carries its heading's axis (E1 Q0), which the boss settles before STEP 5.
The author copies it into `axis` unchanged, and returns `E1: omitted` whenever the axis is not
form-function.

## Return formats

Every return is one JSON object. The boss merges fields and never re-reads prose to find a value.

**RESEARCHER**

```json
{
  "slug": "noun-phrase",
  "proposals": [
    {"class": "A|B|C|D|E", "item": "…", "why": "…", "source": "…",
     "his_text": "…(class B only)", "fix": "…(class B only)"}
  ],
  "verified_quotes": [{"text": "…", "author": "…", "work": "…", "checked_against": "…"}],
  "discarded_quotes": [{"text": "…", "reason": "…"}],
  "source_notes": [{"claim": "…", "source": "…", "agrees_with_luke": true}],
  "mapping_gap": "…or null (C29: the table cannot reach this heading)",
  "suppressed": ["…items skipped under B4, for the boss's count"]
}
```

**AUTHOR**

```json
{
  "slug": "noun-phrase",
  "axis": {"axis": "form-function|purpose|…|none", "from": "slug", "by": "notes|Luke"},
  "e_tests": {"E1": "form+function|omitted", "E2": {"noun-phrase-form": "…"}, "E3": {"…": "RULE|NOTE"},
              "E4": "1|n|none", "E5": ["target-slug"], "D9": "table|paragraph"},
  "rules": [
    {"id": "r-…", "section": "noun-phrase-form", "definition": "…", "why": "…A2, or null + flag",
     "callout": "…", "niche": [{"label": "Exception|Narrow case", "text": "…"}],
     "reach_candidates": [{"unit": "slug-or-section-id", "does": "…the concrete phrase",
                           "direction": "governs|mutual"}]}
  ],
  "diagnostics": [{"section": "…", "text": "…", "tests": ["Syntax"]}],
  "breadth": {"kinds": ["…"], "parts": ["…"], "uncounted": [{"item": "…", "why": "…"}]},
  "breadth_reach_questions": [{"kind": "breadth|reach", "text": "…"}],
  "examples": {"plain": {"text": "…", "tagged": "…"},
               "memorable": {"text": "…", "tagged": "…", "author": "…", "work": "…"}},
  "boxes": [{"span": "…", "label": "…", "children": []}],
  "notes": ["…one of Luke's source lines, verbatim; \\n between lines; no additions (C37)"],
  "terms": [{"term": "…", "gloss": "…", "vcaa": "…or null"}],
  "gate_returns": [{"class": "A–E", "item": "…", "why": "…B2: a fill that would add content"}],
  "flags": ["…"]
}
```

**CHECKER**

```json
{
  "slug": "noun-phrase",
  "discrimination": [
    {"question": "…", "feature": "…", "positive": "…span", "near_miss": "…span",
     "answers": {"positive": "yes | the item named", "near_miss": "no | a different item, or none"},
     "rulings": {"C10": "pass|fail", "C11": "…", "C12": "…"}, "rewrite": "…or null"}
  ],
  "accuracy": [
    {"criterion": "C17|C8|C19|C20|C35|C38|C39", "where": "rule r-…|diagnostic n|example|box|term",
     "finding": "…", "route": "own-error|flag|gate-B", "fix": "…or null"}
  ],
  "cleared": true
}
```

`cleared` is true only when every discrimination ruling passes (or its rewrite does) and every
accuracy finding is routed. The boss does not render a heading whose checker has not cleared it
(STEP 5C).

**READER** returns what `!ConceptFidelity` (and in a full review, `!Comprehension`) specify, and
nothing else. Their formats govern; this file does not restate them.

## Revision mode

Same roles, scoped to the unit (skill.md 🔁 REVISION MODE):

| Redo of | Subagents |
| :--- | :--- |
| a whole heading | researcher, author, checker, reader |
| a section, rule or example | author, checker (+ reader if Theatre wording changes) |
| a diagnostic question | author, checker (5B only) |
| theatre dressing only | reader (the boss re-dresses) |
| a mapping row | reader per heading that uses the row |

The boss passes the author every `Revisions.table.md` row for the slug (B9), with the new reason.
