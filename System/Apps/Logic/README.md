# Logic

An offline, in-browser reference app for the forms Luke draws on when preparing to teach. Each form has a definition, an AI-written example, a real quote, a popularity score and an AI-confidence rating, and *each group in the app is a different way in*. **Alphabetical** and **Popularity** are flat lists for *looking a form up* or seeing which are used most. **Category**, **Form** and **Function** show the three independent hierarchies the forms are *classified* by. **Labels** is *Luke's own arrangement*: labels he creates, explains, nests up to five levels deep and orders, with forms filed under them, and with optional tables and link labels (each link opens its own new section of the About page). **Index** lists *every real quote* by first line, source or date. **Compare** sets *a form beside its counterpart*. **About** explains *what each group shows and how the scores are read*. **Labels** is the *only* place the app lets him change anything; the rest is read-only. Search, the Display options, Copy and Print are *secondary*: they serve every group, for reading a chosen part on screen or taking it away as text or paper.

## Launch / restart
- Double-click `Start Logic.command`, or run `python3 server.py` from this folder and open `http://127.0.0.1:8803`.
- To restart: close the Terminal window (or press Ctrl-C) and launch again. If it reports the port is in use, an earlier Logic is still running.
- `python3 -m seed.db` creates an empty `logic.db` from `schema.sql`, and adds any table that is missing to an existing one without touching its rows. `logic.db` is tracked in git (it holds Luke's own labels and placements), so each commit is also a backup. A rebuild from scratch discards the labels and placements.

## Navigation
```
Logic/
├── Start Logic.command
├── server.py
├── items.py · labels.py
├── labeltree.py · labeltables.py · aboutpage.py · quotes.py
├── schema.sql
├── logic.db
├── app/
├── seed/
├── tests/
├── app-decisions.md
└── wishlist.md
```

## Cross-app behaviour
**Display order.** Wherever an form is shown (list, Compare, Copy, Print), the order is name, description, AI example, real quote. `app/render.js` draws the name, definition, label explanation and examples in that order, and `items.py` (`_entry_map`) sorts an entry's examples so the AI example comes before its real quote whatever their row ids.

**Between apps.** Home launches Logic: its `catalog.json` entry runs `server.py` from this folder's root on port 8803. Moving or renaming `server.py`, or changing the port, breaks that tile. The port is also fixed in `server.py` and `Start Logic.command`. Logic reads nothing from another app and no other app reads its data.

**Teaching App family.** Logic is one of six apps (Rhetoric, Grammar, Logic, Research, Writing, Style) whose function (the code in `*.py`, `app/`, `seed/`, `tests/`, `schema.sql` and this README) is kept in step by `System/Tools/teaching-app-family/`: when a turn ends after code here changed, it offers the change to the others and carries it where Luke says. Data (the database, `images/`, `app-decisions.md`, `wishlist.md`, `app/about.html`) is never carried. Rhetoric's code has diverged, so it is only reported to, never merged.

**Between files.**
- `schema.sql` → `items.py`: table and column names; a rename breaks `/api/items` with a 500. `examples.attribution` is never null (`Unattributed` when none is recorded). `popularity`, `form_node_id` and `function_node_id` may be NULL: an entry with none is listed last by Popularity and sits in no Form or Function tree.
- `items.py` → `server.py` → `app/`: `GET /api/items` returns `trees` (one per hierarchy, entry leaves as ids), a flat `entries` map with each entry sent once, and a flat `quotes` list. Every sort, search and filter runs client-side on that payload. `server.py` checks the API route before serving `app/` as static files and returns 503 if the database cannot be opened (`app/api.js` treats any non-OK response as "could not load"). The database is opened read-only for `GET`; the only writes are the label routes below, and any other POST, PUT, PATCH or DELETE gets 405.
- **Editing Labels.** `server.py` (routing and the origin gate) → `labels.py` (the only SQL that writes) → `labeltree.py` (the move and depth rules) → `items.py` (rebuilds the tree to answer). Routes: `/api/labels` (`POST` to add), `/api/labels/<id>` (`PUT` edit, `DELETE`), `/api/labels/<id>/position` (`PUT`, `index` and an optional `parent_id`; 0 means top level), `/api/labels/<id>/entries/<entry id>` (`PUT` place, optionally at an `index`; `DELETE` remove), `/api/labels/<id>/tables` (`PUT` the whole list of tables) and `/api/labels/links` (`POST` a link label). Every change answers with the fresh Labels tree, which `app/state.js` (`setEditableTree`) swaps in. `labels.MAX_DEPTH` and `MAX_LABEL_DEPTH` in `app/state.js` agree; `--indent-max-depth` in `app/tokens.css` is the deepest indent. A drop in `app/drag.js` is decided in `app/main.js` (`onEditableDrop`), never in the drag module.
- **Label tables.** A label's tables live in its `tables_json` column. `labeltables.py` is the shape and the limits (`MAX_*`), mirrored by `app/tablegrid.js`; `app/tableeditor.js` is the dialog and `app/render.js` draws a saved table, sized from `--cols` and `--word` by `app/labeltable.css`. Copy writes a table as comma-separated lines (`tableToText` in `app/view.js`).
- **Link labels.** A link label has `about_section` set: the id of its own section of `app/about.html`, which `labeltree.create_link` and `aboutpage.add_section` append, with a line in the page's contents list. `aboutpage.py` anchors on the page's `<nav class="contents">` list and its closing `</main>`; removing either makes the link route fail with no row made. `app/about.js` picks a new section up with no change, and `app/about.css` numbers it by CSS counters.
- **Text markup.** `*word*` draws an italic and `_word_` a bold, in names, explanations, examples, quotes and table cells (`app/markup.js`, drawn as elements by `app/render.js`, never as HTML).
- **Index group.** `quotes.py` decides what a real quote is and splits it into `text` and `source`. `items.py` sends them as `quotes` `{id, entry_id, text, source, author, date}`; `app/state.js` maps them to `state.quotes`, `app/view.js` (`indexView`) builds the rows, `app/quoteindex.js` orders and groups them (`INDEX_ORDERS`), and `app/render.js` draws both forms, switched by the body class `index-full-on` in `app/index.css`. `date` is the optional `quote_date` column of `examples`: `YYYY` or `YYYY-MM-DD`, a year under 1000 padded to four digits (AD 60 is `0060`), a year BC with a minus sign (935 BC is `-0935`, no year 0), NULL when unknown.
- **Compare group.** It opens from its own button (`#compare`), not from the group row: Compare is not in `SORTS`, but `OPENING_CHOICES` in `app/state.js` adds it for the "Open on" menu, whose options in `app/index.html` must match. `app/state.js` (`counterpartPairs`) builds the pairs from each entry's `counterpart_of`; `app/view.js` `compareView` returns `{mode: 'compare', pairs, current}`; `app/render.js` draws the table and fills `#compare-bar`. Its three switches `tableNames`, `tableDefinitions` and `tableExamples` are separate from the Display menu: the checkbox ids `table-names|definitions|examples`, the `hide-table-*` classes in `app/compare.css`, `applyToggles` in `app/main.js` and `TOGGLE_FIELDS` in `app/settings.js` must agree.
- **AI confidence.** `ai_confidence_rating` crosses `schema.sql` → `items.py` → `app/state.js` → `app/render.js`. Changing the allowed values (high|medium|low) breaks the schema CHECK, `RATING_TITLES` in `app/render.js` and the `data-rating` styles in `app/list.css` together.
- **Review ledger.** `entry_review` is the agent's private table, defined in `schema.sql` and created by trigger; nothing in the app reads it (`items.py` and `server.py` select named columns).
- **Settings.** What Luke sets in the page (Display options, opening group, opened and closed headings) is kept in the browser under the `logic.` keys in `app/settings.js`; `TOGGLE_FIELDS` there must name the same fields as `createState` in `app/state.js`.
- **Styling.** Split across `app/*.css`; `app/tokens.css` is the one file that defines a visual value. The list body is monochrome; the accent colour belongs to the masthead and toolbar zone only. `!HouseStyle` governs both.

## Decisions and exceptions
See `app-decisions.md` for what Luke has approved, any decision he explicitly flagged, and any granted Vibe-Coding rule exceptions. Not copied here.
