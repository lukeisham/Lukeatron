---
type: Skill
status: Active
domain: Orchestration
intent: "Survey every active project, distil the live state — upcoming events, open tasks and decisions — and email Luke a digest. Before surveying, drain each context's To-Do scratchpad into projects (promote new ones, clear ones already tracked). Runs twice weekly: Monday leads with Personal Productivity + Personal Research, Friday leads with Church."
dependencies:
  - "Memory/Medium-Term/Projects/_tracking.yaml"
  - "Memory/Medium-Term/Projects/<ID>-<slug>/registry.md"
  - "System/Context/personal-productivity.md · church.md · teaching.md · personal-research.md"
  - "System/Templates/Template_ProjectRegistry.md"
  - ".Claude/skills/!AgentMail/scripts/agentmail.py"
  - ".Claude/skills/!Calendar"
version: 1.3.0
---

## ⚡ TRIGGER
Primary: !Review
Secondary: the two scheduled tasks `review-monday` (Mon 08:00) and `review-friday` (Fri 17:00), each of which invokes this skill with the matching focus flag.
Shell: /review
Flags:
  --monday  → lead with Personal Productivity (PP) + Personal Research (PR); Church/Teaching follow.
  --friday  → lead with Church (CH); everything else follows.
  (no flag) → infer focus from today's weekday: Mon→--monday behaviour, Fri→--friday behaviour,
              any other day → full even-weight survey across all contexts.
  --dry     → assemble the digest and print/save it, do NOT send the email, AND do NOT mutate
              anything (no project creation, no to-do edits) — report what WOULD change. Default is live.
Scope: ALL active projects, every run. The focus flag changes ORDER and DEPTH (lead context first,
  covered more fully) — it never EXCLUDES the other contexts. "Focus more on" ≠ "only".

## 🛠️ LOGIC
ASSERT Memory/Medium-Term/Projects/_tracking.yaml is reachable
  ELSE fail closed: email Luke a one-line "Review could not run — project tracking unreachable" and STOP.

STEP 0 — SNAPSHOT (interactive runs only).
  IF this is an interactive `/review` (not a scheduled review-monday/review-friday email run),
  open by running !Dashboard (System/Skillbank/!Dashboard/) to render the live project urgency
  dashboard as a widget, THEN proceed to the digest below. On a scheduled email run, SKIP this —
  a widget cannot render into an email. Best-effort: if !Dashboard errors, note it and continue.

STEP 1 — SET FOCUS.
  Resolve the lead context(s) from the flag, or from today's weekday if no flag (see TRIGGER).
  lead = [PP, PR] on Monday; lead = [CH] on Friday; lead = all on any other manual run.

