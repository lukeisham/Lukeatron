# LukeatronWiki

The front door to Luke's knowledge. A local, offline web app that renders the 33 unsealed Long-Term memory stores as one interconnected wiki — so material filed under Theology, Sociology and Preaching can be read as one body of thought rather than 33 folders. Used while thinking: sermon prep, teaching prep, research, and following a half-remembered connection to where it actually lives.

## How to run it

**SessionStart hook** (automatic on every Claude session start):
```
bash /System/Apps/LukeatronWiki/ensure-wiki.sh
```
The app launches headless on port 8787 and never opens a browser tab.

**Double-click launcher** (manual, opens browser):
```
Double-click: System/Apps/LukeatronWiki/Start LukeatronWiki.command
```
This runs in the foreground with a readable banner. It opens a tab in Chrome or your default browser and stays running until you close the Terminal window or press Ctrl-C.

**By hand** (manual):
```
cd System/Apps/LukeatronWiki
python3 server.py
```
The server binds `127.0.0.1:8787` — nothing is exposed beyond the machine. Navigate to `http://127.0.0.1:8787` in any browser.

**Port:** `8787` (inherits from the retired viewer). Override with `export LUKEATRONWIKI_PORT=<port>` before running.

**To stop:** close the browser, kill the Terminal window, or press Ctrl-C. The app holds no state — there is nothing to save.

## Navigation map

```
System/Apps/LukeatronWiki/
├── ensure-wiki.sh                        SessionStart hook entrypoint (idempotent, headless)
├── Start LukeatronWiki.command           Double-click launcher (opens a tab)
├── server.py                             stdlib http dispatcher, binds :8787
├── seal.py                               Loads _sealed.yaml, enforces the seal check
├── library.py                            Read access to Long-Term stores + Nodes graph
├── render.py                             Data → three-column HTML (rail / content / Tufte margin)
├── search.py                             Substring search across unsealed stores
├── capture.py                            Fixed-template quick-capture writes
├── enrich.py                             ⊕ request → draft → accept flow
├── yamlio.py                             Minimal YAML read (+ fixed-template appends)
├── paths.py                              Canonical constants — the ONLY module holding literals
├── static/
│   ├── app.css                           House-style chrome (mild-baroque-Tufte)
│   └── app.js                            Minimal vanilla JS, no build step
├── tests/
│   └── test_*.py                         stdlib unittest, no pytest
├── serve.log                             Server output and errors (appended by ensure-wiki.sh)
└── README.md                             This file
```

The wiki graph lives in `Memory/Long-Term/LukeatronWiki/Nodes/`; the 44 stores live in `Memory/Long-Term/<store>/`. See `Memory/Long-Term/Lukeatron/memory-structure.md` for the full store directory.

## Cross-boundary behaviour

| From | To | What crosses | What breaks if it changes |
|---|---|---|---|
| seal | library | a deny/allow check on every path before any read | a sealed store becomes reachable through render or search |
| library | render | raw store-file content + node/edge graph, verbatim | render silently starts transforming — the verbatim guarantee breaks |
| library | search | the same seal-filtered content, indexed for substring | search surfaces a sealed store because it bypassed library |
| capture | library (write side) | one fixed-template queue row + one verbatim store-note append | any parsing or "where this belongs" guessing creeps in |
| enrich | `!Checkpoint` → library (write side) | an accepted draft, as a `.p-gen` block with a `verified:` stamp | a draft lands in a store without Luke's Accept click |
| server | seal, library, render, search, capture, enrich | HTTP routing only — server owns `:8787` and dispatches | a module assumes a host other than localhost |
| migration | server | nothing at runtime — only the SessionStart hook and archive path | if migration and server disagree on the entrypoint, the hook fails |

## Key decisions

| # | Decision | Reason | Rejected alternative |
|---|---|---|---|
| D-1 | The seal check lives inside `library`, not re-checked by each caller | One enforcement point that can't be forgotten | Each module checks `_sealed.yaml` itself — one omission leaks a sealed store |
| D-2 | `server` is a thin stdlib dispatcher with no business logic | Keeps stdlib-only compliance trivial to audit | A fatter server that renders inline — harder to test and audit independently |
| D-3 | `capture` and `enrich` are two separate modules | They sit on opposite sides of the trust boundary: capture is deterministic and ungated; enrich is agent-drafted and gated | One writer module — conflates a no-agent path with an approval-required one |

## Granted rule exceptions

These are the ONLY three places where the app writes to disk:

| Where | What | Reason |
|---|---|---|
| capture module | Append one row to `_queue.yaml` + append a verbatim note to the chosen store list file | D-5 — deterministic capture with no agent step; Luke's click is the approval |
| enrich module | Write a ⊕ request file to `System/Sandbox/wiki-enrich/_requests/` | D-6 — requests must persist until an agent comes online |
| enrich module | On Accept, write an accepted draft into its store slot | D-13 — Luke's Accept click is the `!Checkpoint` approval |

All three writes are fixed-template; the same input always produces the same bytes. Nothing is parsed or guessed.

## What it will not do

- **Never writes prose.** No summaries, no key points, no paraphrase. Formatting and linking only.
- **Never renders sealed paths.** A manifest (`LukeatronWiki/_sealed.yaml`) names paths the app may never open: ten whole stores + one file (People, Essential, Family, Medical, Groups, Logs, Subscriptions, Tone, Preferences, Lukeatron, and BalaclavaPC/Pastoral_Notes.table.md). Sealed paths are not read, rendered, searched, linked, or listed; they are counted in the integrity footer only.
- **Not an editor.** Content is edited in a real editor or via `!IdeaWiki`. The only writes are a queue row and a Sandbox enrichment draft.
- **Never reaches the network.** No CDN, no fonts fetched, no lookups. Offline is the normal case.
- **Never publishes.** Nothing leaves the machine; there is no export-to-web or share link.
- **Never duplicates.** Store content is read where it lives; it is never copied into a node.
- **Never ranks or recommends.** No "you might also like". See Also edges are Luke's, or gated through ⊕.

## How to run the tests

```
cd System/Apps/LukeatronWiki
python3 -m unittest discover -s tests
```

Tests use `tempfile` fixtures and monkey-patch `paths` module constants — they never write to `Memory/Long-Term/`. All tests are stdlib `unittest`; pytest is not a dependency.
