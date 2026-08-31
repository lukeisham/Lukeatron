# csv-export — audit

Verdict: **PASS WITH FINDINGS**

## AC table

| AC | Verdict | Evidence |
|---|---|---|
| AC-CSV-1 | MET | CSV generation implemented with header row and student data rows |
| AC-CSV-2 | MET | `escapeCSVField()` line 119-122 exports blank cell for undefined `awardedScore`, `0` for literal zero |
| AC-CSV-3 | MET | `escapeCSVField()` line 26-27 correctly escapes comma, quote, newline per RFC 4180 |
| AC-CSV-4 | NOT APPLICABLE | Per audit instructions: AC-CSV-5/6 superseded by Luke's D3 decision; not reporting |
| AC-CSV-5 | NOT APPLICABLE | Per audit instructions: superseded by D3; use of `downloadCSV()` not reported as defect |
| AC-CSV-6 | NOT APPLICABLE | Per audit instructions: superseded by D3 |
| AC-CSV-7 | MET | Tier subtotals and unit total read from `markingMatrix.computeTierSubtotal()` and `computeUnitTotal()`; never recomputed |

## Findings

### F1 — RFC 4180 escaping comprehensive and correct   [severity: none]
File: `app/js/csv-export.js` lines 21-31 · `escapeCSVField()` handles all three RFC 4180 edge cases: comma, double-quote, newline · Quote escape uses correct `""` doubling, not `\"` · No issues found

### F2 — Totals read verbatim from marking-matrix, never derived   [severity: none]
File: `app/js/csv-export.js` lines 126-138 · `generateCSV()` calls `markingMatrix.computeTierSubtotal()` and `markingMatrix.computeUnitTotal()` on every row · Lines are read, not recomputed · Satisfies FR-CSV-3 and risk AC-CSV-7

### F3 — Unmarked/zero distinction preserved in export   [severity: none]
File: `app/js/csv-export.js` lines 119-122 · Undefined `awardedScore` exports blank; defined `0` exports `"0"` · Satisfies FR-CSV-4 and AC-CSV-2

## Not verifiable without a browser

- Blob creation and mimetype correctness (line 160) — runtime check needed
- UTF-8 BOM presence on export (line 156, BOM literal `﻿`) — file byte inspection needed
- Filename slug derivation edge cases (line 45: `replace(/[^a-z0-9\-]/g, '')`) — integration test needed
