---
plan: "system-tidy-2026-10-09"
context: Lukeatron
secondary_contexts: []
created: 2026-10-09
status: Completed
major_because: "multi-step; edits CLAUDE.md, memory.md and settings.local.json (High impact), moves Outbox/ and Archive/ material — explicitly authorised by Luke in chat 2026-10-09"
project: ""
skills_used: [!CreatePlan, !ReviewPlan, !Checkpoint]
---

# Plan — System tidy (audit follow-up)

## Objective
Act on the 2026-10-09 audit: make the boot set actually load, clarify the unclear CLAUDE.md instructions, halve Archive/, clear stale Outbox/ and Sandbox/ items, document the uncatalogued System/ folders, clear caches, and standardise on `.claude`.

## Success criteria (measurable)
- CLAUDE.md imports `memory.md` and the Skillbank catalog; `memory.md` names the real root path; no `lukeishammacbookair` path remains in `.claude/`.
- CLAUDE.md: no "sitemap" reference; one consistent store count matching disk; routing gate names its exceptions; standing-skill blockquotes cut to a pointer; Skillbank layout lists all domain folders.
- `du -sh Archive` ≤ 260M (result: 188M), with every compressed folder verified (tar listing count = original file count) before its original moves to `Trash/`.
- Outbox/ holds only drafts still awaiting Luke; Sandbox/ holds only items an open plan or live code references.
- *Folder Reference* lists every System/ subfolder on disk; empty folders removed.
- No `__pycache__` outside Trash/ and System/Apps/Rhetoric/.
- Git tracks `.claude/…` (lower case); every doc reference uses `.claude`.
- The old `system-review-fix-pass-1` plan is archived.

## Steps
- [x] Step 1 — Boot wiring + stale paths (CLAUDE.md imports, memory.md path, settings.local.json). [edit]
- [x] Step 2 — CLAUDE.md clarifications (#3 of the audit). [edit]
- [x] Step 3 — Archive: tar.xz the four largest/most redundant groups, verify, move originals to Trash/. [script]
- [x] Step 4 — Outbox and Sandbox: archive spent items; promote proving records into their skill folders and repoint references. [move + edit]
- [x] Step 5 — Folder Reference: document uncatalogued folders; remove empty ones; caches → Trash/. [edit + move]
- [x] Step 6 — `.Claude` → `.claude` (git mv, references). [script]
- [x] Verify — each success criterion checked; lint passes. [pass/fail]

## Final step — Logging (always present)
- [x] Append one line per skill in `skills_used` via `skilllog.py write`.

## Final step — Close out (always present)
- [x] Update `status: Completed` in this plan's frontmatter.
- [x] Append one entry to `Memory/Long-Term/Logs/completed-plans.log`.
- [x] Move the file from `System/Plans/New/` to `System/Plans/Completed/`.
