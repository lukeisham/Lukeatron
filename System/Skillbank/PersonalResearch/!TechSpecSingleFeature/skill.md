---
name: "!TechSpecSingleFeature"
description: >
  Simplified spec-driven-development skill for amateur coding / Lukeatron-system projects.
  Classifies a piece of work as Build / Refactor / Spike / Change, drafts a single traceable
  spec from Template_TechSpec.md for Luke's review before any code is written, and moves it
  to Specs/Done/ once its own verification checklist passes. Distilled from a heavier
  four-folder/seven-document spec system (System/Suggestions/complex specs/) down to one
  document per subtask while keeping the engineering discipline intact.
  For full project-level spec structure, use !TechSpecFullProject.
type: Skill
status: Active
domain: PersonalResearch (coding / amateur builds)
intent: "Give every non-trivial coding task a single reviewable spec before implementation — numbered requirements, recorded decisions, an explicit dependency gate, type-appropriate rigor, and a verification-defines-done completion rule — without the overhead of a multi-folder document system."
version: 1.0.0
dependencies: [Template_TechSpec.md]
calibration:
  context: [Personal Research, Hybrid]
  level: Extended
  scope: Global
memory_footprint:
  read: []
  write: []
---

## ⚡ TRIGGER
Primary: `!TechSpecSingleFeature`
Fires when: Luke asks to "write a spec", "tech spec", "specify this feature/refactor/spike/change",
"spec before we build", or the task is a coding job big enough that design decisions need his
review before implementation. Also fires to close out a spec ("mark the spec done").
Scope: any project folder under active development (typically a `_Lukeatron/` coding project or an
external repo Luke names). Never blocks on a missing `Specs/` folder — create it lazily.

## 🧭 CORE PRINCIPLE
**Specs before code, one document per subtask.** Design decisions get recorded and reviewed, not
made silently mid-implementation — but the record is a single traceable file, not a folder tree.

## 🛠️ LOGIC

STEP 1 — CLASSIFY. Assign exactly one Type:
  • **Build**    — new functionality, one capability, mini-PRD scope.
  • **Refactor** — improve the codebase, behavior preserved. Risk table mandatory.
  • **Spike**    — timeboxed research answering a technical question (feasible? ergonomic?
                   performant?). The *answer* is the deliverable — code may be discarded.
                   "Infeasible" is a successful outcome, not a failure to hide.
  • **Change**   — post-production change request. States user-facing motivation + migration/rollback.
  IF the work doesn't fit one capability/question/change ➔ split it before drafting.

STEP 2 — DRAFT. Copy `Template_TechSpec.md` → `<project>/Specs/<name>.spec.md`
  (create `Specs/` and `Specs/Done/` if missing; NEVER overwrite an existing spec file).
  Fill every section. An empty bucket is written "None", never deleted — a missing heading
  reads as an oversight, an explicit "None" reads as a decision.

STEP 3 — APPLY NON-NEGOTIABLES while drafting:
  • Numbered, traceable requirements: FR-n / AC-n / AD-n / OQ-n. Every plan step (§7) and every
    verification item (§8) must cite the FR it satisfies.
  • No silent decisions: every architectural choice made on Luke's behalf becomes an AD with
    rationale + rejected alternatives (§5). Every open question gets an OQ with an explicit default.
  • Dependencies analysed up front (§4): required-first / choose-one / coordinate-with, distilled
    to a one-sentence gate. Work does not start until the gate is satisfied.
  • Type-appropriate rigor (see Template_TechSpec.md's "Type disciplines" table):
      Refactor ➔ risk→consequence→mitigation→proving-test table is mandatory; plan stays green
        after every phase.
      Spike ➔ timeboxed; exit appends numbered findings + go/no-go; infeasible = Done, not failed.
      Change ➔ impact on existing behavior + migration/rollback notes required.
  • Multiple open specs in one project: list them (with prereq notes) at the top of the newest
    spec's §4 — do not create a separate folder-level plan file for this.

STEP 4 — REVIEW. Present the drafted spec to Luke. Impact is Low (everything stays inside the
  project) — presenting it IS the review step; no separate `!Checkpoint` needed to draft. Do not
  begin implementation until Status is set to Approved and §4's gate is satisfied.

STEP 5 — IMPLEMENT. Route by normal Minor/Major sizing (per CLAUDE.md's Routing gate) once approved.

STEP 6 — COMPLETE. A spec is Done only when every §8 Verification item passes — the project's
  standard gates plus this spec's own tests/findings. Then:
  • Set Status to Done.
  • Move the spec file into `Specs/Done/`.
  • Re-check any other open spec whose §4 gate depended on this one; note newly unblocked work.

## ✅ OUTPUT
State: one `<name>.spec.md` per subtask, drafted for review or verified and moved to `Specs/Done/`.
Nothing implemented against an unapproved spec; nothing marked Done without its checklist passing.
Error: a spec can't be classified into one Type, or its Prerequisites gate can't be stated in one
  sentence ➔ the work is too large/ambiguous — split it and draft again, do not force-fit.

## 🗂️ Repo Initialisation
To set up the full four-folder Specs structure in a repository root, use the initialisation command stored at:
`Memory/Long-Term/Coding/specs-init.md`
Copy it into the target repo's `.claude/` directory and run it once. Idempotent — safe to re-run.
