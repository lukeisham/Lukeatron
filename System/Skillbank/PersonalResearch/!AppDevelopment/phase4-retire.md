---
name: "!AppRetire"
description: "Phase 4 of !AppDevelopment — once the build runs, write README.md with each section pitched at its own reader: Purpose first in ≤1 paragraph (human + agent), an optional Launch/restart dot-point list (human only, omitted when opening the app is itself the instruction), a light ASCII-style Navigation site map (human + agent, no per-file comments), and Cross-app behaviour always stated (written AI for AI — including any cross-app/multi-file architecture; no decisions of any kind, anywhere in README). Then delete _build/ (PRD, specs, build.md) after Luke confirms. app-decisions.md and wishlist.md stay — the code is self-documenting, so app-decisions.md only ever holds Luke's approvals, a decision he explicitly flagged, and granted rule exceptions. The code is also the style guide — no separate style file is written. After that, refinement is ordinary editing on the live app, guarded by git, tests and a Refactor Health Check. Can be run cold on an app or widget this skill set never built."
type: Skill
status: Active
core_function: System
intent: "Leave a built app carrying only its code, a short README and its decisions — nothing that re-describes code that already describes itself."
version: 2.1.0
dependencies: [templates/readme.md, templates/app-decisions.md]
calibration:
  context: [PersonalResearch]
  level: Extended
  scope: Local
memory_footprint:
  read: [Memory/Long-Term/Coding]
  write: [System/Apps, System/Widgets]
---

## ⚡ TRIGGER
Phase 4 of `!AppDevelopment`, or `!AppRetire` directly.
Also fires cold: "retire the build docs for <name>", "give <name> a README".

## 🛠️ LOGIC

// EXECUTION_START

**STEP 0 — Establish what you are working with**
  MATCH entry CASE
    from Phase 3 ➔ `_build/` exists and the code at the folder root runs.
    cold         ➔ ASK Luke where the app/widget lives. No `_build/`: skip STEP 2 and STEP 3;
                   run STEP 1 only (create `app-decisions.md` if missing, from any README
                   exceptions section). There is no doc spec to fold cold, so README is left as-is.

**STEP 1 — Verify the build**
  RUN the project's own tests and its launch check; a build that does not run is not built.
  IF `kind` = widget ➔ exercise it inside its host app (`System/Apps/<Host>/`).
  REPORT the result to Luke in plain terms — checks run, what passed.
  IF verification fails ➔ STOP. `_build/` stays; the build is not finished.

**STEP 2 — Write README.md**
  **No spec survives Phase 4.** Specs are rebuild instructions; once the thing runs, they are a
  second description of code that already describes itself.
  WRITE `README.md` at the folder root from `templates/readme.md`. Each section has a fixed
  audience — write it for that reader, not the others:
    - **Purpose** (for Luke, as much as for an agent) — one paragraph of prose, at the very start,
      trimmed from the PRD's Purpose.
    - **Launch / restart** (for Luke — plain dot points, not written for an agent) — OPTIONAL.
      Include it only when there is something non-obvious to say: a server to start, a hook to
      re-run, a URL/port to open. Omit the whole section (not a stub) when opening the app IS the
      instruction. Brief, imperative, copy-pasteable commands — no jargon a human would have to
      look up.
    - **Navigation** (for Luke, as much as for an agent) — an ASCII-style site map, light:
      structure only, no per-file "what it does / why it's separate" commentary. A file's own name
      and contents carry that; if it needs saying, say it in the file, never in README.
    - **Cross-app behaviour** (written AI for AI — dense and technical is fine, it does not need
      to read as prose) — always present, even when there is none (say so outright rather than
      omitting the section): what crosses a module or host boundary, what each side may assume,
      what breaks if it changes. A widget's host boundary always belongs here.
      **The code is the style guide** — no value, token, colour, size or duration is restated here.
      The one exception: if styling is split across more than one file, or a shared HouseStyle
      classification governs how every file relates to a chassis, name that here — it is the one
      style fact that crosses files and the code's own comments cannot carry.
    - one line pointing to `app-decisions.md` for approvals, any logged decision, and granted
      rule exceptions (not a copy)
  There is no decisions section to transcribe — the documentation spec never had one; the code is
  self-documenting, and anything cross-app or multi-file already sits in Cross-app behaviour, not
  in a decisions list. **No decision of any kind lands in README.** If Luke flagged one along the
  way, it is already in `app-decisions.md` → Key decisions (STEP 4 of `!AppDevelopment` itself,
  and phase2-specs.md STEP 2, record it live) — nothing further to do here.
  IF `kind` = widget ➔ also ADD one line to the HOST app's README → Cross-app behaviour naming
  the widget (`System/Widgets/<Name>/`), where it mounts, and what it does for the host app — so
  the host app knows what is nested inside it. Nothing else in the host app's folder changes.
  Keep README to what the code cannot carry (SR-7). If a line could be deleted and the code would
  still tell you the same thing, delete the line.

