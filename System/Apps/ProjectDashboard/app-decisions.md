# Project Dashboard — Decisions

## Approvals

What Luke has signed off. A draft and an approved document look identical on disk — this table is
the only difference. A decision that deliberately reverses an earlier one also goes here, so a
later agent does not "restore" the old behaviour.

| Date | Approved | Version / scope |
|---|---|---|
| 2026-09-12 | Promoted to the live Dashboard on :8789, replacing ProjectDashboard | — |
| 2026-09-12 | No `_test/` copy — changes are made directly on the live app | — |
| 2026-09-14 | Lane colours reopened: each lane gets its own hue (reverses the 2026-09-12 two-accent decision); `data-lane-hues="mono"` toggle restores the shared rail | `app/tokens.css` |
| 2026-09-15 | Drag-and-rearrange of a project's Next Actions, persisted to `registry.md` — deliberately reverses `writes.py`'s old "named fields only, no positional API, no drag" decision (retired AD-2) | plan `projectkanban-next-actions-drag-reorder` |
| 2026-09-28 | Flattened from `_template/` to the app root; refactor registry retired | — |
| 2026-09-29 | Key decisions (D-1–D-16) and their reasoning moved here from README, per `!AppDevelopment` v2.1.0's "no decision of any kind lands in README" — README now points here instead | — |

## Key decisions

Not every decision — only one Luke explicitly wants logged, not left to the code or README. Each
gets its reason; the reason is the point. Append the moment Luke flags one, whenever that is.

| # | Decision | Reason | Rejected alternative |
|---|---|---|---|
| D-1 | A separate app, its own copies of the parsing/write/palette modules rather than sharing the earlier Project Dashboard's | This app was built to replace the earlier Project Dashboard; divergence was the intended outcome, not a cost | — |
| D-2 | Only `model` derives a fact; `today` is passed in | Two surfaces working out "overdue" for themselves disagree within a week; injecting the clock makes every date rule testable with no filesystem | — |
| D-3 | Every derived value renders as **guessed**, not stated | A confident wrong mark is worse than a visibly uncertain one | — |
| D-4 | A stale write is refused, never merged or locked | A single-user local app must never leave a lock behind after a crash | — |
| D-5 | The board is read-only; all five edits live in the project view | One place where writes happen is one place to get the guards right | — |
| D-6 | No drag and drop | A dragged card cannot say whether the due date, the owner or the lane changed — `writes` must never be handed a guess | — |
| D-7 | Linked rows fail closed — read-only, with a plain-English reason | `!ProjectSweep` owns cross-copy sync; the board must not race it | — |
| D-9 | A note names its section of `notes.md`, defaulting to Scraps & ideas | 🧭 Agent guidance steers every agent on that project — landing there must be deliberate | — |
| D-10 | The browser draws the board | Matches ProjectDashboard's own approach; the instant toggles require it | — |
| D-11 | Every toggle is a CSS class flip; the board renders once | The only way "more colour and animation" costs nothing | — |
| D-12 | Grouping repeated stems is a rendering rule, never a data rule | The store keeps every row distinct; only the page shows one stem | — |
| D-13 | Nothing the browser loads may reference an external file | Keeps an offline copy free; proved itself on day one when the mockups wouldn't render until self-contained | — |
| D-14 | Screen text serves the reader; build explanation lives in comments | The server sends codes; the browser writes the sentence | — |
| D-15 | `model`/`stores` carry purpose, definition of done, decision log, events, documents, people and mtime onto `ProjectView` as plain passthrough | Keeps D-2's single point of derivation; avoids a second endpoint or the browser reading files directly | — |
| D-16 | A row's own 🔁 Recur cell (`recurring_if_done` in `stores`/`model`/`task-row.js`) is read-only in the browser — reopening a Done recurring row is done by a separate `recur.py`, run on a schedule, never by an in-app edit | Keeps D-5's "one place edits happen" — the browser's five edits change what's on the page now; a cadence firing later is a different kind of write and gets its own script rather than a sixth edit path | — |

(D-8 does not exist in this sequence — the gap is preserved from the source record, not a copy error.)

## Rule exceptions

Deliberate breaks from `Memory/Long-Term/Coding/vibe-coding-rules.md`, each granted by Luke after
being asked with the rule ID and a reason. Code that matches a row here is intentional — do not
"fix" it.

| Rule ID | Where it applies | Reason | Granted |
|---|---|---|---|
| SR-4 — share, don't copy-paste | The whole app: its own copies of the parsing, write and palette modules rather than sharing ProjectDashboard's | A new app expected to replace the old one; divergence was the intended outcome | 2026-09-10 |
