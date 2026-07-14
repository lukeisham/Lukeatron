---
name: "!PruneMemory"
description: >
  On-demand prune of Medium-Term/ memory — clear stale temp-skills and dormant/closed
  projects so the working stores stay lean. Read this when Luke asks to prune, tidy, sweep,
  or clear out Medium-Term, temp-skills, or dormant projects. NOT for Long-Term (that is
  !ArchiveMemory). Never prunes automatically; always reviews with Luke; routes any keeper to
  !ArchiveMemory before anything is deleted. Fail closed.
type: Skill
status: Active
domain: GeneralPurpose (system — memory maintenance)
intent: "The Medium-Term counterpart to !ArchiveMemory: on demand, clear stale temp-skills and dormant/closed projects from Memory/Medium-Term/, rescuing anything durable via !ArchiveMemory first. Memory is never pruned automatically and never without Luke's review."
version: 1.1.0
---

## ⚡ TRIGGER
Primary: `!PruneMemory`
Fires when: Luke explicitly asks to prune / tidy / sweep / clear out Medium-Term, temp-skills, or dormant projects — or a task explicitly calls it. NEVER fires automatically: Medium-Term is pruned on demand only.
Shell: `/prunememory`
Scope: `Memory/Medium-Term/` (`Projects/`, `temp-skills/`, `file-locations.md`) PLUS the orphaned plan-file shadows in `System/Plans/New/` (a plan whose project is already closed/abandoned/completed). Long-Term archival/deletion is `!ArchiveMemory`'s job — hand off to it, never reach into Long-Term here.
Overriding rule: **Fail closed.** Memory is never pruned without Luke's review. Any candidate that still holds something durable goes to `!ArchiveMemory` for keeper-promotion BEFORE deletion — never delete a project that hasn't been closed out.

## 🧭 CORE PRINCIPLE
**Medium-Term is scratch with a shelf life, not a vault.** Pruning keeps it lean — but "stale" is a proposal, not a verdict. Luke confirms every removal, and anything worth keeping is rescued (promoted via `!ArchiveMemory`) before its folder is touched.

## 🛠️ LOGIC
Find stale candidates, triage each by reading it, get Luke's review, then remove only what he approved — keepers leave through `!ArchiveMemory`, not the bin.

STEP 1 — GATHER CANDIDATES. Scan Medium-Term for staleness; build a list with the reason each qualifies.
  • `Projects/`     → read `_tracking.yaml` + each `registry.md`. STALE if status is Complete/Archived (already closed),
      Paused/Blocked with no update in a long while, or nominally Active but plainly dormant (no recent activity,
      no open Next Actions). A project marked Complete/Archived in `_tracking.yaml` whose folder still sits under
      `Projects/` is a prune candidate (close it out first — keepers via `!ArchiveMemory`).
  • `System/Plans/New/` → the plan-file shadow of a project. A `<slug>.md` here is STALE (orphaned) when its
      project is already Complete/Archived, was abandoned, or was moved to `System/Plans/Completed/` — i.e. the
      plan outlived the work. Match a plan to its project by slug/title against `_tracking.yaml` + `Completed/`.
      An orphaned plan carries no durable content of its own (the registry does) → DELETE-candidate, not a keeper.
  • `temp-skills/`  → STALE if never promoted AND superseded, failed its Sandbox test, or past a stated expiry.
  • `file-locations.md` → STALE if an entry points to a path that no longer exists.
  Active, recently-touched, or keeper-bearing items are NOT candidates by default. A plan whose project is still
  live (Active/Blocked/Paused with open work) is NEVER stale — leave it.

STEP 2 — TRIAGE EACH CANDIDATE (read before you touch). For EACH:
  • READ it. Confirm it really is stale and matches its described state.
    IF content contradicts the "stale" reason, OR you have no record of it ➔ DROP it from the list, surface to Luke.
  • KEEPER CHECK — does it hold anything durable (a finished output, a decision, a reusable script)?
      IF yes ➔ mark KEEPER → route to `!ArchiveMemory` (project closeout / promote-to-Long-Term). Do NOT delete here.
      IF no  (pure scratch, already closed out, failed/superseded prototype) ➔ mark DELETE-candidate.

STEP 3 — REVIEW WITH LUKE (mandatory). Present the manifest:
  • DELETE-candidates (the reason each is stale) · KEEPERS routed to `!ArchiveMemory` · anything dropped/surfaced.
  AWAIT Luke: approve | amend | abort (AskUserQuestion or shell prompt).
  Default on no answer = ABORT (fail closed) — change nothing.

STEP 4 — EXECUTE (only after approval).
  • KEEPERS         ➔ run `!ArchiveMemory` first — it promotes/archives and removes the source under its own gate.
  • DELETE-candidates ➔ remove the temp-skill/project/orphaned plan; update `_tracking.yaml` and `file-locations.md`
      so nothing dangles. An orphaned `System/Plans/New/<slug>.md` is deleted only once its project is confirmed
      closed/abandoned — if the project was genuinely completed, move the plan to `System/Plans/Completed/` instead of deleting.
  • NEVER delete a project folder that still holds un-promoted keepers — that path goes through `!ArchiveMemory` only.

STEP 5 — VERIFY. Medium-Term holds only live/relevant items; `_tracking.yaml` and `file-locations.md` have no dangling
  entries; every keeper was handed to `!ArchiveMemory`, not deleted in place.

## ✅ OUTPUT
State: Medium-Term pruned to live items only; stale scratch removed with Luke's approval; every keeper rescued via
  `!ArchiveMemory` before deletion; indexes consistent. Nothing pruned without review; Long-Term untouched.
Log: "[AGENT: !PruneMemory] [SUCCESS] scanned=[N] pruned=[N] keepers→archive=[N] held=<none|...> | tokens≈[N]" → Logs/skills.log
Error: A candidate can't be read/verified, or Luke is unreachable for review ➔ FAIL CLOSED — prune nothing, report the blocker.
