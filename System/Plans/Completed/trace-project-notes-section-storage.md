---
plan: "trace-project-notes-section-storage"
context: Lukeatron
secondary_contexts: []
created: 2026-09-12
status: Completed
major_because: "multi-step"
project: ""
skills_used: ["!CreatePlan", "!ReviewPlan", "!Checkpoint"]
---

# Plan — Trace how a project's note-box sections are stored and read back

## Objective
Answer ProjectKanban wishlist item 12 in full: document exactly where/how a project's "Scraps & ideas" / "Constraints & gotchas" / "Reference" (and "Agent guidance") sections are stored in `notes.md`, and determine whether any skill — especially `!ProjectSweep` — reads those headings back out rather than only appending to them. This specialises the Lukeatron charter's North Star (keep Lukeatron correct and *legible*) by closing a documented gap in how the system understands its own data.

## Success criteria (measurable)
- A written finding exists that answers both halves of the question: (1) the exact on-disk layout/order of the four sections per `Template_ProjectNotes.md`, `note-box.js`, and `writes.py`'s heading map; (2) a definitive yes/no — with file:line evidence — on whether any skill reads these headings back, not just appends.
- The finding is appended to `Memory/Long-Term/Lukeatron/memory-structure.md` (or a clearly-named sibling doc in that store) as durable system documentation, cleared through `!Checkpoint`.
- `System/Apps/ProjectKanban/wishlist.md` row 12 is updated (Notes column carries a one-line summary + pointer to where the full finding lives; Status set per the table's convention, confirmed with Luke rather than guessed).

## Resources
- **Memory to read:** `Memory/Long-Term/Lukeatron/memory-structure.md` (existing doctrine + style to match before appending)
- **Capability skills:** none
- **Domain skills (Skillbank):** none
- **Sub-agents:** one Explore agent for Step 3 — searching every skill body (`.claude/skills/`, `System/Skillbank/`) for the four section headings is open-ended enough to warrant a dedicated search rather than a single grep assumed exhaustive
- **Scripts:** none (one-off trace, not a repeated procedure)
- **Temp-skills:** none

## Steps
- [x] Step 1 — Read `System/Templates/Template_ProjectNotes.md` in full; record the exact order, headings, and any placeholder/format convention for the four sections. [reads: System/Templates/Template_ProjectNotes.md]
- [x] Step 2 — Read `System/Apps/ProjectKanban/_template/app/project/note-box.js` (the section definitions) and the heading-map region of `System/Apps/ProjectKanban/_template/writes.py` (~lines 120-130); confirm the UI-to-append-heading mapping is exactly the same four labels as the template. [reads: those two files]
- [x] Step 3 — Search every skill body under `.claude/skills/` and `System/Skillbank/` for the four heading strings ("Scraps & ideas", "Constraints & gotchas", "Reference", "Agent guidance") to find any skill that reads a project's `notes.md` back by section rather than only appending. A quick grep during planning found zero hits — this step confirms that thoroughly rather than trusting one pass. [sub-agent: Explore]
- [x] Step 4 — Read `!ProjectSweep`'s `skill.md` directly regardless of Step 3's grep result, since it is the project skill most likely to consume `notes.md` content; confirm by name whether/how it touches these sections. [reads: .claude/skills/!ProjectSweep/skill.md]
- [x] Step 5 — Synthesise Steps 1-4 into a short written finding: where each section lives, how it's written, and the definitive answer on read-back (with file:line citations).
  - [x] !Checkpoint — before Step 6 writes the finding into Long-Term memory.
- [x] Step 6 — Append the finding to `Memory/Long-Term/Lukeatron/memory-structure.md`, matching that file's existing structure/style. [writes: Memory/Long-Term/Lukeatron/memory-structure.md]
- [x] Step 7 — Update `System/Apps/ProjectKanban/wishlist.md` row 12: Notes column gets a one-line summary + pointer to Step 6's write-up; ask Luke which Status value applies (the table's current vocabulary — open/adopted/built/rejected — doesn't cleanly cover "question answered, no feature shipped," so this is a judgement call for Luke rather than the agent guessing a new status value). [writes: System/Apps/ProjectKanban/wishlist.md]
- [x] Verify — outputs meet every line in **Success criteria**, and the result matches the **Objective**? [pass/fail]

## Final step — Logging (always present)
- [x] Append one line per skill in `skills_used` to `Memory/Long-Term/Logs/skills.log`, format:
  `[AGENT: !<SkillName>] [<SUCCESS|FAIL>] <one-line outcome> | tokens≈[N]`

## Final step — Close out (always present)
- [x] Update `status: Completed` in this plan's frontmatter.
- [x] Append one entry to `Memory/Long-Term/Logs/completed-plans.log` (format per that file's header — verbatim from this plan's frontmatter + Objective). Write this BEFORE moving the file.
- [x] Move the file from `System/Plans/New/` to `System/Plans/Completed/`.
