# AiCharacteristics

Paste up to 700 words and see which signs of AI-written text a cheap judge model says are present. The signs ("criteria") are built from the Wikipedia article on signs of AI writing, kept to what shows in a text's words and punctuation, and each is explained in Simple English. Data stays as it is until you press **Scrape** on "The criteria, explained", which runs the `!ScrapeAiCharacteristics` skill and updates the criteria.

## Launch / restart
- Open it from Home's command bar: **AiCharacteristics**.
- Two keys, each one line in its own file under `System/Credentials/Home/`: `deepseek-key` (Scrape) and `anthropic-key` (Check). Without one, that button says "No <provider> key is set up."
- Home must be restarted to pick up changed routes: stop the Python process listening on port 8780, then double-click `System/Apps/Home/Start Home.command`.
- Scrape from the terminal instead: `python3 System/Skillbank/PersonalResearch/!ScrapeAiCharacteristics/run.py`
- Tests: `cd tests/py && python3 -m unittest`; `node --test tests/js/*.mjs` from this folder; and `python3 -m unittest discover -s tests` from the skill folder.

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

System/Skillbank/PersonalResearch/!ScrapeAiCharacteristics/    the Scrape (skill.md, run.py, aichar_scrape/, tests/)
```

## Cross-app behaviour

| From | To | What crosses | What breaks if it changes |
|---|---|---|---|
| Home `catalog.json` | `web/index.html` | `launch: {kind: file, path: web/index.html}` | Home serves a file-launch app's launch file, plus `.html`/`.css`/`.js` beside it only when that file is in a sub-folder (`routes/open.py` `serve_file`). Move the page out of a sub-folder and its CSS and modules stop loading |
| `web/` | Home `/static/tokens.css` | The house token layer is linked, never copied or inlined | Home renaming or moving `tokens.css` leaves the page unstyled; `!HouseStyle` register row 15 (UNCLASSIFIED — no chassis) governs the page |
| `web/api.js` | Home `routes/aichar.py` | `GET /api/aichar/criteria`, `POST /api/aichar/scrape`, `POST /api/aichar/check`; same origin, session cookie; the two POSTs also check `Origin` and refuse the agent key | `api.js` is the only file calling `fetch`. Reply shapes (`summary`, `verdicts`, `{error, message}`) are read by `logic.js` and the views |
| Home `routes/aichar.py` | the Scrape skill | Imports `aichar_scrape` from `System/Skillbank/PersonalResearch/!ScrapeAiCharacteristics/` and passes `send`, the DeepSeek key and `provider`; `with_deadline` bounds Scrape (150 s) and Check (90 s) | Home's start-up self-check fails if the skill package or this app's `criteria` package does not import. This is the one write route in Home besides InboxNote (rule exception in `app-decisions.md`) |
| the Scrape skill | `criteria/` (this app) | Imports `store` (contract, `load_criteria`, atomic `save`), `llm` (`DEEPSEEK`, `ask_json`) and `transport` | The skill depends on this app, not the reverse. The `criteria.json` contract is the docstring of `criteria/store.py`; `web/` and `criteria/judge.py` read it |
| `criteria/llm.py` | DeepSeek, Anthropic | Both providers are called in the Anthropic Messages format (DeepSeek through its `/anthropic` endpoint, thinking off). `Provider.key_file` names the file in `System/Credentials/Home/` that holds each key; `judge.JUDGE_PROVIDER` picks Check's provider | Scrape sends only the public article to DeepSeek. Check sends the pasted text to the judge's provider (Anthropic) on every call; it is never logged or stored. Extraction scope (words and punctuation only; no layout, nothing about Wikipedia) is enforced in the skill's `extract.py` prompt and by a code filter |
| `!ScrapeAiCharacteristics` | `!GenerateContent` | `!GenerateContent` still lists an AiCharacteristics target for files that no longer exist | Logged in `Memory/Long-Term/Logs/issues.log`; the target is dead until Luke decides |

The page is deliberately not a Generator-shell cartridge any more; nothing in `System/Widgets/Generator/` builds or reads it.

## Decisions and exceptions
See `app-decisions.md` for what Luke has approved, any decision he explicitly flagged, and any granted Vibe-Coding rule exceptions. Not copied here.
