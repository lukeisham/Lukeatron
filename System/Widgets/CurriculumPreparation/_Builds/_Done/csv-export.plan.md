# csv-export — Execution Plan

**Build:** csv-export (Wave 4, prerequisite: marking-matrix)  
**Status:** Ready for implementation (coordinated with bundle-server amendment)  
**Date:** 2026-08-29

---

## 1. Files

Exact paths under `_template/`:

| Path | Purpose | Owned by this build |
|------|---------|---|
| `app/js/csv-export.js` | Module: assemble CSV from loaded unit (matrix scores, criteria, students), call bundle-server export endpoint, handle response | Yes |
| `tests/test_csv-export.js` | Smoke: export fixture, verify UTF-8 BOM, correct headers, no recomputation, blank cells for unmarked, proper quoting | Yes |

**Consumed (not owned):**
- `app/js/local-store.js` — read matrixTemplate, matrices[], students[] via `store.loadUnit()`
- `app/js/marking-matrix.js` — reads computed totals from already-persisted matrix data, does NOT re-derive them
- `bundle-server` (amended endpoint) — new `POST /api/export/csv` or equivalent; writes to `<unit-slug>-matrix.csv` at bundle root

**bundle-server coordination:**
- **Requirement:** add scoped write endpoint for CSV export (FR-CSV-8)
- **Path:** (TBD by bundle-server spec §4 coordination item OQ-CSV-3, default recommendation: `POST /api/export`)
- **Input:** raw CSV bytes in request body (assembled by this build in JS)
- **Output:** `{ "status": "ok", "filename": "..." }` (200) or error JSON
- **Scope guard:** refuse path outside bundle root (same guard as `PUT /api/unit`, TEST-7 both directions)

---

## 2. Steps

### Phase 1: CSV Assembly & Formatting

- [ ] Define CSV row structure:
  - Header row: `"Student Name"`, `"Criterion 1"`, ..., `"Criterion N"`, `"Pass Total"`, `"Intermediate Total"`, `"Advanced Total"`, `"Unit Total"`
  - One data row per student: student name, then one column per criterion's `awardedScore` (blank if unmarked), then three subtotals (Read from matrix, no recomputation)
  - Example (fixture 2 students, 2 criteria): `"Alice","5","4","9/10","0/5","0/5","9/15"` (tier subtotals read, never recomputed)
- [ ] UTF-8 with BOM: prepend `﻿` to output
- [ ] Quoting: quote any field containing comma, quote, or newline; escape internal quotes per RFC 4180
- [ ] Full-unit scope only (FR-CSV-1, OQ-21): every criterion, every student, tiered-ceiling totals
- [ ] Order: criteria in matrixTemplate stable order; students in students[] stable order; tiers in fixed order (Pass, Intermediate, Advanced)

### Phase 2: Export Button & Action

