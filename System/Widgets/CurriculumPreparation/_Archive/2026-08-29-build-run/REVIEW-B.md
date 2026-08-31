# Closeout Review B (independent second opinion)

Scope reviewed: `Memory/Long-Term/Coding/vibe-coding-rules.md`, `_research/conventions-digest.md`,
`_research/datamodel-digest.md`, `_WORKLOG.md` (full run), all 20 `_audit/*.audit.md`, and the
code in `_template/`. All test suites re-run live (330 JS + 21 Python — both PASS, confirmed).
All claims below were checked against the code on disk, not against what the worklog/audits say
about the code.

---

## 1. Rule-compliance findings (tree-wide sweep)

### 1.1 CRITICAL — the shipped `_template/unit.json` is not a clean skeleton (violates FR-BT-1/AC-BT-1)

`_template/unit.json` on disk right now is **dev-test-polluted**, not the skeleton bundle-template's
spec requires:

```
meta.unitName: "Modified", meta.teacher: "Test Teacher", meta.subject: "Test Subject"
curriculum.attribution: "Test"
nodes: [{id:"node-root", code:"C1", ...}, {id:"node-child", ...}]
topics/bigIdeas/lessons/cribSheet/resourcesPage/unitAssessment/matrixTemplate: all populated
  with fixture-looking data ("Topic 1", "Big Idea 1", "Example here", "Question here" …)
```

`!NewUnit`'s skill.md (`System/Skillbank/Teaching/!NewUnit/skill.md:47-52`) copies `_template/`
verbatim with `shutil.copytree` and **only rewrites `meta.subject/level/unitName/teacher/dateCreated`**
(step 6) — every other field, including this fixture data, is stamped byte-for-byte into every new
unit a teacher creates. As shipped, `!NewUnit` today produces units pre-populated with fake lessons,
a fake big idea, and a fake crib sheet section, not the empty schema AC-BT-1 promises. This is a
live, on-disk defect, not a hypothetical — I did not find it named in `_WORKLOG.md` or in
`bundle-template.audit.md`/`newunit-skill.audit.md`, which both assume the skeleton is clean.

**Verify**: `cat _template/unit.json` and diff against the skeleton described in
`bundle-template.build.spec.md` §"schema-valid skeleton". Fix: regenerate `unit.json` from the
skeleton generator (or hand-write it back to all-empty) before this ships or before `!NewUnit`
is used again.

### 1.2 `_template/` also carries build/runtime artifacts that `shutil.copytree` will propagate

