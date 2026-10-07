# Grammar — Decisions

## Approvals

What Luke has signed off. A draft and an approved document look identical on disk — this table is
the only difference. A decision that deliberately reverses an earlier one also goes here, so a
later agent does not "restore" the old behaviour.

| Date | Approved | Version / scope |
|---|---|---|
| 2026-10-07 | **Built as one of four apps modelled on Rhetoric** (Luke: Grammar, Logic, Research, Writing), using Rhetoric's appearance, lists and functionality, with Rhetoric's Topical and Grammar groups **merged into one group, Labels** (Luke: "using the term Labels instead of types"). Nothing is seeded: the database holds the schema and no rows. | whole app |
| 2026-10-07 | **What the app calls its records** (Luke): patterns ("pattern"). The code calls them *entries* in every app. | UI wording |
| 2026-10-07 | **Changes from Rhetoric made so an empty app can be filled gradually** (taken from the request that nothing be seeded yet): `popularity`, `form_node_id` and `function_node_id` are optional (an entry with none is listed last by Popularity and sits in no Form or Function tree); `topical_rank` and the derived Unsorted heading are gone with Topical; Compare's "Fallacy" and "Flipside" are the generic "Pattern" and "Counterpart" (`counterpart_of` replaces `flipside_of`); the About page describes the groups and the scores without Rhetoric's methods; Rhetoric's seed pipeline and content guides are not copied. | `schema.sql`, `app/` |

## Rule exceptions

Deliberate breaks from `Memory/Long-Term/Coding/vibe-coding-rules.md`, each granted by Luke after
being asked with the rule ID and a reason. Code that matches a row here is intentional — do not
"fix" it.

| Rule ID | Where it applies | Reason | Granted |
|---|---|---|---|
| SR-4 | The whole app folder: its code is a full copy of Rhetoric's, made again for Grammar, Logic, Research and Writing instead of one shared module | Luke chose four self-contained apps, each in its own folder like Rhetoric, over a shared engine. The cost is that a fix to shared behaviour has to be repeated in the other apps' folders (grep for the same pattern before closing it) | 2026-10-07 |
| PY-12, API-5 | `server.py` and `labels.py`: the label write routes under `/api/labels` only | The app must save Luke's labels, their tables and the placements under them, which a read-only server cannot. The cost is that the app can change `grammar.db`. Held down by: writes touch only the `labels` and `label_placements` tables; every other write verb stays 405; a write must come from the app's own origin and carry JSON; gate tests in `tests/test_server.py`. Taken as granted by Luke's request that the app have Rhetoric's functionality (editable labels), not asked with the rule ID | 2026-10-07 |
| PY-12, API-5 | `server.py`, `labels.py`, `labeltree.py`, `aboutpage.py`: the `POST /api/labels/links` route, which also appends a new empty section to `app/about.html` | A link label needs its own section of the About page, which the app creates when the link is added. The cost is that the app edits one of its own source files. Held down by: only that route does it; the section is appended whole through a temporary file then renamed; nothing ever removes or rewrites a section; the insert and the file write succeed or fail together. Taken as granted by the same request | 2026-10-07 |
