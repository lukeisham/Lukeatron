---
name: "!NewUnit"
description: "Generate a new, empty curriculum unit bundle at a path you choose. Asks for subject, level, unit name, teacher, and destination folder."
type: Skill
status: Active
core_function: Generate
intent: "Create a new, empty teaching unit bundle from the template (FR-NU-1…12, AD-18)."
version: 1.0.0
dependencies: []
calibration:
  context: [Teaching]
  level: Extended
  scope: Local
memory_footprint:
  read: []
  write: []
---

## ⚡ TRIGGER
Primary: `!NewUnit`
Fires when: Luke asks to "create a new unit", "new unit", "start a unit", "make a teaching unit", "generate a unit bundle", or similar phrasing.
Scope: Always one unit at a time; the destination folder is provided by Luke.

## 🛠️ LOGIC

**STEP 1 — Ask Luke for unit identity**
  Collect these five fields:
  - `subject` (e.g., "English", "Mathematics") — free text, accept as-is
  - `level` (e.g., "Year 10", "Grade 11") — free text, accept as-is
  - `unitName` (e.g., "Shakespearean Drama") — free text, required (refuse if blank)
  - `teacher` (e.g., "Luke Isham") — free text, accept as-is
  - `destinationPath` (e.g., `/Users/luke/Teaching/Year11/Shakespeare Unit/`) — absolute or home-relative, required (refuse if blank)

**STEP 2 — Validate inputs (FR-NU-12)**
  IF `unitName` is blank or contains only whitespace ➔ STOP, tell Luke "Unit name is required" and re-ask
  IF `destinationPath` is blank or contains only whitespace ➔ STOP, tell Luke "Destination path is required" and re-ask
  ELSE ➔ accept all other fields as free text, no further validation

**STEP 3 — Expand destination path**
  Resolve `destinationPath` using Python `Path(destination).expanduser().resolve()` to handle `~` and relative paths

**STEP 4 — Check destination does not already exist and is non-empty (FR-NU-9)**
  IF destination path exists AND contains any files/folders ➔ STOP, tell Luke "Cannot create unit here: folder already exists at {absolute_path}. Choose a different destination or delete the existing folder first." (AD-NU-3 — fail closed, never merge or overwrite)
  ELSE ➔ continue

**STEP 5 — Copy _template/ verbatim to destination (FR-NU-3)**
  The source template lives at `System/Widgets/CurriculumPreparation/_template/` (relative to repo root)
  Copy it entirely to `destinationPath/` preserving:
  - All files (byte-identical)
  - All folders, including empty ones (`images/`, `_ingest/`, `tests/`)
  - File permissions (especially `Start Unit.command` executable bit)
  EXCLUDE run-time/build artefacts that must never reach a teacher's bundle — these are not part of
  AD-18/AD-BT-4's nine-entry tree and must never be copied even if they exist in `_template/` at
  copy time (`__pycache__/`, `*.pyc`, `serve.log`, `*.log`, `.DS_Store`):
  Python idiom:
  ```python
  shutil.copytree(
      template_source,
      destination_path,
      ignore=shutil.ignore_patterns('__pycache__', '*.pyc', 'serve.log', '*.log', '.DS_Store'),
  )
  ```

**STEP 6 — Substitute identity into unit.json (FR-NU-4)**
  Read `destinationPath/unit.json` as JSON
  Update ONLY the `meta` object:
  - `meta.subject = subject` (value from STEP 1)
  - `meta.level = level` (value from STEP 1)
  - `meta.unitName = unitName` (value from STEP 1)
  - `meta.teacher = teacher` (value from STEP 1)
  - `meta.dateCreated = ISO-8601 UTC timestamp` (per AD-BOSS-2: `new Date().toISOString()` idiom in Python: `datetime.datetime.now(datetime.timezone.utc).isoformat()`)
  - Leave all other fields untouched
  Write back `unit.json` with stable key order (JSON canonical form for diffability)
  Do NOT rewrite any other file in the copy (AD-NU-2)

**STEP 7 — Stamp generatedFrom (FR-NU-5)**
  Read `System/Widgets/CurriculumPreparation/_template/VERSION` — this is a single-line file containing a date string (e.g., `2026-08-23`)
  Set `unit.json.generatedFrom = contents of VERSION` (verbatim, as a string)
  Write back `unit.json`

**STEP 8 — Restore executable bit on Start Unit.command (FR-NU-6)**
  On destination's `Start Unit.command`, verify or restore the executable bit: `chmod +x "destinationPath/Start Unit.command"`
  Python idiom: `os.chmod(path, os.stat(path).st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)`

**STEP 9 — Report completion (FR-NU-8)**
  Output: "New unit created at: {absolute_path_to_destinationPath}"
  No auto-launch, no auto-open, no implied next steps

## ✅ OUTPUT
**Expected State:**
- A new folder exists at `destinationPath/` containing a verbatim copy of `_template/`
- `unit.json` has `meta` fields filled with Luke's entered values and `generatedFrom` stamped with the template's current version
- `Start Unit.command` is executable with no manual chmod needed
- All other files are byte-identical to the template
- `nodes[]`, `topics[]`, etc. remain empty (no ingest has occurred — FR-NU-7)

**Validation Check (Self-Test):**
- VERIFY destination folder created at correct absolute path
- VERIFY `unit.json.meta.subject`, `.level`, `.unitName`, `.teacher` all populated with entered values
- VERIFY `unit.json.generatedFrom` matches the template's VERSION file byte-for-byte
- VERIFY `Start Unit.command` is executable (`stat` shows x bits set)
- VERIFY tree matches template exactly (all folders present, all other files unchanged)
- VERIFY `nodes[]` is empty (no ingest happened)

**Error Paths:**
- CATCH (unitName blank) ➔ tell Luke and re-ask
- CATCH (destinationPath blank) ➔ tell Luke and re-ask
- CATCH (destination exists and non-empty) ➔ tell Luke the conflict path, refuse to proceed
- CATCH (copy fails) ➔ report the OS error and stop (never leave a partial copy behind)
- CATCH (VERSION file missing) ➔ report missing file and stop (this indicates bundle-template build is incomplete; alert Luke)
- CATCH (unit.json malformed) ➔ report JSON parse error and stop
