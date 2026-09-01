<!-- Template — refactor registry, written by !AppDevelopment Phase 4.
     Lives permanently beside _template/ and _test/. It is the resume point for every future
     session on this project. Delete these comment lines. -->

# <Name> — Refactor Registry

kind: <app | widget>
template: `_template/`
test: `_test/`
last_updated: <YYYY-MM-DD>

## In two lines
<What this is. What it is for.>

## Where things are
```
<Name>/
├── _template/              the canonical copy — raw working code + README.md, no data, no specs
├── _test/                  labelled TEST, obviously fake data, where every change is tried first
└── refactor-registry.md    this file
```
These three are always siblings. The test copy and its fake data are never tidied away when a
refactor finishes.

## The rule
Changes are made in `_test/` only. The template is never edited directly. An accepted change is
ported into `_template/`, the fake data stripped, and the template verified to still run clean.
After every port, `_test/` and `_template/` are diffed file by file — any difference not on the
divergence allowlist below means the port was incomplete.

## Divergence allowlist
The only differences `_test/` is permitted to carry that `_template/` does not. Anything else
found by a diff is drift, not a label — resolve it before closing the board row.

| What | Where |
|---|---|
| <fake data file(s)> | |
| TEST banner / title / launcher markers | |
| <seed/fake-data script output — generated images, caches> | |

## Refactor board

| # | Requested change | Status | Notes |
|---|---|---|---|
| R-1 | | requested | |

Status values: `requested` · `in test` · `accepted` · `in template` · `rejected`.
A rejected change is reverted in `_test/` and left on the board — not silently dropped.

## Granted rule exceptions
<Carried forward from the build, plus any granted during refactoring. Must match `_template/README.md`
exactly. Empty is the normal state.>

| Rule ID | Where | Reason | Granted on |
|---|---|---|---|
| — | — | — | — |

## Resume block
A cold agent picks this up by reading, in order:
1. This registry — the board, and which row is in flight.
2. `_template/README.md` — key decisions and their reasons, cross-boundary behaviour, navigation map.
3. `_test/` — the current state of whatever is being tried.
Do not reconstruct state from conversation history. This file is the state.

## Migration log
| Date | Event |
|---|---|
| <YYYY-MM-DD> | Moved to permanent home. Copy verified: <N files, checks run and passed>. |
| <YYYY-MM-DD> | Design documents deleted after verification, confirmed by Luke. |
