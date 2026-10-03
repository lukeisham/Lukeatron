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
No other app depends on Rhetoric, and Rhetoric reads nothing from another app. Internal contracts that span files:
- `schema.sql` → `items.py`: table/column names. `nodes` (one table, `hierarchy` in category|form|function, `parent_id`); `devices` (`form_node_id`, `function_node_id`, `popularity` 0–100 required, `topical_rank` nullable and Luke-set only, `ai_confidence_rating` high|medium|low default low, `flipside_of`); `device_categories` (1+ per device); `examples`. A rename breaks `/api/items` with a 500.
- `items.py` → `app/`: `GET /api/items` returns `trees` (one per hierarchy, device leaves as ids) plus a flat `devices` map, each device sent once. Every sort, search and filter runs client-side on that single payload. Each device also carries `flipside_of` (its fallacy's id, or null); `app/state.js` turns that into the shown `label` (`Fallacy/Flipside`), which the list, Copy, search and flat sorts all use. A missing `ai_confidence_rating` shows no badge. The badge is on screen only (hidden in print, absent from Copy).
- `seed/` → `schema.sql`: the only writer. The running server opens the database read-only and makes no network calls; only `seed/popularity_pass.py` uses the network. Every write is one transaction. `topical_rank` is never set by the pipeline. Order: `type_layers` → `load_devices` → `popularity_pass` → `update_popularity` (a Flipside device inherits its fallacy's score).
- The four Display-menu options and the "Open on" group are remembered in the browser (`app/settings.js`, localStorage; blocked storage falls back to defaults). Styling is split across `app/*.css`; `app/tokens.css` is the one file that defines a visual value. The list body is monochrome; the accent colour belongs to the masthead and toolbar zone only. `!HouseStyle` governs both.

## Decisions and exceptions
See `app-decisions.md` for what Luke has approved, any decision he explicitly flagged, and any granted Vibe-Coding rule exceptions. Not copied here.
