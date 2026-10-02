# AiCharacteristics

Paste up to 700 words and see which signs of AI-written text a cheap judge model says are present. The signs ("criteria") are built from the Wikipedia article on signs of AI writing, kept to what shows in a text's words and punctuation, and each is explained in Simple English. Data stays as it is until you press **Scrape** on "The criteria, explained", which re-reads the article and updates the criteria.

## Launch / restart
- Open it from Home's command bar: **AiCharacteristics**.
- One-time setup: the Haiku key goes in `System/Credentials/Home/anthropic-key` (one line, nothing else). Without it Scrape and Check say "No Haiku key is set up."
- Home must be restarted to pick up changed routes: stop the Python process listening on port 8780, then double-click `System/Apps/Home/Start Home.command`.
- Tests: `cd tests/py && python3 -m unittest`, and from this folder `node --test tests/js/*.mjs`.

## Navigation
```
AiCharacteristics/
├── web/              the page (HTML, CSS, ES modules)
├── criteria/         the Python package Home's routes call
├── data/             criteria.json, criteria.previous.json, source/ — written by Scrape; absent until the first one
├── tests/
│   ├── py/
│   └── js/
├── AI-writing-characteristics-reference.md
├── app-decisions.md
├── wishlist.md
└── README.md
```

## Cross-app behaviour

| From | To | What crosses | What breaks if it changes |
|---|---|---|---|
| Home `catalog.json` | `web/index.html` | `launch: {kind: file, path: web/index.html}` | Home serves a file-launch app's launch file, plus `.html`/`.css`/`.js` beside it only when that file is in a sub-folder (`routes/open.py` `serve_file`). Move the page out of a sub-folder and its CSS and modules stop loading |
| `web/` | Home `/static/tokens.css` | The house token layer is linked, never copied or inlined | Home renaming or moving `tokens.css` leaves the page unstyled; `!HouseStyle` register row 15 (UNCLASSIFIED — no chassis) governs the page |
| `web/api.js` | Home `routes/aichar.py` | `GET /api/aichar/criteria`, `POST /api/aichar/scrape`, `POST /api/aichar/check`; same origin, session cookie; the two POSTs also check `Origin` and refuse the agent key | `api.js` is the only file calling `fetch`. Reply shapes (`summary`, `verdicts`, `{error, message}`) are read by `logic.js` and the views |
| Home `routes/aichar.py` | `criteria/` | Imports the package from this folder (`criteria.run_scrape`, `check_text`, `load_criteria`) and passes `send` (network seam) and the key | Home's start-up self-check fails if the package does not import. `with_deadline` bounds Scrape (150 s) and Check (90 s) |
| `criteria/scrape.py` | `data/` | Writes `criteria.json` last and atomically, after `criteria.previous.json` and `source/article.txt`; any failure leaves every file untouched | The contract is the docstring of `criteria/merge.py`; `web/` and `criteria/judge.py` read it. This is the one write route in Home besides InboxNote (rule exception in `app-decisions.md`) |
| `criteria/` | Wikipedia API, Anthropic API | `article.py` reads one page as plain text; `haiku.py` is the only Anthropic caller, key read by Home's `CredStore.anthropic_key()` per call | Pasted text goes to the Anthropic API on every Check and is never logged or stored. Extraction scope (words and punctuation only; no layout, nothing about Wikipedia) is enforced in `extract.py`'s prompt and by a code filter |

The page is deliberately not a Generator-shell cartridge any more; nothing in `System/Widgets/Generator/` builds or reads it.

## Decisions and exceptions
See `app-decisions.md` for what Luke has approved, any decision he explicitly flagged, and any granted Vibe-Coding rule exceptions. Not copied here.
