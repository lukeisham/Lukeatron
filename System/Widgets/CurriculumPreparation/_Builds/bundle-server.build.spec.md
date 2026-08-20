# bundle-server — Build Spec

| Field | Value |
|---|---|
| **Type** | Build |
| **Date** | 2026-08-17 (rev 4) |
| **Status** | Draft — awaiting Luke's review |
| **Wave** | 1 (foundation) |
| **Language** | Python 3, standard library only *(SR-2, PY-1)* |
| **One-liner** | Each bundle's own `serve.py`: serves the app over localhost, owns every filesystem read and write, and is hard-scoped so it can never reach outside its bundle root. |

---

## 1. Motivation

Every unit bundle is self-contained (AD-18) and needs a way to save. Luke's
call — *"I'm happy for a tiny mini server to be generated each time"* — makes
that a small local Python server rather than a browser file API, which removes
a permission lifecycle, stale directory handles, a crash-mat working copy, and
a whole spike question (Q-3, struck).

This build owns the Python half of AD-13's tier boundary: **all filesystem I/O
lives here**, and the browser never touches a file directly.

## 2. Scope

**In scope**
- Serve `app/` over `127.0.0.1` on a free port, and open a browser at it.
- Read and write `unit.json`.
- Write, read and list files under `images/`.
- The **scope guard** — refuse any resolved path outside the bundle root.
- Port selection so two bundles can run at once.
- A `.command` launcher, matching the existing Lukeatron viewers (SR-6).
- Refuse to start if the root doesn't look like a unit bundle.

**Out of scope**
- Rendering, layout, document logic — the browser's job (AD-13).
- The plain-text ingest — that is `ingest.py` / `curriculum-ingest`, a separate
  script with a separate job (SR-1, PY-2).
- Authentication, accounts, TLS. Localhost, one user, one machine.
- Any access to `Memory/` or anything else outside the bundle (AD-13b).
- Serving to any host but localhost.
- Schema validation — that is `local-store`'s job on load. The server moves
  bytes; it does not judge them.

## 3. Requirements

- **FR-BS-1** — Serves the bundle's `app/` over HTTP, bound to **`127.0.0.1`
  only**. *(FR-BND-4)*
- **FR-BS-2** — Selects the **first free port from a range** and prints it, so
  two bundles can run simultaneously. *(FR-BND-6, arch OQ-14)*
- **FR-BS-3** — `GET` and `PUT` of `unit.json`, written **atomically** —
  temp file then rename, so a crash mid-write cannot leave a half-written unit.
- **FR-BS-4** — `POST`, `GET` and `DELETE` of files under `images/`, with
  generated collision-free filenames. *(FR-IMG-2, arch OQ-DM-9)*
- **FR-BS-5** — **The scope guard.** Every requested path is resolved and
  checked against the bundle root; anything that escapes is refused with a
  registry error, never served, never written. *(FR-BND-4, AD-13b)*
- **FR-BS-6** — Refuses to start if its root is not a unit bundle (no
  `unit.json`, no `app/`), naming what is missing.
- **FR-BS-7** — Anchors every path to `Path(__file__).resolve().parent`, never
  the working directory — `.command` launchers start anywhere. *(PY-5)*
- **FR-BS-8** — **Standard library only.** `http.server`, `json`, `pathlib`,
  `webbrowser`, `socketserver`. *(SR-2, PY-1)*
- **FR-BS-9** — Errors go through a shared `send_error()` with codes from one
  registry; no raw traceback ever reaches the client. *(API-3, API-6, PY-6)*
- **FR-BS-10** — Handlers are thin: parse, call a named function, shape the
  response. No file logic in the routing layer. *(API-1)*
- **FR-BS-11** — Works from a path containing **spaces**, and after the bundle
  has been moved or copied. *(FR-BND-5)*

**Acceptance criteria**

- **AC-BS-1** — The server starts, opens a browser, and serves the app.
- **AC-BS-2** — `unit.json` round-trips: `PUT` then `GET` returns identical bytes.
- **AC-BS-3** — Killing the process mid-write leaves a **valid** `unit.json`,
  not a truncated one.
- **AC-BS-4** — An image `POST` lands as a real file in `images/`, visible in
  Finder.
- **AC-BS-5 — the gate test, both directions** *(TEST-7)*: a request for
  `../../../etc/passwd`, its URL-encoded and double-encoded variants, and an
  absolute path, are each **refused**; a legitimate path inside the root
  **passes**. *Neither half alone counts as done.*
- **AC-BS-6** — A connection from a non-localhost interface is refused.
- **AC-BS-7** — Two bundles start simultaneously on different ports.
- **AC-BS-8** — Starting in a folder with no `unit.json` fails with a message
  naming what is missing, and a non-zero exit. *(PY-6)*
