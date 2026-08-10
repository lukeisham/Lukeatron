---
name: "!Initiative"
description: >
  The MinorTasks queue engine. Reads MinorTasks/queue.md; auto-actions Low-impact open rows
  unattended; proposes plans/sketches to Sandbox/ for High-impact rows (never executes them);
  reconciles any ☑ Done row missing from completed-minor-tasks.log (manual/dashboard
  completions) so every completion is captured regardless of how it was marked Done; emails
  Luke a digest. Scope is the MinorTasks/ queue only — never touches Projects/,
  registries, or _tracking.yaml. Triggers: "!Initiative", "run initiative", "work the queue",
  "clear the minor queue", or the scheduled initiative-sweep cron. Flag --dry → report
  what would happen, mutate nothing, send nothing.
type: Skill
status: Active
core_function: Track
intent: "Keep the minor-tasks queue moving: auto-complete Low-impact tasks inside Lukeatron unattended, surface High-impact ones to Luke with a proposal."
version: 1.0.0
dependencies:
  - ".claude/skills/!AgentMail"
  - ".claude/skills/!Checkpoint"
calibration:
  context: Any
  level: Extended
  scope: Global
memory_footprint:
  read: [Memory/Medium-Term/MinorTasks, System/Sandbox]
  write: [Memory/Medium-Term/MinorTasks, System/Sandbox, Memory/Long-Term/Logs]
---

## ⚡ TRIGGER
Primary: `!Initiative`
Secondary: scheduled `initiative-sweep` cron task; on-demand "run initiative", "work the queue", "clear the minor queue".
Flag: `--dry` → decide + report only; mutate NOTHING, send NOTHING.
Shell: `/initiative`

## 🛠️ LOGIC
```
// EXECUTION_START

DRY       = ("--dry" in flags) ? true : false
UNATTENDED = (caller == "initiative-sweep") ? true : false

// ── SCOPE GUARDRAIL (checked before ANY read/write) ──────────────────────────────────────
ASSERT (this run will NOT read or write any file under Memory/Medium-Term/Projects/)
ASSERT (this run will NOT invoke !ProjectSweep or modify _tracking.yaml or any registry.md)
IF ASSERT fails: log "[AGENT: !Initiative] [FAIL] Scope violation aborted run" → RETURN

// STEP 0 — RECONCILE MANUAL/DASHBOARD COMPLETIONS (runs every invocation, incl. --dry as report-only) ──
// Catches rows Luke ticked directly in queue.md (or via a future dashboard edit path) that
// bypassed this skill and so never got a completed-minor-tasks.log line. !Initiative remains
// the sole owner of both queue.md and the log, so backfilling here — instead of a separate
// watcher — keeps ownership intact. Runs before the ranked pass so a reconciled row can't also
// be picked up as still-open.
READ Memory/Long-Term/Logs/completed-minor-tasks.log → LOGGED_ROW_NUMBERS = set of every #{N} already present
FOR EACH row IN queue.md WHERE Status == ☑ Done AND row.# NOT IN LOGGED_ROW_NUMBERS:
  IF DRY:
    APPEND "would backfill: #{row.#} — {row.Task} (manual/dashboard completion)" to dry_report
  ELSE:
    APPEND to Memory/Long-Term/Logs/completed-minor-tasks.log:
      "[{date}] #{row.#} · {row.Task} | impact={row.Impact} | source={row.Source} | by=Luke (manual/dashboard) | notes={row.Notes or '-'} [backfilled by !Initiative reconciliation]"
    APPEND row.# to reconciled

// STEP 1 — READ AND RANK THE QUEUE ───────────────────────────────────────────────────────
READ Memory/Medium-Term/MinorTasks/queue.md
FILTER rows WHERE Status IN {☐ Open, ◐ Doing}
RANK by State precedence (🔴→🟠→🔵→🟢→⚪), then by Wake/Due ASC, then by # ASC
WORKING_SET = ranked rows

IF WORKING_SET is empty:
  LOG "[AGENT: !Initiative] [SUCCESS] Queue empty — nothing to action."
  IF NOT DRY: DELEGATE to !AgentMail: send "Queue clear" digest to luke.isham@gmail.com
  RETURN

// STEP 2 — ACTION LOW-IMPACT ROWS ─────────────────────────────────────────────────────────
// Low-impact = output stays entirely inside _Lukeatron/. Auto-actionable unattended.
// Skip 🔵 (waiting on external condition) — no point actioning a blocked row.
auto_done = []
FOR EACH row IN WORKING_SET WHERE Impact == Low AND State != 🔵:
  IF DRY:
    APPEND "would auto-action: #{row.#} — {row.Task}" to dry_report
  ELSE:
    EXECUTE the task in-system (draft content, create file, write note — ALL output inside _Lukeatron/)
    // Any output that would leave _Lukeatron/ → treat as High-impact instead; move to held[]
    MARK row: Status = ☑ Done, State = 🟢, Notes += " [Initiative: done {date}]"
    WRITE updated row back to queue.md
    // Preserve the completion in Long-Term before !PruneMemory can clear the done row (operational
    // log append — no !Checkpoint). Format per the file header.
    APPEND to Memory/Long-Term/Logs/completed-minor-tasks.log:
      "[{date}] #{row.#} · {row.Task} | impact={row.Impact} | source={row.Source} | by=!Initiative | notes={row.Notes or '-'}"
    APPEND row to auto_done

// STEP 3 — PROPOSE HIGH-IMPACT ROWS (never execute) ──────────────────────────────────────
// High-impact = modifies core skill/CLAUDE.md / touches outside _Lukeatron/ / outgoing content.
// Also hold 🔵 (waiting) rows of any impact — nothing to action yet.
held = []
FOR EACH row IN WORKING_SET WHERE Impact == High OR State == 🔵:
  IF DRY:
    APPEND "would hold/propose: #{row.#} — {row.Task}" to dry_report
  ELSE:
    IF row.Task starts with "Ask Luke what to do with:":
      // Ambiguous Intake item — surface verbatim to digest, no plan needed
      APPEND row to held
    ELSE IF State != 🔵:
      // Propose an implementation sketch
      DRAFT brief implementation sketch or !CreatePlan outline (3–5 bullet steps max)
      SAVE draft to System/Sandbox/initiative-proposal-{row.#}-{slug}.md
      UPDATE row: Notes += " [proposal: Sandbox/initiative-proposal-{row.#}-{slug}.md]"
                  State = 🟠  // your move
      WRITE updated row back to queue.md
      APPEND row to held
    ELSE:
      // 🔵 waiting — no action, just surface in digest
      APPEND row to held

// STEP 4 — DIGEST EMAIL ────────────────────────────────────────────────────────────────────
IF DRY:
  REPORT dry_report to user; RETURN

ASSEMBLE digest:
  Subject: "Lukeatron Initiative — {date} queue report"
  Body (plain text):
    ✅ Auto-actioned ({count auto_done}):
      FOR EACH row in auto_done: "  #{row.#} {row.Task}"
    🟠 Held for you ({count held}):
      FOR EACH row in held: "  #{row.#} [{row.State}] {row.Task}" + Sandbox link if proposal exists
    📋 Queue summary: {total Open} open · {count auto_done} actioned today
    IF reconciled is non-empty:
      🗒️ Backfilled ({count reconciled}) — manual/dashboard completions logged retroactively:
        FOR EACH #N in reconciled: "  #{N}"
    (Sent by Lukeatron Initiative — {date})

DELEGATE to !AgentMail: send digest to luke.isham@gmail.com
// luke.isham@gmail.com is Luke's own address → implicitly gold → no !OutgoingContentCheck needed

LOG one line → Memory/Long-Term/Logs/skills.log:
  "[AGENT: !Initiative] [SUCCESS] Auto-done:{count auto_done} Held:{count held} | {date}"

// EXECUTION_END
```

