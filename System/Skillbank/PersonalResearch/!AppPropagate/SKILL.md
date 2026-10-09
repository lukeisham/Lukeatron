---
name: "!AppPropagate"
description: "Carries a change to one Teaching App family app's function (code) into the other members, on Luke's decision of all, some or none. Started by the family hook, not by Luke: when a turn ends after an app's code changed, the hook holds the turn once and points here. The tool (System/Tools/teaching-app-family/) finds, plans and writes the mechanical part; this skill makes the decision with Luke, settles what the tool cannot, checks each target through its own tests under !AppDevelopment's guardrails, and closes the change."
type: Skill
status: Active
core_function: System
intent: "Keep the Teaching App family's shared code in step without Luke having to remember it: ask once whether a change goes everywhere, carry it exactly, and leave nothing half-done."
version: 1.0.0
dependencies:
  - System/Tools/teaching-app-family/sync.py
  - System/Skillbank/PersonalResearch/!AppDevelopment/SKILL.md
calibration:
  context: [PersonalResearch, Teaching, Lukeatron]
  level: Extended
  scope: Local
memory_footprint:
  read: [System/Apps, System/Tools/teaching-app-family]
  write: [System/Apps, System/Tools/teaching-app-family/state, System/Tools/teaching-app-family/policy.json, Memory/Long-Term/Logs/skills.log]
---

## ⚡ TRIGGER
Primary: the family hook's message — "Teaching App family: <App> function changed … change id <id> … Read the Skillbank skill
!AppPropagate". Also: "propagate this change", "carry this to the other apps", "sync the Teaching apps", "what is waiting to be
propagated". The family is Rhetoric, Grammar, Logic, Research, Writing and Style (`System/Tools/teaching-app-family/family.json`).
Not this skill: building or reworking ONE app, or changing its data — that is `!AppDevelopment`; adding images or entries is
data and never starts this.

## 🛠️ LOGIC

// EXECUTION_START

`T` below is `python3 System/Tools/teaching-app-family/sync.py`. Run every command with `PYTHONDONTWRITEBYTECODE=1`.

**STEP 0 — Read the change**
  RUN `T pending`. TAKE the change named in the hook message (or each open change when Luke asked). READ its `files`.
  IF the change status is `decided` ➔ Luke's standing rules already chose the targets: go to STEP 2.
  The hook has already held the turn once for this change; do not mention the hook or the tool to Luke.

**STEP 1 — Decide with Luke (the only question)**
  LOOK at what changed: `T diff <id> <path>` for each file. THEN judge, in plain terms, whether this edit is *family code*
  (a fix or improvement every app wants), or belongs to this app alone (its extra feature, its wording, an experiment).
  ASK ONE QUESTION with `AskUserQuestion`: "Carry this change from <App> to the other apps?" with options
    1. All other apps (recommended when the edit is plainly family code)
    2. Only some — then ask which, in a second question
    3. None this time
    4. None, and stop asking about these files (`--remember <glob>`)
  Put what changed in one plain sentence in the question; never paste a diff.
  RECORD it: `T decide <id> --to all|none|<A,B> [--remember <glob>]`.
  IF none ➔ the tool has closed the change; STEP 5 report only.

**STEP 2 — Check the target is ready (delegation to !AppDevelopment)**
  FOR each target, read its folder:
    - a `_build/` folder means the app is still inside the `!AppDevelopment` lifecycle ➔ do NOT edit it here; hand that
      target's part to `!AppDevelopment` (its phase router decides where the change belongs) and carry on with the others.
    - Rhetoric is `manual` (its code has diverged: devices, Topical and Grammar groups): the tool only lists what to port.
  RULE G-1 of `!AppDevelopment` applies: a granted Vibe-Coding exception is never carried into another app. IF the change
  touches code covered by a row in the source app's `app-decisions.md` → Rule exceptions (a write route, `aboutpage.py`, …)
  AND a target has no such row ➔ ask Luke for that target's grant, naming the rule ID and the reason; on yes, add the row to
  the target's `app-decisions.md`; on no, leave that target out.

**STEP 3 — Carry it**
  RUN `T plan <id>` to see, per target and file: `clean`, `review`, `conflict`, `added`, `skipped`, `removed`, `manual`.
  RUN `T apply <id>`. It writes every `clean`, `review` and `added` result and keeps the replaced files for `T undo <id>`.
  THEN, for what is left, work by hand in the target, keeping the target's own names and wording:
    - `review` — the lines the plan lists speak of the source's item noun (pattern, form, topic, element); change them to
      the target's noun.
    - `conflict` — the same lines differ in both apps. Read `T diff <id> <path>` and port the intent into the target by hand,
      or skip it when the edit belongs to the source app alone.
    - `removed` — a file the source deleted: delete it in the target only if it is plainly the same file.
    - `manual` (Rhetoric) — port by hand only if Luke chose it; Rhetoric's names and layout differ.
  Never guess a meaning. When unsure whether a hunk is family code, leave it out and say so.

**STEP 4 — Prove it**
  FOR each target changed: run its tests from its folder —
    `node --test tests/*.mjs` and `python3 -m unittest discover -s tests -p "test_*.py"`.
  IF a target fails ➔ fix it if the cause is the carried change; otherwise `T undo <id>` for that target's files and report.
  A target that cannot pass is left as it was; the others still finish.

**STEP 5 — Close and report**
  RUN `T finish <id>`: every touched file becomes the baseline again, so nothing looks changed.
  APPEND one line to `Memory/Long-Term/Logs/skills.log`: date, `!AppPropagate`, change id, source, targets, outcome.
  REPORT to Luke in `!PlainEnglish` shape — what went where, anything left out and why, anything he must decide. Do not commit
  unless he asks; the family tool's undo copies are the safety net until then.

// EXECUTION_END

## ✅ OUTPUT
Each chosen target holds the change in its own names, its tests pass, the change record is `done` or `dismissed`, and Luke has
been asked at most one question (two when he chose "only some").

**Validation Check (Self-Test)**
```
VERIFY `T check` reports no attention and `T pending` lists nothing for this change
VERIFY every target edited has run both test suites green, or was undone
VERIFY no target with a _build/ folder was edited directly
VERIFY no granted exception was copied into an app without Luke's yes
ELSE ➔ finish or undo before reporting
```

**Error Path**
```
CATCH tool-error        ➔ report the message; `T undo <id>` anything half-applied; leave the change pending
CATCH git-missing       ➔ the three-way merge cannot run; port every file by hand from `T diff`
CATCH luke-unreachable  ➔ fail closed: write nothing to any target; the change stays pending
CATCH [*]               ➔ report plainly, hold.
```
