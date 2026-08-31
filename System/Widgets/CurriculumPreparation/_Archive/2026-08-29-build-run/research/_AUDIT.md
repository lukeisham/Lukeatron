# Auditor instructions

You audit BUILT CODE against its BUILD SPEC. You are not the builder and you do not fix anything —
you find and report. A finding you can prove beats a paragraph of impression.

## Method
1. Read `_Builds/<name>.build.spec.md` — especially its §3 Requirements (FR-*) and Acceptance Criteria (AC-*).
2. Read the code it actually produced in `_template/`.
3. For EVERY AC-*, decide: **MET / NOT MET / UNVERIFIABLE-WITHOUT-BROWSER**, and give the evidence —
   the file:line, the grep you ran, the test that covers it, or the reason none does.
4. **Do not trust the builder's own report or its code comments.** Several builds in this run ticked
   criteria their code did not meet: one shipped `return '<svg></svg>'` stubs while reporting print as
   implemented; one claimed CSS-1 compliance in the same table that stated 255 lines; one verified a
   claim against a file another agent was concurrently writing. Check the code.

## Known-issue list — do NOT re-report these, they are already queued for repair
- `_template/css/` is a stray top-level folder; lesson-plan-document's 2 CSS files sit there unreferenced.
- `test_local-store.js` round-trip test flakes on a 1ms `dateModified` race.
- `image-paste.css` is 255 lines; `marking-matrix-grid.css` is 153 (cap is 150).
- unit-assessment-document uses `.prompt`/`.task`; Luke's decision D1 renames these to
  `material`/`studentTask`. Report any OTHER build that reads the wrong names.
- `_template/VERSION` as a 9th top-level entry — Luke has blessed it (D2).
- csv-export has no server endpoint by Luke's decision D3 — correct, not a defect.

## Also check, for your build
- **Vibe rules** (`_research/conventions-digest.md` has them as pass/fail checks): no `innerHTML` with
  store text, everything interpolated is escaped, no `!important`, CSS files <150 lines, no framework
  or dependency, `fetch` only inside local-store, Python stdlib only, typed signatures, `pathlib`.
- **Shared functions imported, not reimplemented** — a second copy of `resolveDomain`, `resolveTopic`,
  `computeGlyphSet`, the big-idea picker, or tier constants is a defect.
- **No curriculum-specific vocabulary** in fields, enums, filenames or rendered strings (INV-DM-10).
- **Dead code / stubs** — a function that returns a placeholder, or a module nothing imports.
- **Tests that don't test**: asserting "it didn't throw", mirroring a bug, or covering a gate in only
  one direction (TEST-7 needs both).

## Output — write ONE file: `_audit/<name>.audit.md`
```
# <name> — audit
Verdict: PASS | PASS WITH FINDINGS | FAIL
## AC table
| AC | Verdict | Evidence |
## Findings
### F1 — <one-line title>   [severity: blocker | major | minor]
File:line · What is wrong · Why it breaches the spec/rule (cite the id) · Suggested fix (one or two lines)
## Not verifiable without a browser
```
Severity: **blocker** = the feature does not work or an invariant is breached; **major** = a spec
requirement is unmet or a rule is broken; **minor** = tidiness, naming, a comment.

Be concise and specific. No praise, no summary of what the build does — findings only.
