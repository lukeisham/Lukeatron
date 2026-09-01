<!-- Template — development registry for !AppDevelopment.
     Lives at System/Sandbox/<name>/registry.md from Phase 1 to Phase 3.
     It is the ONLY source of truth for phase state. Update it at the close of every step.
     Delete these comment lines when instantiating. -->

# <Name> — Development Registry

phase: 1                      <!-- 1 | 2 | 3 | 4-pending -->
kind: widget                  <!-- app = standalone web app | widget = runs inside a host -->
host: <what hosts it>         <!-- widgets only; delete this line for an app -->
prd_version: 0.1
design_closed: no             <!-- yes once Phase 3 begins; the one-way door -->
last_updated: <YYYY-MM-DD>

## In one line
<What this is, for someone who has never heard of it.>

## Next step
- [ ] <The single next thing to do. Exactly one unchecked line lives here at a time.>

## Documents

| Document | Path | Version | Status |
|---|---|---|---|
| PRD | `<name>-prd.md` | 0.1 | drafting |
| Documentation spec | `_specs/documentation.spec.md` | — | not started |
| <module> spec | `_specs/<module>.spec.md` | — | not started |

Status values: `not started` · `drafting` · `current` · **`stale`**.
A spec goes `stale` the moment the PRD version it was written against is superseded.
No phase closes with a `stale` row.

## Rule Exceptions

| Rule ID | Where it applies | Reason given | Granted by Luke on |
|---|---|---|---|
| — | — | — | — |

Empty is the normal state. A row here means Luke explicitly granted a break from
`Memory/Long-Term/Coding/vibe-coding-rules.md` for that one place, after being asked and given a
reason. Every row here is also written into the documentation spec.

## Mockups
<!-- Phase 2 only. Deleted in Phase 3, after the specs are verified to carry everything they show. -->
| Mockup | Shows | Behaviours confirmed written into a spec |
|---|---|---|

## Build board
<!-- Added by Phase 3's refresh. One row per spec/module. -->
| Module | Spec | Status |
|---|---|---|

## Resume block
A cold agent picks this project up by reading, in order:
1. This registry — phase, next step, open questions.
2. `<name>-prd.md` — what is being built and why.
3. The specs listed above, current ones only.
4. `build.md`, if it exists (Phase 3 onward).
Do not reconstruct state from conversation history. This file is the state.

## Open questions for Luke
- <question, or "none">

## Phase log
| Date | Phase | What happened |
|---|---|---|
| <YYYY-MM-DD> | 1 | Project created. |
