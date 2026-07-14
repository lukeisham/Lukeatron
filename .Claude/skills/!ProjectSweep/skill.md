---
name: project-sweep
description: "Walk every active project, triage each into 🟢 on track / 🔵 waiting / 🟠 your move / 🔴 urgent / ⚪ undefined, and ADVANCE the ones that can move — generating agent next actions, plans, draft emails, documents, People profiles, temp-skill suggestions, or surfacing the input Luke owes. Maintains the colour board in _tracking.yaml. Generative (it creates work); !Review is its distilling sibling (it summarises). Invoke: 'sweep the projects', 'advance the projects', 'what needs pushing', 'flesh out the projects', or on its schedule."
type: Skill
status: Active
core_function: Track
domain: Orchestration
intent: "Stop projects rotting on the vine — every run, push each project forward by one concrete step or earn it a green tick, and never let one go quiet without a wake condition."
dependencies:
  - "Memory/Medium-Term/Projects/_tracking.yaml"
  - "Memory/Medium-Term/Projects/_links.yaml"
  - "Memory/Medium-Term/Projects/<ID>-<slug>/registry.md"
  - "System/Templates/Template_ProjectRegistry.md"
  - "System/Templates/Template_Person.md"
  - "System/Context/personal-productivity.md · church.md · teaching.md · personal-research.md"
  - ".Claude/skills/!CreatePlan"
  - ".Claude/skills/!Suggest"
  - ".Claude/skills/!Checkpoint · !OutgoingContentCheck"
  - ".Claude/skills/!AgentMail/scripts/agentmail.py"
version: 1.0.0
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
  Note id, title, context, registry path. ON --project: keep only that id.
  Also read _links.yaml now (the member list only) so STEP 2's link-guard knows which projects own a
  linked action. If _links.yaml is unreachable, treat every project as potentially-linked (i.e. don't
  let the link-guard alone keep one closed) and lean on the other guards.

