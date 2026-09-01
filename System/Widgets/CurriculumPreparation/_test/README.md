> # ⚠ TEST COPY — NOT A REAL UNIT ⚠
>
> This is `_test/`, the refactor sandbox that sits beside `_template/`. Every
> piece of content in it is invented: a fictional "Dragonology" curriculum in the
> fictional jurisdiction of TESTLAND, taught by Ms Testerina Faketeacher to seven
> students named things like Testy McTestface. None of it is Luke's teaching work.
>
> **Changes are made here first, never in `_template/` directly.** Once a change is
> accepted it is ported into `_template/` and the fake data stripped back out. See
> `../refactor-registry.md`.
>
> Regenerate the data at any time with `python3 ../_TestData/seed-test-fake.py`
> — it overwrites `unit.json` and `images/`, so local experiments in the data are
> disposable by design.
>
> Two things here deliberately differ from `_template/` and must **never** be
> ported back: the red TEST banner and titles in `app/index.html`, and the notice
> in this file.

---

# Curriculum Unit Bundle

One self-contained unit of teaching preparation: a curriculum tree, big ideas,
topics, lessons, a crib sheet, a resources page, a unit assessment and a marking
matrix — all editable in the browser and all printable to A4.

This folder is the **template**. `Start Unit.command` is the front door: it runs
`serve.py`, which serves `app/` and reads and writes `unit.json` beside it. A real
unit is a *clone of this folder*, not a document opened by a shared application.

---

## Decisions the code cannot tell you

These were chosen deliberately. A later agent that "corrects" one is undoing a
decision, not fixing a bug.

**Every unit is its own bundle.** The deliverable is not one app that opens unit
folders — it is a folder stamped out per unit, carrying its own copy of the code,
its own server and its own data. Units stay portable, openable years later, and
independent of each other. The cost — code duplicated across bundles — was accepted
on purpose.

**Python + vanilla JS, and nothing else.** No npm, no framework, no build step, no
external CSS or JS. `app/js/` is native ES modules loaded from `app/index.html`
through the single entry point `app/js/app.js`. Reinvention (tidy-tree layout, the
limited Markdown subset, the coverage grid) is the accepted price of a bundle that
still runs with no toolchain in ten years.

**SVG renders, HTML edits.** Every printable surface is an inline `<svg>` driven by
the data model; every editing surface is ordinary HTML beside it. The SVG is a
projection, never an editing target — which is why print fidelity and geometry are
exact, and why layout arithmetic must not leak into rendering code.

**PDF is the browser's own Print → Save as PDF.** No bundled PDF library. Page size
and orientation are properties of the *part* (curriculum map landscape, lesson plan
portrait), fixed in CSS, not user settings.

**`serve.py` may write, and is hard-scoped to its own bundle folder.** Path escape
is rejected, not sanitised. This is the security boundary of the whole widget: it is
the only component with write access, and it can only reach files beneath itself.

**Curriculum ingest is import-once, never live-fetch.** The tool never calls a
curriculum authority at runtime. Plain text is dropped into `_ingest/` and digested
by hand or by script into the node tree.

**No curriculum content lives in this template.** Imported curriculum is third-party
content, kept local and attributed, and never shipped in the bundle. Grepping this
folder for any curriculum-specific string must return nothing — real curriculum
fixtures live outside, in `_TestData/`.

