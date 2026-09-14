---
name: "!AppWishlist"
description: "Cross-cutting capability of !AppDevelopment — maintain a per-project running backlog of future ideas for an app or widget, ranked by perceived complexity and lightly reworded for clarity. Callable in any phase, including cold. Also runs the PRD/spec conflict scan while a PRD exists (Phases 1-3, and Phase 4 before the PRD is retired). Rejected and built items are deleted from the backlog, not kept as dead statuses."
type: Skill
status: Active
core_function: Generate
intent: "Give Luke one place to drop future ideas for a specific app/widget without losing them to conversation, kept ranked and checked against the live PRD/specs so nothing duplicates or contradicts work already spec'd."
version: 1.1.0
dependencies: [templates/wishlist.md]
calibration:
  context: [PersonalResearch]
  level: Extended
  scope: Local
memory_footprint:
  read: [System/Sandbox, System/Widgets, System/Apps]
  write: [System/Sandbox, System/Widgets, System/Apps]
---

## ⚡ TRIGGER
Fires on: "add to the wishlist for <name>", "note this idea for <name>", "what's on the wishlist
for <name>", "wishlist for <name>", "rank the wishlist", or when Luke volunteers a future idea for
a project already underway that is explicitly out of scope for now.
Distinct from the PRD's own `## Notes` section (Phase 1 STEP 4): Notes are stray characteristics
folded into the CURRENT PRD; Wishlist items are deliberately deferred — not going in now, maybe
later.
Runs orthogonally to the phase state machine — callable in any phase, including Phase 4 cold
entry, on any project that has (or should have) a wishlist.

## 🛠️ LOGIC

// EXECUTION_START

**STEP 0 — Locate the project and its wishlist**
  RESOLVE the project folder the same way `!AppDevelopment` STEP 1 does:
    Sandbox project (Phases 1-3, or 4-pending) ➔ `System/Sandbox/<name>/wishlist.md`
    Permanent home (Phase 4)                   ➔ `System/Widgets/<Name>/wishlist.md` or
                                                  `System/Apps/<Name>/wishlist.md`
  IF `wishlist.md` does not exist ➔ CREATE it from `templates/wishlist.md`.

**STEP 1 — Add an idea**
  TAKE Luke's raw idea, however it arrives — a fragment, a rant, a "wouldn't it be nice if…".
  REWORD it lightly into one clear line: keep the intent, drop nothing he said, invent nothing he
  didn't. If a rewording changes the meaning, show him the line before saving it.
  ESTIMATE complexity as a quick gut call, not an analysis:
    Low    ➔ a config value, a copy/wording change, a small self-contained UI tweak
    Medium ➔ a new feature that stays inside one module/spec
    High   ➔ touches multiple modules, a new data shape, or a real architectural decision
  INSERT it into the Ideas table, sorted Low → High (cheapest wins visible first). Stamp today's
  date. Status starts `open`.

**STEP 2 — Query the wishlist**
  READ the Ideas table and report it back ranked, as it stands — do not re-rank on the fly for a
  query, only on STEP 1 insert. Luke may ask for a subset ("what's Low complexity", "what's still
  open") — filter, don't re-derive.
  IF Luke declines an item outright (not deferred, not adopted — just no) ➔ DELETE its row from
  the Ideas table immediately. Rejected ideas are not kept for history; the wishlist only tracks
  what's still live or still pending a decision.

**STEP 3 — Conflict scan (bound to the PRD's lifetime — G-5)**
  RUNS only while a PRD exists for this project: Phases 1-3, and Phase 4 before Step 3 of
  `phase4-refactor.md` retires it. Once the PRD is gone, SKIP this step entirely — there is
  nothing left to check against, and the Conflict log stays as history, not an active check.
  FOR each `open` wishlist item, COMPARE it against the current PRD and any current specs:
    duplicate ➔ the PRD/spec already covers this idea in full
    overlap   ➔ it partially covers it, or a spec section is heading the same direction
    conflict  ➔ the idea contradicts a stated PRD decision or boundary
  ON any hit ➔ APPEND a row to the Conflict log (date, item, PRD/spec section, nature) and
  REPORT it to Luke. Never silently change the PRD, the specs, or the wishlist item's status —
  Luke decides whether to adopt, merge, or leave it. If Luke adopts an item into the PRD, mark it
  `adopted` in the Ideas table with a pointer to where it landed.
  Called automatically at: Phase 1 STEP 6 (PRD read-back), Phase 2 STEP 6 (propagate change),
  Phase 3 STEP 1 (completeness check before freeze) — see those files.

**STEP 4 — Phase 4 carry-forward**
  The wishlist is NOT one of the design documents retired in `phase4-refactor.md` STEP 3. It moves
  with the project into its permanent home (STEP 1 of that phase) and keeps running.
  WHEN an accepted refactor-loop change (`phase4-refactor.md` STEP 7) matches a wishlist item and
  is ported into `_template/`, DELETE that item's row from the Ideas table — built ideas don't
  linger as a status, they're just gone from the backlog.

// EXECUTION_END

## ✅ OUTPUT
`wishlist.md` sitting beside the project's other files (Sandbox during design/build, permanent
home after Phase 4), always ranked Low → High, holding only what's still live: `open` or `adopted`
items. Built and rejected ideas are removed on the spot, not carried as dead statuses.

**Validation Check (Self-Test)**
```
VERIFY every idea has a complexity, a date, and a status
VERIFY the Ideas table is sorted Low → High after any insert
VERIFY the Ideas table carries no `built` or `rejected` rows — those are deleted, not marked
VERIFY the Conflict log carries a row for every duplicate/overlap/conflict found while the PRD
  was live, with a resolution or an open flag to Luke
VERIFY wishlist.md is never among the files deleted at Phase 4 Step 3
ELSE ➔ repair the file before reporting back to Luke
```

**Error Path**
```
CATCH wishlist-missing    ➔ create it from the template; do not treat an empty wishlist as an error.
CATCH prd-gone (Phase 4)  ➔ skip the conflict scan silently; this is expected, not a failure.
CATCH project-not-found   ➔ ask Luke whether this is a new project (hand to Phase 1) or a naming
                            mismatch.
CATCH [*]                 ➔ report, hold, leave the wishlist file accurate.
```
