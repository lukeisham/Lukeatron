---
name: project-sweep
description: "Walk every active project, triage each into 🟢 Delegate / 🔵 Waiting / 🟠 Mine / 🔴 Incoming / ⚪ Undefined, and ADVANCE the ones that can move — generating agent next actions, plans, draft emails, documents, People profiles, temp-skill suggestions, surfacing the input Luke owes, or surfacing what's next once a blocker clears. Every advancement is anchored to the project's own Purpose, bounded by its Definition of Done, and steered by notes.md's Agent guidance. Maintains the colour board in _tracking.yaml. Generative (it creates work); !Review is its distilling sibling (it summarises). Invoke: 'sweep the projects', 'advance the projects', 'what needs pushing', 'flesh out the projects', or on its schedule."
type: Skill
status: Active
core_function: Track
domain: Orchestration
intent: "Stop projects rotting on the vine — every run, push each project forward by one concrete step or earn it a green tick, and never let one go quiet without a wake condition."
dependencies:
  - "Memory/Medium-Term/Projects/_tracking.yaml"
  - "Memory/Medium-Term/Projects/_links.yaml"
  - "Memory/Medium-Term/Projects/<ID>-<slug>/registry.md"
  - "Memory/Medium-Term/Projects/<ID>-<slug>/notes.md"
  - "System/Templates/Template_ProjectRegistry.md"
  - "System/Templates/Template_Person.md"
  - "System/Context/personal-productivity.md · church.md · teaching.md · personal-research.md · lukeatron.md"
  - ".claude/skills/!CreatePlan"
  - ".claude/skills/!Suggest"
  - ".claude/skills/!Checkpoint · !OutgoingContentCheck"
  - ".claude/skills/!PlainEnglish"
  - ".claude/skills/!AgentMail/scripts/agentmail.py"
version: 1.7.0
calibration:
  context: Any
  level: Extended
  scope: Global
memory_footprint:
  read: [Memory/Medium-Term/Projects, Memory/Long-Term, System/Context, System/Templates]
  write: [Memory/Medium-Term/Projects, System/Sandbox, Outbox]
---

## ⚡ TRIGGER
Primary: !ProjectSweep
Secondary: the scheduled task `project-sweep` (see schedule), which invokes this skill live.
Shell: /project-sweep
Flags:
  --dry        → triage and assemble the digest, but mutate NOTHING and send nothing — report what WOULD change. Default is live.
  --project <ID> → sweep one project only (e.g. --project CH-01). Default is every active project.
Scope: ALL projects with status Active / Blocked / Paused, every run. Skip Complete / Archived.
Relationship: !ProjectSweep GENERATES (advances projects, edits registries, maintains the board);
  !Review DISTILS (summarises live state into an emailed digest). Run the sweep BEFORE a Review so the
  Review reflects fresh state. They are separate skills — do not merge.

## 🛠️ LOGIC
ASSERT Memory/Medium-Term/Projects/_tracking.yaml is reachable
  ELSE fail closed: tell Luke "ProjectSweep could not run — project tracking unreachable" and STOP.

DETECT mode:
  SET interactive = (a human is present to answer !Checkpoint / !OutgoingContentCheck this run).
  IF scheduled/unattended → interactive = false. This gates STEP 3 (see APPLY-SAFE BOUNDARY).

STEP 1 — ENUMERATE.
  Read _tracking.yaml. Take every project whose status is Active, Blocked, or Paused.
  Note id, title, context, registry path. ON --project: keep only that id, and SET
  targeted = true for it — this forces STEP 2's full-read override below.
  Also read _links.yaml now (the member list only) so STEP 2's link-guard knows which projects own a
  linked action. If _links.yaml is unreachable, treat every project as potentially-linked (i.e. don't
  let the link-guard alone keep one closed) and lean on the other guards.

