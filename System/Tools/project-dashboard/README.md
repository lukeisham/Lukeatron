# Project Dashboard — local browser viewer

A **read-only** browser view of `Memory/Medium-Term/Projects/` — the colour board
across every active project, laid out in three columns:

- **LEFT** — a smart index of the projects, grouped by **context** (Personal
  Productivity · Church · Teaching · Personal Research) and ordered within each so
  the most-demanding projects float to the top (🔴 → 🟠 → 🔵 → 🟢 → ⚪).
- **MIDDLE** — every **Next Action** of a project as a **coloured square**, tinted
  by its **State** (the kind of attention it needs). Hover a square for the action
  text, owner and status. Done actions show a dimmed ✓.
- **RIGHT** — **in words**, the single next action that most needs doing to change
  the project's overall attention State, shown with its State square.

Each row also shows a **wake** badge (⏰, when the board has one) and **due** dates
on task tooltips and the bottleneck panel; a **drift** badge (🟠 "actions suggest …")
when the live open actions disagree with the board's colour; and a **registry path**
footer linking to a read-only view of the full `registry.md`.

A **🗒️ Minor Queue** tab (top of the sidebar, `/minor`) gives a second read-only
view — the open rows (☐ / ◐) of `Memory/Medium-Term/MinorTasks/queue.md`, in
chronological (row-number) order, with each row's State square and Impact. Display
only; `!Initiative` remains the sole owner of the queue.

It reads **live** on every request and, by default, never writes:

- `_tracking.yaml` — the per-project colour board (`state` / `waiting_on` / `wake`),
  maintained by `!ProjectSweep`.
- each project's `registry.md` ✅ **Next Actions** table — the per-action detail.

After a `!ProjectSweep` (or any edit to a registry / the tracking file), just
**refresh the browser**.

## State vocabulary

Precedence 🔴 → 🟠 → 🔵 → 🟢 → ⚪ (first match wins):

| Square | State | Meaning |
|---|---|---|
| 🔴 | urgent | overdue, due-soon with no plan, or adrift |
| 🟠 | your move | the next move is Luke's |
| 🔵 | waiting | parked on a reply or a future date |
| 🟢 | on track | in motion; a defined next step exists |
| ⚪ | undefined | open but unshaped — no owner and/or no due |

**Per-action State** is read verbatim from a `State` column in the Next Actions
table if present (the current template). For registries written **before** that
column existed, it is **derived** from Status + Owner + Type + Due — so the
dashboard works on every project today, and gets sharper as registries adopt the
column.

## Run it

**Double-click** `Start Project Dashboard.command` — it opens your browser at the
board (read-only).

Or from a terminal:

```bash
python3 serve.py
```

Then open <http://localhost:8788>. Press `Ctrl-C` to stop.

## Requirements

Python 3 only (macOS already has it). **No dependencies, no install, works offline.**
Uses `PyYAML` if it happens to be installed; otherwise a built-in fallback parser.

## Options

| Env var | Default | Purpose |
|---|---|---|
| `LUKEATRON_DASHBOARD_PORT` | `8788` | port (auto-bumps if busy) |
| `LUKEATRON_PROJECTS_DIR`  | `…/Memory/Medium-Term/Projects` | point at a different projects folder |
| `LUKEATRON_DASHBOARD_NO_BROWSER` | *(unset)* | when set, runs **headless** — serves the port without auto-opening a tab |
| `LUKEATRON_DASHBOARD_EDIT` | *(unset)* | when set, enables **edit mode** (see below) |

## Edit mode — the View/Edit toggle (off by default)

In the sidebar, just below **"Other tools,"** there's a **View / Edit** toggle.
Click **Edit** to turn writes on for this browser, right now, on the running
`:8788` server — no relaunch, no separate process. Click **View** to turn them
back off. See `System/Viewer-Launch-Guide.md` for a plain-English walkthrough.

**Security note:** the toggle flips a live server flag with no further check
beyond the click itself — anyone using this browser on this Mac can turn editing
on. That's a deliberate, explicit trade-off for a single-user, secured laptop
(superseding an earlier launch-time-only design); the toggle always starts back
on **View** whenever the server restarts. If that stops being true for you (shared
machine, exposed network), tell your agent to revert to launch-time gating.

Once Edit is on, each project gets a collapsible **✏️ Edit** panel with:

- **✓ Done** — flips one Next Action's Status cell to `☑ Done`.
- **↻ State** — cycles one action's State cell 🔴→🟠→🔵→🟢→⚪.
- **📥 Add scrap** — appends a timestamped line to that project's `notes.md`.

Every write is still a **single cell or append** — never a whole-file rewrite — and:
- only fires on **POST** (a stray GET/refresh can't trigger a write);
- is **fenced** to `Memory/Medium-Term/Projects/`;
- carries the target file's **mtime**, so a change since you loaded the page is a
  **409** (reload and retry) rather than a silent overwrite;
- stamps that project's `_tracking.yaml` row `pending_sweep: true` (never the
  `state`/`wake` fields themselves — `!ProjectSweep` still owns the board; the
  **drift badge** shows the interim mismatch);
- is logged to `Memory/Long-Term/Logs/edits.log` so agents see what moved outside
  the skill layer, including every toggle flip.

An optional `Start Project Dashboard (Edit Mode).command` launcher (or
`LUKEATRON_DASHBOARD_EDIT=1 python3 serve.py`) starts a copy already toggled on —
a shortcut for scripting; the browser toggle does the same thing for everyday use.

## Always-on (whenever Claude is running)

A `SessionStart` hook in `.claude/settings.json` runs `ensure-dashboard.sh`, which
makes sure the **read-only** dashboard is live on <http://localhost:8788> at the
start of every Claude session. It's **idempotent** (already up → does nothing) and
**headless** (no browser pop). The server persists in the background between turns
and across sessions. To stop it manually: `pkill -f project-dashboard/serve.py`.

## Notes

- The always-on instance is a **viewer**, not an editor — to change a project without
  edit mode, edit its `registry.md` or run `!ProjectSweep`.
- Stays **local** (binds `127.0.0.1`), so nothing leaves the machine.
- Lives alongside the LukeatronWiki viewer (`:8787`) — cross-linked in each sidebar —
  two windows onto the same Medium-Term store.
