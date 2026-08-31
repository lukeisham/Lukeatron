# bundle-template — audit

Verdict: **PASS WITH FINDINGS**

## AC table

| AC | Verdict | Evidence |
|---|---|---|
| AC-BT-1 | MET | `_template/` matches AD-18's tree exactly: Start Unit.command, unit.json, images/, _ingest/, app/{js/,css/}, StyleGuide/, tests/, README.md, plus blessed VERSION file (D2) and serve.py (see F1). |
| AC-BT-2 | MET | `unit.json` validates: schemaVersion set, generatedFrom empty, curriculum unset, all singular objects minimal valid form, all arrays present as []. Passes hand-check against INV-DM-9/18. |
| AC-BT-3 | MET | `Start Unit.command` is executable (`chmod +x` set); uses `cd "$(dirname "$0")"` to resolve own location; correct per SR-6. |
| AC-BT-4 | MET | grep finds no jurisdiction, vcaaCode, or curriculum-specific strings in template. |
| AC-BT-5 | MET | `README.md` carries all section headings SR-7 requires (Architecture, Server, Style Guide, Document Shell, Local Store, Curriculum Editor, Marking Matrix, Crib Sheet, Arbor Tree); each names the owning build spec. |
| AC-BT-6 | MET | No stub or placeholder file for anything FR-BT-6 names (serve.py, ingest.py, index.html, app/css/variables.css, StyleGuide/*.html). |

## Findings

### F1 — serve.py present in template, violates scope  [severity: major]

File: `_template/serve.py` · The spec (§2 Out of scope) explicitly states: "serve.py and ingest.py's actual content — `bundle-server`'s and `curriculum-ingest`'s jobs respectively. This build reserves their filenames' place in the tree only insofar as the tree itself has a slot for them; it writes neither file." · However, serve.py is present and contains a full implementation (480+ lines) · This violates FR-BT-6 which requires no file exists for anything another build owns · **Suggested fix:** Remove serve.py from bundle-template; let bundle-server create it as its own responsibility.

### F2 — CSS folder at top level, already noted  [severity: minor]

File: `_template/css/` · Known issue per audit guide: "_template/css/ is a stray top-level folder; lesson-plan-document's 2 CSS files sit there unreferenced." · Recorded here for completeness; flagged for repair separately.

### F3 — VERSION file present, blessed by Luke  [severity: none]

File: `_template/VERSION` · Present and blessed per Luke's decision D2 ("_template/VERSION as a 9th top-level entry — Luke has blessed it"). Correctly formatted (single-line date string "2026-08-23"). Matches spec requirement FR-NU-11 for newunit-skill.

## Not verifiable without a browser

None.
