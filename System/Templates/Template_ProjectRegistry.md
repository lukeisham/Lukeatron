<!--
PROJECT REGISTRY TEMPLATE — source of truth for project registries
================================================================================
WHAT THIS IS
  • The central document for a project: the multi-actor control surface that
    coordinates events, documents, people, agent plans, future agent actions,
    and next actions for humans (Luke or others) around one central purpose.
  • A Plan is a verb the agent runs (single-actor, New→Completed, ephemeral).
    A Registry is the noun that owns the project — it references plans, it is
    not one. A project may spawn many plans over its life; the registry outlives
    each of them.

WHERE IT LIVES
  • One folder per project in Medium-Term (pruned/closed on demand):
        Memory/Medium-Term/Projects/<ID>-<kebab-slug>/
          ├── registry.md      ← this file (the STRUCTURED control surface)
          ├── notes.md          ← UNSTRUCTURED scratchpad for scraps that shape agent
          │                        actions; one per project, from Template_ProjectNotes.md
          └── documents/        ← working docs; deleted with the folder at closeout
  • The cross-project dashboard is Memory/Medium-Term/Projects/_tracking.yaml —
    add/update a row there whenever a project is created, changes status, or closes.

PROJECT ID  (the <ID> above, also frontmatter `id`)
  • Format: <CTX>-<NN>  →  context prefix + two-digit number.
    Contexts:  PP = Personal Productivity · CH = Church · TE = Teaching · PR = Personal Research
    e.g.  PR-07,  CH-03.
  • The ID never changes once assigned — plans (their `project:` field) and the
    _tracking.yaml row point to it.

LIFECYCLE
  1. Create  — copy this template to registry.md, fill the frontmatter, add a row
     to _tracking.yaml. ALWAYS create notes.md in the SAME step (copy
     Template_ProjectNotes.md → notes.md) — every project has both files from
     birth; a project folder without a notes.md is incomplete. notes.md is the
     mandatory scratchpad for miscellaneous information and small scraps related
     to the project (see Template_ProjectNotes.md for how it is used).
  2. Active  — !CreatePlan sets each plan's `project:` to this folder; log plans,
     next actions, events, documents and decisions as the project runs.
  3. Close   — !Checkpoint → !ArchiveMemory: fill the Closeout section FIRST,
     promote keepers to Long-Term, move this registry to Archive/, set status
     Archived in _tracking.yaml, and only THEN delete the folder. Deletion is the
     last step, never the lossy first one.

USING THE TEMPLATE
  • Keep the frontmatter and the 🎯 Purpose, 🎯 Definition of Done, ✅ Next Actions
    and 📄 Documents sections always. The rest are trimmable for small projects.
  • Purpose + Definition of Done DESCEND from the context's 📐 Project Charter
    (System/Context/<context>.md). The Purpose specialises the charter's North Star;
    the Definition of Done inherits the charter's baseline and may add to it, never
    drop below it. This is what makes the context readme shape the project's outcome.
  • Leave a `<placeholder>` prompt in any section you have no data for yet.
  • Delete this comment block from the finished registry.
================================================================================
-->
---
project: "<kebab-slug>"              # also the folder name, after the <ID>-
id: "<CTX>-<NN>"                     # PP|CH|TE|PR + two digits, e.g. "PR-07" — never changes
title: "<Human-readable project name>"
purpose: "<one-sentence north star — SPECIALISES the context Charter's North Star (System/Context/<context>.md)>"
context: [Personal Productivity | Church | Teaching | Personal Research]
secondary_contexts: []               # other domains the project touches; omit if none
status: Active                       # Active → Paused → Blocked → Complete → Archived
created: <YYYY-MM-DD>
updated: <YYYY-MM-DD>                # bump whenever the registry changes
target: ""                           # due/target date, if any
owner: "Luke"                        # default human owner
people: []                           # People IDs involved, e.g. ["DH26", "AI79"]
plans: []                            # plan kebab-names this project has spawned
tags: []                             # future-proof keywords (Skill 22)
version: "1.0.0"
type: project-registry
description: "<mirrors purpose — one-sentence OKF summary>"
---

# 🎯 Purpose
<The central purpose or task, in one paragraph. Everything below serves this.
 It specialises the North Star in the context's 📐 Project Charter (System/Context/<context>.md).>

# 🎯 Definition of Done
<What "done" looks like for THIS project — the acceptance test. INHERIT the context
 Charter's Definition of Done + Guardrails (System/Context/<context>.md) as the baseline,
 then add any project-specific criteria. Never drop below the charter baseline.>

- <inherited charter baseline — name the context, e.g. "meets the Personal Research charter">
- <project-specific criterion 1>
- <project-specific criterion 2>

# ✅ Next Actions
The live action list — humans AND agents. The heartbeat of the registry.

