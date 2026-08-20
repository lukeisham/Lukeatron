# CurriculumPreparation — Dependency Analysis

| Field | Value |
|---|---|
| **Date** | 2026-08-17 (rev 4) |
| **Parent** | [CurriculumPreparation.project.spec.md](CurriculumPreparation.project.spec.md) |

General capabilities this spike needs that are **more general than the spike
itself**. Each is filed as a `_Builds/` spec + plan pair so it can be built,
verified and reused independently of whether the spike returns go.

| # | Capability the spike needs | Exists today? | What's missing | Need | Filed as |
|---|---|---|---|---|---|
| 1 | Offline document shell: inline SVG render + HTML control layer + true-size A4 print, **portrait and landscape**, plus a generic image primitive | ⚠️ partial — `System/Widgets/Parser/_shell/` is an offline widget chassis, but built for interactive exercises, not paginated print documents | Paginated multi-page A4 layout in two orientations, `@page` print rules, SVG-render/HTML-edit split, image drawing | **Build** | [`document-shell`](../../_Builds/document-shell.build.spec.md) |
| 2 | A **tiny scoped local server**: serve an app folder, read/write its data, refuse anything outside its root | ⚠️ partial — `System/Tools/*/serve.py` are the house pattern, but **read-only** by design (PY-12); ours must write | The write path, the scope guard, atomic writes, free-port selection | **Build** | [`bundle-server`](../../_Builds/bundle-server.build.spec.md) |
| 2b | A **browser-side data layer**: load, validate every invariant, save, surface unsaved and unreachable states | ❌ no | All of it — existing widgets are stateless or hold trivial state | **Build** | [`local-store`](../../_Builds/local-store.build.spec.md) |
| 2c | A **project-bundle generator**: a template plus a skill that stamps out a complete, independent, runnable folder | ⚠️ partial — `!BuildParserCartridge` does clone-and-build for parser widgets, but into a shared chassis, not a standalone bundle | The template, the identity substitution, the standalone guarantee | **Build** | `bundle-template` + `newunit-skill` — wave 1, *spec pending* |
| 2d | A **per-bundle style guide and token set** | ⚠️ partial — `System/Widgets/Parser/_shell/StyleGuide/` is the reference to mirror (SR-6) | Ours, scoped to this product's four documents | **Build** | `style-guide` — wave 1, *spec pending* |
| 3 | Horizontal tidy-tree layout for SVG, on A4 landscape, sharing the page with a second list | ❌ no | Layout algorithm producing a horizontal family tree with no overlaps at print size | **Build** *(feature-level — stays with part 1)* | `arbor-tree` — wave 2, spec pending Q-1/Q-4 |
| 4 | CSV writing with correct quoting/escaping and an Excel-safe BOM | ❌ no | A tiny writer; deliberately not a library (AD-6, AD-13) | **Build** *(folded into part 3)* | `csv-export` — wave 4, spec pending |
| 5 | A launcher/viewer entry point consistent with the other widget suites | ✅ yes | Nothing — `System/Tools/` and existing widget launch conventions cover it | **Reuse** | — |
| 6 | Print-to-PDF | ✅ yes — the browser's own (AD-4) | Nothing to build; fidelity is a *question*, not a gap | **Reuse, verify** | Q-2, Q-2b |
| 7 | A machine-readable curriculum source | ❓ unknown, and **no longer load-bearing** | Nothing — Luke settled the mechanism as plain text + heuristics (G-1 closed) | **Downgraded to research** | Q-1; held spike candidate #2 |
| 8 | A **curriculum profile engine** — declarative adapters mapping any curriculum's text onto the canonical model, each with its own label map and attribution | ❌ no | All of it. This is what makes the tool curriculum-agnostic rather than Victorian-only (AD-10) | **Build** | `curriculum-ingest` — wave 2, spec pending Q-1/Q-1b |
| 9 | A **reverse-link index** — derive node → covering lessons, big idea → its lessons, lesson → its grids, from stored forward references, rebuilt on load | ❌ no | All of it. Cheap to build, but only if waves 2–4 stored the forward references (INV-DM-12) | **Build** | `traceability-links` — wave 5, spec pending |
| 10 | **Heuristic plain-text structure parsing** in Python — indentation, numbering, code patterns, blank-line grouping → a node tree, with per-node confidence | ❌ no | All of it. The one genuinely new algorithm in the project (AD-16) | **Build** *(Python; may be dropped by G-9)* | `curriculum-ingest` — wave 2 |
| 11 | **Clipboard image capture → file on disk**, with manifest, placement, and missing-file placeholders | ❌ no | All of it. Depends on row 2's folder access, which is why that one grew in rev 3 | **Build** | `image-paste` — wave 2, spec pending Q-6 |
| 12 | A **two-level curated list** with mandatory binding from another entity, and derived reverse lookup | ❌ no | Small, but the binding rules (INV-DM-14, INV-DM-15) are the load-bearing part | **Build** | `bigidea-list` — wave 2, spec pending |

---

## Reading of this table

Rows **1, 2 and 2b** are the real dependency gate — general enough that any
future Lukeatron widget needing a printable multi-page document, or a local
app with its own writable data, will want them. They are specced in full and
built first.

**Row 2 has now changed shape three times, and shrunk on the last one.** Rev 1:
"save a JSON file." Rev 3: image paste turned it into "own a folder via the File
System Access API," which dragged in a permission lifecycle, stale handles and a
browser-storage crash-mat. Rev 4: Luke accepted a per-bundle server, and *all of
that vanished* — the complexity existed only because the browser couldn't be
trusted with the folder. The lesson worth keeping: **two of the three
persistence designs were forced by requirements that arrived after the design,
and both changes were free because no code existed.**

Row **2 is also the one place this project departs from a house rule.** The
existing `serve.py` viewers are read-only by mandate (PY-12, API-5) because
their data is `Memory/`. Ours writes — but only inside its own bundle, which may
sit anywhere on disk and never touches `Memory/`. AD-13b makes that scoping
enforceable rather than conventional, and TEST-7 requires it proven in both
directions.

Rows **3, 4, 8, 10, 11 and 12** are part-specific and are *not* pre-specced:
their shape depends on what the spike turns up. Speccing them now would be
writing fiction.

Rows **2c and 2d are new in rev 4** and reframe the deliverable: this is not one
app that opens unit folders, it is a **generator that stamps out independent
bundles** (AD-18). The cost is that a template fix never reaches an
already-generated bundle — which is the accepted price of a unit that still
opens in three years.

Row **7 has been downgraded.** In rev 1 it was the project's one hard unknown —
"is there a machine-readable curriculum source?" Luke has since settled the
mechanism (plain text, digested by Python, errors permitted), so the answer no
longer gates anything. What remains is a *quality* question, not an existence
one: Q-1 measures how well heuristics do, and G-9 decides whether the ingest is
worth building at all.

Row **9 is the cheapest capability here and the easiest to make impossible.**
Deriving reverse links is trivial *if* the forward references were stored; it
cannot be retrofitted if waves 2–4 shipped a lesson that doesn't record its
nodes or its big idea. Rev 3 doubled the exposure — there are now two mandatory
forward references per lesson, plus crib-sheet sections and image refs. That is
why it is named five waves early: not because it is hard, but because its
prerequisite is a discipline the earlier waves must keep.

Row **10 is the only genuinely novel algorithm in the project**, and the only
one that might not be worth building. Everything else is layout, storage and
plumbing.
