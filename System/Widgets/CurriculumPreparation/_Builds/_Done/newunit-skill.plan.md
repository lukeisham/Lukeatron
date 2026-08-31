# newunit-skill — Execution Plan

**Build:** newunit-skill | **Wave:** 1 (foundation — last) | **Date:** 2026-08-29

---

## 1. Files

| Path | Purpose |
|------|---------|
| `System/Skillbank/Teaching/!NewUnit/skill.md` | Skillbank skill: ask for unit identity, copy `_template/` verbatim, stamp `meta`/`generatedFrom`, report path (FR-NU-1…12) |
| `System/Skillbank/_index.yaml` | One-line catalog entry for `!NewUnit` with triggers and path (FR-NU-1) |
| `_template/VERSION` | Single-line date-stamped version identifier, e.g., `2026-08-29`, bumped by hand whenever `bundle-template`'s tree changes (FR-NU-11) |

---

## 2. Steps

- [ ] Create `_template/VERSION` file:
  - [ ] Single line: current date in `YYYY-MM-DD` format, e.g., `2026-08-23`
  - [ ] No newline at end or extra whitespace
  - [ ] This file lives in the template root and is copied verbatim into every generated bundle
- [ ] Create `System/Skillbank/Teaching/!NewUnit/skill.md` per `Template_skill.md` format:
  - [ ] Frontmatter section:
    - [ ] Name: `!NewUnit`
    - [ ] Intent: "Generate a new, empty curriculum unit bundle at a path you choose. Asks for subject, level, unit name, teacher, and destination folder."
    - [ ] Trigger: (auto-generated from name and intent)
    - [ ] Domain: `Teaching`
  - [ ] ⚡TRIGGER section:
    - [ ] "New unit" phrasing variations (SR-6 — match closest sibling skill, e.g., `!BuildParserCartridge`)
    - [ ] Examples: "new unit", "create a unit", "!NewUnit", "start a new teaching unit"
  - [ ] 🛠️LOGIC section (the recipe Luke follows):
    - [ ] **Step 1:** Ask Luke for the unit's identity. Collect:
      - [ ] `subject` — e.g., "English", "Mathematics"
      - [ ] `level` — e.g., "Year 10", "Grade 11"
      - [ ] `unitName` — e.g., "Shakespearean Drama", free text
      - [ ] `teacher` — e.g., "Luke Isham", free text
      - [ ] `destinationPath` — e.g., `/Users/luke/Teaching/Year11/Shakespeare Unit/`, absolute or relative (home-relative OK)
    - [ ] **Step 2:** Validate input (FR-NU-12):
      - [ ] Refuse if `unitName` is blank or whitespace-only (required by schema)
      - [ ] Refuse if `destinationPath` is blank (required by schema)
      - [ ] Accept any other field as-is, no format validation (free text)
    - [ ] **Step 3:** Check destination exists and is non-empty (FR-NU-9):
      - [ ] If `destinationPath/` already exists and contains any files, refuse with message: "Cannot create unit here: folder already exists at {path}. Choose a different destination or delete the existing folder first."
      - [ ] Do not merge, do not overwrite, do not continue (fail closed, AD-NU-3)
    - [ ] **Step 4:** Copy `_template/` verbatim to `destinationPath/` (FR-NU-3):
      - [ ] Preserve all files and empty folders exactly
      - [ ] Preserve file permissions (especially `Start Unit.command` executable bit)
      - [ ] Copy syntax: Python `shutil.copytree()` or shell `cp -r` with post-hoc chmod
    - [ ] **Step 5:** Substitute identity into the copy's `unit.json` (FR-NU-4):
      - [ ] Read `destinationPath/unit.json` as JSON
      - [ ] Update only the `meta` object:
        - [ ] `meta.subject = subject` (user-entered value)
        - [ ] `meta.level = level` (user-entered value)
        - [ ] `meta.unitName = unitName` (user-entered value)
        - [ ] `meta.teacher = teacher` (user-entered value)
        - [ ] `meta.dateCreated = ISO date of creation (new Date().toISOString())` (AD-BOSS-2, YYYY-MM-DDTHH:MM:SS.SSSZ)
        - [ ] Leave all other fields untouched
      - [ ] Do NOT rewrite any other file in the copy (AD-NU-2)
      - [ ] Write back `unit.json` (pretty-print, stable key order for diffability)
    - [ ] **Step 6:** Stamp `generatedFrom` (FR-NU-5):
      - [ ] Read `_template/VERSION` file (single line)
      - [ ] Set `unit.json.generatedFrom = contents of VERSION` (verbatim copy, e.g., `"2026-08-23"`)
      - [ ] Write back `unit.json`
    - [ ] **Step 7:** Restore executable bit on `Start Unit.command` (FR-NU-6):
      - [ ] If shell copy loses the execute bit, `chmod +x destinationPath/Start\ Unit.command`
      - [ ] Verify it's executable before reporting success
    - [ ] **Step 8:** Report completion (FR-NU-8):
      - [ ] Output: "New unit created at: {destinationPath}" (absolute path)
      - [ ] No auto-launch, no auto-open, no next steps implied
    - [ ] Follow house idiom (SR-6 — read `!BuildParserCartridge` first)
  - [ ] ✅OUTPUT section:
    - [ ] "✅ Unit created at {path}. Ready for curriculum entry."
  - [ ] Ensure skill is self-contained prose recipe, not code (agent reads and executes inline)
