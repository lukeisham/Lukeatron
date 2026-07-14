---
name: "!MinorTask"
description: >
  Log a minor task to the MinorTasks queue, compute its Impact (High/Low), assign State, and
  append a row. On demand: list/surface the queue ranked by State. Called by !Intake for
  minor/one-off items and ambiguous arrivals. Adds a Contacts/ per-contact file (+ _index.yaml
  row) if the task names a person not in People/. Triggers: "log a minor task", "add a chore", "show the minor queue",
  "what's in the minor queue", or invoked programmatically by !Intake.
type: Skill
status: Active
core_function: Track
intent: "Capture any small task that doesn't warrant a full project, compute its Impact gate, and keep the queue clean and ranked."
version: 1.0.0
dependencies: []
calibration:
  context: Any
  level: Brief
  scope: Global
memory_footprint:
  read: [Memory/Medium-Term/MinorTasks, Memory/Medium-Term/Contacts, Memory/Long-Term/People]
  write: [Memory/Medium-Term/MinorTasks, Memory/Medium-Term/Contacts, Memory/Long-Term/Logs]
---

## ⚡ TRIGGER
Primary: `!MinorTask`
Secondary: invoked by `!Intake` (minor/one-off branch + ambiguous branch); on-demand phrases
  "log a minor task", "add a chore", "show the minor queue", "what's in the minor queue".
Modes:
  LOG  — append a row to the queue (default when a task description is supplied)
  LIST — surface and rank the current queue (default when invoked with no task argument)

## 🛠️ LOGIC
```
// EXECUTION_START

MODE = (task description supplied) ? LOG : LIST

IF MODE == LIST:
  READ Memory/Medium-Term/MinorTasks/queue.md
  RANK rows by State precedence (🔴→🟠→🔵→🟢→⚪), then by Wake/Due ASC, then by # ASC
  REPORT ranked table with Status / Impact / State columns highlighted
  RETURN

// --- LOG MODE ---
ASSERT (task description supplied) ELSE RETURN "No task supplied — nothing logged."

// 1. COMPUTE IMPACT (Impact Axis — shared with !Initiative and !ProjectSweep boundary)
IMPACT = High IF ANY of:
  - task modifies a core skill/checkpoint (.claude/skills/) or CLAUDE.md
  - task touches files outside the _Lukeatron/ directory tree
  - task generates content to be sent/published outside Lukeatron
ELSE IMPACT = Low   // output stays entirely inside _Lukeatron/

// 2. ASSIGN STATE
IF source == "Intake:ambiguous": STATE = 🟠   // Luke's move — needs his call
ELSE: STATE = ⚪                               // unshaped; Initiative or Luke will shape it

// 3. ASSIGN STATUS
STATUS = ☐ Open

// 4. ASSIGN SOURCE (caller supplies this; default = "Luke" for direct invocations)
SOURCE = (caller-supplied source string) OR "Luke"

// 5. COMPUTE NEXT ROW NUMBER
READ Memory/Medium-Term/MinorTasks/queue.md → find last # value → N = last# + 1 (or 1 if empty)

// 6. APPEND ROW
ROW = "| {N} | {task} | {SOURCE} | {IMPACT} | {STATUS} | {STATE} | {wake_or_due_or_blank} | {notes_or_blank} |"
APPEND ROW to Memory/Medium-Term/MinorTasks/queue.md (new line at end of table)

// 7. CONTACTS CHECK
IF task text references a named person with contact details (email/phone):
  READ Memory/Long-Term/People/ → SEARCH for that person by name
  IF found in People/ THEN skip (authoritative record exists; no Contacts/ record needed)
  ELSE:
    READ Memory/Medium-Term/Contacts/_index.yaml
    SEARCH existing entries by name (case-insensitive)
    IF entry found:
      OPEN its per-contact file, Contacts/<TC_ID Name>/<TC_ID Name>.md
      UPDATE linked_to (frontmatter) to include "#{N}" (append if existing value present)
      UPDATE the matching _index.yaml row's linked_to to match
    ELSE:
      TC_ID = "TC-" + (last TC-NN number + 1, zero-padded to 2 digits)
      CREATE Contacts/{TC_ID} {name}/{TC_ID} {name}.md FROM System/Templates/Template_Contact.md:
        id={TC_ID}, name={name}, role_context={role/context}, email/phone={email/phone},
        linked_to="#{N}", source={SOURCE}, interaction_tier="non-listed"
      APPEND a matching row to Memory/Medium-Term/Contacts/_index.yaml:
        {id: {TC_ID}, name: {name}, path: "{TC_ID} {name}/{TC_ID} {name}.md",
         linked_to: "#{N}", source: {SOURCE}}
      // INVARIANT: a Contacts/-only recipient is ALWAYS non-listed — this note is never removed

LOG one line → Memory/Long-Term/Logs/skills.log:
  "[AGENT: !MinorTask] [SUCCESS] Logged #{N}: {task first 60 chars} | Impact:{IMPACT} | State:{STATE}"

// EXECUTION_END
```

## ✅ OUTPUT
A new row appended to `Memory/Medium-Term/MinorTasks/queue.md`. If the task references a
person not in `People/`, a `Contacts/<TC-NN Name>/` per-contact file is created or updated,
with a matching `_index.yaml` row. A one-line confirmation is reported (row number + task
summary + Impact + State).

**Validation Check (Self-Test)**
```
VERIFY (queue.md row count == prior count + 1) ELSE report append failure, do not claim success
VERIFY (IMPACT is High or Low, never blank) ELSE recompute before appending
VERIFY (STATE is one of 🔴🟠🔵🟢⚪, never blank) ELSE default to ⚪
```

**Error Path**
```
CATCH queue.md unreadable/missing        → report error, do NOT create a phantom row, FAIL CLOSED
CATCH Contacts/_index.yaml unreadable    → log warning; skip Contacts/ step; continue with queue append
CATCH [*]                          → report what failed; do NOT silently continue
                                     LOG "[AGENT: !MinorTask] [FAIL] {error}" to skills.log
```
