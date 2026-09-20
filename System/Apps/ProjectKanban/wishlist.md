# ProjectKanban — Wishlist

A running backlog of future ideas for this app/widget. Ranked Low → High by perceived complexity
so the cheapest wins surface first. Reworded lightly for clarity on the way in — intent kept,
nothing invented.

## Ideas

| # | Idea | Complexity | Raised | Status | Notes |
|---|---|---|---|---|---|
| 1 | Undo the last write — restore the cell's previous value from `Logs/edits.log` | Low | 2026-09-10 | open | **Correction 2026-09-20:** `Logs/edits.log` records only the NEW value, not the old — so `set_cell` must first start logging `prev=`, and edits made before that cannot be undone. Undo must also re-take the mtime so it can be refused like any other write. Planned in `System/Plans/New/projectkanban-undo-and-keyboard-nav.md`. |
| 2 | Keyboard navigation — arrow keys between cards, Enter to open, `c` to copy | Low | 2026-09-10 | open | It is a daily-use personal tool; the mouse round-trip is the cost. Enter/Space to open already work; arrows and `c` are the gap. Planned in the same plan as #1. |
| 4a | A filter box — type and the board narrows live (project title, action text, person, glyph) | Low | 2026-09-10 | open | Offered for the PRD at Q10 and not taken. With 40 projects and 283 rows this is the likeliest thing to be wanted on day two. |
| 4 | Filter the board to one person — every project and action involving them | Medium | 2026-09-10 | open | Needs the person glyph's resolution working first (`people:`, the People section, and the Owner column). |
| 14 | General visual pass on buttons and the toolbar — current controls look rough/unpolished | Medium | 2026-09-13 | open | Raised alongside #13; no specific control named yet — a `!HouseStyle` pass over `controls/controls.css` and the card/board button styles. |
| 15 | Merge the Kind (per-action lane, this app's own field) and State (per-action urgency, `!ProjectSweep`'s field) — they now share almost the same five-word vocabulary since the 2026-09-13 State rename (Mine/Delegate/Waiting/Incoming/Undefined vs `mine`/`delegate`/`waiting`/`incoming`/`unshaped`) | High | 2026-09-13 | open | Two columns doing conceptually the same "whose move" job. Simplest path: `!ProjectSweep` writes the same value into a row's Kind that it already computes for State, and `resolve_lane` keeps reading Kind as today — but `!ProjectSweep`'s whole-project State roll-up currently derives from State's own precedence order across Next Actions, so folding it into Kind means rewriting that roll-up, not a plain rename; touches every live registry's Next Action rows plus this app's own rollup function (`model._project_lane`). Needs a proper plan (`!CreatePlan`) before anyone touches it. |
| 16 | A project/task's State should be driven off of *which action is the Next Action*, not set independently of it | Medium | 2026-09-13 | open | Overlaps #15's Kind/State merge — both are pointing at the same underlying gap: today State is a value `!ProjectSweep` computes and writes, not a live derivation from "what's the Next Action right now." Worth folding into the same `!CreatePlan` as #15 rather than solving twice. |

<!-- 2026-09-13: a "new AI skill to triage Next Actions" idea (+ its calendar-events question) was logged here as #17/#18 and moved out same day at Luke's correction — it's skill-level system work, not a ProjectKanban app/UI feature. Now tracked in PR-01-lukeatron-future-improvements/registry.md's Future Agent Actions. -->

Status values: `open` · `adopted` (folded into the PRD or a spec — kept here for history).
`built` and `rejected` are not statuses that persist here — once an idea is ported into
`_template/` (built) or Luke declines it outright (rejected), its row is deleted from this table
on the spot (the `!AppWishlist` skill's own rule). Built history lives in
`refactor-registry.md`'s Migration log instead; a rejection's reasoning, if worth keeping, goes
there too rather than lingering on a dead row here.

## Conflict log
<!-- Phases 1-3, and Phase 4 up to the PRD's retirement (Step 3) only. Stops updating once the
     PRD is gone — leave what's here as history, don't backfill after. -->
| Date | Wishlist item | PRD/spec section | Nature | Resolution |
|---|---|---|---|---|

Nature values: `duplicate` · `overlap` · `conflict`.
