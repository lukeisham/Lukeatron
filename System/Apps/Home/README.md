# Home

The front door to every Lukeatron app. One page on `127.0.0.1:8780`, behind a passkey, lists each
app by context with a command bar that narrows as you type; choosing one starts its server if
needed and opens it in a new tab. Home also carries a verse of the day, the Inbox quick-note slot,
the Larder panel, and the AiCharacteristics routes. It reads other apps' folders and starts their
servers; it writes only to `Inbox/` and to AiCharacteristics' `data/`.

## Launch / restart
- Kept alive by a launchd agent on each Mac: `install-launchd.sh` adds it, `uninstall-launchd.sh` removes it.
- By hand: double-click `Start Home.command`. To restart, stop the Python process on port 8780 first.
- Tests: `python3 -m unittest discover -s tests` and `node --test tests/*.mjs` from this folder.

## Navigation

```
Home/
├── server.py
├── settings.json
├── catalog.json
├── verses.txt
├── install-launchd.sh
├── uninstall-launchd.sh
├── Start Home.command
├── core/
│   ├── catalog.py
│   ├── cbor.py
│   ├── credstore.py
│   ├── home.py
│   ├── launcher.py
│   ├── p256.py
│   ├── paths.py
│   ├── selfcheck.py
│   ├── session.py
│   ├── settings.py
│   ├── verse.py
│   ├── web.py
│   └── webauthn.py
├── routes/
│   ├── aichar.py
│   ├── apps.py
│   ├── auth.py
│   ├── inbox_note.py
│   ├── larder.py
│   ├── open.py
│   ├── page.py
│   └── verse.py
├── static/
│   ├── index.html
│   ├── signin.html
│   ├── holding.html
│   ├── tokens.css
│   ├── home.css
│   ├── home.js
│   ├── filter.js
│   ├── holding.js
│   ├── signin.js
│   ├── panels/
│   │   └── larder.js
│   └── slots/
│       ├── inbox.js
│       ├── news.js
│       └── placeholder.js
├── tests/
├── cache/                 (git-ignored)
├── _build/
├── app-decisions.md
└── wishlist.md
```

## Cross-app behaviour

Every way into another app goes through `/open/<app>`, so a future remote mode changes one
function, `launcher.target_url`, and nothing in the other apps.

| From | To | What crosses | What breaks if it changes |
|---|---|---|---|
| Home catalog | `System/Apps/*/`, `System/Widgets/*/` | Folder names; presence of `README.md`, `_build/`, `_build/specs/`, `_build/build.md` | Renaming an app folder unlinks it from `catalog.json` (it shows as Unsorted). A change to `!AppDevelopment`'s file layout changes how phases read |
| Home launcher | LukeatronWiki, Project Dashboard | Runs their own `ensure-*.sh`; expects ports 8787 / 8789 | Moving a port or renaming the script needs a `catalog.json` edit |
| Home launcher | Storytelling, Rhetoric, Grammar, Logic, Research and other `server` apps | Runs `server.py` detached on the port in `catalog.json` | Same; a server that does not restart on code change serves stale pages |
| Home launcher | Riddle, FolkTale, Psychometric, AiCharacteristics | Serves their page as a `file` (`*_generator.html`, `web/index.html`) | A second file (e.g. split JS) would need serving too |
| Home slot | `System/Widgets/InboxNote/` | Serves `web/` at `/widgets/InboxNote/`; `POST /api/inbox-note` writes one file into `Inbox/` | Moving the widget or `Inbox/` breaks the slot; self-check refuses to start without `Inbox/` write access |
| Home panel | `System/Widgets/Larder/` | Imports the widget's `larder` package for `/api/larder/*` | Self-check stops Home if the package will not load |
| Home routes | `System/Apps/AiCharacteristics/` | `/api/aichar/*` runs `!ScrapeAiCharacteristics` / `!CheckAiCharacteristics` with `claude -p`; Scrape may write only that app's `data/` | Needs Claude Code signed in on the Mac; renaming either skill breaks the button |
| Home verse | `Memory/Long-Term/Bible/engbsb_vpl/engbsb_vpl.txt` | Read-only, `BOOK C:V text` lines | A format change breaks the offline verse (online is unaffected) |
| Home verse | biblegateway.com daily-verse feed | One GET a day, JSON | Feed change → falls back to BSB |
| Home auth | `System/Credentials/Home/` | Passkeys, session secret, agent key; synced by Dropbox between Macs | Deleting it signs everyone out and reopens first-passkey setup |
| Agents and skills | Home | `/apps.json`, `/llms.txt`, `/open/<app>`, `/api/verse` with `X-Home-Key`, read from `System/Credentials/Home/agent-key` | Changing the record shape breaks agent callers |
| launchd | Home | Keeps `server.py` alive per Mac; independent of the Wiki and Dashboard `SessionStart` hooks | — |

Styling: `static/tokens.css` is a copy of `!HouseStyle`'s token layer; `home.css` cites only its
tokens. A change to the house tokens is copied here by hand.
