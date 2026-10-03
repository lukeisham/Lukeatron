# Rhetoric

An offline, in-browser reference app that shows rhetorical devices organised across three independent hierarchies — Category, Form and Function — as a clean, re-organisable list. Luke uses it during teaching preparation: sorting, reading a definition and examples, and printing or copying a chosen group. It holds 272 devices, each with a definition, examples, a popularity score and an AI-confidence rating.

## Launch / restart
- Double-click `Start Rhetoric.command`, or run `python3 server.py` from this folder and open `http://127.0.0.1:8794`.
- To restart: close the Terminal window (or press Ctrl-C) and launch again. If it reports the port is in use, an earlier Rhetoric is still running.
- To rebuild the database from scratch, see `schema.sql` and the `seed/` modules (run from this folder with `python3 -m seed.<module>`).

## Navigation
```
Rhetoric/
├── Start Rhetoric.command
├── server.py
├── items.py
├── schema.sql
├── rhetoric.db              (untracked; rebuilt by seed/)
├── app/
├── seed/
│   ├── classification-criteria.md
│   ├── type-layers/
│   └── devices.json · popularity.json
├── tests/
├── app-decisions.md
└── wishlist.md
```

## Cross-app behaviour
**Between apps.** Home launches Rhetoric: its `catalog.json` entry runs `server.py` from this folder's root on port 8794. Moving or renaming `server.py`, or changing the port, breaks that tile. The port is also fixed in `server.py` and `Start Rhetoric.command`. Rhetoric reads nothing from another app and no other app reads its data.

**Between files.**
- `schema.sql` → `items.py`: table and column names. `nodes` (one table, `hierarchy` in category|form|function, `parent_id`); `devices` (`form_node_id`, `function_node_id`, `popularity` 0–100 required, `topical_rank` nullable and Luke-set only, `ai_confidence_rating` high|medium|low default low, `flipside_of`); `device_categories` (1+ per device); `examples`. A rename breaks `/api/items` with a 500.
- `items.py` → `server.py` → `app/`: `GET /api/items` returns `trees` (one per hierarchy, device leaves as ids) plus a flat `devices` map, each device sent once. Every sort, search and filter runs client-side on that single payload. `server.py` checks the API route before serving `app/` as static files, and returns 503 if the database cannot be opened (`app/api.js` treats any non-OK response as "could not load"). The server opens the database read-only and refuses every method but GET.
- `flipside_of` (a fallacy's id, or null) → `app/state.js` builds each device's shown `label` (`Fallacy/Flipside`). The list, Copy, search and flat sorts all read `label`, never `name`, so a new view must too.
- Display options: the field names in `state.js` (`showDefinitions`, `showExamples`, `showConfidence`, `reveal`), the checkbox ids in `index.html`, the `hide-*` body classes in `list.css`, and `TOGGLE_FIELDS` in `settings.js` must agree; a rename in one silently breaks the others. Copy (`view.js`) honours the same options as the screen. The AI-confidence badge is on screen only: `print.css` hides it and Copy omits it.
- `seed/` → `schema.sql`: the only writer. `seed/db.py` applies the schema and holds the one writable connection. Stages hand files to each other in this order: `type_layers` (reads `seed/type-layers/*.md`) → `load_devices` (reads `seed/devices.json`) → `popularity_pass` (the only network use; writes `seed/popularity.json`) → `update_popularity` (reads that file). `topical_rank` is never set by the pipeline.
- Styling is split across `app/*.css`; `app/tokens.css` is the one file that defines a visual value. The list body is monochrome; the accent colour belongs to the masthead and toolbar zone only. `!HouseStyle` governs both.

## Decisions and exceptions
See `app-decisions.md` for what Luke has approved, any decision he explicitly flagged, and any granted Vibe-Coding rule exceptions. Not copied here.
