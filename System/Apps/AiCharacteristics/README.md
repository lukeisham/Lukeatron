# AiCharacteristics

Paste up to 700 words and see which signs of AI-written text a Claude check says are present. The signs ("criteria") are built from the Wikipedia article on signs of AI writing, kept to what shows in a text's words and punctuation, and each is explained in Simple English. Data stays as it is until you press **Scrape** on "The criteria, explained", which runs the Skillbank skill `!ScrapeAiCharacteristics` and updates the criteria. **Check** runs the skill `!CheckAiCharacteristics`. Both run as headless Claude Code on your own Claude sign-in: no API key.

## Launch / restart
- Open it from Home's command bar: **AiCharacteristics**.
- Both buttons need Claude Code signed in on this Mac: run `claude` once in Terminal and sign in. If it is not, the button says "Claude Code is not signed in on this Mac".
- Home must be restarted to pick up changed routes: stop the Python process listening on port 8780, then double-click `System/Apps/Home/Start Home.command`.
- Scrape or Check without the page: ask Claude in chat to run `!ScrapeAiCharacteristics` or `!CheckAiCharacteristics`.
- Tests: `cd tests/py && python3 -m unittest`; `node --test tests/js/*.mjs` from this folder; Home's own suite covers the routes.

## Navigation
```
AiCharacteristics/
├── web/              the page (HTML, CSS, ES modules)
├── criteria/         the Python package Home's routes call (reads criteria.json, validates the Check's reply)
├── data/             criteria.json, criteria.previous.json, source/article.json — written by Scrape; absent until the first one
├── tests/
│   ├── py/
│   └── js/
├── AI-writing-characteristics-reference.md
├── app-decisions.md
├── wishlist.md
└── README.md

System/Skillbank/PersonalResearch/!ScrapeAiCharacteristics/    the Scrape skill (skill.md only)
System/Skillbank/PersonalResearch/!CheckAiCharacteristics/     the Check skill (skill.md only)
```

## Cross-app behaviour

| From | To | What crosses | What breaks if it changes |
|---|---|---|---|
| Home `catalog.json` | `web/index.html` | `launch: {kind: file, path: web/index.html}` | Home serves a file-launch app's launch file, plus `.html`/`.css`/`.js` beside it only when that file is in a sub-folder (`routes/open.py` `serve_file`). Move the page out of a sub-folder and its CSS and modules stop loading |
| `web/` | Home `/static/tokens.css` | The house token layer is linked, never copied or inlined | Home renaming or moving `tokens.css` leaves the page unstyled; `!HouseStyle` register row 15 (UNCLASSIFIED — no chassis) governs the page |
| `web/api.js` | Home `routes/aichar.py` | `GET /api/aichar/criteria`, `POST /api/aichar/scrape`, `POST /api/aichar/check`; same origin, session cookie; the two POSTs also check `Origin` and refuse the agent key | `api.js` is the only file calling `fetch`. Reply shapes (`summary`, `verdicts`, `{error, message}`) are read by `logic.js` and the views |
| Home `routes/aichar.py` | the two skills | Runs `claude -p` from the Lukeatron root, once per button press, with a prompt that names the skill's `skill.md`. Scrape may read, `curl`, `cp`, `mkdir`, and write only `System/Apps/AiCharacteristics/data/**`; Check may only read. The pasted text goes in on stdin and is never logged. Replies are validated in Home (`aichar._scrape_summary`, `criteria.parse_verdicts`) and refused if malformed. Time limits: Scrape 600 s, Check 180 s; one of each at a time | Home's start-up self-check fails if the `criteria` package or either `skill.md` is missing. Needs Claude Code installed and signed in. Costs Claude usage on every press. This is the one write route in Home besides InboxNote (rule exception in `app-decisions.md`) |
| the Scrape skill | the saved file | Writes `data/criteria.json` last, after `criteria.previous.json` and `source/article.json`, and restores the previous copy if its read-back check fails. The `criteria.json` contract is the docstring of `criteria/store.py`; `web/` and the Check skill read it | A contract change must be made in `store.py`'s docstring, both skills and `web/logic.js` together |
| the Scrape skill | Wikipedia | Reads the one article `Wikipedia:Signs of AI writing` through Wikipedia's own API. Scope (words and punctuation only; no layout, nothing about Wikipedia) is written into the skill, and Home cannot check it, so read the Scrape report | Changing the page or the scope is Luke's decision, recorded in `app-decisions.md` |
| the Check skill | Claude | The pasted passage is sent to Claude as the run's input on every Check; it is never stored | — |
| `!ScrapeAiCharacteristics` | `!GenerateContent` | `!GenerateContent` still lists an AiCharacteristics target for files that no longer exist | Logged in `Memory/Long-Term/Logs/issues.log`; the target is dead until Luke decides |

The page is deliberately not a Generator-shell cartridge any more; nothing in `System/Widgets/Generator/` builds or reads it.

## Decisions and exceptions
See `app-decisions.md` for what Luke has approved, any decision he explicitly flagged, and any granted Vibe-Coding rule exceptions. Not copied here.
