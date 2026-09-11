# Project Dashboard — Wishlist

A running backlog of future ideas for this app. Ranked Low → High by perceived complexity
so the cheapest wins surface first. Reworded lightly for clarity on the way in — intent kept,
nothing invented.

**Once an item is built and ported into `_template/`, it is removed from this table** rather than
kept with a `built` status — the refactor registry's own board (its R-# row) is the permanent
record of what shipped and when, so nothing is lost by dropping the row here. This list stays
scoped to what's still outstanding.

## Ideas

| # | Idea | Complexity | Raised | Status | Notes |
|---|---|---|---|---|---|
| 1 | Toggle between light and dark mode | Low | 2026-09-07 | open | |
| 2 | Add a speed control for the ticker | Low | 2026-09-07 | open | |
| 3 | Smooth out the board's spacing/interaction feel — currently feels jumpy | Medium | 2026-09-07 | open | |
| 4 | Let a quad be selected on its own, to filter/focus the board to just that context | Medium | 2026-09-07 | open | |
| 5 | Drill down from the board into a single project's detail | Medium | 2026-09-07 | open | |
| 6 | Fix tasks not visible in stacks | Medium | 2026-09-07 | open | |

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
