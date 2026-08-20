# local-store — Build Spec

| Field | Value |
|---|---|
| **Type** | Build |
| **Date** | 2026-08-17 (rev 4) |
| **Status** | Draft — awaiting Luke's review |
| **Wave** | 1 (foundation) |
| **One-liner** | The browser-side data layer: load and save `unit.json` through the bundle's server, validate every invariant on load, and guard unsaved changes. |

---

## 1. Motivation

Every part of Curriculum Preparation reads and writes the same unit. Without a
persistence layer there is nothing to reopen tomorrow — and with the wrong one,
a cleared browser profile silently destroys a term's planning.

Filed from [DEPENDENTS.md](../_Spikes/CurriculumPreparation/DEPENDENTS.md)
row 2. Like the shell, it is more general than this project: any Lukeatron
widget that needs a save-to-folder project model wants exactly this.

> **This build has shrunk twice.** Rev 1: "save a JSON file via a download
> blob." Rev 3: "own a directory handle through the File System Access API,
> with a permission lifecycle and a crash-mat working copy." **Rev 4: a thin
> fetch client over the bundle's own server** (AD-5). The permission lifecycle,
> stale handles, re-prompts and browser-storage crash-mat are all *gone* —
> they existed only because the browser couldn't be trusted with the folder,
> and now it doesn't have to be. What remains is loading, validating, saving,
> and knowing whether there are unsaved changes.

## 2. Scope

**In scope**
- Load `unit.json` from the bundle server and hold it as the in-memory unit.
- Save it back through the server.
- **Validate every data-model invariant on load** (INV-DM-1…20), refusing a
  corrupt unit with a message that names the offending id.
- Schema versioning with a refuse-to-open rule for future versions.
- An unsaved-changes guard and a visible saved/unsaved state.
- One centralised place for every `fetch()` to the server. *(JS-5)*

**Out of scope**
- **All filesystem access** — that is `bundle-server` (AD-13). This build never
  touches a file; it calls endpoints.
- Any rendering (that is [`document-shell`](document-shell.build.spec.md)).
- Deciding *what* image files exist, or the manifest's contents — that is
  `image-paste`.
- CSV export (`csv-export`, wave 4 — it exports a *view*; this stores the *truth*).
- A browser-storage crash-mat. The server writes immediately and atomically;
  a second copy would be a second source of truth.
- Sync, cloud, accounts, multi-device, conflict resolution.
- Migration between schema versions — v1 refuses, it does not upgrade.

## 3. Requirements

- **FR-LS-1** — Loads `unit.json` from the bundle server on start. *(AD-5)*
- **FR-LS-2** — Saves it back through the server, restoring every part exactly
  on the next load. *(INV-DM-8)*
- **FR-LS-3** — Validates on load against the data model's invariants
  (INV-DM-1…20) and reports what failed, in plain language naming the offending
  id, rather than opening a corrupt unit.
- **FR-LS-4** — Saves through the server **on every change, debounced** — so a
  refresh or crash loses nothing without needing a second copy anywhere.
- **FR-LS-5** — Warns before navigating away from unsaved changes, and shows a
  visible saved/unsaved state at all times.
- **FR-LS-6** — Writes a `schemaVersion`; refuses to open a file with a higher
  version rather than silently dropping fields. *(INV-DM-9)*
- **FR-LS-7** — Makes clear that the **bundle folder is the truth**. There is
  no second copy for the UI to imply anything about.
- **FR-LS-8** — Makes **no request off localhost**. *(FR-SYS-1, FR-SYS-7)*
- **FR-LS-9** — Centralises every `fetch()` in one module rather than
  scattering them. *(JS-5)*
- **FR-LS-10** — Shows a **loading state before every request and an error
  state on failure** — a save that silently fails is the failure mode this
  build exists to prevent. *(JS-5, JS-2)*
- **FR-LS-11** — Surfaces a **server-unreachable** state honestly: says the
  server has stopped and what to do, never fails silently.
- **FR-LS-12** — **Vanilla ES modules only**, no dependencies. *(FR-SYS-8, JS-7)*

**Acceptance criteria**

- **AC-LS-1** — Save → close browser → reopen → load restores the unit
  byte-identically.
- **AC-LS-2** — A file with a dangling `lesson.nodeIds` reference (INV-DM-4) is
  refused with a message naming the bad reference.
- **AC-LS-3** — A file with two matrices for one (student, lesson) pair
  (INV-DM-6) is refused.
- **AC-LS-3a** — A file with a lesson missing `bigIdeaId` (INV-DM-15) is
  refused, naming the lesson.
- **AC-LS-3b** — A file with a three-level big-idea nesting (INV-DM-14) is
  refused.
- **AC-LS-4** — Refreshing mid-edit loses nothing — the debounced save already
  reached the server.
- **AC-LS-5** — Closing the tab with an unsaved change in flight warns first.
- **AC-LS-6** — A file stamped with a higher `schemaVersion` is refused, not
  partially read.
