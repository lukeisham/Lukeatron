# Fact-checking — Refactor Registry

kind: app
template: none yet — nothing is built (`_template/` is created at Phase 4)
test: none yet (`_test/` is created at Phase 4)
last_updated: 2026-09-27

## In two lines
A standalone claim-verification app for TE-08's Fact-checking teaching aide: tag claims in a pasted
paragraph, then a local backend runs the `!FactCheck` skill to verify them live. Currently a
**pre-build** project — the app itself does not exist yet.

## Where the state lives
This registry is the permanent-home registry, but the app is still in **Phase 1** (PRD v0.8,
drafting, not approved — Tier 1 is now a JEV-API-based classifier, not Skillbank skills). **Phase state is not held here** — the only source of truth for it is the
development registry: `System/Sandbox/Fact-checking/registry.md`. Read that first. This file takes
over as the resume point once the build is verified and moved into `_template/` (Phase 4).

## Where things are
```
System/Apps/Fact-checking/
├── legacy-widget/                the OLD widget's material, moved here 2026-09-27 — reference only
│   ├── Specs/FactCheckingParser.spec.md   approved spec for the old copy-paste-only design
│   └── Fact-checking_content.md           draft content stub (never completed)
├── wishlist.md                   the idea backlog — live
└── refactor-registry.md          this file

(not yet created — Phase 4: _template/ · _test/)

System/Sandbox/Fact-checking/     the LIVE development area — registry.md (phase state) + PRD
```
Once built, `_template/`, `_test/` and this registry are siblings, always together.

## The rule
Changes are made in `_test/` only. The template is never edited directly. An accepted change is
ported into `_template/`, the fake data stripped, and the template verified to still run clean.
After every port, `_test/` and `_template/` are diffed file by file — any difference not on the
divergence allowlist below means the port was incomplete.
*(Applies from Phase 4. Until then there is no template to protect.)*

## Divergence allowlist
Not yet defined — set when `_test/` is built (Phase 4 STEP 5).

| What | Where |
|---|---|
| — | — |

## Refactor board

| # | Requested change | Status | Health | Notes |
|---|---|---|---|---|
| — | *(no rows — the refactor loop starts after Phase 4)* | | | |

Status values: `requested` · `in test` · `accepted` · `in template` · `rejected`.
Health is the score out of 10 from STEP 7's Refactor Health Check, run once per row immediately
before the port. A row not yet ported carries no Health score.

## Granted rule exceptions
None granted. One question is open: the backend's mechanism for calling `!FactCheck` (shell out to
the `claude` CLI vs. the SDK) touches SR-2/PY-1 and needs Luke's ruling before Phase 2 writes it
into a spec — tracked in the Sandbox registry, not here.

| Rule ID | Where | Reason | Granted on |
|---|---|---|---|
| — | — | — | — |

## Resume block
A cold agent picks this up by reading, in order:
1. `System/Sandbox/Fact-checking/registry.md` — the phase, the next step, open questions.
2. `System/Sandbox/Fact-checking/Fact-checking-prd.md` — what is being built and why.
3. This registry — where things are, and what has moved.
4. `wishlist.md` — the live idea backlog.
5. `legacy-widget/Specs/FactCheckingParser.spec.md` — source material for the Phase 2 rewrite; its
   "zero network, copy-paste only" decision (AD-FC9) and Parser-shell hosting are reversed, the rest
   (five-category taxonomy, 17-row whitelist, Explainer table) is still good reference.
6. Parent project: `Memory/Medium-Term/Projects/TE-08-fact-checking-app/registry.md`.
Do not reconstruct state from conversation history. The Sandbox registry is the state.

## Migration log
| Date | Event |
|---|---|
| 2026-09-27 | At Luke's instruction, the old widget's files moved from `System/Widgets/Parser/Fact-checking/` to `System/Apps/Fact-checking/legacy-widget/` (`git mv`; spec byte size unchanged at 54,628; the old folder was left empty and removed). Wishlist and this registry created. All path references updated (see Sandbox registry Phase log). |
