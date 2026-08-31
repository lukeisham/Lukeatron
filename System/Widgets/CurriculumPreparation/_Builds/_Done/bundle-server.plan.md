# bundle-server — Execution Plan

**Build:** bundle-server | **Wave:** 1 (foundation) | **Date:** 2026-08-29

---

## 1. Files

| Path | Purpose |
|------|---------|
| `_template/serve.py` | Main server module; owns all filesystem I/O, HTTP routing, scope guard, and port selection (SR-1, AD-13b) |
| `_template/tests/test_serve.py` | Smoke tests: scope guard (both directions, TEST-7), bind address, atomic write, empty-bundle detection, no I/O on import (PY-3) |

---

## 2. Steps

- [ ] Create `serve.py`:
  - [ ] Import: `http.server.HTTPServer`, `http.server.BaseHTTPRequestHandler`, `socketserver.TCPServer`, `json`, `pathlib.Path`, `webbrowser`, `sys`, `os`, `tempfile`, `logging`, `socket`
  - [ ] Define module-level constants: `PORT_RANGE_START = 8800`, `PORT_RANGE_END = 8900`, `BUNDLE_ROOT = Path(__file__).resolve().parent` (PY-5)
  - [ ] Define `find_free_port() -> int` — iterate 8800–8899, bind to `127.0.0.1:port`, if successful return port, if none free raise
  - [ ] Define `scope_guard(requested_path: str, root: Path) -> Path` — resolve path, check `is_relative_to(root)` (AD-BS-2), raise `403 Forbidden` if outside (FR-BS-5)
  - [ ] Define error response function `send_error(handler, code: int, message: str) -> None` — write JSON `{ "error": message, "code": code }` (API-3, API-6)
  - [ ] Define main request handler class `BundleHandler(BaseHTTPRequestHandler)`:
    - [ ] `do_GET` handler:
      - [ ] `GET /` — serve `app/index.html` as `text/html`
      - [ ] `GET /api/unit` — scope-guard `unit.json`, read and return JSON (scope guard first, then read)
      - [ ] `GET /api/images/<id>` — scope-guard image, return file with correct MIME type or 1×1 transparent PNG placeholder if missing (FR-BS-4)
      - [ ] Other paths — return 404
    - [ ] `do_PUT` handler:
      - [ ] `PUT /api/unit` — read raw body, scope-guard path, write atomically to temp file then `os.replace()` (AD-BS-3), return `{ "status": "ok" }` or error
      - [ ] Other paths — return 405
    - [ ] `do_POST` handler:
      - [ ] `POST /api/images` — read raw binary body, generate collision-free filename (timestamp-based or UUID from `crypto.getRandomValues`), scope-guard, write to `images/`, return `{ "id": id, "filename": filename }` or error (FR-BS-4)
      - [ ] Other paths — return 405
    - [ ] `do_DELETE` handler:
      - [ ] `DELETE /api/images/<id>` — scope-guard path, delete file (FR-BS-4), return `{ "status": "ok" }` or error
      - [ ] Other paths — return 405
    - [ ] Verify bind address is `127.0.0.1` only, never `0.0.0.0` or other interfaces (FR-BS-1, AC-BS-6)
    - [ ] All requests log to both stdout and `serve.log` in bundle root (FR-BS-13)
    - [ ] All errors caught and returned via `send_error()`, never raw traceback (API-6, FR-BS-9)
  - [ ] Define startup checks `check_bundle_root(root: Path) -> None` — verify `unit.json` exists, verify `app/` exists, raise with message if not (FR-BS-6)
  - [ ] Main block (`if __name__ == "__main__":`):
    - [ ] Check bundle is valid (FR-BS-6)
    - [ ] Find free port (FR-BS-2, FR-BS-12)
    - [ ] Create `HTTPServer(('127.0.0.1', port), BundleHandler)` (FR-BS-1)
    - [ ] Print port to stdout (OQ-14)
    - [ ] Open browser to `http://127.0.0.1:<port>/` (FR-BS-1)
    - [ ] Call `server.serve_forever()` with Ctrl-C handling (OQ-BS-2)
  - [ ] Ensure no `import serve` does any I/O or starts any server (PY-3)
- [ ] Create `tests/test_serve.py`:
  - [ ] Test `scope_guard()`:
    - [ ] TEST-7 blocked path: `../../../etc/passwd` → raises 403
    - [ ] TEST-7 blocked path: URL-encoded `..%2F..%2F..%2Fetc%2Fpasswd` → raises 403
    - [ ] TEST-7 blocked path: double-encoded `..%252F` → raises 403
    - [ ] TEST-7 blocked path: absolute path `/etc/passwd` → raises 403
    - [ ] TEST-7 permitted path: `images/img-abc.png` → resolves and returns Path
  - [ ] Test bind address: server bound to `127.0.0.1`, never `0.0.0.0`
  - [ ] Test atomic write: kill mid-write and verify `unit.json` is valid JSON, not truncated
  - [ ] Test startup guards:
    - [ ] Missing `unit.json` → non-zero exit with message (PY-6, AC-BS-8)
    - [ ] Missing `app/` → non-zero exit with message
    - [ ] No I/O on import: `python3 -c "import serve"` succeeds (PY-3)
  - [ ] Use `unittest`, `tempfile` for in-memory test bundles, `json.load()` to verify atomicity (TEST-2, TEST-4)
