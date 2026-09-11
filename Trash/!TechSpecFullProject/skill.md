---
name: "!TechSpecFullProject"
description: >
  Full spec-driven development framework for an entire coding project. Uses four folders
  (_Spikes/_Builds/_Refactors/_Changes), typed .spec.md documents, per-subtask .plan.md files,
  folder-level _PLAN.md plans, and a _Done/ completion lifecycle. Use when creating, organizing,
  planning, or completing spikes, feature builds, refactors, or change requests; when drafting
  spec/PRD/architecture/prerequisites documents; or when the user mentions spikes, builds,
  refactors, changes, spec files, plan files, subtasks, or moving completed work to done.
  For a single-feature spec only, use !TechSpecSingleFeature.
---

# Specs

**Specs** is a spec driven development workflow: engineering work is
organized as **subtasks** defined by spec documents and plans, grouped into
four top-level project folders. Specs are drafted for review **before**
code; decisions are recorded, not made silently; dependencies are analysed
up front and work is ordered by them.

## The four kinds of subtask

- **Builds** (`_Builds/`) — small code development tasks that add **new
  functionality**. Each build covers one capability with a mini-PRD scope.
- **Refactors** (`_Refactors/`) — code development tasks that **improve the
  codebase without changing functionality**. Behavior preservation is the
  defining constraint: refactor specs carry risk registers and
  behavior-proving tests (golden outputs, equality laws, perf baselines).
- **Spikes** (`_Spikes/`) — **research projects**, larger than builds and
  refactors, that exist to answer a technical question about the software:
  is an implementation feasible? friendly (ergonomic)? performant? The
  *answer* is the deliverable; the code **may be thrown away as a failed
  experiment** — a timeboxed spike that fails to converge is itself the
  answer, and must be recorded as such.
- **Changes** (`_Changes/`) — **change requests arriving after the product
  is in production**. Scoped like builds but with production discipline:
  each states its user-facing motivation, impact on existing behavior,
  and migration/rollback considerations.

## Folder structure

```
<repo root>/
├── _Spikes/                     # research: answer a question; may be discarded
│   ├── SPIKE-PROJECTS.md        # prioritized spike list (novelty/risk-weighted)
│   ├── _Done/                   # completed subtasks (specs + plans) move here
│   └── <SpikeName>/             # one folder per spike project
│       ├── <Name>.project.spec.md
│       ├── <Name>.prerequisites.spec.md
│       ├── <Name>.arch.spec.md
│       ├── <Name>-<Topic>.spec.md        # data model, PRD, etc.
│       ├── DEPENDENTS.md
│       └── _PLAN.md
├── _Builds/                     # new functionality, one capability each
│   ├── _Done/
│   ├── _PLAN.md                 # folder plan: all builds, dependency-ordered
│   └── <name>.build.spec.md + <name>.plan.md   # spec/plan pair per subtask
├── _Refactors/                  # improve the code, preserve behavior
│   ├── _Done/
│   ├── _PLAN.md
│   └── <name>.refactor.spec.md [+ <name>.plan.md]
└── _Changes/                    # post-production change requests
    ├── _Done/
    ├── _PLAN.md
    └── <name>.change.spec.md [+ <name>.plan.md]
```

## File naming conventions

All documents are markdown. Extensions are **typed** — the suffix says what
kind of document it is:

