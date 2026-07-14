---
type: Checkpoint
status: Active
domain: Orchestration
intent: "Archive or delete durable memory only after a double-check (re-read the target, surface any contradiction) and explicit Luke review. Default to a REVERSIBLE move into Archive/ — delete only on Luke's explicit request. Also runs project closeout: execute a finished project's Closeout plan — promote keepers to Long-Term, move its registry to Archive/, set the _tracking.yaml row to Archived, then delete the Medium-Term project folder. Folder deletion is always the last step. Never change unreviewed memory. Fail closed."
dependencies:
  - "Memory/Long-Term/"
  - "Memory/Medium-Term/Projects/"
  - "Archive/"
version: 1.0.0
---

## ⚡ TRIGGER
Primary: !ArchiveMemory
Secondary: Fires from !Checkpoint Gate B whenever a pending action would archive or delete Long-Term/ memory; and at the close of a finished project (Major-task close-out / project completion) to execute its registry Closeout plan.
Shell: /archivememory
Overriding rule: **Fail closed.** Never delete or move durable memory on an unresolved review. Default to a reversible move into Archive/; deletion needs Luke's explicit say-so. If you did not create the target, or its content contradicts the stated reason for removal, HALT and surface — do not proceed on that target.

## 🛠️ LOGIC
Build a manifest, double-check every target by reading it, get Luke's review, then execute only what he approved.

STEP 1 — SCOPE THE REQUEST. Identify the mode and gather targets.
  MATCH request
    CASE Long-Term archival/deletion ➔ targets = the named Long-Term/ file(s)/folder(s), each with an intended
      disposition (archive | delete). DEFAULT disposition = ARCHIVE (move). DELETE only if Luke explicitly asked.
    CASE Project closeout ➔ READ the project's registry.md "📦 Closeout / Archive Plan" section; targets = its three
      buckets (promote-to-Long-Term, move-to-Archive, discard), PLUS the registry itself, its _tracking.yaml row, and
      the project folder.
  (Medium-Term pruning of stale temp-skills/dormant projects is !PruneMemory's job, not this gate.)

STEP 2 — DOUBLE-CHECK (read before you touch). For EACH target:
  • ASSERT it exists, then READ it.
  • Confirm its content matches the stated reason for archival/deletion.
    IF content contradicts how it was described, OR you have no record of why it is being removed
      ➔ HALT this target, surface to Luke, do NOT proceed on it.
  • Record every _index.yaml / _tracking.yaml entry and cross-reference pointing at it — these must be updated in STEP 4.

STEP 3 — REVIEW WITH LUKE (mandatory). Present the manifest:
  • what moves to Archive/ · what (if anything) gets DELETED · what gets promoted to Long-Term · what is discarded.
  • Mark every DELETE explicitly as IRREVERSIBLE.
  AWAIT Luke: approve | amend | abort (AskUserQuestion or shell prompt).
  Default on no answer = DEFER (fail closed) — change nothing.

STEP 4 — EXECUTE THE APPROVED PLAN (only after approval; order matters — destructive steps LAST).
  1. PROMOTE keepers ➔ write into the correct Long-Term store; update that store's _index.yaml.
  2. MOVE-TO-ARCHIVE ➔ move target into Archive/ (keep enough of its name/path to find later);
       update the source store's _index.yaml.
  3. DELETE ➔ only the deletes Luke explicitly approved; remove the item and update its index.
  4. PROJECT CLOSEOUT ONLY ➔
       a. WRITE a summary entry to Memory/Long-Term/Logs/completed-projects.log — read the registry.md
          frontmatter for id, title, context, purpose, created, and updated; read the 📦 Closeout / Archive
          Plan section for promoted and archived items. Append the entry using the format defined in that
          log file's header. Verbatim from the registry — no paraphrasing. This step runs BEFORE any deletion.
       b. Set status: Archived in Projects/_tracking.yaml.
       c. Delete the now-emptied project folder. Folder deletion is the LAST action — never the first.

STEP 5 — VERIFY. Indexes consistent (no dangling _index.yaml / _tracking.yaml entries); Archive/ holds what was moved;
  Long-Term holds the promoted keepers; nothing approved was skipped and nothing unapproved changed.

## ✅ OUTPUT
State: Every target was double-checked and reviewed by Luke; only approved changes were made — keepers promoted,
  archived items moved (reversibly) to Archive/, explicit deletes removed, indexes updated. On a project closeout a
  summary entry has been appended to Memory/Long-Term/Logs/completed-projects.log, the registry is in Archive/,
  _tracking.yaml reads Archived, and the project folder is gone. Nothing unreviewed changed.
Log: "[AGENT: !ArchiveMemory] [SUCCESS] mode=<longterm|project-closeout> promoted=[N] archived=[N] deleted=[N] held=<none|...> | tokens≈[N]" → Logs/skills.log
Error: A target can't be read/verified, its content contradicts the stated reason, or Luke is unreachable for review
  ➔ FAIL CLOSED — defer the change, leave memory untouched, report the blocker. Never delete or archive unreviewed.
