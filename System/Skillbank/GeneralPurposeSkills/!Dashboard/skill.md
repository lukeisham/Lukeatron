---
name: "!Dashboard"
description: "Render the live project urgency dashboard — every active project as a row with square task dots (open/doing/done/blocked) and the nearest upcoming task date, ranked by 'urgency gravity' (soonest date floats to the top). Reads _tracking.yaml + each registry.md fresh; renders an HTML widget via show_widget. Interactive only (a widget cannot go in an email)."
type: Skill
status: Active
domain: PersonalProductivity
core_function: Synthesize
intent: "Give Luke a one-glance, always-current picture of where every project stands and what is due next, without storing a stale artefact."
version: 1.0.0
dependencies:
  - "template.html"
  - "Memory/Medium-Term/Projects/_tracking.yaml"
  - "Memory/Medium-Term/Projects/<ID>-<slug>/registry.md"
calibration:
  context: Any
  level: Brief
  scope: Global
memory_footprint:
  read: [Memory/Medium-Term/Projects]
---

## ⚡ TRIGGER
Primary: `!Dashboard`
Fires when: "show the dashboard", "project dashboard", "project overview", "where are my projects",
"dashboard". Also invokable as STEP 0 of an INTERACTIVE `!Review` run (never the scheduled email run —
a widget cannot render into an email).

## 🛠️ LOGIC
ASSERT Memory/Medium-Term/Projects/_tracking.yaml is reachable
  ELSE fail closed: tell Luke "Dashboard can't run — project tracking unreachable" and STOP.

STEP 1 — READ THE INDEX.
  READ _tracking.yaml. MAP each project → {id, ctx=id[:2], title, status, state}.
  state token from the `state` field: "🟢 on track"→ontrack · "🔵 waiting"→waiting ·
  "🟠 your move"→yourmove · "🔴 urgent"→urgent · "⚪ undefined"→undefined ·
  "<pending first sweep>"→pending.
  IF status=Complete → state=complete.

STEP 2 — HARVEST EACH ACTIVE REGISTRY (skip Archived; keep Complete as one dimmed row).
  For each project, READ its registry.md and pull:
    • tasks[] — the ✅ Next Actions rows IN ORDER, each as {s,t}: s = status token from the glyph
        (☐→open · ◐→doing · ☑→done · ⊘→blocked · ⚪→undefined); t = the row's Action text, trimmed
        (shown on hover over that square). (state=pending or complete → tasks=null.)
        UNDEFINED OVERRIDE: an OPEN or DOING row (☐/◐) is reclassified s=undefined (grey) when it is
        UNSHAPED — its Owner cell is UNASSIGNED, AND/OR its Due cell is UNSET.
          • Owner UNASSIGNED = blank, OR a placeholder, OR not one of {Luke, Agent, a named PersonID}.
            Treat as placeholders (case-insensitive, trim/strip surrounding <>): "", "TBD", "TBC", "TBA",
            "?", "??", "—", "–", "-", "N/A", "NA", "none", "tbd…", "<owner>", "unassigned", "someone".
          • Due UNSET = blank or any of the same placeholder tokens.
        (☑ Done and ⊘ Blocked rows keep their own colour — only open/doing go grey.)
        A grey task square is the item-level signal that drives the project's ⚪ undefined roll-up.
    • nd (next date) — the SOONEST date ≥ today drawn from, in priority order:
        1. an ☐/◐ Next Action's Due date,
        2. a 🗓️ Events row dated ≥ today,
        3. the `wake` date in _tracking.yaml (parse a yyyy-mm-dd or "DD Mon" if present).
      No parseable future date anywhere → nd=null.
    • nl (label) — nd as "MMM D" (e.g. "Jun 27"). nd=null → nl=null.

STEP 3 — BAND + RANK (urgency gravity).
  Assign each project to one band, then sort each band by nd ascending (nulls last):
    "Urgent — this week"   → nd within 7 days of today.
    "Coming up"            → nd more than 7 days out.
    "No date"              → active, state≠pending, nd=null.
    "Pending first sweep"  → state=pending.
    "Complete"             → status=Complete.
  Drop any empty band.

STEP 4 — BUILD THE DATA + RENDER.
  Build SECTIONS = [{label, ps:[{ctx,title,state,tasks,nd,nl}, …]}, …] in the band order above.
  READ this skill's template.html. Replace the three markers:
    __TODAY_ISO__   → today as yyyy-mm-dd        __TODAY_LABEL__ → today as "D Mon YYYY"
    __SECTIONS__    → the SECTIONS array as JSON literal.
  CALL show_widget(title="project_urgency_dashboard", widget_code=<filled template>).

## ✅ OUTPUT
State: an inline dashboard — projects banded by urgency, each a row of ctx-tag · title · square task
  dots · state dot · next-date — rendered live from current registry data, nothing saved.
Validation:
  VERIFY every Active project in _tracking.yaml appears in exactly one band
    ELSE note the omission to Luke (never silently drop a project).
Error:
  CATCH [registry unreadable] ➔ render the row from _tracking.yaml alone (tasks=null), flag it dim.
  CATCH [_tracking.yaml unreachable] ➔ fail closed per ASSERT above.
Log: "[WORKER: !Dashboard] [SUCCESS|FAIL] projects=<N> urgent=<N> | tokens≈[N]" → Logs/skills.log
