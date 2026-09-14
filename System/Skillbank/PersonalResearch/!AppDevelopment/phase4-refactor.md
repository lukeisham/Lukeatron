---
name: "!AppRefactor"
description: "Phase 4 of !AppDevelopment — move a built app or widget to a permanent home as a template plus a clearly-labelled test copy with obviously fake data, delete the design documents only after the new location is verified, then refactor the test on Luke's feedback and fold the result back into the template. Can be run cold on an app or widget this skill set never built."
type: Skill
status: Active
core_function: System
intent: "Give a finished build a permanent template, a safe place to try changes, and a registry that makes refactoring resumable."
version: 1.1.1
dependencies: [templates/refactor-registry.md]
calibration:
  context: [PersonalResearch]
  level: Extended
  scope: Local
memory_footprint:
  read: [Memory/Long-Term/Coding]
  write: [System/Widgets, System/Sandbox]
---

## ⚡ TRIGGER
Phase 4 of `!AppDevelopment`, or `!AppRefactor` directly.
Also fires cold, with no Phase 1–3 history: "make this widget a template", "refactor the <name>
app", "give <name> a permanent home", "set up a test copy of <name>".

## 🛠️ LOGIC

// EXECUTION_START

**STEP 0 — Establish what you are working with**
  MATCH entry CASE
    from Phase 3 ➔ READ the Sandbox registry, the PRD, and the specs. There is a migration to do.
    cold         ➔ ASK Luke where the existing app/widget lives. There is no PRD, no specs, and
                   nothing to delete. Skip STEP 3 and STEP 4 entirely; go STEP 1 → 2 → 5.

**STEP 1 — Agree the permanent home**
  PROPOSE a location and get Luke's explicit confirmation. Do not move anything until he confirms.
  House convention:
    widget ➔ `System/Widgets/<Name>/`
    app    ➔ `System/Apps/<Name>/` (create the parent if this is the first)
  The permanent home holds three things, always together, always siblings:
    `_template/`   the canonical copy — clean, no data, the thing that gets cloned
    `_test/`       a working copy, clearly labelled as a test, populated with obviously fake data
    `refactor-registry.md`
  IF a `wishlist.md` exists for this project (from Phases 1-3 in Sandbox) ➔ CARRY it forward into
  the permanent home unchanged, as a fourth sibling. It is not a design document, is not retired
  in STEP 3, and keeps running as the project's idea backlog (see `wishlist.md`).
  ASSERT the destination does not already contain a different project ELSE stop and ask.

**STEP 2 — Copy, then verify, then and only then anything else (G-2)**
  COPY the built app/widget into `_template/`.
  VERIFY the copy: file-by-file, same count, same names, same contents, executable bits preserved.
  RUN whatever the project's own tests or launch check are; a template that does not run is not a
  template.
  REPORT the verification result to Luke in plain terms — files copied, checks run, what passed.
  IF verification fails ➔ STOP. Fix or roll back. The source is not touched.

**STEP 3 — Retire the design documents (skipped on cold entry)**
  Only after STEP 2 has passed and Luke confirms:
    DELETE the Sandbox PRD, specs, `build.md`, and the development registry.
    `wishlist.md` is explicitly NOT part of this deletion — it was already carried forward in
    STEP 1 and keeps running. Deleting it here would be a mistake, not a simplification.
    ROUTE through `!Checkpoint`; anything with durable value goes to `!ArchiveMemory` first, not
    to the bin.
  RECORD in the refactor registry what was deleted, when, and which verification authorised it.
  IF Luke does not confirm, or `!Checkpoint` cannot run ➔ fail closed: keep the documents, mark
  them `superseded` in the registry, and continue. Never delete on assumed permission.

