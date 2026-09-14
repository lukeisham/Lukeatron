# CurriculumPreparation — Wishlist

A running backlog of future ideas for this widget. Ranked Low → High by perceived complexity
so the cheapest wins surface first. Reworded lightly for clarity on the way in — intent kept,
nothing invented.

**Once an item is built and ported into `_template/`, it is removed from this table** rather than
kept with a `built` status — the refactor registry's own board (its R-# row) is the permanent
record of what shipped and when, so nothing is lost by dropping the row here. This list stays
scoped to what's still outstanding.

## Ideas

| # | Idea | Complexity | Raised | Status | Notes |
|---|---|---|---|---|---|
| 1 | Reformat the crib sheet for better layout and readability | Low | 2026-09-01 | open | |
| 2 | Clarify the curriculum ingest flow — confirm whether it's paste-into-markdown then click a button, and make that clear in the UI | Low | 2026-09-01 | open | |
| 3 | Vary the test copy's lesson plans so half are one page and half are multi-page | Low | 2026-09-01 | open | Done in `_test/` as R-8 in the refactor registry (test-data-only), awaiting Luke's confirmation |
| 4 | Reorganise how the document tabs, Print button, and Copy button share screen space | Low | 2026-09-02 | open | |
| 5 | Clearer method for adding items to the resource page | Medium | 2026-09-01 | open | |
| 6 | Remove the random blank pages appearing on the assessment grid | Medium | 2026-09-01 | open | |
| 7 | Fix the curriculum map bleeding off the page | Medium | 2026-09-01 | open | Possibly related to #8 |
| 8 | Remove the blank pages bleeding off the page on the curriculum map | Medium | 2026-09-01 | open | Possibly related to #7, and to #6's assessment-grid blank-page cleanup |
| 9 | When a lesson plan fits on one page (no tier pages), show the actual content for all three tiers — Pass, Intermediate, Advanced — on that page, not just the tier colour key at the bottom | Medium | 2026-09-02 | open | |
| 10 | Let grade numbers be updated directly, by score or by grade — editing one score should trigger the fuzzy-logic balancing to recompute all the other scores | High | 2026-09-01 | open | Scoped to criteria (assessment interaction deferred). Built in `_test/` as R-10 — direct hypothetical-score editing with live rebalancing, an Edit Rubric / Enter Marks mode split, 0/x score display, mode-aware print. Awaiting Luke's review before porting |

Status values: `open` · `adopted` (folded into the PRD or a spec — kept here for history) ·
`rejected` (considered and declined, not silently dropped). `built` is not a resting state here —
a built item is removed from the table the moment its port is verified (see the note above); it
never appears alongside these three.

## Conflict log
<!-- Phases 1-3, and Phase 4 up to the PRD's retirement (Step 3) only. Stops updating once the
     PRD is gone — leave what's here as history, don't backfill after. -->
| Date | Wishlist item | PRD/spec section | Nature | Resolution |
|---|---|---|---|---|

Nature values: `duplicate` · `overlap` · `conflict`.