## ✅ OUTPUT
Low-impact open rows executed in-system and marked ☑ Done — each also appended to
`Memory/Long-Term/Logs/completed-minor-tasks.log` so the completion survives `!PruneMemory`;
High-impact rows marked 🟠 with a Sandbox proposal at
`System/Sandbox/initiative-proposal-{#}-{slug}.md`; `queue.md` updated; digest email sent to
`luke.isham@gmail.com`. Every run also reconciles any `☑ Done` row (manual edit or dashboard)
missing from the log, backfilling it with `by=Luke (manual/dashboard)` so no completion is lost
to `!PruneMemory` regardless of how the row was marked Done. In `--dry` mode: a would-do
report only, nothing mutated or sent.

**Validation Check (Self-Test)**
```
VERIFY (no file under Memory/Medium-Term/Projects/ was read or written this run) ELSE log FAIL + abort
VERIFY (no outgoing content left _Lukeatron/ without passing !Checkpoint or Luke's own address) ELSE log FAIL
VERIFY (every auto-actioned row now has Status ☑ Done) ELSE log discrepancy
VERIFY (every auto-actioned row produced one completed-minor-tasks.log line) ELSE log discrepancy
VERIFY (no ☑ Done row in queue.md is missing from completed-minor-tasks.log after this run) ELSE log discrepancy
VERIFY (--dry mode mutated zero files) ELSE log FAIL + alert Luke
```

**Error Path**
```
CATCH queue.md unreadable          → LOG [FAIL]; send brief error alert to Luke via !AgentMail; RETURN
CATCH exec error on a Low row      → mark that row State = 🔴, Notes = "Initiative error: {msg}"; continue to next row
CATCH !AgentMail unavailable       → save digest to System/Sandbox/initiative-digest-{date}.md; LOG warning
CATCH unattended + output tries to leave _Lukeatron/ → FAIL CLOSED: do not proceed; LOG [FAIL]; alert Luke
CATCH [*]                          → LOG "[AGENT: !Initiative] [FAIL] {error}"; alert Luke if !AgentMail available
```
