# bundle-server — Plan

| Field | Value |
|---|---|
| **Date** | 2026-08-17 (rev 4) |
| **Spec** | [bundle-server.build.spec.md](bundle-server.build.spec.md) |
| **Wave** | 1 |

## Prerequisites

- `bundle-template` exists — a skeleton with `app/` and a `unit.json` slot.
- `System/Tools/project-dashboard/serve.py` and `lukeatronwiki-viewer/serve.py`
  **read first**, for house idiom (SR-6).

## Steps

1. **Read the neighbours.** Both existing `serve.py` viewers, plus their
   `.command` launchers and `README.md`. Absorb argument handling, logging
   format, browser-open behaviour and path anchoring before writing a line.
   *(SR-6)*
2. **Anchor the root.** `Path(__file__).resolve().parent`; refuse to start
   unless `unit.json` and `app/` are present, naming what is missing.
   *(FR-BS-6, FR-BS-7, PY-5)*
3. **Write the scope guard first** — before any endpoint exists. Resolve, then
   `is_relative_to(root)`. This is the file's most important function; it gets
   written and tested before there is anything for it to guard.
   *(FR-BS-5, AD-BS-2)*
4. **Error registry + `send_error()`** — one place, one code set, no raw
   traceback to the client. *(FR-BS-9, API-3, API-6)*
5. **Static serving** of `app/`, through the guard. Bind `127.0.0.1` explicitly.
   *(FR-BS-1)*
6. **Free-port selection** from the range, printed on start. *(FR-BS-2, OQ-BS-1)*
7. **`unit.json` GET/PUT**, atomic write via temp file + `os.replace`.
   *(FR-BS-3, AD-BS-3)*
8. **`images/` POST/GET/DELETE**, generated collision-free filenames, all
   through the guard. *(FR-BS-4)*
9. **`.command` launcher**, matching the viewers'. *(SR-6, FR-BND-3)*
10. **Tests** in `tests/`, stdlib `unittest`: import cleanliness, happy path,
    and the gate tests. *(TEST-1…3)*
11. **Portability pass** — run from `/tmp/a b c/Unit Name/`, and after moving
    the bundle. *(FR-BS-11)*

## Verification

- [ ] **AC-BS-1** — starts, opens a browser, serves the app *(steps 5, 6)*
- [ ] **AC-BS-2** — `unit.json` PUT → GET round-trips identically *(step 7)*
- [ ] **AC-BS-3** — process killed mid-write leaves a valid `unit.json` *(step 7)*
- [ ] **AC-BS-4** — image POST lands as a real file in `images/` *(step 8)*
- [ ] **AC-BS-5** — **gate test, both directions**: traversal refused (raw,
      URL-encoded, double-encoded, absolute), legitimate path permitted *(steps 3, 10)*
- [ ] **AC-BS-6** — non-localhost connection refused *(steps 5, 10)*
- [ ] **AC-BS-7** — two bundles run on different ports *(step 6)*
- [ ] **AC-BS-8** — non-bundle folder fails with a named cause and non-zero exit *(step 2)*
- [ ] **AC-BS-9** — runs from a path containing spaces *(step 11)*
- [ ] **AC-BS-10** — `import serve` does no I/O and starts nothing *(PY-3)*
- [ ] Stdlib only; typed signatures; specific exceptions *(PY-1, PY-4, PY-6)*

## Gate-test coverage *(TEST-7 — both halves, or not done)*

> *Filled at step 10.*

| Gate | Blocked path proven | Permitted path proven |
|---|---|---|
| Scope guard — `..` traversal | ☐ | ☐ |
| Scope guard — URL-encoded traversal | ☐ | ☐ |
| Scope guard — absolute path | ☐ | ☐ |
| Scope guard — symlink escaping the root | ☐ | ☐ |
| Bind address — non-localhost | ☐ | ☐ |
| Write targets — anything but `unit.json` / `images/` | ☐ | ☐ |
