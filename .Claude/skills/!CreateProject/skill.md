---
name: create-project
description: >
  Create ONE new tracked project: build registry.md + notes.md from the templates, fill Purpose
  and Definition of Done, add a _tracking.yaml row, and log it. Never matches against or updates
  an existing project — that decision belongs to the caller. ProjectKanban's own auto-refresh
  (polled every 30s) picks up the new project on its own; nothing further to trigger. Called by
  !Intake when its ① Project axis decides a brand-new project is warranted. Also invocable
  directly: "create a project for X", "start a project called X", "new project: X".
type: Skill
status: Active
core_function: Track
domain: Orchestration
intent: "Give project creation one owner, so a new project is never missing notes.md, a tracking row, or a filled Purpose/Definition of Done — whether it's spawned by Intake or asked for directly."
dependencies:
  - "System/Templates/Template_ProjectRegistry.md"
  - "System/Templates/Template_ProjectNotes.md"
  - "Memory/Medium-Term/Projects/_tracking.yaml"
  - "System/Context/personal-productivity.md · church.md · teaching.md · personal-research.md · lukeatron.md"
version: 1.0.0
calibration:
  context: Any
  level: Brief
  scope: Global
memory_footprint:
  read: [Memory/Medium-Term/Projects, System/Context, System/Templates]
  write: [Memory/Medium-Term/Projects, Memory/Long-Term/Logs]
---

## ⚡ TRIGGER
Primary: `!CreateProject`
Secondary: DELEGATE-d to by `!Intake` (① Project, "new multi-step endeavour" case); on-demand
  "create a project", "start a project for X", "new project called X".
Shell: `/create-project`
Scope: creates exactly ONE new project per call. Never tests whether the work belongs to an
  existing project — that's the caller's job (`!Intake`'s belongs-to test, or Luke naming an
  existing project directly instead of asking for a new one).

## 🛠️ LOGIC
```
// EXECUTION_START
ASSERT a TITLE and a CONTEXT (Personal Productivity | Church | Teaching | Personal Research |
  Lukeatron) are supplied, and a one-paragraph PURPOSE is supplied or can be drafted from the
  triggering item
  ELSE ASK the caller/Luke for whichever is missing — never guess a context, never invent a Purpose.

// 1. DETERMINE ID
PREFIX = MATCH context
  CASE Personal Productivity THEN "PP"
  CASE Church               THEN "CH"
  CASE Teaching             THEN "TE"
  CASE Personal Research    THEN "PR"
  CASE Lukeatron            THEN "PR"   // no dedicated prefix exists yet — matches standing
                                         // precedent (PR-01 is a Lukeatron-context project).
                                         // The first time this fires, mention to Luke that a
                                         // dedicated "LU" prefix is available if he'd rather.
READ Memory/Medium-Term/Projects/_tracking.yaml → find the highest NN already used with this PREFIX
NN = highest + 1, zero-padded to 2 digits
ID = "{PREFIX}-{NN}"
SLUG = kebab-case(title)
FOLDER = "Memory/Medium-Term/Projects/{ID}-{SLUG}/"
ASSERT FOLDER does not already exist ELSE recompute NN once, then fail closed if it collides again

// 2. BUILD registry.md FROM System/Templates/Template_ProjectRegistry.md
FILL frontmatter: id=ID, title=TITLE, context=CONTEXT, status=Active, created=today, updated=today
FILL 🎯 Purpose ← PURPOSE (never invent one)
FILL 🎯 Definition of Done ← INHERIT the context's Charter Definition of Done + Guardrails
  (System/Context/<context>.md), then append any project-specific criteria supplied
IF an initial next action was supplied (the caller's triggering item usually implies one) THEN
  ADD it as row 1 of ✅ Next Actions: Owner + Kind + Status ☐ Open + Due as given;
  State per !ProjectSweep precedence — 🔴 Incoming if the item already carries urgency, else ⚪ Undefined
LEAVE 🗓️ Events / 📄 Documents / 👥 People / 🤖 Agent Plans / 🔮 Future Agent Actions / 📦 Closeout
  as their template placeholders. APPEND one 🧾 Decision Log line:
    "<today> — Created via !CreateProject. Source: <caller/item, or 'Luke, direct request'>."

// 3. BUILD notes.md FROM System/Templates/Template_ProjectNotes.md — ALWAYS, never optional.
//    A project folder without notes.md is incomplete (same rule !Intake always enforced).
WRITE both files to FOLDER.

// 4. REGISTER
APPEND a row to Memory/Medium-Term/Projects/_tracking.yaml:
  id: ID, project: SLUG, title: TITLE, context: CONTEXT, status: Active,
  state: "⚪ Undefined",              // untriaged — !ProjectSweep classifies it on its first pass
  waiting_on: "",
  wake: "<pending first sweep>",
  created: today, updated: today,
  path: "{FOLDER}registry.md"

// 5. DASHBOARD REFRESH — no push needed.
// ProjectKanban's own auto-refresh (GET /api/board-changed.json, polled every 30s — wishlist #5)
// stats _tracking.yaml and every registry.md it references. Steps 2 and 4 just touched both, so
// the next poll (≤30s) reloads the board on its own. There is nothing else to trigger.

LOG "[AGENT: !CreateProject] [SUCCESS] Created {ID}-{SLUG} ({context}) | tracking row added" → Logs/skills.log

RETURN {id: ID, path: FOLDER} to the caller
// EXECUTION_END
```

## ✅ OUTPUT
A new project folder `Memory/Medium-Term/Projects/<ID>-<slug>/` containing `registry.md` (Purpose
and Definition of Done filled; everything else templated) and `notes.md`; one new row in
`_tracking.yaml` (state `⚪ Undefined`, wake `<pending first sweep>`). ProjectKanban shows the new
project within 30 seconds via its own auto-refresh — no separate action needed. `{id, path}` is
returned to whoever called this skill (e.g. `!Intake`, to continue adding Next Actions/People/etc.
on top of the now-created project).

**Validation Check (Self-Test)**
```
VERIFY registry.md AND notes.md both exist under FOLDER ELSE do not register — fail closed, report what's missing
VERIFY the new ID is unique in _tracking.yaml (no collision) ELSE do not report success
VERIFY 🎯 Purpose is non-placeholder text ELSE hold and ask Luke for it — never publish a project with an empty Purpose
VERIFY Definition of Done includes the inherited context-charter baseline line ELSE add it before writing
VERIFY _tracking.yaml row count == prior + 1 ELSE report the write failure, do not claim success
```

**Error Path**
```
CATCH title, context, or purpose missing        → ASK Luke; do not create a partial project
CATCH _tracking.yaml unreachable                → fail closed: report "could not register — tracking unreachable"; delete any folder already written
CATCH ID collision (race with another create)   → recompute NN, retry once, else fail closed and report
CATCH [*]                                       → report what failed; leave no half-written project folder behind
LOG "[AGENT: !CreateProject] [FAIL] {error}" → Logs/skills.log
```
