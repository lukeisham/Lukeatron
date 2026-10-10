# Project Dashboard

A Kanban board over every tracked Lukeatron project — swimlanes by whose move it is, columns by
how soon it is due — opened in a browser from Dropbox, with a small set of safe edits that write
back to the markdown so the board still works when no agent is available. It is the project
board kept live on `:8789`.

This document covers code layout and code behaviour — modules, data flow, and why the tree splits
the way it does. It carries no visual or interaction detail; that contract lives in
[StyleGuide.md](StyleGuide.md), which points back here (its "Interaction & UX conventions" section)
for the *why* behind the decisions it cites.

## Cross-boundary behaviour

| From | To | What crosses | What breaks if it changes |
|---|---|---|---|
| the files | `stores` | `_tracking.yaml`, each `registry.md`, a listing of `Plans/New/`, plus each file's mtime | nothing else reads these bytes; a second reader would drift from this one within a week |
| `stores` | `model` | plain records, each field carrying whether the file **stated** it or it was absent | `model` can no longer tell a fact from a guess, and the *guessed, not stated* treatment silently becomes a lie |
| `model` | `server` | one board object — projects placed in a lane and a column, counts, linked flags, raw date text, plus each project's purpose, definition of done, decision log, events, documents, people and mtime, and each task's raw kind/status/state | every surface reads this exact shape; a field renamed here breaks the board and the project page at once, which is the point |
| `server` | browser | `GET /api/board.json`, the board verbatim | the one contract the whole browser side depends on |
| browser | `server` → `writes` | an edit intent: project id, row identity, **field name**, value, and the mtime as read | drop the mtime and two tabs overwrite each other silently — the 409 *is* the concurrency design |
| browser | `server` → `writes` (undo) | `POST /api/undo` with **only** a project id and the mtime as read; `GET /api/undo-state.json` says what a press would restore | the server re-derives what to undo from the app's `edits.log` — a client that could name the row or value could undo something Luke was never shown |
| `writes` | the files | one cell, or one appended line, plus `pending_sweep: true` on that project's `_tracking.yaml` row | `!ProjectSweep` loses its signal that the board moved outside the skill layer |
| `controls` | `board`, `outline-print` | the token file, and class/attribute flips on the root element | a colour literal written anywhere else means a channel means two things; a toggle that needs JS stops being free |
| app | wiki viewer `:8787` | a hyperlink, nothing else | nothing — it is a door. The app never reads `LukeatronWiki/` |
| app | `notes.md` | an appended line under a **named section** | a line under 🧭 Agent guidance is a standing instruction to every agent; the section is never a default |

**The one-way rules**, enforced by what is imported rather than by a flag: `stores` and `model`
never import `writes`. `model` never imports `stores`. The `board` module never imports the edit
client. `writes` is imported by `server` and by nothing else.

## Navigation map

```
ProjectDashboard/
├── paths.py              where the root is, without trusting the working directory
├── stores.py             read the four sources; say what was stated and what was absent
├── model.py              the only place a fact is derived. No file, no clock, no network
├── writes.py             the only place a file changes. Six edits, an undo, four guards
├── server.py             moves data; owns no rules
├── recur.py              scheduled caller, not server.py's — reopens a Done recurring row
├── check_contrast.py     every palette must pass this before it ships
├── app/
│   ├── tokens.css        every colour, space, type size and duration in the app
│   ├── board/            the lane × column grid and its arrow-key/`c` navigation. Never imports the edit client
│   ├── controls/         the toolbar and the three remembered choices
│   ├── shared/           DOM helpers, the board fetch client, and the flourishes (flourish.css/.js)
│   └── project/          the project page, the five edits, the Undo button, the print path
├── StyleGuide.md         the visual contract for app/ — palettes, tokens, motion, layout scope
├── app-decisions.md      Luke's approvals + granted rule exceptions
├── wishlist.md           wishes for the app (!AppWishlist)
└── tests/                one file per module, mirroring the tree
```

See [StyleGuide.md](StyleGuide.md) before touching any colour, space, radius, duration, or type
value in `app/` — it's the app-local record of how `!HouseStyle` lands in `tokens.css` and the CSS
files that consume it.

Why `app/` splits three ways: `board` draws, `controls` holds state, `project` is the only place
anything changes. The split is what keeps a toggle a class flip and keeps the edit client out of
the board's reach.