STEP 2 — DRAIN CONTEXT TO-DOS INTO PROJECTS.
  The four context readmes each carry a "## ✍️ Luke's To-Dos — *<Context>*" scratchpad. Every run,
  promote what belongs in a project and clear what's already handled, so the scratchpad stays a
  fast capture inbox and the real work lives in registries. Run this BEFORE STEP 3 so anything
  promoted this run is surveyed and appears in today's digest.

  Context → ID prefix:  personal-productivity.md → PP · church.md → CH · teaching.md → TE · personal-research.md → PR

  For EACH context file under System/Context/ (best-effort; a missing/unreadable one is skipped and
  noted in the digest — never fabricate its contents). Read the To-Do block — the lines between the
  "## ✍️ Luke's To-Dos" heading and the next `---`. For each list item:

    • BLANK open row ("- [ ]" with no text) → LEAVE it. These are the empty scratchpad rows.
    • CHECKED item ("- [x] <text>")          → DELETE the line. It's done; housekeeping only, never promoted.
    • OPEN item with text ("- [ ] <text>")   → decide via _tracking.yaml:
        – Already a project? Match the to-do SEMANTICALLY against existing project titles/slugs
          (e.g. "Setting up the Sputnik App project" ≈ a project titled "Sputnik App"). On a clear
          match → DELETE the to-do line (it's already tracked); do not create anything.
        – Not a project yet → CREATE one (sub-procedure below), THEN delete the to-do line.
        – GENUINELY AMBIGUOUS (can't tell if a match exists)? Do NOT create a duplicate and do NOT
          delete the line — LEAVE it in place and flag it in the digest under "needs your eye".
          Safe default: never fabricate a match, never risk a duplicate project.

  After processing, the To-Do section keeps its heading, its `<!-- Scratchpad… -->` comment, and at
  least two blank "- [ ]" rows so it stays usable. Edit each context file in place to reflect removals.

  CREATE-A-PROJECT sub-procedure (mirrors the manual flow — Template_ProjectRegistry + _tracking.yaml):
    1. ID  — next free <PREFIX>-<NN> for that context, read from _tracking.yaml (max existing + 1).
    2. Slug — kebab-case the to-do text (trim filler like "project"/"app" only if it reads cleanly).
    3. Folder — create Memory/Medium-Term/Projects/<ID>-<slug>/ with registry.md + notes.md + empty documents/.
       registry.md from System/Templates/Template_ProjectRegistry.md: fill id, project(slug), title,
       context, created/updated = today, status Active; purpose SPECIALISES that context's Charter
       North Star; Definition of Done INHERITS the Charter baseline. Leave <placeholder>s where the
       one-line to-do gives no detail — do not invent scope. notes.md from Template_ProjectNotes.md
       (mandatory scratchpad — created alongside every registry, never one without the other).
    4. Index — append a row to _tracking.yaml (id, project, title, context, status Active, created,
       updated, path). Keep contexts grouped as the file already does.
  This is Medium-Term mutation only (no Long-Term, no outgoing content) → no !OutgoingContentCheck.
  On --dry: skip ALL mutation; instead record what WOULD be promoted/cleared and report it.

STEP 3 — ENUMERATE PROJECTS.
  Read _tracking.yaml (now including anything STEP 2 just created). Take every project whose status is
  Active, Blocked, or Paused (skip Complete / Archived). Note each one's id, title, context, registry path.

STEP 4 — HARVEST (board-first; open registries lazily to save tokens).
  Reading all 29+ registries in full every run is the digest's biggest cost, and a confirmed-stable
  green has nothing live to surface. !ProjectSweep runs 30 min before the Monday Review and leaves the
  board fresh, so trust it: from each project's _tracking.yaml row (state, waiting_on, wake, updated)
  decide whether to OPEN registry.md this run. OPEN it when ANY of these holds — otherwise distil the
  project from its board row alone as a one-liner ("✅ <title> — on track, wakes <wake>"):
    • state is not 🟢 on track — 🔴/🟠/🔵/⚪ may need Luke's eye. Open.
    • wake is within the next 14 days, or absent — a near-term or unconfirmed item to surface. Open.
    • STALE — `updated` is absent or > 21 days ago. Open and re-verify.
    • the registry mtime is NEWER than the row's `updated` (best-effort `ls -la`/`stat`) — edited since
      the last sweep. Open.
    • the project was just created or promoted by STEP 2 this run (no board state yet). Open.
  WHEN IN DOUBT, OPEN. Confirmed-green projects appear in the digest as a single "on track" line.

  For each project being OPENED, pull relative to today (2026 dates, local Melbourne time):
  • 🗓️ Events     — any with a date ≥ today, soonest first. These are the UPCOMING EVENTS.
  • ✅ Next Actions — rows still ☐ Open or ◐ Doing. These are the TASKS. Tag overdue (Due < today)
                      and due-soon (Due within 7 days). ⊘ Blocked rows surface as blockers.
  • 🧾 Decision Log — decisions logged in the last ~7 days (RECENT DECISIONS), PLUS any open
                      decision a Next Action is clearly waiting on (DECISIONS NEEDED).

STEP 5 — ENRICH WITH THE CALENDAR (best-effort; never block on it).
  Use !Calendar to list events in the next 14 days. Fold any that match a project (or are
  obviously relevant) into the UPCOMING EVENTS list; flag calendar items not tied to any project
  under a short "On the calendar, not in a project" note. IF the calendar is unreachable, skip
  this step and add one line to the digest noting the calendar wasn't checked.

STEP 5b — CHECK THE OUTBOX (cheap; never block on it).
  List Outbox/ (best-effort `ls`). Every file staged there is finished content awaiting Luke's
  approval to send/publish that has NOT yet left the system — fail-closed staging that must never
  become a silent stall (invariant: never stall silently). Count them.
    • ≥ 1 file  → surface in the digest (STEP 6) as a standing "📤 Awaiting your approval — <N>" line
                  naming each filename, so an approved-but-forgotten draft can't rot unseen.
    • 0 files   → add nothing.
    • unreadable → add one line noting Outbox couldn't be checked; never fabricate its contents.

STEP 5c — SYSTEM GUIDE DRIFT-CHECK (cheap; flag-only; never block on it).
  CLAUDE.md is the source of truth; System/System_guide.md is its visual companion and may drift.
  Best-effort: compare the guide against CLAUDE.md's workflow loop, skill set, memory model, and
  Interactions axes (a light scan, not a rewrite). IF a diagram no longer matches → surface ONE line
  in the digest ("🗺️ System Guide drift — <what no longer matches>; guide needs a refresh"). Never
  silently edit the guide here; just flag it for Luke. IF it reads consistent, or either file is
  unreadable → add nothing (note unreadability only if it blocks the check).

STEP 6 — ASSEMBLE THE DIGEST (Luke's voice — to-the-point, warm, lightly witty).
  Order projects by focus: lead-context projects first, then the rest. Within the digest use three
  standing sections, each grouped by project:
    1. 🗓️ Upcoming events        — soonest first; overdue/this-week called out.
    2. ✅ Tasks                  — open actions; OVERDUE and DUE-SOON flagged at the top; blockers noted.
    3. 🧾 Decisions              — recent decisions + decisions Luke needs to make.
  Add a short "📥 From your to-dos" note when STEP 2 did anything: the projects it promoted this run,
  the to-dos it cleared as already-tracked, and any to-do it LEFT as ambiguous ("needs your eye").
  Add a "📤 Awaiting your approval — <N>" line (from STEP 5b) whenever Outbox/ holds ≥ 1 staged file,
  listing each filename, so nothing sits approved-but-unsent without Luke seeing it.
  Open with a one-line state-of-play ("3 things need you this week"). End with the lead context's
  items if anything there is time-critical. Keep it skimmable — bullets, not prose.
  IF a project has nothing live, omit it (don't pad). IF nothing is live anywhere, say so in one line.

STEP 7 — DELIVER.
  Write the digest to System/Sandbox/review-digest.txt.
  This digest is SELF-ADDRESSED to Luke (luke.isham@gmail.com) — it is not external-party content,
  so !OutgoingContentCheck is satisfied by Luke being the recipient; send without interactive approval.
  ON --dry: stop here, report the path AND the would-be to-do changes from STEP 2. ELSE from the
  _Lukeatron directory run:
    python3 ".Claude/skills/!AgentMail/scripts/agentmail.py" send \
      --to "luke.isham@gmail.com" \
      --subject "Review — <Mon|Fri> <DD Mon YYYY>: <N> need you this week" \
      --text-file "System/Sandbox/review-digest.txt"

## ✅ OUTPUT
State: A digest email in Luke's inbox — upcoming events, open/overdue tasks and recent/needed
  decisions across all active projects, led by the day's focus context (Mon: PP+PR · Fri: CH) — plus,
  when the scratchpads weren't empty, a "From your to-dos" note of what was promoted/cleared/flagged.
  Each context's To-Do scratchpad is drained: open to-dos became (or matched) projects and were removed;
  done items cleared; ambiguous ones left and flagged. Any content staged in Outbox/ awaiting approval
  is surfaced as an "Awaiting your approval" line so fail-closed staging never becomes a silent stall.
  On --dry: the same content saved to System/Sandbox/review-digest.txt, unsent, and NO mutations —
  the to-do/project changes are reported as "would do", not applied.
Validation: every Active project in _tracking.yaml either appears in the digest or was deliberately
  omitted for having nothing live; the lead context is ordered first; no context To-Do block still holds
  a non-blank open to-do that wasn't either promoted, matched-and-cleared, or flagged as ambiguous;
  no duplicate project was created.
Log: "[AGENT: !Review] [SUCCESS] focus=<mon|fri|full> projects=<N> promoted=<N> cleared=<N> flagged=<N> events=<N> tasks=<N> decisions=<N> outbox=<N> sent=<yes|no> | tokens≈[N]" → Logs/skills.log
Error: _tracking.yaml unreachable → fail closed (ASSERT). A context file unreachable → skip it, note in digest, continue.
  Calendar unreachable → degrade, note it, continue. AgentMail send fails → leave the digest in Sandbox,
  log the failure, do not silently drop it.
