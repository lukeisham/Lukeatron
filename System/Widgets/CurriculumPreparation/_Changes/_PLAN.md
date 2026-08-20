# _Changes — Folder Plan

Date: 2026-08-17
Status: No subtasks yet. The product is not in production.
Scope: implement all subtasks in this folder. Each subtask = one
`<name>.change.spec.md` (+ one `<name>.plan.md`). Changes are *post-production
change requests* — scoped like builds, but with production discipline: each
states its user-facing motivation, its impact on existing behaviour, and
migration/rollback notes. Completed subtasks move (spec + plan) to
[`_Done/`](_Done/).

Project context: [`_Spikes/CurriculumPreparation/_PLAN.md`](../_Spikes/CurriculumPreparation/_PLAN.md).

**This folder stays empty until the toolkit is in real classroom use.** A
request arriving before then is a build, not a change — file it in
[`_Builds/`](../_Builds/_PLAN.md).

The first real change request will almost certainly carry a **project-file
migration**, because `local-store` v1 deliberately refuses rather than
migrates (AD-LS-3). Any change touching the schema must say what happens to
units saved under the previous version.

## Decision gates (before any code)

None yet.

## Dependency analysis

None yet — analyse hard prerequisites, soft couplings (shared files to
sequence, shared vocabulary), and decision gates as subtasks are added.

## Order of work

| Wave | Subtask | Prereqs | Note |
|---|---|---|---|

## Completion protocol

A subtask is done only when its `.plan.md` Verification passes in full,
including its migration/rollback check. Then: `git mv` spec + plan to
[`_Done/`](_Done/); update the tracking table; re-check any spec whose
prerequisites gate on it.

## Tracking

| Subtask | Wave | Status | Commit |
|---|---|---|---|
| *(none)* | — | — | — |