- **AC-BS-9** — The bundle runs from `/tmp/a b c/Unit Name/`.
- **AC-BS-10** — `python3 -c "import serve"` does no I/O and starts no server.
  *(PY-3)*

## 4. Prerequisites & dependencies

- **Required first:** `bundle-template` — there must be a skeleton with an
  `app/` and a `unit.json` slot to serve.
- **Choose-one:** none. AD-5 settles the mechanism; arch OQ-14 (port range) has
  a default.
- **Coordinate-with:** `local-store` is this build's **only** client. Settle the
  endpoint shape here, in wave 1 — a change in wave 2 costs both builds.
  `System/Tools/project-dashboard/serve.py` and `lukeatronwiki-viewer/serve.py`
  are the **read-only reference** for house idiom (SR-6): read them first, match
  their argument handling, logging and launcher conventions. Do not import from
  or edit them.

**Gate:** work may start when `bundle-template` exists.

## 5. Decisions

- **AD-BS-1** — *Decision:* one module, `serve.py`, with the scope guard as a
  named function beside the handler. *Rationale:* SR-1 one file one job, and the
  guard is the file's most important line — burying it in a package would hide
  it. *Rejected:* splitting into a package (premature for a few hundred lines).
- **AD-BS-2** — *Decision:* the scope guard resolves **first**, then compares —
  `path.resolve().is_relative_to(root)`. *Rationale:* string prefix checks are
  how traversal gets shipped; symlinks and `..` only collapse on resolve.
  *Rejected:* prefix matching on the raw string; blacklisting `..` (encodings
  and symlinks walk straight past it).
- **AD-BS-3** — *Decision:* atomic write via temp file + `os.replace`.
  *Rationale:* a half-written `unit.json` loses the unit — the single worst
  failure this project has. *Rejected:* direct overwrite.
- **AD-BS-4** — *Decision:* the server does **no schema validation**.
  *Rationale:* one job (SR-1); `local-store` validates on load, where the errors
  can actually be shown to Luke. *Rejected:* validating in both places (two
  owners of one rule set, guaranteed to drift).

**Open questions**

- **OQ-BS-1** — Port range? *Default:* 8800–8899, above the existing viewers'
  8787/8788 so a bundle never steals a viewer's port.
- **OQ-BS-2** — Should the server exit when the last browser tab closes?
  *Default:* **no** — Ctrl-C, matching the existing viewers (SR-6). Auto-exit
  needs heartbeat tracking, which is more machinery than a personal tool earns.
- **OQ-BS-3** — Log to stdout or a `serve.log`? *Default:* **both**, as the
  existing viewers do.

## 6. Risks

| Risk | Consequence | Mitigation | Proving test |
|---|---|---|---|
| Path traversal through the write endpoint | A localhost page — or anything that reaches it — writes outside the bundle. The reason AD-13b exists | Resolve-then-compare guard (AD-BS-2), write endpoints restricted to two known targets | **AC-BS-5, both directions** |
| Bound to `0.0.0.0` by accident | The bundle is exposed to the local network | Explicit bind address, asserted in a test | AC-BS-6 |
| Crash mid-write | The unit is lost | Atomic write (AD-BS-3) | AC-BS-3 |
| Port collision between two bundles | The second silently serves the first's data, or refuses to start | Free-port selection (FR-BS-2) | AC-BS-7 |
| Paths resolved against the CWD | Launcher starts elsewhere; server serves the wrong folder or nothing | Anchor to `__file__` (PY-5, FR-BS-7) | AC-BS-9 |
| A dependency creeps in | Breaks SR-2; the bundle stops being openable in three years | Stdlib-only check in verification | AC-SYS-4 |

## 7. Plan

See [`bundle-server.plan.md`](bundle-server.plan.md).

## 8. Verification — definition of done

- [ ] All acceptance criteria AC-BS-1…10 demonstrated
- [ ] **TEST-7 gate tests exist and pass in both directions** (refused *and*
      permitted) for the scope guard and the bind address — the build is not
      done without both
- [ ] Smoke tests per TEST-2: imports cleanly, happy path, one guard path
- [ ] Stdlib only — no import outside the standard library
- [ ] Read against `System/Tools/*/serve.py` for house idiom (SR-6)
- [ ] Every path anchored to `__file__`, never the CWD (PY-5)
- [ ] Typed signatures throughout (PY-4); specific exceptions, non-zero exit (PY-6)

**On completion:** set Status to Done, `git mv` this spec and its plan to
[`_Done/`](_Done/), update [`_PLAN.md`](_PLAN.md), and re-check
[the project prerequisites gate](../_Spikes/CurriculumPreparation/CurriculumPreparation.prerequisites.spec.md).