STEP 2 — TRIAGE EACH PROJECT (board-first; open registries lazily to save tokens).
  TARGETED-PROJECT OVERRIDE — when Luke names ONE project to action (--project <ID>, or an in-session
  request that is clearly about that project specifically, e.g. "push CH-03 forward" / "what's going
  on with the Sputnik App project"), ALWAYS OPEN its full registry.md and harvest every section below —
  skip every guard in this step and the CONFIRMED GREEN shortcut entirely, even if the board already
  shows it 🟢 with a fresh wake. Deliberate, single-project attention is exactly when a stale or
  incomplete board carry-forward is least acceptable; the guards below exist only to keep the
  ALL-projects sweep affordable, not to gate a project Luke is looking at right now.

  For the ALL-projects sweep (no --project, no named single-project request):
    READ reference/board-guards.md — the six guards that decide, per project, whether to OPEN
    registry.md this run or CARRY FORWARD its board state (the CONFIRMED GREEN shortcut).
    A targeted run never reads it: it opens everything. WHEN IN DOUBT, OPEN.

  For each project being OPENED, read its registry.md and harvest, relative to today (local Melbourne time):
    • 🎯 Purpose        — the project's central aim. STEP 3 anchors every advancement to this: an
       action that doesn't serve the Purpose isn't generated, however plausible it looks in isolation.
    • 🎯 Definition of Done — the acceptance boundary (context-charter baseline + project-specific
       criteria). STEP 3 never proposes an action, plan, or document that falls outside it.
    • 🗓️ Events        — dates ≥ today (the wake candidates).
    • ✅ Next Actions   — rows ☐ Open / ◐ Doing, with Owner + Type + Due. ⊘ Blocked rows = blockers.
    • 🔮 Future Agent Actions, 📄 Documents, 👥 People — to spot do-now work and gaps (e.g.
       a People row with on-file contact details but "<no profile yet>", a <placeholder> section).
    • 🧾 Decision Log  — open decisions a Next Action is waiting on (→ DECIDE points for Luke).
    • notes.md — ALL FOUR sections, alongside the registry:
       🧭 Agent guidance is STANDING INSTRUCTIONS for this project — binding on every advancement
         below unless it would require bypassing a safety gate (never let a note override
         !Checkpoint / !OutgoingContentCheck).
       ⚠️ Constraints & gotchas — known pitfalls to avoid when choosing HOW to advance.
       💡 Scraps & ideas / 🔗 Reference — optional context and inspiration, never a requirement.
       Missing/empty notes.md is not an error — proceed with none of the above to apply.

  Classify into exactly one STATE. Test in PRECEDENCE order — FIRST match wins: 🔴 → 🟠 → 🔵 → 🟢 → ⚪.
    1. 🔴 Incoming   — a Next Action or Event is OVERDUE (date < today, unmet), OR a due date/event is
                       CLOSE (≤ 3 days from today, local Melbourne time) with nothing queued to meet it,
                       OR the project is parked waiting on a FUTURE DATE OR STATE OF AFFAIRS to arrive
                       (a calendar date, an external milestone, "once X period closes/opens") — however
                       far out, since nothing but time itself unblocks it, not a person's action,
                       OR the project is ADRIFT — no open item at all AND no wake (genuinely empty, not
                       merely Undefined; an Undefined-but-populated project is ⚪, see 5).
    2. 🟠 Mine       — not Incoming, but the next move is Luke's: pending his input, a decision, or a
                       Human-owned action. (A looming date does NOT force red here, as long as the action
                       exists and isn't overdue — red is only for "about to slip with no plan".)
    3. 🔵 Waiting    — nothing for Luke or the agent to do now; parked waiting on an external PERSON to
                       reply or act — never a bare date or event (that's 🔴 Incoming). VALID ONLY with a
                       wake condition (a date or named trigger for when to check back in on that person).
    4. 🟢 Delegate   — healthy and moving: there is a DEFINED next step (an open action with an owner AND,
                       where it matters, a due date) and work is in motion. Nothing to surface.
    5. ⚪ Undefined   — open items exist but are not yet defined: at least one open Next Action has NO
                       deadline AND/OR NO owner assigned (not Luke, an agent, or a named person), and the
                       project fits none of the above. "Unassigned/unset" counts a blank cell OR a
                       placeholder (TBD / TBC / TBA / ? / — / N/A / none / <owner> etc.), case-insensitive. The ONE state allowed without a wake (an Undefined
                       item has no date by nature). Grey flags work that needs SHAPING, not chasing —
                       distinct from supporting information (📄 Documents, 🗓️ Events, 👥 People), which is
                       context, never an "Undefined item".
    DEFAULT → 🔴 Incoming (if it genuinely can't be classified, it needs your eye).

  THE HARD RULES (these are the point of the skill):
    1. NO 🔵 WITHOUT A WAKE. A project "Waiting" must name WHO it waits on AND a wake (a date or a named
       trigger for checking back in, like "chase X if no reply by <date>"). Waiting with no date and no
       named trigger is 🔴 Incoming, not 🔵 Waiting. Waiting ≠ Delegate. (⚪ Undefined is NOT a loophole
       here — it is for items with no owner/deadline, never an excuse to leave a genuine wait wakeless.)
    1a. WAITING ≠ INCOMING. 🔵 Waiting is for a PERSON who owes a reply or action — never a bare date or
       event. A project blocked only by the calendar (a future date, a milestone, "once X period closes")
       is 🔴 Incoming, however far out that date sits — the distinction is WHO/WHAT it's blocked on, not
       how soon.
    2. PENDING-LUKE'S-INPUT IS ORANGE. If a project needs material/decision only Luke can give, it is
       🟠 Mine (never 🔵, 🟢 or ⚪) until that material lands in Inbox/. The Inbox arrival is its wake.
    3. ⚪ IS FOR THE UNSHAPED, NOT THE OVERDUE. Precedence keeps 🔴 ahead of grey: an Undefined item that
       is also overdue or about to slip is 🔴, not ⚪. Grey applies only when nothing is pressing.

  COMPUTE wake = soonest future date worth re-checking (next event/action due), or the named trigger.

  FLAG unblocked = true when, for this project, the board's PRIOR row (before this run) was 🔵 Waiting
    and its wake has now passed, OR the registry carries an ⊘ Blocked Next Action whose blocking
    condition this run's harvest shows resolved (the referenced reply/event/decision is no longer
    outstanding). This flag does NOT change the STATE classification above — it only marks that STEP 3
    owes this project a fresh next action, not just a re-triage.

STEP 2.5 — RECONCILE LINKED ACTIONS (cross-project; APPLY-SAFE, Medium-Term only).
  READ reference/linked-actions.md and run it: a. AUTO-LINK (strict) · b. SYNC (last-edit-wins) ·
    c. PRUNE, then re-derive the roll-up State of any project whose actions changed. Every
    all-projects sweep runs it; a targeted --project run reads it only if that project is a
    member in _links.yaml. If _links.yaml is unreachable: skip this step only, note
    "link sync skipped — ledger unreachable" in the digest, continue. ON --dry: "would link / would sync".

STEP 3 — ADVANCE (🔴, 🟠, 🟢 and ⚪ — push these forward; 🔵 Waiting is parked with a wake, left untouched).
  THREE INPUTS GOVERN EVERY ADVANCEMENT BELOW (harvested in STEP 2 — skip this discipline and the
  menu degenerates into plausible-looking busywork):
    DIRECTION — 🎯 Purpose says why the project exists. Choose the menu item, and shape its content,
      so it serves that aim. An action that doesn't trace back to the Purpose is not generated here,
      however plausible it looks in isolation — surface it as a 🔮 Future Agent Action instead and
      let Luke confirm scope.
    SCOPE — 🎯 Definition of Done says how far "done" goes. Never generate an action, plan, or
      document whose result would sit outside it. A plausible advancement that would exceed the DoD
      becomes a DECIDE point (Human action asking Luke to widen the DoD or confirm the boundary),
      not a unilateral scope expansion.
    CONTEXTUAL CLUES — notes.md's 🧭 Agent guidance is binding on HOW an advancement is carried out
      (tone, channel, preferences); ⚠️ Constraints & gotchas steers around known pitfalls; 💡 Scraps &
      ideas / 🔗 Reference are optional colour, never a requirement.
  Pick from this menu whatever genuinely moves THIS project (per-project judgement — be generative,
  including steps not yet in the registry, but never invent scope the project doesn't have):

    • Agent do-now      → research, draft a document, fill registry <placeholder>s, create a People
                          profile from on-file details (Template_Person.md). Execute it this run.
                          GROUNDING RULE for any open Definition-of-Done research item: it's fair game
                          to advance inline, provided it's Low impact (internal file only). Every
                          specific fact added this way must either (a) come from a tool call made in
                          that same pass (e.g. web search), with a note of when it was checked, or
                          (b) be explicitly flagged as unconfirmed. Never write a specific name, date,
                          spelling, or affiliation to memory from unaided recall.
    • Human next action → a concrete step only Luke can take → write to ✅ Next Actions, Type Human.
    • DECIDE point      → an open decision blocking progress → surface as a Human action + in the digest.
    • Pending-Luke-input→ write the Human action AND mark for a persistent ⏳ digest nudge; keep 🟠 until
                          the material appears in Inbox/.  (Delivery = digest nudge only — no calendar, no push.)
    • Agent Plan        → a multi-step workflow → !CreatePlan, link in 🤖 Agent Plans / 🔮 Future Agent Actions.
    • Temp skill        → a repetitive/deterministic pattern seen across runs → !Suggest → temp-skills/.
    • Draft email       → outgoing correspondence → draft to Outbox/, HELD (never auto-sent).
    • Incoming fix      → a 🔴 project's MINIMUM advancement is to give it a next action or a wake
                          condition so it is no longer adrift. If genuinely unclear, do NOT fabricate —
                          flag it "needs your eye" in the digest and leave it 🔴.
    • Unblock-next      → a project FLAGGED unblocked (STEP 2): the wait/block that was parking it just
                          cleared. Read what was being waited on (the old waiting_on note, or the
                          ⊘ Blocked row's text) and write the concrete next action that follows — owner
                          + due, Type Agent or Human as fits. MINIMUM advancement: a freshly cleared
                          blocker never passes through a sweep re-labelled but still empty-handed. If
                          genuinely unclear what follows, do NOT fabricate — write a Human action asking
                          Luke to define the next step (this moves the project to 🟠, same as Define grey).
    • Define grey       → a ⚪ Undefined project's advancement is to SHAPE its open items: propose an owner
                          and/or a deadline for each undated/unowned Next Action, or — where only Luke can
                          decide who owns it or when it's due — write a Human action asking him to define it
                          (which moves the project to 🟠 once it's his call). Never invent a deadline or an
                          owner the project doesn't warrant; surfacing "this needs defining" is a valid move.

  APPLY-SAFE BOUNDARY (what executes vs. what is held):
    • Medium-Term writes (registry edits, documents/, _tracking.yaml) → APPLY DIRECTLY. No checkpoint.
    • Long-Term writes (e.g. People profiles) → route through !Checkpoint.
    • A temp contact in Medium-Term/Contacts/ who has become significant → SUGGEST promoting
      them to a People/ record (a Long-Term write via !Checkpoint). Never automatic.
    • Outgoing content (emails) → draft to Outbox/, route through !OutgoingContentCheck.
    • IF interactive = false (scheduled run): a checkpoint/approval CANNOT run → DEFER the held action
      (leave email in Outbox unsent; hold the Long-Term write) and list it in the digest as
      "awaiting your approval next session". Fail closed — never bypass a checkpoint. Medium-Term
      advancements still proceed, so every run makes safe progress even unattended.
    • ON --dry: skip ALL mutation; record every advancement as "would do".

STEP 4 — WRITE BACK (skip on --dry).
  For each project the sweep touched:
    • registry.md — add the new ✅ Next Actions, update 🔮 Future Agent Actions, append ONE 🧾 Decision
      Log line: "<today> — Sweep: <what changed>. State <emoji>; wake <wake>.", bump `updated`.
    • _tracking.yaml — set on that row:  state, waiting_on, wake, updated = today.
      (state values: "🟢 Delegate" | "🔵 Waiting" | "🟠 Mine" | "🔴 Incoming" | "⚪ Undefined".)
    • _links.yaml — persist any links minted, synced or pruned in STEP 2.5 (canonical Status/State +
      members + updated). The 🔗 Link cells in each touched registry must match the ledger.

STEP 5 — ASSEMBLE THE DIGEST (the !PlainEnglish four-part shape; Luke's voice — to-the-point,
  READ reference/digest.md for the section-by-section spec (Next Action · Explanation · Context ·
  See Also, and what goes where). Two rules that never move to a reference file: every held
  action (unsent Outbox draft, deferred Long-Term write) goes in NEXT ACTION, never Context; and
  the digest is self-addressed to Luke, so the !PlainEnglish four-part shape governs it.

STEP 6 — DELIVER.
  Write the digest to System/Sandbox/sweep-digest.txt.
  Luke is the only recipient, so no approval prompt is needed.
  ON --dry: stop here, report the path AND the would-be changes. ELSE from the _Lukeatron directory run:
    python3 ".claude/skills/!AgentMail/scripts/agentmail.py" send \
      --to "luke.isham@gmail.com" \
      --subject "ProjectSweep — <DD Mon YYYY>: <N> need you, <M> Waiting" \
      --text-file "System/Sandbox/sweep-digest.txt"

## ✅ OUTPUT
State: A digest in Luke's inbox in the !PlainEnglish four-part shape — Next Action (pending-Luke-input
  pinned first, then 🟠 Mine decisions and 🔴 Incoming notes, each flagged) · Explanation (what each
  involves) · Context (an ASCII table of the 🟢/🔵/⚪ board as continuity detail) · See Also (incidental
  findings). Behind it: every active project carries a current state on the _tracking.yaml board
  (🟢/🔵/🟠/🔴/⚪) with a
  waiting_on and — for every 🔵/🟠/🟢 project — a wake condition (⚪ Undefined is exempt; it has no date
  by nature). Each 🔴/🟠/🟢/⚪ project has been pushed forward by at least one concrete advancement (executed if Medium-Term and safe; held in Outbox / behind
  !Checkpoint otherwise). On --dry: same digest to Sandbox, unsent, with NO mutation —
  all advancements reported as "would do".
Validation:
  VERIFY the digest against the shape checks at the end of reference/digest.md ELSE reshape it.
  VERIFY every held action (unsent Outbox draft, deferred Long-Term write) appears in Next Action, not
    in the Context table ELSE promote it — fail-closed staging must never become a silent stall.
  VERIFY every enumerated project has state ∈ {🟢,🔵,🟠,🔴,⚪} in _tracking.yaml ELSE re-triage the missing one.
  VERIFY no 🔵 Waiting project lacks a wake condition ELSE reclassify it 🔴 Incoming.
  VERIFY no 🔵 Waiting project's waiting_on names a bare date/event with no person ELSE reclassify it 🔴 Incoming.
  VERIFY no pending-Luke-input project is 🔵, 🟢 or ⚪ ELSE reclassify it 🟠 Mine.
  VERIFY no ⚪ Undefined project is overdue or due-within-3-days ELSE precedence makes it 🔴 Incoming.
  VERIFY precedence held — any overdue / close-due-with-no-plan project is 🔴 even if it also fits 🟠/🔵.
  VERIFY no Long-Term write or outgoing email was applied without its checkpoint ELSE it should be held.
  VERIFY every specific fact (name, date, spelling, affiliation) added via an Agent do-now advancement
    is either tied to a same-pass tool call (with a checked-date note) or explicitly flagged unconfirmed
    ELSE strip the unsourced claim or flag it before writing back.
  VERIFY the link checks at the end of reference/linked-actions.md ELSE re-sync / prune.
  VERIFY every project flagged unblocked this run carries a fresh next action, not merely a relabel, ELSE queue one before STEP 4 write-back.
  VERIFY a targeted single-project run (--project <ID> or a named-project request) opened that project's full registry.md ELSE re-open it — the CONFIRMED GREEN shortcut must never fire on a targeted run.
  VERIFY every advancement made this run traces to the project's 🎯 Purpose and stays inside its
    🎯 Definition of Done, and does not contradict a 🧭 Agent guidance note in notes.md ELSE do not
    apply it — hold it as a DECIDE point (Human action) instead and say why in the Decision Log line.
Log: "[AGENT: !ProjectSweep] [SUCCESS] mode=<live|dry> projects=<N> incoming=<N> mine=<N> waiting=<N> delegate=<N> undefined=<N> advancements=<N> unblocked=<N> held=<N> linked=<N> synced=<N> sent=<yes|no> | tokens≈[N]" → Memory/Long-Term/Logs/skills.log
Error:
  CATCH _tracking.yaml unreachable ➔ fail closed (ASSERT), tell Luke, STOP.
  CATCH a registry unreadable ➔ skip that project, mark it "needs your eye" in the digest, continue — never fabricate its state.
  CATCH checkpoint/approval unavailable ➔ hold the action, list it as "awaiting approval", continue.
  CATCH AgentMail send fails ➔ leave the digest in Sandbox, log it, do not silently drop it.