`_template/__pycache__/serve.cpython-314.pyc` and `_template/serve.log` exist at top level (dated
`Aug 29 22:00`, i.e., from this session's own test runs of `serve.py`). Neither is in AD-18/AD-BT-4's
blessed nine-entry list (`Start Unit.command`, `unit.json`, `images/`, `_ingest/`, `app/`, `StyleGuide/`,
`tests/`, `README.md`, `VERSION`), and `!NewUnit`'s copytree has no ignore-pattern, so both get stamped
into every new unit folder too — `__pycache__` is at least harmless (Python recompiles on mtime
mismatch), but `serve.log` is a stale local access log with no business being copied into someone
else's classroom folder. Low severity but real: house SR-3 ("no unused bytes") and AC-BT-1
("no extra top-level entry") are both violated by what's on disk right now, however this arose. Fix:
delete both, add a `.gitignore`/pre-copy exclusion in `!NewUnit` for `__pycache__` and `*.log`.

### 1.3 `!important` — the three-file breach the run's own cross-sweep found is genuinely gone

Verified: `grep -rn "!important" app/css/` returns only comments *documenting* the rule ("CSS-5: No
!important"), no live declarations. The worklog's claim that Opus fixed
`arbor-tree-print.css:34`, `resources-page.css:136`, `resources-page-controls.css:136` checks out.

### 1.4 Shared-logic duplication (SR-4) — no second implementation found

Checked the specific named risks: `resolveDomain` (one definition, `domain-resolver.js`), `resolveTopic`
and `computeGlyphSet` (both defined once, in `bigidea-list.js`, imported elsewhere), the TIERS
constant (one definition, `document-shell.js`, imported everywhere else). No duplicate found in a
tree-wide grep. This class of defect (the one that hid three `!important` copies) does **not** recur
for these four items.

### 1.5 File-size discipline (SR-1) — three JS files are now well past any reasonable single-job size

CSS has an explicit 150-line cap (CSS-1) and is respected everywhere (max is
`assessment-tier-page.css` at exactly 150). JS has no *stated* numeric cap, but SR-1's "one file, one
job" is a discipline, and three files have grown past what one job plausibly needs:

- `app/js/marking-matrix.js` — **1553 lines** (worklog's own running total said "~1000" after the
  build, then "the biggest repair of the run" added keyboard-nav helpers, unrendered-state wiring,
  and an unbudgeted unit-progress block on top — it is now larger than `local-store.js` and
  `bigidea-list.js` combined were flagged as SR-1 risks for at 720–912 lines).
- `app/js/local-store.js` — 912 lines, carries `ServerClient`, `LocalStore`, and the entire
  `validateUnit()` implementation (61 `INV-DM-*` call sites) in one file. The worklog itself
  flagged this at build time ("validation may want splitting into a sibling module") and it was
  **deliberately not repaired** ("carried to closeout as a recommendation for Luke").
- `app/js/bigidea-list.js` — 873 lines, same deliberate deferral.

None of these is a defect introduced silently — all three were flagged in-run and the decision to
defer was explicit and reasoned (splitting at the end of a build run is riskier than leaving it).
I agree with that call for *this* run, but flag it as still owed: `local-store.js` mixing the
network client, persistence, and all 44 invariant checks in one file is the kind of file that will
be the first place a future bug hides, precisely because SR-1 exists to keep "what does this file do"
answerable in one sentence.

### 1.6 `fetch`/network — confirmed centralized (JS-5 pattern)

`grep -rln "fetch(\|XMLHttpRequest\|WebSocket" app/js/` returns only `local-store.js`. This matches
the worklog's own independent verification and I could not find a counter-example — `lesson-plan-generator.js`
in particular (the module most likely to accidentally reach for a live model call) has zero network
primitives.

### 1.7 Python — stdlib only, confirmed

`serve.py`'s imports are exactly `http.server, socketserver, hashlib, json, logging, sys, os, tempfile,
webbrowser, mimetypes, pathlib, typing` — all stdlib. No `requirements.txt`, no `pip` artifacts anywhere
under `_template/`.

### 1.8 Dead code — the two items the worklog says were deleted are in fact gone

`transitive-topic.js` does not exist on disk (confirmed by `find`). No other obviously-orphaned module
turned up in a quick "does anything import this" pass across `app/js/`.

### 1.9 `.prompt`/`.task` mismatch (D1) — fix is real and complete

`grep -rn "\.prompt\b\|\.task\b" app/js/*.js` (excluding `curriculum.labels.task`, a label string, not
a field) returns only `curriculum-editor.js:478` (`updates.task`, which is the node-kind label field,
confirmed a false-alarm in the worklog) and two **negative** assertions in
`tests/test_unit-assessment-document.js:428-429` proving no stray `.prompt`/`.task` survives a
round-trip. D1 (assessment tiers use `material`/`studentTask`, same shape as lessons) is genuinely
landed — I did not find a second instance of this class of forward-reference mismatch elsewhere
(checked `imageRefs`, `bigIdeaId`, `nodeId`, `coverage[]` field names across the modules that read
them; all consistent with the datamodel digest).

---

## 2. Data-model integrity

`local-store.js`'s `validateUnit()` (lines ~266-700+) references 61 `INV-DM-*` sites covering a large
majority of the 44 invariants directly (structural ones: tree shape, reference resolution, singular
objects, tier completeness, reverse-link absence, two-level big-idea cap, matrix/criteria coverage).
I did not attempt to hand-verify all 44 line-by-line against the validator (that is a day of work on
its own), but spot-checked the ones most likely to be missed:

- **INV-DM-32** (lesson numbers unique/contiguous from 1) — enforced at the *reorder* call sites
  (`lesson-reorder-topic-mode.js`, `lesson-reorder-date-mode.js`) rather than in `validateUnit()`
  itself; I did not find a validator check that would catch a hand-edited `unit.json` with a gap.
  Worth a follow-up: is contiguity enforced only procedurally (by the UI never producing a gap) or
  also structurally (by the loader refusing a gapped file)? Currently it looks like the former only.
- **INV-DM-38/39** (matrix tier-budget allocation, 0.5-boundary, override exclusion) — this is
  arithmetic, not referential, and `validateUnit()`'s INV-DM-* grep did not surface a check for it;
  the allocation logic itself lives in `marking-matrix.js`, which the worklog says "matches the
  spec's worked example exactly" — but that is a builder self-report I could not re-verify against
  a written test asserting the exact worked-example numbers in the time available. Flag for
  someone to confirm a test exists that pins the exact budget split, not just "adds up to 100."
- **INV-DM-17 cascade (AD-BOSS-3)** — confirmed both directions are tested (image-paste's audit and
  the worklog both note dual-direction gate tests; `test_image-paste.js` exists with 16 assertions).

Net: the invariant discipline is real and centralized in one validator (good — this is exactly SR-4's
"share, don't copy-paste" applied to validation), but coverage of the two *arithmetic* invariants
(32, 38/39) is less certain than the referential ones, which dominate the 61 grep hits.

---

## 3. Test quality — not test count

330 JS + 21 Python tests pass. Most of what I sampled is real: `test_tidy-tree.js`,
`test_local-store.js`, `test_coverage-grid.js`, `test_marking-matrix.js`, `test_unit-assessment-document.js`
import the actual module, construct real fixtures, and assert on actual return values/state, including
gate tests in both directions (TEST-7) for the image-deletion refusal and the final-assessment delete
guard. That part of the suite is trustworthy.

### 3.1 CRITICAL — `tests/test_arbor-tree.js` is not a test suite; it is a text-grep of the source file wrapped so it cannot fail

`_template/tests/test_arbor-tree.js` is 238 lines, 9 `test()` blocks, and contributes to the "330 PASS"
/ "160 PASS" tallies celebrated repeatedly through the worklog. Every block except the first two follows
this shape:

```js
test('arbor-tree: three independent chip types rendered (AD-ATB-3)', async (t) => {
  try {
    const fs = await import('fs');
    const content = fs.readFileSync(filePath, 'utf-8');
    assert(hasBI && hasAssess && hasTopic, 'Should independently track all three coverage types');
    ...
  } catch (err) {
    assert(true, 'AD-ATB-3 independence check completed');
  }
});
```

The `catch` block catches **everything**, including an `AssertionError` thrown by the `assert()` calls
inside its own `try`. That means every one of these 8 tests (lines with `assert(true` — I counted 8
occurrences, all in this one file) is structurally incapable of failing: if the real assertion fails,
the exception is swallowed and replaced with an always-true assertion. This is a worse violation of
TEST-6 ("assert on behaviour, not absence of a throw") than a plain empty test would be — it actively
launders a would-be failure into a pass. `arbor-tree.js` is 504 lines and none of its actual behaviour
(the `ArborTree` class — SVG emission, chip layout, coverage-map construction) is exercised by any
test; only `tidy-tree.js` (the pure layout math it delegates to) has genuine coverage, in the separate
`test_tidy-tree.js` file.

This also means every downstream claim resting on "the suite passes" for arbor-tree is unverified:
`arbor-tree.audit.md` marked the build **PASS (clean, zero findings)** — but the auditor verified
claims by reading `arbor-tree.js` source directly (grep-style), the same failure mode as the test file
itself, and never noticed the test file proves nothing. Both the build and its audit passed by reading
source text, not by executing behaviour against it.

**Fix**: rewrite `test_arbor-tree.js` using the TEST-8 hand-built-fake-DOM pattern that
`document-shell`/`lesson-plan-document` already established in this same run (per the worklog's own
"F-a" repair entry, which built exactly this pattern for a different module). Delete the
`try { assert(...) } catch { assert(true) }` shape everywhere it appears — it should never appear
anywhere in this codebase again.

### 3.2 Minor — a few tests assert `doesNotThrow` where a return-value assertion was available

`test_marking-matrix.js:212,263` and `test_unit-assessment-document.js:194` use `assert.doesNotThrow`
on a mutation call without then asserting the resulting state changed as expected. These are not the
laundering anti-pattern in 3.1 — they are a milder TEST-6 miss (proving "it ran" rather than "it did
the right thing"). Low priority; each sits beside other tests in the same file that do assert on state,
so the gap is narrow, not systemic.

### 3.3 `test_arbor-tree.js` distorts the reported test count

Excluding the 9 non-tests in `test_arbor-tree.js`, the suite that actually proves behaviour is closer
to **321 JS tests**, not 330. Not a large gap, but worth correcting in any closeout summary that cites
"330 passing" as evidence of coverage — one file's tests were never capable of failing.

---

## 4. What remains unverified without a browser

These match what `_WORKLOG.md` and the per-build audits already flag as browser-only; I did not find
additional hidden ones, but I list them together here since no single document currently does:

| Item | Where flagged | How to verify |
|---|---|---|
| AC-DS-1/1a — `@page` print geometry, physical page fit | document-shell audit | Open `app/index.html`, print-preview or export PDF, measure against A4 (794×1123 / 1123×794 px @96dpi) |
| AC-ATB-1/3/10 — arbor-tree node overlap, coverage colour distinction, 12pt+ print legibility | arbor-tree audit | Render with realistic data (40+ nodes, 8+ big ideas), print-preview at scale |
| AC-RESB-6/7 — 40-item resources page pagination, 200-char URL wrap | resources-page audit | Populate 40 resource items, print-preview |
| AC-LPG-7 — network-disabled browser gate (no model call reachable) | lesson-plan-generator worklog entry | DevTools → block all network → exercise generator; the `grep -rn fetch` static check (§1.6 above) is necessary but not sufficient proof |
| AC-LPG-5 — regenerate control absent from rendered HTML for an edited lesson | lesson-plan-generator worklog entry | Render an edited lesson, inspect DOM for the control |
| AC-TRB-1/3/4 — traceability scroll-to-highlight, back-to-position navigation | traceability-links audit | Click a cross-reference in a live browser, confirm scroll + highlight + return |
| Crib-sheet 1–2 page hard cap | crib-sheet worklog (self-reported) | The current implementation is a length-based heuristic, not a measured render height — needs a real overflow test with long content, in-browser |
| Print colour fidelity across all 7 sweeps (7 print artboards, style-digest) | style-digest.md | Print or export-to-PDF each of the 7 print CSS files with populated data, compare to mockups |
| **Whether `!NewUnit` actually produces a clean unit** (new, this review) | §1.1 above | Run `!NewUnit`, inspect the resulting `unit.json` — it will currently fail this check until §1.1 is fixed |

---

## 5. Top 5 issues, priority order

1. **`_template/unit.json` is dev-fixture-polluted, not the skeleton the spec promises** (§1.1).
   *Fix*: regenerate/hand-clear `unit.json` to the true empty skeleton before any further `!NewUnit`
   run; add a pre-ship check (e.g. a test asserting `_template/unit.json` has zero nodes/lessons/etc.)
   so this can't silently regress again.

2. **`tests/test_arbor-tree.js` cannot fail — it launders real assertion failures into passes**
   (§3.1). *Fix*: rewrite with the TEST-8 fake-DOM pattern already used elsewhere in this codebase;
   delete the `try/catch → assert(true)` shape.

3. **`marking-matrix.js` at 1553 lines and `local-store.js` at 912 lines both breach SR-1's "one
   file, one job"** (§1.5), deliberately deferred mid-run. *Fix*: split `local-store.js`'s
   `validateUnit()` into a sibling `validate.js` module (lowest-risk split, pure function, no shared
   state); split `marking-matrix.js` by concern (grid rendering / keyboard nav / totals-and-allocation)
   the next time it is touched.

4. **Stray build artifacts (`__pycache__/`, `serve.log`) sit in `_template/` and will be copied into
   every stamped unit by `!NewUnit`'s unfiltered `shutil.copytree`** (§1.2). *Fix*: delete both, and
   add an ignore pattern (`shutil.copytree(..., ignore=shutil.ignore_patterns('__pycache__', '*.log'))`)
   to `!NewUnit`'s skill.md so this class of leak can't recur.

5. **INV-DM-32 (contiguous lesson numbering) and INV-DM-38/39 (matrix tier-budget arithmetic) look
   enforced procedurally by the UI, not structurally by `validateUnit()`** (§2). *Fix*: confirm — and
   if absent, add — a `validateUnit()` check for each, so a hand-edited or externally-generated
   `unit.json` can't silently violate either invariant.

---

## 6. Verdict

**Not yet safe to hand to real teaching work as-is**, for one concrete, fixable reason: the template
a teacher's new unit is stamped from is not currently empty (§1.1). Anyone running `!NewUnit` today
gets a unit pre-seeded with test fixture data ("Big Idea 1", "Example here", a fake student-free
matrix template with placeholder criteria) mixed in with their real content from the first save. That
is a data-integrity problem for the *user*, not just a code-quality one, and it is silent — nothing
in the current test suite or audits would catch it, because every check assumes the skeleton is clean
and none of them re-reads the actual `unit.json` on disk.

Once that is fixed (and it is a small, mechanical fix — regenerate one file), the rest of the codebase
is in genuinely good shape for what it is: a no-framework, stdlib-only, single-teacher local tool. The
invariant discipline is centralized and mostly real, the `!important`/duplication/network-boundary
sweep this run did on itself caught real cross-build defects that per-build audits missed, and the
majority of the test suite exercises real behaviour rather than "didn't throw." The two things that
would most reduce future risk if left unaddressed: the fake test file (§3.1), because it means
"arbor-tree is tested" is currently false despite the suite reporting green, and the growing
1500-line `marking-matrix.js` (§1.5), because it is the file most likely to accumulate an
undetected regression the longer it stays unsplit.

**Risk if shipped exactly as-is**: low-to-moderate. The most likely real-world failure a teacher would
hit is opening their first new unit and finding a stray "Big Idea 1" / "Topic 1" they didn't create
(confusing, not destructive — INV-DM structural checks would still hold on top of the polluted data).
The second most likely risk is a silent behavioural bug in `ArborTree`'s SVG rendering going
undetected in a future edit, precisely because its test file currently cannot report a failure.
