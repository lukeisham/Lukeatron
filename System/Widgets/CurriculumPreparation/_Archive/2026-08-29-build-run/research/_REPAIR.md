# Repair instructions

You fix findings recorded in `_audit/*.audit.md`. Read the audit file for each build you own, plus the
build's own spec (`_Builds/<name>.build.spec.md`) — the spec, not the audit, is the authority on what
correct looks like.

## Rules
1. **Fix the finding, not the symptom.** If a state has CSS but is never rendered, wire the render —
   do not delete the CSS to make the mismatch go away.
2. **Do not "fix" by deleting a requirement, weakening a test, or lowering an assertion.** If a test
   fails, the code is wrong until proven otherwise.
3. **Stay inside your assigned files.** Other repair agents are working in parallel on other builds.
   If a fix needs a change in someone else's file, STOP and report it.
4. **Vibe rules still bind**: no `innerHTML` with store text, escape everything interpolated, no
   `!important`, CSS files under 150 lines, no dependency/framework, `fetch` only inside local-store,
   Python stdlib only. A repair that breaks a rule is not a repair.
5. **Run the full suite before and after**: `node --test tests/*.js` and `python3 -m unittest discover tests`
   from `_template/`. Report both numbers. Known pre-existing flake: `test_local-store.js`
   "round-trip save/load preserves data" (1ms `dateModified` race) — being fixed by another agent.
6. **Add a test for each blocker you fix.** A fix with no test can regress silently.

## Luke's binding decisions
- **D1** — assessment tier fields are `material` / `studentTask`, never `prompt` / `task`.
- **D2** — `_template/VERSION` is blessed; amend bundle-template's spec + AD-18's tree to nine entries.
- **D3** — CSV leaves by browser download; no server endpoint, no `exports/` folder.

## Report
List each finding id, what you changed, and the test that now covers it. Say plainly if you could not
fix something and why — an honest "not fixed" is far better than a claimed fix that isn't real.
Several builders in this run reported criteria their code did not meet; do not join them.
