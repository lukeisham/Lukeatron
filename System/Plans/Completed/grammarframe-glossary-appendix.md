---
plan: "grammarframe-glossary-appendix"
context: Teaching
secondary_contexts: []
created: 2026-09-26
status: Completed
major_because: "multi-step | modifies Long-Term memory (Memory/Long-Term/Grammar/*.html)"
project: ""
skills_used: [!DetermineContext, !CreatePlan, !ReviewPlan, !GrammarFrame, !HouseStyle, !Checkpoint]
---

# Plan — Move the GrammarFrame glossary into an appendix

## Objective
Advance the grammar tool by moving each guide's term definitions out of the heading bodies into one
**Glossary** appendix at the end of the file, with every in-prose use of a term linking to its
entry. The `!GrammarFrame` spec, markup contract and validator are amended to match, so future
renders produce the same shape.

Luke's ruling (2026-09-26, chat): the four `p.gf-terms` strips "look like a glossary and belong to
an Appendix".

## Success criteria (measurable)
- `grep -c 'class="gf-terms"'` returns **0** in both `Technical_Outline.html` and `Theatre.html`.
- Each guide has exactly one `<section class="gf-glossary" id="glossary">` placed after the last
  content heading and before `nav.gf-index`, holding all 40 current terms (same set, same `term-{kebab}`
  ids), sorted alphabetically.
- Each glossary entry = bold term + its unchanged gloss; in `Technical_Outline.html` only, the VCAA
  label follows where it does now (exactly 11 `a.gf-vcaa`, same wording, before and after). `Theatre.html` carries no VCAA link.
- Every in-prose use of a glossed term (rule definitions, notes, stubs, the Foundations list) is an
  `a.gf-term-ref` to `#term-{kebab}`. No refs in headings, chips, diagnostics, example specimens,
  `[bracket]` tags or the index (A1, A4, D1).
- `criteria.md` D2 and D16, `markup.md` "Terms", `skill.md` STEP 6/7 and `validate.py` D2/D16 all
  describe the appendix form. The skill changelog is bumped to 3.6.0.
- `validate.py check` passes D2 and D16 on both guides. D8 may still fail (a separate, pre-existing
  issue logged below). Every other criterion that passed before still passes.
- The new validator tests in `tests/test_validate.py` pass: a term defined outside the glossary fails
  D2, and a VCAA link outside the glossary fails D16.
- Charter DoD holds: the guides still stand alone and work offline (A8). No new source is introduced.

## Resources
- **Memory to read:** `Memory/Long-Term/Grammar/Technical_Outline.html`, `Theatre.html`, `Theatre_Mappings.table.md`
- **Capability skills:** none
- **Domain skills (Skillbank):** `!GrammarFrame` (its criteria, markup contract and validator are the thing being changed)
- **Sub-agents:** none. The ref-linking in Step 6 is a judgement call per occurrence, but the file is small (~54 KB), so it is done inline.
- **Scripts:** one standalone `System/Sandbox/glossary_move.py`. It lifts every `span.gf-termrow` out of the `p.gf-terms` strips, sorts them, writes the appendix section, and deletes the strips. It is deterministic, so it is scripted rather than hand-edited.
- **Temp-skills:** none

## Steps

**A — Amend the spec first (Skillbank skill, Low impact)**
- [x] Step 1 — `criteria.md` D2: rewrite as *"Each file ends with one Glossary appendix: every technical term the file uses, bold, with a short `!SimpleEnglish` gloss, on an anchor id, sorted alphabetically. Every use in the prose is a plain link to its entry. Each file keeps its own glossary."* Also update the check line. [inline]
- [x] Step 2 — `criteria.md` D16: "the D2 first-use instance" → "the term's Glossary entry"; "When D2's first use moves, the bracket moves with it" → drop. [inline]
- [x] Step 3 — `markup.md` "Terms": add the `section.gf-glossary#glossary` wrapper with `p.gf-termrow` entries. The rule becomes "one `b.gf-term` per term, inside the glossary; every `gf-term-ref` points into it". [inline]
- [x] Step 4 — `skill.md`: STEP 6 "APPLY D2 across the WHOLE file…" → "RENDER the Glossary appendix (D2) with VCAA terms (D16); LINK each prose use". Make the matching change in STEP 7. Also align STEP 2's "gloss for the first time" wording, and in the Boss-reconciles line change "D2 first-use order" → "D2 glossary completeness". Bump the changelog to 3.6.0. [inline]
- [x] Step 5 — `validate.py`: D2 requires every `b.gf-term` to sit inside `#glossary` and the entries to be in alphabetical order. D2 drops the "linked before first use" order check. D16 requires each `gf-vcaa` to sit inside `#glossary`. Add one A13 allowance: the `gf-terms` strip may vanish from an UNCHANGED heading and a word may become a `gf-term-ref`. Add the two failing-case tests; run `python3 -m pytest tests/`. [inline + script]
  - [x] Test in Sandbox — run the new validator against copies of the current guides in `System/Sandbox/`. It must FAIL D2 and D16 there, which proves the new checks bite.

**B — Re-render the guides**
- [x] Step 6 — Copy both guides to `System/Sandbox/`, then run `glossary_move.py` on the copies. Add `gf-term-ref` links for prose uses by hand. Add `.gf-glossary` CSS from `!HouseStyle` tokens: the existing `.gf-terms` sizing, one entry per line, print-safe. [script + inline]
  - [x] Test in Sandbox — run `validate.py check` on the Sandbox copies (D2 and D16 pass), and view both in the browser pane at desktop, mobile and print widths.
- [x] Step 7 — Promote the Sandbox copies over the Long-Term files. [inline]
  - [x] !Checkpoint — Long-Term write (two Grammar files). Show Luke the before/after of the Verbs heading and the new appendix before the overwrite.
- [x] Verify — rerun `validate.py check` on the live files; tick every Success criterion. [pass/fail]

## Final step — Logging (always present)
- [x] Append one line per skill in `skills_used` to `Memory/Long-Term/Logs/skills.log`, format:
  `[AGENT: !<SkillName>] [<SUCCESS|FAIL>] <one-line outcome> | tokens≈[N]`

## Final step — Close out (always present)
- [x] Update `status: Completed` in this plan's frontmatter.
- [x] Append one entry to `Memory/Long-Term/Logs/completed-plans.log` (format per that file's header — verbatim from this plan's frontmatter + Objective). Write this BEFORE moving the file.
- [x] Move the file from `System/Plans/New/` to `System/Plans/Completed/`.

## Outcome (2026-09-26)
- Both guides: 0 `gf-terms` strips, one `#glossary` appendix of 40 alphabetical entries; Technical keeps its 11 VCAA labels, Theatre has none. Prose links: 116 (Technical), 89 (Theatre), first use per paragraph.
- Deviation: D2 now says "first use per prose paragraph" rather than every use, to avoid over-linking (spec, markup and skill.md aligned).
- Deviation: the A13 carry-forward diff now ignores whitespace (unwrapping a link left join spaces such as "verb 's").
- validate.py: D2, D16, A13 pass on the live files; D8 still fails (pre-existing, logged in issues.log). Tests: 22/22 pass.
- Prior guides kept at System/Sandbox/glossary-appendix/prior/ for rollback.