**STEP 4 — Fold the documentation spec down into the template's README**
  **No spec survives Phase 4.** The template is a raw, current-version instance of the working
  app or widget — not a kit for rebuilding it. Specs are rebuild instructions; once the thing is
  built and runs, they are a second description of code that already describes itself, and they
  go with everything else in STEP 3.
  The documentation spec is the single exception, and it does not survive **as a spec**. Before
  the Sandbox copy is deleted, fold its four contents down into ONE short `README.md` written
  into `_template/`:
    - the key architectural and functional decisions, each with its reason
    - cross-boundary behaviour — what crosses a module or host boundary, and what breaks if it changes
    - the lightweight ASCII navigation map
    - the granted Vibe-Coding rule exceptions, so a later agent does not "correct" a deliberate break
  It stops being a design document and becomes part of the app. Keep it to what the code cannot
  carry (SR-7): no function walk-throughs, no restated logic, no usage tutorial, nothing the code
  already says through its own names. If a line of it could be deleted and the code would still
  tell you the same thing, delete the line.
  THEN DELETE the documentation spec itself along with the rest.

**STEP 5 — Build the test copy**
  COPY `_template/` to `_test/`.
  LABEL it unmistakably: a banner or title reading TEST, the word TEST in the folder and in any
  window title, so it can never be mistaken for the real thing at a glance.
  POPULATE it with clearly fake data — obviously invented names, dates, and values that no one
  would read as real. Never real content, never Luke's actual data, never anything that looks
  plausible enough to be trusted.
  The test copy, its data, and the refactor registry always live beside the template. They are
  not tidied away when a refactor finishes.
  RECORD the **divergence allowlist** in the refactor registry: the exact, named set of
  differences `_test/` is permitted to carry that `_template/` does not — normally just the data
  file(s), the TEST banner/title/launcher markers, and the seed/fake-data script's own output
  (generated images, caches). Anything not on this list is drift, not a label. Keep the list
  short; a long list is a sign the test copy is diverging in ways beyond labelling and data.

**STEP 6 — Write the refactor registry**
  WRITE `refactor-registry.md` from `templates/refactor-registry.md`:
    - what the app/widget is, in two lines
    - where the template is, where the test is
    - the granted Vibe-Coding rule exceptions, carried forward
    - a refactor board: one row per requested change — requested / in test / accepted / in template
      — plus a `Health` column, scored by STEP 7's Refactor Health Check immediately before each port
    - a Resume block: what a cold agent reads first
  This registry is the resume point for every future session on this project.

**STEP 7 — Refactor loop**
  REPEAT
    COLLECT Luke's feedback on the test copy
    APPLY the change **in `_test/` only** — the template is never edited directly
    ASSERT the change complies with the Vibe Coding Rules; on a collision, apply G-1's permission
      gate and record any granted exception in the registry and the template's code guide
    SHOW Luke the result; update the refactor board
  UNTIL Luke accepts the change
  RUN the **Refactor Health Check** (below) against the accepted change; record the score in the
    board row's `Health` column
  MATCH score CASE
    8/8 (10)  ➔ proceed to port; the row will close as `in template`
    6-7       ➔ proceed to port, but leave the row open with the unmet diagnostic item(s) named —
               never close a row ahead of what it actually passed
    <=5       ➔ do NOT port. Stay `in test`. Fix the named gap(s) first, then re-run the check.
  THEN PORT the accepted change into `_template/`, strip the fake data back out, and VERIFY the
  template still runs clean.
  IF the accepted change matches an open item in `wishlist.md` ➔ DELETE its row there once the
  port is verified (see `wishlist.md` STEP 4) — built ideas are removed, not marked. The conflict
  scan itself (`wishlist.md` STEP 3) does not run here — the PRD is gone by this point (STEP 3
  above), so there is nothing left to check new wishlist ideas against; the wishlist still accepts
  new ideas, it just isn't cross-checked.
  THEN DIFF `_test/` against `_template/`, file by file. Every difference must be explained by the
  divergence allowlist (STEP 5) — the data file(s), the TEST markers, or seed-script output.
  IF an unexplained difference is found ➔ the port was incomplete or something else changed
  underneath it: STOP, name the file(s), and either finish the port or update the allowlist with a
  reason, whichever is true. Never leave an unexplained difference unresolved on the board.
  Rejected changes are reverted in `_test/` and marked `rejected` on the board, not silently dropped.

