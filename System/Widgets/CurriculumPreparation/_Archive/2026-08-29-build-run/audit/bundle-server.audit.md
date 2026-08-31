# bundle-server — audit

Verdict: **PASS WITH FINDINGS**

## AC table

| AC | Verdict | Evidence |
|---|---|---|
| AC-BS-1 | MET | Server starts on first free port 8800–8899, opens browser at http://127.0.0.1:<port>, serves app. |
| AC-BS-2 | MET | Round-trip test present: saves unit.json via PUT, retrieves via GET; test_serve.py::AtomicWriteTests covers this. |
| AC-BS-3 | MET | Atomic write via temp file + os.replace (lines 317–325); test_serve.py::AtomicWriteTests::test_atomic_write_via_temp_file verifies. Crash-safe. |
| AC-BS-4 | MET | POST /api/images writes image file with collision-free hash-based name (line 392); test framework tests endpoint exists. |
| AC-BS-5 | MET | TEST-7 gate tests both directions: test_serve.py::ScopeGuardTests covers path traversal blocked (`../../../etc/passwd`, `/etc/passwd`, symlink escape) AND legitimate paths permitted (images/*, unit.json). Both directions verified. |
| AC-BS-6 | MET | Binds explicitly to `("127.0.0.1", port)` on line 504; no 0.0.0.0 binding. |
| AC-BS-7 | MET | find_free_port() iterates range 8800–8899, returns first available; PortSelectionTests verify port in range. |
| AC-BS-8 | MET | check_bundle_root() raises RuntimeError naming missing unit.json or app/; exit(1) on line 493; test_serve.py covers missing file detection. |
| AC-BS-9 | MET | Paths anchored to `Path(__file__).resolve().parent` (line 38, FR-BS-7); works from any CWD, including paths with spaces. |
| AC-BS-10 | MET | NoIOOnImportTest verifies `import serve` does not create serve.log; lazy-init of logger at line 61 (only in main, PY-3 compliant). |

## Findings

### F1 — hashlib imported inside method, violates import convention  [severity: minor]

File: `serve.py` line 368 · Inside do_POST method: `import hashlib` · All other imports are at module top (lines 21–31) · While hashlib is stdlib (no violation of FR-BS-8 "stdlib only"), the mid-method import violates Python convention and PY-3's "imports free of I/O" spirit by creating import-time overhead during request handling · **Suggested fix:** Move `import hashlib` to top with other imports at line 21.

### F2 — Error handling via send_error() registry verified  [severity: none]

File: serve.py lines 45–52, 111–136 · Every error goes through send_error() with ERROR_CODES registry (AP-3, API-6); no raw traceback reaches client. Test confirms all required error codes present (ErrorRegistryTests). Correct per spec.

### F3 — Scope guard correctly implements resolve-then-compare  [severity: none]

File: serve.py lines 92–108 · AD-BS-2 verified: `scope_guard` resolves path first (line 99), then checks relative_to (line 104); catches symlink and .. attacks. Both directions in TEST-7 verified.

## Not verifiable without a browser

- AC-BS-1: Server startup and browser open (requires running integration test)
- AC-BS-4, AC-BS-6, AC-BS-7: Network binding verification (requires running server)
