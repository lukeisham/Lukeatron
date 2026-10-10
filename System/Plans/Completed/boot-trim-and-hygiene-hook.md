---
plan: "boot-trim-and-hygiene-hook"
context: Lukeatron
secondary_contexts: []
created: 2026-10-10
status: Completed
major_because: "multi-step; modifies CLAUDE.md, memory.md and .claude/settings.json (High impact, approved by Luke in chat)"
project: ""
skills_used: ["!CreatePlan", "!ReviewPlan", "!Suggest"]
---

# Plan — Trim the boot set and add a session hygiene hook

## Objective
Cut about 15 KB from what every session loads at boot, without losing any rule, and add one Stop hook that catches index drift, uncatalogued Skillbank skills and Major work done without a plan.

## Success criteria (measurable)
- Boot set (CLAUDE.md + memory.md + Skillbank `_index.yaml`) is at least 12 KB smaller.
- Every rule removed from CLAUDE.md has exactly one home that CLAUDE.md points to.
- `lint_skills.py` and `memory_index.py lint` still pass; System_guide section links still resolve.
- `System/Tools/hygiene/` has tests that pass; the hook is wired in `.claude/settings.json` and fails open.

## Resources
- **Memory to read:** `Memory/Long-Term/Lukeatron/` (memory-structure.md pattern)
- **Capability skills:** none
- **Domain skills (Skillbank):** none
- **Sub-agents:** none
- **Scripts:** `System/Tools/hygiene/hook.py` (modelled on `teaching-app-family/hook.py`)
- **Temp-skills:** none

## Steps
- [x] Step 1 — Move Folder Reference detail to `Memory/Long-Term/Lukeatron/folder-reference.md`; keep the two-Mac rules in CLAUDE.md [win 1]
- [x] Step 2 — Cap Skillbank triggers at 5, drop `domain:`; update CLAUDE.md Skillbank text [win 2]
- [x] Step 3 — Collapse CLAUDE.md repeats (Types of Contexts, Operating workflow, Inbox Disposition, x-tier table) to pointers; keep headings System_guide links to [win 3]
- [x] Step 4 — Templates table → `System/Templates/_index.yaml` [win 4]
- [x] Step 5 — Cut memory.md Bootstrap Pointer repeat [win 5]
- [x] Step 6 — Build `System/Tools/hygiene/` (hook.py mark/stop + tests + README) [build]
  - [x] Test in Sandbox — unit tests on synthetic events; one dry run against the real tree
- [x] Step 7 — Wire into `.claude/settings.json` [High impact, approved]
- [x] Step 8 — Register: `history.log` decide line; folder-reference.md in Lukeatron `_index.yaml` [logs.py, memory_index]
- [x] Verify — boot set 61.0 KB → 46.9 KB; lint_skills 0 failures; memory_index lint clean; 12 hygiene tests pass [pass]

## Final step — Close out (always present)
- [x] Update `status: Completed` in this plan's frontmatter.
- [x] Move the file from `System/Plans/New/` to `System/Plans/Completed/`.
- [x] `!Suggest` — any repeated step worth a skill?
