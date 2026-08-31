# Builder instructions — read after _BRIEF.md

You implement ONE build. Your contract is `_Builds/<name>.build.spec.md`; your route through it is
`_Builds/<name>.plan.md`. Read both in full before writing a line.

## Rules of engagement
1. **Write only the files your plan's §Files lists.** If you believe you need a file another build
   owns, STOP and report it — do not create it, do not stub it (AD-BT-1).
2. **Never create a new top-level folder** in `_template/` (FR-BT-8).
3. **Import, never reimplement.** If your plan's §Interfaces says you consume a function from
   another build, import it. If that build has not run yet, report the missing import — never
   write a local copy.
4. **Vibe rules are binding** — `_research/conventions-digest.md` has them as pass/fail checks.
   Python stdlib only, vanilla ES modules, no framework, no bundler, no `!important`, no
   `innerHTML` with store text, escape everything interpolated, `pathlib` not string paths,
   typed Python signatures, specific exceptions, context managers.
5. **Tests.** Add the smoke tests your plan names, in `_template/tests/` mirroring the source
   tree. `unittest` for Python, `node:test` for JS. Three assertions per module: it imports, the
   happy path is right, one guard behaves. Anything enforcing a gate gets both a blocked-path and
   a permitted-path test (TEST-7).
6. **Run what you can.** Python: `python3 -m unittest`. JS: `node --test`. Report real output —
   never claim a test passed without running it.
7. **Match the neighbours** (SR-6) — `_research/conventions-digest.md` carries the house
   `serve.py` and `.command` idiom verbatim. Copy the style.

## Finish by reporting, honestly
- Files created (exact paths).
- Which acceptance criteria (AC-*) you demonstrated, and HOW.
- Which you could NOT demonstrate, and why. This is expected and useful — a spec-vs-code audit
  fleet runs after you, so an accurate account of what is unfinished is worth more than a
  confident one that is wrong.
- Anything in the spec you found ambiguous, contradictory, or impossible as written.
