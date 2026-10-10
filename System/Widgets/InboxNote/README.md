# InboxNote

A jotting box in Home's Inbox slot that turns a thought into a Markdown file in `Inbox/`, where
`!Intake` picks it up and routes it. Its code lives here; Home keeps four thin hooks that point at
it. Home owns every HTTP concern (the session, the Origin check, status codes); InboxNote owns every
note concern (limits, naming, the write).

Tests: `python3 -m unittest discover -s tests` and `node --test tests/*.mjs` from this folder.

## Navigation

```
InboxNote/
├── app-decisions.md
├── README.md
├── inbox_note/
│   ├── __init__.py
│   ├── naming.py
│   └── store.py
├── web/
│   ├── inbox-note.js
│   ├── marks.js
│   ├── api.js
│   └── inbox-note.css
├── tests/
│   ├── helpers.py
│   ├── test_naming.py
│   ├── test_store.py
│   └── test_marks.mjs
└── _build/

Home/ (hooks only)
├── static/slots/inbox.js
├── routes/inbox_note.py
└── server.py · core/paths.py · core/home.py · core/selfcheck.py · routes/page.py
```

## Cross-app behaviour

Neither side reaches into the other's internals: Home imports only `save_note` and `NoteRejected`,
and the page only calls `mount(section)`.

| From | To | What crosses | What breaks if it changes |
|---|---|---|---|
| Home `home.js` → `static/slots/inbox.js` | `web/inbox-note.js` | `mount(section)` on `[data-slot="inbox"]` | Renaming the file or export leaves the slot empty |
| Home server | `web/` | Served at `/widgets/InboxNote/<file>`, signed-in only, via Home's `HOSTED_WIDGETS` | Moving files out of `web/` makes them unreachable |
| `web/api.js` | Home `POST /api/inbox-note` | `{"text"}` in; `201 {"file"}`, or 400 / 401 / 403 / 413 / 500 / 503 | A changed status code shows the wrong error line |
| Home `routes/inbox_note.py` | `inbox_note` package | `save_note(inbox_dir, text, now)`; `NoteRejected.reason` | A new reason needs a mapping in Home's route |
| `inbox_note` | `Inbox/` | New `YYYY-MM-DD-HHMM-<slug>.md` files with `source` / `captured` front matter; never overwrites | `!Intake` relies on the files arriving whole and marked with their source |
| Home self-check | `Inbox/`, `inbox_note` | Write probe; import check | Missing either stops Home at start-up |
| `web/inbox-note.css` | Home `static/tokens.css` | Token names only | A renamed Home token unstyles the widget |

Only Home's `POST /api/inbox-note` writes, under the exception recorded in `app-decisions.md`.