**The core is curriculum-agnostic; curricula are profiles.** The node model knows
nothing about any particular jurisdiction. A curriculum supplies its own labels
(strand / outcome / task, and the crib sheet's two half-names) through
`unit.curriculum.labels`. Hard-coding a Victorian term anywhere in `app/` is a bug.

**The three tiers are constants.** Pass / Intermediate / Advanced, and their green /
blue / orange, are fixed — not configurable. Tiering is the pedagogy, not a setting.

**One editing surface per shared entity.** Big ideas and topics are edited in exactly
one place; every other appearance is a read-and-navigate reflection. Adding a second
place to edit the same property is the failure mode this rule exists to prevent.

**Cross-links are derived on screen, printed plain.** Only forward references are
stored (`lesson.nodeIds`, and similar); back-references are computed. On screen a
curriculum code is a navigation control; in print it is plain text.

**Screen text serves the teacher, not the developer.** Validation rules, invariant
names and schema reasoning belong in code comments. If a message would only mean
something to someone who has read the source, it does not go on screen.

---

## What crosses a boundary

Change any of these and something outside this folder breaks.

| Boundary | Contract | Breaks if changed |
|---|---|---|
| `serve.py` ↔ `app/js/local-store.js` | `GET`/`PUT /api/unit`; `POST /api/images`, `GET`/`DELETE /api/images/<id>` | The only client/server contract. `local-store.js` is the sole caller — nothing else in `app/` may talk to the server. |
| `unit.json` top-level key set | `schemaVersion`, `generatedFrom`, `meta`, `curriculum`, `nodes`, `topics`, `bigIdeas`, `lessons`, `cribSheet`, `resourcesPage`, `unitAssessment`, `matrixTemplate`, `matrices`, `students`, `images` | `_TestData/seed-testunit.py` asserts this key set against the template. Adding or renaming a key without updating the seed is caught there by design. |
| `Start Unit.command` → `serve.py` | Launcher `cd`s to its own directory and execs `python3 serve.py` | Bundle portability. The bundle must run from wherever it is copied, with no install. |
| `app/index.html` → `app/js/app.js` | One `<script type="module">`, one entry point | Module graph. Every other file is reached by import from `app.js`. |
| Images | Stored as real files in `images/<id>.<ext>`, referenced from `unit.json` by id only | Never inline base64. Renaming an image on disk without its `images[]` record orphans it. |

---

## Navigation map

```
_template/
├── Start Unit.command       double-click launcher → serve.py
├── serve.py                 the only writer; scoped to this folder
├── unit.json                all unit data; empty in the template
├── VERSION
├── _ingest/                 drop plain curriculum text here
├── images/                  pasted images, one file per id
├── StyleGuide/index.html    living token reference (no code depends on it)
├── tests/                   node --test tests/*.js  ·  python3 -m unittest discover tests
└── app/
    ├── index.html           single entry; loads js/app.js as a module
    ├── css/                 34 files, one per surface; variables.css holds the tokens
    └── js/
        ├── app.js                    entry point — wires every part below
        ├── local-store.js            THE data layer; sole server client
        ├── document-shell.js         shared page/print chrome for every document
        ├── ids.js  tidy-tree.js  coverage-derivers.js  domain-resolver.js
        │                             pure functions — no DOM, no state
        └── the seven parts:
            arbor-tree.js             curriculum map
            bigidea-list.js           big ideas (+ coverage write API)
            lessons-and-topics.js     combined lessons & topics view
            lesson-plan-document.js   lesson plans
            unit-assessment-document.js
            marking-matrix.js         per-assessment and full-unit scoring
            crib-sheet.js             1–2 page cap, enforced
            resources-page.js         deliberately unstructured
```

---

## Granted rule exceptions

Deliberate breaks of `Memory/Long-Term/Coding/vibe-coding-rules.md`. Do not
"repair" these without deciding to; each was left knowingly.

| Rule | Where | Why it stands |
|---|---|---|
| **SR-1** one file, one job | `app/js/marking-matrix.js` (1790 lines) | Grid rendering, keyboard navigation, and totals-and-allocation are separable but entangled. Working and fully tested; split it the next time the matrix is changed for another reason, not on its own. |
| **SR-1** | `app/js/local-store.js` (971 lines) | Mixes `ServerClient`, `LocalStore` and all 44 `INV-DM-*` invariant checks. The most depended-on file in the app; the intended cut is `validateUnit()` out to a sibling `validate.js`, as its own task with its own test run. |
| **SR-1** | `app/js/bigidea-list.js` (873 lines) | List rendering plus the coverage write API. Same class of debt, lower risk. |

## Known sharp edge

`computeGlyphSet(bigIdeaId, nodes, resolveDomain)` requires its third argument to be
a caller-bound **1-argument closure** over `nodes` — not the 2-argument
`resolveDomain(nodeId, nodes)` it is named after. Passing the natural function
silently killed the crib sheet once. Fixed at the live call site; the signature
still invites the mistake.
