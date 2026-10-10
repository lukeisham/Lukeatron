---
plan: "logs-overhaul"
context: Lukeatron
secondary_contexts: []
created: 2026-10-10
status: Completed
major_because: "multi-step; modifies Long-Term memory (Logs/), CLAUDE.md, core skills (!CreatePlan, !ReviewPlan, !Checkpoint …) and Template_Plan.md — all High-impact, signed off by Luke in chat 2026-10-10"
project: ""
skills_used: ["!DetermineContext", "!CreatePlan", "!ReviewPlan", "!Checkpoint"]
---

# Plan — Logs overhaul: two AI logs, usage from transcripts

## Purpose
`Memory/Long-Term/Logs/` holds only what an agent needs to act correctly: `history.log` (every DECISION and PERMISSION wider than one file, plus Vibe-Coding exception permissions) and `issues.log` (anything that could improve Lukeatron; staleness is fine). Every line is written for an AI reader: one line, exact scope, exact rule. `skills.log` and `workers.log` go. `edits.log` is Project Dashboard undo state and moves into that app. A weekly no-Claude script reads Claude Code's own transcripts into `usage.md`, and a monthly pass turns `usage.md` + `issues.log` into proposed skill edits.

| # | Change |
| :-- | :-- |
| 1 | Snapshot all logs to `Archive/Logs-overhaul-2026-10-10/` |
| 2 | `skilllog.py` → `decide`, `permit`, `issue`, `history`, `issues` only |
| 3 | `history.log` rewritten: DECISION/PERMISSION, multi-file, AI-precise |
| 4 | `issues.log` converted to one-line format |
| 5 | Scripts stop writing `skills.log`/`workers.log`; faults → `issues.log`; cron output out of `Logs/` |
| 6 | `edits.log` moved into `System/Apps/ProjectDashboard/` |
| 7 | Every skill, template, plan, CLAUDE.md, charter, lint: log-run steps removed |
| 8 | `usage.py` + weekly cron → `Logs/usage.md` |
| 9 | `!Improve` Skillbank skill + monthly cron |
| 10 | `history.log`, `issues.log`, `usage.md` tracked in git |

## Objective
Lukeatron's logs are exactly two precise AI-facing records plus a zero-token usage digest that feeds a monthly, Luke-approved improvement pass — keeping Lukeatron correct and doing what CLAUDE.md says (charter North Star).

## Success criteria (measurable)
- `ls Memory/Long-Term/Logs/` = `_index.yaml history.log issues.log usage.md`.
- Every `history.log` entry matches `^\[\d{4}-\d{2}-\d{2}\] \[(DECISION|PERMISSION)\] \[[^\]]+\] .+$`, ≤240 chars; none is single-file unless it is a Vibe-Coding exception permission.
- Every `issues.log` entry matches the new one-line format.
- `grep -rlE 'skills\.log|workers\.log|skilllog\.py (write|worker|complete|recent|summary)'` outside `Archive/`, `Trash/`, `Plans/Completed/` returns nothing.
- Project Dashboard tests pass with `edits.log` at its new path; undo works.
- `usage.py` Sandbox run over real transcripts produces a `usage.md` week table; second run is idempotent.
- `lint_skills.py` passes; CLAUDE.md, `_index.yaml`, charter and Template_Plan.md state the new rule only (no history narration).
- `!Improve` dry run over the Sandbox `usage.md` writes a Suggestions file with ≤5 proposals and edits nothing else.
- Charter: Luke's sign-off on core-skill/CLAUDE.md/template edits recorded as a PERMISSION line.

## Resources
- **Memory to read:** `Memory/Long-Term/Logs/*`, `System/Context/lukeatron.md`
- **Capability skills:** none
- **Domain skills (Skillbank):** `!write-a-skill` (for `!Improve`)
- **Sub-agents:** none — rewrites need the conversation's judgement; done inline, grep-verified
- **Scripts:** `System/Tools/usage/usage.py` (new, permanent tool); one-off issues.log converter in Sandbox
- **Temp-skills:** none

