# ProjectKanban — Decisions

## Approvals

What Luke has signed off. A draft and an approved document look identical on disk — this table is
the only difference. A decision that deliberately reverses an earlier one also goes here, so a
later agent does not "restore" the old behaviour.

| Date | Approved | Version / scope |
|---|---|---|
| 2026-09-12 | Promoted to the live Dashboard on :8789, replacing ProjectDashboard | — |
| 2026-09-12 | No `_test/` copy — changes are made directly on the live app | — |
| 2026-09-14 | Lane colours reopened: each lane gets its own hue (reverses the 2026-09-12 two-accent decision); `data-lane-hues="mono"` toggle restores the shared rail | `app/tokens.css` |
| 2026-09-15 | Drag-and-rearrange of a project's Next Actions, persisted to `registry.md` — deliberately reverses `writes.py`'s old "named fields only, no positional API, no drag" decision (retired AD-2) | plan `projectkanban-next-actions-drag-reorder` |
| 2026-09-28 | Flattened from `_template/` to the app root; refactor registry retired | — |

## Rule exceptions

Deliberate breaks from `Memory/Long-Term/Coding/vibe-coding-rules.md`, each granted by Luke after
being asked with the rule ID and a reason. Code that matches a row here is intentional — do not
"fix" it.

| Rule ID | Where it applies | Reason | Granted |
|---|---|---|---|
| SR-4 — share, don't copy-paste | The whole app: its own copies of the parsing, write and palette modules rather than sharing ProjectDashboard's | A new app expected to replace the old one; divergence was the intended outcome | 2026-09-10 |