- [ ] Add export control on marking-matrix HTML (label: "Export to CSV")
- [ ] On click: assemble CSV in JS, call `exportCSV(csvBytes)` (this build's export function)
- [ ] Show brief success message or loading state while request in flight

### Phase 3: CSV Content from Local-Store

- [ ] Read `store.loadUnit()` data:
  - Iterate `matrixTemplate.criteria[]` for column headers and tier assignment
  - Iterate `students[]` for row names
  - Iterate `matrices[].scores[]` for per-student marks (read awardedScore, NOT recompute)
  - Look up per-tier and unit totals from matrix's own computed totals (NOT re-derived by this build)
- [ ] Verify every criterionId referenced in scores[] exists in matrixTemplate (defensive; should already be true)
- [ ] Blank cells for unmarked: if a student has no score entry for a criterion, output blank (not `0`, not `—`)

### Phase 4: Call Export Endpoint

- [ ] Implement `exportCSV(csvBytes)` function:
  - `POST <bundle-root>/api/export` (exact path TBD by bundle-server §4 OQ-CSV-3)
  - Request body: raw CSV bytes
  - Response: check status 200, confirm response `{ status: "ok" }`
  - Error: display error message to user (e.g. "Export failed: path outside bundle")
  - No local download, no blob save — file lands in bundle only (FR-CSV-5)
- [ ] Implement retry logic for transient failure (optional, but recommended: 1 retry on 5xx)

### Phase 5: Verify No Recomputation

- [ ] Audit every cell value in final CSV against what marking-matrix already computed:
  - Never call allocation algorithm
  - Never recompute tier subtotals
  - Never derive unit total from per-assessment rows or any formula
  - Every number either read directly or constructed from reads (e.g. student name + blank check)
- [ ] Test fixture: mark students' scores, export, verify totals match what matrix's own print view shows

### Phase 6: Tests & Verification

- [ ] Test: two-student fixture, export, open in Excel, verify column count, correct quoting
- [ ] Test: unmarked criterion → blank cell, marked 0 → cell contains `0`, visibly distinct in output
- [ ] Test: criterion with comma in text → exported with proper CSV quoting, re-parses correctly
- [ ] Test: export twice → single file, second overwrites first at same filename (AC-CSV-4)
- [ ] Test: file appears in bundle folder, not Downloads (AC-CSV-5)
- [ ] Test: path traversal attempt refused (AC-CSV-6, TEST-7)
- [ ] Test: tier subtotals and unit total match fixture's tiered-ceiling figures (AC-CSV-7)

---

## 3. Interfaces

### Exports (for marking-matrix.js to import and call)

```javascript
// csv-export.js
export async function exportCSV(unit) {
  // Assemble CSV from unit.matrixTemplate, unit.matrices[], unit.students[]
  // Encode to UTF-8 with BOM
  // POST to bundle-server export endpoint
  // Return Promise<{ status: "ok", filename: string } | { error: string }>
}
```

### Consumes

```javascript
// from local-store (via marking-matrix)
unit.matrixTemplate.criteria[] // for headers, tier assignment, criterion order
unit.matrices[] // for per-student scores (matrices[].scores[].awardedScore)
unit.students[] // for student names, student order

// from bundle-server (new endpoint, coordinated)
POST /api/export (or other path per OQ-CSV-3)
  Request body: CSV bytes (utf-8 with BOM)
  Response: { status: "ok", filename: string }
  Error: { error: string, code: string }
```

---

## 4. Verification

One row per acceptance criterion, mapped to a concrete runnable check:

| AC-* | Check | How to verify |
|------|-------|---|
| AC-CSV-1 | Two students' full-unit scores export to clean CSV, correct headers, no mangled non-ASCII | Export fixture, open in Excel and Numbers, verify headers align with criteria names, all columns present |
| AC-CSV-2 | Unmarked criterion → blank cell; genuinely entered 0 → cell contains `0`, visibly distinct | Fixture: one student marked 0, one unmarked; export → unmarked is empty cell, marked is `0` |
| AC-CSV-3 | Criterion wording with comma exports with correct CSV quoting, re-parses same column count | Fixture: criterion text `"Identify, analyze, and explain"` → export quoted, re-parse in Python/Excel confirms N columns unchanged |
| AC-CSV-4 | Export twice → one file, not two; second overwrites first | Export, check filename; export again, list bundle files → same filename, one file only |
| AC-CSV-5 | Exported file appears inside bundle folder, not Downloads | List bundle root, verify CSV present; verify browser's Downloads folder does NOT contain it |
| AC-CSV-6 | **Gate test (TEST-7)**: path traversal refused (blocked path), legitimate export inside root passes (permitted path) | Attempt `POST /api/export` with payload escaping bundle → 403 error; attempt legitimate path → 200, file appears |
| AC-CSV-7 | Tier subtotals and unit total match tiered-ceiling figures (AC-MMB-34/35 worked example) | Fixture: 3 Pass, 2 Intermediate, 4 Advanced criteria; score full marks on Pass only → CSV shows `50` unit total, not derived from per-assessment rows |

---

## 5. Risks & Open Points

| Risk | Likelihood | Mitigation | Recommendation |
|------|---|---|---|
| CSV re-derives a total instead of reading marking-matrix's computed value | **High** | FR-CSV-3: explicit "re-derive nothing" prohibition; test AC-CSV-7 compares CSV total against matrix's own print output | Pre-code test that reads matrix.unitTotal directly, exports, compares in output file |
| Unmarked cell exports as literal `0` instead of blank | **Medium** | FR-CSV-4: check for missing score entry, output blank; test AC-CSV-2 visibly distinguishes | Validate: `awardedScore !== undefined ? value : ""` — blank if key missing |
| bundle-server export endpoint not scope-guarded | **Medium** | FR-CSV-8: same guard pattern as `PUT /api/unit` (scope guard in bundle-server, not this build); test AC-CSV-6 both paths | Coordinate with bundle-server to land TEST-7 gate test before this build ships |
| CSV lands in Downloads instead of bundle | **Low** | FR-CSV-5, AD-CSV-1: endpoint writes inside bundle root only; browser never triggers native download; test AC-CSV-5 | Use endpoint POST, never `<a download>` or Blob save |
| Field containing quote or comma breaks column alignment | **Medium** | FR-CSV-2: stdlib `csv` module (Python) or hand-rolled JS quoting per RFC 4180; test AC-CSV-3 | Use tested CSV writer; quote any field with special chars |
| Per-assessment export snuck in (scope creep from OQ-21) | **Low** | OQ-21: "v1 default is full-unit only"; this build implements full-unit; per-assessment deferred to later phase | Document explicitly: "Per-assessment export is out of scope v1; requires separate ticket" |

**Recommended defaults for unresolved decisions:**
- CSV filename: **`<unit-name-slug>-matrix.csv`** at bundle root (OQ-CSV-1 resolved: lowercase, spaces→hyphens, e.g. `year-9-geometry-matrix.csv`)
- Include per-criterion comments: **No** (OQ-CSV-2 resolved: scores only, not a prose record)
- Endpoint path: **`POST /api/export`** (TBD by bundle-server OQ-CSV-3, default recommendation; settle in coordination before this build starts)
- Blank cell rendering: **empty string in CSV** (not `0`, not `—`, not `null`)
- Retry logic: **one automatic retry on 5xx error** (recommended but optional)