- **AC-LS-7** — Stopping the server mid-session produces a visible
  "server stopped" state, not a silent failed save.
- **AC-LS-8** — Every request shows a loading state and, on failure, an error
  state naming what failed.
- **AC-LS-9** — A unit with a stored reverse link (INV-DM-12) or a forked matrix
  instance (INV-DM-19) is refused, naming the offender.

## 4. Prerequisites & dependencies

- **Required first:** [`bundle-server`](bundle-server.build.spec.md) — this
  build is its only client, so the endpoint shape must exist. The v1 schema must
  be frozen.
- **Choose-one:** none remaining. AD-5 settles the mechanism; Q-3 is struck.
- **Coordinate-with:** `bundle-server` owns the endpoints — settle their shape
  once, in wave 1. `document-shell` shares the schema; neither adds a field
  without amending the data model spec first.

**Gate:** work may start when `bundle-server`'s endpoints are settled and the v1
schema is frozen.

## 5. Decisions

- **AD-LS-1** — *Decision:* JSON, pretty-printed with stable key order.
  *Rationale:* the file should be diffable and hand-inspectable — Luke can open
  it and read his own unit. This is also the reason images are files, not
  base64 (AD-15). *Rejected:* minified JSON, binary formats.
- **AD-LS-2** — *Decision:* validate on **load**, not on save. *Rationale:* a
  save must never fail and lose work; a load can safely refuse. *Rejected:*
  validate-on-save (turns a rescue into a dead end).
- **AD-LS-3** — *Decision:* no migration in v1 — refuse and say so.
  *Rationale:* there is nothing to migrate *from*, and a speculative migrator is
  untestable. *Rejected:* a forward-compatible field-dropping reader (INV-DM-9
  exists to forbid it).
- **AD-LS-4** — *Decision:* **validation lives here, not in the server.**
  *Rationale:* one owner for the invariant set (SR-1), and errors surface where
  Luke can see them. The server moves bytes; it does not judge them (AD-BS-4).
  *Rejected:* validating in both places (two owners of one rule set, guaranteed
  to drift).
- **AD-LS-5** — *Decision:* **no browser-storage copy at all.** *Rationale:*
  the server writes immediately and atomically, so the crash-mat has nothing
  left to protect against — and a second copy is a second source of truth,
  which is precisely the class of bug this project keeps designing out
  (INV-DM-12, AD-19). *Rejected:* keeping the working copy "just in case" (it
  would silently diverge, and reconciling it is real work for no gain).

**Open questions**

- **OQ-LS-1** — Debounce interval for autosave? *Default:* ~500 ms after the
  last keystroke — long enough not to thrash the disk, short enough that a
  crash costs one sentence.
- **OQ-LS-2** — Keep N previous versions of `unit.json` as a rollback ring?
  *Default:* no in v1 — the bundle folder is the backup. Worth revisiting once
  a real term's work is in one.
- ~~**OQ-LS-3** — atomic write?~~ **Closed in rev 4** — it moved to
  `bundle-server` (AD-BS-3), where the write actually happens.

## 6. Risks

| Risk | Consequence | Mitigation | Proving test |
|---|---|---|---|
| A failed save looks like a successful one | Luke loses an afternoon's work believing it saved | FR-LS-10, FR-LS-11 — loading and error states on every request (JS-5) | AC-LS-7, AC-LS-8 |
| Server stopped, page still open | Every subsequent edit is lost | Explicit server-unreachable state | AC-LS-7 |
| Validation too strict, refuses a recoverable file | Luke locked out of his own work | Errors name the exact bad id so it can be hand-fixed in the JSON | AC-LS-2, AC-LS-3 |
| Schema drifts between the wave-1 builds | Shell and store disagree; both "work" alone | Single schema owner; coordinate-with rule | Load a shell-produced fixture |
| `innerHTML` used on unit content | Luke-authored but still untrusted input to a renderer | JS-6 — never `innerHTML` with store text | Review + a fixture with markup in a title |

## 7. Plan

See [`local-store.plan.md`](local-store.plan.md).

## 8. Verification — definition of done

- [ ] All acceptance criteria AC-LS-1…9 demonstrated
- [ ] Round-trip test: save → reload → byte-identical
- [ ] Each of INV-DM-1…20 has a refusal test, or a recorded reason it needs none
- [ ] No request leaves localhost
- [ ] Zero third-party dependencies; vanilla ES modules only (JS-7)
- [ ] Every `fetch()` goes through the one client module (JS-5)
- [ ] No `innerHTML` with unit content anywhere (JS-6)
- [ ] A `unit.json` written by `ingest.py` loads cleanly — the AD-13 tier
      boundary, proven rather than assumed

**On completion:** set Status to Done, `git mv` this spec and its plan to
[`_Done/`](_Done/), update [`_PLAN.md`](_PLAN.md), and re-check
[the project prerequisites gate](../_Spikes/CurriculumPreparation/CurriculumPreparation.prerequisites.spec.md).
