---
plan: "retire-minortask-initiative"
context: [Lukeatron]
secondary_contexts: []
created: 2026-09-14
status: Completed
major_because: "multi-step + removes two protected core skills (!MinorTask, !Initiative) + modifies protected skills (!Intake, !PastoralNote) and CLAUDE.md — all High-impact; Luke's explicit instruction 2026-09-14 grants sign-off"
project: "Memory/Medium-Term/Projects/PR-01-lukeatron-future-improvements"
skills_used: [!CreatePlan]
---

# Plan — Retire !MinorTask and !Initiative; rewire their callers to Projects

## Objective
No live Lukeatron file routes work to the retired MinorTasks queue: small tasks land as Next Actions in projects, and the two queue skills sit in `Trash/`.

## Success criteria (measurable)
- `.Claude/skills/!MinorTask/` and `.Claude/skills/!Initiative/` no longer exist; both are in `Trash/MinorTasks-queue-retired-2026-09-14/`.
- `grep -rn "MinorTask\|!Initiative\|MinorTasks"` over live files (excluding `Archive/`, `Trash/`, `.git/`, `System/Plans/Completed/`, `Memory/Long-Term/Logs/`, and this plan) returns only lines that record the retirement as history.
- `!Intake` ① routes a one-off to a Next Action in the best-fit Active project (e.g. PP-18 for chores) and an unplaceable/ambiguous item to the existing leave-in-Inbox-and-flag path; its Contacts check runs inline.
- `!PastoralNote` routes a follow-up to a project (offered) or reports it to Luke in chat — never to a queue.
- CLAUDE.md: Impact Axis re-anchored on `!ProjectSweep`; `!MinorTask`/`!Initiative` rows removed from Key Skills; Inbox Disposition, Promotion, Memory Structure and Folder Reference no longer mention the queue.
- crontab has no `initiative-sweep` line (done before this plan, 2026-09-14).

## Resources
- **Memory to read:** `Memory/Long-Term/Lukeatron/memory-structure.md`, `Memory/Medium-Term/Contacts/_index.yaml`
- **Capability skills:** none
- **Domain skills (Skillbank):** none
- **Sub-agents:** none
- **Scripts:** none
- **Temp-skills:** none

## Steps
- [x] Step 1 — `!Intake`: rewrite ① minor/ambiguous cases, inline the Contacts check, drop queue deps/footprint.
- [x] Step 2 — `!PastoralNote`: follow-ups → project (offered) or chat report; drop MinorTasks footprint.
- [x] Step 3 — CLAUDE.md: Impact Axis, Inbox Disposition table + fallback paragraph, Key Skills rows, Promotion line, Memory Structure, Folder Reference.
- [x] Step 4 — Docs/templates: `System_guide.md` (§4 note, §6 store box, §7 engines, §8 skill map), `memory-structure.md`, `Template_Contact.md`, `Contacts/_index.yaml` comment, `!PlainEnglish` example, `!Brainstorm` hand-offs, `Improvements.md` rules 3–4, `Viewer-Launch-Guide.md` + `LukeatronWiki/enrich.py` comment.
- [x] Step 5 — Move `.Claude/skills/!MinorTask/` and `!Initiative/` to `Trash/MinorTasks-queue-retired-2026-09-14/`.
- [x] Verify — grep criterion above; read back each edited block.

Out of scope (flag, don't fix): ProjectKanban's dormant `read_queue` code (returns empty when the file is missing — harmless); `System/Plans/New/system-review-fix-pass-1.md` Step 1 (schedules the retired sweep — orphaned); completed plans and logs (history).

## Final step — Logging (always present)
- [x] Append one line per skill in `skills_used` to `Memory/Long-Term/Logs/skills.log`.

## Final step — Close out (always present)
- [x] Update `status: Completed` in this plan's frontmatter.
- [x] Append one entry to `Memory/Long-Term/Logs/completed-plans.log`.
- [x] Move the file from `System/Plans/New/` to `System/Plans/Completed/`.