- [ ] Verify all paths anchored to `__file__`, never CWD (PY-5)
- [ ] Verify typed signatures on every function (PY-4)
- [ ] Verify specific exception handling, non-zero exit on error (PY-6)

---

## 3. Interfaces

**Exports (consumed by local-store):**

| Route | Method | Request | Response | Status |
|-------|--------|---------|----------|--------|
| `/` | GET | — | `text/html` (app/index.html) | 200 or 404 |
| `/api/unit` | GET | — | `{ schemaVersion, generatedFrom, meta, curriculum, nodes, ... }` (full unit.json) | 200 or 403/404/500 |
| `/api/unit` | PUT | raw JSON (complete unit.json) | `{ "status": "ok" }` | 200 or 403/404/500 |
| `/api/images` | POST | `Content-Type: application/octet-stream` (image bytes) | `{ "id": "abc123", "filename": "image-abc123.ext" }` | 201 or 403/500 |
| `/api/images/<id>` | GET | — | image file (image/* MIME type) or 1×1 transparent PNG if missing | 200 |
| `/api/images/<id>` | DELETE | — | `{ "status": "ok" }` | 200 or 403/404/500 |

**Error response format (all errors):**
```json
{ "error": "human-readable message", "code": "ERROR_CODE" }
```

**Consumes:**
- `bundle-template`'s folder structure (served from `Path(__file__).resolve().parent`)
- `unit.json` at bundle root (read/write via PUT/GET)
- `app/index.html` at root/app/ (served on GET /)
- `images/` folder at bundle root (POST/GET/DELETE)

---

## 4. Verification

| AC | Check | Proof |
|----|-------|-------|
| **AC-BS-1** | Server starts, opens browser, serves app | `python3 serve.py` runs, opens browser to `http://127.0.0.1:8800/` (or next free port), `curl http://127.0.0.1:<port>/` returns HTML |
| **AC-BS-2** | `unit.json` round-trips: PUT then GET returns identical bytes | Write known unit, GET it back, compare byte-for-byte |
| **AC-BS-3** | Killing mid-write leaves valid `unit.json` | Kill process during PUT, verify resulting file is valid JSON (not truncated) |
| **AC-BS-4** | Image POST lands as real file in `images/` | POST image, verify file appears in Finder under `images/`, verify filename matches response |
| **AC-BS-5** | Scope guard both directions (TEST-7) | `GET /api/unit?path=../../../etc/passwd` → 403; `GET /api/unit` (normal) → 200 |
| **AC-BS-6** | Connection from non-localhost refused | `curl http://127.0.0.1:<port>/` works; `curl http://192.168.x.x:<port>/` fails with 403 (if binding enforced) or connection refused |
| **AC-BS-7** | Two bundles run simultaneously on different ports | Start two instances, verify they bind to different ports in 8800–8899 range |
| **AC-BS-8** | Starting with no `unit.json` fails, non-zero exit | Run in empty folder, verify "unit.json not found" message and exit code 1 |
| **AC-BS-9** | Bundle runs from path with spaces | Create `_template/` in `/tmp/a b c/Unit Name/`, run serve.py, verify it serves correctly |
| **AC-BS-10** | `python3 -c "import serve"` does no I/O | Run import, verify no `serve.log` created, no file accessed, no exception |

---

## 5. Risks & Open Points

| Risk | Recommendation |
|------|---|
| **Image filename collision** — if two users paste the same image simultaneously, will they get different filenames? | Recommendation: use UUID (via `os.urandom()` or similar) or timestamp-nanosecond. UUID is simpler and guaranteed collision-free. AD-BOSS-1 names prefixes; images keep Image.id as 32-hex. Use that format: `imageId` becomes `image-<id>.ext`. |
| **What MIME type for images without extensions?** POST `/api/images` only takes binary, no filename. How to detect type? | Recommendation: use `imghdr.what(bytes)` (stdlib) to guess from header bytes, or accept `Content-Type` header. Fall back to `image/png` if uncertain. Store in manifest with actual detected type. |
| **Should the server auto-exit when the last browser tab closes?** | Recommendation per OQ-BS-2 (resolved): **no**. Ctrl-C only. Auto-exit needs heartbeat, which is machinery a personal tool doesn't earn. Match existing viewers (SR-6). |
| **Port range collision with other services** — is 8800–8899 guaranteed free? | Recommendation: 8800–8899 is above existing viewers (8787/8788) so no collision there. If all 100 ports taken, raise clear error naming the range. |
| **Should errors return HTML or JSON?** Some APIs return HTML for 404 errors (readability). | Recommendation: **always JSON**, even for 404/500. Local-store expects JSON. No HTML error pages. |

---

**On completion:** Verify all AC-BS-1…10 pass, ensure TEST-7 tests both blocked and permitted paths, move spec and plan to `_Builds/_Done/`, update `_PLAN.md`.
