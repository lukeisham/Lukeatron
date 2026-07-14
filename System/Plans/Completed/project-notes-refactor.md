---
plan: "project-notes-refactor"
context: Personal Research
secondary_contexts: [Coding, Personal Productivity, Church, Teaching]
created: 2026-06-26
status: Completed
major_because: "multi-step + multi-domain — touches every project folder across all four contexts and adds a new System/Templates file"
project: ""
skills_used: []
---

# Plan — Give every project a `notes.md` for agent-shaping scraps

## Objective
Every project folder under `Memory/Medium-Term/Projects/` carries a `notes.md` — a lightweight scratchpad for little scraps of supporting information that **shape how AI agents act on that project** — built from one shared template, with the three existing ad-hoc notes files migrated into it.

## Success criteria (measurable)
- A new template exists: `System/Templates/Template_ProjectNotes.md`.
- All **25** project folders contain a `notes.md` (verified by count: `notes.md` files == project folders).
- The **3** pre-existing notes files (`CH-04`, `PR-03`, `PR-05`) are migrated **verbatim** into the new structure and the old-named files are gone (no orphan `*_notes.md` / `*.notes.md` left).
- Naming is uniform — every file is exactly `notes.md` beside `registry.md`.
- Each `notes.md` frontmatter `project:` matches its folder's `<ID>`.
- No `registry.md` content is altered; notes carry only scraps, not the registry's structured tables.

## Resources
- **Memory to read:** `Memory/Medium-Term/Projects/` (all 25 folders), `System/Templates/Template_ProjectRegistry.md` (sibling-style reference)
- **Capability skills:** none (purely local file work)
- **Domain skills (Skillbank):** none
- **Sub-agents:** none — deterministic file creation; one agent pass is fine
- **Scripts:** a small shell loop to stamp the template into each folder (deterministic step) — drafted/tested in `System/Sandbox/` first
- **Temp-skills:** candidate — `!NewProject` could later auto-drop `notes.md` (see Final `!Suggest`)

## Design decisions (for !ReviewPlan and Luke to confirm)

**D1 — Filename: `notes.md`** (recommended). Sits beside `registry.md`, simple, uniform. The three existing files use three *different* conventions (`_notes.md` ×2, `.notes.md` ×1) plus a slug typo (`parcelapp`) — all collapse to one clean `notes.md`. Alternative rejected: `<ID>-<slug>_notes.md` (verbose, error-prone, already mistyped once).

**D2 — Notes ≠ Registry.** The registry is the *structured* control surface (Next Actions, Events, Documents, People, Decisions). `notes.md` is the *unstructured* margin: half-formed ideas, constraints, preferences, reference snippets, reminders. Rule of promotion: when a scrap hardens into a real action / document / decision / durable fact, it graduates to `registry.md` (or Long-Term memory) and leaves the notes.

**D3 — Notes explicitly shape agent behaviour.** The template leads with an **🧭 Agent guidance** section: standing instructions an agent must read *before* taking any action on the project. This is the feature Luke asked for — scraps that steer the agent, not just passive memory.

**D4 — Protected-template touch is approval-gated.** `Template_ProjectRegistry.md` is on the "never modify without explicit permission" list. Adding a one-line note of the `notes.md` sibling to its folder-structure comment is **optional** and held behind `!Checkpoint` (Step 6). Creating the *new* `Template_ProjectNotes.md` is not a modification of a protected file, so it proceeds normally.

## The template (`Template_ProjectNotes.md`) — proposed body

```markdown
---
project: "<ID>"                      # the project's <CTX>-<NN>, matches the folder + registry.md
title: "Notes — <Project title>"
updated: <YYYY-MM-DD>
---

# 🗒️ Notes — <Project title>

> Scratchpad for little scraps of supporting information about this project —
> half-formed ideas, constraints, preferences, reference snippets, reminders.
> **These notes shape how AI agents act on this project**: anything here is
> standing context an agent should read BEFORE taking any project action.
> Unstructured by design. When a scrap hardens into a real Next Action,
> Document, Decision, or durable fact, promote it to registry.md (or
> Long-Term memory) and remove it from here.

## 🧭 Agent guidance — how to act on this project
<Standing instructions/preferences that should steer every agent action here.
 e.g. "Always draft in Luke's voice, never send", "Prefer ResMed over Bupa".>
-

## 💡 Scraps & ideas
<Loose ideas, feature thoughts, snippets — not yet structured enough for the registry.>
-

## ⚠️ Constraints & gotchas
<Things to avoid, watch out for, or remember the hard way.>
-

## 🔗 Reference
<Links, file paths, names, numbers worth keeping but not worth a Document row.>
-
```

## Steps
- [ ] Step 1 — Create `System/Templates/Template_ProjectNotes.md` with the body above (kept as a header-comment-free clean template, mirroring sibling templates). [writes: System/Templates]
- [ ] Step 2 — Read the 3 existing notes files in full and map each fragment to a template section (Purpose/feature scraps → 💡 Scraps & ideas; error/data rules → ⚠️ Constraints; paths → 🔗 Reference). Content carried **verbatim**, only re-homed. [reads: CH-04, PR-03, PR-05 notes]
- [ ] Step 3 — Draft a Sandbox shell script `stamp-notes.sh` that, for each project folder, writes `notes.md` from the template with `<ID>` and `<Project title>` substituted from `_tracking.yaml`. Skips folders flagged for manual migration (the 3 existing).
  - [ ] Test in Sandbox — run `stamp-notes.sh` against a 2-folder copy in `System/Sandbox/`; confirm correct substitution and no clobber. 
- [ ] Step 4 — Run the stamper across the **22** folders with no notes file → each gets a fresh `notes.md`. [runs: stamp-notes.sh]
- [ ] Step 5 — For the **3** existing (CH-04, PR-03, PR-05): write the migrated `notes.md` (template + verbatim scraps from Step 2), then `git`-less `rm` the old-named files so only `notes.md` remains. [writes ×3, deletes ×3]
- [ ] Step 6 — (Optional, approval-gated) Add one line to `Template_ProjectRegistry.md`'s folder-structure comment noting the `notes.md` sibling, so future projects inherit the convention.
  - [ ] !Checkpoint — modifies a PROTECTED template; hold for Luke's explicit yes/no before editing.
- [ ] Step 7 — Bump `updated:` to 2026-06-26 in each touched `notes.md`; spot-check 3 random files render correctly.
- [ ] Verify — `find Projects -name 'notes.md' | wc -l` == 25; zero `*_notes.md`/`*.notes.md` orphans; the 3 migrations preserve every original line. [pass/fail]

## Final step — !Suggest
- [ ] Recommend a temp-skill / `!NewProject` hook that drops `notes.md` from `Template_ProjectNotes.md` automatically whenever a project folder is created — so this never has to be backfilled again.

## Final step — Logging (always present)
- [ ] Append one line per skill in `skills_used` to `Memory/Long-Term/Logs/skills.log`, format:
  `[AGENT: !<SkillName>] [<SUCCESS|FAIL>] <one-line outcome> | tokens≈[N]`

## Final step — Close out (always present)
- [ ] Update `status: Completed` in this plan's frontmatter, then move the file from `System/Plans/New/` to `System/Plans/Completed/`.
</content>
</invoke>
