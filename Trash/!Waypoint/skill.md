---
name: "!Waypoint"
description: >
  Overwrite WAYPOINT.md at a coding repo's root with a full session-state snapshot (what's done,
  session products with commit hash, binding decisions, pending decisions, ordered next actions,
  operational gotchas, key files for a cold start), then commit and push it. Use when asked to
  checkpoint/snapshot session state on a coding project, or before a session ends on a repo other
  agents/sessions may need to resume cold. Renamed from Keith's standalone "checkpoint" command —
  Lukeatron already has a !Checkpoint skill (the outgoing-content/memory-archive safety gate);
  this is an unrelated, repo-local session-snapshot utility, so it is renamed to avoid a trigger
  collision. The file it writes is WAYPOINT.md (not CHECKPOINT.md), for the same reason.
type: Skill
status: Active
domain: "PersonalResearch (coding / amateur builds) — Wayfinder suite"
intent: "Let a fresh session or person resume a coding project cold, from one authoritative, current WAYPOINT.md."
version: 1.0.0
dependencies: [git, "gh CLI"]
calibration:
  context: ["Personal Research"]
  level: Extended
  scope: Global
memory_footprint:
  read: []
  write: []
---

## ⚡ TRIGGER
Primary: `!Waypoint`
Fires when: asked to "save a waypoint", "snapshot this project", "checkpoint the repo" (coding
project context only — NOT Lukeatron's own !Checkpoint safety gate), or before ending a session on
a coding repo that another session/person may need to resume cold.

## 🛠️ LOGIC
See `commands/waypoint.md` for the full write-up procedure (structure, commit/push convention,
handling of unrelated uncommitted changes).

## ✅ OUTPUT
`WAYPOINT.md` at the repo root, committed and pushed (or left local + reported if push fails/no
remote); a 2-3 sentence summary of what it captured and the single next action it points to.
