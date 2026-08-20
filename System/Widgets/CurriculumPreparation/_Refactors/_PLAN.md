# _Refactors — Folder Plan

Date: 2026-08-17
Status: No subtasks yet.
Scope: implement all subtasks in this folder. Each subtask = one
`<name>.refactor.spec.md` (+ one `<name>.plan.md`). Refactors *improve the
codebase without changing functionality* — behaviour preservation is the
defining constraint. Completed subtasks move (spec + plan) to [`_Done/`](_Done/).

Project context: [`_Spikes/CurriculumPreparation/_PLAN.md`](../_Spikes/CurriculumPreparation/_PLAN.md).

## Decision gates (before any code)

None yet.

## Dependency analysis

None yet — analyse hard prerequisites, soft couplings (shared files to
sequence, shared vocabulary), and decision gates as subtasks are added.

Two are foreseeable and should be specced here when they arrive rather than
smuggled into a build:

- If the spike re-cuts the architecture away from SVG-first (Q-2 fails), the
  change lands as a refactor of `document-shell`, with a behaviour-proving
  print comparison against the original measurements.
- If `System/Widgets/Parser/_shell/` and this project's shell converge,
  merging them is a refactor touching live parser widgets — a risk register
  and golden-output tests are mandatory.

## Order of work

| Wave | Subtask | Prereqs | Note |
|---|---|---|---|

## Completion protocol

A subtask is done only when its `.plan.md` Verification passes in full,
including behaviour-proving tests (golden outputs, before/after equality).
Then: `git mv` spec + plan to [`_Done/`](_Done/); update the tracking table;
re-check any spec whose prerequisites gate on it.

## Tracking

| Subtask | Wave | Status | Commit |
|---|---|---|---|
| *(none)* | — | — | — |
