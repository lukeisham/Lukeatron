# local-store — Plan

| Field | Value |
|---|---|
| **Date** | 2026-08-17 (rev 4) |
| **Spec** | [local-store.build.spec.md](local-store.build.spec.md) |
| **Wave** | 1 |

## Prerequisites

- `bundle-server` endpoints settled — this build is its only client.
- v1 schema frozen in the
  [data model spec](../_Spikes/CurriculumPreparation/CurriculumPreparation-datamodel.spec.md).
- Agreement with `document-shell` that neither build amends the schema
  unilaterally.

## Steps

1. **Freeze and encode the v1 schema** — the shape, plus `schemaVersion`.
   Stable key order for output. *(FR-LS-2, FR-LS-6, AD-LS-1)*
2. **Write the validator** — one check per invariant INV-DM-1…20, each
   producing a plain-language message that names the offending id.
   *(FR-LS-3, AD-LS-2, AD-LS-4)*
3. **The one fetch module** — every call to the server lives here, with loading
   and error states built in from the start rather than bolted on.
   *(FR-LS-9, FR-LS-10, JS-5)*
4. **Load path** — GET, parse, version-check (refuse if higher), validate, then
   hand to the app. Refuse loudly, never partially.
   *(FR-LS-1, FR-LS-3, FR-LS-6, AD-LS-3)*
5. **Save path** — serialise with stable key order, PUT, debounced on every
   change. *(FR-LS-2, FR-LS-4, OQ-LS-1)*
6. **State surfaces** — visible saved/unsaved indicator, beforeunload warning,
   and an explicit **server-unreachable** state. *(FR-LS-5, FR-LS-7, FR-LS-11)*
7. **Localhost + safety audit** — no request leaves localhost; no `innerHTML`
   with unit content anywhere. *(FR-LS-8, JS-6)*
8. **Cross-tier fixture test** — load a `unit.json` written by `ingest.py`,
   proving the AD-13 tier boundary rather than assuming it.

## Verification

- [ ] **AC-LS-1** — save → reload → byte-identical round trip *(steps 4, 5)*
- [ ] **AC-LS-2** — dangling `lesson.nodeIds` refused, bad reference named *(step 2)*
- [ ] **AC-LS-3** — duplicate (student, lesson) matrix refused *(step 2)*
- [ ] **AC-LS-3a** — lesson missing `bigIdeaId` refused, lesson named *(step 2)*
- [ ] **AC-LS-3b** — three-level big-idea nesting refused *(step 2)*
- [ ] **AC-LS-4** — mid-edit refresh loses nothing *(step 5)*
- [ ] **AC-LS-5** — closing with a save in flight warns first *(step 6)*
- [ ] **AC-LS-6** — higher `schemaVersion` refused, not partially read *(step 4)*
- [ ] **AC-LS-7** — server stopped mid-session shows a visible state *(step 6)*
- [ ] **AC-LS-8** — every request shows loading, and errors name the failure *(step 3)*
- [ ] **AC-LS-9** — stored reverse link or forked matrix instance refused *(step 2)*
- [ ] Every invariant INV-DM-1…20 has a refusal test or a recorded reason it needs none *(step 2)*
- [ ] No request leaves localhost; no `innerHTML` with unit content *(step 7)*
- [ ] Vanilla ES modules only, zero dependencies *(JS-7)*
- [ ] Python-written `unit.json` loads cleanly *(step 8)*

## Invariant coverage

> *Filled at step 2 — one row per invariant, so a gap is visible rather than assumed.*

| Invariant | Test | Status |
|---|---|---|
| INV-DM-1 three fixed tiers | — | ☐ |
| INV-DM-2 verbatim code/title preserved | — | ☐ |
| INV-DM-3 nodes form a tree | — | ☐ |
| INV-DM-4 no dangling references (all six kinds) | — | ☐ |
| INV-DM-5 tier page order | — | ☐ |
| INV-DM-6 one matrix per student+lesson | — | ☐ |
| INV-DM-7 matrix covers all three tiers | — | ☐ |
| INV-DM-8 unit folder self-contained | — | ☐ |
| INV-DM-9 schemaVersion refusal | — | ☐ |
| INV-DM-10 no curriculum-specific fields | — | ☐ |
| INV-DM-11 profile recorded on every unit | — | ☐ |
| INV-DM-12 no stored reverse links | — | ☐ |
| INV-DM-13 orientation stored only where it varies | — | ☐ |
| INV-DM-14 big-idea list exactly two levels | — | ☐ |
| INV-DM-15 every lesson has a resolvable bigIdeaId | — | ☐ |
| INV-DM-16 crib sheet pageCount is 1 or 2 | — | ☐ |
| INV-DM-17 image manifest/file integrity | — | ☐ |
| INV-DM-18 singular parts are singular | — | ☐ |
| INV-DM-19 matrix instances carry no shared structure | — | ☐ |
| INV-DM-20 bundle self-contained, no outside paths | — | ☐ |
