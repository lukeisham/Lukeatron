# Home — Decisions

## Approvals

What Luke has signed off. A draft and an approved document look identical on disk — this table is
the only difference. A decision that deliberately reverses an earlier one also goes here, so a
later agent does not "restore" the old behaviour.

| Date | Approved | Version / scope |
|---|---|---|
| 2026-09-29 | PRD approved — news feed and Inbox quick-note moved to the wishlist; Generator apps grouped under Teaching | PRD v0.2 |
| 2026-09-29 | Mockup direction: function-2 "Command", with Inbox and News placeholder slots under the bar | PRD v0.3 |
| 2026-09-29 | Command-bar behaviour: full list on click, narrows as you type (name matches first), scrolls, click to open, click away closes and clears | PRD v0.5 |
| 2026-09-29 | Design closed; specs approved — mockups retired to `Trash/Home-mockups-2026-09-29/` | PRD v0.5, all specs at prd_version 0.5 |
| 2026-09-29 | Change accepted during the build: apps open in a **new tab**; Home stays open behind them (reverses PRD v0.5's same-tab redirect — do not restore it) | page spec FR-3 |

## Key decisions

Not every decision — only one Luke explicitly wants logged, not left to the code or README. Each
gets its reason; the reason is the point. Append the moment Luke flags one, whenever that is.

| # | Decision | Reason | Rejected alternative |
|---|---|---|---|
| 1 | Name the app **Home** (2026-09-29) | Luke's choice | "Launchpad" — collides with the macOS app |
| 2 | Keep Home running always, via a launchd agent on each Mac (2026-09-29) | The link must work whether or not a Claude session is open | A `SessionStart` hook, like the Wiki and Dashboard use |
| 3 | Offline, the verse panel falls back to the local Berean Standard Bible, labelled BSB (2026-09-29) | A verse is still shown with no connection, and the label never lets it pass as NIV | Hiding the panel when offline |

## Rule exceptions

Deliberate breaks from `Memory/Long-Term/Coding/vibe-coding-rules.md`, each granted by Luke after
being asked with the rule ID and a reason. Code that matches a row here is intentional — do not
"fix" it.

| Rule ID | Where it applies | Reason | Granted |
|---|---|---|---|
| API-5 / PY-12 | `routes/aichar.py` — `POST /api/aichar/scrape` writes inside `System/Apps/AiCharacteristics/data/` only (`criteria.json`, `criteria.previous.json`, `source/article.txt`) | AiCharacteristics' Scrape button must refresh the app's saved data, and Home is where the app is served. Signed-in session plus Origin check (the agent key never qualifies), atomic writes, nothing changed on any failure, one Scrape at a time. The second write route in Home, after `/api/inbox-note`. `/api/aichar/check` and `/api/aichar/criteria` only read | 2026-10-02 |
