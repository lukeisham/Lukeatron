# bundle-template — Execution Plan

**Build:** bundle-template | **Wave:** 1 (first) | **Date:** 2026-08-29

---

## 1. Files

Every file created lives at `System/Widgets/CurriculumPreparation/_template/` (OQ-17's location).

| Path | Purpose |
|------|---------|
| `_template/Start Unit.command` | Double-click launcher; resolves folder and runs `python3 serve.py` (SR-6 idiom) |
| `_template/unit.json` | Schema-valid skeleton per INV-DM-9, INV-DM-18; all fields present, correctly empty |
| `_template/images/` | Empty folder; image-paste will write here |
| `_template/_ingest/` | Empty folder; plain text drops here for curriculum-ingest to digest |
| `_template/app/js/` | Empty folder; local-store, document-shell, and all parts write here |
| `_template/app/css/` | Empty folder; style-guide writes `variables.css` here |
| `_template/StyleGuide/` | Empty folder; style-guide writes `index.html` and `demo.svg` here |
| `_template/tests/` | Empty folder mirroring source tree; unittest files mirror `app/js/`, `serve.py`, `ingest.py` |
| `_template/README.md` | Section headings (Architecture, Navigation, Lifecycle) + one-line pointers to owning builds |

**Flag: Files another build owns** — bundle-server will create `serve.py`; curriculum-ingest will create `ingest.py`; style-guide will create `app/css/variables.css`, `StyleGuide/index.html`, `StyleGuide/demo.svg`; document-shell and local-store will create `app/index.html` and files under `app/js/`; this build creates none of those.

---

## 2. Steps

- [ ] Create `_template/` folder at `System/Widgets/CurriculumPreparation/_template/`
- [ ] Create `unit.json` skeleton:
  - [ ] Set `schemaVersion: "1.0.0"` (INV-DM-9)
  - [ ] Set `generatedFrom: ""` (empty until stamped by `!NewUnit`)
  - [ ] Create `meta` object with fields `subject`, `level`, `unitName`, `teacher`, `dateCreated: null`, `dateModified: null`
  - [ ] Create `curriculum` object with fields `profileId`, `name`, `jurisdiction`, `version`, `sourceRef`, `licence`, `attribution`, `labels` (with `strand`, `outcome`, `task`, `cribSheetHalves`), `description`, `ingestedAt` (all unset per INV-DM-11)
  - [ ] Create `nodes: []`, `topics: []`, `bigIdeas: []`, `lessons: []`, `cribSheet: { id: "", title: "", orientation: "portrait", sections: [], pageCount: 1, provenance: "manual" }`, `unitAssessment: { id: "", title: "", bigIdeaId: "", coverage: [], finalAssessment: { pass: { tier: "pass", material: null, studentTask: null, workspaceLines: null, imageRefs: [] }, intermediate: {...}, advanced: {...} }, finalAssessmentCompleted: false, finalAssessmentDate: null, finalAssessmentPeriod: null, miniAssessments: [] }`, `resourcesPage: { id: "", items: [] }`, `matrixTemplate: { orientation: "portrait", criteria: [] }`, `matrices: []`, `students: []`, `images: []` (per INV-DM-18)
- [ ] Create `Start Unit.command` launcher:
  - [ ] Resolve script's own folder (anchor to `$( cd "$(dirname "${BASH_SOURCE[0]}")" && pwd )`)
  - [ ] Run `python3 serve.py` from that folder
  - [ ] Make executable: `chmod +x Start Unit.command`
- [ ] Create empty folders: `images/`, `_ingest/`, `app/js/`, `app/css/`, `StyleGuide/`, `tests/`
- [ ] Create `README.md` skeleton:
  - [ ] Section: "## Architecture" — one line: "See `bundle-template.build.spec.md`"
  - [ ] Section: "## Server" — one line: "See `bundle-server.build.spec.md`"
  - [ ] Section: "## Style Guide" — one line: "See `style-guide.build.spec.md`"
  - [ ] Section: "## Document Shell" — one line: "See `document-shell.build.spec.md`"
  - [ ] Section: "## Local Store" — one line: "See `local-store.build.spec.md`"
  - [ ] Sections for every part expected in the tree (curriculum-editor, arbor-tree, etc.) — one line each naming the build
- [ ] Verify no curriculum-specific string anywhere (INV-DM-10): grep for "Victorian", "VCAA", "vicaaCode", jurisdiction names — should return nothing
- [ ] Verify `unit.json` passes hand-check against INV-DM-9, INV-DM-18

---

## 3. Interfaces

**Exports (consumed by later builds):**

| What | Signature | Used by |
|------|-----------|---------|
| **Folder tree** | `_template/` with exact structure: `Start Unit.command`, `unit.json`, `images/`, `_ingest/`, `app/{js/,css/}`, `StyleGuide/`, `tests/`, `README.md` | newunit-skill (copies verbatim); bundle-server (serves `app/`); every build filling a slot |
| **unit.json location** | Root of bundle, never nested | bundle-server (reads/writes via `/api/unit`); local-store (loads and validates) |
| **Empty singular objects** | `cribSheet`, `unitAssessment`, `resourcesPage`, `matrixTemplate` present as minimal valid empty forms | local-store validator (expects these fields to exist) |
| **Empty arrays** | `nodes[]`, `topics[]`, `bigIdeas[]`, `lessons[]`, `matrices[]`, `students[]`, `images[]` | local-store validator (expects these arrays, even empty) |
| **README structure** | Section headings for Architecture, Server, Style Guide, Document Shell, Local Store + one-line pointers | Later builds extend each section |

**Consumes:**
- None — this is the first build in the project.

---

## 4. Verification

| AC | Check | Proof |
|----|-------|-------|
| **AC-BT-1** | `_template/` matches AD-18's tree exactly, folder for folder, with no extra or missing top-level entry | `ls -la _template/` output matches the 9 top-level entries exactly |
| **AC-BT-2** | `unit.json` in the template validates field-by-field against INV-DM-9 and INV-DM-18 | Hand-check: `schemaVersion` present and set to `"1.0.0"`; `generatedFrom` present and empty; all singular objects present as minimal valid empty forms; all arrays present as `[]` |
| **AC-BT-3** | `Start Unit.command` is executable and resolves correctly from any directory the bundle is later copied to | `stat -c %a Start\ Unit.command` shows 755; run it from a different directory; verify it starts serve.py in the bundle folder, not the current directory |
| **AC-BT-4** | Grepping the template for any curriculum-specific string (jurisdiction name, `vcaaCode`, level names like "Victorian") returns nothing | `grep -ri "victori\|vcaa" _template/` returns nothing; `grep -ri "outcome\|strand" _template/` returns only in `unit.json` schema field names, not values |
| **AC-BT-5** | `README.md` carries every section heading SR-7 requires, each with a one-line note naming the build that populates it | Check `README.md` has headings for Architecture, Server, Style Guide, Document Shell, Local Store, and at least one line of pointer text per section |
| **AC-BT-6** | No file exists anywhere in the template for anything FR-BT-6 names as another build's | Listing: no `serve.py`, `ingest.py`, `index.html` in root or `app/`; no `variables.css` in `app/css/`; no files under `StyleGuide/` |

---

## 5. Risks & Open Points

| Risk | Recommendation |
|------|---|
| **What JSON structure for empty singular objects?** The spec requires them present but doesn't show the exact minimal schema. | Default: `{ id: "", title: "", ...}` with every required field per the datamodel digest, all unset/empty. Hand-check against INV-DM-18's requirement "present in its minimal valid empty form" — if `local-store`'s validator accepts it, it's correct. |
| **Should `README.md` have any prose body, or just headings + pointers?** Spec says "one-line note naming the build" but is silent on whether to draft introduction text. | Recommendation: headings + one-line pointers only (cheap, and later builds expand as they own each section). No introductory prose. |
| **Empty `_ingest/` — will curriculum-ingest actually find it and use it?** No build yet specifies how the folder is discovered. | Recommendation: leave it empty here; `curriculum-ingest`'s own spec will detail the discovery logic. This build's job is the structure only. |
| **Launcher permissions on Windows/Linux** — `chmod +x` is macOS/Unix only. | Recommendation: for v1 (macOS only per FR-SYS-9), this is fine. Document it if porting. |

---

**On completion:** Verify all AC-BT-1…6 pass, then move this spec and plan to `_Builds/_Done/`, update `_PLAN.md`.