STEP 2 — TRIAGE EACH PROJECT (board-first; open registries lazily to save tokens).
  Reading all 29+ registries in full every run is the sweep's biggest cost; most are stable greens
  the sweep then leaves untouched. So decide per project, from its prior _tracking.yaml row
  (state, waiting_on, wake, updated), whether to OPEN the full registry.md this run. OPEN it when
  ANY of these holds — otherwise CARRY FORWARD the board's existing state without reading the file:
    • state is not 🟢 on track — 🔴/🟠/🔵/⚪ all need advancing or re-checking. ALWAYS open.
    • NO wake condition on the row — a green with no wake can't be trusted. Open and re-triage.
    • wake is DUE or NEAR — wake date ≤ today + 3 days — it may have fired. Open and re-triage.
    • STALE — `updated` is absent or > 21 days ago. Re-verify from source.
    • the registry file's mtime is NEWER than the row's `updated` (best-effort: `ls -la`/`stat`) —
      it was edited out-of-band since the last sweep. Open and re-triage.
    • the project is a member in _links.yaml (owns a linked action) — open so STEP 2.5 can sync it.
  A 🟢 project that passes ALL guards is CONFIRMED GREEN from the board: keep its state/waiting_on/wake
  as-is, do NOT open the file, and list it in the 🟢 digest section as "on track — wakes <wake>".
  This is the token-saving path; the guards are what keep it safe — WHEN IN DOUBT, OPEN.

  For each project being OPENED, read its registry.md and harvest, relative to today (local Melbourne time):
    • 🗓️ Events        — dates ≥ today (the wake candidates).
    • ✅ Next Actions   — rows ☐ Open / ◐ Doing, with Owner + Type + Due. ⊘ Blocked rows = blockers.
    • 🔮 Future Agent Actions, 📄 Documents, 👥 People — to spot do-now work and gaps (e.g.
       a People row with on-file contact details but "<no profile yet>", a <placeholder> section).
    • 🧾 Decision Log  — open decisions a Next Action is waiting on (→ DECIDE points for Luke).

  Classify into exactly one STATE. Test in PRECEDENCE order — FIRST match wins: 🔴 → 🟠 → 🔵 → 🟢 → ⚪.
    1. 🔴 urgent     — a Next Action or Event is OVERDUE (date < today, unmet), OR a due date/event is
                       CLOSE (≤ 3 days from today, local Melbourne time) with nothing queued to meet it,
                       OR the project is ADRIFT — no open item at all AND no wake (genuinely empty, not
                       merely undefined; an undefined-but-populated project is ⚪, see 5).
    2. 🟠 your move  — not urgent, but the next move is Luke's: pending his input, a decision, or a
                       Human-owned action. (A looming date does NOT force red here, as long as the action
                       exists and isn't overdue — red is only for "about to slip with no plan".)
    3. 🔵 waiting    — nothing for Luke or the agent to do now; parked waiting on an external person's
                       reply OR a future dated event (> 3 days out). VALID ONLY with a wake condition.
    4. 🟢 on track   — healthy and moving: there is a DEFINED next step (an open action with an owner AND,
                       where it matters, a due date) and work is in motion. Nothing to surface.
    5. ⚪ undefined   — open items exist but are not yet defined: at least one open Next Action has NO
                       deadline AND/OR NO owner assigned (not Luke, an agent, or a named person), and the
                       project fits none of the above. "Unassigned/unset" counts a blank cell OR a
                       placeholder (TBD / TBC / TBA / ? / — / N/A / none / <owner> etc.), case-insensitive. The ONE state allowed without a wake (an undefined
                       item has no date by nature). Grey flags work that needs SHAPING, not chasing —
                       distinct from supporting information (📄 Documents, 🗓️ Events, 👥 People), which is
                       context, never an "undefined item".
    DEFAULT → 🔴 urgent (if it genuinely can't be classified, it needs your eye).

  THE HARD RULES (these are the point of the skill):
    1. NO 🔵 WITHOUT A WAKE. A project "waiting" must name what it waits on AND a wake (a date or a named
       external trigger like "awaiting X's reply by <date>"). Waiting with no date and no named trigger
       is 🔴 urgent, not 🔵 waiting. Waiting ≠ on track. (⚪ undefined is NOT a loophole here — it is for
       items with no owner/deadline, never an excuse to leave a genuine external wait wakeless.)
    2. PENDING-LUKE'S-INPUT IS ORANGE. If a project needs material/decision only Luke can give, it is
       🟠 your move (never 🔵, 🟢 or ⚪) until that material lands in Inbox/. The Inbox arrival is its wake.
    3. ⚪ IS FOR THE UNSHAPED, NOT THE OVERDUE. Precedence keeps 🔴 ahead of grey: an undefined item that
       is also overdue or about to slip is 🔴, not ⚪. Grey applies only when nothing is pressing.

  COMPUTE wake = soonest future date worth re-checking (next event/action due), or the named trigger.

STEP 2.5 — RECONCILE LINKED ACTIONS (cross-project; APPLY-SAFE, Medium-Term only).
  Linked actions are the SAME task living in two or more projects, sharing a `link key` so their
  Status AND State stay in sync. This is a GLOBAL pass — it needs every project's harvested actions at
  once. Read Memory/Medium-Term/Projects/_links.yaml (the canonical ledger). If unreachable, skip THIS
  step only, note "link sync skipped — ledger unreachable" in the digest, and continue the sweep.

  a. AUTO-LINK (fuzzy, STRICT). Across all harvested open actions, find pairs/groups that are the SAME
     task and SAME object — tolerating ONLY spelling, grammar, punctuation, casing and word-order
     differences ("file the Q1 BAS" ≡ "lodge Q1 BAS return"). A different object or scope does NOT link
     ("file Q1 BAS" ≠ "file Q2 BAS"; "email Robert re insurance" ≠ "email Robert re laundry"). WHEN IN
     DOUBT, DO NOT LINK — over-linking silently couples unrelated work. For each genuine group with no
     shared key yet, mint a kebab `link key`, write it into the 🔗 Link cell of every copy's registry,
     and add a `links:` entry to _links.yaml (members = each {project, action, text}).
  b. SYNC. For every link key (newly minted or pre-existing), reconcile Status and State across its
     members on a LAST-EDIT-WINS basis: take the most-recently-changed copy's Status/State as canonical
     (use each registry's `updated` / Decision Log to judge recency; if indistinguishable, the
     highest-precedence State 🔴→🟠→🔵→🟢→⚪ and the most-advanced Status win). Write the canonical
     Status/State into EVERY member row, set `canonical` + `updated: today` in _links.yaml.
  c. PRUNE. Drop any link key now down to <2 live members (action deleted, done-and-cleared, or unlinked
     by hand); clear the orphaned 🔗 Link cell back to `—`.

  Because State syncs, a linked action forced (say) 🔴 in one project can be the highest-precedence State
  in another — so AFTER this step, RE-DERIVE the whole-project roll-up State (STEP 2 precedence) for any
  project whose actions changed here, before writing the board. ON --dry: compute and report the links
  and syncs as "would link / would sync", mutate nothing.

STEP 3 — ADVANCE (🔴, 🟠, 🟢 and ⚪ — push these forward; 🔵 waiting is parked with a wake, left untouched).
  Pick from this menu whatever genuinely moves THIS project (per-project judgement — be generative,
  including steps not yet in the registry, but never invent scope the project doesn't have):

    • Agent do-now      → research, draft a document, fill registry <placeholder>s, create a People
                          profile from on-file details (Template_Person.md). Execute it this run.
    • Human next action → a concrete step only Luke can take → write to ✅ Next Actions, Type Human.
    • DECIDE point      → an open decision blocking progress → surface as a Human action + in the digest.
    • Pending-Luke-input→ write the Human action AND mark for a persistent ⏳ digest nudge; keep 🟠 until
                          the material appears in Inbox/.  (Delivery = digest nudge only — no calendar, no push.)
    • Agent Plan        → a multi-step workflow → !CreatePlan, link in 🤖 Agent Plans / 🔮 Future Agent Actions.
    • Temp skill        → a repetitive/deterministic pattern seen across runs → !Suggest → temp-skills/.
    • Draft email       → outgoing correspondence → draft to Outbox/, HELD (never auto-sent).
    • Urgent fix        → a 🔴 project's MINIMUM advancement is to give it a next action or a wake
                          condition so it is no longer adrift. If genuinely unclear, do NOT fabricate —
                          flag it "needs your eye" in the digest and leave it 🔴.
    • Define grey       → a ⚪ undefined project's advancement is to SHAPE its open items: propose an owner
                          and/or a deadline for each undated/unowned Next Action, or — where only Luke can
                          decide who owns it or when it's due — write a Human action asking him to define it
                          (which moves the project to 🟠 once it's his call). Never invent a deadline or an
                          owner the project doesn't warrant; surfacing "this needs defining" is a valid move.

  APPLY-SAFE BOUNDARY (what executes vs. what is held):
    • Medium-Term writes (registry edits, documents/, _tracking.yaml) → APPLY DIRECTLY. No checkpoint.
    • Long-Term writes (e.g. People profiles) → route through !Checkpoint.
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
      (state values: "🟢 on track" | "🔵 waiting" | "🟠 your move" | "🔴 urgent" | "⚪ undefined".)
    • _links.yaml — persist any links minted, synced or pruned in STEP 2.5 (canonical Status/State +
      members + updated). The 🔗 Link cells in each touched registry must match the ledger.

STEP 5 — ASSEMBLE THE DIGEST (Luke's voice — to-the-point, warm, lightly witty). Sections, in order:
    ⏳ You owe the project     — PINNED AT TOP. Every pending-Luke-input item, one line each, until cleared.
    🔴 Urgent / needs your eye — overdue, about to slip, or adrift with no plan. Most urgent first.
    🟠 Your move               — other decisions/actions waiting on you; one line each: what's needed and by when.
    🟢 On track                — per project: what the sweep DID this run, what it QUEUED, what's held for approval.
    🔵 Waiting                 — one line each: "✅ <title> — waiting on <waiting_on> — wakes <wake>". Parked, not forgotten.
    ⚪ Undefined               — one line each: "✅ <title> — needs defining: <what's unshaped>". Work to shape, not chase.
  Open with a one-line state-of-play ("9 projects: 1 urgent, 3 need you, 2 waiting, 2 on track, 1 undefined").
  IF every project is a clean 🟢/🔵 with a wake, say so in one line.

STEP 6 — DELIVER.
  Write the digest to System/Sandbox/sweep-digest.txt.
  Self-addressed to Luke (luke.isham@gmail.com) — not external-party content, so !OutgoingContentCheck
  is satisfied by Luke being the recipient; send without interactive approval.
  ON --dry: stop here, report the path AND the would-be changes. ELSE from the _Lukeatron directory run:
    python3 ".Claude/skills/!AgentMail/scripts/agentmail.py" send \
      --to "luke.isham@gmail.com" \
      --subject "ProjectSweep — <DD Mon YYYY>: <N> need you, <M> waiting" \
      --text-file "System/Sandbox/sweep-digest.txt"

## ✅ OUTPUT
State: Every active project carries a current state on the _tracking.yaml board (🟢/🔵/🟠/🔴/⚪) with a
  waiting_on and — for every 🔵/🟠/🟢 project — a wake condition (⚪ undefined is exempt; it has no date
  by nature). Each 🔴/🟠/🟢/⚪ project has been pushed forward by at least one concrete advancement (executed if Medium-Term and safe; held in Outbox / behind
  !Checkpoint otherwise). A digest in Luke's inbox leads with what he owes, then urgent, then your-move,
  then on-track, then the parked 🔵 waiters. On --dry: same digest to Sandbox, unsent, with NO mutation —
  all advancements reported as "would do".
Validation:
  VERIFY every enumerated project has state ∈ {🟢,🔵,🟠,🔴,⚪} in _tracking.yaml ELSE re-triage the missing one.
  VERIFY no 🔵 waiting project lacks a wake condition ELSE reclassify it 🔴 urgent.
  VERIFY no pending-Luke-input project is 🔵, 🟢 or ⚪ ELSE reclassify it 🟠 your move.
  VERIFY no ⚪ undefined project is overdue or due-within-3-days ELSE precedence makes it 🔴 urgent.
  VERIFY precedence held — any overdue / close-due-with-no-plan project is 🔴 even if it also fits 🟠/🔵.
  VERIFY no Long-Term write or outgoing email was applied without its checkpoint ELSE it should be held.
  VERIFY every linked action's Status AND State is identical across its members and matches _links.yaml ELSE re-sync.
  VERIFY every 🔗 Link cell points to a key with ≥2 live members ELSE prune it (clear cell to —, drop the key).
Log: "[AGENT: !ProjectSweep] [SUCCESS] mode=<live|dry> projects=<N> urgent=<N> yourmove=<N> waiting=<N> ontrack=<N> undefined=<N> advancements=<N> held=<N> linked=<N> synced=<N> sent=<yes|no> | tokens≈[N]" → Logs/skills.log
Error:
  CATCH _tracking.yaml unreachable ➔ fail closed (ASSERT), tell Luke, STOP.
  CATCH a registry unreadable ➔ skip that project, mark it "needs your eye" in the digest, continue — never fabricate its state.
  CATCH checkpoint/approval unavailable ➔ hold the action, list it as "awaiting approval", continue.
  CATCH AgentMail send fails ➔ leave the digest in Sandbox, log it, do not silently drop it.
