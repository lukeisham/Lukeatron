# InboxNote — Decisions

## Approvals

What Luke has signed off. A draft and an approved document look identical on disk — this table is
the only difference. A decision that deliberately reverses an earlier one also goes here, so a
later agent does not "restore" the old behaviour.

| Date | Approved | Version / scope |
|---|---|---|
| 2026-09-29 | PRD approved — B·I·list·link formatting, 2,000-char limit, clear + confirm on save, note naming, the four Home hooks | PRD v0.3 |
| 2026-09-29 | Mockup direction: balance-2 "Side rail" (marks in a vertical rail, vertical counter at its foot, round Copy/Save icon buttons, "Copied" in the status line) | PRD v0.4 |
| 2026-09-29 | Design closed; specs approved (note-save, note-box, home-hooks, documentation) — mockups retired to `Trash/InboxNote-mockups-2026-09-29/` | PRD v0.4, all specs at prd_version 0.4 |

## Key decisions

Not every decision — only one Luke explicitly wants logged, not left to the code or README. Each
gets its reason; the reason is the point. Append the moment Luke flags one, whenever that is.

| # | Decision | Reason | Rejected alternative |
|---|---|---|---|

## Rule exceptions

Deliberate breaks from `Memory/Long-Term/Coding/vibe-coding-rules.md`, each granted by Luke after
being asked with the rule ID and a reason. Code that matches a row here is intentional — do not
"fix" it.

| Rule ID | Where it applies | Reason | Granted |
|---|---|---|---|
| API-5 | Only `POST /api/inbox-note` (InboxNote's save handler, mounted in Home). Create-only, inside `Inbox/` only, signed-in session + Origin check, 2,000-char cap, TEST-7 gate tests | Saving a note into `Inbox/` is the widget's core job; the compliant alternative (copy/download only) leaves Luke moving files by hand | Luke, 2026-09-29 |