- [ ] Add catalog entry to `System/Skillbank/_index.yaml`:
  - [ ] One line: `- name: "!NewUnit" | intent: "Create a new teaching unit bundle." | triggers: ["new unit", "!NewUnit", "create a unit"] | path: "Teaching/!NewUnit/skill.md"`
  - [ ] Match existing catalog format (read `_index.yaml` to see structure)
  - [ ] Triggers should fire on common phrasings of the same intent (SR-6)
- [ ] Verify the skill logic works end-to-end:
  - [ ] Create a test bundle via the skill (manual walkthrough of logic)
  - [ ] Verify resulting bundle:
    - [ ] Matches `_template/`'s tree exactly (all folders, all files byte-identical except `unit.json`)
    - [ ] `unit.json.meta` fields filled correctly
    - [ ] `unit.json.generatedFrom` matches template's VERSION file
    - [ ] `Start Unit.command` is executable
    - [ ] `nodes[]`, topics[], etc. are empty as expected (FR-NU-7)
    - [ ] No ingest happened (no `_ingest/` contents consumed)
  - [ ] Verify destination-exists guard works:
    - [ ] Attempt to create unit a second time to same path → refused with message
- [ ] Verify the skill is gateable (work starts only after wave 1 is complete):
  - [ ] No prior skill or build depends on `!NewUnit` existing in wave 1
  - [ ] Every other wave-1 build must be verified before this one starts (order-of-work rule)

---

## 3. Interfaces

**Exports (consumed by Lukeatron chat):**

| Trigger | Outcome | Signature |
|---------|---------|-----------|
| "new unit", "!NewUnit", etc. | Generate bundle | Prompts for (subject, level, unitName, teacher, destinationPath) → creates folder tree, reports absolute path |

**Consumes (from bundle-template):**

| Input | Source | Used for |
|-------|--------|----------|
| `_template/` folder tree | Exact copy-and-substitute source | Every file and folder copied verbatim |
| `_template/VERSION` file | Version identifier | Stamped into `generatedFrom` field |
| `_template/unit.json` skeleton | Template schema | Meta fields substituted only |

**Produces (in bundle at destinationPath/):**

| File/Folder | Content |
|-------------|---------|
| `unit.json` | Copy of template with `meta` substituted, `generatedFrom` stamped |
| `Start Unit.command` | Executable copy |
| All other files/folders | Byte-identical to template |