**STEP 3 — Delete `_build/`**
  Only after STEP 1 has passed and Luke confirms:
    DELETE `_build/` (PRD, specs, build.md). ROUTE through `!Checkpoint`.
    Git history keeps every version; nothing is archived by hand.
    `app-decisions.md` and `wishlist.md` are NOT part of this deletion.
  APPEND to `app-decisions.md` → Approvals: today · "build accepted; build docs retired".
  IF Luke does not confirm, or `!Checkpoint` cannot run ➔ fail closed: keep `_build/`.

**After Phase 4 — refinement is ordinary editing**
  There is no template, no test copy and no refactor board. A requested change is:
    COMMIT the current state → EDIT the live app → RUN its tests (fixture data) → SHOW Luke.
    IF the change writes to a real data file it never wrote before ➔ take a dated copy first (G-2).
    RUN the Refactor Health Check below before calling the change done.
    IF Luke accepts a change that reverses an earlier decision ➔ APPEND it to Approvals.
    IF a Vibe-Coding exception is granted ➔ APPEND it to Rule exceptions (G-1).
  Rejected changes are reverted with git. Larger changes go through `!CreatePlan` as usual.

**Refactor Health Check** — run once per change, before calling it done. A reproducible
seven-question pass on whether the change is *sound*, not whether it looks good.

`score = round(satisfied / applicable × 10)`

| # | Question | If No → Action |
|---|---|---|
| 1 | Does the change handle its own errors — no silent failure, no blank screen on bad input? | Wrap in an explicit exception/catch (PY-6, JS-2); show something, don't fail silent. |
| 2 | Does it degrade gracefully on missing or empty data? | Add the empty/edge case now. |
| 3 | Is every new or changed function reachable from something a user can actually click/trigger? | Grep for call sites outside its own file and outside the test suite. |
| 4 | Do the project's own tests still pass after the change? | Fix before continuing; never leave the live app on a red suite. |
| 5 | (widget only) Was it exercised inside its host app, not just standalone? | Open it in the host app. |
| 6 | If a Vibe-Coding exception was introduced, is it in `app-decisions.md`? | Add it now, with the reason (G-1). |
| 7 | Is README's cross-app behaviour section still accurate after this change (including its cross-file style note, if it has one)? | Update it — SR-7's scope, nothing more. |

Score ≤5 ➔ revert or fix before leaving it live. 6-9 ➔ tell Luke which question is unmet.

**Common Mistakes**
| Symptom | Why it fails | Fix |
|---|---|---|
| "Works on my test data" | Only tried the happy path / invented data | Add one edge case — empty, malformed, boundary. |
| "Looks done, wasn't wired up" | Built and tested in isolation, never connected to the live UI | Grep for real call sites, not just test-suite call sites. |
| "Broke the real data" | First write to a data file with no copy taken | Dated copy before the first write, every time (G-2). |
| "Quiet scope creep" | A small change touched files it never named | Anything else is a new change, not a footnote. |

// EXECUTION_END

## ✅ OUTPUT
The app folder carrying its code, `tests/`, one short `README.md`, `app-decisions.md`, and
`wishlist.md` if one exists. No `_build/`, no separate style file — the code is the style guide.

**Validation Check (Self-Test)**
```
VERIFY the build was verified (tests + launch; widget in its host app) before _build/ was deleted
VERIFY a widget is named in its host app's README → Cross-app behaviour
VERIFY nothing was deleted before Luke confirmed
VERIFY the folder carries no spec, PRD, build.md, StyleGuide.md, _template/, _test/ or registry file
VERIFY README opens with Purpose (≤1 paragraph of prose) before anything else
VERIFY Launch/restart, if present, is plain dot points a human can run without interpreting them —
  and is absent (not a stub) if opening the app is itself the whole instruction
VERIFY README's navigation map is an ASCII-style site map, structure only
VERIFY README's Cross-app behaviour section is present, even if it just says there is none
VERIFY README carries no per-file comments and no decisions of any kind
VERIFY any cross-app or multi-file architecture appears under README's Cross-app behaviour
VERIFY README points to app-decisions.md rather than copying its tables
ELSE ➔ stop and report
```

**Error Path**
```
CATCH verification-failed      ➔ STOP. Keep _build/. Report what failed.
CATCH checkpoint-unavailable   ➔ fail closed: keep _build/.
CATCH change-broke-app         ➔ git revert the change, tell Luke.
CATCH no-existing-app (cold)   ➔ this is not a Phase 4 job; offer Phase 1 instead.
CATCH [*]                      ➔ report, hold.
```
