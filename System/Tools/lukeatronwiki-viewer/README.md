# LukeatronWiki — local browser viewer

A **read-only** browser view of `Memory/Long-Term/LukeatronWiki/`:

- the **read / watch / write backlog** as a three-column board (`_queue.yaml`) — with
  a client-side **title filter** on `/pages`, an "unrecognised intent" ⚠ strip, and
  finished (done/dropped/promoted) items collapsed into a "recently finished" strip
- a **topics index** (`/topics`) grouping every page by type, by tag, and A–Z, plus a
  live **integrity footer** (files · indexed · unindexed · dead links · one-way edges)
- **Wikipedia-style topic pages** — a representative **thumbnail** in a top-right infobox, a styled **lead summary**, then free-form prose / lists / tables / **embedded PDF viewers**, all cross-linked with `[[wikilinks]]`, tags, and "what links here" backlinks (`<slug>.md`) — a `[[wikilink]]` to a page that doesn't exist renders as a **red link**

It reads the wiki files **live** on every request — edit via `!IdeaWiki` (or any editor), then just refresh the browser. It never writes to your files by default (see **Edit mode** below).

## Run it

**Double-click** `Start LukeatronWiki Viewer.command` — it opens your browser at the board.

Or from a terminal:

```bash
python3 serve.py
```

Then open <http://localhost:8787>. Press `Ctrl-C` to stop.

## Requirements

Python 3 only (macOS already has it). **No dependencies, no install, works offline.**
If `PyYAML` / `markdown` happen to be installed it'll use them; otherwise it uses built-in fallbacks.

## Options

| Env var | Default | Purpose |
|---|---|---|
| `LUKEATRONWIKI_PORT` | `8787` | port (auto-bumps if busy) |
| `LUKEATRONWIKI_DIR`  | `…/Memory/Long-Term/LukeatronWiki` | point at a different wiki folder |
| `LUKEATRONWIKI_NO_BROWSER` | *(unset)* | when set, runs **headless** — serves the port without auto-opening a browser tab |
| `LUKEATRONWIKI_EDIT` | *(unset)* | when set, enables **edit mode** (see below) |

## Edit mode — the View/Edit toggle (off by default) — capture, not edit

In the sidebar, just below **"Other tools,"** there's a **View / Edit** toggle.
Click **Edit** to turn writes on for this browser, right now, on the running
`:8787` server — no relaunch. Click **View** to turn them back off. See
`System/Viewer-Launch-Guide.md` for a plain-English walkthrough.

**Security note:** the toggle flips a live server flag with no further check
beyond the click itself — anyone using this browser on this Mac can turn editing
on. That's a deliberate, explicit trade-off for a single-user, secured laptop
(superseding an earlier launch-time-only design); the toggle always starts back
on **View** whenever the server restarts.

Once Edit is on, the board gains:

- **🌱 Quick-capture** — a form (title · kind · intent · source) that appends one
  well-formed row to `_queue.yaml`, flagged `needs_absorb: true` so `!IdeaWiki`
  completes the real absorb (writing the verbatim content into its Long-Term store,
  filing the pointer node, linking both ways) on its next pass.
- **✓ Done / ✕ Drop** — flips one queued item's status (the two Luke-decidable
  transitions only). `promoted` and node retirement stay agent/`!ArchiveMemory` work.

This is deliberately **capture, not edit** — no route writes a node page,
`_index.yaml`, or any subject store, toggle on or off. The wiki's real invariants
(verbatim content in the matching store, pointer nodes with no substantive content,
bidirectional `related:` edges) are judgement work only `!IdeaWiki` and
`!ArchiveMemory` can uphold; the browser may only queue and tick.

Every write: fires only on **POST**, carries `_queue.yaml`'s **mtime** (a change
since you loaded the page is a **409**, never a silent overwrite), touches only
that one file (an append for capture, a single-field flip for a status change),
and is logged to `Memory/Long-Term/Logs/edits.log`, including every toggle flip.

An optional `Start LukeatronWiki Viewer (Edit Mode).command` launcher (or
`LUKEATRONWIKI_EDIT=1 python3 serve.py`) starts a copy already toggled on — a
shortcut for scripting; the browser toggle does the same thing for everyday use.

## Always-on (whenever Claude is running)

A `SessionStart` hook in `.claude/settings.json` runs `ensure-viewer.sh`, which makes
sure the **read-only** viewer is live on <http://localhost:8787> at the start of every
Claude session. It's **idempotent** — if the server is already up it does nothing, so
sessions never stack duplicate copies — and **headless** (no browser pop). The server
persists in the background, so the URL stays live between turns and across sessions.
To stop it manually: `pkill -f lukeatronwiki-viewer/serve.py`.

## Topic pages

Each `<slug>.md` page renders like a Wikipedia article:

- **Thumbnail** — set `thumbnail:` in the page frontmatter to an `http` URL or a path relative to the wiki folder (e.g. `../../Long-Term/Thumbnails/Gustave_Doré.png`). It floats in a top-right infobox. Add an optional `thumbnail_caption:` beneath it.
- **Lead summary** — everything between the `# Title` and the first `## section` is styled as the article summary; put `[[wikilinks]]` here so it doubles as a map into the rest of the wiki.
- **Body** — prose, lists, tables, and PDFs. A Markdown link ending in `.pdf` (`[label](../path/file.pdf)`) embeds an inline PDF viewer.

Local files (images, PDFs) are served only from inside the `_Lukeatron` folder — anything outside is refused.

## Notes

- The always-on instance is a **viewer**, not an editor — to fully add/change a page,
  use `!IdeaWiki` (edit mode's quick-capture only queues; it doesn't absorb).
- Stays **local** (binds `127.0.0.1`), so your private thinking never leaves the machine.
- Lives alongside the Project Dashboard (`:8788`) — cross-linked in each sidebar.
