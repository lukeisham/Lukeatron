---
plan: "teaching-apps-types"
context: [Teaching]
secondary_contexts: [Lukeatron]
created: 2026-10-09
status: Completed
major_because: "multi-step"
project: ""
skills_used: []
---

# Plan — Types in the Teaching App family

## Objective
Writing, Style, Grammar, Logic and Research each hold three kinds of item: patterns (the smallest item), labels (organisers) and Types (pattern-like records that can contain patterns and other types); Rhetoric is untouched.

## Success criteria (measurable)
- In each of the five apps, `schema.sql` has `entries.kind` ('pattern' | 'type') and one `placements` table; `nodes` and `entry_nodes` are gone.
- Alphabetical lists types and patterns together; each group (Templates, Brainstorming, Research, Topical) shows types as openable headings that hold patterns and types.
- A parent in `placements` must be a type, and a type cannot contain itself within one tree; both are enforced in the database and covered by tests.
- Grammar, Logic and Research use the four groups (Luke's choice, 2026-10-09); Popularity is gone from all five.
- Each app's Python and JS test suites pass; each database is rebuilt empty on the new schema; Rhetoric has no edits.

## Resources
- **Memory to read:** `Memory/Long-Term/Coding/vibe-coding-rules.md`
- **Capability skills:** none
- **Domain skills (Skillbank):** `!AppPropagate`, `!AppDevelopment` (guardrails only)
- **Sub-agents:** none
- **Scripts:** `System/Tools/teaching-app-family/sync.py`
- **Temp-skills:** none

## Steps
- [ ] Step 1 — Design: Types are `entries` rows with `kind = 'type'`; `placements(hierarchy, parent_id, member_id)` replaces `nodes` and `entry_nodes` [reads: Writing code]
- [ ] Step 2 — Writing: `schema.sql`, `items.py`, then front end (`state.js`, `view.js`, `render.js`, `main.js`, css), About, README, `app-decisions.md`
- [ ] Step 3 — Writing: rewrite the tests; both suites green
  - [ ] !Checkpoint — ask before deleting `writing.db`
- [ ] Step 4 — Carry to Style, Logic, Grammar, Research with `!AppPropagate` (target choice already made: all four); port by hand where the code differs
- [ ] Step 5 — Grammar, Logic, Research: also move to the four groups and drop Popularity
- [ ] Step 6 — Each app: both suites green, About and README updated, database rebuilt after Luke's yes
- [ ] Verify — every line in **Success criteria** holds [pass/fail]

## Final step — Logging (always present)
- [ ] Append one line per skill in `skills_used` to `Memory/Long-Term/Logs/skills.log` with `skilllog.py write`.

## Final step — Close out (always present)
- [ ] Update `status: Completed` in this plan's frontmatter.
- [ ] Log completion: `python3 System/Tools/skilllog/skilllog.py complete 'plan:teaching-apps-types' "Types in the Teaching App family"`. Write this BEFORE moving the file.
- [ ] Move the file from `System/Plans/New/` to `System/Plans/Completed/`.