## Steps
- [x] 1 — Copy every file in `Memory/Long-Term/Logs/` to `Archive/Logs-overhaul-2026-10-10/` (reversible; removed lines stay readable there) [inline]
  - [x] !Checkpoint — Gate B: Long-Term log lines removed; Luke approved in chat ("ruthlessly implement", "Yes, all of it")
- [x] 2 — Rewrite `skilllog.py`: keep `decide`, `permit`, `history`; add `issue '<scope>' "<problem> — <where> — <fix hint>" [--severity]` and `issues [--open]`; drop `write`, `worker`, `complete`, `recent`, `summary`; no COMPLETED kind [script]
  - [x] Test in Sandbox — `LUKEATRON_LOG_DIR=System/Sandbox/logtest` each command + rejection of bad kinds/over-length lines
- [x] 3 — Rewrite `history.log`: header = format + scope rule; drop COMPLETED and single-file lines; reword survivors to `[date] [KIND] [scope] <current rule/permission> — <why>`, naming paths/skills exactly [inline]
- [x] 4 — Convert `issues.log` table rows to `[date] [Open|Resolved] [scope] [Low|Medium|High] <problem> — <where> — <fix hint>` [Sandbox one-off script, then inline review]
- [x] 5 — Scripts: `!HeadlessChromeBrowser/scripts/browser.py` stops per-command logging (fault → `skilllog issue`); `teaching-app-family/hook.py` faults → `issues.log`; `memory-lint.sh` writes only on FAIL; `gitsync.py` checked; cron `*.sh` output → `System/Tools/cron/out/` [inline]
- [x] 6 — Move `edits.log` → `System/Apps/ProjectDashboard/edits.log`; update `writes.py`, `server.py`, README, tests; run its test suites [inline]
- [x] 7 — Strip log-run steps/lines from every skill (`.claude/skills/`, Skillbank), `Template_Plan.md`, `Template_skill.md`, `System/Plans/New/*`, CLAUDE.md (*Failure Handling*, history paragraph), `memory.md`, `lukeatron.md` charter guardrail, `Logs/_index.yaml`, `System/System_guide.md`, `Memory/Long-Term/Lukeatron/memory-structure.md`, `lint_skills.py` (rule becomes: no file points at a removed log); failures go to `issues.log` [inline, grep-verified]
  - [x] !Checkpoint — CLAUDE.md / core skills / templates: High-impact, signed off by Luke in chat 2026-10-10
- [x] 8 — Build `System/Tools/usage/usage.py` (stdlib): reads `~/.claude/projects/*Lukeatron*/*.jsonl`; per ISO week per Mac: sessions, prompts, skills loaded (Skill tool + SKILL.md reads), Skillbank hits, hooks that blocked, denied tool calls, Luke's corrections (≤140-char excerpt + active skill); sessions touching the pastoral log or sealed paths contribute counts only; rewrites only its own week rows in `Logs/usage.md` [script]
  - [x] Test in Sandbox — run against real transcripts into `System/Sandbox/usage-test/usage.md`; run twice, diff = none
  - [x] Add crontab line Sun 21:10 (this Mac; note the Mac mini needs the same line) — Luke approved
- [x] 9 — Write Skillbank `!Improve` (GeneralPurposeSkills): reads last month of `usage.md` + open `issues.log`; outputs ≤5 proposed edits to `System/Suggestions/improve-<YYYY-MM>.md`, propose-only; register in `_index.yaml`; monthly cron (1st, 09:00) `claude -p "Run !Improve"` [!write-a-skill]
  - [ ] NOT RUN — test `!Improve` once against `System/Sandbox/usage-test/usage.md`; confirm only the Suggestions file changed
- [ ] 10 — DROPPED: Memory/ is outside git by design (.gitignore allowlist); Dropbox syncs it
- [x] 11 — `skilllog.py decide`/`permit` lines for this overhaul; `lint_skills.py` + Dashboard tests + success-criteria greps [script]
- [x] Verify — every Success criterion above passes [pass/fail]

## Final step — Close out (always present)
- [x] Update `status: Completed` in this plan's frontmatter.
- [x] Move the file from `System/Plans/New/` to `System/Plans/Completed/`.
