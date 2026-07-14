# Template — Technical Specification

> One document per piece of work. Fill every section; write "None" rather than
> deleting a heading — an explicit "None" is a decision, a missing heading is an
> oversight. Delete only the guidance blockquotes. Specs are drafted for review
> **before** any code is written.

---

```markdown
# <Name> — Technical Spec

| Field | Value |
|---|---|
| **Type** | Build · Refactor · Spike · Change *(pick one — see type disciplines at the end)* |
| **Date** | <today> |
| **Status** | Draft → Approved → In progress → Done |
| **One-liner** | <the single capability or question this covers> |

## 1. Motivation

> Why this exists, in Luke's terms. For a Change: what production use revealed.
> For a Spike: the technical question to answer (feasible? ergonomic? performant?).

## 2. Scope

**In scope:** …
**Out of scope:** …

> One capability per spec. If you can't state the out-of-scope list, the spec is
> too big — split it.

## 3. Requirements

> Numbered and traceable. Every plan step and test below must point back to one
> of these numbers.

- **FR-1** — …
- **FR-2** — …

**Acceptance criteria** (observable, testable):

- **AC-1** — …

## 4. Prerequisites & dependencies

> The gate before code. Three buckets — leave a bucket as "None" if empty.

- **Required first (build order):** …
- **Choose-one (decision gates — decide before coding):** …
- **Coordinate-with (shared files/vocabulary that must be sequenced, not interleaved):** …

**Gate:** work may start when … *(one sentence)*

## 5. Decisions

> Every architectural choice made on Luke's behalf goes here — reviewable, and
> reversible until code exists. Never decide silently.

- **AD-1** — *Decision:* … *Rationale:* … *Rejected alternatives:* …

**Open questions** (with the default that applies if unanswered):

- **OQ-1** — …? *Default:* …

## 6. Risks

> Mandatory for Refactors and Changes; optional otherwise.
> Each row: what could break → consequence → mitigation → the test that proves it didn't.

| Risk | Consequence | Mitigation | Proving test |
|---|---|---|---|

## 7. Plan

> HOW, in ordered steps, each mapped to the FR it satisfies.

1. … *(FR-1)*
2. … *(FR-2)*

## 8. Verification — definition of done

> The work is done **only when everything here passes** — the project's standard
> gates plus this spec's own tests. Nothing else counts as done.

- [ ] All acceptance criteria (AC-n) demonstrated
- [ ] …

**On completion:** set Status to Done, move this spec to the project's
`Specs/Done/` folder, and re-check any other spec whose Prerequisites gate on it.
```

---

## Type disciplines (what changes per Type)

| Type | Extra discipline |
|---|---|
| **Build** | New functionality. Mini-PRD scope: one capability, hard out-of-scope list. |
| **Refactor** | **Behavior preservation is the defining constraint.** Risk table (§6) is mandatory; verification must include behavior-proving tests (golden outputs, before/after equality, perf baseline). Phase the plan so the code is green after every step. |
| **Spike** | Research. **The answer is the deliverable; the code may be thrown away.** Timebox it in §2. On exit, append findings (answers to §1's questions, with numbers) and a go/no-go. A spike whose answer is "no / infeasible" **succeeded** — record it and file it as Done all the same. |
| **Change** | Post-production request. §1 must state user-facing motivation; add impact on existing behavior and migration/rollback notes to §6. |
