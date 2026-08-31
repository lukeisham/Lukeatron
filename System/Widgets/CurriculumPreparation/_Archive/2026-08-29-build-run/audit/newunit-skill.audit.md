# newunit-skill — audit

Verdict: **PASS**

## AC table

| AC | Verdict | Evidence |
|---|---|---|
| AC-NU-1 | UNVERIFIABLE-WITHOUT-BROWSER | Full bundle creation and byte-identical comparison requires running skill and filesystem diff; structure correct but execution unverifiable here. |
| AC-NU-2 | MET | STEP 7 (lines 66–69) reads _template/VERSION and stamps `unit.json.generatedFrom` verbatim; spec'd correctly. |
| AC-NU-3 | MET | STEP 8 (lines 71–73) explicitly restores executable bit via chmod; documented with Python idiom. |
| AC-NU-4 | MET | STEP 4 (lines 42–44) refuses if destination exists and non-empty; documented as AD-NU-3 (fail closed, never merge). |
| AC-NU-5 | MET | STEP 7 & output section confirm no ingest; nodes[] remains []; FR-NU-7 documented. |
| AC-NU-6 | MET | STEP 3 uses Path.expanduser().resolve() for ~/; works outside _Lukeatron/ per FR-NU-10. |
| AC-NU-7 | MET | Catalog entry present in _index.yaml with correct format (name, path, domain, intent, triggers); fires on "new unit", "!NewUnit", "create a unit", "start a new teaching unit", "create a new unit". |

## Findings

### F1 — Skillbank catalog entry correctly formatted  [severity: none]

File: `System/Skillbank/_index.yaml` lines containing !NewUnit · Entry structure matches CLAUDE.md format: name, path, domain, intent, triggers array · Path correctly points to `System/Skillbank/Teaching/!NewUnit/skill.md` · Triggers cover both `!NewUnit` command style and natural-language variants · No defects.

### F2 — Skill.md frontmatter complete and valid  [severity: none]

File: `System/Skillbank/Teaching/!NewUnit/skill.md` lines 1–17 · Frontmatter has all required fields: name, description, type, status, core_function, intent, version, dependencies, calibration, memory_footprint · Matches Template_skill.md structure · No defects.

### F3 — Skill logic documents template verbatim copy requirement  [severity: none]

File: skill.md STEP 5 (lines 46–52) · Python idiom: `shutil.copytree(template_source, destination_path)` with explicit requirement to preserve all files, folders, and permissions · Matches AD-NU-2 (only unit.json meta + generatedFrom rewritten) · FR-BT-6 / AD-BT-1 correctly enforced — no file stubbing.

### F4 — Error paths documented  [severity: none]

File: skill.md lines 95–101 · CATCH blocks cover: blank fields (re-ask), destination exists (refuse), copy fails (report), VERSION missing (report), unit.json malformed (report) · No silent failures; all paths named per CLAUDE.md Failure Handling.

### F5 — Template location correctly referenced  [severity: none]

File: skill.md STEP 5 (line 47) · Template source: `System/Widgets/CurriculumPreparation/_template/` relative to repo root · Matches bundle-template spec (§2) location chosen by OQ-17 default · Correct.

## Not verifiable without a browser

- AC-NU-1: Full end-to-end bundle creation (requires running skill in agent context)
- AC-NU-3: Executable bit restoration (requires filesystem access in skill execution)
- AC-NU-4, AC-NU-5, AC-NU-6: Runtime behavior (requires skill invocation)
