# ProjectKanban

A Kanban board over every tracked Lukeatron project — swimlanes by whose move it is, columns by
how soon it is due — opened in a browser from Dropbox, with a small set of safe edits that write
back to the markdown so the board still works when no agent is available. Replaced
**ProjectDashboard** (retired 2026-09-12, archived to `Archive/ProjectDashboard-app-2026-09-12/`)
as the project dashboard kept live on `:8789`.

## Cross-boundary behaviour

| From | To | What crosses | What breaks if it changes |
|---|---|---|---|
| the files | `stores` | `_tracking.yaml`, each `registry.md`, a listing of `Plans/New/`, plus each file's mtime | nothing else reads these bytes; a second reader would drift from this one within a week |
| `stores` | `model` | plain records, each field carrying whether the file **stated** it or it was absent | `model` can no longer tell a fact from a guess, and the *guessed, not stated* treatment silently becomes a lie |
| `model` | `server` | one board object — projects placed in a lane and a column, counts, linked flags, raw date text, plus each project's purpose, definition of done, decision log, events, documents, people and mtime, and each task's raw kind/status/state | every surface reads this exact shape; a field renamed here breaks the board and the project page at once, which is the point |
| `server` | browser | `GET /api/board.json`, the board verbatim | the one contract the whole browser side depends on |
| browser | `server` → `writes` | an edit intent: project id, row identity, **field name**, value, and the mtime as read | drop the mtime and two tabs overwrite each other silently — the 409 *is* the concurrency design |
| `writes` | the files | one cell, or one appended line, plus `pending_sweep: true` on that project's `_tracking.yaml` row | `!ProjectSweep` loses its signal that the board moved outside the skill layer |
| `controls` | `board`, `outline-print` | the token file, and class/attribute flips on the root element | a colour literal written anywhere else means a channel means two things; a toggle that needs JS stops being free |
| app | wiki viewer `:8787` | a hyperlink, nothing else | nothing — it is a door. The app never reads `LukeatronWiki/` |
| app | `notes.md` | an appended line under a **named section** | a line under 🧭 Agent guidance is a standing instruction to every agent; the section is never a default |

**The one-way rules**, enforced by what is imported rather than by a flag: `stores` and `model`
never import `writes`. `model` never imports `stores`. The `board` module never imports the edit
client. `writes` is imported by `server` and by nothing else.

## Key decisions

| # | Decision | Reason |
|---|---|---|
| D-1 | A separate app, its own copies of the parsing/write/palette modules rather than sharing ProjectDashboard's | ProjectKanban was built to replace the Dashboard; divergence was the intended outcome, not a cost |
| D-2 | Only `model` derives a fact; `today` is passed in | Two surfaces working out "overdue" for themselves disagree within a week; injecting the clock makes every date rule testable with no filesystem |
| D-3 | Every derived value renders as **guessed**, not stated | A confident wrong mark is worse than a visibly uncertain one |
| D-4 | A stale write is refused, never merged or locked | A single-user local app must never leave a lock behind after a crash |
| D-5 | The board is read-only; all five edits live in the project view | One place where writes happen is one place to get the guards right |
| D-6 | No drag and drop | A dragged card cannot say whether the due date, the owner or the lane changed — `writes` must never be handed a guess |
| D-7 | Linked rows fail closed — read-only, with a plain-English reason | `!ProjectSweep` owns cross-copy sync; the board must not race it |
| D-9 | A note names its section of `notes.md`, defaulting to Scraps & ideas | 🧭 Agent guidance steers every agent on that project — landing there must be deliberate |
| D-10 | The browser draws the board | Matches ProjectDashboard's own approach; the instant toggles require it |
| D-11 | Every toggle is a CSS class flip; the board renders once | The only way "more colour and animation" costs nothing |
| D-12 | Grouping repeated stems is a rendering rule, never a data rule | The store keeps every row distinct; only the page shows one stem |
| D-13 | Nothing the browser loads may reference an external file | Keeps an offline copy free; proved itself on day one when the mockups wouldn't render until self-contained |
| D-14 | Screen text serves the reader; build explanation lives in comments | The server sends codes; the browser writes the sentence |
| D-15 | `model`/`stores` carry purpose, definition of done, decision log, events, documents, people and mtime onto `ProjectView` as plain passthrough | Keeps D-2's single point of derivation; avoids a second endpoint or the browser reading files directly |

## Navigation map

```
ProjectKanban/
├── paths.py              where the root is, without trusting the working directory
├── stores.py             read the four sources; say what was stated and what was absent
├── model.py              the only place a fact is derived. No file, no clock, no network
├── writes.py             the only place a file changes. Six edits, four guards
├── server.py             moves data; owns no rules
├── check_contrast.py     every palette must pass this before it ships
├── app/
│   ├── tokens.css        every colour, space, type size and duration in the app
│   ├── board/            the lane × column grid. Never imports the edit client
│   ├── controls/         the toolbar and the three remembered choices
│   └── project/          the project page, the five edits, the print path
└── tests/                one file per module, mirroring the tree
```

Why `app/` splits three ways: `board` draws, `controls` holds state, `project` is the only place
anything changes. The split is what keeps a toggle a class flip and keeps the edit client out of
the board's reach.

## Rule exceptions

| Rule ID | Where | Reason | Granted on |
|---|---|---|---|
| SR-4 — share, don't copy-paste | The whole app: its own copies of the parsing, write and palette modules rather than sharing ProjectDashboard's | A new app expected to replace the old one; divergence was the intended outcome | 2026-09-10 |

**Resolved 2026-09-12:** the five-lane-hues question was decided in favour of the house two-accent
cap. `app/tokens.css` ships all five `--l-*` tokens resolved to `--ink-muted` by default — no
distinct per-lane colour. The `body[data-lane-hues="mono"]` toggle in `board.css`/`board.js` is now
a no-op (kept wired, not removed, in case a future need reopens the question).
