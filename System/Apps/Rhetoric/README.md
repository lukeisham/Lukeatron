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
│   ├── confidence-scoring.md
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
- The device count beside the subtitle (`#device-count` in `index.html`, `renderCount` in `render.js`) is the size of the loaded `devices` map, never a typed number; it counts every device including Flipsides and ignores search and view.
- Display options: the field names in `state.js` (`showDefinitions`, `showExamples`, `showConfidence`, `reveal`), the checkbox ids in `index.html`, the `hide-*` body classes in `list.css`, and `TOGGLE_FIELDS` in `settings.js` must agree; a rename in one silently breaks the others. Copy (`view.js`) honours the same options as the screen. The AI-confidence badge is on screen only: `print.css` hides it and Copy omits it.
- `seed/` → `schema.sql`: the only writer. `seed/db.py` applies the schema and holds the one writable connection. Stages hand files to each other in this order: `type_layers` (reads `seed/type-layers/*.md`) → `load_devices` (reads `seed/devices.json`) → `popularity_pass` (the only network use; writes `seed/popularity.json`) → `update_popularity` (reads that file). `topical_rank` is never set by the pipeline.
- `ai_confidence_rating` crosses `seed/devices.json` → `load_devices.py` → `schema.sql` → `items.py` → `state.js` → `render.js` / `main.js` unchanged; its meaning is set by the rubric in "AI confidence rating" below. Changing the allowed values (high|medium|low) breaks the schema CHECK, `RATING_TITLES` in `render.js` and the `data-rating` styles in `list.css` together.
- Styling is split across `app/*.css`; `app/tokens.css` is the one file that defines a visual value. The list body is monochrome; the accent colour belongs to the masthead and toolbar zone only. `!HouseStyle` governs both.

## AI confidence rating: rubric (approved and applied 2026-10-03)
`ai_confidence_rating` is a stored value, never computed at run time. It is set once per device in `seed/devices.json`, then copied unchanged through `load_devices.py` → `rhetoric.db` → `items.py` → `state.js` → `render.js` (badge) and `main.js` (toggle). Only the seed step may change it, so this rubric is applied there. `seed/confidence-scoring.md` records which tests each device failed and why.

**What the rating claims** (as `schema.sql` words it): the AI's confidence that the device's definition, example and categorisation are accurate *together*. Score three yes/no tests, then count the passes.

| Test | Passes when |
| :--- | :--- |
| **1. Definition** | It has one settled meaning (a term with rival senses, e.g. Adnomination, fails), AND either it is named in 2 or more distinct sources (the four scraped lists plus the reference sources counted in `seed/popularity.json`; Wikipedia never counts), OR a published handbook, primary text or scholarly paper that is not already a counted source gives the same sense. Name that work, with a locator, in `seed/confidence-scoring.md`. Commercial and hobby sites do not qualify. |
| **2. Example** | At least one example exists, and a reader who did not know the device's name could identify it from the example alone. For a fallacy, the example visibly commits the error. |
| **3. Categorisation** | Its Form, Function and Category placements each follow `seed/classification-criteria.md` directly. Fails if any placement needed a judgement call between close nodes or stretches a node's definition. |

| Passes | Rating | Reads as |
| :--- | :--- | :--- |
| 3 | `high` | Safe to teach from as it stands |
| 2 | `medium` | Worth a check before relying on it |
| 0–1 | `low` | A draft; verify before use |

**Rules of use**
- A device that fails Test 1 can never be `high`, because nothing outside the AI vouches for its definition.
- A Flipside is rated on its own. Every Flipside label is coined for this app and appears in no source, so Flipsides fail Test 1 and top out at `medium`.
- Never leave a device unrated: an unscored device stays `low` (the schema default).
- When a device is edited (new definition, example or placement), re-score it in the same change and update `seed/confidence-scoring.md`.

**Status.** All 272 devices were re-rated on 2026-10-03, then re-checked under the looser definition test (as above): 147 high, 119 medium, 6 low (originally 68 / 154 / 50). The same values are in `seed/devices.json` and `rhetoric.db`. The looser check used Silva Rhetoricae's citation lists plus a few scholarly works; those citations are second-hand and the primary texts were not read. Devices still failing the definition test are listed in `seed/confidence-scoring.md` with the reason; none of them has a published work that could be confirmed. Tests 2 and 3 are the AI's judgement and have not been checked by Luke. The Texas Sharpshooter and Single Cause examples were rewritten on this date so they show the fallacy.

## Decisions and exceptions
See `app-decisions.md` for what Luke has approved, any decision he explicitly flagged, and any granted Vibe-Coding rule exceptions. Not copied here.