---

## 4. Verification

| AC | Check | Proof |
|----|-------|-------|
| **AC-NU-1** | Running skill with subject, level, unit name, teacher, destination produces bundle matching `_template/`'s tree exactly, `meta` fields filled, every other file byte-identical | `diff -r --exclude=unit.json generated-bundle/ _template/` returns nothing (same structure); `diff <(jq -S . unit.json) <(jq -S . _template/unit.json)` shows only meta fields + generatedFrom differ |
| **AC-NU-2** | `generatedFrom` matches template's VERSION file exactly | Read `_template/VERSION` (e.g., `2026-08-23`), read generated bundle's `unit.json.generatedFrom`, verify they match byte-for-byte |
| **AC-NU-3** | `Start Unit.command` in generated bundle is executable, no manual chmod needed | `stat -c %a destinationPath/Start\ Unit.command` shows 755 |
| **AC-NU-4** | Running skill a second time against the same destination is refused, naming conflict, nothing written | Attempt second run, verify error message includes destination path and "already exists"; verify no files overwritten |
| **AC-NU-5** | Generated unit is empty and un-ingested — `nodes[]` is `[]`, no ingest happened | Verify `unit.json.nodes == []`; verify `_ingest/` is empty; verify no ingest log file exists |
| **AC-NU-6** | Skill works with destination outside `_Lukeatron/` (e.g., `/tmp/a b c/Some Unit/`) identically | Create bundle to `/tmp/test unit/` (path with spaces), verify it succeeds and runs correctly |
| **AC-NU-7** | Skill's catalog entry matches Skillbank format and triggers fire on expected phrasings | Grep `_index.yaml` for `!NewUnit` entry; verify format matches other entries; test triggering in chat: "new unit", "!NewUnit", "create a unit" — all fire the same skill |

---

## 5. Risks & Open Points

| Risk | Recommendation |
|------|---|
| **What if wave-1 builds aren't fully verified before this skill runs?** `!NewUnit` generates broken bundles | **Mitigation:** Gate: work starts only after every other wave-1 build is verified. No exceptions. Update `_PLAN.md` prerequisites. This is the "newunit-skill's only prerequisite row is 'all of wave 1'" rule. |
| **What if a later wave-1 update changes `_template/`'s tree but the skill isn't aware?** Skill copies stale tree | **Recommendation:** Skill is automatic (just copies); the gate is on `_template/` itself. Whenever `bundle-template` changes the tree, bump `_template/VERSION` by hand. The skill copies whatever's there. This is correct per AD-NU-1 (prose recipe, not code that needs updates). |
| **Should the skill validate that entered values are sensible (e.g., level is a real grade)?** | **Recommendation per OQ-NU-2 (resolved):** No. Accept everything as free text except the two required fields (unitName and destinationPath). No format validation beyond "not blank". Matches FR-CUR-1a best-effort ethos (inference, not validation). |
| **Destination path is absolute; what if Luke types a relative path?** | **Recommendation:** Accept it, resolve relative to home (e.g., `~/Teaching/Year10/` or `./units/unit1/`). Use Python `Path(destination).expanduser().resolve()` to handle both. FR-NU-10 says "outside `_Lukeatron/`" which implies absolute resolution. |
| **When `generatedFrom` version is stamped, should the bundle's version ever auto-update if `_template/VERSION` changes?** | **Recommendation per AD-18, FR-NU-7:** No — v1 is not a new design decision. Migration is explicitly not v1. Generated bundles are immutable; `generatedFrom` records when they were created. If Luke wants a newer template, he creates a new bundle. Accept this limitation. |

---

**On completion:** Verify all AC-NU-1…7 pass, ensure gate is honoured (work starts only after wave 1 is complete), test skill can be invoked in chat with expected triggers, move spec and plan to `_Builds/_Done/`, update `_PLAN.md`.