| Pattern | Document | Contents |
|---|---|---|
| `<name>.build.spec.md` | Feature build spec | Mini-PRD, small scope, ONE capability: Motivation, Requirements (`FR-XX-n` numbered), Acceptance criteria, Out of scope |
| `<name>.refactor.spec.md` | Refactor spec | Analysis, target architecture, phased migration with per-phase green gates, risk register (risk → consequence → mitigation → proving test), go/no-go |
| `<name>.change.spec.md` | Change request spec | Motivation from production use, requested behavior change, impact on existing behavior, migration/rollback notes, acceptance criteria |
| `<name>.project.spec.md` | Project spec | Purpose, question(s) to answer, definition, scope (in/out/boundary), success criteria, exit conditions |
| `<name>.prerequisites.spec.md` | Dependency gate | What must exist first, in four buckets: **required** (with build order), **choose-one** (decision gates), **optional**, **coordinate-with** (shared-file/ordering hazards); ends with a gate summary |
| `<name>.arch.spec.md` | Architecture decisions | Numbered decisions (AD-n): decision, rationale, alternatives rejected |
| `<name>-<topic>.spec.md` | Other specs | Data models, PRDs, etc.; invariants numbered `INV-XX-n` |
| `DEPENDENTS.md` | Dependency analysis | Table of general capabilities a subsystem needs that don't exist: exists-today / missing / need / link to the build request |
| `<name>.plan.md` (lowercase) | Subtask plan | HOW for one subtask, beside its spec: Prerequisites (or "none"), Steps mapped to the spec's FR numbers, Verification |
| `_PLAN.md` (uppercase) | Folder/project plan | Covers ALL subtasks in its folder: decision gates, dependency analysis (graph + soft couplings), waves ordered by prerequisites, completion protocol, tracking table |

Rules:
- A subtask = a spec file + (usually) a plan file, side by side, same `<name>`.
- Folder-level and project-level plans are always named exactly `_PLAN.md`.
- The underscore prefix (`_Spikes`, `_Builds`, `_Refactors`, `_Changes`,
  `_Done`, `_PLAN.md`) marks workflow-structural items and sorts them
  together.

## Workflow

**Creating a spike**: add a folder under `_Spikes/`; draft the
`.project.spec.md` (purpose/questions/scope) and supporting specs (data
model, PRD, `.arch.spec.md` for every decision made while extrapolating);
analyse what the spike needs that is more general than itself into
`DEPENDENTS.md`; file each such capability as a `_Builds/` spec/plan pair;
distill the gate into `.prerequisites.spec.md`; write `_PLAN.md` gated on it.

**Creating a build/refactor/change**: add the spec (+ plan) pair to the
folder; add a row to the folder's `_PLAN.md` (dependency analysis + wave
placement + tracking table).

**Planning a folder**: `_PLAN.md` must analyse prerequisites explicitly —
hard dependency graph, soft couplings (shared vocabulary, shared files that
must be sequenced rather than interleaved), decision gates before code —
and order subtasks into dependency waves (parallelizable within a wave).

**Completing a subtask**: it is done only when its plan's Verification
passes in full (project's standard gates plus the subtask's own tests).
Then: `git mv` the subtask's spec + plan into that folder's `_Done/`;
update the folder `_PLAN.md` tracking table (strike the row or annotate
with the completing commit); re-check any project `.prerequisites.spec.md`
that gates on it and note newly unblocked projects.

**Spike exit**: append findings (answers to the project spec's questions,
with numbers), a go/no-go recommendation, and file follow-on requests the
findings demand. A spike whose answer is "no" or "infeasible" succeeded at
its job — record the finding and move the specs to `_Done/` all the same.

## Conventions when writing these documents

- Requirements numbered and traceable (`FR-XX-n`, `INV-XX-n`, `AD-n`,
  `R-n`, `OQ-n` for open questions with recorded defaults).
- Every architectural decision made on the user's behalf goes in an
  `.arch.spec.md` with rationale and rejected alternatives — reviewable,
  reversible until code exists.
- Cross-reference by relative markdown links; when files move or are
  renamed, sweep and fix all references in the same change.
- Specs before code: draft for the user's review; do not start
  implementation until specs are approved and the prerequisites gate is
  satisfied.

## 🗂️ Repo Initialisation
To scaffold the four-folder structure (`_Spikes/`, `_Builds/`, `_Refactors/`, `_Changes/` with `_Done/` subfolders and initial `_PLAN.md` files) in a repository root, use the initialisation command stored at:
`Memory/Long-Term/Coding/specs-init.md`
Copy it into the target repo's `.claude/` directory and run it once. Idempotent — safe to re-run.