| # | Action | Owner | Type | Status | State | 🔗 Link | Due |
|---|--------|-------|------|--------|-------|---------|-----|
| 1 | <action> | Luke / <PersonID> / Agent | Human / Agent | ☐ Open | 🟢 Delegate | — | <date> |
<!-- Status: ☐ Open · ◐ Doing · ☑ Done · ⊘ Blocked · ○ Undefined -->
<!-- State (the type of attention the action needs, precedence 🔴→🟠→🔵→🟢→⚪):
     🔴 Incoming · 🟠 Mine · 🔵 Waiting · 🟢 Delegate · ⚪ Undefined.
     Same colour vocabulary !ProjectSweep uses for the whole-project roll-up in _tracking.yaml —
     the project's colour is the highest-precedence State among its open actions. -->
<!-- 🔗 Link: a shared link key (kebab slug, e.g. `bas-2026-q1`) when THE SAME task lives in more than
     one project — its copies keep Status AND State in sync. `—` = unlinked (the default). See 🔗 Linked
     Actions below. The link key is the only column carried verbatim across copies; everything else
     (Owner, Type, Due) stays local to each project. -->

### 🔗 Linked Actions — one task, kept in sync across projects
When the *same* task appears in more than one project, its copies share a **link key** so their
**Status** and **State** always move together — tick it done in one project and it reads done in all.

- **Link key** — a short kebab slug in the 🔗 Link column (e.g. `bas-2026-q1`), identical on every copy.
  `—` means the action is not linked. The central ledger is `Memory/Medium-Term/Projects/_links.yaml`.
- **Auto-linking is fuzzy, on a STRICT setting.** !ProjectSweep (and !Intake, when it adds an action)
  matches each action's text against every other project's open actions. A match requires the **same
  task and the same object**, tolerating only spelling, grammar, punctuation, casing and word-order
  differences ("file the Q1 BAS" ≡ "lodge Q1 BAS return"). Different object or scope does **not** link
  ("file Q1 BAS" ≠ "file Q2 BAS"; "email Robert re insurance" ≠ "email Robert re laundry"). When in
  doubt, leave them unlinked — over-linking silently couples unrelated work.
- **Sync rule.** Whenever any linked copy's Status or State changes, every sibling is set to match
  (last edit wins) and `_links.yaml` records the new canonical value. Because State syncs, a linked
  action going 🔴 in one project can raise another project's whole-project roll-up — that is intended.
- Reconciled every run by !ProjectSweep; can also be done on demand. To unlink, set the cell back to `—`
  in every copy and drop the key from `_links.yaml`.
<!-- ○ Undefined = no owner assigned (not Luke, an agent, or a named person) AND/OR no Due set — the row
     needs SHAPING, not chasing. !ProjectSweep rolls the whole project up to ⚪ grey when its only open
     items are Undefined. This is about the action itself being unshaped — distinct from the supporting
     information in 📄 Documents / 🗓️ Events / 👥 People, which is context, never an "undefined item". -->

# 🗓️ Events
Dated log — meetings, deadlines, milestones, calendar items.

| Date | Event | Type | Link |
|------|-------|------|------|
| <YYYY-MM-DD> | <what> | Meeting / Deadline / Milestone | <Calendar event id or doc> |

# 📄 Documents
Manifest of everything in `documents/` — and where each goes when the folder is deleted.

| File | What it is | Status | On close → |
|------|-----------|--------|-----------|
| documents/<file> | <desc> | Draft / Final | Long-Term/<store> · Archive/ · Discard |

# 👥 People
| Person (ID) | Role | Link |
|-------------|------|------|
| <ID Name> | <role on project> | Memory/Long-Term/People/<ID Name>/ |

# 🤖 Agent Plans
Workflows this project has spawned. Plans are the *verbs*; this registry is the *noun*
that owns them. Each plan's frontmatter `project:` points back to this folder.

| Plan | Status | Link |
|------|--------|------|
| <plan-kebab-name> | New / Completed | System/Plans/New/<name>.md |

# 🔮 Future Agent Actions
Candidate automations — things an agent *could* do later but aren't a committed plan
yet. Promote to a real Plan (!CreatePlan) when ready.

- [ ] <possible future agent action> — <trigger / when it'd make sense>

# 🧾 Decision Log
Append-only — what was decided, when, and why (Skill 13).

- <YYYY-MM-DD> — <decision> — <rationale>

# 📦 Closeout / Archive Plan
Filled in BEFORE !ArchiveMemory runs — this is what survives the folder deletion.

- **Promote to Long-Term:** <files → Memory/Long-Term/<store>>
- **Move to Archive/:** <files — including this registry as the project's record>
- **Discard:** <files>
- **Then:** set `status: Archived`, update the row in `_tracking.yaml`, delete the folder.