**Refactor Health Check** — run once per board row, immediately before the port (STEP 7). Turns
per-row verification from freehand judgement into a reproducible eight-question pass, the same
scored-checklist pattern behind `!RefactoringUI` / `!UXHeuristics` / `!DesignEverydayThings` /
`!Microinteractions`, but scoped to product quality rather than visual/UX polish — this checks
whether the change is *sound*, not whether it looks good.

`score = round(satisfied / 8 × 10)`

| # | Question | If No → Action |
|---|---|---|
| 1 | Does the change handle its own errors — no silent failure, no blank screen on bad input? | Wrap in an explicit exception/catch (PY-6, JS-2); show something, don't fail silent. |
| 2 | Does it degrade gracefully on missing or empty data? | Add the empty/edge case now. |
| 3 | Is every new or changed function reachable from something a user can actually click/trigger? | Grep for call sites outside its own file and outside the test suite. A function only the test suite calls is not wired in. |
| 4 | Do the project's own tests still pass after the change? | Fix before continuing; do not port on a red suite. |
| 5 | Does `_test/`/`_template/` still diff clean against the divergence allowlist? | Finish the port, or name the new item and add it to the allowlist with a reason. |
| 6 | (widget only) Was it exercised inside its named host, not just standalone? | Open it in the host before closing the row. |
| 7 | If a Vibe-Coding rule exception was introduced, is it recorded in both the registry and the template's README? | Add both now, with the reason (G-1). |
| 8 | Is the README's cross-boundary section still accurate after this change? | Update it — SR-7's scope, nothing more. |

**Common Mistakes**
| Symptom | Why it fails | Fix |
|---|---|---|
| "Works on my test data" | Only tried the happy path / invented data | Add one edge case — empty, malformed, boundary — before porting. |
| "Looks done, wasn't wired up" | Built and tested in isolation, never connected to the live UI | Grep for real call sites, not just test-suite call sites. |
| "Registry says more than the code does" | Board row marked `accepted`/`in template` before verification finished | Never advance status ahead of a passed diagnostic. |
| "Quiet scope creep" | A small requested change touched files the board row never named | Cite the row number in every file touched; anything else is a new row, not a footnote. |

// EXECUTION_END

## ✅ OUTPUT
A permanent home containing `_template/` — a raw, current-version instance of the working app
or widget, carrying nothing but its code and one short `README.md` — a labelled `_test/` full of
obviously fake data, and `refactor-registry.md`.

**Validation Check (Self-Test)**
```
VERIFY the new location was confirmed by Luke before anything moved
VERIFY the copy was checked file-by-file and the project's own checks were run and reported
VERIFY nothing was deleted before that verification passed and Luke confirmed
VERIFY _template/ carries the working code plus README.md and NO spec, PRD, or build file
VERIFY _test/ is labelled TEST and contains no real or plausible-looking data
VERIFY _template/, _test/ and refactor-registry.md are siblings
VERIFY wishlist.md, if the project had one, was carried into the permanent home and is NOT among
  the files deleted in STEP 3
VERIFY the template runs clean after every ported change
VERIFY _test/ and _template/ are file-for-file identical after every ported change, except for the
  registry's recorded divergence allowlist
VERIFY every ported board row carries a recorded Health score, and no row scoring <=5 was ported
ELSE ➔ stop and report; keep both copies
```

**Error Path**
```
CATCH verification-failed   ➔ STOP. Roll back the copy. Delete nothing. Report what differed.
CATCH checkpoint-unavailable ➔ fail closed: keep the design documents, mark them superseded.
CATCH template-broken-after-port ➔ revert the port, keep the change in _test/, tell Luke.
CATCH unexplained-divergence ➔ STOP. Name the file(s) the diff found. Finish the port or update the
  allowlist with a reason — do not close the refactor board row either way until resolved.
CATCH health-check-failed (score <=5) ➔ do not port. Name the failing diagnostic row(s) on the
  board. Stays in test until re-run scores 6+.
CATCH no-existing-app (cold entry) ➔ this is not a Phase 4 job; offer Phase 1 instead.
CATCH [*]                   ➔ update the refactor registry, report, hold.
```
