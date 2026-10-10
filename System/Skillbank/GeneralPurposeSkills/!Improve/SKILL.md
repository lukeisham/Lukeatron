---
name: "!Improve"
description: >
  Monthly improvement pass over Lukeatron's own instructions. Reads the last month of
  Memory/Long-Term/Logs/usage.md (skills used, hooks that blocked, denials, Luke's corrections)
  and the OPEN lines of issues.log, and writes at most five concrete proposed edits to skills,
  CLAUDE.md, memory.md or tools into System/Suggestions/improve-<YYYY-MM>.md. Propose-only:
  edits nothing else. Runs from the monthly cron or when Luke asks "how am I using Lukeatron",
  "what should we improve", "run !Improve".
type: Skill
status: Active
domain: GeneralPurpose (system — self-improvement)
intent: "Turn real usage and open issues into at most five evidence-backed, Luke-approved edits to Lukeatron's skills and instructions each month."
version: 1.0.0
---

## ⚡ TRIGGER
Primary: `!Improve`
Fires when: the monthly cron (`System/Tools/cron/improve.sh`, 1st of the month) runs it, or Luke asks how he uses
Lukeatron or what to improve. Not for fixing one known defect — that is ordinary work.
Overriding rule: **Propose only.** The single file this skill writes is the Suggestions file. Every proposal waits
for Luke; a proposal touching a core skill, CLAUDE.md or a template needs his explicit sign-off before anyone acts.

## 🛠️ LOGIC
STEP 1 — READ the evidence.
  • `Memory/Long-Term/Logs/usage.md`: the sections for the last 5 ISO weeks (all Macs).
  • `python3 System/Tools/logs/logs.py issues --open`.
  • `System/Skillbank/_index.yaml` names and `.claude/skills/` folder names (to find skills never loaded).
  • The previous `System/Suggestions/improve-*.md`, if any: do not re-propose what Luke rejected.
STEP 2 — FIND signals, strongest first:
  a. **Corrections** grouped by active skill or theme: the same kind of correction 2+ times = an instruction gap.
  b. **Hooks that blocked** or **denials** that repeat: a rule or permission is mis-set.
  c. **Open issues** at High/Medium, or several Low issues sharing one scope.
  d. **Skills never loaded** in 5 weeks: candidates to retire or to sharpen their triggers.
STEP 3 — READ the target file of each signal before proposing. A proposal names the exact file and section and
  gives the replacement text, or the deletion. Never propose from the log line alone.
STEP 4 — WRITE `System/Suggestions/improve-<YYYY-MM>.md` (`!PlainEnglish` shape): Next Action = the ≤5 proposals, each
  with signal (quote the usage/issue line), file + section, exact change, impact (Low/High per CLAUDE.md *Impact Axis*).
  Then a short table of what was seen but not proposed, and why.
STEP 5 — IF run by Luke in chat ➔ present the proposals and ask which to apply; each applied change follows the normal
  routing (Major → `!CreatePlan`). A proposal Luke accepts that reaches beyond one file gets a `logs.py decide` line;
  an issue it closes gets `logs.py resolve`.

## ✅ OUTPUT
State: one `System/Suggestions/improve-<YYYY-MM>.md` with ≤5 proposals, each tied to quoted evidence and an exact edit.
VERIFY no file other than that Suggestions file changed ELSE revert it and report.
Error: `usage.md` missing or older than 14 days ➔ write one `logs.py issue usage "…"` line and propose from issues.log
  alone. Luke's corrections from sealed sessions are withheld in `usage.md` and are never reconstructed.
